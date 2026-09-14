# 生态系统探索模块

在 BioLab 平台内实现的生态系统探索模块：以 **森林 / 草原 / 海洋 / 湿地** 四个典型生态系统为入口，
进入后可查看 **生产者、消费者、分解者与环境因素**，生物以节点形式展示在按营养级分层的网络图中，
连线体现能量流动、分解回归、环境支持与物种竞争关系。

## 交互食物网

`FoodWeb` 不是静态关系图，而是一张可以围绕单个物种探索的交互食物网：

- **点击任一物种**：上游（食物方向）与下游（天敌方向）分别以绿色 / 红色高亮，
  被选中的能量边上有沿「食物 → 捕食者」方向流动的光点，直观表达能量传递方向；
  每个邻里节点上方挂语义标签（食物 / 天敌 / 竞争者 / 分解者 / 依赖环境）。
- **节点信息面板**：集中展示该物种的**主要食物**（绿色分区，含取食备注）、
  **天敌**（红色分区）、**竞争者**（自动推导，区分「共同取食 / 共同分解」并标注共享资源数）、
  以及沿捕食关系回溯得到的 **能量传递路径（食物链）**。
- **竞争关系自动推导**（`src/ecology/food-web-utils.ts`）：不入库，前端从
  「多个消费者取食同一猎物」「多个分解者分解同一有机对象」的已有关系实时计算，
  以紫色无向弧线表达（实线关系的「对偶关系」）。可在工具栏一键开关。
- **局部网络观察**：面板中点击「只看它所在的局部网络」（或聚焦节点）后，
  其他节点全部隐藏，只保留焦点物种 1 层 / 2 层无向邻里（含竞争者），
  保留全图坐标位置不跳变；顶部横幅显示节点数，可随时返回完整食物网。
- 支持 hover 邻里预览、节点拖拽、重置布局；空间布局始终表达营养结构，而非表格罗列。

## 运行

```bash
npm install
npm run dev        # 同时启动 API (8794) 与前端 (5184)
```

- 前端入口：`http://localhost:5184/#/ecosystems`
- 数据管理后台：`http://localhost:5184/#/ecology-admin`
- 首页也带有生态系统入口卡片。

## 架构

### 数据层（SQLite，server/db.ts）

| 表 | 说明 |
| --- | --- |
| `ecosystems` | 生态系统（名称、描述、气候、主题色、图标） |
| `species` | **全局物种库**：同一物种可被多个生态系统复用（如细菌、真菌） |
| `environmental_factors` | 全局环境因素库（阳光、水分、盐度……） |
| `ecosystem_species` | 物种 ↔ 生态系统成员关系（含该生态系统中的营养级） |
| `ecosystem_factors` | 环境因素 ↔ 生态系统成员关系 |
| `relationships` | 关系数据，统一按能量/物质流动方向存储：`from → to` |

入库关系类型：`energy`（食物→捕食者）、`decomposition`（有机体→分解者）、`support`（环境因素→生物）。
`competition`（竞争）不入库，由前端从 energy / decomposition 关系推导。

### API（server/ecology-api.ts）

```
GET    /api/ecosystems              生态系统列表（含物种/关系/环境因素计数）
GET    /api/ecosystems/:slug        详情 + 图数据（nodes + links）
POST   /api/ecosystems              新建生态系统
PUT    /api/ecosystems/:slug        更新
DELETE /api/ecosystems/:slug        删除（级联清理成员与关系）
GET    /api/species                 物种列表（含所属生态系统）
POST   /api/species                 录入物种（可同时指定所属生态系统）
PUT    /api/species/:slug           更新（可调整所属生态系统）
DELETE /api/species/:slug           删除（级联清理相关关系）
GET    /api/relationships?ecosystem=  关系列表
POST   /api/relationships           建立关系（校验两端节点已加入该生态系统、防重复）
DELETE /api/relationships/:id       删除关系
```

### 前端组件（src/ecology/）

| 文件 | 说明 |
| --- | --- |
| `FoodWeb.tsx` | **可复用网络图组件**：按营养级分层布局；关系按类型着色（能量=实线动画、分解/环境=虚线、竞争=紫色无向弧）；点击节点做上下游语义高亮、方向标签与能量流动光点；支持 `visibleIds` 局部网络模式、hover、节点拖拽 |
| `food-web-utils.ts` | 图算法：`deriveCompetition`（竞争推导）、`neighborhood`（无向 BFS 邻里）、`foodChains`（食物链回溯枚举） |
| `EcosystemsPage.tsx` | 生态系统入口页（四张卡片） |
| `EcosystemPage.tsx` | 详情页：图层工具栏（竞争开关 / 局部深度）+ 局部观察横幅 + 环境因素条 + FoodWeb + 节点面板（主要食物 / 天敌 / 竞争者 / 食物链 / 分解与环境关系） |
| `AdminPage.tsx` | 数据管理后台：生态系统 / 物种 / 关系 三个管理页签 |

路由：`#/ecosystems`（入口）、`#/ecosystem/:slug`（详情）、`#/ecology-admin`（后台）。

## 复用方式

新增一个生态系统不需要写任何新组件：

1. 后台「生态系统」页签创建生态系统；
2. 「物种」页签勾选该物种所属的生态系统（已有物种直接复用）；
3. 「关系」页签选择生态系统后建立关系；
4. 前端详情页自动用同一个 `FoodWeb` 组件渲染。
