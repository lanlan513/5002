import { useCallback, useEffect, useRef, useState } from "react";

export type ResourceState<T> =
  | { status: "loading"; data?: T }
  | { status: "success"; data: T }
  | { status: "error"; message: string; data?: T };

/**
 * 统一的异步资源 hook：
 * - 依赖变化时自动取消上一次未完成请求（AbortController），避免旧响应覆盖新结果；
 * - 支持 debounce，搜索输入不会逐字符打接口；
 * - 刷新时保留上一份成功数据（data 仍可用），翻页/筛选不闪骨架屏；
 * - 返回标准状态（loading / error / success），各页面共用同一套渲染。
 */
export function useResource<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  deps: ReadonlyArray<unknown>,
  options?: { debounceMs?: number }
): { state: ResourceState<T>; reload: () => void } {
  const [state, setState] = useState<ResourceState<T>>({ status: "loading" });
  const [nonce, setNonce] = useState(0);
  const fetcherRef = useRef(fetcher);
  const lastData = useRef<T | undefined>(undefined);
  fetcherRef.current = fetcher;

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      fetcherRef
        .current(controller.signal)
        .then((data) => {
          if (controller.signal.aborted) return;
          lastData.current = data;
          setState({ status: "success", data });
        })
        .catch((error: unknown) => {
          if (controller.signal.aborted) return;
          const message = error instanceof Error ? error.message : "数据加载失败，请稍后重试。";
          setState({ status: "error", message, data: lastData.current });
        });
    }, options?.debounceMs ?? 0);

    // 首次加载无缓存 → 纯 loading；后续刷新 → loading 但保留旧数据
    setState({ status: "loading", data: lastData.current });
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  const reload = useCallback(() => setNonce((value) => value + 1), []);
  return { state, reload };
}
