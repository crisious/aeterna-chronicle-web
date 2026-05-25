/**
 * 유닛 테스트 — SYNC-244: SCENARIO_FRIEND_REQUEST_STATES SSOT
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_FRIEND_REQUEST_STATES,
  getFriendRequestStateNarrative,
  listFriendRequestStates,
  type FriendRequestState,
} from '../../shared/types/scenarioRegistry';

const ALL: readonly FriendRequestState[] = ['pending', 'accepted', 'declined', 'blocked', 'expired'];

describe('SCENARIO_FRIEND_REQUEST_STATES', () => {
  test('5 상태 모두 정의', () => {
    expect(SCENARIO_FRIEND_REQUEST_STATES.length).toBe(5);
    for (const s of ALL) {
      expect(getFriendRequestStateNarrative(s), s).toBeDefined();
    }
  });

  test('pending 만 nextStates 비어있지 않음 (terminal 상태 4종)', () => {
    expect(getFriendRequestStateNarrative('pending')?.nextStates.length).toBeGreaterThan(0);
    for (const s of ['accepted', 'declined', 'blocked', 'expired'] as FriendRequestState[]) {
      expect(getFriendRequestStateNarrative(s)?.nextStates.length, s).toBe(0);
    }
  });

  test('nextStates 는 모두 유효 state', () => {
    const valid = new Set(ALL);
    for (const s of SCENARIO_FRIEND_REQUEST_STATES) {
      for (const n of s.nextStates) {
        expect(valid.has(n), `${s.state}->${n}`).toBe(true);
      }
    }
  });

  test('uiColor 는 #rrggbb 형식', () => {
    const hex = /^#[0-9a-fA-F]{6}$/;
    for (const s of SCENARIO_FRIEND_REQUEST_STATES) {
      expect(hex.test(s.uiColor), `${s.state}:${s.uiColor}`).toBe(true);
    }
  });

  test('state 중복 없음', () => {
    const ks = SCENARIO_FRIEND_REQUEST_STATES.map((s) => s.state);
    expect(new Set(ks).size).toBe(ks.length);
  });
});
