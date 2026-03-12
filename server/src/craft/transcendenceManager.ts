/**
 * transcendenceManager.ts — P11-06 장비 초월/강화 시스템
 *
 * 레벨 캡 이후 수직 성장
 * - 초월 단계: +1 ~ +10
 * - 재료: 초월석 (일반/레어/에픽) + 골드
 * - 확률 시스템: 단계별 성공/실패/파괴 확률
 * - 안전 강화: 파괴 보호 아이템
 * - 스탯 보너스: 단계당 기본 스탯 % 증가
 */

import { prisma } from '../db';

// ─── 타입 정의 ──────────────────────────────────────────────────

export interface TranscendenceLevel {
  level: number;              // +1 ~ +10
  successRate: number;        // 성공 확률 (0~1)
  failRate: number;           // 실패 확률 (강화 단계 유지)
  destroyRate: number;        // 파괴 확률 (장비 소멸)
  downgradeOnFail: boolean;   // 실패 시 단계 하락 여부
  materials: TranscendenceMaterial[];
  goldCost: number;
  statBonus: number;          // 기본 스탯 % 증가 (누적)
}

export interface TranscendenceMaterial {
  itemId: string;
  name: string;
  amount: number;
}

export interface TranscendenceResult {
  success: boolean;
  destroyed: boolean;
  downgraded: boolean;
  previousLevel: number;
  newLevel: number;
  message: string;
}

export interface EquipmentTranscendenceState {
  equipmentId: string;
  currentLevel: number;
  maxLevelReached: number;
  totalAttempts: number;
  totalSuccess: number;
  totalFail: number;
  protectedAttempts: number;
}

// ─── 초월 단계 테이블 ───────────────────────────────────────────

export const TRANSCENDENCE_TABLE: TranscendenceLevel[] = [
  {
    level: 1,
    successRate: 0.95,
    failRate: 0.05,
    destroyRate: 0,
    downgradeOnFail: false,
    materials: [{ itemId: 'transcendence_stone_common', name: '일반 초월석', amount: 1 }],
    goldCost: 5000,
    statBonus: 0.02,   // +2%
  },
  {
    level: 2,
    successRate: 0.90,
    failRate: 0.10,
    destroyRate: 0,
    downgradeOnFail: false,
    materials: [{ itemId: 'transcendence_stone_common', name: '일반 초월석', amount: 2 }],
    goldCost: 10000,
    statBonus: 0.04,   // +4%
  },
  {
    level: 3,
    successRate: 0.85,
    failRate: 0.15,
    destroyRate: 0,
    downgradeOnFail: false,
    materials: [{ itemId: 'transcendence_stone_common', name: '일반 초월석', amount: 3 }],
    goldCost: 20000,
    statBonus: 0.07,   // +7%
  },
  {
    level: 4,
    successRate: 0.75,
    failRate: 0.25,
    destroyRate: 0,
    downgradeOnFail: true,
    materials: [{ itemId: 'transcendence_stone_rare', name: '레어 초월석', amount: 1 }],
    goldCost: 35000,
    statBonus: 0.10,   // +10%
  },
  {
    level: 5,
    successRate: 0.65,
    failRate: 0.30,
    destroyRate: 0.05,
    downgradeOnFail: true,
    materials: [{ itemId: 'transcendence_stone_rare', name: '레어 초월석', amount: 2 }],
    goldCost: 50000,
    statBonus: 0.14,   // +14%
  },
  {
    level: 6,
    successRate: 0.55,
    failRate: 0.35,
    destroyRate: 0.10,
    downgradeOnFail: true,
    materials: [{ itemId: 'transcendence_stone_rare', name: '레어 초월석', amount: 3 }],
    goldCost: 75000,
    statBonus: 0.19,   // +19%
  },
  {
    level: 7,
    successRate: 0.45,
    failRate: 0.40,
    destroyRate: 0.15,
    downgradeOnFail: true,
    materials: [
      { itemId: 'transcendence_stone_rare', name: '레어 초월석', amount: 3 },
      { itemId: 'transcendence_stone_epic', name: '에픽 초월석', amount: 1 },
    ],
    goldCost: 100000,
    statBonus: 0.25,   // +25%
  },
  {
    level: 8,
    successRate: 0.35,
    failRate: 0.45,
    destroyRate: 0.20,
    downgradeOnFail: true,
    materials: [{ itemId: 'transcendence_stone_epic', name: '에픽 초월석', amount: 2 }],
    goldCost: 150000,
    statBonus: 0.32,   // +32%
  },
  {
    level: 9,
    successRate: 0.25,
    failRate: 0.50,
    destroyRate: 0.25,
    downgradeOnFail: true,
    materials: [{ itemId: 'transcendence_stone_epic', name: '에픽 초월석', amount: 3 }],
    goldCost: 200000,
    statBonus: 0.40,   // +40%
  },
  {
    level: 10,
    successRate: 0.15,
    failRate: 0.50,
    destroyRate: 0.35,
    downgradeOnFail: true,
    materials: [
      { itemId: 'transcendence_stone_epic', name: '에픽 초월석', amount: 5 },
      { itemId: 'lethe_essence', name: '레테의 정수', amount: 1 },
    ],
    goldCost: 500000,
    statBonus: 0.50,   // +50%
  },
];

// ─── 초월석 획득처 ──────────────────────────────────────────────

export const TRANSCENDENCE_STONE_SOURCES = {
  transcendence_stone_common: {
    name: '일반 초월석',
    sources: [
      '무한 던전 51~100위 주간 보상',
      '일반 던전 (하드) 드랍 (5%)',
      '일일 퀘스트 보상 (3개/일)',
    ],
  },
  transcendence_stone_rare: {
    name: '레어 초월석',
    sources: [
      '무한 던전 4~50위 주간 보상',
      '월드 보스 기여도 상위 30%',
      '시즌패스 프리미엄 (30/40단계)',
    ],
  },
  transcendence_stone_epic: {
    name: '에픽 초월석',
    sources: [
      '무한 던전 1~3위 주간 보상',
      '월드 보스 기여도 상위 5%',
      '시즌패스 프리미엄 (50단계)',
    ],
  },
  lethe_essence: {
    name: '레테의 정수',
    sources: [
      '월드 보스 레테 대심연체 드랍 (5%)',
      '무한 던전 100층 클리어 보상',
    ],
  },
};

// ─── 초월 실행 ──────────────────────────────────────────────────

export async function attemptTranscendence(
  playerId: string,
  equipmentId: string,
  useProtection: boolean = false,  // 파괴 보호 아이템 사용 여부
): Promise<TranscendenceResult> {
  // 1. 장비 조회
  const equipment = await prisma.equipment.findUnique({
    where: { id: equipmentId },
    include: { owner: true },
  });

  if (!equipment || equipment.ownerId !== playerId) {
    return { success: false, destroyed: false, downgraded: false, previousLevel: 0, newLevel: 0, message: '장비를 찾을 수 없습니다.' };
  }

  const currentLevel = equipment.transcendenceLevel ?? 0;

  if (currentLevel >= 10) {
    return { success: false, destroyed: false, downgraded: false, previousLevel: currentLevel, newLevel: currentLevel, message: '이미 최대 초월 단계입니다.' };
  }

  const targetConfig = TRANSCENDENCE_TABLE[currentLevel]; // 현재 레벨에서 다음으로 가기 위한 설정

  // 2. 재료 확인 (생략 — 실제 구현 시 인벤토리 차감)
  // 3. 골드 확인 (생략)

  // 4. 확률 판정
  const roll = Math.random();
  let success = false;
  let destroyed = false;
  let downgraded = false;
  let newLevel = currentLevel;

  if (roll < targetConfig.successRate) {
    // 성공
    success = true;
    newLevel = currentLevel + 1;
  } else if (roll < targetConfig.successRate + targetConfig.failRate) {
    // 실패 (유지 또는 하락)
    if (targetConfig.downgradeOnFail && currentLevel > 0) {
      downgraded = true;
      newLevel = currentLevel - 1;
    }
  } else {
    // 파괴
    if (useProtection) {
      // 보호 아이템 사용 시 파괴 방지 → 실패로 처리
      downgraded = targetConfig.downgradeOnFail && currentLevel > 0;
      if (downgraded) newLevel = currentLevel - 1;
    } else {
      destroyed = true;
      newLevel = 0;
    }
  }

  // 5. DB 업데이트
  if (destroyed && !useProtection) {
    await prisma.equipment.update({
      where: { id: equipmentId },
      data: { isDestroyed: true, transcendenceLevel: 0 },
    });
  } else {
    await prisma.equipment.update({
      where: { id: equipmentId },
      data: { transcendenceLevel: newLevel },
    });
  }

  // 6. 로그 기록
  await prisma.transcendenceLog.create({
    data: {
      playerId,
      equipmentId,
      previousLevel: currentLevel,
      targetLevel: currentLevel + 1,
      resultLevel: newLevel,
      success,
      destroyed: destroyed && !useProtection,
      protected: useProtection && roll >= targetConfig.successRate + targetConfig.failRate,
      timestamp: new Date(),
    },
  });

  // 7. 결과 메시지
  let message: string;
  if (success) {
    message = `초월 +${newLevel} 성공! 기본 스탯 ${Math.round(targetConfig.statBonus * 100)}% 증가`;
  } else if (destroyed && !useProtection) {
    message = '초월 실패 — 장비가 파괴되었습니다.';
  } else if (downgraded) {
    message = `초월 실패 — 단계가 +${newLevel}로 하락했습니다.`;
  } else {
    message = '초월 실패 — 단계가 유지됩니다.';
  }

  return { success, destroyed: destroyed && !useProtection, downgraded, previousLevel: currentLevel, newLevel, message };
}

// ─── 스탯 계산 ──────────────────────────────────────────────────

export function getTranscendenceStatBonus(level: number): number {
  if (level <= 0) return 0;
  if (level > 10) return TRANSCENDENCE_TABLE[9].statBonus;
  return TRANSCENDENCE_TABLE[level - 1].statBonus;
}

/** 장비 최종 스탯 계산 (초월 보너스 적용) */
export function applyTranscendenceBonus(
  baseStat: number,
  transcendenceLevel: number,
): number {
  const bonus = getTranscendenceStatBonus(transcendenceLevel);
  return Math.floor(baseStat * (1 + bonus));
}

// ─── 초월 UI 정보 ───────────────────────────────────────────────

export function getTranscendenceInfo(currentLevel: number): {
  nextLevel: TranscendenceLevel | null;
  currentBonus: number;
  maxLevel: number;
} {
  return {
    nextLevel: currentLevel < 10 ? TRANSCENDENCE_TABLE[currentLevel] : null,
    currentBonus: getTranscendenceStatBonus(currentLevel),
    maxLevel: 10,
  };
}

console.log('[P11-06] TranscendenceManager 모듈 로드 완료');
