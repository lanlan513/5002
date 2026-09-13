import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRightLeft,
  Bird,
  Bone,
  Brain,
  Bug,
  CircleDot,
  Crosshair,
  Disc3,
  Eye,
  Feather,
  Fish,
  FishSymbol,
  Flame,
  Flower2,
  Footprints,
  GitFork,
  Hourglass,
  Layers,
  Leaf,
  PawPrint,
  Radiation,
  RotateCcw,
  Skull,
  Snail,
  Snowflake,
  Sparkles,
  TreePine,
  Turtle,
  Waves,
  Wind,
  X,
  Zap,
  ZoomIn,
  ZoomOut,
  type LucideIcon
} from "lucide-react";
import { api, type Era, type Organism, type Timeline, type TimelineEvent } from "./api";

export type TimelineFocus = { type: "organism" | "era"; slug: string } | null;

/* ------------------------------------------------------------------ */
/* 深时标尺：把“百万年前”映射到 log10 坐标，46 亿年压缩进一条可缩放的轴 */
/* ------------------------------------------------------------------ */
const MAX_MYA = 4600; // 地球形成
const LOG_MAX = Math.log10(MAX_MYA);
const LOG_MIN = -3.3; // ≈ 500 年前，轴的右端即“现在”
const LOG_SPAN = LOG_MAX - LOG_MIN;
const MIN_MYA = Math.pow(10, LOG_MIN);
const MAX_SCALE = 9000; // px / log10(mya)

const logOf = (mya: number) => Math.max(Math.log10(mya), LOG_MIN);

type View = { center: number; scale: number };
type Selection = { type: "era" | "organism" | "event"; slug: string } | null;

const trim = (n: number) => {
  const v = n >= 100 ? Math.round(n) : n >= 10 ? Math.round(n * 10) / 10 : Math.round(n * 100) / 100;
  return String(v);
};

const formatMya = (mya: number) => {
  if (mya >= 100) return `${trim(mya / 100)}亿年前`;
  if (mya >= 0.01) return `${trim(mya * 100)}万年前`;
  return `${trim(mya * 1e6)}年前`;
};

const formatDuration = (mya: number) => {
  if (mya >= 100) return `${trim(mya / 100)}亿年`;
  if (mya >= 0.01) return `${trim(mya * 100)}万年`;
  return `${trim(mya * 1e6)}年`;
};

const formatYears = (years: number) => {
  if (years >= 1e8) return `${trim(years / 1e8)}亿年`;
  if (years >= 1e4) return `${trim(years / 1e4)}万年`;
  return `${trim(years)}年`;
};

const organismIcons: Record<string, LucideIcon> = {
  layers: Layers,
  "circle-dot": CircleDot,
  disc: Disc3,
  bug: Bug,
  eye: Eye,
  fish: Fish,
  "fish-symbol": FishSymbol,
  leaf: Leaf,
  "tree-pine": TreePine,
  wind: Wind,
  turtle: Turtle,
  snail: Snail,
  "paw-print": PawPrint,
  bone: Bone,
  bird: Bird,
  "flower-2": Flower2,
  feather: Feather,
  waves: Waves,
  snowflake: Snowflake,
  footprints: Footprints,
  flame: Flame,
  brain: Brain
};

const categoryColors: Record<string, string> = {
  微生物: "#86e6bc",
  植物: "#8fd07f",
  无脊椎动物: "#7fb8e8",
  鱼类: "#6ea8e0",
  两栖类: "#c9b458",
  爬行类: "#b099f2",
  恐龙: "#ec8c78",
  鸟类: "#e59bc8",
  哺乳类: "#e6bd73",
  人类: "#f2f2e8"
};

const eventKindMeta: Record<TimelineEvent["kind"], { label: string; color: string; Icon: LucideIcon }> = {
  origin: { label: "起源", color: "#86e6bc", Icon: Sparkles },
  transition: { label: "转折", color: "#e6bd73", Icon: ArrowRightLeft },
  radiation: { label: "辐射演化", color: "#7fb8e8", Icon: Radiation },
  extinction: { label: "大灭绝", color: "#ec8c78", Icon: Skull },
  impact: { label: "撞击事件", color: "#e08a63", Icon: Zap }
};

/* 物种出现的缩放阈值：prominence 1 始终可见，2、3 随放大渐次浮现 */
const PROM_MIN_SCALE = [0, 0, 330, 950];

const QUICK_JUMPS = [
  { label: "生命起源", mya: 3800, span: 1.5 },
  { label: "寒武纪", mya: 541, span: 1.3 },
  { label: "恐龙时代", mya: 150, span: 1.2 },
  { label: "人类黎明", mya: 0.5, span: 1.6 }
];

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/* 视野越古老，背景越偏向岩浆色；越接近现代，越偏向生命的青绿 */
const tintFor = (center: number) => {
  const t = Math.min(1, Math.max(0, (center - LOG_MIN) / LOG_SPAN));
  const r = Math.round(lerp(12, 58, t));
  const g = Math.round(lerp(40, 30, t));
  const b = Math.round(lerp(32, 44, t));
  return `radial-gradient(circle at 50% 40%, rgba(${r}, ${g}, ${b}, .6), transparent 65%)`;
};

function TimelinePage({ onNavigate, initialFocus = null }: { onNavigate: (to: string) => void; initialFocus?: TimelineFocus }) {
  const [data, setData] = useState<Timeline | null>(null);
  const [view, setView] = useState<View>({ center: (LOG_MIN + LOG_MAX) / 2, scale: 240 });
  const [selection, setSelection] = useState<Selection>(null);
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });

  const stageRef = useRef<HTMLDivElement>(null);
  const miniRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef(view);
  const animRef = useRef(0);
  const introDoneRef = useRef(false);
  const suppressClickRef = useRef(false);
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const dragRef = useRef<{ startX: number; startCenter: number; moved: number } | null>(null);
  const pinchRef = useRef<{ center: number; scale: number; midX: number; dist: number } | null>(null);
  const initialFocusRef = useRef(initialFocus);
  const initialFocusDoneRef = useRef(false);

  const applyView = useCallback((v: View) => {
    viewRef.current = v;
    setView(v);
  }, []);

  const clampView = useCallback((v: View, w: number): View => {
    const minScale = w / (LOG_SPAN * 1.06);
    const scale = Math.min(MAX_SCALE, Math.max(minScale, v.scale));
    const half = w / (2 * scale);
    const lo = LOG_MIN + half;
    const hi = LOG_MAX - half;
    const center = lo <= hi ? Math.min(hi, Math.max(lo, v.center)) : (LOG_MIN + LOG_MAX) / 2;
    return { center, scale };
  }, []);

  const cancelAnimation = useCallback(() => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    animRef.current = 0;
  }, []);

  const animateTo = useCallback(
    (target: View, duration = 950, onComplete?: () => void) => {
      cancelAnimation();
      const w = stageRef.current?.clientWidth ?? 0;
      const from = viewRef.current;
      const t0 = performance.now();
      const step = (now: number) => {
        const t = Math.min(1, (now - t0) / duration);
        const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        applyView(
          clampView(
            {
              center: from.center + (target.center - from.center) * e,
              scale: from.scale * Math.pow(target.scale / from.scale, e)
            },
            w
          )
        );
        if (t < 1) {
          animRef.current = requestAnimationFrame(step);
        } else {
          animRef.current = 0;
          onComplete?.();
        }
      };
      animRef.current = requestAnimationFrame(step);
    },
    [applyView, clampView, cancelAnimation]
  );

  useEffect(() => {
    api.timeline().then(setData).catch(console.error);
  }, []);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      setStageSize({ width: el.clientWidth, height: el.clientHeight });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  /* 入场：从“人类黎明”缓缓拉远，直到 46 亿年全貌展开（可重入，StrictMode 安全） */
  const width = stageSize.width;
  useEffect(() => {
    if (!width || introDoneRef.current || animRef.current || initialFocusRef.current) return;
    applyView(clampView({ center: Math.log10(0.5), scale: width / 1.5 }, width));
    animateTo({ center: (LOG_MIN + LOG_MAX) / 2, scale: width / (LOG_SPAN * 1.06) }, 2400, () => {
      introDoneRef.current = true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width]);

  useEffect(() => () => cancelAnimation(), [cancelAnimation]);

  /* 窗口尺寸变化时保持视野合法 */
  useEffect(() => {
    if (!width) return;
    const clamped = clampView(viewRef.current, width);
    if (clamped.center !== viewRef.current.center || clamped.scale !== viewRef.current.scale) {
      applyView(clamped);
    }
  }, [width, clampView, applyView]);

  /* 滚轮缩放（以光标为锚点），需要非 passive 监听 */
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      introDoneRef.current = true;
      cancelAnimation();
      const rect = el.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const w = rect.width;
      const cur = viewRef.current;
      const factor = Math.exp(-e.deltaY * 0.0013);
      const scale = Math.min(MAX_SCALE, Math.max(w / (LOG_SPAN * 1.06), cur.scale * factor));
      const anchorLog = cur.center - (cx - w / 2) / cur.scale;
      applyView(clampView({ center: anchorLog + (cx - w / 2) / scale, scale }, w));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [applyView, clampView, cancelAnimation]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelection(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    introDoneRef.current = true;
    cancelAnimation();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointersRef.current.size === 2) {
      const [a, b] = [...pointersRef.current.values()];
      const rect = stageRef.current?.getBoundingClientRect();
      pinchRef.current = {
        center: viewRef.current.center,
        scale: viewRef.current.scale,
        midX: (a.x + b.x) / 2 - (rect?.left ?? 0),
        dist: Math.hypot(a.x - b.x, a.y - b.y)
      };
      dragRef.current = null;
    } else if (pointersRef.current.size === 1) {
      dragRef.current = { startX: e.clientX, startCenter: viewRef.current.center, moved: 0 };
      pinchRef.current = null;
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointersRef.current.has(e.pointerId)) return;
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const w = stageRef.current?.clientWidth ?? 0;

    if (pinchRef.current && pointersRef.current.size >= 2) {
      const [a, b] = [...pointersRef.current.values()];
      const rect = stageRef.current?.getBoundingClientRect();
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const midX = (a.x + b.x) / 2 - (rect?.left ?? 0);
      const p = pinchRef.current;
      const scale = Math.min(MAX_SCALE, Math.max(w / (LOG_SPAN * 1.06), p.scale * (dist / p.dist)));
      const anchorLog = p.center - (p.midX - w / 2) / p.scale;
      applyView(clampView({ center: anchorLog + (midX - w / 2) / scale, scale }, w));
      suppressClickRef.current = true;
      return;
    }

    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.startX;
    d.moved = Math.max(d.moved, Math.abs(dx));
    if (d.moved > 6) suppressClickRef.current = true;
    applyView(clampView({ center: d.startCenter + dx / viewRef.current.scale, scale: viewRef.current.scale }, w));
  };

  const endPointer = (e: React.PointerEvent) => {
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size < 2) pinchRef.current = null;
    if (pointersRef.current.size === 0) {
      dragRef.current = null;
      setTimeout(() => {
        suppressClickRef.current = false;
      }, 0);
    } else if (pointersRef.current.size === 1) {
      const [p] = [...pointersRef.current.values()];
      dragRef.current = { startX: p.x, startCenter: viewRef.current.center, moved: 99 };
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const w = stageRef.current?.clientWidth ?? 0;
    const cur = viewRef.current;
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      cancelAnimation();
      const step = (w * 0.12) / cur.scale;
      applyView(clampView({ center: cur.center + (e.key === "ArrowLeft" ? step : -step), scale: cur.scale }, w));
      e.preventDefault();
    } else if (e.key === "+" || e.key === "=" || e.key === "-") {
      cancelAnimation();
      const factor = e.key === "-" ? 1 / 1.35 : 1.35;
      const scale = Math.min(MAX_SCALE, Math.max(w / (LOG_SPAN * 1.06), cur.scale * factor));
      applyView(clampView({ center: cur.center, scale }, w));
      e.preventDefault();
    } else if (e.key === "0") {
      resetView();
    }
  };

  const resetView = () => {
    const w = stageRef.current?.clientWidth ?? 0;
    animateTo({ center: (LOG_MIN + LOG_MAX) / 2, scale: w / (LOG_SPAN * 1.06) }, 900);
  };

  const zoomBy = (factor: number) => {
    const w = stageRef.current?.clientWidth ?? 0;
    const cur = viewRef.current;
    const scale = Math.min(MAX_SCALE, Math.max(w / (LOG_SPAN * 1.06), cur.scale * factor));
    animateTo({ center: cur.center, scale }, 350);
  };

  const focusMya = (mya: number, span = 1.6) => {
    const w = stageRef.current?.clientWidth ?? 0;
    animateTo({ center: logOf(mya), scale: w / span }, 900);
  };

  const focusEra = (era: Era) => {
    const w = stageRef.current?.clientWidth ?? 0;
    const hi = logOf(era.start_mya);
    const lo = logOf(Math.max(era.end_mya, MIN_MYA));
    animateTo({ center: (hi + lo) / 2, scale: w / ((hi - lo) * 1.3) }, 950);
  };

  useEffect(() => {
    if (!data || !width || initialFocusDoneRef.current) return;
    const focus = initialFocusRef.current;
    initialFocusDoneRef.current = true;
    initialFocusRef.current = null;
    introDoneRef.current = true;

    if (focus?.type === "organism") {
      const organism = data.organisms.find((item) => item.slug === focus.slug);
      if (organism) {
        applyView(clampView({ center: logOf(organism.mya), scale: width / 1.4 }, width));
        setSelection({ type: "organism", slug: organism.slug });
        void api.track("organism", organism.slug);
      }
      return;
    }

    if (focus?.type === "era") {
      const era = data.eras.find((item) => item.slug === focus.slug);
      if (era) {
        const hi = logOf(era.start_mya);
        const lo = logOf(Math.max(era.end_mya, MIN_MYA));
        applyView(clampView({ center: (hi + lo) / 2, scale: width / ((hi - lo) * 1.3) }, width));
        setSelection({ type: "era", slug: era.slug });
        void api.track("era", era.slug);
      }
    }
  }, [data, width, applyView, clampView]);

  const select = (sel: NonNullable<Selection>) => {
    setSelection(sel);
    void api.track(sel.type, sel.slug);
  };

  const onMiniPointerDown = (e: React.PointerEvent) => {
    cancelAnimation();
    const apply = (clientX: number) => {
      const rect = miniRef.current?.getBoundingClientRect();
      if (!rect) return;
      const p = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      const w = stageRef.current?.clientWidth ?? 0;
      applyView(clampView({ center: LOG_MAX - p * LOG_SPAN, scale: viewRef.current.scale }, w));
    };
    apply(e.clientX);
    const move = (ev: PointerEvent) => apply(ev.clientX);
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  /* ---------------- 布局计算 ---------------- */
  const height = stageSize.height;
  const xOf = (mya: number) => width / 2 + (view.center - logOf(mya)) * view.scale;
  const axisY = Math.round(height * 0.58);
  const eraTop = Math.max(110, Math.round(height * 0.15));
  const eraHeight = 40;
  const orgLaneTops = [axisY - 52, axisY - 94, axisY - 136];
  const eventLaneTops = [axisY + 42, axisY + 88];

  const ticks = useMemo(() => {
    const out: { mya: number; major: boolean; label: boolean }[] = [];
    const minorSteps = view.scale > 520 ? [2, 3, 4, 5, 6, 7, 8, 9] : view.scale > 230 ? [2, 5] : [];
    for (let k = Math.ceil(LOG_MIN); k <= Math.floor(LOG_MAX); k++) {
      out.push({ mya: Math.pow(10, k), major: true, label: true });
      for (const m of minorSteps) {
        const v = m * Math.pow(10, k);
        if (v < MAX_MYA) out.push({ mya: v, major: false, label: view.scale > 900 });
      }
    }
    return out;
  }, [view.scale]);

  type OrgItem = { o: Organism; x: number; lane: number; showLabel: boolean; flipped: boolean };
  const organismItems = useMemo<OrgItem[]>(() => {
    if (!data || !width) return [];
    const items = data.organisms
      .filter((o) => view.scale >= (PROM_MIN_SCALE[o.prominence] ?? 0))
      .map((o) => ({ o, x: xOf(o.mya) }))
      .filter((it) => it.x > -90 && it.x < width + 90)
      .sort((a, b) => a.x - b.x);
    const laneRight: number[] = [];
    const placed: OrgItem[] = [];
    for (const it of items) {
      const labelW = it.o.name.length * 13 + 12;
      const flipped = it.x > width - 130;
      const leftEdge = flipped ? it.x - 15 - labelW - 8 : it.x - 15;
      const rightEdge = flipped ? it.x + 15 : it.x - 15 + 30 + 8 + labelW;
      let lane = -1;
      let showLabel = true;
      for (let l = 0; l < orgLaneTops.length; l++) {
        if (leftEdge > (laneRight[l] ?? -Infinity) + 8) {
          lane = l;
          break;
        }
      }
      if (lane === -1) {
        showLabel = false;
        for (let l = 0; l < orgLaneTops.length; l++) {
          if (it.x - 15 > (laneRight[l] ?? -Infinity) + 4) {
            lane = l;
            break;
          }
        }
      }
      if (lane === -1) continue;
      laneRight[lane] = showLabel ? rightEdge : it.x + 15;
      placed.push({ ...it, lane, showLabel, flipped: showLabel && flipped });
    }
    return placed;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, view, width, height]);

  type EventItem = { e: TimelineEvent; x: number; lane: number; showLabel: boolean };
  const eventItems = useMemo<EventItem[]>(() => {
    if (!data || !width) return [];
    const items = data.events
      .map((e) => ({ e, x: xOf(e.mya) }))
      .filter((it) => it.x > -60 && it.x < width + 60)
      .sort((a, b) => {
        const pa = a.e.kind === "extinction" || a.e.kind === "impact" ? 0 : 1;
        const pb = b.e.kind === "extinction" || b.e.kind === "impact" ? 0 : 1;
        return pa - pb || a.x - b.x;
      });
    const laneRight: number[] = [];
    return items.map((it) => {
      const labelW = it.e.title.length * 12 + 10;
      for (let l = 0; l < eventLaneTops.length; l++) {
        if (it.x - labelW / 2 > (laneRight[l] ?? -Infinity) + 6) {
          laneRight[l] = it.x + labelW / 2;
          return { ...it, lane: l, showLabel: true };
        }
      }
      return { ...it, lane: 0, showLabel: false };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, view, width, height]);

  /* ---------------- HUD 读数 ---------------- */
  const half = width / (2 * view.scale);
  const leftMya = Math.pow(10, view.center + half);
  const rightLog = view.center - half;
  const rightLabel = rightLog <= LOG_MIN + 0.02 ? "现在" : formatMya(Math.pow(10, rightLog));
  const spanLabel = formatDuration(leftMya - Math.pow(10, Math.max(rightLog, LOG_MIN)));
  const pxYears = Math.pow(10, view.center) * (1 - Math.pow(10, -1 / view.scale)) * 1e6;
  const zoomPct = width ? Math.round((view.scale / (width / (LOG_SPAN * 1.06))) * 100) : 100;
  const nowX = xOf(0);

  if (!data) {
    return (
      <div className="loading">
        <span className="loading-ring" /> 载入深时数据
      </div>
    );
  }

  return (
    <section className="timeline-page">
      <div
        className="tl-stage"
        ref={stageRef}
        role="application"
        aria-label="生命演化时间轴：左右拖动平移，滚轮或按钮缩放，点击时代、物种与事件查看详情"
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        onKeyDown={onKeyDown}
        onClick={() => {
          if (!suppressClickRef.current) setSelection(null);
        }}
      >
        <DeepTimeCanvas viewRef={viewRef} />
        <div className="tl-tint" style={{ background: tintFor(view.center) }} />

        <header className="tl-hud">
          <div className="tl-hud-title">
            <button
              className="back-button"
              onClick={(e) => {
                e.stopPropagation();
                onNavigate("");
              }}
            >
              <ArrowLeft size={16} /> 返回探索
            </button>
            <p className="eyebrow">DEEP TIME ATLAS · 对数深时标尺</p>
            <h1>生命演化时间轴</h1>
          </div>
          <div className="tl-hud-readout">
            <div>
              <span>视野范围</span>
              <strong>
                {formatMya(leftMya)} → {rightLabel}
              </strong>
            </div>
            <div>
              <span>视野跨度</span>
              <strong>{spanLabel}</strong>
            </div>
            <div>
              <span>像素密度</span>
              <strong>1 px ≈ {formatYears(pxYears)}</strong>
            </div>
          </div>
        </header>

        {ticks
          .filter((t) => t.major)
          .map((t) => {
            const x = xOf(t.mya);
            if (x < -1 || x > width + 1) return null;
            return <div key={`grid-${t.mya}`} className="tl-gridline" style={{ left: x }} />;
          })}

        {data.eras.map((era) => {
          const x1 = xOf(era.start_mya);
          const x2 = xOf(era.end_mya);
          const wpx = x2 - x1;
          if (x2 < -80 || x1 > width + 80) return null;
          const active = selection?.type === "era" && selection.slug === era.slug;
          return (
            <button
              key={era.slug}
              className={`tl-era${active ? " is-active" : ""}`}
              style={
                {
                  left: x1,
                  width: Math.max(wpx, 3),
                  top: eraTop,
                  height: eraHeight,
                  "--era-color": era.color
                } as React.CSSProperties
              }
              title={`${era.name} · ${formatMya(era.start_mya)}—${era.end_mya === 0 ? "现在" : formatMya(era.end_mya)}`}
              onClick={(e) => {
                e.stopPropagation();
                if (suppressClickRef.current) return;
                select({ type: "era", slug: era.slug });
              }}
            >
              {wpx > 56 && <span className="tl-era-name">{era.name}</span>}
              {wpx > 150 && <span className="tl-era-sub">{era.name_en}</span>}
            </button>
          );
        })}

        {organismItems.map(({ o, x, lane, showLabel, flipped }) => {
          const Icon = organismIcons[o.icon] ?? CircleDot;
          const top = orgLaneTops[lane];
          const active = selection?.type === "organism" && selection.slug === o.slug;
          return (
            <button
              key={o.slug}
              className={`tl-org${active ? " is-active" : ""}${flipped ? " is-flipped" : ""}`}
              style={
                {
                  left: x - 15,
                  top,
                  "--org-color": categoryColors[o.category] ?? "#9fe8c8"
                } as React.CSSProperties
              }
              title={`${o.name} · ${formatMya(o.mya)}`}
              onClick={(e) => {
                e.stopPropagation();
                if (suppressClickRef.current) return;
                select({ type: "organism", slug: o.slug });
              }}
            >
              <span className="tl-org-chip">
                <Icon size={14} strokeWidth={1.8} />
              </span>
              {showLabel && <span className="tl-org-label">{o.name}</span>}
              <i className="tl-org-stem" style={{ height: Math.max(axisY - top - 30, 8) }} />
            </button>
          );
        })}

        <div className="tl-axis" style={{ top: axisY }} />

        {ticks.map((t) => {
          const x = xOf(t.mya);
          if (x < -50 || x > width + 50) return null;
          return (
            <div key={t.mya} className={`tl-tick${t.major ? " is-major" : ""}`} style={{ left: x, top: axisY }}>
              <i />
              {t.label && <span>{formatMya(t.mya)}</span>}
            </div>
          );
        })}

        {nowX > -40 && nowX < width + 80 && (
          <div className="tl-now" style={{ left: nowX, top: axisY }}>
            <span>现在</span>
            <i />
          </div>
        )}

        {eventItems.map((it) => {
          const meta = eventKindMeta[it.e.kind];
          const active = selection?.type === "event" && selection.slug === it.e.slug;
          return (
            <button
              key={it.e.slug}
              className={`tl-event kind-${it.e.kind}${active ? " is-active" : ""}`}
              style={{ left: it.x, top: axisY, "--ev-color": meta.color } as React.CSSProperties}
              title={`${it.e.title} · ${formatMya(it.e.mya)}`}
              onClick={(e) => {
                e.stopPropagation();
                if (suppressClickRef.current) return;
                select({ type: "event", slug: it.e.slug });
              }}
            >
              <i className="tl-event-dot" />
              {it.showLabel && (
                <>
                  <i className="tl-event-stem" style={{ height: eventLaneTops[it.lane] - axisY }} />
                  <span className="tl-event-label" style={{ top: eventLaneTops[it.lane] - axisY + 5 }}>
                    {it.e.title}
                  </span>
                </>
              )}
            </button>
          );
        })}

        <div className="tl-edge tl-edge-l" />
        <div className="tl-edge tl-edge-r" />
      </div>

      <footer className="tl-dock">
        <div className="tl-minimap" ref={miniRef} onPointerDown={onMiniPointerDown} aria-hidden="true">
          {data.eras.map((era) => {
            const l = ((LOG_MAX - logOf(era.start_mya)) / LOG_SPAN) * 100;
            const r = ((LOG_MAX - logOf(era.end_mya)) / LOG_SPAN) * 100;
            return <i key={era.slug} style={{ left: `${l}%`, width: `${Math.max(r - l, 0.4)}%`, background: era.color }} />;
          })}
          {data.events
            .filter((e) => e.kind === "extinction" || e.kind === "impact")
            .map((e) => (
              <b key={e.slug} style={{ left: `${((LOG_MAX - logOf(e.mya)) / LOG_SPAN) * 100}%` }} />
            ))}
          <div
            className="tl-mini-window"
            style={{
              left: `${((LOG_MAX - (view.center + half)) / LOG_SPAN) * 100}%`,
              width: `${((2 * half) / LOG_SPAN) * 100}%`
            }}
          />
        </div>
        <div className="tl-controls">
          <div className="tl-zoom">
            <button onClick={() => zoomBy(1 / 1.5)} aria-label="缩小">
              <ZoomOut size={15} />
            </button>
            <span>{zoomPct}%</span>
            <button onClick={() => zoomBy(1.5)} aria-label="放大">
              <ZoomIn size={15} />
            </button>
            <button onClick={resetView} aria-label="复位全景">
              <RotateCcw size={14} />
            </button>
          </div>
          <div className="tl-jumps">
            <span>穿越到</span>
            {QUICK_JUMPS.map((j) => (
              <button key={j.label} onClick={() => focusMya(j.mya, j.span)}>
                {j.label}
              </button>
            ))}
          </div>
          <div className="tl-scale-note">LOG SCALE · 每格 ×10</div>
        </div>
      </footer>

      {selection && (
        <DetailPanel
          selection={selection}
          data={data}
          onClose={() => setSelection(null)}
          onSelect={select}
          onFocusEra={focusEra}
          onFocusMya={focusMya}
          onNavigate={onNavigate}
        />
      )}
    </section>
  );
}

/* ---------------- 详情面板 ---------------- */

function DetailPanel({
  selection,
  data,
  onClose,
  onSelect,
  onFocusEra,
  onFocusMya,
  onNavigate
}: {
  selection: NonNullable<Selection>;
  data: Timeline;
  onClose: () => void;
  onSelect: (sel: NonNullable<Selection>) => void;
  onFocusEra: (era: Era) => void;
  onFocusMya: (mya: number, span?: number) => void;
  onNavigate: (to: string) => void;
}) {
  if (selection.type === "era") {
    const era = data.eras.find((e) => e.slug === selection.slug);
    if (!era) return null;
    const eraOrganisms = data.organisms
      .filter((o) => o.mya <= era.start_mya && o.mya >= era.end_mya)
      .sort((a, b) => b.mya - a.mya);
    const eraEvents = data.events
      .filter((e) => e.mya <= era.start_mya && e.mya >= era.end_mya)
      .sort((a, b) => b.mya - a.mya);
    return (
      <aside className="tl-panel">
        <button className="tl-panel-close icon-button" onClick={onClose} aria-label="关闭">
          <X size={18} />
        </button>
        <p className="tl-panel-eyebrow">
          <i style={{ background: era.color }} /> 地质年代 · {era.rank}
        </p>
        <h2>
          {era.name}
          <small>{era.name_en}</small>
        </h2>
        <p className="tl-panel-range">
          {formatMya(era.start_mya)} — {era.end_mya === 0 ? "现在" : formatMya(era.end_mya)} · 持续约{" "}
          {formatDuration(era.start_mya - era.end_mya)}
        </p>
        <p className="tl-panel-tagline">{era.tagline}</p>
        <section>
          <h3>
            <Waves size={13} /> 环境特征
          </h3>
          <p>{era.environment}</p>
        </section>
        <section>
          <h3>
            <PawPrint size={13} /> 代表物种
          </h3>
          <div className="tl-panel-orgs">
            {eraOrganisms.length === 0 && <p className="tl-panel-empty">生命尚未留下明确的身影。</p>}
            {eraOrganisms.map((o) => {
              const Icon = organismIcons[o.icon] ?? CircleDot;
              return (
                <button key={o.slug} onClick={() => onSelect({ type: "organism", slug: o.slug })}>
                  <Icon size={14} />
                  <span>{o.name}</span>
                  <small>{formatMya(o.mya)}</small>
                </button>
              );
            })}
          </div>
        </section>
        <section>
          <h3>
            <Hourglass size={13} /> 重要演化事件
          </h3>
          <div className="tl-panel-events">
            {eraEvents.map((ev) => (
              <button key={ev.slug} onClick={() => onSelect({ type: "event", slug: ev.slug })}>
                <i style={{ background: eventKindMeta[ev.kind].color }} />
                <span>{ev.title}</span>
                <small>{formatMya(ev.mya)}</small>
              </button>
            ))}
          </div>
        </section>
        <div className="tl-panel-actions">
          <button onClick={() => onFocusEra(era)}>
            <Crosshair size={14} /> 聚焦这个时代
          </button>
          <button onClick={() => onNavigate(`phylogeny/era/${era.slug}`)}>
            <GitFork size={14} /> 高亮对应分支
          </button>
        </div>
      </aside>
    );
  }

  if (selection.type === "organism") {
    const o = data.organisms.find((item) => item.slug === selection.slug);
    if (!o) return null;
    const era = data.eras.find((e) => e.slug === o.era_slug);
    const Icon = organismIcons[o.icon] ?? CircleDot;
    const color = categoryColors[o.category] ?? "#9fe8c8";
    return (
      <aside className="tl-panel">
        <button className="tl-panel-close icon-button" onClick={onClose} aria-label="关闭">
          <X size={18} />
        </button>
        <p className="tl-panel-eyebrow">
          <i style={{ background: color }} /> {o.category}
        </p>
        <div className="tl-panel-orghead">
          <span className="tl-panel-orgicon" style={{ "--org-color": color } as React.CSSProperties}>
            <Icon size={22} strokeWidth={1.6} />
          </span>
          <h2>
            {o.name}
            <small>{o.latin}</small>
          </h2>
        </div>
        <p className="tl-panel-range">
          出现于 {formatMya(o.mya)}
          {era ? ` · ${era.name}` : ""}
        </p>
        <p className="tl-panel-desc">{o.description}</p>
        <div className="tl-panel-actions">
          <button onClick={() => onFocusMya(o.mya, 1.4)}>
            <Crosshair size={14} /> 在时间上定位
          </button>
          <button onClick={() => onNavigate(`phylogeny/organism/${o.slug}`)}>
            <GitFork size={14} /> 查看演化位置
          </button>
          {era && (
            <button onClick={() => onSelect({ type: "era", slug: era.slug })}>所属时代 · {era.name}</button>
          )}
        </div>
      </aside>
    );
  }

  const ev = data.events.find((item) => item.slug === selection.slug);
  if (!ev) return null;
  const meta = eventKindMeta[ev.kind];
  return (
    <aside className="tl-panel">
      <button className="tl-panel-close icon-button" onClick={onClose} aria-label="关闭">
        <X size={18} />
      </button>
      <p className="tl-panel-eyebrow">
        <i style={{ background: meta.color }} /> {meta.label}
      </p>
      <h2>{ev.title}</h2>
      <p className="tl-panel-range">{formatMya(ev.mya)}</p>
      <p className="tl-panel-desc">{ev.description}</p>
      <div className="tl-panel-actions">
        <button onClick={() => onFocusMya(ev.mya, 1.4)}>
          <Crosshair size={14} /> 在时间上定位
        </button>
      </div>
    </aside>
  );
}

/* ---------------- 深时背景：随视野视差漂移的微粒 ---------------- */

function DeepTimeCanvas({ viewRef }: { viewRef: React.MutableRefObject<View> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const particles = Array.from({ length: 120 }, (_, i) => ({
      logx: LOG_MIN + Math.random() * LOG_SPAN,
      y: Math.random(),
      depth: 0.1 + Math.random() * 0.4,
      r: 0.6 + Math.random() * 1.7,
      tw: 0.5 + Math.random() * 1.5,
      gold: i % 9 === 0
    }));

    let frame = 0;
    let raf = 0;
    const render = () => {
      const { width, height } = canvas.getBoundingClientRect();
      const ratio = Math.min(devicePixelRatio, 2);
      if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) {
        canvas.width = Math.round(width * ratio);
        canvas.height = Math.round(height * ratio);
      }
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.clearRect(0, 0, width, height);
      const view = viewRef.current;
      const t = frame * 0.016;
      const spanPx = width + 160;
      for (const p of particles) {
        let sx = (view.center - p.logx) * view.scale * p.depth + width / 2;
        sx = (((sx % spanPx) + spanPx) % spanPx) - 80;
        const alpha = 0.1 + 0.09 * Math.sin(t * p.tw + p.logx * 7);
        ctx.beginPath();
        ctx.fillStyle = p.gold ? `rgba(230, 189, 115, ${alpha + 0.06})` : `rgba(150, 230, 190, ${alpha})`;
        ctx.arc(sx, p.y * height, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      frame++;
      raf = requestAnimationFrame(render);
    };
    render();
    return () => cancelAnimationFrame(raf);
  }, [viewRef]);

  return <canvas ref={canvasRef} className="tl-canvas" aria-hidden="true" />;
}

export default TimelinePage;
