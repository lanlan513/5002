import type { WebLink } from "../api";

/**
 * 食物网图算法工具：
 * - competition 关系不入库，直接从「共享同一食物资源」的捕食 / 分解关系中推导；
 * - 局部网络用无向邻接 BFS 求 1 层 / 2 层邻里；
 * - 食物链沿 energy 边向上游回溯枚举。
 */

/** 竞争关系：两个物种以相同方式利用同一资源（同为捕食者或同为分解者） */
export type CompetitionLink = {
  id: string;
  from: string;
  to: string;
  type: "competition";
  /** 双方共同利用的食物资源节点 id */
  shared: string[];
  /** 竞争性质：抢食同一猎物，或分解同一有机对象 */
  mode: "predation" | "decomposition";
};

export type GraphLink = WebLink | CompetitionLink;

export const isCompetition = (link: GraphLink): link is CompetitionLink => link.type === "competition";

/**
 * 推导竞争关系：
 * - energy 边：取食同一猎物的消费者两两构成捕食竞争；
 * - decomposition 边：分解同一有机对象的分解者两两构成分解生态位竞争。
 * 两种关系分开配对——活体取食者与分解者利用资源的生命阶段不同，
 * 不直接构成竞争（如吃草的羚羊与分解枯草的蚯蚓）。
 */
export function deriveCompetition(links: WebLink[]): CompetitionLink[] {
  const buckets = new Map<string, Map<string, Set<string>>>();
  links.forEach((link) => {
    if (link.type !== "energy" && link.type !== "decomposition") return;
    const mode = link.type === "energy" ? "predation" : "decomposition";
    const resources = buckets.get(mode) ?? new Map<string, Set<string>>();
    const eaters = resources.get(link.from) ?? new Set<string>();
    eaters.add(link.to);
    resources.set(link.from, eaters);
    buckets.set(mode, resources);
  });

  // key 始终按字典序排列，保证 A、B 共享多种食物时只产生一条边
  const pairs = new Map<string, CompetitionLink>();
  buckets.forEach((resources, mode) => {
    resources.forEach((eaters, food) => {
      const list = [...eaters].sort();
      for (let i = 0; i < list.length; i += 1) {
        for (let j = i + 1; j < list.length; j += 1) {
          const [from, to] = [list[i], list[j]];
          const key = `${mode}__${from}__${to}`;
          const existing = pairs.get(key);
          if (existing) existing.shared.push(food);
          else pairs.set(key, {
            id: `comp-${mode}-${from}-${to}`,
            from, to,
            type: "competition",
            shared: [food],
            mode: mode as CompetitionLink["mode"]
          });
        }
      }
    });
  });

  return [...pairs.values()];
}

/** 无向邻接 BFS：返回 root 周围 depth 层以内（含 root）的全部节点 */
export function neighborhood(links: GraphLink[], root: string, depth: number): Set<string> {
  const adjacent = new Map<string, Set<string>>();
  const connect = (a: string, b: string) => {
    const set = adjacent.get(a) ?? new Set<string>();
    set.add(b);
    adjacent.set(a, set);
  };
  links.forEach((link) => {
    connect(link.from, link.to);
    connect(link.to, link.from);
  });

  const seen = new Set<string>([root]);
  let frontier = [root];
  for (let step = 0; step < depth; step += 1) {
    const next: string[] = [];
    frontier.forEach((id) => {
      adjacent.get(id)?.forEach((neighbor) => {
        if (!seen.has(neighbor)) {
          seen.add(neighbor);
          next.push(neighbor);
        }
      });
    });
    frontier = next;
  }
  return seen;
}

/**
 * 沿 energy 边向「食物方向」回溯，枚举以 nodeId 为终点的食物链。
 * 优先返回较长且起点（生产者）不同的链，避免列出一堆同构短链。
 */
export function foodChains(nodeId: string, links: WebLink[], maxLength = 5, limit = 3): string[][] {
  const preyOf = new Map<string, string[]>();
  links
    .filter((link) => link.type === "energy")
    .forEach((link) => {
      const prey = preyOf.get(link.to) ?? [];
      prey.push(link.from);
      preyOf.set(link.to, prey);
    });

  const all: string[][] = [];
  const seenKeys = new Set<string>();
  const walk = (chain: string[], visited: Set<string>) => {
    const head = chain[0];
    const prey = (preyOf.get(head) ?? []).filter((id) => !visited.has(id));
    if (prey.length === 0 || chain.length >= maxLength) {
      const key = chain.join(">");
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        all.push([...chain]);
      }
      return;
    }
    prey.forEach((id) => walk([id, ...chain], new Set(visited).add(id)));
  };
  walk([nodeId], new Set([nodeId]));

  all.sort((a, b) => b.length - a.length);
  const picked: string[][] = [];
  const usedRoots = new Set<string>();
  // 第一轮：每个生产者只取一条最长链，保证多样性
  all.forEach((chain) => {
    if (picked.length >= limit || usedRoots.has(chain[0])) return;
    usedRoots.add(chain[0]);
    picked.push(chain);
  });
  // 第二轮：名额未满再补充
  all.forEach((chain) => {
    if (picked.length >= limit || picked.includes(chain)) return;
    picked.push(chain);
  });
  return picked;
}
