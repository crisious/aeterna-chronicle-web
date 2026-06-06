/**
 * actionRateLimiter.ts — 행위자(userId) 단위 게임 액션 호출빈도 제한  [SECURITY]
 *
 * 배경: 전투 damage 를 서버가 산정해도(#246/#247), damage 이벤트를 빠르게 반복 호출하면 의도 DPS 를
 * 초과할 수 있다(적대검증이 매 배치 지적: "클램프/산정은 반복호출로 우회 가능"). HTTP 는 IP 기반
 * rateLimiter(security/rateLimiter.ts)가 있으나 소켓 이벤트엔 적용되지 않는다.
 *
 * 이 모듈은 `userId:action` 키로 슬라이딩 윈도우를 적용해 1인당 호출빈도를 제한한다(Redis Sorted Set +
 * 인메모리 폴백, Redis 장애 시 fail-open=가용성 우선). VALUE 권위화와 합쳐져 총 DPS 를 묶는다.
 */
import { redisClient, redisConnected } from '../redis';

/** 전투 damage 류 액션의 기본 프로필: 초당 10회(빠른 정상 플레이 허용, 스팸 차단). */
export const DAMAGE_ACTION_PROFILE = { windowSec: 1, maxPerWindow: 10 } as const;

const memStore = new Map<string, number[]>();
let seq = 0;

// 인메모리 버킷 정리 (2분 초과 타임스탬프 제거). unref 로 프로세스 종료를 막지 않는다.
const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [k, arr] of memStore) {
    const filtered = arr.filter((t) => now - t < 120_000);
    if (filtered.length === 0) memStore.delete(k);
    else memStore.set(k, filtered);
  }
}, 60_000);
cleanupTimer.unref?.();

/**
 * userId 의 action 이 windowSec 내 maxPerWindow 를 초과하지 않으면 true(허용), 초과 시 false(거부).
 * 호출마다 1회를 기록한다. Redis 미연결/장애 시 인메모리 폴백 또는 통과(가용성 우선).
 */
export async function allowAction(
  userId: string,
  action: string,
  windowSec: number,
  maxPerWindow: number,
): Promise<boolean> {
  if (!userId) return false;
  const key = `arl:${action}:${userId}`;
  const now = Date.now();
  const windowMs = windowSec * 1000;
  let count: number;

  if (redisConnected()) {
    try {
      const multi = redisClient.multi();
      multi.zRemRangeByScore(key, 0, now - windowMs);
      multi.zAdd(key, { score: now, value: `${now}:${seq++}` });
      multi.zCard(key);
      multi.expire(key, windowSec + 1);
      const results = await multi.exec();
      count = (results?.[2] as number) ?? 1;
    } catch {
      return true; // Redis 장애 시 통과(가용성 우선)
    }
  } else {
    const arr = (memStore.get(key) ?? []).filter((t) => now - t < windowMs);
    arr.push(now);
    memStore.set(key, arr);
    count = arr.length;
  }

  return count <= maxPerWindow;
}
