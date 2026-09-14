import type { NodeDomain, RelationTypeMeta } from "../../../shared/contract";

/** 图谱领域的展示元信息（颜色同时用于节点、图例与分组标题） */
export const DOMAIN_META: Record<
  NodeDomain,
  { name: string; color: string; icon: string; hint: string }
> = {
  species: { name: "物种", color: "#67d8a3", icon: "leaf", hint: "动物、植物与微生物物种" },
  gene: { name: "基因", color: "#e8b65f", icon: "git-fork", hint: "基因、蛋白与同源关系" },
  cell: { name: "细胞", color: "#e48ac2", icon: "circle-dot", hint: "细胞类型与表达谱系" },
  ecosystem: { name: "生态系统", color: "#7eb0f2", icon: "network", hint: "生物群系与食物网" },
  human: { name: "人体系统", color: "#ef8a72", icon: "heart-pulse", hint: "器官系统与微生物组" },
  taxon: { name: "分类阶元", color: "#9aa7cf", icon: "taxon", hint: "界/门/纲等分类枢纽" },
  evolution: { name: "演化节点", color: "#c39bf0", icon: "evolution", hint: "生命史上的关键分叉" }
};

/** 关系分组的配色（边与筛选 chip） */
export const RELATION_GROUP_COLOR: Record<RelationTypeMeta["group"], string> = {
  taxonomy: "#9aa7cf",
  genetics: "#e8b65f",
  ecology: "#7eb0f2",
  physiology: "#ef8a72",
  evolution: "#c39bf0",
  general: "#8a93a6"
};

export const DOMAIN_ORDER: NodeDomain[] = [
  "species",
  "gene",
  "cell",
  "human",
  "ecosystem",
  "taxon",
  "evolution"
];
