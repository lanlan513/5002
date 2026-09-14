import type { GraphEdge, GraphNode } from "../../../shared/contract";

/**
 * 极简力导向布局：电荷斥力 + 弹簧引力 + 向心引力，velocity-Verlet 积分。
 * 节点进入时被放置在父节点周围的环上，保证增量展开时新实体"生长"出来。
 */

export interface SimNode extends GraphNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** 0 = 自由布局；> 0 时位置钉死（如被拖拽的节点） */
  fixed: number;
}

export interface SimEdge extends GraphEdge {
  sourceNode: SimNode;
  targetNode: SimNode;
}

const REPULSION = 5200;
const SPRING = 0.018;
const IDEAL_LENGTH = 132;
const CENTER_GRAVITY = 0.0022;
const DAMPING = 0.86;
const MAX_SPEED = 14;

export class ForceLayout {
  nodes: SimNode[];
  edges: SimEdge[];
  private byId = new Map<string, SimNode>();
  private width = 900;
  private height = 640;

  constructor() {
    this.nodes = [];
    this.edges = [];
  }

  setViewport(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  /** 用一批种子节点/边重置整个模拟（切换焦点实体时使用） */
  load(nodes: GraphNode[], edges: GraphEdge[]) {
    this.nodes = [];
    this.edges = [];
    this.byId = new Map();
    this.merge(nodes, edges);
  }

  /** 找到/新增一个模拟节点；新节点沿给定父节点的切线环出生 */
  ensureNode(node: GraphNode, parentId?: string): SimNode {
    const existing = this.byId.get(node.id);
    if (existing) return existing;

    const simNode: SimNode = { ...node, x: 0, y: 0, vx: 0, vy: 0, fixed: 0 };
    const parent = parentId ? this.byId.get(parentId) : undefined;
    if (parent) {
      const siblings = this.nodes.filter((item) => Math.hypot(item.x - parent.x, item.y - parent.y) < 200).length;
      const angle = Math.random() * Math.PI * 2 + siblings * 0.7;
      const radius = 170;
      simNode.x = parent.x + Math.cos(angle) * radius;
      simNode.y = parent.y + Math.sin(angle) * radius;
    } else {
      simNode.x = this.width / 2 + (Math.random() - 0.5) * 120;
      simNode.y = this.height / 2 + (Math.random() - 0.5) * 120;
    }
    this.nodes.push(simNode);
    this.byId.set(node.id, simNode);
    return simNode;
  }

  /** 加入一批节点与边（增量），parentId 决定新节点的出生位置 */
  merge(nodes: GraphNode[], edges: GraphEdge[], parentId?: string) {
    nodes.forEach((node) => this.ensureNode(node, parentId));
    const known = new Set(this.edges.map((edge) => edge.id));
    edges.forEach((edge) => {
      if (known.has(edge.id)) return;
      const sourceNode = this.ensureNode(
        // 端点节点数据缺失时用占位（正常 API 会一起返回，这里仅兜底）
        nodes.find((node) => node.id === edge.source) ?? this.byId.get(edge.source) ?? dummyNode(edge.source),
        parentId
      );
      const targetNode = this.ensureNode(
        nodes.find((node) => node.id === edge.target) ?? this.byId.get(edge.target) ?? dummyNode(edge.target),
        parentId
      );
      this.edges.push({ ...edge, sourceNode, targetNode });
    });
  }

  getNode(id: string): SimNode | undefined {
    return this.byId.get(id);
  }

  /** 推进一帧；返回系统总动能，供调用方决定何时停止动画 */
  tick(): number {
    const { width, height } = this;
    const cx = width / 2;
    const cy = height / 2;

    // 两两电荷斥力（节点数小，O(n²) 足够）
    for (let i = 0; i < this.nodes.length; i += 1) {
      for (let j = i + 1; j < this.nodes.length; j += 1) {
        const a = this.nodes[i];
        const b = this.nodes[j];
        let dx = a.x - b.x;
        let dy = a.y - b.y;
        let distSq = dx * dx + dy * dy;
        if (distSq < 1) {
          dx = (Math.random() - 0.5) * 2;
          dy = (Math.random() - 0.5) * 2;
          distSq = dx * dx + dy * dy + 1;
        }
        const force = REPULSION / distSq;
        const dist = Math.sqrt(distSq);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        a.vx += fx;
        a.vy += fy;
        b.vx -= fx;
        b.vy -= fy;
      }
    }

    // 弹簧引力
    this.edges.forEach((edge) => {
      const a = edge.sourceNode;
      const b = edge.targetNode;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.max(Math.hypot(dx, dy), 1);
      const force = (dist - IDEAL_LENGTH) * SPRING;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      a.vx += fx;
      a.vy += fy;
      b.vx -= fx;
      b.vy -= fy;
    });

    // 向心 + 积分
    let energy = 0;
    this.nodes.forEach((node) => {
      node.vx += (cx - node.x) * CENTER_GRAVITY;
      node.vy += (cy - node.y) * CENTER_GRAVITY;
      node.vx *= DAMPING;
      node.vy *= DAMPING;
      const speed = Math.hypot(node.vx, node.vy);
      if (speed > MAX_SPEED) {
        node.vx = (node.vx / speed) * MAX_SPEED;
        node.vy = (node.vy / speed) * MAX_SPEED;
      }
      if (node.fixed <= 0) {
        node.x += node.vx;
        node.y += node.vy;
      } else {
        node.fixed -= 1;
        node.vx = 0;
        node.vy = 0;
      }
      // 软边界，防止节点飞出画布
      const margin = 60;
      node.x = Math.min(Math.max(node.x, margin), width - margin);
      node.y = Math.min(Math.max(node.y, margin), height - margin);
      energy += node.vx * node.vx + node.vy * node.vy;
    });
    return energy;
  }
}

const dummyNode = (id: string): GraphNode => ({
  id,
  domain: "species",
  name: id,
  summary: ""
});
