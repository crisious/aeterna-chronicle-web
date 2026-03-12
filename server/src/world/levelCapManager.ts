/**
 * P14-14: 레벨 캡 100 확장
 * 경험치 테이블 Lv.80→100 확장
 * Lv.85/90/95/100 신규 스킬 해금 (6클래스)
 * 밸런스 조정 (몬스터 스케일링)
 */

import { prisma } from '../db';

// ─── 타입 정의 ──────────────────────────────────────────────────

export interface ExpTableEntry {
  level: number;
  expRequired: number;       // 이 레벨 달성에 필요한 누적 경험치
  expToNext: number;         // 다음 레벨까지 필요 경험치
  hpBase: number;            // 기본 HP (클래스 보정 전)
  mpBase: number;            // 기본 MP
  statPoints: number;        // 레벨업 시 획득 스탯 포인트
}

export interface NewSkillUnlock {
  classId: string;
  className: string;
  level: number;
  skillCode: string;
  skillName: string;
  skillDescription: string;
  skillType: 'active' | 'passive' | 'ultimate';
  element: string;
  damage: number;
  mpCost: number;
  cooldown: number;
}

export interface MonsterScaling {
  levelRange: { min: number; max: number };
  hpMultiplier: number;
  attackMultiplier: number;
  defenseMultiplier: number;
  expRewardMultiplier: number;
  goldRewardMultiplier: number;
}

// ─── 상수 ───────────────────────────────────────────────────

const OLD_LEVEL_CAP = 80;
const NEW_LEVEL_CAP = 100;

/**
 * 경험치 커브 공식:
 * expToNext(lv) = BASE * (lv^EXPONENT) * (1 + GROWTH_RATE * (lv - 80))
 * 80~100 구간은 기존 커브의 연장 + 약간의 가속
 */
const EXP_BASE = 5_000;
const EXP_EXPONENT = 2.15;
const EXP_GROWTH_RATE = 0.03;

// ─── 경험치 테이블 (Lv.80→100) ─────────────────────────────────

function generateExpTable(): ExpTableEntry[] {
  const table: ExpTableEntry[] = [];
  let cumulativeExp = 0;

  // Lv.80 기준 누적 경험치 (기존 테이블의 마지막 값)
  // 이전 시스템과의 연속성을 위한 기준값
  const LV80_CUMULATIVE = 85_000_000;
  cumulativeExp = LV80_CUMULATIVE;

  for (let lv = 81; lv <= NEW_LEVEL_CAP; lv++) {
    const growthFactor = 1 + EXP_GROWTH_RATE * (lv - OLD_LEVEL_CAP);
    const expToNext = Math.round(EXP_BASE * Math.pow(lv, EXP_EXPONENT) * growthFactor);
    cumulativeExp += expToNext;

    // HP/MP 기본 스케일링
    const hpBase = 1000 + lv * 120 + Math.round(Math.pow(lv - 80, 1.5) * 50);
    const mpBase = 300 + lv * 40 + Math.round(Math.pow(lv - 80, 1.3) * 20);

    // 스탯 포인트: 81~90은 3, 91~100은 5
    const statPoints = lv <= 90 ? 3 : 5;

    table.push({
      level: lv,
      expRequired: cumulativeExp,
      expToNext: lv < NEW_LEVEL_CAP ? expToNext : 0, // Lv.100은 맥스
      hpBase,
      mpBase,
      statPoints,
    });
  }

  return table;
}

export const EXP_TABLE_81_100: readonly ExpTableEntry[] = generateExpTable();

// ─── 신규 스킬 해금 (Lv.85/90/95/100 × 6클래스) ───────────────

export const NEW_SKILL_UNLOCKS: readonly NewSkillUnlock[] = [
  // ═══ 에테르 기사 (ether_knight) ══════════════════════════
  {
    classId: 'ether_knight', className: '에테르 기사', level: 85,
    skillCode: 'ek_ether_fortitude', skillName: '에테르 강인',
    skillDescription: '에테르로 몸을 강화해 30초간 받는 피해 25% 감소, 상태이상 면역.',
    skillType: 'active', element: 'aether', damage: 0, mpCost: 80, cooldown: 90,
  },
  {
    classId: 'ether_knight', className: '에테르 기사', level: 90,
    skillCode: 'ek_ether_onslaught', skillName: '에테르 맹공',
    skillDescription: '에테르 검기를 5연속 방출. 각 타격이 방어력의 20%를 무시한다.',
    skillType: 'active', element: 'aether', damage: 280, mpCost: 120, cooldown: 25,
  },
  {
    classId: 'ether_knight', className: '에테르 기사', level: 95,
    skillCode: 'ek_ether_mastery', skillName: '에테르 달인',
    skillDescription: '패시브: 에테르 계열 스킬 데미지 +15%, 쿨타임 -10%.',
    skillType: 'passive', element: 'aether', damage: 0, mpCost: 0, cooldown: 0,
  },
  {
    classId: 'ether_knight', className: '에테르 기사', level: 100,
    skillCode: 'ek_ether_apocalypse', skillName: '에테르 종말',
    skillDescription: '천공의 에테르를 끌어내려 전방 광역 초토화. 5초 캐스팅.',
    skillType: 'ultimate', element: 'aether', damage: 1200, mpCost: 300, cooldown: 180,
  },

  // ═══ 기억술사 (memory_weaver) ════════════════════════════
  {
    classId: 'memory_weaver', className: '기억술사', level: 85,
    skillCode: 'mw_memory_shield', skillName: '기억의 방패',
    skillDescription: '잊혀진 기억으로 방패를 직조, 파티원 1명에게 HP 20% 쉴드 부여.',
    skillType: 'active', element: 'memory', damage: 0, mpCost: 70, cooldown: 30,
  },
  {
    classId: 'memory_weaver', className: '기억술사', level: 90,
    skillCode: 'mw_recall_storm', skillName: '기억 폭풍',
    skillDescription: '대상 주변의 잊혀진 기억들을 폭발시킨다. 3초간 지속 광역 데미지.',
    skillType: 'active', element: 'memory', damage: 220, mpCost: 100, cooldown: 22,
  },
  {
    classId: 'memory_weaver', className: '기억술사', level: 95,
    skillCode: 'mw_eidetic_resonance', skillName: '완벽 기억 공명',
    skillDescription: '패시브: 기억 계열 스킬 시전 시 50% 확률로 MP 50% 환급.',
    skillType: 'passive', element: 'memory', damage: 0, mpCost: 0, cooldown: 0,
  },
  {
    classId: 'memory_weaver', className: '기억술사', level: 100,
    skillCode: 'mw_total_recall', skillName: '완전 회상',
    skillDescription: '대망각 이전의 원초적 기억을 소환. 파티 전체 HP/MP 완전 회복 + 부활.',
    skillType: 'ultimate', element: 'memory', damage: 0, mpCost: 350, cooldown: 300,
  },

  // ═══ 그림자 직조사 (shadow_weaver) ═══════════════════════
  {
    classId: 'shadow_weaver', className: '그림자 직조사', level: 85,
    skillCode: 'sw_shadow_step', skillName: '그림자 도약',
    skillDescription: '그림자 속으로 잠입해 대상 뒤로 순간이동, 3초간 은신.',
    skillType: 'active', element: 'shadow', damage: 0, mpCost: 60, cooldown: 18,
  },
  {
    classId: 'shadow_weaver', className: '그림자 직조사', level: 90,
    skillCode: 'sw_umbral_cascade', skillName: '암영 폭포',
    skillDescription: '그림자 에너지를 폭발시켜 전방 부채꼴 범위에 고데미지.',
    skillType: 'active', element: 'shadow', damage: 350, mpCost: 130, cooldown: 28,
  },
  {
    classId: 'shadow_weaver', className: '그림자 직조사', level: 95,
    skillCode: 'sw_shadow_attunement', skillName: '그림자 동조',
    skillDescription: '패시브: 은신 상태에서 첫 공격 시 치명타 확률 100%, 데미지 +40%.',
    skillType: 'passive', element: 'shadow', damage: 0, mpCost: 0, cooldown: 0,
  },
  {
    classId: 'shadow_weaver', className: '그림자 직조사', level: 100,
    skillCode: 'sw_eternal_night', skillName: '영원한 밤',
    skillDescription: '전장을 어둠으로 뒤덮어 적 전체 시야 0, 아군은 은신 상태. 10초간.',
    skillType: 'ultimate', element: 'shadow', damage: 800, mpCost: 280, cooldown: 200,
  },

  // ═══ 시간 수호자 (chrono_guardian) ═══════════════════════
  {
    classId: 'chrono_guardian', className: '시간 수호자', level: 85,
    skillCode: 'cg_time_barrier', skillName: '시간 장벽',
    skillDescription: '시간을 늦춰 아군 주변에 감속 장벽 생성. 진입 적 이동속도 -60%.',
    skillType: 'active', element: 'time', damage: 0, mpCost: 75, cooldown: 35,
  },
  {
    classId: 'chrono_guardian', className: '시간 수호자', level: 90,
    skillCode: 'cg_temporal_strike', skillName: '시간 강타',
    skillDescription: '과거-현재-미래의 자신이 동시에 공격. 3연타 고정 데미지.',
    skillType: 'active', element: 'time', damage: 300, mpCost: 110, cooldown: 20,
  },
  {
    classId: 'chrono_guardian', className: '시간 수호자', level: 95,
    skillCode: 'cg_chrono_mastery', skillName: '시간 숙련',
    skillDescription: '패시브: 전투 30초마다 자동으로 HP 5% 회복, 쿨타임 전체 -5%.',
    skillType: 'passive', element: 'time', damage: 0, mpCost: 0, cooldown: 0,
  },
  {
    classId: 'chrono_guardian', className: '시간 수호자', level: 100,
    skillCode: 'cg_time_singularity', skillName: '시간 특이점',
    skillDescription: '시간의 특이점을 생성해 반경 내 적 전원 5초 완전 정지 + 대폭발.',
    skillType: 'ultimate', element: 'time', damage: 1000, mpCost: 320, cooldown: 240,
  },

  // ═══ 자연의 현자 (nature_sage) ═══════════════════════════
  {
    classId: 'nature_sage', className: '자연의 현자', level: 85,
    skillCode: 'ns_life_bloom', skillName: '생명의 꽃',
    skillDescription: '대상 위치에 생명의 꽃을 피워 범위 내 아군 HP 지속 회복.',
    skillType: 'active', element: 'nature', damage: 0, mpCost: 85, cooldown: 25,
  },
  {
    classId: 'nature_sage', className: '자연의 현자', level: 90,
    skillCode: 'ns_thorns_of_wrath', skillName: '분노의 가시',
    skillDescription: '거대한 가시덩굴이 지면을 뚫고 솟아 광역 관통 데미지.',
    skillType: 'active', element: 'nature', damage: 250, mpCost: 105, cooldown: 22,
  },
  {
    classId: 'nature_sage', className: '자연의 현자', level: 95,
    skillCode: 'ns_natures_grace', skillName: '자연의 은총',
    skillDescription: '패시브: 힐링 스킬 효율 +20%, 오버힐 시 대상에게 쉴드 부여.',
    skillType: 'passive', element: 'nature', damage: 0, mpCost: 0, cooldown: 0,
  },
  {
    classId: 'nature_sage', className: '자연의 현자', level: 100,
    skillCode: 'ns_world_tree', skillName: '세계수 소환',
    skillDescription: '세계수의 분신을 소환해 15초간 아군 전원 HP/MP 초당 3% 회복.',
    skillType: 'ultimate', element: 'nature', damage: 0, mpCost: 350, cooldown: 300,
  },

  // ═══ 허공의 방랑자 (void_wanderer) — P14-05 신규 클래스 ═══
  {
    classId: 'void_wanderer', className: '허공의 방랑자', level: 85,
    skillCode: 'vw_spatial_rift', skillName: '공간 균열',
    skillDescription: '공간을 찢어 대상 위치에 균열 생성. 접촉 적에게 지속 데미지.',
    skillType: 'active', element: 'void', damage: 180, mpCost: 70, cooldown: 20,
  },
  {
    classId: 'void_wanderer', className: '허공의 방랑자', level: 90,
    skillCode: 'vw_dimension_swap', skillName: '차원 교환',
    skillDescription: '자신과 대상의 위치를 교환. 교환 후 양쪽 모두 1초 기절.',
    skillType: 'active', element: 'void', damage: 100, mpCost: 90, cooldown: 30,
  },
  {
    classId: 'void_wanderer', className: '허공의 방랑자', level: 95,
    skillCode: 'vw_void_resonance', skillName: '허공 공명',
    skillDescription: '패시브: 공간 계열 스킬 적중 시 30% 확률로 대상에게 "차원 불안정" 디버프 (3초간 받는 데미지 +20%).',
    skillType: 'passive', element: 'void', damage: 0, mpCost: 0, cooldown: 0,
  },
  {
    classId: 'void_wanderer', className: '허공의 방랑자', level: 100,
    skillCode: 'vw_void_collapse', skillName: '허공 붕괴',
    skillDescription: '공간을 완전히 붕괴시켜 범위 내 모든 것을 소멸. 절대 데미지 (방어무시).',
    skillType: 'ultimate', element: 'void', damage: 1500, mpCost: 400, cooldown: 240,
  },
];

// ─── 몬스터 스케일링 (Lv.80→100 구간) ──────────────────────────

export const MONSTER_SCALING_81_100: readonly MonsterScaling[] = [
  {
    levelRange: { min: 81, max: 85 },
    hpMultiplier: 1.25,
    attackMultiplier: 1.20,
    defenseMultiplier: 1.15,
    expRewardMultiplier: 1.30,
    goldRewardMultiplier: 1.25,
  },
  {
    levelRange: { min: 86, max: 90 },
    hpMultiplier: 1.55,
    attackMultiplier: 1.45,
    defenseMultiplier: 1.35,
    expRewardMultiplier: 1.60,
    goldRewardMultiplier: 1.50,
  },
  {
    levelRange: { min: 91, max: 95 },
    hpMultiplier: 2.00,
    attackMultiplier: 1.80,
    defenseMultiplier: 1.65,
    expRewardMultiplier: 2.00,
    goldRewardMultiplier: 1.80,
  },
  {
    levelRange: { min: 96, max: 100 },
    hpMultiplier: 2.60,
    attackMultiplier: 2.20,
    defenseMultiplier: 2.00,
    expRewardMultiplier: 2.50,
    goldRewardMultiplier: 2.20,
  },
];

// ─── 레벨 캡 매니저 ─────────────────────────────────────────────

export class LevelCapManager {

  /**
   * 경험치 테이블 조회 (81~100)
   */
  getExpTable(): readonly ExpTableEntry[] {
    return EXP_TABLE_81_100;
  }

  /**
   * 특정 레벨의 경험치 정보
   */
  getExpForLevel(level: number): ExpTableEntry | null {
    if (level < 81 || level > NEW_LEVEL_CAP) return null;
    return EXP_TABLE_81_100.find(e => e.level === level) ?? null;
  }

  /**
   * 레벨업 가능 여부 확인 + 레벨업 처리
   */
  async checkAndLevelUp(characterId: string): Promise<{
    leveledUp: boolean;
    newLevel: number;
    unlockedSkills: NewSkillUnlock[];
    statPointsGained: number;
  }> {
    const character = await prisma.character.findUnique({ where: { id: characterId } });
    if (!character) throw new Error('캐릭터를 찾을 수 없습니다.');
    if (character.level >= NEW_LEVEL_CAP) {
      return { leveledUp: false, newLevel: character.level, unlockedSkills: [], statPointsGained: 0 };
    }

    const nextEntry = EXP_TABLE_81_100.find(e => e.level === character.level + 1);
    if (!nextEntry || character.exp < nextEntry.expRequired) {
      return { leveledUp: false, newLevel: character.level, unlockedSkills: [], statPointsGained: 0 };
    }

    const newLevel = character.level + 1;

    // 스킬 해금 체크
    const unlockedSkills = NEW_SKILL_UNLOCKS.filter(
      s => s.classId === character.classId && s.level === newLevel,
    );

    // DB 업데이트
    await prisma.$transaction(async (tx) => {
      await tx.character.update({
        where: { id: characterId },
        data: {
          level: newLevel,
          maxHp: { increment: nextEntry.hpBase - (EXP_TABLE_81_100.find(e => e.level === character.level)?.hpBase ?? 0) },
          maxMp: { increment: nextEntry.mpBase - (EXP_TABLE_81_100.find(e => e.level === character.level)?.mpBase ?? 0) },
          statPoints: { increment: nextEntry.statPoints },
        },
      });

      // 스킬 해금
      for (const skill of unlockedSkills) {
        await tx.characterSkill.create({
          data: {
            characterId,
            skillCode: skill.skillCode,
            level: 1,
            unlockedAt: new Date(),
          },
        });
      }
    });

    return {
      leveledUp: true,
      newLevel,
      unlockedSkills,
      statPointsGained: nextEntry.statPoints,
    };
  }

  /**
   * 몬스터 스케일링 계수 조회
   */
  getMonsterScaling(monsterLevel: number): MonsterScaling | null {
    return MONSTER_SCALING_81_100.find(
      s => monsterLevel >= s.levelRange.min && monsterLevel <= s.levelRange.max,
    ) ?? null;
  }

  /**
   * 특정 클래스의 Lv.85~100 해금 스킬 목록
   */
  getNewSkillsForClass(classId: string): NewSkillUnlock[] {
    return NEW_SKILL_UNLOCKS.filter(s => s.classId === classId);
  }

  /**
   * Lv.100 도달 시 보너스 (칭호 + 보상)
   */
  async grantMaxLevelRewards(characterId: string, userId: string): Promise<void> {
    const character = await prisma.character.findUnique({ where: { id: characterId } });
    if (!character || character.level < NEW_LEVEL_CAP) return;

    // 이미 보상 수령 체크
    const existing = await prisma.achievementUnlock.findFirst({
      where: { userId, achievementId: 'ach_level_100' },
    });
    if (existing) return;

    await prisma.$transaction(async (tx) => {
      // 업적 해금
      await tx.achievementUnlock.create({
        data: { userId, achievementId: 'ach_level_100' },
      });

      // 칭호 부여: "에테르나의 전설"
      await tx.title.create({
        data: { userId, titleId: 'title_legend_of_etherna', earnedAt: new Date() },
      });

      // 보상 아이템
      await tx.inventoryItem.create({
        data: { userId, itemId: 'reward_lv100_box', quantity: 1 },
      });
    });
  }

  /**
   * 경험치 커브 연속성 검증 (테스트용)
   */
  validateExpCurve(): { valid: boolean; issues: string[] } {
    const issues: string[] = [];
    let prevExp = 0;

    for (const entry of EXP_TABLE_81_100) {
      if (entry.expRequired <= prevExp) {
        issues.push(`Lv.${entry.level}: 누적 경험치가 이전 레벨보다 작거나 같음`);
      }
      if (entry.expToNext < 0) {
        issues.push(`Lv.${entry.level}: 다음 레벨 경험치가 음수`);
      }
      if (entry.hpBase <= 0 || entry.mpBase <= 0) {
        issues.push(`Lv.${entry.level}: HP/MP 기본값이 0 이하`);
      }
      prevExp = entry.expRequired;
    }

    return { valid: issues.length === 0, issues };
  }
}

// ── 싱글턴 ──────────────────────────────────────────────────

export const levelCapManager = new LevelCapManager();
