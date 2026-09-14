import { useEffect, useMemo, useRef, useState } from "react";
import type { GraphEdge, GraphNode, RelationTypeMeta } from "../../../shared/contract";
import { ForceLayout, type SimNode } from "./forceLayout";
import { DOMAIN_META, RELATION_GROUP_COLOR } from "./domainMeta";

interface GraphCanvasProps {
  layout: ForceLayout;
  selectedId: string | null;
  highlightedIds: Set<string>;
  relationTypes: RelationTypeMeta[];
  hiddenGroups: Set<string>;
  onSelect: (id: string) => void;
  onExpand: (id: string) => void;
  /** 每次展开后用于触发重渲染的版本号 */
  version: number;
  loadingExpand: boolean;
}

const RADIUS: Record<string, number> = {
  species: 22,
  gene: 19,
  cell: 17,
  ecosystem: 24,
  human: 20,
  taxon: 15,
  evolution: 20
};

export function GraphCanvas({
  layout,
  selectedId,
  highlightedIds,
  relationTypes,
  hiddenGroups,
  onSelect,
  onExpand,
  version,
  loadingExpand
}: GraphCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [, setFrame] = useState(0);
  const dragRef = useRef<{ node: SimNode; dx: number; dy: number; moved: boolean } | null>(null);
  const [viewport, setViewport] = useState({ width: 900, height: 640 });

  const relationById = useMemo(
    () => new Map(relationTypes.map((meta) => [meta.type, meta])),
    [relationTypes]
  );

  // 自适应容器尺寸
  useEffect(() => {
    const element = svgRef.current?.parentElement;
    if (!element) return;
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0].contentRect;
      setViewport({ width: rect.width, height: rect.height });
      layout.setViewport(rect.width, rect.height);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [layout]);

  // 力导向动画：结构变化时多跑一会，稳定后自动停下
  useEffect(() => {
    layout.setViewport(viewport.width, viewport.height);
    let raf = 0;
    let idleFrames = 0;
    const step = () => {
      const energy = layout.tick();
      setFrame((frame) => frame + 1);
      if (energy < 0.4) idleFrames += 1;
      else idleFrames = 0;
      if (idleFrames < 24) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [layout, version, viewport.width, viewport.height]);

  const screenPoint = (event: React.PointerEvent) => {
    const rect = svgRef.current!.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const onPointerDown = (event: React.PointerEvent, node: SimNode) => {
    event.stopPropagation();
    (event.target as Element).setPointerCapture?.(event.pointerId);
    const point = screenPoint(event);
    dragRef.current = { node, dx: point.x - node.x, dy: point.y - node.y, moved: false };
    node.fixed = 9999;
  };

  const onPointerMove = (event: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const point = screenPoint(event);
    drag.node.x = point.x - drag.dx;
    drag.node.y = point.y - drag.dy;
    drag.node.vx = 0;
    drag.node.vy = 0;
    drag.moved = true;
  };

  const onPointerUp = (node: SimNode) => {
    const drag = dragRef.current;
    dragRef.current = null;
    node.fixed = 0;
    // 区分点击与拖拽：没有明显位移才算选中
    if (drag && !drag.moved) onSelect(node.id);
  };

  const visibleEdges = layout.edges.filter((edge) => {
    const meta = relationById.get(edge.relation);
    return meta ? !hiddenGroups.has(meta.group) : true;
  });

  const visibleNodeIds = useMemo(() => {
    const ids = new Set<string>();
    visibleEdges.forEach((edge) => {
      ids.add(edge.source);
      ids.add(edge.target);
    });
    layout.nodes.forEach((node) => {
      // 孤立实体（过滤后暂时无边）仍保留中心节点可见
      if (node.id === selectedId) ids.add(node.id);
    });
    return ids;
  }, [visibleEdges, layout.nodes, selectedId, version]);

  return (
    <svg
      ref={svgRef}
      className="graph-canvas"
      width={viewport.width}
      height={viewport.height}
      onPointerMove={onPointerMove}
      onPointerLeave={() => {
        dragRef.current?.node && (dragRef.current.node.fixed = 0);
        dragRef.current = null;
      }}
    >
      <defs>
        {(Object.keys(RELATION_GROUP_COLOR) as (keyof typeof RELATION_GROUP_COLOR)[]).map((group) => (
          <marker
            key={group}
            id={`arrow-${group}`}
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill={RELATION_GROUP_COLOR[group]} />
          </marker>
        ))}
      </defs>

      {visibleEdges.map((edge) => {
        const meta = relationById.get(edge.relation);
        const color = meta ? RELATION_GROUP_COLOR[meta.group] : "#8a93a6";
        const active = highlightedIds.has(edge.source) && highlightedIds.has(edge.target);
        const a = edge.sourceNode;
        const b = edge.targetNode;
        const ra = RADIUS[a.domain] ?? 16;
        const rb = RADIUS[b.domain] ?? 16;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.max(Math.hypot(dx, dy), 1);
        const x2 = b.x - (dx / dist) * rb;
        const y2 = b.y - (dy / dist) * rb;
        const x1 = a.x + (dx / dist) * ra;
        const y1 = a.y + (dy / dist) * ra;
        return (
          <line
            key={edge.id}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={color}
            strokeWidth={active ? 2.6 : 1.1}
            strokeOpacity={active ? 0.95 : highlightedIds.size ? 0.18 : 0.5}
            markerEnd={meta?.symmetric ? undefined : `url(#arrow-${meta?.group ?? "general"})`}
          />
        );
      })}

      {layout.nodes
        .filter((node) => visibleNodeIds.has(node.id))
        .map((node) => {
          const meta = DOMAIN_META[node.domain];
          const radius = RADIUS[node.domain] ?? 16;
          const selected = node.id === selectedId;
          const highlighted = highlightedIds.has(node.id);
          const dimmed = highlightedIds.size > 0 && !highlighted;
          return (
            <g
              key={node.id}
              className="graph-node"
              transform={`translate(${node.x},${node.y})`}
              style={{ opacity: dimmed ? 0.3 : 1, cursor: "pointer" }}
              onPointerDown={(event) => onPointerDown(event, node)}
              onPointerUp={() => onPointerUp(node)}
              onDoubleClick={() => onExpand(node.id)}
            >
              {(selected || highlighted) && (
                <circle r={radius + 6} fill="none" stroke={meta.color} strokeWidth={1.6} strokeOpacity={0.7} />
              )}
              <circle
                r={radius}
                fill={`${meta.color}26`}
                stroke={meta.color}
                strokeWidth={selected ? 3 : 1.8}
              />
              <text className="graph-node-label" y={radius + 14} textAnchor="middle">
                {node.name.length > 9 ? `${node.name.slice(0, 9)}…` : node.name}
              </text>
              {node.id === selectedId && (
                <circle
                  r={4}
                  cx={radius - 2}
                  cy={-radius + 2}
                  fill={meta.color}
                  stroke="#0d1422"
                  strokeWidth={1}
                />
              )}
            </g>
          );
        })}

      {loadingExpand && (
        <text x={viewport.width - 16} y={26} textAnchor="end" className="graph-hint">
          正在沿关系展开…
        </text>
      )}
    </svg>
  );
}

export type { GraphEdge, GraphNode };
