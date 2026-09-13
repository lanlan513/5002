import { ArrowUpRight, Droplets, Trees, Waves, Wheat } from "lucide-react";
import type { Ecosystem } from "../api";

export const ecosystemIcons = {
  trees: Trees,
  wheat: Wheat,
  waves: Waves,
  droplets: Droplets
};

export const ecosystemIcon = (icon: string) =>
  ecosystemIcons[icon as keyof typeof ecosystemIcons] ?? Trees;

/** 生态系统入口页：森林 / 草原 / 海洋 / 湿地 四类典型生态系统 */
export default function EcosystemsPage({
  ecosystems,
  onNavigate
}: {
  ecosystems: Ecosystem[];
  onNavigate: (to: string) => void;
}) {
  return (
    <section className="eco-page">
      <header className="eco-hero">
        <p className="eyebrow">ECOSYSTEM EXPLORER / 生态系统探索</p>
        <h1>选择一个生态系统，<br />看清生命如何彼此连接</h1>
        <p className="eco-lede">
          每个生态系统都由生产者、消费者、分解者与环境因素共同编织。
          进入其中，沿着能量与物质的流动方向，理解每个物种所处的位置。
        </p>
      </header>

      <div className="eco-grid">
        {ecosystems.map((ecosystem, index) => {
          const Icon = ecosystemIcon(ecosystem.icon);
          return (
            <button
              key={ecosystem.slug}
              className="eco-card"
              style={{ "--eco-color": ecosystem.color } as React.CSSProperties}
              onClick={() => onNavigate(`ecosystem/${ecosystem.slug}`)}
            >
              <span className="eco-card-index">0{index + 1}</span>
              <span className="eco-card-icon"><Icon size={26} strokeWidth={1.5} /></span>
              <strong>{ecosystem.name}</strong>
              <small>{ecosystem.description}</small>
              <span className="eco-card-stats">
                <span>{ecosystem.species_count} 物种</span>
                <span>{ecosystem.link_count} 关系</span>
                <span>{ecosystem.factor_count} 环境因素</span>
              </span>
              <span className="eco-card-cta">
                进入探索 <ArrowUpRight size={15} />
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
