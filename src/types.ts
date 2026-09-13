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
}
