import type { CellTypeId } from "./types.js";

/**
 * 虚拟实验室的简化教学模型。
 *
 * 这些函数不是真实生物学的精确模拟：它们只保留每个过程的
 * 核心方向性规律（水往低水势走、酶有最适温度、光合减去呼吸），
 * 用简单的解析式生成平滑、确定性的时间序列，供教学演示使用。
 */

export interface LabEvent {
  time: number;
  text: string;
}

export interface LabRunResult {
  /** 采样时刻（虚拟时间，与实验 duration 同单位） */
  times: number[];
  /** 每个观察变量一条取值序列（与 times 等长） */
  series: Record<string, number[]>;
  /** 关键时刻的生物学事件 */
  events: LabEvent[];
  summary: {
    status: "normal" | "active" | "stressed" | "damaged";
    statusLabel: string;
    findings: string[];
  };
}

const SAMPLES = 61;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const round2 = (value: number) => Math.round(value * 100) / 100;

/** 生成等距时间轴 */
const timeAxis = (duration: number) =>
  Array.from({ length: SAMPLES }, (_, i) => round2((i / (SAMPLES - 1)) * duration));

/** 在序列上找到 value 首次越过 threshold 的时刻（线性插值），未越过返回 null */
const crossingTime = (times: number[], values: number[], threshold: number): number | null => {
  for (let i = 1; i < values.length; i++) {
    const a = values[i - 1];
    const b = values[i];
    if ((a - threshold) * (b - threshold) <= 0 && a !== b) {
      const ratio = (threshold - a) / (b - a);
      return round2(times[i - 1] + ratio * (times[i] - times[i - 1]));
    }
  }
  return null;
};

/* ================= 渗透作用 ================= */

/** 各细胞类型的细胞液（细胞质）教学浓度 mol/L */
const INTERNAL_CONC: Record<CellTypeId, number> = {
  animal: 0.3,
  plant: 0.55,
  prokaryote: 0.45
};

const runOsmosis = (cellId: CellTypeId, params: Record<string, number>): LabRunResult => {
  const duration = 10;
  const times = timeAxis(duration);
  const internal = INTERNAL_CONC[cellId];
  const external = clamp(params.externalConc ?? 0.15, 0, 1);
  const hasWall = cellId !== "animal";
  const tau = cellId === "plant" ? 1.8 : cellId === "prokaryote" ? 1.2 : 1.4;

  const events: LabEvent[] = [];
  const findings: string[] = [];
  const fmt = (v: number) => v.toFixed(2);

  const relation =
    Math.abs(external - internal) <= 0.05 ? "iso" : external < internal ? "hypo" : "hyper";

  if (relation === "hypo") {
    events.push({ time: 0.1, text: "外界为低渗溶液：水分子净进入细胞" });
  } else if (relation === "hyper") {
    events.push({ time: 0.1, text: "外界为高渗溶液：水分子净流出细胞" });
  } else {
    events.push({ time: 0.1, text: "外界与细胞内接近等渗：水分子进出动态平衡" });
  }

  /* 平衡态目标值 */
  let volumeEq: number;
  let turgorEq: number; // 动物细胞：无意义（0）；有壁细胞：膨压或质壁分离程度 %
  if (!hasWall) {
    volumeEq = clamp(internal / Math.max(external, 0.02), 0.4, 1.6);
    turgorEq = 0;
  } else if (relation === "hyper") {
    volumeEq = clamp(internal / external, 0.5, 1); // 原生质体收缩
    turgorEq = (1 - volumeEq) * 100; // 质壁分离程度
  } else {
    volumeEq = 1; // 细胞壁限制，原生质体贴壁
    turgorEq = clamp(((internal - external) / internal) * 100, 0, 100); // 膨压
  }

  /* 动物细胞涨破阈值 */
  const RUPTURE_VOLUME = 1.35;
  const willRupture = !hasWall && volumeEq > RUPTURE_VOLUME;
  const ruptureTime = willRupture
    ? -tau * Math.log((RUPTURE_VOLUME - volumeEq) / (1 - volumeEq))
    : null;

  const volume: number[] = [];
  const integrity: number[] = [];
  const turgor: number[] = [];

  for (const t of times) {
    if (!hasWall && ruptureTime !== null && t >= ruptureTime) {
      /* 涨破后：内容物外泄，体积回缩，膜完整性迅速归零 */
      const dt = t - ruptureTime;
      volume.push(round2(RUPTURE_VOLUME - 0.45 * (1 - Math.exp(-dt / 0.8))));
      integrity.push(round2(100 * Math.exp(-dt / 0.25)));
      turgor.push(0);
    } else {
      const v = volumeEq + (1 - volumeEq) * Math.exp(-t / tau);
      volume.push(round2(v));
      integrity.push(100);
      turgor.push(round2(hasWall ? turgorEq * (1 - Math.exp(-t / tau)) : 0));
    }
  }

  if (ruptureTime !== null) {
    events.push({ time: round2(ruptureTime), text: "细胞吸水过多，细胞膜被涨破，内容物外泄" });
  }
  if (hasWall && relation === "hyper") {
    const tPlasmo = crossingTime(times, turgor, 5);
    if (tPlasmo !== null) {
      events.push({ time: tPlasmo, text: "原生质层与细胞壁分离 —— 发生质壁分离" });
    }
  }
  if (hasWall && relation === "hypo") {
    const tTurgor = crossingTime(times, turgor, 60);
    if (tTurgor !== null) {
      events.push({ time: tTurgor, text: "膨压升高，细胞壁限制细胞进一步膨胀" });
    }
  }

  /* 结果解读 */
  let status: LabRunResult["summary"]["status"];
  let statusLabel: string;
  if (!hasWall) {
    if (willRupture) {
      status = "damaged";
      statusLabel = "细胞涨破";
      findings.push(
        `外界浓度 ${fmt(external)} mol/L 远低于细胞质浓度（约 ${fmt(internal)} mol/L），水分子持续净进入细胞。`,
        "动物细胞没有细胞壁保护，吸水膨胀超过膜的承受极限后涨破。",
        "这解释了为什么输液要用与细胞等渗的生理盐水。"
      );
    } else if (volumeEq > 1.1) {
      status = "stressed";
      statusLabel = "吸水膨胀";
      findings.push(
        `外界浓度 ${fmt(external)} mol/L 低于细胞质浓度（约 ${fmt(internal)} mol/L），细胞吸水膨胀。`,
        "若浓度差继续加大，细胞膜可能被涨破。"
      );
    } else if (volumeEq < 0.9) {
      status = "stressed";
      statusLabel = "失水皱缩";
      findings.push(
        `外界浓度 ${fmt(external)} mol/L 高于细胞质浓度（约 ${fmt(internal)} mol/L），细胞失水皱缩。`,
        "失水过多会影响代谢；回到等渗环境可恢复形态。"
      );
    } else {
      status = "normal";
      statusLabel = "形态正常";
      findings.push(
        `外界浓度 ${fmt(external)} mol/L 与细胞质浓度（约 ${fmt(internal)} mol/L）接近，水分子进出动态平衡。`,
        "等渗环境中细胞形态与功能最稳定。"
      );
    }
  } else if (relation === "hyper") {
    status = "stressed";
    statusLabel = "质壁分离";
    findings.push(
      `外界浓度 ${fmt(external)} mol/L 高于细胞液浓度（约 ${fmt(internal)} mol/L），细胞失水。`,
      `原生质体收缩至约 ${Math.round(volumeEq * 100)}%，发生质壁分离（程度约 ${Math.round(turgorEq)}%）。`,
      "细胞壁维持外形不变；及时放回清水，细胞可重新吸水复原。"
    );
  } else if (relation === "hypo") {
    status = "active";
    statusLabel = "吸水坚挺";
    findings.push(
      `外界浓度 ${fmt(external)} mol/L 低于细胞液浓度（约 ${fmt(internal)} mol/L），细胞吸水。`,
      `细胞壁限制过度膨胀，膨压升至约 ${Math.round(turgorEq)}%，细胞保持坚挺。`,
      "植物细胞吸水不会涨破 —— 这正是细胞壁的保护作用。"
    );
  } else {
    status = "normal";
    statusLabel = "动态平衡";
    findings.push(
      `外界浓度 ${fmt(external)} mol/L 与细胞液浓度（约 ${fmt(internal)} mol/L）接近，水分进出平衡。`,
      "细胞形态与膨压保持稳定。"
    );
  }

  return {
    times,
    /* 动物细胞没有膨压概念；有壁细胞不会涨破 —— 只输出有意义的变量 */
    series: hasWall ? { volume, turgor } : { volume, integrity },
    events: events.sort((a, b) => a.time - b.time),
    summary: { status, statusLabel, findings }
  };
};

/* ================= 温度与细胞呼吸 ================= */

/** 各细胞类型的最适温度与酶变性起始温度（教学约定值 °C） */
const RESPIRATION_PROFILE: Record<CellTypeId, { opt: number; denature: number }> = {
  animal: { opt: 37, denature: 42 },
  plant: { opt: 30, denature: 40 },
  prokaryote: { opt: 32, denature: 45 }
};

const runRespiration = (cellId: CellTypeId, params: Record<string, number>): LabRunResult => {
  const duration = 12;
  const times = timeAxis(duration);
  const { opt, denature } = RESPIRATION_PROFILE[cellId];
  const temperature = clamp(params.temperature ?? 25, 0, 50);
  const oxygen = clamp(params.oxygen ?? 21, 0, 30);

  /* 温度系数：最适温度以下按 Q10≈2 上升，以上按高斯曲线急剧下降 */
  const tempFactor =
    temperature <= opt
      ? Math.max(0.04, Math.pow(2, (temperature - opt) / 10))
      : Math.exp(-Math.pow((temperature - opt) / 7, 2));

  /* 氧饱和度（米氏型曲线，Km ≈ 3%） */
  const oxygenFactor = oxygen / (3 + oxygen);

  /* 高温下酶随时间变性失活 */
  const denatureRate = temperature > denature ? 0.09 * (temperature - denature) : 0;

  const enzyme: number[] = [];
  const atpRate: number[] = [];
  const o2Rate: number[] = [];
  for (const t of times) {
    const activity = denatureRate > 0 ? 100 * Math.exp(-denatureRate * t) : 100;
    const rate = 1.15 * tempFactor * oxygenFactor * (activity / 100);
    enzyme.push(round2(activity));
    atpRate.push(round2(rate));
    o2Rate.push(round2(rate * 0.9));
  }

  const events: LabEvent[] = [];
  if (temperature <= 5) {
    events.push({ time: 0.1, text: "低温抑制：酶活性很低，呼吸速率显著下降" });
  } else if (Math.abs(temperature - opt) <= 3) {
    events.push({ time: 0.1, text: `温度接近最适（约 ${opt}°C），酶促反应高效进行` });
  } else if (temperature > denature) {
    events.push({ time: 0.1, text: `超过酶耐受温度（约 ${denature}°C），酶开始变性失活` });
  }
  if (oxygen < 4) {
    events.push({ time: 0.2, text: "氧气不足：有氧呼吸受限制，细胞供能紧张" });
  }
  const tHalf = crossingTime(times, enzyme, 50);
  if (tHalf !== null) {
    events.push({ time: tHalf, text: "酶活性降至 50% 以下，细胞能量供应严重不足" });
  }

  const finalRate = atpRate[atpRate.length - 1];
  const finalEnzyme = enzyme[enzyme.length - 1];
  const findings: string[] = [];
  let status: LabRunResult["summary"]["status"];
  let statusLabel: string;

  if (finalEnzyme < 50) {
    status = "damaged";
    statusLabel = "高温损伤";
    findings.push(
      `${temperature}°C 超过该类细胞酶的耐受温度，酶逐渐变性且难以恢复。`,
      "酶活性随时间持续下降，ATP 供应崩溃 —— 高温损伤通常不可逆。"
    );
  } else if (finalRate < 0.25) {
    status = "stressed";
    statusLabel = "代谢受抑";
    findings.push(
      temperature < opt - 8
        ? `${temperature}°C 的低温暂时抑制了酶活性（Q10 效应），回暖后活性可恢复。`
        : `氧气浓度 ${oxygen}% 过低，有氧呼吸第三阶段受限。`,
      "细胞供能不足，可短暂依靠无氧呼吸维持，但效率很低。"
    );
  } else if (finalRate > 0.85) {
    status = "active";
    statusLabel = "代谢旺盛";
    findings.push(
      `温度 ${temperature}°C 接近最适（约 ${opt}°C），氧气 ${oxygen}% 供应充足。`,
      "呼吸速率高，ATP 供应充沛。"
    );
  } else {
    status = "normal";
    statusLabel = "代谢正常";
    findings.push(
      `温度 ${temperature}°C、氧气 ${oxygen}% 条件下呼吸速率处于中等水平。`,
      `该细胞的最适温度约为 ${opt}°C，偏离最适都会降低酶促反应效率。`
    );
  }

  return {
    times,
    series: { atpRate, enzyme, o2Rate },
    events: events.sort((a, b) => a.time - b.time),
    summary: { status, statusLabel, findings }
  };
};

/* ================= 光照与光合作用 ================= */

const runPhotosynthesis = (params: Record<string, number>): LabRunResult => {
  const duration = 10;
  const times = timeAxis(duration);
  const light = clamp(params.light ?? 600, 0, 2000);
  const co2 = clamp(params.co2 ?? 0.04, 0, 0.1);

  const P_MAX = 30; // 最大总光合速率（教学相对值）
  const RESPIRATION = 3; // 呼吸速率（恒定）
  const lightFactor = light / (light + 300);
  const co2Factor = co2 / (co2 + 0.02);
  const grossSteady = P_MAX * lightFactor * co2Factor;

  const grossPhoto: number[] = [];
  const netPhoto: number[] = [];
  const cumO2: number[] = [];
  let cum = 0;
  let prevNet = 0;
  let prevT = 0;
  for (const t of times) {
    /* 光合机构启动需要短暂的诱导期 */
    const gross = grossSteady * (1 - Math.exp(-t / 0.8));
    const net = gross - RESPIRATION;
    cum += ((net + prevNet) / 2) * (t - prevT);
    grossPhoto.push(round2(gross));
    netPhoto.push(round2(net));
    cumO2.push(round2(cum));
    prevNet = net;
    prevT = t;
  }

  const netSteady = grossSteady - RESPIRATION;
  const events: LabEvent[] = [];
  if (Math.abs(netSteady) < 0.5) {
    events.push({ time: 0.1, text: "接近光补偿点：光合速率 ≈ 呼吸速率，O₂ 几乎无净释放" });
  } else if (netSteady > 0) {
    events.push({ time: 0.1, text: "净光合速率 > 0：细胞释放 O₂，积累有机物" });
  } else {
    events.push({ time: 0.1, text: "光合小于呼吸：细胞净消耗 O₂，动用有机物储备" });
  }
  if (light >= 1400 && co2Factor < 0.9) {
    events.push({ time: 0.2, text: "接近光饱和：继续增大光照，速率提升有限" });
  }

  const limiting = co2Factor < lightFactor ? "CO₂ 浓度" : "光照强度";
  const findings: string[] = [];
  let status: LabRunResult["summary"]["status"];
  let statusLabel: string;
  if (netSteady > 0.5) {
    status = "active";
    statusLabel = "有机物积累";
    findings.push(
      `稳态净光合速率约 ${netSteady.toFixed(1)}（相对值），O₂ 持续净释放。`,
      `当前主要限制因素是${limiting} —— 提高它才能进一步提升速率。`
    );
  } else if (netSteady < -0.5) {
    status = "stressed";
    statusLabel = "入不敷出";
    findings.push(
      `净光合速率约 ${netSteady.toFixed(1)}（相对值）：呼吸消耗超过光合产出。`,
      light < 200
        ? "光照太弱是主要原因 —— 提高光照强度可越过光补偿点。"
        : "CO₂ 供应不足限制了暗反应 —— 适当提高 CO₂ 浓度可改善。",
      "长期处于该状态，植物会消耗储备、生长停滞。"
    );
  } else {
    status = "normal";
    statusLabel = "补偿点附近";
    findings.push(
      "光合产出与呼吸消耗大致相抵，O₂ 几乎没有净释放。",
      "这就是“光补偿点”附近的状态：植物能存活但难以积累有机物。"
    );
  }

  return {
    times,
    series: { netPhoto, grossPhoto, cumO2 },
    events: events.sort((a, b) => a.time - b.time),
    summary: { status, statusLabel, findings }
  };
};

/** 运行一次虚拟实验：根据实验类型分派到对应的教学模型 */
export const runLabSimulation = (
  experimentId: string,
  cellId: CellTypeId,
  params: Record<string, number>
): LabRunResult => {
  switch (experimentId) {
    case "osmosis":
      return runOsmosis(cellId, params);
    case "respiration":
      return runRespiration(cellId, params);
    case "photosynthesis":
      return runPhotosynthesis(params);
    default:
      throw new Error(`Unknown lab experiment: ${experimentId}`);
  }
};
