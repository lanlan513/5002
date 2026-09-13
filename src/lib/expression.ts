/**
 * DNA 突变与基因表达演示 —— 独立业务 / 数据层
 *
 * 纯函数实现「中心法则」的教学简化模型：
 *   DNA（编码链）-> 转录 -> mRNA -> 翻译 -> 蛋白质
 * 以及碱基编辑（替换 / 插入 / 缺失）对序列与翻译结果的影响分析。
 * 无 React / DOM 依赖，可单独测试。
 *
 * 注意：这是教学简化模型，不包含启动子调控、RNA 剪接、蛋白质折叠等
 * 真实机制；所有「影响」描述均为可能性说明，不构成任何医学结论。
 */

/* --------------------------------- 遗传密码 --------------------------------- */

export interface AminoInfo {
  /** 三字母缩写，如 Met；终止为 Stop */
  code: string;
  /** 中文名，如 甲硫氨酸；终止为 终止 */
  name: string;
  isStop: boolean;
}

const AMINO: Record<string, [code: string, name: string]> = {
  F: ["Phe", "苯丙氨酸"],
  L: ["Leu", "亮氨酸"],
  I: ["Ile", "异亮氨酸"],
  M: ["Met", "甲硫氨酸"],
  V: ["Val", "缬氨酸"],
  S: ["Ser", "丝氨酸"],
  P: ["Pro", "脯氨酸"],
  T: ["Thr", "苏氨酸"],
  A: ["Ala", "丙氨酸"],
  Y: ["Tyr", "酪氨酸"],
  H: ["His", "组氨酸"],
  Q: ["Gln", "谷氨酰胺"],
  N: ["Asn", "天冬酰胺"],
  K: ["Lys", "赖氨酸"],
  D: ["Asp", "天冬氨酸"],
  E: ["Glu", "谷氨酸"],
  C: ["Cys", "半胱氨酸"],
  W: ["Trp", "色氨酸"],
  R: ["Arg", "精氨酸"],
  G: ["Gly", "甘氨酸"],
  "*": ["Stop", "终止"]
};

/** 标准遗传密码表（以编码链 DNA 字母书写，T 对应 mRNA 的 U） */
const CODON_MAP: Record<string, string> = {
  TTT: "F", TTC: "F", TTA: "L", TTG: "L",
  CTT: "L", CTC: "L", CTA: "L", CTG: "L",
  ATT: "I", ATC: "I", ATA: "I", ATG: "M",
  GTT: "V", GTC: "V", GTA: "V", GTG: "V",
  TCT: "S", TCC: "S", TCA: "S", TCG: "S",
  CCT: "P", CCC: "P", CCA: "P", CCG: "P",
  ACT: "T", ACC: "T", ACA: "T", ACG: "T",
  GCT: "A", GCC: "A", GCA: "A", GCG: "A",
  TAT: "Y", TAC: "Y", TAA: "*", TAG: "*",
  CAT: "H", CAC: "H", CAA: "Q", CAG: "Q",
  AAT: "N", AAC: "N", AAA: "K", AAG: "K",
  GAT: "D", GAC: "D", GAA: "E", GAG: "E",
  TGT: "C", TGC: "C", TGA: "*", TGG: "W",
  CGT: "R", CGC: "R", CGA: "R", CGG: "R",
  AGT: "S", AGC: "S", AGA: "R", AGG: "R",
  GGT: "G", GGC: "G", GGA: "G", GGG: "G"
};

const UNKNOWN_AMINO: AminoInfo = { code: "?", name: "未知", isStop: false };

export function aminoOf(codon: string): AminoInfo {
  const key = CODON_MAP[codon.toUpperCase()];
  if (!key) return UNKNOWN_AMINO;
  const [code, name] = AMINO[key];
  return { code, name, isStop: key === "*" };
}

/* --------------------------------- 序列编辑 --------------------------------- */

/**
 * 对「正常序列」的一组编辑。三种操作都以正常序列的原始位置为锚点，
 * 因此无论用户按什么顺序操作，对齐结果都是确定且可解释的。
 */
export interface SequenceEdits {
  /** 位置 -> 替换后的碱基 */
  subs: Record<number, string>;
  /** 被删除的原始位置 */
  dels: number[];
  /** 在原始位置 i 之前插入的碱基串（i 取 0..len-1） */
  inserts: Record<number, string>;
}

export const emptyEdits = (): SequenceEdits => ({ subs: {}, dels: [], inserts: {} });

export const hasEdits = (edits: SequenceEdits): boolean =>
  Object.keys(edits.subs).length > 0 ||
  edits.dels.length > 0 ||
  Object.keys(edits.inserts).length > 0;

/** 对齐后的一列：正常序列与突变序列在同一位置上的碱基（null 表示空缺） */
export interface AlignColumn {
  kind: "same" | "sub" | "ins" | "del";
  wtBase: string | null;
  mutBase: string | null;
  /** 在正常序列中的 0 起始位置；插入列为 null */
  wtIndex: number | null;
}

/** 应用编辑，返回突变序列与逐列对齐结果 */
export function buildAlignment(
  wt: string,
  edits: SequenceEdits
): { mutant: string; columns: AlignColumn[] } {
  const delSet = new Set(edits.dels);
  const columns: AlignColumn[] = [];
  const pushInserts = (index: number) => {
    const inserted = edits.inserts[index];
    if (!inserted) return;
    for (const base of inserted) {
      columns.push({ kind: "ins", wtBase: null, mutBase: base, wtIndex: null });
    }
  };
  for (let i = 0; i < wt.length; i++) {
    pushInserts(i);
    const wtBase = wt[i];
    if (delSet.has(i)) {
      columns.push({ kind: "del", wtBase, mutBase: null, wtIndex: i });
    } else {
      const sub = edits.subs[i];
      const mutBase = sub && sub !== wtBase ? sub : wtBase;
      columns.push({ kind: mutBase !== wtBase ? "sub" : "same", wtBase, mutBase, wtIndex: i });
    }
  }
  pushInserts(wt.length);
  const mutant = columns
    .filter((column) => column.mutBase !== null)
    .map((column) => column.mutBase)
    .join("");
  return { mutant, columns };
}

/* --------------------------------- 转录与翻译 --------------------------------- */

/** 转录：编码链上的 T 在 mRNA 中由 U 替代（简化模型，直接以编码链演示） */
export const transcribe = (dna: string): string => dna.replace(/T/g, "U");

export interface Codon {
  /** 密码子序号（0 起始） */
  index: number;
  /** 3 个碱基（编码链字母） */
  dna: string;
  amino: AminoInfo;
}

export interface Translation {
  /** 从第 1 个密码子到终止密码子（含）或序列末端 */
  codons: Codon[];
  /** 仅氨基酸（不含终止密码子） */
  protein: AminoInfo[];
  /** 是否遇到终止密码子 */
  stopped: boolean;
  /** 末尾不足以组成密码子的碱基数（遇到终止时为 0） */
  remainder: number;
}

/** 翻译：从阅读框第 1 个密码子开始，遇到终止密码子停止 */
export function translate(dna: string): Translation {
  const codons: Codon[] = [];
  const protein: AminoInfo[] = [];
  let stopped = false;
  const usable = dna.length - (dna.length % 3);
  for (let i = 0; i < usable; i += 3) {
    const triplet = dna.slice(i, i + 3);
    const amino = aminoOf(triplet);
    codons.push({ index: i / 3, dna: triplet, amino });
    if (amino.isStop) {
      stopped = true;
      break;
    }
    protein.push(amino);
  }
  return { codons, protein, stopped, remainder: stopped ? 0 : dna.length % 3 };
}

/* --------------------------------- 影响分析 --------------------------------- */

export type MutationClass =
  | "none"
  | "silent"
  | "missense"
  | "nonsense"
  | "frameshift"
  | "inframe-indel"
  | "stop-loss";

export const CLASS_LABELS: Record<MutationClass, string> = {
  none: "未发生突变",
  silent: "同义突变",
  missense: "错义突变",
  nonsense: "无义突变（提前终止）",
  frameshift: "移码突变",
  "inframe-indel": "整码插入 / 缺失",
  "stop-loss": "终止密码子丢失"
};

export interface ExpressionAnalysis {
  wt: string;
  mutant: string;
  columns: AlignColumn[];
  wtTranslation: Translation;
  mutTranslation: Translation;
  /** 与正常序列不同的对齐列数（替换 + 插入 + 缺失） */
  changedColumns: number;
  /** 插入与缺失的碱基总数 */
  indelBases: number;
  classification: MutationClass;
  classLabel: string;
  /** 对分类结果的解释，措辞保持「可能性」而非确定性结论 */
  classSummary: string;
  /** 同位置氨基酸发生变化的位点（错义视角，移码时会很长） */
  aminoChanges: { index: number; wt: AminoInfo; mut: AminoInfo }[];
  /** 附加说明：起始 / 终止密码子、片段末端等 */
  notes: string[];
  startLost: boolean;
  stopLost: boolean;
}

export function analyzeExpression(wt: string, edits: SequenceEdits): ExpressionAnalysis {
  const { mutant, columns } = buildAlignment(wt, edits);
  const wtTranslation = translate(wt);
  const mutTranslation = translate(mutant);

  const changedColumns = columns.filter((column) => column.kind !== "same").length;
  const indelBases =
    edits.dels.length +
    Object.values(edits.inserts).reduce((sum, bases) => sum + bases.length, 0);

  const wtProtein = wtTranslation.protein;
  const mutProtein = mutTranslation.protein;
  const sameProtein =
    wtProtein.length === mutProtein.length &&
    wtProtein.every((amino, index) => amino.code === mutProtein[index].code);
  const mutIsPrefix =
    mutProtein.length < wtProtein.length &&
    mutProtein.every((amino, index) => amino.code === wtProtein[index].code);

  const startLost = wt.startsWith("ATG") && !mutant.startsWith("ATG");
  const stopLost = wtTranslation.stopped && !mutTranslation.stopped;

  // 分类：移码优先，其次提前终止 / 终止丢失，再看整码与点突变
  let classification: MutationClass;
  if (!hasEdits(edits)) classification = "none";
  else if (indelBases % 3 !== 0) classification = "frameshift";
  else if (sameProtein) classification = "silent";
  else if (indelBases > 0) classification = "inframe-indel";
  else if (mutTranslation.stopped && mutIsPrefix) classification = "nonsense";
  else if (stopLost) classification = "stop-loss";
  else classification = "missense";

  const aminoChanges: ExpressionAnalysis["aminoChanges"] = [];
  const shared = Math.min(wtProtein.length, mutProtein.length);
  for (let i = 0; i < shared; i++) {
    if (wtProtein[i].code !== mutProtein[i].code) {
      aminoChanges.push({ index: i, wt: wtProtein[i], mut: mutProtein[i] });
    }
  }

  // 第一个氨基酸发生变化（或蛋白质长度变化）的密码子序号，用于定位移码 / 终止位置
  const firstDiffCodon = (() => {
    for (let i = 0; i < shared; i++) {
      if (wtProtein[i].code !== mutProtein[i].code) return i;
    }
    return wtProtein.length === mutProtein.length ? -1 : shared;
  })();

  const firstSub = Object.keys(edits.subs)
    .map(Number)
    .sort((a, b) => a - b)[0];

  const classSummary = buildSummary(classification, {
    edits,
    wtTranslation,
    mutTranslation,
    indelBases,
    firstDiffCodon,
    firstSub
  });

  const notes: string[] = [];
  if (startLost) {
    notes.push(
      "起始密码子 ATG 被破坏：真实细胞中核糖体可能无法在此正常起始翻译（或改用下游的其他起始位点）。为便于对比，本模型仍从第 1 个密码子开始演示。"
    );
  }
  if (classification !== "stop-loss" && stopLost) {
    notes.push("原来的终止密码子已失效，本模型中翻译持续到序列末端。");
  }
  if (!wtTranslation.stopped) {
    notes.push("当前序列是一个基因片段，未包含终止密码子，因此翻译一直持续到片段末端。");
  }
  if (mutTranslation.remainder > 0) {
    notes.push(
      `突变序列末尾剩余 ${mutTranslation.remainder} 个碱基，不足以组成完整密码子，未参与翻译。`
    );
  }
  if (hasEdits(edits)) {
    notes.push(
      "序列层面的变化 ≠ 确定性的后果。同样的变化在不同基因、不同个体与不同环境下，意义可能完全不同。"
    );
  }

  return {
    wt,
    mutant,
    columns,
    wtTranslation,
    mutTranslation,
    changedColumns,
    indelBases,
    classification,
    classLabel: CLASS_LABELS[classification],
    classSummary,
    aminoChanges,
    notes,
    startLost,
    stopLost
  };
}

function buildSummary(
  classification: MutationClass,
  context: {
    edits: SequenceEdits;
    wtTranslation: Translation;
    mutTranslation: Translation;
    indelBases: number;
    firstDiffCodon: number;
    firstSub: number | undefined;
  }
): string {
  const { edits, wtTranslation, mutTranslation, indelBases, firstDiffCodon, firstSub } = context;
  const wtProtein = wtTranslation.protein;
  const mutProtein = mutTranslation.protein;

  switch (classification) {
    case "none":
      return "当前序列与正常序列完全一致。点击上方任意碱基进行修改，或运行一个预设突变，观察变化如何沿「DNA → RNA → 蛋白质」一步步传递。";
    case "silent": {
      const codon = firstSub !== undefined ? Math.floor(firstSub / 3) + 1 : null;
      const where = codon !== null ? `第 ${codon} 个密码子的碱基变了` : "部分密码子的碱基变了";
      return `${where}，但编码的氨基酸不变——这就是遗传密码的简并性（多个密码子对应同一种氨基酸）。同义突变通常不改变蛋白质序列，但在真实细胞中也可能影响翻译效率或 RNA 加工，并非绝对「无效」。`;
    }
    case "missense": {
      const count = mutProtein.filter((amino, i) => amino.code !== wtProtein[i]?.code).length;
      const first = firstDiffCodon >= 0 ? firstDiffCodon : 0;
      const from = wtProtein[first];
      const to = mutProtein[first];
      const example =
        from && to ? `例如第 ${first + 1} 位氨基酸由${from.name}变为${to.name}` : "";
      return `蛋白质中 ${count} 个氨基酸发生改变。${example}。单个氨基酸替换的影响取决于该位置在蛋白质结构中的作用：位于关键区域可能影响折叠或活性，位于次要区域也可能几乎没有可察觉的影响——仅凭序列无法断定后果。`;
    }
    case "nonsense": {
      const stopCodon = mutTranslation.codons[mutProtein.length];
      const where = stopCodon ? `第 ${stopCodon.index + 1} 个密码子变为终止密码子` : "出现了新的终止密码子";
      return `${where}，翻译提前结束：蛋白质由 ${wtProtein.length} 个氨基酸缩短为 ${mutProtein.length} 个。截短的蛋白质可能丧失部分或全部功能，对应的 mRNA 也可能被细胞的质量监控机制清除；实际后果仍取决于基因与突变位置。`;
    }
    case "frameshift": {
      const where = firstDiffCodon >= 0 ? `约从第 ${firstDiffCodon + 1} 个密码子起` : "从突变位点起";
      return `插入 / 缺失的碱基总数（${indelBases}）不是 3 的倍数，${where}阅读框整体移动，下游的氨基酸序列完全改变，并且常常会提前遇到终止密码子。移码通常对蛋白质影响较大，但具体后果仍取决于发生的位置与基因本身。`;
    }
    case "inframe-indel": {
      const codons = indelBases / 3;
      const direction = mutProtein.length > wtProtein.length ? "增加" : "减少";
      return `插入 / 缺失了 ${indelBases} 个碱基（${codons} 个完整密码子），阅读框保持不变，蛋白质${direction}了 ${Math.abs(
        mutProtein.length - wtProtein.length
      )} 个氨基酸，其余部分不受影响。影响取决于这些氨基酸在蛋白质结构中的位置。`;
    }
    case "stop-loss":
      return "终止密码子被破坏，本模型中翻译一直持续到序列末端。真实细胞中核糖体会继续阅读，直到遇到下一个终止密码子，可能产生异常延长的蛋白质。";
    default:
      return "";
  }
}

/* --------------------------------- 预设突变 --------------------------------- */

export interface MutationPreset {
  id: string;
  tag: string;
  title: string;
  story: string;
  /** 根据当前正常序列计算一组编辑；找不到合适位置时返回 null（不展示） */
  build: (wt: string) => SequenceEdits | null;
}

const BASES = ["A", "T", "C", "G"] as const;

/** 扫描每个密码子（跳过起始密码子），找到第一个满足条件的单碱基替换 */
const findSubstitution = (
  wt: string,
  predicate: (before: string, after: string) => boolean
): SequenceEdits | null => {
  const codonCount = Math.floor(wt.length / 3);
  for (let codon = 1; codon < codonCount; codon++) {
    const triplet = wt.slice(codon * 3, codon * 3 + 3);
    // 优先改第 3 位（最可能同义），再试前两位
    for (const position of [2, 0, 1]) {
      const index = codon * 3 + position;
      for (const base of BASES) {
        if (base === wt[index]) continue;
        const after = triplet.slice(0, position) + base + triplet.slice(position + 1);
        if (predicate(triplet, after)) return { subs: { [index]: base }, dels: [], inserts: {} };
      }
    }
  }
  return null;
};

export const MUTATION_PRESETS: MutationPreset[] = [
  {
    id: "silent",
    tag: "同义突变",
    title: "换一个「同义密码子」",
    story: "改变一个碱基，但密码子对应的氨基酸不变。观察蛋白质序列为何保持原样。",
    build: (wt) => findSubstitution(wt, (before, after) => aminoOf(before).code === aminoOf(after).code)
  },
  {
    id: "missense",
    tag: "错义突变",
    title: "改变一个氨基酸",
    story: "改变一个碱基，使某个密码子对应另一种氨基酸。蛋白质序列出现一处差异。",
    build: (wt) =>
      findSubstitution(
        wt,
        (before, after) => !aminoOf(after).isStop && aminoOf(before).code !== aminoOf(after).code
      )
  },
  {
    id: "nonsense",
    tag: "无义突变",
    title: "制造一个终止密码子",
    story: "把某个密码子变成终止密码子，翻译提前结束，蛋白质被截短。",
    build: (wt) => findSubstitution(wt, (_before, after) => aminoOf(after).isStop)
  },
  {
    id: "frameshift",
    tag: "移码突变",
    title: "缺失一个碱基",
    story: "删除序列中段的一个碱基。从此处开始，阅读框整体移动，下游氨基酸全部改变。",
    build: (wt) => {
      if (wt.length < 9) return null;
      return { subs: {}, dels: [Math.floor(wt.length / 2)], inserts: {} };
    }
  },
  {
    id: "inframe-del",
    tag: "整码缺失",
    title: "缺失整个密码子",
    story: "一次删除完整的 3 个碱基（一个密码子）。阅读框不变，蛋白质只少一个氨基酸。",
    build: (wt) => {
      const codonCount = Math.floor(wt.length / 3);
      if (codonCount < 4) return null;
      const start = Math.floor(codonCount / 3) * 3;
      return { subs: {}, dels: [start, start + 1, start + 2], inserts: {} };
    }
  }
];

/** HBB 经典案例：GAG -> GTG（成熟 β-珠蛋白第 6 位 Glu -> Val），仅当序列吻合时可用 */
export const HBB_SICKLE_PRESET: MutationPreset = {
  id: "hbb-sickle",
  tag: "经典案例",
  title: "HBB 第 7 密码子 GAG → GTG",
  story:
    "这是研究得最充分的点突变之一。它编码的谷氨酸是成熟 β-珠蛋白的第 6 位（起始甲硫氨酸在加工中被切除，故经典文献记作 Glu6Val），变为缬氨酸后，两个拷贝都携带时与镰刀型贫血相关；只携带一个拷贝时通常没有明显症状，在疟疾流行地区甚至可能具有生存优势——同一突变在不同遗传背景与环境下意义截然不同。",
  build: (wt) =>
    wt.slice(18, 21) === "GAG" ? { subs: { 19: "T" }, dels: [], inserts: {} } : null
};

/** 随机点突变：随机选一个位置替换为其他碱基 */
export function randomSubstitution(wt: string, random: () => number = Math.random): SequenceEdits {
  const index = Math.floor(random() * wt.length);
  const choices = BASES.filter((base) => base !== wt[index]);
  const base = choices[Math.floor(random() * choices.length)];
  return { subs: { [index]: base }, dels: [], inserts: {} };
}
