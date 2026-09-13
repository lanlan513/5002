import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Bone,
  Brain,
  Bug,
  ChevronRight,
  CircleDot,
  Clock3,
  Disc3,
  Eye,
  Feather,
  Fish,
  FishSymbol,
  Flower2,
  Footprints,
  Flame,
  GitBranch,
  GitFork,
  Layers,
  Leaf,
  Network,
  Orbit,
  PawPrint,
  RotateCcw,
  Snail,
  Snowflake,
  Sparkles,
  TreePine,
  Turtle,
  Waves,
  Wind,
  X,
  type LucideIcon
} from "lucide-react";
import { api, type Era, type Organism, type Phylogeny, type TaxonNode } from "./api";

const MAX_MYA = 4600;
const MIN_MYA = 0.0005;

export type PhylogenyFocus = { type: "organism" | "era"; slug: string } | null;

const iconMap: Record<string, LucideIcon> = {
  orbit: Orbit,
  layers: Layers,
  "circle-dot": CircleDot,
  leaf: Leaf,
  "tree-pine": TreePine,
  "flower-2": Flower2,
  bug: Bug,
  disc: Disc3,
  eye: Eye,
  wind: Wind,
  snail: Snail,
  fish: Fish,
  "fish-symbol": FishSymbol,
  footprints: Footprints,
  turtle: Turtle,
  "paw-print": PawPrint,
  waves: Waves,
  snowflake: Snowflake,
  bone: Bone,
  feather: Feather,
  bird: Feather,
  flame: Flame,
  brain: Brain,
  network: Network,
  "git-fork": GitFork
};

const formatMya = (mya: number) => {
  if (mya >= 100) return `${Math.round((mya / 100) * 10) / 10}亿年前`;
  if (mya >= 0.01) return `${Math.round(mya * 100)}万年前`;
  return `${Math.round(mya * 1e6)}年前`;
};

const POSITION_SPAN = Math.sqrt(MAX_MYA) - Math.sqrt(MIN_MYA);

const positionOf = (mya: number) => {
  const safeMya = Math.max(Math.min(mya, MAX_MYA), MIN_MYA);
  return ((Math.sqrt(MAX_MYA) - Math.sqrt(safeMya)) / POSITION_SPAN) * 100;
};

const existsInEra = (node: TaxonNode, era: Era) =>
  node.divergence_mya <= era.start_mya && node.divergence_mya >= era.end_mya;

function PhylogenyPage({
  onNavigate,
  initialFocus
}: {
  onNavigate: (to: string) => void;
  initialFocus: PhylogenyFocus;
}) {
  const [data, setData] = useState<Phylogeny | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [activeEraSlug, setActiveEraSlug] = useState<string | null>(null);
  const initialFocusRef = useRef(initialFocus);

  useEffect(() => {
    api.phylogeny().then(setData).catch(console.error);
  }, []);

  const graph = useMemo(() => {
    if (!data) return null;
    const bySlug = new Map(data.nodes.map((node) => [node.slug, node]));
    const children = new Map<string | null, TaxonNode[]>();
    data.nodes.forEach((node) => {
      const list = children.get(node.parent_slug) ?? [];
      list.push(node);
      children.set(node.parent_slug, list);
    });
    children.forEach((list) => list.sort((a, b) => a.node_order - b.node_order || b.divergence_mya - a.divergence_mya));
    return {
      bySlug,
      children,
      root: data.nodes.find((node) => node.parent_slug === null) ?? data.nodes[0]
    };
  }, [data]);

  const organismBySlug = useMemo(() => {
    if (!data) return new Map<string, Organism>();
    return new Map(data.organisms.map((organism) => [organism.slug, organism]));
  }, [data]);

  const lineageOf = (node: TaxonNode) => {
    if (!graph) return [];
    const lineage: TaxonNode[] = [];
    let current: TaxonNode | undefined = node;
    while (current) {
      lineage.unshift(current);
      current = current.parent_slug ? graph.bySlug.get(current.parent_slug) : undefined;
    }
    return lineage;
  };

  const descendantsOf = (slug: string) => {
    if (!graph) return [];
    const out: TaxonNode[] = [];
    const walk = (current: string) => {
      (graph.children.get(current) ?? []).forEach((child) => {
        out.push(child);
        walk(child.slug);
      });
    };
    walk(slug);
    return out;
  };

  useEffect(() => {
    if (!data || !graph) return;
    setExpanded(new Set(data.nodes.filter((node) => node.default_expanded && (graph.children.get(node.slug)?.length ?? 0) > 0).map((node) => node.slug)));
  }, [data, graph]);

  useEffect(() => {
    const focus = initialFocusRef.current;
    if (!data || !graph || !focus) return;
    if (focus.type === "era") {
      const era = data.eras.find((item) => item.slug === focus.slug);
      if (era) setActiveEraSlug(era.slug);
      initialFocusRef.current = null;
      return;
    }
    const node = data.nodes.find((item) => item.organism_slug === focus.slug);
    if (node) {
      setSelectedSlug(node.slug);
      setActiveEraSlug(node.era_slug);
      setExpanded((current) => new Set([...current, ...lineageOf(node).slice(0, -1).map((item) => item.slug)]));
      void api.track("taxon", node.slug);
    }
    initialFocusRef.current = null;
    // 仅在数据首次载入时处理 URL 深链。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, graph]);

  const highlightedSlugs = useMemo(() => {
    if (!data || !graph || !activeEraSlug) return null;
    const era = data.eras.find((item) => item.slug === activeEraSlug);
    if (!era) return null;
    const matched = data.nodes.filter((node) => existsInEra(node, era));
    const set = new Set<string>();
    matched.forEach((node) => {
      lineageOf(node).forEach((ancestor) => set.add(ancestor.slug));
    });
    return set;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, graph, activeEraSlug]);

  if (!data || !graph) {
    return <div className="loading"><span className="loading-ring" /> 正在构建系统发育树</div>;
  }

  const selected = selectedSlug ? graph.bySlug.get(selectedSlug) ?? null : null;
  const activeEra = activeEraSlug ? data.eras.find((era) => era.slug === activeEraSlug) ?? null : null;
  const cladeSlugs = new Set(
    data.nodes.filter((node) => (graph.children.get(node.slug)?.length ?? 0) > 0).map((node) => node.slug)
  );

  const expandLineage = (lineage: TaxonNode[]) => {
    setExpanded((current) => new Set([...current, ...lineage.slice(0, -1).map((node) => node.slug)]));
  };

  const toggleNode = (node: TaxonNode) => {
    if (!cladeSlugs.has(node.slug)) return;
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(node.slug)) next.delete(node.slug);
      else next.add(node.slug);
      return next;
    });
  };

  const selectNode = (node: TaxonNode) => {
    setSelectedSlug(node.slug);
    expandLineage(lineageOf(node));
    setActiveEraSlug(node.era_slug);
    void api.track("taxon", node.slug);
  };

  const selectEra = (era: Era) => {
    if (activeEraSlug === era.slug) {
      setActiveEraSlug(null);
      return;
    }
    setActiveEraSlug(era.slug);
    const matched = data.nodes.filter((node) => existsInEra(node, era));
    const needExpand = new Set<string>();
    matched.forEach((node) => lineageOf(node).slice(0, -1).forEach((ancestor) => needExpand.add(ancestor.slug)));
    setExpanded((current) => new Set([...current, ...needExpand]));
    void api.track("era", era.slug);
  };

  const resetTree = () => {
    setExpanded(new Set(data.nodes.filter((node) => node.default_expanded && cladeSlugs.has(node.slug)).map((node) => node.slug)));
    setSelectedSlug(null);
    setActiveEraSlug(null);
  };

  const speciesNodes = data.nodes.filter((node) => node.kind === "species");

  return (
    <section className="phylogeny-page">
      <header className="phy-topbar">
        <div>
          <button className="back-button" onClick={() => onNavigate("")}><ArrowLeft size={16} /> 返回探索</button>
          <p className="eyebrow">INTERACTIVE PHYLOGENY · 可扩展邻接树</p>
          <h1>生命系统发育树</h1>
          <p>从最终共同祖先开始，沿细菌、真核生物、动物、脊椎动物与人类的分支逐级展开。</p>
        </div>
        <div className="phy-top-actions">
          <button onClick={() => setExpanded(new Set(cladeSlugs))}><GitBranch size={14} /> 全部展开</button>
          <button onClick={() => setExpanded(new Set())}><ChevronRight size={14} /> 全部折叠</button>
          <button onClick={resetTree}><RotateCcw size={14} /> 重置</button>
        </div>
      </header>

      <section className="phy-workspace">
        <div className="phy-tree-panel">
          <div className="phy-panel-head">
            <div>
              <span>分类节点</span>
              <strong>{data.nodes.length}</strong>
            </div>
            <div>
              <span>代表物种</span>
              <strong>{speciesNodes.length}</strong>
            </div>
            {activeEra && (
              <button className="phy-era-chip" onClick={() => setActiveEraSlug(null)}>
                <i style={{ background: activeEra.color }} /> {activeEra.name}分支高亮中 <X size={12} />
              </button>
            )}
          </div>
          <div className="phy-tree-scroll">
            <TreeNode
              node={graph.root}
              depth={0}
              graph={graph}
              expanded={expanded}
              selectedSlug={selectedSlug}
              highlightedSlugs={highlightedSlugs}
              activeEra={activeEra}
              onToggle={toggleNode}
              onSelect={selectNode}
            />
          </div>
        </div>

        <DetailCard
          node={selected}
          graph={graph}
          data={data}
          organismBySlug={organismBySlug}
          activeEraSlug={activeEraSlug}
          onClose={() => setSelectedSlug(null)}
          onSelect={selectNode}
          onToggle={toggleNode}
          onNavigate={onNavigate}
          lineageOf={lineageOf}
          descendantsOf={descendantsOf}
          expanded={expanded}
        />
      </section>

      <LinkedTimeline
        data={data}
        activeEraSlug={activeEraSlug}
        selectedSlug={selectedSlug}
        onSelectEra={selectEra}
        onSelectNode={selectNode}
      />
    </section>
  );
}

type Graph = {
  bySlug: Map<string, TaxonNode>;
  children: Map<string | null, TaxonNode[]>;
  root: TaxonNode;
};

function TreeNode({
  node,
  depth,
  graph,
  expanded,
  selectedSlug,
  highlightedSlugs,
  activeEra,
  onToggle,
  onSelect
}: {
  node: TaxonNode;
  depth: number;
  graph: Graph;
  expanded: Set<string>;
  selectedSlug: string | null;
  highlightedSlugs: Set<string> | null;
  activeEra: Era | null;
  onToggle: (node: TaxonNode) => void;
  onSelect: (node: TaxonNode) => void;
}) {
  const childNodes = graph.children.get(node.slug) ?? [];
  const hasChildren = childNodes.length > 0;
  const isOpen = expanded.has(node.slug);
  const selected = selectedSlug === node.slug;
  const dimmed = highlightedSlugs ? !highlightedSlugs.has(node.slug) : false;
  const directMatch = Boolean(activeEra && existsInEra(node, activeEra));
  const Icon = iconMap[node.icon] ?? CircleDot;

  return (
    <li className={depth === 0 ? "phy-root-node" : ""}>
      <div
        className={`phy-node-row kind-${node.kind}${selected ? " is-selected" : ""}${dimmed ? " is-dimmed" : ""}${directMatch ? " is-era-match" : ""}`}
        style={{ "--node-color": node.color, paddingLeft: 16 + depth * 20 } as React.CSSProperties}
      >
        <button
          className={`phy-disclosure${hasChildren ? "" : " is-leaf"}`}
          onClick={() => onToggle(node)}
          aria-label={isOpen ? `折叠${node.name}` : `展开${node.name}`}
          aria-expanded={hasChildren ? isOpen : undefined}
        >
          {hasChildren ? <ChevronRight size={14} className={isOpen ? "is-open" : ""} /> : <span />}
        </button>
        <button className="phy-node-main" onClick={() => onSelect(node)}>
          <span className="phy-node-icon"><Icon size={14} /></span>
          <span className="phy-node-copy">
            <strong>{node.name}</strong>
            <small>{node.rank} · {formatMya(node.divergence_mya)}</small>
          </span>
          {node.kind === "species" && <em>物种</em>}
        </button>
      </div>
      {hasChildren && isOpen && (
        <ul>
          {childNodes.map((child) => (
            <TreeNode
              key={child.slug}
              node={child}
              depth={depth + 1}
              graph={graph}
              expanded={expanded}
              selectedSlug={selectedSlug}
              highlightedSlugs={highlightedSlugs}
              activeEra={activeEra}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

function DetailCard({
  node,
  graph,
  data,
  organismBySlug,
  activeEraSlug,
  onClose,
  onSelect,
  onToggle,
  onNavigate,
  lineageOf,
  descendantsOf,
  expanded
}: {
  node: TaxonNode | null;
  graph: Graph;
  data: Phylogeny;
  organismBySlug: Map<string, Organism>;
  activeEraSlug: string | null;
  onClose: () => void;
  onSelect: (node: TaxonNode) => void;
  onToggle: (node: TaxonNode) => void;
  onNavigate: (to: string) => void;
  lineageOf: (node: TaxonNode) => TaxonNode[];
  descendantsOf: (slug: string) => TaxonNode[];
  expanded: Set<string>;
}) {
  if (!node) {
    return (
      <aside className="phy-detail is-empty">
        <div className="phy-empty-mark"><Network size={34} strokeWidth={1.2} /></div>
        <p className="eyebrow">SELECT A NODE</p>
        <h2>选择一个分支或物种</h2>
        <p>
          点击箭头展开或折叠分类节点；点击名称查看分类位置、鉴别特征和演化关系。
          也可以从下方时间轴选择地质时期，对应分支会自动高亮。
        </p>
      </aside>
    );
  }

  const Icon = iconMap[node.icon] ?? CircleDot;
  const era = data.eras.find((item) => item.slug === node.era_slug);
  const lineage = lineageOf(node);
  const children = graph.children.get(node.slug) ?? [];
  const descendants = descendantsOf(node.slug);
  const speciesCount = descendants.filter((item) => item.kind === "species").length + (node.kind === "species" ? 1 : 0);
  const organism = node.organism_slug ? organismBySlug.get(node.organism_slug) : undefined;
  const relatedSpecies = descendants.filter((item) => item.kind === "species").slice(0, 7);

  return (
    <aside className="phy-detail">
      <button className="phy-detail-close icon-button" onClick={onClose} aria-label="关闭详情"><X size={18} /></button>
      <p className="phy-detail-eyebrow"><i style={{ background: node.color }} />{node.kind === "species" ? "物种 / TIP" : "分类节点 / CLADE"} · {node.rank}</p>
      <div className="phy-detail-title">
        <span style={{ "--node-color": node.color } as React.CSSProperties}><Icon size={22} /></span>
        <div>
          <h2>{node.name}</h2>
          <small>{node.latin}</small>
        </div>
      </div>

      <nav className="phy-breadcrumb" aria-label="分类位置">
        {lineage.map((item, index) => (
          <span key={item.slug}>
            {index > 0 && <ChevronRight size={10} />}
            <button className={item.slug === node.slug ? "is-current" : ""} onClick={() => onSelect(item)}>{item.name}</button>
          </span>
        ))}
      </nav>

      <div className="phy-stats">
        <div><span>出现/分化</span><strong>{formatMya(node.divergence_mya)}</strong></div>
        <div><span>地质时期</span><strong>{era?.name ?? "未定"}</strong></div>
        <div><span>末端物种</span><strong>{speciesCount}</strong></div>
      </div>

      <section>
        <h3><Sparkles size={13} /> 主要特征</h3>
        <p>{node.traits}</p>
      </section>
      <section>
        <h3><Eye size={13} /> 类群说明</h3>
        <p>{node.description}</p>
        {organism && <p className="phy-fossil-note">时间轴化石记录：{organism.description}</p>}
      </section>
      <section>
        <h3><GitFork size={13} /> 演化关系</h3>
        <p>{node.relationships}</p>
      </section>

      {children.length > 0 && (
        <section>
          <h3><GitBranch size={13} /> 下一级分支</h3>
          <div className="phy-chip-list">
            {children.map((child) => (
              <button key={child.slug} onClick={() => onSelect(child)}>
                {child.name}
              </button>
            ))}
          </div>
        </section>
      )}

      {relatedSpecies.length > 0 && (
        <section>
          <h3><Footprints size={13} /> 分支代表物种</h3>
          <div className="phy-chip-list">
            {relatedSpecies.map((item) => <button key={item.slug} onClick={() => onSelect(item)}>{item.name}</button>)}
          </div>
        </section>
      )}

      <div className="phy-detail-actions">
        {children.length > 0 && (
          <button onClick={() => onToggle(node)}>{expanded.has(node.slug) ? "折叠此分支" : "展开此分支"}</button>
        )}
        {node.organism_slug && <button onClick={() => onNavigate(`timeline/organism/${node.organism_slug}`)}><Clock3 size={14} /> 在完整时间轴定位</button>}
        <button onClick={() => onNavigate(`timeline/era/${node.era_slug}`)}><Clock3 size={14} /> 查看{era?.name ?? "时代"}时间轴</button>
      </div>
      {activeEraSlug && activeEraSlug !== node.era_slug && <p className="phy-filter-note">当前时间轴正在高亮其他时期。</p>}
    </aside>
  );
}

function LinkedTimeline({
  data,
  activeEraSlug,
  selectedSlug,
  onSelectEra,
  onSelectNode
}: {
  data: Phylogeny;
  activeEraSlug: string | null;
  selectedSlug: string | null;
  onSelectEra: (era: Era) => void;
  onSelectNode: (node: TaxonNode) => void;
}) {
  const speciesNodes = data.nodes.filter((node) => node.kind === "species");
  const activeEra = activeEraSlug ? data.eras.find((era) => era.slug === activeEraSlug) ?? null : null;

  return (
    <footer className="phy-linked-timeline">
      <div className="phy-linked-head">
        <div>
          <p className="eyebrow">LINKED DEEP TIME</p>
          <h2>{activeEra ? `${activeEra.name} · 对应分支已高亮` : "点击时期，高亮系统发育分支"}</h2>
        </div>
        <span>压缩深时标尺 · 46 亿年 → 现在</span>
      </div>
      <div className="phy-time-track">
        {data.eras.map((era) => {
          const left = positionOf(era.start_mya);
          const right = positionOf(Math.max(era.end_mya, MIN_MYA));
          return (
            <button
              key={era.slug}
              className={`phy-time-era${activeEraSlug === era.slug ? " is-active" : ""}`}
              style={{
                left: `${left}%`,
                width: `${Math.max(right - left, 0.6)}%`,
                "--era-color": era.color
              } as React.CSSProperties}
              onClick={() => onSelectEra(era)}
              title={`${era.name}：${formatMya(era.start_mya)}—${era.end_mya === 0 ? "现在" : formatMya(era.end_mya)}`}
            >
              <span>{era.name}</span>
            </button>
          );
        })}
        <div className="phy-time-axis" />
        {speciesNodes.map((node) => {
          const selected = selectedSlug === node.slug;
          const eraMatch = activeEra ? existsInEra(node, activeEra) : false;
          return (
            <button
              key={node.slug}
              className={`phy-time-node${selected ? " is-selected" : ""}${eraMatch ? " is-era-match" : ""}`}
              style={{ left: `${positionOf(node.divergence_mya)}%`, "--node-color": node.color } as React.CSSProperties}
              onClick={() => onSelectNode(node)}
              title={`${node.name} · ${formatMya(node.divergence_mya)}`}
              aria-label={`选择物种 ${node.name}`}
            />
          );
        })}
        <div className="phy-time-boundary"><span>46亿年前</span><span>现在</span></div>
      </div>
    </footer>
  );
}

export default PhylogenyPage;
