// ===== 生理过程模拟引擎 =====
// 教学简化模型：用一阶滞后系统逼近各生理状态的目标值，
// 数值取自一般成人的典型范围，仅用于理解生理过程的动态关系。

export type PhysioStateKey = "rest" | "exercise" | "sleep" | "meal" | "stress";

export interface PhysioTargets {
  heartRate: number; // 心率 次/分
  breathRate: number; // 呼吸频率 次/分
  cardiacOutput: number; // 心输出量（全身血流量） L/min
  spo2: number; // 血氧饱和度 %
  digestion: number; // 消化活动强度 0–1
}

export interface PhysioStatePreset {
  key: PhysioStateKey;
  name: string;
  english: string;
  tagline: string;
  description: string;
  targets: PhysioTargets;
}

export const PHYSIO_STATES: PhysioStatePreset[] = [
  {
    key: "rest",
    name: "静息",
    english: "REST",
    tagline: "身体处于基础代谢水平",
    description:
      "安静坐卧时，心脏只需维持基础供血：心率约 70 次/分，呼吸平缓，血液以约 5 L/min 的速度在全身循环，消化系统保持中等活动。这是一切其他状态的参照基线。",
    targets: { heartRate: 70, breathRate: 14, cardiacOutput: 5.0, spo2: 98, digestion: 0.35 }
  },
  {
    key: "exercise",
    name: "运动",
    english: "EXERCISE",
    tagline: "肌肉需氧量激增，心肺全力配合",
    description:
      "运动时骨骼肌的耗氧量可上升 10 倍以上。交感神经让心率加快、每搏输出量增加，心输出量可升至静息时的 3–4 倍；呼吸加深加快以补充氧气，血液被优先送往肌肉，消化活动暂时减弱。",
    targets: { heartRate: 150, breathRate: 32, cardiacOutput: 17.5, spo2: 97, digestion: 0.12 }
  },
  {
    key: "sleep",
    name: "睡眠",
    english: "SLEEP",
    tagline: "副交感神经主导，进入修复模式",
    description:
      "深睡时副交感神经占主导：心率降至约 55 次/分，呼吸变得深而缓慢，心输出量随之下降。身体把省下的能量用于组织修复、免疫调节与记忆整理。",
    targets: { heartRate: 55, breathRate: 11, cardiacOutput: 4.0, spo2: 97, digestion: 0.3 }
  },
  {
    key: "meal",
    name: "进食后",
    english: "AFTER MEAL",
    tagline: "血液向消化系统重新分配",
    description:
      "进食后胃肠蠕动增强、消化液分泌增加，流向消化道的血液增多，心率轻微上升以支持新增的代谢需求。观察胃部被填满、再逐渐排空，以及肠道蠕动的变化。",
    targets: { heartRate: 78, breathRate: 15, cardiacOutput: 5.8, spo2: 98, digestion: 1.0 }
  },
  {
    key: "stress",
    name: "紧张",
    english: "STRESS",
    tagline: "“战或逃”反应被激活",
    description:
      "紧张时肾上腺素分泌增加：心率与呼吸频率上升，心输出量提高，血液从消化道转向肌肉与大脑——这是一套为应对威胁而演化的短期应激方案，通常几分钟内就会回落。",
    targets: { heartRate: 96, breathRate: 21, cardiacOutput: 6.8, spo2: 98, digestion: 0.18 }
  }
];

export const presetOf = (key: PhysioStateKey): PhysioStatePreset =>
  PHYSIO_STATES.find((state) => state.key === key) ?? PHYSIO_STATES[0];

// ===== 模拟状态 =====

export interface MetricSample extends PhysioTargets {
  t: number;
}

export interface WaveSample {
  t: number;
  heartCycle: number; // 累计心动周期（连续值，用于绘制心电波形）
  breathCycle: number; // 累计呼吸周期
}

export interface Simulation {
  time: number; // 已模拟的秒数
  playing: boolean;
  speed: number; // 时间倍速
  stateKey: PhysioStateKey;
  metrics: PhysioTargets; // 当前平滑后的指标
  heartCycle: number;
  breathCycle: number;
  heartPhase: number; // 0–1，当前心动周期位置
  breathPhase: number; // 0–1，当前呼吸周期位置
  stomachFill: number; // 胃填充度 0–1
  history: MetricSample[];
  waves: WaveSample[];
  lastSampleAt: number;
  lastWaveAt: number;
}

export const HISTORY_WINDOW = 90; // 趋势曲线保留最近 90 秒模拟时间
export const WAVE_WINDOW = 8; // 波形图显示最近 8 秒
const SAMPLE_INTERVAL = 0.2;
const WAVE_INTERVAL = 0.04;

export function createSimulation(): Simulation {
  const targets = { ...PHYSIO_STATES[0].targets };
  return {
    time: 0,
    playing: true,
    speed: 1,
    stateKey: "rest",
    metrics: { ...targets },
    heartCycle: 0,
    breathCycle: 0,
    heartPhase: 0,
    breathPhase: 0,
    stomachFill: 0.25,
    history: [{ t: 0, ...targets }],
    waves: [{ t: 0, heartCycle: 0, breathCycle: 0 }],
    lastSampleAt: 0,
    lastWaveAt: 0
  };
}

export function setSimState(sim: Simulation, key: PhysioStateKey) {
  sim.stateKey = key;
  if (key === "meal") sim.stomachFill = 1; // 进食：胃被填满，随后逐渐排空
}

export function resetSimulation(sim: Simulation) {
  const fresh = createSimulation();
  Object.assign(sim, fresh, { playing: sim.playing, speed: sim.speed });
}

// 一阶滞后逼近：tau 越小响应越快，模拟不同指标各自的调节速度
const approach = (current: number, target: number, dt: number, tau: number) =>
  current + (target - current) * (1 - Math.exp(-dt / tau));

export function stepSimulation(sim: Simulation, dt: number) {
  if (dt <= 0) return;
  const targets = presetOf(sim.stateKey).targets;
  sim.time += dt;

  const m = sim.metrics;
  m.heartRate = approach(m.heartRate, targets.heartRate, dt, 3.2);
  m.breathRate = approach(m.breathRate, targets.breathRate, dt, 4.5);
  m.cardiacOutput = approach(m.cardiacOutput, targets.cardiacOutput, dt, 4.0);
  m.spo2 = approach(m.spo2, targets.spo2, dt, 6.0);
  m.digestion = approach(m.digestion, targets.digestion, dt, 5.0);

  sim.heartCycle += (dt * m.heartRate) / 60;
  sim.breathCycle += (dt * m.breathRate) / 60;
  sim.heartPhase = sim.heartCycle % 1;
  sim.breathPhase = sim.breathCycle % 1;

  // 胃排空速度随消化活动变化；进入“进食后”状态时由 setSimState 补满
  sim.stomachFill = Math.max(0.04, sim.stomachFill - dt * 0.006 * m.digestion);

  if (sim.time - sim.lastSampleAt >= SAMPLE_INTERVAL) {
    sim.history.push({ t: sim.time, ...m });
    sim.lastSampleAt = sim.time;
    const cutoff = sim.time - HISTORY_WINDOW;
    while (sim.history.length > 2 && sim.history[0].t < cutoff) sim.history.shift();
  }

  if (sim.time - sim.lastWaveAt >= WAVE_INTERVAL) {
    sim.waves.push({ t: sim.time, heartCycle: sim.heartCycle, breathCycle: sim.breathCycle });
    sim.lastWaveAt = sim.time;
    const cutoff = sim.time - WAVE_WINDOW - 1;
    while (sim.waves.length > 2 && sim.waves[0].t < cutoff) sim.waves.shift();
  }
}

// ===== 波形与动画辅助函数 =====

const gaussian = (x: number, mu: number, sigma: number) =>
  Math.exp(-((x - mu) ** 2) / (2 * sigma * sigma));

// 单个心动周期内的示意心电波形（P-QRS-T，教学示意，非真实心电图）。
// 各波宽度按秒定义（QRS 约 0.06s，不随心率成比例压缩），更接近真实心电。
export function ecgWave(phase: number, heartRate = 70): number {
  const cycle = 60 / heartRate;
  const t = phase * cycle; // 本周期内已经过的秒数
  return (
    gaussian(t, 0.12, 0.028) * 0.15 + // P 波：心房去极化
    gaussian(t, 0.2, 0.01) * -0.1 + // Q
    gaussian(t, 0.23, 0.009) * 1.0 + // R 峰：心室去极化
    gaussian(t, 0.26, 0.011) * -0.22 + // S
    gaussian(t, Math.min(0.42, cycle * 0.62), 0.05) * 0.26 // T 波：心室复极
  );
}

// 呼吸波形：吸气约占 40%，呼气约占 60%
export function breathWave(phase: number): number {
  return phase < 0.4
    ? Math.sin((phase / 0.4) * Math.PI * 0.5) // 吸气上升
    : Math.cos(((phase - 0.4) / 0.6) * Math.PI * 0.5); // 呼气下降
}

// 心脏收缩脉冲：R 峰之后心室收缩射血，驱动心跳动画与血流加速
export function systolePulse(phase: number, heartRate = 70): number {
  const cycle = 60 / heartRate;
  return gaussian(phase * cycle, 0.3, 0.055);
}

// ===== 渲染快照 =====

export interface Snapshot {
  time: number;
  playing: boolean;
  speed: number;
  stateKey: PhysioStateKey;
  metrics: PhysioTargets;
  beatCount: number;
  breathCount: number;
  stomachFill: number;
}

export const readSnapshot = (sim: Simulation): Snapshot => ({
  time: sim.time,
  playing: sim.playing,
  speed: sim.speed,
  stateKey: sim.stateKey,
  metrics: { ...sim.metrics },
  beatCount: Math.floor(sim.heartCycle),
  breathCount: Math.floor(sim.breathCycle),
  stomachFill: sim.stomachFill
});

export const formatClock = (seconds: number) => {
  const total = Math.floor(seconds);
  const mm = String(Math.floor(total / 60)).padStart(2, "0");
  const ss = String(total % 60).padStart(2, "0");
  return `${mm}:${ss}`;
};
