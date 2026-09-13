import cors from "cors";
import express from "express";
import db from "./db.js";

const app = express();
const port = Number(process.env.PORT ?? 8791);

app.use(cors());
app.use(express.json());

app.get("/api/health", (_request, response) => {
  response.json({ status: "ok", service: "BioLab API" });
});

app.get("/api/topics", (_request, response) => {
  const topics = db.prepare("SELECT * FROM topics ORDER BY position").all();
  response.json(topics);
});

app.get("/api/topics/:slug", (request, response) => {
  const topic = db.prepare("SELECT * FROM topics WHERE slug = ?").get(request.params.slug);
  if (!topic) return response.status(404).json({ message: "Topic not found" });

  const entries = db
    .prepare("SELECT * FROM knowledge WHERE topic_slug = ? ORDER BY featured DESC, created_at DESC")
    .all(request.params.slug);
  return response.json({ ...topic, knowledge: entries });
});

app.get("/api/knowledge", (request, response) => {
  const { topic, featured } = request.query;
  let sql = `
    SELECT knowledge.*, topics.name AS topic_name, topics.color AS topic_color
    FROM knowledge JOIN topics ON topics.slug = knowledge.topic_slug
  `;
  const params: string[] = [];
  const clauses: string[] = [];

  if (typeof topic === "string") {
    clauses.push("knowledge.topic_slug = ?");
    params.push(topic);
  }
  if (featured === "true") clauses.push("knowledge.featured = 1");
  if (clauses.length) sql += ` WHERE ${clauses.join(" AND ")}`;
  sql += " ORDER BY knowledge.featured DESC, knowledge.created_at DESC";

  response.json(db.prepare(sql).all(...params));
});

app.get("/api/knowledge/:slug", (request, response) => {
  const entry = db
    .prepare(`
      SELECT knowledge.*, topics.name AS topic_name, topics.color AS topic_color
      FROM knowledge JOIN topics ON topics.slug = knowledge.topic_slug
      WHERE knowledge.slug = ?
    `)
    .get(request.params.slug);
  if (!entry) return response.status(404).json({ message: "Knowledge entry not found" });
  response.json(entry);
});

/* ---------- 细胞探索器 API ---------- */

interface CellRow {
  id: string;
  name: string;
  english_name: string;
  icon: string;
  description: string;
  features: string;
  view_box: string;
  position: number;
}

interface StructureRow {
  organelle_id: string;
  organelle_name: string;
  label_x: number | null;
  label_y: number | null;
  shapes: string;
  z_index: number;
}

interface OrganelleRow {
  id: string;
  name: string;
  english_name: string;
  function: string;
  location: string;
  knowledge: string;
}

const parseCell = (row: CellRow) => ({
  id: row.id,
  name: row.name,
  englishName: row.english_name,
  icon: row.icon,
  description: row.description,
  features: JSON.parse(row.features) as string[],
  viewBox: JSON.parse(row.view_box) as { x: number; y: number; w: number; h: number }
});

/** 细胞类型列表（含每种细胞的结构清单，供切换与对比使用） */
app.get("/api/cells", (_request, response) => {
  const cells = (db.prepare("SELECT * FROM cell_types ORDER BY position").all() as CellRow[]).map(parseCell);
  const structures = db
    .prepare(`
      SELECT cs.cell_id, cs.organelle_id, o.name
      FROM cell_structures cs JOIN organelles o ON o.id = cs.organelle_id
      ORDER BY cs.z_index
    `)
    .all() as Array<{ cell_id: string; organelle_id: string; name: string }>;

  response.json({
    cells: cells.map((cell) => ({
      ...cell,
      organelles: structures
        .filter((s) => s.cell_id === cell.id)
        .map((s) => ({ id: s.organelle_id, name: s.name }))
    }))
  });
});

/** 某种细胞的完整结构图（含每个细胞器的 SVG 图形与标签位置） */
app.get("/api/cells/:id", (request, response) => {
  const row = db.prepare("SELECT * FROM cell_types WHERE id = ?").get(request.params.id) as CellRow | undefined;
  if (!row) return response.status(404).json({ message: "未找到该细胞类型" });

  const structures = db
    .prepare(`
      SELECT cs.organelle_id, o.name AS organelle_name, cs.label_x, cs.label_y, cs.shapes, cs.z_index
      FROM cell_structures cs JOIN organelles o ON o.id = cs.organelle_id
      WHERE cs.cell_id = ?
      ORDER BY cs.z_index
    `)
    .all(request.params.id) as StructureRow[];

  return response.json({
    ...parseCell(row),
    organelles: structures.map((s) => ({
      id: s.organelle_id,
      name: s.organelle_name,
      label: s.label_x !== null && s.label_y !== null ? { x: s.label_x, y: s.label_y } : undefined,
      shapes: JSON.parse(s.shapes)
    }))
  });
});

/** 细胞器详情：名称、功能、位置、相关知识，以及它出现在哪些细胞中 */
app.get("/api/organelles/:id", (request, response) => {
  const row = db.prepare("SELECT * FROM organelles WHERE id = ?").get(request.params.id) as OrganelleRow | undefined;
  if (!row) return response.status(404).json({ message: "未找到该细胞器" });

  const presentIn = (
    db.prepare("SELECT cell_id FROM cell_structures WHERE organelle_id = ?").all(request.params.id) as Array<{ cell_id: string }>
  ).map((r) => r.cell_id);

  return response.json({
    id: row.id,
    name: row.name,
    englishName: row.english_name,
    function: row.function,
    location: row.location,
    knowledge: JSON.parse(row.knowledge) as string[],
    presentIn
  });
});

app.post("/api/interactions", (request, response) => {
  const { sessionId, eventType, entityType, entitySlug } = request.body ?? {};
  if (![sessionId, eventType, entityType, entitySlug].every((value) => typeof value === "string")) {
    return response.status(400).json({ message: "Incomplete interaction payload" });
  }

  db.prepare(`
    INSERT INTO interactions (session_id, event_type, entity_type, entity_slug)
    VALUES (?, ?, ?, ?)
  `).run(sessionId, eventType, entityType, entitySlug);

  return response.status(201).json({ recorded: true });
});

app.listen(port, () => {
  console.log(`BioLab API is running at http://localhost:${port}`);
});
