/**
 * 遗传棋盘格 / 概率统计 —— 共享展示组件
 *
 * 从孟德尔模拟器中抽出，供「孟德尔模拟器」与「遗传学挑战模式」复用：
 * 同一份 runCross 计算结果，在两个页面中渲染出完全一致的棋盘格与概率图。
 */
import { ArrowRight, Grid2x2, Info, X } from "lucide-react";
import {
  fractionOf,
  formatGeno,
  genoName,
  percentOf,
  type AlleleKind,
  type CrossResult,
  type Gamete,
  type PunnettCell,
  type StatBucket,
  type TraitDefinition
} from "./lib/genetics";

/** 按「显/隐组合」顺序分配的表型配色（最多四种，覆盖两对基因） */
export const PHENO_COLORS = ["#8ee0a8", "#e6bd73", "#7fb2f0", "#ef8fb0"];

/* --------------------------------- 配子摘要 --------------------------------- */

export function GameteSummary({ title, gametes }: { title: string; gametes: Gamete[] }) {
  return (
    <div className="gamete-summary">
      <span>{title}</span>
      <div>
        {gametes.map((gamete) => (
          <span className="gamete-pill" key={gamete.label}>
            <strong>{gamete.label}</strong>
            <small>{fractionOf(gamete.probability, gametes.length)}</small>
          </span>
        ))}
      </div>
    </div>
  );
}

/* --------------------------------- 棋盘格 --------------------------------- */

export function PunnettBoard({
  result,
  traits,
  selected,
  onSelect
}: {
  result: CrossResult;
  traits: TraitDefinition[];
  /** 不传时棋盘为纯展示模式（不响应点击） */
  selected?: PunnettCell | null;
  onSelect?: (cell: PunnettCell | null) => void;
}) {
  const colorFor = (cell: PunnettCell) =>
    PHENO_COLORS[result.phenotypeBuckets.findIndex((bucket) => bucket.key === cell.phenotypeKey)] ??
    PHENO_COLORS[0];
  const compact = result.denominator > 4;

  return (
    <div className="punnett-wrap">
      <div
        className="punnett-grid"
        style={{
          gridTemplateColumns: `84px repeat(${result.columns.length}, minmax(0, 1fr))`,
          gridTemplateRows: `72px repeat(${result.rows.length}, minmax(0, 1fr))`
        }}
      >
        <div className="punnett-corner">
          <Grid2x2 size={16} />
          <span>遗传棋盘格</span>
        </div>
        {result.columns.map((gamete) => (
          <div className="punnett-gamete is-column" key={`col-${gamete.label}`}>
            <strong>{gamete.label}</strong>
            <small>{fractionOf(gamete.probability, result.columns.length)}</small>
          </div>
        ))}
        {result.rows.map((rowGamete, rowIndex) => (
          <div key={`row-${rowGamete.label}`} className="punnett-row">
            <div className="punnett-gamete is-row">
              <strong>{rowGamete.label}</strong>
              <small>{fractionOf(rowGamete.probability, result.rows.length)}</small>
            </div>
            {result.columns.map((columnGamete, columnIndex) => {
              const cell = result.grid[rowIndex][columnIndex];
              const isSelected =
                selected?.genotypeKey === cell.genotypeKey &&
                selected.rowGamete.label === cell.rowGamete.label &&
                selected.columnGamete.label === cell.columnGamete.label;
              const color = colorFor(cell);
              return (
                <button
                  key={`${rowIndex}-${columnIndex}`}
                  className={`punnett-cell ${isSelected ? "is-selected" : ""}`}
                  style={{ "--cell-color": color } as React.CSSProperties}
                  onClick={() => onSelect?.(isSelected ? null : cell)}
                >
                  <span className="cell-geno">{cell.genotypeLabel}</span>
                  {!compact && <span className="cell-pheno">{cell.phenotypeLabel}</span>}
                  <span className="cell-dots">
                    {traits.map((trait) => (
                      <i
                        key={trait.id}
                        className={cell.phenotypeByTrait[trait.id] === "D" ? "dot-dom" : "dot-rec"}
                        title={`${trait.name}：${
                          cell.phenotypeByTrait[trait.id] === "D" ? trait.dominantTrait : trait.recessiveTrait
                        }`}
                      />
                    ))}
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <div className="punnett-legend">
        {result.phenotypeBuckets.map((bucket, index) => (
          <span key={bucket.key}>
            <i style={{ background: PHENO_COLORS[index] }} />
            {bucket.label} · {fractionOf(bucket.probability, result.denominator)}（{percentOf(bucket.probability)}）
          </span>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------- 格子推导面板 ------------------------------- */

export function CellInspector({
  cell,
  traits,
  denominator,
  columnCount,
  rowCount,
  onClose
}: {
  cell: PunnettCell | null;
  traits: TraitDefinition[];
  denominator: number;
  columnCount: number;
  rowCount: number;
  onClose: () => void;
}) {
  if (!cell) {
    return (
      <div className="cell-inspector is-empty">
        <Info size={16} />
        <p>点击棋盘格中的任意一格，查看这个后代由哪两个配子结合而来、基因型与表型分别是什么。</p>
      </div>
    );
  }
  return (
    <div className="cell-inspector">
      <div className="inspector-cross">
        <span className="inspector-gamete">{cell.columnGamete.label}</span>
        <span className="cross-mark">×</span>
        <span className="inspector-gamete">{cell.rowGamete.label}</span>
        <ArrowRight size={15} />
        <strong className="inspector-offspring">{cell.genotypeLabel}（{cell.phenotypeLabel}）</strong>
        <button className="icon-button" aria-label="关闭" onClick={onClose}>
          <X size={15} />
        </button>
      </div>
      <div className="inspector-detail">
        {traits.map((trait) => {
          const kind = cell.genotypeByTrait[trait.id];
          const pheno: AlleleKind = cell.phenotypeByTrait[trait.id];
          return (
            <div className="inspector-trait" key={trait.id}>
              <strong>{trait.name}</strong>
              <span className="inspector-geno">{formatGeno(trait, kind)}</span>
              <small>{genoName(kind)}</small>
              <span className={pheno === "D" ? "is-dom" : "is-rec"}>
                {pheno === "D" ? trait.dominantTrait : trait.recessiveTrait}
              </span>
            </div>
          );
        })}
        <p className="inspector-prob">
          结合概率 = {fractionOf(cell.columnGamete.probability, columnCount)}
          {" × "}
          {fractionOf(cell.rowGamete.probability, rowCount)}
          {" = "}
          <strong>{fractionOf(cell.probability, denominator)}（{percentOf(cell.probability)}）</strong>
        </p>
      </div>
    </div>
  );
}

/* --------------------------------- 概率面板 --------------------------------- */

export function ProbabilityPanel({
  title,
  ratio,
  buckets,
  denominator,
  variant,
  samples,
  footnote
}: {
  title: string;
  ratio: string;
  buckets: StatBucket[];
  denominator: number;
  variant: "genotype" | "phenotype";
  samples?: { count: number; phenotypeCounts: Record<string, number> } | null;
  footnote?: string | null;
}) {
  return (
    <div className={`prob-panel prob-${variant}`}>
      <header>
        <span>{title}</span>
        <strong className="ratio-readout">{ratio}</strong>
      </header>
      <div className="prob-bars">
        {buckets.map((bucket, index) => {
          const color = variant === "phenotype" ? PHENO_COLORS[index] : "#e6bd73";
          const sampleCount = samples?.phenotypeCounts[bucket.key];
          const sampleRatio = sampleCount !== undefined ? sampleCount / samples!.count : null;
          return (
            <div className="prob-row" key={bucket.key}>
              <div className="prob-row-label">
                <span className="prob-label-main">{bucket.label}</span>
                <span className="prob-label-frac">
                  {fractionOf(bucket.probability, denominator)} · {percentOf(bucket.probability)}
                </span>
              </div>
              <div className="prob-track">
                <div
                  className="prob-fill"
                  style={{ width: `${bucket.probability * 100}%`, background: color }}
                />
                {sampleRatio !== null && (
                  <div
                    className="prob-fill is-sample"
                    style={{ width: `${sampleRatio * 100}%` }}
                    title={`实际频数 ${sampleCount}/${samples!.count}`}
                  />
                )}
              </div>
              <span className="prob-count">{bucket.count}</span>
            </div>
          );
        })}
      </div>
      {variant === "genotype" && footnote && (
        <footer>{footnote}</footer>
      )}
    </div>
  );
}
