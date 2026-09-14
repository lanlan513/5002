import type {
  BodySystemSeed,
  CellSeed,
  KnowledgeSeed,
  OrganSeed,
  TissueSeed,
  TopicSeed
} from "./types.js";

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
    description: "从系统、器官、组织到细胞，沿着空间位置深入身体内部。",
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
    featured: true,
    systemSlug: "circulatory"
  },
  {
    slug: "action-potential",
    title: "动作电位：神经系统的摩斯电码",
    summary: "离子通道有序开合，让电信号在神经元之间长距离传递。",
    content: "神经元静息时维持外正内负的电位差。受到刺激后，钠通道瞬间开放、钾通道随之关闭与重启，形成沿轴突传播的动作电位。全或无的脉冲像摩斯电码，频率与路径共同编码信息；化学突触再把信号交给下一个细胞。",
    topicSlug: "human-body",
    scale: "cell",
    readTime: 5,
    featured: true,
    systemSlug: "nervous"
  },
  {
    slug: "gas-exchange",
    title: "气体交换：一呼一吸之间的扩散",
    summary: "肺泡与毛细血管只隔着两层极薄的细胞膜。",
    content: "肺泡与毛细血管共同构成呼吸膜，厚度不足一微米。氧顺着分压差扩散进入血液，与血红蛋白结合；二氧化碳则反向扩散后被呼出。通气与血流精密匹配，使安静时全身组织都能稳定获得氧气。",
    topicSlug: "human-body",
    scale: "system",
    readTime: 4,
    featured: true,
    systemSlug: "respiratory"
  },
  {
    slug: "peristalsis",
    title: "蠕动：消化道的波浪式推进",
    summary: "环形与纵行平滑肌交替收缩，把食物一路送向吸收与排泄。",
    content: "从食管开始，消化道壁的环形肌在内容物前方舒张、后方收缩，纵行肌同步配合，形成向远端传播的蠕动波。肠神经系统即使脱离大脑也能编排这套节律，把机械消化、化学消化与吸收串联起来。",
    topicSlug: "human-body",
    scale: "system",
    readTime: 4,
    featured: false,
    systemSlug: "digestive"
  },
  {
    slug: "blood-filtering",
    title: "尿液如何形成：过滤、重吸收与分泌",
    summary: "每个肾脏含约百万个肾单位，每天处理约 180 升原尿。",
    content: "肾小球像高压滤网，把水和小分子从血液中滤出；肾小管再把绝大部分水、葡萄糖和电解质按身体需要重吸收，同时分泌废物。最终每天只有 1–2 升尿液离开，内环境的容量与成分因此保持稳定。",
    topicSlug: "human-body",
    scale: "system",
    readTime: 5,
    featured: false,
    systemSlug: "urinary"
  },
  {
    slug: "hormone-feedback",
    title: "激素与负反馈：身体的慢信道",
    summary: "内分泌腺释放化学信使，用浓度变化自我调节。",
    content: "与神经的电信号相比，激素通过血液传播，起效慢但作用持久。腺体持续感知血液中激素或靶物质的浓度，浓度升高便抑制上游分泌，形成负反馈环路。血糖、代谢率与水盐平衡都靠这套慢信道维持。",
    topicSlug: "human-body",
    scale: "system",
    readTime: 5,
    featured: false,
    systemSlug: "endocrine"
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

export const bodySystems: BodySystemSeed[] = [
  {
    slug: "nervous",
    name: "神经系统",
    shortName: "神经",
    description: "以电信号与化学信号整合全身信息，协调快速反应与长期记忆。",
    overview:
      "神经系统由中枢神经（脑与脊髓）和遍布全身的周围神经组成。它在毫秒尺度感知变化、做出决策并指挥效应器，同时负责意识、学习与记忆。",
    functions: ["感觉输入", "信息整合", "运动控制", "稳态与高级认知"],
    color: "#8ab8f8",
    icon: "brain",
    position: 1
  },
  {
    slug: "circulatory",
    name: "循环系统",
    shortName: "循环",
    description: "心脏、血管与血液构成封闭运输网，把氧和养分送到每个细胞。",
    overview:
      "循环系统以心脏为泵、血管为管路、血液为载体，负责运输氧气、营养、激素与废物，并参与体温调节和免疫防御。肺循环与体循环串联，一刻不停地运转。",
    functions: ["物质运输", "压力驱动", "体温调节", "免疫与凝血"],
    color: "#f27a7d",
    icon: "heart",
    position: 2
  },
  {
    slug: "respiratory",
    name: "呼吸系统",
    shortName: "呼吸",
    description: "通过通气与扩散完成摄氧排碳，并参与发声与酸碱平衡。",
    overview:
      "呼吸道把空气送达肺泡，肺泡与血液之间只隔着极薄的呼吸膜。膈肌与肋间肌改变胸腔容积，驱动约每分钟十几次的通气。",
    functions: ["摄取氧气", "排出二氧化碳", "调节酸碱平衡", "发声与嗅觉"],
    color: "#7fd6c0",
    icon: "wind",
    position: 3
  },
  {
    slug: "digestive",
    name: "消化系统",
    shortName: "消化",
    description: "把食物拆解成可吸收的小分子，并处理无法利用的残渣。",
    overview:
      "消化道是一条从口腔延伸到肛门的肌性管道，肝脏与胰腺等附属腺体向其中注入消化液。机械研磨、酶促分解与肠道吸收接力完成能量与原料的提取。",
    functions: ["机械与化学消化", "营养吸收", "废物排出", "肠脑信号"],
    color: "#e8b75f",
    icon: "soup",
    position: 4
  },
  {
    slug: "urinary",
    name: "泌尿系统",
    shortName: "泌尿",
    description: "过滤血液、生成尿液，精细调节水盐平衡与内环境稳定。",
    overview:
      "肾脏以百万个肾单位过滤血浆，再通过重吸收与分泌决定保留什么、丢弃什么。输尿管、膀胱与尿道负责储存和排出尿液。",
    functions: ["血液过滤", "水盐平衡", "废物排泄", "激素活化"],
    color: "#c9b06a",
    icon: "droplets",
    position: 5
  },
  {
    slug: "endocrine",
    name: "内分泌系统",
    shortName: "内分泌",
    description: "腺体分泌激素进入血液，用缓慢而持久的方式调节全身。",
    overview:
      "内分泌系统是身体的“慢信道”：下丘脑与垂体位于顶端，甲状腺、胰腺等腺体释放激素，经血液循环作用于远处靶细胞，主要靠负反馈维持平衡。",
    functions: ["激素分泌", "代谢调节", "生长与发育", "负反馈稳态"],
    color: "#c79bf0",
    icon: "gland",
    position: 6
  }
];

export const organs: OrganSeed[] = [
  {
    slug: "brain",
    name: "脑",
    systemSlug: "nervous",
    positionLabel: "颅腔内",
    summary: "约 860 亿个神经元组成的指挥中枢。",
    description:
      "脑位于颅腔内，分为大脑、小脑与脑干。大脑皮层负责感觉、随意运动、语言与意识，小脑精调运动与平衡，脑干调控呼吸、心率等生命节律，并连接脊髓。",
    functions: ["感知与意识", "运动规划", "记忆与学习", "生命节律调节"],
    facts: [
      "成年人大脑约含 860 亿个神经元。",
      "脑重量只占体重约 2%，却消耗约 20% 的能量。",
      "大脑皮层展开面积接近两张 A4 纸。"
    ],
    hotspot: { x: 120, y: 60, r: 28 }
  },
  {
    slug: "spinal-cord",
    name: "脊髓",
    systemSlug: "nervous",
    positionLabel: "脊柱椎管内",
    summary: "脑与躯体之间的信息高速公路，也是反射中枢。",
    description:
      "脊髓是位于椎管内的圆柱形神经组织，上行纤维把感觉信息送往脑，下行纤维把运动指令传出；灰质中的反射弧可不经过脑完成膝跳等快速反射。",
    functions: ["传导感觉与运动信号", "整合脊髓反射", "编排节律性运动"],
    facts: [
      "成人脊髓长约 40–45 厘米。",
      "脊髓在第一腰椎附近终止，下方是马尾状神经根。",
      "膝跳反射只需约 50 毫秒，无需大脑参与。"
    ],
    hotspot: { x: 120, y: 150, r: 6 }
  },
  {
    slug: "peripheral-nerves",
    name: "周围神经",
    systemSlug: "nervous",
    positionLabel: "四肢与躯干",
    summary: "从中枢伸向全身的电缆束，连接每一寸皮肤与肌肉。",
    description:
      "周围神经由成束的轴突构成，包括把信息传入中枢的感觉神经和把指令送往肌肉、腺体的运动神经，还包含调节内脏的自主神经。",
    functions: ["传导感觉信息", "支配肌肉与腺体", "自主调节内脏"],
    facts: [
      "最长的神经纤维可从脊髓一直延伸到脚趾。",
      "周围神经损伤后在一定条件下可再生。",
      "自主神经分交感与副交感，常常作用相反、彼此制衡。"
    ],
    hotspot: { x: 166, y: 316, r: 10 }
  },
  {
    slug: "heart",
    name: "心脏",
    systemSlug: "circulatory",
    positionLabel: "胸腔中部偏左",
    summary: "一天搏动约十万次的四腔肌性泵。",
    description:
      "心脏由心房与心室四个腔组成，瓣膜保证血液单向流动。窦房结自发产生电冲动，先让心房收缩、再经房室结延迟后激动心室，形成稳定节律。",
    functions: ["泵血维持血压", "分隔肺循环与体循环", "自动节律起搏"],
    facts: [
      "安静时心脏每天搏动约 10 万次。",
      "心脏可以在离体且供氧充足时自行搏动。",
      "冠状动脉紧贴心脏表面，专门为心肌供血。"
    ],
    hotspot: { x: 102, y: 210, r: 15 }
  },
  {
    slug: "blood-vessels",
    name: "血管",
    systemSlug: "circulatory",
    positionLabel: "遍布全身",
    summary: "动脉、毛细血管与静脉组成约十万公里的管路。",
    description:
      "动脉承受心脏泵出的高压血流，毛细血管壁薄如单层细胞以利交换，静脉在低压下把血液导回心脏，并靠瓣膜防止倒流。",
    functions: ["输送与分配血液", "完成物质交换", "调节血压与血流"],
    facts: [
      "全身血管首尾相连可绕地球两圈多。",
      "毛细血管直径常不足 10 微米，红细胞需排队通过。",
      "血管壁内的平滑肌可按需收缩或舒张。"
    ],
    hotspot: { x: 172, y: 224, r: 9 }
  },
  {
    slug: "lungs",
    name: "肺",
    systemSlug: "respiratory",
    positionLabel: "胸腔内心脏两侧",
    summary: "数亿个肺泡撑起约网球场大小的交换面积。",
    description:
      "左右两肺由逐级分支的支气管树与肺泡构成，外覆胸膜。肺泡周围密布毛细血管，吸入的氧在此进入血液，二氧化碳被释放并呼出。",
    functions: ["气体交换", "免疫防御", "调节血液酸碱度"],
    facts: [
      "两肺约有 3–5 亿个肺泡。",
      "肺泡总表面积约 70 平方米。",
      "右肺分三叶、左肺分两叶，为心脏留出空间。"
    ],
    hotspot: { x: 144, y: 196, r: 22 }
  },
  {
    slug: "trachea",
    name: "气管",
    systemSlug: "respiratory",
    positionLabel: "颈前正中、胸骨后方",
    summary: "带 C 形软骨环的通风管道。",
    description:
      "气管上接喉、下分左右主支气管，管壁的 C 形软骨保证管道始终开放。黏膜上的纤毛像传送带一样把黏附颗粒的黏液向上推向咽喉。",
    functions: ["传导空气", "清洁与加温加湿", "咳嗽反射"],
    facts: [
      "成人气管长约 10–12 厘米。",
      "C 形软骨缺口朝向食管，便于吞咽时食物通过。",
      "纤毛每秒摆动十几次，持续清理气道。"
    ],
    hotspot: { x: 120, y: 126, r: 7 }
  },
  {
    slug: "stomach",
    name: "胃",
    systemSlug: "digestive",
    positionLabel: "左上腹",
    summary: "用酸与蠕动把食物搅拌成食糜。",
    description:
      "胃是肌性囊袋，壁细胞分泌强酸，主细胞分泌胃蛋白酶原，三层平滑肌进行强力搅拌。食物在此变成酸性食糜，被分批小量排入十二指肠。",
    functions: ["储存与搅拌食物", "酸杀菌与初步消化", "分泌内因子"],
    facts: [
      "胃内 pH 可低至 1.5–2。",
      "胃黏膜每几天更新一次以抵御强酸。",
      "胃壁的三层平滑肌使其能多方向强力搅拌。"
    ],
    hotspot: { x: 100, y: 263, r: 14 }
  },
  {
    slug: "small-intestine",
    name: "小肠",
    systemSlug: "digestive",
    positionLabel: "腹腔中下部",
    summary: "长达六米的营养吸收主阵地。",
    description:
      "小肠分为十二指肠、空肠与回肠。环形皱襞、绒毛与微绒毛把吸收面积放大数百倍，胰液、胆汁与肠液在此完成绝大部分消化与吸收。",
    functions: ["消化酶解", "吸收营养与水", "分泌肠激素"],
    facts: [
      "成人小肠长约 4–6 米。",
      "绒毛与微绒毛使其表面积放大约 600 倍。",
      "食物通常要花 3–6 小时穿过小肠。"
    ],
    hotspot: { x: 112, y: 308, r: 17 }
  },
  {
    slug: "large-intestine",
    name: "大肠",
    systemSlug: "digestive",
    positionLabel: "腹腔外围",
    summary: "回收水分、培育肠道菌群并塑形粪便。",
    description:
      "大肠围绕小肠走行，包括结肠与直肠。它吸收剩余的水和电解质，肠道菌群发酵膳食纤维产生短链脂肪酸，残渣最终形成粪便。",
    functions: ["吸收水与电解质", "微生物发酵", "储存与排出粪便"],
    facts: [
      "大肠长约 1.5 米，直径明显大于小肠。",
      "肠道菌群数量与人体细胞数量处于同一数量级。",
      "每天约有 1–1.5 升水被大肠回收。"
    ],
    hotspot: { x: 139, y: 317, r: 12 }
  },
  {
    slug: "liver",
    name: "肝脏",
    systemSlug: "digestive",
    positionLabel: "右上腹",
    summary: "人体最大的腺体，承担数百种代谢任务。",
    description:
      "肝脏接收来自胃肠道的门静脉血，对营养进行加工储存，分泌胆汁帮助脂肪消化，同时解毒药物与代谢废物，并合成多种血浆蛋白。",
    functions: ["分泌胆汁", "代谢与储存营养", "解毒与合成蛋白"],
    facts: [
      "肝脏是人体最大的内脏器官，重约 1.2–1.5 千克。",
      "肝脏有强大的再生能力。",
      "每分钟流经肝脏的血液约 1.5 升。"
    ],
    hotspot: { x: 148, y: 258, r: 15 }
  },
  {
    slug: "kidneys",
    name: "肾脏",
    systemSlug: "urinary",
    positionLabel: "腹后壁脊柱两侧",
    summary: "一对豆形过滤器，每天处理约 180 升原尿。",
    description:
      "肾脏左右各一，每个含约百万个肾单位。肾小球滤出血浆，肾小管按需重吸收与分泌，在排出废物的同时维持水、电解质和酸碱平衡，还能活化维生素 D。",
    functions: ["过滤血液", "重吸收与分泌", "调节血压与造血信号"],
    facts: [
      "两个肾脏共约 200 万个肾单位。",
      "肾脏每天生成约 180 升原尿，最终只排出 1–2 升。",
      "肾脏分泌促红细胞生成素，刺激骨髓造血。"
    ],
    hotspot: { x: 150, y: 293, r: 9 }
  },
  {
    slug: "bladder",
    name: "膀胱",
    systemSlug: "urinary",
    positionLabel: "盆腔下部",
    summary: "可伸缩的尿液储囊。",
    description:
      "膀胱壁由移行上皮与厚实的逼尿肌构成，空虚时位于盆腔深处，充盈后可向上扩张。尿量达到阈值后触发排尿反射，由意识控制尿道括约肌。",
    functions: ["储存尿液", "触发排尿反射", "维持低压储尿"],
    facts: [
      "成人膀胱通常可容纳 400–500 毫升。",
      "移行上皮细胞能随膀胱充盈而变形。",
      "两侧输尿管以斜行方式穿入膀胱壁，防止尿液反流。"
    ],
    hotspot: { x: 120, y: 350, r: 10 }
  },
  {
    slug: "pituitary",
    name: "垂体",
    systemSlug: "endocrine",
    positionLabel: "大脑底部",
    summary: "豌豆大小，却是内分泌系统的“主控开关”。",
    description:
      "垂体悬于下丘脑下方，分为前叶与后叶。前叶分泌生长激素、促甲状腺激素等调控其他腺体，后叶释放下丘脑合成的抗利尿激素与催产素。",
    functions: ["调控生长与代谢", "指挥甲状腺与肾上腺", "调节水盐与分娩"],
    facts: [
      "垂体直径约 1 厘米、重不足 1 克。",
      "它通过一根细柄与下丘脑直接相连。",
      "多数内分泌腺都受垂体分泌的“促激素”管理。"
    ],
    hotspot: { x: 120, y: 86, r: 7 }
  },
  {
    slug: "thyroid",
    name: "甲状腺",
    systemSlug: "endocrine",
    positionLabel: "颈前部、气管前方",
    summary: "蝴蝶形腺体，设定全身的代谢节奏。",
    description:
      "甲状腺由左右两叶和峡部组成，滤泡细胞以碘为原料合成甲状腺激素，调控基础代谢、生长与神经发育；滤泡旁细胞还分泌降钙素。",
    functions: ["调节基础代谢", "促进生长发育", "参与钙平衡"],
    facts: [
      "甲状腺是人体内唯一大量储存激素的内分泌腺。",
      "合成甲状腺激素必需微量元素碘。",
      "吞咽时甲状腺会随喉结上下移动。"
    ],
    hotspot: { x: 120, y: 108, r: 8 }
  },
  {
    slug: "pancreas-gland",
    name: "胰腺（内分泌部）",
    systemSlug: "endocrine",
    positionLabel: "胃后方、腹膜后",
    summary: "胰岛分泌胰岛素与胰高血糖素，共管血糖。",
    description:
      "胰腺兼具外分泌与内分泌功能：胰岛中的 β 细胞分泌胰岛素降低血糖，α 细胞分泌胰高血糖素升高血糖，二者通过负反馈把血糖维持在狭窄范围。",
    functions: ["分泌胰岛素", "分泌胰高血糖素", "维持血糖稳态"],
    facts: [
      "胰岛只占胰腺体积的约 1–2%。",
      "健康人空腹血糖维持在约 4–6 mmol/L。",
      "β 细胞功能受损是 2 型糖尿病的关键环节。"
    ],
    hotspot: { x: 101, y: 292, r: 8 }
  }
];

export const tissues: TissueSeed[] = [
  {
    slug: "gray-matter",
    name: "大脑灰质",
    organSlug: "brain",
    layer: "皮层与深部核团",
    description: "神经元胞体、树突与突触密集的区域，是信息处理的主体。",
    functions: ["整合神经信号", "形成突触网络", "支持高级认知"]
  },
  {
    slug: "white-matter",
    name: "白质",
    organSlug: "brain",
    layer: "皮层深处",
    description: "由大量被髓鞘包裹的轴突束组成，负责在脑区间高速通信。",
    functions: ["长距离传导", "连接不同脑区"]
  },
  {
    slug: "spinal-gray",
    name: "脊髓灰质",
    organSlug: "spinal-cord",
    layer: "横切面中央（蝴蝶形）",
    description: "位于脊髓中央，含运动神经元、中间神经元与突触，是反射整合中心。",
    functions: ["接收感觉传入", "发出运动指令", "完成反射弧"]
  },
  {
    slug: "spinal-white",
    name: "脊髓白质",
    organSlug: "spinal-cord",
    layer: "灰质外围",
    description: "由上行与下行的有髓轴突束构成，把脊髓与脑连接起来。",
    functions: ["上传感觉信息", "下达运动指令"]
  },
  {
    slug: "nerve-fascicles",
    name: "神经束",
    organSlug: "peripheral-nerves",
    layer: "神经干内部",
    description: "成束的轴突被神经束膜包裹，许多神经束再集合为一条神经。",
    functions: ["成束传导冲动", "分隔保护纤维"]
  },
  {
    slug: "nerve-connective",
    name: "神经结缔组织",
    organSlug: "peripheral-nerves",
    layer: "神经外膜与束膜",
    description: "由胶原纤维与成纤维细胞构成，为神经提供弹性、营养通道与物理保护。",
    functions: ["机械保护", "维持血供通道"]
  },
  {
    slug: "myocardium",
    name: "心肌组织",
    organSlug: "heart",
    layer: "心脏壁中层",
    description: "分支并互相连接的横纹肌细胞靠闰盘同步收缩，构成厚实的心脏壁。",
    functions: ["节律性收缩射血", "同步传导兴奋"]
  },
  {
    slug: "endocardium",
    name: "心内膜",
    organSlug: "heart",
    layer: "心腔内壁",
    description: "衬在各心腔内表面的单层内皮及薄层结缔组织，与血管内皮连续。",
    functions: ["形成光滑血流面", "参与瓣膜结构"]
  },
  {
    slug: "endothelium",
    name: "血管内皮",
    organSlug: "blood-vessels",
    layer: "血管最内层",
    description: "单层扁平上皮紧贴血流，能感知剪切力并释放舒张、凝血等信号。",
    functions: ["调节血管张力", "抗凝血屏障", "调控物质通透"]
  },
  {
    slug: "vascular-smooth-muscle",
    name: "血管平滑肌",
    organSlug: "blood-vessels",
    layer: "中膜",
    description: "环形排列的平滑肌层，在神经与局部化学信号调节下收缩或舒张。",
    functions: ["调节管径与血压", "重新分配血流"]
  },
  {
    slug: "alveolar-tissue",
    name: "肺泡组织",
    organSlug: "lungs",
    layer: "呼吸性细支气管末端",
    description: "大量薄壁肺泡与毛细血管紧贴，构成厚度不足一微米的呼吸膜。",
    functions: ["气体扩散交换", "表面活性物质分泌"]
  },
  {
    slug: "bronchial-mucosa",
    name: "支气管黏膜",
    organSlug: "lungs",
    layer: "气道内壁",
    description: "假复层纤毛上皮与腺体分泌黏液，黏住颗粒并靠纤毛向上清扫。",
    functions: ["黏液纤毛清除", "湿润与保护气道"]
  },
  {
    slug: "tracheal-cartilage",
    name: "气管软骨与外膜",
    organSlug: "trachea",
    layer: "管壁前外侧",
    description: "C 形透明软骨环由结缔组织相连，维持管道开放并允许食管扩张。",
    functions: ["支撑气道", "保持弹性"]
  },
  {
    slug: "tracheal-mucosa",
    name: "气管黏膜",
    organSlug: "trachea",
    layer: "管壁最内层",
    description: "带纤毛的上皮与杯状细胞构成黏液纤毛屏障，并对空气加温加湿。",
    functions: ["黏附异物", "纤毛向上清除"]
  },
  {
    slug: "gastric-mucosa",
    name: "胃黏膜",
    organSlug: "stomach",
    layer: "胃壁最内层",
    description: "布满胃小凹的上皮层，内有分泌酸、酶和黏液的多种腺体。",
    functions: ["分泌胃液", "形成黏液碳酸氢盐屏障"]
  },
  {
    slug: "gastric-muscle",
    name: "胃壁平滑肌",
    organSlug: "stomach",
    layer: "黏膜下层之外",
    description: "纵行、环形与斜行三层平滑肌交叠，产生强力而多方向的搅拌。",
    functions: ["机械研磨", "推动食糜排空"]
  },
  {
    slug: "intestinal-villi",
    name: "小肠绒毛上皮",
    organSlug: "small-intestine",
    layer: "黏膜层",
    description: "指状绒毛表面的单层柱状上皮与微绒毛，极大扩展吸收面积。",
    functions: ["吸收营养", "分泌消化酶与激素"]
  },
  {
    slug: "intestinal-wall-muscle",
    name: "肠壁肌层",
    organSlug: "small-intestine",
    layer: "黏膜下层外",
    description: "内环外纵两层平滑肌在肠神经丛协调下产生蠕动与分节运动。",
    functions: ["推进与混合食糜", "维持节律运动"]
  },
  {
    slug: "colonic-mucosa",
    name: "结肠黏膜",
    organSlug: "large-intestine",
    layer: "肠壁内层",
    description: "无绒毛的单层柱状上皮，杯状细胞丰富，主要负责吸水与润滑。",
    functions: ["吸收水和盐", "分泌黏液"]
  },
  {
    slug: "colonic-muscle",
    name: "结肠肌层",
    organSlug: "large-intestine",
    layer: "黏膜下层外",
    description: "环形肌完整、纵行肌聚成三条结肠带，形成袋状结肠并推动粪便。",
    functions: ["形成结肠袋", "集团蠕动"]
  },
  {
    slug: "hepatic-lobules",
    name: "肝小叶",
    organSlug: "liver",
    layer: "肝实质",
    description: "以中央静脉为中心、肝板放射排列的结构与功能单位，肝血窦穿行其间。",
    functions: ["代谢与合成", "胆汁生成", "过滤门静脉血"]
  },
  {
    slug: "portal-stroma",
    name: "门管间质",
    organSlug: "liver",
    layer: "肝小叶之间",
    description: "门管区内结缔组织包绕胆管、门静脉与肝动脉分支，构成肝的支架。",
    functions: ["支撑管道", "汇集胆汁与血流"]
  },
  {
    slug: "renal-cortex",
    name: "肾皮质",
    organSlug: "kidneys",
    layer: "肾外层",
    description: "肾小球与曲折肾小管密集的颗粒状外层，完成大部分过滤与重吸收。",
    functions: ["血液滤过", "近端与远端重吸收"]
  },
  {
    slug: "renal-medulla",
    name: "肾髓质",
    organSlug: "kidneys",
    layer: "肾内层（肾锥体）",
    description: "放射状排列的集合管与髓袢建立渗透梯度，使尿液得以浓缩。",
    functions: ["浓缩尿液", "渗透梯度调节"]
  },
  {
    slug: "bladder-urothelium",
    name: "膀胱移行上皮",
    organSlug: "bladder",
    layer: "膀胱壁最内层",
    description: "多层特化上皮，充盈时细胞变薄拉伸，并形成阻止尿液渗漏的屏障。",
    functions: ["适应扩张", "防渗屏障"]
  },
  {
    slug: "detrusor-muscle",
    name: "逼尿肌与间质",
    organSlug: "bladder",
    layer: "上皮层外",
    description: "三层交错的平滑肌与弹性结缔组织，使膀胱能低压储尿并协同排尿。",
    functions: ["储尿扩张", "收缩排尿"]
  },
  {
    slug: "anterior-pituitary",
    name: "垂体前叶腺组织",
    organSlug: "pituitary",
    layer: "垂体前叶",
    description: "由多种腺细胞索与血窦构成，受下丘脑释放激素控制，分泌多种促激素。",
    functions: ["分泌生长与促腺体激素", "响应下丘脑信号"]
  },
  {
    slug: "posterior-pituitary",
    name: "垂体后叶神经组织",
    organSlug: "pituitary",
    layer: "垂体后叶",
    description: "下丘脑神经元轴突末端与支持细胞组成，储存并释放抗利尿激素和催产素。",
    functions: ["储存激素", "按需释放激素"]
  },
  {
    slug: "thyroid-follicles",
    name: "甲状腺滤泡",
    organSlug: "thyroid",
    layer: "腺实质",
    description: "球形滤泡腔内充满胶质，滤泡上皮细胞以碘合成并储存甲状腺激素。",
    functions: ["合成甲状腺激素", "胶体储存"]
  },
  {
    slug: "thyroid-stroma",
    name: "滤泡旁细胞与间质",
    organSlug: "thyroid",
    layer: "滤泡之间",
    description: "滤泡旁细胞散在于滤泡基底，富血管的间质为激素快速入血提供通道。",
    functions: ["分泌降钙素", "支持与供血"]
  },
  {
    slug: "pancreatic-acini",
    name: "胰腺腺泡",
    organSlug: "pancreas-gland",
    layer: "外分泌部",
    description: "浆液性腺细胞围成的腺泡，向导管分泌含多种消化酶的胰液。",
    functions: ["分泌消化酶", "排入十二指肠"]
  },
  {
    slug: "pancreatic-islets",
    name: "胰岛",
    organSlug: "pancreas-gland",
    layer: "散在腺泡之间",
    description: "成团的内分泌细胞团被丰富毛细血管包绕，直接向血液分泌血糖调节激素。",
    functions: ["分泌胰岛素与胰高血糖素", "血糖负反馈"]
  }
];

export const cells: CellSeed[] = [
  {
    slug: "neuron-brain",
    name: "神经元",
    tissueSlug: "gray-matter",
    morphology: "胞体加树突与细长轴突",
    function: "产生并传导电冲动，在突触间传递信息。",
    fact: "多数神经元伴随终身、不再分裂。"
  },
  {
    slug: "astrocyte",
    name: "星形胶质细胞",
    tissueSlug: "gray-matter",
    morphology: "星状多突起",
    function: "维持细胞外环境、供养神经元并参与血脑屏障。",
    fact: "它们是脑内数量最多的胶质细胞。"
  },
  {
    slug: "oligodendrocyte",
    name: "少突胶质细胞",
    tissueSlug: "white-matter",
    morphology: "少量突起包裹轴突",
    function: "形成髓鞘，加快神经冲动的跳跃传导。",
    fact: "一个细胞可同时包裹多条轴突。"
  },
  {
    slug: "microglia",
    name: "小胶质细胞",
    tissueSlug: "white-matter",
    morphology: "小胞体、多分支",
    function: "中枢神经系统的免疫细胞，清除碎片并修剪突触。",
    fact: "它们在脑内持续巡逻、随时变形响应损伤。"
  },
  {
    slug: "motor-neuron",
    name: "运动神经元",
    tissueSlug: "spinal-gray",
    morphology: "大胞体、长轴突出脊髓",
    function: "把指令从中枢传到骨骼肌，触发收缩。",
    fact: "支配小腿肌肉的轴突可长达一米。"
  },
  {
    slug: "interneuron",
    name: "中间神经元",
    tissueSlug: "spinal-gray",
    morphology: "轴突较短",
    function: "在反射弧中连接感觉与运动神经元，进行局部整合。",
    fact: "人体神经元绝大多数是中间神经元。"
  },
  {
    slug: "schwann-cell",
    name: "施万细胞",
    tissueSlug: "spinal-white",
    morphology: "扁平卷绕轴突",
    function: "在周围神经系统形成髓鞘，并帮助轴突再生。",
    fact: "每段髓鞘只由一个施万细胞构成。"
  },
  {
    slug: "sensory-neuron",
    name: "感觉神经元",
    tissueSlug: "nerve-fascicles",
    morphology: "假单极、两端延伸",
    function: "把皮肤、肌肉和内脏的感觉信号传入脊髓。",
    fact: "胞体聚集在脊髓旁的背根神经节中。"
  },
  {
    slug: "fibroblast-nerve",
    name: "神经膜成纤维细胞",
    tissueSlug: "nerve-connective",
    morphology: "梭形扁平",
    function: "分泌胶原，维持神经外膜与束膜的强度。",
    fact: "神经损伤后它们参与形成再生通道。"
  },
  {
    slug: "cardiomyocyte",
    name: "心肌细胞",
    tissueSlug: "myocardium",
    morphology: "有横纹的分支短柱",
    function: "自主节律收缩，将血液泵出心脏。",
    fact: "闰盘让相邻细胞电耦合，心脏因此同步收缩。"
  },
  {
    slug: "pacemaker-cell",
    name: "起搏细胞",
    tissueSlug: "myocardium",
    morphology: "较小、肌原纤维少",
    function: "自发去极化，设定心脏搏动节律。",
    fact: "主要分布在窦房结，是心脏的天然起搏器。"
  },
  {
    slug: "endothelial-cell-heart",
    name: "心内膜内皮细胞",
    tissueSlug: "endocardium",
    morphology: "单层扁平",
    function: "形成光滑内腔，调节心腔内凝血与信号。",
    fact: "它们与全身血管内皮直接延续。"
  },
  {
    slug: "endothelial-cell",
    name: "内皮细胞",
    tissueSlug: "endothelium",
    morphology: "极薄的鳞状细胞",
    function: "控制血管通透性、张力并抑制异常凝血。",
    fact: "全身内皮铺展开面积可达数百平方米。"
  },
  {
    slug: "vascular-smooth-cell",
    name: "血管平滑肌细胞",
    tissueSlug: "vascular-smooth-muscle",
    morphology: "长梭形单核",
    function: "收缩与舒张以调节血压和血流分配。",
    fact: "它们在受损血管壁中还能迁移修复。"
  },
  {
    slug: "type1-pneumocyte",
    name: "Ⅰ 型肺泡细胞",
    tissueSlug: "alveolar-tissue",
    morphology: "极薄、铺展宽大",
    function: "构成气体扩散的主要界面。",
    fact: "其胞质最薄处不足 0.1 微米。"
  },
  {
    slug: "type2-pneumocyte",
    name: "Ⅱ 型肺泡细胞",
    tissueSlug: "alveolar-tissue",
    morphology: "立方形、含分泌颗粒",
    function: "分泌表面活性物质，防止呼气末肺泡塌陷。",
    fact: "它们还能分化为 Ⅰ 型细胞修复肺泡。"
  },
  {
    slug: "ciliated-cell-bronchus",
    name: "纤毛上皮细胞",
    tissueSlug: "bronchial-mucosa",
    morphology: "柱状、顶端密布纤毛",
    function: "协同摆动，把黏液与颗粒向咽喉推送。",
    fact: "冷空气和烟雾会明显降低纤毛摆动效率。"
  },
  {
    slug: "goblet-cell-bronchus",
    name: "杯状细胞",
    tissueSlug: "bronchial-mucosa",
    morphology: "顶端膨大如酒杯",
    function: "分泌黏蛋白，黏住吸入的灰尘与微生物。",
    fact: "慢性刺激会使杯状细胞数量增多、痰量增加。"
  },
  {
    slug: "chondrocyte-trachea",
    name: "软骨细胞",
    tissueSlug: "tracheal-cartilage",
    morphology: "位于软骨陷窝内",
    function: "维持软骨基质，支撑气管保持开放。",
    fact: "成熟软骨细胞埋在自己分泌的基质中。"
  },
  {
    slug: "ciliated-cell-trachea",
    name: "气管纤毛细胞",
    tissueSlug: "tracheal-mucosa",
    morphology: "柱状、顶端有纤毛",
    function: "构成向上的黏液纤毛扶梯。",
    fact: "每分钟定向摆动约上千次。"
  },
  {
    slug: "parietal-cell",
    name: "壁细胞",
    tissueSlug: "gastric-mucosa",
    morphology: "大而嗜酸性",
    function: "分泌盐酸与内因子。",
    fact: "内因子是肠道吸收维生素 B12 所必需的。"
  },
  {
    slug: "chief-cell",
    name: "主细胞",
    tissueSlug: "gastric-mucosa",
    morphology: "柱状、基部嗜碱",
    function: "分泌胃蛋白酶原，启动蛋白质消化。",
    fact: "酶原在胃酸中才被激活，避免消化自身。"
  },
  {
    slug: "gastric-smooth-cell",
    name: "胃平滑肌细胞",
    tissueSlug: "gastric-muscle",
    morphology: "梭形单核",
    function: "三层交叠收缩，研磨并推送食糜。",
    fact: "其慢波节律决定胃蠕动频率。"
  },
  {
    slug: "enterocyte",
    name: "吸收上皮细胞",
    tissueSlug: "intestinal-villi",
    morphology: "柱状、顶端密布微绒毛",
    function: "吸收糖、氨基酸、脂肪与水。",
    fact: "一个细胞顶端约有上千根微绒毛。"
  },
  {
    slug: "paneth-cell",
    name: "潘氏细胞",
    tissueSlug: "intestinal-villi",
    morphology: "位于隐窝底部、含颗粒",
    function: "分泌防御素，维持肠道菌群平衡。",
    fact: "它们是小肠隐窝底部的“守卫”。"
  },
  {
    slug: "intestinal-smooth-cell",
    name: "肠平滑肌细胞",
    tissueSlug: "intestinal-wall-muscle",
    morphology: "细长梭形",
    function: "产生蠕动和分节运动，混合并推进食糜。",
    fact: "在肠神经调控下可自动产生节律收缩。"
  },
  {
    slug: "colonocyte",
    name: "结肠上皮细胞",
    tissueSlug: "colonic-mucosa",
    morphology: "柱状、微绒毛较短",
    function: "吸收剩余水分与电解质。",
    fact: "它们依赖短链脂肪酸作为部分能量来源。"
  },
  {
    slug: "goblet-cell-colon",
    name: "结肠杯状细胞",
    tissueSlug: "colonic-mucosa",
    morphology: "杯状黏液细胞",
    function: "大量分泌黏液，润滑粪便通过。",
    fact: "大肠中杯状细胞的密度远高于小肠。"
  },
  {
    slug: "colonic-smooth-cell",
    name: "结肠平滑肌细胞",
    tissueSlug: "colonic-muscle",
    morphology: "梭形、成束排列",
    function: "形成结肠袋并产生集团蠕动。",
    fact: "纵行肌聚成三条结肠带是大肠的标志。"
  },
  {
    slug: "hepatocyte",
    name: "肝细胞",
    tissueSlug: "hepatic-lobules",
    morphology: "大而多边形、常双核",
    function: "执行代谢、解毒、合成蛋白与分泌胆汁。",
    fact: "一个肝细胞内可同时进行数百种生化反应。"
  },
  {
    slug: "kupffer-cell",
    name: "库普弗细胞",
    tissueSlug: "hepatic-lobules",
    morphology: "贴壁的大型巨噬细胞",
    function: "清除血液中的衰老细胞与异物。",
    fact: "它们是人体内最大的定居巨噬细胞群之一。"
  },
  {
    slug: "cholangiocyte",
    name: "胆管上皮细胞",
    tissueSlug: "portal-stroma",
    morphology: "立方形到柱状",
    function: "输送并修饰胆汁，调节其成分。",
    fact: "它们能向胆汁中分泌碳酸氢盐。"
  },
  {
    slug: "podocyte",
    name: "足细胞",
    tissueSlug: "renal-cortex",
    morphology: "足突互相嵌合",
    function: "包绕肾小球毛细血管，构成滤过裂隙膜。",
    fact: "足突间隙的大小决定哪些蛋白能被滤出。"
  },
  {
    slug: "proximal-tubule-cell",
    name: "近端小管上皮细胞",
    tissueSlug: "renal-cortex",
    morphology: "立方、微绒毛密集",
    function: "重吸收绝大部分葡萄糖、水与电解质。",
    fact: "原尿中几乎全部葡萄糖在此被回收。"
  },
  {
    slug: "collecting-duct-cell",
    name: "集合管上皮细胞",
    tissueSlug: "renal-medulla",
    morphology: "立方形、排列成管",
    function: "在抗利尿激素调节下决定最终尿量。",
    fact: "需要保水时管壁对水的通透性会提高。"
  },
  {
    slug: "urothelial-cell",
    name: "伞状移行上皮细胞",
    tissueSlug: "bladder-urothelium",
    morphology: "表层大而扁平、可拉伸",
    function: "形成高度防渗的尿液屏障。",
    fact: "膀胱充盈时这些细胞从立方形被拉成扁平。"
  },
  {
    slug: "detrusor-cell",
    name: "逼尿肌细胞",
    tissueSlug: "detrusor-muscle",
    morphology: "梭形平滑肌",
    function: "排尿时整体收缩、升高膀胱内压。",
    fact: "储尿期它们保持松弛以维持低压。"
  },
  {
    slug: "growth-hormone-cell",
    name: "生长激素细胞",
    tissueSlug: "anterior-pituitary",
    morphology: "嗜酸性腺细胞",
    function: "分泌生长激素，促进生长与代谢。",
    fact: "这类细胞约占垂体前叶细胞的一半。"
  },
  {
    slug: "corticotroph-cell",
    name: "促肾上腺皮质激素细胞",
    tissueSlug: "anterior-pituitary",
    morphology: "嗜碱性腺细胞",
    function: "分泌 ACTH，指挥肾上腺皮质释放皮质醇。",
    fact: "长期应激会持续激活这条激素轴。"
  },
  {
    slug: "hypothalamic-axon-terminal",
    name: "下丘脑轴突末梢",
    tissueSlug: "posterior-pituitary",
    morphology: "膨大的神经末梢",
    function: "储存并释放抗利尿激素与催产素。",
    fact: "激素在胞体合成，经轴突长途运输到后叶。"
  },
  {
    slug: "follicular-cell",
    name: "滤泡上皮细胞",
    tissueSlug: "thyroid-follicles",
    morphology: "立方形、围成滤泡",
    function: "摄取碘并合成、释放甲状腺激素。",
    fact: "细胞活性增强时会从立方变成高柱状。"
  },
  {
    slug: "parafollicular-cell",
    name: "滤泡旁细胞",
    tissueSlug: "thyroid-stroma",
    morphology: "较大、位于滤泡基底",
    function: "分泌降钙素，降低血钙水平。",
    fact: "在 HE 切片中胞质染色较浅，又称 C 细胞。"
  },
  {
    slug: "acinar-cell",
    name: "腺泡细胞",
    tissueSlug: "pancreatic-acini",
    morphology: "锥体形、顶部含酶原颗粒",
    function: "分泌胰淀粉酶、脂肪酶与蛋白酶原。",
    fact: "每天可向肠道分泌约一升胰液。"
  },
  {
    slug: "beta-cell",
    name: "β 细胞",
    tissueSlug: "pancreatic-islets",
    morphology: "胰岛中央的聚集成团细胞",
    function: "血糖升高时分泌胰岛素，促进糖的摄取与储存。",
    fact: "β 细胞约占胰岛细胞的 60–70%。"
  },
  {
    slug: "alpha-cell",
    name: "α 细胞",
    morphology: "多位于胰岛周边",
    tissueSlug: "pancreatic-islets",
    function: "血糖偏低时分泌胰高血糖素，动员肝糖原。",
    fact: "胰岛素与胰高血糖素作用相反、共同稳糖。"
  }
];
