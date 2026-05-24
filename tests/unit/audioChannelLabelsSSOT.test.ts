/**
 * 유닛 테스트 — SYNC-181: SCENARIO_AUDIO_CHANNEL_LABELS SSOT
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_AUDIO_CHANNEL_LABELS,
  getAudioChannelLabel,
  listAudioChannels,
  type AudioChannelKey,
} from '../../shared/types/scenarioRegistry';

const ALL: readonly AudioChannelKey[] = ['master', 'bgm', 'sfx', 'voice', 'ambient'];

describe('SCENARIO_AUDIO_CHANNEL_LABELS', () => {
  test('5 채널 모두 정의', () => {
    expect(SCENARIO_AUDIO_CHANNEL_LABELS.length).toBe(5);
    for (const c of ALL) {
      expect(getAudioChannelLabel(c), c).toBeDefined();
    }
  });

  test('defaultVolume 은 0~100 범위', () => {
    for (const c of SCENARIO_AUDIO_CHANNEL_LABELS) {
      expect(c.defaultVolume, c.channel).toBeGreaterThanOrEqual(0);
      expect(c.defaultVolume, c.channel).toBeLessThanOrEqual(100);
    }
  });

  test('label/description 비어 있지 않음', () => {
    for (const c of SCENARIO_AUDIO_CHANNEL_LABELS) {
      expect(c.label.trim(), c.channel).not.toBe('');
      expect(c.description.trim(), c.channel).not.toBe('');
    }
  });

  test('channel 중복 없음', () => {
    const cs = SCENARIO_AUDIO_CHANNEL_LABELS.map((c) => c.channel);
    expect(new Set(cs).size).toBe(cs.length);
  });

  test('listAudioChannels 는 5 채널', () => {
    expect(listAudioChannels()).toEqual(ALL);
  });
});
