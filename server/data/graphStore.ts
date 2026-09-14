import {
  type ExpandResponse,
  type GraphEdge,
  type GraphNeighbor,
  type GraphNode,
  type GraphSearchHit,
  type GraphStats,
  type NeighborResponse,
  type NodeDomain,
  type PathHop,
  type PathResponse,
  type RelationType,
  type UpsertEdgeBody
} from "../../shared/contract.js";
import { graphEdges, graphNodes, relationList, relationMeta } from "./graphSeed.js";

/* ───────────────────────── 内存图存储 + 邻接索引 ─────────────────────────
 * 演示数据集在进程内保存：种子图是只读基线，写入接口在其上叠加用户边，
 * 邻接索引在变更后增量重建。
 */

let nodes: GraphNode[] = [...graphNodes];
let edges: GraphEdge[] = [...graphEdges];

const nodeById = new Map<string, GraphNode>();
/** 无向邻接表：一个节点上挂着所有与之相连的边 */
let incident = new Map<string, GraphEdge[]>();

const rebuildIndex = () => {
  nodeById.clear();
  nodes.forEach((node) => nodeById.set(node.id, node));
  incident = new Map(nodes.map((node) => [node.id, []]));
  edges.forEach((edge) => {
    incident.get(edge.source)?.push(edge);
    incident.get(edge.target)?.push(edge);
  });
};
rebuildIndex();

export const getNode = (id: string): GraphNode | undefined => nodeById.get(id);

/** 一跳邻居（含方向），对称关系始终按 out 展示 */
const toNeighbor = (centerId: string, edge: GraphEdge): GraphNeighbor | undefined => {
  const isOut = edge.source === centerId;
  const neighborId = isOut ? edge.target : edge.source;
  const node = nodeById.get(neighborId);
  if (!node) return undefined;
  const meta = relationMeta[edge.relation];
  return {
    node,
    edge,
    direction: isOut ? "out" : "in",
    relationLabel: isOut ? meta.label : meta.reverseLabel
  };
};

export const getNeighbors = (id: string, relationFilter?: RelationType): NeighborResponse | undefined => {
  const center = nodeById.get(id);
  if (!center) return undefined;

  const incidentEdges = incident.get(id) ?? [];
  const neighbors = incidentEdges
    .filter((edge) => !relationFilter || edge.relation === relationFilter)
    .map((edge) => toNeighbor(id, edge))
    .filter((value): value is GraphNeighbor => value !== undefined);

  // 按关系类型聚合成组，保持受控词表中的稳定顺序
  const grouped = new Map<RelationType, GraphNeighbor[]>();
  neighbors.forEach((neighbor) => {
    const list = grouped.get(neighbor.edge.relation) ?? [];
    list.push(neighbor);
    grouped.set(neighbor.edge.relation, list);
  });

  const groups = relationList
    .map((meta) => ({ relation: meta.type, label: meta.label, neighbors: grouped.get(meta.type) ?? [] }))
    .filter((group) => group.neighbors.length > 0)
    .map((group) => ({
      ...group,
      neighbors: group.neighbors.sort((a, b) =>
        a.node.domain.localeCompare(b.node.domain) || a.node.name.localeCompare(b.node.name, "zh-Hans-CN")
      )
    }));

  return { center, groups, degree: neighbors.length };
};

/**
 * 画布增量展开：从 center 再走一跳，只返回前端尚不知道的节点与边。
 * existing 是当前画布上已有的节点 id 集合。
 */
export const expandNode = (id: string, existing: string[]): ExpandResponse | undefined => {
  const center = nodeById.get(id);
  if (!center) return undefined;

  const known = new Set(existing);
  const incidentEdges = incident.get(id) ?? [];
  // 与中心直接相连、且另一端尚未在画布上的边才是真正的新增
  const addedEdges = incidentEdges.filter((edge) => {
    const other = edge.source === id ? edge.target : edge.source;
    return !known.has(other);
  });

  const addedNodeIds = new Set<string>();
  addedEdges.forEach((edge) => addedNodeIds.add(edge.source === id ? edge.target : edge.source));
  const addedNodes = [...addedNodeIds].map((nodeId) => nodeById.get(nodeId)).filter(
    (value): value is GraphNode => value !== undefined
  );

  // 新增节点之间可能本就相连（如两个同域实体），把这些"内部边"一并返回
  const internalEdges = edges.filter(
    (edge) => addedNodeIds.has(edge.source) && addedNodeIds.has(edge.target)
  );

  return { center, nodes: addedNodes, edges: dedupeEdges([...addedEdges, ...internalEdges]) };
};

const dedupeEdges = (list: GraphEdge[]): GraphEdge[] => {
  const seen = new Set<string>();
  return list.filter((edge) => {
    if (seen.has(edge.id)) return false;
    seen.add(edge.id);
    return true;
  });
};

/* ───────────────────────── 路径：BFS 求多条最短关系路径 ───────────────────────── */

const hopLabel = (edge: GraphEdge, fromId: string): string => {
  const meta = relationMeta[edge.relation];
  return edge.source === fromId ? meta.label : meta.reverseLabel;
};

const edgeKey = (edge: GraphEdge) => edge.id;

/**
 * 返回至多 limit 条长度相同（最短）的简单路径。
 * 用双向不连通快速剪枝 + BFS 层扩展，数据集小，直接遍历邻接表即可。
 */
export const findPaths = (fromId: string, toId: string, limit = 5): PathResponse | undefined => {
  const from = nodeById.get(fromId);
  const to = nodeById.get(toId);
  if (!from || !to) return undefined;
  if (fromId === toId) return { from, to, paths: [] };

  // BFS 记录前驱集合（同一最短长度可有多条路）
  const predecessors = new Map<string, Set<string>>();
  const visited = new Set<string>([fromId]);
  let frontier = new Set<string>([fromId]);
  let found = false;

  while (frontier.size > 0 && !found) {
    const next = new Set<string>();
    frontier.forEach((current) => {
      (incident.get(current) ?? []).forEach((edge) => {
        const neighbor = edge.source === current ? edge.target : edge.source;
        if (visited.has(neighbor) && !next.has(neighbor)) return;
        if (neighbor === toId) found = true;
        if (!visited.has(neighbor)) {
          next.add(neighbor);
          predecessors.set(neighbor, new Set([current]));
        } else if (next.has(neighbor)) {
          predecessors.get(neighbor)?.add(current);
        }
      });
    });
    next.forEach((nodeId) => visited.add(nodeId));
    frontier = next;
  }

  if (!found) return { from, to, paths: [] };

  // 从终点沿前驱集合回溯，构造节点 id 路径；达到 limit 即停止
  const nodePaths: string[][] = [];
  const build = (nodeId: string, trail: string[]) => {
    if (nodePaths.length >= limit) return;
    if (nodeId === fromId) {
      nodePaths.push([...trail, fromId].reverse());
      return;
    }
    predecessors.get(nodeId)?.forEach((pred) => build(pred, [...trail, nodeId]));
  };
  build(toId, []);

  const resolveEdge = (a: string, b: string): GraphEdge | undefined =>
    (incident.get(a) ?? []).find((edge) => {
      const other = edge.source === a ? edge.target : edge.source;
      return other === b;
    });

  const paths: PathHop[][] = nodePaths
    .map((nodePath) => {
      const hops: PathHop[] = [];
      for (let i = 0; i < nodePath.length - 1; i += 1) {
        const a = nodePath[i];
        const b = nodePath[i + 1];
        const edge = resolveEdge(a, b);
        if (!edge) return undefined;
        hops.push({ edge, from: nodeById.get(a)!, to: nodeById.get(b)!, label: hopLabel(edge, a) });
      }
      return hops;
    })
    .filter((value): value is PathHop[] => value !== undefined);

  return { from, to, paths: dedupePaths(paths) };
};

const dedupePaths = (paths: PathHop[][]): PathHop[][] => {
  const seen = new Set<string>();
  return paths.filter((hops) => {
    const key = hops.map((hop) => edgeKey(hop.edge)).join(">");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

/* ───────────────────────── 局部子图（供前端一次性初始化画布） ───────────────────────── */

export const subgraphAround = (centerId: string, depth = 1): { nodes: GraphNode[]; edges: GraphEdge[] } | undefined => {
  const center = nodeById.get(centerId);
  if (!center) return undefined;

  const keepNodes = new Set<string>([centerId]);
  let frontierIds = new Set<string>([centerId]);
  const keepEdges = new Set<GraphEdge>();

  for (let d = 0; d < depth; d += 1) {
    const nextFrontier = new Set<string>();
    frontierIds.forEach((id) => {
      (incident.get(id) ?? []).forEach((edge) => {
        keepEdges.add(edge);
        const other = edge.source === id ? edge.target : edge.source;
        if (!keepNodes.has(other)) {
          keepNodes.add(other);
          nextFrontier.add(other);
        }
      });
    });
    frontierIds = nextFrontier;
  }

  return {
    nodes: [...keepNodes].map((id) => nodeById.get(id)!).filter(Boolean),
    edges: [...keepEdges]
  };
};

/* ───────────────────────── 搜索 / 统计 / 写入 ───────────────────────── */

export const degreeOf = (id: string): number => incident.get(id)?.length ?? 0;

export const searchNodes = (q: string, domain?: NodeDomain, limit = 12): GraphSearchHit[] => {
  const term = q.trim().toLowerCase();
  return nodes
    .filter((node) => (!domain || node.domain === domain))
    .map((node) => {
      const haystack = [node.name, node.latinName ?? "", node.subtitle ?? "", node.summary].join(" ").toLowerCase();
      let score = 0;
      if (term) {
        if (node.name.toLowerCase() === term) score = 100;
        else if (node.name.toLowerCase().includes(term)) score = 60;
        else if (node.latinName?.toLowerCase().includes(term)) score = 40;
        else if (haystack.includes(term)) score = 10;
      } else {
        score = degreeOf(node.id);
      }
      return { node, score };
    })
    .filter((hit) => !term || hit.score > 0)
    .sort((a, b) => b.score - a.score || degreeOf(b.node.id) - degreeOf(a.node.id))
    .slice(0, limit)
    .map((hit) => ({ node: hit.node, degree: degreeOf(hit.node.id) }));
};

/** 并查集计算无向连通分支数，回答"图谱是否连成一张网" */
const connectedComponentCount = (): number => {
  const parent = new Map<string, string>(nodes.map((node) => [node.id, node.id]));
  const find = (x: string): string => {
    let root = x;
    while (parent.get(root) !== root) root = parent.get(root)!;
    return root;
  };
  const union = (a: string, b: string) => {
    const [ra, rb] = [find(a), find(b)];
    if (ra !== rb) parent.set(ra, rb);
  };
  edges.forEach((edge) => union(edge.source, edge.target));
  const roots = new Set(nodes.map((node) => find(node.id)));
  return roots.size;
};

export const getGraphStats = (): GraphStats => {
  const domainOrder: NodeDomain[] = ["species", "gene", "cell", "ecosystem", "human", "taxon", "evolution"];
  const nodesByDomain = domainOrder.map((domain) => ({
    domain,
    count: nodes.filter((node) => node.domain === domain).length
  }));
  const edgesByRelation = relationList.map((meta) => ({
    relation: meta.type,
    label: meta.label,
    count: edges.filter((edge) => edge.relation === meta.type).length
  }));
  return {
    nodeCount: nodes.length,
    edgeCount: edges.length,
    nodesByDomain,
    edgesByRelation,
    connectedComponents: connectedComponentCount()
  };
};

export const relationTypes = relationList;

/** 新增一条关系边（重复边返回已有对象），并重建邻接索引 */
export const upsertEdge = (body: UpsertEdgeBody): { edge: GraphEdge; created: boolean } | { error: string } => {
  if (!nodeById.has(body.source)) return { error: `主体实体不存在：${body.source}` };
  if (!nodeById.has(body.target)) return { error: `客体实体不存在：${body.target}` };
  if (body.source === body.target) return { error: "不允许建立实体指向自身的关系" };

  const existing = edges.find(
    (edge) => edge.source === body.source && edge.target === body.target && edge.relation === body.relation
  );
  if (existing) return { edge: existing, created: false };

  const edge: GraphEdge = {
    id: `ge-user-${Date.now()}-${edges.length + 1}`,
    source: body.source,
    target: body.target,
    relation: body.relation,
    evidence: body.evidence
  };
  edges = [...edges, edge];
  rebuildIndex();
  return { edge, created: true };
};

/** 供测试重置内存图 */
export const resetGraph = () => {
  nodes = [...graphNodes];
  edges = [...graphEdges];
  rebuildIndex();
};
