import { Bug, CircleDot, Leaf, PawPrint, type LucideIcon } from "lucide-react";

const cellIcons: Record<string, LucideIcon> = {
  "paw-print": PawPrint,
  leaf: Leaf,
  bug: Bug
};

export const cellIcon = (name: string): LucideIcon => cellIcons[name] ?? CircleDot;
