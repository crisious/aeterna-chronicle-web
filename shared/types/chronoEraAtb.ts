// 시대(ChronoEra) → ATB 배속 티어 매핑 (CHRONO-S6)
// 크로노 트리거 스타일: 시대별 ATB 충전 속도 차별화로 긴장감 부여.
// - ancient(고대): 느린 ATB → 전술 시간 여유, 회상 분위기
// - present(현재): 표준 1.0x
// - ruined_future(붕괴미래): 빠른 ATB → 긴박감, 강화된 적

import type { ATBSpeedTier } from './atb';

export type ChronoEraId = 'ancient' | 'present' | 'ruined_future';

const ERA_TO_TIER: Record<ChronoEraId, ATBSpeedTier> = {
  ancient: 2,        // 0.7x
  present: 3,        // 1.0x (FF6 standard)
  ruined_future: 4,  // 1.3x
};

export function chronoEraToSpeedTier(eraId: ChronoEraId): ATBSpeedTier {
  return ERA_TO_TIER[eraId] ?? 3;
}

const VALID_ERAS: ReadonlySet<ChronoEraId> = new Set<ChronoEraId>([
  'ancient',
  'present',
  'ruined_future',
]);

export function isChronoEraId(value: unknown): value is ChronoEraId {
  return typeof value === 'string' && VALID_ERAS.has(value as ChronoEraId);
}

/**
 * CHRONO-S12: 시대별 monster 스탯 보정.
 * 클라 ChronoTimeline.CHRONO_ERAS 와 동일 값(SSOT 일관성).
 * - ancient: 약화된 회상 (0.9x HP, 0.95x 공격속도, 보상 1.0x)
 * - present: 표준
 * - ruined_future: 강화된 미래 (1.25x HP, 1.15x 공격속도, 보상 1.25x)
 */
export interface ChronoEnemyMultipliers {
  hp: number;
  attackSpeed: number;
  reward: number;
  levelOffset: number;
}

const ERA_TO_ENEMY_MULT: Record<ChronoEraId, ChronoEnemyMultipliers> = {
  ancient: { hp: 0.9, attackSpeed: 0.95, reward: 1.0, levelOffset: -2 },
  present: { hp: 1.0, attackSpeed: 1.0, reward: 1.0, levelOffset: 0 },
  ruined_future: { hp: 1.25, attackSpeed: 1.15, reward: 1.25, levelOffset: 6 },
};

export function chronoEraToEnemyMultipliers(eraId: ChronoEraId): ChronoEnemyMultipliers {
  return ERA_TO_ENEMY_MULT[eraId] ?? ERA_TO_ENEMY_MULT.present;
}

/**
 * CHRONO-S21: 시대별 monster 이름 데코레이터.
 * 클라/서버 모두 동일 prefix 사용해 UI 표시 일관성 유지.
 * - ancient: "[고대] " 접두사
 * - present: 변경 없음
 * - ruined_future: "[붕괴] " 접두사
 */
const ERA_NAME_PREFIX: Record<ChronoEraId, string> = {
  ancient: '[고대] ',
  present: '',
  ruined_future: '[붕괴] ',
};

export function decorateMonsterNameByEra(name: string, eraId: ChronoEraId): string {
  const prefix = ERA_NAME_PREFIX[eraId] ?? '';
  // 중복 prefix 방지 (이미 적용된 이름이라면 그대로 반환)
  if (prefix && name.startsWith(prefix)) return name;
  return `${prefix}${name}`;
}

/**
 * CHRONO-S30: 시대별 bonus rare drop entry.
 * ruined_future 시 시대 전용 chrono 결정 아이템이 낮은 확률로 추가 드롭.
 * 클라/서버 동일 SSOT — UI 표시/툴팁에도 활용 가능.
 */
export interface EraDropEntry {
  itemId: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  dropRate: number;
  minQuantity: number;
  maxQuantity: number;
}

const ERA_BONUS_DROPS: Record<ChronoEraId, readonly EraDropEntry[]> = {
  ancient: [
    { itemId: 'ancient_relic_shard', rarity: 'rare', dropRate: 3, minQuantity: 1, maxQuantity: 1 },
  ],
  present: [],
  ruined_future: [
    { itemId: 'chrono_crystal', rarity: 'epic', dropRate: 5, minQuantity: 1, maxQuantity: 2 },
    { itemId: 'voidshard', rarity: 'rare', dropRate: 8, minQuantity: 1, maxQuantity: 1 },
  ],
};

export function chronoEraBonusDrops(eraId: ChronoEraId): readonly EraDropEntry[] {
  return ERA_BONUS_DROPS[eraId] ?? [];
}
