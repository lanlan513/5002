import { Activity, AlertTriangle, BookOpen, FlaskConical, ListChecks } from "lucide-react";
import type { LabExperiment, LabResult, LabStatus } from "../types";
import { formatLabTime } from "./labUtils";

const STATUS_STYLE: Record<LabStatus, { className: string; label: string }> = {
  normal: { className: "status-normal", label: "正常" },
  active: { className: "status-active", label: "活跃" },
  stressed: { className: "status-stressed", label: "受胁迫" },
  damaged: { className: "status-damaged", label: "受损" }
};

interface LabPanelProps {
  experiment: LabExperiment;
  result: LabResult | null;
  /** 当前虚拟时间 */
  time: number;
  disclaimer: string;
  /** 实验记录列表（渲染在知识点与声明之间） */
  children?: React.ReactNode;
}

/** 实验室右侧栏：状态解读 / 实验事件 / 探究问题与知识点 / 实验记录 / 教学模型声明 */
export default function LabPanel({ experiment, result, time, disclaimer, children }: LabPanelProps) {
  const summary = result?.summary ?? null;
  const statusStyle = summary ? STATUS_STYLE[summary.status] : null;

  /* 当前时间之前最近发生的一个事件（高亮为“正在发生”） */
  const currentEventIndex = result
    ? result.events.reduce((acc, event, i) => (event.time <= time + 0.001 ? i : acc), -1)
    : -1;

  return (
    <aside className="info-panel lab-panel">
      <p className="panel-en">{experiment.englishName}</p>
      <h2>{experiment.name}</h2>
      <p className="panel-desc">{experiment.summary}</p>

      {/* 结果状态与解读 */}
      <div className="panel-section">
        <h3>
          <Activity size={15} /> 结果解读
        </h3>
        {summary && statusStyle ? (
          <>
            <span className={`lab-status ${statusStyle.className}`}>
              <i /> {summary.statusLabel}
            </span>
            <ul className="fact-list lab-findings">
              {summary.findings.map((finding) => (
                <li key={finding}>{finding}</li>
              ))}
            </ul>
          </>
        ) : (
          <p className="lab-empty-tip">设置环境条件后点击「运行实验」，此处将显示细胞状态解读。</p>
        )}
      </div>

      {/* 实验事件流 */}
      {result && (
        <div className="panel-section">
          <h3>
            <ListChecks size={15} /> 实验事件
          </h3>
          <div className="lab-event-list">
            {result.events.map((event, i) => (
              <div
                key={`${event.time}-${event.text}`}
                className={`lab-event ${i < currentEventIndex ? "is-past" : ""} ${i === currentEventIndex ? "is-current" : ""}`}
              >
                <span className="lab-event-time">{formatLabTime(event.time, experiment.timeUnit)}</span>
                <span className="lab-event-text">{event.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 探究问题与知识点 */}
      <div className="panel-section">
        <h3>
          <BookOpen size={15} /> 探究问题
        </h3>
        <p>{experiment.question}</p>
        <ul className="fact-list">
          {experiment.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      </div>

      {children}

      {/* 教学模型声明（常驻） */}
      <div className="lab-disclaimer">
        <AlertTriangle size={14} />
        <p>
          <strong>教学模型声明</strong>
          {disclaimer}
        </p>
      </div>
      <p className="panel-meta">
        <FlaskConical size={11} /> 所有数值由简化模型实时计算，非真实实验测量
      </p>
    </aside>
  );
}
