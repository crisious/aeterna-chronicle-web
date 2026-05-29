/**
 * settingsLabels.ts — 설정 항목 라벨 narration (SSOT wiring)
 *
 * SettingsScene 의 설정 항목 라벨을 하드코딩 대신
 * SCENARIO_SETTINGS_DESCRIPTIONS SSOT 의 label 에서 가져온다.
 *
 * 범위: SSOT 와 1:1 매칭되는 항목만 (audio_bgm/audio_sfx/accessibility_subtitle/accessibility_colorblind).
 * 순수 함수 (Phaser/DOM 비의존) → 단위 테스트 가능.
 */
import { getSettingsDescription, type SettingsItemKey } from '../../../shared/types/scenarioRegistry';

/** SSOT itemKey → label (미정의 시 빈 문자열 fallback) */
export function getSettingsLabel(itemKey: SettingsItemKey): string {
  return getSettingsDescription(itemKey)?.label ?? '';
}
