import { ArrowLeft, ArrowUpRight, Link2, MapPin, Network, RefreshCw } from "lucide-react";
import { api } from "../api/client";
import { useResource } from "../hooks/useResource";
import type { CategoryMeta, RecordDetail } from "../../shared/contract";
import { buildHash, formatDate } from "../lib/url";
import { CategoryIcon } from "../components/CategoryIcon";
import { EmptyState, ErrorState, FullPageLoading } from "../components/States";

export function RecordPage({
  id,
  categories,
  onBack,
  onOpenRecord
}: {
  id: string;
  categories: CategoryMeta[];
  onBack: () => void;
  onOpenRecord: (relatedId: string) => void;
}) {
  const resource = useResource<RecordDetail>((signal) => api.record(id), [id]);

  if (resource.state.status === "loading") return <FullPageLoading label="正在读取数据记录…" />;
  if (resource.state.status === "error") {
    if (resource.state.message.includes("404") || resource.state.message.includes("未找到")) {
      return (
        <EmptyState
          title="记录不存在"
          hint="它可能已被移除，或链接地址有误。"
          onReset={onBack}
        />
      );
    }
    return <ErrorState message={resource.state.message} onRetry={resource.reload} />;
  }

  const record = resource.state.data;
  const meta = categories.find((category) => category.slug === record.category);

  return (
    <article className="detail-page" style={{ "--accent": meta?.color ?? "#8ee8bb" } as React.CSSProperties}>
      <button className="back-button" onClick={onBack}>
        <ArrowLeft size={16} /> 返回数据浏览
      </button>
      <a className="kg-entry-button" href={buildHash("/graph", { node: id })}>
        <Network size={15} /> 在知识图谱中探索该实体
      </a>

      <header className="detail-hero">
        <div className="detail-badges">
          <span className={`record-badge cat-${record.category}`} style={{ color: meta?.color }}>
            <CategoryIcon name={meta?.icon ?? "circle-dot"} size={14} /> {meta?.name}
          </span>
          <span className="record-type">{record.dataType}</span>
          {record.code && <span className="record-code">{record.code}</span>}
        </div>
        <h1>{record.name}</h1>
        {record.latinName && <p className="detail-latin">{record.latinName}</p>}
        <p className="detail-summary">{record.summary}</p>
        <nav className="breadcrumbs" aria-label="分类路径">
          {record.taxonPath.map((step, index) => (
            <span key={`${step}-${index}`}>
              {index > 0 && <i>›</i>}
              <a
                href={index === 0 ? buildHash("/data", { kingdom: record.taxonomy.kingdom }) : undefined}
                className={index === 0 ? "crumb-link" : undefined}
              >
                {step}
              </a>
            </span>
          ))}
        </nav>
      </header>

      <div className="detail-grid">
        <div className="detail-main">
          <section className="detail-section">
            <h2>数据描述</h2>
            <p>{record.description}</p>
          </section>

          {record.metrics.length > 0 && (
            <section className="detail-section">
              <h2>关键指标</h2>
              <div className="metric-grid">
                {record.metrics.map((metric) => (
                  <div key={metric.label} className="metric-item">
                    <span>{metric.label}</span>
                    <strong>{metric.value}</strong>
                  </div>
                ))}
              </div>
            </section>
          )}

          {Object.keys(record.attributes).length > 0 && (
            <section className="detail-section">
              <h2>属性数据</h2>
              <table className="attribute-table">
                <tbody>
                  {Object.entries(record.attributes).map(([key, value]: [string, string]) => (
                    <tr key={key}>
                      <th scope="row">{key}</th>
                      <td>{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {record.related.length > 0 && (
            <section className="detail-section">
              <h2>跨域关联记录</h2>
              <p className="section-note">依据共享主题与分类自动建立关联，打通五个数据域。</p>
              <div className="related-list">
                {record.related.map((related) => {
                  const relatedMeta = categories.find((category) => category.slug === related.category);
                  return (
                    <button key={related.id} className="related-item" onClick={() => onOpenRecord(related.id)}>
                      <span className="related-dot" style={{ background: relatedMeta?.color }} />
                      <span className="related-text">
                        <strong>{related.name}</strong>
                        <small>
                          {relatedMeta?.name} · {related.dataType} · {related.shared.slice(0, 2).join("、")}
                        </small>
                      </span>
                      <ArrowUpRight size={16} />
                    </button>
                  );
                })}
              </div>
            </section>
          )}
        </div>

        <aside className="detail-aside">
          <section className="aside-card">
            <h3>主题标签</h3>
            <div className="record-tags">
              {record.themes.map((theme) => (
                <a key={theme} className="tag-link" href={buildHash("/data", { theme })}>
                  {theme}
                </a>
              ))}
            </div>
          </section>
          {record.location && (
            <section className="aside-card">
              <h3><MapPin size={14} /> 采集 / 分布</h3>
              <p>{record.location}</p>
            </section>
          )}
          {record.links.length > 0 && (
            <section className="aside-card">
              <h3><Link2 size={14} /> 参考来源</h3>
              <ul className="link-list">
                {record.links.map((link) => (
                  <li key={link.label}>{link.label}</li>
                ))}
              </ul>
            </section>
          )}
          <section className="aside-card">
            <h3><RefreshCw size={14} /> 数据信息</h3>
            <p className="aside-source">{record.source}</p>
            <p className="aside-date">更新于 {formatDate(record.updatedAt)}</p>
          </section>
        </aside>
      </div>
    </article>
  );
}
