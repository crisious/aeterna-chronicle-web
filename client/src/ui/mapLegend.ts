/**
 * mapLegend.ts — 월드맵 범례 narration (SSOT wiring)
 *
 * WorldMapUI 범례 패널이 SCENARIO_MAP_LEGEND_ENTRIES SSOT 의
 * icon/label/description 을 단일 출처로 표시하도록 포매팅한다.
 *
 * 순수 모듈 (Phaser/DOM 비의존) → 단위 테스트 가능.
 */
import {
  getMapLegendEntry,
  listMapLegendKinds,
  type MapLegendKind,
  type MapLegendEntry,
} from '../../../shared/types/scenarioRegistry';

/** 범례 표시용 한 줄 데이터 (SSOT 순서 유지) */
export function getMapLegendLines(): readonly MapLegendEntry[] {
  return listMapLegendKinds()
    .map((kind) => getMapLegendEntry(kind))
    .filter((e): e is MapLegendEntry => e !== undefined);
}

/** kind → "{icon} {label}" 한 줄 (미정의 시 빈 문자열 fallback) */
export function formatLegendLine(kind: MapLegendKind): string {
  const entry = getMapLegendEntry(kind);
  if (!entry) {
    return '';
  }
  return `${entry.icon} ${entry.label}`;
}
