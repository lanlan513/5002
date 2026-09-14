import type { FacetGroup } from "../../shared/contract";

/** 侧边筛选面板：分面桶直接来自 API，前端不自行维护筛选维度数据 */
export function FacetPanel({
  groups,
  active,
  onToggle,
  resultCount
}: {
  groups: FacetGroup[];
  active: Record<string, string | undefined>;
  onToggle: (field: FacetGroup["field"], key: string) => void;
  resultCount: number;
}) {
  return (
    <aside className="facet-panel" aria-label="数据筛选">
      <p className="facet-meta">当前匹配 <strong>{resultCount}</strong> 条记录</p>
      {groups.map((group) => {
        const current = active[group.field];
        const maxCount = Math.max(1, ...group.buckets.map((bucket) => bucket.count));
        return (
          <section className="facet-group" key={group.field}>
            <h4>{group.label}</h4>
            {group.buckets.length === 0 && <p className="facet-empty">暂无可选项</p>}
            <ul>
              {group.buckets.map((bucket) => {
                const selected = current === bucket.key;
                return (
                  <li key={bucket.key}>
                    <button
                      className={selected ? "facet-option is-selected" : "facet-option"}
                      onClick={() => onToggle(group.field, bucket.key)}
                      aria-pressed={selected}
                      title={`${bucket.label}：${bucket.count} 条`}
                    >
                      <span className="facet-label">{bucket.label}</span>
                      <span className="facet-bar" aria-hidden="true">
                        <i style={{ width: `${Math.round((bucket.count / maxCount) * 100)}%` }} />
                      </span>
                      <span className="facet-count">{bucket.count}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </aside>
  );
}
