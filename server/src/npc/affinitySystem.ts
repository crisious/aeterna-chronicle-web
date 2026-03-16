/**
 * affinitySystem.ts — NPC 호감도 시스템
 *
 * 레벨 구간:
 *   0      → 무관심 (neutral)
 *   1~3    → 호의 (friendly)
 *   4~6    → 친밀 (close)
 *   7~9    → 신뢰 (trusted)
 *   10     → 충성 (loyal)
 *
 * 레벨별 해금:
 *   1 → 특수 대화
 *   3 → 할인 (상점 NPC 10%)
 *   5 → 퀘스트 해금
 *   7 → 비밀 상점 오픈
 *   10 → 동료 합류 가능
 */

import { prisma } from '../db';

// ── 상수 ──────────────────────────────────────────────────────

/** 레벨업에 필요한 누적 경험치 (index = 목표 레벨) */
const EXP_THRESHOLDS: readonly number[] = [
  0,    // Lv.0 (사용 안 함)
  10,   // Lv.1
  30,   // Lv.2
  60,   // Lv.3
  100,  // Lv.4
  150,  // Lv.5
  210,  // Lv.6
  280,  // Lv.7
  360,  // Lv.8
  450,  // Lv.9
  550,  // Lv.10
];

const MAX_LEVEL = 10;

/** 호감도 등급 이름 */
export type AffinityTier = 'neutral' | 'friendly' | 'close' | 'trusted' | 'loyal';

/** NPC 아이템 선호도 매핑 (itemId → 추가 경험치) */
export interface GiftPreference {
  itemId: string;
  bonus: number;  // 5~20
}

// ── 유틸 ──────────────────────────────────────────────────────

/** 현재 레벨에서 등급 이름 반환 */
export function getAffinityTier(level: number): AffinityTier {
  if (level <= 0) return 'neutral';
  if (level <= 3) return 'friendly';
  if (level <= 6) return 'close';
  if (level <= 9) return 'trusted';
  return 'loyal';
}

/** 현재 레벨에서 해금된 기능 목록 */
export function getUnlockedFeatures(level: number): string[] {
  const features: string[] = [];
  if (level >= 1) features.push('special_dialogue');
  if (level >= 3) features.push('discount_10');
  if (level >= 5) features.push('quest_unlock');
  if (level >= 7) features.push('secret_shop');
  if (level >= 10) features.push('companion_join');
  return features;
}

/** 경험치 → 레벨 계산 */
function calcLevel(totalExp: number): number {
  for (let lv = MAX_LEVEL; lv >= 1; lv--) {
    if (totalExp >= EXP_THRESHOLDS[lv]) return lv;
  }
  return 0;
}

// ── 핵심 API ──────────────────────────────────────────────────

export interface AffinityResult {
  userId: string;
  npcId: string;
  level: number;
  exp: number;
  tier: AffinityTier;
  unlockedFeatures: string[];
  leveledUp: boolean;
  previousLevel: number;
}

/**
 * 호감도 조회 (없으면 기본값 반환)
 */
export async function getAffinity(
  userId: string,
  npcId: string
): Promise<AffinityResult> {
  const record = await prisma.npcAffinity.findUnique({
    where: { userId_npcId: { userId, npcId } },
  });

  const level = record?.level ?? 0;
  const exp = record?.exp ?? 0;

  return {
    userId,
    npcId,
    level,
    exp,
    tier: getAffinityTier(level),
    unlockedFeatures: getUnlockedFeatures(level),
    leveledUp: false,
    previousLevel: level,
  };
}

/**
 * 대화 시 호감도 증가 (+1~3 랜덤)
 */
export async function onDialogue(
  userId: string,
  npcId: string
): Promise<AffinityResult> {
  const gain = Math.floor(Math.random() * 3) + 1; // 1~3
  return addExp(userId, npcId, gain);
}

/**
 * 선물 시 호감도 증가 (+5~20, 선호도 반영)
 * @param preferences NPC의 선호 아이템 목록 (없으면 기본 +5)
 */
export async function onGift(
  userId: string,
  npcId: string,
  itemId: string,
  preferences: GiftPreference[] = []
): Promise<AffinityResult> {
  const pref = preferences.find((p) => p.itemId === itemId);
  const gain = pref ? pref.bonus : 5; // 선호 아이템이 아니면 기본 5

  // 선물 이력 기록
  const existing = await prisma.npcAffinity.findUnique({
    where: { userId_npcId: { userId, npcId } },
  });

  const currentGifts = (existing?.gifts ?? []) as Array<{ itemId: string; at: string }>;
  const updatedGifts = [...currentGifts, { itemId, at: new Date().toISOString() }];

  // 경험치 증가 + 선물 이력 업데이트
  const result = await addExp(userId, npcId, gain, updatedGifts);
  return result;
}

// ── 내부 헬퍼 ─────────────────────────────────────────────────

/**
 * 경험치 추가 + 레벨업 처리
 */
async function addExp(
  userId: string,
  npcId: string,
  amount: number,
  gifts?: unknown
): Promise<AffinityResult> {
  // upsert로 레코드 생성 or 업데이트
  const current = await prisma.npcAffinity.findUnique({
    where: { userId_npcId: { userId, npcId } },
  });

  const prevLevel = current?.level ?? 0;
  const prevExp = current?.exp ?? 0;
  const newExp = prevExp + amount;
  const newLevel = Math.min(calcLevel(newExp), MAX_LEVEL);

  // Prisma InputJsonValue 호환을 위해 JSON.parse/stringify 변환
  const giftsJson = gifts !== undefined
    ? JSON.parse(JSON.stringify(gifts)) as []
    : undefined;

  await prisma.npcAffinity.upsert({
    where: { userId_npcId: { userId, npcId } },
    create: {
      userId,
      npcId,
      exp: newExp,
      level: newLevel,
      gifts: giftsJson ?? [],
    },
    update: {
      exp: newExp,
      level: newLevel,
      ...(giftsJson !== undefined ? { gifts: giftsJson } : {}),
    },
  });

  return {
    userId,
    npcId,
    level: newLevel,
    exp: newExp,
    tier: getAffinityTier(newLevel),
    unlockedFeatures: getUnlockedFeatures(newLevel),
    leveledUp: newLevel > prevLevel,
    previousLevel: prevLevel,
  };
}
