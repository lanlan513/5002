import { Search, SlidersHorizontal, X } from "lucide-react";
import type { RefObject } from "react";
import type { SortKey } from "../../shared/contract";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "relevance", label: "综合排序" },
  { value: "name", label: "按名称" },
  { value: "updated_desc", label: "最新更新" },
  { value: "updated_asc", label: "最早更新" }
];

export interface ActiveFilter {
  field: "category" | "theme" | "dataType" | "kingdom";
  label: string;
  value: string;
}

export function Toolbar({
  query,
  sort,
  total,
  activeFilters,
  onQueryChange,
  onSortChange,
  onRemoveFilter,
  onClear,
  onToggleFacets,
  facetsOpen,
  searchRef
}: {
  query: string;
  sort: SortKey;
  total: number;
  activeFilters: ActiveFilter[];
  onQueryChange: (value: string) => void;
  onSortChange: (value: SortKey) => void;
  onRemoveFilter: (field: ActiveFilter["field"]) => void;
  onClear: () => void;
  onToggleFacets: () => void;
  facetsOpen: boolean;
  searchRef?: RefObject<HTMLInputElement | null>;
}) {
  return (
    <div className="toolbar">
      <div className="toolbar-row">
        <div className="search-box">
          <Search size={17} />
          <input
            ref={searchRef}
            type="search"
            value={query}
            placeholder="搜索名称、学名、基因符号、组织或主题…"
            aria-label="全文搜索"
            onChange={(event) => onQueryChange(event.target.value)}
          />
          {query && (
            <button className="search-clear" aria-label="清除搜索" onClick={() => onQueryChange("")}>
              <X size={15} />
            </button>
          )}
        </div>
        <label className="sort-box">
          <SlidersHorizontal size={15} />
          <select value={sort} onChange={(event) => onSortChange(event.target.value as SortKey)} aria-label="排序方式">
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <button className="facet-toggle mobile-only" onClick={onToggleFacets} aria-expanded={facetsOpen}>
          筛选{activeFilters.length > 0 ? `（${activeFilters.length}）` : ""}
        </button>
      </div>
      {activeFilters.length > 0 && (
        <div className="active-filters">
          {activeFilters.map((filter) => (
            <button key={filter.field} className="filter-chip" onClick={() => onRemoveFilter(filter.field)}>
              {filter.label}：{filter.value} <X size={13} />
            </button>
          ))}
          <button className="filter-chip filter-chip-clear" onClick={onClear}>
            全部清除
          </button>
          <span className="filter-count">共 {total} 条结果</span>
        </div>
      )}
    </div>
  );
}
