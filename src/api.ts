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

const getJson = async <T>(path: string): Promise<T> => {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json() as Promise<T>;
};

const sendJson = async <T>(path: string, method: string, body?: unknown): Promise<T> => {
  const response = await fetch(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error((payload as { message?: string }).message ?? `Request failed: ${response.status}`);
  return payload as T;
};

export const api = {
  topics: () => getJson<Topic[]>("/api/topics"),
  knowledge: () => getJson<Knowledge[]>("/api/knowledge?featured=true"),
  topic: (slug: string) => getJson<Topic & { knowledge: Knowledge[] }>(`/api/topics/${slug}`),
  entry: (slug: string) => getJson<Knowledge>(`/api/knowledge/${slug}`),
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
    }),

  /* ---------------- 生态系统探索模块 ---------------- */
  ecosystems: () => getJson<Ecosystem[]>("/api/ecosystems"),
  ecosystem: (slug: string) => getJson<EcosystemDetail>(`/api/ecosystems/${slug}`),
  createEcosystem: (payload: EcosystemInput) => sendJson<Ecosystem>("/api/ecosystems", "POST", payload),
  updateEcosystem: (slug: string, payload: Partial<EcosystemInput>) =>
    sendJson<Ecosystem>(`/api/ecosystems/${slug}`, "PUT", payload),
  deleteEcosystem: (slug: string) => sendJson<{ deleted: string }>(`/api/ecosystems/${slug}`, "DELETE"),
  speciesList: () => getJson<Species[]>("/api/species"),
  createSpecies: (payload: SpeciesInput) => sendJson<Species>("/api/species", "POST", payload),
  updateSpecies: (slug: string, payload: Partial<SpeciesInput>) =>
    sendJson<Species>(`/api/species/${slug}`, "PUT", payload),
  deleteSpecies: (slug: string) => sendJson<{ deleted: string }>(`/api/species/${slug}`, "DELETE"),
  relationships: (ecosystem: string) => getJson<Relationship[]>(`/api/relationships?ecosystem=${ecosystem}`),
  createRelationship: (payload: RelationshipInput) =>
    sendJson<Relationship>("/api/relationships", "POST", payload),
  deleteRelationship: (id: number) => sendJson<{ deleted: number }>(`/api/relationships/${id}`, "DELETE")
};

/* ---------------- 生态系统探索模块类型 ---------------- */

export type Ecosystem = {
  id: number;
  slug: string;
  name: string;
  english_name: string;
  description: string;
  climate: string;
  color: string;
  icon: string;
  position: number;
  species_count: number;
  link_count: number;
  factor_count: number;
};

export type WebNode = {
  id: string;
  name: string;
  kind: "species" | "factor";
  role: "producer" | "consumer" | "decomposer" | "environment";
  latin_name?: string;
  description?: string;
  trophic_level?: number;
  category?: string;
  note?: string;
};

export type WebLink = {
  id: number;
  from: string;
  to: string;
  type: "energy" | "decomposition" | "support";
  note?: string;
};

export type EcosystemDetail = Ecosystem & { nodes: WebNode[]; links: WebLink[] };

export type Species = {
  id: number;
  slug: string;
  name: string;
  latin_name: string;
  role: "producer" | "consumer" | "decomposer";
  trophic_level: number;
  description: string;
  ecosystems: string[];
};

export type Relationship = {
  id: number;
  ecosystem_slug: string;
  from: string;
  to: string;
  type: WebLink["type"];
  note?: string;
};

export type EcosystemInput = {
  slug: string;
  name: string;
  englishName?: string;
  description: string;
  climate?: string;
  color?: string;
  icon?: string;
  position?: number;
};

export type SpeciesInput = {
  slug: string;
  name: string;
  latinName?: string;
  role: Species["role"];
  trophicLevel?: number;
  description: string;
  ecosystems?: string[];
};

export type RelationshipInput = {
  ecosystem: string;
  from: string;
  to: string;
  type: WebLink["type"];
  note?: string;
};
