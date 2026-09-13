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

export type Chromosome = {
  id: number;
  slug: string;
  name: string;
  short_label: string;
  base_pairs: number;
  gene_count: number;
  description: string;
  position: number;
};

export type Gene = {
  id: number;
  slug: string;
  symbol: string;
  name: string;
  chromosome_slug: string;
  chromosome_name: string;
  chromosome_label: string;
  location: string;
  length: number;
  sequence: string;
  summary: string;
  function: string;
  trait: string;
};

export type GeneticConcept = {
  id: number;
  slug: string;
  term: string;
  category: string;
  definition: string;
  related_gene_slug: string | null;
};

export type GeneticsOverview = {
  stats: { chromosomes: number; genes: number; concepts: number; basePairs: number };
  chromosomes: Chromosome[];
};

export type GeneticsSearchResult = {
  genes: Gene[];
  concepts: GeneticConcept[];
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
  geneticsOverview: () => getJson<GeneticsOverview>("/api/genetics/overview"),
  chromosome: (slug: string) => getJson<Chromosome & { genes: Gene[] }>(`/api/genetics/chromosomes/${slug}`),
  gene: (slug: string) => getJson<Gene>(`/api/genetics/genes/${slug}`),
  geneticsSearch: (query: string) =>
    getJson<GeneticsSearchResult>(`/api/genetics/search?q=${encodeURIComponent(query)}`),
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
