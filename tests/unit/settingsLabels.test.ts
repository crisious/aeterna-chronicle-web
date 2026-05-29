/**
 * 유닛 테스트 — SSOT-WIRE-04: 설정 항목 라벨 narration (SettingsScene)
 *
 * 게임 로직: SettingsScene 의 설정 항목 라벨을 하드코딩 대신
 * SCENARIO_SETTINGS_DESCRIPTIONS SSOT 의 label 에서 가져온다.
 *
 * 범위: SSOT 와 1:1 매칭되는 4개 항목만 wiring
 *   audio_bgm / audio_sfx / accessibility_subtitle / accessibility_colorblind
 * (master/graphics/fullscreen 은 scene 미노출, language/screenShake 는 SSOT 미정의 → scope 외)
 *
 * 가시 변경: '색약 모드' → '색맹 모드' (SSOT = a11y 시스템 표준 용어로 통일).
 *   AccessibilityManager/Audit/SettingsPanel/CSS 모두 '색맹 모드' 사용 — SettingsScene 만 예외였음.
 */
import { describe, expect, test } from 'vitest';

import { getSettingsLabel } from '../../client/src/settings/settingsLabels';
import {
  getSettingsDescription,
  type SettingsItemKey,
} from '../../shared/types/scenarioRegistry';

/** SettingsScene 이 실제 wiring 하는 4개 SSOT 키 */
const WIRED_KEYS: readonly SettingsItemKey[] = [
  'audio_bgm',
  'audio_sfx',
  'accessibility_subtitle',
  'accessibility_colorblind',
];

describe('SSOT-WIRE-04: 설정 항목 라벨', () => {
  test('getSettingsLabel — SSOT label 단일 출처', () => {
    for (const key of WIRED_KEYS) {
      const ssot = getSettingsDescription(key)!;
      expect(getSettingsLabel(key), key).toBe(ssot.label);
    }
  });

  test('볼륨/자막 3개는 기존 화면 라벨 무가시 보존 (회귀 가드)', () => {
    expect(getSettingsLabel('audio_bgm')).toBe('BGM 볼륨');
    expect(getSettingsLabel('audio_sfx')).toBe('SFX 볼륨');
    expect(getSettingsLabel('accessibility_subtitle')).toBe('자막 크기');
  });

  test('색맹 모드 — a11y 표준 용어로 통일 (가시 변경 명시)', () => {
    // SettingsScene 의 기존 '색약 모드' → SSOT 표준 '색맹 모드'
    expect(getSettingsLabel('accessibility_colorblind')).toBe('색맹 모드');
  });

  test('getSettingsLabel — 모든 wiring 키가 비어있지 않은 라벨', () => {
    for (const key of WIRED_KEYS) {
      expect(getSettingsLabel(key).length, key).toBeGreaterThan(0);
    }
  });

  test('getSettingsLabel — 알 수 없는 키는 빈 문자열 fallback (UI 안전)', () => {
    // @ts-expect-error 의도적 잘못된 키
    expect(getSettingsLabel('nonexistent_key')).toBe('');
  });

  test('순수 함수 — 동일 입력 → 동일 출력', () => {
    expect(getSettingsLabel('audio_bgm')).toBe(getSettingsLabel('audio_bgm'));
    expect(getSettingsLabel('accessibility_colorblind')).toBe(getSettingsLabel('accessibility_colorblind'));
  });
});
