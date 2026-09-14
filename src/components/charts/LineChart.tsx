import { useMemo } from "react";
import type { CategoryMeta } from "../../../shared/contract";
import type { DataBucket, MeasureDef } from "../../pages/insights/analytics";
import { monthShort } from "../../pages/insights/analytics";
import { CHART, ChartTooltip, niceTicks, useChartHover } from "./chartKit";

interface LineChartProps {
  buckets: DataBucket[];
  measure: MeasureDef;
  categories: CategoryMeta[];
  emptyHint: string;
}

/**
 * 折线图：主线展示所选度量随维度（默认更新月份）的变化，
 * 副面积（浅色）展示记录数量，便于区分“样本变少”与“指标真的下降”。
 */
export function LineChart({ buckets, measure, categories, emptyHint }: LineChartProps) {
  const { svgRef, hover, show, move, hide } = useChartHover();
  const height = CHART.lineHeight;
  const plotH = height - CHART.axisTop - 42;
  const plotW = CHART.width - CHART.axisX - CHART.axisRight;

  const model = useMemo(() => {
    if (buckets.length === 0) return null;
    const maxMeasure = Math.max(1, ...buckets.map((b) => b.measure));
    const maxCount = Math.max(1, ...buckets.map((b) => b.count));
    const ticks = niceTicks(maxMeasure);
    const top = ticks[ticks.length - 1];
    const x = (index: number) =>
      buckets.length === 1 ? CHART.axisX + plotW / 2 : CHART.axisX + (index / (buckets.length - 1)) * plotW;
    const y = (value: number) => CHART.axisTop + plotH - (value / top) * plotH;

    const line = buckets.map((b, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(b.measure).toFixed(1)}`).join(" ");
    const area =
      `${line} L ${x(buckets.length - 1).toFixed(1)} ${CHART.axisTop + plotH} L ${x(0).toFixed(1)} ${CHART.axisTop + plotH} Z`;
    const countArea = buckets
      .map((b, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${(CHART.axisTop + plotH - (b.count / maxCount) * plotH * 0.35).toFixed(1)}`)
      .join(" ") +
      ` L ${x(buckets.length - 1).toFixed(1)} ${CHART.axisTop + plotH} L ${x(0).toFixed(1)} ${CHART.axisTop + plotH} Z`;

    return { ticks, top, x, y, line, area, countArea, maxCount };
  }, [buckets, plotH, plotW]);

  if (!model) return <p className="chart-empty">{emptyHint}</p>;

  const labelStep = Math.max(1, Math.ceil(buckets.length / 12));

  return (
    <div className="chart-canvas">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${CHART.width} ${height}`}
        role="img"
        aria-label={`${measure.label}随${buckets.some((b) => /月$/.test(b.label)) ? "月份" : "分组"}变化的折线图`}
        onMouseLeave={hide}
        onMouseMove={move}
      >
        {model.ticks.map((tick) => (
          <g key={tick}>
            <line x1={CHART.axisX} x2={CHART.width - CHART.axisRight} y1={model.y(tick)} y2={model.y(tick)} className="chart-grid" />
            <text x={CHART.axisX - 8} y={model.y(tick) + 4} className="chart-axis-text" textAnchor="end">
              {tick >= 100 ? Math.round(tick) : tick}
            </text>
          </g>
        ))}

        <path d={model.countArea} fill="rgba(126,176,242,.12)" />
        <path d={model.area} fill="rgba(142,232,187,.14)" stroke="none" />
        <path d={model.line} fill="none" stroke="#8ee8bb" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />

        {buckets.map((bucket, index) => {
          const cx = model.x(index);
          const cy = model.y(bucket.measure);
          const isMonth = bucket.key.includes("-");
          return (
            <g key={`${bucket.key}-${index}`}>
              {index % labelStep === 0 && (
                <text x={cx} y={CHART.axisTop + plotH + 20} className="chart-axis-text" textAnchor="middle">
                  {isMonth ? monthShort(bucket.key) : bucket.label.length > 6 ? `${bucket.label.slice(0, 6)}…` : bucket.label}
                </text>
              )}
              <line x1={cx} x2={cx} y1={CHART.axisTop} y2={CHART.axisTop + plotH} className="chart-capture-line" />
              <circle cx={cx} cy={cy} r={11} fill="transparent" />
              <circle cx={cx} cy={cy} r={bucket.count > 0 ? 4 : 2.5} className="chart-dot" fill={bucket.count > 0 ? "#8ee8bb" : "var(--text-faint)"} />
              {bucket.count > 0 && (
                <text x={cx} y={cy - 11} className="chart-value" textAnchor="middle">
                  {Number.isInteger(bucket.measure) ? bucket.measure : bucket.measure.toFixed(2)}
                </text>
              )}
              <rect
                x={cx - (plotW / Math.max(1, buckets.length)) / 2}
                y={CHART.axisTop}
                width={plotW / Math.max(1, buckets.length)}
                height={plotH}
                fill="transparent"
                onMouseMove={(event) =>
                  show(event, {
                    title: bucket.label,
                    lines: [
                      { label: measure.label, value: `${bucket.measure.toFixed(2)} ${measure.unit}` },
                      { label: "记录数量", value: `${bucket.count} 条` },
                      ...bucket.byCategory
                        .filter((part) => part.count > 0)
                        .map((part) => ({
                          label: part.name,
                          value: `${part.count} 条`,
                          color: categories.find((c) => c.slug === part.category)?.color
                        }))
                    ]
                  })
                }
              />
            </g>
          );
        })}
        <line x1={CHART.axisX} x2={CHART.axisX} y1={CHART.axisTop} y2={CHART.axisTop + plotH} className="chart-axis" />
      </svg>
      <ChartTooltip hover={hover} width={CHART.width} />
    </div>
  );
}
