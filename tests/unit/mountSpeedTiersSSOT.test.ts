/**
 * 유닛 테스트 — SYNC-252: SCENARIO_MOUNT_SPEED_TIERS SSOT
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_MOUNT_SPEED_TIERS,
  getMountSpeedTierNarrative,
  listMountSpeedTiers,
  type MountSpeedTier,
} from '../../shared/types/scenarioRegistry';

const ALL: readonly MountSpeedTier[] = ['walk', 'trot', 'gallop', 'sprint'];

describe('SCENARIO_MOUNT_SPEED_TIERS', () => {
  test('4 등급 모두 정의', () => {
    expect(SCENARIO_MOUNT_SPEED_TIERS.length).toBe(4);
    for (const t of ALL) {
      expect(getMountSpeedTierNarrative(t), t).toBeDefined();
    }
  });

  test('speedMultiplier 단조 증가 (walk < trot < gallop < sprint)', () => {
    const order: readonly MountSpeedTier[] = ['walk', 'trot', 'gallop', 'sprint'];
    for (let i = 1; i < order.length; i += 1) {
      const prev = getMountSpeedTierNarrative(order[i - 1])!;
      const cur = getMountSpeedTierNarrative(order[i])!;
      expect(cur.speedMultiplier, `${order[i - 1]}->${order[i]}`).toBeGreaterThan(prev.speedMultiplier);
    }
  });

  test('staminaPerSecond 단조 증가', () => {
    const order: readonly MountSpeedTier[] = ['walk', 'trot', 'gallop', 'sprint'];
    for (let i = 1; i < order.length; i += 1) {
      const prev = getMountSpeedTierNarrative(order[i - 1])!;
      const cur = getMountSpeedTierNarrative(order[i])!;
      expect(cur.staminaPerSecond, `${order[i - 1]}->${order[i]}`).toBeGreaterThan(prev.staminaPerSecond);
    }
  });

  test('walk staminaPerSecond=0 (지속 가능)', () => {
    expect(getMountSpeedTierNarrative('walk')?.staminaPerSecond).toBe(0);
  });

  test('tier 중복 없음', () => {
    const ks = SCENARIO_MOUNT_SPEED_TIERS.map((m) => m.tier);
    expect(new Set(ks).size).toBe(ks.length);
  });

  test('listMountSpeedTiers 4 항목', () => {
    expect(listMountSpeedTiers().length).toBe(4);
  });
});
