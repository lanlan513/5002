/**
 * 遗传学挑战模式 —— 题目数据结构与判定逻辑
 *
 * 设计目标：可扩展。新增一道题只需向 CHALLENGE_QUESTIONS 数组追加一个对象，
 * 不需要改动任何判定代码：
 *
 * 1. config 描述亲本基因型（复用孟德尔模拟器的 CrossConfig）；
 * 2. query 用可辨识联合描述「本题问什么」（表型比 / 基因型比 / 某表型概率 …）；
 * 3. 正确答案由 answerOf() 调用 runCross 实时算出，题目数据里不存答案，
 *    因此永远不可能出现「题目与答案不一致」；
 * 4. distractors 只负责提供错误选项；推导过程由 buildSolutionSteps 自动生成。
 *
 * 要支持新的问法时，为 ChallengeQuery 增加一个成员，并在 answerOf /
 * buildSolutionSteps 中补一个分支即可。
 */

import {
  formatGeno,
  fractionOf,
  getTrait,
  percentOf,
  runCross,
  type AlleleKind,
  type CrossConfig,
  type CrossResult,
  type GenoKind
} from "./genetics";

/* --------------------------------- 题目类型 --------------------------------- */

/** 题目问法：可辨识联合。新增问法时在此扩展 */
export type ChallengeQuery =
  /** 后代表型比，如 3 : 1、9 : 3 : 3 : 1 */
  | { kind: "phenotype-ratio" }
  /** 后代基因型比，如 1 : 2 : 1 */
  | { kind: "genotype-ratio" }
  /** 某一表型组合出现的概率，target 为「性状 id -> 显 / 隐」 */
  | { kind: "phenotype-probability"; target: Record<string, AlleleKind> }
  /** 某一基因型组合出现的概率，target 为「性状 id -> 基因型」 */
  | { kind: "genotype-probability"; target: Record<string, GenoKind> }
  /** 某个亲本能产生多少种配子 */
  | { kind: "gamete-count"; parent: "p1" | "p2" };

export interface ChallengeQuestion {
  id: string;
  /** 难度等级（对应 CHALLENGE_LEVELS），通关上一等级后解锁 */
  level: number;
  /** 知识点标签，如「杂合子自交」 */
  tag: string;
  title: string;
  /** 题目情境：亲本条件的文字描述 */
  story: string;
  /** 需要用户预测的问题 */
  prompt: string;
  /** 亲本杂交配置（性状 + 双亲基因型），正确答案与棋盘格都由它算出 */
  config: CrossConfig;
  query: ChallengeQuery;
  /** 错误选项（正确选项由引擎自动计算并混入） */
  distractors: string[];
  /** 作答前显示的提示 */
  hint: string;
  /** 提交后展示的结论讲解 */
  takeaway: string;
}

export interface ChallengeLevel {
  level: number;
  name: string;
  description: string;
}

export interface SolutionStep {
  title: string;
  body: string;
}

/* --------------------------------- 等级定义 --------------------------------- */

export const CHALLENGE_LEVELS: ChallengeLevel[] = [
  {
    level: 1,
    name: "分离定律 · 入门",
    description: "一对等位基因的杂交：从杂合子自交开始，认识 3 : 1 与遗传棋盘格。"
  },
  {
    level: 2,
    name: "分离定律 · 进阶",
    description: "配子的种类、测交与基因型比例——把分离定律用到具体问题上。"
  },
  {
    level: 3,
    name: "自由组合定律",
    description: "两对基因同时遗传：9 : 3 : 3 : 1 与 1/16 究竟从何而来。"
  },
  {
    level: 4,
    name: "综合应用",
    description: "双因子测交、特定基因型概率与不对称杂交，独立完成完整推导。"
  }
];

/* --------------------------------- 题目库 --------------------------------- */

export const CHALLENGE_QUESTIONS: ChallengeQuestion[] = [
  /* -- Level 1：分离定律 · 入门 -- */
  {
    id: "l1-self-cross-flower",
    level: 1,
    tag: "杂合子自交",
    title: "紫花豌豆的自交",
    story:
      "孟德尔让纯种紫花（AA）与白花（aa）杂交，得到的 F1 全部开紫花（Aa）。现在让 F1 自交：Aa × Aa。",
    prompt: "F2 代的表型比是多少？",
    config: {
      traitIds: ["pea-flower"],
      p1: { "pea-flower": "Dd" },
      p2: { "pea-flower": "Dd" }
    },
    query: { kind: "phenotype-ratio" },
    distractors: ["1 : 1", "1 : 2 : 1", "2 : 1"],
    hint: "先写出 Aa 产生的两种配子，再画 2×2 棋盘格。",
    takeaway:
      "杂合子自交后代表型比为 3 : 1——3/4 表现显性、1/4 表现隐性。注意 1 : 2 : 1 是基因型比，两者不要混淆。"
  },
  {
    id: "l1-recessive-probability",
    level: 1,
    tag: "隐性性状的概率",
    title: "白花何时再现",
    story:
      "同样是 Aa × Aa 的紫花豌豆自交。白花性状在 F1 中完全消失了，它会在 F2 中重新出现吗？",
    prompt: "F2 中出现白花（aa）个体的概率是多少？",
    config: {
      traitIds: ["pea-flower"],
      p1: { "pea-flower": "Dd" },
      p2: { "pea-flower": "Dd" }
    },
    query: { kind: "phenotype-probability", target: { "pea-flower": "d" } },
    distractors: ["1/2（50%）", "3/4（75%）", "1/3（33.33%）"],
    hint: "白花只在两个配子都携带 a 时才出现。",
    takeaway:
      "隐性性状并没有消失，只是被掩盖：两个 a 配子相遇的概率为 1/2 × 1/2 = 1/4，所以白花在 F2 中重现。"
  },
  {
    id: "l1-test-cross",
    level: 1,
    tag: "测交",
    title: "检验一株紫花豌豆",
    story:
      "一株紫花豌豆的基因型可能是 AA 或 Aa。遗传学家让它与白花（aa）杂交——这称为测交。已知这株紫花实际上是 Aa。",
    prompt: "测交后代（Aa × aa）的表型比是多少？",
    config: {
      traitIds: ["pea-flower"],
      p1: { "pea-flower": "Dd" },
      p2: { "pea-flower": "dd" }
    },
    query: { kind: "phenotype-ratio" },
    distractors: ["3 : 1", "1 : 2 : 1", "2 : 1"],
    hint: "aa 只能产生一种配子。",
    takeaway:
      "测交后代表型比为 1 : 1——隐性亲本只提供 a 配子，后代的表型直接反映待测亲本产生的配子种类。"
  },

  /* -- Level 2：分离定律 · 进阶 -- */
  {
    id: "l2-gamete-types",
    level: 2,
    tag: "配子发生",
    title: "杂合子的配子",
    story:
      "一株高茎豌豆的基因型为 Tt，让它与矮茎（tt）杂交。减数分裂时，成对的等位基因会彼此分离。",
    prompt: "这株高茎豌豆（Tt）能产生几种不同类型的配子？",
    config: {
      traitIds: ["pea-height"],
      p1: { "pea-height": "Dd" },
      p2: { "pea-height": "dd" }
    },
    query: { kind: "gamete-count", parent: "p1" },
    distractors: ["1 种", "3 种", "4 种"],
    hint: "等位基因分离：T 和 t 分别进入不同的配子。",
    takeaway:
      "一个杂合位点产生 2 种等概率配子（T 与 t 各占 1/2）。推广开来：n 个杂合位点自由组合，可产生 2^n 种配子。"
  },
  {
    id: "l2-genotype-ratio",
    level: 2,
    tag: "基因型比",
    title: "纯合与杂合的相遇",
    story: "一株高茎纯合子（TT）与一株高茎杂合子（Tt）杂交，两个亲本的表型相同。",
    prompt: "后代的基因型比是多少？",
    config: {
      traitIds: ["pea-height"],
      p1: { "pea-height": "DD" },
      p2: { "pea-height": "Dd" }
    },
    query: { kind: "genotype-ratio" },
    distractors: ["1 : 2 : 1", "3 : 1", "2 : 1"],
    hint: "TT 只产生 T 配子，Tt 产生 T、t 两种配子。",
    takeaway:
      "TT × Tt 的后代基因型为 1 TT : 1 Tt，全部表现为高茎——基因型比与表型比并不总是相同。"
  },
  {
    id: "l2-earlobe",
    level: 2,
    tag: "人类遗传",
    title: "耳垂的遗传",
    story:
      "游离耳垂（E）对附着耳垂（e）为显性。一对夫妇的基因型都是 Ee，两人都有游离耳垂。",
    prompt: "他们的孩子为附着耳垂（ee）的概率是多少？",
    config: {
      traitIds: ["earlobe"],
      p1: { earlobe: "Dd" },
      p2: { earlobe: "Dd" }
    },
    query: { kind: "phenotype-probability", target: { earlobe: "d" } },
    distractors: ["1/2（50%）", "3/4（75%）", "1/8（12.5%）"],
    hint: "与豌豆花色一样，这仍然是杂合子自交。",
    takeaway:
      "显性表型的父母可以生出隐性表型的孩子，概率为 1/4。人类的单基因性状与豌豆遵循同样的分离定律。"
  },

  /* -- Level 3：自由组合定律 -- */
  {
    id: "l3-dihybrid-ratio",
    level: 3,
    tag: "自由组合",
    title: "两对性状的杂交",
    story:
      "黄色圆粒的双杂合豌豆（YyRr）自交。子叶颜色（Y/y）与粒形（R/r）由不同染色体上的基因控制，互不干扰。",
    prompt: "F2 代的表型比是多少？",
    config: {
      traitIds: ["pea-color", "pea-shape"],
      p1: { "pea-color": "Dd", "pea-shape": "Dd" },
      p2: { "pea-color": "Dd", "pea-shape": "Dd" }
    },
    query: { kind: "phenotype-ratio" },
    distractors: ["3 : 1", "1 : 1 : 1 : 1", "1 : 2 : 1"],
    hint: "每对基因各自按 3 : 1 分离，再把两对组合起来。",
    takeaway:
      "(3 : 1) × (3 : 1) = 9 : 3 : 3 : 1——这就是自由组合定律：不同对的等位基因在形成配子时自由组合。"
  },
  {
    id: "l3-gamete-types",
    level: 3,
    tag: "配子发生",
    title: "双杂合子的配子",
    story:
      "基因型为 YyRr 的豌豆与双隐性个体（yyrr）测交。两对基因在减数分裂时自由组合。",
    prompt: "YyRr 个体能产生几种不同类型的配子？",
    config: {
      traitIds: ["pea-color", "pea-shape"],
      p1: { "pea-color": "Dd", "pea-shape": "Dd" },
      p2: { "pea-color": "dd", "pea-shape": "dd" }
    },
    query: { kind: "gamete-count", parent: "p1" },
    distractors: ["2 种", "8 种", "16 种"],
    hint: "Y/y 有 2 种选择，R/r 也有 2 种选择。",
    takeaway:
      "2 × 2 = 4 种配子：YR、Yr、yR、yr，各占 1/4。配子种类 = 2^杂合位点数，而不是基因数目的其他组合。"
  },
  {
    id: "l3-double-recessive",
    level: 3,
    tag: "双隐性的概率",
    title: "绿色皱粒的概率",
    story: "YyRr × YyRr 的 F2 代中，绿色皱粒（yyrr）是唯一的双隐性表型。",
    prompt: "F2 中绿色皱粒（yyrr）个体出现的概率是多少？",
    config: {
      traitIds: ["pea-color", "pea-shape"],
      p1: { "pea-color": "Dd", "pea-shape": "Dd" },
      p2: { "pea-color": "Dd", "pea-shape": "Dd" }
    },
    query: { kind: "phenotype-probability", target: { "pea-color": "d", "pea-shape": "d" } },
    distractors: ["1/8（12.5%）", "1/4（25%）", "3/16（18.75%）"],
    hint: "yy 的概率是 1/4，rr 的概率也是 1/4。",
    takeaway:
      "1/4 × 1/4 = 1/16。在 16 格棋盘格里双隐性只占 1 格——这正是 9 : 3 : 3 : 1 中那个「1」。"
  },

  /* -- Level 4：综合应用 -- */
  {
    id: "l4-dihybrid-testcross",
    level: 4,
    tag: "双因子测交",
    title: "验证自由组合",
    story:
      "孟德尔用双隐性个体（yyrr）与 F1 双杂合子（YyRr）测交，验证 F1 是否真的产生四种等比例配子。",
    prompt: "测交后代的表型比是多少？",
    config: {
      traitIds: ["pea-color", "pea-shape"],
      p1: { "pea-color": "Dd", "pea-shape": "Dd" },
      p2: { "pea-color": "dd", "pea-shape": "dd" }
    },
    query: { kind: "phenotype-ratio" },
    distractors: ["9 : 3 : 3 : 1", "3 : 1", "1 : 1"],
    hint: "yyrr 只产生 yr 一种配子，后代表型完全由另一亲本的配子决定。",
    takeaway:
      "1 : 1 : 1 : 1 的测交结果直接证明了 F1 产生 4 种等比例配子——这是自由组合定律最关键的实验证据。"
  },
  {
    id: "l4-genotype-probability",
    level: 4,
    tag: "特定基因型",
    title: "双显性纯合的概率",
    story: "YyRr × YyRr 的 F2 代共有 9 种不同的基因型。",
    prompt: "其中 YYRR（双显性纯合）出现的概率是多少？",
    config: {
      traitIds: ["pea-color", "pea-shape"],
      p1: { "pea-color": "Dd", "pea-shape": "Dd" },
      p2: { "pea-color": "Dd", "pea-shape": "Dd" }
    },
    query: { kind: "genotype-probability", target: { "pea-color": "DD", "pea-shape": "DD" } },
    distractors: ["1/8（12.5%）", "1/4（25%）", "1/32（3.13%）"],
    hint: "YY 的概率是 1/4，RR 的概率也是 1/4。",
    takeaway:
      "1/4 × 1/4 = 1/16。逐对基因独立计算再相乘，往往比数 16 个格子更快、更不易出错。"
  },
  {
    id: "l4-mixed-cross",
    level: 4,
    tag: "综合杂交",
    title: "不对称的双因子杂交",
    story: "一株高茎黄色豌豆（TtYy）与一株高茎绿色豌豆（Ttyy）杂交。",
    prompt: "后代的表型比是多少？",
    config: {
      traitIds: ["pea-height", "pea-color"],
      p1: { "pea-height": "Dd", "pea-color": "Dd" },
      p2: { "pea-height": "Dd", "pea-color": "dd" }
    },
    query: { kind: "phenotype-ratio" },
    distractors: ["9 : 3 : 3 : 1", "1 : 1 : 1 : 1", "3 : 1 : 3 : 1"],
    hint: "茎高按 3 : 1 分离，子叶颜色按 1 : 1 分离，再把两个比例组合。",
    takeaway:
      "(3 : 1) × (1 : 1) = 3 : 3 : 1 : 1。逐对分析再相乘的方法，可以处理任意基因型组合的杂交。"
  }
];

/* --------------------------------- 判定逻辑 --------------------------------- */

const formatProbability = (probability: number, denominator: number): string =>
  `${fractionOf(probability, denominator)}（${percentOf(probability)}）`;

/** 统计棋盘中满足「每对目标都匹配」的格子的概率之和 */
const matchProbability = (
  result: CrossResult,
  target: Record<string, string>,
  pick: (cell: CrossResult["grid"][number][number], traitId: string) => string
): number =>
  result.grid
    .flat()
    .filter((cell) => Object.entries(target).every(([traitId, want]) => pick(cell, traitId) === want))
    .reduce((sum, cell) => sum + cell.probability, 0);

/**
 * 计算题目的正确答案（选项文本）。
 * 答案完全由 runCross 推出，题目数据中不保存答案，保证题目与答案永远一致。
 */
export function answerOf(question: ChallengeQuestion, result: CrossResult = runCross(question.config)): string {
  const { query } = question;
  switch (query.kind) {
    case "phenotype-ratio":
      return result.phenotypeRatio;
    case "genotype-ratio":
      return result.genotypeRatio;
    case "gamete-count": {
      const gametes = query.parent === "p1" ? result.columns : result.rows;
      return `${gametes.length} 种`;
    }
    case "phenotype-probability": {
      const probability = matchProbability(result, query.target, (cell, id) => cell.phenotypeByTrait[id]);
      return formatProbability(probability, result.denominator);
    }
    case "genotype-probability": {
      const probability = matchProbability(result, query.target, (cell, id) => cell.genotypeByTrait[id]);
      return formatProbability(probability, result.denominator);
    }
  }
}

/** 由正确答案 + 干扰项生成 4 个乱序选项 */
export function buildOptions(
  question: ChallengeQuestion,
  correctLabel: string,
  random: () => number = Math.random
): string[] {
  const pool = [correctLabel, ...question.distractors.filter((item) => item !== correctLabel)];
  const options = [...new Set(pool)].slice(0, 4);
  for (let i = options.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }
  return options;
}

/* --------------------------------- 推导过程 --------------------------------- */

const gameteListText = (gametes: CrossResult["columns"]): string =>
  gametes.map((gamete) => `${gamete.label}（${fractionOf(gamete.probability, gametes.length)}）`).join("、");

const bucketText = (result: CrossResult, buckets: CrossResult["genotypeBuckets"]): string =>
  buckets
    .map((bucket) => `${bucket.label} 占 ${fractionOf(bucket.probability, result.denominator)}`)
    .join("，");

/** 把概率类题目的 target 翻译成中文描述，如「子叶颜色为绿色子叶，且粒形为皱粒」 */
const describeTarget = (question: ChallengeQuestion): string => {
  const { query } = question;
  if (query.kind === "phenotype-probability") {
    return Object.entries(query.target)
      .map(([traitId, want]) => {
        const trait = getTrait(traitId);
        return `${trait.name}为${want === "D" ? trait.dominantTrait : trait.recessiveTrait}`;
      })
      .join("，且");
  }
  if (query.kind === "genotype-probability") {
    return Object.entries(query.target)
      .map(([traitId, want]) => `${getTrait(traitId).name}基因型为${formatGeno(getTrait(traitId), want)}`)
      .join("，且");
  }
  return "";
};

/**
 * 根据杂交结果自动生成五步推导：
 * 亲本基因型 → 配子 → 棋盘格 → 基因型/表型统计 → 回答本题。
 * 推导与界面展示的棋盘格、概率图使用同一份计算结果，三者必然一致。
 */
export function buildSolutionSteps(question: ChallengeQuestion, result: CrossResult): SolutionStep[] {
  const { config, query } = question;
  const traits = result.traits;
  const p1Label = traits.map((trait) => formatGeno(trait, config.p1[trait.id])).join(" ");
  const p2Label = traits.map((trait) => formatGeno(trait, config.p2[trait.id])).join(" ");
  const dominance = traits
    .map(
      (trait) =>
        `${trait.name}中 ${trait.dominantSymbol}（${trait.dominantTrait}）对 ${trait.recessiveSymbol}（${trait.recessiveTrait}）为显性`
    )
    .join("；");

  const steps: SolutionStep[] = [
    {
      title: "确定亲本基因型",
      body: `亲本 1（♀）为 ${p1Label}，亲本 2（♂）为 ${p2Label}。${dominance}。`
    },
    {
      title: "写出亲本的配子",
      body: `减数分裂时等位基因分离：亲本 1 产生 ${result.columns.length} 种配子 ${gameteListText(
        result.columns
      )}；亲本 2 产生 ${result.rows.length} 种配子 ${gameteListText(result.rows)}。`
    },
    {
      title: "搭建遗传棋盘格",
      body: `亲本 1 的配子排在列、亲本 2 的配子排在行，配子随机结合，共 ${result.columns.length} × ${result.rows.length} = ${result.denominator} 个等概率的格子，每格概率为 1/${result.denominator}。`
    },
    {
      title: "统计基因型与表型",
      body: `基因型：${bucketText(result, result.genotypeBuckets)}（比为 ${result.genotypeRatio}）。表型：${bucketText(
        result,
        result.phenotypeBuckets
      )}（比为 ${result.phenotypeRatio}）。`
    }
  ];

  switch (query.kind) {
    case "phenotype-ratio":
      steps.push({
        title: "得出表型比",
        body: `把各表型所占的格数化简为整数比：${result.phenotypeBuckets
          .map((bucket) => `${bucket.label} ${bucket.count} 格`)
          .join("，")}，因此表型比 = ${result.phenotypeRatio}。`
      });
      break;
    case "genotype-ratio":
      steps.push({
        title: "得出基因型比",
        body: `把各基因型所占的格数化简为整数比：${result.genotypeBuckets
          .map((bucket) => `${bucket.label} ${bucket.count} 格`)
          .join("，")}，因此基因型比 = ${result.genotypeRatio}。`
      });
      break;
    case "phenotype-probability":
    case "genotype-probability": {
      const isPhenotype = query.kind === "phenotype-probability";
      const probability = matchProbability(result, query.target, (cell, id) =>
        isPhenotype ? cell.phenotypeByTrait[id] : cell.genotypeByTrait[id]
      );
      const count = Math.round(probability * result.denominator);
      steps.push({
        title: "数出目标格子",
        body: `在 ${result.denominator} 个格子中，满足「${describeTarget(question)}」的共 ${count} 格，概率 = ${
          count
        }/${result.denominator} = ${percentOf(probability)}。`
      });
      break;
    }
    case "gamete-count": {
      const parentConfig = query.parent === "p1" ? config.p1 : config.p2;
      const gametes = query.parent === "p1" ? result.columns : result.rows;
      const heteroLoci = traits.filter((trait) => parentConfig[trait.id] === "Dd");
      steps.push({
        title: "数清配子种类",
        body: `${query.parent === "p1" ? "亲本 1" : "亲本 2"}在 ${heteroLoci.length} 个位点上杂合（${
          heteroLoci.map((trait) => trait.name).join("、") || "无"
        }），每个杂合位点使配子种类翻倍：2^${heteroLoci.length} = ${gametes.length}，即 ${gametes
          .map((gamete) => gamete.label)
          .join("、")}。`
      });
      break;
    }
  }
  return steps;
}

/* --------------------------------- 进度规则 --------------------------------- */

/** 等级解锁：第 1 级始终开放，其余等级需通关上一等级的全部题目 */
export const isLevelUnlocked = (level: number, solvedIds: ReadonlySet<string>): boolean =>
  level === 1 ||
  CHALLENGE_QUESTIONS.filter((question) => question.level === level - 1).every((question) =>
    solvedIds.has(question.id)
  );

export const questionsOfLevel = (level: number): ChallengeQuestion[] =>
  CHALLENGE_QUESTIONS.filter((question) => question.level === level);
