/**
 * 유닛 테스트 — SSOT-WIRE-06: 월드맵 범례 narration (WorldMapUI)
 *
 * dead code였던 SCENARIO_MAP_LEGEND_ENTRIES 를 월드맵 범례 패널에 연결.
 * 순수 포매팅 helper 가 SSOT icon/label/description 을 단일 출처로 노출한다.
 */
import { describe, expect, test } from 'vitest';

import {
  getMapLegendLines,
  formatLegendLine,
} from '../../client/src/ui/mapLegend';
import {
  SCENARIO_MAP_LEGEND_ENTRIES,
  listMapLegendKinds,
} from '../../shared/types/scenarioRegistry';

describe('SSOT-WIRE-06: 월드맵 범례', () => {
  test('getMapLegendLines — SSOT 7종 전부 SSOT 순서대로 노출', () => {
    const lines = getMapLegendLines();
    expect(lines.length).toBe(7);
    expect(lines.map((l) => l.kind)).toEqual([...listMapLegendKinds()]);
  });

  test('getMapLegendLines — 각 항목이 SSOT icon/label/description 단일 출처', () => {
    const lines = getMapLegendLines();
    for (const line of lines) {
      const ssot = SCENARIO_MAP_LEGEND_ENTRIES.find((e) => e.kind === line.kind)!;
      expect(line.icon, line.kind).toBe(ssot.icon);
      expect(line.label, line.kind).toBe(ssot.label);
      expect(line.description, line.kind).toBe(ssot.description);
    }
  });

  test('formatLegendLine — "{icon} {label}" 형식', () => {
    expect(formatLegendLine('zone_marker')).toBe('◉ 지역 마커');
    expect(formatLegendLine('boss')).toBe('☠ 보스');
    expect(formatLegendLine('danger_zone')).toBe('⚠ 위험 구역');
  });

  test('formatLegendLine — 모든 kind 가 비어있지 않은 라인', () => {
    for (const kind of listMapLegendKinds()) {
      const line = formatLegendLine(kind);
      expect(line.length, kind).toBeGreaterThan(1);
      // icon 으로 시작 (label 만 있지 않음)
      expect(line.includes(' '), kind).toBe(true);
    }
  });

  test('formatLegendLine — 알 수 없는 kind 는 빈 문자열 fallback (UI 안전)', () => {
    // @ts-expect-error 의도적 잘못된 kind
    expect(formatLegendLine('nonexistent')).toBe('');
  });

  test('getMapLegendLines — 순수 함수 (동일 출력)', () => {
    expect(getMapLegendLines()).toEqual(getMapLegendLines());
  });
});
