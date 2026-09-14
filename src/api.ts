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

export type Hotspot = { x: number; y: number; r: number };

export type BodySystem = {
  slug: string;
  name: string;
  short_name: string;
  description: string;
  overview: string;
  functions: string[];
  color: string;
  icon: string;
  position: number;
  organ_count?: number;
  organs?: BodyOrganBrief[];
};

export type BodyOrganBrief = {
  slug: string;
  name: string;
  system_slug: string;
  position_label: string;
  summary: string;
  hotspot: Hotspot;
};

export type BodyOrgan = {
  slug: string;
  name: string;
  system_slug: string;
  system_name: string;
  system_color: string;
  position_label: string;
  summary: string;
  description: string;
  functions: string[];
  facts: string[];
  hotspot: Hotspot;
  tissue_count?: number;
  cell_count?: number;
  tissues?: BodyTissueBrief[];
  knowledge?: Knowledge[];
};

export type BodyTissueBrief = {
  slug: string;
  name: string;
  organ_slug: string;
  layer: string;
  description: string;
  functions: string[];
  cell_count: number;
};

export type BodyTissue = BodyTissueBrief & {
  organ_name: string;
  system_slug: string;
  system_name: string;
  system_color: string;
  cells: BodyCell[];
};

export type BodyCell = {
  slug: string;
  name: string;
  tissue_slug: string;
  morphology: string;
  function: string;
  fact: string;
  tissue_name?: string;
  organ_slug?: string;
  organ_name?: string;
  system_slug?: string;
  system_name?: string;
  system_color?: string;
};

export type BodyOverview = {
  title: string;
  description: string;
  systems: (BodySystem & {
    organ_count: number;
    organs: BodyOrganBrief[];
  })[];
};

export type SystemDetail = BodySystem & {
  overview: string;
  functions: string[];
  organs: BodyOrgan[];
  knowledge: Knowledge[];
};

// ===== 器官关系网络 =====

export type SubstanceKind =
  | "oxygen"
  | "co2"
  | "nutrient"
  | "waste"
  | "hormone"
  | "signal"
  | "water"
  | "bile";

export type Substance = {
  slug: SubstanceKind;
  name: string;
  color: string;
  description: string;
};

export type OrganRelationEdge = {
  from: string;
  to: string;
  substances: SubstanceKind[];
  label: string;
};

export type RelationNode = {
  slug: string;
  name: string;
  system_slug: string;
  hotspot: Hotspot;
};

export type CouplingPathway = {
  slug: string;
  name: string;
  story: string;
  edges: { from: string; to: string }[];
};

export type OrganNetwork = {
  substances: Substance[];
  edges: OrganRelationEdge[];
  pathways: CouplingPathway[];
  nodes: RelationNode[];
};

const getJson = async <T>(path: string): Promise<T> => {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json() as Promise<T>;
};

export const api = {
  topics: () => getJson<Topic[]>("/api/topics"),
  knowledge: (params?: { system?: string }) => {
    const query = params?.system ? `?system=${params.system}` : "?featured=true";
    return getJson<Knowledge[]>(`/api/knowledge${query}`);
  },
  topic: (slug: string) => getJson<Topic & { knowledge: Knowledge[] }>(`/api/topics/${slug}`),
  entry: (slug: string) => getJson<Knowledge>(`/api/knowledge/${slug}`),

  bodyOverview: () => getJson<BodyOverview>("/api/body/overview"),
  bodyRelations: () => getJson<OrganNetwork>("/api/body/relations"),
  bodySystem: (slug: string) => getJson<SystemDetail>(`/api/body/systems/${slug}`),
  bodyOrgan: (slug: string) => getJson<BodyOrgan>(`/api/body/organs/${slug}`),
  bodyTissue: (slug: string) => getJson<BodyTissue>(`/api/body/tissues/${slug}`),
  bodyCell: (slug: string) => getJson<BodyCell>(`/api/body/cells/${slug}`),

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
