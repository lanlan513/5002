export interface ViewBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** 后端返回的 SVG 图形描述：type 之外的字段直接作为 SVG 属性渲染 */
export interface ShapeSpec {
  type: "circle" | "ellipse" | "rect" | "path" | "line" | "polygon" | "text";
  [attr: string]: string | number;
}

export interface CellSummary {
  id: string;
  name: string;
  englishName: string;
  icon: string;
  description: string;
  features: string[];
  viewBox: ViewBox;
  organelles: Array<{ id: string; name: string }>;
}

export interface CellStructure {
  id: string;
  name: string;
  label?: { x: number; y: number };
  shapes: ShapeSpec[];
}

export interface CellDetail {
  id: string;
  name: string;
  englishName: string;
  icon: string;
  description: string;
  features: string[];
  viewBox: ViewBox;
  organelles: CellStructure[];
}

export interface OrganelleDetail {
  id: string;
  name: string;
  englishName: string;
  function: string;
  location: string;
  knowledge: string[];
  presentIn: string[];
  relationNodeId: string | null;
  relations: OrganelleRelation[];
}

/* ---------- 细胞器功能关系图谱 ---------- */

export type RelationNodeKind = "organelle" | "molecule" | "energy" | "environment";
export type RelationEdgeKind = "information" | "material" | "energy";

export interface RelationNode {
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

export interface RelationEdge {
  id: string;
  from: string;
  to: string;
  label: string;
  kind: RelationEdgeKind;
  description: string;
  bend: number;
}

export interface RelationChain {
  id: string;
  name: string;
  summary: string;
  edgeIds: string[];
}

export interface RelationGraph {
  nodes: RelationNode[];
  edges: RelationEdge[];
  chains: RelationChain[];
}

/** 细胞器详情中携带的一条功能关系（方向以该细胞器为参照） */
export interface OrganelleRelation {
  edgeId: string;
  label: string;
  kind: RelationEdgeKind;
  direction: "out" | "in";
  other: { id: string; name: string; kind: RelationNodeKind };
}

/** 图谱中的当前选中项：节点或连线 */
export type RelationSelection = { type: "node"; id: string } | { type: "edge"; id: string };

/* ---------- 生命过程动态模拟 ---------- */

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

export interface ProcessKeyframe {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotate: number;
  opacity: number;
  dashOffset: number | null;
}

export interface ProcessEntity {
  id: string;
  kind: ProcessEntityKind;
  name?: string;
  organelleId?: string;
  shapes: ShapeSpec[];
  track: ProcessKeyframe[];
  path?: string;
  orientPath?: boolean;
  label?: { dx?: number; dy?: number };
}

export type ProcessMetricKind = "count" | "percent" | "number" | "text";

export interface ProcessMetric {
  id: string;
  label: string;
  unit: string;
  kind: ProcessMetricKind;
  values: Array<number | string>;
}

export interface ProcessStep {
  title: string;
  event: string;
  description: string;
  highlights: string[];
  organelleId: string;
  duration: number;
}

export interface ProcessSummary {
  id: string;
  name: string;
  englishName: string;
  icon: string;
  summary: string;
  cellIds: string[];
  position: number;
  stepCount: number;
  totalDuration: number;
}

export interface ProcessDetail extends ProcessSummary {
  initialMetrics: Array<number | string>;
  sceneViewBox: ViewBox;
  steps: ProcessStep[];
  entities: ProcessEntity[];
  metrics: ProcessMetric[];
}

/** 某一时刻经过插值后的实体状态（ProcessScene 据此渲染） */
export interface EntityState {
  id: string;
  kind: ProcessEntityKind;
  name?: string;
  organelleId?: string;
  shapes: ShapeSpec[];
  label?: { dx?: number; dy?: number };
  /** 以下变换属性为 null 表示该实体始终使用图形自身的绝对坐标，不施加变换 */
  x: number | null;
  y: number | null;
  scaleX: number | null;
  scaleY: number | null;
  rotate: number | null;
  opacity: number;
  dashOffset: number | null;
}
