import { useMemo, useState } from "react";
import type {
  BodyOrganBrief,
  CouplingPathway,
  Hotspot,
  OrganNetwork,
  Substance
} from "../api";
import { buildEdgeGeometries, edgeKey, edgesForOrgan, type EdgeGeometry } from "./organNetwork";

type SystemColorMap = Record<string, string>;

interface BodyDiagramProps {
  organs: BodyOrganBrief[];
  systemColors: SystemColorMap;
  activeSystem: string | null;
  selectedOrgan?: string | null;
  highlightedOrgan?: string | null;
  onSelect: (organ: BodyOrganBrief) => void;
  compact?: boolean;
  network?: OrganNetwork | null;
  showNetwork?: boolean;
  focusOrgan?: string | null;
  pathway?: CouplingPathway | null;
  pathwayStep?: number;
}

// 正面人体轮廓（viewBox 240 × 560），与服务端下发的 hotspot 坐标共用同一坐标系
const BODY_PATH = `
  M 103 121
  L 103 134
  C 88 140 76 153 70 169
  C 56 184 46 226 39 286
  C 36 312 33 332 31 345
  C 30 351 33 355 38 355
  C 43 355 46 351 47 345
  C 51 320 56 292 61 269
  L 62 316
  C 62 333 65 351 67 366
  L 72 452
  C 73 463 80 470 89 470
  C 98 470 103 463 102 452
  L 98 372
  L 98 330
  L 104 330
  L 104 402
  L 107 452
  C 108 463 113 470 120 470
  C 127 470 132 463 133 452
  L 136 402
  L 136 330
  L 142 330
  L 142 372
  L 138 452
  C 137 463 142 470 151 470
  C 160 470 167 463 168 452
  L 173 366
  C 175 351 178 333 178 316
  L 179 269
  C 184 292 189 320 193 345
  C 194 351 197 355 202 355
  C 207 355 210 351 209 345
  C 207 332 204 312 201 286
  C 194 226 184 184 170 169
  C 164 153 152 140 137 134
  L 137 121
  Z
`;

// 环境态：慢速、暗淡，只提示“网络一直存在”
const ambientDuration = (geo: EdgeGeometry) => Math.min(4.4, 1.9 + (geo.length / 420) * 2.4);
// 高亮态：更快、更亮，清楚指示方向
const activeDuration = (geo: EdgeGeometry) => Math.min(2.6, 1.05 + (geo.length / 520) * 1.5);

function FlowParticle({
  path,
  color,
  dur,
  index,
  r,
  opacity,
  boost = 1
}: {
  path: string;
  color: string;
  dur: number;
  index: number;
  r: number;
  opacity: number;
  boost?: number;
}) {
  return (
    <circle className="flow-particle" r={r} fill={color} opacity={opacity}>
      <animateMotion dur={`${dur}s`} begin={`${-((index * 0.53) % dur)}s`} repeatCount="indefinite" path={path} />
      {boost > 1 && (
        <animate
          attributeName="r"
          values={`${r};${r * 1.5};${r}`}
          dur={`${dur}s`}
          repeatCount="indefinite"
        />
      )}
    </circle>
  );
}

export function BodyDiagram({
  organs,
  systemColors,
  activeSystem,
  selectedOrgan,
  highlightedOrgan,
  onSelect,
  compact,
  network,
  showNetwork = true,
  focusOrgan = null,
  pathway = null,
  pathwayStep = 0
}: BodyDiagramProps) {
  const [hovered, setHovered] = useState<BodyOrganBrief | null>(null);

  const reduceMotion = useMemo(
    () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
    []
  );

  // 大热点先渲染，保证小热点在上层、始终可点击
  const sorted = useMemo(
    () => [...organs].sort((a, b) => b.hotspot.r - a.hotspot.r),
    [organs]
  );

  const geometries = useMemo(
    () => (network ? buildEdgeGeometries(network.edges, network.nodes) : []),
    [network]
  );

  const substanceColor = useMemo(() => {
    const map = new Map<string, Substance>();
    network?.substances.forEach((item) => map.set(item.slug, item));
    return (slug: string) => map.get(slug)?.color ?? "#9fe8c5";
  }, [network]);

  // 悬停时也能预览该器官的直接关系；路径播放时以路径为准
  const effectiveFocus = pathway ? null : (focusOrgan ?? hovered?.slug ?? null);

  const { activeKeySet, pulseKey, relatedNodes } = useMemo(() => {
    const active = new Set<string>();
    const related = new Set<string>();
    let pulse: string | null = null;
    if (showNetwork && network) {
      if (pathway) {
        pathway.edges.forEach((edge) => {
          active.add(edgeKey(edge.from, edge.to));
          related.add(edge.from);
          related.add(edge.to);
        });
        const stepEdge = pathway.edges[pathwayStep];
        if (stepEdge) pulse = edgeKey(stepEdge.from, stepEdge.to);
      } else if (effectiveFocus) {
        edgesForOrgan(network.edges, effectiveFocus).forEach((edge) => {
          active.add(edgeKey(edge.from, edge.to));
          related.add(edge.from);
          related.add(edge.to);
        });
      }
    }
    return { activeKeySet: active, pulseKey: pulse, relatedNodes: related };
  }, [showNetwork, network, pathway, pathwayStep, effectiveFocus]);

  const networkActive = activeKeySet.size > 0;

  const isDimmed = (organ: BodyOrganBrief) => {
    const isRelated = networkActive && relatedNodes.has(organ.slug);
    // 本次高亮的关系节点一律保留亮度——即使它属于另一个系统，
    // 否则系统筛选会把跨系统的直接关联器官（如心脏 ↔ 周围神经）压暗，使高亮失效。
    if (isRelated) return false;
    if (networkActive) return true; // 高亮态：非关系节点统一压暗
    return activeSystem !== null && organ.system_slug !== activeSystem; // 仅系统筛选：非本系统才压暗
  };

  const tooltipOrgan = hovered;
  const tooltip: (Hotspot & { label: string; color: string }) | null = tooltipOrgan
    ? { ...tooltipOrgan.hotspot, label: tooltipOrgan.name, color: systemColors[tooltipOrgan.system_slug] ?? "#9fe8c5" }
    : null;

  let particleIndex = 0;

  return (
    <div className={`body-diagram${compact ? " is-compact" : ""}`}>
      <svg viewBox="0 0 240 560" role="group" aria-label="可点击的人体示意图与器官关系网络">
        <defs>
          <radialGradient id="bodyFill" cx="50%" cy="42%" r="72%">
            <stop offset="0%" stopColor="#16382f" />
            <stop offset="70%" stopColor="#0e241e" />
            <stop offset="100%" stopColor="#0a1a16" />
          </radialGradient>
          <filter id="markerGlow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="2.4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {network?.substances.map((substance) => (
            <marker
              key={substance.slug}
              id={`flow-arrow-${substance.slug}`}
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill={substance.color} />
            </marker>
          ))}
        </defs>

        {/* 头与躯干轮廓 */}
        <circle cx="120" cy="60" r="34" fill="url(#bodyFill)" stroke="#2e574a" strokeWidth="1.4" />
        <rect x="109" y="93" width="22" height="30" rx="8" fill="url(#bodyFill)" stroke="#2e574a" strokeWidth="1.4" />
        <path d={BODY_PATH} fill="url(#bodyFill)" stroke="#2e574a" strokeWidth="1.4" strokeLinejoin="round" />

        {/* 参考网格刻度 */}
        <g className="diagram-grid" aria-hidden="true">
          <line x1="120" y1="18" x2="120" y2="476" />
        </g>

        {/* ===== 器官关系网络：物质流动叠加层 ===== */}
        {showNetwork && network && (
          <g className="network-layer" aria-hidden="true">
            {/* 环境态：全部关系以极淡线条存在，提示系统彼此相连 */}
            {!networkActive &&
              geometries.map((geo) =>
                geo.lanes.map((lane) => (
                  <path
                    key={`ambient-${geo.key}-${lane.substance}`}
                    className="network-lane is-ambient"
                    d={lane.path}
                    stroke={substanceColor(lane.substance)}
                  />
                ))
              )}

            {/* 高亮态：未激活的关系仍保留淡淡底色 */}
            {networkActive &&
              geometries.map((geo) =>
                geo.lanes.map((lane) => (
                  <path
                    key={`dim-${geo.key}-${lane.substance}`}
                    className="network-lane is-dim"
                    d={lane.path}
                    stroke={substanceColor(lane.substance)}
                  />
                ))
              )}

            {/* 激活关系：带方向箭头的物质 lane */}
            {geometries
              .filter((geo) => activeKeySet.has(geo.key))
              .map((geo) => {
                const isPulse = geo.key === pulseKey;
                return (
                  <g key={`active-${geo.key}`} className="network-edge-active">
                    {isPulse && (
                      <path className="network-lane is-pulse-halo" d={geo.basePath} stroke="#eafcf0" />
                    )}
                    {geo.lanes.map((lane) => (
                      <path
                        key={lane.substance}
                        className={`network-lane is-active${isPulse ? " is-pulse" : ""}`}
                        d={lane.path}
                        stroke={substanceColor(lane.substance)}
                        markerEnd={`url(#flow-arrow-${lane.substance})`}
                      />
                    ))}
                  </g>
                );
              })}

            {/* 环境态粒子：每条关系取第一种物质，缓慢流动 */}
            {!reduceMotion &&
              !networkActive &&
              geometries.map((geo, index) => (
                <FlowParticle
                  key={`ambient-particle-${geo.key}`}
                  path={geo.lanes[0].path}
                  color={substanceColor(geo.lanes[0].substance)}
                  dur={ambientDuration(geo)}
                  index={index + particleIndex}
                  r={1.3}
                  opacity={0.3}
                />
              ))}

            {/* 激活态粒子：每种物质一路粒子，方向即运输方向 */}
            {!reduceMotion &&
              geometries
                .filter((geo) => activeKeySet.has(geo.key))
                .map((geo) => {
                  const isPulse = geo.key === pulseKey;
                  return geo.lanes.map((lane, laneIndex) => (
                    <FlowParticle
                      key={`active-particle-${geo.key}-${lane.substance}`}
                      path={lane.path}
                      color={substanceColor(lane.substance)}
                      dur={activeDuration(geo) / (isPulse ? 1.15 : 1)}
                      index={particleIndex++ + laneIndex * 2}
                      r={isPulse ? 2.3 : 1.9}
                      opacity={isPulse ? 1 : 0.92}
                      boost={isPulse ? 2 : 1}
                    />
                  ));
                })}
          </g>
        )}

        {sorted.map((organ) => {
          const color = systemColors[organ.system_slug] ?? "#9fe8c5";
          const dimmed = isDimmed(organ);
          const related = networkActive && relatedNodes.has(organ.slug);
          const active =
            selectedOrgan === organ.slug ||
            highlightedOrgan === organ.slug ||
            hovered?.slug === organ.slug ||
            related;
          return (
            <g
              key={organ.slug}
              className={`diagram-hotspot${active ? " is-active" : ""}${dimmed ? " is-dimmed" : ""}${
                related && selectedOrgan !== organ.slug ? " is-related" : ""
              }`}
              transform={`translate(${organ.hotspot.x} ${organ.hotspot.y})`}
              onMouseEnter={() => setHovered(organ)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(organ)}
              onBlur={() => setHovered(null)}
              onClick={() => onSelect(organ)}
              tabIndex={0}
              role="button"
              aria-label={`${organ.name}（${organ.position_label}）`}
              style={{ cursor: "pointer" }}
            >
              {!dimmed && (
                <circle className="hotspot-pulse" r={organ.hotspot.r} fill={color} stroke="none" />
              )}
              <circle
                className="hotspot-ring"
                r={organ.hotspot.r}
                fill={dimmed ? "transparent" : `${color}22`}
                stroke={color}
                strokeWidth={active ? 2 : 1.2}
                filter={active ? "url(#markerGlow)" : undefined}
              />
              <circle className="hotspot-core" r={Math.max(2.2, organ.hotspot.r * 0.22)} fill={color} />
            </g>
          );
        })}

        {tooltip &&
          (() => {
            const width = Math.max(54, [...tooltip.label].length * 13 + 16);
            const placeLeft = tooltip.x + 16 + width > 236;
            const rectX = placeLeft ? tooltip.x - 14 - width : tooltip.x + 14;
            const rectY = tooltip.y - tooltip.r - 28;
            const textX = placeLeft ? rectX + 8 : rectX + 8;
            return (
              <g className="hotspot-tooltip" pointerEvents="none">
                <rect x={rectX} y={rectY} width={width} height="22" rx="3" fill="#0b201a" stroke={tooltip.color} strokeWidth="1" />
                <text x={textX} y={rectY + 11} fill={tooltip.color} fontSize="12" dominantBaseline="middle">
                  {tooltip.label}
                </text>
              </g>
            );
          })()}
      </svg>
      <p className="diagram-hint">
        {showNetwork && network
          ? "彩色粒子表示流动中的物质 · 点击器官高亮与它直接相连的器官"
          : "点击身体上的彩色标记，按空间位置进入器官"}
      </p>
    </div>
  );
}
