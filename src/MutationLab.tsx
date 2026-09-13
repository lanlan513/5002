import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUpRight,
  Dices,
  Dna,
  Info,
  Microscope,
  Plus,
  RotateCcw,
  X
} from "lucide-react";
import { api, type Gene } from "./api";
import {
  analyzeExpression,
  emptyEdits,
  hasEdits,
  HBB_SICKLE_PRESET,
  MUTATION_PRESETS,
  randomSubstitution,
  transcribe,
  type AlignColumn,
  type ExpressionAnalysis,
  type MutationPreset,
  type SequenceEdits
} from "./lib/expression";

/** 内置演示序列：36 bp，含起始与终止密码子，共编码 11 个氨基酸 */
const DEMO_SEQUENCE = "ATGGCTTCTGGATGCAAAGGTTATCGATTTAACTGA";

const BASE_COLORS: Record<string, string> = {
  A: "#7fe0a8",
  T: "#eec27f",
  C: "#7fb2f0",
  G: "#ef8fb0",
  U: "#c9a7f0"
};

const BASES = ["A", "T", "C", "G"] as const;

/** 可从基因库载入的序列来源（与 server 端种子数据对应） */
const GENE_SOURCES = [
  { slug: "hbb", symbol: "HBB", name: "β-珠蛋白" },
  { slug: "tp53", symbol: "TP53", name: "肿瘤蛋白 p53" },
  { slug: "ins", symbol: "INS", name: "胰岛素" },
  { slug: "cftr", symbol: "CFTR", name: "CFTR 离子通道" },
  { slug: "brca1", symbol: "BRCA1", name: "乳腺癌易感基因 1" },
  { slug: "pax6", symbol: "PAX6", name: "配对盒基因 6" },
  { slug: "sod1", symbol: "SOD1", name: "超氧化物歧化酶 1" },
  { slug: "mthfr", symbol: "MTHFR", name: "亚甲基四氢叶酸还原酶" }
];

type Source = { kind: "demo" } | { kind: "gene"; slug: string };

/** 把对齐列按正常序列的密码子分组（插入列并入其后碱基所在的组），便于分块换行展示 */
const groupColumns = (columns: AlignColumn[]): AlignColumn[][] => {
  const groups: AlignColumn[][] = [];
  let pendingInserts: AlignColumn[] = [];
  for (const column of columns) {
    if (column.kind === "ins") {
      pendingInserts.push(column);
      continue;
    }
    if (column.wtIndex !== null && column.wtIndex % 3 === 0) {
      groups.push([...pendingInserts, column]);
    } else {
      if (groups.length === 0) groups.push([]);
      groups[groups.length - 1].push(...pendingInserts, column);
    }
    pendingInserts = [];
  }
  if (pendingInserts.length > 0) groups.push([...pendingInserts]);
  return groups;
};

const toRna = (base: string | null) => (base === "T" ? "U" : base);

function MutationLab({
  geneSlug,
  onNavigate
}: {
  geneSlug?: string;
  onNavigate: (to: string) => void;
}) {
  const [source, setSource] = useState<Source>(
    geneSlug ? { kind: "gene", slug: geneSlug } : { kind: "demo" }
  );
  const [gene, setGene] = useState<Gene | null>(null);
  const [geneError, setGeneError] = useState(false);
  const [edits, setEdits] = useState<SequenceEdits>(emptyEdits);
  const [selected, setSelected] = useState<number | null>(null);

  // 路由（如从基因详情页跳入）变化时切换序列来源
  useEffect(() => {
    if (geneSlug) setSource({ kind: "gene", slug: geneSlug });
  }, [geneSlug]);

  useEffect(() => {
    if (source.kind !== "gene") return;
    setGene(null);
    setGeneError(false);
    api
      .gene(source.slug)
      .then((loaded) => {
        setGene(loaded);
        void api.track("gene", loaded.slug);
      })
      .catch(() => setGeneError(true));
  }, [source]);

  const wtSequence = source.kind === "demo" ? DEMO_SEQUENCE : gene?.sequence ?? "";

  // 序列来源变化后，所有编辑与选中状态一并复位
  useEffect(() => {
    setEdits(emptyEdits());
    setSelected(null);
  }, [wtSequence]);

  const analysis = useMemo(
    () => (wtSequence ? analyzeExpression(wtSequence, edits) : null),
    [wtSequence, edits]
  );

  const presets = useMemo(() => {
    if (!wtSequence) return [];
    const list: { preset: MutationPreset; edits: SequenceEdits }[] = [];
    // HBB 的经典点突变案例放在最前
    const candidates =
      source.kind === "gene" && source.slug === "hbb"
        ? [HBB_SICKLE_PRESET, ...MUTATION_PRESETS]
        : MUTATION_PRESETS;
    for (const preset of candidates) {
      const built = preset.build(wtSequence);
      if (built) list.push({ preset, edits: built });
    }
    return list;
  }, [wtSequence, source]);

  /* ------------------------------- 编辑操作 ------------------------------- */

  const substitute = (index: number, base: string) => {
    setEdits((current) => {
      const subs = { ...current.subs };
      if (base === wtSequence[index]) delete subs[index];
      else subs[index] = base;
      // 替换与缺失互斥：同一位置只保留一种编辑
      return { ...current, subs, dels: current.dels.filter((d) => d !== index) };
    });
  };

  const toggleDelete = (index: number) => {
    setEdits((current) => {
      const isDeleted = current.dels.includes(index);
      const subs = { ...current.subs };
      if (!isDeleted) delete subs[index];
      return {
        ...current,
        subs,
        dels: isDeleted ? current.dels.filter((d) => d !== index) : [...current.dels, index]
      };
    });
  };

  const insertBefore = (index: number, base: string) => {
    setEdits((current) => ({
      ...current,
      inserts: { ...current.inserts, [index]: (current.inserts[index] ?? "") + base }
    }));
  };

  const clearPosition = (index: number) => {
    setEdits((current) => {
      const subs = { ...current.subs };
      const inserts = { ...current.inserts };
      delete subs[index];
      delete inserts[index];
      return { ...current, subs, inserts, dels: current.dels.filter((d) => d !== index) };
    });
  };

  const editChips = useMemo(() => {
    if (!wtSequence) return [];
    const chips: { key: string; label: string; clear: () => void }[] = [];
    for (const key of Object.keys(edits.subs).map(Number).sort((a, b) => a - b)) {
      chips.push({
        key: `sub-${key}`,
        label: `替换 #${key + 1} ${wtSequence[key]}→${edits.subs[key]}`,
        clear: () => clearPosition(key)
      });
    }
    for (const index of [...edits.dels].sort((a, b) => a - b)) {
      chips.push({
        key: `del-${index}`,
        label: `缺失 #${index + 1} ${wtSequence[index]}`,
        clear: () => clearPosition(index)
      });
    }
    for (const key of Object.keys(edits.inserts).map(Number).sort((a, b) => a - b)) {
      chips.push({
        key: `ins-${key}`,
        label: `在 #${key + 1} 前插入 ${edits.inserts[key]}`,
        clear: () => clearPosition(key)
      });
    }
    return chips;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edits, wtSequence]);

  const sourceName =
    source.kind === "demo"
      ? "示例序列 · DEMO"
      : gene
        ? `${gene.symbol} · ${gene.name}`
        : "载入基因序列…";

  return (
    <div className="mutation-page">
      {/* ------------------------------- 页首 ------------------------------- */}
      <section className="mutation-hero">
        <button className="back-button" onClick={() => onNavigate("genetics")}>
          <ArrowLeft size={17} /> 返回遗传实验室
        </button>
        <p className="eyebrow">MUTATION LAB / CENTRAL DOGMA</p>
        <h1>DNA 突变与基因表达实验室</h1>
        <p className="hero-lede">
          修改一段 DNA 序列，实时观察变化如何沿「DNA → RNA → 蛋白质」传递：
          同义、错义、无义、移码——每一种突变都能在对比视图中看到它的轨迹。
        </p>
        <div className="mutation-source-bar">
          <span className="picker-label">序列来源</span>
          <div className="source-chips">
            <button
              className={`source-chip ${source.kind === "demo" ? "is-active" : ""}`}
              onClick={() => setSource({ kind: "demo" })}
            >
              <Dna size={13} /> 示例序列
            </button>
            {GENE_SOURCES.map((item) => (
              <button
                key={item.slug}
                className={`source-chip ${
                  source.kind === "gene" && source.slug === item.slug ? "is-active" : ""
                }`}
                onClick={() => setSource({ kind: "gene", slug: item.slug })}
                title={item.name}
              >
                {item.symbol}
              </button>
            ))}
          </div>
        </div>
        <p className="mutation-disclaimer">
          <Info size={14} />
          教学简化模型：仅演示信息流动的主干，所有「影响」均为可能性说明，不构成医学结论。
        </p>
      </section>

      {/* ------------------------------ 序列编辑器 ------------------------------ */}
      <section className="mutation-section mutation-editor">
        <div className="section-intro">
          <p className="eyebrow">STEP 01 / 编辑 DNA</p>
          <h2>修改正常序列</h2>
          <p>
            下面是{source.kind === "demo" ? "一段演示用" : `${sourceName} 的`}编码链片段（共{" "}
            {wtSequence.length || "--"} bp，按密码子三三分组）。点击任意碱基，替换、缺失或在它前面插入新碱基。
          </p>
        </div>

        {source.kind === "gene" && !gene && !geneError && (
          <p className="editor-hint">正在载入 {GENE_SOURCES.find((g) => g.slug === source.slug)?.symbol} 的序列片段…</p>
        )}
        {geneError && (
          <p className="editor-hint">基因序列载入失败，请检查后端服务后重试，或先使用示例序列。</p>
        )}

        {analysis && (
          <>
            <div className="editor-strip" role="list" aria-label="正常 DNA 序列，点击碱基进行编辑">
              {Array.from({ length: Math.ceil(wtSequence.length / 3) }, (_, codon) => (
                <span className="editor-codon" key={codon}>
                  {edits.inserts[codon * 3]?.split("").map((base, i) => (
                    <span className="editor-ins" key={`ins-${i}`} title={`在 #${codon * 3 + 1} 前插入的 ${base}`}>
                      +{base}
                    </span>
                  ))}
                  {wtSequence
                    .slice(codon * 3, codon * 3 + 3)
                    .split("")
                    .map((base, offset) => {
                      const index = codon * 3 + offset;
                      const sub = edits.subs[index];
                      const deleted = edits.dels.includes(index);
                      const classes = [
                        "editor-base",
                        sub ? "is-sub" : "",
                        deleted ? "is-del" : "",
                        selected === index ? "is-selected" : ""
                      ]
                        .filter(Boolean)
                        .join(" ");
                      return (
                        <button
                          key={index}
                          className={classes}
                          style={{ color: BASE_COLORS[sub ?? base] }}
                          onClick={() => setSelected(selected === index ? null : index)}
                          aria-label={`第 ${index + 1} 位碱基 ${base}，点击编辑`}
                          title={
                            deleted
                              ? `#${index + 1} ${base} · 已缺失`
                              : sub
                                ? `#${index + 1} ${base} → ${sub}`
                                : `#${index + 1} ${base}`
                          }
                        >
                          <em>{base}</em>
                          <strong>{deleted ? "—" : (sub ?? base)}</strong>
                        </button>
                      );
                    })}
                </span>
              ))}
            </div>
            <div className="editor-legend">
              <span><i className="legend-letter" />上行原始 · 下行突变后</span>
              <span><i className="legend-swatch swatch-sub" />替换</span>
              <span><i className="legend-swatch swatch-del" />缺失</span>
              <span><i className="legend-swatch swatch-ins" />插入</span>
            </div>

            <div className="editor-panel">
              {selected !== null && wtSequence[selected] ? (
                <>
                  <div className="editor-panel-head">
                    <span>
                      位置 #{selected + 1} · 第 {Math.floor(selected / 3) + 1} 个密码子的第{" "}
                      {(selected % 3) + 1} 位 · 原始碱基{" "}
                      <strong style={{ color: BASE_COLORS[wtSequence[selected]] }}>
                        {wtSequence[selected]}
                      </strong>
                    </span>
                    <button className="icon-button" aria-label="取消选择" onClick={() => setSelected(null)}>
                      <X size={15} />
                    </button>
                  </div>
                  <div className="editor-actions">
                    <div className="editor-action-row">
                      <span>替换为</span>
                      <div>
                        {BASES.map((base) => (
                          <button
                            key={base}
                            className={`base-option ${
                              edits.subs[selected] === base ? "is-active" : ""
                            }`}
                            style={{ color: BASE_COLORS[base] }}
                            disabled={edits.dels.includes(selected)}
                            onClick={() => substitute(selected, base)}
                          >
                            {base}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="editor-action-row">
                      <span>在此前插入</span>
                      <div>
                        {BASES.map((base) => (
                          <button
                            key={base}
                            className="base-option"
                            style={{ color: BASE_COLORS[base] }}
                            onClick={() => insertBefore(selected, base)}
                          >
                            <Plus size={10} />{base}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="editor-action-row">
                      <span>其他操作</span>
                      <div>
                        <button className="editor-tool" onClick={() => toggleDelete(selected)}>
                          {edits.dels.includes(selected) ? "恢复此碱基" : "缺失此碱基"}
                        </button>
                        <button className="editor-tool" onClick={() => clearPosition(selected)}>
                          清除此位置的修改
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <p className="editor-hint">
                  <Info size={14} /> 点击序列中的任意碱基开始编辑；或直接运行下面的预设突变。
                </p>
              )}
            </div>

            <div className="editor-presets">
              <div className="preset-chips">
                {presets.map(({ preset, edits: presetEdits }) => (
                  <button
                    key={preset.id}
                    className="preset-chip"
                    title={preset.story}
                    onClick={() => setEdits(presetEdits)}
                  >
                    <span className="preset-tag">{preset.tag}</span>
                    {preset.title}
                  </button>
                ))}
                <button
                  className="preset-chip is-random"
                  onClick={() => setEdits(randomSubstitution(wtSequence))}
                >
                  <Dices size={13} /> 随机点突变
                </button>
                <button
                  className="preset-chip is-reset"
                  disabled={!hasEdits(edits)}
                  onClick={() => setEdits(emptyEdits())}
                >
                  <RotateCcw size={13} /> 恢复为正常序列
                </button>
              </div>
              {editChips.length > 0 && (
                <div className="edit-chips">
                  <span className="picker-label">当前修改</span>
                  {editChips.map((chip) => (
                    <span className="edit-chip" key={chip.key}>
                      {chip.label}
                      <button aria-label={`撤销${chip.label}`} onClick={chip.clear}>
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </section>

      {/* ---------------------------- 中心法则流程 ---------------------------- */}
      {analysis && (
        <section className="mutation-section mutation-pipeline">
          <div className="section-intro">
            <p className="eyebrow">STEP 02 / 观察传递</p>
            <h2>DNA → RNA → 蛋白质</h2>
            <p>
              每一级都并排展示正常序列与突变序列，差异处以高亮标出。
              两个关键节点（转录与翻译）解释了变化如何被传递与放大。
            </p>
          </div>

          <SequenceStage
            step="①"
            title="DNA · 编码链"
            columns={analysis.columns}
            toLetter={(base) => base}
          />

          <NodeCard
            title="转录 · DNA → mRNA"
            text="RNA 聚合酶以 DNA 为模板合成信使 RNA，胸腺嘧啶（T）的位置由尿嘧啶（U）替代。序列上的每一处变化都会原样传递到 mRNA。"
            status={
              analysis.changedColumns > 0
                ? `${analysis.changedColumns} 处碱基变化已同步到 mRNA`
                : "序列未变，mRNA 与正常一致"
            }
          />

          <SequenceStage
            step="②"
            title="mRNA · 信使 RNA"
            columns={analysis.columns}
            toLetter={toRna}
          />

          <NodeCard
            title="翻译 · mRNA → 蛋白质"
            text="核糖体从起始密码子 AUG 开始，每三个碱基（一个密码子）对应一种氨基酸，直到终止密码子。这套密码子表几乎被所有生命共享。"
            status={
              analysis.classification === "none"
                ? "尚未引入突变"
                : `${analysis.classLabel} · 蛋白质${analysis.wtTranslation.protein.length} → ${analysis.mutTranslation.protein.length} 个氨基酸`
            }
          />

          <ProteinStage analysis={analysis} />
        </section>
      )}

      {/* ------------------------------ 对比视图 ------------------------------ */}
      {analysis && (
        <section className="mutation-section mutation-compare">
          <div className="section-intro">
            <p className="eyebrow">STEP 03 / 对比与解读</p>
            <h2>正常 vs 突变</h2>
            <p>逐密码子对比两条序列的表达结果，并查看本次修改的分类解读。</p>
          </div>

          <div className="compare-stats">
            <div className="stat-tile">
              <span>碱基变化</span>
              <strong>{analysis.changedColumns}</strong>
              <small>替换 + 插入 + 缺失</small>
            </div>
            <div className="stat-tile">
              <span>氨基酸变化</span>
              <strong>
                {analysis.classification === "frameshift"
                  ? "阅读框移动"
                  : analysis.aminoChanges.length}
              </strong>
              <small>同位置氨基酸不同的位点数</small>
            </div>
            <div className="stat-tile">
              <span>蛋白质长度</span>
              <strong>
                {analysis.wtTranslation.protein.length} → {analysis.mutTranslation.protein.length}
              </strong>
              <small>氨基酸个数（不含终止）</small>
            </div>
            <div className="stat-tile is-class">
              <span>突变类型</span>
              <strong>{analysis.classLabel}</strong>
              <small>基于本简化模型的分类</small>
            </div>
          </div>

          <div className={`class-card class-${analysis.classification}`}>
            <div className="class-card-head">
              <Microscope size={17} />
              <strong>{analysis.classLabel}</strong>
            </div>
            <p>{analysis.classSummary}</p>
            {analysis.notes.length > 0 && (
              <ul>
                {analysis.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            )}
          </div>

          <CodonTable analysis={analysis} />
        </section>
      )}

      {/* ------------------------------ 解读边界 ------------------------------ */}
      <section className="mutation-section mutation-caveats">
        <div className="section-intro">
          <p className="eyebrow">READ ME / 解读边界</p>
          <h2>解读这些结果时，请记住</h2>
        </div>
        <div className="caveat-grid">
          <article className="caveat-card">
            <span>01 · 简化模型</span>
            <p>
              本演示只展示信息流动的主干：转录与翻译。真实基因表达还包括启动子调控、RNA
              剪接与编辑、蛋白质折叠与修饰等步骤，每一步都可能改变最终结果。
            </p>
          </article>
          <article className="caveat-card">
            <span>02 · 变化 ≠ 疾病</span>
            <p>
              绝大多数突变是中性的，少数甚至有益——突变也是进化的原材料。
              即使蛋白质序列发生改变，也不必然影响它的功能。
            </p>
          </article>
          <article className="caveat-card">
            <span>03 · 影响取决于上下文</span>
            <p>
              同一个碱基变化，在不同基因、不同位置、不同遗传背景与环境下，
              可能产生完全不同的结果。本演示中的「可能」二字不可省略。
            </p>
          </article>
          <article className="caveat-card">
            <span>04 · 不是医学结论</span>
            <p>
              这里的一切分析仅用于理解原理。真实变异的临床意义，
              需要实验证据、群体数据与专业遗传咨询共同评估。
            </p>
          </article>
        </div>
        <div className="caveats-footer">
          <button className="text-command" onClick={() => onNavigate("mendel")}>
            继续探索：孟德尔遗传规律模拟器 <ArrowUpRight size={15} />
          </button>
        </div>
      </section>
    </div>
  );
}

/* ------------------------------ DNA / mRNA 阶段 ------------------------------ */

function SequenceStage({
  step,
  title,
  columns,
  toLetter
}: {
  step: string;
  title: string;
  columns: AlignColumn[];
  toLetter: (base: string | null) => string | null;
}) {
  const groups = groupColumns(columns);
  return (
    <div className="dogma-stage">
      <div className="stage-head">
        <span className="stage-step">{step}</span>
        <strong>{title}</strong>
      </div>
      <div className="stage-grid">
        <span className="stage-row-label is-wt">正常</span>
        <div className="stage-row">
          {groups.map((group, groupIndex) => (
            <span className="stage-codon" key={groupIndex}>
              {group.map((column, columnIndex) => (
                <span
                  key={columnIndex}
                  className={`stage-base kind-${column.kind}`}
                  style={{ color: BASE_COLORS[toLetter(column.wtBase) ?? "A"] }}
                >
                  {toLetter(column.wtBase) ?? "·"}
                </span>
              ))}
            </span>
          ))}
        </div>
        <span className="stage-row-label is-mut">突变</span>
        <div className="stage-row">
          {groups.map((group, groupIndex) => (
            <span className="stage-codon" key={groupIndex}>
              {group.map((column, columnIndex) => (
                <span
                  key={columnIndex}
                  className={`stage-base kind-${column.kind}`}
                  style={{ color: BASE_COLORS[toLetter(column.mutBase) ?? "A"] }}
                >
                  {toLetter(column.mutBase) ?? "·"}
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------- 关键节点卡片 ------------------------------- */

function NodeCard({ title, text, status }: { title: string; text: string; status: string }) {
  return (
    <div className="dogma-connector">
      <span className="connector-arrow">
        <ArrowDown size={15} />
      </span>
      <div className="connector-card">
        <strong>{title}</strong>
        <p>{text}</p>
        <span className="connector-status">{status}</span>
      </div>
    </div>
  );
}

/* -------------------------------- 蛋白质阶段 -------------------------------- */

function ProteinStage({ analysis }: { analysis: ExpressionAnalysis }) {
  const { wtTranslation, mutTranslation } = analysis;
  const renderTrack = (translation: typeof wtTranslation, other: typeof wtTranslation) => (
    <div className="protein-track">
      {translation.codons.map((codon) => {
        const counterpart = other.codons[codon.index];
        const changed = !counterpart || counterpart.amino.code !== codon.amino.code;
        return (
          <span
            key={codon.index}
            className={`codon-chip ${codon.amino.isStop ? "is-stop" : ""} ${changed ? "is-changed" : ""}`}
            title={`第 ${codon.index + 1} 个密码子 ${transcribe(codon.dna)}`}
          >
            <small>{codon.index + 1}</small>
            <em>{transcribe(codon.dna)}</em>
            <strong>{codon.amino.name}</strong>
          </span>
        );
      })}
      {translation.remainder > 0 && (
        <span className="codon-remainder">末端余 {translation.remainder} 碱基</span>
      )}
      {!translation.stopped && (
        <span className="codon-remainder">…片段末端，未遇终止</span>
      )}
    </div>
  );

  return (
    <div className="dogma-stage is-protein">
      <div className="stage-head">
        <span className="stage-step">③</span>
        <strong>蛋白质 · 氨基酸链</strong>
      </div>
      <div className="stage-grid">
        <span className="stage-row-label is-wt">正常</span>
        {renderTrack(wtTranslation, mutTranslation)}
        <span className="stage-row-label is-mut">突变</span>
        {mutTranslation.codons.length > 0 ? (
          renderTrack(mutTranslation, wtTranslation)
        ) : (
          <p className="protein-empty">突变序列没有可翻译的密码子。</p>
        )}
      </div>
    </div>
  );
}

/* ------------------------------- 密码子对比表 ------------------------------- */

function CodonTable({ analysis }: { analysis: ExpressionAnalysis }) {
  const { wtTranslation, mutTranslation } = analysis;
  const rowCount = Math.max(wtTranslation.codons.length, mutTranslation.codons.length);
  const rows = Array.from({ length: rowCount }, (_, index) => {
    const wt = wtTranslation.codons[index];
    const mut = mutTranslation.codons[index];
    let change = "—";
    if (wt && !mut) change = "缺失";
    else if (!wt && mut) change = "新增";
    else if (wt && mut) {
      if (wt.amino.code !== mut.amino.code) {
        change = mut.amino.isStop ? "提前终止" : wt.amino.isStop ? "终止丢失" : "错义";
      } else if (wt.dna !== mut.dna) {
        change = "同义";
      }
    }
    return { index, wt, mut, change };
  });

  return (
    <div className="codon-table-wrap">
      <table className="codon-table">
        <thead>
          <tr>
            <th>#</th>
            <th>正常密码子</th>
            <th>正常氨基酸</th>
            <th>突变密码子</th>
            <th>突变氨基酸</th>
            <th>变化</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.index} className={row.change === "—" ? "" : "is-changed"}>
              <td>{row.index + 1}</td>
              <td>
                {row.wt ? (
                  <CodonLetters dna={row.wt.dna} />
                ) : (
                  <span className="codon-none">—</span>
                )}
              </td>
              <td>{row.wt?.amino.name ?? "—"}</td>
              <td>
                {row.mut ? (
                  <CodonLetters dna={row.mut.dna} />
                ) : (
                  <span className="codon-none">—</span>
                )}
              </td>
              <td>{row.mut?.amino.name ?? "—"}</td>
              <td>
                <span className={`change-tag change-${row.change === "—" ? "none" : "diff"}`}>
                  {row.change}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CodonLetters({ dna }: { dna: string }) {
  return (
    <span className="codon-letters">
      {dna.split("").map((base, index) => (
        <i key={index} style={{ color: BASE_COLORS[base] }}>
          {base}
        </i>
      ))}
    </span>
  );
}

export default MutationLab;
