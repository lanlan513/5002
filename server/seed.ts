import type { EraSeed, KnowledgeSeed, OrganismSeed, TimelineEventSeed, TopicSeed } from "./types.js";

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

export const eras: EraSeed[] = [
  {
    slug: "hadean",
    name: "冥古宙",
    nameEn: "Hadean",
    rank: "宙",
    startMya: 4600,
    endMya: 4000,
    color: "#e08a63",
    tagline: "岩浆之海与陨石之雨，地球在混沌中成形。",
    environment: "初生的地球表面被岩浆洋覆盖，小行星撞击频繁。随着地表冷却，水蒸气凝结成最早的海洋；大气以二氧化碳、氮气和水蒸气为主，没有氧气，也没有臭氧层。约 44 亿年前，原始地壳与液态水出现，深海热泉与浅海孔隙为生命的化学起源准备了舞台。",
    position: 1
  },
  {
    slug: "archean",
    name: "太古宙",
    nameEn: "Archean",
    rank: "宙",
    startMya: 4000,
    endMya: 2500,
    color: "#e6bd73",
    tagline: "在缺氧的浅海与热泉边，生命悄然点火。",
    environment: "太阳亮度只有今天的约四分之三，但浓厚的温室气体让海洋保持液态。大气中没有游离氧，火山岛与浅海热液喷口遍布。最早的原核生命——细菌与古菌——以化能合成和原始光合作用获取能量；蓝藻建造的叠层石遍布浅滩，并用数亿年时间慢慢改变大气的成分。",
    position: 2
  },
  {
    slug: "proterozoic",
    name: "元古宙",
    nameEn: "Proterozoic",
    rank: "宙",
    startMya: 2500,
    endMya: 541,
    color: "#b099f2",
    tagline: "氧气、真核细胞与多细胞——生命在漫长中场积蓄力量。",
    environment: "大氧化事件让大气与浅海逐渐积累氧气，臭氧层开始形成，但也引发厌氧生物的大量消亡与全球性的休伦冰期。真核细胞通过内共生获得线粒体与叶绿体，多细胞生物与有性生殖相继出现。末期的埃迪卡拉生物群演化出形态奇特的软体大型生物，为显生宙的大爆发埋下伏笔。",
    position: 3
  },
  {
    slug: "paleozoic",
    name: "古生代",
    nameEn: "Paleozoic",
    rank: "代",
    startMya: 541,
    endMya: 252,
    color: "#7fb8e8",
    tagline: "寒武纪的爆发之后，生命从海洋登上陆地。",
    environment: "寒武纪大爆发让几乎所有现代动物门类迅速登场，三叶虫统治海洋。随后植物与节肢动物先后登陆，泥盆纪的森林改变了大气与土壤，石炭纪的高氧世界孕育出巨型昆虫。末期盘古大陆形成、气候剧变，二叠纪末大灭绝抹去约 96% 的海洋物种，是生命史上最严重的一次危机。",
    position: 4
  },
  {
    slug: "mesozoic",
    name: "中生代",
    nameEn: "Mesozoic",
    rank: "代",
    startMya: 252,
    endMya: 66,
    color: "#8fd07f",
    tagline: "爬行动物的黄金时代，恐龙统治陆地一亿六千万年。",
    environment: "盘古大陆分裂，大西洋缓缓张开；气候总体温暖，两极没有永久冰盖。裸子植物构成广袤森林，恐龙、翼龙与海洋爬行动物占据主导生态位，小型哺乳动物在阴影中蛰伏。侏罗纪晚期鸟类由兽脚类恐龙演化而来，白垩纪开花植物兴起。6600 万年前的小行星撞击终结了这一切。",
    position: 5
  },
  {
    slug: "cenozoic",
    name: "新生代",
    nameEn: "Cenozoic",
    rank: "代",
    startMya: 66,
    endMya: 0,
    color: "#ec8c78",
    tagline: "哺乳动物与鸟类的辐射演化，直到人类点亮文明。",
    environment: "撞击之后生态系统迅速恢复，哺乳动物与鸟类快速辐射，占据空出的生态位。板块碰撞抬升青藏高原，南极冰盖形成，气候总体变冷变干，草原取代森林扩张。灵长类中的一支走向直立行走；约 30 万年前智人出现，末次冰期结束后农业与文明兴起，人类活动开始重塑整个生物圈。",
    position: 6
  }
];

export const organisms: OrganismSeed[] = [
  { slug: "cyanobacteria", name: "蓝藻与叠层石", latin: "Cyanobacteria", mya: 3500, eraSlug: "archean", category: "微生物", icon: "layers", prominence: 1, description: "最早的光合作用者之一。蓝藻在浅海中层层捕获沉积物，筑起至今仍能见到的叠层石，并用数亿年时间把氧气注入大气。" },
  { slug: "eukaryote", name: "原始真核生物", latin: "Eukaryota", mya: 1800, eraSlug: "proterozoic", category: "微生物", icon: "circle-dot", prominence: 1, description: "一次古菌与细菌的内共生，让细胞拥有了细胞核与线粒体。真核细胞的出现，为一切复杂生命——包括我们——铺平了道路。" },
  { slug: "dickinsonia", name: "狄更逊水母", latin: "Dickinsonia", mya: 575, eraSlug: "proterozoic", category: "无脊椎动物", icon: "disc", prominence: 2, description: "埃迪卡拉生物群的代表，形似一张椭圆形的软垫，最大可超过一米。它没有口和消化道，可能直接通过体表吸收海水中的营养。" },
  { slug: "trilobite", name: "三叶虫", latin: "Trilobita", mya: 521, eraSlug: "paleozoic", category: "无脊椎动物", icon: "bug", prominence: 1, description: "寒武纪海洋的标志性节肢动物，背甲纵分为三叶。它们在海洋中繁盛了近 3 亿年，留下海量化石，直到二叠纪末大灭绝才谢幕。" },
  { slug: "myllokunmingia", name: "昆明鱼", latin: "Myllokunmingia", mya: 518, eraSlug: "paleozoic", category: "鱼类", icon: "fish", prominence: 2, description: "已知最早的脊椎动物之一，体长仅约 3 厘米，却已拥有脊索、鳃弓与分节的肌肉——我们身体蓝图写下的第一版草稿。" },
  { slug: "anomalocaris", name: "奇虾", latin: "Anomalocaris", mya: 508, eraSlug: "paleozoic", category: "无脊椎动物", icon: "eye", prominence: 2, description: "寒武纪海洋的顶级掠食者，体长可达一米，长着带刺的捕捉附肢与巨大的复眼，是当时最可怕的猎手。" },
  { slug: "cooksonia", name: "裸蕨", latin: "Cooksonia", mya: 425, eraSlug: "paleozoic", category: "植物", icon: "leaf", prominence: 3, description: "最早登上陆地的维管植物之一，只有几厘米高，没有叶子，用简单的枝杈撑起了陆地生态系统的第一抹绿色。" },
  { slug: "dunkleosteus", name: "邓氏鱼", latin: "Dunkleosteus", mya: 382, eraSlug: "paleozoic", category: "鱼类", icon: "fish-symbol", prominence: 2, description: "泥盆纪的海洋霸主，体长可达 6 米，头胸覆盖厚重骨甲，颌部的骨刃能剪碎几乎任何猎物。" },
  { slug: "tiktaalik", name: "提塔利克鱼", latin: "Tiktaalik", mya: 375, eraSlug: "paleozoic", category: "鱼类", icon: "fish", prominence: 3, description: "鱼与四足动物之间的过渡化石：鳃与肺并存，鳍中藏着腕骨与指骨的雏形，预告了脊椎动物的登陆。" },
  { slug: "ichthyostega", name: "鱼石螈", latin: "Ichthyostega", mya: 365, eraSlug: "paleozoic", category: "两栖类", icon: "footprints", prominence: 2, description: "最早的四足动物之一，长着强壮的四肢却仍离不开水。它的出现，标志着脊椎动物正式踏上陆地。" },
  { slug: "lepidodendron", name: "鳞木", latin: "Lepidodendron", mya: 320, eraSlug: "paleozoic", category: "植物", icon: "tree-pine", prominence: 3, description: "石炭纪沼泽森林的巨人，高可达 40 米。这些森林的遗骸深埋地下，最终变成了今天燃烧的煤炭。" },
  { slug: "meganeura", name: "巨脉蜻蜓", latin: "Meganeura", mya: 315, eraSlug: "paleozoic", category: "无脊椎动物", icon: "wind", prominence: 3, description: "石炭纪高氧天空中的巨虫，翼展可达 70 厘米，是有史以来最大的飞行昆虫之一。" },
  { slug: "hylonomus", name: "林蜥", latin: "Hylonomus", mya: 312, eraSlug: "paleozoic", category: "爬行类", icon: "turtle", prominence: 3, description: "已知最早的爬行动物之一，只有约 20 厘米长。羊膜卵让脊椎动物摆脱了对水体的依赖，得以深入内陆。" },
  { slug: "ammonite", name: "菊石", latin: "Ammonoidea", mya: 240, eraSlug: "mesozoic", category: "无脊椎动物", icon: "snail", prominence: 3, description: "中生代海洋中最繁盛的头足类，螺旋形外壳是化石猎人最熟悉的藏品，最终与恐龙一同在 6600 万年前消失。" },
  { slug: "morganucodon", name: "摩根锥齿兽", latin: "Morganucodon", mya: 205, eraSlug: "mesozoic", category: "哺乳类", icon: "paw-print", prominence: 3, description: "最早的哺乳动物之一，只有鼩鼱大小，在恐龙的阴影下昼伏夜出，安静等待属于自己的时代。" },
  { slug: "stegosaurus", name: "剑龙", latin: "Stegosaurus", mya: 155, eraSlug: "mesozoic", category: "恐龙", icon: "bone", prominence: 2, description: "背上有两排骨板、尾端长着四根尖刺的植食恐龙。骨板可能用于调节体温，也可能是向同类展示的招牌。" },
  { slug: "diplodocus", name: "梁龙", latin: "Diplodocus", mya: 154, eraSlug: "mesozoic", category: "恐龙", icon: "bone", prominence: 3, description: "体长可超过 25 米的蜥脚类恐龙，用鞭子般的长尾与梳子状的牙齿，横扫侏罗纪的蕨类平原。" },
  { slug: "archaeopteryx", name: "始祖鸟", latin: "Archaeopteryx", mya: 150, eraSlug: "mesozoic", category: "鸟类", icon: "bird", prominence: 1, description: "长着羽毛与翅膀，却也保留着牙齿和爪子的“第一只鸟”，是恐龙向鸟类演化的关键证据。" },
  { slug: "angiosperm", name: "最早的开花植物", latin: "Angiospermae", mya: 130, eraSlug: "mesozoic", category: "植物", icon: "flower-2", prominence: 2, description: "白垩纪出现的花与果实彻底改变了陆地生态：植物与昆虫开始协同演化，也为哺乳动物准备了新的食物。" },
  { slug: "pteranodon", name: "无齿翼龙", latin: "Pteranodon", mya: 85, eraSlug: "mesozoic", category: "爬行类", icon: "feather", prominence: 3, description: "翼展可达 7 米的飞行爬行动物——翼龙不是恐龙，也不是鸟，而是演化史上第一群飞上天空的脊椎动物。" },
  { slug: "mosasaurus", name: "沧龙", latin: "Mosasaurus", mya: 75, eraSlug: "mesozoic", category: "爬行类", icon: "waves", prominence: 3, description: "白垩纪海洋的顶级掠食者，由陆生蜥蜴重返海洋演化而来，体长可超过 15 米。" },
  { slug: "tyrannosaurus", name: "霸王龙", latin: "Tyrannosaurus rex", mya: 68, eraSlug: "mesozoic", category: "恐龙", icon: "bone", prominence: 1, description: "末代恐龙王朝的顶点：体长 12 米、咬合力数吨。它统治了白垩纪末期的北美，直到小行星终结中生代。" },
  { slug: "triceratops", name: "三角龙", latin: "Triceratops", mya: 67, eraSlug: "mesozoic", category: "恐龙", icon: "bone", prominence: 3, description: "长着三只角与巨大颈盾的植食恐龙，是霸王龙同时代的对手，也是最后一批非鸟恐龙。" },
  { slug: "basilosaurus", name: "龙王鲸", latin: "Basilosaurus", mya: 38, eraSlug: "cenozoic", category: "哺乳类", icon: "waves", prominence: 3, description: "早期鲸类，细长的身体可达 18 米。它残存的小小后肢，记录着哺乳动物重返海洋的旅程。" },
  { slug: "australopithecus", name: "南方古猿", latin: "Australopithecus", mya: 3.9, eraSlug: "cenozoic", category: "人类", icon: "footprints", prominence: 2, description: "著名的“露西”所属的人族成员，已经习惯直立行走，脑容量却仍接近黑猩猩——行走先于智慧。" },
  { slug: "homo-erectus", name: "直立人", latin: "Homo erectus", mya: 1.9, eraSlug: "cenozoic", category: "人类", icon: "flame", prominence: 3, description: "最早走出非洲、使用火与石器的人属成员，在地球上生存了近 200 万年，远比智人长久。" },
  { slug: "mammoth", name: "真猛犸象", latin: "Mammuthus primigenius", mya: 0.4, eraSlug: "cenozoic", category: "哺乳类", icon: "snowflake", prominence: 3, description: "冰原上的长毛巨兽，与早期人类共享更新世的大地，直到约 4000 年前才彻底消失。" },
  { slug: "homo-sapiens", name: "智人", latin: "Homo sapiens", mya: 0.3, eraSlug: "cenozoic", category: "人类", icon: "brain", prominence: 1, description: "约 30 万年前出现在非洲。语言、合作与想象力让这一物种走出非洲、遍布全球，并开始改写整个生物圈的命运。" }
];

export const timelineEvents: TimelineEventSeed[] = [
  { slug: "earth-forms", title: "地球形成", mya: 4600, kind: "origin", description: "太阳系星云中的尘埃与岩石碰撞聚集，形成原始的地球；随后一次巨大的撞击抛出了月球的原料。" },
  { slug: "first-ocean", title: "原始海洋出现", mya: 4400, kind: "origin", description: "地表冷却使水蒸气凝结成雨，汇聚成最早的海洋——生命未来的摇篮。" },
  { slug: "life-origin", title: "最早的生命迹象", mya: 3800, kind: "origin", description: "格陵兰与加拿大的古老岩石中留下了碳同位素与疑似微体化石的痕迹，暗示生命此时已经存在。" },
  { slug: "oxygenic-photosynthesis", title: "产氧光合作用", mya: 2700, kind: "transition", description: "蓝藻学会裂解水分子获取电子，氧气作为副产物被释放——它将彻底改变这颗行星。" },
  { slug: "great-oxidation", title: "大氧化事件", mya: 2400, kind: "transition", description: "大气中的游离氧首次显著积累，厌氧生物大量消亡，臭氧层开始形成，也可能触发了全球冰封。" },
  { slug: "eukaryotes-appear", title: "真核细胞出现", mya: 1800, kind: "origin", description: "内共生让细胞拥有了线粒体，能量效率大幅提升，复杂生命的舞台就此搭好。" },
  { slug: "multicellular-life", title: "多细胞生物出现", mya: 1050, kind: "origin", description: "红藻等化石显示细胞开始分工协作，有性生殖随之出现，演化按下了加速键。" },
  { slug: "snowball-earth", title: "“雪球地球”冰期", mya: 650, kind: "transition", description: "冰川可能一度推进到赤道，整个星球被冰雪覆盖。火山释放的二氧化碳最终让地球解冻。" },
  { slug: "ediacaran-biota", title: "埃迪卡拉生物群", mya: 575, kind: "radiation", description: "第一批大型多细胞生物出现，形态奇特、身体柔软，是动物演化的第一次大规模试验。" },
  { slug: "cambrian-explosion", title: "寒武纪生命大爆发", mya: 541, kind: "radiation", description: "在短短两千多万年内，几乎所有现代动物门类同时登场，眼睛、硬壳与捕食关系驱动了演化的军备竞赛。" },
  { slug: "ordovician-radiation", title: "奥陶纪生物大辐射", mya: 485, kind: "radiation", description: "海洋生物多样性在奥陶纪翻了数倍，笔石、腕足动物、珊瑚与早期鱼类繁盛。" },
  { slug: "plants-on-land", title: "植物登陆", mya: 470, kind: "transition", description: "苔藓般的微小植物首先上岸，随后维管植物让绿色铺满大陆，彻底改造了地表与大气。" },
  { slug: "ordovician-extinction", title: "奥陶纪末大灭绝", mya: 444, kind: "extinction", description: "第一次大灭绝：冰期与海平面剧变摧毁了约 85% 的海洋物种。" },
  { slug: "tetrapods-ashore", title: "四足动物登陆", mya: 375, kind: "transition", description: "肉鳍鱼的后代用带骨的鳍撑起身体走上陆地，脊椎动物开启了征服内陆的旅程。" },
  { slug: "devonian-extinction", title: "泥盆纪末大灭绝", mya: 372, kind: "extinction", description: "第二次大灭绝：海洋缺氧事件重创礁生态系统，盾皮鱼类从此衰落。" },
  { slug: "carboniferous-oxygen", title: "石炭纪高氧世界", mya: 315, kind: "transition", description: "广袤的沼泽森林让大气含氧量一度超过 30%，巨型蜻蜓与巨型马陆在这样的天空下繁衍。" },
  { slug: "permian-extinction", title: "二叠纪末大灭绝", mya: 252, kind: "extinction", description: "最严重的一次大灭绝：西伯利亚火山喷发引发气候失控，约 96% 的海洋物种与 70% 的陆生脊椎动物消失。" },
  { slug: "dinosaurs-appear", title: "恐龙登场", mya: 233, kind: "radiation", description: "卡尼期湿润事件之后，小型双足的主龙类迅速分化，恐龙时代悄然开启。" },
  { slug: "mammals-origin", title: "哺乳动物起源", mya: 205, kind: "origin", description: "毛发、乳腺与更高效的代谢出现，早期哺乳动物在恐龙的阴影下选择了夜行与小型化。" },
  { slug: "triassic-extinction", title: "三叠纪末大灭绝", mya: 201, kind: "extinction", description: "第四次大灭绝：大西洋张开的火山活动清空了大量生态位，恐龙由此接管陆地。" },
  { slug: "birds-origin", title: "鸟类起源", mya: 150, kind: "origin", description: "带羽毛的兽脚类恐龙飞向天空，始祖鸟留下了演化史上最著名的过渡化石。" },
  { slug: "flowers-bloom", title: "开花植物兴起", mya: 130, kind: "radiation", description: "被子植物用花与果实结盟昆虫和动物，迅速成为陆地植物的主角。" },
  { slug: "kpg-extinction", title: "K-Pg 大灭绝", mya: 66, kind: "impact", description: "一颗直径约 10 公里的小行星撞击今天的墨西哥湾，非鸟恐龙与菊石就此谢幕，哺乳动物的时代来临。" },
  { slug: "mammal-radiation", title: "哺乳动物大辐射", mya: 62, kind: "radiation", description: "空出的生态位被迅速填满：蝙蝠上天、鲸类入海、灵长类在树冠间穿梭。" },
  { slug: "antarctic-ice", title: "南极冰盖形成", mya: 34, kind: "transition", description: "环南极洋流隔绝了暖流，地球进入“冰室”气候，草原开始取代森林。" },
  { slug: "hominins-split", title: "人族起源", mya: 6.5, kind: "origin", description: "非洲的猿类中，一支开始尝试直立行走——人类与黑猩猩的演化道路在此分岔。" },
  { slug: "homo-sapiens-appear", title: "智人出现", mya: 0.3, kind: "origin", description: "在非洲，解剖学意义上的现代人登场；他们终将走出非洲，遍布全球。" },
  { slug: "agriculture", title: "农业与文明", mya: 0.012, kind: "transition", description: "末次冰期结束，人类开始驯化动植物，村庄、城市与文字相继出现，生物圈进入“人类世”。" }
];
