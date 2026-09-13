# 生态系统探索模块

在 BioLab 平台内实现的生态系统探索模块：以 **森林 / 草原 / 海洋 / 湿地** 四个典型生态系统为入口，
进入后可查看 **生产者、消费者、分解者与环境因素**，生物以节点形式展示在按营养级分层的网络图中，
连线体现能量流动、分解回归与环境支持关系。

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

关系类型：`energy`（食物→捕食者）、`decomposition`（有机体→分解者）、`support`（环境因素→生物）。

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

| 组件 | 说明 |
| --- | --- |
| `FoodWeb.tsx` | **可复用网络图组件**：任意生态系统传入 nodes/links 即可渲染。按营养级分层布局，关系按类型着色（能量=实线、分解/环境=虚线），支持 hover 邻里高亮、节点拖拽、点击选中 |
| `EcosystemsPage.tsx` | 生态系统入口页（四张卡片） |
| `EcosystemPage.tsx` | 详情页：环境因素条 + FoodWeb + 节点信息面板（展示该物种的捕食/被捕食/分解/环境依赖关系） |
| `AdminPage.tsx` | 数据管理后台：生态系统 / 物种 / 关系 三个管理页签 |

路由：`#/ecosystems`（入口）、`#/ecosystem/:slug`（详情）、`#/ecology-admin`（后台）。

## 复用方式

新增一个生态系统不需要写任何新组件：

1. 后台「生态系统」页签创建生态系统；
2. 「物种」页签勾选该物种所属的生态系统（已有物种直接复用）；
3. 「关系」页签选择生态系统后建立关系；
4. 前端详情页自动用同一个 `FoodWeb` 组件渲染。
