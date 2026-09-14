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

console.log("\n[7] 器官关系网络");
window.location.hash = "#body";
window.dispatchEvent(new window.Event("hashchange"));
await sleep(600);
// 前面进入过神经系统，先回到“全部”视图，耦合卡片只在人体总览层显示
const allFilter = [...document.querySelectorAll(".body-system-filter button")].find(
  (b) => (b.textContent ?? "").trim() === "全部"
);
allFilter?.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
await sleep(500);
assert(text().includes("系统不是孤立器官的集合"), "总览显示系统耦合引导卡片");
assert(text().includes("氧气之旅") && text().includes("水盐稳态"), "显示全部跨系统协作路径");
assert(document.querySelectorAll(".substance-legend i").length >= 8, "图例至少包含 8 种物质标记");
assert(document.querySelectorAll(".network-lane").length > 20, `人体图叠加器官关系连线（实际 ${document.querySelectorAll(".network-lane").length} 条 lane）`);

// 播放“氧气之旅”路径
const oxygenChip = [...document.querySelectorAll(".pathway-chip")].find((b) =>
  (b.textContent ?? "").includes("氧气之旅")
);
assert(Boolean(oxygenChip), "找到氧气之旅路径按钮");
oxygenChip.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
await sleep(300);
assert(text().includes("肺泡向血液充氧") || text().includes("空气经气管抵达肺泡"), "显示当前路径段的物质说明");
const currentStep = document.querySelector(".pathway-route li.is-current");
assert(Boolean(currentStep), "路径当前步骤被高亮");
const pulseHalo = document.querySelectorAll(".network-lane.is-pulse-halo");
assert(pulseHalo.length >= 1, "人体图上有正在播放脉冲的路径段");

// 暂停播放
const pauseButton = [...document.querySelectorAll(".pathway-play")].find((b) => (b.textContent ?? "").includes("暂停"));
pauseButton?.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
await sleep(150);
assert((document.querySelector(".pathway-play")?.textContent ?? "").includes("播放"), "路径可暂停");

console.log("\n[8] 器官页物质交换关系");
window.location.hash = "#body/organ/heart";
window.dispatchEvent(new window.Event("hashchange"));
await sleep(700);
assert(text().includes("与其他器官的物质交换"), "器官面板显示物质交换区块");
assert(text().includes("接收") && text().includes("输出"), "区分接收与输出方向");
const exchangeRows = document.querySelectorAll(".exchange-row");
assert(exchangeRows.length >= 3, `心脏至少有 3 条直接交换关系（实际 ${exchangeRows.length}）`);
assert([...exchangeRows].some((r) => (r.textContent ?? "").includes("肺")), "交换关系中出现肺（跨系统耦合）");

// 关系网络开关
const toggle = [...document.querySelectorAll(".body-network-toggle button")][0];
assert(Boolean(toggle), "存在关系网络开关");
toggle.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
await sleep(200);
assert(document.querySelectorAll(".network-lane").length === 0, "关闭后关系连线消失");
toggle.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
await sleep(200);
assert(document.querySelectorAll(".network-lane").length > 0, "重新开启后关系连线恢复");

console.log("\n[9] 关系 API");
const relations = await fetch("http://localhost:8795/api/body/relations").then((r) => r.json());
assert(relations.edges.length >= 30, `关系边数量充足（${relations.edges.length}）`);
assert(relations.pathways.length === 7, "返回 7 条协作路径");
assert(relations.substances.length === 8, "返回 8 种物质元数据");
assert(relations.nodes.length === 16, "返回 16 个器官节点坐标");
const edgeSlugs = new Set(relations.nodes.map((n) => n.slug));
assert(
  relations.edges.every((e) => edgeSlugs.has(e.from) && edgeSlugs.has(e.to)),
  "所有关系边都引用存在的器官"
);
assert(
  relations.edges.some((e) => e.substances.includes("oxygen") && e.from === "lungs" && e.to === "blood-vessels"),
  "肺 → 血管携带氧气"
);

console.log(failures.length ? `\n失败 ${failures.length} 项` : "\n全部冒烟测试通过");
process.exit(failures.length ? 1 : 0);
