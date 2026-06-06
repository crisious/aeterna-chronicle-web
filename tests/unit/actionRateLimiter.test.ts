/**
 * 유닛 테스트 — SECURITY: actionRateLimiter (행위자 단위 호출빈도 제한)
 *
 * 전투 damage 류 이벤트의 반복호출(시간축 DPS 남용)을 userId+action 슬라이딩 윈도우로 제한.
 * (테스트 환경은 Redis 미연결 → 인메모리 폴백 경로. windowSec 를 크게 잡아 동일 윈도우에서 카운트)
 */
import { describe, expect, test } from 'vitest';
import { allowAction, DAMAGE_ACTION_PROFILE } from '../../server/src/security/actionRateLimiter';

describe('SECURITY: actionRateLimiter', () => {
  test('윈도우 내 maxPerWindow 까지 허용, 초과 시 거부', async () => {
    const u = 'rl-user-1';
    expect(await allowAction(u, 'test:a', 60, 3)).toBe(true);
    expect(await allowAction(u, 'test:a', 60, 3)).toBe(true);
    expect(await allowAction(u, 'test:a', 60, 3)).toBe(true);
    expect(await allowAction(u, 'test:a', 60, 3)).toBe(false); // 4번째 초과
  });

  test('userId·action 별 독립 카운트', async () => {
    expect(await allowAction('u-a', 'test:b', 60, 1)).toBe(true);
    expect(await allowAction('u-a', 'test:b', 60, 1)).toBe(false); // u-a 의 2번째
    expect(await allowAction('u-b', 'test:b', 60, 1)).toBe(true);  // 다른 유저는 독립
    expect(await allowAction('u-a', 'test:c', 60, 1)).toBe(true);  // 다른 액션은 독립
  });

  test('빈 userId 는 거부', async () => {
    expect(await allowAction('', 'test:x', 60, 10)).toBe(false);
  });

  test('DAMAGE_ACTION_PROFILE 노출(초당 10회)', () => {
    expect(DAMAGE_ACTION_PROFILE.windowSec).toBe(1);
    expect(DAMAGE_ACTION_PROFILE.maxPerWindow).toBe(10);
  });
});
