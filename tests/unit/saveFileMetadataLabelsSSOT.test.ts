/**
 * 유닛 테스트 — SYNC-152: SCENARIO_SAVE_FILE_METADATA_LABELS SSOT
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_SAVE_FILE_METADATA_LABELS,
  getSaveFileMetadataLabel,
  listSaveFileMetadataLabelsSorted,
  type SaveMetadataKey,
} from '../../shared/types/scenarioRegistry';

const ALL: readonly SaveMetadataKey[] = ['slot_name', 'chapter', 'playtime', 'last_zone', 'last_action', 'difficulty'];

describe('SCENARIO_SAVE_FILE_METADATA_LABELS', () => {
  test('6 라벨 모두 정의', () => {
    expect(SCENARIO_SAVE_FILE_METADATA_LABELS.length).toBe(6);
    for (const k of ALL) {
      expect(getSaveFileMetadataLabel(k), k).toBeDefined();
    }
  });

  test('sortOrder 1~6 중복 없음', () => {
    const sorts = SCENARIO_SAVE_FILE_METADATA_LABELS.map((m) => m.sortOrder).sort((a, b) => a - b);
    expect(sorts).toEqual([1, 2, 3, 4, 5, 6]);
  });

  test('label/formatHint 비어 있지 않음', () => {
    for (const m of SCENARIO_SAVE_FILE_METADATA_LABELS) {
      expect(m.label.trim(), m.key).not.toBe('');
      expect(m.formatHint.trim(), m.key).not.toBe('');
    }
  });

  test('listSaveFileMetadataLabelsSorted ascending', () => {
    const sorted = listSaveFileMetadataLabelsSorted();
    for (let i = 1; i < sorted.length; i += 1) {
      expect(sorted[i].sortOrder).toBeGreaterThan(sorted[i - 1].sortOrder);
    }
  });

  test('key 중복 없음', () => {
    const ks = SCENARIO_SAVE_FILE_METADATA_LABELS.map((m) => m.key);
    expect(new Set(ks).size).toBe(ks.length);
  });
});
