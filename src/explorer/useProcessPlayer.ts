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
      let s = 0;
      for (let i = 0; i < count; i++) if (next >= b[i]) s = i;
      if (next >= end) s = count - 1;
      stepRef.current = s;

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
      lastRef.current = null;
      setTime(clamped);
    },
    []
  );

  const play = useCallback(() => {
    // 已播放到结尾时按播放键自动从头开始
    if (timeRef.current >= totalRef.current - 0.001) {
      timeRef.current = 0;
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
    gotoStep: (index) => seek(boundaries[Math.min(Math.max(index, 0), (process?.steps.length ?? 1) - 1)]),
    nextStep: () => {
      const nextIndex = Math.min(stepRef.current + 1, (process?.steps.length ?? 1) - 1);
      seek(boundaries[nextIndex]);
    },
    prevStep: () => {
      // 已在步骤开头则回到上一步，否则回到当前步骤开头
      const cur = stepRef.current;
      const atStart = Math.abs(timeRef.current - boundaries[cur]) < 0.05;
      seek(boundaries[atStart ? Math.max(cur - 1, 0) : cur]);
    },
    setSpeed,
    setLoop,
    setPauseOnStep
  };

  return api;
}
