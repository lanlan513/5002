import { useState } from "react";
import { History, Trash2 } from "lucide-react";
import type { CellSummary, LabExperiment, LabRunListItem } from "../types";
import { formatParams, formatRunTime } from "./labUtils";

interface LabLogProps {
  runs: LabRunListItem[];
  experiments: LabExperiment[];
  cells: CellSummary[];
  /** 当前正在查看的记录 id */
  activeRunId: number | null;
  onSelect: (id: number) => void;
  onClear: () => void;
}

/** 实验记录：每次运行的条件与结果都会留存，可点击回放 */
export default function LabLog({ runs, experiments, cells, activeRunId, onSelect, onClear }: LabLogProps) {
  const [confirming, setConfirming] = useState(false);

  const nameOfExperiment = (id: string) => experiments.find((e) => e.id === id)?.name ?? id;
  const nameOfCell = (id: string) => cells.find((c) => c.id === id)?.name ?? id;
  const paramsOf = (run: LabRunListItem) => {
    const experiment = experiments.find((e) => e.id === run.experimentId);
    return experiment ? formatParams(run.params, experiment.params) : "";
  };

  return (
    <div className="lab-log">
      <div className="lab-log-head">
        <span className="lab-log-title">
          <History size={14} /> 实验记录
          {runs.length > 0 && <em>{runs.length}</em>}
        </span>
        {runs.length > 0 && (
          <button
            className={`lab-log-clear ${confirming ? "is-confirm" : ""}`}
            onClick={() => {
              if (confirming) {
                onClear();
                setConfirming(false);
              } else {
                setConfirming(true);
                window.setTimeout(() => setConfirming(false), 2600);
              }
            }}
          >
            <Trash2 size={12} /> {confirming ? "确认清空？" : "清空"}
          </button>
        )}
      </div>

      {runs.length === 0 && <p className="lab-log-empty">还没有实验记录。运行的每次实验都会自动记录在这里。</p>}

      <div className="lab-log-list">
        {runs.map((run) => (
          <button
            key={run.id}
            className={`lab-log-item ${run.id === activeRunId ? "is-active" : ""}`}
            onClick={() => onSelect(run.id)}
            title="点击载入该次实验的条件与结果"
          >
            <span className="lab-log-item-top">
              <strong>
                #{run.id} {nameOfExperiment(run.experimentId)}
              </strong>
              <em className={`lab-log-status status-${run.summary.status}`}>{run.summary.statusLabel}</em>
            </span>
            <span className="lab-log-item-meta">
              {nameOfCell(run.cellId)} · {paramsOf(run)}
            </span>
            <span className="lab-log-item-time">{formatRunTime(run.createdAt)} · 教学模型</span>
          </button>
        ))}
      </div>
    </div>
  );
}
