import type { KnowledgeSeed, TopicSeed } from "./types.js";

export const topics: TopicSeed[] = [
  {
    slug: "cells",
    name: "细胞",
    shortName: "细胞",
    description: "在微观尺度观察生命如何维持秩序、交换能量与复制自身。",
    color: "#86e6bc",
    position: 1,
    icon: "circle-dot"
  },
  {
    slug: "genetics",
    name: "遗传",
    shortName: "遗传",
    description: "沿着 DNA 的信息流，理解性状、变异与传承。",
    color: "#e6bd73",
    position: 2,
    icon: "git-fork"
  },
  {
    slug: "evolution",
    name: "进化",
    shortName: "进化",
    description: "在深时间中追踪生命分化、适应与共同祖先。",
    color: "#e59bc8",
    position: 3,
    icon: "orbit"
  },
  {
    slug: "ecology",
    name: "生态",
    shortName: "生态",
    description: "看见物种、能量和环境在复杂网络中的彼此塑造。",
    color: "#8cb8f4",
    position: 4,
    icon: "network"
  },
  {
    slug: "human-body",
    name: "人体",
    shortName: "人体",
    description: "从系统协作的角度理解我们身体里的动态平衡。",
    color: "#ec8c78",
    position: 5,
    icon: "heart-pulse"
  },
  {
    slug: "biotech",
    name: "生物技术",
    shortName: "生技",
    description: "探索人类如何阅读、编辑与设计生物系统。",
    color: "#b099f2",
    position: 6,
    icon: "flask-conical"
  }
];

export const knowledge: KnowledgeSeed[] = [
  {
    slug: "cell-membrane",
    title: "细胞膜：选择性通透的边界",
    summary: "一层仅数纳米厚的磷脂双层，决定了细胞与世界交换什么。",
    content: "细胞膜并不是一道静止的墙。磷脂、蛋白质和糖链组成的动态界面，让细胞能够获取养分、排出代谢产物，并接收来自环境的信号。膜的选择性通透使每一个细胞都拥有可被调节的内部环境。",
    topicSlug: "cells",
    scale: "cell",
    readTime: 4,
    featured: true
  },
  {
    slug: "genetic-code",
    title: "遗传密码如何被翻译",
    summary: "DNA 上的序列如何经过转录与翻译，成为执行任务的蛋白质？",
    content: "遗传信息经由 RNA 被转录，再在核糖体上按三联体密码子翻译成氨基酸序列。这个看似线性的流程实际上不断受调控：何时读、读多少、在哪种细胞中读，都影响着最终性状。",
    topicSlug: "genetics",
    scale: "molecule",
    readTime: 5,
    featured: true
  },
  {
    slug: "natural-selection",
    title: "自然选择不是“更强者胜出”",
    summary: "适应度描述的是在特定环境中留下后代的相对机会。",
    content: "自然选择发生在可遗传变异、差异性生存与繁殖三者同时存在时。没有哪个性状放之四海皆优，环境变化会持续改变“适合”的含义。进化是群体在世代间发生的统计变化，而不是个体主动变得更好。",
    topicSlug: "evolution",
    scale: "organism",
    readTime: 6,
    featured: true
  },
  {
    slug: "food-web",
    title: "食物网中的能量去向",
    summary: "从一束阳光到一片森林，能量在每一次摄食中被转换与耗散。",
    content: "生态系统中的物种并非排成单线，而是形成彼此交织的食物网。生产者固定太阳能，消费者在取食中转移能量，分解者又将物质带回循环。网络越复杂，局部扰动的影响也越值得被仔细追踪。",
    topicSlug: "ecology",
    scale: "biosphere",
    readTime: 5,
    featured: true
  },
  {
    slug: "circulatory-system",
    title: "循环系统：持续流动的运输网",
    summary: "心脏、血管与血液协同，让氧、营养和信号抵达每一处组织。",
    content: "循环系统连接了人体的各个局部。心脏产生压力差，血管调节流速与分配，血液承载气体、营养、废物与免疫细胞。它并非孤立系统，而是与呼吸、消化和泌尿等系统实时耦合。",
    topicSlug: "human-body",
    scale: "system",
    readTime: 5,
    featured: false
  },
  {
    slug: "crispr",
    title: "CRISPR：可编程的基因编辑工具",
    summary: "借由向导 RNA，研究人员能让特定 DNA 序列成为编辑的目标。",
    content: "CRISPR 系统源于微生物的免疫机制。将其改造为研究工具后，科学家可以以向导 RNA 定位序列，再由相关蛋白进行切割或其他形式的编辑。它带来诊断、育种与治疗的可能性，也要求更审慎地面对安全与伦理问题。",
    topicSlug: "biotech",
    scale: "molecule",
    readTime: 7,
    featured: true
  }
];
