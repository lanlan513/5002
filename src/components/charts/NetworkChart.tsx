import { useMemo, useState } from "react";
import type { NetworkData, NetworkNode } from "../../pages/insights/analytics";
import { ChartTooltip, CHART, useChartHover } from "./chartKit";

interface NetworkChartProps {
  data: NetworkData;
  emptyHint: string;
}

interface PositionedNode extends NetworkNode {
  x: number;
  y: number;
}

/**
 * 网络图：数据域 ↔ 研究主题/生物分类 的二部关系。
 * 线宽 = 同时落在两端的记录数，节点大小 = 关联记录数。
 * 布局采用带固定 X 轴的力导向松弛（确定性、无动画循环），悬停高亮邻接路径。
 */
export function NetworkChart({ data, emptyHint }: NetworkChartProps) {
  const { svgRef, hover, show, move, hide } = useChartHover();
  const [activeId, setActiveId] = useState<string | null>(null);

  const positioned = useMemo<PositionedNode[]>(() => {
    const height = 420;
    const xLeft = 130;
    const xRight = CHART.width - 130;
    const leftNodes = data.nodes.filter((node) => node.side === "left");
    const rightNodes = data.nodes.filter((node) => node.side === "right");

    const place = (nodes: NetworkNode[], x: number) =>
      nodes.map((node, index) => ({
        ...node,
        x,
        y: nodes.length === 1 ? height / 2 : 40 + (index / (nodes.length - 1)) * (height - 80)
      }));

    const nodes: PositionedNode[] = [...place(leftNodes, xLeft), ...place(rightNodes, xRight)];
    const byId = new Map(nodes.map((node) => [node.id, node]));
    if (nodes.length === 0) return nodes;

    // 固定 X 的纵向力松弛：边弹簧（只作用于 y）+ 同侧电荷排斥，迭代收敛后冻结。
    for (let step = 0; step < 260; step++) {
      const vy = new Map<string, number>();
      data.edges.forEach((edge) => {
        const s = byId.get(edge.source);
        const t = byId.get(edge.target);
        if (!s || !t) return;
        const force = (t.y - s.y) * 0.02;
        vy.set(edge.source, (vy.get(edge.source) ?? 0) + force);
        vy.set(edge.target, (vy.get(edge.target) ?? 0) - force);
      });
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          if (nodes[i].side !== nodes[j].side) continue;
          const delta = nodes[j].y - nodes[i].y;
          const distance = Math.max(24, Math.abs(delta));
          const force = 2600 / (distance * distance);
          const push = Math.sign(delta || 1) * force;
          vy.set(nodes[i].id, (vy.get(nodes[i].id) ?? 0) - push);
          vy.set(nodes[j].id, (vy.get(nodes[j].id) ?? 0) + push);
        }
      }
      nodes.forEach((node) => {
        const next = node.y + (vy.get(node.id) ?? 0) * 0.5;
        node.y = Math.min(height - 34, Math.max(34, next));
      });
      // 归位到均匀分布的重心附近，防止整列漂移
      [leftNodes, rightNodes].forEach((group) => {
        if (group.length < 2) return;
        const mean = group.reduce((sum, node) => sum + (byId.get(node.id)?.y ?? 0), 0) / group.length;
        const correction = (height / 2 - mean) * 0.05;
        group.forEach((node) => {
          const target = byId.get(node.id);
          if (target) target.y += correction;
        });
      });
    }
    return nodes;
  }, [data]);

  if (data.nodes.length === 0) return <p className="chart-empty">{emptyHint}</p>;

  const byId = new Map(positioned.map((node) => [node.id, node]));
  const maxWeight = Math.max(1, ...data.edges.map((edge) => edge.weight));
  const maxRecords = Math.max(1, ...positioned.map((node) => node.records));
  const neighborsOf = (id: string) => {
    const ids = new Set<string>([id]);
    data.edges.forEach((edge) => {
      if (edge.source === id) ids.add(edge.target);
      if (edge.target === id) ids.add(edge.source);
    });
    return ids;
  };
  const activeNeighbors = activeId ? neighborsOf(activeId) : null;

  const nodeLines = (node: NetworkNode) => {
    const links = data.edges.filter((edge) => edge.source === node.id || edge.target === node.id);
    const total = links.reduce((sum, edge) => sum + edge.weight, 0);
    return [
      { label: node.side === "left" ? "该域记录数" : "出现记录数", value: `${node.records} 条` },
      { label: `连接的${node.side === "left" ? data.rightLabel : data.leftLabel}`, value: `${links.length} 个` },
      { label: "关系边覆盖记录", value: `${total} 次` }
    ];
  };

  return (
    <div className="chart-canvas network-canvas">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${CHART.width} 420`}
        role="img"
        aria-label={`${data.leftLabel}与${data.rightLabel}关系网络图，${positioned.length} 个节点，${data.edges.length} 条关系`}
        onMouseLeave={() => {
          hide();
          setActiveId(null);
        }}
        onMouseMove={move}
      >
        <text x={130} y={20} className="chart-axis-title" textAnchor="middle">
          {data.leftLabel}
        </text>
        <text x={CHART.width - 130} y={20} className="chart-axis-title" textAnchor="middle">
          {data.rightLabel}
        </text>

        {data.edges.map((edge) => {
          const s = byId.get(edge.source);
          const t = byId.get(edge.target);
          if (!s || !t) return null;
          const dim = activeNeighbors && !(activeNeighbors.has(edge.source) && activeNeighbors.has(edge.target));
          return (
            <line
              key={`${edge.source}-${edge.target}`}
              x1={s.x}
              y1={s.y}
              x2={t.x}
              y2={t.y}
              className="network-edge"
              strokeWidth={0.8 + (edge.weight / maxWeight) * 5.5}
              opacity={dim ? 0.05 : 0.18 + (edge.weight / maxWeight) * 0.5}
            />
          );
        })}

        {positioned.map((node) => {
          const r = 7 + (node.records / maxRecords) * 12;
          const dim = activeNeighbors && !activeNeighbors.has(node.id);
          const isLeft = node.side === "left";
          return (
            <g
              key={node.id}
              opacity={dim ? 0.3 : 1}
              className="network-node"
              onMouseEnter={(event) => {
                setActiveId(node.id);
                show(event, { title: node.label, lines: nodeLines(node) });
              }}
            >
              <circle cx={node.x} cy={node.y} r={r} fill={node.color} fillOpacity={isLeft ? 0.85 : 0.22} stroke={node.color} strokeWidth={isLeft ? 1.5 : 1.2} />
              <text
                x={isLeft ? node.x - r - 8 : node.x + r + 8}
                y={node.y + 4}
                className="network-label"
                textAnchor={isLeft ? "end" : "start"}
              >
                {node.label}
                <tspan className="network-label-count"> · {node.records}</tspan>
              </text>
            </g>
          );
        })}
      </svg>
      <ChartTooltip hover={hover} width={CHART.width} />
      <p className="chart-footnote">
        节点大小 = 记录数（{Math.min(...positioned.map((n) => n.records))}–{Math.max(...positioned.map((n) => n.records))} 条），
        连线粗细 = 该{data.leftLabel}与{data.rightLabel}组合下的记录数（1–{maxWeight} 条）；悬停节点可高亮其全部关系。
        当前网络含 {positioned.filter((n) => n.side === "left").length} 个数据域、
        {positioned.filter((n) => n.side === "right").length} 个{data.rightLabel}节点、{data.edges.length} 条关系。
      </p>
    </div>
  );
}
