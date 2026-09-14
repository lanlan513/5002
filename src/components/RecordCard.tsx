import { ArrowUpRight } from "lucide-react";
import type { BioRecord, CategoryMeta } from "../../shared/contract";
import { formatDate } from "../lib/url";
import { CategoryIcon } from "./CategoryIcon";

export function RecordCard({
  record,
  category,
  onOpen
}: {
  record: BioRecord;
  category?: CategoryMeta;
  onOpen: (id: string) => void;
}) {
  const meta = category;
  return (
    <button className="record-card" onClick={() => onOpen(record.id)}>
      <div className="record-card-top">
        <span className={`record-badge cat-${record.category}`} style={meta ? { color: meta.color } : undefined}>
          <CategoryIcon name={meta?.icon ?? "circle-dot"} size={13} />
          {meta?.name ?? record.category}
        </span>
        <span className="record-type">{record.dataType}</span>
      </div>
      <h3>{record.name}</h3>
      {record.latinName && <p className="record-latin">{record.latinName}</p>}
      <p className="record-summary">{record.summary}</p>
      <div className="record-tags">
        {record.themes.slice(0, 3).map((theme) => (
          <span key={theme}>{theme}</span>
        ))}
      </div>
      <div className="record-card-foot">
        <span>{record.taxonomy.kingdom}</span>
        <time dateTime={new Date(record.updatedAt).toISOString()}>更新 {formatDate(record.updatedAt)}</time>
        <ArrowUpRight size={15} className="record-arrow" />
      </div>
    </button>
  );
}
