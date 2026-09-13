export interface ViewBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** 后端返回的 SVG 图形描述：type 之外的字段直接作为 SVG 属性渲染 */
export interface ShapeSpec {
  type: "circle" | "ellipse" | "rect" | "path" | "line" | "polygon";
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
