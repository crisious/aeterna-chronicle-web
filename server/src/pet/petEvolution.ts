/**
 * P14-12: 펫 진화 시스템
 * 3단계 진화 (유아기→성장기→완전체)
 * 진화 재료 + 진화 조건 (레벨/친밀도)
 * 외형 변화 + 스탯 증가
 * Prisma: PetEvolutionHistory
 */

import { prisma } from '../db';

// ─── 타입 정의 ──────────────────────────────────────────────────

export type EvolutionStage = 'baby' | 'teen' | 'adult';

export interface EvolutionStageDef {
  stage: EvolutionStage;
  name: string;
  nameEn: string;
  nameJa: string;
  order: number;               // 0=유아기, 1=성장기, 2=완전체
}

export interface EvolutionPath {
  petFamily: string;           // wolf, phoenix, golem, fairy, dragon
  fromStage: EvolutionStage;
  toStage: EvolutionStage;
  /** 진화 조건 */
  conditions: EvolutionCondition;
  /** 진화 재료 */
  materials: EvolutionMaterial[];
  /** 진화 시 스탯 증가율 */
  statMultiplier: StatMultiplier;
  /** 외형 변화 키 (클라이언트 에셋 매핑) */
  appearanceKey: string;
  /** 해금되는 스킬 */
  unlockedSkills: string[];
}

export interface EvolutionCondition {
  minLevel: number;
  minAffinity: number;          // 0~100 친밀도
  minQuests?: number;           // 함께 완료한 퀘스트 수
  requiredAchievement?: string; // 특정 업적 필요
}

export interface EvolutionMaterial {
  itemId: string;
  name: string;
  amount: number;
}

export interface StatMultiplier {
  hp: number;
  attack: number;
  defense: number;
}

export interface EvolutionResult {
  success: boolean;
  petId: string;
  petFamily: string;
  previousStage: EvolutionStage;
  newStage: EvolutionStage;
  newStats: { hp: number; attack: number; defense: number };
  newAppearance: string;
  unlockedSkills: string[];
  evolvedAt: Date;
}

export interface PetEvolutionHistoryEntry {
  id: string;
  petId: string;
  userId: string;
  petFamily: string;
  fromStage: EvolutionStage;
  toStage: EvolutionStage;
  materialsConsumed: EvolutionMaterial[];
  statsBefore: { hp: number; attack: number; defense: number };
  statsAfter: { hp: number; attack: number; defense: number };
  evolvedAt: Date;
}

// ─── 진화 단계 정의 ─────────────────────────────────────────────

export const EVOLUTION_STAGES: readonly EvolutionStageDef[] = [
  { stage: 'baby',  name: '유아기',  nameEn: 'Baby',  nameJa: '幼年期', order: 0 },
  { stage: 'teen',  name: '성장기',  nameEn: 'Teen',  nameJa: '成長期', order: 1 },
  { stage: 'adult', name: '완전체',  nameEn: 'Adult', nameJa: '完全体', order: 2 },
];

// ─── 진화 경로 시드 데이터 ──────────────────────────────────────

export const EVOLUTION_PATHS: readonly EvolutionPath[] = [
  // ═══ 늑대 계열 ═══════════════════════════════════════════
  {
    petFamily: 'wolf',
    fromStage: 'baby', toStage: 'teen',
    conditions: { minLevel: 15, minAffinity: 30 },
    materials: [
      { itemId: 'mat_moonstone',     name: '달빛석',    amount: 5 },
      { itemId: 'mat_beast_fang',    name: '야수의 송곳니', amount: 10 },
    ],
    statMultiplier: { hp: 1.5, attack: 1.6, defense: 1.3 },
    appearanceKey: 'wolf_teen',
    unlockedSkills: ['sk_wolf_frenzy'],
  },
  {
    petFamily: 'wolf',
    fromStage: 'teen', toStage: 'adult',
    conditions: { minLevel: 30, minAffinity: 70, minQuests: 50 },
    materials: [
      { itemId: 'mat_moonstone',     name: '달빛석',    amount: 15 },
      { itemId: 'mat_shadow_crystal', name: '그림자 결정', amount: 5 },
      { itemId: 'mat_beast_fang',    name: '야수의 송곳니', amount: 25 },
    ],
    statMultiplier: { hp: 2.0, attack: 2.2, defense: 1.8 },
    appearanceKey: 'wolf_adult',
    unlockedSkills: ['sk_wolf_shadow'],
  },

  // ═══ 봉황 계열 ═══════════════════════════════════════════
  {
    petFamily: 'phoenix',
    fromStage: 'baby', toStage: 'teen',
    conditions: { minLevel: 15, minAffinity: 30 },
    materials: [
      { itemId: 'mat_flame_feather', name: '화염 깃털', amount: 5 },
      { itemId: 'mat_fire_essence',  name: '불의 정수', amount: 10 },
    ],
    statMultiplier: { hp: 1.4, attack: 1.5, defense: 1.4 },
    appearanceKey: 'phoenix_teen',
    unlockedSkills: ['sk_phoenix_rebirth'],
  },
  {
    petFamily: 'phoenix',
    fromStage: 'teen', toStage: 'adult',
    conditions: { minLevel: 30, minAffinity: 70, minQuests: 50 },
    materials: [
      { itemId: 'mat_flame_feather', name: '화염 깃털', amount: 15 },
      { itemId: 'mat_phoenix_tear',  name: '불사조의 눈물', amount: 3 },
      { itemId: 'mat_fire_essence',  name: '불의 정수', amount: 25 },
    ],
    statMultiplier: { hp: 2.0, attack: 2.0, defense: 2.0 },
    appearanceKey: 'phoenix_adult',
    unlockedSkills: ['sk_phoenix_inferno'],
  },

  // ═══ 골렘 계열 ═══════════════════════════════════════════
  {
    petFamily: 'golem',
    fromStage: 'baby', toStage: 'teen',
    conditions: { minLevel: 15, minAffinity: 30 },
    materials: [
      { itemId: 'mat_earth_core',    name: '대지의 핵',   amount: 5 },
      { itemId: 'mat_mithril_chunk', name: '미스릴 파편', amount: 10 },
    ],
    statMultiplier: { hp: 1.8, attack: 1.3, defense: 1.7 },
    appearanceKey: 'golem_teen',
    unlockedSkills: ['sk_golem_quake'],
  },
  {
    petFamily: 'golem',
    fromStage: 'teen', toStage: 'adult',
    conditions: { minLevel: 30, minAffinity: 70, minQuests: 50 },
    materials: [
      { itemId: 'mat_earth_core',    name: '대지의 핵',   amount: 15 },
      { itemId: 'mat_adamantite',    name: '아다만타이트', amount: 5 },
      { itemId: 'mat_mithril_chunk', name: '미스릴 파편', amount: 25 },
    ],
    statMultiplier: { hp: 2.5, attack: 1.8, defense: 2.3 },
    appearanceKey: 'golem_adult',
    unlockedSkills: ['sk_golem_fortress'],
  },

  // ═══ 요정 계열 ═══════════════════════════════════════════
  {
    petFamily: 'fairy',
    fromStage: 'baby', toStage: 'teen',
    conditions: { minLevel: 15, minAffinity: 35 },
    materials: [
      { itemId: 'mat_starlight_dust', name: '별빛 가루', amount: 8 },
      { itemId: 'mat_fairy_wing',     name: '요정의 날개 조각', amount: 5 },
    ],
    statMultiplier: { hp: 1.3, attack: 1.4, defense: 1.3 },
    appearanceKey: 'fairy_teen',
    unlockedSkills: ['sk_fairy_time'],
  },
  {
    petFamily: 'fairy',
    fromStage: 'teen', toStage: 'adult',
    conditions: { minLevel: 30, minAffinity: 75, minQuests: 60 },
    materials: [
      { itemId: 'mat_starlight_dust', name: '별빛 가루', amount: 20 },
      { itemId: 'mat_chrono_shard',   name: '시간의 파편', amount: 3 },
      { itemId: 'mat_fairy_wing',     name: '요정의 날개 조각', amount: 15 },
    ],
    statMultiplier: { hp: 1.8, attack: 1.9, defense: 1.8 },
    appearanceKey: 'fairy_adult',
    unlockedSkills: ['sk_fairy_chrono'],
  },

  // ═══ 드래곤 계열 ═══════════════════════════════════════════
  {
    petFamily: 'dragon',
    fromStage: 'baby', toStage: 'teen',
    conditions: { minLevel: 20, minAffinity: 40 },
    materials: [
      { itemId: 'mat_dragon_scale',  name: '용린',       amount: 8 },
      { itemId: 'mat_ether_crystal', name: '에테르 결정', amount: 5 },
    ],
    statMultiplier: { hp: 1.6, attack: 1.7, defense: 1.5 },
    appearanceKey: 'dragon_teen',
    unlockedSkills: ['sk_dragon_roar'],
  },
  {
    petFamily: 'dragon',
    fromStage: 'teen', toStage: 'adult',
    conditions: { minLevel: 35, minAffinity: 80, minQuests: 70, requiredAchievement: 'ach_dragon_master' },
    materials: [
      { itemId: 'mat_dragon_scale',  name: '용린',       amount: 20 },
      { itemId: 'mat_dragon_heart',  name: '용의 심장', amount: 1 },
      { itemId: 'mat_ether_crystal', name: '에테르 결정', amount: 15 },
    ],
    statMultiplier: { hp: 2.2, attack: 2.5, defense: 2.0 },
    appearanceKey: 'dragon_adult',
    unlockedSkills: ['sk_dragon_ether'],
  },
];

// ─── 진화 엔진 ──────────────────────────────────────────────────

export class PetEvolutionEngine {

  /**
   * 진화 가능 여부 확인
   */
  async checkEvolutionReady(petId: string, userId: string): Promise<{
    canEvolve: boolean;
    missingConditions: string[];
    missingMaterials: { itemId: string; name: string; have: number; need: number }[];
    nextPath: EvolutionPath | null;
  }> {
    const pet = await prisma.pet.findUnique({ where: { id: petId } });
    if (!pet || pet.userId !== userId) throw new Error('펫을 찾을 수 없습니다.');

    const currentStage = (pet.evolutionStage as EvolutionStage) ?? 'baby';
    const path = EVOLUTION_PATHS.find(
      p => p.petFamily === pet.family && p.fromStage === currentStage,
    );

    if (!path) {
      return { canEvolve: false, missingConditions: ['최종 단계입니다.'], missingMaterials: [], nextPath: null };
    }

    const missingConditions: string[] = [];
    const missingMaterials: { itemId: string; name: string; have: number; need: number }[] = [];

    // 레벨 체크
    if (pet.level < path.conditions.minLevel) {
      missingConditions.push(`레벨 ${path.conditions.minLevel} 필요 (현재: ${pet.level})`);
    }

    // 친밀도 체크
    if ((pet.affinity ?? 0) < path.conditions.minAffinity) {
      missingConditions.push(`친밀도 ${path.conditions.minAffinity} 필요 (현재: ${pet.affinity ?? 0})`);
    }

    // 함께 완료한 퀘스트 수 체크
    if (path.conditions.minQuests) {
      const questCount = await prisma.questCompletion.count({
        where: { userId, petId },
      });
      if (questCount < path.conditions.minQuests) {
        missingConditions.push(`함께 완료한 퀘스트 ${path.conditions.minQuests}개 필요 (현재: ${questCount})`);
      }
    }

    // 업적 체크
    if (path.conditions.requiredAchievement) {
      const achievement = await prisma.achievementUnlock.findFirst({
        where: { userId, achievementId: path.conditions.requiredAchievement },
      });
      if (!achievement) {
        missingConditions.push(`업적 "${path.conditions.requiredAchievement}" 필요`);
      }
    }

    // 재료 체크
    for (const mat of path.materials) {
      const inventory = await prisma.inventoryItem.findFirst({
        where: { userId, itemId: mat.itemId },
      });
      const have = inventory?.quantity ?? 0;
      if (have < mat.amount) {
        missingMaterials.push({ itemId: mat.itemId, name: mat.name, have, need: mat.amount });
      }
    }

    return {
      canEvolve: missingConditions.length === 0 && missingMaterials.length === 0,
      missingConditions,
      missingMaterials,
      nextPath: path,
    };
  }

  /**
   * 진화 실행
   */
  async evolve(petId: string, userId: string): Promise<EvolutionResult> {
    const check = await this.checkEvolutionReady(petId, userId);
    if (!check.canEvolve || !check.nextPath) {
      throw new Error('진화 조건을 충족하지 못했습니다.');
    }

    const pet = await prisma.pet.findUnique({ where: { id: petId } });
    if (!pet) throw new Error('펫을 찾을 수 없습니다.');

    const path = check.nextPath;
    const statsBefore = {
      hp: pet.hp,
      attack: pet.attack,
      defense: pet.defense,
    };

    const statsAfter = {
      hp: Math.round(pet.hp * path.statMultiplier.hp),
      attack: Math.round(pet.attack * path.statMultiplier.attack),
      defense: Math.round(pet.defense * path.statMultiplier.defense),
    };

    // 트랜잭션: 재료 소모 + 펫 업데이트 + 히스토리 기록
    await prisma.$transaction(async (tx) => {
      // 1. 재료 소모
      for (const mat of path.materials) {
        await tx.inventoryItem.updateMany({
          where: { userId, itemId: mat.itemId },
          data: { quantity: { decrement: mat.amount } },
        });
      }

      // 2. 펫 스탯/외형/단계 업데이트
      await tx.pet.update({
        where: { id: petId },
        data: {
          evolutionStage: path.toStage,
          hp: statsAfter.hp,
          attack: statsAfter.attack,
          defense: statsAfter.defense,
          appearanceKey: path.appearanceKey,
        },
      });

      // 3. 스킬 해금
      for (const skillId of path.unlockedSkills) {
        await tx.petSkill.upsert({
          where: { petId_skillId: { petId, skillId } },
          create: { petId, skillId, unlockedAt: new Date() },
          update: {},
        });
      }

      // 4. 히스토리 기록
      await tx.petEvolutionHistory.create({
        data: {
          petId,
          userId,
          petFamily: pet.family,
          fromStage: path.fromStage,
          toStage: path.toStage,
          materialsConsumed: path.materials as any,
          statsBefore: statsBefore as any,
          statsAfter: statsAfter as any,
        },
      });
    });

    return {
      success: true,
      petId,
      petFamily: pet.family,
      previousStage: path.fromStage,
      newStage: path.toStage,
      newStats: statsAfter,
      newAppearance: path.appearanceKey,
      unlockedSkills: path.unlockedSkills,
      evolvedAt: new Date(),
    };
  }

  /**
   * 진화 히스토리 조회
   */
  async getEvolutionHistory(petId: string): Promise<PetEvolutionHistoryEntry[]> {
    const records = await prisma.petEvolutionHistory.findMany({
      where: { petId },
      orderBy: { createdAt: 'desc' },
    });

    return records.map(r => ({
      id: r.id,
      petId: r.petId,
      userId: r.userId,
      petFamily: r.petFamily,
      fromStage: r.fromStage as EvolutionStage,
      toStage: r.toStage as EvolutionStage,
      materialsConsumed: r.materialsConsumed as unknown as EvolutionMaterial[],
      statsBefore: r.statsBefore as unknown as { hp: number; attack: number; defense: number },
      statsAfter: r.statsAfter as unknown as { hp: number; attack: number; defense: number },
      evolvedAt: r.createdAt,
    }));
  }

  /**
   * 특정 펫 패밀리의 전체 진화 트리 조회
   */
  getEvolutionTree(petFamily: string): EvolutionPath[] {
    return EVOLUTION_PATHS.filter(p => p.petFamily === petFamily);
  }
}

// ── 싱글턴 ──────────────────────────────────────────────────

export const petEvolutionEngine = new PetEvolutionEngine();
