import { ArrowLeft, ArrowRight, Dna, Globe, Info, ListOrdered, Microscope, MousePointerClick, Package, Workflow, Zap } from "lucide-react";
import type { RelationEdgeKind, RelationGraph, RelationNodeKind, RelationSelection } from "../types";

interface RelationPanelProps {
  graph: RelationGraph;
  selection: RelationSelection | null;
  activeChainId: string | null;
  /** 当前细胞名称（用于视角提示）；为 null 表示细胞未载入 */
  currentCellName: string | null;
  /** 当前细胞含有的细胞器 id 集合；为 null 表示不做“是否存在”判断 */
  presentOrganelleIds: Set<string> | null;
  /** 某个细胞器首次出现的细胞名称 */
  cellNameOf: (organelleId: string) => string | null;
  onSelectNode: (id: string) => void;
  onSelectEdge: (id: string) => void;
  onSelectChain: (id: string | null) => void;
  onViewOrganelle: (organelleId: string) => void;
  onClear: () => void;
}

const nodeKindLabels: Record<RelationNodeKind, string> = {
  organelle: "细胞器",
  molecule: "分子",
  energy: "能量",
  environment: "环境"
};

const edgeKindLabels: Record<RelationEdgeKind, string> = {
  information: "信息流动",
  material: "物质流动",
  energy: "能量流动"
};

const edgeKindIcons: Record<RelationEdgeKind, typeof Zap> = {
  information: Dna,
  material: Package,
  energy: Zap
};

export default function RelationPanel({
  graph,
  selection,
  activeChainId,
  currentCellName,
  presentOrganelleIds,
  cellNameOf,
  onSelectNode,
  onSelectEdge,
  onSelectChain,
  onViewOrganelle,
  onClear
}: RelationPanelProps) {
  const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));
  const activeChain = graph.chains.find((chain) => chain.id === activeChainId) ?? null;

  /** 该节点是否为不存在于当前细胞的细胞器 */
  const isAbsent = (organelleId: string | undefined) =>
    organelleId !== undefined && presentOrganelleIds !== null && !presentOrganelleIds.has(organelleId);

  /* ---------- 选中节点：解释 + 相关关系（可继续探索） ---------- */
  if (selection?.type === "node") {
    const node = nodeById.get(selection.id);
    if (!node) return null;
    const absent = node.kind === "organelle" && isAbsent(node.organelleId);
    const targetCellName = node.organelleId ? cellNameOf(node.organelleId) : null;
    const relations = graph.edges
      .filter((edge) => edge.from === node.id || edge.to === node.id)
      .map((edge) => ({
        edge,
        direction: edge.from === node.id ? ("out" as const) : ("in" as const),
        other: nodeById.get(edge.from === node.id ? edge.to : edge.from)
      }))
      .filter((item) => item.other);

    return (
      <aside className="info-panel relation-panel">
        <button className="panel-back" onClick={onClear}><ArrowLeft size={14} /> 返回图谱导览</button>
        <span className={`kind-badge kind-${node.kind}`}>{nodeKindLabels[node.kind]}</span>
        <h2>{node.name}</h2>
        {node.englishName && <p className="panel-en">{node.englishName}</p>}

        <div className="panel-section">
          <p>{node.description}</p>
        </div>

        {absent && currentCellName && (
          <p className="absent-note">
            <Info size={14} /> {node.name}不存在于{currentCellName}中，此处展示它在通用图谱中的位置。
          </p>
        )}

        {node.organelleId && (
          <button className="panel-action" onClick={() => onViewOrganelle(node.organelleId!)}>
            <Microscope size={14} />
            {absent && targetCellName ? `切换到${targetCellName}查看` : "在细胞结构图中查看"}
          </button>
        )}

        <div className="panel-section">
          <h3><Workflow size={15} /> 相关关系（{relations.length}）</h3>
          <div className="relation-list">
            {relations.map(({ edge, direction, other }) => (
              <div key={edge.id} className="relation-row">
                <button
                  className="relation-node-jump"
                  onClick={() => onSelectNode(other!.id)}
                  title={`继续探索：${other!.name}`}
                >
                  {direction === "out" ? (
                    <>{node.name} <ArrowRight size={12} /> {other!.name}</>
                  ) : (
                    <>{other!.name} <ArrowRight size={12} /> {node.name}</>
                  )}
                </button>
                <button
                  className={`relation-edge-pill kind-${edge.kind}`}
                  onClick={() => onSelectEdge(edge.id)}
                  title={`查看过程：${edge.label}`}
                >
                  {edge.label}
                </button>
              </div>
            ))}
          </div>
          <p className="relation-tip">点击节点名称继续探索，点击右侧过程标签查看该过程的解释。</p>
        </div>
      </aside>
    );
  }

  /* ---------- 选中连线：过程解释 + 两端节点 ---------- */
  if (selection?.type === "edge") {
    const edge = graph.edges.find((item) => item.id === selection.id);
    if (!edge) return null;
    const from = nodeById.get(edge.from);
    const to = nodeById.get(edge.to);
    const KindIcon = edgeKindIcons[edge.kind];

    return (
      <aside className="info-panel relation-panel">
        <button className="panel-back" onClick={onClear}><ArrowLeft size={14} /> 返回图谱导览</button>
        <span className={`kind-badge kind-${edge.kind}`}><KindIcon size={12} /> {edgeKindLabels[edge.kind]}</span>
        <h2>{edge.label}</h2>
        {from && to && (
          <p className="panel-edge-route">{from.name} <ArrowRight size={13} /> {to.name}</p>
        )}

        <div className="panel-section">
          <h3>过程解释</h3>
          <p>{edge.description}</p>
        </div>

        {from && to && (
          <div className="panel-section">
            <h3>继续探索</h3>
            <div className="presence-row">
              <button className="presence-chip" onClick={() => onSelectNode(from.id)}>{from.name}</button>
              <button className="presence-chip" onClick={() => onSelectNode(to.id)}>{to.name}</button>
            </div>
          </div>
        )}
      </aside>
    );
  }

  /* ---------- 选中关系链：步骤拆解 + 播放动画提示 ---------- */
  if (activeChain) {
    const steps = activeChain.edgeIds
      .map((edgeId) => graph.edges.find((edge) => edge.id === edgeId))
      .filter((edge): edge is NonNullable<typeof edge> => Boolean(edge));

    return (
      <aside className="info-panel relation-panel">
        <button className="panel-back" onClick={() => onSelectChain(null)}><ArrowLeft size={14} /> 返回图谱导览</button>
        <span className="kind-badge kind-chain">关系链</span>
        <h2>{activeChain.name}</h2>
        <p className="panel-desc">{activeChain.summary}</p>

        <div className="panel-section">
          <h3><ListOrdered size={15} /> 过程步骤</h3>
          <div className="chain-steps-list">
            {steps.map((edge, index) => {
              const from = nodeById.get(edge.from);
              const to = nodeById.get(edge.to);
              return (
                <button key={edge.id} className="chain-step" onClick={() => onSelectEdge(edge.id)}>
                  <span className="step-num">{index + 1}</span>
                  <span className="step-route">
                    {from?.name} <ArrowRight size={12} /> {to?.name}
                  </span>
                  <span className={`relation-edge-pill kind-${edge.kind}`}>{edge.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="panel-hint">
          <MousePointerClick size={16} />
          <span>图谱中正在依次播放这条链路的流动动画；点击任意步骤可查看该过程的详细解释。</span>
        </div>
      </aside>
    );
  }

  /* ---------- 默认：图谱导览 ---------- */
  return (
    <aside className="info-panel relation-panel">
      <div className="panel-cell-head">
        <span className="panel-cell-icon"><Workflow size={24} strokeWidth={1.6} /></span>
        <div>
          <h2>功能关系图谱</h2>
          <p className="panel-en">Organelle Relations</p>
        </div>
      </div>
      <p className="panel-desc">
        细胞器不是孤立工作的：信息、物质和能量在它们之间不断流动，共同维持细胞的生命活动。
      </p>

      <div className="panel-scope">
        <Globe size={14} />
        <span>
          本图谱为<strong>跨细胞类型的通用关系图谱</strong>，内容不随细胞切换而改变。
          {currentCellName && (
            <>当前视角为<strong>{currentCellName}</strong>：图中以虚线描边标出不存在于该细胞的细胞器。</>
          )}
        </span>
      </div>

      <div className="panel-section">
        <h3>图例</h3>
        <ul className="legend-list">
          <li><span className="legend-line kind-information" /> 信息流动 · 如转录、翻译</li>
          <li><span className="legend-line kind-material" /> 物质流动 · 如囊泡运输</li>
          <li><span className="legend-line kind-energy" /> 能量流动 · 如氧化磷酸化</li>
          {presentOrganelleIds && <li><span className="legend-absent" /> 虚线描边 · 不存在于当前细胞</li>}
        </ul>
      </div>

      <div className="panel-section">
        <h3><ListOrdered size={15} /> 关系链</h3>
        <div className="chain-list">
          {graph.chains.map((chain) => (
            <button key={chain.id} className="chain-item" onClick={() => onSelectChain(chain.id)}>
              <strong>
                {chain.name}
                <span className="chain-count">{chain.edgeIds.length} 步</span>
              </strong>
              <small>{chain.summary}</small>
            </button>
          ))}
        </div>
      </div>

      <div className="panel-hint">
        <MousePointerClick size={16} />
        <span>点击节点查看它的作用与相关关系；点击连线了解该过程；选择关系链可播放物质与信息的流动动画。</span>
      </div>
      <p className="panel-meta">
        共 {graph.nodes.length} 个节点 · {graph.edges.length} 条关系 · {graph.chains.length} 条关系链
      </p>
    </aside>
  );
}
