import cors from "cors";
import express from "express";
import db from "./db.js";
import { LAB_DISCLAIMER } from "./labSeed.js";
import { runLabSimulation, type LabRunResult } from "./labModel.js";
import type { CellTypeId, LabExperimentSeed } from "./types.js";

const app = express();
const port = Number(process.env.PORT ?? 8791);

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

/* ---------- 细胞探索器 API ---------- */

interface CellRow {
  id: string;
  name: string;
  english_name: string;
  icon: string;
  description: string;
  features: string;
  view_box: string;
  position: number;
}

interface StructureRow {
  organelle_id: string;
  organelle_name: string;
  label_x: number | null;
  label_y: number | null;
  shapes: string;
  z_index: number;
}

interface OrganelleRow {
  id: string;
  name: string;
  english_name: string;
  function: string;
  location: string;
  knowledge: string;
}

interface RelationNodeRow {
  id: string;
  name: string;
  english_name: string | null;
  short_name: string | null;
  kind: string;
  organelle_id: string | null;
  description: string;
  x: number;
  y: number;
}

interface RelationEdgeRow {
  id: string;
  from_node: string;
  to_node: string;
  label: string;
  kind: string;
  description: string;
  bend: number;
}

const parseRelationNode = (row: RelationNodeRow) => ({
  id: row.id,
  name: row.name,
  englishName: row.english_name ?? undefined,
  shortName: row.short_name ?? undefined,
  kind: row.kind,
  organelleId: row.organelle_id ?? undefined,
  description: row.description,
  x: row.x,
  y: row.y
});

const parseRelationEdge = (row: RelationEdgeRow) => ({
  id: row.id,
  from: row.from_node,
  to: row.to_node,
  label: row.label,
  kind: row.kind,
  description: row.description,
  bend: row.bend
});

/** 查询某个关系节点参与的全部关系（供细胞器详情与图谱共用） */
const relationsOfNode = (nodeId: string) =>
  (
    db
      .prepare(`
        SELECT e.id AS edge_id, e.label, e.kind, e.from_node, e.to_node,
               n.name AS other_name, n.kind AS other_kind
        FROM relation_edges e
        JOIN relation_nodes n ON n.id = (CASE WHEN e.from_node = ? THEN e.to_node ELSE e.from_node END)
        WHERE e.from_node = ? OR e.to_node = ?
        ORDER BY e.id
      `)
      .all(nodeId, nodeId, nodeId) as Array<{
      edge_id: string;
      label: string;
      kind: string;
      from_node: string;
      to_node: string;
      other_name: string;
      other_kind: string;
    }>
  ).map((row) => ({
    edgeId: row.edge_id,
    label: row.label,
    kind: row.kind,
    direction: (row.from_node === nodeId ? "out" : "in") as "out" | "in",
    other: {
      id: row.from_node === nodeId ? row.to_node : row.from_node,
      name: row.other_name,
      kind: row.other_kind
    }
  }));

const parseCell = (row: CellRow) => ({
  id: row.id,
  name: row.name,
  englishName: row.english_name,
  icon: row.icon,
  description: row.description,
  features: JSON.parse(row.features) as string[],
  viewBox: JSON.parse(row.view_box) as { x: number; y: number; w: number; h: number }
});

/** 细胞类型列表（含每种细胞的结构清单，供切换与对比使用） */
app.get("/api/cells", (_request, response) => {
  const cells = (db.prepare("SELECT * FROM cell_types ORDER BY position").all() as CellRow[]).map(parseCell);
  const structures = db
    .prepare(`
      SELECT cs.cell_id, cs.organelle_id, o.name
      FROM cell_structures cs JOIN organelles o ON o.id = cs.organelle_id
      ORDER BY cs.z_index
    `)
    .all() as Array<{ cell_id: string; organelle_id: string; name: string }>;

  response.json({
    cells: cells.map((cell) => ({
      ...cell,
      organelles: structures
        .filter((s) => s.cell_id === cell.id)
        .map((s) => ({ id: s.organelle_id, name: s.name }))
    }))
  });
});

/** 某种细胞的完整结构图（含每个细胞器的 SVG 图形与标签位置） */
app.get("/api/cells/:id", (request, response) => {
  const row = db.prepare("SELECT * FROM cell_types WHERE id = ?").get(request.params.id) as CellRow | undefined;
  if (!row) return response.status(404).json({ message: "未找到该细胞类型" });

  const structures = db
    .prepare(`
      SELECT cs.organelle_id, o.name AS organelle_name, cs.label_x, cs.label_y, cs.shapes, cs.z_index
      FROM cell_structures cs JOIN organelles o ON o.id = cs.organelle_id
      WHERE cs.cell_id = ?
      ORDER BY cs.z_index
    `)
    .all(request.params.id) as StructureRow[];

  return response.json({
    ...parseCell(row),
    organelles: structures.map((s) => ({
      id: s.organelle_id,
      name: s.organelle_name,
      label: s.label_x !== null && s.label_y !== null ? { x: s.label_x, y: s.label_y } : undefined,
      shapes: JSON.parse(s.shapes)
    }))
  });
});

/** 细胞器详情：名称、功能、位置、相关知识，以及它出现在哪些细胞中、参与哪些功能关系 */
app.get("/api/organelles/:id", (request, response) => {
  const row = db.prepare("SELECT * FROM organelles WHERE id = ?").get(request.params.id) as OrganelleRow | undefined;
  if (!row) return response.status(404).json({ message: "未找到该细胞器" });

  const presentIn = (
    db.prepare("SELECT cell_id FROM cell_structures WHERE organelle_id = ?").all(request.params.id) as Array<{ cell_id: string }>
  ).map((r) => r.cell_id);

  /* 该细胞器在关系图谱中的节点及其参与的功能关系 */
  const node = db.prepare("SELECT id FROM relation_nodes WHERE organelle_id = ?").get(request.params.id) as
    | { id: string }
    | undefined;

  return response.json({
    id: row.id,
    name: row.name,
    englishName: row.english_name,
    function: row.function,
    location: row.location,
    knowledge: JSON.parse(row.knowledge) as string[],
    presentIn,
    relationNodeId: node?.id ?? null,
    relations: node ? relationsOfNode(node.id) : []
  });
});

/* ---------- 细胞器功能关系图谱 API ---------- */

/** 完整关系图谱：节点 + 有向关系边 + 关系链（前端据此渲染连线与流动动画） */
app.get("/api/relations", (_request, response) => {
  const nodes = (db.prepare("SELECT * FROM relation_nodes").all() as RelationNodeRow[]).map(parseRelationNode);
  const edges = (db.prepare("SELECT * FROM relation_edges").all() as RelationEdgeRow[]).map(parseRelationEdge);
  const chains = (
    db.prepare("SELECT * FROM relation_chains ORDER BY position").all() as Array<{
      id: string;
      name: string;
      summary: string;
    }>
  ).map((chain) => ({
    ...chain,
    edgeIds: (
      db
        .prepare("SELECT edge_id FROM chain_edges WHERE chain_id = ? ORDER BY position")
        .all(chain.id) as Array<{ edge_id: string }>
    ).map((row) => row.edge_id)
  }));

  response.json({ nodes, edges, chains });
});

/** 单个关系节点详情：解释文案 + 与它相连的全部关系（用于“继续探索相关节点”） */
app.get("/api/relations/nodes/:id", (request, response) => {
  const row = db.prepare("SELECT * FROM relation_nodes WHERE id = ?").get(request.params.id) as
    | RelationNodeRow
    | undefined;
  if (!row) return response.status(404).json({ message: "未找到该关系节点" });

  return response.json({ ...parseRelationNode(row), relations: relationsOfNode(row.id) });
});

/* ---------- 生命过程动态模拟 API ---------- */

interface ProcessRow {
  id: string;
  name: string;
  english_name: string;
  icon: string;
  summary: string;
  cell_ids: string;
  initial_metrics: string;
  scene_view_box: string;
  position: number;
}

interface ProcessStepRow {
  position: number;
  title: string;
  event: string;
  description: string;
  highlights: string;
  organelle_id: string;
  duration: number;
}

interface ProcessEntityRow {
  entity_id: string;
  kind: string;
  name: string | null;
  organelle_id: string | null;
  shapes: string;
  track: string;
  path: string | null;
  orient_path: number;
  label: string | null;
  z_index: number;
  entity_order: number;
}

interface ProcessMetricRow {
  metric_id: string;
  label: string;
  unit: string;
  kind: string;
  metric_values: string;
  position: number;
}

const parseProcessRow = (row: ProcessRow) => ({
  id: row.id,
  name: row.name,
  englishName: row.english_name,
  icon: row.icon,
  summary: row.summary,
  cellIds: JSON.parse(row.cell_ids) as string[],
  position: row.position,
  stepCount: (
    db.prepare("SELECT COUNT(*) AS count FROM process_steps WHERE process_id = ?").get(row.id) as {
      count: number;
    }
  ).count,
  totalDuration:
    (
      db.prepare("SELECT COALESCE(SUM(duration), 0) AS total FROM process_steps WHERE process_id = ?").get(row.id) as {
        total: number;
      }
    ).total ?? 0
});

/** 生命过程列表（摘要，供选择器与细胞视角过滤使用） */
app.get("/api/processes", (_request, response) => {
  const rows = db
    .prepare("SELECT * FROM processes ORDER BY position")
    .all() as ProcessRow[];
  response.json({ processes: rows.map(parseProcessRow) });
});

/** 单个过程的完整模拟数据：步骤 / 实体关键帧 / 状态指标 */
app.get("/api/processes/:id", (request, response) => {
  const row = db.prepare("SELECT * FROM processes WHERE id = ?").get(request.params.id) as
    | ProcessRow
    | undefined;
  if (!row) return response.status(404).json({ message: "未找到该生命过程" });

  const steps = (
    db
      .prepare("SELECT * FROM process_steps WHERE process_id = ? ORDER BY position")
      .all(request.params.id) as ProcessStepRow[]
  ).map((step) => ({
    title: step.title,
    event: step.event,
    description: step.description,
    highlights: JSON.parse(step.highlights) as string[],
    organelleId: step.organelle_id,
    duration: step.duration
  }));

  const entities = (
    db
      .prepare("SELECT * FROM process_entities WHERE process_id = ? ORDER BY z_index, entity_order")
      .all(request.params.id) as ProcessEntityRow[]
  ).map((entityItem) => ({
    id: entityItem.entity_id,
    kind: entityItem.kind,
    name: entityItem.name ?? undefined,
    organelleId: entityItem.organelle_id ?? undefined,
    shapes: JSON.parse(entityItem.shapes),
    track: JSON.parse(entityItem.track),
    path: entityItem.path ?? undefined,
    orientPath: entityItem.orient_path === 1,
    label: entityItem.label ? JSON.parse(entityItem.label) : undefined
  }));

  const metrics = (
    db
      .prepare("SELECT * FROM process_metrics WHERE process_id = ? ORDER BY position")
      .all(request.params.id) as ProcessMetricRow[]
  ).map((metric) => ({
    id: metric.metric_id,
    label: metric.label,
    unit: metric.unit,
    kind: metric.kind,
    values: JSON.parse(metric.metric_values)
  }));

  return response.json({
    ...parseProcessRow(row),
    initialMetrics: JSON.parse(row.initial_metrics) as Array<number | string>,
    sceneViewBox: JSON.parse(row.scene_view_box) as { x: number; y: number; w: number; h: number },
    steps,
    entities,
    metrics
  });
});

/* ---------- 虚拟实验室 API（教学模型） ---------- */

interface LabExperimentRow {
  id: string;
  name: string;
  english_name: string;
  icon: string;
  summary: string;
  question: string;
  cell_ids: string;
  duration: number;
  time_unit: string;
  params: string;
  variables: string;
  notes: string;
  position: number;
}

interface LabRunRow {
  id: number;
  experiment_id: string;
  cell_id: string;
  params: string;
  result: string;
  created_at: string;
}

const parseLabExperiment = (row: LabExperimentRow): LabExperimentSeed => ({
  id: row.id,
  name: row.name,
  englishName: row.english_name,
  icon: row.icon,
  summary: row.summary,
  question: row.question,
  cellIds: JSON.parse(row.cell_ids) as CellTypeId[],
  duration: row.duration,
  timeUnit: row.time_unit,
  params: JSON.parse(row.params) as LabExperimentSeed["params"],
  variables: JSON.parse(row.variables) as LabExperimentSeed["variables"],
  notes: JSON.parse(row.notes) as string[],
  position: row.position
});

const getLabExperiment = (id: string) => {
  const row = db.prepare("SELECT * FROM lab_experiments WHERE id = ?").get(id) as LabExperimentRow | undefined;
  return row ? parseLabExperiment(row) : null;
};

/** 实验定义列表（含参数与观察变量定义），附统一的教学模型声明 */
app.get("/api/lab/experiments", (_request, response) => {
  const experiments = (
    db.prepare("SELECT * FROM lab_experiments ORDER BY position").all() as LabExperimentRow[]
  ).map(parseLabExperiment);
  response.json({ experiments, disclaimer: LAB_DISCLAIMER });
});

/** 运行一次虚拟实验：按条件生成时间序列，并把过程与结果写入实验记录 */
app.post("/api/lab/run", (request, response) => {
  const { experimentId, cellId, params } = request.body ?? {};
  if (typeof experimentId !== "string" || typeof cellId !== "string") {
    return response.status(400).json({ message: "缺少实验或细胞参数" });
  }
  const experiment = getLabExperiment(experimentId);
  if (!experiment) return response.status(404).json({ message: "未找到该实验" });
  if (!experiment.cellIds.includes(cellId as CellTypeId)) {
    return response.status(400).json({ message: "该实验不适用于此细胞类型" });
  }

  /* 只接受已定义的参数，并裁剪到定义的量程内 */
  const cleanParams: Record<string, number> = {};
  for (const def of experiment.params) {
    const raw = typeof params?.[def.id] === "number" ? (params[def.id] as number) : def.defaultValue;
    cleanParams[def.id] = Math.min(def.max, Math.max(def.min, raw));
  }

  const result: LabRunResult = runLabSimulation(experiment.id, cellId as CellTypeId, cleanParams);

  const inserted = db
    .prepare("INSERT INTO lab_runs (experiment_id, cell_id, params, result) VALUES (?, ?, ?, ?)")
    .run(experiment.id, cellId, JSON.stringify(cleanParams), JSON.stringify(result));

  return response.status(201).json({
    id: inserted.lastInsertRowid,
    experimentId: experiment.id,
    cellId,
    params: cleanParams,
    result,
    createdAt: new Date().toISOString()
  });
});

/** 实验记录列表（不含完整曲线数据，供记录面板展示） */
app.get("/api/lab/runs", (_request, response) => {
  const runs = (
    db.prepare("SELECT * FROM lab_runs ORDER BY id DESC LIMIT 50").all() as LabRunRow[]
  ).map((row) => {
    const result = JSON.parse(row.result) as LabRunResult;
    return {
      id: row.id,
      experimentId: row.experiment_id,
      cellId: row.cell_id,
      params: JSON.parse(row.params) as Record<string, number>,
      summary: result.summary,
      createdAt: row.created_at
    };
  });
  response.json({ runs });
});

/** 单条实验记录的完整数据（含时间序列，用于回放） */
app.get("/api/lab/runs/:id", (request, response) => {
  const row = db.prepare("SELECT * FROM lab_runs WHERE id = ?").get(request.params.id) as LabRunRow | undefined;
  if (!row) return response.status(404).json({ message: "未找到该实验记录" });
  return response.json({
    id: row.id,
    experimentId: row.experiment_id,
    cellId: row.cell_id,
    params: JSON.parse(row.params) as Record<string, number>,
    result: JSON.parse(row.result) as LabRunResult,
    createdAt: row.created_at
  });
});

/** 清空实验记录 */
app.delete("/api/lab/runs", (_request, response) => {
  db.prepare("DELETE FROM lab_runs").run();
  response.json({ cleared: true });
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
