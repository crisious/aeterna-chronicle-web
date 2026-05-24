/**
 * 유닛 테스트 — SYNC-193: SCENARIO_FRAME_PACING_TARGETS SSOT
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_FRAME_PACING_TARGETS,
  getFramePacingNarrative,
  listFramePacingTargets,
  type FramePacingTarget,
} from '../../shared/types/scenarioRegistry';

const ALL: readonly FramePacingTarget[] = ['fps_30', 'fps_60', 'fps_120', 'adaptive'];

describe('SCENARIO_FRAME_PACING_TARGETS', () => {
  test('4 타겟 모두 정의', () => {
    expect(SCENARIO_FRAME_PACING_TARGETS.length).toBe(4);
    for (const t of ALL) {
      expect(getFramePacingNarrative(t), t).toBeDefined();
    }
  });

  test('targetFps × frameBudgetMs ≈ 1000 (제외: adaptive)', () => {
    for (const f of SCENARIO_FRAME_PACING_TARGETS) {
      if (f.target === 'adaptive') {
        expect(f.targetFps).toBe(0);
        expect(f.frameBudgetMs).toBe(0);
        continue;
      }
      const product = f.targetFps * f.frameBudgetMs;
      expect(product, f.target).toBeGreaterThan(999);
      expect(product, f.target).toBeLessThan(1001);
    }
  });

  test('vsyncPolicy 는 on/off/adaptive 안에 든다', () => {
    const valid = ['on', 'off', 'adaptive'];
    for (const f of SCENARIO_FRAME_PACING_TARGETS) {
      expect(valid, f.target).toContain(f.vsyncPolicy);
    }
  });

  test('label/usageHint 비어 있지 않음', () => {
    for (const f of SCENARIO_FRAME_PACING_TARGETS) {
      expect(f.label.trim(), f.target).not.toBe('');
      expect(f.usageHint.trim(), f.target).not.toBe('');
    }
  });

  test('target 중복 없음', () => {
    const ts = SCENARIO_FRAME_PACING_TARGETS.map((f) => f.target);
    expect(new Set(ts).size).toBe(ts.length);
  });
});
