import type {
  ProcessEntityKind,
  ProcessEntitySeed,
  ProcessKeyframe,
  ProcessMetricSeed,
  ProcessSeed,
  ProcessStepSeed,
  ShapeSpec
} from "./types.js";

/* ============================================================
 * 生命过程动态模拟种子数据
 *
 * 每个过程 = 场景实体（初始 SVG 图形）+ 状态轨道（每一步结束时的
 * 关键帧）+ 步骤说明 + 状态指标。前端播放器在关键帧之间插值，
 * 因此“动画的每一帧都由数据状态决定”：暂停 / 调速 / 拖回到任意
 * 阶段时，画面与指标都严格对应当前状态，而不是播放预设视频。
 *
 * 约定：
 * - 所有图形以 (0,0) 为局部中心，位置由关键帧 x/y 控制；
 * - track 长度 = 步数 + 1，track[0] 为初始状态；
 * - 关键帧只写变化的属性，未写的属性沿用上一帧。
 * ============================================================ */

/* ---------- 图形辅助 ---------- */

const dot = (r: number, fill: string, extra: Record<string, string | number> = {}): ShapeSpec => ({
  type: "circle",
  cx: 0,
  cy: 0,
  r,
  fill,
  ...extra
});

const text = (
  content: string,
  extra: Record<string, string | number> = {}
): ShapeSpec => ({
  type: "text",
  x: 0,
  y: 0,
  textAnchor: "middle",
  dominantBaseline: "central",
  fontSize: 11,
  fill: "#cfe4d8",
  ...extra,
  children: content
});

const roundRect = (
  x: number,
  y: number,
  w: number,
  h: number,
  fill: string,
  extra: Record<string, string | number> = {}
): ShapeSpec => ({ type: "rect", x, y, width: w, height: h, rx: Math.min(w, h) / 2, fill, ...extra });

/** X 形染色体：两条交叉的染色单体 */
const xChromosome = (): ShapeSpec[] => [
  { type: "rect", x: -4, y: -15, width: 8, height: 30, rx: 4, fill: "#e5739b", stroke: "#b23a63", strokeWidth: 2, transform: "rotate(20)" },
  { type: "rect", x: -4, y: -15, width: 8, height: 30, rx: 4, fill: "#e5739b", stroke: "#b23a63", strokeWidth: 2, transform: "rotate(-20)" }
];

/** 后期的杆状染色体（单条染色单体） */
const rodChromosome = (): ShapeSpec[] => [
  { type: "rect", x: -4, y: -11, width: 8, height: 22, rx: 4, fill: "#e5739b", stroke: "#b23a63", strokeWidth: 2 }
];

/** 中心体：两个互相垂直的中心粒 */
const centrosome = (): ShapeSpec[] => [
  roundRect(-11, -3.5, 22, 7, "#7fa8d6"),
  roundRect(-11, -3.5, 22, 7, "#7fa8d6", { transform: "rotate(90)" })
];

/** 松散染色质：波浪形染色线 */
const chromatinBlob = (): ShapeSpec[] => [
  { type: "path", d: "M -30 -6 q 10 -12 22 -2 t 22 2 t 18 -2", fill: "none", stroke: "#c08bd8", strokeWidth: 3, strokeLinecap: "round" },
  { type: "path", d: "M -34 12 q 12 -10 22 0 t 22 2 t 16 -4", fill: "none", stroke: "#c08bd8", strokeWidth: 3, strokeLinecap: "round" },
  { type: "path", d: "M -22 26 q 10 -8 20 -2 t 18 4", fill: "none", stroke: "#c08bd8", strokeWidth: 2.5, strokeLinecap: "round" }
];

/* ---------- 关键帧轨道辅助 ---------- */

/**
 * 生成逐帧状态轨道：frameChanges[f] 中给出的属性在第 f 帧生效，
 * 其余属性沿用最近一次取值。
 */
function track(
  frames: number,
  frameChanges: Array<Partial<ProcessKeyframe> | undefined>
): ProcessKeyframe[] {
  const out: ProcessKeyframe[] = [];
  let current: ProcessKeyframe = {};
  for (let f = 0; f < frames; f++) {
    const change = frameChanges[f];
    if (change) current = { ...current, ...change };
    out.push({ ...current });
  }
  return out;
}

/** 当前过程的关键帧总数（步数 + 初始帧），用于校验完整轨道 */
let PROCESS_FRAME_COUNT = 0;

const entity = (
  id: string,
  kind: ProcessEntityKind,
  shapes: ShapeSpec[],
  frames: Array<Partial<ProcessKeyframe> | undefined>,
  opts: {
    name?: string;
    organelleId?: string;
    path?: string;
    orientPath?: boolean;
    label?: { dx?: number; dy?: number };
    z?: number;
  } = {}
): ProcessEntitySeed => {
  // 保持轨道“稀疏”：静态实体只有 1 帧，未设置的变换属性一律不写，
  // 由前端引擎按“从未设置（null）”处理，避免把绝对坐标实体错误平移到原点。
  if (frames.length > PROCESS_FRAME_COUNT) {
    throw new Error(`过程实体 ${id} 的轨道帧数 ${frames.length} 超过 ${PROCESS_FRAME_COUNT}`);
  }
  return {
    id,
    kind,
    shapes,
    track: track(frames.length, frames),
    ...opts
  };
};

/* 多边形点串（六边形等） */
const polygonPoints = (r: number, sides = 6, startAngle = -90) =>
  Array.from({ length: sides }, (_, i) => {
    const a = ((startAngle + (360 / sides) * i) * Math.PI) / 180;
    return `${(r * Math.cos(a)).toFixed(1)},${(r * Math.sin(a)).toFixed(1)}`;
  }).join(" ");

/* ============================================================
 * 过程一：动物细胞的有丝分裂
 * ============================================================ */

const MITOSIS_FRAMES = 7; // 6 步 + 初始帧

/* 赤道板上 6 条染色体的 y 偏移（示意图，真实动物细胞为 2n 染色体） */
const PLATE_DY = [-52, -31, -10, 10, 31, 52];

const mitosisEntities = (): ProcessEntitySeed[] => {
  PROCESS_FRAME_COUNT = MITOSIS_FRAMES;
  const list: ProcessEntitySeed[] = [];

  /* --- 细胞轮廓 --- */
  // 间期 / 分裂期母细胞（略不规则的圆形，符合动物细胞形态）
  list.push(
    entity(
      "cell-parent",
      "membrane",
      [
        {
          type: "path",
          d: "M -250 -40 C -252 -150 -120 -196 0 -186 C 120 -196 252 -150 250 -40 C 252 72 132 186 0 178 C -132 186 -252 72 -250 -40 Z",
          fill: "rgba(231,111,81,0.05)",
          stroke: "#e76f51",
          strokeWidth: 4
        }
      ],
      [
        { x: 400, y: 260, opacity: 1 },
        {},
        {},
        {},
        { opacity: 0.7 },
        { opacity: 0 },
        { opacity: 0 }
      ],
      { name: "细胞膜", organelleId: "cell-membrane", z: 2 }
    )
  );

  // 后期 / 末期出现缢裂沟的细胞（花生形）
  list.push(
    entity(
      "cell-furrow",
      "membrane",
      [
        {
          type: "path",
          d: "M -250 0 C -250 -150 -130 -200 0 -178 C 130 -200 250 -150 250 0 C 250 150 130 200 0 178 C -130 200 -250 150 -250 0 Z",
          fill: "rgba(231,111,81,0.05)",
          stroke: "#e76f51",
          strokeWidth: 4
        },
        { type: "path", d: "M -14 -178 Q 0 -150 14 -178", fill: "none", stroke: "#c15a3f", strokeWidth: 3 },
        { type: "path", d: "M -14 178 Q 0 150 14 178", fill: "none", stroke: "#c15a3f", strokeWidth: 3 }
      ],
      [
        { x: 400, y: 260, opacity: 0 },
        {},
        {},
        {},
        { opacity: 0.35 },
        { opacity: 1 },
        { opacity: 0 }
      ],
      { name: "细胞膜（缢裂）", organelleId: "cell-membrane", z: 2 }
    )
  );

  // 两个子细胞（胞质分裂后）
  for (const [id, cx] of [
    ["cell-daughter-l", -160],
    ["cell-daughter-r", 160]
  ] as const) {
    list.push(
      entity(
        id,
        "membrane",
        [{ type: "ellipse", cx: 0, cy: 0, rx: 152, ry: 120, fill: "rgba(231,111,81,0.05)", stroke: "#e76f51", strokeWidth: 4 }],
        [
          { x: 400 + cx, y: 260, opacity: 0 },
          {},
          {},
          {},
          {},
          { opacity: 0.35 },
          { opacity: 1 }
        ],
        { name: "子细胞膜", organelleId: "cell-membrane", z: 2 }
      )
    );
  }

  /* --- 核膜 / 核仁 / 染色质 --- */
  list.push(
    entity(
      "envelope-parent",
      "nucleus",
      [
        { type: "circle", cx: 0, cy: 0, r: 95, fill: "rgba(155,124,214,0.12)", stroke: "#9b7cd6", strokeWidth: 2.5 },
        { type: "circle", cx: 0, cy: 0, r: 95, fill: "none", stroke: "#b9a3e8", strokeWidth: 1.2, strokeDasharray: "6 5" }
      ],
      [
        { x: 330, y: 260, opacity: 1 },
        { opacity: 0.3 },
        { opacity: 0 },
        {},
        {},
        {},
        {}
      ],
      { name: "核膜", organelleId: "nucleus", z: 4 }
    )
  );
  list.push(
    entity(
      "nucleolus-parent",
      "nucleus",
      [dot(26, "#8e5ea2", { opacity: 0.9 })],
      [
        { x: 306, y: 238, opacity: 1 },
        { opacity: 0 },
        {},
        {},
        {},
        {},
        {}
      ],
      { name: "核仁", organelleId: "nucleus", z: 4 }
    )
  );
  list.push(
    entity(
      "chromatin-parent",
      "chromosome",
      chromatinBlob(),
      [
        { x: 330, y: 264, opacity: 1 },
        { opacity: 0.25 },
        { opacity: 0 },
        {},
        {},
        {},
        {}
      ],
      { name: "染色质", organelleId: "nucleus", z: 5 }
    )
  );

  for (const [prefix, cx] of [
    ["l", -125],
    ["r", 125]
  ] as const) {
    list.push(
      entity(
        `envelope-${prefix}`,
        "nucleus",
        [
          { type: "circle", cx: 0, cy: 0, r: 70, fill: "rgba(155,124,214,0.12)", stroke: "#9b7cd6", strokeWidth: 2.5 },
          { type: "circle", cx: 0, cy: 0, r: 70, fill: "none", stroke: "#b9a3e8", strokeWidth: 1.2, strokeDasharray: "6 5" }
        ],
        [
          { x: 400 + cx, y: 260, opacity: 0 },
          {},
          {},
          {},
          {},
          { opacity: 0.7 },
          { opacity: 1 }
        ],
        { name: "子细胞核膜", organelleId: "nucleus", z: 4 }
      )
    );
    list.push(
      entity(
        `nucleolus-${prefix}`,
        "nucleus",
        [dot(18, "#8e5ea2", { opacity: 0.9 })],
        [
          { x: 400 + cx - 17, y: 244, opacity: 0 },
          {},
          {},
          {},
          {},
          { opacity: 0.35 },
          { opacity: 1 }
        ],
        { name: "核仁", organelleId: "nucleus", z: 4 }
      )
    );
    list.push(
      entity(
        `chromatin-${prefix}`,
        "chromosome",
        chromatinBlob(),
        [
          { x: 400 + cx, y: 262, opacity: 0 },
          {},
          {},
          {},
          {},
          { opacity: 0.75 },
          { opacity: 1 }
        ],
        { name: "染色质", organelleId: "nucleus", z: 5 }
      )
    );
  }

  /* --- 纺锤丝（每条染色体对应两极各一条） --- */
  PLATE_DY.forEach((dy, i) => {
    const angle = (Math.atan2(dy, 150) * 180) / Math.PI;
    // 左极发出
    list.push(
      entity(
        `fiber-l-${i}`,
        "spindle",
        [{ type: "line", x1: 0, y1: 0, x2: 150, y2: dy, stroke: "#8fb6dd", strokeWidth: 1.8, strokeLinecap: "round", opacity: 0.9 }],
        [
          { x: 250, y: 260, scaleX: 0, opacity: 0, rotate: angle },
          { scaleX: 1, opacity: 0.5 },
          { opacity: 1 },
          {},
          { scaleX: 0.73, opacity: 0.65 },
          { scaleX: 0.17, opacity: 0.25 },
          { scaleX: 0, opacity: 0 }
        ],
        { name: "纺锤丝", organelleId: "centriole", z: 3 }
      )
    );
    // 右极发出（局部线段指向 -x，旋转 +angle 后到达位于左侧的染色体）
    list.push(
      entity(
        `fiber-r-${i}`,
        "spindle",
        [{ type: "line", x1: 0, y1: 0, x2: -150, y2: dy, stroke: "#8fb6dd", strokeWidth: 1.8, strokeLinecap: "round", opacity: 0.9 }],
        [
          { x: 550, y: 260, scaleX: 0, opacity: 0, rotate: angle },
          { scaleX: 1, opacity: 0.5 },
          { opacity: 1 },
          {},
          { scaleX: 0.73, opacity: 0.65 },
          { scaleX: 0.17, opacity: 0.25 },
          { scaleX: 0, opacity: 0 }
        ],
        { name: "纺锤丝", organelleId: "centriole", z: 3 }
      )
    );
  });

  /* --- X 形染色体：前期凝缩、中期列队、后期消失（换成染色单体） --- */
  const prophasePos: Array<[number, number, number]> = [
    [300, 232, -38],
    [360, 296, 24],
    [296, 282, 48],
    [344, 222, -16],
    [312, 312, 12],
    [372, 252, -46]
  ];
  PLATE_DY.forEach((dy, i) => {
    const [px, py, pr] = prophasePos[i];
    list.push(
      entity(
        `chrom-x-${i}`,
        "chromosome",
        xChromosome(),
        [
          { x: px, y: py, rotate: pr, opacity: 0 },
          { opacity: 1 },
          { x: 400, y: 260 + dy, rotate: 0 },
          {},
          { opacity: 0 },
          {},
          {}
        ],
        { name: "染色体（含两条姐妹染色单体）", organelleId: "nucleus", z: 6 }
      )
    );
  });

  /* --- 后期姐妹染色单体分离，移向两极，末期解旋 --- */
  PLATE_DY.forEach((dy, i) => {
    for (const [side, metaX, anaX, teloX, endX] of [
      ["l", 400, 360, 292, 275],
      ["r", 400, 440, 508, 525]
    ] as const) {
      list.push(
        entity(
          `chrom-rod-${side}-${i}`,
          "chromosome",
          rodChromosome(),
          [
            { x: metaX, y: 260 + dy, opacity: 0 },
            {},
            {},
            { opacity: 1, x: anaX },
            { x: teloX, opacity: 0.55 },
            { x: endX, opacity: 0 },
            {}
          ],
          { name: "染色体", organelleId: "nucleus", z: 6 }
        )
      );
    }
  });

  /* --- 中心体：间期一个，S 期复制；前期移向两极 --- */
  list.push(
    entity(
      "centrosome-l",
      "centriole",
      centrosome(),
      [
        { x: 398, y: 306, opacity: 1 },
        { x: 262, y: 300 },
        { x: 250, y: 260 },
        {},
        {},
        {},
        {}
      ],
      { name: "中心体", organelleId: "centriole", z: 7 }
    )
  );
  list.push(
    entity(
      "centrosome-r",
      "centriole",
      centrosome(),
      [
        { x: 398, y: 306, opacity: 0 },
        { x: 398, y: 214, opacity: 1 },
        { x: 550, y: 260 },
        {},
        {},
        {},
        {}
      ],
      { name: "中心体", organelleId: "centriole", z: 7 }
    )
  );

  /* --- 关键结构文字标注（按阶段显隐） --- */
  list.push(
    entity(
      "note-plate",
      "note",
      [text("赤道板", { fontSize: 13, fill: "#98f0c6" })],
      [{ x: 400, y: 178, opacity: 0 }, {}, { opacity: 1 }, {}, { opacity: 0 }, {}, {}],
      { z: 8 }
    )
  );
  list.push(
    entity(
      "note-furrow",
      "note",
      [text("细胞膜从中央缢裂", { fontSize: 12, fill: "#f0a08a" })],
      [{ x: 400, y: 420, opacity: 0 }, {}, {}, {}, { opacity: 0.3 }, { opacity: 1 }, { opacity: 0.6 }],
      { z: 8 }
    )
  );

  return list;
};

const mitosisSteps: ProcessStepSeed[] = [
  {
    title: "间期",
    event: "DNA 复制完成，每条染色体含两条姐妹染色单体",
    description:
      "分裂间期细胞完成物质准备：G1 期合成蛋白质、细胞长大；S 期进行 DNA 复制，核 DNA 含量由 2C 加倍到 4C，复制后的每条染色体都由两条完全相同的姐妹染色单体组成；G2 期继续合成蛋白质，中心体完成复制。此时核膜完整，遗传物质以松散的染色质状态存在。",
    highlights: ["S 期完成 DNA 复制，核 DNA 加倍（2C → 4C）", "染色体数目不变（着丝粒数不变），但每条含两条姐妹染色单体", "中心体复制，为形成纺锤体做准备"],
    organelleId: "nucleus",
    duration: 5
  },
  {
    title: "前期",
    event: "染色质高度螺旋化成为染色体，核膜与核仁逐渐消失",
    description:
      "进入有丝分裂前期，染色质螺旋缠绕、缩短变粗，在光学显微镜下成为可见的染色体，每条染色体由两条姐妹染色单体组成。两组中心体分别移向细胞两极，发出星射线形成纺锤体；核膜逐渐解体、核仁逐渐消失，染色体散入细胞质。",
    highlights: ["染色质 → 染色体（螺旋化、缩短变粗）", "核膜解体、核仁消失", "中心体发出星射线，纺锤体形成"],
    organelleId: "centriole",
    duration: 5
  },
  {
    title: "中期",
    event: "染色体的着丝粒整齐排列在赤道板上",
    description:
      "纺锤丝牵引染色体运动，使每条染色体的着丝粒排列在细胞中央的赤道板上。中期染色体形态稳定、数目清晰，是观察染色体形态和数目的最佳时期。每个着丝粒的两侧分别与来自两极的纺锤丝相连。",
    highlights: ["着丝粒排列在赤道板（细胞中央的假想平面）", "染色体形态稳定、数目最清晰，是显微观察的最佳时期", "着丝粒两侧纺锤丝分别连向两极"],
    organelleId: "centriole",
    duration: 4.5
  },
  {
    title: "后期",
    event: "着丝粒分裂，姐妹染色单体分开并移向两极",
    description:
      "着丝粒一分为二，姐妹染色单体分开，成为两条独立的子染色体，在纺锤丝的牵引下分别向细胞两极移动。细胞核中染色体的数目暂时加倍（4 → 8），细胞两极各获得一套形态和数目完全相同的染色体。",
    highlights: ["着丝粒分裂，姐妹染色单体分离", "染色体数目暂时加倍（2n → 4n）", "纺锤丝收缩牵引，两套染色体均分向两极"],
    organelleId: "nucleus",
    duration: 5
  },
  {
    title: "末期",
    event: "染色体解旋成染色质，核膜与核仁重新出现",
    description:
      "染色体到达两极后逐渐解螺旋，重新变为细长的染色质丝；纺锤体消失，两极周围重新出现核膜与核仁，形成两个新的细胞核。细胞中出现两套完全相同的遗传物质，核分裂完成，但细胞仍未完全分开。",
    highlights: ["染色体解旋为染色质", "核膜、核仁重新构建，形成两个子细胞核", "每个核的 DNA 含量恢复为 2C"],
    organelleId: "nucleus",
    duration: 5
  },
  {
    title: "胞质分裂",
    event: "细胞膜从中央向内缢裂，一个细胞分裂为两个子细胞",
    description:
      "动物细胞的细胞膜从赤道板位置向内凹陷，形成缢裂沟并逐渐加深，最终把细胞质一分为二，一个亲代细胞形成两个子代细胞。每个子细胞都获得与亲代相同的一套染色体，保证了亲子代细胞遗传性状的稳定性。",
    highlights: ["动物细胞靠细胞膜缢裂完成胞质分裂（植物细胞则形成细胞板）", "一个细胞 → 两个子细胞", "亲子代染色体数目和遗传物质相同，保持遗传稳定性"],
    organelleId: "cell-membrane",
    duration: 5
  }
];

const mitosisMetrics: ProcessMetricSeed[] = [
  { id: "cell-count", label: "细胞数", unit: "个", kind: "count", values: [1, 1, 1, 1, 1, 2] },
  { id: "dna", label: "每个细胞核 DNA", unit: "", kind: "text", values: ["4C", "4C", "4C", "4C", "4C", "2C"] },
  { id: "chrom-count", label: "每个细胞染色体", unit: "条", kind: "count", values: [4, 4, 4, 8, 8, 4] }
];

/* ============================================================
 * 过程二：蛋白质合成（转录 → 翻译 → 分泌）
 * ============================================================ */

const PROTEIN_FRAMES = 9; // 8 步 + 初始帧

const proteinEntities = (): ProcessEntitySeed[] => {
  PROCESS_FRAME_COUNT = PROTEIN_FRAMES;
  const list: ProcessEntitySeed[] = [];
  const F = PROTEIN_FRAMES;

  /* --- 区域标注 --- */
  list.push(
    entity("zone-nucleus", "note", [text("细胞核内", { fontSize: 12, fill: "#8fa39a" })], [
      { x: 250, y: 112, opacity: 0.75 }
    ]),
    entity("zone-cyto", "note", [text("细胞质", { fontSize: 12, fill: "#8fa39a" })], [
      { x: 486, y: 478, opacity: 0.75 }
    ]),
    entity("zone-out", "note", [text("细胞外", { fontSize: 12, fill: "#8fa39a" })], [
      { x: 752, y: 118, opacity: 0.75 }
    ])
  );

  /* --- 细胞核 --- */
  list.push(
    entity(
      "nucleus",
      "nucleus",
      [
        { type: "ellipse", cx: 0, cy: 0, rx: 150, ry: 120, fill: "rgba(155,124,214,0.1)", stroke: "#9b7cd6", strokeWidth: 2.5 },
        { type: "ellipse", cx: 0, cy: 0, rx: 150, ry: 120, fill: "none", stroke: "#b9a3e8", strokeWidth: 1, strokeDasharray: "7 6" }
      ],
      [{ x: 250, y: 260, opacity: 1 }],
      { name: "细胞核", organelleId: "nucleus", z: 2 }
    )
  );
  list.push(
    entity(
      "nucleolus",
      "nucleus",
      [dot(28, "#8e5ea2", { opacity: 0.85 })],
      [{ x: 198, y: 214, opacity: 1 }],
      { name: "核仁", organelleId: "nucleus", z: 3 }
    )
  );
  list.push(
    entity(
      "pore",
      "nucleus",
      [{ type: "ellipse", cx: 0, cy: 0, rx: 9, ry: 17, fill: "#0a1d18", stroke: "#b9a3e8", strokeWidth: 3 }],
      [{ x: 352, y: 260, opacity: 1 }],
      { name: "核孔", organelleId: "nucleus", z: 3 }
    )
  );

  /* --- DNA 双螺旋（示意波浪双链） --- */
  list.push(
    entity(
      "dna",
      "dna",
      [
        { type: "path", d: "M -96 -9 q 12 -11 24 0 t 24 0 t 24 0 t 24 0", fill: "none", stroke: "#b08bd8", strokeWidth: 3, strokeLinecap: "round" },
        { type: "path", d: "M -96 9 q 12 11 24 0 t 24 0 t 24 0 t 24 0", fill: "none", stroke: "#8d68c4", strokeWidth: 3, strokeLinecap: "round" },
        { type: "line", x1: -84, y1: -4, x2: -84, y2: 4, stroke: "#c9b3e8", strokeWidth: 2 },
        { type: "line", x1: -60, y1: -4, x2: -60, y2: 4, stroke: "#c9b3e8", strokeWidth: 2 },
        { type: "line", x1: -36, y1: -4, x2: -36, y2: 4, stroke: "#c9b3e8", strokeWidth: 2 },
        { type: "line", x1: -12, y1: -4, x2: -12, y2: 4, stroke: "#c9b3e8", strokeWidth: 2 }
      ],
      [{ x: 250, y: 248, opacity: 1 }],
      { name: "DNA（基因）", organelleId: "nucleus", z: 3 }
    )
  );

  /* --- RNA 聚合酶沿基因移动（转录在 f1→f2 进行） --- */
  list.push(
    entity(
      "rna-pol",
      "molecule",
      [dot(12, "#e0a458", { stroke: "#b9772e", strokeWidth: 2 }), text("酶", { fontSize: 9, fill: "#3a2408" })],
      [
        { x: 158, y: 239, opacity: 0.55 },
        { opacity: 1 },
        { x: 286, y: 239, opacity: 1 },
        { opacity: 0.35 },
        {},
        {},
        {},
        {},
        {}
      ],
      { name: "RNA 聚合酶", z: 4 }
    )
  );

  /* --- mRNA：沿折线逐段“延长”（dashOffset 由线长变 0），
        核内段 f1→f2 合成，核外段 f2→f3 输出到核糖体 --- */
  // 折线节点：基因右端 (288,240) → 核孔 (352,260) → 核糖体 (452,318)
  const mrnaPath: Array<[[number, number], [number, number]]> = [
    [[288, 240], [310, 245]],
    [[310, 245], [332, 254]],
    [[332, 254], [352, 260]],
    [[352, 260], [378, 275]],
    [[378, 275], [404, 292]],
    [[404, 292], [428, 307]],
    [[428, 307], [452, 318]]
  ];
  mrnaPath.forEach(([a, b], i) => {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dy);
    const inNucleus = i < 3;
    const frames: Array<Partial<ProcessKeyframe> | undefined> = Array.from({ length: F });
    frames[0] = { x: a[0], y: a[1], opacity: 0, dashOffset: len };
    if (inNucleus) frames[2] = { dashOffset: 0, opacity: 1 };
    else frames[3] = { dashOffset: 0, opacity: 1 };
    list.push(
      entity(
        `mrna-${i}`,
        "mrna",
        [
          {
            type: "line",
            x1: 0,
            y1: 0,
            x2: dx,
            y2: dy,
            stroke: "#b9a8ff",
            strokeWidth: 2.6,
            strokeLinecap: "round",
            strokeDasharray: len
          }
        ],
        frames,
        { name: i === 0 ? "信使 RNA（mRNA）" : undefined, z: 4 }
      )
    );
  });

  /* --- 粗面内质网（核糖体位于其膜旁，肽链向其腔内生长） --- */
  list.push(
    entity(
      "rough-er",
      "organelle",
      [
        { type: "path", d: "M -58 -2 q 24 -12 48 0 t 48 0", fill: "none", stroke: "#5a8dee", strokeWidth: 3, strokeLinecap: "round" },
        { type: "path", d: "M -62 14 q 24 -12 48 0 t 48 0", fill: "none", stroke: "#5a8dee", strokeWidth: 3, strokeLinecap: "round" },
        { type: "path", d: "M -54 30 q 22 -11 44 0 t 44 0", fill: "none", stroke: "#5a8dee", strokeWidth: 3, strokeLinecap: "round" }
      ],
      [{ x: 430, y: 392, opacity: 0.95 }],
      { name: "粗面内质网", organelleId: "rough-er", z: 2 }
    )
  );

  /* --- 核糖体（f3 结合 mRNA，f3→f5 翻译时高亮） --- */
  list.push(
    entity(
      "ribosome-ring",
      "ribosome",
      [dot(42, "none", { stroke: "#98f0c6", strokeWidth: 1.6 })],
      [{ x: 452, y: 318, opacity: 0 }, {}, {}, { opacity: 0.9 }, {}, {}, { opacity: 0.2 }, {}, {}],
      { z: 5 }
    )
  );
  list.push(
    entity(
      "ribosome",
      "ribosome",
      [
        { type: "ellipse", cx: 0, cy: 12, rx: 30, ry: 19, fill: "#6a4c93", stroke: "#4a3570", strokeWidth: 2 },
        { type: "ellipse", cx: 0, cy: -13, rx: 22, ry: 14, fill: "#7d5ba6", stroke: "#4a3570", strokeWidth: 2 }
      ],
      [{ x: 452, y: 318, opacity: 1 }],
      { name: "核糖体", organelleId: "ribosome", z: 5 }
    )
  );

  /* --- tRNA：f3→f4、f4→f5 之间依次进入，卸载后从左上方离开 --- */
  const trnaShape = (): ShapeSpec[] => [
    dot(8, "#7fb8f0", { stroke: "#4d86c0", strokeWidth: 1.6 }),
    roundRect(-2.5, 7, 5, 10, "#7fb8f0"),
    dot(3.4, "#e9c46a", { cy: -10, stroke: "#c9a34a", strokeWidth: 1 }) // 携带的氨基酸
  ];
  list.push(
    entity(
      "trna-1",
      "trna",
      trnaShape(),
      [
        { x: 560, y: 408, opacity: 0 },
        {},
        {},
        { x: 452, y: 288, opacity: 1 },
        { x: 420, y: 250, opacity: 0 },
        {},
        {},
        {},
        {}
      ],
      { name: "转运 RNA（tRNA）", z: 6 }
    )
  );
  list.push(
    entity(
      "trna-2",
      "trna",
      trnaShape(),
      [
        { x: 592, y: 414, opacity: 0 },
        {},
        {},
        { x: 494, y: 342, opacity: 0.45 },
        { x: 452, y: 288, opacity: 1 },
        { x: 420, y: 250, opacity: 0 },
        {},
        {},
        {}
      ],
      { name: "转运 RNA（tRNA）", z: 6 }
    )
  );
  list.push(
    entity(
      "trna-3",
      "trna",
      trnaShape(),
      [
        { x: 624, y: 406, opacity: 0 },
        {},
        {},
        {},
        { x: 494, y: 342, opacity: 0.45 },
        { x: 452, y: 288, opacity: 1 },
        { x: 420, y: 250, opacity: 0 },
        {},
        {}
      ],
      { name: "转运 RNA（tRNA）", z: 6 }
    )
  );

  /* --- 氨基酸：在核糖体下方逐个连接成肽链，随后进入囊泡 → 高尔基体 → 胞吐 --- */
  // 肽链生长点（核糖体下方、靠近内质网）与后续路径
  const aaFramesFor = (index: number): Array<Partial<ProcessKeyframe> | undefined> => {
    const frames: Array<Partial<ProcessKeyframe> | undefined> = Array.from({ length: F });
    const grow: Array<[number, number]> = [
      [448, 346],
      [462, 350],
      [454, 337]
    ];
    frames[0] = { x: 470 + index * 20, y: 300, opacity: 0 };
    const arriveFrame = 3 + index; // f3 / f4 / f5 依次到位
    frames[arriveFrame] = { x: grow[index][0], y: grow[index][1], opacity: 1 };
    if (arriveFrame < 4) frames[4] = { x: grow[index][0], y: grow[index][1] };
    // f5：进入内质网出芽囊泡
    frames[5] = { x: 508, y: 368, opacity: 1 };
    // f6：到达高尔基体
    frames[6] = { x: 576, y: 268, opacity: 0.95 };
    // f7：随分泌囊泡到达细胞膜内侧
    frames[7] = { x: 684, y: 214, opacity: 1 };
    // f8：释放到细胞外（三个氨基酸组成折叠蛋白簇）
    const out: Array<[number, number]> = [
      [720, 214],
      [736, 214],
      [728, 199]
    ];
    frames[8] = { x: out[index][0], y: out[index][1], opacity: 1 };
    return frames;
  };
  for (let i = 0; i < 3; i++) {
    list.push(
      entity(`aa-${i}`, "protein", [dot(7, "#e9c46a", { stroke: "#c9a34a", strokeWidth: 1.4 })], aaFramesFor(i), {
        name: "氨基酸 / 肽链",
        z: 7
      })
    );
  }

  /* --- 高尔基体（f5→f6 加工时高亮） --- */
  list.push(
    entity(
      "golgi",
      "organelle",
      [-22, -6, 10, 26].map((y) => ({
        type: "path" as const,
        d: `M -34 ${y} Q 0 ${y - 12} 34 ${y}`,
        fill: "none",
        stroke: "#dda15e",
        strokeWidth: 4,
        strokeLinecap: "round"
      })),
      [{ x: 576, y: 260, opacity: 1 }],
      { name: "高尔基体", organelleId: "golgi", z: 2 }
    )
  );
  list.push(
    entity(
      "golgi-ring",
      "organelle",
      [dot(50, "none", { stroke: "#f0c977", strokeWidth: 1.6 })],
      [{ x: 576, y: 260, opacity: 0 }, {}, {}, {}, {}, { opacity: 0.3 }, { opacity: 1 }, { opacity: 0.3 }, { opacity: 0 }],
      { organelleId: "golgi", z: 4 }
    )
  );

  /* --- 囊泡 1：f4→f6 内质网出芽 → 高尔基体 --- */
  list.push(
    entity(
      "vesicle-1",
      "vesicle",
      [dot(15, "rgba(233,196,106,0.22)", { stroke: "#dda15e", strokeWidth: 2 })],
      [
        { x: 508, y: 368, opacity: 0 },
        {},
        {},
        {},
        { opacity: 0.45 },
        { opacity: 1 },
        { x: 576, y: 268, opacity: 0.25 },
        { opacity: 0 },
        {}
      ],
      { name: "囊泡（内质网 → 高尔基体）", organelleId: "golgi", z: 6 }
    )
  );

  /* --- 囊泡 2：f6→f7 高尔基体出芽 → 细胞膜（胞吐） --- */
  list.push(
    entity(
      "vesicle-2",
      "vesicle",
      [dot(15, "rgba(233,196,106,0.22)", { stroke: "#dda15e", strokeWidth: 2 })],
      [
        { x: 600, y: 246, opacity: 0 },
        {},
        {},
        {},
        {},
        {},
        { opacity: 0.55 },
        { x: 684, y: 214, opacity: 0.2 },
        { opacity: 0 }
      ],
      { name: "分泌囊泡（高尔基体 → 细胞膜）", organelleId: "golgi", z: 6 }
    )
  );

  /* --- 细胞膜（右侧边界，胞吐发生处） --- */
  const membraneHeads: ShapeSpec[] = [];
  for (let y = 122; y <= 402; y += 26) {
    membraneHeads.push(dot(3.2, "#e76f51", { cx: 696, cy: y }));
    membraneHeads.push(dot(3.2, "#e76f51", { cx: 708, cy: y }));
  }
  list.push(
    entity(
      "membrane",
      "membrane",
      [
        { type: "line", x1: 696, y1: 118, x2: 696, y2: 406, stroke: "#e76f51", strokeWidth: 2.6 },
        { type: "line", x1: 708, y1: 118, x2: 708, y2: 406, stroke: "#e76f51", strokeWidth: 2.6 },
        ...membraneHeads
      ],
      [{ x: 0, y: 0, opacity: 1 }],
      { name: "细胞膜", organelleId: "cell-membrane", z: 2 }
    )
  );

  return list;
};

const proteinSteps: ProcessStepSeed[] = [
  {
    title: "基因激活",
    event: "细胞核中特定基因的双链解开，暴露碱基序列",
    description:
      "蛋白质合成从基因被激活开始：在细胞核内，DNA 上编码该蛋白质的基因片段双链解开，碱基序列暴露出来，为转录做好准备。基因中脱氧核苷酸（碱基）的排列顺序，决定了将要合成的蛋白质中氨基酸的排列顺序。",
    highlights: ["基因是有遗传效应的 DNA 片段", "碱基排列顺序储存遗传信息", "真核细胞的转录发生在细胞核内"],
    organelleId: "nucleus",
    duration: 4
  },
  {
    title: "转录",
    event: "RNA 聚合酶以 DNA 一条链为模板合成 mRNA",
    description:
      "RNA 聚合酶结合到基因上，以 DNA 的一条链为模板，按照碱基互补配对原则（A—U、T—A、G—C、C—G）合成信使 RNA（mRNA）。遗传信息从 DNA 传递到 mRNA，这一过程称为转录。转录完成后，DNA 恢复双螺旋结构。",
    highlights: ["模板：DNA 的一条链；产物：mRNA", "配对原则：A—U、T—A、G—C、C—G", "RNA 聚合酶催化核糖核苷酸连接"],
    organelleId: "nucleus",
    duration: 5
  },
  {
    title: "核孔输出",
    event: "mRNA 通过核孔从细胞核进入细胞质",
    description:
      "真核细胞中转录形成的前体 mRNA 经过加工（剪接、加帽、加尾）成为成熟 mRNA，穿过核膜上的核孔进入细胞质。核孔是核质之间物质交换和信息交流的选择性通道——DNA 不能出核，而 RNA 和蛋白质可以定向通过。",
    highlights: ["核孔是核质之间物质交换的选择性通道", "DNA 留在核内，mRNA 进入细胞质", "原核细胞无核膜，转录与翻译可同时进行"],
    organelleId: "nucleus",
    duration: 4
  },
  {
    title: "翻译起始",
    event: "mRNA 与核糖体结合，起始 tRNA 携氨基酸就位",
    description:
      "mRNA 进入细胞质后与核糖体结合。核糖体是翻译的场所：它沿 mRNA 移动，每三个相邻碱基构成一个密码子。起始密码子对应甲硫氨酸，携带相应氨基酸的 tRNA 通过反密码子与密码子互补配对，翻译正式开始。",
    highlights: ["mRNA 上三个相邻碱基 = 一个密码子，决定一个氨基酸", "tRNA 的反密码子与密码子互补配对", "tRNA 是氨基酸的“搬运工”"],
    organelleId: "ribosome",
    duration: 4.5
  },
  {
    title: "延伸与终止",
    event: "核糖体读取密码子，氨基酸脱水缩合形成多肽链",
    description:
      "核糖体沿 mRNA 从 5' 端向 3' 端移动，tRNA 依次搬运来对应氨基酸，氨基酸之间通过脱水缩合形成肽键，多肽链不断延长；读取到终止密码子时翻译停止，多肽链被释放。一个 mRNA 上可相继结合多个核糖体，同时合成多条相同肽链。",
    highlights: ["肽键由脱水缩合形成", "密码子共有 64 种，对应 20 种氨基酸", "一条 mRNA 可被多个核糖体同时翻译"],
    organelleId: "ribosome",
    duration: 5
  },
  {
    title: "内质网加工",
    event: "多肽链进入粗面内质网折叠、加工并出芽形成囊泡",
    description:
      "分泌蛋白在附着于粗面内质网的核糖体上合成，新生肽链边合成边进入内质网腔，在内质网中折叠成一定的空间结构，并进行糖基化等初步加工。加工后的蛋白质被包裹在由内质网膜出芽形成的囊泡中，运往高尔基体。",
    highlights: ["分泌蛋白在粗面内质网的附着核糖体上合成", "内质网中完成折叠与糖基化", "囊泡运输：膜的融合与出芽"],
    organelleId: "rough-er",
    duration: 4.5
  },
  {
    title: "高尔基体分拣",
    event: "高尔基体对蛋白质进一步加工、分类与包装",
    description:
      "来自内质网的囊泡与高尔基体融合，蛋白质在高尔基体中被进一步加工、修饰和分类，如同细胞的“邮局”按目的地贴上标签：有的包装成溶酶体中的酶，有的送到细胞膜，有的包装成分泌囊泡准备分泌到细胞外。",
    highlights: ["高尔基体是细胞内物质运输的“分拣中心”", "溶酶体由高尔基体出芽形成", "植物细胞的高尔基体还参与细胞壁形成"],
    organelleId: "golgi",
    duration: 4.5
  },
  {
    title: "胞吐分泌",
    event: "分泌囊泡与细胞膜融合，蛋白质释放到细胞外",
    description:
      "分泌囊泡移动到细胞膜内侧，囊泡膜与细胞膜融合，将蛋白质释放到细胞外，这一过程称为胞吐，需要消耗能量。抗体、消化酶、胰岛素等分泌蛋白都沿“核糖体 → 粗面内质网 → 高尔基体 → 细胞膜”的路线合成与分泌。",
    highlights: ["胞吐依赖膜的流动性，需要消耗 ATP", "分泌路线：核糖体 → 内质网 → 高尔基体 → 细胞膜", "实例：抗体、消化酶、蛋白质类激素"],
    organelleId: "cell-membrane",
    duration: 5
  }
];

const proteinMetrics: ProcessMetricSeed[] = [
  { id: "mrna", label: "mRNA 合成", unit: "%", kind: "percent", values: [0, 100, 100, 100, 100, 100, 100, 100] },
  { id: "aa", label: "多肽氨基酸", unit: "个", kind: "count", values: [0, 0, 0, 1, 3, 3, 3, 3] },
  { id: "transport", label: "分泌运输", unit: "%", kind: "percent", values: [0, 0, 0, 0, 35, 70, 100, 100] }
];

/* ============================================================
 * 过程三：物质跨膜运输
 * ============================================================ */

const TRANSPORT_FRAMES = 8; // 7 步 + 初始帧

const o2Text = (): ShapeSpec[] => [dot(9, "#7fd8f5", { stroke: "#3fa3c9", strokeWidth: 1.6 }), text("O₂", { fontSize: 8.5, fill: "#06303c" })];
const naShape = (): ShapeSpec[] => [dot(9, "#f6c177", { stroke: "#d98c2a", strokeWidth: 1.6 }), text("Na⁺", { fontSize: 7.5, fill: "#4a2c06" })];
const kShape = (): ShapeSpec[] => [dot(9, "#9ad17a", { stroke: "#5e9440", strokeWidth: 1.6 }), text("K⁺", { fontSize: 8, fill: "#1e3a10" })];
const glucoseShape = (): ShapeSpec[] => [
  { type: "polygon", points: polygonPoints(11), fill: "#ffd166", stroke: "#d9a82a", strokeWidth: 1.6 },
  text("糖", { fontSize: 8.5, fill: "#5c4208" })
];
const atpShape = (label: string): ShapeSpec[] => [
  roundRect(-19, -11, 38, 22, "#f2c063", { stroke: "#b9831f", strokeWidth: 1.5 }),
  text(label, { fontSize: 9.5, fill: "#4a3008" })
];

const transportEntities = (): ProcessEntitySeed[] => {
  PROCESS_FRAME_COUNT = TRANSPORT_FRAMES;
  const list: ProcessEntitySeed[] = [];

  /* --- 区域底色与标注 --- */
  list.push(
    entity("zone-out-bg", "zone", [{ type: "rect", x: -400, y: -260, width: 800, height: 250, fill: "rgba(127,184,240,0.05)" }], [
      { x: 400, y: 260, opacity: 1 }
    ]),
    entity("zone-in-bg", "zone", [{ type: "rect", x: -400, y: 10, width: 800, height: 250, fill: "rgba(152,240,198,0.04)" }], [
      { x: 400, y: 260, opacity: 1 }
    ]),
    entity("zone-out-label", "note", [text("细胞外 · 组织液", { fontSize: 12, fill: "#8fb6dd" })], [
      { x: 92, y: 56, opacity: 0.85 }
    ]),
    entity("zone-in-label", "note", [text("细胞内 · 细胞质基质", { fontSize: 12, fill: "#7bbf95" })], [
      { x: 102, y: 474, opacity: 0.85 }
    ])
  );

  /* --- 磷脂双分子层 --- */
  const heads: ShapeSpec[] = [];
  for (let x = 52; x <= 748; x += 26) {
    heads.push(dot(3.4, "#e76f51", { cx: x, cy: 250 }));
    heads.push(dot(3.4, "#e76f51", { cx: x, cy: 270 }));
  }
  list.push(
    entity(
      "membrane",
      "membrane",
      [
        { type: "line", x1: 40, y1: 250, x2: 760, y2: 250, stroke: "#c15a3f", strokeWidth: 2.4 },
        { type: "line", x1: 40, y1: 270, x2: 760, y2: 270, stroke: "#c15a3f", strokeWidth: 2.4 },
        ...heads
      ],
      [{ x: 0, y: 0, opacity: 1 }],
      { name: "磷脂双分子层", organelleId: "cell-membrane", z: 2 }
    )
  );

  /* --- 通道蛋白（Na⁺ 通道，x=210） --- */
  list.push(
    entity(
      "channel",
      "channel",
      [
        roundRect(-26, -82, 15, 60, "#7fb8f0", { stroke: "#4d86c0", strokeWidth: 1.6 }),
        roundRect(11, -82, 15, 60, "#7fb8f0", { stroke: "#4d86c0", strokeWidth: 1.6 }),
        roundRect(-26, 22, 15, 60, "#7fb8f0", { stroke: "#4d86c0", strokeWidth: 1.6 }),
        roundRect(11, 22, 15, 60, "#7fb8f0", { stroke: "#4d86c0", strokeWidth: 1.6 })
      ],
      [{ x: 210, y: 260, opacity: 1 }],
      { name: "通道蛋白", organelleId: "cell-membrane", label: { dx: 0, dy: 108 }, z: 3 }
    )
  );
  list.push(
    entity(
      "channel-label",
      "note",
      [text("通道蛋白", { fontSize: 11, fill: "#9fc9e8" })],
      [{ x: 210, y: 368, opacity: 1 }]
    )
  );

  /* --- 载体蛋白（葡萄糖，x=380）：向外开 / 向内开两种构象交替 --- */
  list.push(
    entity(
      "carrier-a",
      "carrier",
      [
        roundRect(-24, -74, 15, 56, "#c9a0f0", { stroke: "#8e62c8", strokeWidth: 1.6 }),
        roundRect(9, -74, 15, 56, "#c9a0f0", { stroke: "#8e62c8", strokeWidth: 1.6 }),
        roundRect(-24, -18, 48, 14, "#c9a0f0", { stroke: "#8e62c8", strokeWidth: 1.6 })
      ],
      [{ x: 380, y: 260, opacity: 1 }, {}, {}, { opacity: 0.15 }, { opacity: 1 }, {}, {}, {}],
      { name: "载体蛋白（向外开放）", organelleId: "cell-membrane", z: 3 }
    )
  );
  list.push(
    entity(
      "carrier-b",
      "carrier",
      [
        roundRect(-24, 4, 48, 14, "#a879dd", { stroke: "#8e62c8", strokeWidth: 1.6 }),
        roundRect(-24, 4, 15, 56, "#a879dd", { stroke: "#8e62c8", strokeWidth: 1.6 }),
        roundRect(9, 4, 15, 56, "#a879dd", { stroke: "#8e62c8", strokeWidth: 1.6 })
      ],
      [{ x: 380, y: 260, opacity: 0 }, {}, {}, { opacity: 1 }, { opacity: 0.25 }, { opacity: 0 }, {}, {}],
      { name: "载体蛋白（向内开放）", organelleId: "cell-membrane", z: 3 }
    )
  );
  list.push(
    entity("carrier-label", "note", [text("载体蛋白", { fontSize: 11, fill: "#cbb2ee" })], [
      { x: 380, y: 368, opacity: 1 }
    ])
  );

  /* --- Na⁺/K⁺ 泵（x=560）：两种构象 --- */
  list.push(
    entity(
      "pump-a",
      "pump",
      [roundRect(-30, -34, 60, 68, "#f2b366", { stroke: "#c97e2c", strokeWidth: 2 })],
      [{ x: 560, y: 260, opacity: 1 }, {}, {}, {}, { opacity: 0.15 }, { opacity: 0 }, { opacity: 1 }, {}],
      { name: "Na⁺/K⁺ 泵（向内开放）", organelleId: "cell-membrane", z: 3 }
    )
  );
  list.push(
    entity(
      "pump-b",
      "pump",
      [roundRect(-30, -34, 60, 68, "#8fd6a8", { stroke: "#3e8f63", strokeWidth: 2 })],
      [{ x: 560, y: 260, opacity: 0 }, {}, {}, {}, { opacity: 1 }, {}, { opacity: 0 }, {}],
      { name: "Na⁺/K⁺ 泵（向外开放）", organelleId: "cell-membrane", z: 3 }
    )
  );
  list.push(
    entity("pump-label", "note", [text("Na⁺/K⁺ 泵 · ATP 酶", { fontSize: 11, fill: "#f0c987" })], [
      { x: 560, y: 368, opacity: 1 }
    ])
  );

  /* --- 运输方式标注 --- */
  list.push(
    entity("label-diffusion", "note", [text("自由扩散", { fontSize: 11, fill: "#7fd8f5" })], [
      { x: 92, y: 214, opacity: 0.9 }
    ])
  );

  /* --- O₂：自由扩散（3 个，错峰穿过） --- */
  const o2Tracks: Array<Array<Partial<ProcessKeyframe>>> = [
    [{ x: 64, y: 120, opacity: 0.9 }, { x: 96, y: 244 }, { x: 92, y: 360 }, { x: 92, y: 398 }],
    [{ x: 120, y: 96, opacity: 1 }, { x: 140, y: 172 }, { x: 122, y: 316 }, { x: 106, y: 388 }],
    [{ x: 170, y: 140, opacity: 0.85 }, { x: 128, y: 222 }, { x: 146, y: 296 }, { x: 116, y: 372 }]
  ];
  o2Tracks.forEach((frames, i) => {
    list.push(
      entity(`o2-${i}`, "molecule", o2Text(), Array.from({ length: TRANSPORT_FRAMES }, (_, f) => frames[Math.min(f, frames.length - 1)]), {
        name: "氧气分子",
        z: 5
      })
    );
  });

  /* --- Na⁺ 经通道蛋白内流（3 个，第 3 步） --- */
  const channelNa: Array<[number, number]> = [
    [182, 150],
    [210, 108],
    [238, 150]
  ];
  channelNa.forEach(([x, y], i) => {
    list.push(
      entity(
        `na-channel-${i}`,
        "molecule",
        naShape(),
        [
          { x, y, opacity: 0.9 },
          {},
          {},
          { x: x + (x < 210 ? -6 : 6), y: 330 + (i - 1) * 22 },
          {},
          {},
          {},
          {}
        ],
        { name: "钠离子（Na⁺）", z: 5 }
      )
    );
  });

  /* --- 葡萄糖经载体蛋白（2 个，第 4 步构象变化） --- */
  list.push(
    entity(
      "glucose-1",
      "molecule",
      glucoseShape(),
      [
        { x: 350, y: 120, opacity: 0.9 },
        {},
        {},
        { x: 380, y: 190, opacity: 1 },
        { x: 372, y: 330 },
        { x: 356, y: 400 },
        {},
        {}
      ],
      { name: "葡萄糖分子", z: 5 }
    )
  );
  list.push(
    entity(
      "glucose-2",
      "molecule",
      glucoseShape(),
      [
        { x: 420, y: 92, opacity: 0.85 },
        {},
        {},
        { x: 400, y: 168, opacity: 0.55 },
        { x: 402, y: 310 },
        { x: 422, y: 380 },
        {},
        {}
      ],
      { name: "葡萄糖分子", z: 5 }
    )
  );

  /* --- Na⁺ 被泵外排（3 个，第 5 步） --- */
  const pumpNaStart: Array<[number, number]> = [
    [528, 396],
    [560, 418],
    [592, 396]
  ];
  pumpNaStart.forEach(([x, y], i) => {
    list.push(
      entity(
        `na-pump-${i}`,
        "molecule",
        naShape(),
        [
          { x, y, opacity: 0.95 },
          {},
          {},
          { x: 540 + i * 20, y: 330 },
          { x: 548 + i * 12, y: 296 },
          { x: 540 + i * 20, y: 150 - (i === 1 ? 26 : 0) },
          {},
          {}
        ],
        { name: "钠离子（主动运输）", z: 5 }
      )
    );
  });

  /* --- K⁺ 被泵入（2 个，第 6 步） --- */
  list.push(
    entity(
      "k-1",
      "molecule",
      kShape(),
      [
        { x: 532, y: 150, opacity: 0.9 },
        {},
        {},
        {},
        {},
        { x: 548, y: 180 },
        { x: 540, y: 396 },
        {}
      ],
      { name: "钾离子（K⁺）", z: 5 }
    )
  );
  list.push(
    entity(
      "k-2",
      "molecule",
      kShape(),
      [
        { x: 588, y: 150, opacity: 0.9 },
        {},
        {},
        {},
        {},
        { x: 572, y: 180 },
        { x: 580, y: 396 },
        {}
      ],
      { name: "钾离子（K⁺）", z: 5 }
    )
  );

  /* --- ATP → ADP（第 5 步水解供能） --- */
  list.push(
    entity(
      "atp",
      "energy",
      atpShape("ATP"),
      [
        { x: 628, y: 420, opacity: 1 },
        {},
        {},
        {},
        {},
        { x: 606, y: 250, opacity: 0 },
        { opacity: 0 },
        {}
      ],
      { name: "ATP（三磷酸腺苷）", z: 5 }
    )
  );
  list.push(
    entity(
      "adp",
      "energy",
      atpShape("ADP"),
      [
        { x: 628, y: 420, opacity: 0 },
        {},
        {},
        {},
        {},
        { x: 628, y: 318, opacity: 0.85 },
        { x: 640, y: 402, opacity: 0.6 },
        {}
      ],
      { name: "ADP + Pi", z: 5 }
    )
  );

  /* --- 总结阶段：浓度梯度方向箭头与说明 --- */
  const arrow = (x: number, y1: number, y2: number, color: string, up = false): ShapeSpec[] => [
    { type: "line", x1: x, y1, x2: x, y2, stroke: color, strokeWidth: 2.4, strokeLinecap: "round" },
    {
      type: "polygon",
      points: up ? `${x - 6},${y1 + 9} ${x + 6},${y1 + 9} ${x},${y1 - 2}` : `${x - 6},${y2 - 9} ${x + 6},${y2 - 9} ${x},${y2 + 2}`,
      fill: color
    }
  ];
  list.push(
    entity("arrow-channel", "note", arrow(262, 120, 214, "#7fb8f0"), [
      { x: 0, y: 0, opacity: 0 },
      {},
      {},
      {},
      {},
      {},
      {},
      { opacity: 0.9 }
    ]),
    entity("arrow-carrier", "note", arrow(432, 120, 214, "#c9a0f0"), [
      { x: 0, y: 0, opacity: 0 },
      {},
      {},
      {},
      {},
      {},
      {},
      { opacity: 0.9 }
    ]),
    entity("arrow-pump", "note", arrow(620, 396, 296, "#f2c063", true), [
      { x: 0, y: 0, opacity: 0 },
      {},
      {},
      {},
      {},
      {},
      {},
      { opacity: 0.95 }
    ]),
    entity(
      "note-gradient",
      "note",
      [text("顺浓度梯度 · 不消耗能量", { fontSize: 10.5, fill: "#9fc9e8", textAnchor: "start" })],
      [{ x: 250, y: 92, opacity: 0 }, {}, {}, {}, {}, {}, {}, { opacity: 1 }]
    ),
    entity(
      "note-active",
      "note",
      [text("逆浓度梯度 · 消耗 ATP", { fontSize: 10.5, fill: "#f0c987", textAnchor: "start" })],
      [{ x: 636, y: 300, opacity: 0 }, {}, {}, {}, {}, {}, {}, { opacity: 1 }]
    )
  );

  return list;
};

const transportSteps: ProcessStepSeed[] = [
  {
    title: "膜的选择透过性",
    event: "磷脂双分子层与膜蛋白把细胞内外分隔，控制物质进出",
    description:
      "细胞膜由磷脂双分子层和镶嵌其中的蛋白质构成，具有选择透过性：水分子和 O₂、CO₂、甘油等小分子可以自由穿过磷脂间隙；离子和较大的极性分子（如葡萄糖、Na⁺、K⁺）难以直接通过磷脂层，需要借助通道蛋白或载体蛋白运输。",
    highlights: ["基本支架：磷脂双分子层（具有流动性）", "膜蛋白承担运输、识别、催化等功能", "选择透过性是活细胞膜的重要特征"],
    organelleId: "cell-membrane",
    duration: 4.5
  },
  {
    title: "自由扩散 · O₂",
    event: "O₂ 顺浓度梯度直接穿过磷脂双分子层",
    description:
      "细胞呼吸不断消耗 O₂，使细胞内 O₂ 浓度低于细胞外。O₂ 是小分子非极性物质，可直接溶解并穿过磷脂双分子层，从高浓度一侧向低浓度一侧运动，不需要载体蛋白，也不消耗能量，这种方式称为自由扩散。CO₂、甘油、乙醇和少量水也以这种方式进出细胞。",
    highlights: ["方向：高浓度 → 低浓度（顺浓度梯度）", "不需要载体蛋白，不消耗 ATP", "实例：O₂、CO₂、甘油、乙醇"],
    organelleId: "cell-membrane",
    duration: 5
  },
  {
    title: "协助扩散 · 离子通道",
    event: "Na⁺ 经通道蛋白顺浓度梯度快速进入细胞",
    description:
      "细胞外 Na⁺ 浓度远高于细胞内。通道蛋白在膜上形成亲水的孔道，特定离子可以顺浓度梯度快速通过，如同为离子打开的“闸门”。这种需要通道蛋白协助、但不消耗能量的运输称为协助扩散（易化扩散）。神经细胞产生兴奋时，Na⁺ 通道大量开放形成动作电位。",
    highlights: ["需要通道蛋白，形成亲水孔道", "顺浓度梯度，不消耗能量", "实例：神经细胞膜上的 Na⁺ 通道"],
    organelleId: "cell-membrane",
    duration: 5
  },
  {
    title: "协助扩散 · 载体蛋白",
    event: "葡萄糖与载体蛋白结合，载体构象改变将其转运入细胞",
    description:
      "葡萄糖是较大的极性分子，需要与载体蛋白上的结合位点结合；载体蛋白通过自身构象的改变，把葡萄糖从高浓度一侧转运到低浓度一侧。转运完成后载体恢复原状，可反复使用。红细胞吸收葡萄糖就是典型的载体蛋白协助扩散。",
    highlights: ["物质与载体蛋白结合位点特异性结合", "靠构象改变完成转运，可反复使用", "仍然顺浓度梯度、不消耗能量"],
    organelleId: "cell-membrane",
    duration: 5
  },
  {
    title: "主动运输 · Na⁺ 外排",
    event: "Na⁺/K⁺ 泵水解 ATP，把 Na⁺ 逆浓度梯度运出细胞",
    description:
      "细胞内 Na⁺ 浓度低于细胞外，把 Na⁺ 运出细胞是逆浓度梯度的。Na⁺/K⁺ 泵是一种 ATP 酶，它水解 ATP 获取能量，同时发生构象变化，每消耗 1 个 ATP 将 3 个 Na⁺ 泵出细胞。主动运输保证细胞能够按生命活动需要选择性吸收和排出物质。",
    highlights: ["逆浓度梯度运输，需要消耗 ATP", "Na⁺/K⁺ 泵每消耗 1 个 ATP 泵出 3 个 Na⁺", "载体蛋白具有 ATP 酶活性"],
    organelleId: "cell-membrane",
    duration: 5.5
  },
  {
    title: "主动运输 · K⁺ 泵入",
    event: "同一泵蛋白再把 2 个 K⁺ 逆浓度梯度运入细胞",
    description:
      "排出 Na⁺ 后，泵的构象再次改变，结合细胞外的 K⁺ 并将 2 个 K⁺ 运入细胞。细胞外 K⁺ 浓度低于细胞内，因此 K⁺ 的摄入同样是逆浓度梯度的主动运输。持续运转的 Na⁺/K⁺ 泵维持了膜两侧 Na⁺、K⁺ 的不均匀分布，这是神经冲动传导和细胞渗透压调节的基础。",
    highlights: ["每消耗 1 个 ATP：运出 3 Na⁺、运入 2 K⁺", "维持细胞膜两侧的离子浓度差", "为神经传导、渗透调节提供基础"],
    organelleId: "cell-membrane",
    duration: 5
  },
  {
    title: "三种方式对比",
    event: "自由扩散、协助扩散为被动运输；主动运输耗能但可逆浓度梯度",
    description:
      "自由扩散和协助扩散都是物质顺浓度梯度进行的跨膜运输，统称为被动运输，不需要消耗能量；主动运输则逆浓度梯度进行，需要载体蛋白和 ATP，能保证活细胞按需要吸收或排出物质。此外，大分子物质还通过胞吞、胞吐进出细胞，依赖膜的流动性，同样消耗能量。",
    highlights: ["被动运输：顺浓度梯度、不耗能（自由扩散 / 协助扩散）", "主动运输：逆浓度梯度、需载体、消耗 ATP", "胞吞胞吐：运输大分子，依赖膜的流动性"],
    organelleId: "cell-membrane",
    duration: 5
  }
];

const transportMetrics: ProcessMetricSeed[] = [
  { id: "o2-in", label: "O₂ 进入", unit: "个", kind: "count", values: [3, 3, 3, 3, 3, 3, 3] },
  { id: "na-in", label: "Na⁺ 进入（通道）", unit: "个", kind: "count", values: [0, 0, 3, 3, 3, 3, 3] },
  { id: "glucose-in", label: "葡萄糖进入", unit: "个", kind: "count", values: [0, 0, 0, 2, 2, 2, 2] },
  { id: "na-out", label: "Na⁺ 排出（泵）", unit: "个", kind: "count", values: [0, 0, 0, 0, 3, 3, 3] },
  { id: "na-ext", label: "胞外 Na⁺", unit: "个", kind: "count", values: [5, 5, 2, 2, 5, 5, 5] },
  { id: "k-ext", label: "胞外 K⁺", unit: "个", kind: "count", values: [4, 4, 4, 4, 4, 2, 2] },
  { id: "atp-used", label: "ATP 消耗", unit: "个", kind: "count", values: [0, 0, 0, 0, 1, 1, 1] }
];

/* ============================================================ */

export const processSeeds: ProcessSeed[] = [
  {
    id: "mitosis",
    name: "细胞分裂",
    englishName: "Mitosis",
    icon: "cell-division",
    summary: "观察一个动物细胞完成一次有丝分裂：间期复制 → 前期凝缩 → 中期列队 → 后期分离 → 末期重建 → 胞质分裂，遗传物质精确均分。",
    cellIds: ["animal"],
    position: 1,
    initialMetrics: [1, "2C", 4],
    sceneViewBox: { x: 0, y: 0, w: 800, h: 520 },
    metrics: mitosisMetrics,
    entities: mitosisEntities(),
    steps: mitosisSteps
  },
  {
    id: "protein-synthesis",
    name: "蛋白质合成",
    englishName: "Protein Synthesis & Secretion",
    icon: "protein",
    summary: "从细胞核里的基因出发：转录出 mRNA → 穿过核孔 → 核糖体翻译出多肽 → 内质网与高尔基体加工分拣 → 囊泡胞吐分泌。",
    cellIds: ["animal"],
    position: 2,
    initialMetrics: [0, 0, 0],
    sceneViewBox: { x: 0, y: 0, w: 800, h: 520 },
    metrics: proteinMetrics,
    entities: proteinEntities(),
    steps: proteinSteps
  },
  {
    id: "membrane-transport",
    name: "物质跨膜运输",
    englishName: "Membrane Transport",
    icon: "transport",
    summary: "同一块细胞膜上同时发生三种运输：O₂ 自由扩散、Na⁺ 与葡萄糖经通道 / 载体协助扩散、Na⁺/K⁺ 泵水解 ATP 进行主动运输。",
    cellIds: ["animal"],
    position: 3,
    initialMetrics: [0, 0, 0, 0, 5, 4, 0],
    sceneViewBox: { x: 0, y: 0, w: 800, h: 520 },
    metrics: transportMetrics,
    entities: transportEntities(),
    steps: transportSteps
  }
];
