import type { LabExperimentSeed } from "./types.js";

/**
 * 虚拟实验室的实验定义。
 * 注意：所有量程与默认值都是为教学演示约定的“相对单位”，
 * 用于呈现趋势与方向，不代表真实细胞的精确测量值。
 */
export const labExperimentSeeds: LabExperimentSeed[] = [
  {
    id: "osmosis",
    name: "渗透作用",
    englishName: "OSMOSIS & WATER BALANCE",
    icon: "droplets",
    summary: "把细胞放进不同浓度的外界溶液，观察水分进出引起的形态变化。",
    question: "外界溶液浓度如何影响细胞的水分平衡与形态？",
    cellIds: ["animal", "plant", "prokaryote"],
    duration: 10,
    timeUnit: "min",
    params: [
      {
        id: "externalConc",
        label: "外界溶液浓度",
        unit: "mol/L",
        min: 0,
        max: 1,
        step: 0.05,
        defaultValue: 0.15,
        description: "细胞外溶液的溶质浓度。低于细胞内为低渗，相近为等渗，高于细胞内为高渗。"
      }
    ],
    variables: [
      { id: "volume", label: "细胞（或原生质体）体积", unit: "相对值", color: "#7fb8f0", min: 0.3, max: 1.7, decimals: 2 },
      { id: "integrity", label: "细胞膜完整性", unit: "%", color: "#98f0c6", min: 0, max: 100, decimals: 0 },
      { id: "turgor", label: "膨压 / 质壁分离程度", unit: "%", color: "#f2c063", min: 0, max: 100, decimals: 0 }
    ],
    notes: [
      "水分子通过细胞膜（半透膜）从水势高（溶质浓度低）的一侧向水势低的一侧净移动。",
      "动物细胞没有细胞壁：在低渗溶液中持续吸水会涨破，在高渗溶液中失水皱缩。",
      "植物细胞有细胞壁：吸水时膨压升高而坚挺；严重失水时原生质层与细胞壁分离（质壁分离）。",
      "生理盐水（约 0.9% NaCl）与人体细胞等渗，因此可用于输液。"
    ],
    position: 1
  },
  {
    id: "respiration",
    name: "温度与细胞呼吸",
    englishName: "TEMPERATURE & RESPIRATION",
    icon: "thermometer",
    summary: "调节环境温度与氧气浓度，观察细胞呼吸速率（ATP 生成）的变化。",
    question: "温度和氧气浓度如何影响细胞的能量供应？",
    cellIds: ["animal", "plant", "prokaryote"],
    duration: 12,
    timeUnit: "min",
    params: [
      {
        id: "temperature",
        label: "环境温度",
        unit: "°C",
        min: 0,
        max: 50,
        step: 1,
        defaultValue: 25,
        description: "温度通过影响酶的活性改变呼吸速率：低温抑制、适温最强、高温使酶变性。"
      },
      {
        id: "oxygen",
        label: "氧气浓度",
        unit: "%",
        min: 0,
        max: 30,
        step: 1,
        defaultValue: 21,
        description: "氧气是有氧呼吸第三阶段的原料；氧气不足时有氧呼吸受限制。"
      }
    ],
    variables: [
      { id: "atpRate", label: "ATP 生成速率", unit: "相对值", color: "#f2c063", min: 0, max: 1.3, decimals: 2 },
      { id: "enzyme", label: "呼吸酶活性", unit: "%", color: "#98f0c6", min: 0, max: 100, decimals: 0 },
      { id: "o2Rate", label: "耗氧速率", unit: "相对值", color: "#7fb8f0", min: 0, max: 1.2, decimals: 2 }
    ],
    notes: [
      "细胞呼吸是一系列酶促反应，其速率受温度影响：一般遵循“低温抑制—适温最高—高温变性”的规律。",
      "高温对酶的破坏通常不可逆；低温只是暂时抑制，回暖后活性可恢复。",
      "氧气浓度低时，有氧呼吸受限，细胞可短暂依靠无氧呼吸供能（效率低）。",
      "原核细胞没有线粒体，呼吸作用在细胞膜和细胞质中进行。"
    ],
    position: 2
  },
  {
    id: "photosynthesis",
    name: "光照与光合作用",
    englishName: "LIGHT & PHOTOSYNTHESIS",
    icon: "sun",
    summary: "调节光照强度与 CO₂ 浓度，观察植物细胞净光合速率与氧气释放。",
    question: "光照和 CO₂ 如何影响植物细胞的氧气释放？",
    cellIds: ["plant"],
    duration: 10,
    timeUnit: "min",
    params: [
      {
        id: "light",
        label: "光照强度",
        unit: "μmol/(m²·s)",
        min: 0,
        max: 2000,
        step: 50,
        defaultValue: 600,
        description: "光反应的能量来源。超过光饱和点后，继续增大光照速率不再明显提升。"
      },
      {
        id: "co2",
        label: "CO₂ 浓度",
        unit: "%",
        min: 0,
        max: 0.1,
        step: 0.005,
        defaultValue: 0.04,
        description: "暗反应的原料。空气中 CO₂ 约为 0.04%，往往是田间的限制因素。"
      }
    ],
    variables: [
      { id: "netPhoto", label: "净光合速率（O₂ 释放）", unit: "相对值", color: "#98f0c6", min: -5, max: 30, decimals: 1 },
      { id: "grossPhoto", label: "总光合速率", unit: "相对值", color: "#7fb8f0", min: 0, max: 30, decimals: 1 },
      { id: "cumO2", label: "O₂ 累积释放量", unit: "相对值", color: "#f2c063", min: -50, max: 300, decimals: 0 }
    ],
    notes: [
      "净光合速率 = 总光合速率 − 呼吸速率；净值为正时细胞释放 O₂、积累有机物。",
      "光补偿点：光合速率恰好等于呼吸速率时的光照强度。",
      "光照很弱时光是限制因素；光照充足后，CO₂ 浓度往往成为新的限制因素。"
    ],
    position: 3
  }
];

/** 全站统一的教学模型声明（随 API 下发，前端多处展示） */
export const LAB_DISCLAIMER =
  "本实验室由简化的教学模型驱动：结果用于呈现生物学趋势与方向，帮助理解概念。" +
  "模型做了大量简化假设，数值不是真实细胞的测量值，不能用于预测真实实验结果。";
