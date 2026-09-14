import { useMemo } from "react";
import type { BioRecord, CategoryMeta } from "../../../shared/contract";
import type { DimensionDef } from "../../pages/insights/analytics";
import { monthShort } from "../../pages/insights/analytics";
import { formatDate } from "../../lib/url";
import { CHART, ChartTooltip, niceTicks, useChartHover } from "./chartKit";

interface ScatterChartProps {
  records: BioRecord[];
  xDimension: DimensionDef;
  categories: CategoryMeta[];
  onOpenRecord: (id: string) => void;
  emptyHint: string;
}

interface PlottedPoint {
  record: BioRecord;
  x: number;
  y: number;
  size: number;
  color: string;
}

/**
 * 散点图：每个点是一条记录。
 * X 轴可选“更新时间 / 数据域 / 数据类型 / 生物分类 / 主题月份”，
 * Y 轴固定为该记录的关键指标数（metrics），气泡大小代表挂接的主题数；
 * 同 X 位置的点做确定性的小幅抖动，便于逐个悬停查看，点击进入记录详情。
 */
export function ScatterChart({ records, xDimension, categories, onOpenRecord, emptyHint }: ScatterChartProps) {
  const { svgRef, hover, show, move, hide } = useChartHover();
  const height = CHART.scatterHeight;
  const plotH = height - CHART.axisTop - 48;
  const plotW = CHART.width - CHART.axisX - CHART.axisRight;

  const model = useMemo(() => {
    if (records.length === 0) return null;
    const isTime = xDimension.key === "updatedMonth";

    // 构建 X 桶
    const keys: string[] = [];
    const keySet = new Set<string>();
    const recordsByKey = new Map<string, BioRecord[]>();
    records.forEach((record) => {
      xDimension.keysOf(record).forEach((key) => {
        if (!keySet.has(key)) {
          keySet.add(key);
          keys.push(key);
        }
        const list = recordsByKey.get(key) ?? [];
        list.push(record);
        recordsByKey.set(key, list);
      });
    });
    keys.sort((a, b) => (isTime ? a.localeCompare(b) : a.localeCompare(b, "zh-Hans-CN")));

    const xIndex = new Map(keys.map((key, index) => [key, index]));
    const maxY = Math.max(3, ...records.map((r) => r.metrics.length));
    const yTicks = niceTicks(maxY, 4);
    const yTop = yTicks[yTicks.length - 1];

    // 时间 X：用月份时间戳线性映射；类别 X：等距序号
    let timeRange: { min: number; max: number } | null = null;
    if (isTime) {
      const timestamps = keys.map((key) => new Date(key + "-01T00:00:00").getTime());
      timeRange = { min: Math.min(...timestamps), max: Math.max(...timestamps) };
    }

    const slot = plotW / keys.length;
    const xFor = (key: string, jitterIndex: number, jitterTotal: number): number => {
      if (isTime && timeRange) {
        const ts = new Date(key + "-01T00:00:00").getTime();
        const base =
          timeRange.max === timeRange.min
            ? CHART.axisX + plotW / 2
            : CHART.axisX + ((ts - timeRange.min) / (timeRange.max - timeRange.min)) * plotW;
        // 同月内多条记录按序号散开
        const spread = Math.min(26, slot * 0.4);
        const offset = jitterTotal <= 1 ? 0 : (jitterIndex / (jitterTotal - 1) - 0.5) * spread;
        return base + offset;
      }
      const base = CHART.axisX + (xIndex.get(key) ?? 0) * slot + slot / 2;
      const spread = Math.min(46, slot * 0.55);
      const offset = jitterTotal <= 1 ? 0 : (jitterIndex / (jitterTotal - 1) - 0.5) * spread;
      return base + offset;
    };

    const points: PlottedPoint[] = [];
    recordsByKey.forEach((items, key) => {
      const sorted = [...items].sort((a, b) => a.metrics.length - b.metrics.length || a.name.localeCompare(b.name, "zh-Hans-CN"));
      sorted.forEach((record, index) => {
        points.push({
          record,
          x: xFor(key, index, sorted.length),
          y: CHART.axisTop + plotH - (record.metrics.length / yTop) * plotH,
          size: 6 + record.themes.length * 1.7,
          color: categories.find((meta) => meta.slug === record.category)?.color ?? "#8ee8bb"
        });
      });
    });

    return { isTime, keys, yTicks, yTop, points, slot };
  }, [records, xDimension, categories, plotH, plotW]);

  if (!model) return <p className="chart-empty">{emptyHint}</p>;

  const labelEvery = Math.max(1, Math.ceil(model.keys.length / 10));

  return (
    <div className="chart-canvas">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${CHART.width} ${height}`}
        role="img"
        aria-label="记录散点图：X 为所选维度，Y 为关键指标数量，气泡大小为主题数"
        onMouseLeave={hide}
        onMouseMove={move}
      >
        {model.yTicks.map((tick) => {
          const y = CHART.axisTop + plotH - (tick / model.yTop) * plotH;
          return (
            <g key={tick}>
              <line x1={CHART.axisX} x2={CHART.width - CHART.axisRight} y1={y} y2={y} className="chart-grid" />
              <text x={CHART.axisX - 8} y={y + 4} className="chart-axis-text" textAnchor="end">
                {tick}
              </text>
            </g>
          );
        })}
        <text x={16} y={CHART.axisTop + plotH / 2} className="chart-axis-title" transform={`rotate(-90 16 ${CHART.axisTop + plotH / 2})`}>
          关键指标数（项/条）
        </text>

        {model.isTime
          ? model.keys.map((key, index) => {
              if (index % labelEvery !== 0 && index !== model.keys.length - 1) return null;
              const ts = new Date(key + "-01T00:00:00").getTime();
              const x =
                model.keys.length === 1
                  ? CHART.axisX + plotW / 2
                  : CHART.axisX +
                    ((ts - new Date(model.keys[0] + "-01T00:00:00").getTime()) /
                      (new Date(model.keys[model.keys.length - 1] + "-01T00:00:00").getTime() -
                        new Date(model.keys[0] + "-01T00:00:00").getTime())) *
                      plotW;
              return (
                <text key={key} x={x} y={CHART.axisTop + plotH + 20} className="chart-axis-text" textAnchor="middle">
                  {monthShort(key)}
                </text>
              );
            })
          : model.keys.map((key, index) => (
              <text
                key={key}
                x={CHART.axisX + index * model.slot + model.slot / 2}
                y={CHART.axisTop + plotH + 20}
                className="chart-axis-text chart-axis-text-tilt"
                textAnchor="end"
                transform={`rotate(-24 ${CHART.axisX + index * model.slot + model.slot / 2} ${CHART.axisTop + plotH + 16})`}
              >
                {key.length > 8 ? `${key.slice(0, 8)}…` : key}
              </text>
            ))}

        <line x1={CHART.axisX} x2={CHART.axisX} y1={CHART.axisTop} y2={CHART.axisTop + plotH} className="chart-axis" />

        {model.points.map((point, index) => (
          <circle
            key={`${point.record.id}-${index}`}
            cx={point.x}
            cy={point.y}
            r={point.size / 2}
            fill={point.color}
            fillOpacity={0.7}
            stroke={point.color}
            strokeWidth={1.2}
            className="chart-scatter-dot"
            role="button"
            aria-label={`${point.record.name}，${point.record.metrics.length} 项指标，${point.record.themes.length} 个主题`}
            onMouseMove={(event) =>
              show(event, {
                title: point.record.name,
                lines: [
                  { label: "数据域", value: categories.find((c) => c.slug === point.record.category)?.name ?? point.record.category, color: point.color },
                  { label: "数据类型", value: point.record.dataType },
                  { label: "关键指标", value: `${point.record.metrics.length} 项` },
                  { label: "主题数", value: `${point.record.themes.length} 个` },
                  { label: "更新时间", value: formatDate(point.record.updatedAt) },
                  { label: "点击", value: "查看记录详情" }
                ]
              })
            }
            onClick={() => onOpenRecord(point.record.id)}
            cursor="pointer"
          />
        ))}
      </svg>
      <ChartTooltip hover={hover} width={CHART.width} />
      <p className="chart-footnote">
        气泡颜色 = 数据域，大小 = 主题标签数（{Math.min(...records.map((r) => r.themes.length))}–{Math.max(...records.map((r) => r.themes.length))} 个）；
        Y 轴为每条记录的关键指标数（{Math.min(...records.map((r) => r.metrics.length))}–{Math.max(...records.map((r) => r.metrics.length))} 项）。
        当前 {records.length} 条记录
        {xDimension.key === "theme" ? `，按主题展开为 ${model.points.length} 个气泡（多主题记录重复出现）` : "对应一个气泡"}
        ，点击任意气泡可打开该记录。
      </p>
    </div>
  );
}
