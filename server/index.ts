import cors from "cors";
import express from "express";
import db from "./db.js";

const app = express();
const port = Number(process.env.PORT ?? 8794);

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
