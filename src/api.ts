export type Topic = {
  id: number;
  slug: string;
  name: string;
  short_name: string;
  description: string;
  color: string;
  position: number;
  icon: string;
};

export type Knowledge = {
  id: number;
  slug: string;
  title: string;
  summary: string;
  content: string;
  topic_slug: string;
  topic_name: string;
  topic_color: string;
  scale: string;
  read_time: number;
  featured: number;
};

export type Era = {
  id: number;
  slug: string;
  name: string;
  name_en: string;
  rank: string;
  start_mya: number;
  end_mya: number;
  color: string;
  tagline: string;
  environment: string;
  position: number;
};

export type Organism = {
  id: number;
  slug: string;
  name: string;
  latin: string;
  mya: number;
  era_slug: string;
  category: string;
  icon: string;
  description: string;
  prominence: number;
};

export type TimelineEvent = {
  id: number;
  slug: string;
  title: string;
  mya: number;
  kind: "origin" | "transition" | "radiation" | "extinction" | "impact";
  description: string;
};

export type TaxonNode = {
  id: number;
  slug: string;
  parent_slug: string | null;
  name: string;
  latin: string;
  rank: string;
  kind: "clade" | "species";
  node_order: number;
  divergence_mya: number;
  era_slug: string;
  organism_slug: string | null;
  icon: string;
  color: string;
  traits: string;
  description: string;
  relationships: string;
  default_expanded: number;
};

export type Timeline = {
  eras: Era[];
  organisms: Organism[];
  events: TimelineEvent[];
};

export type Phylogeny = Timeline & {
  nodes: TaxonNode[];
};

const getJson = async <T>(path: string): Promise<T> => {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json() as Promise<T>;
};

export const api = {
  topics: () => getJson<Topic[]>("/api/topics"),
  knowledge: () => getJson<Knowledge[]>("/api/knowledge?featured=true"),
  topic: (slug: string) => getJson<Topic & { knowledge: Knowledge[] }>(`/api/topics/${slug}`),
  entry: (slug: string) => getJson<Knowledge>(`/api/knowledge/${slug}`),
  timeline: () => getJson<Timeline>("/api/timeline"),
  phylogeny: () => getJson<Phylogeny>("/api/phylogeny"),
  track: (entityType: string, entitySlug: string) =>
    fetch("/api/interactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: window.sessionStorage.getItem("biolab-session") ?? crypto.randomUUID(),
        eventType: "explore",
        entityType,
        entitySlug
      })
    })
};
