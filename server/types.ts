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
  systemSlug?: BodySystemSlug;
  organSlug?: string;
}

export type BodySystemSlug =
  | "nervous"
  | "circulatory"
  | "respiratory"
  | "digestive"
  | "urinary"
  | "endocrine";

export interface BodySystemSeed {
  slug: BodySystemSlug;
  name: string;
  shortName: string;
  description: string;
  overview: string;
  functions: string[];
  color: string;
  icon: string;
  position: number;
}

export interface OrganSeed {
  slug: string;
  name: string;
  systemSlug: BodySystemSlug;
  positionLabel: string;
  summary: string;
  description: string;
  functions: string[];
  facts: string[];
  hotspot: { x: number; y: number; r: number };
}

export interface TissueSeed {
  slug: string;
  name: string;
  organSlug: string;
  layer: string;
  description: string;
  functions: string[];
}

export interface CellSeed {
  slug: string;
  name: string;
  tissueSlug: string;
  morphology: string;
  function: string;
  fact: string;
}
