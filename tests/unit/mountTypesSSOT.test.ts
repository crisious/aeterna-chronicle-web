/**
 * 유닛 테스트 — SYNC-217: SCENARIO_MOUNT_TYPES SSOT
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_MOUNT_TYPES,
  getMountTypeNarrative,
  listMountTypesBySpeed,
  type MountType,
} from '../../shared/types/scenarioRegistry';

const ALL: readonly MountType[] = ['horse', 'ostrich', 'dragon', 'airship', 'teleport_stone'];

describe('SCENARIO_MOUNT_TYPES', () => {
  test('5 탈것 모두 정의', () => {
    expect(SCENARIO_MOUNT_TYPES.length).toBe(5);
    for (const m of ALL) {
      expect(getMountTypeNarrative(m), m).toBeDefined();
    }
  });

  test('speedMultiplier 1 초과', () => {
    for (const m of SCENARIO_MOUNT_TYPES) {
      expect(m.speedMultiplier, m.mount).toBeGreaterThan(1);
    }
  });

  test('teleport_stone 이 가장 빠름', () => {
    const sorted = listMountTypesBySpeed();
    expect(sorted[sorted.length - 1].mount).toBe('teleport_stone');
  });

  test('label/unlockRequirement/usageHint 비어 있지 않음', () => {
    for (const m of SCENARIO_MOUNT_TYPES) {
      expect(m.label.trim(), m.mount).not.toBe('');
      expect(m.unlockRequirement.trim(), m.mount).not.toBe('');
      expect(m.usageHint.trim(), m.mount).not.toBe('');
    }
  });

  test('mount 중복 없음', () => {
    const ms = SCENARIO_MOUNT_TYPES.map((m) => m.mount);
    expect(new Set(ms).size).toBe(ms.length);
  });
});
