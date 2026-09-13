import type {
  EntityState,
  ProcessDetail,
  ProcessEntity,
  ProcessMetric
} from "../types";

/* ============================================================
 * 过程模拟引擎（纯函数）
 *
 * 动画不是视频：任意“虚拟时间”下的画面都由后端关键帧数据插值
 * 计算得到。播放 / 暂停 / 调速 / 拖动进度 / 跳回任意阶段，都只是
 * 改变传入的时间，画面与状态指标严格对应当前数据状态。
 * ============================================================ */

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

/** 缓入缓出：让关键帧之间的运动更自然（数值指标同步平滑） */
export const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * 补全后的关键帧：变换属性为 null 表示“从未设置”，
 * 即该实体使用图形自身的绝对坐标（如铺满画布的膜、区域底色）。
 * 只有 opacity 始终有默认值。
 */
export interface ResolvedKeyframe {
  x: number | null;
  y: number | null;
  scaleX: number | null;
  scaleY: number | null;
  rotate: number | null;
  opacity: number;
  dashOffset: number | null;
}

/** 每一步的起始时间（秒）；boundaries[0] = 0 */
export const buildBoundaries = (process: ProcessDetail): number[] => {
  const out = [0];
  process.steps.forEach((step) => out.push(out[out.length - 1] + step.duration));
  return out;
};

/** 找到时间 t 所处的步骤索引（0-based） */
export const stepAt = (boundaries: number[], t: number, stepCount: number) => {
  let step = 0;
  for (let i = 0; i < stepCount; i++) {
    if (t >= boundaries[i]) step = i;
  }
  if (t >= boundaries[stepCount]) step = stepCount - 1; // 结束时停留在最后一步
  return step;
};

/* ---------- 关键帧补全与插值 ---------- */

/**
 * 把后端“稀疏关键帧”（缺省属性沿用上一帧）补全为完整关键帧。
 * 默认状态：原点、不缩放、不旋转、完全可见。
 */
export const resolveTracks = (process: ProcessDetail): ResolvedKeyframe[][] =>
  process.entities.map((entity) => {
    const frames = process.steps.length + 1;
    const out: ResolvedKeyframe[] = [];
    let current: ResolvedKeyframe = {
      x: null,
      y: null,
      scaleX: null,
      scaleY: null,
      rotate: null,
      opacity: 1,
      dashOffset: null
    };
    for (let f = 0; f < frames; f++) {
      const raw = entity.track[f] ?? {};
      current = {
        x: raw.x ?? current.x,
        y: raw.y ?? current.y,
        scaleX: raw.scaleX ?? current.scaleX,
        scaleY: raw.scaleY ?? current.scaleY,
        rotate: raw.rotate ?? current.rotate,
        opacity: raw.opacity ?? current.opacity,
        dashOffset: f === 0 ? (raw.dashOffset ?? null) : raw.dashOffset === undefined ? current.dashOffset : raw.dashOffset
      };
      out.push(current);
    }
    return out;
  });

const mix = (a: number | null, b: number | null, t: number): number | null =>
  a === null || b === null ? b ?? a : lerp(a, b, t);

const interpolateKeyframe = (a: ResolvedKeyframe, b: ResolvedKeyframe, t: number): ResolvedKeyframe => ({
  x: mix(a.x, b.x, t),
  y: mix(a.y, b.y, t),
  scaleX: mix(a.scaleX, b.scaleX, t),
  scaleY: mix(a.scaleY, b.scaleY, t),
  rotate: mix(a.rotate, b.rotate, t),
  opacity: lerp(a.opacity, b.opacity, t),
  dashOffset: a.dashOffset !== null && b.dashOffset !== null ? lerp(a.dashOffset, b.dashOffset, t) : null
});

/* ---------- SVG 路径采样（供沿路径运动的实体使用） ---------- */

interface CubicSegment {
  p0: [number, number];
  p1: [number, number];
  p2: [number, number];
  p3: [number, number];
}

const cubicAt = (s: CubicSegment, t: number): [number, number] => {
  const mt = 1 - t;
  return [
    mt ** 3 * s.p0[0] + 3 * mt ** 2 * t * s.p1[0] + 3 * mt * t ** 2 * s.p2[0] + t ** 3 * s.p3[0],
    mt ** 3 * s.p0[1] + 3 * mt ** 2 * t * s.p1[1] + 3 * mt * t ** 2 * s.p2[1] + t ** 3 * s.p3[1]
  ];
};

/** 解析支持 M / L / C / c / Z 的简单 SVG path（本场景的运动路径均为直线或三次贝塞尔） */
const parseCubicSegments = (d: string): CubicSegment[] => {
  const tokens = d.match(/[a-zA-Z]|-?\d*\.?\d+(?:e-?\d+)?/g) ?? [];
  const segments: CubicSegment[] = [];
  let cur: [number, number] = [0, 0];
  let start: [number, number] = [0, 0];
  for (let i = 0; i < tokens.length; i++) {
    const cmd = tokens[i];
    if (!/[a-zA-Z]/.test(cmd)) continue;
    const nums: number[] = [];
    while (i + 1 < tokens.length && !/[a-zA-Z]/.test(tokens[i + 1])) nums.push(Number(tokens[++i]));
    const degenerateTo = (x: number, y: number): CubicSegment => ({
      p0: cur,
      p1: cur,
      p2: [x, y],
      p3: [x, y]
    });
    if (cmd === "M") {
      cur = [nums[0], nums[1]];
      start = [nums[0], nums[1]];
    } else if (cmd === "L") {
      segments.push(degenerateTo(nums[0], nums[1]));
      cur = [nums[0], nums[1]];
    } else if (cmd === "C") {
      const seg: CubicSegment = {
        p0: cur,
        p1: [nums[0], nums[1]],
        p2: [nums[2], nums[3]],
        p3: [nums[4], nums[5]]
      };
      segments.push(seg);
      cur = seg.p3;
    } else if (cmd === "c") {
      const seg: CubicSegment = {
        p0: cur,
        p1: [cur[0] + nums[0], cur[1] + nums[1]],
        p2: [cur[0] + nums[2], cur[1] + nums[3]],
        p3: [cur[0] + nums[4], cur[1] + nums[5]]
      };
      segments.push(seg);
      cur = seg.p3;
    } else if (cmd === "Z" || cmd === "z") {
      segments.push(degenerateTo(start[0], start[1]));
      cur = start;
    }
  }
  return segments;
};

const pathCache = new Map<string, (t: number) => { x: number; y: number; angle: number }>();

/** 按弧长比例在路径上取点（含切线方向，供 orientPath 使用） */
const getPathSampler = (d: string) => {
  const cached = pathCache.get(d);
  if (cached) return cached;

  const segments = parseCubicSegments(d);
  const SAMPLES_PER_SEG = 24;
  const points: Array<{ x: number; y: number; cum: number }> = [];
  let cum = 0;
  for (const s of segments) {
    let prev = cubicAt(s, 0);
    points.push({ x: prev[0], y: prev[1], cum });
    for (let k = 1; k <= SAMPLES_PER_SEG; k++) {
      const p = cubicAt(s, k / SAMPLES_PER_SEG);
      cum += Math.hypot(p[0] - prev[0], p[1] - prev[1]);
      points.push({ x: p[0], y: p[1], cum });
      prev = p;
    }
  }

  const point = (t: number) => {
    const target = clamp01(t) * cum;
    let lo = 0;
    let hi = points.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (points[mid].cum < target) lo = mid + 1;
      else hi = mid;
    }
    const i = Math.max(1, lo);
    const a = points[i - 1];
    const b = points[i];
    const span = b.cum - a.cum || 1;
    const local = clamp01((target - a.cum) / span);
    return {
      x: lerp(a.x, b.x, local),
      y: lerp(a.y, b.y, local),
      angle: (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI
    };
  };

  pathCache.set(d, point);
  return point;
};

/* ---------- 实体状态 ---------- */

export interface SceneState {
  /** 当前步骤索引 */
  step: number;
  /** 步骤内进度 0..1（缓动后，供进度条显示） */
  local: number;
  /** 全过程进度 0..1 */
  progress: number;
  entities: EntityState[];
  metrics: Array<number | string>;
}

export const sampleScene = (
  process: ProcessDetail,
  boundaries: number[],
  tracks: ResolvedKeyframe[][],
  time: number
): SceneState => {
  const stepCount = process.steps.length;
  const total = boundaries[stepCount];
  const clamped = Math.min(Math.max(time, 0), total);
  const step = stepAt(boundaries, clamped, stepCount);
  const duration = process.steps[step].duration || 1;
  const rawLocal = clamp01((clamped - boundaries[step]) / duration);
  const local = easeInOutCubic(rawLocal);
  const atEnd = clamped >= total;

  const entities: EntityState[] = process.entities.map((entity: ProcessEntity, index) => {
    const resolved = tracks[index];
    const from = resolved[step];
    const to = resolved[Math.min(step + 1, stepCount)];
    const kf = interpolateKeyframe(from, to, local);

    // 沿 SVG 路径运动：x 是路径弧长比例
    let x = kf.x;
    let y = kf.y;
    let angle = kf.rotate;
    if (entity.path) {
      const sample = getPathSampler(entity.path);
      const p = sample(kf.x ?? 0);
      x = p.x;
      y = p.y;
      if (entity.orientPath) angle = p.angle;
    }

    return {
      id: entity.id,
      kind: entity.kind,
      name: entity.name,
      organelleId: entity.organelleId,
      shapes: entity.shapes,
      label: entity.label,
      x,
      y,
      scaleX: kf.scaleX,
      scaleY: kf.scaleY,
      rotate: angle,
      opacity: kf.opacity,
      dashOffset: kf.dashOffset
    };
  });

  // 状态指标：text 类型在进入新步骤时切换；number 类型在步骤边界间线性插值
  const metrics = process.metrics.map((metric: ProcessMetric, mi) => {
    const initial = process.initialMetrics[mi] ?? metric.values[0];
    if (metric.kind === "text") {
      return atEnd ? metric.values[stepCount - 1] : metric.values[step];
    }
    const fromValue = step === 0 ? Number(initial) : Number(metric.values[step - 1]);
    const toValue = Number(metric.values[step]);
    return Math.round(lerp(fromValue, toValue, local) * 10) / 10;
  });

  return {
    step: atEnd ? stepCount - 1 : step,
    local: atEnd ? 1 : rawLocal,
    progress: total ? clamped / total : 0,
    entities,
    metrics
  };
};

/** 指标值的展示格式 */
export const formatMetricValue = (metric: ProcessMetric, value: number | string) => {
  if (metric.kind === "text") return `${value}${metric.unit ? ` ${metric.unit}` : ""}`;
  const n = typeof value === "number" ? value : Number(value);
  const shown = Number.isInteger(n) ? String(n) : n.toFixed(1);
  if (metric.kind === "percent") return `${shown}%`;
  return `${shown}${metric.unit ? ` ${metric.unit}` : ""}`;
};
