// ─── 2차 전직 엔진 ──────────────────────────────────────────────
// 전직 조건 검증, 전직 실행, 궁극기 해금, 전직 트리 조회

import { prisma } from '../db';
import { CLASS_ADVANCEMENT_SEEDS, ADVANCED_CLASS_NAMES, BASE_CLASS_NAMES } from './classSeeds';

// ─── 타입 정의 ──────────────────────────────────────────────

/** 전직 조건 검증 결과 */
interface AdvancementCheckResult {
  eligible: boolean;
  reason?: string;
  advancement?: AdvancementInfo;
}

/** 전직 정보 */
interface AdvancementInfo {
  baseClass: string;
  advancedClass: string;
  advancedClassName: string;
  tier: number;
  requiredLevel: number;
  questId: string | null;
  skills: unknown[];
  statBonus: Record<string, number>;
  ultimateSkill?: unknown;
}

/** 전직 실행 결과 */
interface AdvancementResult {
  success: boolean;
  message: string;
  advancedClass?: string;
  advancedClassName?: string;
  tier?: number;
  unlockedSkills?: unknown[];
  statBonus?: Record<string, number>;
  ultimateSkill?: unknown;
}

/** 전직 트리 노드 */
interface AdvancementTreeNode {
  tier: number;
  advancedClass: string;
  advancedClassName: string;
  requiredLevel: number;
  questId: string | null;
  skillCount: number;
  hasUltimate: boolean;
  statBonus: Record<string, number>;
}

/** 전직 트리 (클래스별) */
interface ClassTree {
  baseClass: string;
  baseClassName: string;
  tiers: AdvancementTreeNode[];
}

// ─── 전직 엔진 클래스 ───────────────────────────────────────

class AdvancementEngine {

  /**
   * 전직 조건 검증
   * - 캐릭터 레벨이 전직 요구 레벨 이상인지
   * - 전직 퀘스트 완료 여부 (퀘스트 시스템 연동 전 플래그로 대체)
   */
  async checkEligibility(
    characterId: string,
    baseClass: string,
    targetTier: number,
    completedQuests: string[] = []
  ): Promise<AdvancementCheckResult> {
    // 1) 전직 데이터 조회
    const advancement = await prisma.classAdvancement.findUnique({
      where: { baseClass_tier: { baseClass, tier: targetTier } },
    });

    if (!advancement) {
      return { eligible: false, reason: `존재하지 않는 전직 경로: ${baseClass} tier ${targetTier}` };
    }

    // 2) 캐릭터 조회
    const character = await prisma.character.findUnique({
      where: { id: characterId },
    });

    if (!character) {
      return { eligible: false, reason: '캐릭터를 찾을 수 없습니다' };
    }

    // 3) 클래스 일치 검증
    if (character.classId !== baseClass) {
      return { eligible: false, reason: `캐릭터의 클래스(${character.classId})가 전직 경로(${baseClass})와 일치하지 않습니다` };
    }

    // 4) 레벨 검증
    if (character.level < advancement.requiredLevel) {
      return {
        eligible: false,
        reason: `레벨 부족: 현재 Lv.${character.level}, 필요 Lv.${advancement.requiredLevel}`,
      };
    }

    // 5) 이전 티어 전직 완료 검증 (tier 2 이상)
    if (targetTier > 1) {
      const prevTier = await prisma.classAdvancement.findUnique({
        where: { baseClass_tier: { baseClass, tier: targetTier - 1 } },
      });
      if (prevTier && prevTier.questId && !completedQuests.includes(prevTier.questId)) {
        return {
          eligible: false,
          reason: `이전 전직(tier ${targetTier - 1}) 퀘스트 미완료`,
        };
      }
    }

    // 6) 전직 퀘스트 완료 검증
    if (advancement.questId && !completedQuests.includes(advancement.questId)) {
      return {
        eligible: false,
        reason: `전직 퀘스트 미완료: ${advancement.questId}`,
      };
    }

    const skills = advancement.skills as unknown[];
    const statBonus = advancement.statBonus as Record<string, number>;
    const ultimateSkill = advancement.ultimateSkill as unknown | undefined;

    return {
      eligible: true,
      advancement: {
        baseClass: advancement.baseClass,
        advancedClass: advancement.advancedClass,
        advancedClassName: ADVANCED_CLASS_NAMES[advancement.advancedClass] ?? advancement.advancedClass,
        tier: advancement.tier,
        requiredLevel: advancement.requiredLevel,
        questId: advancement.questId,
        skills,
        statBonus,
        ultimateSkill: ultimateSkill ?? undefined,
      },
    };
  }

  /**
   * 전직 실행
   * - 조건 검증 → 스탯 보너스 적용 → 스킬 해금 → 궁극기 해금(tier 3)
   */
  async executeAdvancement(
    characterId: string,
    baseClass: string,
    targetTier: number,
    completedQuests: string[] = []
  ): Promise<AdvancementResult> {
    // 1) 조건 검증
    const check = await this.checkEligibility(characterId, baseClass, targetTier, completedQuests);
    if (!check.eligible || !check.advancement) {
      return { success: false, message: check.reason ?? '전직 조건을 충족하지 못했습니다' };
    }

    const adv = check.advancement;

    // 2) 캐릭터에 스탯 보너스 적용
    const character = await prisma.character.findUnique({ where: { id: characterId } });
    if (!character) {
      return { success: false, message: '캐릭터를 찾을 수 없습니다' };
    }

    const hpBonus = adv.statBonus.hp ?? 0;
    const mpBonus = adv.statBonus.mp ?? 0;

    await prisma.character.update({
      where: { id: characterId },
      data: {
        hp: character.hp + hpBonus,
        mp: character.mp + mpBonus,
        classId: adv.advancedClass,  // 클래스 ID를 전직 클래스로 변경
      },
    });

    // 3) 결과 반환 (스킬 해금 정보 + 궁극기)
    const result: AdvancementResult = {
      success: true,
      message: `${ADVANCED_CLASS_NAMES[adv.advancedClass] ?? adv.advancedClass}(으)로 전직 완료!`,
      advancedClass: adv.advancedClass,
      advancedClassName: ADVANCED_CLASS_NAMES[adv.advancedClass] ?? adv.advancedClass,
      tier: adv.tier,
      unlockedSkills: adv.skills,
      statBonus: adv.statBonus,
    };

    // 4) tier 3 궁극기 해금
    if (adv.tier === 3 && adv.ultimateSkill) {
      result.ultimateSkill = adv.ultimateSkill;
      result.message += ` 궁극기 [${(adv.ultimateSkill as { name?: string }).name ?? '???'}] 해금!`;
    }

    return result;
  }

  /**
   * 전체 전직 트리 조회
   */
  async getFullTree(): Promise<ClassTree[]> {
    const allAdvancements = await prisma.classAdvancement.findMany({
      orderBy: [{ baseClass: 'asc' }, { tier: 'asc' }],
    });

    const treeMap = new Map<string, AdvancementTreeNode[]>();

    for (const adv of allAdvancements) {
      const skills = adv.skills as unknown[];
      const nodes = treeMap.get(adv.baseClass) ?? [];
      nodes.push({
        tier: adv.tier,
        advancedClass: adv.advancedClass,
        advancedClassName: ADVANCED_CLASS_NAMES[adv.advancedClass] ?? adv.advancedClass,
        requiredLevel: adv.requiredLevel,
        questId: adv.questId,
        skillCount: Array.isArray(skills) ? skills.length : 0,
        hasUltimate: adv.ultimateSkill !== null,
        statBonus: adv.statBonus as Record<string, number>,
      });
      treeMap.set(adv.baseClass, nodes);
    }

    const trees: ClassTree[] = [];
    for (const [baseClass, tiers] of treeMap.entries()) {
      trees.push({
        baseClass,
        baseClassName: BASE_CLASS_NAMES[baseClass] ?? baseClass,
        tiers,
      });
    }

    return trees;
  }

  /**
   * 특정 클래스 전직 트리 조회
   */
  async getClassTree(baseClass: string): Promise<ClassTree | null> {
    const advancements = await prisma.classAdvancement.findMany({
      where: { baseClass },
      orderBy: { tier: 'asc' },
    });

    if (advancements.length === 0) return null;

    const tiers: AdvancementTreeNode[] = advancements.map((adv) => {
      const skills = adv.skills as unknown[];
      return {
        tier: adv.tier,
        advancedClass: adv.advancedClass,
        advancedClassName: ADVANCED_CLASS_NAMES[adv.advancedClass] ?? adv.advancedClass,
        requiredLevel: adv.requiredLevel,
        questId: adv.questId,
        skillCount: Array.isArray(skills) ? skills.length : 0,
        hasUltimate: adv.ultimateSkill !== null,
        statBonus: adv.statBonus as Record<string, number>,
      };
    });

    return {
      baseClass,
      baseClassName: BASE_CLASS_NAMES[baseClass] ?? baseClass,
      tiers,
    };
  }

  /**
   * 전직 클래스별 스킬 목록 조회
   */
  async getSkillsByAdvancedClass(advancedClass: string): Promise<{
    advancedClass: string;
    advancedClassName: string;
    skills: unknown[];
    ultimateSkill: unknown | null;
  } | null> {
    const advancement = await prisma.classAdvancement.findFirst({
      where: { advancedClass },
    });

    if (!advancement) return null;

    return {
      advancedClass: advancement.advancedClass,
      advancedClassName: ADVANCED_CLASS_NAMES[advancement.advancedClass] ?? advancement.advancedClass,
      skills: advancement.skills as unknown[],
      ultimateSkill: advancement.ultimateSkill ?? null,
    };
  }

  /**
   * 시드 데이터를 DB에 삽입 (서버 초기화 시 사용)
   */
  async seedAdvancements(): Promise<number> {
    let count = 0;
    for (const seed of CLASS_ADVANCEMENT_SEEDS) {
      await prisma.classAdvancement.upsert({
        where: { baseClass_tier: { baseClass: seed.baseClass, tier: seed.tier } },
        update: {
          advancedClass: seed.advancedClass,
          requiredLevel: seed.requiredLevel,
          questId: seed.questId,
          skills: JSON.parse(JSON.stringify(seed.skills)),
          statBonus: seed.statBonus,
          ultimateSkill: seed.ultimateSkill ? JSON.parse(JSON.stringify(seed.ultimateSkill)) : undefined,
        },
        create: {
          baseClass: seed.baseClass,
          advancedClass: seed.advancedClass,
          tier: seed.tier,
          requiredLevel: seed.requiredLevel,
          questId: seed.questId,
          skills: JSON.parse(JSON.stringify(seed.skills)),
          statBonus: seed.statBonus,
          ultimateSkill: seed.ultimateSkill ? JSON.parse(JSON.stringify(seed.ultimateSkill)) : undefined,
        },
      });
      count++;
    }
    return count;
  }
}

// 싱글턴 인스턴스 내보내기
export const advancementEngine = new AdvancementEngine();
