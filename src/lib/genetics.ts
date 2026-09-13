/**
 * 孟德尔遗传规律模拟 —— 独立业务 / 数据层
 *
 * 这里只做遗传计算：亲本基因型 -> 配子 -> 遗传棋盘格 -> 基因型 / 表型概率。
 * 纯函数、无 React / DOM 依赖，可被界面复用，也可单独测试。
 */

export type AlleleKind = "D" | "d";
export type GenoKind = "DD" | "Dd" | "dd";

/** 性状（一对等位基因控制的单基因性状） */
export interface TraitDefinition {
  id: string;
  /** 性状名，如「豌豆花色」 */
  name: string;
  /** 显性等位基因符号，如 A */
  dominantSymbol: string;
  /** 隐性等位基因符号，如 a */
  recessiveSymbol: string;
  /** 显性性状，如「紫花」 */
  dominantTrait: string;
  /** 隐性性状，如「白花」 */
  recessiveTrait: string;
  blurb: string;
}

export interface CrossConfig {
  /** 参与杂交的性状（1 个 = 分离定律，2 个 = 自由组合定律） */
  traitIds: string[];
  p1: Record<string, GenoKind>;
  p2: Record<string, GenoKind>;
}

export interface Gamete {
  /** 配子的基因符号，如 Ab、aB */
  label: string;
  alleles: Record<string, AlleleKind>;
  /** 该配子出现的概率，如杂合子产生 A、a 各 0.5 */
  probability: number;
}

export interface PunnettCell {
  /** 与棋盘列对应的亲本 1 配子 */
  columnGamete: Gamete;
  /** 与棋盘行对应的亲本 2 配子 */
  rowGamete: Gamete;
  genotypeKey: string;
  genotypeLabel: string;
  genotypeByTrait: Record<string, GenoKind>;
  phenotypeKey: string;
  phenotypeByTrait: Record<string, AlleleKind>;
  phenotypeLabel: string;
  /** 该格出现的概率 */
  probability: number;
  /** 在整个棋盘中等价出现的格数 */
  count: number;
}

export interface StatBucket {
  key: string;
  label: string;
  count: number;
  probability: number;
}

export interface CrossResult {
  config: CrossConfig;
  traits: TraitDefinition[];
  /** 亲本 1 的配子（棋盘列） */
  columns: Gamete[];
  /** 亲本 2 的配子（棋盘行） */
  rows: Gamete[];
  /** grid[行][列] */
  grid: PunnettCell[][];
  /** 概率分母，如 Aa × Aa 为 4，双杂合自交为 16 */
  denominator: number;
  genotypeBuckets: StatBucket[];
  phenotypeBuckets: StatBucket[];
  genotypeRatio: string;
  phenotypeRatio: string;
}

export interface SampleResult {
  count: number;
  genotypeCounts: Record<string, number>;
  phenotypeCounts: Record<string, number>;
}

export interface PresetCase {
  id: string;
  tag: string;
  title: string;
  story: string;
  takeaway: string;
  config: CrossConfig;
}

/* ---------------------------------- 性状库 --------------------------------- */

export const TRAIT_CATALOG: TraitDefinition[] = [
  {
    id: "pea-flower",
    name: "豌豆花色",
    dominantSymbol: "A",
    recessiveSymbol: "a",
    dominantTrait: "紫花",
    recessiveTrait: "白花",
    blurb: "孟德尔经典材料：紫花对白花为显性。"
  },
  {
    id: "pea-height",
    name: "豌豆茎高",
    dominantSymbol: "T",
    recessiveSymbol: "t",
    dominantTrait: "高茎",
    recessiveTrait: "矮茎",
    blurb: "高茎对矮茎为显性，F2 代呈 3:1 分离。"
  },
  {
    id: "pea-color",
    name: "豌豆子叶颜色",
    dominantSymbol: "Y",
    recessiveSymbol: "y",
    dominantTrait: "黄色子叶",
    recessiveTrait: "绿色子叶",
    blurb: "黄色对绿色为显性，常与粒形一起研究自由组合。"
  },
  {
    id: "pea-shape",
    name: "豌豆粒形",
    dominantSymbol: "R",
    recessiveSymbol: "r",
    dominantTrait: "圆粒",
    recessiveTrait: "皱粒",
    blurb: "圆粒对皱粒为显性。"
  },
  {
    id: "earlobe",
    name: "人类耳垂",
    dominantSymbol: "E",
    recessiveSymbol: "e",
    dominantTrait: "有耳垂",
    recessiveTrait: "无耳垂",
    blurb: "常见人类单基因性状：游离耳垂对附着耳垂为显性。"
  },
  {
    id: "dimple",
    name: "人类酒窝",
    dominantSymbol: "D",
    recessiveSymbol: "d",
    dominantTrait: "有酒窝",
    recessiveTrait: "无酒窝",
    blurb: "有酒窝为显性性状，双亲杂合时子女仍可能无酒窝。"
  }
];

const TRAIT_BY_ID = new Map(TRAIT_CATALOG.map((trait) => [trait.id, trait]));

export const getTrait = (id: string): TraitDefinition => {
  const trait = TRAIT_BY_ID.get(id);
  if (!trait) throw new Error(`未知性状：${id}`);
  return trait;
};

export const GENO_OPTIONS: { kind: GenoKind; name: string; short: string }[] = [
  { kind: "DD", name: "显性纯合子", short: "纯合显性" },
  { kind: "Dd", name: "杂合子", short: "杂合" },
  { kind: "dd", name: "隐性纯合子", short: "纯合隐性" }
];

/* --------------------------------- 工具函数 -------------------------------- */

export const formatGeno = (trait: TraitDefinition, kind: GenoKind): string => {
  if (kind === "DD") return trait.dominantSymbol + trait.dominantSymbol;
  if (kind === "dd") return trait.recessiveSymbol + trait.recessiveSymbol;
  return trait.dominantSymbol + trait.recessiveSymbol;
};

export const genoName = (kind: GenoKind): string =>
  kind === "DD" ? "显性纯合" : kind === "Dd" ? "杂合" : "隐性纯合";

export const phenotypeOf = (trait: TraitDefinition, kind: GenoKind): string =>
  kind === "dd" ? trait.recessiveTrait : trait.dominantTrait;

/** 0.5 -> "1/2"，0.25 -> "1/4"，1 -> "1" */
export const fractionOf = (probability: number, denominator: number): string => {
  const numerator = Math.round(probability * denominator);
  return numerator === denominator ? "1" : `${numerator}/${denominator}`;
};

export const percentOf = (probability: number): string => {
  // 保留两位小数并去掉多余的 0，使 1/16 准确显示为 6.25%、3/4 显示为 75%
  const percent = parseFloat((probability * 100).toFixed(2));
  return `${percent}%`;
};

const cartesian = <T,>(arrays: T[][]): T[][] =>
  arrays.reduce<T[][]>(
    (acc, values) => acc.flatMap((prefix) => values.map((value) => [...prefix, value])),
    [[]]
  );

const greatestCommonDivisor = (a: number, b: number): number => (b === 0 ? a : greatestCommonDivisor(b, a % b));

const ratioOf = (counts: number[]): string => {
  const positive = counts.filter((n) => n > 0);
  if (positive.length === 0) return "";
  const gcd = positive.reduce((acc, n) => greatestCommonDivisor(acc, n));
  return counts.map((n) => (n / gcd).toString()).join(" : ");
};

/* --------------------------------- 配子发生 -------------------------------- */

const TRAIT_GAMETES: Record<GenoKind, [AlleleKind, number][]> = {
  DD: [["D", 1]],
  Dd: [
    ["D", 0.5],
    ["d", 0.5]
  ],
  dd: [["d", 1]]
};

/** 减数分裂：每个杂合位点产生 2 种等概率配子，多个位点自由组合 */
export function buildGametes(traits: TraitDefinition[], parent: Record<string, GenoKind>): Gamete[] {
  let combos: { alleles: Record<string, AlleleKind>; probability: number }[] = [
    { alleles: {}, probability: 1 }
  ];
  for (const trait of traits) {
    const kind = parent[trait.id];
    if (!kind) throw new Error(`缺少亲本在「${trait.name}」上的基因型`);
    const next: typeof combos = [];
    for (const combo of combos) {
      for (const [allele, probability] of TRAIT_GAMETES[kind]) {
        next.push({
          alleles: { ...combo.alleles, [trait.id]: allele },
          probability: combo.probability * probability
        });
      }
    }
    combos = next;
  }
  return combos.map((combo) => ({
    ...combo,
    label: traits
      .map((trait) => (combo.alleles[trait.id] === "D" ? trait.dominantSymbol : trait.recessiveSymbol))
      .join("")
  }));
}

/* --------------------------------- 杂交主计算 -------------------------------- */

export function runCross(config: CrossConfig): CrossResult {
  const traits = config.traitIds.map(getTrait);
  const columns = buildGametes(traits, config.p1);
  const rows = buildGametes(traits, config.p2);

  // 每出现一个杂合位点，配子类型翻倍：棋盘格总数 = 2^杂合位点数
  let heteroLoci = 0;
  for (const trait of traits) {
    if (config.p1[trait.id] === "Dd") heteroLoci += 1;
    if (config.p2[trait.id] === "Dd") heteroLoci += 1;
  }
  const denominator = 2 ** heteroLoci;

  const grid: PunnettCell[][] = rows.map((rowGamete) =>
    columns.map((columnGamete) => {
      const genotypeByTrait: Record<string, GenoKind> = {};
      const phenotypeByTrait: Record<string, AlleleKind> = {};
      let genotypeKey = "";
      let genotypeLabel = "";
      let phenotypeKey = "";
      let phenotypeLabel = "";
      traits.forEach((trait, index) => {
        const a1 = columnGamete.alleles[trait.id];
        const a2 = rowGamete.alleles[trait.id];
        const geno: GenoKind = a1 === "d" && a2 === "d" ? "dd" : a1 === "D" && a2 === "D" ? "DD" : "Dd";
        const pheno: AlleleKind = geno === "dd" ? "d" : "D";
        genotypeByTrait[trait.id] = geno;
        phenotypeByTrait[trait.id] = pheno;
        const separator = index === 0 ? "" : "-";
        genotypeKey += separator + geno;
        phenotypeKey += separator + pheno;
        genotypeLabel += formatGeno(trait, geno);
        phenotypeLabel += (index === 0 ? "" : "·") + phenotypeOf(trait, geno);
      });
      const probability = columnGamete.probability * rowGamete.probability;
      return {
        columnGamete,
        rowGamete,
        genotypeKey,
        genotypeLabel,
        genotypeByTrait,
        phenotypeKey,
        phenotypeByTrait,
        phenotypeLabel,
        probability,
        count: Math.round(probability * denominator)
      };
    })
  );

  // 规范的统计顺序：基因型按 AA→Aa→aa（多对时做笛卡尔积），表型显性组合在前
  const genoOrderKeys = cartesian<GenoKind>(traits.map(() => ["DD", "Dd", "dd"]));
  const phenoOrderKeys = cartesian<AlleleKind>(traits.map(() => ["D", "d"]));

  const genotypeCounts = new Map<string, { label: string; count: number }>();
  const phenotypeCounts = new Map<string, { label: string; count: number }>();
  for (const row of grid) {
    for (const cell of row) {
      const g = genotypeCounts.get(cell.genotypeKey);
      genotypeCounts.set(cell.genotypeKey, {
        label: cell.genotypeLabel,
        count: (g?.count ?? 0) + cell.count
      });
      const p = phenotypeCounts.get(cell.phenotypeKey);
      phenotypeCounts.set(cell.phenotypeKey, {
        label: cell.phenotypeLabel,
        count: (p?.count ?? 0) + cell.count
      });
    }
  }

  const toBuckets = (
    order: string[][],
    counts: Map<string, { label: string; count: number }>
  ): StatBucket[] =>
    order
      .map((combo) => combo.join("-"))
      .filter((key) => counts.has(key))
      .map((key) => {
        const item = counts.get(key)!;
        return { key, label: item.label, count: item.count, probability: item.count / denominator };
      });

  const genotypeBuckets = toBuckets(genoOrderKeys, genotypeCounts);
  const phenotypeBuckets = toBuckets(phenoOrderKeys, phenotypeCounts);

  return {
    config,
    traits,
    columns,
    rows,
    grid,
    denominator,
    genotypeBuckets,
    phenotypeBuckets,
    genotypeRatio: ratioOf(genotypeBuckets.map((bucket) => bucket.count)),
    phenotypeRatio: ratioOf(phenotypeBuckets.map((bucket) => bucket.count))
  };
}

/* --------------------------------- 随机抽样 --------------------------------- */

/** 按棋盘格概率随机产生后代，用于对比理论概率与实际频数 */
export function sampleOffspring(
  result: CrossResult,
  count: number,
  random: () => number = Math.random
): SampleResult {
  const flat = result.grid.flat();
  const cumulative: number[] = [];
  let acc = 0;
  for (const cell of flat) {
    acc += cell.probability;
    cumulative.push(acc);
  }

  const genotypeCounts: Record<string, number> = {};
  const phenotypeCounts: Record<string, number> = {};
  for (let i = 0; i < count; i += 1) {
    const roll = random();
    let index = cumulative.findIndex((ceiling) => ceiling >= roll);
    if (index < 0) index = flat.length - 1;
    const cell = flat[index];
    genotypeCounts[cell.genotypeKey] = (genotypeCounts[cell.genotypeKey] ?? 0) + 1;
    phenotypeCounts[cell.phenotypeKey] = (phenotypeCounts[cell.phenotypeKey] ?? 0) + 1;
  }
  return { count, genotypeCounts, phenotypeCounts };
}

/* --------------------------------- 预设案例 --------------------------------- */

export const PRESET_CASES: PresetCase[] = [
  {
    id: "f1-pure-lines",
    tag: "显性的表现",
    title: "纯种紫花 × 纯种白花",
    story:
      "孟德尔选用纯种紫花豌豆（AA）与纯种白花豌豆（aa）杂交。两个亲本都只能产生一种配子，F1 代的基因型完全一致。",
    takeaway: "F1 全部是杂合子 Aa，只表现显性紫花；隐性基因 a 并未消失，只是在这一代被掩盖。",
    config: {
      traitIds: ["pea-flower"],
      p1: { "pea-flower": "DD" },
      p2: { "pea-flower": "dd" }
    }
  },
  {
    id: "f2-segregation",
    tag: "分离定律 · 3:1",
    title: "F1 紫花自交",
    story:
      "让 F1 杂合子 Aa 自交（遗传上等价于 Aa × Aa）。减数分裂时等位基因分离，每个亲本产生 A、a 两种配子，比例各占一半。",
    takeaway: "表型为 3 紫花 : 1 白花；基因型为 1 AA : 2 Aa : 1 aa，这就是基因的分离定律。",
    config: {
      traitIds: ["pea-flower"],
      p1: { "pea-flower": "Dd" },
      p2: { "pea-flower": "Dd" }
    }
  },
  {
    id: "test-cross",
    tag: "测交 · 1:1",
    title: "紫花 × 白花（测交）",
    story:
      "一株紫花豌豆可能是 AA 或 Aa。让它与隐性纯合子白花（aa）杂交，根据后代表型即可反推它的基因型。",
    takeaway: "若待测个体为 Aa，后代紫花 : 白花 = 1 : 1；若为 AA 则后代全为紫花。",
    config: {
      traitIds: ["pea-flower"],
      p1: { "pea-flower": "Dd" },
      p2: { "pea-flower": "dd" }
    }
  },
  {
    id: "human-earlobe",
    tag: "人类遗传",
    title: "双亲都有耳垂",
    story:
      "耳垂游离（有耳垂）为显性 E，附着（无耳垂）为隐性 e。双亲都有耳垂却都携带着隐性基因（Ee × Ee）。",
    takeaway: "每个孩子仍有 1/4 概率无耳垂——显性表型的双亲可以生出隐性表型的孩子。",
    config: {
      traitIds: ["earlobe"],
      p1: { earlobe: "Dd" },
      p2: { earlobe: "Dd" }
    }
  },
  {
    id: "dihybrid-selfing",
    tag: "自由组合 · 9:3:3:1",
    title: "黄色圆粒双杂合自交",
    story:
      "同时观察子叶颜色（Y/y）与粒形（R/r）。双杂合子 YyRr 各产生 YR、Yr、yR、yr 四种配子，比例为 1:1:1:1。",
    takeaway: "F2 代表型为 9 黄圆 : 3 黄皱 : 3 绿圆 : 1 绿皱，说明两对基因自由组合。",
    config: {
      traitIds: ["pea-color", "pea-shape"],
      p1: { "pea-color": "Dd", "pea-shape": "Dd" },
      p2: { "pea-color": "Dd", "pea-shape": "Dd" }
    }
  },
  {
    id: "dihybrid-test-cross",
    tag: "双隐性测交",
    title: "YyRr × 绿色皱粒 yyrr",
    story:
      "用双隐性纯合子 yyrr 与双杂合子杂交。隐性亲本只提供 yr 一种配子，后代的表型直接反映另一亲本的配子类型。",
    takeaway: "后代出现四种表型且为 1:1:1:1，直观验证了杂合子确实产生四种等比例配子。",
    config: {
      traitIds: ["pea-color", "pea-shape"],
      p1: { "pea-color": "Dd", "pea-shape": "Dd" },
      p2: { "pea-color": "dd", "pea-shape": "dd" }
    }
  }
];
