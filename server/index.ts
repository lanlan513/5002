import cors from "cors";
import express from "express";
import {
  CATEGORIES,
  NODE_DOMAINS,
  RELATION_TYPES,
  SORTS,
  type Category,
  type NodeDomain,
  type RecordQuery,
  type RelationType,
  type SortKey
} from "../shared/contract.js";
import { categoryList, getRecord, getStats, queryRecords } from "./data/store.js";
import {
  expandNode,
  findPaths,
  getGraphStats,
  getNeighbors,
  getNode,
  relationTypes,
  resetGraph,
  searchNodes,
  subgraphAround,
  upsertEdge
} from "./data/graphStore.js";

const app = express();
const port = Number(process.env.PORT ?? 8796);

app.use(cors());
app.use(express.json());

app.get("/api/health", (_request, response) => {
  response.json({ status: "ok", service: "Bio Data Hub API" });
});

/** 数据域元信息（五大数据分类的统一定义） */
app.get("/api/categories", (_request, response) => {
  response.json(categoryList);
});

/** 全局聚合统计 */
app.get("/api/stats", (_request, response) => {
  response.json(getStats());
});

const isCategory = (value: unknown): value is Category =>
  typeof value === "string" && (CATEGORIES as readonly string[]).includes(value);

const isSort = (value: unknown): value is SortKey =>
  typeof value === "string" && (SORTS as readonly string[]).includes(value);

/**
 * 统一记录接口 —— 前端所有主要数据都通过这里获取。
 * 查询参数：category / theme / dataType / kingdom / q / sort / page / pageSize
 */
app.get("/api/records", (request, response) => {
  const { category, theme, dataType, kingdom, q, sort, page, pageSize } = request.query;

  if (category !== undefined && !isCategory(category)) {
    return response.status(400).json({ message: `未知的数据域：${String(category)}` });
  }
  if (sort !== undefined && !isSort(sort)) {
    return response.status(400).json({ message: `不支持的排序方式：${String(sort)}` });
  }

  const query: RecordQuery = {
    category: category as Category | undefined,
    theme: typeof theme === "string" && theme ? theme : undefined,
    dataType: typeof dataType === "string" && dataType ? dataType : undefined,
    kingdom: typeof kingdom === "string" && kingdom ? kingdom : undefined,
    q: typeof q === "string" && q.trim() ? q.trim() : undefined,
    sort: (sort as SortKey) ?? "relevance",
    page: page !== undefined ? Number(page) : 1,
    pageSize: pageSize !== undefined ? Number(pageSize) : 12
  };

  if ([query.page, query.pageSize].some((value) => Number.isNaN(value))) {
    return response.status(400).json({ message: "分页参数必须是数字" });
  }

  // 模拟网络/服务延迟，便于观察加载状态
  setTimeout(() => response.json(queryRecords(query)), 220);
});

/** 单条记录详情（含跨域关联记录） */
app.get("/api/records/:id", (request, response) => {
  const record = getRecord(request.params.id);
  if (!record) return response.status(404).json({ message: "未找到对应的数据记录" });
  response.json(record);
});

/** 保留交互埋点，便于前端记录浏览行为 */
app.post("/api/interactions", (request, response) => {
  const { sessionId, eventType, entityType, entityId } = request.body ?? {};
  if (![sessionId, eventType, entityType, entityId].every((value) => typeof value === "string")) {
    return response.status(400).json({ message: "交互记录字段不完整" });
  }
  return response.status(201).json({ recorded: true });
});

/* ───────────────────────── 跨领域知识图谱 API ─────────────────────────
 * 设计原则：节点与关系是一等资源；所有查询以"实体 + 关系方向"为核心，
 * 前端每次点击实体都调用邻居接口，沿边继续探索。
 */

const isNodeDomain = (value: unknown): value is NodeDomain =>
  typeof value === "string" && (NODE_DOMAINS as readonly string[]).includes(value);
const isRelation = (value: unknown): value is RelationType =>
  typeof value === "string" && (RELATION_TYPES as readonly string[]).includes(value);

/** 图谱元信息：关系类型注册表 */
app.get("/api/graph/relation-types", (_request, response) => {
  response.json(relationTypes);
});

/** 图谱整体统计（节点/边数量、域分布、连通性） */
app.get("/api/graph/stats", (_request, response) => {
  response.json(getGraphStats());
});

/** 实体搜索（按名称/学名/摘要），无关键词时返回高度数枢纽实体 */
app.get("/api/graph/search", (request, response) => {
  const { q, domain, limit } = request.query;
  if (domain !== undefined && !isNodeDomain(domain)) {
    return response.status(400).json({ message: `未知的图谱领域：${String(domain)}` });
  }
  const parsedLimit = limit === undefined ? 12 : Number(limit);
  if (Number.isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 50) {
    return response.status(400).json({ message: "limit 必须是 1–50 之间的数字" });
  }
  response.json(searchNodes(typeof q === "string" ? q : "", domain as NodeDomain | undefined, parsedLimit));
});

/** 单节点概要 */
app.get("/api/graph/nodes/:id", (request, response) => {
  const node = getNode(request.params.id);
  if (!node) return response.status(404).json({ message: "未找到该图谱实体" });
  response.json(node);
});

/**
 * 核心接口：实体的一跳邻域，按关系类型分组返回。
 * 这是"点击实体 → 继续沿关系探索"的数据源。
 */
app.get("/api/graph/neighbors/:id", (request, response) => {
  const { relation } = request.query;
  if (relation !== undefined && !isRelation(relation)) {
    return response.status(400).json({ message: `未知的关系类型：${String(relation)}` });
  }
  const result = getNeighbors(request.params.id, relation as RelationType | undefined);
  if (!result) return response.status(404).json({ message: "未找到该图谱实体" });
  response.json(result);
});

/**
 * 画布增量展开：把某实体的新邻居（?existing=id1,id2,…）加入当前图。
 * 返回的 nodes/edges 可直接合并进前端画布状态。
 */
app.get("/api/graph/expand/:id", (request, response) => {
  const existing =
    typeof request.query.existing === "string"
      ? request.query.existing.split(",").map((value) => value.trim()).filter(Boolean)
      : [];
  const result = expandNode(request.params.id, existing);
  if (!result) return response.status(404).json({ message: "未找到该图谱实体" });
  response.json(result);
});

/** 初始化画布：中心实体 depth 跳范围内的完整子图 */
app.get("/api/graph/subgraph/:id", (request, response) => {
  const depth = request.query.depth === undefined ? 1 : Number(request.query.depth);
  if (Number.isNaN(depth) || depth < 1 || depth > 3) {
    return response.status(400).json({ message: "depth 必须是 1–3 之间的数字" });
  }
  const result = subgraphAround(request.params.id, depth);
  if (!result) return response.status(404).json({ message: "未找到该图谱实体" });
  response.json(result);
});

/** 两个实体之间的最短关系路径（连续知识探索路径的解释视图） */
app.get("/api/graph/path", (request, response) => {
  const { from, to, limit } = request.query;
  if (typeof from !== "string" || typeof to !== "string") {
    return response.status(400).json({ message: "必须提供 from 与 to 两个实体 id" });
  }
  const parsedLimit = limit === undefined ? 5 : Number(limit);
  if (Number.isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 20) {
    return response.status(400).json({ message: "limit 必须是 1–20 之间的数字" });
  }
  const result = findPaths(from, to, parsedLimit);
  if (!result) return response.status(404).json({ message: "起点或终点实体不存在" });
  response.json(result);
});

/** 新增一条关系（边），演示后端的图谱建模/写入能力 */
app.post("/api/graph/edges", (request, response) => {
  const { source, target, relation, evidence } = request.body ?? {};
  if (typeof source !== "string" || typeof target !== "string" || !isRelation(relation)) {
    return response.status(400).json({ message: "字段不合法：需要 source、target 与受控 relation" });
  }
  if (evidence !== undefined && typeof evidence !== "string") {
    return response.status(400).json({ message: "evidence 必须是字符串" });
  }
  const result = upsertEdge({ source, target, relation, evidence });
  if ("error" in result) return response.status(400).json({ message: result.error });
  return response.status(result.created ? 201 : 200).json(result);
});

/** 重置演示期写入的关系，恢复种子图谱（仅演示环境使用） */
app.post("/api/graph/reset", (_request, response) => {
  resetGraph();
  response.json({ reset: true, ...getGraphStats() });
});

app.use((_request, response) => {
  response.status(404).json({ message: "接口不存在" });
});

app.listen(port, () => {
  console.log(`Bio Data Hub API is running at http://localhost:${port}`);
});
