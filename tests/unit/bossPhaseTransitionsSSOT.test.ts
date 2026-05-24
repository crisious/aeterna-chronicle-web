/**
 * 유닛 테스트 — SYNC-151: SCENARIO_BOSS_PHASE_TRANSITIONS SSOT
 *
 * 1) phases 보유 보스 (malatus 3 + rawar 3 + lethe 5) 매칭
 * 2) phaseNumber 는 1~SCENARIO_BOSSES.phases 범위, 빠지지 않음
 * 3) bossObsidianId 는 SCENARIO_BOSSES 내에 존재
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_BOSSES,
  SCENARIO_BOSS_PHASE_TRANSITIONS,
  getBossPhaseTransition,
  listBossPhaseTransitions,
} from '../../shared/types/scenarioRegistry';

describe('SCENARIO_BOSS_PHASE_TRANSITIONS', () => {
  test('phases 보유 보스 모두 phase 1~N 까지 매칭', () => {
    const bossesWithPhases = SCENARIO_BOSSES.filter((b) => b.phases !== undefined);
    expect(bossesWithPhases.length).toBeGreaterThan(0);
    for (const boss of bossesWithPhases) {
      const phases = boss.phases!;
      for (let p = 1; p <= phases; p += 1) {
        const t = getBossPhaseTransition(boss.obsidianId, p);
        expect(t, `${boss.obsidianId}:p${p}`).toBeDefined();
      }
      expect(listBossPhaseTransitions(boss.obsidianId).length).toBe(phases);
    }
  });

  test('transition 은 SCENARIO_BOSSES 외 obsidianId 참조 없음', () => {
    const validIds = new Set(SCENARIO_BOSSES.map((b) => b.obsidianId));
    for (const t of SCENARIO_BOSS_PHASE_TRANSITIONS) {
      expect(validIds.has(t.bossObsidianId), t.bossObsidianId).toBe(true);
    }
  });

  test('phaseNumber 는 1~phases 범위', () => {
    for (const t of SCENARIO_BOSS_PHASE_TRANSITIONS) {
      const boss = SCENARIO_BOSSES.find((b) => b.obsidianId === t.bossObsidianId);
      const max = boss?.phases ?? 0;
      expect(t.phaseNumber, `${t.bossObsidianId}:p${t.phaseNumber}`).toBeGreaterThanOrEqual(1);
      expect(t.phaseNumber, `${t.bossObsidianId}:p${t.phaseNumber}`).toBeLessThanOrEqual(max);
    }
  });

  test('phaseLabel/transitionAnchor/patternHint 비어 있지 않음', () => {
    for (const t of SCENARIO_BOSS_PHASE_TRANSITIONS) {
      expect(t.phaseLabel.trim(), `${t.bossObsidianId}:p${t.phaseNumber}`).not.toBe('');
      expect(t.transitionAnchor.trim(), `${t.bossObsidianId}:p${t.phaseNumber}`).not.toBe('');
      expect(t.patternHint.trim(), `${t.bossObsidianId}:p${t.phaseNumber}`).not.toBe('');
    }
  });

  test('(bossObsidianId, phaseNumber) 조합 중복 없음', () => {
    const keys = SCENARIO_BOSS_PHASE_TRANSITIONS.map((t) => `${t.bossObsidianId}:${t.phaseNumber}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
