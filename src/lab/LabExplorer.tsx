import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Droplets,
  FlaskConical,
  Pause,
  Play,
  RotateCcw,
  Sun,
  Thermometer
} from "lucide-react";
import { api } from "../api";
import type { CellDetail, CellSummary, LabExperiment, LabRun, LabRunListItem } from "../types";
import LabChart from "./LabChart";
import LabLog from "./LabLog";
import LabPanel from "./LabPanel";
import LabScene from "./LabScene";
import { formatLabTime, sampleAll } from "./labUtils";
import { useLabPlayer } from "./useLabPlayer";

const LAB_ICONS: Record<string, typeof Droplets> = {
  droplets: Droplets,
  thermometer: Thermometer,
  sun: Sun
};

export const LabIcon = ({ id, size = 15 }: { id: string; size?: number }) => {
  const Icon = LAB_ICONS[id] ?? FlaskConical;
  return <Icon size={size} strokeWidth={1.8} />;
};

interface LabExplorerProps {
  cells: CellSummary[];
  cell: CellDetail | null;
  /** 切换到某种细胞并回到结构视图之外（当前细胞不适用某实验时使用） */
  onSwitchCell: (cellId: string) => void;
  onTrack: (entity: string, id: string) => void;
}

export default function LabExplorer({ cells, cell, onSwitchCell, onTrack }: LabExplorerProps) {
  const [experiments, setExperiments] = useState<LabExperiment[]>([]);
  const [disclaimer, setDisclaimer] = useState("");
  const [listError, setListError] = useState<string | null>(null);

  const [activeExpId, setActiveExpId] = useState<string | null>(null);
  const [params, setParams] = useState<Record<string, number>>({});
  const [currentRun, setCurrentRun] = useState<LabRun | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const [runs, setRuns] = useState<LabRunListItem[]>([]);

  const manualPickRef = useRef(false);
  const prevCellIdRef = useRef<string | null>(null);
  const runSeqRef = useRef(0);

  const experiment = useMemo(
    () => experiments.find((e) => e.id === activeExpId) ?? null,
    [experiments, activeExpId]
  );
  const applicable = experiment && cell ? experiment.cellIds.includes(cell.id) : false;
  const suggestedCell = experiment ? cells.find((c) => experiment.cellIds.includes(c.id)) : null;

  /* 播放时钟：时长取当前运行的实验定义 */
  const runExperiment = useMemo(
    () => (currentRun ? experiments.find((e) => e.id === currentRun.experimentId) ?? null : null),
    [currentRun, experiments]
  );
  const player = useLabPlayer(runExperiment?.duration ?? 0);

  /* ---------- 数据加载 ---------- */

  const loadRuns = useCallback(async () => {
    try {
      const data = await api.labRuns();
      setRuns(data.runs);
    } catch {
      /* 记录列表失败不阻塞主流程 */
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    api
      .labExperiments()
      .then((data) => {
        if (cancelled) return;
        setExperiments(data.experiments);
        setDisclaimer(data.disclaimer);
      })
      .catch((e: Error) => {
        if (!cancelled) setListError(e.message);
      });
    void loadRuns();
    return () => {
      cancelled = true;
    };
  }, [loadRuns]);

  /* ---------- 默认实验选择（与 ProcessExplorer 同一套规则） ---------- */
  useEffect(() => {
    if (experiments.length === 0 || !cell) return;
    const cellChanged = prevCellIdRef.current !== null && prevCellIdRef.current !== cell.id;
    prevCellIdRef.current = cell.id;
    if (cellChanged) manualPickRef.current = false;
    if (manualPickRef.current) return;

    const currentApplicable = activeExpId
      ? experiments.some((e) => e.id === activeExpId && e.cellIds.includes(cell.id))
      : false;
    if (currentApplicable) return;
    const first = experiments.find((e) => e.cellIds.includes(cell.id)) ?? experiments[0];
    setActiveExpId(first.id);
  }, [experiments, cell, activeExpId]);

  /* 切换实验：重置条件为默认值、清空当前结果 */
  useEffect(() => {
    if (!experiment) return;
    setParams(Object.fromEntries(experiment.params.map((p) => [p.id, p.defaultValue])));
    setCurrentRun(null);
    setRunError(null);
  }, [experiment]);

  /* 新结果载入后自动从头播放 */
  const currentRunId = currentRun?.id ?? null;
  useEffect(() => {
    if (currentRunId !== null) player.restart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentRunId]);

  /* 空格播放 / 暂停 */
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!currentRun) return;
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      if (event.code === "Space") {
        event.preventDefault();
        player.toggle();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentRun !== null, player]);

  /* ---------- 操作 ---------- */

  const selectExperiment = useCallback((id: string) => {
    manualPickRef.current = true;
    setActiveExpId(id);
  }, []);

  const runExperimentNow = useCallback(async () => {
    if (!experiment || !cell || !applicable || running) return;
    const seq = ++runSeqRef.current;
    setRunning(true);
    setRunError(null);
    try {
      const run = await api.labRun(experiment.id, cell.id, params);
      if (seq !== runSeqRef.current) return;
      setCurrentRun(run);
      onTrack("lab-run", `${experiment.id}:${cell.id}`);
      void loadRuns();
    } catch (e) {
      if (seq === runSeqRef.current) setRunError((e as Error).message);
    } finally {
      if (seq === runSeqRef.current) setRunning(false);
    }
  }, [experiment, cell, applicable, running, params, onTrack, loadRuns]);

  const resetParams = useCallback(() => {
    if (!experiment) return;
    setParams(Object.fromEntries(experiment.params.map((p) => [p.id, p.defaultValue])));
  }, [experiment]);

  /** 载入一条历史记录：切换实验、还原条件、回放结果 */
  const openRun = useCallback(
    async (id: number) => {
      try {
        const run = await api.labRunDetail(id);
        manualPickRef.current = true;
        setActiveExpId(run.experimentId);
        /* setActiveExpId 会触发参数重置，因此参数与结果在下一拍再写入 */
        window.setTimeout(() => {
          setParams(run.params);
          setCurrentRun(run);
        }, 0);
        onTrack("lab-replay", String(id));
      } catch (e) {
        setRunError((e as Error).message);
      }
    },
    [onTrack]
  );

  const clearRuns = useCallback(async () => {
    await api.labClearRuns();
    setRuns([]);
  }, []);

  /* ---------- 派生显示状态 ---------- */

  const values = currentRun && runExperiment ? sampleAll(currentRun.result, player.time) : null;
  const sceneCellId = currentRun?.cellId ?? cell?.id ?? "animal";
  const sceneCellName = cells.find((c) => c.id === sceneCellId)?.name ?? sceneCellId;
  const sceneParams = currentRun?.params ?? params;
  const result = currentRun?.result ?? null;

  return (
    <div className="explorer-layout">
      <div className="explorer-stage">
        <div className="stage-card lab-stage-card">
          <div className="stage-toolbar">
            <div className="stage-title">
              <span className="stage-title-icon">
                <FlaskConical size={19} strokeWidth={1.8} />
              </span>
              <div>
                <strong>{experiment ? `虚拟实验 · ${experiment.name}` : "虚拟实验室"}</strong>
                <span>{experiment?.englishName ?? "INTERACTIVE LAB"}</span>
              </div>
            </div>
            <div className="stage-toolbar-right">
              {currentRun && currentRun.cellId !== cell?.id && (
                <span className="graph-context" title="当前查看的结果来自另一种细胞">
                  结果来自：{sceneCellName}
                </span>
              )}
              <span className="lab-model-badge" title={disclaimer}>
                <AlertTriangle size={12} /> 教学模型 · 非真实实验预测
              </span>
            </div>
          </div>

          {/* 环境条件设置 */}
          {experiment && (
            <div className="lab-params">
              {experiment.params.map((param) => (
                <label className="lab-param" key={param.id} title={param.description}>
                  <span className="lab-param-label">
                    {param.label}
                    <em>
                      {params[param.id]?.toFixed(param.step < 0.01 ? 3 : param.step < 1 ? 2 : 0) ?? param.defaultValue} {param.unit}
                    </em>
                  </span>
                  <input
                    type="range"
                    min={param.min}
                    max={param.max}
                    step={param.step}
                    value={params[param.id] ?? param.defaultValue}
                    disabled={!applicable}
                    onChange={(event) =>
                      setParams((prev) => ({ ...prev, [param.id]: Number(event.target.value) }))
                    }
                    aria-label={param.label}
                  />
                </label>
              ))}
              <div className="lab-run-actions">
                <button
                  className="lab-run-btn"
                  disabled={!applicable || running}
                  onClick={() => void runExperimentNow()}
                >
                  <Play size={14} /> {running ? "实验中…" : currentRun ? "再次运行" : "运行实验"}
                </button>
                <button className="lab-reset-btn" onClick={resetParams} disabled={!applicable}>
                  <RotateCcw size={13} /> 重置条件
                </button>
              </div>
            </div>
          )}

          {/* 实验场景 */}
          <div className="lab-scene-wrap">
            {experiment && (
              <LabScene
                experimentId={experiment.id}
                cellId={sceneCellId}
                params={sceneParams}
                values={values}
                playing={player.playing}
              />
            )}
            {!currentRun && applicable && (
              <div className="lab-idle-hint">
                <FlaskConical size={13} /> 设置环境条件，点击「运行实验」开始观察
              </div>
            )}
            {!applicable && experiment && suggestedCell && (
              <div className="process-unavailable">
                <AlertTriangle size={26} />
                <p>
                  「{experiment.name}」需要在<strong>{suggestedCell.name}</strong>中观察，
                  当前视角为「{cell?.name}」。
                </p>
                <button className="panel-action" onClick={() => onSwitchCell(suggestedCell.id)}>
                  切换到 {suggestedCell.name}
                </button>
              </div>
            )}
            {listError && (
              <div className="relation-error">
                <p>实验列表加载失败：{listError}</p>
              </div>
            )}
            {runError && (
              <div className="lab-run-error">
                <AlertTriangle size={13} /> 实验运行失败:{runError}
              </div>
            )}
          </div>

          {/* 数据曲线 */}
          {experiment && (
            <LabChart
              result={result}
              variables={experiment.variables}
              time={player.time}
              duration={runExperiment?.duration ?? experiment.duration}
              timeUnit={experiment.timeUnit}
              onSeek={player.seek}
            />
          )}

          {/* 播放控制 */}
          <div className="process-controls lab-playback">
            <div
              className={`progress-track ${result ? "" : "is-disabled"}`}
              onPointerDown={(event) => {
                if (!result || !runExperiment) return;
                const rect = event.currentTarget.getBoundingClientRect();
                player.seek(((event.clientX - rect.left) / rect.width) * runExperiment.duration);
              }}
            >
              <span
                className="progress-fill"
                style={{ width: runExperiment ? `${(player.time / runExperiment.duration) * 100}%` : 0 }}
              />
              {runExperiment && (
                <span
                  className="progress-thumb"
                  style={{ left: `${(player.time / runExperiment.duration) * 100}%` }}
                />
              )}
            </div>
            <div className="controls-row">
              <div className="controls-buttons">
                <button className="ctrl-btn" onClick={player.restart} disabled={!result} aria-label="重新播放" title="重新播放">
                  <RotateCcw size={15} />
                </button>
                <button
                  className="ctrl-btn ctrl-play"
                  onClick={player.toggle}
                  disabled={!result}
                  aria-label={player.playing ? "暂停" : "播放"}
                >
                  {player.playing ? <Pause size={17} /> : <Play size={17} />}
                </button>
                <span className="time-readout">
                  {runExperiment && result
                    ? `${formatLabTime(player.time, runExperiment.timeUnit)} / ${formatLabTime(runExperiment.duration, runExperiment.timeUnit)}（虚拟时间）`
                    : "尚未运行"}
                </span>
              </div>
              <div className="controls-options">
                <div className="speed-group">
                  {[1, 2, 4].map((s) => (
                    <button
                      key={s}
                      className={`speed-btn ${player.speed === s ? "is-active" : ""}`}
                      onClick={() => player.setSpeed(s)}
                    >
                      {s}×
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 实验选择 */}
        <div className="structure-chips">
          <span className="chips-label">选择实验</span>
          {experiments.map((item) => {
            const unavailable = cell ? !item.cellIds.includes(cell.id) : false;
            return (
              <button
                key={item.id}
                className={`process-pick ${item.id === activeExpId ? "is-active" : ""} ${unavailable ? "is-unavailable" : ""}`}
                onClick={() => selectExperiment(item.id)}
                title={unavailable ? "当前细胞不适用，点击查看说明" : item.question}
              >
                <span className="process-pick-top">
                  <LabIcon id={item.icon} />
                  <strong>{item.name}</strong>
                </span>
                <small>{unavailable ? "当前细胞不适用" : item.question}</small>
              </button>
            );
          })}
        </div>
      </div>

      {experiment ? (
        <LabPanel experiment={experiment} result={result} time={player.time} disclaimer={disclaimer}>
          <LabLog
            runs={runs}
            experiments={experiments}
            cells={cells}
            activeRunId={currentRunId}
            onSelect={(id) => void openRun(id)}
            onClear={() => void clearRuns()}
          />
        </LabPanel>
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
