/**
 * 유닛 테스트 — SYNC-255 🎯: 5 sprint (251~255) 누적 stress + BOSS_ENRAGE_PHASES
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_COSMETIC_SLOTS,
  SCENARIO_MOUNT_SPEED_TIERS,
  SCENARIO_ARENA_MATCH_FORMATS,
  SCENARIO_GEM_SOCKET_COLORS,
  SCENARIO_BOSS_ENRAGE_PHASES,
  getBossEnragePhaseNarrative,
  getBossEnragePhaseAtHp,
  type BossEnragePhase,
} from '../../shared/types/scenarioRegistry';

const PHASES: readonly BossEnragePhase[] = ['calm', 'agitated', 'enraged', 'desperate'];

describe('SYNC-255 🎯 5 sprint 누적 stress', () => {
  test('BOSS_ENRAGE_PHASES — 4 단계 매칭', () => {
    expect(SCENARIO_BOSS_ENRAGE_PHASES.length).toBe(4);
    for (const p of PHASES) {
      expect(getBossEnragePhaseNarrative(p), p).toBeDefined();
    }
  });

  test('enterAtHpPercent 단조 감소, damageMultiplier 단조 증가', () => {
    const order: readonly BossEnragePhase[] = ['calm', 'agitated', 'enraged', 'desperate'];
    for (let i = 1; i < order.length; i += 1) {
      const prev = getBossEnragePhaseNarrative(order[i - 1])!;
      const cur = getBossEnragePhaseNarrative(order[i])!;
      expect(cur.enterAtHpPercent, `${order[i - 1]}->${order[i]}`).toBeLessThan(prev.enterAtHpPercent);
      expect(cur.damageMultiplier, `${order[i - 1]}->${order[i]}`).toBeGreaterThan(prev.damageMultiplier);
    }
  });

  test('getBossEnragePhaseAtHp — HP 임계치 매핑', () => {
    expect(getBossEnragePhaseAtHp(100)).toBe('calm');
    expect(getBossEnragePhaseAtHp(80)).toBe('agitated');
    expect(getBossEnragePhaseAtHp(50)).toBe('enraged');
    expect(getBossEnragePhaseAtHp(15)).toBe('desperate');
  });

  test('sync-251~255 신규 도메인 5종 entry count 정합', () => {
    expect(SCENARIO_COSMETIC_SLOTS.length).toBe(5);
    expect(SCENARIO_MOUNT_SPEED_TIERS.length).toBe(4);
    expect(SCENARIO_ARENA_MATCH_FORMATS.length).toBe(4);
    expect(SCENARIO_GEM_SOCKET_COLORS.length).toBe(4);
    expect(SCENARIO_BOSS_ENRAGE_PHASES.length).toBe(4);
  });

  test('sync-251~255 누적 21 entry 확보', () => {
    const total =
      SCENARIO_COSMETIC_SLOTS.length +
      SCENARIO_MOUNT_SPEED_TIERS.length +
      SCENARIO_ARENA_MATCH_FORMATS.length +
      SCENARIO_GEM_SOCKET_COLORS.length +
      SCENARIO_BOSS_ENRAGE_PHASES.length;
    expect(total).toBe(21);
  });
});
