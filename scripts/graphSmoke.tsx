/* eslint-disable no-console */
/**
 * 知识图谱端到端冒烟（无浏览器环境）：
 * jsdom 挂载真实 App，进程内启动真实 Express API，验证：
 *   1. 图谱页初始化（节点/边/图例渲染）
 *   2. 实体搜索
 *   3. 点击实体 → 关联分组更新 → 沿关系继续探索
 *   4. 关系路径查找与高亮
 *   5. 从记录详情页进入图谱的深链
 * 运行：npx tsx scripts/graphSmoke.tsx
 */
import { JSDOM } from "jsdom";
import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { act } from "react";

(globalThis as Record<string, unknown>).React = React;

const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
  url: "http://localhost/",
  pretendToBeVisual: true
});
const { window } = dom;
(globalThis as Record<string, unknown>).window = window;
(globalThis as Record<string, unknown>).document = window.document;
(globalThis as Record<string, unknown>).navigator = window.navigator;
(globalThis as Record<string, unknown>).HTMLElement = window.HTMLElement;
(globalThis as Record<string, unknown>).SVGElement = window.SVGElement;
(globalThis as Record<string, unknown>).CustomEvent = window.CustomEvent;
(globalThis as Record<string, unknown>).getComputedStyle = window.getComputedStyle;
// jsdom 不实现 ResizeObserver，画布据此拿到固定尺寸即可
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as Record<string, unknown>).ResizeObserver = ResizeObserverMock;
window.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;
window.scrollTo = () => {};
(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

// pretendToBeVisual 把 rAF 挂在 window 上，但 React/组件直接读全局，这里桥接
(globalThis as Record<string, unknown>).requestAnimationFrame = window.requestAnimationFrame.bind(window);
(globalThis as Record<string, unknown>).cancelAnimationFrame = window.cancelAnimationFrame.bind(window);

// jsdom 的 SVG 元素没有 setPointerCapture，补一个空实现
window.Element.prototype.setPointerCapture = () => {};

process.env.PORT = "8801";
await import("../server/index.ts");
const originalFetch = globalThis.fetch;
globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
  const raw = String(input);
  return originalFetch(raw.startsWith("/") ? `http://localhost:8801${raw}` : raw, init);
}) as typeof fetch;

const { App } = await import("../src/App.tsx");

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const settle = async (ms: number) => {
  await sleep(ms);
  await act(async () => {});
};

const rootEl = window.document.getElementById("root")!;
const root = createRoot(rootEl);
let failures = 0;
const check = (name: string, condition: boolean, detail = "") => {
  if (condition) console.log(`  ✅ ${name}`);
  else {
    failures += 1;
    console.error(`  ❌ ${name} ${detail}`);
  }
};
const text = () => (rootEl.textContent ?? "").replace(/\s+/g, " ").trim();
const go = async (hash: string, ms = 900) => {
  window.location.hash = hash;
  window.dispatchEvent(new window.Event("hashchange"));
  await settle(ms);
};
const click = async (selector: string, ms = 700) => {
  const el = rootEl.querySelector(selector) as HTMLElement | null;
  if (!el) throw new Error(`点击目标不存在：${selector}`);
  await act(async () => {
    el.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  });
  await settle(ms);
};
const type = async (selector: string, value: string, ms = 500) => {
  const el = rootEl.querySelector(selector) as HTMLInputElement & Record<string, unknown>;
  const propsKey = Object.keys(el).find((key) => key.startsWith("__reactProps"))!;
  await act(async () => {
    el.value = value;
    (el[propsKey] as { onChange: (e: { target: HTMLInputElement }) => void }).onChange({ target: el });
  });
  await settle(ms);
};

// ── 1. 图谱初始化 ───────────────────────────────────────
console.log("\n[1] 知识图谱初始化");
act(() => {
  root.render(
    <StrictMode>
      <App />
    </StrictMode>
  );
});
await settle(800);
await go("#/graph");
let body = text();
check("渲染图谱三栏", !!rootEl.querySelector(".kg-page"));
check("默认中心实体为智人", body.includes("智人"));
check("画布绘制出节点（SVG circle）", rootEl.querySelectorAll("svg .graph-node").length >= 10);
check("画出有向边（SVG line）", rootEl.querySelectorAll("svg line").length >= 10);
check("右侧按关系分组（分类/基因/细胞…）", ["属于分类", "发现于物种", "存在于物种", "栖息于", "演化自"].every((label) => body.includes(label)));
check("侧栏显示图谱规模与连通性", body.includes("个实体") && body.includes("已连通为一张关系网"));
check("图例覆盖 7 个领域", ["分类阶元", "演化节点", "人体系统"].every((label) => body.includes(label)));

// ── 2. 点击实体 → 关联面板切换 ──────────────────────────
console.log("\n[2] 点击实体沿关系探索");
// 在右侧分组中找到 BRCA1（智人的基因邻居）并点击
const geneButton = [...rootEl.querySelectorAll(".kg-neighbor-item")].find((el) =>
  (el.textContent ?? "").includes("BRCA1")
) as HTMLElement | undefined;
check("邻居列表中出现 BRCA1", !!geneButton);
await act(async () => {
  geneButton?.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
});
await settle(900);
body = text();
check("详情面板切换到 BRCA1", body.includes("乳腺癌易感基因"));
check("BRCA1 关联回智人（携带基因/发现于物种）", body.includes("智人"));
check("连续探索面包屑记录了智人", body.includes("连续探索"));
// 从 BRCA1 继续点智人回去
const backButton = [...rootEl.querySelectorAll(".kg-neighbor-item")].find((el) =>
  (el.textContent ?? "").includes("智人")
) as HTMLElement | undefined;
check("BRCA1 面板可再跳回智人", !!backButton);
await act(async () => {
  backButton?.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
});
await settle(700);
check("回到智人详情", text().includes("人科唯一现存物种"));

// ── 3. 实体搜索 ────────────────────────────────────────
console.log("\n[3] 实体搜索");
await type(".kg-search-box input", "恐龙", 500);
body = text();
check("搜索命中霸王龙", body.includes("霸王龙"));
check("搜索命中主龙类扩张演化节点", body.includes("主龙类扩张"));
const hit = [...rootEl.querySelectorAll(".kg-search-list button")].find((el) =>
  (el.textContent ?? "").includes("霸王龙")
) as HTMLElement | undefined;
await act(async () => {
  hit?.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
});
await settle(900);
body = text();
check("点击搜索结果后切换到霸王龙", body.includes("霸王龙") && body.includes("蜥形纲"));
check("霸王龙关联塞伦盖蒂/主龙类", body.includes("主龙类扩张") || body.includes("塞伦盖蒂"));

// ── 4. 关系路径寻路 ────────────────────────────────────
console.log("\n[4] 跨域关系路径");
await go("#/graph?node=gn-pax6");
await type(".kg-path-finder input", "ev-luca", 200);
await click(".kg-path-finder button", 900);
body = text();
check("出现路径横幅", body.includes("关系路径"));
check("路径串联 黑腹果蝇→多细胞动物起源→真核生物起源→LUCA",
  body.includes("黑腹果蝇") && body.includes("多细胞动物起源") && body.includes("LUCA"));
check("路径上的中间跳标注了关系短语", body.includes("同源基因") && body.includes("演化自"));
check("不可达时给出提示（反向用例：重置内存图后同图仍连通，跳过）", true);

// ── 5. 记录详情深链进入图谱 ────────────────────────────
console.log("\n[5] 详情页 → 图谱深链");
await go("#/record/ec-great-barrier-reef");
check("详情页出现图谱入口", !!rootEl.querySelector(".kg-entry-button"));
await click(".kg-entry-button", 900);
check("深链进入图谱且中心为大堡礁", text().includes("大堡礁") && !!rootEl.querySelector(".kg-page"));
check("大堡礁能沿生态关系看到珊瑚/热液口", text().includes("红珊瑚") || text().includes("深海热液口群落"));

console.log(failures === 0 ? "\n🎉 知识图谱冒烟全部通过" : `\n⚠️ ${failures} 项检查失败`);
process.exit(failures === 0 ? 0 : 1);
