import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  Dices,
  Dna,
  RotateCcw,
  Shuffle,
  Sparkles,
  Trash2
} from "lucide-react";
import {
  buildGametes,
  fractionOf,
  formatGeno,
  GENO_OPTIONS,
  getTrait,
  percentOf,
  PRESET_CASES,
  runCross,
  sampleOffspring,
  TRAIT_CATALOG,
  type CrossConfig,
  type GenoKind,
  type PresetCase,
  type PunnettCell,
  type SampleResult,
  type StatBucket,
  type TraitDefinition
} from "./lib/genetics";
import {
  CellInspector,
  GameteSummary,
  PHENO_COLORS,
  ProbabilityPanel,
  PunnettBoard
} from "./PunnettBoard";

const SAMPLE_COUNTS = [16, 64, 256];

const DEFAULT_PRESET = PRESET_CASES[1];

const cloneConfig = (preset: PresetCase): CrossConfig => ({
  traitIds: [...preset.config.traitIds],
  p1: { ...preset.config.p1 },
  p2: { ...preset.config.p2 }
});

function MendelSimulator({ onNavigate }: { onNavigate: (to: string) => void }) {
  const [config, setConfig] = useState<CrossConfig>(() => cloneConfig(DEFAULT_PRESET));
  const [activePreset, setActivePreset] = useState<string>(DEFAULT_PRESET.id);
  const [selected, setSelected] = useState<PunnettCell | null>(null);
  const [sampleCount, setSampleCount] = useState<number>(64);
  const [samples, setSamples] = useState<SampleResult | null>(null);

  const traits = useMemo(() => config.traitIds.map(getTrait), [config.traitIds]);
  const result = useMemo(() => runCross(config), [config]);

  // 任何杂交条件变化后，逐格高亮与抽样实验都重新开始
  useEffect(() => {
    setSelected(null);
    setSamples(null);
  }, [result]);

  const applyPreset = (preset: PresetCase) => {
    setActivePreset(preset.id);
    setConfig(cloneConfig(preset));
  };

  const toggleTrait = (id: string) => {
    // 取消唯一已选性状会使性状数降为零，配置实际保持不变：
    // 此时不离开预设状态，保证卡片高亮与讲解卡始终对应当前配置
    if (config.traitIds.length === 1 && config.traitIds.includes(id)) return;
    setActivePreset("custom");
    setConfig((current) => {
      const has = current.traitIds.includes(id);
      const traitIds = has ? current.traitIds.filter((traitId) => traitId !== id) : [...current.traitIds, id];
      if (traitIds.length === 0) return current;
      const next: CrossConfig = { traitIds, p1: { ...current.p1 }, p2: { ...current.p2 } };
      if (!has) {
        next.p1[id] = "Dd";
        next.p2[id] = "Dd";
      }
      return next;
    });
  };

  const setParentGeno = (parent: "p1" | "p2", traitId: string, kind: GenoKind) => {
    setActivePreset("custom");
    setConfig((current) => ({
      ...current,
      [parent]: { ...current[parent], [traitId]: kind }
    }));
  };

  const swapParents = () => {
    setActivePreset("custom");
    setConfig((current) => ({ ...current, p1: { ...current.p2 }, p2: { ...current.p1 } }));
  };

  const p1Label = traits.map((trait) => formatGeno(trait, config.p1[trait.id])).join(" ");
  const p2Label = traits.map((trait) => formatGeno(trait, config.p2[trait.id])).join(" ");
  const law = traits.length === 1 ? "基因的分离定律" : "自由组合定律";

  // 单基因杂交时，解释「基因型概率如何合并为表型概率」
  const genotypeFootnote = useMemo(() => {
    if (traits.length !== 1) return null;
    const trait = traits[0];
    const dominant = result.genotypeBuckets.filter((bucket) => !bucket.key.includes("dd"));
    const recessive = result.genotypeBuckets.filter((bucket) => bucket.key.includes("dd"));
    if (dominant.length === 0 || recessive.length === 0) return null;
    const parts = dominant.map((bucket) => `${bucket.count} 份 ${bucket.label}`);
    return `${parts.join("、")} 都表现为${trait.dominantTrait}（共 ${dominant.reduce(
      (sum, bucket) => sum + bucket.count,
      0
    )} 份），只有 ${recessive[0].label} 表现为${trait.recessiveTrait}，故表型比为 ${result.phenotypeRatio}。`;
  }, [traits, result]);

  return (
    <div className="mendel-page">
      <section className="mendel-hero">
        <button className="back-button" onClick={() => onNavigate("genetics")}>
          <ArrowLeft size={17} /> 返回遗传实验室
        </button>
        <p className="eyebrow">MENDEL SIMULATOR / PUNNETT SQUARE</p>
        <h1>孟德尔遗传规律模拟器</h1>
        <p className="hero-lede">
          选择亲本基因型，观察减数分裂产生的配子如何在遗传棋盘格中相遇。
          不只是给出答案——每一种后代基因型与表型的概率，都能在格子里找到来源。
        </p>
        <div className="mendel-cross-title">
          <Dna size={15} />
          <strong>{p1Label}</strong>
          <span className="cross-mark">×</span>
          <strong>{p2Label}</strong>
          <span className="cross-tag">{law}</span>
        </div>
      </section>

      {/* 预设案例 */}
      <section className="mendel-section mendel-presets">
        <div className="section-intro">
          <p className="eyebrow">PRESETS / 预设案例</p>
          <h2>从孟德尔的豌豆开始</h2>
          <p>直接运行一个经典杂交，观察分离定律与自由组合定律如何在棋盘格中发生。</p>
        </div>
        <div className="preset-grid">
          {PRESET_CASES.map((preset, index) => (
            <button
              key={preset.id}
              className={`preset-card ${activePreset === preset.id ? "is-active" : ""}`}
              onClick={() => applyPreset(preset)}
            >
              <span className="preset-index">0{index + 1}</span>
              <span className="preset-tag">{preset.tag}</span>
              <strong>{preset.title}</strong>
              <p>{preset.story}</p>
              <span className="preset-run">
                运行案例 <ArrowUpRight size={14} />
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* 亲本配置 */}
      <section className="mendel-section mendel-setup">
        <div className="section-intro">
          <p className="eyebrow">SETUP / 亲本基因型</p>
          <h2>选择性状与亲本</h2>
          <p>每对基因支持显性纯合（AA）、杂合（Aa）与隐性纯合（aa）。最多同时观察两对基因。</p>
        </div>

        <div className="trait-picker">
          <span className="picker-label">观察性状</span>
          <div className="trait-chips">
            {TRAIT_CATALOG.map((trait) => {
              const active = config.traitIds.includes(trait.id);
              const disabled = !active && config.traitIds.length >= 2;
              return (
                <button
                  key={trait.id}
                  className={`trait-chip ${active ? "is-active" : ""}`}
                  disabled={disabled}
                  onClick={() => toggleTrait(trait.id)}
                  title={trait.blurb}
                >
                  <i>{trait.dominantSymbol}{trait.recessiveSymbol}</i>
                  {trait.name}
                </button>
              );
            })}
          </div>
        </div>

        <div className="parent-board">
          <ParentPanel
            label="亲本 1 · 母本 ♀"
            traits={traits}
            parent={config.p1}
            onChange={(traitId, kind) => setParentGeno("p1", traitId, kind)}
          />
          <div className="parent-middle">
            <span className="cross-mark-large">×</span>
            <button className="helix-control" onClick={swapParents}>
              <Shuffle size={13} /> 交换亲本
            </button>
          </div>
          <ParentPanel
            label="亲本 2 · 父本 ♂"
            traits={traits}
            parent={config.p2}
            onChange={(traitId, kind) => setParentGeno("p2", traitId, kind)}
          />
        </div>
      </section>

      {/* 计算过程：配子 -> 棋盘格 */}
      <section className="mendel-section mendel-process">
        <div className="section-intro">
          <p className="eyebrow">PROCESS / 计算过程</p>
          <h2>配子相遇：遗传棋盘格</h2>
          <p>
            亲本 1 的配子排在列上，亲本 2 的配子排在行上；每个格子是配子的一次随机结合。
            格内同时给出基因型与表型，点击任意格查看推导。
          </p>
        </div>

        <div className="gamete-strip">
          <GameteSummary title="亲本 1 产生的配子" gametes={result.columns} />
          <GameteSummary title="亲本 2 产生的配子" gametes={result.rows} />
        </div>

        <PunnettBoard
          result={result}
          traits={traits}
          selected={selected}
          onSelect={setSelected}
        />

        <CellInspector
          cell={selected}
          traits={traits}
          denominator={result.denominator}
          columnCount={result.columns.length}
          rowCount={result.rows.length}
          onClose={() => setSelected(null)}
        />

        <div className="law-steps">
          <article className="law-step">
            <span>步骤 01</span>
            <strong>等位基因分离</strong>
            <p>
              减数分裂时，成对的等位基因彼此分离：杂合子（如 Aa）产生 A 与 a 两种配子，
              概率各为 1/2；纯合子只产生一种配子。
            </p>
          </article>
          <article className="law-step">
            <span>步骤 02</span>
            <strong>{traits.length === 1 ? "配子随机结合" : "非等位基因自由组合"}</strong>
            <p>
              {traits.length === 1
                ? "受精时雌雄配子随机结合，棋盘格中的每一种结合都对应一个具体的后代。"
                : `两对基因互不干扰，每个亲本产生 ${result.columns.length} 种等概率配子，棋盘格共 ${result.denominator} 格。`}
            </p>
          </article>
          <article className="law-step">
            <span>步骤 03</span>
            <strong>显性决定表型</strong>
            <p>
              只要某一性状携带显性等位基因（{traits.map((t) => t.dominantSymbol).join("、")}）就表现该显性性状；
              该性状的两个等位基因都是隐性（{traits.map((t) => t.recessiveSymbol + t.recessiveSymbol).join("、")}
              ）时才表现隐性性状。
            </p>
          </article>
        </div>
      </section>

      {/* 概率图 */}
      <section className="mendel-section mendel-probability">
        <div className="section-intro">
          <p className="eyebrow">PROBABILITY / 概率统计</p>
          <h2>后代的基因型与表型</h2>
          <p>
            共 {result.denominator} 个等概率棋盘格，下图按出现格数统计理论概率。
            比例是化简后的整数比。
          </p>
        </div>

        <div className="probability-panels">
          <ProbabilityPanel
            title="基因型概率"
            ratio={result.genotypeRatio}
            buckets={result.genotypeBuckets}
            denominator={result.denominator}
            variant="genotype"
            footnote={genotypeFootnote}
          />
          <ProbabilityPanel
            title="表型概率"
            ratio={result.phenotypeRatio}
            buckets={result.phenotypeBuckets}
            denominator={result.denominator}
            variant="phenotype"
            samples={samples}
          />
        </div>

        <div className="sampler">
          <div className="sampler-head">
            <div>
              <p className="eyebrow">RANDOM MATING / 随机交配实验</p>
              <h3>理论概率 vs 实际频数</h3>
              <p>按棋盘格概率随机产生后代。样本越少，实际比例偏离理论值越多——这就是遗传漂变与抽样误差。</p>
            </div>
            <div className="sampler-actions">
              <div className="sample-counts">
                {SAMPLE_COUNTS.map((count) => (
                  <button
                    key={count}
                    className={`count-chip ${sampleCount === count ? "is-active" : ""}`}
                    onClick={() => {
                      setSampleCount(count);
                      if (samples) setSamples(sampleOffspring(result, count));
                    }}
                  >
                    {count}
                  </button>
                ))}
              </div>
              <button className="helix-control" onClick={() => setSamples(sampleOffspring(result, sampleCount))}>
                <Dices size={14} /> 随机产生 {sampleCount} 个后代
              </button>
              {samples && (
                <button className="helix-control" onClick={() => setSamples(null)}>
                  <Trash2 size={13} /> 清除
                </button>
              )}
            </div>
          </div>
          {samples && (
            <div className="sample-result">
              <span className="sample-badge">
                <Sparkles size={13} /> 本次共产生 {samples.count} 个后代
                <button className="icon-button" aria-label="重新抽样" onClick={() => setSamples(sampleOffspring(result, sampleCount))}>
                  <RotateCcw size={14} />
                </button>
              </span>
              <SampleBars buckets={result.phenotypeBuckets} samples={samples} />
            </div>
          )}
        </div>

        {activePreset !== "custom" && (
          <PresetTakeaway preset={PRESET_CASES.find((p) => p.id === activePreset)!} />
        )}
      </section>
    </div>
  );
}

/* --------------------------------- 亲本面板 --------------------------------- */

function ParentPanel({
  label,
  traits,
  parent,
  onChange
}: {
  label: string;
  traits: TraitDefinition[];
  parent: Record<string, GenoKind>;
  onChange: (traitId: string, kind: GenoKind) => void;
}) {
  const gametes = buildGametes(traits, parent);
  return (
    <div className="parent-panel">
      <span className="parent-label">{label}</span>
      <div className="parent-genes">
        {traits.map((trait) => {
          const kind = parent[trait.id];
          return (
            <div className="parent-gene-row" key={trait.id}>
              <div className="parent-gene-meta">
                <strong>{trait.name}</strong>
                <small>
                  {trait.dominantSymbol} = {trait.dominantTrait} · {trait.recessiveSymbol} = {trait.recessiveTrait}
                </small>
              </div>
              <div className="geno-toggle" role="radiogroup" aria-label={`${label} ${trait.name}基因型`}>
                {GENO_OPTIONS.map((option) => {
                  const symbol = formatGeno(trait, option.kind);
                  return (
                    <button
                      key={option.kind}
                      role="radio"
                      aria-checked={kind === option.kind}
                      className={`geno-option geno-${option.kind} ${kind === option.kind ? "is-selected" : ""}`}
                      onClick={() => onChange(trait.id, option.kind)}
                      title={option.name}
                    >
                      <i>{symbol}</i>
                      <span>{option.short}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <div className="parent-gametes">
        <span>配子</span>
        <div>
          {gametes.map((gamete) => (
            <span className="gamete-badge" key={gamete.label}>
              {gamete.label}
              <small>{fractionOf(gamete.probability, gametes.length)}</small>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* --------------------------------- 抽样柱图 --------------------------------- */

function SampleBars({ buckets, samples }: { buckets: StatBucket[]; samples: SampleResult }) {
  return (
    <div className="sample-bars">
      {buckets.map((bucket, index) => {
        const observed = samples.phenotypeCounts[bucket.key] ?? 0;
        const observedRatio = observed / samples.count;
        return (
          <div className="sample-row" key={bucket.key}>
            <span className="sample-row-label">
              <i style={{ background: PHENO_COLORS[index] }} />
              {bucket.label}
            </span>
            <div className="sample-track">
              <div className="sample-theory" style={{ width: `${bucket.probability * 100}%` }} />
              <div className="sample-observed" style={{ width: `${observedRatio * 100}%`, background: PHENO_COLORS[index] }} />
            </div>
            <span className="sample-numbers">
              实际 {observed}（{percentOf(observedRatio)}） <small>理论 {percentOf(bucket.probability)}</small>
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* -------------------------------- 预设案例结论 -------------------------------- */

function PresetTakeaway({ preset }: { preset: PresetCase }) {
  return (
    <div className="takeaway-card">
      <span className="preset-tag">{preset.tag}</span>
      <h3>{preset.title}</h3>
      <p>{preset.takeaway}</p>
      <small>切换到上面的任意预设案例，或直接修改亲本基因型继续实验。</small>
    </div>
  );
}

export default MendelSimulator;
