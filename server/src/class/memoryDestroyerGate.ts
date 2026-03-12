// ─── 기억파괴자(Memory Destroyer) 챕터 6 해금 게이트 ──────────
// P11-16: 미완 해소 — 기억파괴자 선택 시 chapter >= 6 완료 검증
//
// 기억파괴자는 P8에서 4번째 클래스로 추가되었으나,
// 챕터 6 완료 해금 조건 검증 코드가 누락되어 있었음.
// 이 모듈은 해금 조건 검증 + classRoutes 통합용 미들웨어를 제공한다.

import { prisma } from '../db';

// ─── 상수 ───────────────────────────────────────────────────

/** 기억파괴자 해금에 필요한 최소 완료 챕터 */
export const MEMORY_DESTROYER_REQUIRED_CHAPTER = 6;

/** 기억파괴자 기본 클래스 코드 */
export const MEMORY_BREAKER_CLASS_CODE = 'memory_breaker';

// ─── 타입 ───────────────────────────────────────────────────

export interface GateCheckResult {
  eligible: boolean;
  reason?: string;
  currentChapter?: number;
  requiredChapter: number;
}

// ─── 해금 검증 ──────────────────────────────────────────────

/**
 * 캐릭터(또는 계정)가 기억파괴자를 선택할 자격이 있는지 검증한다.
 * 조건: 해당 계정에 챕터 6 이상을 완료한 캐릭터가 1명 이상 존재
 *
 * @param accountId - 계정 ID
 * @returns GateCheckResult
 */
export async function checkMemoryDestroyerEligibility(
  accountId: string
): Promise<GateCheckResult> {
  const requiredChapter = MEMORY_DESTROYER_REQUIRED_CHAPTER;

  // 계정 내 최고 챕터 진행도 조회
  const maxProgress = await prisma.character.findFirst({
    where: { accountId },
    orderBy: { chapterProgress: 'desc' },
    select: { chapterProgress: true },
  });

  if (!maxProgress) {
    return {
      eligible: false,
      reason: '계정에 캐릭터가 존재하지 않습니다.',
      currentChapter: 0,
      requiredChapter,
    };
  }

  const currentChapter = maxProgress.chapterProgress;

  if (currentChapter < requiredChapter) {
    return {
      eligible: false,
      reason: `기억파괴자는 챕터 ${requiredChapter} 완료 후 해금됩니다. 현재 진행: 챕터 ${currentChapter}`,
      currentChapter,
      requiredChapter,
    };
  }

  return {
    eligible: true,
    currentChapter,
    requiredChapter,
  };
}

/**
 * 특정 캐릭터 기준으로 기억파괴자 해금 여부를 확인한다.
 * (캐릭터 생성 시 자기 자신은 아직 없으므로 계정 기준 사용을 권장)
 *
 * @param characterId - 캐릭터 ID
 * @returns GateCheckResult
 */
export async function checkMemoryDestroyerByCharacter(
  characterId: string
): Promise<GateCheckResult> {
  const character = await prisma.character.findUnique({
    where: { id: characterId },
    select: { accountId: true },
  });

  if (!character) {
    return {
      eligible: false,
      reason: '캐릭터를 찾을 수 없습니다.',
      currentChapter: 0,
      requiredChapter: MEMORY_DESTROYER_REQUIRED_CHAPTER,
    };
  }

  return checkMemoryDestroyerEligibility(character.accountId);
}

/**
 * 클래스 선택 요청에서 기억파괴자인지 확인하고 게이트를 적용한다.
 * classRoutes.ts의 전직/생성 엔드포인트에서 호출.
 *
 * @param accountId - 계정 ID
 * @param requestedClass - 요청된 클래스 코드
 * @returns null이면 통과, GateCheckResult면 차단
 */
export async function enforceClassGate(
  accountId: string,
  requestedClass: string
): Promise<GateCheckResult | null> {
  // 기억파괴자가 아니면 게이트 적용 안 함
  if (requestedClass !== MEMORY_BREAKER_CLASS_CODE) {
    return null;
  }

  const result = await checkMemoryDestroyerEligibility(accountId);

  if (!result.eligible) {
    return result;
  }

  return null; // 통과
}
