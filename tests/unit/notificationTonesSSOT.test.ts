/**
 * 유닛 테스트 — SYNC-133: SCENARIO_NOTIFICATION_TONE_NARRATIVES SSOT
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_NOTIFICATION_TONE_NARRATIVES,
  getNotificationToneNarrative,
  listNotificationTones,
  type NotificationTone,
} from '../../shared/types/scenarioRegistry';

const ALL: readonly NotificationTone[] = ['info', 'success', 'warning', 'error'];

describe('SCENARIO_NOTIFICATION_TONE_NARRATIVES', () => {
  test('4 톤 모두 정의', () => {
    expect(SCENARIO_NOTIFICATION_TONE_NARRATIVES.length).toBe(4);
    for (const t of ALL) {
      expect(getNotificationToneNarrative(t), t).toBeDefined();
    }
  });

  test('ariaLive 는 polite 또는 assertive', () => {
    for (const t of SCENARIO_NOTIFICATION_TONE_NARRATIVES) {
      expect(['polite', 'assertive'], t.tone).toContain(t.ariaLive);
    }
  });

  test('error 톤은 assertive', () => {
    expect(getNotificationToneNarrative('error')?.ariaLive).toBe('assertive');
  });

  test('uiColor 는 #rrggbb 형식', () => {
    const hex = /^#[0-9a-fA-F]{6}$/;
    for (const t of SCENARIO_NOTIFICATION_TONE_NARRATIVES) {
      expect(hex.test(t.uiColor), `${t.tone}:${t.uiColor}`).toBe(true);
    }
  });

  test('label/intent 비어 있지 않음', () => {
    for (const t of SCENARIO_NOTIFICATION_TONE_NARRATIVES) {
      expect(t.label.trim(), t.tone).not.toBe('');
      expect(t.intent.trim(), t.tone).not.toBe('');
    }
  });

  test('listNotificationTones 는 4 톤 반환', () => {
    expect(listNotificationTones()).toEqual(ALL);
  });
});
