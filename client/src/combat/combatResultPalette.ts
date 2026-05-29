/**
 * combatResultPalette.ts — 전투 결과 popup 색상 narration (SSOT wiring)
 *
 * BattleScene 의 popup 색상을 하드코딩 hex 대신
 * SCENARIO_COMBAT_RESULT_LABELS SSOT 의 popupColor 에서 가져온다.
 *
 * 방향(사용자 결정): SSOT 를 화면 실측값에 맞춰 정정한 뒤 단일 출처로 wiring.
 * → 정정 후 화면 색상은 기존과 동일(무가시 변경), 출처만 SSOT 로 단일화.
 *
 * 순수 모듈 (Phaser/DOM 비의존) → 단위 테스트 가능.
 */
import { getCombatResultLabel, type CombatResultKind } from '../../../shared/types/scenarioRegistry';

/**
 * BattleScene popup 의 화면 실측 색 (SSOT 정정의 기준이자 자기검증 상수).
 * SSOT popupColor 와 일치해야 한다 — combatResultPalette.test.ts 가 강제.
 */
export const COMBAT_POPUP_SCREEN_COLORS: Partial<Record<CombatResultKind, string>> = {
  hit: '#ffffff',
  miss: '#aaaaaa',
  crit: '#ffcc00',
  reflect: '#88ccff',
  combo: '#ffaa44',
  crit_echo: '#cc88ff',
};

/** 안전 fallback (SSOT 미정의 kind — 이론상 도달 불가) */
const FALLBACK_COLOR = '#ffffff';

/** 전투 결과 kind → popup 색 (SSOT popupColor 단일 출처) */
export function getCombatPopupColor(kind: CombatResultKind): string {
  return getCombatResultLabel(kind)?.popupColor ?? FALLBACK_COLOR;
}
