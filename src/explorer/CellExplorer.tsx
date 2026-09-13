import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Microscope, Workflow } from "lucide-react";
import { api } from "../api";
import type { CellDetail, CellSummary, OrganelleDetail, RelationGraph as RelationGraphData, RelationSelection } from "../types";
import CellCanvas from "./CellCanvas";
import CompareModal from "./CompareModal";
import InfoPanel from "./InfoPanel";
import RelationGraph from "./RelationGraph";
import RelationPanel from "./RelationPanel";
import { cellIcon } from "./cellIcons";

type ExplorerView = "structure" | "relations";

export default function CellExplorer({ onNavigate }: { onNavigate: (to: string) => void }) {
  const [cells, setCells] = useState<CellSummary[]>([]);
  const [cell, setCell] = useState<CellDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<OrganelleDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [labelsOn, setLabelsOn] = useState(true);
  const [compareOpen, setCompareOpen] = useState(false);

  /* ---------- 功能关系图谱 ---------- */
  const [view, setView] = useState<ExplorerView>("structure");
  const [graph, setGraph] = useState<RelationGraphData | null>(null);
  const [graphLoading, setGraphLoading] = useState(false);
  const [graphError, setGraphError] = useState<string | null>(null);
  const [relSelection, setRelSelection] = useState<RelationSelection | null>(null);
  const [activeChainId, setActiveChainId] = useState<string | null>(null);

  const cellSeq = useRef(0);
  const detailSeq = useRef(0);
  const cellRef = useRef<CellDetail | null>(null);
  const graphRequested = useRef(false);

  const loadCell = useCallback(async (id: string) => {
    const seq = ++cellSeq.current;
    setLoading(true);
    setError(null);
    try {
      const data = await api.cell(id);
      if (seq !== cellSeq.current) return;
      cellRef.current = data;
      setCell(data);
      setSelectedId(null);
      setDetail(null);
      setDetailError(null);
      void api.track("cell", id);
    } catch (e) {
      if (seq === cellSeq.current) setError((e as Error).message);
    } finally {
      if (seq === cellSeq.current) setLoading(false);
    }
  }, []);

  const selectOrganelle = useCallback(async (id: string) => {
    if (!cellRef.current?.organelles.some((o) => o.id === id)) return;
    const seq = ++detailSeq.current;
    setSelectedId(id);
    setDetail(null);
    setDetailError(null);
    setDetailLoading(true);
    try {
      const data = await api.organelle(id);
      if (seq !== detailSeq.current) return;
      setDetail(data);
      void api.track("organelle", id);
    } catch (e) {
      if (seq === detailSeq.current) setDetailError((e as Error).message);
    } finally {
      if (seq === detailSeq.current) setDetailLoading(false);
    }
  }, []);

  /** 切换到另一种细胞并选中某个结构（用于“出现于”芯片跳转） */
  const goToCell = useCallback(
    async (cellId: string, organelleId?: string) => {
      await loadCell(cellId);
      if (organelleId) void selectOrganelle(organelleId);
    },
    [loadCell, selectOrganelle]
  );

  /** 关系图谱数据只需加载一次，失败时允许重试 */
  const loadGraph = useCallback(async () => {
    if (graphRequested.current) return;
    graphRequested.current = true;
    setGraphLoading(true);
    setGraphError(null);
    try {
      const data = await api.relations();
      setGraph(data);
    } catch (e) {
      graphRequested.current = false;
      setGraphError((e as Error).message);
    } finally {
      setGraphLoading(false);
    }
  }, []);

  const switchView = useCallback(
    (next: ExplorerView) => {
      setView(next);
      if (next === "relations") void loadGraph();
    },
    [loadGraph]
  );

  /** 从细胞器详情等入口跳进图谱，并选中某个节点或某条关系 */
  const exploreRelation = useCallback(
    (selection: RelationSelection) => {
      switchView("relations");
      setActiveChainId(null);
      setRelSelection(selection);
      void api.track("relation", selection.id);
    },
    [switchView]
  );

  /** 图谱中点击节点 / 连线（再次点击取消选中） */
  const toggleRelation = useCallback((selection: RelationSelection) => {
    setRelSelection((prev) => (prev?.type === selection.type && prev.id === selection.id ? null : selection));
    setActiveChainId(null);
  }, []);

  const selectChain = useCallback((id: string | null) => {
    setActiveChainId(id);
    if (id) {
      setRelSelection(null);
      void api.track("relation-chain", id);
    }
  }, []);

  /** 从图谱节点跳回细胞结构图：优先当前细胞，否则切到含有该细胞器的细胞 */
  const viewOrganelle = useCallback(
    (organelleId: string) => {
      setView("structure");
      if (cellRef.current?.organelles.some((o) => o.id === organelleId)) {
        void selectOrganelle(organelleId);
        return;
      }
      const target = cells.find((item) => item.organelles.some((o) => o.id === organelleId));
      if (target) void goToCell(target.id, organelleId);
    },
    [cells, goToCell, selectOrganelle]
  );

  useEffect(() => {
    let cancelled = false;
    api
      .cellTypes()
      .then(({ cells: list }) => {
        if (cancelled) return;
        setCells(list);
        if (list.length > 0) void loadCell(list[0].id);
        else setLoading(false);
      })
      .catch((e: Error) => {
        if (!cancelled) {
          setError(e.message);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [loadCell]);

  useEffect(() => {
    if (!cell) return;
    const previous = document.title;
    document.title = `${cell.name} · 细胞探索器 | BioLab`;
    return () => {
      document.title = previous;
    };
  }, [cell]);

  const clearSelection = useCallback(() => {
    setSelectedId(null);
    setDetail(null);
    setDetailError(null);
    detailSeq.current += 1;
  }, []);

  return (
    <section className="explorer-page">
      <div className="explorer-topbar">
        <button className="back-button" onClick={() => onNavigate("")}>
          <ArrowLeft size={15} /> 返回探索
        </button>
        <h1>细胞探索器</h1>
        <div className="view-toggle" role="tablist" aria-label="切换探索视图">
          <button
            role="tab"
            aria-selected={view === "structure"}
            className={`view-toggle-btn ${view === "structure" ? "is-active" : ""}`}
            onClick={() => switchView("structure")}
          >
            <Microscope size={14} /> 细胞结构
          </button>
          <button
            role="tab"
            aria-selected={view === "relations"}
            className={`view-toggle-btn ${view === "relations" ? "is-active" : ""}`}
            onClick={() => switchView("relations")}
          >
            <Workflow size={14} /> 功能关系
          </button>
        </div>
        <div className="cell-tabs" role="tablist" aria-label="选择细胞类型">
          {cells.map((item) => {
            const Icon = cellIcon(item.icon);
            const active = cell?.id === item.id;
            return (
              <button
                key={item.id}
                role="tab"
                aria-selected={active}
                className={`cell-tab ${active ? "is-active" : ""}`}
                onClick={() => void loadCell(item.id)}
              >
                <span className="tab-icon"><Icon size={17} strokeWidth={1.8} /></span>
                <span className="tab-text">
                  <strong>{item.name}</strong>
                  <small>{item.englishName}</small>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {error && <p className="explorer-error">加载失败：{error}。请确认后端 API 已启动。</p>}

      {view === "structure" && cell && (
        <div className="explorer-layout">
          <div className="explorer-stage">
            <CellCanvas
              cell={cell}
              selectedId={selectedId}
              labelsOn={labelsOn}
              loading={loading}
              onSelect={(id) => void selectOrganelle(id)}
              onToggleLabels={() => setLabelsOn((on) => !on)}
              onOpenCompare={() => setCompareOpen(true)}
            />
            <div className="structure-chips">
              <span className="chips-label">结构列表</span>
              {cell.organelles.map((organelle) => (
                <button
                  key={organelle.id}
                  className={`structure-chip ${selectedId === organelle.id ? "is-active" : ""}`}
                  onClick={() => void selectOrganelle(organelle.id)}
                >
                  {organelle.name}
                </button>
              ))}
            </div>
          </div>

          <InfoPanel
            cell={cell}
            cells={cells}
            detail={detail}
            detailLoading={detailLoading}
            detailError={detailError}
            onBack={clearSelection}
            onGoToCell={(cellId, organelleId) => void goToCell(cellId, organelleId)}
            onExploreRelation={(edgeId) => exploreRelation({ type: "edge", id: edgeId })}
          />
        </div>
      )}

      {view === "relations" && (
        <div className="explorer-layout">
          <div className="explorer-stage">
            <div className="stage-card relation-stage">
              <div className="stage-toolbar">
                <div className="stage-title">
                  <span className="stage-title-icon"><Workflow size={19} strokeWidth={1.8} /></span>
                  <div>
                    <strong>功能关系图谱</strong>
                    <span>Organelle Relations</span>
                  </div>
                </div>
                <div className="edge-legend" aria-hidden="true">
                  <span className="edge-legend-item"><span className="legend-line kind-information" /> 信息</span>
                  <span className="edge-legend-item"><span className="legend-line kind-material" /> 物质</span>
                  <span className="edge-legend-item"><span className="legend-line kind-energy" /> 能量</span>
                </div>
              </div>
              <div className="relation-canvas-wrap">
                {graph && (
                  <RelationGraph
                    graph={graph}
                    selection={relSelection}
                    activeChainId={activeChainId}
                    onSelectNode={(id) => toggleRelation({ type: "node", id })}
                    onSelectEdge={(id) => toggleRelation({ type: "edge", id })}
                  />
                )}
                {graphLoading && (
                  <div className="canvas-loading">
                    <span className="loading-ring" />
                  </div>
                )}
                {graphError && (
                  <div className="relation-error">
                    <p>加载关系图谱失败：{graphError}</p>
                    <button className="panel-action" onClick={() => void loadGraph()}>重试</button>
                  </div>
                )}
                {graph && (
                  <div className="canvas-hint">
                    <Microscope size={12} /> 点击节点查看解释 · 点击连线了解过程 · 选择下方关系链播放流动动画
                  </div>
                )}
              </div>
            </div>
            <div className="structure-chips">
              <span className="chips-label">关系链</span>
              <button
                className={`structure-chip ${activeChainId === null ? "is-active" : ""}`}
                onClick={() => selectChain(null)}
              >
                全部关系
              </button>
              {graph?.chains.map((chain) => (
                <button
                  key={chain.id}
                  className={`structure-chip ${activeChainId === chain.id ? "is-active" : ""}`}
                  onClick={() => selectChain(chain.id)}
                >
                  {chain.name}
                </button>
              ))}
            </div>
          </div>

          {graph ? (
            <RelationPanel
              graph={graph}
              selection={relSelection}
              activeChainId={activeChainId}
              onSelectNode={(id) => toggleRelation({ type: "node", id })}
              onSelectEdge={(id) => toggleRelation({ type: "edge", id })}
              onSelectChain={selectChain}
              onViewOrganelle={viewOrganelle}
              onClear={() => {
                setRelSelection(null);
                setActiveChainId(null);
              }}
            />
          ) : (
            <aside className="info-panel" aria-busy="true">
              <div className="skeleton skeleton-title" />
              <div className="skeleton skeleton-line" />
              <div className="skeleton skeleton-line" />
              <div className="skeleton skeleton-line short" />
              <div className="skeleton skeleton-block" />
            </aside>
          )}
        </div>
      )}

      {!cell && loading && view === "structure" && (
        <div className="loading">
          <span className="loading-ring" /> 载入细胞数据
        </div>
      )}

      <CompareModal cells={cells} open={compareOpen} onClose={() => setCompareOpen(false)} />
    </section>
  );
}
