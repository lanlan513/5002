import cors from "cors";
import express, { type Response } from "express";
import db, { couplingPathways, substances } from "./db.js";
import { organs } from "./seed.js";

const app = express();
const port = Number(process.env.PORT ?? 8795);

app.use(cors());
app.use(express.json());

type JsonRow = Record<string, unknown>;

const parseJsonFields = (row: JsonRow | undefined, fields: string[]): JsonRow | undefined => {
  if (!row) return row;
  for (const field of fields) {
    if (typeof row[field] === "string") {
      row[field] = JSON.parse(row[field] as string);
    }
  }
  return row;
};

const sendNotFound = (response: Response, message: string) =>
  response.status(404).json({ message });

app.get("/api/health", (_request, response) => {
  response.json({ status: "ok", service: "BioLab API" });
});

app.get("/api/topics", (_request, response) => {
  const topicsList = db.prepare("SELECT * FROM topics ORDER BY position").all();
  response.json(topicsList);
});

app.get("/api/topics/:slug", (request, response) => {
  const topic = db.prepare("SELECT * FROM topics WHERE slug = ?").get(request.params.slug);
  if (!topic) return sendNotFound(response, "Topic not found");

  const entries = db
    .prepare("SELECT * FROM knowledge WHERE topic_slug = ? ORDER BY featured DESC, created_at DESC")
    .all(request.params.slug);
  return response.json({ ...topic, knowledge: entries });
});

app.get("/api/knowledge", (request, response) => {
  const { topic, system, featured } = request.query;
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
  if (typeof system === "string") {
    clauses.push("knowledge.system_slug = ?");
    params.push(system);
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
  if (!entry) return sendNotFound(response, "Knowledge entry not found");
  response.json(entry);
});

// --- 人体生物学：系统 → 器官 → 组织 → 细胞 层级 API ---

app.get("/api/body/overview", (_request, response) => {
  const systems = db
    .prepare("SELECT * FROM body_systems ORDER BY position")
    .all()
    .map((row) => parseJsonFields(row as JsonRow, ["functions"]) as JsonRow);
  const organRows = db
    .prepare("SELECT slug, name, system_slug, position_label, summary, hotspot FROM organs")
    .all()
    .map((row) => parseJsonFields(row as JsonRow, ["hotspot"]) as JsonRow);

  const organsBySystem = new Map<string, unknown[]>();
  for (const organ of organRows) {
    const key = organ.system_slug as string;
    organsBySystem.set(key, [...(organsBySystem.get(key) ?? []), organ]);
  }

  response.json({
    title: "人体",
    description: "从整体人体出发，沿系统、器官、组织、细胞四个层级逐层深入。",
    systems: systems.map((system) => ({
      ...system,
      organ_count: (organsBySystem.get(system.slug as string) ?? []).length,
      organs: organsBySystem.get(system.slug as string) ?? []
    }))
  });
});

// 器官关系网络：物质如何在器官之间定向流动
app.get("/api/body/relations", (_request, response) => {
  const organRows = db
    .prepare("SELECT slug, name, system_slug, hotspot FROM organs")
    .all()
    .map((row) => parseJsonFields(row as JsonRow, ["hotspot"])) as {
    slug: string;
    name: string;
    system_slug: string;
    hotspot: { x: number; y: number; r: number };
  }[];

  const relationRows = db
    .prepare("SELECT from_organ, to_organ, substances, label FROM organ_relations")
    .all()
    .map((row) => parseJsonFields(row as JsonRow, ["substances"])) as {
    from_organ: string;
    to_organ: string;
    substances: string[];
    label: string;
  }[];

  // 以种子里的器官清单为准（包含未入库的热点坐标），避免旧库缺字段时关系悬空
  const knownSlugs = new Set(organs.map((organ) => organ.slug));
  const hotspotBySlug = new Map(organRows.map((organ) => [organ.slug, organ.hotspot]));
  const fallbackHotspot = new Map(organs.map((organ) => [organ.slug, organ.hotspot]));

  const nodes = organs.map((organ) => ({
    slug: organ.slug,
    name: organ.name,
    system_slug: organ.systemSlug,
    hotspot: hotspotBySlug.get(organ.slug) ?? fallbackHotspot.get(organ.slug)
  }));

  const edges = relationRows
    .filter(
      (relation) => knownSlugs.has(relation.from_organ) && knownSlugs.has(relation.to_organ)
    )
    .map((relation) => ({
      from: relation.from_organ,
      to: relation.to_organ,
      substances: relation.substances,
      label: relation.label
    }));

  response.json({ substances, edges, pathways: couplingPathways, nodes });
});

app.get("/api/body/systems/:slug", (request, response) => {
  const system = parseJsonFields(
    db.prepare("SELECT * FROM body_systems WHERE slug = ?").get(request.params.slug) as JsonRow,
    ["functions"]
  );
  if (!system) return sendNotFound(response, "Body system not found");

  const systemOrgans = db
    .prepare(
      `SELECT organs.*,
              (SELECT COUNT(*) FROM tissues WHERE tissues.organ_slug = organs.slug) AS tissue_count,
              (SELECT COUNT(*) FROM cells
                 JOIN tissues ON tissues.slug = cells.tissue_slug
                WHERE tissues.organ_slug = organs.slug) AS cell_count
         FROM organs WHERE system_slug = ?`
    )
    .all(request.params.slug)
    .map((row) => parseJsonFields(row as JsonRow, ["functions", "facts", "hotspot"]));

  const relatedKnowledge = db
    .prepare("SELECT * FROM knowledge WHERE system_slug = ? ORDER BY featured DESC")
    .all(request.params.slug);

  response.json({ ...system, organs: systemOrgans, knowledge: relatedKnowledge });
});

app.get("/api/body/organs/:slug", (request, response) => {
  const organ = parseJsonFields(
    db
      .prepare(
        `SELECT organs.*, body_systems.name AS system_name, body_systems.color AS system_color
           FROM organs JOIN body_systems ON body_systems.slug = organs.system_slug
          WHERE organs.slug = ?`
      )
      .get(request.params.slug) as JsonRow,
    ["functions", "facts", "hotspot"]
  );
  if (!organ) return sendNotFound(response, "Organ not found");

  const organTissues = db
    .prepare(
      `SELECT tissues.*,
              (SELECT COUNT(*) FROM cells WHERE cells.tissue_slug = tissues.slug) AS cell_count
         FROM tissues WHERE organ_slug = ?`
    )
    .all(request.params.slug)
    .map((row) => parseJsonFields(row as JsonRow, ["functions"]));

  const relatedKnowledge = db
    .prepare(
      `SELECT knowledge.* FROM knowledge
        WHERE organ_slug = ? OR (system_slug = ? AND organ_slug IS NULL)
        ORDER BY knowledge.featured DESC`
    )
    .all(request.params.slug, organ.system_slug as string);

  response.json({ ...organ, tissues: organTissues, knowledge: relatedKnowledge });
});

app.get("/api/body/tissues/:slug", (request, response) => {
  const tissue = parseJsonFields(
    db
      .prepare(
        `SELECT tissues.*,
                organs.name AS organ_name, organs.slug AS organ_slug,
                organs.system_slug AS system_slug,
                body_systems.name AS system_name, body_systems.color AS system_color
           FROM tissues
           JOIN organs ON organs.slug = tissues.organ_slug
           JOIN body_systems ON body_systems.slug = organs.system_slug
          WHERE tissues.slug = ?`
      )
      .get(request.params.slug) as JsonRow,
    ["functions"]
  );
  if (!tissue) return sendNotFound(response, "Tissue not found");

  const tissueCells = db
    .prepare("SELECT * FROM cells WHERE tissue_slug = ? ORDER BY id")
    .all(request.params.slug);

  response.json({ ...tissue, cells: tissueCells });
});

app.get("/api/body/cells/:slug", (request, response) => {
  const cell = db
    .prepare(
      `SELECT cells.*,
              tissues.name AS tissue_name, tissues.slug AS tissue_slug,
              tissues.organ_slug AS organ_slug,
              organs.name AS organ_name,
              body_systems.slug AS system_slug,
              body_systems.name AS system_name, body_systems.color AS system_color
         FROM cells
         JOIN tissues ON tissues.slug = cells.tissue_slug
         JOIN organs ON organs.slug = tissues.organ_slug
         JOIN body_systems ON body_systems.slug = organs.system_slug
        WHERE cells.slug = ?`
    )
    .get(request.params.slug);
  if (!cell) return sendNotFound(response, "Cell not found");
  response.json(cell);
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
