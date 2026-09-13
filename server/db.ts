import Database from "better-sqlite3";
import { knowledge, topics } from "./seed.js";
import { cellSeeds, organelleSeeds } from "./cellSeed.js";
import { relationChainSeeds, relationEdgeSeeds, relationNodeSeeds } from "./relationSeed.js";

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

  /* ---------- 细胞器功能关系图谱 ---------- */

  CREATE TABLE IF NOT EXISTS relation_nodes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    english_name TEXT,
    short_name TEXT,
    kind TEXT NOT NULL,              -- organelle | molecule | energy | environment
    organelle_id TEXT REFERENCES organelles(id),
    description TEXT NOT NULL,
    x REAL NOT NULL,                 -- 图谱画布（960 × 640）中的布局坐标
    y REAL NOT NULL
  );

  CREATE TABLE IF NOT EXISTS relation_edges (
    id TEXT PRIMARY KEY,
    from_node TEXT NOT NULL REFERENCES relation_nodes(id),
    to_node TEXT NOT NULL REFERENCES relation_nodes(id),
    label TEXT NOT NULL,             -- 过程名称，如“转录”“囊泡运输”
    kind TEXT NOT NULL,              -- information | material | energy
    description TEXT NOT NULL,       -- 点击连线时展示的生物学解释
    bend REAL NOT NULL DEFAULT 0     -- 连线弯曲程度（避开中间节点）
  );

  CREATE TABLE IF NOT EXISTS relation_chains (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    summary TEXT NOT NULL,
    position INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS chain_edges (
    chain_id TEXT NOT NULL REFERENCES relation_chains(id),
    edge_id TEXT NOT NULL REFERENCES relation_edges(id),
    position INTEGER NOT NULL,       -- 边在链中的顺序（用于依次播放流动动画）
    PRIMARY KEY (chain_id, edge_id)
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

const hasRelations = db.prepare("SELECT COUNT(*) AS count FROM relation_nodes").get() as { count: number };
if (hasRelations.count === 0) {
  const insertNode = db.prepare(`
    INSERT INTO relation_nodes (id, name, english_name, short_name, kind, organelle_id, description, x, y)
    VALUES (@id, @name, @englishName, @shortName, @kind, @organelleId, @description, @x, @y)
  `);
  const insertEdge = db.prepare(`
    INSERT INTO relation_edges (id, from_node, to_node, label, kind, description, bend)
    VALUES (@id, @from, @to, @label, @kind, @description, @bend)
  `);
  const insertChain = db.prepare(`
    INSERT INTO relation_chains (id, name, summary, position)
    VALUES (@id, @name, @summary, @position)
  `);
  const insertChainEdge = db.prepare(`
    INSERT INTO chain_edges (chain_id, edge_id, position)
    VALUES (@chainId, @edgeId, @position)
  `);

  db.transaction(() => {
    relationNodeSeeds.forEach((node) =>
      insertNode.run({
        ...node,
        englishName: node.englishName ?? null,
        shortName: node.shortName ?? null,
        organelleId: node.organelleId ?? null
      })
    );
    relationEdgeSeeds.forEach((edge) => insertEdge.run({ ...edge, bend: edge.bend ?? 0 }));
    relationChainSeeds.forEach((chain) => {
      insertChain.run(chain);
      chain.edgeIds.forEach((edgeId, index) =>
        insertChainEdge.run({ chainId: chain.id, edgeId, position: index + 1 })
      );
    });
  })();
}

export default db;
