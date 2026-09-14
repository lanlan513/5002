/**
 * 可视化中心的数据分析层：
 * 图表只负责绘制，所有筛选 / 分组 / 聚合逻辑集中在这里，
 * 四种图表（柱状 / 折线 / 散点 / 网络）共用同一份结果集，避免各画各的。
 */
import type {
  BioRecord,
  Category,
  CategoryMeta,
  PaginatedRecords,
  RecordQuery
} from "../../../shared/contract";

// ───────────────────────── 维度与度量定义 ─────────────────────────

export type DimensionKey = "category" | "theme" | "dataType" | "kingdom" | "updatedMonth";

export interface DimensionDef {
  key: DimensionKey;
  label: string;
  hint: string;
  /** 一条记录在该维度上可能落在多个桶（例如主题），也可能只有一个 */
  keysOf: (record: BioRecord) => string[];
}

export const monthKey = (timestamp: number): string => {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};

export const monthLabel = (key: string): string => {
  const [year, month] = key.split("-");
  return `${year}年${Number(month)}月`;
};

/** 短标签用于坐标轴等空间紧张的位置 */
export const monthShort = (key: string): string => {
  const [, month] = key.split("-");
  return `${Number(month)}月`;
};

export const buildDimensions = (
  categoryName: (slug: Category) => string
): Record<DimensionKey, DimensionDef> => ({
  category: {
    key: "category",
    label: "数据域",
    hint: "物种 / 基因 / 细胞 / 生态系统 / 人体",
    keysOf: (record) => [categoryName(record.category)]
  },
  theme: {
    key: "theme",
    label: "研究主题",
    hint: "每条记录可对应多个主题标签",
    keysOf: (record) => record.themes
  },
  dataType: {
    key: "dataType",
    label: "数据类型",
    hint: "物种档案、监测时序、测序数据等受控数据类型",
    keysOf: (record) => [record.dataType]
  },
  kingdom: {
    key: "kingdom",
    label: "生物分类（界）",
    hint: "五大数据域共用的顶层分类阶元",
    keysOf: (record) => [record.taxonomy.kingdom]
  },
  updatedMonth: {
    key: "updatedMonth",
    label: "更新月份",
    hint: "按记录最后更新时间所在的自然月聚合",
    keysOf: (record) => [monthKey(record.updatedAt)]
  }
});

export type MeasureKey = "records" | "avgMetrics" | "avgThemes" | "categories";

export interface MeasureDef {
  key: MeasureKey;
  label: string;
  unit: string;
  hint: string;
  /** 对落入同一桶的记录求度量值 */
  valueOf: (recordsInBucket: BioRecord[], all: BioRecord[]) => number;
}

export const MEASURES: Record<MeasureKey, MeasureDef> = {
  records: {
    key: "records",
    label: "记录数量",
    unit: "条",
    hint: "该分组下的数据记录条数（多标签维度会重复计数）",
    valueOf: (items) => items.length
  },
  avgMetrics: {
    key: "avgMetrics",
    label: "平均指标数",
    unit: "项/条",
    hint: "组内每条记录携带的关键量化指标（metrics）平均数",
    valueOf: (items) => (items.length ? items.reduce((sum, r) => sum + r.metrics.length, 0) / items.length : 0)
  },
  avgThemes: {
    key: "avgThemes",
    label: "平均主题数",
    unit: "个/条",
    hint: "组内每条记录平均挂接的研究主题数量",
    valueOf: (items) => (items.length ? items.reduce((sum, r) => sum + r.themes.length, 0) / items.length : 0)
  },
  categories: {
    key: "categories",
    label: "覆盖数据域",
    unit: "个",
    hint: "该分组涉及多少个不同的数据域（取值 1–5）",
    valueOf: (items) => new Set(items.map((r) => r.category)).size
  }
};

// ───────────────────────── 筛选 ─────────────────────────

export interface AnalyticsFilters {
  category: string;
  theme: string;
  dataType: string;
  kingdom: string;
  q: string;
  /** YYYY-MM，空串表示不限 */
  from: string;
  to: string;
}

export const EMPTY_FILTERS: AnalyticsFilters = {
  category: "",
  theme: "",
  dataType: "",
  kingdom: "",
  q: "",
  from: "",
  to: ""
};

/** 月份字符串转成该月 1 号 00:00 / 月末 23:59 的时间戳 */
const monthStart = (key: string): number => {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month - 1, 1).getTime();
};
const monthEnd = (key: string): number => {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month, 0, 23, 59, 59, 999).getTime();
};

/** 客户端统一筛选：分类 / 主题 / 类型 / 阶元 / 关键词 / 时间范围（接口暂不支持时间范围） */
export const applyClientFilters = (records: BioRecord[], filters: AnalyticsFilters): BioRecord[] => {
  const term = filters.q.trim().toLowerCase();
  const terms = term ? term.split(/\s+/).filter(Boolean) : [];
  const fromTs = filters.from ? monthStart(filters.from) : -Infinity;
  const toTs = filters.to ? monthEnd(filters.to) : Infinity;

  return records.filter((record) => {
    if (filters.category && record.category !== filters.category) return false;
    if (filters.dataType && record.dataType !== filters.dataType) return false;
    if (filters.kingdom && record.taxonomy.kingdom !== filters.kingdom) return false;
    if (filters.theme && !record.themes.includes(filters.theme as BioRecord["themes"][number])) return false;
    if (record.updatedAt < fromTs || record.updatedAt > toTs) return false;
    if (terms.length) {
      const haystack = [
        record.name,
        record.latinName ?? "",
        record.code ?? "",
        record.summary,
        ...record.themes,
        ...record.taxonPath
      ]
        .join(" ")
        .toLowerCase();
      if (!terms.every((word) => haystack.includes(word))) return false;
    }
    return true;
  });
};

// ───────────────────────── 聚合结果 ─────────────────────────

export interface DataBucket {
  key: string;
  label: string;
  count: number;
  measure: number;
  /** 桶内记录按数据域拆分的条数，用于柱状图堆叠与图例 */
  byCategory: { category: Category; name: string; count: number }[];
}

export const aggregate = (
  records: BioRecord[],
  dimension: DimensionDef,
  measure: MeasureDef,
  categoryOrder: CategoryMeta[]
): DataBucket[] => {
  const buckets = new Map<string, BioRecord[]>();
  records.forEach((record) => {
    dimension.keysOf(record).forEach((key) => {
      const list = buckets.get(key) ?? [];
      list.push(record);
      buckets.set(key, list);
    });
  });

  const isTime = dimension.key === "updatedMonth";
  return [...buckets.entries()]
    .map(([key, items]) => {
      const counts = new Map<Category, number>();
      items.forEach((record) => counts.set(record.category, (counts.get(record.category) ?? 0) + 1));
      return {
        key,
        label: isTime ? monthLabel(key) : key,
        count: items.length,
        measure: measure.valueOf(items, records),
        byCategory: categoryOrder
          .map((meta) => ({ category: meta.slug, name: meta.name, count: counts.get(meta.slug) ?? 0 }))
          .filter((item) => item.count > 0)
      };
    })
    .sort((a, b) =>
      isTime
        ? a.key.localeCompare(b.key)
        : b.measure - a.measure || b.count - a.count || a.label.localeCompare(b.label, "zh-Hans-CN")
    );
};

/** 折线图专用：补齐空月份，保证时间轴连续 */
export const fillMissingMonths = (buckets: DataBucket[], emptyFactory: (key: string, label: string) => DataBucket) => {
  if (buckets.length <= 1) return buckets;
  const byKey = new Map(buckets.map((bucket) => [bucket.key, bucket]));
  const first = buckets[0].key;
  const last = buckets[buckets.length - 1].key;
  const cursor = new Date(monthStart(first));
  const end = monthStart(last);
  const result: DataBucket[] = [];
  while (cursor.getTime() <= end) {
    const key = monthKey(cursor.getTime());
    result.push(byKey.get(key) ?? emptyFactory(key, monthLabel(key)));
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return result;
};

// ───────────────────────── 网络图 ─────────────────────────

export type NetworkMode = "category_theme" | "category_kingdom";

export interface NetworkNode {
  id: string;
  label: string;
  side: "left" | "right";
  color: string;
  degree: number;
  records: number;
}

export interface NetworkEdge {
  source: string;
  target: string;
  weight: number;
}

export interface NetworkData {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  leftLabel: string;
  rightLabel: string;
}

export const buildNetwork = (
  records: BioRecord[],
  mode: NetworkMode,
  categories: CategoryMeta[]
): NetworkData => {
  const left = categories.map((meta) => ({
    id: meta.slug,
    label: meta.name,
    color: meta.color
  }));
  const rightKeyOf = (record: BioRecord): string[] =>
    mode === "category_theme" ? record.themes : [record.taxonomy.kingdom];

  const edgeWeight = new Map<string, number>();
  const rightDegree = new Map<string, number>();
  const rightRecords = new Map<string, Set<string>>();

  records.forEach((record) => {
    rightKeyOf(record).forEach((key) => {
      const edgeId = `${record.category}→${key}`;
      edgeWeight.set(edgeId, (edgeWeight.get(edgeId) ?? 0) + 1);
      rightDegree.set(key, (rightDegree.get(key) ?? 0) + 1);
      const set = rightRecords.get(key) ?? new Set<string>();
      set.add(record.id);
      rightRecords.set(key, set);
    });
  });

  const presentLeft = new Set(records.map((record) => record.category));
  const nodes: NetworkNode[] = [
    ...left
      .filter((item) => presentLeft.has(item.id as Category))
      .map((item) => ({
        id: item.id,
        label: item.label,
        side: "left" as const,
        color: item.color,
        degree: [...edgeWeight.keys()].filter((id) => id.startsWith(`${item.id}→`)).length,
        records: records.filter((record) => record.category === item.id).length
      })),
    ...[...rightDegree.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "zh-Hans-CN"))
      .map(([key, degree]) => ({
        id: key,
        label: key,
        side: "right" as const,
        color: "#cfe8dd",
        degree,
        records: rightRecords.get(key)?.size ?? 0
      }))
  ];

  const edges: NetworkEdge[] = [...edgeWeight.entries()]
    .map(([id, weight]) => {
      const [source, target] = id.split("→");
      return { source, target, weight };
    })
    .sort((a, b) => b.weight - a.weight);

  return {
    nodes,
    edges,
    leftLabel: "数据域",
    rightLabel: mode === "category_theme" ? "研究主题" : "生物分类（界）"
  };
};

// ───────────────────────── 取数 ─────────────────────────

/** 可视化页一次性拉取全量记录（数据集规模约数十条），所有图表在客户端联动筛选 */
export const fetchAllRecords = async (
  apiRecords: (query: RecordQuery, signal?: AbortSignal) => Promise<PaginatedRecords>,
  signal?: AbortSignal
): Promise<BioRecord[]> => {
  // pageSize 上限 100，当前演示数据 37 条；若未来超出则继续翻页拉全
  const first = await apiRecords({ pageSize: 100 }, signal);
  if (first.total <= first.items.length) return first.items;

  const rest = await Promise.all(
    Array.from({ length: first.totalPages - 1 }, (_, index) =>
      apiRecords({ pageSize: 100, page: index + 2 }, signal)
    )
  );
  return [...first.items, ...rest.flatMap((page) => page.items)];
};

export const formatMeasure = (value: number, measure: MeasureDef): string => {
  if (measure.key === "records" || measure.key === "categories") return String(Math.round(value));
  return value.toFixed(2);
};
