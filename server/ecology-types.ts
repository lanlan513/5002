export type SpeciesRole = "producer" | "consumer" | "decomposer";

export type RelationType = "energy" | "decomposition" | "support";

export interface EcosystemSeed {
  slug: string;
  name: string;
  englishName: string;
  description: string;
  climate: string;
  color: string;
  icon: string;
  position: number;
}

export interface SpeciesSeed {
  slug: string;
  name: string;
  latinName: string;
  role: SpeciesRole;
  trophicLevel: number;
  description: string;
}

export interface FactorSeed {
  slug: string;
  name: string;
  category: string;
  description: string;
}

/** 物种在某个生态系统中的成员关系（同一物种可属于多个生态系统） */
export interface MembershipSeed {
  ecosystem: string;
  species: string;
  trophicLevel?: number;
}

/** 环境因素与生态系统的关联 */
export interface FactorMembershipSeed {
  ecosystem: string;
  factor: string;
  note: string;
}

/**
 * 关系统一按「能量 / 物质流动方向」存储：
 * - energy:        from = 食物,       to = 捕食者
 * - decomposition: from = 死亡有机体, to = 分解者
 * - support:       from = 环境因素,   to = 生物
 */
export interface RelationshipSeed {
  ecosystem: string;
  from: string;
  to: string;
  type: RelationType;
  note?: string;
}
