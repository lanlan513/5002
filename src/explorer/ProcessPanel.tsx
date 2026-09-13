import { Activity, ArrowRight, ChevronRight, MapPin, Microscope, Radio } from "lucide-react";
import type { ProcessDetail, ProcessSummary } from "../types";
import { formatMetricValue, type SceneState } from "./processEngine";
import { cellIcon } from "./cellIcons";
import type { CellSummary } from "../types";

interface ProcessPanelProps {
  process: ProcessDetail;
  scene: SceneState;
  cells: CellSummary[];
  onGotoStep: (index: number) => void;
  onViewOrganelle: (organelleId: string) => void;
}

export default function ProcessPanel({ process, scene, cells, onGotoStep, onViewOrganelle }: ProcessPanelProps) {
  const step = process.steps[scene.step];
  const currentOrganelleName = (organelleId: string) =>
    cells
      .flatMap((c) => c.organelles)
      .find((o) => o.id === organelleId)?.name ?? "该结构";

  return (
    <aside className="info-panel process-panel">
      <p className="panel-en">{process.englishName}</p>
      <h2>{process.name}</h2>
      <p className="panel-desc">{process.summary}</p>

      {/* 当前生物学事件：随插值状态实时切换 */}
      <div className="event-banner" key={scene.step}>
        <div className="event-banner-head">
          <span className="event-live"><Radio size={12} /> 正在发生</span>
          <span className="event-step-no">
            步骤 {scene.step + 1} / {process.steps.length} · {step.title}
          </span>
        </div>
        <p className="event-text">{step.event}</p>
      </div>

      {/* 实时数据状态（由关键帧插值驱动，不是装饰数字） */}
      <div className="panel-section">
        <h3><Activity size={15} /> 当前数据状态</h3>
        <div className="metric-grid">
          {process.metrics.map((metric, i) => {
            const value = scene.metrics[i];
            const percent = metric.kind === "percent" ? Number(value) : null;
            return (
              <div className="metric-card" key={metric.id}>
                <span className="metric-label">{metric.label}</span>
                <strong className="metric-value">{formatMetricValue(metric, value)}</strong>
                {percent !== null && (
                  <span className="metric-bar">
                    <span className="metric-bar-fill" style={{ width: `${Math.min(100, Math.max(0, percent))}%` }} />
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 当前步骤详解 */}
      <div className="panel-section">
        <h3><Microscope size={15} /> 阶段解释</h3>
        <p>{step.description}</p>
        <ul className="fact-list">
          {step.highlights.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <button className="panel-action" onClick={() => onViewOrganelle(step.organelleId)}>
          <MapPin size={14} /> 在结构图中查看「{currentOrganelleName(step.organelleId)}」
        </button>
      </div>

      {/* 步骤导航：点击回到任意阶段重新观察 */}
      <div className="panel-section">
        <h3><ChevronRight size={15} /> 阶段导航</h3>
        <div className="process-step-nav">
          {process.steps.map((s, i) => (
            <button
              key={s.title}
              className={`step-nav-item ${i === scene.step ? "is-current" : ""} ${i < scene.step ? "is-past" : ""}`}
              onClick={() => onGotoStep(i)}
              aria-current={i === scene.step}
            >
              <span className="step-nav-num">{i + 1}</span>
              <span className="step-nav-text">
                <strong>{s.title}</strong>
                <small>{s.event}</small>
              </span>
              <ArrowRight size={13} className="step-nav-arrow" />
            </button>
          ))}
        </div>
      </div>

      <p className="panel-meta">
        可在细胞中观察：
        {process.cellIds
          .map((id) => cells.find((c) => c.id === id))
          .filter(Boolean)
          .map((c) => {
            const Icon = cellIcon((c as CellSummary).icon);
            return (
              <span key={(c as CellSummary).id} className="process-cell-tag">
                <Icon size={11} /> {(c as CellSummary).name}
              </span>
            );
          })}
      </p>
    </aside>
  );
}

export function ProcessSummaryCard({
  process,
  active,
  unavailable,
  onSelect
}: {
  process: ProcessSummary;
  active: boolean;
  unavailable: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      className={`process-pick ${active ? "is-active" : ""} ${unavailable ? "is-unavailable" : ""}`}
      onClick={onSelect}
      title={unavailable ? `该过程主要在动物细胞中观察，点击查看说明` : process.summary}
    >
      <span className="process-pick-top">
        <ProcessIcon id={process.icon} />
        <strong>{process.name}</strong>
      </span>
      <small>{unavailable ? "当前细胞不适用" : `${process.stepCount} 个关键步骤`}</small>
    </button>
  );
}

export function ProcessIcon({ id, size = 15 }: { id: string; size?: number }) {
  if (id === "protein") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="7" cy="8" r="2.6" />
        <circle cx="14" cy="12" r="2.6" />
        <circle cx="9" cy="17" r="2.6" />
        <path d="M9 9.5 12 10M13 14.5 11 15" strokeLinecap="round" />
      </svg>
    );
  }
  if (id === "transport") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4 12h11M12 7l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M18 5v14" strokeLinecap="round" strokeDasharray="2 2" />
      </svg>
    );
  }
  // 默认：细胞分裂（一个圆裂成两个）
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M11 5.5C7 5 4 8 4 12s3 7 7 6.5M13 5.5c4-.5 7 2.5 7 6.5s-3 7-7 6.5" strokeLinecap="round" />
      <path d="M12 4v16" strokeLinecap="round" strokeDasharray="2 2" />
    </svg>
  );
}
