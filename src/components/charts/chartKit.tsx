/** 四种图表共用的绘制工具：尺寸常量、数值刻度、悬浮提示 */
import { useCallback, useRef, useState } from "react";

export const CHART = {
  width: 880,
  barHeight: 380,
  lineHeight: 360,
  scatterHeight: 380,
  axisX: 58,
  axisRight: 24,
  axisTop: 22
} as const;

export interface HoverState {
  /** 客户端坐标，提示框据此定位 */
  x: number;
  y: number;
  title: string;
  lines: { label: string; value: string; color?: string }[];
}

/**
 * 悬浮提示统一走 React 状态 + 一个固定定位的 div，
 * 避免每个 SVG 元素各自渲染 <title> 导致样式不可控。
 */
export function useChartHover() {
  const [hover, setHover] = useState<HoverState | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const show = useCallback((event: React.MouseEvent, next: Omit<HoverState, "x" | "y">) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    setHover({ ...next, x: event.clientX - rect.left, y: event.clientY - rect.top });
  }, []);

  const move = useCallback((event: React.MouseEvent) => {
    setHover((current) => (current ? { ...current, x: event.clientX - (svgRef.current?.getBoundingClientRect().left ?? 0), y: event.clientY - (svgRef.current?.getBoundingClientRect().top ?? 0) } : current));
  }, []);

  const hide = useCallback(() => setHover(null), []);

  return { svgRef, hover, show, move, hide };
}

export function ChartTooltip({ hover, width }: { hover: HoverState | null; width: number }) {
  if (!hover) return null;
  // 靠右边缘时向左翻转，避免溢出
  const flip = hover.x > width - 210;
  return (
    <div
      className="chart-tooltip"
      style={{ left: hover.x, top: hover.y, transform: `translate(${flip ? "calc(-100% - 14px)" : "14px"}, -50%)` }}
      role="status"
    >
      <p className="chart-tooltip-title">{hover.title}</p>
      <dl>
        {hover.lines.map((line) => (
          <div key={line.label}>
            <dt>
              {line.color && <i style={{ background: line.color }} />}
              {line.label}
            </dt>
            <dd>{line.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** 生成“好看”的 Y 轴刻度：按数据最大值选择 4–5 个整数/一位小数步长 */
export const niceTicks = (max: number, count = 4): number[] => {
  if (!Number.isFinite(max) || max <= 0) return [0, 1];
  const rough = max / count;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const normalized = rough / magnitude;
  const step = (normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 2.5 ? 2.5 : normalized <= 5 ? 5 : 10) * magnitude;
  const ticks: number[] = [];
  for (let value = 0; value <= max + step * 0.001; value += step) ticks.push(Number(value.toFixed(4)));
  if (ticks[ticks.length - 1] < max) ticks.push(Number((ticks[ticks.length - 1] + step).toFixed(4)));
  return ticks;
};

export const formatTick = (value: number): string =>
  value >= 100 ? String(Math.round(value)) : Number.isInteger(value) ? String(value) : value.toFixed(1);
