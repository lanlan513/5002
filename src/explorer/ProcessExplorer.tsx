import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, MousePointerClick, Workflow } from "lucide-react";
import { api } from "../api";
import type { CellDetail, CellSummary, ProcessDetail, ProcessSummary } from "../types";
import { useProcessPlayer } from "./useProcessPlayer";
import ProcessControls from "./ProcessControls";
import ProcessPanel, { ProcessIcon, ProcessSummaryCard } from "./ProcessPanel";
import ProcessScene from "./ProcessScene";

interface ProcessExplorerProps {
  cells: CellSummary[];
  cell: CellDetail | null;
  summaries: ProcessSummary[];
  summariesLoading: boolean;
  summariesError: string | null;
  onReloadSummaries: () => void;
  /** 在结构图中查看某个细胞器（可能需要切换细胞） */
  onInspectOrganelle: (organelleId: string) => void;
  /** 切换到某种细胞并回到结构视图（当前细胞无法观察该过程时使用） */
  onSwitchCell: (cellId: string) => void;
  onTrack: (entity: string, id: string) => void;
}

export default function ProcessExplorer({
  cells,
  cell,
  summaries,
  summariesLoading,
  summariesError,
  onReloadSummaries,
  onInspectOrganelle,
  onSwitchCell,
  onTrack
}: ProcessExplorerProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ProcessDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const seqRef = useRef(0);
  const trackRef = useRef(onTrack);
  trackRef.current = onTrack;
  /* 用户是否手动选过过程（手动选择优先于“当前细胞默认过程”逻辑） */
  const manualPickRef = useRef(false);
  const prevCellIdRef = useRef<string | null>(null);

  /*
   * 默认选中逻辑（只在两种情况下生效，不会覆盖用户的手动选择）：
   * 1. 首次拿到过程列表；2. 切换了细胞类型（重新挑一个适用于新细胞的过程）。
   * 用户在同细胞内点击任何过程卡片（包括“当前细胞不适用”的）都保留该选择。
   */
  useEffect(() => {
    if (summaries.length === 0 || !cell) return;
    const cellChanged = prevCellIdRef.current !== null && prevCellIdRef.current !== cell.id;
    prevCellIdRef.current = cell.id;

    if (cellChanged) manualPickRef.current = false; // 切换细胞后恢复“按细胞默认”

    if (manualPickRef.current) return;

    const currentApplicable = activeId
      ? summaries.some((p) => p.id === activeId && p.cellIds.includes(cell.id))
      : false;
    if (currentApplicable) return;

    const first = summaries.find((p) => p.cellIds.includes(cell.id)) ?? summaries[0];
    setActiveId(first.id);
  }, [summaries, cell, activeId]);

  /** 用户手动选择过程卡片：优先级最高，不再被默认逻辑重置 */
  const selectProcess = useCallback((id: string) => {
    manualPickRef.current = true;
    setActiveId(id);
  }, []);

  const loadDetail = useCallback(async (id: string) => {
    const seq = ++seqRef.current;
    setDetailLoading(true);
    setDetailError(null);
    try {
      const data = await api.process(id);
      if (seq !== seqRef.current) return;
      setDetail(data);
      trackRef.current("process", id);
    } catch (e) {
      if (seq === seqRef.current) setDetailError((e as Error).message);
    } finally {
      if (seq === seqRef.current) setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeId) void loadDetail(activeId);
  }, [activeId, loadDetail]);

  const player = useProcessPlayer(detail);

  /* 键盘控制：空格播放/暂停，←/→ 在步骤间跳转 */
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!detail || !currentApplicableRef.current) return;
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      if (event.code === "Space") {
        event.preventDefault();
        player.toggle();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        player.prevStep();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        player.nextStep();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [detail, player]);

  const available = useMemo(
    () => (cell ? new Set(summaries.filter((p) => p.cellIds.includes(cell.id)).map((p) => p.id)) : new Set<string>()),
    [summaries, cell]
  );
  const currentApplicable = detail && cell ? detail.cellIds.includes(cell.id) : true;
  const currentApplicableRef = useRef(currentApplicable);
  currentApplicableRef.current = currentApplicable;
  const suggestedCell = detail ? cells.find((c) => detail.cellIds.includes(c.id)) : null;
  const activeOrganelleId = currentApplicable ? detail?.steps[player.scene.step]?.organelleId ?? null : null;

  return (
    <div className="explorer-layout">
      <div className="explorer-stage">
        <div className="stage-card process-stage-card">
          <div className="stage-toolbar">
            <div className="stage-title">
              <span className="stage-title-icon">
                <Workflow size={19} strokeWidth={1.8} />
              </span>
              <div>
                <strong>{detail ? `生命过程 · ${detail.name}` : "生命过程模拟"}</strong>
                <span>{detail?.englishName ?? "DYNAMIC PROCESS SIMULATION"}</span>
              </div>
            </div>
            <div className="stage-toolbar-right">
              <span className="graph-context" title="每一帧画面都由过程数据的关键帧插值驱动">
                <ProcessIcon id={detail?.icon ?? ""} size={13} /> 状态驱动动画
              </span>
            </div>
          </div>

          <div className="process-scene-wrap">
            {detail && currentApplicable && (
              <ProcessScene
                process={detail}
                scene={player.scene}
                activeOrganelleId={activeOrganelleId}
                onInspectOrganelle={onInspectOrganelle}
              />
            )}
            {detailLoading && (
              <div className="canvas-loading">
                <span className="loading-ring" />
              </div>
            )}
            {detailError && (
              <div className="relation-error">
                <p>过程数据加载失败：{detailError}</p>
                <button className="panel-action" onClick={() => void loadDetail(detail?.id ?? activeId ?? "")}>重试</button>
              </div>
            )}
            {summariesError && (
              <div className="relation-error">
                <p>生命过程列表加载失败：{summariesError}</p>
                <button className="panel-action" onClick={onReloadSummaries}>重试</button>
              </div>
            )}

            {/* 关键事件浮层：当前时刻“正在发生的生物学事件” */}
            {detail && currentApplicable && (
              <div className="event-overlay" key={player.scene.step} aria-live="polite">
                <span className="event-overlay-index">{String(player.scene.step + 1).padStart(2, "0")}</span>
                <div>
                  <strong>{detail.steps[player.scene.step].title}</strong>
                  <p>{detail.steps[player.scene.step].event}</p>
                </div>
              </div>
            )}

            {!currentApplicable && suggestedCell && (
              <div className="process-unavailable">
                <AlertTriangle size={26} />
                <p>
                  「{detail?.name}」主要在<strong>{suggestedCell.name}</strong>中观察，
                  当前视角为「{cell?.name}」。
                </p>
                <button className="panel-action" onClick={() => suggestedCell && onSwitchCell(suggestedCell.id)}>
                  切换到 {suggestedCell.name} 结构视图
                </button>
              </div>
            )}

            <div className="canvas-hint">
              <MousePointerClick size={12} /> 拖拽进度条回到任意时刻 · 点击高亮结构可在结构图中查看 · 空格播放 / 暂停
            </div>
          </div>

          {detail && currentApplicable && <ProcessControls process={detail} player={player} />}
        </div>

        {/* 过程选择 + 细胞适用性 */}
        <div className="structure-chips">
          <span className="chips-label">生命过程</span>
          {summariesLoading && <span className="chips-label">载入中…</span>}
          {summaries.map((p) => (
            <ProcessSummaryCard
              key={p.id}
              process={p}
              active={p.id === (detail?.id ?? activeId)}
              unavailable={!available.has(p.id)}
              onSelect={() => selectProcess(p.id)}
            />
          ))}
        </div>
      </div>

      {detail && currentApplicable ? (
        <ProcessPanel
          process={detail}
          scene={player.scene}
          cells={cells}
          onGotoStep={(i) => {
            player.gotoStep(i);
            onTrack("process-step", `${detail.id}:${i + 1}`);
          }}
          onViewOrganelle={onInspectOrganelle}
        />
      ) : (
        <aside className="info-panel" aria-busy="true">
          <div className="skeleton skeleton-title" />
          <div className="skeleton skeleton-line" />
          <div className="skeleton skeleton-line" />
          <div className="skeleton skeleton-block" />
        </aside>
      )}
    </div>
  );
}
