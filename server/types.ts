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
  type: "circle" | "ellipse" | "rect" | "path" | "line" | "polygon";
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
