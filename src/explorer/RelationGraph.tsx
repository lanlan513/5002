import type { RelationEdge, RelationGraph as RelationGraphData, RelationNode, RelationSelection } from "../types";

interface RelationGraphProps {
  graph: RelationGraphData;
  selection: RelationSelection | null;
  activeChainId: string | null;
  /** 当前细胞含有的细胞器 id 集合；为 null 表示细胞未载入，不做“是否存在”标注 */
  presentOrganelleIds: Set<string> | null;
  onSelectNode: (id: string) => void;
  onSelectEdge: (id: string) => void;
}

/** 各类节点的半径（图谱坐标系，画布 960 × 640） */
const NODE_R: Record<RelationNode["kind"], number> = {
  organelle: 32,
  molecule: 28,
  energy: 26,
  environment: 28
};

interface Point {
  x: number;
  y: number;
}

/**
 * 计算两个节点间的二次贝塞尔连线路径。
 * 起止点收缩到节点圆外（终点再留出箭头位置）；
 * bend 为控制点沿“方向左侧法线”的偏移量，让长连线绕开中间节点。
 */
const edgePath = (a: Point, b: Point, bend: number, r1: number, r2: number) => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.hypot(dx, dy) || 1;
  const ux = dx / dist;
  const uy = dy / dist;
  const sx = a.x + ux * r1;
  const sy = a.y + uy * r1;
  const tx = b.x - ux * (r2 + 5);
  const ty = b.y - uy * (r2 + 5);
  const cx = (sx + tx) / 2 - uy * bend;
  const cy = (sy + ty) / 2 + ux * bend;
  return {
    d: `M ${sx} ${sy} Q ${cx} ${cy} ${tx} ${ty}`,
    /* 二次贝塞尔 t = 0.5 处的中点，用于放置过程标签 */
    lx: (sx + 2 * cx + tx) / 4,
    ly: (sy + 2 * cy + ty) / 4
  };
};

export default function RelationGraph({ graph, selection, activeChainId, presentOrganelleIds, onSelectNode, onSelectEdge }: RelationGraphProps) {
  const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));
  const activeChain = graph.chains.find((chain) => chain.id === activeChainId) ?? null;
  const chainOrder = new Map((activeChain?.edgeIds ?? []).map((id, index) => [id, index]));
  const chainNodes = new Set<string>();
  if (activeChain) {
    for (const edge of graph.edges) {
      if (chainOrder.has(edge.id)) {
        chainNodes.add(edge.from);
        chainNodes.add(edge.to);
      }
    }
  }

  const selectedNodeId = selection?.type === "node" ? selection.id : null;
  const selectedEdgeId = selection?.type === "edge" ? selection.id : null;

  /** 与当前选中项相关的关系边（无选中项时全部相关） */
  const edgeRelated = (edge: RelationEdge) => {
    if (selectedNodeId) return edge.from === selectedNodeId || edge.to === selectedNodeId;
    if (selectedEdgeId) return edge.id === selectedEdgeId;
    return true;
  };

  /** 与当前选中项相关的节点 */
  const nodeRelated = (node: RelationNode) => {
    if (selectedNodeId) {
      return (
        node.id === selectedNodeId ||
        graph.edges.some(
          (edge) =>
            (edge.from === selectedNodeId && edge.to === node.id) ||
            (edge.to === selectedNodeId && edge.from === node.id)
        )
      );
    }
    if (selectedEdgeId) {
      const edge = graph.edges.find((item) => item.id === selectedEdgeId);
      return edge ? edge.from === node.id || edge.to === node.id : true;
    }
    return true;
  };

  return (
    <svg
      className="relation-svg"
      viewBox="0 0 960 640"
      role="img"
      aria-label="细胞器功能关系图谱：展示信息、物质和能量在细胞器之间的流动"
    >
      <defs>
        <marker id="arrow-information" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M 0 1 L 9 5 L 0 9 z" fill="#b9a8ff" />
        </marker>
        <marker id="arrow-material" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M 0 1 L 9 5 L 0 9 z" fill="#8fe3b4" />
        </marker>
        <marker id="arrow-energy" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M 0 1 L 9 5 L 0 9 z" fill="#f2c063" />
        </marker>
      </defs>

      {/* 关系边（先画线，节点覆盖在上层） */}
      {graph.edges.map((edge) => {
        const from = nodeById.get(edge.from);
        const to = nodeById.get(edge.to);
        if (!from || !to) return null;
        const { d, lx, ly } = edgePath(from, to, edge.bend, NODE_R[from.kind], NODE_R[to.kind]);
        const inChain = chainOrder.has(edge.id);
        const flowing = inChain || selectedEdgeId === edge.id;
        const related = edgeRelated(edge);
        const dimmed = activeChain ? !inChain : !related;
        const order = chainOrder.get(edge.id) ?? 0;
        const classes = [
          "relation-edge",
          `kind-${edge.kind}`,
          flowing ? "is-flowing" : "",
          related && !activeChain && selection ? "is-related" : "",
          dimmed ? "is-dim" : ""
        ]
          .filter(Boolean)
          .join(" ");

        return (
          <g
            key={edge.id}
            className={classes}
            tabIndex={0}
            role="button"
            aria-label={`${edge.label}：${from.name}到${to.name}`}
            onClick={() => onSelectEdge(edge.id)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelectEdge(edge.id);
              }
            }}
          >
            <path className="edge-hit" d={d} />
            <path className="edge-line" d={d} markerEnd={`url(#arrow-${edge.kind})`} />
            {flowing && (
              <>
                <circle className="flow-dot" r={3.6}>
                  <animateMotion dur="2.4s" begin={`${order * 0.45}s`} repeatCount="indefinite" path={d} />
                </circle>
                <circle className="flow-dot" r={3.6}>
                  <animateMotion dur="2.4s" begin={`${order * 0.45 + 1.2}s`} repeatCount="indefinite" path={d} />
                </circle>
              </>
            )}
            <text className="edge-label" x={lx} y={ly - 7}>
              {inChain ? `${order + 1} · ${edge.label}` : edge.label}
            </text>
          </g>
        );
      })}

      {/* 关系节点 */}
      {graph.nodes.map((node) => {
        const r = NODE_R[node.kind];
        const related = nodeRelated(node);
        const inChain = chainNodes.has(node.id);
        const dimmed = activeChain ? !inChain : !related;
        const selected = selectedNodeId === node.id;
        /* 通用图谱中不存在于当前细胞的细胞器：虚线淡化标注 */
        const absent =
          node.kind === "organelle" &&
          node.organelleId !== undefined &&
          presentOrganelleIds !== null &&
          !presentOrganelleIds.has(node.organelleId);
        const classes = [
          "relation-node",
          `kind-${node.kind}`,
          selected ? "is-selected" : "",
          dimmed ? "is-dim" : "",
          absent ? "is-absent" : ""
        ]
          .filter(Boolean)
          .join(" ");

        return (
          <g
            key={node.id}
            className={classes}
            transform={`translate(${node.x} ${node.y})`}
            tabIndex={0}
            role="button"
            aria-label={absent ? `${node.name}（不存在于当前细胞）` : node.name}
            onClick={() => onSelectNode(node.id)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelectNode(node.id);
              }
            }}
          >
            {selected && <circle className="node-pulse" r={r + 5} />}
            {node.kind === "organelle" && <circle className="node-outer" r={r + 5} />}
            <circle className="node-core" r={r} />
            {node.shortName && (
              <text className={`node-short ${node.shortName.length > 4 ? "is-long" : ""}`} y={1}>
                {node.shortName}
              </text>
            )}
            <text className="node-name" y={r + 18}>
              {node.name}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
