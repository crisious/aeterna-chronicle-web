/**
 * 유닛 테스트 — SYNC-126: SCENARIO_SAVE_SLOT_DESCRIPTIONS SSOT consistency
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_SAVE_SLOT_DESCRIPTIONS,
  getSaveSlotDescription,
  listSaveSlotKinds,
  getTotalDefaultSaveSlots,
  type SaveSlotKind,
} from '../../shared/types/scenarioRegistry';

const ALL: readonly SaveSlotKind[] = ['manual', 'auto', 'quick', 'checkpoint'];

describe('SCENARIO_SAVE_SLOT_DESCRIPTIONS', () => {
  test('4 slot kind 모두 정의', () => {
    expect(SCENARIO_SAVE_SLOT_DESCRIPTIONS.length).toBe(4);
    for (const k of ALL) {
      expect(getSaveSlotDescription(k), k).toBeDefined();
    }
  });

  test('defaultSlotCount 는 양의 정수', () => {
    for (const s of SCENARIO_SAVE_SLOT_DESCRIPTIONS) {
      expect(s.defaultSlotCount, s.kind).toBeGreaterThan(0);
      expect(Number.isInteger(s.defaultSlotCount), s.kind).toBe(true);
    }
  });

  test('label/triggerSummary/usageHint 비어 있지 않음', () => {
    for (const s of SCENARIO_SAVE_SLOT_DESCRIPTIONS) {
      expect(s.label.trim(), s.kind).not.toBe('');
      expect(s.triggerSummary.trim(), s.kind).not.toBe('');
      expect(s.usageHint.trim(), s.kind).not.toBe('');
    }
  });

  test('getTotalDefaultSaveSlots 합산은 개별 합과 일치', () => {
    const manual = getSaveSlotDescription('manual')!;
    const auto = getSaveSlotDescription('auto')!;
    const quick = getSaveSlotDescription('quick')!;
    const checkpoint = getSaveSlotDescription('checkpoint')!;
    const expected = manual.defaultSlotCount + auto.defaultSlotCount + quick.defaultSlotCount + checkpoint.defaultSlotCount;
    expect(getTotalDefaultSaveSlots()).toBe(expected);
  });

  test('listSaveSlotKinds 는 4 종 반환', () => {
    expect(listSaveSlotKinds()).toEqual(ALL);
  });
});
