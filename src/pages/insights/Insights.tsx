import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  CalendarRange,
  LineChart as LineChartIcon,
  Network as NetworkIcon,
  RotateCcw,
  ScatterChart as ScatterChartIcon,
  Search,
  X
} from "lucide-react";
import type { BioRecord, CategoryMeta } from "../../../shared/contract";
import { api } from "../../api/client";
import { useResource } from "../../hooks/useResource";
import { formatDate } from "../../lib/url";
import { ErrorState, InlineError } from "../../components/States";
import { BarChart } from "../../components/charts/BarChart";
import { LineChart } from "../../components/charts/LineChart";
import { ScatterChart } from "../../components/charts/ScatterChart";
import { NetworkChart } from "../../components/charts/NetworkChart";
import {
  aggregate,
  applyClientFilters,
  buildDimensions,
  buildNetwork,
  fetchAllRecords,
  fillMissingMonths,
  MEASURES,
  monthLabel,
  type AnalyticsFilters,
  type DimensionKey,
  type MeasureKey,
  type NetworkMode
} from "./analytics";

type ChartType = "bar" | "line" | "scatter" | "network";

const CHART_TABS: { key: ChartType; label: string; icon: typeof BarChart3; hint: string }[] = [
  { key: "bar", label: "柱状图", icon: BarChart3, hint: "比较各分组的数值高低" },
  { key: "line", label: "折线图", icon: LineChartIcon, hint: "观察数值随时间/分组的变化趋势" },
  { key: "scatter", label: "散点图", icon: ScatterChartIcon, hint: "每条记录一个点，定位个体分布" },
  { key: "network", label: "网络图", icon: NetworkIcon, hint: "数据域与主题/分类的关联结构" }
];

const TIME_PRESETS: { key: string; label: string; months: number | null }[] = [
  { key: "all", label: "全部时间", months: null },
  { key: "3m", label: "近 3 个月", months: 3 },
  { key: "6m", label: "近 6 个月", months: 6 },
  { key: "12m", label: "近 12 个月", months: 12 }
];

const toMonthInput = (timestamp: number): string => {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};

export function Insights({
  categories,
  params,
  navigate,
  onOpenRecord
}: {
  categories: CategoryMeta[];
  params: URLSearchParams;
  navigate: (path: string, params?: Record<string, string | number | undefined>) => void;
  onOpenRecord: (id: string) => void;
}) {
  /** 全量记录只拉一次，四种图表在客户端共享同一份数据联动 */
  const resource = useResource<BioRecord[]>((signal) => fetchAllRecords(api.records, signal), []);

  // ── URL 即状态：图表类型 / 维度 / 度量 / 筛选 / 时间范围 全部可分享、可后退 ──
  const chart = (params.get("chart") as ChartType | null) ?? "bar";
  const dimension = (params.get("dim") as DimensionKey | null) ?? (chart === "line" ? "updatedMonth" : "category");
  const measure = (params.get("measure") as MeasureKey | null) ?? "records";
  const scatterX = (params.get("sx") as DimensionKey | null) ?? "updatedMonth";
  const networkMode = (params.get("net") as NetworkMode | null) ?? "category_theme";

  const filters: AnalyticsFilters = {
    category: params.get("category") ?? "",
    theme: params.get("theme") ?? "",
    dataType: params.get("dataType") ?? "",
    kingdom: params.get("kingdom") ?? "",
    q: params.get("q") ?? "",
    from: params.get("from") ?? "",
    to: params.get("to") ?? ""
  };
  const [searchInput, setSearchInput] = useState(filters.q);
  useEffect(() => setSearchInput(filters.q), [filters.q]);

  const dimensions = useMemo(
    () => buildDimensions((slug) => categories.find((item) => item.slug === slug)?.name ?? slug),
    [categories]
  );

  const go = (overrides: Record<string, string | number | undefined>) => {
    const current: Record<string, string | number | undefined> = {
      chart: chart !== "bar" ? chart : undefined,
      dim: params.get("dim") ?? undefined,
      measure: measure !== "records" ? measure : undefined,
      sx: params.get("sx") ?? undefined,
      net: params.get("net") ?? undefined,
      category: filters.category || undefined,
      theme: filters.theme || undefined,
      dataType: filters.dataType || undefined,
      kingdom: filters.kingdom || undefined,
      q: filters.q || undefined,
      from: filters.from || undefined,
      to: filters.to || undefined
    };
    navigate("/insights", { ...current, ...overrides });
  };

  // 时间范围
  const datasetBounds = useMemo(() => {
    if (!resource.state.data || resource.state.data.length === 0) return { min: "", max: "" };
    const times = resource.state.data.map((record) => record.updatedAt);
    return { min: toMonthInput(Math.min(...times)), max: toMonthInput(Math.max(...times)) };
  }, [resource.state.data]);

  const activePreset = useMemo(() => {
    if (!filters.from || !filters.to || !datasetBounds.max) return filters.from || filters.to ? "custom" : "all";
    const matched = TIME_PRESETS.find((preset) => {
      if (preset.months === null) return false;
      const end = new Date(datasetBounds.max + "-01T00:00:00");
      const start = new Date(end);
      start.setMonth(start.getMonth() - (preset.months - 1));
      return filters.to === datasetBounds.max && filters.from === toMonthInput(start.getTime());
    });
    return matched?.key ?? "custom";
  }, [filters.from, filters.to, datasetBounds.max]);

  const applyPreset = (months: number | null) => {
    if (months === null || !datasetBounds.max) {
      go({ from: undefined, to: undefined });
      return;
    }
    const end = new Date(datasetBounds.max + "-01T00:00:00");
    const start = new Date(end);
    start.setMonth(start.getMonth() - (months - 1));
    go({ from: toMonthInput(start.getTime()), to: datasetBounds.max });
  };

  // 筛选项候选值来自全量数据并标注各自总数，便于用户预判筛选结果规模
  const filterOptions = useMemo(() => {
    const base = resource.state.data ?? [];
    const build = (keysOf: (record: BioRecord) => string[]) => {
      const counts = new Map<string, number>();
      base.forEach((record) => {
        keysOf(record).forEach((key) => counts.set(key, (counts.get(key) ?? 0) + 1));
      });
      return [...counts.entries()]
        .map(([key, count]) => ({ key, count }))
        .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key, "zh-Hans-CN"));
    };
    return {
      category: categories.map((meta) => ({ key: meta.slug, count: base.filter((r) => r.category === meta.slug).length })),
      theme: build((r) => r.themes),
      dataType: build((r) => [r.dataType]),
      kingdom: build((r) => [r.taxonomy.kingdom])
    };
  }, [resource.state.data, categories]);

  const filtered = useMemo(
    () => applyClientFilters(resource.state.data ?? [], filters),
    [resource.state.data, filters]
  );

  const measureDef = MEASURES[measure] ?? MEASURES.records;
  const dimDef = dimensions[dimension] ?? dimensions.category;

  const buckets = useMemo(
    () => aggregate(filtered, dimDef, measureDef, categories),
    [filtered, dimDef, measureDef, categories]
  );
  const lineBuckets = useMemo(
    () =>
      dimension === "updatedMonth"
        ? fillMissingMonths(buckets, (key, label) => ({
            key,
            label,
            count: 0,
            measure: 0,
            byCategory: []
          }))
        : buckets,
    [buckets, dimension]
  );
  const network = useMemo(() => buildNetwork(filtered, networkMode, categories), [filtered, networkMode, categories]);

  const totalMetrics = filtered.reduce((sum, record) => sum + record.metrics.length, 0);
  const totalThemeLinks = filtered.reduce((sum, record) => sum + record.themes.length, 0);
  const spanLabel =
    filters.from || filters.to
      ? `${filters.from ? monthLabel(filters.from) : "最早"} 至 ${filters.to ? monthLabel(filters.to) : "最新"}`
      : datasetBounds.min
        ? `${monthLabel(datasetBounds.min)} 至 ${monthLabel(datasetBounds.max)}（全部时间）`
        : "—";

  const isDefault =
    !filters.category &&
    !filters.theme &&
    !filters.dataType &&
    !filters.kingdom &&
    !filters.q &&
    !filters.from &&
    !filters.to;

  const activeChart = CHART_TABS.find((tab) => tab.key === chart) ?? CHART_TABS[0];

  const onSearch = (value: string) => {
    setSearchInput(value);
    go({ q: value.trim() || undefined });
  };

  return (
    <div className="insights-page">
      <header className="browser-header insights-header">
        <p className="eyebrow">VISUAL ANALYTICS</p>
        <h1>数据可视化中心</h1>
        <p>
          同一个数据工作台内切换柱状图、折线图、散点图与网络图，自由选择数据维度与度量；
          筛选条件与时间范围对所有图表同时生效，用于观察生物数据随时间或分类变化的趋势。
        </p>
      </header>

      {/* 图表类型切换 */}
      <div className="chart-tabs" role="tablist" aria-label="选择图表类型">
        {CHART_TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              role="tab"
              aria-selected={chart === tab.key}
              className={chart === tab.key ? "chart-tab is-active" : "chart-tab"}
              onClick={() => go({ chart: tab.key === "bar" ? undefined : tab.key })}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 控制面板：维度/度量随图表类型变化 */}
      <section className="insight-controls" aria-label="图表维度与筛选">
        <div className="control-row">
          {chart !== "network" && (
            <label className="control-field">
              <span>{chart === "scatter" ? "X 轴维度" : "分组维度"}</span>
              <select
                value={chart === "scatter" ? scatterX : dimension}
                onChange={(event) => go({ [chart === "scatter" ? "sx" : "dim"]: event.target.value === (chart === "line" ? "updatedMonth" : "category") ? undefined : event.target.value })}
              >
                {(Object.values(dimensions)).map((dim) => (
                  <option key={dim.key} value={dim.key}>
                    {dim.label}
                  </option>
                ))}
              </select>
            </label>
          )}
          {(chart === "bar" || chart === "line") && (
            <label className="control-field">
              <span>度量数值</span>
              <select
                value={measure}
                onChange={(event) => go({ measure: event.target.value === "records" ? undefined : event.target.value })}
              >
                {Object.values(MEASURES).map((item) => (
                  <option key={item.key} value={item.key}>
                    {item.label}（{item.unit}）
                  </option>
                ))}
              </select>
            </label>
          )}
          {chart === "network" && (
            <label className="control-field">
              <span>关系类型</span>
              <select
                value={networkMode}
                onChange={(event) => go({ net: event.target.value === "category_theme" ? undefined : event.target.value })}
              >
                <option value="category_theme">数据域 ↔ 研究主题</option>
                <option value="category_kingdom">数据域 ↔ 生物分类（界）</option>
              </select>
            </label>
          )}
          <p className="control-hint">
            {chart === "scatter"
              ? `X 轴：${(dimensions[scatterX] ?? dimensions.updatedMonth).label}；Y 轴：每条记录的关键指标数；气泡大小：主题数。`
              : chart === "network"
                ? "节点为数据域与主题/分类，连线粗细代表关联记录数。"
                : `${dimDef.label} · ${measureDef.label}：${measureDef.hint}`}
          </p>
        </div>

        <div className="control-row control-filters">
          <label className="control-field control-search">
            <span>关键词</span>
            <span className="control-search-box">
              <Search size={14} />
              <input value={searchInput} onChange={(event) => onSearch(event.target.value)} placeholder="名称 / 学名 / 主题…" />
              {searchInput && (
                <button className="control-search-clear" onClick={() => onSearch("")} aria-label="清空关键词">
                  <X size={13} />
                </button>
              )}
            </span>
          </label>
          {(["category", "theme", "dataType", "kingdom"] as const).map((field) => {
            const labels: Record<typeof field, string> = {
              category: "数据域",
              theme: "主题",
              dataType: "数据类型",
              kingdom: "生物分类"
            };
            return (
              <label key={field} className="control-field">
                <span>{labels[field]}</span>
                <select value={filters[field]} onChange={(event) => go({ [field]: event.target.value || undefined })}>
                  <option value="">全部</option>
                  {filterOptions[field].map((option) => (
                    <option key={option.key} value={option.key}>
                      {option.key}（{option.count}）
                    </option>
                  ))}
                </select>
              </label>
            );
          })}
        </div>

        <div className="control-row control-time">
          <span className="control-time-label">
            <CalendarRange size={14} /> 时间范围（按记录更新时间）
          </span>
          <div className="preset-group">
            {TIME_PRESETS.map((preset) => (
              <button
                key={preset.key}
                className={activePreset === preset.key ? "preset-chip is-active" : "preset-chip"}
                onClick={() => applyPreset(preset.months)}
              >
                {preset.label}
              </button>
            ))}
          </div>
          <label className="month-field">
            起
            <input
              type="month"
              min={datasetBounds.min}
              max={filters.to || datasetBounds.max}
              value={filters.from}
              onChange={(event) => go({ from: event.target.value || undefined })}
            />
          </label>
          <label className="month-field">
            止
            <input
              type="month"
              min={filters.from || datasetBounds.min}
              max={datasetBounds.max}
              value={filters.to}
              onChange={(event) => go({ to: event.target.value || undefined })}
            />
          </label>
          {!isDefault && (
            <button className="reset-button" onClick={() => { setSearchInput(""); navigate("/insights"); }}>
              <RotateCcw size={13} /> 重置全部
            </button>
          )}
        </div>
      </section>

      {/* 数值摘要：所有图表上方固定给出关键统计 */}
      <section className="insight-summary" aria-label="当前筛选结果统计">
        <SummaryStat label="纳入分析的记录" value={String(filtered.length)} unit="条" />
        <SummaryStat label="关键指标数据点" value={String(totalMetrics)} unit="项" />
        <SummaryStat label="主题挂接次数" value={String(totalThemeLinks)} unit="次" />
        <SummaryStat label="覆盖数据域" value={String(new Set(filtered.map((r) => r.category)).size)} unit="个 / 共 5" />
        <SummaryStat label="分组数量" value={String(buckets.length)} unit="组" />
      </section>
      <p className="insight-range">
        当前视图：{activeChart.label} —— {activeChart.hint} ｜ 时间跨度：{spanLabel}
        {resource.state.status === "loading" && " ｜ 数据更新中…"}
      </p>

      {resource.state.status === "error" && resource.state.data === undefined && (
        <ErrorState message={resource.state.message} onRetry={resource.reload} />
      )}

      {resource.state.data !== undefined && (
        <section className="chart-panel" aria-live="polite">
          {resource.state.status === "error" && <InlineError message={`${resource.state.message}，图表基于上一次数据渲染。`} />}
          {filtered.length === 0 ? (
            <div className="state-block empty-state">
              <BarChart3 size={30} />
              <h3>当前筛选条件下没有可绘制的数据</h3>
              <p>请放宽关键词、分类条件或扩大时间范围后重试。</p>
              <button className="secondary-button" onClick={() => { setSearchInput(""); navigate("/insights"); }}>
                <RotateCcw size={14} /> 清除全部条件
              </button>
            </div>
          ) : (
            <>
              {chart === "bar" && (
                <BarChart
                  buckets={buckets}
                  measure={measureDef}
                  categories={categories}
                  orientation={dimension === "updatedMonth" ? "vertical" : "horizontal"}
                  emptyHint="暂无可绘制的分组"
                />
              )}
              {chart === "line" && (
                <LineChart buckets={lineBuckets} measure={measureDef} categories={categories} emptyHint="时间范围内没有数据点" />
              )}
              {/* 数据表：保证图表读数可核对，不做纯视觉装饰 */}
              {(chart === "bar" || chart === "line") && (
                <ChartTable
                  headers={[dimDef.label, measureDef.label, "记录数", "占比", "主要数据域"]}
                  rows={buckets.map((bucket) => {
                    const total = buckets.reduce((sum, item) => sum + item.count, 0);
                    const top = [...bucket.byCategory].sort((a, b) => b.count - a.count).slice(0, 3);
                    return [
                      bucket.label,
                      `${Number.isInteger(bucket.measure) ? bucket.measure : bucket.measure.toFixed(2)} ${measureDef.unit}`,
                      `${bucket.count} 条`,
                      `${total ? ((bucket.count / total) * 100).toFixed(1) : 0}%`,
                      top.map((part) => `${part.name} ${part.count}`).join("、")
                    ];
                  })}
                />
              )}
              {chart === "scatter" && (
                <ScatterChart
                  records={filtered}
                  xDimension={dimensions[scatterX] ?? dimensions.updatedMonth}
                  categories={categories}
                  onOpenRecord={onOpenRecord}
                  emptyHint="时间范围内没有数据点"
                />
              )}
              {chart === "scatter" && (
                <ChartTable
                  headers={["记录", "数据域", "数据类型", "指标数", "主题数", "更新时间"]}
                  rows={[...filtered]
                    .sort((a, b) => b.updatedAt - a.updatedAt)
                    .slice(0, 20)
                    .map((record) => [
                      record.name,
                      categories.find((c) => c.slug === record.category)?.name ?? record.category,
                      record.dataType,
                      `${record.metrics.length} 项`,
                      `${record.themes.length} 个`,
                      formatDate(record.updatedAt)
                    ])}
                  note={`按更新时间倒序显示前 ${Math.min(20, filtered.length)} 条，共 ${filtered.length} 条；点击图表中的气泡可进入记录详情。`}
                />
              )}
              {chart === "network" && (
                <>
                  <NetworkChart data={network} emptyHint="当前筛选下没有可构成关系的数据" />
                  <ChartTable
                    headers={["关系路径", "关联记录数"]}
                    rows={network.edges.slice(0, 30).map((edge) => {
                      const source = network.nodes.find((n) => n.id === edge.source);
                      const target = network.nodes.find((n) => n.id === edge.target);
                      return [`${source?.label ?? edge.source} → ${target?.label ?? edge.target}`, `${edge.weight} 条`];
                    })}
                    note={`按关联记录数倒序显示前 ${Math.min(30, network.edges.length)} 条关系，共 ${network.edges.length} 条。`}
                  />
                </>
              )}
            </>
          )}
        </section>
      )}
    </div>
  );
}

function SummaryStat({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="summary-stat">
      <span>{label}</span>
      <strong>
        {value}
        <em>{unit}</em>
      </strong>
    </div>
  );
}

function ChartTable({
  headers,
  rows,
  note
}: {
  headers: string[];
  rows: string[][];
  note?: string;
}) {
  return (
    <div className="chart-table-wrap">
      <h4 className="chart-table-title">数值明细（图表读数可核对）</h4>
      <table className="chart-table">
        <thead>
          <tr>
            {headers.map((header, index) => (
              <th key={`${header}-${index}`}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.slice(0, headers.length).map((cell, cellIndex) => (
                <td key={cellIndex} className={cellIndex > 0 ? "is-num" : ""}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {note && <p className="chart-table-note">{note}</p>}
    </div>
  );
}
