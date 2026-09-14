import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCircle2,
  Lightbulb,
  Lock,
  RotateCcw,
  Send,
  XCircle
} from "lucide-react";
import { api, type ChallengeProgress } from "./api";
import {
  answerOf,
  buildOptions,
  buildSolutionSteps,
  CHALLENGE_LEVELS,
  CHALLENGE_QUESTIONS,
  isLevelUnlocked,
  questionsOfLevel,
  type ChallengeQuestion
} from "./lib/challenges";
import { formatGeno, runCross, type PunnettCell } from "./lib/genetics";
import { CellInspector, GameteSummary, ProbabilityPanel, PunnettBoard } from "./PunnettBoard";

/** 本地合并一次作答记录，使「下一题」的解锁状态不必等待服务器返回 */
const mergeAttempt = (
  progress: ChallengeProgress[],
  questionId: string,
  correct: boolean
): ChallengeProgress[] => {
  const existing = progress.find((item) => item.questionId === questionId);
  if (!existing) {
    return [
      ...progress,
      { questionId, attempts: 1, solved: correct ? 1 : 0, lastAt: new Date().toISOString() }
    ];
  }
  return progress.map((item) =>
    item.questionId === questionId
      ? { ...item, attempts: item.attempts + 1, solved: Math.max(item.solved, correct ? 1 : 0) }
      : item
  );
};

const formatTime = (iso: string): string => {
  const date = new Date(iso.includes("Z") || iso.includes("+") ? iso : `${iso.replace(" ", "T")}Z`);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getMonth() + 1}月${date.getDate()}日 ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

function ChallengeMode({ onNavigate }: { onNavigate: (to: string) => void }) {
  const [progress, setProgress] = useState<ChallengeProgress[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    api.challengeProgress().then(setProgress).catch(console.error);
  }, []);

  const solvedIds = useMemo(
    () => new Set(progress.filter((item) => item.solved > 0).map((item) => item.questionId)),
    [progress]
  );
  const progressById = useMemo(
    () => new Map(progress.map((item) => [item.questionId, item])),
    [progress]
  );

  const recordAttempt = (question: ChallengeQuestion, selected: string, correct: boolean) => {
    setProgress((current) => mergeAttempt(current, question.id, correct));
    void api
      .recordChallenge({ questionId: question.id, level: question.level, correct, selected })
      .then(() => api.challengeProgress().then(setProgress))
      .catch(console.error);
  };

  const openQuestion = (id: string | null) => {
    setActiveId(id);
    window.scrollTo({ top: 0 });
  };

  const activeQuestion = CHALLENGE_QUESTIONS.find((question) => question.id === activeId) ?? null;

  if (activeQuestion) {
    const activeIndex = CHALLENGE_QUESTIONS.findIndex((question) => question.id === activeQuestion.id);
    const next = CHALLENGE_QUESTIONS[activeIndex + 1] ?? null;
    return (
      <ChallengeRunner
        key={activeQuestion.id}
        question={activeQuestion}
        solved={solvedIds.has(activeQuestion.id)}
        next={next && isLevelUnlocked(next.level, solvedIds) ? next : null}
        onBack={() => openQuestion(null)}
        onOpenQuestion={openQuestion}
        recordAttempt={recordAttempt}
      />
    );
  }

  const totalAttempts = progress.reduce((sum, item) => sum + item.attempts, 0);
  const currentLevel =
    CHALLENGE_LEVELS.find(
      (level) => !questionsOfLevel(level.level).every((question) => solvedIds.has(question.id))
    )?.level ?? CHALLENGE_LEVELS.length;
  const solvedLog = CHALLENGE_QUESTIONS.filter((question) => solvedIds.has(question.id));

  return (
    <div className="challenge-page">
      <section className="mendel-hero challenge-hero">
        <button className="back-button" onClick={() => onNavigate("genetics")}>
          <ArrowLeft size={17} /> 返回遗传实验室
        </button>
        <p className="eyebrow">GENETICS CHALLENGE / 挑战模式</p>
        <h1>遗传学挑战模式</h1>
        <p className="hero-lede">
          系统给出亲本条件，由你预测后代的结果。提交答案后不只是对错——
          正确概率、遗传棋盘格与完整推导过程会一并展开。
          从单基因遗传开始，逐级解锁更复杂的杂交实验。
        </p>
        <div className="genetics-stats challenge-stats">
          <div>
            <span>已完成实验</span>
            <strong>
              {String(solvedIds.size).padStart(2, "0")}
              <small>/ {CHALLENGE_QUESTIONS.length}</small>
            </strong>
          </div>
          <div>
            <span>当前等级</span>
            <strong>Lv.{currentLevel}</strong>
          </div>
          <div>
            <span>累计提交</span>
            <strong>{totalAttempts}</strong>
          </div>
        </div>
      </section>

      <section className="challenge-levels">
        {CHALLENGE_LEVELS.map((level) => {
          const questions = questionsOfLevel(level.level);
          const unlocked = isLevelUnlocked(level.level, solvedIds);
          const solvedCount = questions.filter((question) => solvedIds.has(question.id)).length;
          return (
            <div className={`challenge-level ${unlocked ? "" : "is-locked"}`} key={level.level}>
              <div className="challenge-level-head">
                <span className="level-badge">LEVEL {level.level}</span>
                <h2>{level.name}</h2>
                <span className="level-progress">
                  {unlocked ? `已完成 ${solvedCount} / ${questions.length}` : "通关上一等级后解锁"}
                </span>
                <p>{level.description}</p>
              </div>
              <div className="challenge-grid">
                {questions.map((question) => {
                  const index = CHALLENGE_QUESTIONS.indexOf(question);
                  const record = progressById.get(question.id);
                  const solved = solvedIds.has(question.id);
                  return (
                    <button
                      key={question.id}
                      className={`challenge-card ${solved ? "is-solved" : ""}`}
                      disabled={!unlocked}
                      onClick={() => openQuestion(question.id)}
                    >
                      <span className="challenge-card-index">{String(index + 1).padStart(2, "0")}</span>
                      <span className="preset-tag">{question.tag}</span>
                      <strong>{question.title}</strong>
                      <p>{question.prompt}</p>
                      <span className="challenge-card-status">
                        {!unlocked ? (
                          <>
                            <Lock size={13} /> 未解锁
                          </>
                        ) : solved ? (
                          <>
                            <Check size={13} /> 已完成 · 尝试 {record?.attempts ?? 1} 次
                          </>
                        ) : (
                          <>
                            开始实验 <ArrowUpRight size={13} />
                          </>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </section>

      <section className="challenge-log">
        <div className="signal-heading">
          <div>
            <p className="eyebrow">EXPERIMENT LOG / 实验记录</p>
            <h2>已完成的实验</h2>
          </div>
        </div>
        {solvedLog.length === 0 ? (
          <p className="challenge-log-empty">还没有完成的实验。从 LEVEL 1 的第一题开始，提交一次预测吧。</p>
        ) : (
          <div className="challenge-log-list">
            {solvedLog.map((question) => {
              const record = progressById.get(question.id);
              return (
                <button
                  className="challenge-log-row"
                  key={question.id}
                  onClick={() => openQuestion(question.id)}
                >
                  <span className="log-check"><Check size={14} /></span>
                  <span className="log-level">Lv.{question.level}</span>
                  <span className="log-title">{question.title}</span>
                  <span className="log-meta">尝试 {record?.attempts ?? 1} 次</span>
                  <span className="log-meta">{record ? formatTime(record.lastAt) : ""}</span>
                  <ArrowUpRight size={15} />
                </button>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

/* --------------------------------- 答题界面 --------------------------------- */

function ChallengeRunner({
  question,
  solved,
  next,
  onBack,
  onOpenQuestion,
  recordAttempt
}: {
  question: ChallengeQuestion;
  solved: boolean;
  next: ChallengeQuestion | null;
  onBack: () => void;
  onOpenQuestion: (id: string) => void;
  recordAttempt: (question: ChallengeQuestion, selected: string, correct: boolean) => void;
}) {
  const result = useMemo(() => runCross(question.config), [question]);
  const correctLabel = useMemo(() => answerOf(question, result), [question, result]);
  const steps = useMemo(() => buildSolutionSteps(question, result), [question, result]);

  const [options, setOptions] = useState<string[]>(() => buildOptions(question, correctLabel));
  const [selected, setSelected] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [cell, setCell] = useState<PunnettCell | null>(null);
  const solutionRef = useRef<HTMLDivElement>(null);

  const traits = result.traits;
  const p1Label = traits.map((trait) => formatGeno(trait, question.config.p1[trait.id])).join(" ");
  const p2Label = traits.map((trait) => formatGeno(trait, question.config.p2[trait.id])).join(" ");
  const law = traits.length === 1 ? "基因的分离定律" : "自由组合定律";
  const isCorrect = submitted && selected !== null && options[selected] === correctLabel;

  // 提交后把展开的解答区域滚动进视野
  useEffect(() => {
    if (submitted) solutionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [submitted]);

  const submit = () => {
    if (selected === null || submitted) return;
    setSubmitted(true);
    recordAttempt(question, options[selected], options[selected] === correctLabel);
  };

  const retry = () => {
    setOptions(buildOptions(question, correctLabel));
    setSelected(null);
    setSubmitted(false);
    setCell(null);
  };

  return (
    <div className="challenge-page">
      <section className="mendel-hero challenge-hero">
        <button className="back-button" onClick={onBack}>
          <ArrowLeft size={17} /> 返回实验列表
        </button>
        <p className="eyebrow">
          LEVEL {question.level} / {question.tag}
        </p>
        <h1>{question.title}</h1>
        <p className="hero-lede">{question.story}</p>
        <div className="mendel-cross-title">
          <strong>{p1Label}</strong>
          <span className="cross-mark">×</span>
          <strong>{p2Label}</strong>
          <span className="cross-tag">{law}</span>
          {solved && (
            <span className="cross-tag cross-tag-solved">
              <Check size={11} /> 已完成
            </span>
          )}
        </div>
      </section>

      {/* 作答区 */}
      <section className="mendel-section challenge-answer">
        <div className="section-intro">
          <p className="eyebrow">QUESTION / 作出预测</p>
          <h2>{question.prompt}</h2>
          <p className="challenge-hint">
            <Lightbulb size={14} /> 提示：{question.hint}
          </p>
        </div>

        <div className="answer-options" role="radiogroup" aria-label="答案选项">
          {options.map((option, index) => {
            const isSelected = selected === index;
            const isAnswer = option === correctLabel;
            const stateClass = submitted
              ? isAnswer
                ? "is-correct"
                : isSelected
                  ? "is-wrong"
                  : "is-dim"
              : isSelected
                ? "is-selected"
                : "";
            return (
              <button
                key={option}
                role="radio"
                aria-checked={isSelected}
                className={`answer-option ${stateClass}`}
                disabled={submitted}
                onClick={() => setSelected(index)}
              >
                <span className="option-letter">{String.fromCharCode(65 + index)}</span>
                <strong>{option}</strong>
                {submitted && isAnswer && <CheckCircle2 size={17} />}
                {submitted && isSelected && !isAnswer && <XCircle size={17} />}
              </button>
            );
          })}
        </div>

        <div className="answer-actions">
          {!submitted ? (
            <button className="challenge-submit" disabled={selected === null} onClick={submit}>
              提交答案 <Send size={14} />
            </button>
          ) : (
            <>
              <button className="challenge-secondary" onClick={retry}>
                <RotateCcw size={13} /> 重新作答
              </button>
              {next && (
                <button className="challenge-submit" onClick={() => onOpenQuestion(next.id)}>
                  下一题：{next.title} <ArrowRight size={14} />
                </button>
              )}
              <button className="challenge-secondary" onClick={onBack}>
                返回实验列表
              </button>
            </>
          )}
        </div>

        {submitted && (
          <div className={`verdict ${isCorrect ? "is-correct" : "is-wrong"}`}>
            {isCorrect ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
            <div>
              <strong>{isCorrect ? "预测正确！" : `预测偏差——正确答案是 ${correctLabel}`}</strong>
              <span>完整的推导过程、遗传棋盘格与概率统计已在下方展开。</span>
            </div>
          </div>
        )}
      </section>

      {/* 提交后展开：推导过程 + 棋盘格 + 概率统计 */}
      {submitted && (
        <div ref={solutionRef}>
          <section className="mendel-section challenge-solution">
            <div className="section-intro">
              <p className="eyebrow">SOLUTION / 推导过程</p>
              <h2>从亲本到后代的五步推导</h2>
              <p>正确答案 {correctLabel} 不是查表得来的——它从配子、棋盘格与统计中一步步推出。</p>
            </div>

            <div className="law-steps solution-steps">
              {steps.map((step, index) => (
                <article className="law-step" key={step.title}>
                  <span>步骤 {String(index + 1).padStart(2, "0")}</span>
                  <strong>{step.title}</strong>
                  <p>{step.body}</p>
                </article>
              ))}
            </div>

            <div className="gamete-strip">
              <GameteSummary title="亲本 1 产生的配子" gametes={result.columns} />
              <GameteSummary title="亲本 2 产生的配子" gametes={result.rows} />
            </div>

            <PunnettBoard result={result} traits={traits} selected={cell} onSelect={setCell} />
            <CellInspector
              cell={cell}
              traits={traits}
              denominator={result.denominator}
              columnCount={result.columns.length}
              rowCount={result.rows.length}
              onClose={() => setCell(null)}
            />
          </section>

          <section className="mendel-section challenge-probability">
            <div className="section-intro">
              <p className="eyebrow">PROBABILITY / 正确概率</p>
              <h2>后代的基因型与表型概率</h2>
              <p>共 {result.denominator} 个等概率棋盘格，下图按出现格数统计理论概率。</p>
            </div>
            <div className="probability-panels">
              <ProbabilityPanel
                title="基因型概率"
                ratio={result.genotypeRatio}
                buckets={result.genotypeBuckets}
                denominator={result.denominator}
                variant="genotype"
              />
              <ProbabilityPanel
                title="表型概率"
                ratio={result.phenotypeRatio}
                buckets={result.phenotypeBuckets}
                denominator={result.denominator}
                variant="phenotype"
              />
            </div>
            <div className="takeaway-card">
              <span className="preset-tag">本题答案 · {correctLabel}</span>
              <h3>{question.title}</h3>
              <p>{question.takeaway}</p>
              <small>点击上方棋盘格的任意一格，可以查看该后代的配子来源与结合概率。</small>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default ChallengeMode;
