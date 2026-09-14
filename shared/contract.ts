/**
 * 统一生物数据中心 —— 共享数据契约
 * 前后端唯一的数据结构来源：server 与 src 都从这里导入类型，
 * 任何模块都不允许再各自维护一份数据定义。
 */

/** 五大数据域（也是一级分类） */
export const CATEGORIES = ["species", "gene", "cell", "ecosystem", "human"] as const;
export type Category = (typeof CATEGORIES)[number];

export interface CategoryMeta {
  slug: Category;
  name: string;
  englishName: string;
  description: string;
  color: string;
  icon: string;
}

/** 可选排序方式 */
export const SORTS = ["relevance", "name", "updated_desc", "updated_asc"] as const;
export type SortKey = (typeof SORTS)[number];

/** 生物分类阶元：所有数据域共用同一套分类维度 */
export interface Taxonomy {
  /** 顶层阶元：物种用"界"，其余域复用为各自的一级分组 */
  kingdom: string;
  phylum: string;
  klass: string;
  order?: string;
  family?: string;
}

/** 可筛选主题（受控词表） */
export const THEMES = [
  "进化",
  "遗传",
  "细胞生物学",
  "分子生物学",
  "生理",
  "神经科学",
  "免疫",
  "微生物",
  "发育",
  "植物学",
  "海洋",
  "保护",
  "气候",
  "生态",
  "动物行为",
  "鸟类",
  "古生物",
  "疾病",
  "生物技术"
] as const;
export type Theme = (typeof THEMES)[number];

/**
 * 统一数据记录。
 * 物种、基因、细胞、生态系统、人体全部落在同一张结构里，
 * 用 category 区分域；metrics / attributes / links 是域内自由扩展槽，
 * 新增字段只需扩槽位而无需改动表结构或其它模块。
 */
export interface BioRecord {
  id: string;
  category: Category;
  /** 受控数据类型，例如 物种档案 / 基因序列 / 影像数据 */
  dataType: string;
  name: string;
  /** 拉丁名 / 学名 / 符号等规范化名称 */
  latinName?: string;
  code?: string;
  summary: string;
  description: string;
  taxonomy: Taxonomy;
  /** 完整分类路径，用于面包屑展示 */
  taxonPath: string[];
  themes: Theme[];
  /** 关键量化指标 */
  metrics: { label: string; value: string }[];
  /** 域内专有属性 */
  attributes: Record<string, string>;
  /** 参考与关联 */
  links: { label: string; url?: string }[];
  /** 采集/观测地点 */
  location?: string;
  /** 以毫秒计的更新时间，用于排序 */
  updatedAt: number;
  source: string;
}

/** 列表查询参数（API 与客户端状态共用） */
export interface RecordQuery {
  category?: Category;
  theme?: string;
  dataType?: string;
  kingdom?: string;
  q?: string;
  sort?: SortKey;
  page?: number;
  pageSize?: number;
}

/** 单个分面桶 */
export interface FacetBucket {
  key: string;
  label: string;
  count: number;
}

export interface FacetGroup {
  field: "category" | "theme" | "dataType" | "kingdom";
  label: string;
  buckets: FacetBucket[];
}

export interface PaginatedRecords {
  items: BioRecord[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  facets: FacetGroup[];
}

export interface CatalogStats {
  total: number;
  byCategory: { category: Category; name: string; count: number }[];
  themes: number;
  dataTypes: number;
  updatedAt: number;
}

export interface RelatedRecord {
  id: string;
  name: string;
  category: Category;
  dataType: string;
  shared: string[];
}

export interface RecordDetail extends BioRecord {
  related: RelatedRecord[];
}

export interface ApiError {
  message: string;
}

/** 客户端异步数据的统一状态 */
export type AsyncState<T> =
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "error"; message: string };
