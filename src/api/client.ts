import {
  type CatalogStats,
  type CategoryMeta,
  type PaginatedRecords,
  type RecordDetail,
  type RecordQuery
} from "../../shared/contract";

/** 所有 API 错误都归一化为带 message 的 Error，供 UI 统一展示 */
const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  let response: Response;
  try {
    response = await fetch(path, init);
  } catch {
    throw new Error("无法连接到数据服务，请检查网络后重试。");
  }
  if (!response.ok) {
    let message = `请求失败（${response.status}）`;
    try {
      const body = (await response.json()) as { message?: string };
      if (body.message) message = body.message;
    } catch {
      /* 保留默认错误文案 */
    }
    throw new Error(message);
  }
  return response.json() as Promise<T>;
};

const toQueryString = (query: RecordQuery): string => {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
  });
  const string = params.toString();
  return string ? `?${string}` : "";
};

export const api = {
  categories: () => request<CategoryMeta[]>("/api/categories"),
  stats: () => request<CatalogStats>("/api/stats"),
  records: (query: RecordQuery, signal?: AbortSignal) =>
    request<PaginatedRecords>(`/api/records${toQueryString(query)}`, { signal }),
  record: (id: string) => request<RecordDetail>(`/api/records/${id}`),
  track: (entityType: string, entityId: string) => {
    const sessionId = window.sessionStorage.getItem("biodatahub-session") ?? crypto.randomUUID();
    window.sessionStorage.setItem("biodatahub-session", sessionId);
    return request("/api/interactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, eventType: "view", entityType, entityId })
    }).catch(() => undefined); // 埋点失败不影响浏览
  }
};
