import {
  CircleDot,
  GitFork,
  HeartPulse,
  Leaf,
  Network,
  type LucideIcon
} from "lucide-react";

/** 与服务端 categories.icon 对应的图标表（前端唯一映射处） */
const iconMap: Record<string, LucideIcon> = {
  leaf: Leaf,
  "git-fork": GitFork,
  "circle-dot": CircleDot,
  network: Network,
  "heart-pulse": HeartPulse
};

export function CategoryIcon({ name, size = 18, strokeWidth = 1.7 }: { name: string; size?: number; strokeWidth?: number }) {
  const Icon = iconMap[name] ?? CircleDot;
  return <Icon size={size} strokeWidth={strokeWidth} />;
}
