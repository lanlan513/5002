import type { RelationChainSeed, RelationEdgeSeed, RelationNodeSeed } from "./types.js";

/**
 * 细胞器功能关系图谱种子数据。
 * 布局坐标基于 960 × 640 的图谱画布：
 * 左侧为基因表达区，底部为分泌蛋白运输线，右上为能量代谢区。
 */
export const relationNodeSeeds: RelationNodeSeed[] = [
  /* ---------- 细胞器节点（organelleId 关联细胞器知识库） ---------- */
  {
    id: "nucleus",
    name: "细胞核",
    englishName: "Nucleus",
    kind: "organelle",
    organelleId: "nucleus",
    description: "遗传信息库：DNA 在此储存、复制和转录；核仁还负责合成 rRNA、组装核糖体亚基。",
    x: 110,
    y: 100
  },
  {
    id: "ribosome",
    name: "核糖体",
    englishName: "Ribosome",
    kind: "organelle",
    organelleId: "ribosome",
    description: "蛋白质合成的场所：读取 mRNA 上的密码子，把氨基酸逐个连接成多肽链。",
    x: 130,
    y: 500
  },
  {
    id: "rough-er",
    name: "粗面内质网",
    englishName: "Rough ER",
    kind: "organelle",
    organelleId: "rough-er",
    description: "附着核糖体的膜系统：新生肽链在此折叠、加糖基并初步加工，再出芽形成囊泡运出。",
    x: 295,
    y: 500
  },
  {
    id: "golgi",
    name: "高尔基体",
    englishName: "Golgi Apparatus",
    kind: "organelle",
    organelleId: "golgi",
    description: "细胞的“邮局”：对来自内质网的蛋白质进一步加工、分类、包装，并发往目的地。",
    x: 460,
    y: 500
  },
  {
    id: "cell-membrane",
    name: "细胞膜",
    englishName: "Cell Membrane",
    kind: "organelle",
    organelleId: "cell-membrane",
    description: "细胞的边界：通过胞吐把分泌蛋白释放到细胞外，同时控制物质进出、进行信息交流。",
    x: 625,
    y: 500
  },
  {
    id: "lysosome",
    name: "溶酶体",
    englishName: "Lysosome",
    kind: "organelle",
    organelleId: "lysosome",
    description: "细胞的“消化车间”：内含多种水解酶，分解衰老损伤的细胞器和入侵的病原体。",
    x: 370,
    y: 585
  },
  {
    id: "chloroplast",
    name: "叶绿体",
    englishName: "Chloroplast",
    kind: "organelle",
    organelleId: "chloroplast",
    description: "光合作用的场所：捕获光能，把二氧化碳和水合成有机物，是能量转化的第一站。",
    x: 520,
    y: 215
  },
  {
    id: "mitochondrion",
    name: "线粒体",
    englishName: "Mitochondrion",
    kind: "organelle",
    organelleId: "mitochondrion",
    description: "有氧呼吸的主要场所：把有机物彻底氧化分解，释放能量合成 ATP，是细胞的“动力车间”。",
    x: 700,
    y: 340
  },

  /* ---------- 分子 / 能量 / 环境节点 ---------- */
  {
    id: "dna",
    name: "DNA",
    englishName: "Deoxyribonucleic Acid",
    shortName: "DNA",
    kind: "molecule",
    description: "遗传信息的载体：碱基排列顺序中储存着控制细胞全部生命活动的遗传指令。",
    x: 110,
    y: 225
  },
  {
    id: "rna",
    name: "RNA",
    englishName: "Messenger RNA",
    shortName: "RNA",
    kind: "molecule",
    description: "转录的产物：mRNA 把遗传信息从细胞核内的 DNA 带到细胞质中的核糖体。",
    x: 110,
    y: 350
  },
  {
    id: "protein",
    name: "蛋白质",
    englishName: "Protein",
    shortName: "Pr",
    kind: "molecule",
    description: "生命活动的主要承担者：酶、结构蛋白、载体、抗体、部分激素等都是蛋白质。",
    x: 265,
    y: 350
  },
  {
    id: "light",
    name: "光能",
    englishName: "Light Energy",
    shortName: "光",
    kind: "energy",
    description: "驱动光合作用的能量来源，被叶绿体类囊体薄膜上的光合色素吸收。",
    x: 520,
    y: 90
  },
  {
    id: "co2-water",
    name: "二氧化碳和水",
    englishName: "CO₂ + H₂O",
    shortName: "CO₂·H₂O",
    kind: "molecule",
    description: "既是光合作用的原料，也是有氧呼吸的产物——碳元素在细胞代谢中循环利用。",
    x: 700,
    y: 90
  },
  {
    id: "oxygen",
    name: "氧气",
    englishName: "Oxygen",
    shortName: "O₂",
    kind: "molecule",
    description: "光合作用释放的产物，也是有氧呼吸第三阶段不可缺少的原料。",
    x: 700,
    y: 215
  },
  {
    id: "glucose",
    name: "葡萄糖",
    englishName: "Glucose",
    shortName: "C₆H₁₂O₆",
    kind: "molecule",
    description: "细胞最主要的能源物质：光合作用合成的有机物，也是呼吸作用最常用的底物。",
    x: 520,
    y: 340
  },
  {
    id: "atp",
    name: "ATP",
    englishName: "Adenosine Triphosphate",
    shortName: "ATP",
    kind: "molecule",
    description: "细胞的直接能源物质：主动运输、肌肉收缩、生物合成等都由 ATP 直接供能。",
    x: 880,
    y: 340
  },
  {
    id: "extracellular",
    name: "细胞外",
    englishName: "Extracellular",
    kind: "environment",
    description: "分泌蛋白的目的地：消化酶、抗体、蛋白质类激素等都通过胞吐释放到细胞外发挥作用。",
    x: 790,
    y: 500
  }
];

export const relationEdgeSeeds: RelationEdgeSeed[] = [
  /* ---------- 基因表达：信息流动 ---------- */
  {
    id: "e-transcription",
    from: "dna",
    to: "rna",
    label: "转录",
    kind: "information",
    description:
      "在细胞核内，以 DNA 的一条链为模板，按照碱基互补配对原则合成 mRNA——遗传信息从 DNA 流向 RNA。"
  },
  {
    id: "e-translation",
    from: "rna",
    to: "protein",
    label: "翻译",
    kind: "information",
    description:
      "mRNA 穿过核孔与核糖体结合，tRNA 按密码子顺序把氨基酸送到核糖体，连接成多肽链——信息从 RNA 流向蛋白质。"
  },
  {
    id: "e-nucleus-ribosome",
    from: "nucleus",
    to: "ribosome",
    label: "核糖体亚基",
    kind: "material",
    description:
      "核仁合成 rRNA，并与蛋白质组装成核糖体的大、小亚基，经核孔运到细胞质后组装成完整的核糖体。",
    bend: 100
  },

  /* ---------- 分泌蛋白的旅程：物质流动 ---------- */
  {
    id: "e-ribo-er",
    from: "ribosome",
    to: "rough-er",
    label: "肽链进入",
    kind: "material",
    description:
      "合成分泌蛋白的核糖体附着到粗面内质网上，新生肽链直接进入内质网腔，进行折叠和初步加工。"
  },
  {
    id: "e-er-golgi",
    from: "rough-er",
    to: "golgi",
    label: "囊泡运输",
    kind: "material",
    description: "内质网“出芽”形成囊泡，包裹着初加工的蛋白质，运往高尔基体做进一步加工。"
  },
  {
    id: "e-golgi-membrane",
    from: "golgi",
    to: "cell-membrane",
    label: "囊泡运输",
    kind: "material",
    description: "高尔基体把加工成熟的分泌蛋白装入囊泡，囊泡沿细胞骨架移向细胞膜。"
  },
  {
    id: "e-membrane-out",
    from: "cell-membrane",
    to: "extracellular",
    label: "胞吐",
    kind: "material",
    description: "囊泡与细胞膜融合，把分泌蛋白释放到细胞外。胞吐依赖膜的流动性，并消耗 ATP。"
  },
  {
    id: "e-golgi-lysosome",
    from: "golgi",
    to: "lysosome",
    label: "出芽形成",
    kind: "material",
    description: "溶酶体由高尔基体出芽形成，内部装着多种在酸性环境下活性最强的水解酶。"
  },

  /* ---------- 光合作用：能量与物质 ---------- */
  {
    id: "e-light-chloro",
    from: "light",
    to: "chloroplast",
    label: "捕获光能",
    kind: "energy",
    description: "叶绿体类囊体薄膜上的光合色素吸收、传递并转化光能，驱动光反应合成 ATP 和 NADPH。"
  },
  {
    id: "e-co2-chloro",
    from: "co2-water",
    to: "chloroplast",
    label: "光合原料",
    kind: "material",
    description: "二氧化碳经气孔进入叶肉细胞，水由根吸收后运输而来，二者是光合作用合成有机物的原料。"
  },
  {
    id: "e-chloro-glucose",
    from: "chloroplast",
    to: "glucose",
    label: "合成有机物",
    kind: "material",
    description: "暗反应中 CO₂ 被固定并还原为葡萄糖等有机物，活跃的化学能转化为稳定的化学能储存起来。"
  },
  {
    id: "e-chloro-oxygen",
    from: "chloroplast",
    to: "oxygen",
    label: "释放氧气",
    kind: "material",
    description: "光反应中水在光下分解，释放出氧气——这是地球大气中氧气的主要来源。"
  },

  /* ---------- 有氧呼吸：能量与物质 ---------- */
  {
    id: "e-glucose-mito",
    from: "glucose",
    to: "mitochondrion",
    label: "呼吸底物",
    kind: "material",
    description:
      "葡萄糖先在细胞质基质中分解为丙酮酸（第一阶段），丙酮酸再进入线粒体被彻底氧化分解。"
  },
  {
    id: "e-oxygen-mito",
    from: "oxygen",
    to: "mitochondrion",
    label: "氧气供应",
    kind: "material",
    description: "氧气经自由扩散进入细胞，最终在线粒体内膜上参与有氧呼吸第三阶段，与 [H] 结合生成水。"
  },
  {
    id: "e-mito-atp",
    from: "mitochondrion",
    to: "atp",
    label: "氧化磷酸化",
    kind: "energy",
    description:
      "线粒体把有机物氧化分解释放的能量转移到 ATP 中，为各项生命活动直接供能，其余能量以热能形式散失。"
  },
  {
    id: "e-mito-co2",
    from: "mitochondrion",
    to: "co2-water",
    label: "呼吸产物",
    kind: "material",
    description: "有氧呼吸第二、三阶段产生二氧化碳和水，二氧化碳经自由扩散排出细胞。",
    bend: 120
  }
];

export const relationChainSeeds: RelationChainSeed[] = [
  {
    id: "central-dogma",
    name: "中心法则",
    summary: "遗传信息的流动方向：DNA → RNA → 蛋白质。",
    position: 1,
    edgeIds: ["e-transcription", "e-translation"]
  },
  {
    id: "secretory-protein",
    name: "分泌蛋白的旅程",
    summary: "分泌蛋白从合成到排出细胞所经过的结构：核糖体 → 内质网 → 高尔基体 → 细胞膜。",
    position: 2,
    edgeIds: ["e-ribo-er", "e-er-golgi", "e-golgi-membrane", "e-membrane-out"]
  },
  {
    id: "photosynthesis",
    name: "光合作用",
    summary: "叶绿体捕获光能，把二氧化碳和水合成有机物并释放氧气。",
    position: 3,
    edgeIds: ["e-light-chloro", "e-co2-chloro", "e-chloro-glucose", "e-chloro-oxygen"]
  },
  {
    id: "cellular-respiration",
    name: "有氧呼吸",
    summary: "线粒体把葡萄糖彻底氧化分解，释放能量合成 ATP。",
    position: 4,
    edgeIds: ["e-glucose-mito", "e-oxygen-mito", "e-mito-atp", "e-mito-co2"]
  },
  {
    id: "energy-relay",
    name: "能量的接力",
    summary: "从光能到 ATP：能量在叶绿体与线粒体之间转化、传递，最终为生命活动供能。",
    position: 5,
    edgeIds: ["e-light-chloro", "e-chloro-glucose", "e-glucose-mito", "e-mito-atp"]
  }
];
