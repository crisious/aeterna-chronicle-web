/**
 * 유닛 테스트 — SYNC-212: SCENARIO_FRIEND_STATUS_LABELS SSOT
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_FRIEND_STATUS_LABELS,
  getFriendStatusNarrative,
  listFriendStatuses,
  type FriendStatus,
} from '../../shared/types/scenarioRegistry';

const ALL: readonly FriendStatus[] = ['online', 'away', 'in_game', 'offline'];

describe('SCENARIO_FRIEND_STATUS_LABELS', () => {
  test('4 상태 모두 정의', () => {
    expect(SCENARIO_FRIEND_STATUS_LABELS.length).toBe(4);
    for (const s of ALL) {
      expect(getFriendStatusNarrative(s), s).toBeDefined();
    }
  });

  test('indicatorColor 는 #rrggbb 형식', () => {
    const hex = /^#[0-9a-fA-F]{6}$/;
    for (const s of SCENARIO_FRIEND_STATUS_LABELS) {
      expect(hex.test(s.indicatorColor), `${s.status}:${s.indicatorColor}`).toBe(true);
    }
  });

  test('online/away 만 canInteract true', () => {
    expect(getFriendStatusNarrative('online')?.canInteract).toBe(true);
    expect(getFriendStatusNarrative('away')?.canInteract).toBe(true);
    expect(getFriendStatusNarrative('in_game')?.canInteract).toBe(false);
    expect(getFriendStatusNarrative('offline')?.canInteract).toBe(false);
  });

  test('label/displayMessage 비어 있지 않음', () => {
    for (const s of SCENARIO_FRIEND_STATUS_LABELS) {
      expect(s.label.trim(), s.status).not.toBe('');
      expect(s.displayMessage.trim(), s.status).not.toBe('');
    }
  });

  test('status 중복 없음', () => {
    const ss = SCENARIO_FRIEND_STATUS_LABELS.map((s) => s.status);
    expect(new Set(ss).size).toBe(ss.length);
  });
});
