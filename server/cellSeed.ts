import type { CellTypeSeed, OrganelleSeed, ShapeSpec } from "./types.js";

/* ---------- 图形辅助函数 ---------- */

const dot = (cx: number, cy: number, r: number, fill: string, extra: Record<string, string | number> = {}): ShapeSpec => ({
  type: "circle",
  cx,
  cy,
  r,
  fill,
  ...extra
});

const line = (x1: number, y1: number, x2: number, y2: number, extra: Record<string, string | number>): ShapeSpec => ({
  type: "line",
  x1,
  y1,
  x2,
  y2,
  ...extra
});

/** 线粒体：椭球外膜 + 内膜嵴 */
const mitochondrion = (cx: number, cy: number, angle: number, rx = 56, ry = 27): ShapeSpec[] => {
  const transform = `rotate(${angle} ${cx} ${cy})`;
  return [
    { type: "ellipse", cx, cy, rx, ry, fill: "url(#mitoGrad)", stroke: "#e0765a", strokeWidth: 2.5, transform },
    {
      type: "path",
      d: `M ${cx - rx * 0.72} ${cy} q ${rx * 0.18} ${-ry * 0.55} ${rx * 0.36} 0 t ${rx * 0.36} 0 t ${rx * 0.36} 0`,
      fill: "none",
      stroke: "#c94f63",
      strokeWidth: 2.5,
      strokeLinecap: "round",
      transform
    }
  ];
};

/** 叶绿体：椭球被膜 + 类囊体基粒线 */
const chloroplast = (cx: number, cy: number, angle: number): ShapeSpec[] => {
  const transform = `rotate(${angle} ${cx} ${cy})`;
  const common = { stroke: "#2f7a4d", strokeWidth: 2, opacity: 0.55, transform };
  return [
    { type: "ellipse", cx, cy, rx: 40, ry: 23, fill: "url(#chloroGrad)", stroke: "#2d6a4f", strokeWidth: 2.5, transform },
    line(cx - 28, cy - 8, cx + 28, cy - 8, common),
    line(cx - 31, cy, cx + 31, cy, common),
    line(cx - 28, cy + 8, cx + 28, cy + 8, common)
  ];
};

/** 粗面内质网：平行膜管 + 附着的核糖体颗粒 */
const roughER = (paths: string[], dots: Array<[number, number]>): ShapeSpec[] => [
  ...paths.map((d) => ({ type: "path" as const, d, fill: "none", stroke: "#5a8dee", strokeWidth: 3, strokeLinecap: "round" })),
  ...dots.map(([cx, cy]) => dot(cx, cy, 3.2, "#3d5a99"))
];

/** 高尔基体：堆叠的扁平囊 + 分泌小泡 */
const golgi = (arcs: string[], vesicles: Array<[number, number, number]>): ShapeSpec[] => [
  ...arcs.map((d) => ({ type: "path" as const, d, fill: "none", stroke: "#dda15e", strokeWidth: 5, strokeLinecap: "round" })),
  ...vesicles.map(([cx, cy, r]) => dot(cx, cy, r, "#e9c46a", { stroke: "#dda15e", strokeWidth: 1 }))
];

const ribosomes = (points: Array<[number, number]>, r = 4): ShapeSpec[] =>
  points.map(([cx, cy]) => dot(cx, cy, r, "#6a4c93"));

/* ---------- 动物细胞 ---------- */

const ANIMAL_OUTLINE =
  "M 400 62 C 560 62 716 158 712 298 C 708 432 592 540 400 544 C 208 548 92 448 88 300 C 84 162 240 62 400 62 Z";

const animalCell: CellTypeSeed = {
  id: "animal",
  name: "动物细胞",
  englishName: "Animal Cell",
  icon: "paw-print",
  description:
    "动物细胞是没有细胞壁的真核细胞，形态不规则而多样。细胞膜内包含细胞核与多种细胞器，通过分化协作构成组织、器官和完整的动物体。",
  features: ["无细胞壁，形态不规则", "有中心体，与有丝分裂有关", "溶酶体较发达", "液泡小而不明显"],
  viewBox: { x: 0, y: 0, w: 800, h: 600 },
  position: 1,
  structures: [
    {
      organelleId: "cytoplasm",
      z: 1,
      label: { x: 640, y: 430 },
      shapes: [
        { type: "path", d: ANIMAL_OUTLINE, fill: "url(#cytoGrad)" },
        dot(220, 180, 40, "#ffffff", { opacity: 0.3 }),
        dot(600, 380, 48, "#ffffff", { opacity: 0.25 }),
        dot(350, 480, 30, "#ffffff", { opacity: 0.3 })
      ]
    },
    {
      organelleId: "cell-membrane",
      z: 2,
      label: { x: 600, y: 108 },
      shapes: [
        { type: "path", d: ANIMAL_OUTLINE, fill: "none", stroke: "#e76f51", strokeWidth: 5 },
        { type: "path", d: ANIMAL_OUTLINE, fill: "none", stroke: "rgba(0,0,0,0)", strokeWidth: 18 }
      ]
    },
    {
      organelleId: "rough-er",
      z: 3,
      label: { x: 230, y: 482 },
      shapes: roughER(
        [
          "M 152 398 C 200 420 260 420 308 400",
          "M 148 420 C 200 442 262 442 312 422",
          "M 152 442 C 202 464 260 464 308 444"
        ],
        [
          [170, 404], [205, 414], [245, 415], [285, 408],
          [165, 426], [200, 436], [240, 438], [280, 430],
          [175, 448], [215, 456], [255, 456], [290, 446]
        ]
      )
    },
    {
      organelleId: "smooth-er",
      z: 4,
      label: { x: 578, y: 398 },
      shapes: [
        { type: "path", d: "M 445 395 q 18 -22 36 0 t 36 0 t 36 0", fill: "none", stroke: "#82c0cc", strokeWidth: 3, strokeLinecap: "round" },
        { type: "path", d: "M 450 420 q 18 -22 36 0 t 36 0 t 36 0", fill: "none", stroke: "#82c0cc", strokeWidth: 3, strokeLinecap: "round" }
      ]
    },
    {
      organelleId: "golgi",
      z: 5,
      label: { x: 560, y: 232 },
      shapes: golgi(
        [
          "M 508 268 Q 560 248 612 268",
          "M 511 286 Q 560 266 609 286",
          "M 514 304 Q 560 284 606 304",
          "M 517 322 Q 560 302 603 322"
        ],
        [[500, 262, 6], [618, 272, 5], [614, 318, 6], [505, 326, 5]]
      )
    },
    {
      organelleId: "vacuole",
      z: 6,
      label: { x: 140, y: 322 },
      shapes: [
        dot(140, 360, 16, "#a8dadc", { opacity: 0.85, stroke: "#6fa8bf", strokeWidth: 2 }),
        dot(662, 196, 15, "#a8dadc", { opacity: 0.85, stroke: "#6fa8bf", strokeWidth: 2 })
      ]
    },
    {
      organelleId: "lysosome",
      z: 7,
      label: { x: 472, y: 178 },
      shapes: [
        dot(472, 208, 14, "#90be6d", { stroke: "#588157", strokeWidth: 2 }),
        dot(472, 208, 5, "#588157", { opacity: 0.5 }),
        dot(610, 462, 11, "#90be6d", { stroke: "#588157", strokeWidth: 2 }),
        dot(610, 462, 4, "#588157", { opacity: 0.5 })
      ]
    },
    {
      organelleId: "mitochondrion",
      z: 8,
      label: { x: 578, y: 122 },
      shapes: [
        ...mitochondrion(578, 168, -22),
        ...mitochondrion(188, 428, 28),
        ...mitochondrion(520, 448, 14)
      ]
    },
    {
      organelleId: "centriole",
      z: 9,
      label: { x: 356, y: 466 },
      shapes: [
        { type: "rect", x: 342, y: 424, width: 36, height: 12, rx: 6, fill: "#577590" },
        { type: "rect", x: 342, y: 424, width: 36, height: 12, rx: 6, fill: "#577590", transform: "rotate(90 360 430)" }
      ]
    },
    {
      organelleId: "ribosome",
      z: 10,
      label: { x: 508, y: 110 },
      shapes: ribosomes([
        [430, 150], [482, 122], [628, 238], [655, 358], [596, 402],
        [478, 486], [388, 478], [252, 486], [148, 302], [196, 218],
        [262, 148], [524, 510], [336, 524], [688, 296], [130, 398]
      ])
    },
    {
      organelleId: "nucleus",
      z: 11,
      label: { x: 352, y: 332 },
      shapes: [
        dot(330, 272, 100, "url(#nucleusGrad)", { stroke: "#7e57c2", strokeWidth: 3 }),
        dot(330, 272, 88, "none", { stroke: "#a084cf", strokeWidth: 1.5, strokeDasharray: "6 5" }),
        { type: "path", d: "M 268 290 Q 290 270 312 292 T 356 296", fill: "none", stroke: "#b07cc6", strokeWidth: 2.5, opacity: 0.7 },
        { type: "path", d: "M 280 320 Q 310 300 340 322 T 392 318", fill: "none", stroke: "#b07cc6", strokeWidth: 2.5, opacity: 0.7 },
        { type: "path", d: "M 360 240 Q 380 226 398 244", fill: "none", stroke: "#b07cc6", strokeWidth: 2.5, opacity: 0.7 },
        dot(308, 250, 30, "#8e5ea2", { opacity: 0.9 })
      ]
    }
  ]
};

/* ---------- 植物细胞 ---------- */

const plantCell: CellTypeSeed = {
  id: "plant",
  name: "植物细胞",
  englishName: "Plant Cell",
  icon: "leaf",
  description:
    "植物细胞是有细胞壁的真核细胞，形态规则。叶肉细胞中含有叶绿体，能进行光合作用；成熟细胞中央通常有一个巨大的液泡，维持细胞的坚挺。",
  features: ["有细胞壁，形态规则", "含叶绿体，能进行光合作用", "有中央大液泡", "一般无中心体（低等植物除外）"],
  viewBox: { x: 0, y: 0, w: 800, h: 600 },
  position: 2,
  structures: [
    {
      organelleId: "cell-wall",
      z: 1,
      label: { x: 400, y: 52 },
      shapes: [
        { type: "rect", x: 96, y: 76, width: 608, height: 448, rx: 48, fill: "#ecdcbe", stroke: "#9c6644", strokeWidth: 6 }
      ]
    },
    {
      organelleId: "cytoplasm",
      z: 2,
      label: { x: 163, y: 250 },
      shapes: [
        { type: "rect", x: 118, y: 98, width: 564, height: 404, rx: 36, fill: "url(#plantCytoGrad)" }
      ]
    },
    {
      organelleId: "cell-membrane",
      z: 3,
      label: { x: 712, y: 300 },
      shapes: [
        { type: "rect", x: 118, y: 98, width: 564, height: 404, rx: 36, fill: "none", stroke: "#e76f51", strokeWidth: 3 },
        { type: "rect", x: 118, y: 98, width: 564, height: 404, rx: 36, fill: "none", stroke: "rgba(0,0,0,0)", strokeWidth: 12 }
      ]
    },
    {
      organelleId: "central-vacuole",
      z: 4,
      label: { x: 385, y: 305 },
      shapes: [
        { type: "rect", x: 225, y: 155, width: 320, height: 290, rx: 70, fill: "url(#vacuoleGrad)", stroke: "#7fc8d8", strokeWidth: 3 }
      ]
    },
    {
      organelleId: "golgi",
      z: 5,
      label: { x: 292, y: 130 },
      shapes: golgi(
        ["M 340 122 Q 380 110 420 122", "M 343 136 Q 380 124 417 136"],
        [[333, 118, 5], [427, 130, 5]]
      )
    },
    {
      organelleId: "rough-er",
      z: 6,
      label: { x: 610, y: 288 },
      shapes: roughER(
        ["M 568 296 Q 610 310 652 298", "M 566 316 Q 610 330 654 318"],
        [[580, 302], [605, 308], [630, 306], [585, 322], [610, 327], [635, 324]]
      )
    },
    {
      organelleId: "mitochondrion",
      z: 7,
      label: { x: 352, y: 545 },
      shapes: [
        ...mitochondrion(352, 478, -8, 46, 20),
        ...mitochondrion(628, 478, 12, 46, 20)
      ]
    },
    {
      organelleId: "chloroplast",
      z: 8,
      label: { x: 168, y: 112 },
      shapes: [
        ...chloroplast(168, 152, -18),
        ...chloroplast(158, 318, 12),
        ...chloroplast(180, 462, -10),
        ...chloroplast(636, 158, 22),
        ...chloroplast(630, 250, 8)
      ]
    },
    {
      organelleId: "ribosome",
      z: 9,
      label: { x: 636, y: 112 },
      shapes: ribosomes(
        [
          [150, 250], [150, 400], [200, 205], [250, 482], [470, 478],
          [585, 210], [665, 300], [590, 112], [300, 118], [480, 122],
          [670, 420], [585, 438]
        ],
        3.6
      )
    },
    {
      organelleId: "nucleus",
      z: 10,
      label: { x: 628, y: 420 },
      shapes: [
        dot(622, 392, 56, "url(#nucleusGrad)", { stroke: "#7e57c2", strokeWidth: 3 }),
        dot(622, 392, 48, "none", { stroke: "#a084cf", strokeWidth: 1.5, strokeDasharray: "5 4" }),
        { type: "path", d: "M 590 410 Q 610 398 632 412", fill: "none", stroke: "#b07cc6", strokeWidth: 2.5, opacity: 0.7 },
        dot(608, 380, 17, "#8e5ea2", { opacity: 0.9 })
      ]
    }
  ]
};

/* ---------- 原核细胞（细菌） ---------- */

const prokaryoteCell: CellTypeSeed = {
  id: "prokaryote",
  name: "原核细胞",
  englishName: "Prokaryotic Cell",
  icon: "bug",
  description:
    "原核细胞没有由核膜包被的细胞核，遗传物质集中在拟核区域。结构简单、体积微小，却拥有完整的生命活动能力，细菌、蓝细菌等都是代表。",
  features: ["无核膜包被的细胞核（拟核）", "细胞器只有核糖体", "常有荚膜、鞭毛等附属结构", "细胞壁主要成分为肽聚糖"],
  viewBox: { x: 0, y: 0, w: 800, h: 600 },
  position: 3,
  structures: [
    {
      organelleId: "capsule",
      z: 1,
      label: { x: 470, y: 184 },
      shapes: [
        { type: "rect", x: 110, y: 200, width: 580, height: 200, rx: 100, fill: "#ffe6bd", opacity: 0.95, stroke: "#f0b27a", strokeWidth: 3 }
      ]
    },
    {
      organelleId: "cell-wall",
      z: 2,
      label: { x: 85, y: 252 },
      shapes: [
        { type: "rect", x: 126, y: 214, width: 548, height: 172, rx: 86, fill: "#f9ead9", stroke: "#9c6644", strokeWidth: 6 }
      ]
    },
    {
      organelleId: "cytoplasm",
      z: 3,
      label: { x: 185, y: 262 },
      shapes: [
        { type: "rect", x: 142, y: 228, width: 516, height: 144, rx: 72, fill: "url(#prokCytoGrad)" }
      ]
    },
    {
      organelleId: "cell-membrane",
      z: 4,
      label: { x: 85, y: 362 },
      shapes: [
        { type: "rect", x: 142, y: 228, width: 516, height: 144, rx: 72, fill: "none", stroke: "#e76f51", strokeWidth: 3 },
        { type: "rect", x: 142, y: 228, width: 516, height: 144, rx: 72, fill: "none", stroke: "rgba(0,0,0,0)", strokeWidth: 12 }
      ]
    },
    {
      organelleId: "nucleoid",
      z: 5,
      label: { x: 405, y: 240 },
      shapes: [
        { type: "path", d: "M 352 296 C 352 264 408 258 424 288 C 440 318 398 346 368 332 C 344 321 352 296 352 296 Z", fill: "none", stroke: "#f0a500", strokeWidth: 4, strokeLinecap: "round" },
        { type: "path", d: "M 396 268 C 430 252 470 270 462 300 C 454 330 408 332 396 308", fill: "none", stroke: "#f0a500", strokeWidth: 4, strokeLinecap: "round" },
        { type: "path", d: "M 372 312 C 390 342 440 344 452 318", fill: "none", stroke: "#f0a500", strokeWidth: 4, strokeLinecap: "round" },
        { type: "path", d: "M 352 296 C 352 264 408 258 424 288 C 440 318 398 346 368 332 C 344 321 352 296 352 296 Z", fill: "none", stroke: "rgba(0,0,0,0)", strokeWidth: 16 },
        { type: "path", d: "M 396 268 C 430 252 470 270 462 300 C 454 330 408 332 396 308", fill: "none", stroke: "rgba(0,0,0,0)", strokeWidth: 16 }
      ]
    },
    {
      organelleId: "plasmid",
      z: 6,
      label: { x: 248, y: 240 },
      shapes: [
        dot(248, 268, 11, "none", { stroke: "#7a9e4f", strokeWidth: 3.5 }),
        dot(548, 332, 11, "none", { stroke: "#7a9e4f", strokeWidth: 3.5 }),
        dot(296, 338, 11, "none", { stroke: "#7a9e4f", strokeWidth: 3.5 })
      ]
    },
    {
      organelleId: "ribosome",
      z: 7,
      label: { x: 598, y: 244 },
      shapes: ribosomes(
        [
          [190, 290], [215, 335], [260, 310], [300, 258], [330, 350],
          [490, 258], [520, 342], [575, 290], [612, 332], [632, 272], [185, 335]
        ],
        4.5
      )
    },
    {
      organelleId: "flagellum",
      z: 8,
      label: { x: 740, y: 252 },
      shapes: [
        { type: "path", d: "M 692 300 C 728 268 742 332 778 300", fill: "none", stroke: "#577590", strokeWidth: 5, strokeLinecap: "round" },
        { type: "path", d: "M 108 300 C 74 268 60 332 26 300", fill: "none", stroke: "#577590", strokeWidth: 5, strokeLinecap: "round" },
        { type: "path", d: "M 692 300 C 728 268 742 332 778 300", fill: "none", stroke: "rgba(0,0,0,0)", strokeWidth: 16 },
        { type: "path", d: "M 108 300 C 74 268 60 332 26 300", fill: "none", stroke: "rgba(0,0,0,0)", strokeWidth: 16 }
      ]
    },
    {
      organelleId: "pilus",
      z: 9,
      label: { x: 220, y: 152 },
      shapes: [
        ...([
          [200, 196, 192, 170], [300, 194, 296, 168], [420, 194, 424, 168],
          [540, 196, 548, 170], [630, 208, 648, 188], [180, 404, 172, 428],
          [320, 406, 318, 432], [480, 406, 484, 432], [600, 398, 612, 422],
          [116, 262, 92, 254], [680, 342, 704, 350]
        ] as Array<[number, number, number, number]>).flatMap(([x1, y1, x2, y2]) => [
          line(x1, y1, x2, y2, { stroke: "#577590", strokeWidth: 3, strokeLinecap: "round" }),
          line(x1, y1, x2, y2, { stroke: "rgba(0,0,0,0)", strokeWidth: 10, strokeLinecap: "round" })
        ])
      ]
    }
  ]
};

export const cellSeeds: CellTypeSeed[] = [animalCell, plantCell, prokaryoteCell];

/* ---------- 细胞器知识库 ---------- */

export const organelleSeeds: OrganelleSeed[] = [
  {
    id: "cell-membrane",
    name: "细胞膜",
    englishName: "Cell Membrane",
    function: "细胞的边界：控制物质进出（选择透过性），进行细胞间的信息交流，维持细胞内环境的相对稳定。",
    location: "包围在细胞最外层；植物细胞中紧贴细胞壁内侧。由磷脂双分子层构成基本支架，膜蛋白镶嵌或贯穿其中。",
    knowledge: [
      "流动镶嵌模型：膜具有流动性，磷脂和大多数蛋白质都可以运动",
      "膜蛋白承担运输（载体、通道）、识别（糖蛋白）、催化等多种功能",
      "功能越复杂的细胞膜，蛋白质的种类和数量越多"
    ]
  },
  {
    id: "cytoplasm",
    name: "细胞质",
    englishName: "Cytoplasm",
    function: "细胞新陈代谢的主要场所之一，为各种生化反应提供场所、原料和适宜环境。",
    location: "细胞膜以内、细胞核（或拟核）以外的全部区域，包括细胞质基质和悬浮其中的细胞器。",
    knowledge: [
      "细胞质基质呈胶质状态，含水、无机盐、脂质、糖类、氨基酸、核苷酸和多种酶",
      "活细胞的细胞质处于不断流动的状态，称为胞质环流",
      "细胞骨架由蛋白质纤维组成，维持细胞形态并参与物质运输"
    ]
  },
  {
    id: "nucleus",
    name: "细胞核",
    englishName: "Nucleus",
    function: "遗传信息库，是细胞代谢和遗传的控制中心；DNA 复制和转录的主要场所。",
    location: "真核细胞中央或一侧，由双层核膜包围，核膜上有核孔；内部含染色质和核仁。",
    knowledge: [
      "染色质由 DNA 和蛋白质组成，是遗传物质的主要载体",
      "核仁与某种 RNA（rRNA）的合成以及核糖体的形成有关",
      "核孔可实现核质之间频繁的物质交换和信息交流，具有选择性",
      "有无核膜包被的细胞核，是区分真核细胞与原核细胞的根本依据"
    ]
  },
  {
    id: "mitochondrion",
    name: "线粒体",
    englishName: "Mitochondrion",
    function: "有氧呼吸的主要场所，细胞的“动力车间”——有机物在此分解释放能量，合成 ATP 供生命活动利用。",
    location: "广泛分布于真核细胞的细胞质中；新陈代谢旺盛的细胞（如心肌细胞）中数量多，常集中在耗能部位。",
    knowledge: [
      "双层膜结构：内膜向内折叠形成嵴，大大增加了膜面积",
      "含少量 DNA、RNA 和核糖体，是半自主性细胞器",
      "内共生学说认为线粒体起源于被原始真核细胞吞噬的需氧细菌"
    ]
  },
  {
    id: "rough-er",
    name: "粗面内质网",
    englishName: "Rough Endoplasmic Reticulum",
    function: "表面附着核糖体，合成分泌蛋白和膜蛋白，并对新生肽链进行初步加工和运输。",
    location: "靠近细胞核，膜外连核膜、内连核周腔，是细胞内面积最大的膜系统。",
    knowledge: [
      "由膜围成的扁平囊腔和管网组成，因附着核糖体而显得“粗糙”",
      "分泌蛋白的运输路线：核糖体 → 粗面内质网 → 高尔基体 → 细胞膜",
      "抗体、胰岛素等分泌蛋白都在这里合成和初加工"
    ]
  },
  {
    id: "smooth-er",
    name: "滑面内质网",
    englishName: "Smooth Endoplasmic Reticulum",
    function: "合成脂质（磷脂、固醇等），参与糖原分解和某些解毒作用。",
    location: "与粗面内质网相连通，表面没有核糖体附着，因而显得光滑。",
    knowledge: [
      "肝细胞中滑面内质网发达，与酒精和药物的解毒有关",
      "肌细胞中的肌质网是特化的滑面内质网，储存并释放 Ca²⁺ 控制肌肉收缩",
      "性腺细胞中滑面内质网参与性激素（固醇类）的合成"
    ]
  },
  {
    id: "golgi",
    name: "高尔基体",
    englishName: "Golgi Apparatus",
    function: "对来自内质网的蛋白质进行加工、分类、包装和发送；在植物细胞中还参与细胞壁的形成。",
    location: "细胞质中，通常位于细胞核附近，由一摞扁平囊和周围的大小囊泡组成。",
    knowledge: [
      "1898 年由意大利学者卡米洛·高尔基发现",
      "像细胞的“邮局”：给蛋白质贴上地址标签，决定它们被送往何处",
      "溶酶体是由高尔基体“出芽”形成的"
    ]
  },
  {
    id: "ribosome",
    name: "核糖体",
    englishName: "Ribosome",
    function: "蛋白质合成的场所：读取 mRNA 上的遗传信息，把氨基酸连接成多肽链（翻译）。",
    location: "游离在细胞质基质中，或附着于粗面内质网和核膜上；原核细胞中则游离分布。",
    knowledge: [
      "由 rRNA 和蛋白质组成，无膜结构，是最小的细胞器",
      "真核细胞核糖体为 80S，原核细胞为 70S——许多抗生素正是瞄准细菌 70S 核糖体起作用",
      "核糖体是原核细胞中唯一的细胞器"
    ]
  },
  {
    id: "lysosome",
    name: "溶酶体",
    englishName: "Lysosome",
    function: "内含多种水解酶，能分解衰老、损伤的细胞器，吞噬并杀死侵入细胞的病毒或细菌。",
    location: "主要分布在动物细胞的细胞质中，由单层膜包裹的球形小泡。",
    knowledge: [
      "内部为酸性环境（pH≈5），水解酶在酸性条件下活性最强",
      "与细胞的“自噬”作用密切相关，被称为细胞的“消化车间”",
      "硅肺的病因之一：硅尘破坏溶酶体膜，释放的水解酶损伤细胞"
    ]
  },
  {
    id: "centriole",
    name: "中心体",
    englishName: "Centrosome",
    function: "与细胞有丝分裂有关：分裂时发出星射线，牵引染色体移动，形成纺锤体。",
    location: "动物细胞和某些低等植物细胞中，位于细胞核附近，由两个互相垂直排列的中心粒及周围物质组成。",
    knowledge: [
      "无膜结构，主要由微管蛋白构成",
      "在分裂间期完成复制，分裂期移向细胞两极",
      "高等植物细胞没有中心体，由细胞两极直接发出纺锤丝"
    ]
  },
  {
    id: "vacuole",
    name: "液泡",
    englishName: "Vacuole",
    function: "动物细胞中的液泡小而多，主要参与物质的储存、运输以及胞吞、胞吐过程。",
    location: "分散在动物细胞的细胞质中，体积小、数量不定。",
    knowledge: [
      "动物细胞的液泡不发达，与植物细胞的中央大液泡差别明显",
      "变形虫通过食物泡（一种液泡）消化摄取的食物",
      "比较动植物细胞时，液泡的大小和数量是重要的鉴别点"
    ]
  },
  {
    id: "cell-wall",
    name: "细胞壁",
    englishName: "Cell Wall",
    function: "支持和保护细胞，维持细胞的固有形态；植物细胞壁还参与细胞间的连接（胞间连丝）。",
    location: "位于植物细胞和大多数原核细胞的最外层。植物细胞壁主要成分是纤维素和果胶，细菌细胞壁主要成分是肽聚糖。",
    knowledge: [
      "细胞壁具有全透性，物质可以自由通过，控制进出的仍是细胞膜",
      "植物细胞壁使细胞呈规则的几何形状，也让植物体能保持挺立",
      "青霉素通过抑制细菌细胞壁（肽聚糖）的合成来杀菌，对人体细胞无害"
    ]
  },
  {
    id: "chloroplast",
    name: "叶绿体",
    englishName: "Chloroplast",
    function: "光合作用的场所：捕获光能，把二氧化碳和水合成有机物，并将光能转化为化学能储存起来。",
    location: "主要存在于绿色植物的叶肉细胞和幼茎皮层细胞中，呈扁平的椭球形或球形。",
    knowledge: [
      "双层膜结构，内部有由类囊体堆叠而成的基粒，光合色素分布在类囊体薄膜上",
      "含少量 DNA、RNA 和核糖体，是半自主性细胞器",
      "内共生学说认为叶绿体起源于被吞噬的蓝细菌",
      "叶绿体中会同时发生光反应（类囊体薄膜）和暗反应（基质）"
    ]
  },
  {
    id: "central-vacuole",
    name: "中央大液泡",
    englishName: "Central Vacuole",
    function: "储存水、无机盐、糖类、色素和代谢废物；调节细胞内的渗透压，使植物细胞保持坚挺。",
    location: "成熟植物细胞的中央，可占细胞体积的 90%，把细胞核等结构挤向边缘。",
    knowledge: [
      "液泡膜是单层膜，能选择性地吸收和积累物质",
      "细胞液中的花青素使花瓣和果实呈现红、蓝、紫等颜色",
      "成熟的植物细胞失水时会发生质壁分离——观察它的经典实验材料是紫色洋葱外表皮"
    ]
  },
  {
    id: "capsule",
    name: "荚膜",
    englishName: "Capsule",
    function: "保护细菌免受干燥、噬菌体和宿主免疫系统的攻击，并帮助细菌黏附在物体表面。",
    location: "某些细菌细胞壁外的一层黏液状结构，主要成分为多糖（少数为多肽）。",
    knowledge: [
      "肺炎链球菌的荚膜与其致病力密切相关——格里菲思的转化实验正是基于有、无荚膜的菌株",
      "有荚膜的细菌在培养基上形成光滑（S 型）菌落，无荚膜则形成粗糙（R 型）菌落",
      "炭疽芽孢杆菌的荚膜由多肽组成，是少数非多糖荚膜的例子"
    ]
  },
  {
    id: "nucleoid",
    name: "拟核",
    englishName: "Nucleoid",
    function: "原核细胞的遗传物质储存区域：一个大型环状 DNA 分子在此盘绕，控制细胞的遗传与代谢。",
    location: "位于细胞质中央区域，没有核膜包围，也没有染色体结构。",
    knowledge: [
      "拟核 DNA 裸露，不与组蛋白结合形成染色体",
      "没有核膜，是原核细胞与真核细胞最根本的区别",
      "由于转录和翻译在同一空间进行，原核细胞可以边转录边翻译，效率很高"
    ]
  },
  {
    id: "plasmid",
    name: "质粒",
    englishName: "Plasmid",
    function: "携带抗药性等“额外”遗传信息的小型环状 DNA，能在细菌之间传递，赋予细菌新的性状。",
    location: "游离在原核细胞的细胞质中，独立于拟核 DNA 之外，能自我复制。",
    knowledge: [
      "基因工程中最常用的运载体：把目的基因插入质粒，再导入受体细胞",
      "可通过“接合”作用在细菌之间转移，这是抗药性在细菌间扩散的重要原因",
      "作为运载体需具备：能自我复制、有标记基因、有多个限制酶切位点"
    ]
  },
  {
    id: "flagellum",
    name: "鞭毛",
    englishName: "Flagellum",
    function: "细菌的“推进器”：通过基部马达般的结构旋转，推动细菌在液体环境中游动，趋向有利环境。",
    location: "从细胞膜伸出、穿过细胞壁的长丝状结构；数量和着生位置因细菌种类而异。",
    knowledge: [
      "由鞭毛蛋白构成，靠细胞膜两侧的质子梯度驱动旋转，每秒可转数百圈",
      "细菌鞭毛的旋转式结构与真核生物鞭毛的“9+2”微管摆动结构完全不同",
      "鞭毛的有无和排列方式是细菌分类鉴定的重要依据"
    ]
  },
  {
    id: "pilus",
    name: "菌毛",
    englishName: "Pilus",
    function: "帮助细菌附着在宿主细胞或物体表面；性菌毛还能在细菌之间传递质粒（接合作用）。",
    location: "细菌表面短而直的丝状结构，比鞭毛更短、更多，遍布菌体表面。",
    knowledge: [
      "由菌毛蛋白组成，是许多病原菌致病的“毒力因子”——先黏附，才能感染",
      "性菌毛像一根临时管道，把质粒 DNA 从供体菌送入受体菌",
      "针对菌毛的疫苗设计是预防某些细菌感染的研究方向"
    ]
  }
];
