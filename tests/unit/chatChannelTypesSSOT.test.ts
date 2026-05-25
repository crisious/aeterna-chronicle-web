/**
 * 유닛 테스트 — SYNC-239: SCENARIO_CHAT_CHANNEL_TYPES SSOT
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_CHAT_CHANNEL_TYPES,
  getChatChannelTypeNarrative,
  listChatChannelTypes,
  type ChatChannelType,
} from '../../shared/types/scenarioRegistry';

const ALL: readonly ChatChannelType[] = ['zone', 'party', 'guild', 'whisper', 'system'];

describe('SCENARIO_CHAT_CHANNEL_TYPES', () => {
  test('5 채널 모두 정의', () => {
    expect(SCENARIO_CHAT_CHANNEL_TYPES.length).toBe(5);
    for (const c of ALL) {
      expect(getChatChannelTypeNarrative(c), c).toBeDefined();
    }
  });

  test('system 만 commandPrefix 빈 문자열 (플레이어 사용 불가)', () => {
    expect(getChatChannelTypeNarrative('system')?.commandPrefix).toBe('');
    for (const c of SCENARIO_CHAT_CHANNEL_TYPES) {
      if (c.channel !== 'system') {
        expect(c.commandPrefix.startsWith('/'), c.channel).toBe(true);
      }
    }
  });

  test('uiColor 는 #rrggbb 형식', () => {
    const hex = /^#[0-9a-fA-F]{6}$/;
    for (const c of SCENARIO_CHAT_CHANNEL_TYPES) {
      expect(hex.test(c.uiColor), `${c.channel}:${c.uiColor}`).toBe(true);
    }
  });

  test('label/reachHint 비어 있지 않음', () => {
    for (const c of SCENARIO_CHAT_CHANNEL_TYPES) {
      expect(c.label.trim(), c.channel).not.toBe('');
      expect(c.reachHint.trim(), c.channel).not.toBe('');
    }
  });

  test('channel 중복 없음', () => {
    const cs = SCENARIO_CHAT_CHANNEL_TYPES.map((c) => c.channel);
    expect(new Set(cs).size).toBe(cs.length);
  });
});
