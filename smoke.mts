import { JSDOM } from "jsdom";

const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
  url: "http://localhost:5185/#body",
  pretendToBeVisual: true
});

globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.navigator = dom.window.navigator;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.Element = dom.window.Element;
globalThis.Node = dom.window.Node;
globalThis.getComputedStyle = dom.window.getComputedStyle;
globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(performance.now()), 16);
globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
window.sessionStorage.setItem("biolab-session", "test-session");

// 让 Node 的 fetch 支持相对的 /api 路径（浏览器由 Vite 代理处理）
const nativeFetch = globalThis.fetch;
globalThis.fetch = (input, init) => {
  if (typeof input === "string" && input.startsWith("/")) {
    return nativeFetch(`http://localhost:8795${input}`, init);
  }
  return nativeFetch(input, init);
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const failures = [];
const assert = (condition, message) => {
  if (condition) {
    console.log("  ✓", message);
  } else {
    failures.push(message);
    console.error("  ✗", message);
  }
};

const { createRoot } = await import("react-dom/client");
const React = await import("react");
globalThis.React = React;
const { default: App } = await import("./src/App.tsx");

createRoot(document.getElementById("root")).render(React.createElement(App));

await sleep(1200);
const text = () => document.body.textContent ?? "";

console.log("\n[1] 人体总览");
assert(text().includes("从一具身体"), "渲染模块标题");
assert(text().includes("神经系统") && text().includes("内分泌系统"), "显示六个系统");
const hotspots = document.querySelectorAll(".diagram-hotspot");
assert(hotspots.length === 16, `示意图渲染 16 个可点击器官热点（实际 ${hotspots.length}）`);
assert(text().includes("全部可点击器官"), "显示器官索引列表");

console.log("\n[2] 进入神经系统");
window.location.hash = "#body/system/nervous";
window.dispatchEvent(new window.Event("hashchange"));
await sleep(700);
assert(text().includes("SYSTEM · 系统层级"), "显示系统层级面板");
assert(text().includes("感觉输入") && text().includes("高级认知"), "显示系统功能标签");
assert(text().includes("动作电位"), "显示系统相关知识");

console.log("\n[3] 点击示意图中的心脏（跨系统）");
window.location.hash = "#body";
window.dispatchEvent(new window.Event("hashchange"));
await sleep(400);
const heart = [...document.querySelectorAll(".diagram-hotspot")].find((el) =>
  el.getAttribute("aria-label")?.startsWith("心脏")
);
assert(Boolean(heart), "找到心脏热点");
heart.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
await sleep(700);
assert(window.location.hash === "#body/organ/heart", `点击热点跳转到器官页（${window.location.hash}）`);
assert(text().includes("ORGAN · 器官层级"), "显示器官面板");
assert(text().includes("胸腔中部偏左"), "显示器官空间位置");
assert(text().includes("心肌组织") && text().includes("心内膜"), "列出器官包含的组织");
assert(text().includes("三个关键事实"), "显示关键事实");

console.log("\n[4] 组织 → 细胞层级");
const tissueButton = [...document.querySelectorAll(".tissue-card")].find((b) =>
  (b.textContent ?? "").includes("心肌组织")
);
tissueButton.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
await sleep(600);
assert(window.location.hash === "#body/tissue/myocardium", "进入心肌组织");
assert(text().includes("TISSUE · 组织层级"), "显示组织面板");
assert((text().match(/心肌细胞/g) ?? []).length >= 1, "列出心肌细胞");
const cellButton = [...document.querySelectorAll(".cell-card")].find((b) =>
  (b.textContent ?? "").includes("起搏细胞")
);
cellButton.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
await sleep(600);
assert(window.location.hash === "#body/cell/pacemaker-cell", "进入起搏细胞");
assert(text().includes("CELL · 细胞层级"), "显示细胞面板（层级最深处）");
assert(text().includes("天然起搏器"), "显示细胞冷知识");

console.log("\n[5] 面包屑回跳");
const crumbs = [...document.querySelectorAll(".body-breadcrumb button")];
const heartCrumb = crumbs.find((b) => b.textContent === "心脏");
heartCrumb.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
await sleep(600);
assert(window.location.hash === "#body/organ/heart", "面包屑可跳回器官");

console.log("\n[6] 交互埋点");
await fetch("http://localhost:8795/api/interactions", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ sessionId: "test-session", eventType: "explore", entityType: "organ", entitySlug: "heart" })
});

console.log(failures.length ? `\n失败 ${failures.length} 项` : "\n全部冒烟测试通过");
process.exit(failures.length ? 1 : 0);
