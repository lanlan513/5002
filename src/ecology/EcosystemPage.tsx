import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, X } from "lucide-react";
import { api, type EcosystemDetail, type WebNode } from "../api";
import FoodWeb from "./FoodWeb";
import { ecosystemIcon } from "./EcosystemsPage";

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

/** 生态系统详情页：网络图 + 物种 / 环境因素信息面板 */
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

  useEffect(() => {
    setDetail(null);
    setSelectedId(null);
    api
      .ecosystem(slug)
      .then((loaded) => {
        setDetail(loaded);
        void api.track("ecosystem", slug);
      })
      .catch(() => setError("没有找到这个生态系统"));
  }, [slug]);

  const selected = useMemo(
    () => detail?.nodes.find((node) => node.id === selectedId) ?? null,
    [detail, selectedId]
  );

  if (error) return <div className="loading">{error}</div>;
  if (!detail) return <div className="loading"><span className="loading-ring" /> 载入生态系统</div>;

  const Icon = ecosystemIcon(detail.icon);
  const factors = detail.nodes.filter((node) => node.kind === "factor");

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
        {factors.map((factor) => (
          <button
            key={factor.id}
            className={selectedId === factor.id ? "factor-chip is-active" : "factor-chip"}
            onClick={() => setSelectedId(selectedId === factor.id ? null : factor.id)}
            title={factor.description}
          >
            {factor.name}
            {factor.note && <small>{factor.note}</small>}
          </button>
        ))}
      </div>

      <div className={selected ? "eco-stage with-panel" : "eco-stage"}>
        <FoodWeb
          nodes={detail.nodes}
          links={detail.links}
          accent={detail.color}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
        {selected && (
          <NodePanel
            node={selected}
            detail={detail}
            onSelect={setSelectedId}
            onClose={() => setSelectedId(null)}
          />
        )}
      </div>
    </section>
  );
}

/** 节点信息面板：展示物种在生态系统中的位置与全部关系 */
function NodePanel({
  node,
  detail,
  onSelect,
  onClose
}: {
  node: WebNode;
  detail: EcosystemDetail;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const nameOf = (id: string) => detail.nodes.find((item) => item.id === id)?.name ?? id;

  const incoming = detail.links.filter((link) => link.to === node.id);
  const outgoing = detail.links.filter((link) => link.from === node.id);

  const groups: Array<{ label: string; hint: string; ids: string[] }> = [];
  if (node.role === "environment") {
    groups.push({
      label: "支持的生物",
      hint: "环境因素 → 生物",
      ids: outgoing.filter((link) => link.type === "support").map((link) => link.to)
    });
  } else {
    const eats = incoming.filter((link) => link.type === "energy").map((link) => link.from);
    const eatenBy = outgoing.filter((link) => link.type === "energy").map((link) => link.to);
    const decomposedBy = outgoing.filter((link) => link.type === "decomposition").map((link) => link.to);
    const decomposes = incoming.filter((link) => link.type === "decomposition").map((link) => link.from);
    const supportedBy = incoming.filter((link) => link.type === "support").map((link) => link.from);
    if (eats.length) groups.push({ label: "捕食 / 取食", hint: "能量流入", ids: eats });
    if (eatenBy.length) groups.push({ label: "被捕食者", hint: "能量流出", ids: eatenBy });
    if (decomposes.length) groups.push({ label: "分解对象", hint: "物质回收", ids: decomposes });
    if (decomposedBy.length) groups.push({ label: "分解者", hint: "死亡后回归", ids: decomposedBy });
    if (supportedBy.length) groups.push({ label: "依赖的环境", hint: "环境支持", ids: supportedBy });
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
      {groups.length === 0 && <p className="node-note">该节点在当前生态系统中暂无记录的关系。</p>}
    </aside>
  );
}
