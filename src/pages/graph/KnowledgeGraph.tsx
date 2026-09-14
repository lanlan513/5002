import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, GitCompareArrows, Loader2, Maximize2, Search, Sparkles, X } from "lucide-react";
import type {
  GraphEdge,
  GraphNode,
  GraphSearchHit,
  GraphStats,
  NeighborResponse,
  PathHop,
  RelationTypeMeta
} from "../../../shared/contract";
import { api } from "../../api/client";
import { useResource } from "../../hooks/useResource";
import { ErrorState, FullPageLoading } from "../../components/States";
import { buildHash } from "../../lib/url";
import { DOMAIN_META, DOMAIN_ORDER, RELATION_GROUP_COLOR } from "./domainMeta";
import { ForceLayout } from "./forceLayout";
import { GraphCanvas } from "./GraphCanvas";

const START_NODE = "sp-homo-sapiens";

export function KnowledgeGraph({ initialId }: { initialId?: string }) {
  const layoutRef = useRef<ForceLayout | null>(null);
  if (!layoutRef.current) layoutRef.current = new ForceLayout();
  const layout = layoutRef.current;

  const typesResource = useResource<RelationTypeMeta[]>(() => api.graphRelationTypes(), []);
  const statsResource = useResource<GraphStats>(() => api.graphStats(), []);

  const [selectedId, setSelectedId] = useState<string>(initialId ?? START_NODE);
  const [version, setVersion] = useState(0); // 结构变化版本号
  const [trail, setTrail] = useState<GraphNode[]>([]);
  const [loadingExpand, setLoadingExpand] = useState(false);
  const [hiddenGroups, setHiddenGroups] = useState<Set<string>>(new Set());
  const [pathHops, setPathHops] = useState<PathHop[] | null>(null);
  const [pathTarget, setPathTarget] = useState("");

  // 初始/切换焦点实体：拉取一跳子图并重建画布
  useEffect(() => {
    const id = initialId ?? START_NODE;
    let cancelled = false;
    setPathHops(null);
    api.graphSubgraph(id, 1).then((subgraph) => {
      if (cancelled) return;
      layout.load(subgraph.nodes, subgraph.edges);
      setSelectedId(id);
      setTrail([]);
      setVersion((v) => v + 1);
    });
    return () => {
      cancelled = true;
    };
  }, [initialId, layout]);

  const neighbors = useResource<NeighborResponse>(
    (signal) => api.graphNeighbors(selectedId).catch((error) => Promise.reject(error)),
    [selectedId]
  );

  const selectedNode = layout.getNode(selectedId);

  /** 增量展开：把实体的新邻居合并进当前画布 */
  const expand = useCallback(
    async (id: string) => {
      setLoadingExpand(true);
      try {
        const existing = layout.nodes.map((node) => node.id);
        const result = await api.graphExpand(id, existing);
        if (result.nodes.length === 0) return;
        layout.merge(result.nodes, result.edges, id);
        setVersion((v) => v + 1);
      } finally {
        setLoadingExpand(false);
      }
    },
    [layout]
  );

  /** 点击实体：选中并在其邻居尚未在画布上时自动增量展开 */
  const select = useCallback(
    async (id: string, viaTrail = false) => {
      if (id === selectedId) return;
      const node = layout.getNode(id);
      if (node && !viaTrail) setTrail((items) => [...items.slice(-7), node]);
      setSelectedId(id);
      const known = new Set(layout.nodes.map((item) => item.id));
      if (!known.has(id)) {
        await expand(id);
      } else {
        // 已在画布上，也顺手展开它的新邻居（连续探索的核心交互）
        const result = await api.graphExpand(id, layout.nodes.map((item) => item.id));
        if (result.nodes.length > 0) {
          layout.merge(result.nodes, result.edges, id);
          setVersion((v) => v + 1);
        }
      }
    },
    [expand, layout, selectedId]
  );

  const highlightedIds = useMemo(() => {
    const ids = new Set<string>();
    if (pathHops) {
      pathHops.forEach((hop) => {
        ids.add(hop.from.id);
        ids.add(hop.to.id);
      });
    } else if (neighbors.state.status === "success") {
      ids.add(selectedId);
      neighbors.state.data.groups.forEach((group) =>
        group.neighbors.forEach((item) => ids.add(item.node.id))
      );
    }
    return ids;
  }, [neighbors.state, pathHops, selectedId]);

  const findPath = useCallback(async () => {
    if (!pathTarget.trim()) return;
    const result = await api.graphPath(selectedId, pathTarget.trim());
    setPathHops(result.paths[0] ?? []);
    if (result.paths[0]) {
      const hops = result.paths[0];
      const nodes: GraphNode[] = [];
      const edgeSet: GraphEdge[] = [];
      hops.forEach((hop) => {
        if (!nodes.some((node) => node.id === hop.from.id)) nodes.push(hop.from);
        if (!nodes.some((node) => node.id === hop.to.id)) nodes.push(hop.to);
        edgeSet.push(hop.edge);
      });
      layout.merge(nodes, edgeSet, selectedId);
      setVersion((v) => v + 1);
    }
  }, [layout, pathTarget, selectedId]);

  if (typesResource.state.status === "loading" || statsResource.state.status === "loading") {
    return <FullPageLoading label="正在构建跨领域知识图谱…" />;
  }
  if (typesResource.state.status === "error") {
    return <ErrorState message={typesResource.state.message} onRetry={typesResource.reload} />;
  }

  const relationTypes = typesResource.state.data;
  const stats = statsResource.state.status === "success" ? statsResource.state.data : undefined;
  const groups = relationTypes.reduce<Record<string, RelationTypeMeta[]>>((acc, meta) => {
    (acc[meta.group] ??= []).push(meta);
    return acc;
  }, {});

  return (
    <div className="kg-page">
      <aside className="kg-sidebar">
        <GraphSearch onPick={(id) => select(id)} />

        <section className="kg-panel">
          <h2>关系类型筛选</h2>
          {Object.entries(groups).map(([group, metas]) => {
            const color = RELATION_GROUP_COLOR[group as keyof typeof RELATION_GROUP_COLOR];
            const hidden = hiddenGroups.has(group);
            return (
              <label key={group} className="kg-filter-row" style={{ "--filter-color": color } as React.CSSProperties}>
                <input
                  type="checkbox"
                  checked={!hidden}
                  onChange={() =>
                    setHiddenGroups((prev) => {
                      const next = new Set(prev);
                      hidden ? next.delete(group) : next.add(group);
                      return next;
                    })
                  }
                />
                <span className="kg-filter-line" />
                <span>{metas.map((meta) => meta.label).join(" / ")}</span>
              </label>
            );
          })}
        </section>

        {stats && (
          <section className="kg-panel kg-stats">
            <h2>图谱规模</h2>
            <p className="kg-stats-line">
              <strong>{stats.nodeCount}</strong> 个实体 · <strong>{stats.edgeCount}</strong> 条关系
            </p>
            <div className="kg-domain-legend">
              {DOMAIN_ORDER.map((domain) => {
                const count = stats.nodesByDomain.find((item) => item.domain === domain)?.count ?? 0;
                return (
                  <span key={domain} className="kg-legend-item">
                    <i style={{ background: DOMAIN_META[domain].color }} />
                    {DOMAIN_META[domain].name}
                    <em>{count}</em>
                  </span>
                );
              })}
            </div>
            <p className="kg-connected">全图 {stats.connectedComponents === 1 ? "已连通为一张关系网" : `含 ${stats.connectedComponents} 个连通分量`}</p>
          </section>
        )}
      </aside>

      <section className="kg-stage">
        <div className="kg-toolbar">
          <div className="kg-trail">
            <span className="kg-trail-hint">
              <Sparkles size={13} /> 连续探索：
            </span>
            <button className="kg-trail-node" onClick={() => select(selectedId, true)}>
              当前：{selectedNode?.name ?? "…"}
            </button>
            {trail.map((node, index) => (
              <span key={`${node.id}-${index}`} className="kg-trail-wrap">
                <ArrowRight size={11} />
                <button className="kg-trail-node" onClick={() => select(node.id, true)} title={node.summary}>
                  {node.name}
                </button>
              </span>
            ))}
          </div>
          <div className="kg-path-finder">
            <GitCompareArrows size={14} />
            <input
              value={pathTarget}
              onChange={(event) => setPathTarget(event.target.value)}
              placeholder="输入目标实体 id 查关系路径（如 ev-luca）"
              onKeyDown={(event) => event.key === "Enter" && findPath()}
            />
            <button onClick={findPath}>寻路</button>
            {pathHops !== null && (
              <button className="kg-path-clear" title="清除路径高亮" onClick={() => setPathHops(null)}>
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {pathHops !== null && (
          <PathBanner hops={pathHops} empty={pathHops.length === 0} onSelect={(id) => select(id, true)} />
        )}

        <div className="kg-canvas-wrap">
          <GraphCanvas
            layout={layout}
            selectedId={selectedId}
            highlightedIds={highlightedIds}
            relationTypes={relationTypes}
            hiddenGroups={hiddenGroups}
            onSelect={(id) => select(id)}
            onExpand={expand}
            version={version}
            loadingExpand={loadingExpand}
          />
          <p className="kg-canvas-hint">
            <Maximize2 size={12} /> 单击选中实体查看关联分组 · 双击节点继续展开新邻居 · 可拖拽布局
          </p>
        </div>
      </section>

      <aside className="kg-detail">
        <DetailPanel
          state={neighbors.state}
          onSelect={(id) => select(id)}
          onExpand={expand}
          onOpenRecord={(recordId) => {
            window.location.hash = buildHash(`/record/${recordId}`).slice(1);
          }}
          pathHighlight={pathHops ? new Set(pathHops.flatMap((hop) => [hop.from.id, hop.to.id])) : null}
        />
      </aside>
    </div>
  );
}

/* ───────────────────────── 顶部实体搜索 ───────────────────────── */

function GraphSearch({ onPick }: { onPick: (id: string) => void }) {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<GraphSearchHit[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      // 空查询展示"枢纽实体"（按连接度排序），帮助冷启动探索
      api.graphSearch("", undefined, 8).then((result) => setHits(result));
      return;
    }
    setLoading(true);
    const timer = setTimeout(() => {
      api.graphSearch(query, undefined, 10).then((result) => {
        setHits(result);
        setLoading(false);
      });
    }, 180);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <section className="kg-panel kg-search">
      <h2>实体搜索</h2>
      <div className="kg-search-box">
        <Search size={15} />
        <input
          value={query}
          placeholder="搜物种 / 基因 / 生态 / 演化节点…"
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
        />
        {loading && <Loader2 size={14} className="kg-spin" />}
      </div>
      {open && hits.length > 0 && (
        <ul className="kg-search-list">
          {hits.map((hit) => (
            <li key={hit.node.id}>
              <button
                onClick={() => {
                  onPick(hit.node.id);
                  setOpen(false);
                }}
              >
                <i className="kg-dot" style={{ background: DOMAIN_META[hit.node.domain].color }} />
                <span>
                  <strong>{hit.node.name}</strong>
                  <small>
                    {DOMAIN_META[hit.node.domain].name} · {hit.degree} 条关系
                  </small>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ───────────────────────── 右侧关联分组详情 ───────────────────────── */

function DetailPanel({
  state,
  onSelect,
  onExpand,
  onOpenRecord,
  pathHighlight
}: {
  state:
    | { status: "loading" }
    | { status: "error"; message: string }
    | { status: "success"; data: NeighborResponse };
  onSelect: (id: string) => void;
  onExpand: (id: string) => void;
  onOpenRecord: (recordId: string) => void;
  pathHighlight: Set<string> | null;
}) {
  if (state.status === "loading") return <div className="kg-detail-loading">正在读取实体关联…</div>;
  if (state.status === "error") return <ErrorState message={state.message} />;

  const { center, groups, degree } = state.data;
  const meta = DOMAIN_META[center.domain];
  return (
    <div className="kg-detail-body">
      <header className="kg-detail-head" style={{ "--accent": meta.color } as React.CSSProperties}>
        <span className="kg-domain-badge" style={{ color: meta.color }}>
          <i style={{ background: meta.color }} /> {meta.name}
        </span>
        <h2>{center.name}</h2>
        {center.latinName && <p className="kg-latin">{center.latinName}</p>}
        {center.subtitle && <span className="kg-subtitle">{center.subtitle}</span>}
        <p className="kg-summary">{center.summary}</p>
        <div className="kg-detail-actions">
          <button className="kg-primary-btn" onClick={() => onExpand(center.id)}>
            继续展开 {degree} 个邻居
          </button>
          {center.recordId && (
            <button className="kg-ghost-btn" onClick={() => onOpenRecord(center.recordId!)}>
              查看完整档案
            </button>
          )}
        </div>
      </header>

      <div className="kg-neighbor-groups">
        {groups.length === 0 && <p className="kg-empty">该实体暂时没有已录入的关系。</p>}
        {groups.map((group) => (
          <section key={group.relation} className="kg-neighbor-group">
            <h3>
              {group.label}
              <em>{group.neighbors.length}</em>
            </h3>
            <ul>
              {group.neighbors.map((neighbor) => {
                const neighborMeta = DOMAIN_META[neighbor.node.domain];
                const onPath = pathHighlight?.has(neighbor.node.id);
                return (
                  <li key={neighbor.edge.id} className={onPath ? "is-on-path" : ""}>
                    <button className="kg-neighbor-item" onClick={() => onSelect(neighbor.node.id)}>
                      <i className="kg-dot" style={{ background: neighborMeta.color }} />
                      <span className="kg-neighbor-text">
                        <strong>{neighbor.node.name}</strong>
                        <small>
                          {neighborMeta.name} · {neighbor.relationLabel}
                        </small>
                        {neighbor.edge.evidence && <small className="kg-evidence">“{neighbor.edge.evidence}”</small>}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

/* ───────────────────────── 关系路径横幅 ───────────────────────── */

function PathBanner({ hops, empty, onSelect }: { hops: PathHop[]; empty: boolean; onSelect: (id: string) => void }) {
  if (empty) {
    return <div className="kg-path-banner is-empty">两个实体在当前图谱中尚不可达，可尝试新增中间关系。</div>;
  }
  return (
    <div className="kg-path-banner">
      <span className="kg-path-title">关系路径（{hops.length} 跳）</span>
      <div className="kg-path-chain">
        <button onClick={() => onSelect(hops[0].from.id)}>{hops[0].from.name}</button>
        {hops.map((hop) => (
          <span key={hop.edge.id} className="kg-path-hop">
            <i className="kg-path-relation">{hop.label}</i>
            <ArrowRight size={12} />
            <button onClick={() => onSelect(hop.to.id)}>{hop.to.name}</button>
          </span>
        ))}
      </div>
    </div>
  );
}
