// ===== 简化生理状态实验室 · 教学模型引擎 =====
// ⚠️ 重要：本文件中的一切公式、常数与时间常数均为【模型假设】，
// 不是实测数据，不来自任何真实受试者，仅用于课堂上理解
// “一个变量如何同时牵动多个生理系统”这一定性关系。
// 详见界面上的“模型假设面板”。

export type RestState = "awake" | "nap" | "sleep";

export interface LabConditions {
  exercise: number; // 运动强度 0–100（粗略类比 % 最大负荷）
  ambientC: number; // 环境温度 °C，允许 5–40
  rest: RestState; // 休息状态：清醒安静 / 小睡 / 深睡
}

export type LabMetricKey = "heartRate" | "breathRate" | "coreTemp" | "sweatRate";

export type LabMetrics = Record<LabMetricKey, number>;

export interface LabEvent {
  t: number;
  kind: "apply" | "recover";
  label: string;
}

export interface LabSample extends LabMetrics {
  t: number;
}

// 基线条件：清醒、静坐、22°C —— 一切对比的参照系
export const BASELINE_CONDITIONS: LabConditions = { exercise: 0, ambientC: 22, rest: "awake" };

// 【模型假设】基线“典型成人”常数，非个体测量值
export const BASELINE_METRICS: LabMetrics = {
  heartRate: 70, // 次/分
  breathRate: 14, // 次/分
  coreTemp: 37.0, // °C
  sweatRate: 15 // mL/h
};

// 【模型假设】休息状态对各指标的整体折减系数与体温设定点偏移
const REST_FACTOR: Record<RestState, { hr: number; br: number; tempOffset: number; sweat: number }> = {
  awake: { hr: 1, br: 1, tempOffset: 0, sweat: 1 },
  nap: { hr: 0.92, br: 0.93, tempOffset: -0.2, sweat: 0.9 },
  sleep: { hr: 0.8, br: 0.82, tempOffset: -0.5, sweat: 0.8 }
};

export const REST_LABEL: Record<RestState, string> = {
  awake: "清醒安静",
  nap: "小睡",
  sleep: "深睡"
};

// ===== 【模型假设核心】稳态目标值的经验公式 =====
// 线性项 + 一个“运动×高温”乘积项（表示两个应激源的协同放大）。
// 只在滑块范围内“看起来合理”，不做任何外推。
export function targetMetrics(c: LabConditions): LabMetrics {
  const f = REST_FACTOR[c.rest];
  const e = c.exercise / 100; // 0–1
  const heat = Math.max(0, c.ambientC - 22); // 高于中性温度的度数
  const cold = Math.max(0, 22 - c.ambientC);
  const heatStress = heat / 10;

  const heartRate = (70 + 80 * e + 0.8 * heat + 4 * e * heatStress) * f.hr;
  const breathRate = (14 + 16 * e + 0.18 * heat + 2.5 * e * heatStress) * f.br;
  const coreTemp =
    37 + 0.9 * e + 0.028 * heat + 0.05 * e * heat - 0.01 * cold + f.tempOffset;
  const sweatRate = Math.max(
    0,
    (15 + 1300 * e + 6 * heat + 160 * e * heatStress) * f.sweat
  );

  return { heartRate, breathRate, coreTemp, sweatRate };
}

// ===== 【模型假设】每个指标各自的一阶滞后时间常数（秒）=====
// 上升（偏离基线）通常快于回落（恢复），恢复时间轴靠这组常数表现。
export const TIME_CONSTANTS: Record<LabMetricKey, { up: number; down: number }> = {
  heartRate: { up: 30, down: 70 },
  breathRate: { up: 35, down: 80 },
  coreTemp: { up: 180, down: 300 },
  sweatRate: { up: 60, down: 150 }
};

// 判定“已回到基线”的容差（同样属于模型约定，非临床标准）
export const RECOVERY_TOL: LabMetrics = {
  heartRate: 3,
  breathRate: 1,
  coreTemp: 0.08,
  sweatRate: 30
};

export interface MetricDef {
  key: LabMetricKey;
  label: string;
  unit: string;
  system: string;
  color: string;
  min: number;
  max: number;
  format: (v: number) => string;
  formatDelta: (d: number) => string;
}

export const METRIC_DEFS: MetricDef[] = [
  {
    key: "heartRate",
    label: "心率",
    unit: "次/分",
    system: "循环系统 · 心脏",
    color: "#ff8fa3",
    min: 40,
    max: 180,
    format: (v) => String(Math.round(v)),
    formatDelta: (d) => `${d >= 0 ? "+" : ""}${Math.round(d)}`
  },
  {
    key: "breathRate",
    label: "呼吸频率",
    unit: "次/分",
    system: "呼吸系统 · 肺",
    color: "#7cc8ff",
    min: 6,
    max: 40,
    format: (v) => String(Math.round(v)),
    formatDelta: (d) => `${d >= 0 ? "+" : ""}${Math.round(d)}`
  },
  {
    key: "coreTemp",
    label: "核心体温",
    unit: "°C",
    system: "体温调节 · 下丘脑",
    color: "#ffc46b",
    min: 35.5,
    max: 39.5,
    format: (v) => v.toFixed(2),
    formatDelta: (d) => `${d >= 0 ? "+" : ""}${d.toFixed(2)}`
  },
  {
    key: "sweatRate",
    label: "出汗速率",
    unit: "mL/h",
    system: "体温调节 · 皮肤汗腺",
    color: "#9fe8c5",
    min: 0,
    max: 1800,
    format: (v) => String(Math.round(v)),
    formatDelta: (d) => `${d >= 0 ? "+" : ""}${Math.round(d)}`
  }
];

export const metricDefOf = (key: LabMetricKey): MetricDef =>
  METRIC_DEFS.find((m) => m.key === key) ?? METRIC_DEFS[0];

// ===== 模拟状态 =====

export interface LabSimulation {
  time: number;
  playing: boolean;
  speed: number;
  conditions: LabConditions; // 当前施加中的条件
  metrics: LabMetrics; // 当前平滑后的指标
  history: LabSample[];
  events: LabEvent[];
  lastSampleAt: number;
}

export const SAMPLE_INTERVAL = 2; // 每 2 个模拟秒采样一次
const HISTORY_CAP = 1000; // 最多保留约 33 分钟模拟时间

export function createLab(): LabSimulation {
  return {
    time: 0,
    playing: true,
    speed: 4,
    conditions: { ...BASELINE_CONDITIONS },
    metrics: { ...BASELINE_METRICS },
    history: [{ t: 0, ...BASELINE_METRICS }],
    events: [],
    lastSampleAt: 0
  };
}

export function resetLab(sim: LabSimulation) {
  const fresh = createLab();
  Object.assign(sim, fresh, { playing: sim.playing, speed: sim.speed });
}

const approach = (current: number, target: number, dt: number, tau: number) =>
  current + (target - current) * (1 - Math.exp(-dt / tau));

export function stepLab(sim: LabSimulation, dt: number) {
  if (dt <= 0) return;
  const target = targetMetrics(sim.conditions);
  sim.time += dt;

  (Object.keys(target) as LabMetricKey[]).forEach((key) => {
    const rising = target[key] >= sim.metrics[key];
    const tau = rising ? TIME_CONSTANTS[key].up : TIME_CONSTANTS[key].down;
    sim.metrics[key] = approach(sim.metrics[key], target[key], dt, tau);
  });

  if (sim.time - sim.lastSampleAt >= SAMPLE_INTERVAL) {
    sim.history.push({ t: sim.time, ...sim.metrics });
    sim.lastSampleAt = sim.time;
    while (sim.history.length > HISTORY_CAP) sim.history.shift();
  }
}

export const conditionsLabel = (c: LabConditions): string => {
  if (sameConditions(c, BASELINE_CONDITIONS)) return "基线条件（静息 · 22°C）";
  return `运动 ${c.exercise}% · ${c.ambientC}°C · ${REST_LABEL[c.rest]}`;
};

export const conditionsShort = (c: LabConditions): string =>
  `${c.exercise}% · ${c.ambientC}°C · ${REST_LABEL[c.rest]}`;

export function sameConditions(a: LabConditions, b: LabConditions): boolean {
  return a.exercise === b.exercise && a.ambientC === b.ambientC && a.rest === b.rest;
}

export function applyConditions(sim: LabSimulation, c: LabConditions) {
  sim.conditions = { ...c };
  sim.events.push({ t: sim.time, kind: "apply", label: conditionsLabel(c) });
}

export function recoverToBaseline(sim: LabSimulation) {
  if (sameConditions(sim.conditions, BASELINE_CONDITIONS)) return;
  sim.conditions = { ...BASELINE_CONDITIONS };
  sim.events.push({ t: sim.time, kind: "recover", label: "恢复基线条件" });
}

export const formatSimClock = (seconds: number) => {
  const total = Math.floor(seconds);
  const mm = String(Math.floor(total / 60)).padStart(2, "0");
  const ss = String(total % 60).padStart(2, "0");
  return `${mm}:${ss}`;
};

// ===== 渲染快照 =====

export interface LabSnapshot {
  time: number;
  playing: boolean;
  speed: number;
  conditions: LabConditions;
  metrics: LabMetrics;
}

export const readLabSnapshot = (sim: LabSimulation): LabSnapshot => ({
  time: sim.time,
  playing: sim.playing,
  speed: sim.speed,
  conditions: { ...sim.conditions },
  metrics: { ...sim.metrics }
});

// ===== 保存一次实验（对照 A/B）=====

export interface LabRun {
  slot: "A" | "B";
  conditions: LabConditions;
  label: string;
  samples: LabSample[];
  events: LabEvent[];
  duration: number;
}

export function snapshotRun(sim: LabSimulation, slot: "A" | "B"): LabRun {
  return {
    slot,
    conditions: { ...sim.conditions },
    label: conditionsLabel(sim.conditions),
    samples: sim.history.map((s) => ({ ...s })),
    events: sim.events.map((e) => ({ ...e })),
    duration: sim.time
  };
}

export interface MetricStat {
  peakDelta: number; // 相对基线的最大偏离（带符号）
  peakAt: number; // 出现时刻（模拟秒）
  endDelta: number; // 记录结束时偏离
  recoveredAt: number | null; // 从最后一次“恢复基线”起，回到容差内用时；null = 未恢复或未恢复过
}

export type RunStats = Record<LabMetricKey, MetricStat>;

export function runStats(run: LabRun): RunStats {
  const result = {} as RunStats;
  const recoverT = [...run.events].reverse().find((e) => e.kind === "recover")?.t ?? null;

  (Object.keys(BASELINE_METRICS) as LabMetricKey[]).forEach((key) => {
    const base = BASELINE_METRICS[key];
    const tol = RECOVERY_TOL[key];
    let peak = run.samples[0] ? run.samples[0][key] - base : 0;
    let peakAt = 0;
    for (const sample of run.samples) {
      const delta = sample[key] - base;
      if (Math.abs(delta) > Math.abs(peak)) {
        peak = delta;
        peakAt = sample.t;
      }
    }
    const last = run.samples[run.samples.length - 1];
    const endDelta = last ? last[key] - base : 0;

    let recoveredAt: number | null = null;
    if (recoverT !== null) {
      // 从末尾向前找最后一个超差样本，其后第一个样本即恢复时刻
      let index = run.samples.length - 1;
      while (index >= 0 && Math.abs(run.samples[index][key] - base) <= tol) index--;
      const firstBack = run.samples[index + 1];
      if (firstBack && firstBack.t >= recoverT) recoveredAt = firstBack.t - recoverT;
    }

    result[key] = { peakDelta: peak, peakAt, endDelta, recoveredAt };
  });
  return result;
}

// 判定某个指标在一次实验中是否“被显著影响”（阈值为模型约定）
export const AFFECT_THRESHOLD: LabMetrics = {
  heartRate: 8,
  breathRate: 2,
  coreTemp: 0.2,
  sweatRate: 80
};

// ===== 模型推导的“发现”文案（全部是模型输出，不是医学结论）=====

export function buildInsights(runs: LabRun[]): string[] {
  if (runs.length === 0) return [];
  const insights: string[] = [];
  const systemsOf: Record<LabMetricKey, string> = {
    heartRate: "循环系统",
    breathRate: "呼吸系统",
    coreTemp: "体温调节",
    sweatRate: "体温调节"
  };

  // 1) 单因素 → 多系统
  for (const run of runs) {
    const stats = runStats(run);
    const affected = (Object.keys(stats) as LabMetricKey[]).filter(
      (key) => Math.abs(stats[key].peakDelta) >= AFFECT_THRESHOLD[key]
    );
    if (affected.length >= 2) {
      const names = affected.map((key) => metricDefOf(key).label);
      const systems = [...new Set(affected.map((key) => systemsOf[key]))];
      insights.push(
        `「实验 ${run.slot}」中 ${names.join("、")} 同时偏离基线，分属 ${systems.join("、")}——一个条件可以同时牵动多个系统。`
      );
    }
  }

  // 2) 运动 × 高温的协同（模型里显式的乘积项）
  for (const run of runs) {
    const c = run.conditions;
    if (c.exercise >= 40 && c.ambientC >= 30) {
      insights.push(
        `「实验 ${run.slot}」同时包含高强度运动与高温，出汗与心率的峰值被进一步放大——模型用乘积项假设了这种协同效应，真实机制要复杂得多。`
      );
    }
  }

  // 3) 恢复速度差异 / 尚未恢复
  for (const run of runs) {
    const stats = runStats(run);
    const recovered = (Object.keys(stats) as LabMetricKey[]).filter(
      (key) => stats[key].recoveredAt !== null
    );
    const notYet = (Object.keys(stats) as LabMetricKey[]).filter(
      (key) => stats[key].recoveredAt === null && Math.abs(stats[key].endDelta) > RECOVERY_TOL[key]
    );
    if (recovered.length >= 2) {
      const slowest = recovered.reduce((p, key) =>
        (stats[key].recoveredAt ?? 0) > (stats[p].recoveredAt ?? 0) ? key : p
      );
      const fastest = recovered.reduce((p, key) =>
        (stats[key].recoveredAt ?? 0) < (stats[p].recoveredAt ?? 0) ? key : p
      );
      if (slowest !== fastest) {
        insights.push(
          `「实验 ${run.slot}」恢复阶段，${metricDefOf(slowest).label}回到基线（约 ${formatSimClock(stats[slowest].recoveredAt ?? 0)}）明显慢于${metricDefOf(fastest).label}（约 ${formatSimClock(stats[fastest].recoveredAt ?? 0)}）——不同系统的调节时程不同。`
        );
      }
    }
    if (notYet.length > 0) {
      insights.push(
        `到「实验 ${run.slot}」记录结束时，${notYet.map((key) => metricDefOf(key).label).join("、")}仍未回到基线容差内，可继续播放时间轴观察恢复。`
      );
    }
  }

  // 4) 两次实验的峰值对比（放在最后，仅在有两条 A/B 时出现）
  if (runs.length === 2) {
    const [a, b] = runs.map(runStats);
    const candidates = (Object.keys(a) as LabMetricKey[])
      .filter((key) =>
        Math.abs(a[key].peakDelta) >= AFFECT_THRESHOLD[key] &&
        Math.abs(b[key].peakDelta) >= AFFECT_THRESHOLD[key]
      )
      .sort((x, y) => Math.abs(b[y].peakDelta) / (Math.abs(a[y].peakDelta) || 1) - Math.abs(b[x].peakDelta) / (Math.abs(a[x].peakDelta) || 1));
    const key = candidates[0];
    if (key) {
      const def = metricDefOf(key);
      insights.push(
        `对比两次实验，${def.label}的峰值变化：实验 A 为 ${def.formatDelta(a[key].peakDelta)} ${def.unit}，实验 B 为 ${def.formatDelta(b[key].peakDelta)} ${def.unit}。`
      );
    }
  }

  return insights.slice(0, 5);
}
