import cors from "cors";
import express from "express";
import {
  CATEGORIES,
  SORTS,
  type Category,
  type RecordQuery,
  type SortKey
} from "../shared/contract.js";
import { categoryList, getRecord, getStats, queryRecords } from "./data/store.js";

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

app.use((_request, response) => {
  response.status(404).json({ message: "接口不存在" });
});

app.listen(port, () => {
  console.log(`Bio Data Hub API is running at http://localhost:${port}`);
});
