import type { EcosystemDetail } from "../../api";

/**
 * 生态系统种群动态模型。
 *
 * 模型完全由数据库中预设的生态关系（energy / decomposition 边）构建：
 * - 生产者：逻辑斯蒂增长  r·x·(1 − x/K)，并被取食；
 * - 消费者：自然死亡（线性 + 密度制约二次项），通过 Holling II 型功能反应
 *   从猎物获取能量  e·a·x_prey/(1 + Σ a·h·x_prey)·x_pred；
 * - 分解者：以「死亡有机物流」为资源（供体控制）——消费者的死亡与生产者凋落物
 *   按分解链接的份额流向分解者，不消耗活体生物量；
 * - 参数标定：先给定每个物种的目标密度 x*（生产者 0.6K，消费者按营养级递减），
 *   再沿捕食 DAG 自顶向下反解攻击率 a 与生产者增长率 r，
 *   使「摄食 = 死亡 + 被捕食」在目标密度处精确成立——目标密度即系统平衡点。
 *   因此对照组曲线平稳，干预后的变化全部来自方程本身的动态，而非随机数。
 *
 * 数值积分：经典四阶 Runge–Kutta，固定步长；种群低于灭绝阈值时判定为功能性灭绝。
 */

export type InterventionType = "adjust" | "remove" | "reintroduce" | "restore";

export interface Intervention {
  type: InterventionType;
  /** 目标物种 slug（restore 不需要） */
  species?: string;
  /** adjust / reintroduce 的目标数量 */
  value?: number;
  /** restore 的恢复强度（生产者容纳量放大倍数） */
  factor?: number;
  /** 发生时间（年） */
  time: number;
}

export interface SimSpeciesParams {
  id: string;
  name: string;
  role: "producer" | "consumer" | "decomposer";
  trophicLevel: number;
  /** 生产者：内禀增长率 / 环境容纳量 */
  r: number;
  K: number;
  /** 消费者 / 分解者：线性死亡率 + 种内密度制约（领域性等，保证对照组稳定） */
  m: number;
  q: number;
  /** 初始种群数量（即标定平衡点） */
  x0: number;
  /** 在食物网中是否有食物来源（无来源的物种将逐渐消亡） */
  hasFood: boolean;
}

export interface SimFoodLink {
  /** 捕食者 / 分解者索引 */
  pred: number;
  /** 食物 / 分解对象索引 */
  prey: number;
  /** energy：攻击率；decomposition：死亡流份额系数 */
  a: number;
  kind: "energy" | "decomposition";
}

export interface SimModel {
  species: SimSpeciesParams[];
  links: SimFoodLink[];
  /** 能量转化效率 */
  e: number;
  /** 功能反应处理时间（决定捕食饱和） */
  h: number;
}

export interface SimEvent {
  time: number;
  kind: "intervention" | "extinction";
  label: string;
  species?: string;
}

export interface SimulationResult {
  times: number[];
  /** series[speciesIndex][timeIndex] */
  series: number[][];
  events: SimEvent[];
}

/* ---------------- 标定常量 ---------------- */

const E = 0.35; // 能量转化效率
const H = 0.1; // 功能反应处理时间（捕食饱和，是系统稳定的关键）
const PRODUCER_K = 3600; // 生产者环境容纳量（足够大，使反解的增长率落在可行区间）
const PRODUCER_FILL = 0.6; // 平衡点占容纳量比例
const EXTINCTION_THRESHOLD = 0.2; // 功能性灭绝阈值（个体数）
/** 消费者死亡率中「密度依赖」所占比例：二次自限项，抑制捕食-猎物振荡发散 */
const DENSITY_DEPENDENT_SHARE = 0.6;
/** 生产者净生产中成为凋落物（可被分解者利用）的比例 */
const LITTER_SHARE = 0.5;

/** 消费者死亡率：营养级越高，周转越慢 */
const CONSUMER_MORTALITY = (level: number) =>
  ({ 2: 0.5, 3: 0.4, 4: 0.32 }[level] ?? 0.28);

/** 消费者目标密度：沿营养级指数递减（能量金字塔） */
const CONSUMER_TARGET = (level: number) =>
  ({ 2: 150, 3: 60, 4: 25 }[level] ?? 10);

const DECOMPOSER_M = 0.3;
const DECOMPOSER_TARGET = 150;

/** 生产者增长率的可行区间（反解结果超出时截断，系统会自行再平衡） */
const R_MIN = 0.1;
const R_MAX = 4.0;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/**
 * 从生态系统详情（物种 + 关系）构建种群动态模型。
 * - energy 边：活体捕食（Holling II），减少猎物；
 * - decomposition 边：分解死亡有机物（供体控制），不消耗活体。
 */
export function buildModel(detail: EcosystemDetail): SimModel {
  const nodes = detail.nodes.filter((node) => node.kind === "species");
  const indexOf = new Map(nodes.map((node, index) => [node.id, index]));
  const idx = (id: string) => Number(indexOf.get(id));

  const inWeb = (link: { from: string; to: string }) => indexOf.has(link.from) && indexOf.has(link.to);
  const energyRaw = detail.links.filter((link) => link.type === "energy" && inWeb(link));
  const decayRaw = detail.links.filter((link) => link.type === "decomposition" && inWeb(link));

  // 1) 每个物种的目标密度与死亡率 / 容纳量
  const species: SimSpeciesParams[] = nodes.map((node) => {
    const base = {
      id: node.id,
      name: node.name,
      trophicLevel: node.trophic_level ?? 1,
      hasFood: true
    };
    if (node.role === "producer") {
      return {
        ...base,
        role: "producer" as const,
        K: PRODUCER_K,
        x0: PRODUCER_K * PRODUCER_FILL,
        r: 0.6,
        m: 0,
        q: 0
      };
    }
    // 死亡拆分为线性部分 + 二次密度制约部分，平衡点不变但获得阻尼
    const split = (mTotal: number, x0: number) => ({
      m: mTotal * (1 - DENSITY_DEPENDENT_SHARE),
      q: (mTotal * DENSITY_DEPENDENT_SHARE) / x0
    });
    if (node.role === "decomposer") {
      return {
        ...base,
        role: "decomposer" as const,
        x0: DECOMPOSER_TARGET,
        r: 0,
        K: 0,
        ...split(DECOMPOSER_M, DECOMPOSER_TARGET)
      };
    }
    const level = clamp(Math.round(node.trophic_level ?? 2), 2, 5);
    const x0 = CONSUMER_TARGET(level);
    return {
      ...base,
      role: "consumer" as const,
      trophicLevel: level,
      x0,
      r: 0,
      K: 0,
      ...split(CONSUMER_MORTALITY(level), x0)
    };
  });

  const n = species.length;
  const energySourcesOf = species.map((sp, i) =>
    sp.role === "producer" ? [] : energyRaw.filter((link) => idx(link.to) === i)
  );
  const decaySourcesOf = species.map((sp, i) =>
    sp.role === "producer" ? [] : decayRaw.filter((link) => idx(link.to) === i)
  );
  species.forEach((sp, i) => {
    if (sp.role !== "producer" && energySourcesOf[i].length + decaySourcesOf[i].length === 0) {
      species[i] = { ...sp, hasFood: false };
    }
  });

  // 捕食压力只来自 energy 边（分解不消耗活体）
  const predatorsOf: number[][] = species.map(() => []);
  energyRaw.forEach((link) => {
    predatorsOf[idx(link.from)].push(idx(link.to));
  });

  // 高度 = 到食物网顶点的最长路径（无天敌者为 0），环退化按 0 处理
  const height = new Array<number>(n).fill(-1);
  const heightOf = (i: number, seen: Set<number>): number => {
    if (height[i] >= 0) return height[i];
    if (seen.has(i)) return 0;
    const next = new Set(seen).add(i);
    const h = predatorsOf[i].length
      ? 1 + Math.max(...predatorsOf[i].map((p) => heightOf(p, next)))
      : 0;
    height[i] = h;
    return h;
  };
  species.forEach((_, i) => heightOf(i, new Set()));

  const mTotalOf = species.map((sp) => sp.m + sp.q * sp.x0);
  // 死亡流的预估值（生产者 r 尚未反解，先用默认值估算，仅用于食性拆分权重）
  const deathFlowEst = species.map((sp, i) =>
    sp.role === "producer"
      ? LITTER_SHARE * 0.6 * sp.x0 * (1 - sp.x0 / sp.K)
      : mTotalOf[i] * sp.x0
  );

  // 每个物种的能量需求在「活体捕食」与「分解死亡流」两类来源间按容量拆分
  const energyCapacityOf = energySourcesOf.map((sources) =>
    sources.reduce((sum, link) => sum + species[idx(link.from)].x0, 0)
  );
  const decayCapacityOf = decaySourcesOf.map((sources) =>
    sources.reduce((sum, link) => sum + deathFlowEst[idx(link.from)], 0)
  );
  const energyShareOf = species.map((_, i) => {
    const total = energyCapacityOf[i] + decayCapacityOf[i];
    return total > 0 ? energyCapacityOf[i] / total : 0;
  });

  // 2) 反解攻击率：每个消费者的摄食需平衡「自身死亡 + 被天敌捕食」两部分损失。
  //    捕食关系构成 DAG（能量沿营养级单向流动），按高度自顶向下一次传递即得精确解：
  //    平衡式 e·U/(1+h·U) = (m_total + L/x*)·w_energy，其中 U = Σ a·x*_prey。
  const intakeU = new Array<number>(n).fill(0);
  const attackA = new Array<number>(n).fill(0);
  const outflowOf = new Array<number>(n).fill(0);
  const lossFlowOf = new Array<number>(n).fill(0); // 被天敌捕食的流量（尸体残渣进入死亡流）
  const order = species.map((_, i) => i).sort((a, b) => height[a] - height[b]);

  for (const i of order) {
    const sp = species[i];
    if (sp.role === "producer") continue;
    // 单位个体被捕食速率：所有天敌的攻击率已在前面求出
    const lossRate = predatorsOf[i].reduce((sum, p) => {
      const D = 1 + H * intakeU[p];
      return sum + (attackA[p] * species[p].x0) / D;
    }, 0);
    const outflow = mTotalOf[i] + lossRate;
    outflowOf[i] = outflow;
    lossFlowOf[i] = lossRate * sp.x0;
    if (energySourcesOf[i].length === 0) continue;
    const required = outflow * energyShareOf[i];
    // 可行性保护：摄食速率无法超过 e/h 的饱和上限
    const U = required >= E / H ? 1e4 : required / (E - required * H);
    intakeU[i] = U;
    attackA[i] = energyCapacityOf[i] > 0 ? U / energyCapacityOf[i] : 0;
  }

  // 3) 反解生产者增长率：使目标密度下 增长 = 被活体取食总量
  const consumedOf = new Array<number>(n).fill(0);
  species.forEach((sp, i) => {
    if (sp.role !== "producer") return;
    const consumed = energyRaw.reduce((sum, link) => {
      if (idx(link.from) !== i) return sum;
      const pred = idx(link.to);
      const D = 1 + H * intakeU[pred];
      return sum + (attackA[pred] * sp.x0 * species[pred].x0) / D;
    }, 0);
    consumedOf[i] = consumed;
    if (consumed <= 0) return; // 没有被取食：保留默认增长率，自由长向 K
    const growth = sp.x0 * (1 - sp.x0 / sp.K);
    species[i] = { ...sp, r: clamp(consumed / growth, R_MIN, R_MAX) };
  });

  // 4) 分解链接的份额系数：分解者的剩余需求 ÷ 可获得的死亡流
  //    死亡流：消费者/分解者的死亡与被捕食浪费（1−e 部分），
  //    生产者的凋落物份额与啃食浪费
  const deathFlowOf = species.map((sp, i) => {
    if (sp.role === "producer") {
      return LITTER_SHARE * sp.r * sp.x0 * (1 - sp.x0 / sp.K) + (1 - E) * consumedOf[i];
    }
    return mTotalOf[i] * sp.x0 + (1 - E) * lossFlowOf[i];
  });

  const links: SimFoodLink[] = [];
  species.forEach((sp, i) => {
    if (sp.role === "producer") return;
    energySourcesOf[i].forEach((link) => {
      links.push({ pred: i, prey: idx(link.from), a: attackA[i], kind: "energy" });
    });
    if (decaySourcesOf[i].length === 0) return;
    const required = outflowOf[i] * (1 - energyShareOf[i]); // 单位个体所需的分解摄食
    const available = decaySourcesOf[i].reduce((sum, link) => sum + deathFlowOf[idx(link.from)], 0);
    // 份额超过 1 表示死亡流供不应求：截断，分解者会自行下降到可维持的水平
    const share = available > 0 ? Math.min(1, (required * sp.x0) / (E * available)) : 0;
    decaySourcesOf[i].forEach((link) => {
      links.push({ pred: i, prey: idx(link.from), a: share, kind: "decomposition" });
    });
  });

  return { species, links, e: E, h: H };
}

/** 干预的文字描述 */
export function interventionLabel(iv: Intervention, nameOf: (id: string) => string): string {
  switch (iv.type) {
    case "remove":
      return `第 ${iv.time} 年 · 移除 ${nameOf(iv.species ?? "")}`;
    case "adjust":
      return `第 ${iv.time} 年 · 调整 ${nameOf(iv.species ?? "")} → ${Math.round(iv.value ?? 0)}`;
    case "reintroduce":
      return `第 ${iv.time} 年 · 重新引入 ${nameOf(iv.species ?? "")}（${Math.round(iv.value ?? 0)} 只）`;
    case "restore":
      return `第 ${iv.time} 年 · 恢复环境（容纳量 ×${iv.factor ?? 1.5}）`;
  }
}

/**
 * 运行模拟：分段 RK4 积分，在干预时间点应用事件。
 * 全程确定性计算——相同的模型与干预必然得到相同结果。
 */
export function simulate(
  model: SimModel,
  interventions: Intervention[],
  years: number,
  dt = 0.02,
  sampleEvery = 0.1
): SimulationResult {
  const n = model.species.length;
  const indexOf = new Map(model.species.map((sp, i) => [sp.id, i]));

  // 每次模拟独立的可变参数（恢复环境会修改生产者 K / r）
  const K = model.species.map((sp) => sp.K);
  const r = model.species.map((sp) => sp.r);
  const removed = new Array<boolean>(n).fill(false);
  const x = model.species.map((sp) => sp.x0);

  const events: SimEvent[] = [];
  const pending = [...interventions].sort((a, b) => a.time - b.time);

  const D = new Array<number>(n).fill(1);
  const death = new Array<number>(n).fill(0);
  const energyFlows = new Array<number>(model.links.length).fill(0);
  const deriv = (xs: number[], dx: number[]) => {
    dx.fill(0);
    death.fill(0);
    energyFlows.fill(0);
    for (let i = 0; i < n; i += 1) D[i] = 1;
    // 活体捕食的功能反应分母（只含 energy 边）
    for (const link of model.links) {
      if (link.kind !== "energy" || removed[link.pred] || removed[link.prey]) continue;
      D[link.pred] += link.a * model.h * xs[link.prey];
    }
    // 活体捕食流：减少猎物、供养捕食者
    model.links.forEach((link, li) => {
      if (link.kind !== "energy" || removed[link.pred] || removed[link.prey]) return;
      const flow = (link.a * xs[link.prey]) / D[link.pred] * xs[link.pred];
      energyFlows[li] = flow;
      dx[link.prey] -= flow;
      dx[link.pred] += model.e * flow;
    });
    // 生长与死亡：生产者逻辑斯蒂增长（净生产的一部分成为凋落物），
    // 消费者 / 分解者死亡（尸体进入死亡流）
    for (let i = 0; i < n; i += 1) {
      if (removed[i]) continue;
      const sp = model.species[i];
      if (sp.role === "producer") {
        const growth = r[i] * xs[i] * (1 - xs[i] / K[i]);
        dx[i] += growth;
        death[i] = LITTER_SHARE * Math.max(0, growth);
      } else {
        const loss = sp.m * xs[i] + sp.q * xs[i] * xs[i];
        dx[i] -= loss;
        death[i] = loss;
      }
    }
    // 捕食浪费（未同化的 1−e 部分：尸体残渣、排泄物）同样进入死亡流
    model.links.forEach((link, li) => {
      if (link.kind !== "energy" || removed[link.prey]) return;
      death[link.prey] += (1 - model.e) * energyFlows[li];
    });
    // 分解流：死亡有机物按份额流向分解者（供体控制，不消耗活体）
    for (const link of model.links) {
      if (link.kind !== "decomposition" || removed[link.pred] || removed[link.prey]) continue;
      dx[link.pred] += model.e * link.a * death[link.prey];
    }
  };

  const k1 = new Array<number>(n).fill(0);
  const k2 = new Array<number>(n).fill(0);
  const k3 = new Array<number>(n).fill(0);
  const k4 = new Array<number>(n).fill(0);
  const tmp = new Array<number>(n).fill(0);
  const rk4Step = (h: number) => {
    deriv(x, k1);
    for (let i = 0; i < n; i += 1) tmp[i] = x[i] + (h / 2) * k1[i];
    deriv(tmp, k2);
    for (let i = 0; i < n; i += 1) tmp[i] = x[i] + (h / 2) * k2[i];
    deriv(tmp, k3);
    for (let i = 0; i < n; i += 1) tmp[i] = x[i] + h * k3[i];
    deriv(tmp, k4);
    for (let i = 0; i < n; i += 1) x[i] += (h / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]);
  };

  const times: number[] = [];
  const series: number[][] = model.species.map(() => []);
  const push = (t: number) => {
    times.push(t);
    for (let i = 0; i < n; i += 1) series[i].push(x[i]);
  };

  let t = 0;
  const markExtinctions = () => {
    for (let i = 0; i < n; i += 1) {
      if (!removed[i] && x[i] < EXTINCTION_THRESHOLD) {
        x[i] = 0;
        removed[i] = true;
        events.push({
          time: Math.round(t * 100) / 100,
          kind: "extinction",
          label: `${model.species[i].name} 功能性灭绝`,
          species: model.species[i].id
        });
      }
    }
  };

  const applyIntervention = (iv: Intervention) => {
    const nameOf = (id: string) => model.species.find((sp) => sp.id === id)?.name ?? id;
    if (iv.type === "restore") {
      const factor = iv.factor ?? 1.5;
      for (let i = 0; i < n; i += 1) {
        if (model.species[i].role !== "producer") continue;
        K[i] *= factor;
        r[i] *= 1 + (factor - 1) * 0.5;
      }
      events.push({ time: t, kind: "intervention", label: interventionLabel(iv, nameOf) });
      return;
    }
    const idx = indexOf.get(iv.species ?? "");
    if (idx === undefined) return;
    if (iv.type === "remove") {
      x[idx] = 0;
      removed[idx] = true;
    } else if (iv.type === "adjust") {
      x[idx] = Math.max(0, iv.value ?? 0);
      removed[idx] = x[idx] <= 0;
    } else if (iv.type === "reintroduce") {
      removed[idx] = false;
      x[idx] = Math.max(EXTINCTION_THRESHOLD * 2, iv.value ?? model.species[idx].x0);
    }
    events.push({ time: t, kind: "intervention", label: interventionLabel(iv, nameOf), species: iv.species });
  };

  push(0);
  let nextSample = sampleEvery;
  let ei = 0;
  while (t < years - 1e-9) {
    const tNext = ei < pending.length ? Math.min(years, pending[ei].time) : years;
    while (t < tNext - 1e-9) {
      const h = Math.min(dt, tNext - t);
      rk4Step(h);
      t += h;
      for (let i = 0; i < n; i += 1) if (x[i] < 0) x[i] = 0;
      markExtinctions();
      if (t >= nextSample - 1e-9) {
        push(Math.round(t * 1000) / 1000);
        nextSample += sampleEvery;
      }
    }
    // 应用该时间点的全部干预，并补采一个「干预后」样本，让图上出现瞬时跳变
    let applied = false;
    while (ei < pending.length && pending[ei].time <= t + 1e-9) {
      applyIntervention(pending[ei]);
      ei += 1;
      applied = true;
    }
    if (applied && times[times.length - 1] === Math.round(t * 1000) / 1000) {
      push(Math.round(t * 1000) / 1000);
    }
  }

  return { times, series, events };
}

/* ---------------- 影响分析 ---------------- */

export interface SpeciesImpact {
  id: string;
  name: string;
  role: SimSpeciesParams["role"];
  baselineFinal: number;
  scenarioFinal: number;
  baselineAvg: number;
  scenarioAvg: number;
  /** 干预后时段平均数量的相对变化（-1 = 完全消失） */
  relAvg: number;
  /** 期末数量的相对变化 */
  relFinal: number;
  extinct: boolean;
  /** 是否为干预直接作用的物种 */
  targeted: boolean;
}

const mean = (values: number[]) =>
  values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : 0;

/** 对比某个方案与对照组，按受影响程度（干预后平均数量的相对变化）排序 */
export function analyzeImpact(
  model: SimModel,
  baseline: SimulationResult,
  result: SimulationResult,
  interventions: Intervention[]
): SpeciesImpact[] {
  const since = interventions.length ? Math.min(...interventions.map((iv) => iv.time)) : 0;
  const startIndex = Math.max(0, baseline.times.findIndex((t) => t >= since));
  const targetedIds = new Set(
    interventions.filter((iv) => iv.type !== "restore" && iv.species).map((iv) => iv.species as string)
  );

  return model.species
    .map((sp, i) => {
      const baseSeries = baseline.series[i];
      const scenSeries = result.series[i];
      const baselineAvg = mean(baseSeries.slice(startIndex));
      const scenarioAvg = mean(scenSeries.slice(startIndex));
      const baselineFinal = baseSeries[baseSeries.length - 1];
      const scenarioFinal = scenSeries[scenSeries.length - 1];
      return {
        id: sp.id,
        name: sp.name,
        role: sp.role,
        baselineFinal,
        scenarioFinal,
        baselineAvg,
        scenarioAvg,
        relAvg: baselineAvg > 1e-6 ? (scenarioAvg - baselineAvg) / baselineAvg : 0,
        relFinal: baselineFinal > 1e-6 ? (scenarioFinal - baselineFinal) / baselineFinal : 0,
        extinct: scenarioFinal < EXTINCTION_THRESHOLD,
        targeted: targetedIds.has(sp.id)
      };
    })
    .sort((a, b) => Math.abs(b.relAvg) - Math.abs(a.relAvg));
}

/** 某个时间点对应的样本索引（用于时间游标联动） */
export function indexAtTime(result: SimulationResult, t: number): number {
  let lo = 0;
  let hi = result.times.length - 1;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (result.times[mid] < t) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/**
 * 计算基础状态下（无移除、未恢复环境）的导数。
 * 主要用于校验标定结果：平衡点处导数应接近 0。
 */
export function baseDerivatives(model: SimModel, x: number[]): number[] {
  const n = model.species.length;
  const D = new Array<number>(n).fill(1);
  const death = new Array<number>(n).fill(0);
  const dx = new Array<number>(n).fill(0);
  const energyFlows = new Array<number>(model.links.length).fill(0);
  for (const link of model.links) {
    if (link.kind === "energy") D[link.pred] += link.a * model.h * x[link.prey];
  }
  model.links.forEach((link, li) => {
    if (link.kind !== "energy") return;
    const flow = (link.a * x[link.prey]) / D[link.pred] * x[link.pred];
    energyFlows[li] = flow;
    dx[link.prey] -= flow;
    dx[link.pred] += model.e * flow;
  });
  for (let i = 0; i < n; i += 1) {
    const sp = model.species[i];
    if (sp.role === "producer") {
      const growth = sp.r * x[i] * (1 - x[i] / sp.K);
      dx[i] += growth;
      death[i] = LITTER_SHARE * Math.max(0, growth);
    } else {
      const loss = sp.m * x[i] + sp.q * x[i] * x[i];
      dx[i] -= loss;
      death[i] = loss;
    }
  }
  model.links.forEach((link, li) => {
    if (link.kind === "energy") death[link.prey] += (1 - model.e) * energyFlows[li];
  });
  for (const link of model.links) {
    if (link.kind === "decomposition") dx[link.pred] += model.e * link.a * death[link.prey];
  }
  return dx;
}

export const MODEL_CONSTANTS = {
  EXTINCTION_THRESHOLD,
  PRODUCER_K
};
