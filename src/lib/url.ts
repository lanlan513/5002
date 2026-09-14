/** 前端展示用的小工具集合，保持组件简洁 */

export const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
};

/** 从 hash 中解析出路径与查询参数，例如 #/data?category=gene -> { path:"/data", params: {...} } */
export const parseHash = (): { path: string; params: URLSearchParams } => {
  const raw = window.location.hash.replace(/^#/, "") || "/";
  const [path, search = ""] = raw.split("?");
  return { path: path || "/", params: new URLSearchParams(search) };
};

export const buildHash = (path: string, params?: Record<string, string | number | undefined>): string => {
  const search = new URLSearchParams();
  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== "") search.set(key, String(value));
  });
  const query = search.toString();
  return `#${path}${query ? `?${query}` : ""}`;
};
