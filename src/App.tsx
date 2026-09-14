import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  CircleDot,
  FlaskConical,
  GitFork,
  HeartPulse,
  Menu,
  Network,
  Orbit,
  Search,
  X
} from "lucide-react";
import { api, type Knowledge, type Topic } from "./api";
import { BodyExplorer, type BodyRoute } from "./body/BodyExplorer";
import { PhysioExplorer } from "./physio/PhysioExplorer";
import { LabExplorer } from "./lab/LabExplorer";

type BodyPage = { kind: "body"; level: BodyRoute["level"]; slug?: string };

type Page =
  | { kind: "home" }
  | { kind: "topic"; slug: string }
  | { kind: "entry"; slug: string }
  | { kind: "physio" }
  | { kind: "lab" }
  | BodyPage;
const iconMap = {
  "circle-dot": CircleDot,
  "git-fork": GitFork,
  orbit: Orbit,
  network: Network,
  "heart-pulse": HeartPulse,
  "flask-conical": FlaskConical
};

const scaleLabels: Record<string, string> = {
  molecule: "分子尺度",
  cell: "细胞尺度",
  system: "系统尺度",
  organism: "个体尺度",
  biosphere: "生态尺度"
};

const routeFromHash = (): Page => {
  const [kind, slug, detail] = window.location.hash.slice(1).split("/");
  if (kind === "topic" && slug) return { kind: "topic", slug };
  if (kind === "entry" && slug) return { kind: "entry", slug };
  if (kind === "physio") return { kind: "physio" };
  if (kind === "lab") return { kind: "lab" };
  if (kind === "body") {
    if (slug === "system" && detail) return { kind: "body", level: "system", slug: detail };
    if (slug === "organ" && detail) return { kind: "body", level: "organ", slug: detail };
    if (slug === "tissue" && detail) return { kind: "body", level: "tissue", slug: detail };
    if (slug === "cell" && detail) return { kind: "body", level: "cell", slug: detail };
    return { kind: "body", level: "body" };
  }  return { kind: "home" };
};

function App() {
  const [page, setPage] = useState<Page>(routeFromHash);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [featured, setFeatured] = useState<Knowledge[]>([]);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const onHashChange = () => setPage(routeFromHash());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    Promise.all([api.topics(), api.knowledge()])
      .then(([loadedTopics, entries]) => {
        setTopics(loadedTopics);
        setFeatured(entries);
      })
      .catch(console.error);
  }, []);

  const navigate = (to: string) => {
    window.location.hash = to;
    setMobileMenu(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <main>
      <Header
        topics={topics}
        mobileMenu={mobileMenu}
        onMenu={() => setMobileMenu((isOpen) => !isOpen)}
        onNavigate={navigate}
        onSearch={() => setSearchOpen(true)}
      />
      {page.kind === "home" && (
        <Home topics={topics} featured={featured} onNavigate={navigate} />
      )}
      {page.kind === "topic" && <TopicPage slug={page.slug} onNavigate={navigate} />}
      {page.kind === "entry" && <EntryPage slug={page.slug} onNavigate={navigate} />}
      {page.kind === "physio" && <PhysioExplorer onNavigate={navigate} />}
      {page.kind === "lab" && <LabExplorer onNavigate={navigate} />}
      {page.kind === "body" && (
        <BodyExplorer
          route={page.level === "body" ? { level: "body" } : { level: page.level, slug: page.slug ?? "" }}
          onNavigate={navigate}
        />
      )}
      {searchOpen && (
        <SearchDialog
          topics={topics}
          entries={featured}
          onClose={() => setSearchOpen(false)}
          onNavigate={(to) => {
            setSearchOpen(false);
            navigate(to);
          }}
        />
      )}
    </main>
  );
}

function Header({
  topics,
  mobileMenu,
  onMenu,
  onNavigate,
  onSearch
}: {
  topics: Topic[];
  mobileMenu: boolean;
  onMenu: () => void;
  onNavigate: (to: string) => void;
  onSearch: () => void;
}) {
  return (
    <header className="site-header">
      <button className="wordmark" aria-label="BioLab 首页" onClick={() => onNavigate("")}>
        <span className="wordmark-mark" />
        <span>BioLab</span>
      </button>
      <nav className={mobileMenu ? "primary-nav is-open" : "primary-nav"}>
        <button onClick={() => onNavigate("")}>探索</button>
        <button onClick={() => onNavigate("body")}>人体</button>
        <button onClick={() => onNavigate("physio")}>生理模拟</button>
        {topics.slice(0, 2).map((topic) => (
          <button key={topic.slug} onClick={() => onNavigate(`topic/${topic.slug}`)}>
            {topic.short_name}
          </button>
        ))}
      </nav>
      <div className="header-actions">
        <button className="icon-button" aria-label="搜索" onClick={onSearch}>
          <Search size={18} />
        </button>
        <button className="icon-button mobile-only" aria-label="展开菜单" onClick={onMenu}>
          {mobileMenu ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>
    </header>
  );
}

function Home({
  topics,
  featured,
  onNavigate
}: {
  topics: Topic[];
  featured: Knowledge[];
  onNavigate: (to: string) => void;
}) {
  const [selected, setSelected] = useState<Topic | null>(null);

  const explore = (topic: Topic) => {
    setSelected(topic);
    void api.track("topic", topic.slug);
  };

  return (
    <>
      <section className="life-field">
        <BioCanvas selected={selected} />
        <div className="field-grain" />
        <div className="hero-copy">
          <p className="eyebrow">BIOLOGICAL EXPLORATION SYSTEM / 01</p>
          <h1>从微观结构<br />进入生命本身</h1>
          <p className="hero-lede">
            BioLab 将细胞、基因、生态与人体置于同一张不断生长的生命网络中。
          </p>
          <div className="hero-actions">
            <button className="solid-command" onClick={() => onNavigate("body")}>
              进入人体模块 <ArrowUpRight size={16} />
            </button>
            <button className="text-command" onClick={() => document.getElementById("scales")?.scrollIntoView({ behavior: "smooth" })}>
              选择观察尺度 <ArrowUpRight size={17} />
            </button>
          </div>
        </div>
        <div className="field-readout">
          <span>当前焦点</span>
          <strong>{selected?.name ?? "生命网络"}</strong>
          <p>{selected?.description ?? "在尺度之间移动，发现相同规律如何孕育不同形态。"}</p>
        </div>
        <div className="field-index"><span>01</span><i /><span>05</span></div>
      </section>

      <section className="scale-section" id="scales">
        <div className="section-intro">
          <p className="eyebrow">CHOOSE A LENS</p>
          <h2>生命不止一种尺度</h2>
          <p>每一次切换，都能让相同的问题显出新的轮廓。</p>
        </div>
        <div className="scale-map">
          {topics.map((topic, index) => {
            const Icon = iconMap[topic.icon as keyof typeof iconMap] ?? CircleDot;
            return (
              <button
                key={topic.slug}
                className={`scale-node node-${index + 1}`}
                style={{ "--topic-color": topic.color } as React.CSSProperties}
                onMouseEnter={() => explore(topic)}
                onFocus={() => explore(topic)}
                onClick={() => onNavigate(topic.slug === "human-body" ? "body" : `topic/${topic.slug}`)}
              >
                <span className="node-orbit"><Icon size={21} strokeWidth={1.6} /></span>
                <span className="node-number">0{index + 1}</span>
                <strong>{topic.name}</strong>
                <small>{topic.description}</small>
                <ArrowUpRight className="node-arrow" size={17} />
              </button>
            );
          })}
          <div className="map-line line-a" />
          <div className="map-line line-b" />
          <div className="map-line line-c" />
        </div>
      </section>

      <section className="signal-section">
        <div className="signal-heading">
          <p className="eyebrow">FIELD NOTES</p>
          <h2>正在发生的理解</h2>
          <button className="text-command" onClick={() => onNavigate("topic/cells")}>
            查看知识库 <ArrowUpRight size={17} />
          </button>
        </div>
        <div className="entry-list">
          {featured.map((entry, index) => (
            <button className="entry-row" key={entry.slug} onClick={() => onNavigate(`entry/${entry.slug}`)}>
              <span className="entry-index">0{index + 1}</span>
              <span className="entry-topic" style={{ color: entry.topic_color }}>{entry.topic_name}</span>
              <span className="entry-title">{entry.title}</span>
              <span className="entry-meta">{entry.read_time} 分钟</span>
              <ArrowUpRight size={18} />
            </button>
          ))}
        </div>
      </section>

      <footer>
        <div className="footer-mark"><span className="wordmark-mark" /> BioLab</div>
        <p>为好奇而建的生命探索系统。</p>
        <span>EST. 2026</span>
      </footer>
    </>
  );
}

function BioCanvas({ selected }: { selected: Topic | null }) {
  useEffect(() => {
    const canvas = document.querySelector<HTMLCanvasElement>("#bio-canvas");
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    let frame = 0;
    let animation: number;
    const render = () => {
      const { width, height } = canvas.getBoundingClientRect();
      const ratio = Math.min(devicePixelRatio, 2);
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, width, height);
      const t = frame * 0.008;
      const cx = width * 0.68;
      const cy = height * 0.47;
      const glow = selected?.color ?? "#8ee8bb";

      for (let r = 7; r > 0; r--) {
        context.beginPath();
        context.strokeStyle = r === 2 ? glow : `rgba(130, 231, 186, ${0.02 + (7 - r) * 0.006})`;
        context.lineWidth = r === 2 ? 1 : 0.7;
        const radius = Math.min(width, height) * (0.14 + r * 0.047);
        context.ellipse(cx, cy, radius * (1 + Math.sin(t + r) * 0.04), radius * 0.56, t * (r % 2 ? 0.22 : -0.17), 0, Math.PI * 2);
        context.stroke();
      }
      for (let i = 0; i < 54; i++) {
        const angle = i * 0.73 + t * (i % 2 ? 0.6 : -0.4);
        const radius = 64 + (i % 10) * 19 + Math.sin(t + i) * 10;
        const x = cx + Math.cos(angle) * radius * 1.45;
        const y = cy + Math.sin(angle) * radius * 0.65;
        context.beginPath();
        context.fillStyle = i % 7 === 0 ? glow : "rgba(159, 233, 201, .48)";
        context.arc(x, y, i % 7 === 0 ? 3.1 : 1.35, 0, Math.PI * 2);
        context.fill();
      }
      context.beginPath();
      context.fillStyle = "rgba(176, 242, 200, .17)";
      context.arc(cx, cy, 54 + Math.sin(t) * 4, 0, Math.PI * 2);
      context.fill();
      context.beginPath();
      context.fillStyle = glow;
      context.arc(cx, cy, 13, 0, Math.PI * 2);
      context.fill();
      frame++;
      animation = requestAnimationFrame(render);
    };
    render();
    return () => cancelAnimationFrame(animation);
  }, [selected]);

  return <canvas id="bio-canvas" aria-hidden="true" />;
}

function TopicPage({ slug, onNavigate }: { slug: string; onNavigate: (to: string) => void }) {
  const [topic, setTopic] = useState<(Topic & { knowledge: Knowledge[] }) | null>(null);

  useEffect(() => {
    api.topic(slug).then(setTopic).catch(console.error);
  }, [slug]);

  if (!topic) return <Loading />;
  const Icon = iconMap[topic.icon as keyof typeof iconMap] ?? CircleDot;
  return (
    <section className="detail-page">
      <div className="topic-hero" style={{ "--topic-color": topic.color } as React.CSSProperties}>
        <button className="back-button" onClick={() => onNavigate("")}><ArrowLeft size={17} /> 返回探索</button>
        <div className="topic-hero-icon"><Icon size={34} strokeWidth={1.4} /></div>
        <p className="eyebrow">LIFE DOMAIN / 0{topic.position}</p>
        <h1>{topic.name}</h1>
        <p>{topic.description}</p>
      </div>
      <div className="topic-content">
        <div className="topic-aside">
          <span>知识条目</span>
          <strong>{String(topic.knowledge.length).padStart(2, "0")}</strong>
        </div>
        <div>
          {topic.slug === "human-body" && (
            <button className="body-launch-card" onClick={() => onNavigate("body")}>
              <span className="body-launch-orb" />
              <span className="body-launch-copy">
                <small>HUMAN BIOLOGY MODULE</small>
                <strong>打开可点击的人体示意图</strong>
                <p>从系统、器官、组织一路深入到细胞。</p>
              </span>
              <ArrowUpRight size={20} />
            </button>
          )}
          <div className="article-grid">
            {topic.knowledge.map((entry) => (
              <button className="article-card" key={entry.slug} onClick={() => onNavigate(`entry/${entry.slug}`)}>
                <span>{scaleLabels[entry.scale]}</span>
                <h2>{entry.title}</h2>
                <p>{entry.summary}</p>
                <div><small>{entry.read_time} 分钟阅读</small><ArrowUpRight size={17} /></div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function EntryPage({ slug, onNavigate }: { slug: string; onNavigate: (to: string) => void }) {
  const [entry, setEntry] = useState<Knowledge | null>(null);

  useEffect(() => {
    api.entry(slug).then((loaded) => {
      setEntry(loaded);
      void api.track("knowledge", slug);
    }).catch(console.error);
  }, [slug]);

  if (!entry) return <Loading />;
  return (
    <article className="reading-page">
      <button className="back-button" onClick={() => onNavigate(`topic/${entry.topic_slug}`)}><ArrowLeft size={17} /> 返回 {entry.topic_name}</button>
      <header>
        <span className="entry-topic" style={{ color: entry.topic_color }}>{entry.topic_name} / {scaleLabels[entry.scale]}</span>
        <h1>{entry.title}</h1>
        <p>{entry.summary}</p>
        <small>{entry.read_time} 分钟阅读</small>
      </header>
      <div className="reading-visual" style={{ "--topic-color": entry.topic_color } as React.CSSProperties}>
        <div className="visual-cell cell-one" /><div className="visual-cell cell-two" /><div className="visual-cell cell-three" />
        <div className="visual-thread" />
        <span>{entry.topic_name.toUpperCase()}</span>
      </div>
      <div className="article-body">
        <aside><span>核心概念</span><strong>{entry.topic_name}</strong></aside>
        <p>{entry.content}</p>
      </div>
    </article>
  );
}

function SearchDialog({
  topics,
  entries,
  onClose,
  onNavigate
}: {
  topics: Topic[];
  entries: Knowledge[];
  onClose: () => void;
  onNavigate: (to: string) => void;
}) {
  const [query, setQuery] = useState("");
  const results = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return [];
    return [
      ...topics.filter((topic) => `${topic.name}${topic.description}`.toLowerCase().includes(search)).map((topic) => ({
        label: topic.name, detail: "主题", to: `topic/${topic.slug}`
      })),
      ...entries.filter((entry) => `${entry.title}${entry.summary}`.toLowerCase().includes(search)).map((entry) => ({
        label: entry.title, detail: entry.topic_name, to: `entry/${entry.slug}`
      }))
    ];
  }, [query, topics, entries]);

  return (
    <div className="search-overlay" onMouseDown={onClose}>
      <section className="search-panel" onMouseDown={(event) => event.stopPropagation()}>
        <div><Search size={20} /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索生命网络" /><button className="icon-button" onClick={onClose}><X size={19} /></button></div>
        <div className="search-results">
          {!query && <p>输入一个概念、主题或生命现象。</p>}
          {query && results.length === 0 && <p>没有找到相应的线索。</p>}
          {results.map((result) => <button key={result.to} onClick={() => onNavigate(result.to)}><span>{result.detail}</span>{result.label}<ArrowUpRight size={16} /></button>)}
        </div>
      </section>
    </div>
  );
}

function Loading() {
  return <div className="loading"><span className="loading-ring" /> 载入生命数据</div>;
}

export default App;
