import {
  type GraphEdge,
  type GraphNode,
  type RelationType,
  type RelationTypeMeta
} from "../../shared/contract.js";
import type { BioRecord, Category } from "../../shared/contract.js";
import { records } from "./seed.js";

/* ───────────────────────── 关系类型注册表（受控词表） ───────────────────────── */

export const relationMeta: Record<RelationType, RelationTypeMeta> = {
  BELONGS_TO: {
    type: "BELONGS_TO",
    label: "属于分类",
    reverseLabel: "包含成员",
    group: "taxonomy",
    symmetric: false
  },
  PARENT_TAXON: {
    type: "PARENT_TAXON",
    label: "上级阶元",
    reverseLabel: "下级阶元",
    group: "taxonomy",
    symmetric: false
  },
  ENCODES_IN: {
    type: "ENCODES_IN",
    label: "发现于物种",
    reverseLabel: "携带基因",
    group: "genetics",
    symmetric: false
  },
  ORTHOLOG_OF: {
    type: "ORTHOLOG_OF",
    label: "同源基因",
    reverseLabel: "同源基因",
    group: "genetics",
    symmetric: true
  },
  FOUND_IN: {
    type: "FOUND_IN",
    label: "存在于物种",
    reverseLabel: "具有细胞类型",
    group: "physiology",
    symmetric: false
  },
  PART_OF: {
    type: "PART_OF",
    label: "组成部分",
    reverseLabel: "包含细胞",
    group: "physiology",
    symmetric: false
  },
  LIVES_IN: {
    type: "LIVES_IN",
    label: "栖息于",
    reverseLabel: "栖息物种",
    group: "ecology",
    symmetric: false
  },
  INTERACTS_WITH: {
    type: "INTERACTS_WITH",
    label: "相互作用",
    reverseLabel: "相互作用",
    group: "physiology",
    symmetric: true
  },
  HOSTS: {
    type: "HOSTS",
    label: "定植于系统",
    reverseLabel: "宿主系统",
    group: "ecology",
    symmetric: false
  },
  EATS: {
    type: "EATS",
    label: "捕食/取食",
    reverseLabel: "被取食",
    group: "ecology",
    symmetric: false
  },
  DERIVED_FROM: {
    type: "DERIVED_FROM",
    label: "演化自",
    reverseLabel: "演化出",
    group: "evolution",
    symmetric: false
  },
  RELATED_TO: {
    type: "RELATED_TO",
    label: "研究关联",
    reverseLabel: "研究关联",
    group: "general",
    symmetric: true
  }
};

export const relationList: RelationTypeMeta[] = Object.values(relationMeta);

/* ───────────────────────── 概念实体：分类阶元 + 演化节点 ─────────────────────────
 * 它们不属于任何一个数据模块，却是把不同模块连起来的"枢纽实体"。
 */

interface ConceptInput {
  id: string;
  domain: "taxon" | "evolution";
  name: string;
  latinName?: string;
  subtitle: string;
  summary: string;
  attrs?: Record<string, string | number>;
}

const taxa: ConceptInput[] = [
  // 界
  { id: "tx-animalia", domain: "taxon", name: "动物界", latinName: "Animalia", subtitle: "分类阶元 · 界", summary: "多细胞、异养、多数可自主运动的真核生物大类。", attrs: { rank: "界" } },
  { id: "tx-plantae", domain: "taxon", name: "植物界", latinName: "Plantae", subtitle: "分类阶元 · 界", summary: "含叶绿体、以光合作用固着生活的陆生植物与绿藻谱系。", attrs: { rank: "界" } },
  { id: "tx-fungi", domain: "taxon", name: "真菌界", latinName: "Fungi", subtitle: "分类阶元 · 界", summary: "以吸收方式营养、细胞壁含几丁质的异养真核生物。", attrs: { rank: "界" } },
  { id: "tx-bacteria", domain: "taxon", name: "细菌界", latinName: "Bacteria", subtitle: "分类阶元 · 域/界", summary: "无核膜的单细胞原核生物，是地球上数量最多的细胞生命。", attrs: { rank: "界" } },
  { id: "tx-virus", domain: "taxon", name: "病毒", latinName: "Virus", subtitle: "非细胞生命类群", summary: "依赖宿主细胞复制的遗传元件，不进入细胞生命的分类树。", attrs: { rank: "非细胞类群" } },
  // 动物门
  { id: "tx-chordata", domain: "taxon", name: "脊索动物门", latinName: "Chordata", subtitle: "分类阶元 · 门", summary: "生活史某阶段具脊索、背神经管与鳃裂的动物门，含全部脊椎动物。", attrs: { rank: "门" } },
  { id: "tx-arthropoda", domain: "taxon", name: "节肢动物门", latinName: "Arthropoda", subtitle: "分类阶元 · 门", summary: "具外骨骼与分节附肢的动物门，是物种数量最多的动物门。", attrs: { rank: "门" } },
  { id: "tx-cnidaria", domain: "taxon", name: "刺胞动物门", latinName: "Cnidaria", subtitle: "分类阶元 · 门", summary: "具刺细胞、两胚层辐射对称的水生动物，含水母与珊瑚。", attrs: { rank: "门" } },
  // 纲
  { id: "tx-mammalia", domain: "taxon", name: "哺乳纲", latinName: "Mammalia", subtitle: "分类阶元 · 纲", summary: "以乳腺哺乳、被毛和恒温为特征的脊椎动物。", attrs: { rank: "纲" } },
  { id: "tx-aves", domain: "taxon", name: "鸟纲", latinName: "Aves", subtitle: "分类阶元 · 纲", summary: "被羽、前肢成翼、多数具飞行能力的兽脚类恐龙后裔。", attrs: { rank: "纲" } },
  { id: "tx-sauropsida", domain: "taxon", name: "蜥形纲", latinName: "Sauropsida", subtitle: "分类阶元 · 纲", summary: "含爬行类与鸟类在内的羊膜动物谱系，恐龙属此纲。", attrs: { rank: "纲" } },
  { id: "tx-insecta", domain: "taxon", name: "昆虫纲", latinName: "Insecta", subtitle: "分类阶元 · 纲", summary: "六足、分头胸腹三体段的节肢动物，已知物种最丰富。", attrs: { rank: "纲" } },
  // 其他界的门/纲
  { id: "tx-proteobacteria", domain: "taxon", name: "变形菌门", latinName: "Proteobacteria", subtitle: "分类阶元 · 门", summary: "革兰氏阴性细菌大门，含大肠杆菌与多数线粒体的祖先谱系。", attrs: { rank: "门" } },
  { id: "tx-firmicutes", domain: "taxon", name: "厚壁菌门", latinName: "Firmicutes", subtitle: "分类阶元 · 门", summary: "多为低 GC 含量的革兰氏阳性细菌，含芽孢杆菌与多种肠道菌。", attrs: { rank: "门" } },
  { id: "tx-ascomycota", domain: "taxon", name: "子囊菌门", latinName: "Ascomycota", subtitle: "分类阶元 · 门", summary: "在子囊内产生有性孢子的真菌，含酿酒酵母与青霉。", attrs: { rank: "门" } },
  { id: "tx-vascular", domain: "taxon", name: "维管植物门", latinName: "Tracheophyta", subtitle: "分类阶元 · 门", summary: "具木质部与韧皮部输导组织的植物，覆盖绝大多数陆生植物。", attrs: { rank: "门" } }
];

const evolution: ConceptInput[] = [
  {
    id: "ev-luca",
    domain: "evolution",
    name: "LUCA",
    latinName: "Last Universal Common Ancestor",
    subtitle: "演化节点 · 约 35–38 亿年前",
    summary: "所有现存细胞生命的最后共同祖先，细菌与古菌/真核谱系在此分叉。",
    attrs: { mya: 3800 }
  },
  {
    id: "ev-eukarya",
    domain: "evolution",
    name: "真核生物起源",
    latinName: "Eukaryogenesis",
    subtitle: "演化节点 · 约 18–22 亿年前",
    summary: "内共生事件催生线粒体与带核细胞，是全部真核生物的起点。",
    attrs: { mya: 2000 }
  },
  {
    id: "ev-multicellular",
    domain: "evolution",
    name: "多细胞动物起源",
    subtitle: "演化节点 · 约 6–8 亿年前",
    summary: "细胞分化与胞外基质出现，动物由单细胞领鞭虫类祖先走向多细胞。",
    attrs: { mya: 700 }
  },
  {
    id: "ev-vertebrate",
    domain: "evolution",
    name: "脊椎动物起源",
    subtitle: "演化节点 · 约 5.2 亿年前",
    summary: "脊索、背神经管理想化，最早的脊椎动物出现于寒武纪海洋。",
    attrs: { mya: 520 }
  },
  {
    id: "ev-tetrapod",
    domain: "evolution",
    name: "四足动物登陆",
    subtitle: "演化节点 · 约 3.7 亿年前",
    summary: "肉鳍鱼的鳍演化为四肢，脊椎动物登上陆地，奠定两栖—爬行—哺乳谱系。",
    attrs: { mya: 370 }
  },
  {
    id: "ev-mammal",
    domain: "evolution",
    name: "哺乳动物起源",
    subtitle: "演化节点 · 约 2.1 亿年前",
    summary: "合弓纲爬行动物演化为恒温、哺乳的早期哺乳动物。",
    attrs: { mya: 210 }
  },
  {
    id: "ev-primate",
    domain: "evolution",
    name: "灵长类起源",
    subtitle: "演化节点 · 约 5500–6500 万年前",
    summary: "树栖、立体视觉与抓握手足出现，是人类所属的哺乳动物支系起点。",
    attrs: { mya: 60 }
  },
  {
    id: "ev-homo",
    domain: "evolution",
    name: "人属出现",
    subtitle: "演化节点 · 约 250–300 万年前",
    summary: "直立行走、工具使用与脑容量扩展的人属（Homo）在东非出现。",
    attrs: { mya: 2.8 }
  },
  {
    id: "ev-archosaur",
    domain: "evolution",
    name: "主龙类扩张",
    latinName: "Archosauria",
    subtitle: "演化节点 · 约 2.5 亿年前",
    summary: "三叠纪主龙类辐射，分出演化出鳄类、翼龙与恐龙（含鸟类）的支系。",
    attrs: { mya: 250 }
  },
  {
    id: "ev-kpg",
    domain: "evolution",
    name: "K–Pg 大灭绝",
    latinName: "Cretaceous–Paleogene extinction",
    subtitle: "演化节点 · 6600 万年前",
    summary: "小行星撞击与环境剧变终结非鸟恐龙时代，哺乳动物随后占据空出的生态位。",
    attrs: { mya: 66 }
  },
  {
    id: "ev-endosymbiosis",
    domain: "evolution",
    name: "线粒体内共生",
    subtitle: "演化节点 · 约 18–20 亿年前",
    summary: "α-变形菌被宿主细胞吞噬并内共生成线粒体，是真核生物共有的关键事件。",
    attrs: { mya: 1900 }
  }
];

/* ───────────────────────── 边：把不同模块连成一张图 ───────────────────────── */

type Triple = [source: string, relation: RelationType, target: string, evidence?: string];

const triples: Triple[] = [
  // ===== 分类学：物种 → 阶元，阶元 → 上级阶元 =====
  ["sp-homo-sapiens", "BELONGS_TO", "tx-mammalia", "人科人属，归入哺乳纲"],
  ["sp-drosophila-melanogaster", "BELONGS_TO", "tx-insecta", "双翅目果蝇科，归入昆虫纲"],
  ["sp-ara-macao", "BELONGS_TO", "tx-aves", "鹦鹉目鹦鹉科，归入鸟纲"],
  ["sp-quercus-robur", "BELONGS_TO", "tx-vascular", "壳斗目栎属，归入维管植物门"],
  ["sp-corallium-rubrum", "BELONGS_TO", "tx-cnidaria", "软珊瑚目，归入刺胞动物门"],
  ["sp-dinorosea", "BELONGS_TO", "tx-sauropsida", "蜥臀目暴龙科，归入蜥形纲"],
  ["sp-e-coli", "BELONGS_TO", "tx-proteobacteria", "肠杆菌目，归入变形菌门"],
  ["sp-saccharomyces", "BELONGS_TO", "tx-ascomycota", "酵母目，归入子囊菌门"],
  ["sp-influenza-a", "BELONGS_TO", "tx-virus", "非细胞生命，不进细胞分类树"],

  ["tx-mammalia", "PARENT_TAXON", "tx-chordata"],
  ["tx-aves", "PARENT_TAXON", "tx-chordata"],
  ["tx-sauropsida", "PARENT_TAXON", "tx-chordata"],
  ["tx-insecta", "PARENT_TAXON", "tx-arthropoda"],
  ["tx-chordata", "PARENT_TAXON", "tx-animalia"],
  ["tx-arthropoda", "PARENT_TAXON", "tx-animalia"],
  ["tx-cnidaria", "PARENT_TAXON", "tx-animalia"],
  ["tx-proteobacteria", "PARENT_TAXON", "tx-bacteria"],
  ["tx-firmicutes", "PARENT_TAXON", "tx-bacteria"],
  ["tx-ascomycota", "PARENT_TAXON", "tx-fungi"],
  ["tx-vascular", "PARENT_TAXON", "tx-plantae"],

  // ===== 遗传学：基因 → 物种，基因 ↔ 基因（深同源） =====
  ["gn-brca1-hs", "ENCODES_IN", "sp-homo-sapiens"],
  ["gn-cftr-hs", "ENCODES_IN", "sp-homo-sapiens"],
  ["gn-pax6", "ENCODES_IN", "sp-homo-sapiens", "人类 PAX6"],
  ["gn-ins-hs", "ENCODES_IN", "sp-homo-sapiens"],
  ["gn-hbb-hs", "ENCODES_IN", "sp-homo-sapiens"],
  ["gn-tp53-hs", "ENCODES_IN", "sp-homo-sapiens"],
  ["gn-cry1ac-bt", "ENCODES_IN", "sp-e-coli", "重组工程菌中克隆表达（天然宿主为苏云金芽孢杆菌）"],
  ["gn-pax6", "ORTHOLOG_OF", "sp-drosophila-melanogaster", "果蝇 eyeless 与人类 PAX6 是深同源主控基因"],
  ["gn-hbb-hs", "ORTHOLOG_OF", "sp-corallium-rubrum", "呼吸蛋白家族跨动物界同源（珠蛋白超家族）"],

  // ===== 细胞 → 物种；细胞 → 人体系统 =====
  ["cl-neuron-cortical", "FOUND_IN", "sp-homo-sapiens"],
  ["cl-cardiomyocyte", "FOUND_IN", "sp-homo-sapiens"],
  ["cl-hepatocyte", "FOUND_IN", "sp-homo-sapiens"],
  ["cl-erythrocyte", "FOUND_IN", "sp-homo-sapiens"],
  ["cl-tcell-cd8", "FOUND_IN", "sp-homo-sapiens"],
  ["cl-ipsc", "FOUND_IN", "sp-homo-sapiens", "由人类成体体细胞重编程获得"],
  ["cl-guard-cell", "FOUND_IN", "sp-quercus-robur", "保卫细胞为陆生植物共有，以夏栎为植物代表"],

  ["cl-neuron-cortical", "PART_OF", "hm-central-nervous"],
  ["cl-cardiomyocyte", "PART_OF", "hm-cardiovascular"],
  ["cl-erythrocyte", "PART_OF", "hm-cardiovascular"],
  ["cl-hepatocyte", "PART_OF", "hm-gi-microbiome", "肝脏经胆汁-肠轴与肠道微生物组互作"],
  ["cl-tcell-cd8", "PART_OF", "hm-immune"],
  ["cl-ipsc", "PART_OF", "hm-skin", "成纤维细胞常取自皮肤用于重编程"],

  // ===== 生态：物种 → 生态系统；食物关系 =====
  ["sp-ara-macao", "LIVES_IN", "ec-amazon-rainforest"],
  ["sp-quercus-robur", "LIVES_IN", "ec-yangtze-wetland", "落叶阔叶林与湿地交错带也适生壳斗科树种"],
  ["sp-corallium-rubrum", "LIVES_IN", "ec-great-barrier-reef", "贵珊瑚主产地中海，珊瑚礁生态以大堡礁为代表系统"],
  ["sp-homo-sapiens", "LIVES_IN", "ec-yangtze-wetland", "长江中下游是密集人类活动区"],
  ["sp-e-coli", "LIVES_IN", "ec-yangtze-wetland", "肠道菌随径流进入湿地水环境"],
  ["sp-saccharomyces", "LIVES_IN", "ec-amazon-rainforest", "野生酵母广泛存在于果实与树皮表面"],
  ["sp-drosophila-melanogaster", "LIVES_IN", "ec-amazon-rainforest", "果蝇在腐烂果实上取食繁殖"],
  ["sp-dinorosea", "LIVES_IN", "ec-serengeti", "白垩纪陆相生态系统的广义代表"],
  ["sp-homo-sapiens", "LIVES_IN", "ec-sahara", "人类自史前即活跃于撒哈拉绿洲与岩画遗址"],
  ["sp-homo-sapiens", "LIVES_IN", "ec-serengeti", "东非草原是人属起源与演化的核心区域"],
  ["sp-corallium-rubrum", "LIVES_IN", "ec-hydrothermal-vent", "深海水母/刺胞动物在化能合成生境周边出现的广义代表"],
  ["sp-e-coli", "LIVES_IN", "ec-mariana-trench", "肠杆菌目细菌在深渊沉积物与海水中原位检出"],
  ["ec-great-barrier-reef", "RELATED_TO", "ec-hydrothermal-vent", "海洋生物地球化学循环中的两类热点生境"],
  ["ec-serengeti", "RELATED_TO", "ec-sahara", "非洲大陆相邻、相互交换物质与迁徙物种的两大生态系统"],

  ["sp-ara-macao", "EATS", "sp-quercus-robur", "取食高大乔木的大型种子/坚果"],
  ["sp-drosophila-melanogaster", "EATS", "sp-quercus-robur", "幼虫取食发酵果实与树皮渗出物"],
  ["sp-e-coli", "EATS", "sp-saccharomyces", "混合培养中分解酵母释放的糖类（简化食物关系）"],

  // ===== 人体系统互作；微生物组定植 =====
  ["hm-cardiovascular", "INTERACTS_WITH", "hm-respiratory", "肺泡氧合由循环运输全身"],
  ["hm-cardiovascular", "INTERACTS_WITH", "hm-endocrine", "激素经血液作用于远端靶器官"],
  ["hm-immune", "INTERACTS_WITH", "hm-respiratory", "呼吸道黏膜是免疫第一道防线"],
  ["hm-immune", "INTERACTS_WITH", "hm-gi-microbiome", "肠道菌训练并调节宿主免疫"],
  ["hm-central-nervous", "INTERACTS_WITH", "hm-endocrine", "下丘脑—垂体轴连接神经与内分泌"],
  ["hm-central-nervous", "INTERACTS_WITH", "hm-skin", "皮肤承载感觉受体并受自主神经调控"],
  ["sp-e-coli", "HOSTS", "hm-gi-microbiome", "肠道核心共生菌"],
  ["sp-influenza-a", "HOSTS", "hm-respiratory", "流感病毒侵染呼吸道上皮"],
  ["sp-saccharomyces", "HOSTS", "hm-gi-microbiome", "常见的过路/低丰度共生酵母"],

  // ===== 进化：节点 → 节点；物种 → 节点 =====
  ["ev-eukarya", "DERIVED_FROM", "ev-luca"],
  ["ev-endosymbiosis", "DERIVED_FROM", "ev-luca", "线粒体源自 α-变形菌内共生"],
  ["ev-multicellular", "DERIVED_FROM", "ev-eukarya"],
  ["ev-vertebrate", "DERIVED_FROM", "ev-multicellular"],
  ["ev-tetrapod", "DERIVED_FROM", "ev-vertebrate"],
  ["ev-mammal", "DERIVED_FROM", "ev-tetrapod"],
  ["ev-primate", "DERIVED_FROM", "ev-mammal"],
  ["ev-homo", "DERIVED_FROM", "ev-primate"],
  ["ev-archosaur", "DERIVED_FROM", "ev-tetrapod"],
  ["ev-kpg", "DERIVED_FROM", "ev-archosaur", "K–Pg 灭绝终结非鸟恐龙，鸟类存续"],

  ["sp-homo-sapiens", "DERIVED_FROM", "ev-homo", "智人是人属现存唯一物种"],
  ["sp-drosophila-melanogaster", "DERIVED_FROM", "ev-multicellular", "节肢动物与脊椎动物共享多细胞动物祖先"],
  ["sp-ara-macao", "DERIVED_FROM", "ev-kpg", "鸟类是躲过 K–Pg 灭绝的兽脚类恐龙后裔"],
  ["sp-corallium-rubrum", "DERIVED_FROM", "ev-multicellular", "刺胞动物处在多细胞动物较早分支"],
  ["sp-dinorosea", "DERIVED_FROM", "ev-archosaur", "霸王龙是主龙类恐龙的代表"],
  ["sp-quercus-robur", "DERIVED_FROM", "ev-eukarya", "陆生植物独立走向多细胞，共属于真核祖先"],
  ["sp-saccharomyces", "DERIVED_FROM", "ev-eukarya", "单细胞真菌，保留早期真核细胞特征"],
  ["sp-e-coli", "DERIVED_FROM", "ev-luca", "原核细菌，接近细胞生命的根部"],
  ["sp-e-coli", "DERIVED_FROM", "ev-endosymbiosis", "与线粒体祖先 α-变形菌同属变形菌门附近谱系"]
];

/* ───────────────────────── 组装图节点 ───────────────────────── */

/** 记录域 → 图谱领域（本项目一一对应，单独保留映射以便未来拆分） */
const categoryToDomain: Record<Category, GraphNode["domain"]> = {
  species: "species",
  gene: "gene",
  cell: "cell",
  ecosystem: "ecosystem",
  human: "human"
};

const conceptNodes: GraphNode[] = [...taxa, ...evolution].map((item) => ({
  id: item.id,
  domain: item.domain,
  name: item.name,
  latinName: item.latinName,
  subtitle: item.subtitle,
  summary: item.summary,
  attrs: item.attrs
}));

/** 每条统一记录都成为一个可探索图节点 */
const recordNodes: GraphNode[] = records.map((record: BioRecord) => ({
  id: record.id,
  domain: categoryToDomain[record.category],
  name: record.name,
  latinName: record.latinName,
  subtitle: record.dataType,
  summary: record.summary,
  recordId: record.id
}));

export const graphNodes: GraphNode[] = [...recordNodes, ...conceptNodes];

export const graphEdges: GraphEdge[] = triples.map(([source, relation, target, evidence], index) => ({
  id: `ge-${String(index + 1).padStart(3, "0")}`,
  source,
  target,
  relation,
  evidence
}));
