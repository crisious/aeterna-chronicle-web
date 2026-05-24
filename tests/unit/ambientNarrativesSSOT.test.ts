/**
 * 유닛 테스트 — SYNC-105: SCENARIO_AMBIENT_NARRATIVES SSOT consistency
 *
 * 1) zoneSeeds.ambientSound 의 모든 id 가 narrative 매칭
 * 2) ambientId 중복 없음, description 비어 있지 않음, category 유효
 * 3) category 필터 헬퍼 정상
 */
import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import {
  SCENARIO_AMBIENT_NARRATIVES,
  getAmbientNarrative,
  listAmbientNarrativesByCategory,
  type AmbientCategory,
} from '../../shared/types/scenarioRegistry';

function extractAmbientIdsFromZoneSeeds(): string[] {
  const zoneSeedsPath = path.resolve(__dirname, '../../server/src/world/zoneSeeds.ts');
  const source = readFileSync(zoneSeedsPath, 'utf8');
  const ids = new Set<string>();
  const pattern = /ambientSound:\s*'([^']+)'/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(source)) !== null) {
    ids.add(match[1]);
  }
  return [...ids];
}

const ZONE_AMBIENT_IDS = extractAmbientIdsFromZoneSeeds();
const VALID_CATEGORIES: readonly AmbientCategory[] = ['urban', 'wild', 'water', 'machine', 'sacred', 'occult'];

describe('SCENARIO_AMBIENT_NARRATIVES', () => {
  test('zoneSeeds 의 모든 ambient id 가 narrative 에 매칭된다', () => {
    expect(ZONE_AMBIENT_IDS.length).toBeGreaterThan(0);
    for (const id of ZONE_AMBIENT_IDS) {
      expect(getAmbientNarrative(id), id).toBeDefined();
    }
  });

  test('ambientId 는 중복되지 않는다', () => {
    const ids = SCENARIO_AMBIENT_NARRATIVES.map((a) => a.ambientId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('모든 narrative description 은 비어 있지 않다', () => {
    for (const a of SCENARIO_AMBIENT_NARRATIVES) {
      expect(a.description.trim(), a.ambientId).not.toBe('');
    }
  });

  test('category 는 6종 enum 안에 든다', () => {
    for (const a of SCENARIO_AMBIENT_NARRATIVES) {
      expect(VALID_CATEGORIES, a.ambientId).toContain(a.category);
    }
  });

  test('listAmbientNarrativesByCategory 는 합산 시 전체와 일치한다', () => {
    const total = VALID_CATEGORIES.reduce(
      (sum, c) => sum + listAmbientNarrativesByCategory(c).length, 0,
    );
    expect(total).toBe(SCENARIO_AMBIENT_NARRATIVES.length);
  });
});
