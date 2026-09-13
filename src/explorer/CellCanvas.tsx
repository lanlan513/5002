import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, MousePointerClick, RotateCcw, Scale, Tags, ZoomIn, ZoomOut } from "lucide-react";
import type { CellDetail, ViewBox } from "../types";
import { cellIcon } from "./cellIcons";
import { Shape } from "./Shape";

interface CellCanvasProps {
  cell: CellDetail;
  selectedId: string | null;
  labelsOn: boolean;
  loading: boolean;
  onSelect: (id: string) => void;
  onToggleLabels: () => void;
  onOpenCompare: () => void;
}

interface PanState {
  active: boolean;
  captured: boolean;
  moved: boolean;
  pointerId: number;
  startX: number;
  startY: number;
  vx: number;
  vy: number;
}

const IDLE_PAN: PanState = { active: false, captured: false, moved: false, pointerId: -1, startX: 0, startY: 0, vx: 0, vy: 0 };

export default function CellCanvas({ cell, selectedId, labelsOn, loading, onSelect, onToggleLabels, onOpenCompare }: CellCanvasProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [vb, setVb] = useState<ViewBox>(cell.viewBox);
  const [grabbing, setGrabbing] = useState(false);
  const [tooltip, setTooltip] = useState<string | null>(null);
  const [tipPos, setTipPos] = useState({ x: 0, y: 0 });
  const panRef = useRef<PanState>({ ...IDLE_PAN });

  useEffect(() => {
    setVb(cell.viewBox);
    setTooltip(null);
    panRef.current = { ...IDLE_PAN };
  }, [cell]);

  const toSvg = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const point = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse());
    return { x: point.x, y: point.y };
  }, []);

  const zoomAt = useCallback(
    (factor: number, cx?: number, cy?: number) => {
      setVb((prev) => {
        const base = cell.viewBox;
        const nextW = Math.min(Math.max(prev.w / factor, base.w / 12), base.w * 1.06);
        const actual = prev.w / nextW;
        const nextH = prev.h / actual;
        const ax = cx ?? prev.x + prev.w / 2;
        const ay = cy ?? prev.y + prev.h / 2;
        return { x: ax - (ax - prev.x) / actual, y: ay - (ay - prev.y) / actual, w: nextW, h: nextH };
      });
    },
    [cell.viewBox]
  );

  const resetView = useCallback(() => setVb(cell.viewBox), [cell.viewBox]);

  /* 滚轮缩放需要非 passive 监听才能阻止页面滚动 */
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const p = toSvg(event.clientX, event.clientY);
      zoomAt(event.deltaY < 0 ? 1.18 : 1 / 1.18, p.x, p.y);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [toSvg, zoomAt]);

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    panRef.current = {
      active: true,
      captured: false,
      moved: false,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      vx: vb.x,
      vy: vb.y
    };
    setTooltip(null);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const wrap = wrapRef.current;
    if (wrap) {
      const rect = wrap.getBoundingClientRect();
      setTipPos({ x: event.clientX - rect.left, y: event.clientY - rect.top });
    }
    const pan = panRef.current;
    if (!pan.active || event.pointerId !== pan.pointerId) return;
    const dx = event.clientX - pan.startX;
    const dy = event.clientY - pan.startY;
    if (!pan.captured) {
      if (Math.hypot(dx, dy) < 5) return;
      pan.captured = true;
      pan.moved = true;
      wrap?.setPointerCapture(event.pointerId);
      setGrabbing(true);
    }
    const rect = wrap?.getBoundingClientRect();
    if (!rect || rect.width === 0) return;
    const k = vb.w / rect.width;
    setVb((prev) => ({ ...prev, x: pan.vx - dx * k, y: pan.vy - dy * k }));
  };

  const endPan = (event: React.PointerEvent<HTMLDivElement>) => {
    const pan = panRef.current;
    if (!pan.active || event.pointerId !== pan.pointerId) return;
    pan.active = false;
    if (pan.captured) {
      wrapRef.current?.releasePointerCapture(event.pointerId);
      setGrabbing(false);
    }
  };

  const handleSelect = (id: string) => {
    if (panRef.current.moved) return; // 拖拽后的抬起不算点击
    onSelect(id);
  };

  const onDoubleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const p = toSvg(event.clientX, event.clientY);
    zoomAt(1.6, p.x, p.y);
  };

  const zoomPercent = Math.round((cell.viewBox.w / vb.w) * 100);
  const CellIcon = cellIcon(cell.icon);

  return (
    <div className="stage-card">
      <div className="stage-toolbar">
        <div className="stage-title">
          <span className="stage-title-icon"><CellIcon size={19} strokeWidth={1.8} /></span>
          <div>
            <strong>{cell.name}</strong>
            <span>{cell.englishName}</span>
          </div>
        </div>
        <div className="stage-actions">
          <span className="zoom-readout">{zoomPercent}%</span>
          <button className="stage-btn" onClick={() => zoomAt(1 / 1.4)} aria-label="缩小" title="缩小"><ZoomOut size={16} /></button>
          <button className="stage-btn" onClick={() => zoomAt(1.4)} aria-label="放大" title="放大"><ZoomIn size={16} /></button>
          <button className="stage-btn" onClick={resetView} aria-label="重置视图" title="重置视图"><RotateCcw size={15} /></button>
          <button className={`stage-btn ${labelsOn ? "is-on" : ""}`} onClick={onToggleLabels} aria-label="切换标签" title="显示 / 隐藏标签"><Tags size={15} /></button>
          <button className="stage-btn" onClick={onOpenCompare} aria-label="结构对比" title="三种细胞结构对比"><Scale size={15} /></button>
        </div>
      </div>

      <div
        ref={wrapRef}
        className={`canvas-wrap ${grabbing ? "is-grabbing" : ""}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPan}
        onPointerCancel={endPan}
        onDoubleClick={onDoubleClick}
      >
        <svg
          ref={svgRef}
          className={`cell-svg ${labelsOn ? "" : "hide-labels"}`}
          viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
          role="img"
          aria-label={`${cell.name}结构示意图`}
        >
          <defs>
            <radialGradient id="cytoGrad" cx="50%" cy="42%" r="75%">
              <stop offset="0%" stopColor="#fffaf2" />
              <stop offset="100%" stopColor="#ffe4c8" />
            </radialGradient>
            <radialGradient id="nucleusGrad" cx="42%" cy="38%" r="78%">
              <stop offset="0%" stopColor="#e9dcf9" />
              <stop offset="100%" stopColor="#c9a9e6" />
            </radialGradient>
            <linearGradient id="mitoGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#ffd9c9" />
              <stop offset="100%" stopColor="#ffab91" />
            </linearGradient>
            <linearGradient id="chloroGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#c9ecb2" />
              <stop offset="100%" stopColor="#7bc47f" />
            </linearGradient>
            <radialGradient id="vacuoleGrad" cx="50%" cy="40%" r="75%">
              <stop offset="0%" stopColor="#f2fbfe" />
              <stop offset="100%" stopColor="#bfe8f5" />
            </radialGradient>
            <radialGradient id="plantCytoGrad" cx="50%" cy="45%" r="75%">
              <stop offset="0%" stopColor="#fbfbe8" />
              <stop offset="100%" stopColor="#eef3c0" />
            </radialGradient>
            <radialGradient id="prokCytoGrad" cx="50%" cy="45%" r="75%">
              <stop offset="0%" stopColor="#fff6e6" />
              <stop offset="100%" stopColor="#ffdfae" />
            </radialGradient>
          </defs>

          {cell.organelles.map((organelle) => (
            <g
              key={organelle.id}
              className={`organelle ${selectedId === organelle.id ? "is-selected" : ""}`}
              tabIndex={0}
              role="button"
              aria-label={organelle.name}
              onClick={() => handleSelect(organelle.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelect(organelle.id);
                }
              }}
              onPointerEnter={() => setTooltip(organelle.name)}
              onPointerLeave={() => setTooltip(null)}
            >
              {organelle.shapes.map((spec, index) => (
                <Shape key={index} spec={spec} />
              ))}
              {organelle.label && (
                <text className="shape-label" x={organelle.label.x} y={organelle.label.y}>
                  {organelle.name}
                </text>
              )}
            </g>
          ))}
        </svg>

        {tooltip && !loading && (
          <div className="canvas-tooltip" style={{ left: tipPos.x, top: tipPos.y }}>
            {tooltip}
          </div>
        )}
        <div className="canvas-hint">
          <MousePointerClick size={12} /> 滚轮缩放 · 拖拽平移 · 点击细胞器查看详情
        </div>
        {loading && (
          <div className="canvas-loading">
            <span className="loading-ring" />
          </div>
        )}
      </div>
    </div>
  );
}
