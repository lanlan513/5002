import type { BioRecord, CategoryMeta } from "../../shared/contract.js";

/** 五大数据域的元信息（图标名与前端 iconMap 对应） */
export const categories: CategoryMeta[] = [
  {
    slug: "species",
    name: "物种",
    englishName: "Species",
    description: "物种档案、分布、保护等级与形态记录，覆盖动物、植物与微生物。",
    color: "#67d8a3",
    icon: "leaf"
  },
  {
    slug: "gene",
    name: "基因",
    englishName: "Genes",
    description: "基因符号、序列、功能注释与跨物种同源信息的统一索引。",
    color: "#e8b65f",
    icon: "git-fork"
  },
  {
    slug: "cell",
    name: "细胞",
    englishName: "Cells",
    description: "细胞类型、表达特征、显微影像与单细胞测序数据。",
    color: "#e48ac2",
    icon: "circle-dot"
  },
  {
    slug: "ecosystem",
    name: "生态系统",
    englishName: "Ecosystems",
    description: "生物群系、能量流动、监测站点与生态网络的长期观测。",
    color: "#7eb0f2",
    icon: "network"
  },
  {
    slug: "human",
    name: "人体",
    englishName: "Human Body",
    description: "器官系统、组织、生理指标与临床参考数据。",
    color: "#ef8a72",
    icon: "heart-pulse"
  }
];

const t = (iso: string) => Date.parse(iso);

/**
 * 统一记录池：所有数据域共用 BioRecord 结构。
 * 数据为演示用整理的公开常识，数值多为近似值。
 */
export const records: BioRecord[] = [
  // ───────────────────────── 物种 species ─────────────────────────
  {
    id: "sp-homo-sapiens",
    category: "species",
    dataType: "物种档案",
    name: "智人",
    latinName: "Homo sapiens",
    code: "NCBI:9606",
    summary: "灵长目人科唯一现存物种，以复杂语言、工具与文化为标志。",
    description:
      "智人约在 30 万年前出现于非洲，随后扩散至全球。体细胞含 23 对染色体，基因组约 32 亿个碱基对。作为研究最深入的物种，其参考基因组是现代医学与比较生物学的基础。",
    taxonomy: { kingdom: "动物界", phylum: "脊索动物门", klass: "哺乳纲", order: "灵长目", family: "人科" },
    taxonPath: ["动物界", "脊索动物门", "哺乳纲", "灵长目", "人科", "人属"],
    themes: ["进化", "遗传", "生理", "神经科学"],
    metrics: [
      { label: "基因组大小", value: "≈ 3.2 Gb" },
      { label: "染色体", value: "23 对" },
      { label: "预计基因数", value: "≈ 20,000" }
    ],
    attributes: { 保护等级: "无危 LC", 平均寿命: "约 73 年（全球平均）", 化石头骨: "赫托、杰贝尔伊尔胡德" },
    links: [{ label: "NCBI Taxonomy" }, { label: "Ensembl" }],
    location: "全球分布",
    updatedAt: t("2026-08-02"),
    source: "演示数据集 · NCBI / Ensembl"
  },
  {
    id: "sp-drosophila-melanogaster",
    category: "species",
    dataType: "物种档案",
    name: "黑腹果蝇",
    latinName: "Drosophila melanogaster",
    code: "NCBI:7227",
    summary: "遗传学与发育生物学的经典模式生物，生命周期短、突变品系丰富。",
    description:
      "黑腹果蝇仅有 4 对染色体，多线染色体巨大且易于观察。摩尔根学派利用它建立了染色体遗传理论，至今仍是神经科学、行为与发育研究的核心模型。",
    taxonomy: { kingdom: "动物界", phylum: "节肢动物门", klass: "昆虫纲", order: "双翅目", family: "果蝇科" },
    taxonPath: ["动物界", "节肢动物门", "昆虫纲", "双翅目", "果蝇科", "果蝇属"],
    themes: ["遗传", "发育", "神经科学", "进化"],
    metrics: [
      { label: "染色体", value: "4 对" },
      { label: "世代周期", value: "≈ 10 天（25 ℃）" },
      { label: "基因数", value: "≈ 14,000" }
    ],
    attributes: { 保护等级: "无危 LC", 起源地: "非洲热带", 研究贡献: "染色体遗传、Hox 基因" },
    links: [{ label: "FlyBase" }],
    location: "全球伴人分布",
    updatedAt: t("2026-06-18"),
    source: "演示数据集 · FlyBase"
  },
  {
    id: "sp-ara-macao",
    category: "species",
    dataType: "保护监测",
    name: "五彩金刚鹦鹉",
    latinName: "Ara macao",
    code: "IUCN:22685573",
    summary: "新热带界体型最大的鹦鹉之一，羽色鲜艳，依赖成熟低地雨林。",
    description:
      "五彩金刚鹦鹉寿命可超过 50 年，成对形成终身配偶关系，主要取食高大乔木的大型种子。栖息地破碎化与宠物贸易导致多地种群下降，已在墨西哥部分区域重新引入。",
    taxonomy: { kingdom: "动物界", phylum: "脊索动物门", klass: "鸟纲", order: "鹦鹉目", family: "鹦鹉科" },
    taxonPath: ["动物界", "脊索动物门", "鸟纲", "鹦鹉目", "鹦鹉科", "金刚鹦鹉属"],
    themes: ["保护", "进化", "动物行为"],
    metrics: [
      { label: "体长", value: "80–90 cm" },
      { label: "体重", value: "≈ 1 kg" },
      { label: "每窝产卵", value: "2–4 枚" }
    ],
    attributes: { 保护等级: "无危 LC（种群下降）", 栖息地: "低地热带雨林", 威胁: "栖息地丧失、宠物贸易" },
    links: [{ label: "IUCN Red List" }],
    location: "中南美洲热带雨林",
    updatedAt: t("2026-03-27"),
    source: "演示数据集 · IUCN"
  },
  {
    id: "sp-quercus-robur",
    category: "species",
    dataType: "标本记录",
    name: "夏栎",
    latinName: "Quercus robur",
    code: "POWO:urn:lsid:ipni.org:names:296680-1",
    summary: "欧洲标志性落叶乔木，树龄可达千年，支持数百种关联昆虫。",
    description:
      "夏栎木质坚硬耐腐，是造船与建筑的传统用材。它的坚果（橡子）是松鼠、松鸦与有蹄类的重要秋季食物，单株老树可构成微型生物多样性热点。",
    taxonomy: { kingdom: "植物界", phylum: "维管植物门", klass: "木兰纲", order: "壳斗目", family: "壳斗科" },
    taxonPath: ["植物界", "维管植物门", "木兰纲", "壳斗目", "壳斗科", "栎属"],
    themes: ["植物学", "生态", "进化"],
    metrics: [
      { label: "树高", value: "20–40 m" },
      { label: "寿命", value: "可达 1000 年" },
      { label: "关联物种", value: "数百种昆虫" }
    ],
    attributes: { 保护等级: "无危 LC", 生活型: "落叶乔木", "传粉:": "风媒" },
    links: [{ label: "Plants of the World Online" }],
    location: "欧洲至西亚",
    updatedAt: t("2025-11-09"),
    source: "演示数据集 · POWO"
  },
  {
    id: "sp-corallium-rubrum",
    category: "species",
    dataType: "保护监测",
    name: "红珊瑚",
    latinName: "Corallium rubrum",
    code: "IUCN:133207",
    summary: "地中海贵珊瑚，红色钙质骨骼支撑着八放珊瑚群体。",
    description:
      "红珊瑚生长极慢、寿命长，栖息于硬底质岩礁。数千年来因珠宝采集而承受压力，深水避难种群成为管理与保护的关键。",
    taxonomy: { kingdom: "动物界", phylum: "刺胞动物门", klass: "珊瑚虫纲", order: "软珊瑚目", family: "珊瑚科" },
    taxonPath: ["动物界", "刺胞动物门", "珊瑚虫纲", "软珊瑚目", "珊瑚科", "珊瑚属"],
    themes: ["海洋", "保护", "生态"],
    metrics: [
      { label: "水深范围", value: "20–200 m" },
      { label: "年生长", value: "数毫米" },
      { label: "群体寿命", value: "可达百年" }
    ],
    attributes: { 保护等级: "近危 NT", 栖息地: "岩礁底质", 威胁: "过度采集、拖网" },
    links: [{ label: "IUCN Red List" }],
    location: "地中海及东大西洋",
    updatedAt: t("2026-01-21"),
    source: "演示数据集 · IUCN"
  },
  {
    id: "sp-dinorosea",
    category: "species",
    dataType: "化石记录",
    name: "霸王龙",
    latinName: "Tyrannosaurus rex",
    code: "PBDB:rank1",
    summary: "白垩纪末期的大型兽脚类恐龙，咬合力居陆生动物之首。",
    description:
      "霸王龙体长可达 12 米，拥有香蕉大小的锯齿牙齿与双目视觉。化石发现于北美西部的晚白垩世地层，是研究恐龙生理与灭绝事件的代表物种。",
    taxonomy: { kingdom: "动物界", phylum: "脊索动物门", klass: "蜥形纲", order: "蜥臀目", family: "暴龙科" },
    taxonPath: ["动物界", "脊索动物门", "蜥形纲", "蜥臀目", "暴龙科", "暴龙属"],
    themes: ["进化", "古生物"],
    metrics: [
      { label: "体长", value: "≈ 12 m" },
      { label: "体重", value: "6–9 t" },
      { label: "灭绝时间", value: "≈ 6600 万年前" }
    ],
    attributes: { 化石状态: "已灭绝", 时代: "晚白垩世", 典型标本: "Sue、Stan" },
    links: [{ label: "Paleobiology Database" }],
    location: "北美西部（化石）",
    updatedAt: t("2025-09-15"),
    source: "演示数据集 · PBDB"
  },
  {
    id: "sp-e-coli",
    category: "species",
    dataType: "物种档案",
    name: "大肠杆菌",
    latinName: "Escherichia coli",
    code: "NCBI:562",
    summary: "肠道核心共生菌，也是分子生物学最重要的原核模型。",
    description:
      "大肠杆菌 K-12 株约 20 分钟即可分裂一次，环状基因组约 460 万碱基对。重组 DNA 技术以它为底盘细胞，绝大多数基因工程流程都围绕其工程菌株展开。",
    taxonomy: { kingdom: "细菌界", phylum: "变形菌门", klass: "γ-变形菌纲", order: "肠杆菌目", family: "肠杆菌科" },
    taxonPath: ["细菌界", "变形菌门", "γ-变形菌纲", "肠杆菌目", "肠杆菌科", "埃希氏菌属"],
    themes: ["微生物", "遗传", "分子生物学", "免疫"],
    metrics: [
      { label: "基因组大小", value: "≈ 4.6 Mb" },
      { label: "倍增时间", value: "≈ 20 min" },
      { label: "代表菌株", value: "K-12、BL21" }
    ],
    attributes: { 革兰氏: "阴性", 关系: "多数共生，部分致病", 氧需求: "兼性厌氧" },
    links: [{ label: "NCBI Genome" }],
    location: "恒温动物肠道",
    updatedAt: t("2026-07-11"),
    source: "演示数据集 · NCBI"
  },
  {
    id: "sp-saccharomyces",
    category: "species",
    dataType: "物种档案",
    name: "酿酒酵母",
    latinName: "Saccharomyces cerevisiae",
    code: "NCBI:4932",
    summary: "第一种完成基因组测序的真核生物，真核细胞生物学的基石模型。",
    description:
      "酿酒酵母既可出芽生殖也可有性生殖，约 6000 个基因中许多与人类同源。它连接了烘焙酿造传统与现代细胞周期、自噬研究，也是合成生物学常用底盘。",
    taxonomy: { kingdom: "真菌界", phylum: "子囊菌门", klass: "酵母纲", order: "酵母目", family: "酵母科" },
    taxonPath: ["真菌界", "子囊菌门", "酵母纲", "酵母目", "酵母科", "酵母属"],
    themes: ["微生物", "细胞生物学", "遗传", "生物技术"],
    metrics: [
      { label: "基因组大小", value: "≈ 12 Mb" },
      { label: "染色体", value: "16 条" },
      { label: "基因数", value: "≈ 6,000" }
    ],
    attributes: { 保护等级: "不适用", 营养方式: "异养", "应用": "发酵、合成生物学" },
    links: [{ label: "SGD" }],
    location: "全球（果实、发酵环境）",
    updatedAt: t("2026-05-30"),
    source: "演示数据集 · SGD"
  },
  {
    id: "sp-influenza-a",
    category: "species",
    dataType: "序列记录",
    name: "甲型流感病毒",
    latinName: "Influenza A virus",
    code: "NCBI:11320",
    summary: "分节段负链 RNA 病毒，血凝素与神经氨酸酶组合决定亚型命名。",
    description:
      "甲型流感病毒的 8 个 RNA 节段可在共感染时重配，产生新型毒株。H 与 N 表面抗原的组合（如 H1N1、H3N2）是监测与疫苗株选择的核心依据。",
    taxonomy: { kingdom: "病毒", phylum: "负核糖核酸病毒门", klass: "流感病毒纲", order: "阿尔布病毒目", family: "正黏病毒科" },
    taxonPath: ["病毒", "负核糖核酸病毒门", "流感病毒纲", "阿尔布病毒目", "正黏病毒科", "甲型流感病毒属"],
    themes: ["微生物", "疾病", "免疫", "进化"],
    metrics: [
      { label: "基因组", value: "8 个 (-)ssRNA 节段" },
      { label: "直径", value: "80–120 nm" },
      { label: "变异机制", value: "抗原漂移 / 转换" }
    ],
    attributes: { 包膜: "有", 宿主: "鸟类、哺乳类", 监测网络: "GISRS" },
    links: [{ label: "NCBI Virus" }],
    location: "全球流行",
    updatedAt: t("2026-02-14"),
    source: "演示数据集 · NCBI Virus"
  },

  // ───────────────────────── 基因 gene ─────────────────────────
  {
    id: "gn-brca1-hs",
    category: "gene",
    dataType: "基因序列",
    name: "BRCA1",
    code: "HGNC:1100",
    latinName: "BRCA1 DNA repair associated",
    summary: "人类乳腺癌易感基因，编码参与双链断裂修复的核蛋白。",
    description:
      "BRCA1 蛋白协同 BRCA2 与 RAD51 完成同源重组修复。胚系功能缺失突变显著提高乳腺癌与卵巢癌风险；PARP 抑制剂对 BRCA 缺陷肿瘤具有合成致死疗效。",
    taxonomy: { kingdom: "动物界", phylum: "脊索动物门", klass: "哺乳纲", order: "灵长目", family: "人科" },
    taxonPath: ["Homo sapiens", "17 号染色体", "17q21.31"],
    themes: ["遗传", "疾病", "分子生物学", "生物技术"],
    metrics: [
      { label: "染色体位置", value: "17q21.31" },
      { label: "转录本", value: "多种可变剪接" },
      { label: "蛋白长度", value: "1863 aa（主亚型）" }
    ],
    attributes: { 基因类型: "蛋白编码", 核心功能: "DNA 双链断裂修复", 关联疾病: "遗传性乳腺/卵巢癌" },
    links: [{ label: "NCBI Gene" }, { label: "ClinVar" }],
    updatedAt: t("2026-08-20"),
    source: "演示数据集 · NCBI Gene / ClinVar"
  },
  {
    id: "gn-cftr-hs",
    category: "gene",
    dataType: "变异注释",
    name: "CFTR",
    code: "HGNC:1884",
    latinName: "CF transmembrane conductance regulator",
    summary: "编码氯离子通道，F508del 突变是囊性纤维化最常见病因。",
    description:
      "CFTR 是 ABC 转运蛋白家族的 cAMP 依赖性氯离子通道。ΔF508 导致蛋白错误折叠与降解，引起外分泌腺功能障碍；矫正剂与增效剂联合治疗可恢复部分通道功能。",
    taxonomy: { kingdom: "动物界", phylum: "脊索动物门", klass: "哺乳纲", order: "灵长目", family: "人科" },
    taxonPath: ["Homo sapiens", "7 号染色体", "7q31.2"],
    themes: ["遗传", "疾病", "分子生物学", "生理"],
    metrics: [
      { label: "染色体位置", value: "7q31.2" },
      { label: "外显子", value: "27 个" },
      { label: "致病变异", value: "2000+" }
    ],
    attributes: { 基因类型: "蛋白编码", 核心功能: "氯离子跨膜转运", 关联疾病: "囊性纤维化" },
    links: [{ label: "NCBI Gene" }],
    updatedAt: t("2026-04-03"),
    source: "演示数据集 · NCBI Gene"
  },
  {
    id: "gn-pax6",
    category: "gene",
    dataType: "同源基因集",
    name: "PAX6",
    code: "HGNC:8620",
    latinName: "paired box 6",
    summary: "高度保守的眼睛与神经发育主控基因，果蝇 eyeless 的人类同源物。",
    description:
      "PAX6 编码含配对结构域的转录因子，在视泡、晶状体与中枢神经发育中处于调控网络上游。跨动物界的序列保守性使它成为研究深同源性的经典案例。",
    taxonomy: { kingdom: "动物界", phylum: "脊索动物门", klass: "哺乳纲", order: "灵长目", family: "人科" },
    taxonPath: ["动物界（跨门保守）", "Homo sapiens", "11p13"],
    themes: ["发育", "进化", "遗传", "神经科学"],
    metrics: [
      { label: "人染色体", value: "11p13" },
      { label: "蛋白家族", value: "PAX 转录因子" },
      { label: "保守跨度", value: "> 5 亿年" }
    ],
    attributes: { 基因类型: "转录因子", 核心功能: "眼与神经发育", "同源基因:": "果蝇 eyeless" },
    links: [{ label: "Ensembl Compara" }],
    updatedAt: t("2025-12-19"),
    source: "演示数据集 · Ensembl Compara"
  },
  {
    id: "gn-ins-hs",
    category: "gene",
    dataType: "基因序列",
    name: "INS",
    code: "HGNC:6081",
    latinName: "insulin",
    summary: "编码胰岛素前体，是血糖稳态与糖尿病研究的核心基因。",
    description:
      "INS 基因产物经剪切形成 A、B 链由二硫键连接的成熟胰岛素。启动子区变异与 1 型糖尿病易感性相关；重组人胰岛素是首个生物制药重磅产品。",
    taxonomy: { kingdom: "动物界", phylum: "脊索动物门", klass: "哺乳纲", order: "灵长目", family: "人科" },
    taxonPath: ["Homo sapiens", "11 号染色体", "11p15.5"],
    themes: ["生理", "疾病", "生物技术", "分子生物学"],
    metrics: [
      { label: "染色体位置", value: "11p15.5" },
      { label: "成熟肽", value: "51 aa" },
      { label: "首个重组药", value: "1982 年上市" }
    ],
    attributes: { 基因类型: "蛋白编码", 表达部位: "胰岛 β 细胞", 关联疾病: "糖尿病" },
    links: [{ label: "NCBI Gene" }],
    updatedAt: t("2026-06-25"),
    source: "演示数据集 · NCBI Gene"
  },
  {
    id: "gn-cry1ac-bt",
    category: "gene",
    dataType: "功能注释",
    name: "cry1Ac",
    code: "Bt:cry1Ac",
    latinName: "Bacillus thuringiensis crystal protein gene",
    summary: "苏云金芽孢杆菌的杀虫晶体蛋白基因，广泛用于抗虫转基因作物。",
    description:
      "cry1Ac 编码的 δ-内毒素在鳞翅目昆虫中肠碱性环境被活化，形成膜孔导致细胞裂解。它是 Bt 棉与 Bt 玉米的主要抗虫基因，抗性演化管理是持续议题。",
    taxonomy: { kingdom: "细菌界", phylum: "厚壁菌门", klass: "芽孢杆菌纲", order: "核衣细菌目", family: "芽孢杆菌科" },
    taxonPath: ["细菌界", "厚壁菌门", "芽孢杆菌纲", "核衣细菌目", "芽孢杆菌科", "芽孢杆菌属"],
    themes: ["生物技术", "植物学", "分子生物学", "进化"],
    metrics: [
      { label: "毒素类型", value: "Cry1A 类 δ-内毒素" },
      { label: "靶标", value: "鳞翅目幼虫" },
      { label: "应用", value: "Bt 棉 / Bt 玉米" }
    ],
    attributes: { 基因类型: "细菌毒力基因", 作用机制: "中肠膜穿孔", "安全性": "对脊椎动物低毒" },
    links: [{ label: "Bacillus thuringiensis Toxin Nomenclature" }],
    updatedAt: t("2025-10-08"),
    source: "演示数据集 · Bt Nomenclature"
  },
  {
    id: "gn-hbb-hs",
    category: "gene",
    dataType: "变异注释",
    name: "HBB",
    code: "HGNC:4827",
    latinName: "hemoglobin subunit beta",
    summary: "编码 β-珠蛋白；点突变导致镰状细胞病，疟疾选择塑造了其地理分布。",
    description:
      "HBB 第 6 位谷氨酸→缬氨酸突变（HbS）使脱氧血红蛋白聚合，红细胞镰变。携带者对恶性疟原虫感染具有抗性，是平衡选择最著名的分子证据。",
    taxonomy: { kingdom: "动物界", phylum: "脊索动物门", klass: "哺乳纲", order: "灵长目", family: "人科" },
    taxonPath: ["Homo sapiens", "11 号染色体", "11p15.4"],
    themes: ["遗传", "进化", "疾病", "生理"],
    metrics: [
      { label: "染色体位置", value: "11p15.4" },
      { label: "蛋白长度", value: "147 aa" },
      { label: "经典突变", value: "E6V（HbS）" }
    ],
    attributes: { 基因类型: "蛋白编码", 核心功能: "氧气运输", 关联疾病: "镰状细胞病、β-地贫" },
    links: [{ label: "NCBI Gene" }],
    updatedAt: t("2026-05-02"),
    source: "演示数据集 · NCBI Gene"
  },
  {
    id: "gn-tp53-hs",
    category: "gene",
    dataType: "功能注释",
    name: "TP53",
    code: "HGNC:11998",
    latinName: "tumor protein p53",
    summary: "著名的“基因组守护者”，是人类肿瘤中突变最频繁的基因。",
    description:
      "p53 响应 DNA 损伤启动细胞周期停滞、修复或凋亡。超过半数的人类肿瘤携带 TP53 体细胞突变，其突变谱被用作肿瘤分型与治疗反应预测的标志。",
    taxonomy: { kingdom: "动物界", phylum: "脊索动物门", klass: "哺乳纲", order: "灵长目", family: "人科" },
    taxonPath: ["Homo sapiens", "17 号染色体", "17p13.1"],
    themes: ["分子生物学", "疾病", "细胞生物学", "遗传"],
    metrics: [
      { label: "染色体位置", value: "17p13.1" },
      { label: "肿瘤突变频率", value: "> 50%" },
      { label: "蛋白长度", value: "393 aa" }
    ],
    attributes: { 基因类型: "转录因子", 核心功能: "损伤应答 / 凋亡", 绰号: "基因组守护者" },
    links: [{ label: "COSMIC" }],
    updatedAt: t("2026-07-29"),
    source: "演示数据集 · COSMIC"
  },

  // ───────────────────────── 细胞 cell ─────────────────────────
  {
    id: "cl-neuron-cortical",
    category: "cell",
    dataType: "细胞类型",
    name: "皮质锥体细胞",
    code: "CL:0000617",
    summary: "大脑皮层的主要兴奋性神经元，以顶端树突束为形态标志。",
    description:
      "锥体细胞多为谷氨酸能投射神经元，从海马到新皮质广泛分布，其放电模式与树突计算支撑学习与记忆。单细胞组学正不断细分其转录组亚型。",
    taxonomy: { kingdom: "动物界", phylum: "脊索动物门", klass: "哺乳纲", order: "灵长目", family: "人科" },
    taxonPath: ["动物细胞", "神经外胚层", "神经元", "谷氨酸能神经元"],
    themes: ["神经科学", "细胞生物学", "生理"],
    metrics: [
      { label: "递质类型", value: "谷氨酸能" },
      { label: "皮层占比", value: "兴奋性神经元主体" },
      { label: "静息电位", value: "约 −70 mV" }
    ],
    attributes: { 形态: "锥形胞体 + 顶端树突", 功能: "兴奋性投射", 参考图谱: "BICCN / Allen Cell Types" },
    links: [{ label: "Cell Ontology" }],
    location: "大脑皮层、海马",
    updatedAt: t("2026-08-11"),
    source: "演示数据集 · Cell Ontology"
  },
  {
    id: "cl-cardiomyocyte",
    category: "cell",
    dataType: "影像数据",
    name: "心肌细胞",
    code: "CL:0000746",
    summary: "横纹、分支且自主节律收缩的心脏做功细胞。",
    description:
      "心肌细胞通过闰盘电耦联形成功能合胞体，线粒体密度极高以支持持续收缩。iPSC 分化的心肌细胞已用于药物心脏毒性筛选与心律失常建模。",
    taxonomy: { kingdom: "动物界", phylum: "脊索动物门", klass: "哺乳纲", order: "灵长目", family: "人科" },
    taxonPath: ["动物细胞", "中胚层", "肌细胞", "横纹肌细胞"],
    themes: ["生理", "细胞生物学", "疾病", "生物技术"],
    metrics: [
      { label: "长度", value: "80–120 μm" },
      { label: "静息心率", value: "60–100 次/分" },
      { label: "线粒体体积", value: "≈ 30%" }
    ],
    attributes: { 横纹: "有", 闰盘: "有", "再生能力:": "极有限" },
    links: [{ label: "Cell Ontology" }],
    location: "心脏壁（心房/心室）",
    updatedAt: t("2026-03-08"),
    source: "演示数据集 · Cell Ontology"
  },
  {
    id: "cl-hepatocyte",
    category: "cell",
    dataType: "细胞类型",
    name: "肝细胞",
    code: "CL:0000182",
    summary: "肝脏的主要实质细胞，承担代谢、解毒与血浆蛋白合成。",
    description:
      "肝细胞呈多边形、常为双核，按肝小叶分区呈现不同代谢酶谱（分区化）。它合成白蛋白与凝血因子，也是药物代谢 I 相酶 CYP450 的主要场所。",
    taxonomy: { kingdom: "动物界", phylum: "脊索动物门", klass: "哺乳纲", order: "灵长目", family: "人科" },
    taxonPath: ["动物细胞", "内胚层", "上皮细胞", "实质细胞"],
    themes: ["生理", "细胞生物学", "分子生物学", "疾病"],
    metrics: [
      { label: "占肝质量", value: "≈ 80%" },
      { label: "直径", value: "20–30 μm" },
      { label: "更新周期", value: "数月（静息态）" }
    ],
    attributes: { 多核现象: "常见双核", 极性: "血窦侧/胆小管侧", 再生: "强（受损时）" },
    links: [{ label: "Cell Ontology" }],
    location: "肝小叶",
    updatedAt: t("2025-12-02"),
    source: "演示数据集 · Cell Ontology"
  },
  {
    id: "cl-erythrocyte",
    category: "cell",
    dataType: "细胞计数",
    name: "红细胞",
    code: "CL:0000232",
    summary: "无核双凹圆盘状细胞，专职氧气与二氧化碳运输。",
    description:
      "成熟红细胞失去细胞核与多数细胞器，以血红蛋白充满胞内，双凹外形兼顾变形能力与表面积。红细胞计数、血红蛋白与红细胞压积是常规临床指标。",
    taxonomy: { kingdom: "动物界", phylum: "脊索动物门", klass: "哺乳纲", order: "灵长目", family: "人科" },
    taxonPath: ["动物细胞", "中胚层", "造血谱系", "红系"],
    themes: ["生理", "疾病", "细胞生物学"],
    metrics: [
      { label: "男性参考", value: "4.3–5.8 ×10¹²/L" },
      { label: "女性参考", value: "3.8–5.1 ×10¹²/L" },
      { label: "寿命", value: "≈ 120 天" }
    ],
    attributes: { 成熟后细胞核: "无", 直径: "7–8 μm", 关联疾病: "贫血、红细胞增多症" },
    links: [{ label: "Cell Ontology" }],
    location: "循环血液",
    updatedAt: t("2026-06-01"),
    source: "演示数据集 · 临床检验参考"
  },
  {
    id: "cl-tcell-cd8",
    category: "cell",
    dataType: "测序数据",
    name: "CD8⁺ 效应 T 细胞",
    code: "CL:0000625",
    summary: "识别 MHC-I 呈递抗原并杀伤感染或癌变细胞的适应性免疫细胞。",
    description:
      "初始 CD8 T 细胞在树突状细胞激活后增殖分化为细胞毒性效应细胞，通过穿孔素/颗粒酶与 Fas 通路诱导靶细胞凋亡，是疫苗与免疫疗法的关键效应器。",
    taxonomy: { kingdom: "动物界", phylum: "脊索动物门", klass: "哺乳纲", order: "灵长目", family: "人科" },
    taxonPath: ["动物细胞", "中胚层", "淋巴细胞", "T 细胞"],
    themes: ["免疫", "疾病", "细胞生物学", "生物技术"],
    metrics: [
      { label: "表面标志", value: "CD3⁺ CD8⁺" },
      { label: "杀伤分子", value: "穿孔素、颗粒酶" },
      { label: "占外周血 T 细胞", value: "约 25–35%" }
    ],
    attributes: { "MHC 识别": "MHC-I", 记忆亚型: "中枢/效应/驻留记忆", 治疗应用: "CAR-T、TCR-T" },
    links: [{ label: "Cell Ontology" }],
    location: "血液、淋巴与组织",
    updatedAt: t("2026-08-27"),
    source: "演示数据集 · Cell Ontology"
  },
  {
    id: "cl-guard-cell",
    category: "cell",
    dataType: "影像数据",
    name: "保卫细胞",
    code: "PO:0000293",
    summary: "围绕气孔的特化表皮细胞，通过膨压变化调控气体交换与失水。",
    description:
      "成对保卫细胞感受光照、CO₂ 浓度与脱落酸信号，驱动钾离子流动改变膨压，从而开闭气孔。它是植物节水与光合效率平衡的核心调控单元。",
    taxonomy: { kingdom: "植物界", phylum: "维管植物门", klass: "木兰纲", order: "被子植物", family: "维管植物" },
    taxonPath: ["植物细胞", "表皮谱系", "保卫细胞"],
    themes: ["植物学", "生理", "细胞生物学", "气候"],
    metrics: [
      { label: "排列", value: "成对环绕气孔" },
      { label: "主要信号", value: "光、CO₂、ABA" },
      { label: "动力", value: "钾离子膨压" }
    ],
    attributes: { 叶绿体: "有（数量较少）", 功能: "气孔开闭", 重要性: "水分利用效率" },
    links: [{ label: "Plant Ontology" }],
    location: "叶片、幼茎表皮",
    updatedAt: t("2026-02-28"),
    source: "演示数据集 · Plant Ontology"
  },
  {
    id: "cl-ipsc",
    category: "cell",
    dataType: "细胞系",
    name: "诱导多能干细胞",
    code: "BTO:0010195",
    summary: "由成体细胞经重编程因子逆转回多能状态的干细胞（iPSC）。",
    description:
      "通过外源表达 OCT4、SOX2、KLF4、c-MYC 等因子，成纤维细胞可被重编程为 iPSC。它能分化为三个胚层的细胞，支撑疾病建模、药物筛选与再生医学。",
    taxonomy: { kingdom: "动物界", phylum: "脊索动物门", klass: "哺乳纲", order: "灵长目", family: "人科" },
    taxonPath: ["动物细胞", "重编程细胞", "多能干细胞"],
    themes: ["生物技术", "发育", "细胞生物学", "疾病"],
    metrics: [
      { label: "建系年份", value: "2006（小鼠）/ 2007（人）" },
      { label: "经典因子", value: "OSKM" },
      { label: "潜能", value: "三胚层分化" }
    ],
    attributes: { 来源: "成体重编程", 标志物: "OCT4、NANOG、SSEA-4", "伦理优势:": "无需胚胎" },
    links: [{ label: "BTO" }],
    location: "体外培养",
    updatedAt: t("2026-07-04"),
    source: "演示数据集 · BTO"
  },

  // ───────────────────────── 生态系统 ecosystem ─────────────────────────
  {
    id: "ec-amazon-rainforest",
    category: "ecosystem",
    dataType: "生态网络",
    name: "亚马孙雨林",
    summary: "全球最大的热带雨林，维系巨大碳储量与约十分之一的已知物种。",
    description:
      "亚马孙通过蒸腾作用形成“飞河”影响南美降水，储碳量以数百亿吨计。毁林与气候变化叠加可能推动部分区域向稀树草原状态转变，监测网络覆盖多国保护区。",
    taxonomy: { kingdom: "陆地生物群系", phylum: "森林", klass: "热带雨林", order: "低地与山地雨林", family: "新热带界" },
    taxonPath: ["陆地生物群系", "森林", "热带雨林", "新热带界"],
    themes: ["气候", "保护", "植物学", "生态"],
    metrics: [
      { label: "面积", value: "≈ 550 万 km²" },
      { label: "储碳", value: "约 900–1200 亿 t" },
      { label: "已知物种", value: "数百万种" }
    ],
    attributes: { 类型: "低地热带雨林", 关键过程: "蒸腾降水耦合、固碳", 威胁: "刀耕火种、道路开发" },
    links: [{ label: "RAISG / 亚马孙监测网络" }],
    location: "南美九国",
    updatedAt: t("2026-08-30"),
    source: "演示数据集 · RAISG"
  },
  {
    id: "ec-great-barrier-reef",
    category: "ecosystem",
    dataType: "监测时序",
    name: "大堡礁",
    summary: "地球上最大的珊瑚礁系统，由近三千个礁体组成，可从太空观测。",
    description:
      "大堡礁由造礁珊瑚与虫黄藻的共生所维系，海水升温导致的白化事件反复出现。长期水下与卫星监测追踪珊瑚覆盖、钙化率与鱼类群落的变化。",
    taxonomy: { kingdom: "海洋生物群系", phylum: "珊瑚礁", klass: "热带浅海礁", order: "堡礁", family: "印太海域" },
    taxonPath: ["海洋生物群系", "珊瑚礁", "热带浅海礁", "堡礁"],
    themes: ["海洋", "气候", "保护", "生态"],
    metrics: [
      { label: "礁体数量", value: "≈ 2,900" },
      { label: "绵延", value: "≈ 2,300 km" },
      { label: "主要威胁", value: "海洋热浪白化" }
    ],
    attributes: { 关键共生: "珊瑚–虫黄藻", 监测手段: "AIMS 长期监测、卫星", 保护状态: "世界遗产（承压）" },
    links: [{ label: "AIMS LTMP" }],
    location: "澳大利亚东北海域",
    updatedAt: t("2026-04-19"),
    source: "演示数据集 · AIMS"
  },
  {
    id: "ec-sahara",
    category: "ecosystem",
    dataType: "调查样地",
    name: "撒哈拉沙漠",
    summary: "世界最大的炎热沙漠，极端干旱下仍有特化动植物与绿洲网络。",
    description:
      "撒哈拉的生物围绕稀缺且脉冲式的降水组织活动，夜行与节水生理是常见适应。风成过程塑造沙丘地貌，绿洲与干河床（wadi）构成生物多样性孤岛。",
    taxonomy: { kingdom: "陆地生物群系", phylum: "荒漠", klass: "亚热带荒漠", order: "沙质/岩质荒漠", family: "古北界" },
    taxonPath: ["陆地生物群系", "荒漠", "亚热带荒漠"],
    themes: ["气候", "进化", "生态"],
    metrics: [
      { label: "面积", value: "≈ 920 万 km²" },
      { label: "部分区域年降水", value: "< 25 mm" },
      { label: "白昼极端温度", value: "可超 50 ℃" }
    ],
    attributes: { 限制因子: "水", 适应策略: "夜行、储水、蛰伏", 关键生境: "绿洲、干河床" },
    links: [{ label: "样地调查索引" }],
    location: "北非",
    updatedAt: t("2025-10-26"),
    source: "演示数据集 · 陆地样地"
  },
  {
    id: "ec-yangtze-wetland",
    category: "ecosystem",
    dataType: "监测时序",
    name: "长江中下游湿地",
    summary: "通江湖泊与洲滩湿地网络，是东亚-澳大利西亚迁飞区的关键驿站。",
    description:
      "鄱阳湖、洞庭湖等季节性湖泊在枯水期露出大面积泥滩，支撑白鹤、鸿雁等候鸟越冬。水文节律受水库调度与气候变化共同影响，水位管理直接决定水鸟承载量。",
    taxonomy: { kingdom: "淡水生物群系", phylum: "湿地", klass: "河湖泛滥湿地", order: "通江湖泊", family: "亚热带季风区" },
    taxonPath: ["淡水生物群系", "湿地", "河湖泛滥湿地", "通江湖泊"],
    themes: ["保护", "气候", "生态", "鸟类"],
    metrics: [
      { label: "代表湖泊", value: "鄱阳湖、洞庭湖" },
      { label: "迁徙候鸟", value: "数十万只（峰值）" },
      { label: "节律驱动", value: "季节性水位涨落" }
    ],
    attributes: { 生态功能: "调蓄、净化、栖息地", 旗舰物种: "白鹤、江豚", 威胁: "围垦、水文改变" },
    links: [{ label: "长江湿地监测网络" }],
    location: "中国长江中下游",
    updatedAt: t("2026-01-12"),
    source: "演示数据集 · 湿地监测"
  },
  {
    id: "ec-serengeti",
    category: "ecosystem",
    dataType: "调查样地",
    name: "塞伦盖蒂草原",
    summary: "以角马大迁徙闻名的热带稀树草原，捕食者–猎物研究的经典系统。",
    description:
      "超过百万只角马随降水与牧草在坦桑尼亚与肯尼亚间循环迁徙，伴随大量斑马、瞪羚与捕食者。长期样地数据揭示了营养级联与下行控制机制。",
    taxonomy: { kingdom: "陆地生物群系", phylum: "草原/稀树草原", klass: "热带稀树草原", order: "高草稀树草原", family: "非洲界" },
    taxonPath: ["陆地生物群系", "稀树草原", "热带稀树草原"],
    themes: ["生态", "保护", "进化"],
    metrics: [
      { label: "迁徙角马", value: "130 万只以上" },
      { label: "环路长度", value: "≈ 1,000 km/年" },
      { label: "监测历史", value: "60 年以上" }
    ],
    attributes: { 驱动力: "降水与牧草脉冲", 关键种: "角马、狮子、鳄鱼", "现象:": "大迁徙" },
    links: [{ label: "Serengeti Lion Project" }],
    location: "坦桑尼亚 / 肯尼亚",
    updatedAt: t("2025-11-23"),
    source: "演示数据集 · 长期样地"
  },
  {
    id: "ec-mariana-trench",
    category: "ecosystem",
    dataType: "调查样地",
    name: "马里亚纳海沟深渊带",
    summary: "海洋最深处，高压无光环境中仍存在活跃的食物网。",
    description:
      "挑战者深渊深度约 10,900 米，耐压微生物利用表层沉降的有机质与化能合成底物生存。深海着陆器发现了端足类、狮子鱼等高度特化的后生动物。",
    taxonomy: { kingdom: "海洋生物群系", phylum: "深渊带", klass: "海沟生境", order: "超深渊带（> 6000 m）", family: "西太平洋" },
    taxonPath: ["海洋生物群系", "深渊带", "超深渊海沟"],
    themes: ["海洋", "微生物", "进化", "生态"],
    metrics: [
      { label: "最大深度", value: "≈ 10,900 m" },
      { label: "压力", value: "> 1000 atm" },
      { label: "光照", value: "完全无光" }
    ],
    attributes: { 能量来源: "有机质沉降、化能合成", 采样平台: "深海着陆器、遥控潜器", 适应: "高压、低代谢" },
    links: [{ label: "深渊调查航次" }],
    location: "西太平洋",
    updatedAt: t("2026-05-16"),
    source: "演示数据集 · 深海航次"
  },
  {
    id: "ec-hydrothermal-vent",
    category: "ecosystem",
    dataType: "生态网络",
    name: "深海热液口群落",
    summary: "不依赖阳光、以化能合成为初级生产基础的绿洲式生态系统。",
    description:
      "热液喷出富含硫化氢的流体，氧化细菌形成生物膜并支撑管状蠕虫、贻贝与盲虾。共生菌–动物关系是这类“黑暗生态系统”生产力的关键。",
    taxonomy: { kingdom: "海洋生物群系", phylum: "深海生境", klass: "热液口", order: "洋中脊", family: "全球分散" },
    taxonPath: ["海洋生物群系", "深海生境", "热液口群落"],
    themes: ["海洋", "微生物", "生态", "进化"],
    metrics: [
      { label: "发现年份", value: "1977" },
      { label: "初级生产", value: "化能合成" },
      { label: "流体温度", value: "可超 350 ℃" }
    ],
    attributes: { 能量基础: "H₂S 氧化", 关键共生: "管状蠕虫–内共生菌", 分布: "洋中脊与弧后盆地" },
    links: [{ label: "InterRidge" }],
    location: "全球洋中脊",
    updatedAt: t("2026-03-22"),
    source: "演示数据集 · InterRidge"
  },

  // ───────────────────────── 人体 human ─────────────────────────
  {
    id: "hm-cardiovascular",
    category: "human",
    dataType: "生理指标",
    name: "心血管系统",
    summary: "由心脏与血管构成的闭式运输网络，输送氧气、养分并回收废物。",
    description:
      "心脏每日搏动约十万次，体循环与肺循环串联运行。血管内皮是活跃的内分泌器官，血压、血脂与炎症共同决定动脉粥样硬化风险。",
    taxonomy: { kingdom: "人体器官系统", phylum: "循环", klass: "心血管", order: "心脏与血管", family: "内脏系统" },
    taxonPath: ["人体", "器官系统", "心血管系统"],
    themes: ["生理", "疾病"],
    metrics: [
      { label: "静息心率", value: "60–100 次/分" },
      { label: "静息血压", value: "< 120/80 mmHg" },
      { label: "每日泵血量", value: "≈ 7,000 L" }
    ],
    attributes: { 组成: "心脏、动脉、静脉、毛细血管", 常见疾病: "高血压、冠心病、卒中", 评估: "ECG、超声、血脂面板" },
    links: [{ label: "临床参考" }],
    location: "胸腔及全身",
    updatedAt: t("2026-08-09"),
    source: "演示数据集 · 临床参考值"
  },
  {
    id: "hm-immune",
    category: "human",
    dataType: "细胞计数",
    name: "免疫系统",
    summary: "先天与适应性免疫协同区分自我与非我，并形成免疫记忆。",
    description:
      "先天免疫提供快速但泛化的应答，T/B 淋巴细胞提供特异性与记忆。白细胞分类计数与炎症标志物用于诊断感染、自身免疫与免疫缺陷。",
    taxonomy: { kingdom: "人体器官系统", phylum: "免疫", klass: "淋巴与髓系", order: "防御系统", family: "全身分布" },
    taxonPath: ["人体", "器官系统", "免疫系统"],
    themes: ["免疫", "疾病", "生理"],
    metrics: [
      { label: "白细胞参考", value: "4–10 ×10⁹/L" },
      { label: "中性粒占比", value: "50–70%" },
      { label: "淋巴占比", value: "20–40%" }
    ],
    attributes: { 初级器官: "骨髓、胸腺", 次级器官: "淋巴结、脾", 相关治疗: "疫苗、免疫检查点抑制剂" },
    links: [{ label: "临床参考" }],
    location: "全身（淋巴与循环）",
    updatedAt: t("2026-07-18"),
    source: "演示数据集 · 临床参考值"
  },
  {
    id: "hm-central-nervous",
    category: "human",
    dataType: "影像数据",
    name: "中枢神经系统",
    summary: "脑与脊髓组成的处理中枢，含约 860 亿个神经元。",
    description:
      "大脑皮层、边缘系统、小脑与脑干分层协作，胶质细胞提供支持与调节。MRI、fMRI 与 EEG 从结构、功能与电活动多个层面刻画其状态。",
    taxonomy: { kingdom: "人体器官系统", phylum: "神经", klass: "中枢神经", order: "脑与脊髓", family: "调控系统" },
    taxonPath: ["人体", "器官系统", "神经系统", "中枢神经系统"],
    themes: ["神经科学", "生理", "疾病"],
    metrics: [
      { label: "神经元", value: "≈ 860 亿" },
      { label: "脑质量", value: "约 1.3–1.4 kg" },
      { label: "静息耗氧", value: "约占全身 20%" }
    ],
    attributes: { 组成: "大脑、小脑、脑干、脊髓", 影像模态: "MRI / fMRI / EEG", 相关疾病: "卒中、癫痫、AD" },
    links: [{ label: "影像参考" }],
    location: "颅腔与椎管",
    updatedAt: t("2026-06-22"),
    source: "演示数据集 · 神经影像参考"
  },
  {
    id: "hm-gi-microbiome",
    category: "human",
    dataType: "测序数据",
    name: "肠道微生物组",
    summary: "定植于肠道的数万亿微生物及其基因集合，被视为“被遗忘的器官”。",
    description:
      "肠道菌群参与短链脂肪酸生成、胆汁酸代谢与免疫训练，其组成受饮食、抗生素与分娩方式影响。宏基因组测序将菌群特征与代谢、免疫乃至神经状态关联起来。",
    taxonomy: { kingdom: "人体微生态", phylum: "共生微生物", klass: "肠道定植", order: "厌氧菌为主", family: "跨域共生" },
    taxonPath: ["人体", "共生微生态", "肠道微生物组"],
    themes: ["微生物", "免疫", "生理", "疾病"],
    metrics: [
      { label: "细胞数量级", value: "≈ 10¹³" },
      { label: "优势菌门", value: "厚壁菌门、拟杆菌门" },
      { label: "微生物基因", value: "约为人类基因百倍" }
    ],
    attributes: { 测序方式: "16S / 宏基因组", 主要产物: "短链脂肪酸、维生素", 影响因素: "饮食、抗生素、年龄" },
    links: [{ label: "Human Microbiome Project" }],
    location: "小肠、结肠",
    updatedAt: t("2026-08-15"),
    source: "演示数据集 · HMP"
  },
  {
    id: "hm-endocrine",
    category: "human",
    dataType: "生理指标",
    name: "内分泌系统",
    summary: "以激素为化学信使、通过血液作用于远端靶器官的慢调节系统。",
    description:
      "下丘脑–垂体轴统筹甲状腺、肾上腺与性腺，胰岛与甲状旁腺分别调节血糖与钙稳态。负反馈环路是理解糖尿病、甲状腺疾病等内分泌紊乱的核心。",
    taxonomy: { kingdom: "人体器官系统", phylum: "内分泌", klass: "腺体网络", order: "下丘脑–垂体轴", family: "调控系统" },
    taxonPath: ["人体", "器官系统", "内分泌系统"],
    themes: ["生理", "疾病", "分子生物学"],
    metrics: [
      { label: "空腹血糖", value: "3.9–6.1 mmol/L", },
      { label: "TSH（成人）", value: "0.4–4.0 mIU/L（参考因实验室而异）" },
      { label: "核心腺体", value: "垂体、甲状腺、胰腺等" }
    ],
    attributes: { 信使: "激素", 传递方式: "体液运输", 相关疾病: "糖尿病、甲亢/甲减" },
    links: [{ label: "临床参考" }],
    location: "多处腺体",
    updatedAt: t("2026-02-09"),
    source: "演示数据集 · 临床参考值"
  },
  {
    id: "hm-respiratory",
    category: "human",
    dataType: "生理指标",
    name: "呼吸系统",
    summary: "经肺泡完成氧气与二氧化碳交换，并参与酸碱平衡与免疫防御。",
    description:
      "气道的黏液-纤毛清除与肺泡巨噬细胞构成一线防御。潮气量、FEV1 与血氧饱和度是评估通气与换气功能的关键指标。",
    taxonomy: { kingdom: "人体器官系统", phylum: "呼吸", klass: "气道与肺", order: "气体交换", family: "内脏系统" },
    taxonPath: ["人体", "器官系统", "呼吸系统"],
    themes: ["生理", "疾病", "免疫"],
    metrics: [
      { label: "静息呼吸", value: "12–20 次/分" },
      { label: "SpO₂", value: "95–100%" },
      { label: "肺泡总数", value: "数亿个" }
    ],
    attributes: { 组成: "鼻、咽、喉、气管、肺", 防御: "黏液纤毛屏障、巨噬细胞", 相关疾病: "哮喘、COPD、肺炎" },
    links: [{ label: "临床参考" }],
    location: "胸腔",
    updatedAt: t("2025-12-28"),
    source: "演示数据集 · 临床参考值"
  },
  {
    id: "hm-skin",
    category: "human",
    dataType: "组织切片",
    name: "皮肤系统",
    summary: "人体最大的器官，构成屏障、调节体温并承载感觉受体。",
    description:
      "表皮角质层提供机械与渗透屏障，真皮含血管、汗腺与神经末梢，皮下脂肪储能保温。皮肤同时是活跃的免疫界面与微生物定植场所。",
    taxonomy: { kingdom: "人体器官系统", phylum: "被覆", klass: "皮肤及其附属器", order: "屏障系统", family: "外周组织" },
    taxonPath: ["人体", "器官系统", "皮肤系统"],
    themes: ["生理", "免疫", "细胞生物学"],
    metrics: [
      { label: "成人体表面积", value: "1.5–2.0 m²" },
      { label: "占体重", value: "约 15%" },
      { label: "表皮更新", value: "约 4 周" }
    ],
    attributes: { 分层: "表皮、真皮、皮下组织", 附属器: "毛发、指（趾）甲、腺体", 相关疾病: "湿疹、银屑病、皮肤癌" },
    links: [{ label: "组织学参考" }],
    location: "全身表面",
    updatedAt: t("2026-04-27"),
    source: "演示数据集 · 组织学参考"
  }
];
