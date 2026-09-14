import { ChevronLeft, ChevronRight } from "lucide-react";

/** 数字分页：数据量增长后仍然可用（页码窗口 + 首尾页） */
export function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  onPage
}: {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPage: (page: number) => void;
}) {
  if (total === 0) return null;

  const pageWindow = (): number[] => {
    const start = Math.max(1, Math.min(page - 2, totalPages - 4));
    const end = Math.min(totalPages, start + 4);
    const pages: number[] = [];
    for (let index = start; index <= end; index += 1) pages.push(index);
    return pages;
  };

  const rangeStart = (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(total, page * pageSize);

  return (
    <nav className="pagination" aria-label="结果分页">
      <span className="pagination-range">
        {rangeStart}–{rangeEnd} / 共 {total} 条
      </span>
      <div className="pagination-pages">
        <button disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="上一页">
          <ChevronLeft size={16} />
        </button>
        {pageWindow()[0] > 1 && (
          <>
            <button onClick={() => onPage(1)}>1</button>
            {pageWindow()[0] > 2 && <span className="pagination-gap">…</span>}
          </>
        )}
        {pageWindow().map((value) => (
          <button key={value} className={value === page ? "is-current" : ""} onClick={() => onPage(value)} aria-current={value === page ? "page" : undefined}>
            {value}
          </button>
        ))}
        {pageWindow()[pageWindow().length - 1] < totalPages && (
          <>
            {pageWindow()[pageWindow().length - 1] < totalPages - 1 && <span className="pagination-gap">…</span>}
            <button onClick={() => onPage(totalPages)}>{totalPages}</button>
          </>
        )}
        <button disabled={page >= totalPages} onClick={() => onPage(page + 1)} aria-label="下一页">
          <ChevronRight size={16} />
        </button>
      </div>
    </nav>
  );
}
