import { useMemo, useState } from "react";
import type { BodyOrganBrief, Hotspot } from "../api";

type SystemColorMap = Record<string, string>;

interface BodyDiagramProps {
  organs: BodyOrganBrief[];
  systemColors: SystemColorMap;
  activeSystem: string | null;
  selectedOrgan?: string | null;
  highlightedOrgan?: string | null;
  onSelect: (organ: BodyOrganBrief) => void;
  compact?: boolean;
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

export function BodyDiagram({
  organs,
  systemColors,
  activeSystem,
  selectedOrgan,
  highlightedOrgan,
  onSelect,
  compact
}: BodyDiagramProps) {
  const [hovered, setHovered] = useState<BodyOrganBrief | null>(null);

  // 大热点先渲染，保证小热点在上层、始终可点击
  const sorted = useMemo(
    () => [...organs].sort((a, b) => b.hotspot.r - a.hotspot.r),
    [organs]
  );

  const isDimmed = (organ: BodyOrganBrief) =>
    activeSystem !== null && organ.system_slug !== activeSystem;

  const tooltipOrgan = hovered;
  const tooltip: (Hotspot & { label: string; color: string }) | null = tooltipOrgan
    ? { ...tooltipOrgan.hotspot, label: tooltipOrgan.name, color: systemColors[tooltipOrgan.system_slug] ?? "#9fe8c5" }
    : null;

  return (
    <div className={`body-diagram${compact ? " is-compact" : ""}`}>
      <svg viewBox="0 0 240 560" role="group" aria-label="可点击的人体示意图">
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
        </defs>

        {/* 头与躯干轮廓 */}
        <circle cx="120" cy="60" r="34" fill="url(#bodyFill)" stroke="#2e574a" strokeWidth="1.4" />
        <rect x="109" y="93" width="22" height="30" rx="8" fill="url(#bodyFill)" stroke="#2e574a" strokeWidth="1.4" />
        <path d={BODY_PATH} fill="url(#bodyFill)" stroke="#2e574a" strokeWidth="1.4" strokeLinejoin="round" />

        {/* 参考网格刻度 */}
        <g className="diagram-grid" aria-hidden="true">
          <line x1="120" y1="18" x2="120" y2="476" />
        </g>

        {sorted.map((organ) => {
          const color = systemColors[organ.system_slug] ?? "#9fe8c5";
          const dimmed = isDimmed(organ);
          const active =
            selectedOrgan === organ.slug ||
            highlightedOrgan === organ.slug ||
            hovered?.slug === organ.slug;
          return (
            <g
              key={organ.slug}
              className={`diagram-hotspot${active ? " is-active" : ""}${dimmed ? " is-dimmed" : ""}`}
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
      <p className="diagram-hint">点击身体上的彩色标记，按空间位置进入器官</p>
    </div>
  );
}
