export interface ChromosomeSeed {
  slug: string;
  name: string;
  shortLabel: string;
  basePairs: number;
  geneCount: number;
  description: string;
  position: number;
}

export interface GeneSeed {
  slug: string;
  symbol: string;
  name: string;
  chromosomeSlug: string;
  location: string;
  length: number;
  sequence: string;
  summary: string;
  function: string;
  trait: string;
}

export interface GeneticConceptSeed {
  slug: string;
  term: string;
  category: string;
  definition: string;
  relatedGeneSlug: string | null;
}

export const chromosomes: ChromosomeSeed[] = [
  {
    slug: "chr-1",
    name: "1 号染色体",
    shortLabel: "chr1",
    basePairs: 248956422,
    geneCount: 2058,
    description: "人类最大的染色体，约占基因组总量的 8%，包含两千多个蛋白质编码基因。",
    position: 1
  },
  {
    slug: "chr-7",
    name: "7 号染色体",
    shortLabel: "chr7",
    basePairs: 159345973,
    geneCount: 1150,
    description: "携带 CFTR 基因，其突变会导致囊性纤维化；也与语言发育相关基因有关。",
    position: 2
  },
  {
    slug: "chr-11",
    name: "11 号染色体",
    shortLabel: "chr11",
    basePairs: 135086622,
    geneCount: 1300,
    description: "嗅觉受体基因家族最富集的染色体，同时携带血红蛋白与胰岛素基因。",
    position: 3
  },
  {
    slug: "chr-13",
    name: "13 号染色体",
    shortLabel: "chr13",
    basePairs: 114364328,
    geneCount: 350,
    description: "基因密度较低的染色体，BRCA2 基因位于此，与乳腺癌易感性相关。",
    position: 4
  },
  {
    slug: "chr-17",
    name: "17 号染色体",
    shortLabel: "chr17",
    basePairs: 83257441,
    geneCount: 1200,
    description: "基因密度最高的染色体之一，肿瘤抑制基因 TP53 与 BRCA1 都位于这里。",
    position: 5
  },
  {
    slug: "chr-21",
    name: "21 号染色体",
    shortLabel: "chr21",
    basePairs: 46709983,
    geneCount: 230,
    description: "最小的常染色体，其三体（多一条拷贝）会导致唐氏综合征。",
    position: 6
  },
  {
    slug: "chr-x",
    name: "X 染色体",
    shortLabel: "chrX",
    basePairs: 156040895,
    geneCount: 850,
    description: "性染色体，女性携带两条、男性携带一条，脆性 X 综合征相关基因位于此。",
    position: 7
  }
];

export const genes: GeneSeed[] = [
  {
    slug: "tp53",
    symbol: "TP53",
    name: "肿瘤蛋白 p53",
    chromosomeSlug: "chr-17",
    location: "17p13.1",
    length: 19149,
    sequence: "ATGGAGGAGCCGCAGTCAGATCCTAGCGTCGAGCCCCCTCTGAGTC",
    summary: "被称为“基因组守护者”，在 DNA 受损时决定细胞修复还是凋亡。",
    function: "编码 p53 蛋白，作为转录因子调控细胞周期停滞、DNA 修复与程序性细胞死亡。",
    trait: "超过一半的人类肿瘤中可发现 TP53 突变，是癌症研究的核心基因。"
  },
  {
    slug: "brca1",
    symbol: "BRCA1",
    name: "乳腺癌易感基因 1",
    chromosomeSlug: "chr-17",
    location: "17q21.31",
    length: 81189,
    sequence: "ATGGATTTATCTGCTCTTCGCGTTGAAGAAGTACAAAATGTCATTA",
    summary: "参与 DNA 双链断裂的修复，维持基因组稳定。",
    function: "编码的蛋白与其他修复因子形成复合体，通过同源重组修复受损 DNA。",
    trait: "特定突变会显著提高乳腺癌与卵巢癌的终生患病风险。"
  },
  {
    slug: "cftr",
    symbol: "CFTR",
    name: "囊性纤维化跨膜传导调节因子",
    chromosomeSlug: "chr-7",
    location: "7q31.2",
    length: 188702,
    sequence: "ATGCAGAGGTCGCCTCTGGAAAAGGCCAGCGTTGTCTCCAAACTTT",
    summary: "编码细胞膜上的氯离子通道，调节黏液与汗液的水分平衡。",
    function: "作为 ABC 转运蛋白家族成员，控制氯离子与碳酸氢根跨上皮细胞膜运输。",
    trait: "ΔF508 等突变导致囊性纤维化，是最常见的常染色体隐性遗传病之一。"
  },
  {
    slug: "hbb",
    symbol: "HBB",
    name: "β-珠蛋白",
    chromosomeSlug: "chr-11",
    location: "11p15.4",
    length: 1606,
    sequence: "ATGGTGCATCTGACTCCTGAGGAGAAGTCTGCCGTTACTGCCCTGT",
    summary: "血红蛋白的两个 β 亚基之一，负责在红细胞中运输氧气。",
    function: "与 α-珠蛋白和血红素组成血红蛋白四聚体，完成氧的结合与释放。",
    trait: "单个碱基突变（A→T）即可导致镰刀型贫血，是分子遗传学的经典案例。"
  },
  {
    slug: "ins",
    symbol: "INS",
    name: "胰岛素",
    chromosomeSlug: "chr-11",
    location: "11p15.5",
    length: 1434,
    sequence: "ATGGCCCTGTGGATGCGCCTCCTGCCCCTGCTGGCGCTGCTGGCCC",
    summary: "由胰岛 β 细胞分泌的激素，是血糖调节的核心信号。",
    function: "先翻译为前胰岛素原，经剪切加工后形成成熟的胰岛素分子。",
    trait: "分泌不足或作用受阻会导致糖尿病，也是首个被基因工程量产的人类蛋白。"
  },
  {
    slug: "pax6",
    symbol: "PAX6",
    name: "配对盒基因 6",
    chromosomeSlug: "chr-11",
    location: "11p13",
    length: 33171,
    sequence: "ATGCAGAACAGTCACAGCGGAGTGAATCAGCTCGGTGGTCTTTGCT",
    summary: "眼睛发育的“主控开关”，在进化上高度保守。",
    function: "作为转录因子启动晶状体、视网膜等眼部结构的发育程序。",
    trait: "突变会导致无虹膜症；在果蝇中表达小鼠 PAX6 也能诱导出眼睛结构。"
  },
  {
    slug: "brca2",
    symbol: "BRCA2",
    name: "乳腺癌易感基因 2",
    chromosomeSlug: "chr-13",
    location: "13q13.1",
    length: 84193,
    sequence: "ATGCCTATTGGATCCAAAGAGAGGCCAACATTTTTTGAAATTTTTA",
    summary: "与 BRCA1 协作完成同源重组修复，保护染色体结构完整。",
    function: "编码的蛋白将 RAD51 递送到 DNA 损伤位点，介导精确修复。",
    trait: "突变携带者的乳腺癌、卵巢癌及胰腺癌风险显著升高。"
  },
  {
    slug: "app",
    symbol: "APP",
    name: "淀粉样前体蛋白",
    chromosomeSlug: "chr-21",
    location: "21q21.3",
    length: 290802,
    sequence: "ATGCTGCCCGGTTTGGCACTGCTCCTGCTGGCCGCCTGGACGGCTC",
    summary: "神经细胞膜上的跨膜蛋白，其代谢产物与阿尔茨海默病相关。",
    function: "参与突触形成与神经可塑性，被切割后产生的 β-淀粉样肽可聚集成斑块。",
    trait: "21 号染色体三体人群因多一个 APP 拷贝，更早出现阿尔茨海默病病理。"
  },
  {
    slug: "sod1",
    symbol: "SOD1",
    name: "超氧化物歧化酶 1",
    chromosomeSlug: "chr-21",
    location: "21q22.11",
    length: 9239,
    sequence: "ATGGCGACGAAGGCCGTGTGCGTGCTGAAGGGCGACGGCCCAGTGC",
    summary: "细胞内的抗氧化卫士，清除代谢产生的超氧自由基。",
    function: "催化超氧阴离子歧化为过氧化氢与氧气，保护细胞免受氧化损伤。",
    trait: "部分突变会导致肌萎缩侧索硬化（ALS），是神经退行疾病研究模型。"
  },
  {
    slug: "fmr1",
    symbol: "FMR1",
    name: "脆性 X 智力低下基因 1",
    chromosomeSlug: "chr-x",
    location: "Xq27.3",
    length: 39127,
    sequence: "ATGGAGGAGCTGGTGGTGGAAGGCGCGCGCTGCCAGGGGGCGTGCG",
    summary: "调控突触处的蛋白质合成，影响学习与记忆。",
    function: "编码 FMRP 蛋白，结合并抑制特定 mRNA 的翻译，微调突触可塑性。",
    trait: "5' 端 CGG 重复序列异常扩增会导致脆性 X 综合征，是遗传性智力障碍主因。"
  },
  {
    slug: "mthfr",
    symbol: "MTHFR",
    name: "亚甲基四氢叶酸还原酶",
    chromosomeSlug: "chr-1",
    location: "1p36.22",
    length: 20315,
    sequence: "ATGGTGAAGCAGCTGGAGGAGCTGCTGAAGCAGATCCGCGAGCTGC",
    summary: "叶酸代谢通路的关键酶，连接营养与表观遗传。",
    function: "催化叶酸循环中的还原反应，为 DNA 合成与甲基化提供一碳单位。",
    trait: "常见多态性 C677T 会降低酶活性，与同型半胱氨酸水平升高相关。"
  }
];

export const geneticConcepts: GeneticConceptSeed[] = [
  {
    slug: "base-pairing",
    term: "碱基互补配对",
    category: "结构",
    definition: "DNA 两条链之间，腺嘌呤（A）总是与胸腺嘧啶（T）通过两个氢键配对，胞嘧啶（C）总是与鸟嘌呤（G）通过三个氢键配对。这一规则让每条链都携带完整信息的备份，是 DNA 复制与修复的基础。",
    relatedGeneSlug: null
  },
  {
    slug: "double-helix",
    term: "双螺旋",
    category: "结构",
    definition: "1953 年沃森与克里克提出的 DNA 空间结构：两条反向平行的多核苷酸链围绕同一根轴盘旋，磷酸-脱氧核糖骨架在外，碱基对在内，每圈约 10.5 个碱基对，直径约 2 纳米。",
    relatedGeneSlug: null
  },
  {
    slug: "nucleotide",
    term: "核苷酸",
    category: "结构",
    definition: "DNA 的基本单元，由脱氧核糖、磷酸基团和含氮碱基（A、T、C、G 之一）组成。核苷酸通过磷酸二酯键连接成长链，碱基的排列顺序即遗传信息本身。",
    relatedGeneSlug: null
  },
  {
    slug: "gene",
    term: "基因",
    category: "信息",
    definition: "DNA 上能够产生功能产物（通常是蛋白质或 RNA）的特定区段。人类约有 2 万个蛋白质编码基因，它们只占基因组约 1.5%，却决定了绝大多数可遗传性状。",
    relatedGeneSlug: "tp53"
  },
  {
    slug: "chromosome",
    term: "染色体",
    category: "结构",
    definition: "DNA 与组蛋白紧密缠绕形成的超螺旋结构。人类细胞有 46 条染色体（23 对），如果把一个细胞里的 DNA 全部展开拉直，长度可达约 2 米。",
    relatedGeneSlug: null
  },
  {
    slug: "genome",
    term: "基因组",
    category: "信息",
    definition: "一个生物体全部遗传信息的总和。人类基因组约含 30 亿个碱基对，分布于 23 对染色体上；任意两个人的基因组序列约有 99.9% 完全相同。",
    relatedGeneSlug: null
  },
  {
    slug: "dominance",
    term: "显性与隐性",
    category: "规律",
    definition: "当一对等位基因不同时，表现出来的性状称为显性，被掩盖的称为隐性。隐性性状只在两个拷贝都是隐性等位基因时才会表现，囊性纤维化即为隐性遗传。",
    relatedGeneSlug: "cftr"
  },
  {
    slug: "mutation",
    term: "基因突变",
    category: "变异",
    definition: "DNA 序列发生的可遗传改变，可以是一个碱基的替换（点突变），也可以是大片段的缺失或重复。突变既可能致病，也可能无害，还是进化变异的原材料。",
    relatedGeneSlug: "hbb"
  },
  {
    slug: "transcription",
    term: "转录",
    category: "过程",
    definition: "以 DNA 的一条链为模板合成信使 RNA 的过程。RNA 聚合酶识别基因启动子，按碱基互补规则（DNA 的 A 对应 RNA 的 U）合成与编码链序列一致的 mRNA。",
    relatedGeneSlug: "ins"
  },
  {
    slug: "translation",
    term: "翻译",
    category: "过程",
    definition: "核糖体读取 mRNA 上每三个碱基组成的密码子，由转运 RNA 把对应的氨基酸逐个连接起来，折叠后形成具有功能的蛋白质。",
    relatedGeneSlug: "ins"
  },
  {
    slug: "central-dogma",
    term: "中心法则",
    category: "过程",
    definition: "遗传信息流动的基本框架：DNA 通过复制传递给下一代，通过转录生成 RNA，再通过翻译合成蛋白质。信息从核酸流向蛋白质，一般不会反向流动。",
    relatedGeneSlug: null
  },
  {
    slug: "genetic-code",
    term: "遗传密码",
    category: "信息",
    definition: "三联体密码子与氨基酸之间的对应规则：64 种密码子中 61 种编码 20 种氨基酸，3 种为终止信号。这套密码几乎被地球上所有生命共享，是共同祖先的证据。",
    relatedGeneSlug: null
  }
];
