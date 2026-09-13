import type { CellDetail, CellSummary, OrganelleDetail } from "./types";

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
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? `Request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
};

export const api = {
  topics: () => getJson<Topic[]>("/api/topics"),
  knowledge: () => getJson<Knowledge[]>("/api/knowledge?featured=true"),
  topic: (slug: string) => getJson<Topic & { knowledge: Knowledge[] }>(`/api/topics/${slug}`),
  entry: (slug: string) => getJson<Knowledge>(`/api/knowledge/${slug}`),
  /* 细胞探索器 */
  cellTypes: () => getJson<{ cells: CellSummary[] }>("/api/cells"),
  cell: (id: string) => getJson<CellDetail>(`/api/cells/${id}`),
  organelle: (id: string) => getJson<OrganelleDetail>(`/api/organelles/${id}`),
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
    }).catch(() => undefined)
};
