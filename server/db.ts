import Database from "better-sqlite3";
import { knowledge, topics } from "./seed.js";
import { cellSeeds, organelleSeeds } from "./cellSeed.js";

const db = new Database("biolab.db");
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS topics (
    id INTEGER PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    short_name TEXT NOT NULL,
    description TEXT NOT NULL,
    color TEXT NOT NULL,
    position INTEGER NOT NULL,
    icon TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS knowledge (
    id INTEGER PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    content TEXT NOT NULL,
    topic_slug TEXT NOT NULL REFERENCES topics(slug),
    scale TEXT NOT NULL,
    read_time INTEGER NOT NULL,
    featured INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS media (
    id INTEGER PRIMARY KEY,
    knowledge_slug TEXT REFERENCES knowledge(slug),
    url TEXT NOT NULL,
    alt TEXT NOT NULL,
    credit TEXT,
    kind TEXT NOT NULL DEFAULT 'image'
  );

  CREATE TABLE IF NOT EXISTS interactions (
    id INTEGER PRIMARY KEY,
    session_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_slug TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  /* ---------- 细胞探索器 ---------- */

  CREATE TABLE IF NOT EXISTS cell_types (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    english_name TEXT NOT NULL,
    icon TEXT NOT NULL,
    description TEXT NOT NULL,
    features TEXT NOT NULL,          -- JSON 数组：结构特点
    view_box TEXT NOT NULL,          -- JSON：{x, y, w, h}
    position INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS organelles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    english_name TEXT NOT NULL,
    function TEXT NOT NULL,
    location TEXT NOT NULL,
    knowledge TEXT NOT NULL          -- JSON 数组：相关知识
  );

  CREATE TABLE IF NOT EXISTS cell_structures (
    cell_id TEXT NOT NULL REFERENCES cell_types(id),
    organelle_id TEXT NOT NULL REFERENCES organelles(id),
    label_x REAL,
    label_y REAL,
    shapes TEXT NOT NULL,            -- JSON 数组：SVG 图形描述
    z_index INTEGER NOT NULL,
    PRIMARY KEY (cell_id, organelle_id)
  );
`);

const hasTopics = db.prepare("SELECT COUNT(*) AS count FROM topics").get() as { count: number };
if (hasTopics.count === 0) {
  const insertTopic = db.prepare(`
    INSERT INTO topics (slug, name, short_name, description, color, position, icon)
    VALUES (@slug, @name, @shortName, @description, @color, @position, @icon)
  `);
  const insertKnowledge = db.prepare(`
    INSERT INTO knowledge (slug, title, summary, content, topic_slug, scale, read_time, featured)
    VALUES (@slug, @title, @summary, @content, @topicSlug, @scale, @readTime, @featured)
  `);

  db.transaction(() => {
    topics.forEach((topic) => insertTopic.run(topic));
    knowledge.forEach((item) => insertKnowledge.run({ ...item, featured: item.featured ? 1 : 0 }));
  })();
}

const hasCells = db.prepare("SELECT COUNT(*) AS count FROM cell_types").get() as { count: number };
if (hasCells.count === 0) {
  const insertCell = db.prepare(`
    INSERT INTO cell_types (id, name, english_name, icon, description, features, view_box, position)
    VALUES (@id, @name, @englishName, @icon, @description, @features, @viewBox, @position)
  `);
  const insertOrganelle = db.prepare(`
    INSERT INTO organelles (id, name, english_name, function, location, knowledge)
    VALUES (@id, @name, @englishName, @function, @location, @knowledge)
  `);
  const insertStructure = db.prepare(`
    INSERT INTO cell_structures (cell_id, organelle_id, label_x, label_y, shapes, z_index)
    VALUES (@cellId, @organelleId, @labelX, @labelY, @shapes, @z)
  `);

  db.transaction(() => {
    organelleSeeds.forEach((organelle) =>
      insertOrganelle.run({
        ...organelle,
        knowledge: JSON.stringify(organelle.knowledge)
      })
    );

    cellSeeds.forEach((cell) => {
      insertCell.run({
        ...cell,
        features: JSON.stringify(cell.features),
        viewBox: JSON.stringify(cell.viewBox)
      });
      cell.structures.forEach((structure) =>
        insertStructure.run({
          cellId: cell.id,
          organelleId: structure.organelleId,
          labelX: structure.label?.x ?? null,
          labelY: structure.label?.y ?? null,
          shapes: JSON.stringify(structure.shapes),
          z: structure.z
        })
      );
    });
  })();
}

export default db;
