import { ArrowLeft, Dna, Lightbulb, MapPin, MousePointerClick, Sparkles } from "lucide-react";
import type { CellDetail, CellSummary, OrganelleDetail } from "../types";
import { cellIcon } from "./cellIcons";

interface InfoPanelProps {
  cell: CellDetail;
  cells: CellSummary[];
  detail: OrganelleDetail | null;
  detailLoading: boolean;
  detailError: string | null;
  onBack: () => void;
  onGoToCell: (cellId: string, organelleId: string) => void;
}

export default function InfoPanel({ cell, cells, detail, detailLoading, detailError, onBack, onGoToCell }: InfoPanelProps) {
  if (detailLoading) {
    return (
      <aside className="info-panel" aria-busy="true">
        <div className="skeleton skeleton-title" />
        <div className="skeleton skeleton-line" />
        <div className="skeleton skeleton-line" />
        <div className="skeleton skeleton-line short" />
        <div className="skeleton skeleton-block" />
      </aside>
    );
  }

  if (detailError) {
    return (
      <aside className="info-panel">
        <button className="panel-back" onClick={onBack}><ArrowLeft size={14} /> 返回细胞介绍</button>
        <p className="panel-error">加载细胞器详情失败：{detailError}</p>
      </aside>
    );
  }

  if (detail) {
    return (
      <aside className="info-panel">
        <button className="panel-back" onClick={onBack}><ArrowLeft size={14} /> 返回{cell.name}介绍</button>
        <h2>{detail.name}</h2>
        <p className="panel-en">{detail.englishName}</p>

        <div className="panel-section">
          <h3>出现于（点击切换细胞）</h3>
          <div className="presence-row">
            {detail.presentIn.map((cellId) => {
              const target = cells.find((c) => c.id === cellId);
              if (!target) return null;
              const Icon = cellIcon(target.icon);
              const current = cellId === cell.id;
              return (
                <button
                  key={cellId}
                  className={`presence-chip ${current ? "is-current" : ""}`}
                  disabled={current}
                  onClick={() => onGoToCell(cellId, detail.id)}
                >
                  <Icon size={13} /> {target.name}
                </button>
              );
            })}
          </div>
        </div>

        <div className="panel-section">
          <h3><Dna size={15} /> 主要功能</h3>
          <p>{detail.function}</p>
        </div>
        <div className="panel-section">
          <h3><MapPin size={15} /> 分布位置</h3>
          <p>{detail.location}</p>
        </div>
        <div className="panel-section">
          <h3><Lightbulb size={15} /> 相关知识</h3>
          <ul className="fact-list">
            {detail.knowledge.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </aside>
    );
  }

  const CellIcon = cellIcon(cell.icon);
  return (
    <aside className="info-panel">
      <div className="panel-cell-head">
        <span className="panel-cell-icon"><CellIcon size={26} strokeWidth={1.6} /></span>
        <div>
          <h2>{cell.name}</h2>
          <p className="panel-en">{cell.englishName}</p>
        </div>
      </div>
      <p className="panel-desc">{cell.description}</p>

      <div className="panel-section">
        <h3><Sparkles size={15} /> 结构特点</h3>
        <ul className="fact-list">
          {cell.features.map((feature) => (
            <li key={feature}>{feature}</li>
          ))}
        </ul>
      </div>

      <div className="panel-hint">
        <MousePointerClick size={16} />
        <span>点击左侧图中的细胞器，或下方的结构列表，查看它的功能、位置和相关知识。画布支持滚轮缩放与拖拽平移。</span>
      </div>
      <p className="panel-meta">本图共 {cell.organelles.length} 个可探索结构</p>
    </aside>
  );
}
