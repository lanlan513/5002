import type {
  EcosystemSeed,
  FactorMembershipSeed,
  FactorSeed,
  MembershipSeed,
  RelationshipSeed,
  SpeciesSeed
} from "./ecology-types.js";

/* ------------------------------------------------------------------ */
/* 生态系统：森林 / 草原 / 海洋 / 湿地                                  */
/* ------------------------------------------------------------------ */

export const ecosystems: EcosystemSeed[] = [
  {
    slug: "forest",
    name: "森林生态系统",
    englishName: "Forest",
    description: "以乔木为骨架的垂直分层系统，能量沿树冠、林下到凋落物层逐级流动。",
    climate: "湿润 / 半湿润，四季分明",
    color: "#7fd6a4",
    icon: "trees",
    position: 1
  },
  {
    slug: "grassland",
    name: "草原生态系统",
    englishName: "Grassland",
    description: "以草本植物为主体的开阔系统，昼夜与季节温差大，能量流动直接而迅速。",
    climate: "半干旱，降水集中夏季",
    color: "#e3c878",
    icon: "wheat",
    position: 2
  },
  {
    slug: "ocean",
    name: "海洋生态系统",
    englishName: "Ocean",
    description: "地球上最大的生态系统，浮游植物支撑起从磷虾到鲸鱼的庞大食物网。",
    climate: "盐度稳定，洋流驱动物质循环",
    color: "#7fb8e8",
    icon: "waves",
    position: 3
  },
  {
    slug: "wetland",
    name: "湿地生态系统",
    englishName: "Wetland",
    description: "水陆交错的过渡带，兼具陆地与水域特征，是物种密度最高的系统之一。",
    climate: "长期或季节性积水",
    color: "#8fd8d0",
    icon: "droplets",
    position: 4
  }
];

/* ------------------------------------------------------------------ */
/* 物种库：全局统一维护，可被多个生态系统复用                            */
/* ------------------------------------------------------------------ */

export const species: SpeciesSeed[] = [
  // —— 生产者 ——
  { slug: "oak", name: "橡树", latinName: "Quercus spp.", role: "producer", trophicLevel: 1, description: "森林的建群种，树冠层为大量动物提供栖息地与橡实。" },
  { slug: "fern", name: "蕨类植物", latinName: "Pteridophyta", role: "producer", trophicLevel: 1, description: "阴湿林下的主要草本层，依靠孢子繁殖。" },
  { slug: "wildflower", name: "野花", latinName: "Angiospermae", role: "producer", trophicLevel: 1, description: "林缘与草原的开花植物，为传粉者提供花蜜。" },
  { slug: "grass", name: "禾草", latinName: "Poaceae", role: "producer", trophicLevel: 1, description: "草原的优势植物，根系致密，耐啃食与干旱。" },
  { slug: "shrub", name: "灌木", latinName: "Fruticeta", role: "producer", trophicLevel: 1, description: "草原与过渡带的木本植物，为小型动物提供遮蔽。" },
  { slug: "phytoplankton", name: "浮游植物", latinName: "Phytoplankton", role: "producer", trophicLevel: 1, description: "海洋初级生产力的主体，贡献了地球约一半的氧气。" },
  { slug: "kelp", name: "巨藻", latinName: "Macrocystis", role: "producer", trophicLevel: 1, description: "近海大型褐藻，形成水下森林，固着于岩礁。" },
  { slug: "reed", name: "芦苇", latinName: "Phragmites australis", role: "producer", trophicLevel: 1, description: "湿地的标志性挺水植物，净化水质并提供巢材。" },
  { slug: "water-lily", name: "睡莲", latinName: "Nymphaea", role: "producer", trophicLevel: 1, description: "浮叶植物，叶片为水生昆虫提供停歇平台。" },
  { slug: "algae", name: "藻类", latinName: "Algae", role: "producer", trophicLevel: 1, description: "浅水与湿地中的微型光合生物，繁殖迅速。" },

  // —— 消费者 ——
  { slug: "squirrel", name: "松鼠", latinName: "Sciurus vulgaris", role: "consumer", trophicLevel: 2, description: "以橡实、种子为食，同时也是森林种子的传播者。" },
  { slug: "caterpillar", name: "毛毛虫", latinName: "Lepidoptera larvae", role: "consumer", trophicLevel: 2, description: "鳞翅目幼虫，取食叶片，是鸟类重要的蛋白质来源。" },
  { slug: "deer", name: "梅花鹿", latinName: "Cervus nippon", role: "consumer", trophicLevel: 2, description: "林缘植食动物，取食嫩叶、蕨类与草本。" },
  { slug: "woodpecker", name: "啄木鸟", latinName: "Picidae", role: "consumer", trophicLevel: 3, description: "啄食树干中的昆虫，废弃的树洞会被其他动物利用。" },
  { slug: "fox", name: "狐狸", latinName: "Vulpes vulpes", role: "consumer", trophicLevel: 3, description: "机会主义捕食者，控制小型兽类与鸟类数量。" },
  { slug: "owl", name: "猫头鹰", latinName: "Strigiformes", role: "consumer", trophicLevel: 3, description: "夜行性猛禽，是森林鼠类最主要的天敌之一。" },
  { slug: "hawk", name: "鹰", latinName: "Accipitridae", role: "consumer", trophicLevel: 4, description: "顶级猛禽，活动范围可跨越森林与草原多个系统。" },
  { slug: "grasshopper", name: "蝗虫", latinName: "Acrididae", role: "consumer", trophicLevel: 2, description: "取食禾草叶片，种群暴发时可改变整个草原植被。" },
  { slug: "rabbit", name: "野兔", latinName: "Lepus", role: "consumer", trophicLevel: 2, description: "繁殖力强的植食动物，是多种捕食者的主要猎物。" },
  { slug: "antelope", name: "羚羊", latinName: "Antilopinae", role: "consumer", trophicLevel: 2, description: "群居植食动物，迁徙啃食促进草原更新。" },
  { slug: "field-mouse", name: "田鼠", latinName: "Microtus", role: "consumer", trophicLevel: 2, description: "穴居小型啮齿类，既吃草籽也取食昆虫。" },
  { slug: "snake", name: "草原蛇", latinName: "Colubridae", role: "consumer", trophicLevel: 3, description: "变温捕食者，以鼠类、蝗虫等为食，控制啮齿类数量。" },
  { slug: "wolf", name: "草原狼", latinName: "Canis lupus", role: "consumer", trophicLevel: 4, description: "群居顶级捕食者，通过捕食压力维持食草动物健康种群。" },
  { slug: "zooplankton", name: "浮游动物", latinName: "Zooplankton", role: "consumer", trophicLevel: 2, description: "滤食浮游植物的微小动物，是海洋能量传递的第一级消费者。" },
  { slug: "krill", name: "磷虾", latinName: "Euphausiacea", role: "consumer", trophicLevel: 2, description: "集群浮游甲壳类，连接浮游植物与大型动物的枢纽。" },
  { slug: "sardine", name: "沙丁鱼", latinName: "Sardina pilchardus", role: "consumer", trophicLevel: 3, description: "集群小型鱼类，滤食浮游生物，是中上层捕食者的主食。" },
  { slug: "sea-turtle", name: "海龟", latinName: "Chelonioidea", role: "consumer", trophicLevel: 3, description: "取食海藻与水母，帮助维持海草床健康。" },
  { slug: "tuna", name: "金枪鱼", latinName: "Thunnus", role: "consumer", trophicLevel: 4, description: "高速洄游的中层捕食者，维持鱼类群落结构。" },
  { slug: "shark", name: "鲨鱼", latinName: "Selachimorpha", role: "consumer", trophicLevel: 5, description: "海洋顶级捕食者，清除病弱个体，稳定食物网。" },
  { slug: "whale", name: "须鲸", latinName: "Mysticeti", role: "consumer", trophicLevel: 3, description: "滤食磷虾的巨型哺乳动物，鲸落可滋养深海分解者数十年。" },
  { slug: "mosquito-larva", name: "孑孓", latinName: "Culicidae larvae", role: "consumer", trophicLevel: 2, description: "蚊子的水生幼虫，滤食藻类与有机碎屑。" },
  { slug: "dragonfly", name: "蜻蜓", latinName: "Odonata", role: "consumer", trophicLevel: 3, description: "水陆两栖生活的捕食者，幼虫与成虫都捕食蚊虫。" },
  { slug: "frog", name: "青蛙", latinName: "Anura", role: "consumer", trophicLevel: 3, description: "湿地指示物种，皮肤对水质变化极其敏感。" },
  { slug: "crucian", name: "鲫鱼", latinName: "Carassius auratus", role: "consumer", trophicLevel: 2, description: "耐低氧的杂食性鱼类，是湿地食物网的重要中间环节。" },
  { slug: "heron", name: "苍鹭", latinName: "Ardea cinerea", role: "consumer", trophicLevel: 4, description: "涉禽顶级捕食者，静立浅水中捕食鱼类与蛙类。" },
  { slug: "duck", name: "野鸭", latinName: "Anas", role: "consumer", trophicLevel: 2, description: "杂食性水禽，取食水生植物与小型无脊椎动物。" },

  // —— 分解者 ——
  { slug: "fungi", name: "真菌", latinName: "Fungi", role: "decomposer", trophicLevel: 0, description: "分泌胞外酶分解木质素与纤维素，是森林物质循环的核心。" },
  { slug: "bacteria", name: "细菌", latinName: "Bacteria", role: "decomposer", trophicLevel: 0, description: "无处不在的微型分解者，将有机物矿化为无机养分。" },
  { slug: "earthworm", name: "蚯蚓", latinName: "Lumbricina", role: "decomposer", trophicLevel: 0, description: "吞食凋落物与土壤，改善土壤通气与肥力。" },
  { slug: "dung-beetle", name: "蜣螂", latinName: "Scarabaeinae", role: "decomposer", trophicLevel: 0, description: "将动物粪便滚成球埋入土中，加速养分回归草原。" },
  { slug: "sea-cucumber", name: "海参", latinName: "Holothuroidea", role: "decomposer", trophicLevel: 0, description: "海底清道夫，吞食沉积物中的有机碎屑。" },
  { slug: "crab", name: "招潮蟹", latinName: "Uca", role: "decomposer", trophicLevel: 0, description: "滩涂与近海的碎屑取食者，翻动沉积物促进分解。" },
  { slug: "snail", name: "螺类", latinName: "Gastropoda", role: "decomposer", trophicLevel: 0, description: "刮食藻类与腐殖质，是湿地碎屑循环的重要一环。" }
];

/* ------------------------------------------------------------------ */
/* 环境因素库：同样全局复用                                            */
/* ------------------------------------------------------------------ */

export const factors: FactorSeed[] = [
  { slug: "sunlight", name: "阳光", category: "能量输入", description: "几乎所有生态系统能量的最初来源，驱动光合作用。" },
  { slug: "water", name: "水分", category: "非生物物质", description: "降水与水体，决定生产者的分布与生长速率。" },
  { slug: "soil", name: "土壤", category: "非生物物质", description: "提供矿物质与扎根介质，是分解作用发生的主要场所。" },
  { slug: "temperature", name: "温度", category: "气候因子", description: "影响代谢速率、物候与物种的地理分布。" },
  { slug: "wind", name: "风", category: "气候因子", description: "传播种子与花粉，也加剧草原的水分蒸散。" },
  { slug: "salinity", name: "盐度", category: "化学因子", description: "海洋环境的基本特征，决定海洋生物的渗透调节方式。" },
  { slug: "current", name: "洋流", category: "物理因子", description: "输送热量与营养盐，塑造海洋生产力格局。" },
  { slug: "water-level", name: "水位", category: "水文因子", description: "湿地水文节律的核心，决定淹水范围与物种组成。" }
];

/* ------------------------------------------------------------------ */
/* 成员关系：物种 / 环境因素 → 生态系统                                 */
/* ------------------------------------------------------------------ */

const member = (ecosystem: string, list: string[]): MembershipSeed[] =>
  list.map((species) => ({ ecosystem, species }));

export const memberships: MembershipSeed[] = [
  ...member("forest", [
    "oak", "fern", "wildflower",
    "squirrel", "caterpillar", "deer", "woodpecker", "fox", "owl", "hawk",
    "fungi", "bacteria", "earthworm"
  ]),
  ...member("grassland", [
    "grass", "shrub", "wildflower",
    "grasshopper", "rabbit", "antelope", "field-mouse", "snake", "hawk", "wolf",
    "fungi", "bacteria", "earthworm", "dung-beetle"
  ]),
  ...member("ocean", [
    "phytoplankton", "kelp",
    "zooplankton", "krill", "sardine", "sea-turtle", "tuna", "shark", "whale",
    "bacteria", "sea-cucumber", "crab"
  ]),
  ...member("wetland", [
    "reed", "water-lily", "algae",
    "mosquito-larva", "dragonfly", "frog", "crucian", "heron", "duck",
    "fungi", "bacteria", "snail", "crab"
  ])
];

export const factorMemberships: FactorMembershipSeed[] = [
  { ecosystem: "forest", factor: "sunlight", note: "林冠截获大部分光能" },
  { ecosystem: "forest", factor: "water", note: "年降水量 600mm 以上" },
  { ecosystem: "forest", factor: "soil", note: "凋落物层孕育肥沃土壤" },
  { ecosystem: "forest", factor: "temperature", note: "决定树种分布与物候" },
  { ecosystem: "grassland", factor: "sunlight", note: "开阔地表光照充足" },
  { ecosystem: "grassland", factor: "water", note: "降水少且集中，限制乔木生长" },
  { ecosystem: "grassland", factor: "soil", note: "草根层形成深厚黑土" },
  { ecosystem: "grassland", factor: "wind", note: "加速蒸散，传播种子" },
  { ecosystem: "ocean", factor: "sunlight", note: "真光层内才能进行光合作用" },
  { ecosystem: "ocean", factor: "temperature", note: "影响洋流与物种洄游" },
  { ecosystem: "ocean", factor: "salinity", note: "平均盐度约 35‰" },
  { ecosystem: "ocean", factor: "current", note: "上升流带来深层营养盐" },
  { ecosystem: "wetland", factor: "sunlight", note: "浅水环境光照穿透良好" },
  { ecosystem: "wetland", factor: "water", note: "长期或季节性淹水" },
  { ecosystem: "wetland", factor: "soil", note: "厌氧泥炭土，分解缓慢" },
  { ecosystem: "wetland", factor: "water-level", note: "水位涨落塑造群落节律" }
];

/* ------------------------------------------------------------------ */
/* 关系数据：按能量 / 物质流动方向（from → to）                         */
/* ------------------------------------------------------------------ */

const rel = (
  ecosystem: string,
  type: RelationshipSeed["type"],
  pairs: Array<[string, string, string?]>
): RelationshipSeed[] =>
  pairs.map(([from, to, note]) => ({ ecosystem, from, to, type, note }));

export const relationships: RelationshipSeed[] = [
  // —— 森林 ——
  ...rel("forest", "energy", [
    ["oak", "squirrel", "橡实是松鼠的越冬主食"],
    ["oak", "caterpillar", "幼虫取食叶片"],
    ["oak", "deer", "嫩叶与橡实"],
    ["fern", "deer"],
    ["wildflower", "caterpillar"],
    ["wildflower", "deer"],
    ["caterpillar", "woodpecker"],
    ["caterpillar", "owl"],
    ["squirrel", "fox"],
    ["squirrel", "owl"],
    ["squirrel", "hawk"],
    ["woodpecker", "hawk"]
  ]),
  ...rel("forest", "decomposition", [
    ["oak", "fungi", "凋落叶与倒木"],
    ["oak", "earthworm", "落叶被拖入土壤"],
    ["wildflower", "earthworm"],
    ["deer", "bacteria"],
    ["caterpillar", "bacteria"],
    ["fern", "fungi"]
  ]),
  ...rel("forest", "support", [
    ["sunlight", "oak"],
    ["sunlight", "fern"],
    ["sunlight", "wildflower"],
    ["water", "oak"],
    ["water", "fern"],
    ["soil", "oak"],
    ["soil", "wildflower"],
    ["temperature", "caterpillar", "积温决定孵化时间"]
  ]),

  // —— 草原 ——
  ...rel("grassland", "energy", [
    ["grass", "grasshopper"],
    ["grass", "rabbit"],
    ["grass", "antelope"],
    ["grass", "field-mouse", "草籽"],
    ["shrub", "antelope"],
    ["shrub", "rabbit"],
    ["wildflower", "grasshopper"],
    ["wildflower", "rabbit"],
    ["grasshopper", "snake"],
    ["grasshopper", "field-mouse"],
    ["field-mouse", "snake"],
    ["field-mouse", "hawk"],
    ["rabbit", "wolf"],
    ["rabbit", "hawk"],
    ["antelope", "wolf"],
    ["snake", "hawk"]
  ]),
  ...rel("grassland", "decomposition", [
    ["grass", "fungi"],
    ["grass", "earthworm"],
    ["antelope", "dung-beetle", "粪便被埋入土壤"],
    ["rabbit", "bacteria"],
    ["field-mouse", "bacteria"]
  ]),
  ...rel("grassland", "support", [
    ["sunlight", "grass"],
    ["sunlight", "shrub"],
    ["sunlight", "wildflower"],
    ["water", "grass"],
    ["soil", "grass"],
    ["soil", "shrub"],
    ["wind", "wildflower", "风力传播种子"]
  ]),

  // —— 海洋 ——
  ...rel("ocean", "energy", [
    ["phytoplankton", "zooplankton"],
    ["phytoplankton", "krill"],
    ["kelp", "sea-turtle"],
    ["zooplankton", "sardine"],
    ["krill", "sardine"],
    ["krill", "whale", "须鲸滤食"],
    ["sardine", "tuna"],
    ["sardine", "shark"],
    ["tuna", "shark"],
    ["sea-turtle", "shark"]
  ]),
  ...rel("ocean", "decomposition", [
    ["phytoplankton", "bacteria", "海洋雪的主要成分"],
    ["sardine", "bacteria"],
    ["kelp", "sea-cucumber", "藻体碎屑"],
    ["whale", "sea-cucumber", "鲸落滋养深海群落"],
    ["whale", "crab"],
    ["tuna", "crab"]
  ]),
  ...rel("ocean", "support", [
    ["sunlight", "phytoplankton"],
    ["sunlight", "kelp"],
    ["current", "phytoplankton", "上升流输送营养盐"],
    ["salinity", "kelp"],
    ["temperature", "phytoplankton", "水温影响繁殖速率"]
  ]),

  // —— 湿地 ——
  ...rel("wetland", "energy", [
    ["algae", "mosquito-larva"],
    ["algae", "crucian"],
    ["algae", "snail"],
    ["reed", "duck"],
    ["water-lily", "duck"],
    ["mosquito-larva", "dragonfly"],
    ["mosquito-larva", "crucian"],
    ["dragonfly", "frog"],
    ["crucian", "heron"],
    ["frog", "heron"],
    ["snail", "duck"]
  ]),
  ...rel("wetland", "decomposition", [
    ["reed", "fungi", "枯茎在泥炭中缓慢分解"],
    ["reed", "snail"],
    ["water-lily", "fungi"],
    ["algae", "bacteria"],
    ["duck", "bacteria"],
    ["crucian", "crab"]
  ]),
  ...rel("wetland", "support", [
    ["sunlight", "reed"],
    ["sunlight", "algae"],
    ["sunlight", "water-lily"],
    ["water", "reed"],
    ["water", "algae"],
    ["soil", "reed"],
    ["water-level", "water-lily", "水深决定浮叶分布"],
    ["water-level", "reed"]
  ])
];
