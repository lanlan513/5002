# BioDataHub · 统一生物数据中心

将**物种、基因、细胞、生态系统、人体**五类生物数据纳入统一数据结构集中管理；
提供数据浏览、全文搜索、多维筛选与分页能力。前端所有主要数据均通过 API 获取，
不存在各模块各自维护一份数据的情况。

## 核心设计

### 1. 统一数据结构（单一事实来源）

`shared/contract.ts` 是前后端唯一共享的数据契约：

- `BioRecord` —— 五类数据共用同一条记录结构，以 `category` 区分数据域；
  域内差异通过受控扩展槽 `metrics / attributes / links` 承载，新增字段不改表结构。
- `Taxonomy / taxonPath` —— 所有数据域共用的分类维度与面包屑路径。
- `themes` —— 受控主题词表，跨域可筛选。
- `RecordQuery / PaginatedRecords / FacetGroup` —— 查询、分页与分面的统一协议。

服务端（`server/`）与前端（`src/`）都从这一个文件导入类型，杜绝重复定义。

### 2. 统一 API（前端所有主要数据都走这里）

| 接口 | 说明 |
| --- | --- |
| `GET /api/categories` | 五大数据域元信息 |
| `GET /api/stats` | 全局聚合统计 |
| `GET /api/records` | 统一记录接口：`category / theme / dataType / kingdom / q / sort / page / pageSize`，返回分页结果 + 分面 |
| `GET /api/records/:id` | 单条记录详情（含跨域关联记录） |
| `POST /api/interactions` | 浏览行为埋点（失败不影响浏览） |

数据访问与查询/分面/分页逻辑集中在 `server/data/store.ts`，可平滑替换为真实数据库。

### 3. 浏览 / 搜索 / 筛选界面

- **浏览**：首页五大域入口 + 数据目录卡片网格；
- **搜索**：服务端多关键词全文匹配（名称、学名、编码、摘要、分类、主题、属性）；
  前端 300ms 防抖，请求可被 `AbortController` 取消，避免旧结果覆盖新结果；
- **筛选**：数据域 / 主题 / 数据类型 / 生物分类四个分面，分面计数由 API 返回，
  选中某维度后仍显示切换到其它选项后的数量；
- **排序 / 分页**：综合、名称、更新时间；数字分页，数据量增大后依旧可用；
- 查询条件全部同步到 URL，可分享、可前进后退、刷新不丢失。

### 4. 完整的加载 / 空结果 / 错误状态

- 首屏加载：旋转指示；列表加载：骨架屏；翻页/筛选刷新：顶部进度条并保留上一份结果；
- 空结果：说明当前条件并提供「清除全部条件」；
- 错误：归一化错误文案 + 重试；若已有旧数据则内联提示而不清空界面；
- 404 记录 / 未知路由 / 渲染崩溃（ErrorBoundary）均有兜底。

## 技术栈

React 19 + TypeScript + Vite，Express 5，无原生依赖（内存种子仓库，便于直接运行）。

## 运行

```bash
npm install
npm run dev        # 同时启动 API(8796) 与 Web(5186)，/api 已配代理
```

其它脚本：

```bash
npm run build      # 类型检查 + 生产构建
npm start          # 仅启动 API
npm run smoke      # jsdom 端到端冒烟测试（加载/筛选/搜索/空结果/错误重试/详情/路由）
```

打开 http://localhost:5186 ，从首页进入「浏览全部数据」或直接访问
`#/data?category=gene`、`#/data?q=DNA%20修复`、`#/data?theme=疾病` 等。

## 目录

```
shared/contract.ts        前后端共享的数据契约（唯一数据结构）
server/index.ts           Express 路由与参数校验
server/data/store.ts      统一查询：筛选 / 分面 / 排序 / 分页 / 关联
server/data/seed.ts       五类数据的统一种子记录
src/api/client.ts         API 客户端（错误归一化、中止、埋点）
src/hooks/useResource.ts  统一异步数据 hook（取消 / 防抖 / 保留旧数据 / 重试）
src/pages/                首页 / 数据浏览 / 记录详情
src/components/           分面、工具栏、分页、卡片、各类状态组件
scripts/smoke.tsx         端到端冒烟测试
```

> 数据为演示用整理的公开常识，部分数值为近似值，仅用于展示统一数据模型。
