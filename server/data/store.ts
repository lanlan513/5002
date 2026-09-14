import {
  CATEGORIES,
  type BioRecord,
  type Category,
  type FacetGroup,
  type PaginatedRecords,
  type RecordDetail,
  type RecordQuery,
  type RelatedRecord,
  type SortKey
} from "../../shared/contract.js";
import { categories, records } from "./seed.js";

const categoryName = new Map(categories.map((category) => [category.slug, category.name]));
const DEFAULT_PAGE_SIZE = 12;

/** 全部文本字段参与搜索：名称、学名、编码、摘要、描述、分类、主题、专有属性 */
const searchableText = (record: BioRecord): string =>
  [
    record.name,
    record.latinName ?? "",
    record.code ?? "",
    record.summary,
    record.description,
    ...record.taxonPath,
    ...record.themes,
    ...Object.values(record.attributes),
    ...Object.values(record.metrics).map((metric) => `${metric.label}${metric.value}`)
  ]
    .join(" ")
    .toLowerCase();

const matchQuery = (record: BioRecord, query: RecordQuery): boolean => {
  if (query.category && record.category !== query.category) return false;
  if (query.dataType && record.dataType !== query.dataType) return false;
  if (query.kingdom && record.taxonomy.kingdom !== query.kingdom) return false;
  if (query.theme && !record.themes.includes(query.theme as BioRecord["themes"][number])) return false;
  if (query.q) {
    const terms = query.q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (terms.length && !terms.every((term) => searchableText(record).includes(term))) return false;
  }
  return true;
};

const score = (record: BioRecord, term: string): number =>
  `${record.name} ${record.latinName ?? ""} ${record.code ?? ""}`.toLowerCase().includes(term) ? 1 : 0;

const sortRecords = (items: BioRecord[], sort: SortKey, searchTerm: string): BioRecord[] => {
  const copy = [...items];
  switch (sort) {
    case "name":
      return copy.sort((a, b) => a.name.localeCompare(b.name, "zh-Hans-CN"));
    case "updated_desc":
      return copy.sort((a, b) => b.updatedAt - a.updatedAt);
    case "updated_asc":
      return copy.sort((a, b) => a.updatedAt - b.updatedAt);
    case "relevance":
    default:
      // 有搜索词时命中名称/学名的记录优先，其次按更新时间；无搜索词时最新优先
      return copy.sort(
        (a, b) =>
          (searchTerm ? score(b, searchTerm) - score(a, searchTerm) : 0) || b.updatedAt - a.updatedAt
      );
  }
};

/**
 * 构建分面：每个分面桶的计数基于“除该维度外其余条件”的结果集，
 * 因此用户选择筛选器后仍能看到切换选项后的数量。
 */
const buildFacets = (base: BioRecord[], query: RecordQuery): FacetGroup[] => {
  const buckets = (
    field: "category" | "theme" | "dataType" | "kingdom",
    label: string,
    getKeys: (record: BioRecord) => string[],
    keyLabel?: (key: string) => string
  ): FacetGroup => {
    const scoped = base.filter((record) => matchQuery(record, { ...query, [field]: undefined }));
    const counts = new Map<string, number>();
    scoped.forEach((record) => {
      getKeys(record).forEach((key) => counts.set(key, (counts.get(key) ?? 0) + 1));
    });
    return {
      field,
      label,
      buckets: [...counts.entries()]
        .map(([key, count]) => ({ key, label: keyLabel?.(key) ?? key, count }))
        .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "zh-Hans-CN"))
    };
  };

  return [
    buckets("category", "数据域", (record) => [record.category], (key) => categoryName.get(key as Category) ?? key),
    buckets("theme", "主题", (record) => record.themes),
    buckets("dataType", "数据类型", (record) => [record.dataType]),
    buckets("kingdom", "生物分类", (record) => [record.taxonomy.kingdom])
  ];
};

/** 统一列表查询：筛选 + 分面 + 排序 + 分页，一个出口服务所有模块 */
export const queryRecords = (rawQuery: RecordQuery): PaginatedRecords => {
  const query: RecordQuery = { ...rawQuery };
  const pageSize = Math.min(Math.max(Number(query.pageSize) || DEFAULT_PAGE_SIZE, 1), 100);
  const page = Math.max(Number(query.page) || 1, 1);
  const sort: SortKey = query.sort ?? "relevance";
  const searchTerm = query.q?.trim().toLowerCase() ?? "";

  const filtered = records.filter((record) => matchQuery(record, query));
  const sorted = sortRecords(filtered, sort, searchTerm);
  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const items = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);

  return {
    items,
    page: safePage,
    pageSize,
    total,
    totalPages,
    facets: buildFacets(records, query)
  };
};

export const getRecord = (id: string): RecordDetail | undefined => {
  const record = records.find((item) => item.id === id);
  if (!record) return undefined;

  const related: RelatedRecord[] = records
    .filter((item) => item.id !== id)
    .map((item) => {
      const shared = [
        ...item.themes.filter((theme) => record.themes.includes(theme)),
        ...(item.taxonomy.kingdom === record.taxonomy.kingdom ? [`同阶元 · ${item.taxonomy.kingdom}`] : [])
      ];
      return { id: item.id, name: item.name, category: item.category, dataType: item.dataType, shared };
    })
    .filter((item) => item.shared.length > 0)
    .sort((a, b) => b.shared.length - a.shared.length || a.name.localeCompare(b.name, "zh-Hans-CN"))
    .slice(0, 6);

  return { ...record, related };
};

export const getStats = () => ({
  total: records.length,
  byCategory: CATEGORIES.map((category) => ({
    category,
    name: categoryName.get(category) ?? category,
    count: records.filter((record) => record.category === category).length
  })),
  themes: new Set(records.flatMap((record) => record.themes)).size,
  dataTypes: new Set(records.map((record) => record.dataType)).size,
  updatedAt: Math.max(...records.map((record) => record.updatedAt))
});

export const categoryList = categories;
