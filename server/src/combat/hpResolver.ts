/**
 * hpResolver.ts — 캐릭터 maxHp 조회 모듈 (P7-10)
 *
 * 역할:
 *   - 캐릭터 ID → 레벨 + 클래스 기반 maxHp 계산
 *   - 전직 스탯 보너스(hp) 반영
 *   - 인메모리 캐시 (5초 TTL) 로 DB 호출 최소화
 *
 * 공식:
 *   baseHp = CLASS_BASE_HP[classId] (기본 200)
 *   levelHp = level × HP_PER_LEVEL (기본 15)
 *   advancementBonusHp = 전직 statBonus.hp 합산
 *   maxHp = baseHp + levelHp + advancementBonusHp
 */

import { prisma } from '../db';

// ─── 상수 ────────────────────────────────────────────────────────

/** 클래스별 기본 HP */
const CLASS_BASE_HP: Record<string, number> = {
  // 베이스 클래스
  ether_knight:  300,
  memory_weaver: 200,
  shadow_weaver: 220,
  // 전직 클래스 — 베이스에서 파생, 동일 기본값 사용
  guardian:          300,
  destroyer:         300,
  ether_berserker:   300,
  memory_weaver_adv: 200,
  time_tuner:        200,
  memory_lord:       200,
  illusionist:       220,
  soul_reaper:       220,
  void_lord:         220,
};

/** 레벨당 HP 증가량 */
const HP_PER_LEVEL = 15;

/** 캐시 TTL (ms) */
const CACHE_TTL = 5_000;

// ─── 캐시 ────────────────────────────────────────────────────────

interface CacheEntry {
  maxHp: number;
  expiresAt: number;
}

const hpCache = new Map<string, CacheEntry>();

// ─── 공개 함수 ───────────────────────────────────────────────────

/**
 * 캐릭터 ID로 maxHp를 동기적으로 반환한다.
 * 캐시에 없으면 기본값(1000)을 반환하고 비동기 갱신을 트리거한다.
 * (statusEffectManager.tick이 동기 콜백을 요구하므로)
 */
export function getCharacterMaxHp(characterId: string): number {
  const now = Date.now();
  const cached = hpCache.get(characterId);

  if (cached && cached.expiresAt > now) {
    return cached.maxHp;
  }

  // 캐시 미스 → 비동기 갱신 트리거 + 기본값 반환
  void refreshCharacterMaxHp(characterId);
  return cached?.maxHp ?? 1000; // 만료 데이터 또는 폴백
}

/**
 * 비동기로 캐릭터 maxHp를 DB에서 조회하여 캐시에 저장한다.
 */
export async function refreshCharacterMaxHp(characterId: string): Promise<number> {
  try {
    const character = await prisma.character.findUnique({
      where: { id: characterId },
      select: { level: true, classId: true },
    });

    if (!character) {
      return 1000; // 캐릭터 없음 — 안전 기본값
    }

    const baseHp = CLASS_BASE_HP[character.classId] ?? 200;
    const levelHp = character.level * HP_PER_LEVEL;

    // 전직 보너스 조회 (현재 클래스의 모든 전직 경로 hp 합산)
    let advancementBonusHp = 0;
    try {
      const advancements = await prisma.classAdvancement.findMany({
        where: { advancedClass: character.classId },
        select: { statBonus: true },
      });

      for (const adv of advancements) {
        const bonus = adv.statBonus as Record<string, number>;
        advancementBonusHp += bonus.hp ?? 0;
      }
    } catch {
      // 전직 데이터 조회 실패 시 무시 (0 보너스)
    }

    const maxHp = baseHp + levelHp + advancementBonusHp;

    // 캐시 갱신
    hpCache.set(characterId, {
      maxHp,
      expiresAt: Date.now() + CACHE_TTL,
    });

    return maxHp;
  } catch {
    return 1000; // DB 오류 시 안전 기본값
  }
}

/**
 * 캐시 무효화 (캐릭터 레벨업/전직 시 호출)
 */
export function invalidateHpCache(characterId: string): void {
  hpCache.delete(characterId);
}

/**
 * 전체 캐시 초기화
 */
export function clearHpCache(): void {
  hpCache.clear();
}
