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

/* ═══════════════════════ 跨领域知识图谱 Knowledge Graph ═══════════════════════
 *
 * 图谱是覆盖在统一记录池之上的显式关系层：
 *   - 节点 GraphNode 复用 BioRecord（一个记录 = 一个可探索实体）；
 *   - 边 GraphEdge 是有向的、带受控关系类型（relation）的一等对象；
 *   - 分类阶元、演化节点等"概念实体"以 domain="taxon"/"evolution" 的节点单独存在，
 *     从而把物种、基因、细胞、生态系统、人体等不同模块连成一张图。
 */

/** 图节点所属领域：前五个对应数据域，另加分类阶元与演化时间线两类"枢纽实体" */
export const NODE_DOMAINS = ["species", "gene", "cell", "ecosystem", "human", "taxon", "evolution"] as const;
export type NodeDomain = (typeof NODE_DOMAINS)[number];

/**
 * 受控关系类型（有向边）。
 * 方向一律写成"主体 → 客体"，反向邻居由 API 自动处理，前端无需反向类型。
 */
export const RELATION_TYPES = [
  "BELONGS_TO", // 物种 → 分类阶元
  "PARENT_TAXON", // 分类阶元 → 上级分类阶元
  "ENCODES_IN", // 基因 → 物种（该基因所属/注释物种）
  "ORTHOLOG_OF", // 基因 ↔ 基因：跨物种同源
  "FOUND_IN", // 细胞 → 物种（细胞类型存在于该物种）
  "PART_OF", // 细胞 → 人体系统
  "LIVES_IN", // 物种 → 生态系统
  "INTERACTS_WITH", // 人体系统 ↔ 人体系统
  "HOSTS", // 人体系统 → 物种（微生物组宿主/定植关系）
  "EATS", // 物种 → 物种：捕食 / 取食
  "DERIVED_FROM", // 物种/演化节点 → 演化节点：演化来源
  "RELATED_TO" // 兜底的跨域研究关联
] as const;
export type RelationType = (typeof RELATION_TYPES)[number];

export interface RelationTypeMeta {
  type: RelationType;
  /** 正向可读标签，如"属于分类" */
  label: string;
  /** 逆向可读标签，如"包含物种" */
  reverseLabel: string;
  /** 边的主题分组，用于前端着色与筛选 */
  group: "taxonomy" | "genetics" | "ecology" | "physiology" | "evolution" | "general";
  /** 是否天然对称（同源、系统互作） */
  symmetric: boolean;
}

/** 图节点：统一记录实体 + 概念实体（分类阶元、演化节点）共用 */
export interface GraphNode {
  id: string;
  domain: NodeDomain;
  name: string;
  /** 学名 / 拉丁名 / 英文名 */
  latinName?: string;
  /** 节点副标题，如数据类型或地质年代 */
  subtitle?: string;
  /** 实体一句话摘要（概念实体同样提供） */
  summary: string;
  /** 关联到统一记录池的记录 id；概念实体为 undefined */
  recordId?: string;
  /** 概念实体的附加属性，如分类阶元等级、距今百万年数 */
  attrs?: Record<string, string | number>;
}

/** 有向关系边，主体 source → 客体 target */
export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  relation: RelationType;
  /** 边上的补充说明，如"取食珊瑚幼虫""深同源" */
  evidence?: string;
}

/** 带方向的邻居：node 是邻居实体，edge 是两者之间的边，direction 表示边相对于查询实体的方向 */
export interface GraphNeighbor {
  node: GraphNode;
  edge: GraphEdge;
  direction: "out" | "in";
  /** 结合方向后的可读关系短语，如"以…为食 / 被…取食" */
  relationLabel: string;
}

/** GET /api/graph/neighbors/:id —— 点击实体后返回的一跳邻域 */
export interface NeighborResponse {
  center: GraphNode;
  /** 按关系类型分组后的邻居，直接支撑前端的"沿关系分组浏览" */
  groups: {
    relation: RelationType;
    label: string;
    neighbors: GraphNeighbor[];
  }[];
  degree: number;
}

/** GET /api/graph/expand —— 画布增量展开：返回新节点与新边（不含已在图上的部分） */
export interface ExpandResponse {
  center: GraphNode;
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/** 一条连续探索路径上的单跳 */
export interface PathHop {
  edge: GraphEdge;
  from: GraphNode;
  to: GraphNode;
  /** 该跳展示给用户的关系短语（已处理方向） */
  label: string;
}

/** GET /api/graph/path —— 两个实体之间的关系路径 */
export interface PathResponse {
  from: GraphNode;
  to: GraphNode;
  /** 按长度排序的最短路径（最多返回若干条） */
  paths: PathHop[][];
}

export interface GraphStats {
  nodeCount: number;
  edgeCount: number;
  nodesByDomain: { domain: NodeDomain; count: number }[];
  edgesByRelation: { relation: RelationType; label: string; count: number }[];
  /** 无向意义下的连通分支数，用来描述图谱是否"连成一张图" */
  connectedComponents: number;
}

/** GET /api/graph/search 的单条结果 */
export interface GraphSearchHit {
  node: GraphNode;
  degree: number;
}

/** POST /api/graph/edges 等写入接口的载荷（供后续众包/编辑使用） */
export interface UpsertEdgeBody {
  source: string;
  target: string;
  relation: RelationType;
  evidence?: string;
}

/** 客户端异步数据的统一状态 */
export type AsyncState<T> =
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "error"; message: string };
