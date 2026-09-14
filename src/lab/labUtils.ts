import type { LabResult, LabVariableDef } from "../types";

/**
 * 在一条时间序列上按虚拟时间线性插值取值。
 * 与后端采样点严格对齐：任意时刻的画面与读数都由同一份数据算出。
 */
export const sampleSeries = (times: number[], values: number[], t: number): number => {
  if (values.length === 0) return 0;
  if (t <= times[0]) return values[0];
  if (t >= times[times.length - 1]) return values[values.length - 1];
  for (let i = 1; i < times.length; i++) {
    if (t <= times[i]) {
      const ratio = (t - times[i - 1]) / (times[i] - times[i - 1]);
      return values[i - 1] + ratio * (values[i] - values[i - 1]);
    }
  }
  return values[values.length - 1];
};

/** 取某个虚拟时刻所有观察变量的当前值 */
export const sampleAll = (result: LabResult, t: number): Record<string, number> => {
  const out: Record<string, number> = {};
  for (const [id, values] of Object.entries(result.series)) {
    out[id] = sampleSeries(result.times, values, t);
  }
  return out;
};

/** 按变量定义的小数位格式化读数 */
export const formatVariable = (def: LabVariableDef, value: number): string => value.toFixed(def.decimals);

/** 虚拟时间显示：10 min → "10.0 min" */
export const formatLabTime = (t: number, unit: string): string => `${t.toFixed(1)} ${unit}`;

/** 实验记录的时间戳显示 */
export const formatRunTime = (iso: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getMonth() + 1}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

/** 把一次运行的条件取值格式化为简短摘要，如 "0.60 mol/L · 21%" */
export const formatParams = (
  params: Record<string, number>,
  defs: Array<{ id: string; unit: string; step: number }>
): string =>
  defs
    .map((def) => {
      const value = params[def.id];
      if (value === undefined) return null;
      const decimals = def.step < 0.01 ? 3 : def.step < 1 ? 2 : 0;
      return `${value.toFixed(decimals)} ${def.unit}`;
    })
    .filter(Boolean)
    .join(" · ");
