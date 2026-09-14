import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Crosshair, Eye, Layers, Swords, X } from "lucide-react";
import { api, type EcosystemDetail, type WebNode } from "../api";
import FoodWeb from "./FoodWeb";
import { ecosystemIcon } from "./EcosystemsPage";
import {
  deriveCompetition,
  foodChains,
  neighborhood,
  type CompetitionLink,
  type GraphLink
} from "./food-web-utils";

const ROLE_LABELS: Record<string, string> = {
  producer: "生产者",
  consumer: "消费者",
  decomposer: "分解者",
  environment: "环境因素"
};

const TROPHIC_LABELS: Record<number, string> = {
  1: "第一营养级",
  2: "第二营养级（初级消费者）",
  3: "第三营养级（次级消费者）",
  4: "第四营养级（高级消费者）",
  5: "第五营养级（顶级消费者）"
};

/** 生态系统详情页：食物网 + 局部观察 + 物种 / 环境因素信息面板 */
export default function EcosystemPage({
  slug,
  onNavigate
}: {
  slug: string;
  onNavigate: (to: string) => void;
}) {
  const [detail, setDetail] = useState<EcosystemDetail | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCompetition, setShowCompetition] = useState(true);
  const [focusRoot, setFocusRoot] = useState<string | null>(null);
  const [focusDepth, setFocusDepth] = useState<1 | 2>(1);

  useEffect(() => {
    setDetail(null);
    setSelectedId(null);
    setFocusRoot(null);
    setFocusDepth(1);
    api
      .ecosystem(slug)
      .then((loaded) => {
        setDetail(loaded);
        void api.track("ecosystem", slug);
      })
      .catch(() => setError("没有找到这个生态系统"));
  }, [slug]);

  // 竞争关系不入库：从共享食物资源的捕食 / 分解关系中实时推导
  const competitionLinks = useMemo(
    () => (detail ? deriveCompetition(detail.links) : []),
    [detail]
  );

  const graphLinks: GraphLink[] = useMemo(
    () => (detail ? [...detail.links, ...(showCompetition ? competitionLinks : [])] : []),
    [detail, showCompetition, competitionLinks]
  );

  // 局部观察模式：仅保留焦点节点 N 层以内的子网络
  const visibleIds = useMemo(
    () => (detail && focusRoot ? neighborhood(graphLinks, focusRoot, focusDepth) : null),
    [detail, focusRoot, focusDepth, graphLinks]
  );

  const selected = useMemo(
    () => detail?.nodes.find((node) => node.id === selectedId) ?? null,
    [detail, selectedId]
  );

  if (error) return <div className="loading">{error}</div>;
  if (!detail) return <div className="loading"><span className="loading-ring" /> 载入生态系统</div>;

  const Icon = ecosystemIcon(detail.icon);
  const factors = detail.nodes.filter((node) => node.kind === "factor");
  const focusNode = focusRoot ? detail.nodes.find((node) => node.id === focusRoot) : null;

  return (
    <section className="eco-detail" style={{ "--eco-color": detail.color } as React.CSSProperties}>
      <header className="eco-detail-hero">
        <button className="back-button" onClick={() => onNavigate("ecosystems")}>
          <ArrowLeft size={16} /> 返回生态系统
        </button>
        <div className="eco-detail-title">
          <span className="eco-detail-icon"><Icon size={30} strokeWidth={1.4} /></span>
          <div>
            <p className="eyebrow">{detail.english_name?.toUpperCase() ?? "ECOSYSTEM"} / {detail.climate}</p>
            <h1>{detail.name}</h1>
            <p>{detail.description}</p>
          </div>
        </div>
        <div className="eco-detail-stats">
          <div><strong>{detail.species_count}</strong><span>物种</span></div>
          <div><strong>{detail.link_count}</strong><span>关系</span></div>
          <div><strong>{detail.factor_count}</strong><span>环境因素</span></div>
        </div>
      </header>

      <div className="eco-factor-strip">
        <span className="strip-label">环境因素</span>
        {factors.map((factor) => {
          const hiddenInFocus = visibleIds && !visibleIds.has(factor.id);
          return (
            <button
              key={factor.id}
              className={[
                "factor-chip",
                selectedId === factor.id ? "is-active" : "",
                hiddenInFocus ? "is-out" : ""
              ].join(" ")}
              disabled={!!hiddenInFocus}
              onClick={() => setSelectedId(selectedId === factor.id ? null : factor.id)}
              title={hiddenInFocus ? "该因素不在当前局部网络中" : factor.description}
            >
              {factor.name}
              {factor.note && <small>{factor.note}</small>}
            </button>
          );
        })}
      </div>

      {/* 图层工具栏：竞争关系开关 + 局部观察深度 */}
      <div className="web-toolbar">
        <button
          className={showCompetition ? "web-toggle is-on" : "web-toggle"}
          onClick={() => setShowCompetition((on) => !on)}
          title="竞争关系从「取食相同食物」的物种自动推导"
        >
          <Swords size={13} /> 竞争关系
          <i className="toggle-state">{showCompetition ? "显示" : "隐藏"}</i>
        </button>
        {focusRoot && (
          <div className="depth-switch" role="group" aria-label="局部网络范围">
            <Layers size={13} />
            <button className={focusDepth === 1 ? "is-active" : ""} onClick={() => setFocusDepth(1)}>1 层邻里</button>
            <button className={focusDepth === 2 ? "is-active" : ""} onClick={() => setFocusDepth(2)}>2 层邻里</button>
          </div>
        )}
      </div>

      {focusRoot && focusNode && (
        <div className="focus-banner">
          <Crosshair size={15} />
          <span>
            局部网络观察中 · 焦点：<strong>{focusNode.name}</strong>
            {visibleIds && <em>（{visibleIds.size} 个节点）</em>}
          </span>
          <button className="focus-exit" onClick={() => setFocusRoot(null)}>
            <X size={14} /> 显示完整食物网
          </button>
        </div>
      )}

      <div className={selected ? "eco-stage with-panel" : "eco-stage"}>
        <FoodWeb
          nodes={detail.nodes}
          links={graphLinks}
          accent={detail.color}
          selectedId={selectedId}
          onSelect={setSelectedId}
          visibleIds={visibleIds}
        />
        {selected && (
          <NodePanel
            node={selected}
            detail={detail}
            competitionLinks={competitionLinks}
            focused={focusRoot === selected.id}
            onSelect={setSelectedId}
            onClose={() => setSelectedId(null)}
            onFocus={(id) => {
              setFocusRoot(id);
              setFocusDepth(1);
            }}
          />
        )}
      </div>
    </section>
  );
}

/** 节点信息面板：主要食物、天敌、竞争者、能量链与全部关系 */
function NodePanel({
  node,
  detail,
  competitionLinks,
  focused,
  onSelect,
  onClose,
  onFocus
}: {
  node: WebNode;
  detail: EcosystemDetail;
  competitionLinks: CompetitionLink[];
  focused: boolean;
  onSelect: (id: string) => void;
  onClose: () => void;
  onFocus: (id: string) => void;
}) {
  const nameOf = (id: string) => detail.nodes.find((item) => item.id === id)?.name ?? id;

  const energyIn = detail.links.filter((link) => link.to === node.id && link.type === "energy");
  const energyOut = detail.links.filter((link) => link.from === node.id && link.type === "energy");
  const preyIds = energyIn.map((link) => link.from);
  const predatorIds = energyOut.map((link) => link.to);

  // 竞争者（来自推导边）及其共享的食物资源
  const competitors = competitionLinks
    .filter((link) => link.from === node.id || link.to === node.id)
    .map((link) => ({
      id: link.from === node.id ? link.to : link.from,
      shared: link.shared,
      mode: link.mode
    }));
  const predationRivals = competitors.filter((item) => item.mode === "predation");
  const decayRivals = competitors.filter((item) => item.mode === "decomposition");

  const chains = node.role === "consumer" ? foodChains(node.id, detail.links) : [];

  const decompositionIn = detail.links.filter((link) => link.to === node.id && link.type === "decomposition");
  const decompositionOut = detail.links.filter((link) => link.from === node.id && link.type === "decomposition");
  const supportIn = detail.links.filter((link) => link.to === node.id && link.type === "support");
  const supportOut = detail.links.filter((link) => link.from === node.id && link.type === "support");

  const groups: Array<{ label: string; hint: string; ids: string[] }> = [];
  if (node.role === "environment") {
    if (supportOut.length) {
      groups.push({ label: "支持的生物", hint: "环境因素 → 生物", ids: supportOut.map((link) => link.to) });
    }
  } else {
    if (decompositionIn.length) groups.push({ label: "分解对象", hint: "物质回收", ids: decompositionIn.map((link) => link.from) });
    if (decompositionOut.length) groups.push({ label: "死亡后的分解者", hint: "回归环境", ids: decompositionOut.map((link) => link.to) });
    if (supportIn.length) groups.push({ label: "依赖的环境", hint: "环境支持", ids: supportIn.map((link) => link.from) });
  }

  return (
    <aside className="node-panel">
      <button className="icon-button panel-close" aria-label="关闭" onClick={onClose}><X size={17} /></button>
      <span className={`role-badge role-${node.role}`}>{ROLE_LABELS[node.role]}</span>
      <h2>{node.name}</h2>
      {node.latin_name && <p className="latin">{node.latin_name}</p>}
      {node.kind === "species" && node.role === "consumer" && node.trophic_level != null && (
        <p className="trophic">{TROPHIC_LABELS[node.trophic_level] ?? `第 ${node.trophic_level} 营养级`}</p>
      )}
      {node.kind === "species" && node.role !== "consumer" && (
        <p className="trophic">{node.role === "producer" ? "第一营养级 · 固定太阳能" : "碎屑循环 · 分解有机物"}</p>
      )}
      {node.category && <p className="trophic">{node.category}</p>}
      <p className="node-desc">{node.description}</p>
      {node.note && <p className="node-note">{node.note}</p>}

      {node.kind === "species" && (
        <>
          {/* 主要食物（上游：能量流入） */}
          <DietSection
            kind="prey"
            title={node.role === "decomposer" ? "分解的有机对象" : "主要食物"}
            emptyText={node.role === "producer" ? "不依赖捕食——直接固定太阳能，是食物网的能量入口。" : "暂无记录的取食对象。"}
            ids={preyIds.length ? preyIds : decompositionIn.map((link) => link.from)}
            notesOf={(id) => detail.links.find((link) => link.to === node.id && link.from === id && (link.type === "energy" || link.type === "decomposition"))?.note}
            nameOf={nameOf}
            onSelect={onSelect}
          />

          {/* 天敌（下游：能量流出） */}
          <DietSection
            kind="predator"
            title={node.role === "decomposer" ? "捕食分解者的生物" : "天敌"}
            emptyText={predatorIds.length ? "" : node.role === "producer"
              ? "在该生态系统中暂无记录的取食者。"
              : "在该生态系统中没有记录到天敌，处于食物链顶端。"}
            ids={predatorIds}
            notesOf={(id) => energyOut.find((link) => link.to === id)?.note}
            nameOf={nameOf}
            onSelect={onSelect}
          />

          {/* 竞争者：共享猎物 / 共享分解对象 */}
          <div className="rel-group diet-group">
            <header>
              <span><Swords size={12} /> 竞争者</span>
              <small>{competitors.length ? `共 ${competitors.length} 种` : "无利用性竞争"}</small>
            </header>
            {predationRivals.length > 0 && (
              <div className="rival-row">
                <small>共同取食</small>
                <div>
                  {predationRivals.map((item) => (
                    <button
                      key={item.id}
                      className="competitor-chip"
                      onClick={() => onSelect(item.id)}
                      title={`与${nameOf(item.id)}共同取食：${item.shared.map(nameOf).join("、")}`}
                    >
                      {nameOf(item.id)}
                      <i>共享 {item.shared.length}</i>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {decayRivals.length > 0 && (
              <div className="rival-row">
                <small>共同分解</small>
                <div>
                  {decayRivals.map((item) => (
                    <button
                      key={item.id}
                      className="competitor-chip"
                      onClick={() => onSelect(item.id)}
                      title={`与${nameOf(item.id)}共同分解：${item.shared.map(nameOf).join("、")}`}
                    >
                      {nameOf(item.id)}
                      <i>共享 {item.shared.length}</i>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {competitors.length === 0 && (
              <p className="node-note">在该生态系统中没有以相同方式利用同一资源的其他物种。</p>
            )}
          </div>

          {/* 能量传递路径：以该物种为终点的食物链 */}
          {chains.length > 0 && (
            <div className="rel-group chain-group">
              <header><span>能量传递路径</span><small>沿捕食关系回溯</small></header>
              <ol>
                {chains.map((chain, index) => (
                  <li key={index}>
                    {chain.map((id, i) => (
                      <span key={id} className="chain-step">
                        {i > 0 && <em className="chain-arrow">→</em>}
                        {i === chain.length - 1 ? <strong>{nameOf(id)}</strong> : <button onClick={() => onSelect(id)}>{nameOf(id)}</button>}
                      </span>
                    ))}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </>
      )}

      {/* 其他关系（分解 / 环境） */}
      {groups.map((group) => (
        <div className="rel-group" key={group.label}>
          <header><span>{group.label}</span><small>{group.hint}</small></header>
          <div>
            {group.ids.map((id) => (
              <button key={id} onClick={() => onSelect(id)}>{nameOf(id)}</button>
            ))}
          </div>
        </div>
      ))}

      {/* 局部网络观察：隐藏其他节点，只看这个物种的上下游 */}
      <button className="focus-button" onClick={() => onFocus(node.id)} disabled={focused}>
        <Eye size={14} />
        {focused ? "正在观察该物种的局部网络" : "只看它所在的局部网络"}
      </button>
    </aside>
  );
}

/** 主要食物 / 天敌分区，语义色与网络图保持一致 */
function DietSection({
  kind,
  title,
  emptyText,
  ids,
  notesOf,
  nameOf,
  onSelect
}: {
  kind: "prey" | "predator";
  title: string;
  emptyText: string;
  ids: string[];
  notesOf: (id: string) => string | undefined;
  nameOf: (id: string) => string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className={`rel-group diet-group diet-${kind}`}>
      <header><span>{title}</span><small>{ids.length} 种</small></header>
      {ids.length ? (
        <div>
          {ids.map((id) => (
            <button key={id} className="diet-chip" onClick={() => onSelect(id)} title={notesOf(id)}>
              {nameOf(id)}
              {notesOf(id) && <small>{notesOf(id)}</small>}
            </button>
          ))}
        </div>
      ) : (
        <p className="node-note">{emptyText}</p>
      )}
    </div>
  );
}
