import { useMemo, useRef, useState } from "react";
import type { WebNode } from "../api";
import { isCompetition, type GraphLink } from "./food-web-utils";

/**
 * FoodWeb —— 可复用的食物网网络图组件。
 * 任意生态系统只需提供 nodes / links（可含推导得到的 competition 边）：
 * - 按营养级分层布局，能量边动画流动方向即能量传递方向；
 * - 点击节点高亮上游（食物）与下游（天敌），邻里节点挂方向标签；
 * - visibleIds 非空时进入局部观察模式，隐藏其余节点；
 * - 支持拖拽调整位置。
 */

type Props = {
  nodes: WebNode[];
  links: GraphLink[];
  accent: string;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  /** 局部网络模式：仅渲染该集合内的节点（null 表示显示全图） */
  visibleIds?: Set<string> | null;
};

type Positioned = WebNode & { x: number; y: number; band: number };

const ROLE_COLORS: Record<string, string> = {
  producer: "#7fd6a4",
  consumer: "#eec27f",
  decomposer: "#c9a68a",
  environment: "#8fb8d8"
};

const LINK_STYLES: Record<string, { color: string; dash?: string; label: string }> = {
  energy: { color: "#d9b36c", label: "能量流动（捕食）" },
  decomposition: { color: "#8d9aa6", dash: "5 5", label: "分解回归" },
  support: { color: "#7fc8a9", dash: "2 6", label: "环境支持" },
  competition: { color: "#c39ce0", dash: "1.5 5", label: "竞争（共享食物）" }
};

/* 选中时的语义色：上游食物 = 绿，下游天敌 = 红 */
const PREY_COLOR = "#7fe0a0";
const PREDATOR_COLOR = "#ef8f74";

/** 邻里节点方向标签：决定它是选中节点的食物 / 天敌 / 竞争者 / … */
type Direction = { text: string; color: string; order: number };

const directionFor = (neighborId: string, focusId: string, links: GraphLink[]): Direction | null => {
  const dirs: Direction[] = [];
  links.forEach((link) => {
    if (link.type === "competition") return;
    if (link.to === focusId && link.from === neighborId) {
      dirs.push(
        link.type === "energy"
          ? { text: "食物", color: PREY_COLOR, order: 0 }
          : link.type === "decomposition"
            ? { text: "分解对象", color: "#b8c4cf", order: 2 }
            : { text: "依赖环境", color: "#7fc8a9", order: 3 }
      );
    }
    if (link.from === focusId && link.to === neighborId) {
      dirs.push(
        link.type === "energy"
          ? { text: "天敌", color: PREDATOR_COLOR, order: 1 }
          : link.type === "decomposition"
            ? { text: "分解者", color: "#c9a68a", order: 2 }
            : { text: "支持对象", color: "#7fc8a9", order: 3 }
      );
    }
  });
  if (!dirs.length) {
    // 竞争边
    const competes = links.some(
      (link) => link.type === "competition" &&
      ((link.from === focusId && link.to === neighborId) || (link.to === focusId && link.from === neighborId))
    );
    if (competes) return { text: "竞争者", color: LINK_STYLES.competition.color, order: 4 };
    return null;
  }
  dirs.sort((a, b) => a.order - b.order);
  // 同一邻里最多挂两个标签（如既是食物又被分解）
  return dirs[0];
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

export default function FoodWeb({ nodes, links, accent, selectedId, onSelect, visibleIds }: Props) {
  // 布局始终基于全量节点计算：局部模式下保留节点的原始空间位置，关系位置不跳变
  const { positioned, width, height } = useMemo(() => layout(nodes), [nodes]);
  const [overrides, setOverrides] = useState<Record<string, { x: number; y: number }>>({});
  const [hovered, setHovered] = useState<string | null>(null);
  const dragRef = useRef<{ id: string; dx: number; dy: number; moved: boolean } | null>(null);
  const suppressClickRef = useRef(false);
  const svgRef = useRef<SVGSVGElement>(null);

  const place = (node: Positioned) => overrides[node.id] ?? node;
  const byId = useMemo(() => new Map(positioned.map((node) => [node.id, node])), [positioned]);

  const focusMode = visibleIds != null;
  const focusId = hovered ?? selectedId;
  const neighbourhood = useMemo(() => {
    if (!focusId) return null;
    const nodeIds = new Set([focusId]);
    const linkIds = new Set<string>();
    links.forEach((link) => {
      if (link.from === focusId || link.to === focusId) {
        linkIds.add(link.id.toString());
        nodeIds.add(link.from);
        nodeIds.add(link.to);
      }
    });
    return { nodeIds, linkIds };
  }, [focusId, links]);

  const hidden = (id: string) => focusMode && !visibleIds!.has(id);

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

  const linkPath = (link: GraphLink) => {
    const sourceNode = byId.get(link.from);
    const targetNode = byId.get(link.to);
    if (!sourceNode || !targetNode) return "";
    const source = place(sourceNode);
    const target = place(targetNode);
    const mx = (source.x + target.x) / 2;
    const my = (source.y + target.y) / 2;
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    if (link.type === "competition") {
      // 竞争者基本同层，弧线向上拱起
      const bend = Math.min(52, 40 + Math.abs(dx) * 0.08);
      return `M ${source.x} ${source.y} Q ${mx} ${Math.min(source.y, target.y) - bend} ${target.x} ${target.y}`;
    }
    const bend = Math.abs(dy) < 8 ? 34 : Math.min(46, Math.abs(dx) * 0.16) * (dx >= 0 ? 1 : -1);
    return `M ${source.x} ${source.y} Q ${mx + (Math.abs(dy) < 8 ? 0 : bend)} ${my + (Math.abs(dy) < 8 ? -34 : 0)} ${target.x} ${target.y}`;
  };

  /** 选中时一条能量边的语义样式：流向焦点 = 食物（绿），离开焦点 = 天敌（红） */
  const energyTint = (link: GraphLink): string | null => {
    if (link.type !== "energy" || !focusId) return null;
    if (link.to === focusId) return PREY_COLOR;
    if (link.from === focusId) return PREDATOR_COLOR;
    return null;
  };

  return (
    <div className="foodweb">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="生态系统食物网关系图"
        onPointerMove={onPointerMove}
        onPointerUp={() => {
          if (dragRef.current?.moved) suppressClickRef.current = true;
          dragRef.current = null;
        }}
        onPointerLeave={() => (dragRef.current = null)}
      >
        <defs>
          {Object.entries(LINK_STYLES)
            .filter(([type]) => type !== "competition")
            .map(([type, style]) => (
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
          {/* 选中时的语义箭头：食物（绿）/ 天敌（红） */}
          <marker id="arrow-focus-prey" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M 0 1 L 9 5 L 0 9 z" fill={PREY_COLOR} />
          </marker>
          <marker id="arrow-focus-predator" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M 0 1 L 9 5 L 0 9 z" fill={PREDATOR_COLOR} />
          </marker>
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
          if (hidden(link.from) || hidden(link.to)) return null;
          const style = LINK_STYLES[link.type];
          const isActive = neighbourhood?.linkIds.has(link.id.toString());
          const dimmed = neighbourhood && !isActive;
          const tint = energyTint(link);
          const competition = isCompetition(link);
          return (
            <g key={link.id} className={isActive ? "web-link-group is-active" : "web-link-group"} opacity={dimmed ? 0.07 : 1}>
              <path
                className="web-link"
                d={linkPath(link)}
                stroke={tint ?? style.color}
                strokeDasharray={style.dash}
                strokeWidth={isActive ? (competition ? 1.8 : 2.4) : competition ? 1 : 1.1}
                opacity={competition ? 0.6 : 0.75}
                strokeLinecap="round"
                markerEnd={
                  competition
                    ? undefined
                    : tint === PREY_COLOR
                      ? "url(#arrow-focus-prey)"
                      : tint === PREDATOR_COLOR
                        ? "url(#arrow-focus-predator)"
                        : `url(#arrow-${link.type})`
                }
              >
                {competition && (
                  <title>
                    {link.mode === "predation"
                      ? `捕食竞争：共享 ${link.shared.length} 种猎物`
                      : `分解生态位竞争：共同分解 ${link.shared.length} 种有机对象`}
                  </title>
                )}
              </path>
              {/* 被选中能量边的流动光点，直观呈现能量传递方向 */}
              {link.type === "energy" && isActive && (
                <path
                  className="web-flow"
                  d={linkPath(link)}
                  stroke={tint ?? LINK_STYLES.energy.color}
                />
              )}
            </g>
          );
        })}

        {/* 物种 / 环境因素节点 */}
        {positioned.map((node) => {
          if (hidden(node.id)) return null;
          const point = place(node);
          const color = ROLE_COLORS[node.role] ?? accent;
          const dimmed = neighbourhood && !neighbourhood.nodeIds.has(node.id);
          const active = focusId === node.id;
          const direction = focusId && focusId !== node.id ? directionFor(node.id, focusId, links) : null;
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
              <circle r={node.kind === "factor" ? 21 : 26} className="node-halo" fill={direction?.color ?? color} opacity={active ? 0.3 : 0.12} />
              <circle
                r={node.kind === "factor" ? 15 : 19}
                fill="#0d1f1a"
                stroke={direction?.color ?? color}
                strokeWidth={active ? 2.4 : 1.4}
                strokeDasharray={node.kind === "factor" ? "3 3" : undefined}
              />
              <text className="node-glyph" fill={color}>{node.name.slice(0, 1)}</text>
              <text className="node-label" y={node.kind === "factor" ? 32 : 38}>{node.name}</text>
              {direction && (
                <g className="node-direction" transform={`translate(0 ${node.kind === "factor" ? -27 : -32})`}>
                  {(() => {
                    const tagWidth = direction.text.length * 10 + 12;
                    return (
                      <>
                        <rect x={-tagWidth / 2} y={-8} width={tagWidth} height={15} rx={7.5} fill="#0d1f1a" stroke={direction.color} />
                        <text textAnchor="middle" dominantBaseline="central" y={0} fill={direction.color}>{direction.text}</text>
                      </>
                    );
                  })()}
                </g>
              )}
            </g>
          );
        })}
      </svg>

      <div className="foodweb-legend">
        {Object.entries(LINK_STYLES).map(([type, style]) => (
          <span key={type}>
            <i style={{ background: style.color }} className={type === "competition" ? "legend-dashed" : undefined} />
            {style.label}
          </span>
        ))}
        {Object.entries(ROLE_COLORS).map(([role, color]) => (
          <span key={role}>
            <i className="legend-dot" style={{ borderColor: color }} />
            {{ producer: "生产者", consumer: "消费者", decomposer: "分解者", environment: "环境因素" }[role]}
          </span>
        ))}
        {selectedId && (
          <span className="legend-direction">
            <i style={{ background: PREY_COLOR }} /> 食物方向
            <i style={{ background: PREDATOR_COLOR, marginLeft: 8 }} /> 天敌方向
          </span>
        )}
        {Object.keys(overrides).length > 0 && (
          <button onClick={() => setOverrides({})}>重置布局</button>
        )}
      </div>
    </div>
  );
}
