import { useEffect, useRef, useState } from "react";
import {
  Activity,
  ArrowUpRight,
  Gauge,
  Info,
  Pause,
  Play,
  RotateCcw,
  Timer,
  Waves
} from "lucide-react";
import {
  createSimulation,
  formatClock,
  PHYSIO_STATES,
  presetOf,
  readSnapshot,
  resetSimulation,
  setSimState,
  stepSimulation,
  type PhysioStateKey,
  type Simulation,
  type Snapshot
} from "./model";
import { PhysioBodyCanvas, type PhysioFocus } from "./PhysioBodyCanvas";
import { MetricChart, WaveformCanvas } from "./charts";

interface MetricDef {
  key: keyof Snapshot["metrics"];
  label: string;
  unit: string;
  organ: Exclude<PhysioFocus, null>;
  organLabel: string;
  color: string;
  min: number;
  max: number;
  format: (value: number) => string;
}

// 指标与其对应的人体结构：点击卡片可在人体动画上定位
const METRICS: MetricDef[] = [
  {
    key: "heartRate", label: "心率", unit: "次/分",
    organ: "heart", organLabel: "心脏 · 循环系统", color: "#ff8fa3",
    min: 40, max: 170, format: (v) => String(Math.round(v))
  },
  {
    key: "breathRate", label: "呼吸频率", unit: "次/分",
    organ: "lungs", organLabel: "肺 · 呼吸系统", color: "#7cc8ff",
    min: 6, max: 36, format: (v) => String(Math.round(v))
  },
  {
    key: "cardiacOutput", label: "心输出量", unit: "L/min",
    organ: "blood", organLabel: "血管 · 血液循环", color: "#ffc46b",
    min: 2, max: 20, format: (v) => v.toFixed(1)
  },
  {
    key: "spo2", label: "血氧饱和度", unit: "%",
    organ: "lungs", organLabel: "肺泡气体交换", color: "#9fe8c5",
    min: 90, max: 100, format: (v) => String(Math.round(v))
  },
  {
    key: "digestion", label: "消化活动", unit: "%",
    organ: "gut", organLabel: "胃与肠 · 消化系统", color: "#d9a7ff",
    min: 0, max: 1, format: (v) => String(Math.round(v * 100))
  }
];

const SPEEDS = [0.5, 1, 2, 4];

export function PhysioExplorer({ onNavigate }: { onNavigate: (to: string) => void }) {
  const simRef = useRef<Simulation | null>(null);
  if (!simRef.current) simRef.current = createSimulation();
  const [snap, setSnap] = useState<Snapshot>(() => readSnapshot(simRef.current!));
  const [focus, setFocus] = useState<PhysioFocus>(null);

  // 主循环：按真实流逝时间推进模拟，并低频同步快照驱动数值面板
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let lastSync = 0;
    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      const sim = simRef.current!;
      if (sim.playing) stepSimulation(sim, dt * sim.speed);
      if (now - lastSync > 120) {
        setSnap(readSnapshot(sim));
        lastSync = now;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const sync = () => setSnap(readSnapshot(simRef.current!));
  const chooseState = (key: PhysioStateKey) => {
    setSimState(simRef.current!, key);
    sync();
  };
  const togglePlay = () => {
    const sim = simRef.current!;
    sim.playing = !sim.playing;
    sync();
  };
  const chooseSpeed = (speed: number) => {
    simRef.current!.speed = speed;
    sync();
  };
  const reset = () => {
    resetSimulation(simRef.current!);
    sync();
  };

  const preset = presetOf(snap.stateKey);

  return (
    <section className="physio-lab">
      <header className="physio-lab-header">
        <p className="eyebrow">PHYSIOLOGY SIMULATION / 生理过程模拟</p>
        <h1>让呼吸、心跳与血流<br />在眼前运转起来</h1>
        <p className="physio-lab-lede">
          选择一个生理状态，或调整时间流速，观察 <strong>心率、呼吸频率、血液流动与消化活动</strong> 如何协同变化。
          左侧动画与右侧曲线共享同一个模拟时钟——数据与人体结构一一对应。
        </p>
        <p className="physio-scope-note">
          <Info size={13} /> 教学简化模型：数值为一般成人的典型范围，仅用于理解生理过程，不提供疾病诊断或个人健康判断。
        </p>
      </header>

      <div className="physio-workspace">
        <aside className="physio-figure-pane">
          <div className="physio-canvas-wrap">
            <PhysioBodyCanvas simRef={simRef} focus={focus} />
          </div>
          <div className="physio-legend">
            <span><i style={{ background: "#ff6f7f" }} /> 富氧血</span>
            <span><i style={{ background: "#7680e0" }} /> 缺氧血</span>
            <span><i style={{ background: "#ffc46b" }} /> 营养物质</span>
            <span><i style={{ background: "#d9a7ff" }} /> 肠道蠕动</span>
          </div>
          <p className="physio-figure-hint">点击右侧指标卡片，可在人体上定位对应结构</p>
        </aside>

        <div className="physio-content-pane">
          <div className="physio-controls">
            <div className="physio-state-row" role="tablist" aria-label="选择生理状态">
              {PHYSIO_STATES.map((state) => (
                <button
                  key={state.key}
                  role="tab"
                  aria-selected={snap.stateKey === state.key}
                  className={`physio-state-chip${snap.stateKey === state.key ? " is-active" : ""}`}
                  onClick={() => chooseState(state.key)}
                >
                  <strong>{state.name}</strong>
                  <small>{state.english}</small>
                </button>
              ))}
            </div>

            <div className="physio-time-row">
              <button className="physio-play" onClick={togglePlay} aria-label={snap.playing ? "暂停时间" : "继续时间"}>
                {snap.playing ? <Pause size={15} /> : <Play size={15} />}
                {snap.playing ? "暂停" : "继续"}
              </button>
              <div className="physio-speed" role="group" aria-label="时间流速">
                {SPEEDS.map((speed) => (
                  <button
                    key={speed}
                    className={snap.speed === speed ? "is-active" : ""}
                    onClick={() => chooseSpeed(speed)}
                  >
                    {speed}×
                  </button>
                ))}
              </div>
              <button className="physio-reset" onClick={reset}>
                <RotateCcw size={13} /> 重置
              </button>
              <span className="physio-clock" title="已模拟的时间">
                <Timer size={13} /> T+ {formatClock(snap.time)}
              </span>
            </div>
          </div>

          <div className="metric-card-grid">
            {METRICS.map((metric) => {
              const value = snap.metrics[metric.key];
              const fraction = Math.min(Math.max((value - metric.min) / (metric.max - metric.min), 0), 1);
              return (
                <button
                  key={metric.key}
                  className={`metric-card metric-card-${metric.key}${focus === metric.organ ? " is-focused" : ""}`}
                  style={{ "--metric-color": metric.color } as React.CSSProperties}
                  onClick={() => setFocus((current) => (current === metric.organ ? null : metric.organ))}
                  title={`对应结构：${metric.organLabel}`}
                >
                  <span className="metric-label">{metric.label}</span>
                  <span className="metric-value">
                    {metric.format(value)}
                    <small>{metric.unit}</small>
                  </span>
                  <span className="metric-bar">
                    <i style={{ width: `${fraction * 100}%` }} />
                  </span>
                  <span className="metric-organ">{metric.organLabel}</span>
                </button>
              );
            })}
          </div>

          <div className="physio-panel">
            <div className="physio-panel-head">
              <h3><Activity size={14} /> 实时波形</h3>
              <span>与左侧心跳、呼吸动画同步 · 波形为教学示意</span>
            </div>
            <WaveformCanvas simRef={simRef} />
          </div>

          <div className="physio-panel">
            <div className="physio-panel-head">
              <h3><Waves size={14} /> 指标趋势</h3>
              <span>最近 60 秒模拟时间 · 切换状态可看到过渡过程</span>
            </div>
            <div className="trend-grid">
              <MetricChart simRef={simRef} metric="heartRate" label="心率" unit="次/分" color="#ff8fa3" min={40} max={170} format={(v) => String(Math.round(v))} />
              <MetricChart simRef={simRef} metric="breathRate" label="呼吸频率" unit="次/分" color="#7cc8ff" min={6} max={36} format={(v) => String(Math.round(v))} />
              <MetricChart simRef={simRef} metric="cardiacOutput" label="心输出量" unit="L/min" color="#ffc46b" min={2} max={20} format={(v) => v.toFixed(1)} />
            </div>
          </div>

          <div className="state-info-card">
            <div className="state-info-head">
              <span className="state-info-kicker">{preset.english}</span>
              <h3>{preset.name} · {preset.tagline}</h3>
            </div>
            <p>{preset.description}</p>
            <div className="state-targets">
              <span>目标心率 <strong>{preset.targets.heartRate}</strong> 次/分</span>
              <span>呼吸 <strong>{preset.targets.breathRate}</strong> 次/分</span>
              <span>心输出量 <strong>{preset.targets.cardiacOutput}</strong> L/min</span>
            </div>
            <div className="state-stats">
              <span><Gauge size={12} /> 本轮模拟：心跳 {snap.beatCount} 次 · 呼吸 {snap.breathCount} 次 · 胃填充 {Math.round(snap.stomachFill * 100)}%</span>
            </div>
          </div>

          <div className="physio-structure-links">
            <span>想在结构中定位这些器官？</span>
              <button onClick={() => onNavigate("body/organ/heart")}>心脏</button>
              <button onClick={() => onNavigate("body/organ/lungs")}>肺</button>
              <button onClick={() => onNavigate("body/organ/stomach")}>胃</button>
              <button onClick={() => onNavigate("body")}>人体总览 <ArrowUpRight size={12} /></button>
          </div>

          <footer className="physio-disclaimer">
            <strong>教学模型说明</strong>
            <p>
              本模拟为教学简化模型：状态间的过渡经过平滑处理，波形为示意画法，数值取自一般成人的典型范围。
              它用于解释生理过程如何协同变化，<strong>不能用于疾病诊断、健康评估或任何医疗决策</strong>。
              如有健康疑问，请咨询专业医疗机构。
            </p>
          </footer>
        </div>
      </div>
    </section>
  );
}
