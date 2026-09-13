import { useEffect, useMemo } from "react";
import { X } from "lucide-react";
import type { CellSummary } from "../types";
import { cellIcon } from "./cellIcons";

interface CompareModalProps {
  cells: CellSummary[];
  open: boolean;
  onClose: () => void;
}

export default function CompareModal({ cells, open, onClose }: CompareModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  /* 所有细胞结构的并集（保持各细胞原有顺序），用于对比表 */
  const rows = useMemo(() => {
    const map = new Map<string, { name: string; present: Set<string> }>();
    for (const cell of cells) {
      for (const organelle of cell.organelles) {
        if (!map.has(organelle.id)) map.set(organelle.id, { name: organelle.name, present: new Set() });
        map.get(organelle.id)!.present.add(cell.id);
      }
    }
    return [...map.entries()].map(([id, value]) => ({ id, ...value }));
  }, [cells]);

  if (!open) return null;

  return (
    <div
      className="compare-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="compare-card" role="dialog" aria-modal="true" aria-label="三种细胞结构对比">
        <div className="compare-head">
          <h2>三种细胞结构对比</h2>
          <button className="icon-button" onClick={onClose} aria-label="关闭对比表"><X size={19} /></button>
        </div>
        <p className="compare-tip">✓ 表示该细胞含有此结构。数据实时来自后端细胞结构库。</p>
        <table className="compare-table">
          <thead>
            <tr>
              <th>结构 / 细胞器</th>
              {cells.map((cell) => {
                const Icon = cellIcon(cell.icon);
                return (
                  <th key={cell.id}>
                    <span className="compare-cell-head"><Icon size={14} /> {cell.name}</span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.name}</td>
                {cells.map((cell) => (
                  <td key={cell.id} className="mark">
                    {row.present.has(cell.id) ? <span className="mark-yes">✓</span> : <span className="mark-no">—</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="compare-note">
          最本质的区别：原核细胞没有核膜包被的细胞核，只有拟核，细胞器也只有核糖体。
          动物细胞与植物细胞同属真核细胞，差异主要体现在细胞壁、叶绿体、液泡和中心体上。
        </div>
      </section>
    </div>
  );
}
