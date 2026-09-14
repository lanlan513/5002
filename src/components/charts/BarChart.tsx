import type { CategoryMeta } from "../../../shared/contract";
import type { DataBucket, MeasureDef } from "../../pages/insights/analytics";
import { formatMeasure } from "../../pages/insights/analytics";
import { CHART, ChartTooltip, niceTicks, useChartHover } from "./chartKit";

interface BarChartProps {
  buckets: DataBucket[];
  measure: MeasureDef;
  categories: CategoryMeta[];
  /** 主题/数据类型等类别多、名字长 → 横向条形；月份等 → 纵向柱状 */
  orientation: "horizontal" | "vertical";
  emptyHint: string;
}

/**
 * 柱状图：支持纵向（时间类维度）与横向（分类多、标签长）两种布局，
 * 按数据域堆叠上色，每根柱直接标注度量数值，不做“只好看没数字”的装饰。
 */
export function BarChart({ buckets, measure, categories, orientation, emptyHint }: BarChartProps) {
  const { svgRef, hover, show, move, hide } = useChartHover();
  const max = Math.max(1, ...buckets.map((bucket) => bucket.measure));
  const ticks = niceTicks(max);
  const top = ticks[ticks.length - 1];
  const colorOf = (slug: string) => categories.find((item) => item.slug === slug)?.color ?? "#8ee8bb";

  if (buckets.length === 0) {
    return <p className="chart-empty">{emptyHint}</p>;
  }

  const tooltipLines = (bucket: DataBucket) => [
    { label: measure.label, value: `${formatMeasure(bucket.measure, measure)} ${measure.unit}` },
    { label: "记录数量", value: `${bucket.count} 条` },
    ...bucket.byCategory.map((part) => ({
      label: part.name,
      value: `${part.count} 条`,
      color: colorOf(part.category)
    }))
  ];

  // ── 纵向柱状（月份等有序维度）──
  if (orientation === "vertical") {
    const height = CHART.barHeight;
    const plotH = height - CHART.axisTop - 40;
    const plotW = CHART.width - CHART.axisX - CHART.axisRight;
    const slot = plotW / buckets.length;
    const barW = Math.min(46, slot * 0.62);
    const y = (value: number) => CHART.axisTop + plotH - (value / top) * plotH;

    return (
      <div className="chart-canvas">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${CHART.width} ${height}`}
          role="img"
          aria-label={`${measure.label}柱状图，共 ${buckets.length} 个分组`}
          onMouseLeave={hide}
          onMouseMove={move}
        >
          {ticks.map((tick) => (
            <g key={tick}>
              <line x1={CHART.axisX} x2={CHART.width - CHART.axisRight} y1={y(tick)} y2={y(tick)} className="chart-grid" />
              <text x={CHART.axisX - 8} y={y(tick) + 4} className="chart-axis-text" textAnchor="end">
                {tick >= 100 ? Math.round(tick) : tick}
              </text>
            </g>
          ))}
          <line x1={CHART.axisX} x2={CHART.axisX} y1={CHART.axisTop} y2={CHART.axisTop + plotH} className="chart-axis" />

          {buckets.map((bucket, index) => {
            const x0 = CHART.axisX + index * slot + (slot - barW) / 2;
            // 按数据域堆叠
            let cursor = 0;
            return (
              <g key={bucket.key}>
                {bucket.byCategory.map((part) => {
                  const segH = (part.count / bucket.count) * bucket.measure * (plotH / top);
                  const segY = CHART.axisTop + plotH - cursor - segH;
                  cursor += segH;
                  return (
                    <rect
                      key={part.category}
                      x={x0}
                      y={segY}
                      width={barW}
                      height={segH}
                      rx={bucket.byCategory.length === 1 ? 4 : 0}
                      fill={colorOf(part.category)}
                      opacity={0.92}
                      className="chart-hit"
                      onMouseMove={(event) => show(event, { title: bucket.label, lines: tooltipLines(bucket) })}
                    />
                  );
                })}
                <text x={x0 + barW / 2} y={y(bucket.measure) - 7} className="chart-value" textAnchor="middle">
                  {formatMeasure(bucket.measure, measure)}
                </text>
                <text
                  x={x0 + barW / 2}
                  y={CHART.axisTop + plotH + 18}
                  className="chart-axis-text"
                  textAnchor="middle"
                >
                  {bucket.key.split("-").length === 2 ? `${Number(bucket.key.split("-")[1])}月` : bucket.label}
                </text>
              </g>
            );
          })}
        </svg>
        <ChartTooltip hover={hover} width={CHART.width} />
      </div>
    );
  }

  // ── 横向条形（分类多、名字长）──
  const shown = buckets.slice(0, 14);
  const hiddenCount = buckets.length - shown.length;
  const rowH = 30;
  const height = Math.max(180, shown.length * rowH + (hiddenCount > 0 ? 26 : 10) + 46);
  const labelW = 150;
  const plotW = CHART.width - labelW - 64;
  const x = (value: number) => labelW + (value / top) * plotW;

  return (
    <div className="chart-canvas">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${CHART.width} ${height}`}
        role="img"
        aria-label={`${measure.label}条形图，显示前 ${shown.length} 个分组`}
        onMouseLeave={hide}
        onMouseMove={move}
      >
        {ticks.map((tick) => (
          <g key={tick}>
            <line x1={x(tick)} x2={x(tick)} y1={10} y2={height - 30} className="chart-grid" />
            <text x={x(tick)} y={height - 12} className="chart-axis-text" textAnchor="middle">
              {tick >= 100 ? Math.round(tick) : tick}
            </text>
          </g>
        ))}

        {shown.map((bucket, index) => {
          const y0 = 14 + index * rowH;
          let cursorX = labelW;
          return (
            <g key={bucket.key}>
              <text x={labelW - 10} y={y0 + 14} className="chart-axis-text chart-bar-label" textAnchor="end">
                {bucket.label}
              </text>
              {bucket.byCategory.map((part) => {
                const segW = (part.count / bucket.count) * bucket.measure * (plotW / top);
                const segX = cursorX;
                cursorX += segW;
                return (
                  <rect
                    key={part.category}
                    x={segX}
                    y={y0 + 2}
                    width={Math.max(0, segW)}
                    height={rowH - 8}
                    rx={bucket.byCategory.length === 1 ? 4 : 0}
                    fill={colorOf(part.category)}
                    opacity={0.88}
                    className="chart-hit"
                    onMouseMove={(event) => show(event, { title: bucket.label, lines: tooltipLines(bucket) })}
                  />
                );
              })}
              <text x={x(bucket.measure) + 8} y={y0 + 15} className="chart-value chart-value-inline">
                {formatMeasure(bucket.measure, measure)} {measure.unit}
              </text>
            </g>
          );
        })}
        {hiddenCount > 0 && (
          <text x={labelW} y={height - 30} className="chart-axis-text">
            其余 {hiddenCount} 个分组数值更小，已折叠；可通过上方筛选缩小范围。
          </text>
        )}
      </svg>
      <ChartTooltip hover={hover} width={CHART.width} />
    </div>
  );
}
