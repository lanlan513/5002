export type TopicSlug =
  | "cells"
  | "genetics"
  | "evolution"
  | "ecology"
  | "human-body"
  | "biotech";

export interface TopicSeed {
  slug: TopicSlug;
  name: string;
  shortName: string;
  description: string;
  color: string;
  position: number;
  icon: string;
}

export interface KnowledgeSeed {
  slug: string;
  title: string;
  summary: string;
  content: string;
  topicSlug: TopicSlug;
  scale: "molecule" | "cell" | "system" | "organism" | "biosphere";
  readTime: number;
  featured: boolean;
}

export interface EraSeed {
  slug: string;
  name: string;
  nameEn: string;
  rank: "宙" | "代";
  startMya: number;
  endMya: number;
  color: string;
  tagline: string;
  environment: string;
  position: number;
}

export interface OrganismSeed {
  slug: string;
  name: string;
  latin: string;
  mya: number;
  eraSlug: string;
  category: string;
  icon: string;
  description: string;
  prominence: number;
}

export interface TimelineEventSeed {
  slug: string;
  title: string;
  mya: number;
  kind: "origin" | "transition" | "radiation" | "extinction" | "impact";
  description: string;
}

export interface TaxonNodeSeed {
  slug: string;
  parentSlug: string | null;
  name: string;
  latin: string;
  rank: string;
  kind: "clade" | "species";
  nodeOrder: number;
  divergenceMya: number;
  eraSlug: string;
  organismSlug?: string | null;
  icon: string;
  color: string;
  traits: string;
  description: string;
  relationships: string;
  defaultExpanded: boolean;
}
