/* eslint-disable no-console */
/**
 * 端到端冒烟测试（无浏览器环境）：
 * 用 jsdom 挂载真实 React 应用 + 真实 Express API，
 * 验证 加载态 → 成功态、筛选、空结果、错误兜底、详情跳转。
 * 运行：npm run smoke
 */
import { JSDOM } from "jsdom";
import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { act } from "react";

// esbuild 在测试入口下走经典 JSX 转换，应用模块引用自由变量 React，挂到全局
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
(globalThis as Record<string, unknown>).CustomEvent = window.CustomEvent;
(globalThis as Record<string, unknown>).getComputedStyle = window.getComputedStyle;
window.scrollTo = () => {};
(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

// 进程内启动真实 API，并把前端 fetch（含相对 /api）转发过去
process.env.PORT = "8799";
await import("../server/index.ts");
const originalFetch = globalThis.fetch;
const API_BASE = "http://localhost:8799";
globalThis.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
  const raw = String(input);
  const url = raw.startsWith("/") ? `${API_BASE}${raw}` : raw;
  return originalFetch(url, init);
};

const { App } = await import("../src/App.tsx");

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
/**
 * 等待真实定时器/网络完成，再用 act flush React 状态。
 * （React 19 的 act 在 Node 下不会自动推进挂起的 setTimeout，故等待放在 act 外。）
 */
const settle = async (ms: number) => {
  await sleep(ms);
  await act(async () => {});
};
const go = async (hash: string, ms = 800) => {
  window.location.hash = hash;
  window.dispatchEvent(new window.Event("hashchange"));
  await settle(ms);
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
const exists = (selector: string) => !!rootEl.querySelector(selector);

// ── 1. 首页：加载态 → 成功态 ─────────────────────────────
console.log("\n[1] 首页加载");
act(() => {
  root.render(
    <StrictMode>
      <App />
    </StrictMode>
  );
});
check("立即出现加载态", text().includes("正在初始化数据中心"));
await settle(700);
check("加载后出现首页标题", text().includes("统一生物数据中心"));
check("聚合统计渲染出记录总数 37", exists(".hero-stats") && text().includes("37"));
check("五个数据域卡片各有记录数", rootEl.querySelectorAll(".domain-card").length === 5);
check("最近更新渲染出真实数据卡片", rootEl.querySelectorAll(".latest-section .record-card").length > 0);

// ── 2. 数据浏览 + 数据域筛选 ─────────────────────────────
console.log("\n[2] 数据浏览 + 分类筛选");
await go("#/data?category=gene");
let body = text();
check("显示基因域标题", body.includes("基因"));
check("结果包含 BRCA1", body.includes("BRCA1"));
check("结果不含其他域的智人", !body.includes("智人"));
check("分面四组齐全", ["数据域", "主题", "数据类型", "生物分类"].every((label) => body.includes(label)));
check("存在分页控件", exists(".pagination"));
check("当前匹配数为 7", body.includes("当前匹配") && body.includes("7"));

// ── 3. 主题 + 生物分类组合筛选 ────────────────────────────
console.log("\n[3] 组合筛选");
await go(`#/data?category=species&kingdom=${encodeURIComponent("细菌界")}`);
body = text();
check("细菌界物种只剩大肠杆菌", body.includes("大肠杆菌") && !body.includes("智人"));
check("出现活动筛选标签", rootEl.querySelectorAll(".filter-chip").length >= 2);

// ── 4. 全文搜索：有结果 / 空结果 ─────────────────────────
console.log("\n[4] 全文搜索");
await go(`#/data?q=${encodeURIComponent("DNA 修复")}`);
body = text();
check("多关键词命中 BRCA1 / TP53", body.includes("BRCA1") && body.includes("TP53"));
await go(`#/data?q=${encodeURIComponent("zzzz无此词条zzzz")}`);
body = text();
check("出现空结果提示", body.includes("没有找到匹配的数据记录"));
check("空结果提供清除按钮", exists(".state-block .secondary-button"));
check("空结果无分页", !exists(".pagination"));

// ── 5. 记录详情页（统一结构的完整字段） ───────────────────
console.log("\n[5] 记录详情");
await go("#/record/sp-homo-sapiens");
body = text();
check("标题为智人", body.includes("智人"));
check("学名 Homo sapiens", body.includes("Homo sapiens"));
check("外部编码 NCBI:9606", body.includes("NCBI:9606"));
check("关键指标", body.includes("基因组大小"));
check("属性数据", body.includes("保护等级"));
check("面包屑分类路径", body.includes("脊索动物门"));
check("跨域关联记录", body.includes("跨域关联记录"));
check("至少 3 条关联", rootEl.querySelectorAll(".related-item").length >= 3);

// ── 6. 详情不存在（404） ────────────────────────────────
console.log("\n[6] 详情 404");
await go("#/record/does-not-exist");
check("友好提示记录不存在", text().includes("记录不存在"));

// ── 7. 未知路由兜底 ────────────────────────────────────
console.log("\n[7] 未知路由");
await go("#/totally-unknown", 300);
check("提示页面不存在", text().includes("页面不存在"));

// ── 8. API 故障 → 错误态 + 重试恢复 ─────────────────────
console.log("\n[8] 错误态与重试");
// 让接口临时失败
const healthyFetch = globalThis.fetch;
globalThis.fetch = (() => Promise.reject(new TypeError("network down"))) as typeof fetch;
await go("#/data?category=cell", 400);
check("故障时显示错误卡片", exists(".error-state"));
check("错误卡片提供重新加载按钮", !!rootEl.querySelector(".error-state .secondary-button"));
// 恢复服务并点击重试
globalThis.fetch = healthyFetch;
await act(async () => {
  rootEl.querySelector<HTMLElement>(".error-state .secondary-button")?.click();
});
await settle(700);
body = text();
check("重试后恢复数据（出现细胞记录）", body.includes("CD8") || exists(".record-card"));

console.log(failures === 0 ? "\n🎉 全部冒烟测试通过" : `\n⚠️  ${failures} 项失败`);
process.exit(failures === 0 ? 0 : 1);
