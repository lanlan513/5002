import cors from "cors";
import express from "express";
import db from "./db.js";

const app = express();
const port = Number(process.env.PORT ?? 8792);

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

app.get("/api/genetics/overview", (_request, response) => {
  const chromosomeRows = db.prepare("SELECT * FROM chromosomes ORDER BY position").all();
  const geneCount = db.prepare("SELECT COUNT(*) AS count FROM genes").get() as { count: number };
  const conceptCount = db.prepare("SELECT COUNT(*) AS count FROM genetic_concepts").get() as { count: number };
  const basePairs = db.prepare("SELECT SUM(base_pairs) AS total FROM chromosomes").get() as { total: number };

  response.json({
    stats: {
      chromosomes: chromosomeRows.length,
      genes: geneCount.count,
      concepts: conceptCount.count,
      basePairs: basePairs.total
    },
    chromosomes: chromosomeRows
  });
});

app.get("/api/genetics/chromosomes/:slug", (request, response) => {
  const chromosome = db.prepare("SELECT * FROM chromosomes WHERE slug = ?").get(request.params.slug);
  if (!chromosome) return response.status(404).json({ message: "Chromosome not found" });

  const chromosomeGenes = db
    .prepare("SELECT * FROM genes WHERE chromosome_slug = ? ORDER BY symbol")
    .all(request.params.slug);
  return response.json({ ...chromosome, genes: chromosomeGenes });
});

app.get("/api/genetics/genes/:slug", (request, response) => {
  const gene = db
    .prepare(`
      SELECT genes.*, chromosomes.name AS chromosome_name, chromosomes.short_label AS chromosome_label
      FROM genes JOIN chromosomes ON chromosomes.slug = genes.chromosome_slug
      WHERE genes.slug = ?
    `)
    .get(request.params.slug);
  if (!gene) return response.status(404).json({ message: "Gene not found" });
  response.json(gene);
});

app.get("/api/genetics/search", (request, response) => {
  const query = typeof request.query.q === "string" ? request.query.q.trim() : "";
  if (!query) return response.json({ genes: [], concepts: [] });

  const like = `%${query}%`;
  const matchedGenes = db
    .prepare(`
      SELECT genes.*, chromosomes.name AS chromosome_name, chromosomes.short_label AS chromosome_label
      FROM genes JOIN chromosomes ON chromosomes.slug = genes.chromosome_slug
      WHERE genes.symbol LIKE ? OR genes.name LIKE ? OR genes.summary LIKE ? OR genes.trait LIKE ?
      ORDER BY genes.symbol
      LIMIT 8
    `)
    .all(like, like, like, like);
  const matchedConcepts = db
    .prepare(`
      SELECT * FROM genetic_concepts
      WHERE term LIKE ? OR definition LIKE ? OR category LIKE ?
      ORDER BY term
      LIMIT 8
    `)
    .all(like, like, like);

  return response.json({ genes: matchedGenes, concepts: matchedConcepts });
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
