import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { api } from "../api";
import type { CellDetail, CellSummary, OrganelleDetail } from "../types";
import CellCanvas from "./CellCanvas";
import CompareModal from "./CompareModal";
import InfoPanel from "./InfoPanel";
import { cellIcon } from "./cellIcons";

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

  const cellSeq = useRef(0);
  const detailSeq = useRef(0);
  const cellRef = useRef<CellDetail | null>(null);

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
      <div className="explorer-head">
        <button className="back-button" onClick={() => onNavigate("")}>
          <ArrowLeft size={16} /> 返回探索
        </button>
        <p className="eyebrow">CELL EXPLORER</p>
        <h1>细胞探索器</h1>
        <p className="explorer-lede">
          缩放、拖拽、点击 —— 在可交互的结构图中观察动物细胞、植物细胞与原核细胞，直观比较它们在结构上的异同。
        </p>
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
              <span className="tab-icon"><Icon size={18} strokeWidth={1.8} /></span>
              <span className="tab-text">
                <strong>{item.name}</strong>
                <small>{item.englishName}</small>
              </span>
            </button>
          );
        })}
      </div>

      {error && <p className="explorer-error">加载失败：{error}。请确认后端 API 已启动。</p>}

      {cell && (
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
          />
        </div>
      )}

      {!cell && loading && (
        <div className="loading">
          <span className="loading-ring" /> 载入细胞数据
        </div>
      )}

      <CompareModal cells={cells} open={compareOpen} onClose={() => setCompareOpen(false)} />
    </section>
  );
}
