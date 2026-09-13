export type TopicSlug =
  | "cells"
  | "genetics"
  | "evolution"
  | "ecology"
  | "human-body"
  | "biotech";

export interface TopicSeed {
  slug: TopicSlug;
  name: string;
  shortName: string;
  description: string;
  color: string;
  position: number;
  icon: string;
}

export interface KnowledgeSeed {
  slug: string;
  title: string;
  summary: string;
  content: string;
  topicSlug: TopicSlug;
  scale: "molecule" | "cell" | "system" | "organism" | "biosphere";
  readTime: number;
  featured: boolean;
}

/* ---------- 细胞探索器 ---------- */

export type CellTypeId = "animal" | "plant" | "prokaryote";

/**
 * 一个 SVG 图形的描述。除 type 外的字段会被前端原样映射为
 * SVG 元素属性（使用 React 约定的 camelCase，如 strokeWidth）。
 */
export interface ShapeSpec {
  type: "circle" | "ellipse" | "rect" | "path" | "line" | "polygon" | "text";
  [attr: string]: string | number;
}

export interface ViewBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** 某种细胞中的一个结构（细胞器）：图形 + 标签位置 + 叠放次序 */
export interface StructureSeed {
  organelleId: string;
  label?: { x: number; y: number };
  z: number;
  shapes: ShapeSpec[];
}

export interface CellTypeSeed {
  id: CellTypeId;
  name: string;
  englishName: string;
  icon: string;
  description: string;
  features: string[];
  viewBox: ViewBox;
  position: number;
  structures: StructureSeed[];
}

export interface OrganelleSeed {
  id: string;
  name: string;
  englishName: string;
  function: string;
  location: string;
  knowledge: string[];
}

/* ---------- 细胞器功能关系图谱 ---------- */

/** 关系节点类型：细胞器 / 分子 / 能量 / 细胞外环境 */
export type RelationNodeKind = "organelle" | "molecule" | "energy" | "environment";

/** 关系边类型：信息流动 / 物质流动 / 能量流动 */
export type RelationEdgeKind = "information" | "material" | "energy";

/**
 * 关系图谱中的一个节点。kind 为 organelle 时通过 organelleId 关联细胞器；
 * x / y 是图谱画布（960 × 640）中的布局坐标。
 */
export interface RelationNodeSeed {
  id: string;
  name: string;
  englishName?: string;
  shortName?: string;
  kind: RelationNodeKind;
  organelleId?: string;
  description: string;
  x: number;
  y: number;
}

/**
 * 一条有向关系边（from → to）。bend 控制二次贝塞尔曲线控制点
 * 沿方向左侧法线的偏移量，用于让长连线绕开中间节点。
 */
export interface RelationEdgeSeed {
  id: string;
  from: string;
  to: string;
  label: string;
  kind: RelationEdgeKind;
  description: string;
  bend?: number;
}

/** 关系链：把若干条边按顺序串成一条功能通路（如“中心法则”） */
export interface RelationChainSeed {
  id: string;
  name: string;
  summary: string;
  position: number;
  edgeIds: string[];
}

/* ---------- 生命过程动态模拟（细胞分裂 / 蛋白质合成 / 物质运输） ---------- */

/** 场景实体的类别：前端据此套用配色与绘制风格 */
export type ProcessEntityKind =
  | "membrane"
  | "nucleus"
  | "chromosome"
  | "spindle"
  | "centriole"
  | "ribosome"
  | "dna"
  | "mrna"
  | "trna"
  | "protein"
  | "vesicle"
  | "organelle"
  | "pump"
  | "channel"
  | "carrier"
  | "molecule"
  | "energy"
  | "zone"
  | "note";

/** 关键帧：只填写需要在本帧发生变化的属性（缺省沿用上一帧） */
export interface ProcessKeyframe {
  x?: number;
  y?: number;
  scaleX?: number;
  scaleY?: number;
  rotate?: number;
  opacity?: number;
  dashOffset?: number; // 沿路径生长的虚线偏移（如 mRNA 转录延长）
}

/** 状态指标的数值类型：number 在帧间平滑过渡，text 为瞬时切换 */
export type ProcessMetricKind = "count" | "percent" | "number" | "text";

export interface ProcessMetricSeed {
  id: string;
  label: string;
  unit: string;
  kind: ProcessMetricKind;
  /** 每一步结束时的取值（长度等于 steps.length） */
  values: Array<number | string>;
}

/** 场景中的一个实体：初始图形 + 每个关键帧（0..steps.length）的状态轨道 */
export interface ProcessEntitySeed {
  id: string;
  kind: ProcessEntityKind;
  name?: string;
  /** 关联到细胞器知识库：侧栏可跳回结构图查看该结构 */
  organelleId?: string;
  /** 形状都以 (0,0) 为局部中心绘制；位置由关键帧 x/y 控制 */
  shapes: ShapeSpec[];
  /** 长度 = 步数 + 1：0 为初始状态，其后每帧为该步结束时的状态 */
  track: ProcessKeyframe[];
  /** 沿 SVG 路径运动时：track[].x/y 沿此路径按弧长比例采样 */
  path?: string;
  orientPath?: boolean;
  /** 始终显示的实体名称标签（相对实体中心的偏移） */
  label?: { dx?: number; dy?: number };
  /** 叠放次序，缺省按声明顺序 */
  z?: number;
}

export interface ProcessStepSeed {
  /** 阶段标题，如“前期” */
  title: string;
  /** 关键生物学事件（事件浮层与步骤导航展示） */
  event: string;
  /** 详细解释（侧栏正文） */
  description: string;
  /** 关键生物学知识点 */
  highlights: string[];
  /** 本阶段发生的位置 / 涉及结构，可跳回结构图 */
  organelleId: string;
  duration: number;
}

export interface ProcessSeed {
  id: string;
  name: string;
  englishName: string;
  icon: string;
  summary: string;
  /** 可在哪些细胞中观察（细胞类型 id） */
  cellIds: CellTypeId[];
  position: number;
  initialMetrics: Array<number | string>;
  sceneViewBox: ViewBox;
  metrics: ProcessMetricSeed[];
  entities: ProcessEntitySeed[];
  steps: ProcessStepSeed[];
}
