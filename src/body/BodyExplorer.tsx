import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, ArrowUpRight, ChevronRight, Layers, MousePointerClick, Network, Pause, Play, Waves } from "lucide-react";
import {
  api,
  type BodyCell,
  type BodyOrgan,
  type BodyOrganBrief,
  type BodyOverview,
  type BodyTissue,
  type OrganNetwork,
  type OrganRelationEdge,
  type Substance,
  type SystemDetail
} from "../api";
import { BodyDiagram } from "./BodyDiagram";
import { edgeKey } from "./organNetwork";

export type BodyRoute =
  | { level: "body" }
  | { level: "system"; slug: string }
  | { level: "organ"; slug: string }
  | { level: "tissue"; slug: string }
  | { level: "cell"; slug: string };

interface BodyExplorerProps {
  route: BodyRoute;
  onNavigate: (to: string) => void;
}

const levelLabels: Record<BodyRoute["level"], string> = {
  body: "人体",
  system: "系统",
  organ: "器官",
  tissue: "组织",
  cell: "细胞"
};

export function BodyExplorer({ route, onNavigate }: BodyExplorerProps) {
  const [overview, setOverview] = useState<BodyOverview | null>(null);
  const [systemDetail, setSystemDetail] = useState<SystemDetail | null>(null);
  const [organ, setOrgan] = useState<BodyOrgan | null>(null);
  const [tissue, setTissue] = useState<BodyTissue | null>(null);
  const [cell, setCell] = useState<BodyCell | null>(null);
  const [activeSystem, setActiveSystem] = useState<string | null>(null);
  const [network, setNetwork] = useState<OrganNetwork | null>(null);
  const [showNetwork, setShowNetwork] = useState(true);
  const [activePathwaySlug, setActivePathwaySlug] = useState<string | null>(null);
  const [pathwayStep, setPathwayStep] = useState(0);
  const [pathwayPlaying, setPathwayPlaying] = useState(true);

  useEffect(() => {
    api.bodyOverview().then(setOverview).catch(console.error);
    api.bodyRelations().then(setNetwork).catch(console.error);
  }, []);

  // 深链接进入时同步系统筛选
  useEffect(() => {
    if (route.level === "system") setActiveSystem(route.slug);
  }, [route]);

  // 协作路径只在人体总览层播放
  useEffect(() => {
    if (route.level !== "body") setActivePathwaySlug(null);
  }, [route.level]);

  const activePathway = useMemo(
    () => network?.pathways.find((item) => item.slug === activePathwaySlug) ?? null,
    [network, activePathwaySlug]
  );

  // 路径自动推进：每隔约 2.3 秒高亮下一段物质流动
  useEffect(() => {
    if (!activePathway || !pathwayPlaying) return;
    setPathwayStep(0);
    const timer = window.setInterval(() => {
      setPathwayStep((step) => (step + 1) % activePathway.edges.length);
    }, 2300);
    return () => window.clearInterval(timer);
  }, [activePathway, pathwayPlaying]);

  const selectPathway = (slug: string) => {
    if (slug === activePathwaySlug) {
      setActivePathwaySlug(null);
    } else {
      setActivePathwaySlug(slug);
      setPathwayStep(0);
      setPathwayPlaying(true);
    }
  };

  useEffect(() => {
    if (route.level !== "system") {
      setSystemDetail(null);
      return;
    }
    let alive = true;
    api.bodySystem(route.slug).then((data) => alive && setSystemDetail(data)).catch(console.error);
    return () => {
      alive = false;
    };
  }, [route]);

  useEffect(() => {
    if (route.level !== "organ") {
      setOrgan(null);
      return;
    }
    let alive = true;
    api.bodyOrgan(route.slug).then((data) => {
      if (!alive) return;
      setOrgan(data);
      setActiveSystem(data.system_slug);
      void api.track("organ", data.slug);
    }).catch(console.error);
    return () => {
      alive = false;
    };
  }, [route]);

  useEffect(() => {
    if (route.level !== "tissue") {
      setTissue(null);
      return;
    }
    let alive = true;
    api.bodyTissue(route.slug).then((data) => alive && setTissue(data)).catch(console.error);
    return () => {
      alive = false;
    };
  }, [route]);

  useEffect(() => {
    if (route.level !== "cell") {
      setCell(null);
      return;
    }
    let alive = true;
    api.bodyCell(route.slug).then((data) => alive && setCell(data)).catch(console.error);
    return () => {
      alive = false;
    };
  }, [route]);

  const systemColors = useMemo(() => {
    const map: Record<string, string> = {};
    overview?.systems.forEach((system) => {
      map[system.slug] = system.color;
    });
    return map;
  }, [overview]);

  const allOrgans = useMemo(
    () => overview?.systems.flatMap((system) => system.organs) ?? [],
    [overview]
  );

  if (!overview) {
    return (
      <div className="loading body-loading">
        <span className="loading-ring" /> 载入人体图谱
      </div>
    );
  }

  const currentSystem = activeSystem
    ? overview.systems.find((system) => system.slug === activeSystem) ?? null
    : null;
  const visibleOrgans = activeSystem
    ? allOrgans.filter((item) => item.system_slug === activeSystem)
    : allOrgans;

  const goOrgan = (slug: string) => onNavigate(`body/organ/${slug}`);

  const breadcrumb = (
    <nav className="body-breadcrumb" aria-label="层级导航">
      <button className={route.level === "body" ? "is-current" : ""} onClick={() => onNavigate("body")}>
        人体总览
      </button>
      {route.level !== "body" && <ChevronRight size={13} />}
      {route.level === "system" && <span className="is-current">{systemDetail?.name ?? "…"}</span>}
      {route.level === "organ" && (
        <>
          <button onClick={() => onNavigate(`body/system/${organ?.system_slug ?? ""}`)}>
            {organ?.system_name ?? "…"}
          </button>
          <ChevronRight size={13} />
          <span className="is-current">{organ?.name ?? "…"}</span>
        </>
      )}
      {route.level === "tissue" && tissue && (
        <>
          <button onClick={() => onNavigate(`body/system/${tissue.system_slug}`)}>{tissue.system_name}</button>
          <ChevronRight size={13} />
          <button onClick={() => onNavigate(`body/organ/${tissue.organ_slug}`)}>{tissue.organ_name}</button>
          <ChevronRight size={13} />
          <span className="is-current">{tissue.name}</span>
        </>
      )}
      {route.level === "cell" && cell && (
        <>
          <button onClick={() => onNavigate(`body/system/${cell.system_slug ?? ""}`)}>{cell.system_name}</button>
          <ChevronRight size={13} />
          <button onClick={() => onNavigate(`body/organ/${cell.organ_slug ?? ""}`)}>{cell.organ_name}</button>
          <ChevronRight size={13} />
          <button onClick={() => onNavigate(`body/tissue/${cell.tissue_slug}`)}>{cell.tissue_name}</button>
          <ChevronRight size={13} />
          <span className="is-current">{cell.name}</span>
        </>
      )}
    </nav>
  );

  return (
    <section className="body-lab">
      <header className="body-lab-header">
        <p className="eyebrow">HUMAN BIOLOGY MODULE / 人体生物学</p>
        <h1>从一具身体，<br />逐层进入生命的结构</h1>
        <p className="body-lab-lede">
          在人体示意图上选择器官，或先选择功能系统。沿着 <strong>系统 → 器官 → 组织 → 细胞</strong> 的层级不断深入，所有内容均来自统一的 BioLab API。
        </p>
        <div className="body-level-tags">
          {(["body", "system", "organ", "tissue", "cell"] as const).map((level, index) => (
            <span
              key={level}
              className={route.level === level ? "is-current" : ""}
              style={route.level === level ? ({ "--level-color": currentSystem?.color ?? "#9fe8c5" } as React.CSSProperties) : undefined}
            >
              <small>0{index + 1}</small>
              {levelLabels[level]}
            </span>
          ))}
        </div>
      </header>

      <div className="body-workspace">
        <aside className="body-figure-pane">
          {breadcrumb}
          <BodyDiagram
            organs={allOrgans}
            systemColors={systemColors}
            activeSystem={activeSystem}
            selectedOrgan={route.level === "organ" ? route.slug : null}
            highlightedOrgan={route.level === "tissue" ? tissue?.organ_slug : route.level === "cell" ? cell?.organ_slug : null}
            onSelect={(organItem) => goOrgan(organItem.slug)}
            network={network}
            showNetwork={showNetwork}
            focusOrgan={route.level === "organ" ? route.slug : null}
            pathway={activePathway}
            pathwayStep={pathwayStep}
          />
          <div className="body-network-toggle">
            <button
              className={showNetwork ? "is-active" : ""}
              onClick={() => setShowNetwork((value) => !value)}
              title="在人体图上叠加器官之间的物质交换网络"
            >
              <Network size={13} /> {showNetwork ? "关系网络已开启" : "开启关系网络"}
            </button>
          </div>
          <div className="body-system-filter" role="tablist" aria-label="按系统筛选">
            <button
              className={activeSystem === null ? "is-active" : ""}
              onClick={() => {
                setActiveSystem(null);
                onNavigate("body");
              }}
            >
              全部
            </button>
            {overview.systems.map((system) => (
              <button
                key={system.slug}
                className={activeSystem === system.slug ? "is-active" : ""}
                style={{ "--system-color": system.color } as React.CSSProperties}
                onClick={() => {
                  setActiveSystem(system.slug);
                  onNavigate(`body/system/${system.slug}`);
                }}
                title={system.description}
              >
                <i /> {system.short_name}
              </button>
            ))}
          </div>
        </aside>

        <div className="body-content-pane">
          {route.level === "body" && (
            <BodyOverviewPanel
              overview={overview}
              activeSystem={activeSystem}
              visibleOrgans={visibleOrgans}
              systemColors={systemColors}
              network={network}
              activePathway={activePathway}
              pathwayStep={pathwayStep}
              pathwayPlaying={pathwayPlaying}
              onTogglePlay={() => setPathwayPlaying((value) => !value)}
              onSelectPathway={selectPathway}
              onSelectSystem={(slug) => {
                setActiveSystem(slug);
                onNavigate(`body/system/${slug}`);
              }}
              onOpenOrgan={goOrgan}
            />
          )}

          {route.level === "system" &&
            (systemDetail ? (
              <SystemPanel
                system={systemDetail}
                onOpenOrgan={goOrgan}
                onOpenKnowledge={(slug) => onNavigate(`entry/${slug}`)}
              />
            ) : (
              <PanelLoading />
            ))}

          {route.level === "organ" &&
            (organ ? (
              <OrganPanel
                organ={organ}
                network={network}
                systemColors={systemColors}
                onOpenOrgan={goOrgan}
                onNavigate={onNavigate}
              />
            ) : (
              <PanelLoading />
            ))}

          {route.level === "tissue" &&
            (tissue ? (
              <TissuePanel tissue={tissue} onNavigate={onNavigate} />
            ) : (
              <PanelLoading />
            ))}

          {route.level === "cell" &&
            (cell ? <CellPanel cell={cell} onNavigate={onNavigate} /> : <PanelLoading />)}
        </div>
      </div>
    </section>
  );
}

function PanelLoading() {
  return (
    <div className="panel-loading">
      <span className="loading-ring" />
      <span>正在从 API 获取层级数据</span>
    </div>
  );
}

function BodyOverviewPanel({
  overview,
  activeSystem,
  visibleOrgans,
  systemColors,
  network,
  activePathway,
  pathwayStep,
  pathwayPlaying,
  onTogglePlay,
  onSelectPathway,
  onSelectSystem,
  onOpenOrgan
}: {
  overview: BodyOverview;
  activeSystem: string | null;
  visibleOrgans: BodyOrganBrief[];
  systemColors: Record<string, string>;
  network: OrganNetwork | null;
  activePathway: OrganNetwork["pathways"][number] | null;
  pathwayStep: number;
  pathwayPlaying: boolean;
  onTogglePlay: () => void;
  onSelectPathway: (slug: string) => void;
  onSelectSystem: (slug: string) => void;
  onOpenOrgan: (slug: string) => void;
}) {
  const organName = (slug: string) =>
    network?.nodes.find((node) => node.slug === slug)?.name ?? slug;

  return (
    <div className="panel-stack">
      <div className="panel-intro">
        <Layers size={18} />
        <div>
          <h2>{activeSystem ? "当前系统" : "六个功能系统"}</h2>
          <p>{overview.description}</p>
        </div>
      </div>

      {network && !activeSystem && (
        <SystemCouplingCard
          network={network}
          activePathway={activePathway}
          pathwayStep={pathwayStep}
          pathwayPlaying={pathwayPlaying}
          onTogglePlay={onTogglePlay}
          onSelectPathway={onSelectPathway}
          organName={organName}
          onOpenOrgan={onOpenOrgan}
        />
      )}

      <div className="system-chip-grid">
        {overview.systems.map((system) => (
          <button
            key={system.slug}
            className={`system-chip${activeSystem === system.slug ? " is-active" : ""}`}
            style={{ "--system-color": system.color } as React.CSSProperties}
            onClick={() => onSelectSystem(system.slug)}
          >
            <i />
            <strong>{system.name}</strong>
            <small>{system.organ_count} 个器官</small>
          </button>
        ))}
      </div>

      <div className="organ-index-head">
        <h3>
          <MousePointerClick size={15} /> {activeSystem ? "该系统的可点击器官" : "全部可点击器官"}
        </h3>
        <span>{visibleOrgans.length} 个标记</span>
      </div>
      <div className="organ-hotspot-list">
        {visibleOrgans.map((organItem) => (
          <button key={organItem.slug} className="organ-hotspot-row" onClick={() => onOpenOrgan(organItem.slug)}>
            <i style={{ background: systemColors[organItem.system_slug] }} />
            <strong>{organItem.name}</strong>
            <small>{organItem.position_label}</small>
            <ArrowUpRight size={15} />
          </button>
        ))}
      </div>
    </div>
  );
}

function SystemCouplingCard({
  network,
  activePathway,
  pathwayStep,
  pathwayPlaying,
  onTogglePlay,
  onSelectPathway,
  organName,
  onOpenOrgan
}: {
  network: OrganNetwork;
  activePathway: OrganNetwork["pathways"][number] | null;
  pathwayStep: number;
  pathwayPlaying: boolean;
  onTogglePlay: () => void;
  onSelectPathway: (slug: string) => void;
  organName: (slug: string) => string;
  onOpenOrgan: (slug: string) => void;
}) {
  const stepEdge = activePathway?.edges[pathwayStep] ?? null;
  const stepEdgeData = stepEdge
    ? network.edges.find((edge) => edgeKey(edge.from, edge.to) === edgeKey(stepEdge.from, stepEdge.to))
    : null;

  return (
    <div className="coupling-card">
      <div className="coupling-head">
        <span className="coupling-icon"><Waves size={15} /></span>
        <div>
          <h3>系统不是孤立器官的集合</h3>
          <p>
            {network.edges.length} 条物质交换关系把 {network.nodes.length} 个器官连成整体。选择一条“物质之旅”，在左侧人体图上观察它的流向。
          </p>
        </div>
      </div>

      <div className="substance-legend" aria-label="物质图例">
        {network.substances.map((substance) => (
          <span key={substance.slug} title={substance.description}>
            <i style={{ background: substance.color, boxShadow: `0 0 7px ${substance.color}` }} />
            {substance.name}
          </span>
        ))}
      </div>

      <div className="pathway-grid">
        {network.pathways.map((pathway) => (
          <button
            key={pathway.slug}
            className={`pathway-chip${activePathway?.slug === pathway.slug ? " is-active" : ""}`}
            onClick={() => onSelectPathway(pathway.slug)}
          >
            {pathway.name}
          </button>
        ))}
      </div>

      {activePathway && (
        <div className="pathway-stage">
          <div className="pathway-stage-head">
            <strong>{activePathway.name}</strong>
            <button className="pathway-play" onClick={onTogglePlay} title={pathwayPlaying ? "暂停" : "播放"}>
              {pathwayPlaying ? <Pause size={13} /> : <Play size={13} />}
              {pathwayPlaying ? "暂停" : "播放"}
            </button>
          </div>
          <p className="pathway-story">{activePathway.story}</p>

          <ol className="pathway-route" aria-label="流动步骤">
            {activePathway.edges.map((edge, index) => {
              const data = network.edges.find(
                (item) => edgeKey(item.from, item.to) === edgeKey(edge.from, edge.to)
              );
              const isCurrent = index === pathwayStep;
              const isPast = index < pathwayStep;
              return (
                <li key={`${edge.from}-${edge.to}-${index}`} className={isCurrent ? "is-current" : isPast ? "is-past" : ""}>
                  <button
                    className="pathway-node"
                    onClick={() => onOpenOrgan(edge.from)}
                  >
                    {organName(edge.from)}
                  </button>
                  <span className="pathway-arrow">
                    <ArrowRight size={12} />
                    <span className="pathway-dots">
                      {data?.substances.map((slug) => {
                        const meta = network.substances.find((item) => item.slug === slug);
                        return <i key={slug} style={{ background: meta?.color }} title={meta?.name} />;
                      })}
                    </span>
                  </span>
                  {index === activePathway.edges.length - 1 && (
                    <button className="pathway-node" onClick={() => onOpenOrgan(edge.to)}>
                      {organName(edge.to)}
                    </button>
                  )}
                </li>
              );
            })}
          </ol>

          {stepEdgeData && (
            <div className="pathway-caption">
              <span>
                {organName(stepEdge!.from)} → {organName(stepEdge!.to)}
              </span>
              <p>{stepEdgeData.label}</p>
              <small>
                第 {pathwayStep + 1} / {activePathway.edges.length} 段
              </small>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function OrganExchangeCard({
  organSlug,
  network,
  systemColors,
  onOpenOrgan
}: {
  organSlug: string;
  network: OrganNetwork;
  systemColors: Record<string, string>;
  onOpenOrgan: (slug: string) => void;
}) {
  const outgoing = network.edges.filter((edge) => edge.from === organSlug);
  const incoming = network.edges.filter((edge) => edge.to === organSlug);

  const renderRow = (edge: OrganRelationEdge, direction: "out" | "in") => {
    const otherSlug = direction === "out" ? edge.to : edge.from;
    const other = network.nodes.find((node) => node.slug === otherSlug);
    return (
      <button key={`${direction}-${edge.from}-${edge.to}`} className="exchange-row" onClick={() => onOpenOrgan(otherSlug)}>
        <span className="exchange-organ">
          <i style={{ background: systemColors[other?.system_slug ?? ""] ?? "#9fe8c5" }} />
          {other?.name ?? otherSlug}
        </span>
        <span className="exchange-flow">
          <span className="exchange-dots">
            {edge.substances.map((slug) => {
              const meta = network.substances.find((item) => item.slug === slug);
              return <i key={slug} style={{ background: meta?.color }} title={meta?.name} />;
            })}
          </span>
          {direction === "out" ? <ArrowUpRight size={13} className="flow-out" /> : <ArrowLeft size={13} className="flow-in" />}
        </span>
        <small>{edge.label}</small>
      </button>
    );
  };

  return (
    <div className="organ-exchange-card">
      <h3 className="level-section-title">
        与其他器官的物质交换 <small>（左侧人体图已高亮直接相关器官）</small>
      </h3>
      <p className="exchange-lede">
        器官通过循环、呼吸、神经与内分泌通道实时耦合；下方箭头表示物质相对本器官的运输方向。
      </p>

      {incoming.length > 0 && (
        <>
          <p className="exchange-direction-title">
            <ArrowLeft size={12} /> 接收
          </p>
          <div className="exchange-list">{incoming.map((edge) => renderRow(edge, "in"))}</div>
        </>
      )}

      {outgoing.length > 0 && (
        <>
          <p className="exchange-direction-title">
            <ArrowUpRight size={12} /> 输出
          </p>
          <div className="exchange-list">{outgoing.map((edge) => renderRow(edge, "out"))}</div>
        </>
      )}

      {incoming.length === 0 && outgoing.length === 0 && (
        <p className="exchange-empty">关系网络数据载入中……</p>
      )}

      <SubstanceLegendBar network={network} />
    </div>
  );
}

function SubstanceLegendBar({ network }: { network: OrganNetwork }) {
  return (
    <div className="substance-legend is-compact">
      {network.substances.map((substance: Substance) => (
        <span key={substance.slug} title={substance.description}>
          <i style={{ background: substance.color, boxShadow: `0 0 6px ${substance.color}` }} />
          {substance.name}
        </span>
      ))}
    </div>
  );
}

function SystemPanel({
  system,
  onOpenOrgan,
  onOpenKnowledge
}: {
  system: SystemDetail;
  onOpenOrgan: (slug: string) => void;
  onOpenKnowledge: (slug: string) => void;
}) {
  return (
    <div className="panel-stack" style={{ "--level-color": system.color } as React.CSSProperties}>
      <div className="level-hero system-hero">
        <span className="level-kicker">SYSTEM · 系统层级</span>
        <h2>{system.name}</h2>
        <p>{system.description}</p>
      </div>
      <p className="level-overview">{system.overview}</p>
      <div className="function-tags">
        {system.functions.map((fn) => (
          <span key={fn}>{fn}</span>
        ))}
      </div>
      <h3 className="level-section-title">包含的主要器官</h3>
      <div className="organ-cards">
        {system.organs.map((organItem) => (
          <button key={organItem.slug} className="organ-card" onClick={() => onOpenOrgan(organItem.slug)}>
            <span className="organ-card-dot" style={{ background: system.color }} />
            <strong>{organItem.name}</strong>
            <small>{organItem.position_label}</small>
            <p>{organItem.summary}</p>
            <span className="organ-card-enter">
              进入器官 <ArrowUpRight size={14} />
            </span>
          </button>
        ))}
      </div>
      {system.knowledge.length > 0 && (
        <>
          <h3 className="level-section-title">相关知识</h3>
          <div className="related-knowledge">
            {system.knowledge.map((item) => (
              <button key={item.slug} onClick={() => onOpenKnowledge(item.slug)}>
                <strong>{item.title}</strong>
                <small>{item.summary}</small>
                <ArrowUpRight size={14} />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function OrganPanel({
  organ,
  network,
  systemColors,
  onOpenOrgan,
  onNavigate
}: {
  organ: BodyOrgan;
  network: OrganNetwork | null;
  systemColors: Record<string, string>;
  onOpenOrgan: (slug: string) => void;
  onNavigate: (to: string) => void;
}) {
  return (
    <div className="panel-stack" style={{ "--level-color": organ.system_color } as React.CSSProperties}>
      <div className="level-hero">
        <span className="level-kicker">ORGAN · 器官层级 · {organ.system_name}</span>
        <h2>{organ.name}</h2>
        <p>{organ.summary}</p>
        <span className="position-pill">位于 {organ.position_label}</span>
      </div>
      <p className="level-overview">{organ.description}</p>

      {network && (
        <OrganExchangeCard
          organSlug={organ.slug}
          network={network}
          systemColors={systemColors}
          onOpenOrgan={onOpenOrgan}
        />
      )}

      <div className="fact-grid">
        <div className="fact-block">
          <h3>主要功能</h3>
          <ul>
            {organ.functions.map((fn) => (
              <li key={fn}>{fn}</li>
            ))}
          </ul>
        </div>
        <div className="fact-block">
          <h3>三个关键事实</h3>
          <ul>
            {organ.facts.map((fact) => (
              <li key={fact}>{fact}</li>
            ))}
          </ul>
        </div>
      </div>

      <h3 className="level-section-title">
        由哪些组织构成 <small>（{organ.tissues?.length ?? 0} 种 · 继续向下探索到细胞）</small>
      </h3>
      <div className="tissue-cards">
        {(organ.tissues ?? []).map((item) => (
          <button key={item.slug} className="tissue-card" onClick={() => onNavigate(`body/tissue/${item.slug}`)}>
            <strong>{item.name}</strong>
            <small className="tissue-layer">{item.layer}</small>
            <p>{item.description}</p>
            <span className="tissue-cell-count">{item.cell_count} 种细胞 <ArrowUpRight size={13} /></span>
          </button>
        ))}
      </div>

      {organ.knowledge && organ.knowledge.length > 0 && (
        <>
          <h3 className="level-section-title">相关知识</h3>
          <div className="related-knowledge">
            {organ.knowledge.map((item) => (
              <button key={item.slug} onClick={() => onNavigate(`entry/${item.slug}`)}>
                <strong>{item.title}</strong>
                <small>{item.summary}</small>
                <ArrowUpRight size={14} />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function TissuePanel({
  tissue,
  onNavigate
}: {
  tissue: BodyTissue;
  onNavigate: (to: string) => void;
}) {
  return (
    <div className="panel-stack" style={{ "--level-color": tissue.system_color } as React.CSSProperties}>
      <div className="level-hero">
        <span className="level-kicker">TISSUE · 组织层级 · {tissue.organ_name}</span>
        <h2>{tissue.name}</h2>
        <span className="position-pill">{tissue.layer}</span>
      </div>
      <p className="level-overview">{tissue.description}</p>
      <div className="function-tags">
        {tissue.functions.map((fn) => (
          <span key={fn}>{fn}</span>
        ))}
      </div>
      <h3 className="level-section-title">
        组成细胞 <small>（{tissue.cells.length} 种）</small>
      </h3>
      <div className="cell-cards">
        {tissue.cells.map((item) => (
          <button key={item.slug} className="cell-card" onClick={() => onNavigate(`body/cell/${item.slug}`)}>
            <span className="cell-glyph" />
            <strong>{item.name}</strong>
            <small>{item.morphology}</small>
            <p>{item.function}</p>
            <ArrowUpRight size={14} />
          </button>
        ))}
      </div>
    </div>
  );
}

function CellPanel({
  cell,
  onNavigate
}: {
  cell: BodyCell;
  onNavigate: (to: string) => void;
}) {
  return (
    <div className="panel-stack" style={{ "--level-color": cell.system_color ?? "#9fe8c5" } as React.CSSProperties}>
      <div className="level-hero cell-hero">
        <span className="level-kicker">CELL · 细胞层级 · 最深处</span>
        <h2>{cell.name}</h2>
        <p>{cell.function}</p>
      </div>
      <div className="cell-microscope">
        <div className="microscope-cell" />
        <div className="microscope-ring ring-a" />
        <div className="microscope-ring ring-b" />
        <span>MICROGRAPH · {cell.tissue_name}</span>
      </div>
      <dl className="cell-facts">
        <div>
          <dt>形态</dt>
          <dd>{cell.morphology}</dd>
        </div>
        <div>
          <dt>职责</dt>
          <dd>{cell.function}</dd>
        </div>
        <div>
          <dt>冷知识</dt>
          <dd>{cell.fact}</dd>
        </div>
        <div>
          <dt>所在层级路径</dt>
          <dd>
            <button className="inline-link" onClick={() => onNavigate(`body/system/${cell.system_slug ?? ""}`)}>{cell.system_name}</button>
            {" / "}
            <button className="inline-link" onClick={() => onNavigate(`body/organ/${cell.organ_slug ?? ""}`)}>{cell.organ_name}</button>
            {" / "}
            <button className="inline-link" onClick={() => onNavigate(`body/tissue/${cell.tissue_slug}`)}>{cell.tissue_name}</button>
          </dd>
        </div>
      </dl>
    </div>
  );
}
