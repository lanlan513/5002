import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ProcessDetail } from "../types";
import { buildBoundaries, resolveTracks, sampleScene, type SceneState } from "./processEngine";

export interface PlayerApi {
  scene: SceneState;
  time: number;
  total: number;
  playing: boolean;
  speed: number;
  loop: boolean;
  pauseOnStep: boolean;
  boundaries: number[];
  play: () => void;
  pause: () => void;
  toggle: () => void;
  restart: () => void;
  seek: (t: number) => void;
  seekProgress: (p: number) => void;
  gotoStep: (index: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  setSpeed: (s: number) => void;
  setLoop: (v: boolean) => void;
  setPauseOnStep: (v: boolean) => void;
}

export const SPEEDS = [0.5, 1, 1.5, 2, 4] as const;

export function useProcessPlayer(process: ProcessDetail | null): PlayerApi {
  const boundaries = useMemo(() => (process ? buildBoundaries(process) : [0]), [process]);
  const tracks = useMemo(() => (process ? resolveTracks(process) : []), [process]);
  const total = process ? boundaries[boundaries.length - 1] : 0;

  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [loop, setLoop] = useState(true);
  const [pauseOnStep, setPauseOnStep] = useState(false);

  const rafRef = useRef<number>(0);
  const lastRef = useRef<number | null>(null);
  const timeRef = useRef(0);
  const speedRef = useRef(speed);
  const playingRef = useRef(playing);
  const loopRef = useRef(loop);
  const pauseStepRef = useRef(pauseOnStep);
  const stepRef = useRef(0);
  const totalRef = useRef(total);
  const boundariesRef = useRef(boundaries);
  const stepCountRef = useRef(process?.steps.length ?? 0);

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);
  useEffect(() => {
    loopRef.current = loop;
  }, [loop]);
  useEffect(() => {
    pauseStepRef.current = pauseOnStep;
  }, [pauseOnStep]);

  /* 切换过程：复位到初始状态（track[0] / initialMetrics）并暂停 */
  useEffect(() => {
    timeRef.current = 0;
    stepRef.current = 0;
    totalRef.current = total;
    boundariesRef.current = boundaries;
    stepCountRef.current = process?.steps.length ?? 0;
    lastRef.current = null;
    setTime(0);
    setPlaying(false);
    playingRef.current = false;
  }, [process?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  /** 由时间反查当前阶段索引（暂停后拖动 / seek 后必须同步，否则上下步会跳到错误阶段） */
  const computeStep = useCallback((t: number) => {
    const b = boundariesRef.current;
    const count = stepCountRef.current;
    const end = totalRef.current;
    if (count === 0) return 0;
    if (t >= end - 1e-6) return count - 1; // 停在结尾时属于最后一步
    // 越过边界一个极小余量（逐阶段暂停停在 b[i] + ε）也算进入第 i 步
    let s = 0;
    for (let i = 1; i < count; i++) if (t >= b[i] - 1e-6) s = i;
    return s;
  }, []);

  useEffect(() => {
    const tick = (now: number) => {
      rafRef.current = requestAnimationFrame(tick);
      if (!playingRef.current) {
        lastRef.current = now;
        return;
      }
      if (lastRef.current === null) lastRef.current = now;
      const dt = ((now - lastRef.current) / 1000) * speedRef.current;
      lastRef.current = now;

      let next = timeRef.current + dt;
      const b = boundariesRef.current;
      const count = stepCountRef.current;
      const end = totalRef.current || 1e-6;
      let pausedAtBoundary = false;
      let wrapped = false;
      if (next >= end) {
        if (loopRef.current) {
          next = next % end;
          stepRef.current = 0;
          wrapped = true;
        } else {
          next = end;
          playingRef.current = false;
          setPlaying(false);
        }
      }

      // “关键步骤暂停”：在本帧内跨过某个步骤边界时停在该边界上。
      // 循环回绕的那帧不再判定，避免刚回到开头又被立刻暂停。
      if (pauseStepRef.current && !wrapped && playingRef.current) {
        for (let i = 1; i < count; i++) {
          if (timeRef.current < b[i] && next >= b[i]) {
            next = b[i] + 0.001;
            playingRef.current = false;
            setPlaying(false);
            pausedAtBoundary = true;
            break;
          }
        }
      }

      // 步骤索引（供上一步 / 下一步按钮使用）
      stepRef.current = computeStep(next);

      timeRef.current = next;
      setTime(next);
      void pausedAtBoundary;
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const seek = useCallback(
    (t: number) => {
      const clamped = Math.min(Math.max(t, 0), totalRef.current || 0);
      timeRef.current = clamped;
      stepRef.current = computeStep(clamped); // 同步阶段索引：暂停后拖动 / 跳转也保持上下步正确
      lastRef.current = null;
      setTime(clamped);
    },
    [computeStep]
  );

  const play = useCallback(() => {
    // 已播放到结尾时按播放键自动从头开始
    if (timeRef.current >= totalRef.current - 0.001) {
      timeRef.current = 0;
      stepRef.current = 0;
      setTime(0);
    }
    lastRef.current = null;
    playingRef.current = true;
    setPlaying(true);
  }, []);

  const pause = useCallback(() => {
    playingRef.current = false;
    setPlaying(false);
  }, []);

  const gotoStep = useCallback(
    (index: number) => {
      const max = Math.max((stepCountRef.current || 1) - 1, 0);
      const target = Math.min(Math.max(index, 0), max);
      seek(boundariesRef.current[target]);
    },
    [seek]
  );

  const nextStep = useCallback(() => {
    const last = Math.max((stepCountRef.current || 1) - 1, 0);
    // 已在最后一步（尤其已到结尾）时不再回跳到该步开头，停在原地
    if (stepRef.current >= last) return;
    gotoStep(stepRef.current + 1);
  }, [gotoStep]);

  const prevStep = useCallback(() => {
    const cur = stepRef.current;
    // 已在第一步开头时无处可退
    if (cur === 0 && timeRef.current <= boundariesRef.current[0] + 0.06) return;
    // 已在本阶段开头附近（含“逐阶段暂停”停在 b[i]+ε 的位置）则回到上一步，
    // 否则先回到当前阶段开头，再按一次才继续后退
    const atStart = Math.abs(timeRef.current - boundariesRef.current[cur]) < 0.06;
    gotoStep(atStart ? cur - 1 : cur);
  }, [gotoStep]);

  const api: PlayerApi = {
    scene: process ? sampleScene(process, boundaries, tracks, time) : {
      step: 0,
      local: 0,
      progress: 0,
      entities: [],
      metrics: []
    },
    time,
    total,
    playing,
    speed,
    loop,
    pauseOnStep,
    boundaries,
    play,
    pause,
    toggle: () => (playing ? pause() : play()),
    restart: () => seek(0),
    seek,
    seekProgress: (p) => seek(Math.min(Math.max(p, 0), 1) * (totalRef.current || 1)),
    gotoStep,
    nextStep,
    prevStep,
    setSpeed,
    setLoop,
    setPauseOnStep
  };

  return api;
}
