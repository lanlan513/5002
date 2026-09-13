import Database from "better-sqlite3";
import {
  ecosystems,
  factorMemberships,
  factors,
  memberships,
  relationships,
  species
} from "./ecology-seed.js";
import { knowledge, topics } from "./seed.js";

const db = new Database("biolab.db");
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

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

  /* ---------------- 生态系统探索模块 ---------------- */

  CREATE TABLE IF NOT EXISTS ecosystems (
    id INTEGER PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    english_name TEXT,
    description TEXT NOT NULL,
    climate TEXT,
    color TEXT NOT NULL,
    icon TEXT NOT NULL,
    position INTEGER NOT NULL
  );

  -- 物种库是全局的：同一物种可被多个生态系统复用
  CREATE TABLE IF NOT EXISTS species (
    id INTEGER PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    latin_name TEXT,
    role TEXT NOT NULL CHECK (role IN ('producer', 'consumer', 'decomposer')),
    trophic_level INTEGER NOT NULL DEFAULT 1,
    description TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS environmental_factors (
    id INTEGER PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS ecosystem_species (
    ecosystem_slug TEXT NOT NULL REFERENCES ecosystems(slug) ON DELETE CASCADE,
    species_slug TEXT NOT NULL REFERENCES species(slug) ON DELETE CASCADE,
    trophic_level INTEGER NOT NULL,
    PRIMARY KEY (ecosystem_slug, species_slug)
  );

  CREATE TABLE IF NOT EXISTS ecosystem_factors (
    ecosystem_slug TEXT NOT NULL REFERENCES ecosystems(slug) ON DELETE CASCADE,
    factor_slug TEXT NOT NULL REFERENCES environmental_factors(slug) ON DELETE CASCADE,
    note TEXT,
    PRIMARY KEY (ecosystem_slug, factor_slug)
  );

  -- 关系统一按能量/物质流动方向存储：from → to
  CREATE TABLE IF NOT EXISTS relationships (
    id INTEGER PRIMARY KEY,
    ecosystem_slug TEXT NOT NULL REFERENCES ecosystems(slug) ON DELETE CASCADE,
    from_slug TEXT NOT NULL,
    to_slug TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('energy', 'decomposition', 'support')),
    note TEXT
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

const hasEcosystems = db.prepare("SELECT COUNT(*) AS count FROM ecosystems").get() as { count: number };
if (hasEcosystems.count === 0) {
  const insertEcosystem = db.prepare(`
    INSERT INTO ecosystems (slug, name, english_name, description, climate, color, icon, position)
    VALUES (@slug, @name, @englishName, @description, @climate, @color, @icon, @position)
  `);
  const insertSpecies = db.prepare(`
    INSERT INTO species (slug, name, latin_name, role, trophic_level, description)
    VALUES (@slug, @name, @latinName, @role, @trophicLevel, @description)
  `);
  const insertFactor = db.prepare(`
    INSERT INTO environmental_factors (slug, name, category, description)
    VALUES (@slug, @name, @category, @description)
  `);
  const insertMembership = db.prepare(`
    INSERT INTO ecosystem_species (ecosystem_slug, species_slug, trophic_level)
    VALUES (@ecosystem, @species, @trophicLevel)
  `);
  const insertFactorMembership = db.prepare(`
    INSERT INTO ecosystem_factors (ecosystem_slug, factor_slug, note)
    VALUES (@ecosystem, @factor, @note)
  `);
  const insertRelationship = db.prepare(`
    INSERT INTO relationships (ecosystem_slug, from_slug, to_slug, type, note)
    VALUES (@ecosystem, @from, @to, @type, @note)
  `);

  const levelOf = new Map(species.map((item) => [item.slug, item.trophicLevel]));

  db.transaction(() => {
    ecosystems.forEach((ecosystem) => insertEcosystem.run(ecosystem));
    species.forEach((item) => insertSpecies.run(item));
    factors.forEach((factor) => insertFactor.run(factor));
    memberships.forEach((membership) =>
      insertMembership.run({
        ...membership,
        trophicLevel: membership.trophicLevel ?? levelOf.get(membership.species) ?? 1
      })
    );
    factorMemberships.forEach((membership) => insertFactorMembership.run(membership));
    relationships.forEach((relationship) =>
      insertRelationship.run({ ...relationship, note: relationship.note ?? null })
    );
  })();
}

export default db;
