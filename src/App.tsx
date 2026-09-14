import { Component, useEffect, useState, type ReactNode } from "react";
import { Database, Menu, Search, X } from "lucide-react";
import type { CategoryMeta } from "../shared/contract";
import { api } from "./api/client";
import { useResource } from "./hooks/useResource";
import { buildHash, parseHash } from "./lib/url";
import { CategoryIcon } from "./components/CategoryIcon";
import { ErrorState, FullPageLoading } from "./components/States";
import { Home } from "./pages/Home";
import { DataBrowser } from "./pages/DataBrowser";
import { RecordPage } from "./pages/RecordPage";
import { Insights } from "./pages/insights/Insights";

/** 渲染期崩溃兜底，保证局部错误不会白屏整个数据中心 */
class ErrorBoundary extends Component<{ children: ReactNode }, { message: string | null }> {
  state = { message: null as string | null };

  static getDerivedStateFromError(error: unknown) {
    return { message: error instanceof Error ? error.message : "页面发生未知错误" };
  }

  render() {
    if (this.state.message) {
      return (
        <ErrorState
          message={`${this.state.message}。请刷新页面恢复。`}
          onRetry={() => window.location.reload()}
        />
      );
    }
    return this.props.children;
  }
}

function useHashRoute() {
  const [route, setRoute] = useState(parseHash);
  useEffect(() => {
    const onHashChange = () => {
      setRoute(parseHash());
      window.scrollTo({ top: 0 });
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);
  return [route, setRoute] as const;
}

export function App() {
  const [route] = useHashRoute();
  const [menuOpen, setMenuOpen] = useState(false);
  const categories = useResource<CategoryMeta[]>(() => api.categories(), []);

  const navigate = (path: string, params?: Record<string, string | number | undefined>) => {
    window.location.hash = buildHash(path, params).slice(1);
    setMenuOpen(false);
  };

  const openRecord = (id: string) => navigate(`/record/${id}`);
  const goHome = () => navigate("/");
  const goData = (params?: Record<string, string | number | undefined>) => navigate("/data", params);

  /** 全局搜索入口：进入数据页并聚焦搜索框（已在数据页时直接聚焦） */
  const focusSearch = () => {
    if (route.path !== "/data") goData();
    // 跨页面跳转时数据页可能尚未挂载，下一帧再派发以确保监听器就绪
    window.setTimeout(() => window.dispatchEvent(new CustomEvent("biodatahub:focus-search")), 60);
  };

  const categoryList = categories.state.status === "success" ? categories.state.data : [];

  const renderPage = () => {
    if (categories.state.status === "loading") {
      return <FullPageLoading label="正在初始化数据中心…" />;
    }
    if (categories.state.status === "error") {
      return <ErrorState message={categories.state.message} onRetry={categories.reload} />;
    }

    if (route.path === "/" || route.path === "") {
      return <Home categories={categoryList} onOpenRecord={openRecord} />;
    }
    if (route.path === "/data") {
      return (
        <DataBrowser
          categories={categoryList}
          params={route.params}
          navigate={navigate}
          onOpenRecord={openRecord}
        />
      );
    }
    if (route.path === "/insights") {
      return (
        <Insights
          categories={categoryList}
          params={route.params}
          navigate={navigate}
          onOpenRecord={openRecord}
        />
      );
    }
    const recordMatch = route.path.match(/^\/record\/(.+)$/);
    if (recordMatch) {
      return (
        <RecordPage
          id={decodeURIComponent(recordMatch[1])}
          categories={categoryList}
          onBack={() => window.history.back()}
          onOpenRecord={openRecord}
        />
      );
    }
    return (
      <ErrorState
        message="页面不存在，可能是链接已失效。"
        onRetry={goHome}
      />
    );
  };

  return (
    <ErrorBoundary>
      <header className="site-header">
        <button className="wordmark" onClick={goHome} aria-label="返回数据中心首页">
          <Database size={19} />
          <span>BioDataHub</span>
        </button>
        <nav className={menuOpen ? "main-nav is-open" : "main-nav"} aria-label="主导航">
          <a href={buildHash("/")} onClick={() => setMenuOpen(false)}>总览</a>
          <a href={buildHash("/data")} onClick={() => setMenuOpen(false)}>全部数据</a>
          <a href={buildHash("/insights")} onClick={() => setMenuOpen(false)}>可视化中心</a>
          <span className="nav-divider" />
          {categoryList.map((category) => (
            <a
              key={category.slug}
              href={buildHash("/data", { category: category.slug })}
              onClick={() => setMenuOpen(false)}
            >
              <CategoryIcon name={category.icon} size={13} /> {category.name}
            </a>
          ))}
        </nav>
        <div className="header-actions">
          <button className="header-search" onClick={focusSearch}>
            <Search size={16} /> <span>搜索数据</span>
          </button>
          <button
            className="icon-button mobile-only"
            aria-label={menuOpen ? "关闭菜单" : "展开菜单"}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      <main className="page-main">{renderPage()}</main>

      <footer className="site-footer">
        <div>
          <Database size={15} /> <strong>BioDataHub</strong> · 统一生物数据中心
        </div>
        <p>物种 / 基因 / 细胞 / 生态系统 / 人体 —— 统一数据结构，统一 API 获取。</p>
        <span>演示数据集 · EST. 2026</span>
      </footer>
    </ErrorBoundary>
  );
}
