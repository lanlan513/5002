import { useEffect, useMemo, useRef, useState } from "react";
import type { CategoryMeta, RecordQuery, SortKey } from "../../shared/contract";
import { api } from "../api/client";
import { useResource } from "../hooks/useResource";
import { FacetPanel } from "../components/FacetPanel";
import { Toolbar, type ActiveFilter } from "../components/Toolbar";
import { Pagination } from "../components/Pagination";
import { RecordCard } from "../components/RecordCard";
import { CardSkeleton, EmptyState, ErrorState, InlineError } from "../components/States";

const PAGE_SIZE = 12;

type FilterField = "category" | "theme" | "dataType" | "kingdom";

export function DataBrowser({
  categories,
  initial,
  navigate,
  onOpenRecord
}: {
  categories: CategoryMeta[];
  initial: URLSearchParams;
  navigate: (path: string, params?: Record<string, string | number | undefined>) => void;
  onOpenRecord: (id: string) => void;
}) {
  const [facetsOpen, setFacetsOpen] = useState(false);

  /** 所有查询条件都存放在 URL 里：可分享、可后退、刷新不丢失 */
  const category = initial.get("category") ?? "";
  const theme = initial.get("theme") ?? "";
  const dataType = initial.get("dataType") ?? "";
  const kingdom = initial.get("kingdom") ?? "";
  const q = initial.get("q") ?? "";
  const sort = (initial.get("sort") as SortKey | null) ?? "relevance";
  const page = Math.max(1, Number(initial.get("page") ?? "1") || 1);

  /** 搜索框本地状态，与 URL 解耦后由 hook 防抖，避免逐字符请求 */
  const [searchInput, setSearchInput] = useState(q);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const focus = () => searchRef.current?.focus();
    window.addEventListener("biodatahub:focus-search", focus);
    return () => window.removeEventListener("biodatahub:focus-search", focus);
  }, []);

  const query: RecordQuery = useMemo(
    () => ({
      category: (category || undefined) as RecordQuery["category"],
      theme: theme || undefined,
      dataType: dataType || undefined,
      kingdom: kingdom || undefined,
      q: searchInput.trim() || undefined,
      sort,
      page,
      pageSize: PAGE_SIZE
    }),
    [category, theme, dataType, kingdom, searchInput, sort, page]
  );

  const resource = useResource(
    (signal) => api.records(query, signal),
    [category, theme, dataType, kingdom, searchInput.trim(), sort, page],
    { debounceMs: 300 }
  );

  const active: Record<FilterField, string | undefined> = {
    category: category || undefined,
    theme: theme || undefined,
    dataType: dataType || undefined,
    kingdom: kingdom || undefined
  };

  const currentParams = (
    overrides: Record<string, string | number | undefined>
  ): Record<string, string | number | undefined> => ({
    category: category || undefined,
    theme: theme || undefined,
    dataType: dataType || undefined,
    kingdom: kingdom || undefined,
    q: searchInput.trim() || undefined,
    sort: sort !== "relevance" ? sort : undefined,
    page,
    ...overrides
  });

  const go = (overrides: Record<string, string | number | undefined>) =>
    navigate("/data", currentParams(overrides));

  // 搜索输入：更新本地状态（防抖触发请求），同时同步到 URL（重置分页）
  const onQueryChange = (value: string) => {
    setSearchInput(value);
    go({ q: value.trim() || undefined, page: 1 });
  };

  const onToggleFacet = (field: FilterField, key: string) =>
    go({ [field]: active[field] === key ? undefined : key, page: 1 });

  const onRemoveFilter = (field: FilterField) => go({ [field]: undefined, page: 1 });

  const onClear = () => {
    setSearchInput("");
    navigate("/data", { sort: sort !== "relevance" ? sort : undefined });
  };

  const categoryMeta = (slug: string) => categories.find((item) => item.slug === slug);
  const categoryLabel = (value: string) => categoryMeta(value)?.name ?? value;

  const activeFilters: ActiveFilter[] = (
    [
      { field: "category", label: "数据域", value: categoryLabel(category) },
      { field: "theme", label: "主题", value: theme },
      { field: "dataType", label: "数据类型", value: dataType },
      { field: "kingdom", label: "生物分类", value: kingdom }
    ] as { field: FilterField; label: string; value: string }[]
  ).filter((item) => item.value);

  const isFiltered = activeFilters.length > 0 || searchInput.trim().length > 0;
  const currentCategory = category ? categoryMeta(category) : undefined;

  return (
    <div className="browser-page">
      <header className="browser-header">
        <p className="eyebrow">DATA CATALOG</p>
        <h1>
          {currentCategory ? currentCategory.name : "全部生物数据"}
        </h1>
        <p>
          {currentCategory
            ? currentCategory.description
            : "跨五个数据域统一检索；左侧组合筛选，顶部全文搜索，结果支持排序与分页。"}
        </p>
      </header>

      <Toolbar
        query={searchInput}
        sort={sort}
        total={resource.state.status === "success" ? resource.state.data.total : 0}
        activeFilters={activeFilters}
        onQueryChange={onQueryChange}
        onSortChange={(value) => go({ sort: value !== "relevance" ? value : undefined, page: 1 })}
        onRemoveFilter={onRemoveFilter}
        onClear={onClear}
        onToggleFacets={() => setFacetsOpen((open) => !open)}
        facetsOpen={facetsOpen}
        searchRef={searchRef}
      />

      <div className="browser-layout">
        <div className={facetsOpen ? "facet-wrap is-open" : "facet-wrap"}>
          {resource.state.data !== undefined && (
            <FacetPanel
              groups={resource.state.data.facets}
              active={active}
              onToggle={onToggleFacet}
              resultCount={resource.state.data.total}
            />
          )}
        </div>

        <section className="result-area" aria-live="polite">
          {resource.state.status === "loading" && resource.state.data === undefined && (
            <CardSkeleton count={PAGE_SIZE} />
          )}
          {resource.state.status === "loading" && resource.state.data !== undefined && (
            <>
              <div className="top-progress" aria-hidden="true" />
              <div className="record-grid is-stale">
                {resource.state.data.items.map((record) => (
                  <RecordCard
                    key={record.id}
                    record={record}
                    category={categoryMeta(record.category)}
                    onOpen={onOpenRecord}
                  />
                ))}
              </div>
            </>
          )}
          {resource.state.status === "error" && resource.state.data === undefined && (
            <ErrorState message={resource.state.message} onRetry={resource.reload} />
          )}
          {resource.state.status === "error" && resource.state.data !== undefined && (
            <>
              <InlineError message={`${resource.state.message}，当前显示的是上一次结果。`} />
              <div className="record-grid">
                {resource.state.data.items.map((record) => (
                  <RecordCard
                    key={record.id}
                    record={record}
                    category={categoryMeta(record.category)}
                    onOpen={onOpenRecord}
                  />
                ))}
              </div>
            </>
          )}
          {resource.state.status === "success" && resource.state.data.items.length === 0 && (
            <EmptyState
              title="没有找到匹配的数据记录"
              hint={
                searchInput
                  ? `没有与“${searchInput}”相关的结果，可更换关键词或清除筛选。`
                  : "当前筛选条件下暂无记录，请放宽条件。"
              }
              onReset={isFiltered ? onClear : undefined}
            />
          )}
          {resource.state.status === "success" && resource.state.data.items.length > 0 && (
            <>
              <div className="record-grid">
                {resource.state.data.items.map((record) => (
                  <RecordCard
                    key={record.id}
                    record={record}
                    category={categoryMeta(record.category)}
                    onOpen={onOpenRecord}
                  />
                ))}
              </div>
              <Pagination
                page={resource.state.data.page}
                totalPages={resource.state.data.totalPages}
                total={resource.state.data.total}
                pageSize={resource.state.data.pageSize}
                onPage={(value) => {
                  go({ page: value });
                  document.querySelector(".browser-header")?.scrollIntoView({ behavior: "smooth" });
                }}
              />
            </>
          )}
        </section>
      </div>
    </div>
  );
}
