/**
 * 유닛 테스트 — SSOT-WIRE-03: 전투 결과 popup 색상 narration (BattleScene)
 *
 * 게임 로직: BattleScene 의 popup 색상을 하드코딩 hex 대신
 * SCENARIO_COMBAT_RESULT_LABELS SSOT 의 popupColor 에서 가져온다.
 *
 * 방향(사용자 결정): SSOT 를 화면 실측값에 맞춰 정정한 뒤 단일 출처로 wiring.
 * → 정정 후 화면 색상은 기존과 동일(무가시 변경), 단 출처가 SSOT 로 단일화.
 *
 * 화면 실측값(BattleScene 하드코딩 당시):
 *   miss=#aaaaaa, crit=#ffcc00, reflect=#88ccff, combo=#ffaa44, crit_echo=#cc88ff, hit=#ffffff
 */
import { describe, expect, test } from 'vitest';

import {
  getCombatPopupColor,
  COMBAT_POPUP_SCREEN_COLORS,
} from '../../client/src/combat/combatResultPalette';
import {
  getCombatResultLabel,
  type CombatResultKind,
} from '../../shared/types/scenarioRegistry';

/** wiring 전 BattleScene 하드코딩 색상 (무가시 보존 대상) */
const LEGACY_COLORS: Partial<Record<CombatResultKind, string>> = {
  miss: '#aaaaaa',
  crit: '#ffcc00',
  reflect: '#88ccff',
  combo: '#ffaa44',
  crit_echo: '#cc88ff',
  hit: '#ffffff',
};

describe('SSOT-WIRE-03: 전투 결과 popup 색상', () => {
  test('SSOT popupColor 가 화면 실측값으로 정정되었다 (회귀 가드)', () => {
    for (const [kind, color] of Object.entries(LEGACY_COLORS)) {
      const ssot = getCombatResultLabel(kind as CombatResultKind);
      expect(ssot, kind).toBeDefined();
      expect(ssot!.popupColor.toLowerCase(), kind).toBe(color);
    }
  });

  test('getCombatPopupColor — SSOT popupColor 단일 출처', () => {
    const ALL: readonly CombatResultKind[] = ['hit', 'miss', 'crit', 'reflect', 'evade', 'combo', 'crit_echo'];
    for (const kind of ALL) {
      const ssot = getCombatResultLabel(kind)!;
      expect(getCombatPopupColor(kind), kind).toBe(ssot.popupColor);
    }
  });

  test('getCombatPopupColor — 화면 실측 색을 그대로 반환 (무가시 보존)', () => {
    for (const [kind, color] of Object.entries(LEGACY_COLORS)) {
      expect(getCombatPopupColor(kind as CombatResultKind).toLowerCase(), kind).toBe(color);
    }
  });

  test('COMBAT_POPUP_SCREEN_COLORS — 실측 상수가 SSOT 와 일치 (정정 자기검증)', () => {
    for (const [kind, color] of Object.entries(COMBAT_POPUP_SCREEN_COLORS)) {
      const ssot = getCombatResultLabel(kind as CombatResultKind)!;
      expect(ssot.popupColor.toLowerCase(), kind).toBe(color.toLowerCase());
    }
  });

  test('getCombatPopupColor — 모든 색은 유효 hex', () => {
    const ALL: readonly CombatResultKind[] = ['hit', 'miss', 'crit', 'reflect', 'evade', 'combo', 'crit_echo'];
    for (const kind of ALL) {
      expect(getCombatPopupColor(kind), kind).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });

  test('순수 함수 — 동일 입력 → 동일 출력', () => {
    expect(getCombatPopupColor('crit')).toBe(getCombatPopupColor('crit'));
    expect(getCombatPopupColor('miss')).toBe(getCombatPopupColor('miss'));
  });
});
