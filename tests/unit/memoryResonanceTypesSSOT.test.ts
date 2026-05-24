/**
 * 유닛 테스트 — SYNC-169: SCENARIO_MEMORY_RESONANCE_TYPES SSOT
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_MEMORY_RESONANCE_TYPES,
  getMemoryResonanceNarrative,
  listMemoryResonancesByFrequency,
  type MemoryResonanceType,
} from '../../shared/types/scenarioRegistry';

const ALL: readonly MemoryResonanceType[] = ['fragment_echo', 'ancestral_voice', 'dream_glimpse', 'time_loop'];

describe('SCENARIO_MEMORY_RESONANCE_TYPES', () => {
  test('4 유형 모두 정의', () => {
    expect(SCENARIO_MEMORY_RESONANCE_TYPES.length).toBe(4);
    for (const t of ALL) {
      expect(getMemoryResonanceNarrative(t), t).toBeDefined();
    }
  });

  test('frequency 3종 enum 안에 든다', () => {
    const valid = ['rare', 'uncommon', 'common'];
    for (const r of SCENARIO_MEMORY_RESONANCE_TYPES) {
      expect(valid, r.type).toContain(r.frequency);
    }
  });

  test('label/resonanceAnchor/effectHint 비어 있지 않음', () => {
    for (const r of SCENARIO_MEMORY_RESONANCE_TYPES) {
      expect(r.label.trim(), r.type).not.toBe('');
      expect(r.resonanceAnchor.trim(), r.type).not.toBe('');
      expect(r.effectHint.trim(), r.type).not.toBe('');
    }
  });

  test('frequency 합산은 전체와 일치', () => {
    const total =
      listMemoryResonancesByFrequency('rare').length +
      listMemoryResonancesByFrequency('uncommon').length +
      listMemoryResonancesByFrequency('common').length;
    expect(total).toBe(SCENARIO_MEMORY_RESONANCE_TYPES.length);
  });

  test('type 중복 없음', () => {
    const ts = SCENARIO_MEMORY_RESONANCE_TYPES.map((r) => r.type);
    expect(new Set(ts).size).toBe(ts.length);
  });
});
