import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  ChevronRight,
  Dna,
  FoldVertical,
  Pause,
  Play,
  Search,
  UnfoldVertical,
  X
} from "lucide-react";
import {
  api,
  type Chromosome,
  type Gene,
  type GeneticConcept,
  type GeneticsOverview,
  type GeneticsSearchResult
} from "./api";

const SHOWCASE_SEQUENCE = "ATGCGTACGTTAGCCGGATCCTAAGCTTGGCATGCCAATCGGTA";

const BASE_COLORS: Record<string, string> = {
  A: "#7fe0a8",
  T: "#eec27f",
  C: "#7fb2f0",
  G: "#ef8fb0"
};

const BASE_NAMES: Record<string, string> = {
  A: "腺嘌呤",
  T: "胸腺嘧啶",
  C: "胞嘧啶",
  G: "鸟嘌呤"
};

const COMPLEMENT: Record<string, string> = { A: "T", T: "A", C: "G", G: "C" };

const hierarchyLadder = [
  { label: "DNA 双螺旋", scale: "分子", detail: "直径约 2 nm，碱基对的排列即遗传信息" },
  { label: "基因", scale: "片段", detail: "数千至数百万个碱基，编码蛋白质或 RNA" },
  { label: "染色体", scale: "结构", detail: "数千万至 2.5 亿碱基，DNA 的高级包装形式" },
  { label: "细胞核", scale: "细胞", detail: "直径约 6 μm，容纳全部 46 条染色体" }
];

const formatBasePairs = (value: number) => {
  if (value >= 1e8) return `${(value / 1e8).toFixed(2)} 亿`;
  if (value >= 1e4) return `${Math.round(value / 1e4)} 万`;
  return String(value);
};

const hexWithAlpha = (hex: string, alpha: number) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(3)})`;
};

type Rung = { index: number; x: number; y: number };

function DnaHelix({
  sequence,
  expanded,
  playing,
  selectedIndex,
  onSelect
}: {
  sequence: string;
  expanded: boolean;
  playing: boolean;
  selectedIndex: number | null;
  onSelect: (index: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({
    rot: 0.7,
    expandT: 0,
    dragging: false,
    lastX: 0,
    moved: 0,
    rungs: [] as Rung[]
  });
  const propsRef = useRef({ sequence, expanded, playing, selectedIndex });
  propsRef.current = { sequence, expanded, playing, selectedIndex };
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    let animation = 0;
    const render = () => {
      const canvas = canvasRef.current;
      const context = canvas?.getContext("2d");
      if (!canvas || !context) {
        animation = requestAnimationFrame(render);
        return;
      }
      const { width, height } = canvas.getBoundingClientRect();
      if (width === 0 || height === 0) {
        animation = requestAnimationFrame(render);
        return;
      }
      const ratio = Math.min(devicePixelRatio, 2);
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, width, height);

      const state = stateRef.current;
      const props = propsRef.current;
      state.expandT += ((props.expanded ? 1 : 0) - state.expandT) * 0.07;
      if (props.playing && !state.dragging) state.rot += 0.011;

      const t = state.expandT;
      const bases = props.sequence.split("");
      const count = bases.length;
      const cx = width / 2;
      const pad = 36;
      const step = (height - pad * 2) / Math.max(count - 1, 1);
      const radius = Math.min(width * 0.3, 118) * (1 + t * 0.15);
      const twist = 0.62 * (1 - t);
      const rotTerm = state.rot * (1 - t);
      // 展开终态相位为 π/2：两条骨架链分居中轴两侧，横档保持完整长度
      const flatten = t * Math.PI * 0.5;

      type StrandPoint = { x: number; y: number; z: number };
      const left: StrandPoint[] = [];
      const right: StrandPoint[] = [];
      for (let i = 0; i < count; i++) {
        const y = pad + i * step;
        const phase = i * twist + rotTerm + flatten;
        const offset = Math.sin(phase) * radius;
        const depth = Math.cos(phase);
        left.push({ x: cx + offset, y, z: depth });
        right.push({ x: cx - offset, y, z: -depth });
      }

      context.setLineDash([2, 7]);
      context.strokeStyle = "rgba(232, 244, 236, 0.07)";
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(cx, pad - 18);
      context.lineTo(cx, height - pad + 18);
      context.stroke();
      context.setLineDash([]);

      const drawBackbone = (points: StrandPoint[]) => {
        for (let i = 0; i < points.length - 1; i++) {
          const a = points[i];
          const b = points[i + 1];
          const depth = (a.z + b.z) / 2;
          context.strokeStyle = `rgba(230, 189, 115, ${(0.16 + (depth + 1) * 0.3).toFixed(3)})`;
          context.lineWidth = 1.2 + (depth + 1) * 0.9;
          context.beginPath();
          context.moveTo(a.x, a.y);
          context.lineTo(b.x, b.y);
          context.stroke();
        }
      };
      drawBackbone(left);
      drawBackbone(right);

      state.rungs = [];
      const order = bases.map((_, i) => i).sort((a, b) => left[a].z - left[b].z);
      for (const i of order) {
        const l = left[i];
        const r = right[i];
        const depth = (l.z + 1) / 2;
        const alpha = 0.28 + depth * 0.68;
        const base = bases[i];
        const comp = COMPLEMENT[base] ?? "A";
        const mx = (l.x + r.x) / 2;
        const my = (l.y + r.y) / 2;
        state.rungs.push({ index: i, x: mx, y: my });
        const isSelected = props.selectedIndex === i;

        if (isSelected) {
          context.shadowColor = BASE_COLORS[base];
          context.shadowBlur = 14;
        }
        context.lineCap = "round";
        context.lineWidth = isSelected ? 5 : 3;
        context.strokeStyle = hexWithAlpha(BASE_COLORS[base], alpha);
        context.beginPath();
        context.moveTo(l.x, l.y);
        context.lineTo(mx, my);
        context.stroke();
        context.strokeStyle = hexWithAlpha(BASE_COLORS[comp], alpha);
        context.beginPath();
        context.moveTo(mx, my);
        context.lineTo(r.x, r.y);
        context.stroke();
        context.shadowBlur = 0;

        const nodeRadius = (isSelected ? 4.6 : 2.6) + depth * 1.1;
        context.fillStyle = hexWithAlpha(BASE_COLORS[base], alpha);
        context.beginPath();
        context.arc(l.x, l.y, nodeRadius, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = hexWithAlpha(BASE_COLORS[comp], alpha);
        context.beginPath();
        context.arc(r.x, r.y, nodeRadius, 0, Math.PI * 2);
        context.fill();

        if (isSelected) {
          context.strokeStyle = "rgba(240, 250, 244, 0.85)";
          context.lineWidth = 1;
          context.beginPath();
          context.arc(mx, my, 9, 0, Math.PI * 2);
          context.stroke();
        }

        if (t > 0.4 || isSelected) {
          context.font = "10px 'DM Mono', monospace";
          const drawLetter = (point: StrandPoint, letter: string, color: string) => {
            const outside = point.x >= cx;
            context.textAlign = outside ? "left" : "right";
            context.fillStyle = color;
            context.fillText(letter, point.x + (outside ? 9 : -9), point.y + 3.5);
          };
          drawLetter(l, base, hexWithAlpha(BASE_COLORS[base], Math.min(1, alpha + 0.15)));
          drawLetter(r, comp, hexWithAlpha(BASE_COLORS[comp], Math.min(1, alpha + 0.15)));
        }
      }

      animation = requestAnimationFrame(render);
    };
    animation = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animation);
  }, []);

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const state = stateRef.current;
    state.dragging = true;
    state.lastX = event.clientX;
    state.moved = 0;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const state = stateRef.current;
    if (!state.dragging) return;
    const dx = event.clientX - state.lastX;
    state.rot += dx * 0.012;
    state.moved += Math.abs(dx);
    state.lastX = event.clientX;
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const state = stateRef.current;
    state.dragging = false;
    if (state.moved >= 8) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    let best: { index: number; distance: number } | null = null;
    for (const rung of state.rungs) {
      const distance = Math.hypot(rung.x - x, rung.y - y);
      if (distance < 22 && (!best || distance < best.distance)) {
        best = { index: rung.index, distance };
      }
    }
    if (best) onSelectRef.current(best.index);
  };

  return (
    <canvas
      ref={canvasRef}
      className="helix-canvas"
      role="img"
      aria-label="可交互的 DNA 双螺旋模型，拖动旋转，点击碱基对查看配对"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    />
  );
}

function GeneticsPage({
  sub,
  slug,
  onNavigate
}: {
  sub?: string;
  slug?: string;
  onNavigate: (to: string) => void;
}) {
  const [overview, setOverview] = useState<GeneticsOverview | null>(null);
  const [chromosome, setChromosome] = useState<(Chromosome & { genes: Gene[] }) | null>(null);
  const [gene, setGene] = useState<Gene | null>(null);
  const [spotlightGene, setSpotlightGene] = useState<Gene | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [selectedPair, setSelectedPair] = useState<number | null>(null);
  const helixStageRef = useRef<HTMLDivElement>(null);

  const level = sub === "chromosome" && slug ? "chromosome" : sub === "gene" && slug ? "gene" : "overview";

  useEffect(() => {
    api.geneticsOverview().then(setOverview).catch(console.error);
  }, []);

  useEffect(() => {
    setChromosome(null);
    setGene(null);
    if (level === "chromosome" && slug) {
      // 离开基因层时复位双螺旋：序列、工具栏标签与选中碱基一并清除
      setSpotlightGene(null);
      setSelectedPair(null);
      api.chromosome(slug).then((loaded) => {
        setChromosome(loaded);
        void api.track("chromosome", slug);
      }).catch(console.error);
      return;
    }
    if (level !== "gene") {
      setSpotlightGene(null);
      setSelectedPair(null);
      return;
    }
    if (slug) {
      api.gene(slug).then((loaded) => {
        setGene(loaded);
        setSpotlightGene(loaded);
        setSelectedPair(null);
        void api.track("gene", slug);
      }).catch(console.error);
    }
  }, [level, slug]);

  const activeSequence = spotlightGene?.sequence ?? SHOWCASE_SEQUENCE;
  const crumbChromosome = chromosome ?? (gene ? { slug: gene.chromosome_slug, name: gene.chromosome_name } : null);
  const selectedBase = selectedPair !== null ? activeSequence[selectedPair] : null;
  const selectedComplement = selectedBase ? COMPLEMENT[selectedBase] : null;
  const hydrogenBonds = selectedBase ? (selectedBase === "A" || selectedBase === "T" ? 2 : 3) : null;

  const focusHelix = (pairIndex?: number) => {
    if (pairIndex !== undefined) setSelectedPair(pairIndex);
    helixStageRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <div className="genetics-page">
      <section className="genetics-hero">
        <div className="genetics-copy">
          <button className="back-button" onClick={() => onNavigate("topic/genetics")}>
            <ArrowLeft size={17} /> 返回遗传主题
          </button>
          <p className="eyebrow">GENETICS LAB / DOUBLE HELIX</p>
          <h1>从双螺旋<br />进入遗传信息</h1>
          <p className="hero-lede">
            拖动旋转 DNA 分子，或展开成平面阶梯。点击任意碱基对，
            查看 A、T、C、G 如何互补配对；再沿着层级一路进入基因与染色体。
          </p>
          <div className="genetics-stats">
            <div>
              <span>示例染色体</span>
              <strong>{overview ? String(overview.stats.chromosomes).padStart(2, "0") : "--"}</strong>
            </div>
            <div>
              <span>收录基因</span>
              <strong>{overview ? String(overview.stats.genes).padStart(2, "0") : "--"}</strong>
            </div>
            <div>
              <span>遗传概念</span>
              <strong>{overview ? String(overview.stats.concepts).padStart(2, "0") : "--"}</strong>
            </div>
          </div>
        </div>

        <div className="helix-stage" ref={helixStageRef}>
          <div className="helix-toolbar">
            <span className="helix-sequence-label">
              <Dna size={14} />
              {spotlightGene ? `${spotlightGene.symbol} · ${spotlightGene.location}` : "示例序列 · DEMO"}
            </span>
            <div className="helix-controls">
              <button
                className="helix-control"
                onClick={() => setExpanded((value) => !value)}
                aria-label={expanded ? "收起为双螺旋" : "展开为平面阶梯"}
              >
                {expanded ? <FoldVertical size={15} /> : <UnfoldVertical size={15} />}
                {expanded ? "收起" : "展开"}
              </button>
              <button
                className="helix-control"
                onClick={() => setPlaying((value) => !value)}
                aria-label={playing ? "暂停旋转" : "恢复旋转"}
              >
                {playing ? <Pause size={15} /> : <Play size={15} />}
                {playing ? "暂停" : "旋转"}
              </button>
            </div>
          </div>
          <DnaHelix
            sequence={activeSequence}
            expanded={expanded}
            playing={playing}
            selectedIndex={selectedPair}
            onSelect={setSelectedPair}
          />
          <div className="pair-panel">
            {selectedBase && selectedComplement ? (
              <>
                <div className="pair-heading">
                  <span>第 {selectedPair! + 1} 号碱基对</span>
                  <button className="icon-button" aria-label="取消选择" onClick={() => setSelectedPair(null)}>
                    <X size={15} />
                  </button>
                </div>
                <div className="pair-bases">
                  <span className="pair-base" style={{ color: BASE_COLORS[selectedBase] }}>{selectedBase}</span>
                  <i />
                  <span className="pair-base" style={{ color: BASE_COLORS[selectedComplement] }}>{selectedComplement}</span>
                </div>
                <p>
                  {BASE_NAMES[selectedBase]}（{selectedBase}）与{BASE_NAMES[selectedComplement]}（{selectedComplement}）
                  通过 {hydrogenBonds} 个氢键配对。
                  {selectedBase === "A" || selectedBase === "T"
                    ? "A 与 T 之间总是两个氢键。"
                    : "C 与 G 之间总是三个氢键，结合更牢。"}
                </p>
              </>
            ) : (
              <>
                <div className="pair-heading"><span>碱基配对规则</span></div>
                <div className="pair-legend">
                  {(["A", "T", "C", "G"] as const).map((base) => (
                    <span key={base} style={{ color: BASE_COLORS[base] }}>
                      {base} · {BASE_NAMES[base]}
                    </span>
                  ))}
                </div>
                <p>点击螺旋上的任意横档，查看该位置的碱基配对。A≡T 两个氢键，C≡G 三个氢键。</p>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="mendel-banner">
        <div className="mendel-banner-copy">
          <p className="eyebrow">MENDEL SIMULATOR / 遗传规律</p>
          <h2>孟德尔遗传规律模拟器</h2>
          <p>
            选择亲本的基因型（AA / Aa / aa），在遗传棋盘格中追踪每一次配子结合，
            并以概率图查看后代的基因型比与表型比。内置豌豆杂交、测交、自由组合等经典案例。
          </p>
        </div>
        <button className="mendel-banner-cta" onClick={() => onNavigate("mendel")}>
          进入模拟器 <ArrowUpRight size={17} />
        </button>
      </section>

      <section className="mendel-banner mutation-banner">
        <div className="mendel-banner-copy">
          <p className="eyebrow">MUTATION LAB / 中心法则</p>
          <h2>DNA 突变与基因表达实验室</h2>
          <p>
            修改一段 DNA 序列，实时观察转录与翻译过程中的变化：同义、错义、无义、移码……
            并与正常序列逐碱基、逐密码子对比，理解碱基变化可能带来的影响。
          </p>
        </div>
        <button className="mendel-banner-cta" onClick={() => onNavigate("mutation")}>
          进入突变实验室 <ArrowUpRight size={17} />
        </button>
      </section>

      <section className="mendel-banner challenge-banner">
        <div className="mendel-banner-copy">
          <p className="eyebrow">GENETICS CHALLENGE / 挑战模式</p>
          <h2>遗传学挑战模式</h2>
          <p>
            根据系统给出的亲本条件预测后代结果。提交答案后，正确概率、遗传棋盘格与完整推导过程
            会一并展开。题目从单基因遗传逐渐加深，完成的实验会被一一记录。
          </p>
        </div>
        <button className="mendel-banner-cta" onClick={() => onNavigate("challenge")}>
          进入挑战 <ArrowUpRight size={17} />
        </button>
      </section>

      <section className="genetics-explorer">
        <div className="section-intro">
          <p className="eyebrow">HIERARCHY / 层级模型</p>
          <h2>DNA → 基因 → 染色体</h2>
          <p>同一条信息链的不同尺度。从任意一层进入，向上或向下钻取。</p>
        </div>

        <nav className="genetics-breadcrumb" aria-label="层级路径">
          <button className={level === "overview" ? "is-current" : ""} onClick={() => onNavigate("genetics")}>
            DNA 分子
          </button>
          <ChevronRight size={14} />
          <button
            className={level === "chromosome" ? "is-current" : ""}
            onClick={() => crumbChromosome && level !== "chromosome" && onNavigate(`genetics/chromosome/${crumbChromosome.slug}`)}
            disabled={!crumbChromosome}
          >
            {crumbChromosome ? crumbChromosome.name : "染色体"}
          </button>
          <ChevronRight size={14} />
          <button className={level === "gene" ? "is-current" : ""} disabled={!gene}>
            {gene ? `${gene.symbol} 基因` : "基因"}
          </button>
        </nav>

        {level === "overview" && (
          <>
            <div className="hierarchy-ladder">
              {hierarchyLadder.map((step, index) => (
                <div className="ladder-step" key={step.label}>
                  <span className="ladder-index">0{index + 1}</span>
                  <span className="ladder-scale">{step.scale}</span>
                  <strong>{step.label}</strong>
                  <p>{step.detail}</p>
                </div>
              ))}
            </div>
            <div className="chromosome-grid">
              {(overview?.chromosomes ?? []).map((item) => (
                <button
                  className="chromosome-card"
                  key={item.slug}
                  onClick={() => onNavigate(`genetics/chromosome/${item.slug}`)}
                >
                  <span className="chromosome-label">{item.short_label}</span>
                  <strong>{item.name}</strong>
                  <p>{item.description}</p>
                  <div>
                    <small>{item.gene_count.toLocaleString()} 个基因</small>
                    <small>{formatBasePairs(item.base_pairs)} 碱基对</small>
                    <ArrowUpRight size={16} />
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {level === "chromosome" && !chromosome && <Loading />}
        {level === "chromosome" && chromosome && (
          <div className="chromosome-detail">
            <header>
              <span className="chromosome-label">{chromosome.short_label}</span>
              <h3>{chromosome.name}</h3>
              <p>{chromosome.description}</p>
              <div className="chromosome-meta">
                <span>{chromosome.gene_count.toLocaleString()} 个基因</span>
                <span>{formatBasePairs(chromosome.base_pairs)} 碱基对</span>
              </div>
            </header>
            <div className="gene-list">
              {chromosome.genes.map((item) => (
                <button className="gene-row" key={item.slug} onClick={() => onNavigate(`genetics/gene/${item.slug}`)}>
                  <span className="gene-symbol">{item.symbol}</span>
                  <span className="gene-name">{item.name}</span>
                  <span className="gene-location">{item.location}</span>
                  <ArrowUpRight size={16} />
                </button>
              ))}
            </div>
          </div>
        )}

        {level === "gene" && !gene && <Loading />}
        {level === "gene" && gene && (
          <div className="gene-detail">
            <header>
              <div>
                <span className="gene-symbol-large">{gene.symbol}</span>
                <h3>{gene.name}</h3>
              </div>
              <div className="gene-actions">
                <button className="text-command" onClick={() => focusHelix()}>
                  在双螺旋中查看 <ArrowUpRight size={16} />
                </button>
                <button className="text-command" onClick={() => onNavigate(`mutation/${gene.slug}`)}>
                  在突变实验室中编辑 <ArrowUpRight size={16} />
                </button>
              </div>
            </header>
            <div className="gene-meta">
              <span>{gene.chromosome_name} · {gene.location}</span>
              <span>长度 {gene.length.toLocaleString()} bp</span>
            </div>
            <p className="gene-summary">{gene.summary}</p>
            <dl className="gene-facts">
              <div>
                <dt>功能</dt>
                <dd>{gene.function}</dd>
              </div>
              <div>
                <dt>相关性状</dt>
                <dd>{gene.trait}</dd>
              </div>
            </dl>
            <div className="sequence-block">
              <span className="sequence-title">编码序列片段（点击碱基在螺旋中定位）</span>
              <p className="sequence-strip">
                {gene.sequence.split("").map((base, index) => (
                  <button
                    key={index}
                    className={selectedPair === index ? "is-selected" : ""}
                    style={{ color: BASE_COLORS[base] }}
                    onClick={() => focusHelix(index)}
                    aria-label={`第 ${index + 1} 位碱基 ${base}`}
                  >
                    {base}
                  </button>
                ))}
              </p>
            </div>
          </div>
        )}
      </section>

      <GeneticsSearch onNavigate={onNavigate} />
    </div>
  );
}

function GeneticsSearch({ onNavigate }: { onNavigate: (to: string) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeneticsSearchResult | null>(null);
  const [activeConcept, setActiveConcept] = useState<GeneticConcept | null>(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults(null);
      setSearching(false);
      return;
    }
    setSearching(true);
    const timer = window.setTimeout(() => {
      api.geneticsSearch(trimmed)
        .then((loaded) => {
          setResults(loaded);
          setSearching(false);
        })
        .catch(() => setSearching(false));
    }, 220);
    return () => window.clearTimeout(timer);
  }, [query]);

  const hasResults = results && (results.genes.length > 0 || results.concepts.length > 0);

  return (
    <section className="genetics-search">
      <div className="signal-heading">
        <div>
          <p className="eyebrow">SEARCH / 快速定位</p>
          <h2>搜索基因与遗传概念</h2>
        </div>
      </div>
      <div className="gene-search-box">
        <Search size={19} />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="输入基因符号、名称或概念，如 TP53、胰岛素、碱基配对…"
          aria-label="搜索基因与遗传概念"
        />
        {query && (
          <button className="icon-button" aria-label="清空搜索" onClick={() => { setQuery(""); setActiveConcept(null); }}>
            <X size={17} />
          </button>
        )}
      </div>
      <div className="gene-search-results">
        {!query && <p className="search-hint">支持按基因符号、中文名称、功能描述或遗传学术语搜索。</p>}
        {query && searching && <p className="search-hint">正在检索遗传数据库…</p>}
        {query && !searching && results && !hasResults && <p className="search-hint">没有找到匹配的基因或概念。</p>}
        {hasResults && results.genes.length > 0 && (
          <div className="result-group">
            <span className="result-group-label">基因</span>
            {results.genes.map((item) => (
              <button className="result-row" key={item.slug} onClick={() => onNavigate(`genetics/gene/${item.slug}`)}>
                <span className="gene-symbol">{item.symbol}</span>
                <span className="result-main">{item.name}<small>{item.chromosome_name} · {item.location}</small></span>
                <ArrowUpRight size={16} />
              </button>
            ))}
          </div>
        )}
        {hasResults && results.concepts.length > 0 && (
          <div className="result-group">
            <span className="result-group-label">遗传概念</span>
            {results.concepts.map((concept) => (
              <button
                className="result-row"
                key={concept.slug}
                onClick={() => setActiveConcept(activeConcept?.slug === concept.slug ? null : concept)}
              >
                <span className="concept-category">{concept.category}</span>
                <span className="result-main">{concept.term}</span>
                <ChevronRight size={16} />
              </button>
            ))}
          </div>
        )}
        {activeConcept && (
          <div className="concept-card">
            <div className="concept-card-head">
              <span className="concept-category">{activeConcept.category}</span>
              <strong>{activeConcept.term}</strong>
              <button className="icon-button" aria-label="关闭概念卡片" onClick={() => setActiveConcept(null)}>
                <X size={15} />
              </button>
            </div>
            <p>{activeConcept.definition}</p>
            {activeConcept.related_gene_slug && (
              <button className="text-command" onClick={() => onNavigate(`genetics/gene/${activeConcept.related_gene_slug}`)}>
                查看相关基因 <ArrowUpRight size={15} />
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function Loading() {
  return <div className="loading"><span className="loading-ring" /> 载入遗传数据</div>;
}

export default GeneticsPage;
