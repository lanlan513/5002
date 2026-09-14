import { useCallback, useRef } from "react";
import type { LabResult, LabVariableDef } from "../types";
import { formatVariable, sampleSeries } from "./labUtils";

interface LabChartProps {
  result: LabResult | null;
  variables: LabVariableDef[];
  /** 当前虚拟时间（播放头） */
  time: number;
  duration: number;
  timeUnit: string;
  onSeek: (t: number) => void;
}

const W = 300;
const H = 64;
const PAD = 4;

/**
 * 变量曲线组：每个观察变量一张小图（各自的 y 轴量程），
 * 共享同一个时间播放头；在任意小图上点击 / 拖动可跳转时间。
 */
export default function LabChart({ result, variables, time, duration, timeUnit, onSeek }: LabChartProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const scrubbing = useRef(false);

  const seekFromPointer = useCallback(
    (clientX: number, el: HTMLElement) => {
      const rect = el.getBoundingClientRect();
      const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      onSeek(ratio * duration);
    },
    [duration, onSeek]
  );

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!result) return;
    scrubbing.current = true;
    trackRef.current = event.currentTarget;
    event.currentTarget.setPointerCapture(event.pointerId);
    seekFromPointer(event.clientX, event.currentTarget);
  };
  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!scrubbing.current || !trackRef.current) return;
    seekFromPointer(event.clientX, trackRef.current);
  };
  const onPointerUp = () => {
    scrubbing.current = false;
    trackRef.current = null;
  };

  const cursorX = duration > 0 ? (time / duration) * W : 0;
  const activeVariables = result ? variables.filter((v) => result.series[v.id]) : variables;

  return (
    <div className="lab-charts">
      {activeVariables.map((variable) => {
        const values = result?.series[variable.id];
        const current = values ? sampleSeries(result!.times, values, time) : null;
        const points = values
          ? values
              .map((v, i) => {
                const x = (i / (values.length - 1)) * W;
                const y = H - PAD - ((v - variable.min) / (variable.max - variable.min)) * (H - PAD * 2);
                return `${x.toFixed(1)},${y.toFixed(1)}`;
              })
              .join(" ")
          : "";
        return (
          <div className="lab-chart" key={variable.id}>
            <div className="lab-chart-head">
              <span className="lab-chart-label">
                <i style={{ background: variable.color }} /> {variable.label}
              </span>
              <strong className="lab-chart-value" style={{ color: variable.color }}>
                {current !== null ? `${formatVariable(variable, current)} ${variable.unit}` : "—"}
              </strong>
            </div>
            <div
              className={`lab-chart-track ${result ? "" : "is-empty"}`}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              role={result ? "slider" : undefined}
              aria-label={result ? `${variable.label} 时间轴` : undefined}
              aria-valuenow={result ? Math.round((time / duration) * 100) : undefined}
            >
              {values ? (
                <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
                  {/* 量程参考线 */}
                  {[0.25, 0.5, 0.75].map((r) => (
                    <line key={r} x1={0} x2={W} y1={H * r} y2={H * r} className="lab-chart-grid" />
                  ))}
                  {variable.min < 0 && (
                    <line
                      x1={0}
                      x2={W}
                      y1={H - PAD - ((0 - variable.min) / (variable.max - variable.min)) * (H - PAD * 2)}
                      y2={H - PAD - ((0 - variable.min) / (variable.max - variable.min)) * (H - PAD * 2)}
                      className="lab-chart-zero"
                    />
                  )}
                  <polygon points={`0,${H} ${points} ${W},${H}`} fill={variable.color} opacity={0.1} />
                  <polyline
                    points={points}
                    fill="none"
                    stroke={variable.color}
                    strokeWidth={2}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    vectorEffect="non-scaling-stroke"
                  />
                  <line x1={cursorX} x2={cursorX} y1={0} y2={H} className="lab-chart-cursor" />
                </svg>
              ) : (
                <span className="lab-chart-empty">运行实验后显示数据曲线</span>
              )}
            </div>
            <div className="lab-chart-axis">
              <span>0</span>
              <span>
                {duration} {timeUnit}（虚拟时间）
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
