import Database from "better-sqlite3";
import { bodySystems, cells, knowledge, organs, tissues, topics } from "./seed.js";

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

  CREATE TABLE IF NOT EXISTS body_systems (
    id INTEGER PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    short_name TEXT NOT NULL,
    description TEXT NOT NULL,
    overview TEXT NOT NULL,
    functions TEXT NOT NULL,
    color TEXT NOT NULL,
    icon TEXT NOT NULL,
    position INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS organs (
    id INTEGER PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    system_slug TEXT NOT NULL REFERENCES body_systems(slug),
    position_label TEXT NOT NULL,
    summary TEXT NOT NULL,
    description TEXT NOT NULL,
    functions TEXT NOT NULL,
    facts TEXT NOT NULL,
    hotspot TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS tissues (
    id INTEGER PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    organ_slug TEXT NOT NULL REFERENCES organs(slug),
    layer TEXT NOT NULL,
    description TEXT NOT NULL,
    functions TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS cells (
    id INTEGER PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    tissue_slug TEXT NOT NULL REFERENCES tissues(slug),
    morphology TEXT NOT NULL,
    function TEXT NOT NULL,
    fact TEXT NOT NULL
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
    system_slug TEXT REFERENCES body_systems(slug),
    organ_slug TEXT REFERENCES organs(slug),
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
`);

const knowledgeColumns = db.prepare("PRAGMA table_info(knowledge)").all() as { name: string }[];
if (!knowledgeColumns.some((column) => column.name === "system_slug")) {
  db.exec(
    "ALTER TABLE knowledge ADD COLUMN system_slug TEXT REFERENCES body_systems(slug);"
  );
}
if (!knowledgeColumns.some((column) => column.name === "organ_slug")) {
  db.exec("ALTER TABLE knowledge ADD COLUMN organ_slug TEXT REFERENCES organs(slug);");
}

const hasTopics = db.prepare("SELECT COUNT(*) AS count FROM topics").get() as { count: number };
if (hasTopics.count === 0) {
  const insertTopic = db.prepare(`
    INSERT INTO topics (slug, name, short_name, description, color, position, icon)
    VALUES (@slug, @name, @shortName, @description, @color, @position, @icon)
  `);
  const insertSystem = db.prepare(`
    INSERT INTO body_systems (slug, name, short_name, description, overview, functions, color, icon, position)
    VALUES (@slug, @name, @shortName, @description, @overview, @functions, @color, @icon, @position)
  `);
  const insertOrgan = db.prepare(`
    INSERT INTO organs (slug, name, system_slug, position_label, summary, description, functions, facts, hotspot)
    VALUES (@slug, @name, @systemSlug, @positionLabel, @summary, @description, @functions, @facts, @hotspot)
  `);
  const insertTissue = db.prepare(`
    INSERT INTO tissues (slug, name, organ_slug, layer, description, functions)
    VALUES (@slug, @name, @organSlug, @layer, @description, @functions)
  `);
  const insertCell = db.prepare(`
    INSERT INTO cells (slug, name, tissue_slug, morphology, function, fact)
    VALUES (@slug, @name, @tissueSlug, @morphology, @function, @fact)
  `);
  const insertKnowledge = db.prepare(`
    INSERT INTO knowledge (slug, title, summary, content, topic_slug, scale, read_time, featured, system_slug, organ_slug)
    VALUES (@slug, @title, @summary, @content, @topicSlug, @scale, @readTime, @featured, @systemSlug, @organSlug)
  `);

  db.transaction(() => {
    topics.forEach((topic) => insertTopic.run(topic));
    bodySystems.forEach((system) =>
      insertSystem.run({ ...system, functions: JSON.stringify(system.functions) })
    );
    organs.forEach((organ) =>
      insertOrgan.run({
        ...organ,
        functions: JSON.stringify(organ.functions),
        facts: JSON.stringify(organ.facts),
        hotspot: JSON.stringify(organ.hotspot)
      })
    );
    tissues.forEach((tissue) =>
      insertTissue.run({ ...tissue, functions: JSON.stringify(tissue.functions) })
    );
    cells.forEach((cell) => insertCell.run(cell));
    knowledge.forEach((item) =>
      insertKnowledge.run({
        ...item,
        featured: item.featured ? 1 : 0,
        systemSlug: item.systemSlug ?? null,
        organSlug: item.organSlug ?? null
      })
    );
  })();
}

export default db;
