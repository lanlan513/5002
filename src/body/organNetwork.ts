import type { Hotspot, OrganRelationEdge, RelationNode, SubstanceKind } from "../api";

export type EdgeKey = string;

export const edgeKey = (from: string, to: string): EdgeKey => `${from}>${to}`;

const hotspotMap = (nodes: RelationNode[]) => {
  const map = new Map<string, Hotspot>();
  nodes.forEach((node) => map.set(node.slug, node.hotspot));
  return map;
};

export interface EdgeGeometry {
  key: EdgeKey;
  edge: OrganRelationEdge;
  /** 基线（多物质并行线的中线）路径，两端截断到热点头缘 */
  basePath: string;
  /** 基线的长度，用于物质 lane 错行判断 */
  length: number;
  /** 反向边是否同时存在（双向对时两条线向两侧分开） */
  bidirectional: boolean;
  /** 基线弯曲方向上的法向单位向量 */
  nx: number;
  ny: number;
  /** 每条物质 lane 的路径（已按双向对与物质序号错行） */
  lanes: { substance: SubstanceKind; path: string }[];
}

const truncate = (a: Hotspot, b: Hotspot) => {
  // 以 hotspot 圆心为锚点，把线段两端收进圆内，避免箭头压在器官标记上
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.hypot(dx, dy) || 1;
  const ux = dx / dist;
  const uy = dy / dist;
  return {
    sx: a.x + ux * a.r * 0.72,
    sy: a.y + uy * a.r * 0.72,
    tx: b.x - ux * b.r * 0.82,
    ty: b.y - uy * b.r * 0.82,
    length: Math.max(1, Math.hypot(b.x - a.x, b.y - a.y) - a.r * 0.72 - b.r * 0.82)
  };
};

/** 弯曲控制点：躯干左右侧器官之间的长边绕出弧度，避免直线横穿身体中线 */
const curvedPath = (
  sx: number,
  sy: number,
  tx: number,
  ty: number,
  nx: number,
  ny: number,
  bend: number
) => {
  const mx = (sx + tx) / 2;
  const my = (sy + ty) / 2;
  const cx = mx + nx * bend;
  const cy = my + ny * bend;
  return `M ${sx} ${sy} Q ${cx} ${cy} ${tx} ${ty}`;
};

export function buildEdgeGeometries(
  edges: OrganRelationEdge[],
  nodes: RelationNode[]
): EdgeGeometry[] {
  const spots = hotspotMap(nodes);
  const pairCount = new Map<string, number>();
  edges.forEach(({ from, to }) => {
    pairCount.set(edgeKey(from, to), 1);
  });
  const isBidirectional = (edge: OrganRelationEdge) =>
    pairCount.has(edgeKey(edge.to, edge.from));

  return edges
    .map((edge) => {
      const a = spots.get(edge.from);
      const b = spots.get(edge.to);
      if (!a || !b) return null;
      const { sx, sy, tx, ty, length } = truncate(a, b);
      // 法向：源点指向“身体外侧”一侧，使弯曲弧线绕过身体中线
      const dx = tx - sx;
      const dy = ty - sy;
      const dist = Math.hypot(dx, dy) || 1;
      let nx = -dy / dist;
      let ny = dx / dist;
      const midX = (sx + tx) / 2;
      const outward = midX >= 120 ? 1 : -1;
      nx *= outward;
      ny *= outward;

      const bidirectional = isBidirectional(edge);
      const longEdge = length > 95;
      const bend = longEdge ? 10 : bidirectional ? 6 : 4;
      const basePath = curvedPath(sx, sy, tx, ty, nx, ny, bend);

      // 同一基线上的多种物质，沿法向轻微错行，便于分辨颜色
      const laneGap = 2.6;
      const lanes = edge.substances.map((substance, index) => {
        const shift = (index - (edge.substances.length - 1) / 2) * laneGap;
        if (shift === 0) {
          return { substance, path: curvedPath(sx, sy, tx, ty, nx, ny, bend) };
        }
        return {
          substance,
          path: curvedPath(
            sx + nx * shift,
            sy + ny * shift,
            tx + nx * shift,
            ty + ny * shift,
            nx,
            ny,
            bend
          )
        };
      });

      return { key: edgeKey(edge.from, edge.to), edge, basePath, length, bidirectional, nx, ny, lanes };
    })
    .filter((item): item is EdgeGeometry => item !== null);
}

/** 找出与某器官直接相连的关系（双向） */
export function edgesForOrgan(
  edges: OrganRelationEdge[],
  slug: string
): OrganRelationEdge[] {
  return edges.filter((edge) => edge.from === slug || edge.to === slug);
}
