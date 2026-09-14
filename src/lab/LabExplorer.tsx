import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  Bookmark,
  FlaskConical,
  Gauge,
  Info,
  Pause,
  Play,
  RotateCcw,
  Timer,
  Trash2,
  TriangleAlert
} from "lucide-react";
import { LabTimelineChart } from "./labChart";
import {
  applyConditions,
  BASELINE_CONDITIONS,
  BASELINE_METRICS,
  buildInsights,
  conditionsLabel,
  createLab,
  formatSimClock,
  METRIC_DEFS,
  readLabSnapshot,
  recoverToBaseline,
  RECOVERY_TOL,
  resetLab,
  runStats,
  sameConditions,
  snapshotRun,
  stepLab,
  type LabConditions,
  type LabMetricKey,
  type LabRun,
  type LabSimulation,
  type RestState
} from "./labModel";

const SPEEDS = [1, 4, 16];
const WINDOWS = [
  { label: "最近 1 分钟", seconds: 60 },
  { label: "最近 3 分钟", seconds: 180 },
  { label: "全程", seconds: 0 }
];

const REST_OPTIONS: { key: RestState; label: string; hint: string }[] = [
  { key: "awake", label: "清醒安静", hint: "静坐" },
  { key: "nap", label: "小睡", hint: "浅睡" },
  { key: "sleep", label: "深睡", hint: "修复模式" }
];

const SCENARIOS: { name: string; c: LabConditions }[] = [
  { name: "温和散步", c: { exercise: 25, ambientC: 24, rest: "awake" } },
  { name: "炎热高强度", c: { exercise: 75, ambientC: 34, rest: "awake" } },
  { name: "凉爽深睡", c: { exercise: 0, ambientC: 18, rest: "sleep" } }
];

type Snapshot = ReturnType<typeof readLabSnapshot>;

export function LabExplorer({ onNavigate }: { onNavigate: (to: string) => void }) {
  const simRef = useRef<LabSimulation | null>(null);
  if (!simRef.current) simRef.current = createLab();
  const [snap, setSnap] = useState<Snapshot>(() => readLabSnapshot(simRef.current!));
  const [draft, setDraft] = useState<LabConditions>({ ...BASELINE_CONDITIONS });
  const [windowSeconds, setWindowSeconds] = useState(180);
  const [runs, setRuns] = useState<LabRun[]>([]);

  // 主循环：按真实时间推进模拟时钟，低频同步驱动数值面板
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let lastSync = 0;
    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      const sim = simRef.current!;
      if (sim.playing) stepLab(sim, dt * sim.speed);
      if (now - lastSync > 150) {
        setSnap(readLabSnapshot(sim));
        lastSync = now;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const sync = () => setSnap(readLabSnapshot(simRef.current!));

  const applyDraft = () => {
    applyConditions(simRef.current!, draft);
    sync();
  };
  const startRecovery = () => {
    recoverToBaseline(simRef.current!);
    setDraft({ ...BASELINE_CONDITIONS });
    sync();
  };
  const newRound = () => {
    resetLab(simRef.current!);
    setDraft({ ...BASELINE_CONDITIONS });
    sync();
  };
  const togglePlay = () => {
    simRef.current!.playing = !simRef.current!.playing;
    sync();
  };
  const saveRun = (slot: "A" | "B") => {
    const run = snapshotRun(simRef.current!, slot);
    setRuns((current) => [run, ...current.filter((r) => r.slot !== slot)]);
  };

  const sim = simRef.current!;
  const atBaseline = sameConditions(sim.conditions, BASELINE_CONDITIONS);
  const insights = buildInsights(runs);

  return (
    <section className="lab-page">
      <header className="lab-header">
        <button className="back-button" onClick={() => onNavigate("body")}>
          <ArrowLeft size={16} /> 返回人体模块
        </button>
        <p className="eyebrow">PHYSIOLOGY STATE LAB / 简化生理状态实验室</p>
        <h1>改变一个变量，<br />观察身体的连锁反应</h1>
        <p className="lab-lede">
          调整 <strong>运动强度、环境温度、休息状态</strong> 三个变量，观察{" "}
          <strong>心率、呼吸频率、核心体温、出汗速率</strong> 四个指标如何被同时牵动；
          撤去应激后沿时间轴观察恢复过程，并把两次实验存为 A / B 进行对照。
        </p>
        <p className="lab-badge">
          <TriangleAlert size={13} />
          这里所有曲线与数值都是<strong>教学模型的模拟输出，不是真实医学测量数据</strong>，不能用于诊断或健康判断。
        </p>
      </header>

      <div className="lab-workspace">
        {/* 左：变量控制台 */}
        <aside className="lab-console">
          <div className="lab-panel">
            <div className="lab-panel-head">
              <h2><FlaskConical size={14} /> 实验条件</h2>
              <span>调整后点击「施加条件」</span>
            </div>

            <div className="lab-variable">
              <div className="lab-variable-head">
                <label htmlFor="lab-exercise">运动强度</label>
                <strong><Gauge size={12} /> {draft.exercise}<small>%</small></strong>
              </div>
              <input
                id="lab-exercise"
                type="range" min={0} max={100} step={5}
                value={draft.exercise}
                onChange={(e) => setDraft((d) => ({ ...d, exercise: Number(e.target.value) }))}
                style={{ "--slider-color": "#ff8fa3" } as React.CSSProperties}
              />
              <div className="lab-slider-scale"><span>静坐</span><span>中等</span><span>极限</span></div>
            </div>

            <div className="lab-variable">
              <div className="lab-variable-head">
                <label htmlFor="lab-temp">环境温度</label>
                <strong>{draft.ambientC}<small>°C</small></strong>
              </div>
              <input
                id="lab-temp"
                type="range" min={5} max={40} step={1}
                value={draft.ambientC}
                onChange={(e) => setDraft((d) => ({ ...d, ambientC: Number(e.target.value) }))}
                style={{ "--slider-color": "#ffc46b" } as React.CSSProperties}
              />
              <div className="lab-slider-scale"><span>5°C 寒冷</span><span>22°C 中性</span><span>40°C 酷热</span></div>
            </div>

            <div className="lab-variable">
              <div className="lab-variable-head"><label>休息状态</label></div>
              <div className="lab-rest-row" role="radiogroup" aria-label="休息状态">
                {REST_OPTIONS.map((option) => (
                  <button
                    key={option.key}
                    role="radio"
                    aria-checked={draft.rest === option.key}
                    className={draft.rest === option.key ? "is-active" : ""}
                    onClick={() => setDraft((d) => ({ ...d, rest: option.key }))}
                  >
                    <strong>{option.label}</strong>
                    <small>{option.hint}</small>
                  </button>
                ))}
              </div>
            </div>

            <div className="lab-scenario-row">
              <span>快速填入：</span>
              {SCENARIOS.map((scenario) => (
                <button key={scenario.name} onClick={() => setDraft({ ...scenario.c })}>
                  {scenario.name}
                </button>
              ))}
            </div>

            <div className="lab-apply-row">
              <button className="lab-apply" onClick={applyDraft}>
                施加条件 <ArrowUpRight size={14} />
              </button>
              <button className="lab-recover" onClick={startRecovery} disabled={atBaseline}>
                撤去应激 · 回到基线
              </button>
            </div>
            <p className="lab-current-condition">
              当前模拟中：<strong>{conditionsLabel(sim.conditions)}</strong>
            </p>
          </div>

          <div className="lab-panel">
            <div className="lab-panel-head">
              <h2><Timer size={14} /> 时间轴控制</h2>
            </div>
            <div className="lab-time-row">
              <button className="lab-play" onClick={togglePlay}>
                {snap.playing ? <Pause size={14} /> : <Play size={14} />}
                {snap.playing ? "暂停" : "播放"}
              </button>
              <div className="lab-speed">
                {SPEEDS.map((speed) => (
                  <button
                    key={speed}
                    className={snap.speed === speed ? "is-active" : ""}
                    onClick={() => { simRef.current!.speed = speed; sync(); }}
                  >
                    {speed}×
                  </button>
                ))}
              </div>
              <span className="lab-clock">T+ {formatSimClock(snap.time)}</span>
            </div>
            <button className="lab-new-round" onClick={newRound}>
              <RotateCcw size={12} /> 开始新一轮（清空时间轴，保留 A/B 对照）
            </button>
            <p className="lab-time-hint">体温恢复较慢，建议用 4× 或 16× 速度观察完整恢复过程。</p>
          </div>

          <AssumptionsPanel />
        </aside>

        {/* 右：指标 + 时间轴 + 对照 */}
        <div className="lab-results">
          <div className="lab-metric-grid">
            {METRIC_DEFS.map((def) => {
              const value = snap.metrics[def.key];
              const delta = value - BASELINE_METRICS[def.key];
              const within = Math.abs(delta) <= RECOVERY_TOL[def.key];
              const lastEvent = sim.events[sim.events.length - 1];
              const status = within
                ? { label: "基线附近", tone: "base" }
                : lastEvent?.kind === "recover"
                  ? { label: "恢复中", tone: "recovering" }
                  : { label: "偏离中", tone: "stress" };
              return (
                <div key={def.key} className="lab-metric-card" style={{ "--metric-color": def.color } as React.CSSProperties}>
                  <span className="lab-metric-label">{def.label}</span>
                  <span className="lab-metric-value">
                    {def.format(value)}<small>{def.unit}</small>
                  </span>
                  <span className={`lab-metric-delta ${delta < 0 ? "is-down" : ""}`}>
                    较基线 {def.formatDelta(delta)} {def.unit}
                  </span>
                  <span className={`lab-metric-status is-${status.tone}`}>{status.label}</span>
                  <span className="lab-metric-system">{def.system}</span>
                </div>
              );
            })}
          </div>

          <div className="lab-panel">
            <div className="lab-panel-head">
              <h2>恢复时间轴</h2>
              <div className="lab-window-toggle">
                {WINDOWS.map((w) => (
                  <button
                    key={w.seconds}
                    className={windowSeconds === w.seconds ? "is-active" : ""}
                    onClick={() => setWindowSeconds(w.seconds)}
                  >
                    {w.label}
                  </button>
                ))}
              </div>
            </div>
            <p className="lab-chart-note">
              实线为当前实验，{runs.length > 0 ? "淡色为已保存的 A/B 对照，" : ""}灰虚线为基线；
              竖线标记「施加条件」与「回到基线」的时刻。
            </p>
            <div className="lab-chart-grid">
              {METRIC_DEFS.map((def) => (
                <figure key={def.key} className="lab-chart">
                  <figcaption>
                    <i style={{ background: def.color }} />
                    {def.label}
                    <small>{def.unit}</small>
                  </figcaption>
                  <LabTimelineChart simRef={simRef} runs={runs} metric={def.key} windowSeconds={windowSeconds} />
                </figure>
              ))}
            </div>
          </div>

          <div className="lab-panel">
            <div className="lab-panel-head">
              <h2><Bookmark size={14} /> 实验对照（A / B）</h2>
              <span>把同一时间轴的不同条件存下来再对比</span>
            </div>
            <div className="lab-save-row">
              <button onClick={() => saveRun("A")} className="lab-save is-a">存为实验 A</button>
              <button onClick={() => saveRun("B")} className="lab-save is-b">存为实验 B</button>
              <button className="lab-clear" onClick={() => setRuns([])} disabled={runs.length === 0}>
                <Trash2 size={12} /> 清空对照
              </button>
            </div>
            {runs.length === 0 ? (
              <p className="lab-compare-empty">
                还没有保存实验。先施加一个条件（如「炎热高强度」），观察一段时间后点击「撤去应激 · 回到基线」，
                等曲线回落，再「存为实验 A」；然后开始新一轮、换一个条件，存为实验 B。
              </p>
            ) : (
              <>
                <div className="lab-run-tags">
                  {[...runs].reverse().map((run) => (
                    <span key={run.slot} className={`lab-run-tag is-${run.slot.toLowerCase()}`}>
                      <i>实验 {run.slot}</i> {run.label} · 时长 {formatSimClock(run.duration)}
                    </span>
                  ))}
                </div>
                <div className="lab-compare-table-wrap">
                  <table className="lab-compare-table">
                    <thead>
                      <tr>
                        <th>指标</th>
                        <th>基线</th>
                        <th>A 峰值偏离</th>
                        <th>A 恢复用时</th>
                        <th>B 峰值偏离</th>
                        <th>B 恢复用时</th>
                      </tr>
                    </thead>
                    <tbody>
                      {METRIC_DEFS.map((def) => {
                        const key = def.key as LabMetricKey;
                        const cell = (slot: "A" | "B") => {
                          const run = runs.find((r) => r.slot === slot);
                          if (!run) return <td className="lab-cell-empty">—</td>;
                          const stat = runStats(run)[key];
                          return (
                            <>
                              <td>
                                <strong className={stat.peakDelta >= 0 ? "" : "is-down"}>
                                  {def.formatDelta(stat.peakDelta)}
                                </strong>
                                <small> {def.unit}</small>
                              </td>
                              <td className={stat.recoveredAt === null ? "is-not-recovered" : ""}>
                                {stat.recoveredAt === null ? "未恢复" : formatSimClock(stat.recoveredAt)}
                              </td>
                            </>
                          );
                        };
                        return (
                          <tr key={def.key}>
                            <th><i style={{ background: def.color }} />{def.label}</th>
                            <td className="lab-cell-base">{def.format(BASELINE_METRICS[key])}</td>
                            {cell("A")}
                            {cell("B")}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {insights.length > 0 && (
                  <div className="lab-insights">
                    <h3><Info size={13} /> 模型能帮你发现的联系（均为模型推导，非医学结论）</h3>
                    <ul>
                      {insights.map((text, i) => <li key={i}>{text}</li>)}
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="lab-links">
            <span>继续探索：</span>
            <button onClick={() => onNavigate("physio")}>实时生理过程模拟</button>
            <button onClick={() => onNavigate("body/organ/heart")}>心脏结构</button>
            <button onClick={() => onNavigate("body/organ/lungs")}>肺与气体交换</button>
            <button onClick={() => onNavigate("entry/hormone-feedback")}>体温的激素反馈 <ArrowUpRight size={12} /></button>
          </div>
        </div>
      </div>
    </section>
  );
}

// ===== 模型假设面板：明确区分“模型假设”与“真实医学数据” =====
function AssumptionsPanel() {
  const assumptions: string[] = [
    "结构假设：每个指标都被简化为一个「目标值 + 一阶滞后」系统——真实生理调节包含神经、激素、局部代谢等多层反馈，远比这复杂。",
    "基线假设：心率 70 次/分、呼吸 14 次/分、核心体温 37.0°C、出汗 15 mL/h 是取整的「一般成人典型值」，年龄、体能、性别等个体差异很大。",
    "响应假设：指标随运动强度、环境温度按线性公式变化，并用一个乘积项表示「运动 × 高温」的协同放大；只保证在滑块范围内趋势合理，不做外推。",
    "时间假设：心率上升/恢复时间常数约 30/70 秒、呼吸 35/80 秒、体温 180/300 秒、出汗 60/150 秒——全部是教学取值，恢复是否更快取决于体能、补水、环境等。",
    "判定假设：「回到基线」的容差（心率 ±3、呼吸 ±1、体温 ±0.08°C、出汗 ±30 mL/h）是模型自定的，不是临床标准。",
    "省略假设：未模拟湿度、风速、日照、海拔、脱水、疾病、药物、昼夜节律与长期适应；也没有任何保护机制失效后的病理过程。"
  ];
  return (
    <div className="lab-assumptions">
      <div className="lab-assumptions-head">
        <TriangleAlert size={15} />
        <div>
          <strong>模型假设面板</strong>
          <small>MODEL ASSUMPTIONS · 先读这里再看曲线</small>
        </div>
      </div>
      <ul>
        {assumptions.map((text, i) => (
          <li key={i}><span>{String(i + 1).padStart(2, "0")}</span>{text}</li>
        ))}
      </ul>
      <p>
        本页面任何数字、曲线、「恢复用时」都是上述假设下的<strong>模拟结果</strong>，
        不代表任何真实受试者，更<strong>不能用于疾病诊断、运动处方或健康决策</strong>。
      </p>
    </div>
  );
}
