import { useEffect, useRef } from "react";
import {
  breathWave,
  ecgWave,
  WAVE_WINDOW,
  type Simulation
} from "./model";

export type TrendMetric = "heartRate" | "breathRate" | "cardiacOutput";

interface MetricChartProps {
  simRef: React.MutableRefObject<Simulation | null>;
  metric: TrendMetric;
  label: string;
  unit: string;
  color: string;
  min: number;
  max: number;
  format: (value: number) => string;
}

const TREND_WINDOW = 60; // 趋势图显示最近 60 秒模拟时间

// 单指标趋势曲线：固定量程，便于跨状态比较
export function MetricChart({ simRef, metric, label, unit, color, min, max, format }: MetricChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    const render = () => {
      const sim = simRef.current;
      if (!sim) {
        raf = requestAnimationFrame(render);
        return;
      }
      const { width, height } = canvas.getBoundingClientRect();
      const ratio = Math.min(devicePixelRatio, 2);
      if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) {
        canvas.width = Math.round(width * ratio);
        canvas.height = Math.round(height * ratio);
      }
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.clearRect(0, 0, width, height);

      const padL = 34;
      const padR = 10;
      const padT = 8;
      const padB = 16;
      const plotW = width - padL - padR;
      const plotH = height - padT - padB;
      const now = sim.time;

      const xOf = (t: number) => padL + (1 - (now - t) / TREND_WINDOW) * plotW;
      const yOf = (v: number) => padT + (1 - (v - min) / (max - min)) * plotH;

      // 网格与量程标注
      ctx.font = '8.5px "DM Mono", monospace';
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      for (const fraction of [0, 0.5, 1]) {
        const value = min + (max - min) * fraction;
        const y = yOf(value);
        ctx.strokeStyle = "rgba(184, 232, 203, 0.1)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(padL, y);
        ctx.lineTo(width - padR, y);
        ctx.stroke();
        ctx.fillStyle = "rgba(143, 179, 161, 0.75)";
        ctx.fillText(format(value), 2, y);
      }
      // 时间刻度（模拟时间不足一个窗口时只画能容纳的）
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(143, 179, 161, 0.6)";
      for (const offset of [TREND_WINDOW, TREND_WINDOW / 2]) {
        if (now - offset >= 0) ctx.fillText(`-${offset}s`, xOf(now - offset), height - 6);
      }
      ctx.fillText("现在", xOf(now), height - 6);

      // 曲线与渐变填充
      const samples = sim.history.filter((sample) => sample.t >= now - TREND_WINDOW);
      if (samples.length > 1) {
        const gradient = ctx.createLinearGradient(0, padT, 0, height - padB);
        gradient.addColorStop(0, `${color}38`);
        gradient.addColorStop(1, `${color}00`);
        ctx.beginPath();
        samples.forEach((sample, index) => {
          const x = xOf(sample.t);
          const y = yOf(sample[metric]);
          if (index === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.6;
        ctx.lineJoin = "round";
        ctx.stroke();

        const last = samples[samples.length - 1];
        ctx.lineTo(xOf(last.t), height - padB);
        ctx.lineTo(xOf(samples[0].t), height - padB);
        ctx.closePath();
        ctx.fillStyle = gradient;
        ctx.fill();

        // 当前值光点
        const pulse = 2.4 + Math.sin(now * 5) * 0.7;
        ctx.beginPath();
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 7;
        ctx.arc(xOf(last.t), yOf(last[metric]), pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, [simRef, metric, color, min, max, format]);

  return (
    <figure className="trend-chart">
      <figcaption>
        <span className="trend-dot" style={{ background: color }} />
        {label}
        <small>{unit}</small>
      </figcaption>
      <canvas ref={canvasRef} aria-label={`${label}随时间变化的曲线`} />
    </figure>
  );
}

// 心电 + 呼吸实时波形（示波器样式，教学示意）
export function WaveformCanvas({ simRef }: { simRef: React.MutableRefObject<Simulation | null> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    const render = () => {
      const sim = simRef.current;
      if (!sim) {
        raf = requestAnimationFrame(render);
        return;
      }
      const { width, height } = canvas.getBoundingClientRect();
      const ratio = Math.min(devicePixelRatio, 2);
      if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) {
        canvas.width = Math.round(width * ratio);
        canvas.height = Math.round(height * ratio);
      }
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.clearRect(0, 0, width, height);

      const padL = 8;
      const padR = 8;
      const plotW = width - padL - padR;
      const now = sim.time;
      const waves = sim.waves;

      // 两条通道：心电在上，呼吸在下
      const lanes = [
        { name: "心电（示意）", color: "#ff8fa3", center: height * 0.28, amp: height * 0.2 },
        { name: "呼吸", color: "#7cc8ff", center: height * 0.74, amp: height * 0.17 }
      ];

      ctx.font = '9px "DM Mono", monospace';
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      for (const lane of lanes) {
        ctx.strokeStyle = "rgba(184, 232, 203, 0.12)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(padL, lane.center);
        ctx.lineTo(width - padR, lane.center);
        ctx.stroke();
        ctx.fillStyle = `${lane.color}cc`;
        ctx.fillText(lane.name, padL + 2, lane.center - lane.amp - 8);
      }

      if (waves.length > 1) {
        // 垂直网格：每秒一格
        ctx.strokeStyle = "rgba(184, 232, 203, 0.05)";
        for (let second = Math.ceil(now - WAVE_WINDOW); second <= now; second++) {
          const x = padL + (1 - (now - second) / WAVE_WINDOW) * plotW;
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
          ctx.stroke();
        }

        // 在波形采样缓冲中定位时刻 t，线性插值出累计周期数
        const cycleAt = (t: number, pick: "heartCycle" | "breathCycle") => {
          let index = waves.length - 1;
          while (index > 0 && waves[index].t > t) index--;
          const a = waves[index];
          const b = waves[Math.min(index + 1, waves.length - 1)];
          const span = b.t - a.t;
          const fraction = span > 0 ? (t - a.t) / span : 0;
          return a[pick] + (b[pick] - a[pick]) * fraction;
        };

        const heartRate = sim.metrics.heartRate;
        const drawLane = (laneIndex: number, valueAt: (t: number) => number) => {
          const lane = lanes[laneIndex];
          ctx.beginPath();
          for (let x = 0; x <= plotW; x += 1.5) {
            const t = now - (1 - x / plotW) * WAVE_WINDOW;
            if (t < waves[0].t) continue;
            const y = lane.center - valueAt(t) * lane.amp;
            if (x === 0) ctx.moveTo(padL + x, y);
            else ctx.lineTo(padL + x, y);
          }
          ctx.strokeStyle = lane.color;
          ctx.lineWidth = 1.5;
          ctx.lineJoin = "round";
          ctx.stroke();
        };

        drawLane(0, (t) => ecgWave(cycleAt(t, "heartCycle") % 1, heartRate));
        drawLane(1, (t) => breathWave(cycleAt(t, "breathCycle") % 1) * 2 - 1);
      }

      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, [simRef]);

  return <canvas ref={canvasRef} className="waveform-canvas" aria-label="心电与呼吸的实时波形（教学示意）" />;
}
