import Database from "better-sqlite3";
import { knowledge, topics } from "./seed.js";

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

export default db;
