import { AlertTriangle, FileSearch, RefreshCw } from "lucide-react";

/** 全屏加载（首屏） */
export function FullPageLoading({ label = "正在加载生物数据…" }: { label?: string }) {
  return (
    <div className="state-block" role="status" aria-live="polite">
      <span className="spinner" />
      <p>{label}</p>
    </div>
  );
}

/** 卡片网格骨架屏：数据量增大后分页加载也复用 */
export function CardSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="record-grid" aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <div className="record-card skeleton-card" key={index}>
          <div className="skeleton-line w-30" />
          <div className="skeleton-line w-70" />
          <div className="skeleton-line w-100" />
          <div className="skeleton-line w-90" />
          <div className="skeleton-tags">
            <span className="skeleton-pill" />
            <span className="skeleton-pill" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** 空结果状态：展示当前条件并提供清除入口 */
export function EmptyState({
  title = "没有找到匹配的数据",
  hint = "试试减少关键词或清除部分筛选条件。",
  onReset
}: {
  title?: string;
  hint?: string;
  onReset?: () => void;
}) {
  return (
    <div className="state-block empty-state" role="status">
      <FileSearch size={40} strokeWidth={1.4} />
      <h3>{title}</h3>
      <p>{hint}</p>
      {onReset && (
        <button className="secondary-button" onClick={onReset}>
          <RefreshCw size={15} /> 清除全部条件
        </button>
      )}
    </div>
  );
}

/** 错误状态：给出原因与重试按钮（错误边界外的数据请求失败都走这里） */
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="state-block error-state" role="alert">
      <AlertTriangle size={40} strokeWidth={1.4} />
      <h3>数据加载失败</h3>
      <p>{message}</p>
      {onRetry && (
        <button className="secondary-button" onClick={onRetry}>
          <RefreshCw size={15} /> 重新加载
        </button>
      )}
    </div>
  );
}

export function InlineError({ message }: { message: string }) {
  return (
    <p className="inline-error" role="alert">
      <AlertTriangle size={14} /> {message}
    </p>
  );
}
