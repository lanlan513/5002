import Database from "better-sqlite3";
import { eras, knowledge, organisms, timelineEvents, topics } from "./seed.js";

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

  CREATE TABLE IF NOT EXISTS eras (
    id INTEGER PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    name_en TEXT NOT NULL,
    rank TEXT NOT NULL,
    start_mya REAL NOT NULL,
    end_mya REAL NOT NULL,
    color TEXT NOT NULL,
    tagline TEXT NOT NULL,
    environment TEXT NOT NULL,
    position INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS organisms (
    id INTEGER PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    latin TEXT NOT NULL,
    mya REAL NOT NULL,
    era_slug TEXT NOT NULL REFERENCES eras(slug),
    category TEXT NOT NULL,
    icon TEXT NOT NULL,
    description TEXT NOT NULL,
    prominence INTEGER NOT NULL DEFAULT 2
  );

  CREATE TABLE IF NOT EXISTS timeline_events (
    id INTEGER PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    mya REAL NOT NULL,
    kind TEXT NOT NULL,
    description TEXT NOT NULL
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

const hasEras = db.prepare("SELECT COUNT(*) AS count FROM eras").get() as { count: number };
if (hasEras.count === 0) {
  const insertEra = db.prepare(`
    INSERT INTO eras (slug, name, name_en, rank, start_mya, end_mya, color, tagline, environment, position)
    VALUES (@slug, @name, @nameEn, @rank, @startMya, @endMya, @color, @tagline, @environment, @position)
  `);
  const insertOrganism = db.prepare(`
    INSERT INTO organisms (slug, name, latin, mya, era_slug, category, icon, description, prominence)
    VALUES (@slug, @name, @latin, @mya, @eraSlug, @category, @icon, @description, @prominence)
  `);
  const insertEvent = db.prepare(`
    INSERT INTO timeline_events (slug, title, mya, kind, description)
    VALUES (@slug, @title, @mya, @kind, @description)
  `);

  db.transaction(() => {
    eras.forEach((era) => insertEra.run(era));
    organisms.forEach((organism) => insertOrganism.run(organism));
    timelineEvents.forEach((event) => insertEvent.run(event));
  })();
}

export default db;
