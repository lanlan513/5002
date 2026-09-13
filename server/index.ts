import cors from "cors";
import express from "express";
import db from "./db.js";

const app = express();
const port = Number(process.env.PORT ?? 8793);

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

app.get("/api/timeline", (_request, response) => {
  const eraRows = db.prepare("SELECT * FROM eras ORDER BY position").all();
  const organismRows = db.prepare("SELECT * FROM organisms ORDER BY mya DESC").all();
  const eventRows = db.prepare("SELECT * FROM timeline_events ORDER BY mya DESC").all();
  response.json({ eras: eraRows, organisms: organismRows, events: eventRows });
});

app.get("/api/phylogeny", (_request, response) => {
  const eraRows = db.prepare("SELECT * FROM eras ORDER BY position").all();
  const organismRows = db.prepare("SELECT * FROM organisms ORDER BY mya DESC").all();
  const eventRows = db.prepare("SELECT * FROM timeline_events ORDER BY mya DESC").all();
  const nodeRows = db.prepare("SELECT * FROM taxon_nodes ORDER BY node_order, divergence_mya DESC").all();
  response.json({ eras: eraRows, organisms: organismRows, events: eventRows, nodes: nodeRows });
});

app.post("/api/phylogeny/nodes", (request, response) => {
  const body = request.body ?? {};
  const required = ["slug", "name", "latin", "rank", "kind", "eraSlug", "icon", "color", "traits", "description", "relationships"];
  if (!required.every((key) => typeof body[key] === "string" && body[key].trim())) {
    return response.status(400).json({ message: "缺少必要的分类节点字段" });
  }
  if (!["clade", "species"].includes(body.kind)) {
    return response.status(400).json({ message: "kind 必须是 clade 或 species" });
  }

  const era = db.prepare("SELECT slug FROM eras WHERE slug = ?").get(body.eraSlug);
  if (!era) return response.status(400).json({ message: "指定的地质年代不存在" });

  if (body.parentSlug) {
    const parent = db.prepare("SELECT slug FROM taxon_nodes WHERE slug = ?").get(body.parentSlug);
    if (!parent) return response.status(400).json({ message: "父级分类节点不存在" });
  }

  if (body.organismSlug) {
    const organism = db.prepare("SELECT slug FROM organisms WHERE slug = ?").get(body.organismSlug);
    if (!organism) return response.status(400).json({ message: "关联的物种不存在" });
  }

  const maxOrder = db.prepare("SELECT COALESCE(MAX(node_order), 0) AS max_order FROM taxon_nodes").get() as { max_order: number };
  const node = {
    slug: body.slug,
    parentSlug: body.parentSlug ?? null,
    name: body.name,
    latin: body.latin,
    rank: body.rank,
    kind: body.kind,
    nodeOrder: Number(body.nodeOrder ?? maxOrder.max_order + 1),
    divergenceMya: Number(body.divergenceMya ?? 0),
    eraSlug: body.eraSlug,
    organismSlug: body.organismSlug ?? null,
    icon: body.icon,
    color: body.color,
    traits: body.traits,
    description: body.description,
    relationships: body.relationships,
    defaultExpanded: body.defaultExpanded ? 1 : 0
  };

  if (!Number.isFinite(node.divergenceMya) || node.divergenceMya < 0) {
    return response.status(400).json({ message: "divergenceMya 必须是大于或等于 0 的数字" });
  }

  try {
    db.prepare(`
      INSERT INTO taxon_nodes (
        slug, parent_slug, name, latin, rank, kind, node_order, divergence_mya,
        era_slug, organism_slug, icon, color, traits, description, relationships, default_expanded
      )
      VALUES (
        @slug, @parentSlug, @name, @latin, @rank, @kind, @nodeOrder, @divergenceMya,
        @eraSlug, @organismSlug, @icon, @color, @traits, @description, @relationships, @defaultExpanded
      )
    `).run(node);
  } catch (error) {
    return response.status(409).json({ message: "节点 slug 已存在或数据约束不满足" });
  }

  return response.status(201).json({ created: true, slug: node.slug });
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
