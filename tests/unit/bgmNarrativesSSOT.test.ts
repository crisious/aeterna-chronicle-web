/**
 * 유닛 테스트 — SYNC-104: SCENARIO_BGM_NARRATIVES SSOT consistency
 *
 * 1) zoneSeeds 의 모든 bgm id 는 narrative 가 매칭된다
 * 2) bgmId 중복 없음, mood/intent 비어 있지 않음, intensity 유효
 * 3) intensity 필터 헬퍼 정상
 */
import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import {
  SCENARIO_BGM_NARRATIVES,
  getBgmNarrative,
  listBgmNarrativesByIntensity,
  type BgmIntensity,
} from '../../shared/types/scenarioRegistry';

function extractBgmIdsFromZoneSeeds(): string[] {
  const zoneSeedsPath = path.resolve(__dirname, '../../server/src/world/zoneSeeds.ts');
  const source = readFileSync(zoneSeedsPath, 'utf8');
  const ids = new Set<string>();
  const pattern = /bgm:\s*'([^']+)'/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(source)) !== null) {
    ids.add(match[1]);
  }
  return [...ids];
}

const ZONE_BGM_IDS = extractBgmIdsFromZoneSeeds();
const VALID_INTENSITIES: readonly BgmIntensity[] = ['calm', 'mystery', 'tension', 'combat', 'climactic'];

describe('SCENARIO_BGM_NARRATIVES', () => {
  test('zoneSeeds 의 모든 bgm id 가 narrative 에 매칭된다', () => {
    expect(ZONE_BGM_IDS.length).toBeGreaterThan(0);
    for (const id of ZONE_BGM_IDS) {
      expect(getBgmNarrative(id), id).toBeDefined();
    }
  });

  test('bgmId 는 중복되지 않는다', () => {
    const ids = SCENARIO_BGM_NARRATIVES.map((b) => b.bgmId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('모든 narrative 는 mood/intent 가 비어 있지 않다', () => {
    for (const n of SCENARIO_BGM_NARRATIVES) {
      expect(n.mood.trim(), n.bgmId).not.toBe('');
      expect(n.intent.trim(), n.bgmId).not.toBe('');
    }
  });

  test('intensity 는 5종 enum 안에 든다', () => {
    for (const n of SCENARIO_BGM_NARRATIVES) {
      expect(VALID_INTENSITIES, n.bgmId).toContain(n.intensity);
    }
  });

  test('listBgmNarrativesByIntensity 는 강도별로 필터된다', () => {
    for (const intensity of VALID_INTENSITIES) {
      const filtered = listBgmNarrativesByIntensity(intensity);
      for (const b of filtered) {
        expect(b.intensity).toBe(intensity);
      }
    }
    const total = VALID_INTENSITIES.reduce(
      (sum, i) => sum + listBgmNarrativesByIntensity(i).length, 0,
    );
    expect(total).toBe(SCENARIO_BGM_NARRATIVES.length);
  });
});
