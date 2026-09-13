import { useMemo, useRef, useState } from "react";
import type { WebLink, WebNode } from "../api";

/**
 * FoodWeb —— 可复用的生态系统网络图组件。
 * 任意生态系统只需提供 nodes / links，组件负责：
 * 按营养级分层布局、按关系类型绘制连线、 hover 高亮邻里、拖拽调整位置。
 */

type Props = {
  nodes: WebNode[];
  links: WebLink[];
  accent: string;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
};

type Positioned = WebNode & { x: number; y: number; band: number };

const ROLE_COLORS: Record<string, string> = {
  producer: "#7fd6a4",
  consumer: "#eec27f",
  decomposer: "#c9a68a",
  environment: "#8fb8d8"
};

const LINK_STYLES: Record<WebLink["type"], { color: string; dash?: string; label: string }> = {
  energy: { color: "#d9b36c", label: "能量流动（捕食）" },
  decomposition: { color: "#8d9aa6", dash: "5 5", label: "分解回归" },
  support: { color: "#7fc8a9", dash: "2 6", label: "环境支持" }
};

const BAND_LABELS = ["环境因素", "顶级消费者", "高级消费者", "初级消费者", "生产者", "分解者"];

const bandOf = (node: WebNode): number => {
  if (node.kind === "factor") return 0;
  if (node.role === "producer") return 4;
  if (node.role === "decomposer") return 5;
  const level = node.trophic_level ?? 2;
  return Math.max(1, 5 - Math.min(level, 4)); // 消费者：2→3, 3→2, 4+→1
};

const ROW_HEIGHT = 96;
const COL_WIDTH = 128;
const PAD_X = 90;
const PAD_Y = 64;

function layout(nodes: WebNode[]): { positioned: Positioned[]; width: number; height: number } {
  const bands = new Map<number, WebNode[]>();
  nodes.forEach((node) => {
    const band = bandOf(node);
    bands.set(band, [...(bands.get(band) ?? []), node]);
  });
  const maxCount = Math.max(...[...bands.values()].map((list) => list.length), 1);
  const width = Math.max(760, maxCount * COL_WIDTH + PAD_X * 2);
  const height = 6 * ROW_HEIGHT + PAD_Y * 2;

  const positioned: Positioned[] = [];
  bands.forEach((list, band) => {
    const rowWidth = (list.length - 1) * COL_WIDTH;
    list.forEach((node, index) => {
      positioned.push({
        ...node,
        band,
        x: width / 2 - rowWidth / 2 + index * COL_WIDTH,
        y: PAD_Y + band * ROW_HEIGHT
      });
    });
  });
  return { positioned, width, height };
}

export default function FoodWeb({ nodes, links, accent, selectedId, onSelect }: Props) {
  const { positioned, width, height } = useMemo(() => layout(nodes), [nodes]);
  const [overrides, setOverrides] = useState<Record<string, { x: number; y: number }>>({});
  const [hovered, setHovered] = useState<string | null>(null);
  const dragRef = useRef<{ id: string; dx: number; dy: number; moved: boolean } | null>(null);
  const suppressClickRef = useRef(false);
  const svgRef = useRef<SVGSVGElement>(null);

  const place = (node: Positioned) => overrides[node.id] ?? node;
  const byId = useMemo(() => new Map(positioned.map((node) => [node.id, node])), [positioned]);

  const focusId = hovered ?? selectedId;
  const neighbourhood = useMemo(() => {
    if (!focusId) return null;
    const nodeIds = new Set([focusId]);
    const linkIds = new Set<number>();
    links.forEach((link) => {
      if (link.from === focusId || link.to === focusId) {
        linkIds.add(link.id);
        nodeIds.add(link.from);
        nodeIds.add(link.to);
      }
    });
    return { nodeIds, linkIds };
  }, [focusId, links]);

  const toSvgPoint = (event: React.PointerEvent) => {
    const svg = svgRef.current!;
    const rect = svg.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * width,
      y: ((event.clientY - rect.top) / rect.height) * height
    };
  };

  const onPointerMove = (event: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const point = toSvgPoint(event);
    drag.moved = true;
    setOverrides((current) => ({
      ...current,
      [drag.id]: {
        x: Math.min(width - 30, Math.max(30, point.x - drag.dx)),
        y: Math.min(height - 20, Math.max(20, point.y - drag.dy))
      }
    }));
  };

  const linkPath = (link: WebLink) => {
    const sourceNode = byId.get(link.from);
    const targetNode = byId.get(link.to);
    if (!sourceNode || !targetNode) return "";
    const source = place(sourceNode);
    const target = place(targetNode);
    const mx = (source.x + target.x) / 2;
    const my = (source.y + target.y) / 2;
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const bend = Math.abs(dy) < 8 ? 34 : Math.min(46, Math.abs(dx) * 0.16) * (dx >= 0 ? 1 : -1);
    return `M ${source.x} ${source.y} Q ${mx + (Math.abs(dy) < 8 ? 0 : bend)} ${my + (Math.abs(dy) < 8 ? -34 : 0)} ${target.x} ${target.y}`;
  };

  return (
    <div className="foodweb">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="生态系统关系网络"
        onPointerMove={onPointerMove}
        onPointerUp={() => {
          if (dragRef.current?.moved) suppressClickRef.current = true;
          dragRef.current = null;
        }}
        onPointerLeave={() => (dragRef.current = null)}
      >
        <defs>
          {Object.entries(LINK_STYLES).map(([type, style]) => (
            <marker
              key={type}
              id={`arrow-${type}`}
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 9 5 L 0 9 z" fill={style.color} />
            </marker>
          ))}
        </defs>

        {/* 分层背景与标签 */}
        {BAND_LABELS.map((label, band) => (
          <g key={band} className="web-band">
            <line x1={26} x2={width - 26} y1={PAD_Y + band * ROW_HEIGHT} y2={PAD_Y + band * ROW_HEIGHT} />
            <text x={30} y={PAD_Y + band * ROW_HEIGHT - 10}>{label}</text>
          </g>
        ))}

        {/* 关系连线：箭头方向 = 能量 / 物质流动方向 */}
        {links.map((link) => {
          const style = LINK_STYLES[link.type];
          const dimmed = neighbourhood && !neighbourhood.linkIds.has(link.id);
          return (
            <path
              key={link.id}
              className="web-link"
              d={linkPath(link)}
              stroke={style.color}
              strokeDasharray={style.dash}
              strokeWidth={neighbourhood?.linkIds.has(link.id) ? 2.2 : 1.1}
              opacity={dimmed ? 0.07 : 0.75}
              markerEnd={`url(#arrow-${link.type})`}
            />
          );
        })}

        {/* 物种 / 环境因素节点 */}
        {positioned.map((node) => {
          const point = place(node);
          const color = ROLE_COLORS[node.role] ?? accent;
          const dimmed = neighbourhood && !neighbourhood.nodeIds.has(node.id);
          const active = focusId === node.id;
          return (
            <g
              key={node.id}
              className="web-node"
              transform={`translate(${point.x} ${point.y})`}
              opacity={dimmed ? 0.18 : 1}
              onPointerEnter={() => setHovered(node.id)}
              onPointerLeave={() => setHovered(null)}
              onPointerDown={(event) => {
                const pointInSvg = toSvgPoint(event);
                dragRef.current = { id: node.id, dx: pointInSvg.x - point.x, dy: pointInSvg.y - point.y, moved: false };
                svgRef.current?.setPointerCapture?.(event.pointerId);
              }}
              onClick={() => {
                if (suppressClickRef.current) { // 拖拽后不触发选中
                  suppressClickRef.current = false;
                  return;
                }
                onSelect(selectedId === node.id ? null : node.id);
              }}
            >
              <circle r={node.kind === "factor" ? 21 : 26} className="node-halo" fill={color} opacity={active ? 0.3 : 0.12} />
              <circle
                r={node.kind === "factor" ? 15 : 19}
                fill="#0d1f1a"
                stroke={color}
                strokeWidth={active ? 2.4 : 1.4}
                strokeDasharray={node.kind === "factor" ? "3 3" : undefined}
              />
              <text className="node-glyph" fill={color}>{node.name.slice(0, 1)}</text>
              <text className="node-label" y={node.kind === "factor" ? 32 : 38}>{node.name}</text>
            </g>
          );
        })}
      </svg>

      <div className="foodweb-legend">
        {Object.entries(LINK_STYLES).map(([type, style]) => (
          <span key={type}>
            <i style={{ background: style.color }} />
            {style.label}
          </span>
        ))}
        {Object.entries(ROLE_COLORS).map(([role, color]) => (
          <span key={role}>
            <i className="legend-dot" style={{ borderColor: color }} />
            {{ producer: "生产者", consumer: "消费者", decomposer: "分解者", environment: "环境因素" }[role]}
          </span>
        ))}
        {Object.keys(overrides).length > 0 && (
          <button onClick={() => setOverrides({})}>重置布局</button>
        )}
      </div>
    </div>
  );
}
