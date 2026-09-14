import { ArrowRight, Database, Layers, Tags } from "lucide-react";
import type { CatalogStats, CategoryMeta, PaginatedRecords } from "../../shared/contract";
import { api } from "../api/client";
import { useResource } from "../hooks/useResource";
import { buildHash, formatDate } from "../lib/url";
import { CategoryIcon } from "../components/CategoryIcon";
import { CardSkeleton, ErrorState, InlineError } from "../components/States";
import { RecordCard } from "../components/RecordCard";

export function Home({
  categories,
  onOpenRecord
}: {
  categories: CategoryMeta[];
  onOpenRecord: (id: string) => void;
}) {
  const stats = useResource<CatalogStats>(() => api.stats(), []);
  const latest = useResource<PaginatedRecords>(
    (signal) => api.records({ sort: "updated_desc", pageSize: 4 }, signal),
    []
  );

  return (
    <div className="home-page">
      <section className="hero">
        <p className="eyebrow">UNIFIED BIOLOGICAL DATA HUB</p>
        <h1>统一生物数据中心</h1>
        <p className="hero-lede">
          物种、基因、细胞、生态系统与人体数据采用同一套数据结构，集中分类、统一检索。
          按生物分类、主题与数据类型自由组合查询，所有数据均通过标准 API 获取。
        </p>
        <div className="hero-actions">
          <a className="primary-button" href={buildHash("/data")}>
            浏览全部数据 <ArrowRight size={16} />
          </a>
          <a className="ghost-button" href={buildHash("/data", { q: "进化" })}>
            试试搜索“进化”
          </a>
        </div>
        {stats.state.status === "success" && (
          <dl className="hero-stats">
            <div>
              <dt><Database size={14} /> 数据记录</dt>
              <dd>{stats.state.data.total}</dd>
            </div>
            <div>
              <dt><Layers size={14} /> 数据域</dt>
              <dd>{stats.state.data.byCategory.length}</dd>
            </div>
            <div>
              <dt><Tags size={14} /> 主题标签</dt>
              <dd>{stats.state.data.themes}</dd>
            </div>
          </dl>
        )}
        {stats.state.status === "error" && <InlineError message={stats.state.message} />}
      </section>

      <section className="domain-section">
        <header className="section-head">
          <h2>按数据域浏览</h2>
          <p>五大类生物数据在同一数据模型下统一管理，点击进入对应分类。</p>
        </header>
        <div className="domain-grid">
          {categories.map((category, index) => {
            const count =
              stats.state.status === "success"
                ? stats.state.data.byCategory.find((item) => item.category === category.slug)?.count
                : undefined;
            return (
              <a
                key={category.slug}
                className="domain-card"
                href={buildHash("/data", { category: category.slug })}
                style={{ "--accent": category.color } as React.CSSProperties}
              >
                <span className="domain-index">0{index + 1}</span>
                <span className="domain-icon"><CategoryIcon name={category.icon} size={24} /></span>
                <h3>{category.name}</h3>
                <p>{category.description}</p>
                <span className="domain-foot">
                  {count === undefined ? "加载中…" : `${count} 条记录`} <ArrowRight size={14} />
                </span>
              </a>
            );
          })}
        </div>
      </section>

      <section className="latest-section">
        <header className="section-head">
          <h2>最近更新</h2>
          <a href={buildHash("/data", { sort: "updated_desc" })}>查看全部 <ArrowRight size={14} /></a>
        </header>
        {latest.state.status === "loading" && latest.state.data === undefined && <CardSkeleton count={4} />}
        {latest.state.status === "error" && latest.state.data === undefined && (
          <ErrorState message={latest.state.message} onRetry={latest.reload} />
        )}
        {(latest.state.status === "success" || latest.state.data !== undefined) && latest.state.data && (
          <>
            <div className="record-grid">
              {latest.state.data.items.map((record) => (
                <RecordCard
                  key={record.id}
                  record={record}
                  category={categories.find((item) => item.slug === record.category)}
                  onOpen={onOpenRecord}
                />
              ))}
            </div>
            {latest.state.status === "error" && <InlineError message={latest.state.message} />}
            <p className="latest-note">
              数据快照最后更新：{formatDate(stats.state.data?.updatedAt ?? Date.now())}
            </p>
          </>
        )}
      </section>
    </div>
  );
}
