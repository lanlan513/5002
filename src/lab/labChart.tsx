import { useEffect, useRef } from "react";
import {
  BASELINE_METRICS,
  metricDefOf,
  type LabMetricKey,
  type LabRun,
  type LabSample,
  type LabSimulation
} from "./labModel";

interface LabTimelineChartProps {
  simRef: React.MutableRefObject<LabSimulation | null>;
  runs: LabRun[];
  metric: LabMetricKey;
  windowSeconds: number; // 0 表示全程
}

const SLOT_COLOR: Record<"A" | "B", string> = { A: "#9fe8c5", B: "#d9a7ff" };

// 时间轴曲线：当前实验为实线，保存的 A/B 实验为淡色对照线；
// 虚线为基线，竖线标记“施加条件 / 恢复基线”事件。
export function LabTimelineChart({ simRef, runs, metric, windowSeconds }: LabTimelineChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const runsRef = useRef(runs);
  runsRef.current = runs;

  const def = metricDefOf(metric);
  const { min, max, color, unit, format } = def;

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

      const padL = 40;
      const padR = 12;
      const padT = 10;
      const padB = 18;
      const plotW = width - padL - padR;
      const plotH = height - padT - padB;

      const savedRuns = runsRef.current;
      const maxT = Math.max(
        sim.time,
        ...savedRuns.map((run) => run.duration),
        10
      );
      const win = windowSeconds > 0 ? Math.min(windowSeconds, maxT) : maxT;
      const tEnd = windowSeconds > 0 ? sim.time : maxT;
      const tStart = Math.max(0, tEnd - win);

      const xOf = (t: number) => padL + ((t - tStart) / Math.max(win, 1e-6)) * plotW;
      const yOf = (v: number) => padT + (1 - Math.min(Math.max((v - min) / (max - min), 0), 1)) * plotH;

      // 网格与量程
      ctx.font = '8.5px "DM Mono", monospace';
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      for (const fraction of [0, 0.5, 1]) {
        const value = min + (max - min) * fraction;
        const y = yOf(value);
        ctx.strokeStyle = "rgba(184, 232, 203, 0.1)";
        ctx.beginPath();
        ctx.moveTo(padL, y);
        ctx.lineTo(width - padR, y);
        ctx.stroke();
        ctx.fillStyle = "rgba(143, 179, 161, 0.75)";
        ctx.fillText(format(value), 2, y);
      }

      // 基线虚线
      const yBase = yOf(BASELINE_METRICS[metric]);
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = "rgba(200, 224, 210, .4)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padL, yBase);
      ctx.lineTo(width - padR, yBase);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "rgba(180, 204, 190, .7)";
      ctx.textAlign = "right";
      ctx.fillText("基线", width - padR, yBase - 7);
      ctx.textAlign = "left";

      // x 轴时间刻度
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(143, 179, 161, 0.6)";
      const tick = win <= 60 ? 15 : win <= 180 ? 30 : win <= 600 ? 60 : 300;
      for (let t = Math.ceil(tStart / tick) * tick; t <= tEnd; t += tick) {
        ctx.fillText(`${Math.round(t / 60)}:${String(Math.round(t % 60)).padStart(2, "0")}`, xOf(t), height - 7);
      }

      const drawSeries = (
        samples: LabSample[],
        lineColor: string,
        lineWidth: number,
        glow: boolean
      ) => {
        let started = false;
        ctx.beginPath();
        for (const sample of samples) {
          const t = sample.t;
          if (t < tStart) continue;
          const x = xOf(t);
          const y = yOf(sample[metric]);
          if (!started) {
            ctx.moveTo(x, y);
            started = true;
          } else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = lineWidth;
        ctx.lineJoin = "round";
        if (glow) {
          ctx.shadowColor = lineColor;
          ctx.shadowBlur = 5;
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
      };

      // 保存的对照实验（淡色）
      savedRuns.forEach((run) => {
        drawSeries(run.samples, `${SLOT_COLOR[run.slot]}55`, 1.1, false);
      });

      // 事件竖线
      const drawEvents = (events: LabSimulation["events"], lineColor: string, tag: string) => {
        for (const ev of events) {
          if (ev.t < tStart || ev.t > tEnd) continue;
          const x = xOf(ev.t);
          ctx.setLineDash(ev.kind === "recover" ? [2, 4] : [5, 3]);
          ctx.strokeStyle = lineColor;
          ctx.globalAlpha = tag === "现在" ? 0.75 : 0.4;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x, padT);
          ctx.lineTo(x, height - padB);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.globalAlpha = 1;
          ctx.font = '8.5px "DM Mono", monospace';
          ctx.textAlign = "left";
          ctx.fillStyle = lineColor;
          const word = ev.kind === "apply" ? "施加" : "恢复";
          ctx.fillText(tag === "现在" ? word : `${tag} ${word}`, x + 3, padT + 7);
        }
      };
      savedRuns.forEach((run) => drawEvents(run.events, SLOT_COLOR[run.slot], run.slot));
      drawEvents(sim.events, "#e8f2ed", "现在");

      // 当前实验
      drawSeries(sim.history, color, 1.8, true);
      const last = sim.history[sim.history.length - 1];
      if (last) {
        const pulse = 2.6 + Math.sin(sim.time * 4) * 0.8;
        ctx.beginPath();
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 8;
        ctx.arc(xOf(last.t), yOf(last[metric]), pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.textAlign = "right";
        ctx.font = '9px "DM Mono", monospace';
        ctx.fillText(`${format(last[metric])} ${unit}`, width - padR, padT + 8);
      }

      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, [simRef, metric, windowSeconds, color, min, max, format, unit]);

  return <canvas ref={canvasRef} className="lab-timeline-canvas" aria-label={`${def.label}随时间变化的恢复曲线（教学模型）`} />;
}
