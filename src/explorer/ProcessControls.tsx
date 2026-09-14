import { useCallback, useRef } from "react";
import {
  Gauge,
  ListVideo,
  Pause,
  Play,
  Repeat,
  RotateCcw,
  SkipBack,
  SkipForward
} from "lucide-react";
import type { ProcessDetail } from "../types";
import { SPEEDS, type PlayerApi } from "./useProcessPlayer";

interface ProcessControlsProps {
  process: ProcessDetail;
  player: PlayerApi;
}

const formatTime = (seconds: number) => {
  const s = Math.max(0, seconds);
  const m = Math.floor(s / 60);
  const rest = (s - m * 60).toFixed(1).padStart(4, "0");
  return `${m}:${rest}`;
};

export default function ProcessControls({ process, player }: ProcessControlsProps) {
  const barRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  const seekFromClient = useCallback(
    (clientX: number) => {
      const el = barRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      player.seekProgress((clientX - rect.left) / rect.width);
    },
    [player]
  );

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    seekFromClient(event.clientX);
  };
  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (draggingRef.current) seekFromClient(event.clientX);
  };
  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = false;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  };

  const step = player.scene.step;

  return (
    <div className="process-controls">
      {/* 进度轨道：点击 / 拖拽定位，刻度对应各步骤边界（可回到任意阶段） */}
      <div
        ref={barRef}
        className="progress-track"
        role="slider"
        aria-label="过程进度"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(player.scene.progress * 100)}
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") player.prevStep();
          if (event.key === "ArrowRight") player.nextStep();
        }}
      >
        <div className="progress-fill" style={{ width: `${player.scene.progress * 100}%` }} />
        {player.boundaries.slice(1, -1).map((b, i) => (
          <span
            key={i}
            className={`progress-tick ${step > i ? "is-past" : ""} ${step === i ? "is-current" : ""}`}
            style={{ left: `${(b / player.total) * 100}%` }}
          />
        ))}
        <span className="progress-thumb" style={{ left: `${player.scene.progress * 100}%` }} />
      </div>

      <div className="controls-row">
        <div className="controls-buttons">
          <button
            className="ctrl-btn"
            onClick={player.restart}
            title="回到开始"
            aria-label="回到开始"
          >
            <RotateCcw size={15} />
          </button>
          <button
            className="ctrl-btn"
            onClick={player.prevStep}
            title="上一阶段"
            aria-label="上一阶段"
            disabled={player.time <= 0.01}
          >
            <SkipBack size={15} />
          </button>
          <button
            className="ctrl-btn ctrl-play"
            onClick={player.toggle}
            title={player.playing ? "暂停" : "播放"}
            aria-label={player.playing ? "暂停" : "播放"}
          >
            {player.playing ? <Pause size={17} /> : <Play size={17} />}
          </button>
          <button
            className="ctrl-btn"
            onClick={player.nextStep}
            title="下一阶段"
            aria-label="下一阶段"
            disabled={step >= process.steps.length - 1}
          >
            <SkipForward size={15} />
          </button>

          <span className="time-readout">
            {formatTime(player.time)} / {formatTime(player.total)}
          </span>
        </div>

        <div className="controls-options">
          <div className="speed-group" role="group" aria-label="播放速度">
            <Gauge size={13} className="speed-icon" />
            {SPEEDS.map((s) => (
              <button
                key={s}
                className={`speed-btn ${player.speed === s ? "is-active" : ""}`}
                onClick={() => player.setSpeed(s)}
                title={`${s}× 速度`}
              >
                {s}×
              </button>
            ))}
          </div>
          <button
            className={`option-btn ${player.pauseOnStep ? "is-on" : ""}`}
            onClick={() => player.setPauseOnStep(!player.pauseOnStep)}
            title="在每个关键步骤开始时自动暂停，便于逐阶段观察"
            aria-pressed={player.pauseOnStep}
          >
            <ListVideo size={13} /> 逐阶段
          </button>
          <button
            className={`option-btn ${player.loop ? "is-on" : ""}`}
            onClick={() => player.setLoop(!player.loop)}
            title="结束后循环播放"
            aria-pressed={player.loop}
          >
            <Repeat size={13} /> 循环
          </button>
        </div>
      </div>
    </div>
  );
}
