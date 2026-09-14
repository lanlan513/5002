import { useEffect, useRef } from "react";
import { breathWave, systolePulse, type Simulation } from "./model";

export type PhysioFocus = "heart" | "lungs" | "blood" | "gut" | null;

// 虚拟坐标系 260 × 360（与渲染尺寸解耦，绘制时等比缩放）
const VW = 260;
const VH = 360;

const HEART = { x: 126, y: 132 };
const LUNG_L = { x: 96, y: 106 };
const LUNG_R = { x: 158, y: 106 };
const STOMACH = { x: 104, y: 198 };
const GUT = { x: 130, y: 252 };

// 体循环（闭合）：心脏 → 主动脉 → 躯干/下肢 → 腔静脉 → 心脏
const SYSTEMIC_POINTS: [number, number][] = [
  [HEART.x - 2, HEART.y + 4], [124, 152], [122, 176], [120, 202], [116, 230],
  [110, 258], [104, 284], [102, 302], [110, 314], [136, 316], [148, 304],
  [146, 276], [144, 244], [142, 212], [140, 182], [136, 154], [HEART.x + 4, HEART.y + 6]
];

// 肺循环（闭合 8 字）：心脏 → 左肺 → 心脏 → 右肺 → 心脏
const PULMONARY_POINTS: [number, number][] = [
  [HEART.x - 4, HEART.y - 2], [108, 118], [94, 108], [92, 96], [104, 88],
  [120, 100], [HEART.x, HEART.y - 6], [HEART.x + 2, HEART.y - 8], [136, 100],
  [152, 88], [164, 96], [162, 108], [148, 118], [HEART.x + 4, HEART.y - 2]
];

// 消化道：食管 → 胃 → 小肠盘曲 → 大肠出口（开放路径）
const GUT_POINTS: [number, number][] = [
  [118, 150], [112, 168], [STOMACH.x + 2, STOMACH.y - 8], [STOMACH.x - 4, STOMACH.y + 10],
  [112, 224], [148, 228], [152, 240], [108, 240], [104, 252], [152, 252],
  [156, 264], [108, 264], [104, 276], [146, 278], [150, 290], [132, 296]
];

interface Path {
  points: [number, number][];
  lengths: number[];
  total: number;
  closed: boolean;
}

function makePath(points: [number, number][], closed: boolean): Path {
  const lengths = [0];
  let total = 0;
  const segments = closed ? points.length : points.length - 1;
  for (let i = 0; i < segments; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % points.length];
    total += Math.hypot(x2 - x1, y2 - y1);
    lengths.push(total);
  }
  return { points, lengths, total, closed };
}

const SYSTEMIC = makePath(SYSTEMIC_POINTS, true);
const PULMONARY = makePath(PULMONARY_POINTS, true);
const GUT_PATH = makePath(GUT_POINTS, false);

function samplePath(path: Path, u: number) {
  const wrapped = path.closed ? ((u % 1) + 1) % 1 : Math.min(Math.max(u, 0), 1);
  const d = wrapped * path.total;
  let lo = 0;
  let hi = path.lengths.length - 1;
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1;
    if (path.lengths[mid] <= d) lo = mid;
    else hi = mid;
  }
  const [x1, y1] = path.points[lo % path.points.length];
  const [x2, y2] = path.points[(lo + 1) % path.points.length];
  const segLen = path.lengths[lo + 1] - path.lengths[lo] || 1;
  const f = (d - path.lengths[lo]) / segLen;
  return {
    x: x1 + (x2 - x1) * f,
    y: y1 + (y2 - y1) * f,
    nx: -(y2 - y1) / segLen,
    ny: (x2 - x1) / segLen
  };
}

const tracePath = (ctx: CanvasRenderingContext2D, path: Path) => {
  ctx.beginPath();
  path.points.forEach(([x, y], index) => (index === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  if (path.closed) ctx.closePath();
};

// 血氧颜色：富氧血红 ↔ 缺氧血蓝紫
const OXY: [number, number, number] = [255, 111, 127];
const DEOXY: [number, number, number] = [118, 128, 224];
const bloodColor = (oxy: number, alpha: number) => {
  const r = Math.round(DEOXY[0] + (OXY[0] - DEOXY[0]) * oxy);
  const g = Math.round(DEOXY[1] + (OXY[1] - DEOXY[1]) * oxy);
  const b = Math.round(DEOXY[2] + (OXY[2] - DEOXY[2]) * oxy);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// 体循环：离开心脏时富氧，流经身体后逐渐缺氧
const systemicOxy = (u: number) => 0.56 + 0.44 * Math.cos(2 * Math.PI * u);
// 肺循环：离开心脏时缺氧，经过肺后完成氧合（8 字的两半各自重复一次）
const pulmonaryOxy = (u: number) => {
  const half = (u * 2) % 1;
  const rise = Math.min(Math.max((half - 0.18) / 0.42, 0), 1);
  return 0.12 + 0.88 * rise * rise * (3 - 2 * rise);
};

interface Particle {
  u: number;
  jitter: number;
  size: number;
}

const makeParticles = (count: number): Particle[] =>
  Array.from({ length: count }, () => ({
    u: Math.random(),
    jitter: (Math.random() - 0.5) * 2,
    size: 1.3 + Math.random() * 1.1
  }));

interface PhysioBodyCanvasProps {
  simRef: React.MutableRefObject<Simulation | null>;
  focus: PhysioFocus;
}

export function PhysioBodyCanvas({ simRef, focus }: PhysioBodyCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const focusRef = useRef<PhysioFocus>(focus);
  focusRef.current = focus;
  const particlesRef = useRef<{ systemic: Particle[]; pulmonary: Particle[]; gut: Particle[] } | null>(null);
  if (!particlesRef.current) {
    particlesRef.current = {
      systemic: makeParticles(34),
      pulmonary: makeParticles(20),
      gut: makeParticles(9)
    };
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let last = performance.now();

    const render = (now: number) => {
      const sim = simRef.current;
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      if (!sim) {
        raf = requestAnimationFrame(render);
        return;
      }
      const sdt = sim.playing ? dt * sim.speed : 0; // 模拟时间步长

      const { width, height } = canvas.getBoundingClientRect();
      const ratio = Math.min(devicePixelRatio, 2);
      if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) {
        canvas.width = Math.round(width * ratio);
        canvas.height = Math.round(height * ratio);
      }
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.clearRect(0, 0, width, height);

      const scale = Math.min(width / VW, height / VH);      ctx.save();
      ctx.translate((width - VW * scale) / 2, (height - VH * scale) / 2);
      ctx.scale(scale, scale);

      const m = sim.metrics;
      const pulse = systolePulse(sim.heartPhase, m.heartRate); // 心室收缩脉冲
      const breath = breathWave(sim.breathPhase); // 0 呼气末 → 1 吸气末
      const particles = particlesRef.current!;

      drawTorso(ctx);
      drawVessels(ctx);
      drawLungs(ctx, breath);
      drawGut(ctx, sim, sdt, particles.gut);
      drawHeart(ctx, pulse);
      drawBlood(ctx, sim, sdt, pulse, particles);
      drawLabels(ctx, sim);
      drawFocus(ctx, focusRef.current, sim.time);

      ctx.restore();
      raf = requestAnimationFrame(render);
    };

    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, [simRef]);

  return <canvas ref={canvasRef} className="physio-body-canvas" aria-label="呼吸、心跳、血液循环与消化的动态示意" />;
}

// ===== 各结构绘制 =====

function drawTorso(ctx: CanvasRenderingContext2D) {
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = "rgba(159, 232, 197, 0.28)";
  ctx.fillStyle = "rgba(159, 232, 197, 0.045)";

  // 头
  ctx.beginPath();
  ctx.arc(128, 36, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // 躯干轮廓
  ctx.beginPath();
  ctx.moveTo(112, 56);
  ctx.bezierCurveTo(96, 66, 84, 78, 80, 100);
  ctx.bezierCurveTo(76, 130, 82, 160, 88, 186);
  ctx.bezierCurveTo(92, 206, 94, 224, 96, 244);
  ctx.bezierCurveTo(98, 272, 100, 300, 104, 322);
  ctx.bezierCurveTo(106, 332, 114, 334, 118, 326);
  ctx.lineTo(124, 300);
  ctx.lineTo(132, 300);
  ctx.lineTo(138, 326);
  ctx.bezierCurveTo(142, 334, 150, 332, 152, 322);
  ctx.bezierCurveTo(156, 300, 158, 272, 160, 244);
  ctx.bezierCurveTo(162, 224, 164, 206, 168, 186);
  ctx.bezierCurveTo(174, 160, 180, 130, 176, 100);
  ctx.bezierCurveTo(172, 78, 160, 66, 144, 56);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function drawVessels(ctx: CanvasRenderingContext2D) {
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  // 体循环血管底色
  tracePath(ctx, SYSTEMIC);
  ctx.strokeStyle = "rgba(255, 111, 127, 0.14)";
  ctx.lineWidth = 4.5;
  ctx.stroke();
  // 肺循环血管底色
  tracePath(ctx, PULMONARY);
  ctx.strokeStyle = "rgba(140, 150, 235, 0.16)";
  ctx.lineWidth = 3;
  ctx.stroke();
}

function drawLungs(ctx: CanvasRenderingContext2D, breath: number) {
  const inflate = 1 + 0.13 * breath;
  // 气管与支气管
  ctx.strokeStyle = "rgba(124, 200, 255, 0.55)";
  ctx.lineWidth = 2.4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(128, 58);
  ctx.lineTo(128, 84);
  ctx.moveTo(128, 84);
  ctx.lineTo(LUNG_L.x + 6, LUNG_L.y - 8);
  ctx.moveTo(128, 84);
  ctx.lineTo(LUNG_R.x - 6, LUNG_R.y - 8);
  ctx.stroke();

  for (const lung of [LUNG_L, LUNG_R]) {
    ctx.save();
    ctx.translate(lung.x, lung.y);
    ctx.scale(inflate, inflate);
    ctx.beginPath();
    ctx.ellipse(0, 0, 23, 33, lung.x < 128 ? -0.16 : 0.16, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(124, 200, 255, ${0.06 + breath * 0.08})`;
    ctx.fill();
    ctx.strokeStyle = "rgba(124, 200, 255, 0.8)";
    ctx.lineWidth = 1.3;
    ctx.stroke();
    // 肺内支气管纹理
    ctx.strokeStyle = "rgba(124, 200, 255, 0.35)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -20);
    ctx.lineTo(0, 8);
    ctx.moveTo(0, -8);
    ctx.lineTo(lung.x < 128 ? -9 : 9, 2);
    ctx.moveTo(0, -8);
    ctx.lineTo(lung.x < 128 ? 8 : -8, 4);
    ctx.stroke();
    ctx.restore();
  }
}

function drawHeart(ctx: CanvasRenderingContext2D, pulse: number) {
  const size = 1 + 0.16 * pulse;
  ctx.save();
  ctx.translate(HEART.x, HEART.y);
  ctx.scale(size, size);
  ctx.shadowColor = "rgba(255, 111, 127, 0.9)";
  ctx.shadowBlur = 4 + pulse * 14;
  ctx.beginPath();
  ctx.moveTo(0, 11);
  ctx.bezierCurveTo(-15, -1, -10, -13, 0, -6);
  ctx.bezierCurveTo(10, -13, 15, -1, 0, 11);
  ctx.closePath();
  ctx.fillStyle = `rgba(255, 111, 127, ${0.4 + pulse * 0.35})`;
  ctx.fill();
  ctx.strokeStyle = "#ff8fa3";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.restore();
}

function drawGut(
  ctx: CanvasRenderingContext2D,
  sim: Simulation,
  sdt: number,
  gutParticles: Particle[]
) {
  const digestion = sim.metrics.digestion;

  // 胃：轮廓 + 按填充度着色的内容物
  ctx.save();
  ctx.translate(STOMACH.x, STOMACH.y);
  ctx.rotate(-0.45);
  const stomachShape = () => {
    ctx.beginPath();
    ctx.ellipse(0, 0, 17, 11.5, 0, 0, Math.PI * 2);
  };
  stomachShape();
  ctx.fillStyle = "rgba(255, 196, 107, 0.07)";
  ctx.fill();
  ctx.save();
  stomachShape();
  ctx.clip();
  const fillHeight = 23 * sim.stomachFill;
  ctx.fillStyle = "rgba(255, 196, 107, 0.38)";
  ctx.fillRect(-18, 11.5 - fillHeight, 36, fillHeight + 1);
  ctx.restore();
  ctx.strokeStyle = "rgba(255, 196, 107, 0.85)";
  ctx.lineWidth = 1.3;
  stomachShape();
  ctx.stroke();
  ctx.restore();

  // 肠道管道
  tracePath(ctx, GUT_PATH);
  ctx.strokeStyle = "rgba(217, 167, 255, 0.22)";
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();

  // 蠕动波：沿肠道移动的亮纹，速度随消化活动变化
  if (digestion > 0.06) {
    tracePath(ctx, GUT_PATH);
    ctx.save();
    ctx.setLineDash([3, 14]);
    ctx.lineDashOffset = -sim.time * (6 + digestion * 26);
    ctx.strokeStyle = `rgba(217, 167, 255, ${0.25 + digestion * 0.55})`;
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ctx.restore();
  }

  // 营养物质颗粒
  for (const particle of gutParticles) {
    particle.u += sdt * 0.018 * (0.25 + digestion);
    if (particle.u >= 1) particle.u -= 1;
    const pos = samplePath(GUT_PATH, particle.u);
    ctx.beginPath();
    ctx.fillStyle = `rgba(255, 196, 107, ${0.25 + digestion * 0.6})`;
    ctx.arc(pos.x + particle.jitter, pos.y + particle.jitter, particle.size * 0.8, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawBlood(
  ctx: CanvasRenderingContext2D,
  sim: Simulation,
  sdt: number,
  pulse: number,
  particles: { systemic: Particle[]; pulmonary: Particle[] }
) {
  // 心输出量决定流速；每次心搏带来一次速度脉冲
  const flowRatio = sim.metrics.cardiacOutput / 5;
  const surge = 0.55 + 1.05 * pulse;
  const systemicLap = 11 / flowRatio; // 静息时约 11 秒完成一圈体循环
  const pulmonaryLap = 5.5 / flowRatio;

  ctx.save();
  ctx.shadowBlur = 3;

  for (const particle of particles.systemic) {
    particle.u += (sdt * surge) / systemicLap;
    if (particle.u >= 1) particle.u -= 1;
    const pos = samplePath(SYSTEMIC, particle.u);
    const oxy = systemicOxy(particle.u);
    ctx.shadowColor = bloodColor(oxy, 0.9);
    ctx.fillStyle = bloodColor(oxy, 0.92);
    ctx.beginPath();
    ctx.arc(pos.x + pos.nx * particle.jitter * 1.6, pos.y + pos.ny * particle.jitter * 1.6, particle.size, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const particle of particles.pulmonary) {
    particle.u += (sdt * surge) / pulmonaryLap;
    if (particle.u >= 1) particle.u -= 1;
    const pos = samplePath(PULMONARY, particle.u);
    const oxy = pulmonaryOxy(particle.u);
    ctx.shadowColor = bloodColor(oxy, 0.9);
    ctx.fillStyle = bloodColor(oxy, 0.92);
    ctx.beginPath();
    ctx.arc(pos.x + pos.nx * particle.jitter * 1.3, pos.y + pos.ny * particle.jitter * 1.3, particle.size * 0.85, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawLabels(ctx: CanvasRenderingContext2D, sim: Simulation) {
  const m = sim.metrics;
  ctx.font = '9.5px "DM Mono", monospace';
  ctx.textBaseline = "middle";

  const label = (x: number, y: number, anchor: "left" | "right", lines: string[], color: string) => {
    ctx.textAlign = anchor;
    ctx.fillStyle = color;
    lines.forEach((line, index) => ctx.fillText(line, x, y + index * 11));
  };

  // 结构标签与实时指标一一对应
  label(HEART.x + 22, HEART.y + 16, "left", ["心脏", `${Math.round(m.heartRate)} 次/分`], "#ff9fb0");
  label(LUNG_R.x + 30, LUNG_R.y - 6, "left", ["肺", `${Math.round(m.breathRate)} 次/分`], "#8fd0ff");
  label(STOMACH.x - 24, STOMACH.y + 2, "right", ["胃", `消化 ${Math.round(m.digestion * 100)}%`], "#ffd08a");
  label(GUT.x + 34, GUT.y + 34, "left", [`血流 ${m.cardiacOutput.toFixed(1)} L/min`], "#c9a0ff");

  // 引导线
  ctx.strokeStyle = "rgba(159, 232, 197, 0.25)";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(HEART.x + 9, HEART.y + 8);
  ctx.lineTo(HEART.x + 20, HEART.y + 16);
  ctx.moveTo(LUNG_R.x + 22, LUNG_R.y - 4);
  ctx.lineTo(LUNG_R.x + 28, LUNG_R.y - 6);
  ctx.moveTo(STOMACH.x - 13, STOMACH.y + 2);
  ctx.lineTo(STOMACH.x - 22, STOMACH.y + 2);
  ctx.stroke();
}

function drawFocus(ctx: CanvasRenderingContext2D, focus: PhysioFocus, time: number) {
  if (!focus) return;
  const targets: Record<Exclude<PhysioFocus, null>, { x: number; y: number; r: number; color: string }> = {
    heart: { x: HEART.x, y: HEART.y, r: 22, color: "#ff8fa3" },
    lungs: { x: 127, y: LUNG_L.y, r: 52, color: "#7cc8ff" },
    blood: { x: 125, y: 220, r: 66, color: "#ff6f7f" },
    gut: { x: GUT.x - 2, y: GUT.y - 20, r: 58, color: "#d9a7ff" }
  };
  const target = targets[focus];
  const pulse = 1 + 0.06 * Math.sin(time * 4);
  ctx.save();
  ctx.setLineDash([4, 5]);
  ctx.strokeStyle = target.color;
  ctx.globalAlpha = 0.85;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.ellipse(target.x, target.y, target.r * pulse, target.r * 0.82 * pulse, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}
