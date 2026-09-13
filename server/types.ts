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
