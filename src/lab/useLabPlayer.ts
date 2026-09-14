import { useCallback, useEffect, useRef, useState } from "react";

/** 完整播放一次实验所需的真实秒数（1× 速度下） */
const PLAY_SECONDS = 12;

export interface LabPlayer {
  /** 当前虚拟时间 */
  time: number;
  playing: boolean;
  /** 是否已播放到结尾 */
  ended: boolean;
  speed: number;
  toggle: () => void;
  restart: () => void;
  setSpeed: (speed: number) => void;
  seek: (t: number) => void;
}

/**
 * 虚拟实验的播放时钟：rAF 驱动，把真实时间映射到实验的虚拟时长。
 * duration 为 0（无数据）时时钟静止在 0。
 */
export const useLabPlayer = (duration: number): LabPlayer => {
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const timeRef = useRef(0);
  const rafRef = useRef(0);
  const lastRef = useRef(0);

  /* duration 变化（换了一次运行）时归零 */
  useEffect(() => {
    timeRef.current = 0;
    setTime(0);
    setPlaying(false);
  }, [duration]);

  useEffect(() => {
    if (!playing || duration <= 0) return;
    lastRef.current = performance.now();
    const tick = (now: number) => {
      const dt = (now - lastRef.current) / 1000;
      lastRef.current = now;
      const next = Math.min(duration, timeRef.current + dt * speed * (duration / PLAY_SECONDS));
      timeRef.current = next;
      setTime(next);
      if (next >= duration) {
        setPlaying(false);
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing, speed, duration]);

  const toggle = useCallback(() => {
    /* 播到结尾后再按播放 = 从头再来 */
    if (timeRef.current >= duration && duration > 0) {
      timeRef.current = 0;
      setTime(0);
      setPlaying(true);
      return;
    }
    setPlaying((p) => !p);
  }, [duration]);

  const restart = useCallback(() => {
    timeRef.current = 0;
    setTime(0);
    setPlaying(true);
  }, []);

  const seek = useCallback(
    (t: number) => {
      const clamped = Math.min(duration, Math.max(0, t));
      timeRef.current = clamped;
      setTime(clamped);
    },
    [duration]
  );

  return {
    time,
    playing,
    ended: duration > 0 && time >= duration,
    speed,
    toggle,
    restart,
    setSpeed,
    seek
  };
};
