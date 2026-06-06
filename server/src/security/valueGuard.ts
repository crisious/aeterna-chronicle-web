/**
 * valueGuard.ts — 클라가 보낸 수치값(damage/exp/score 등)을 신뢰하기 전 위생처리  [SECURITY]
 *
 * 배경: 소켓/HTTP 핸들러가 클라 damage 를 그대로 보스 HP·거점 HP 에서 차감하거나 exp 에 적립해,
 * NaN/Infinity(HP 오염 DoS·즉시 클리어)·음수(HP 회복 악용)·초대형(1회 솔로 처치) 같은 위조가 가능했다.
 *
 * 풀 서버권위(공격자 스탯×방어 산정)는 전투엔진 통합이 필요한 feature 작업이라, 그 전까지의 즉시 방어선:
 *   - 비유한(NaN/Infinity)·비숫자 → null(거부)
 *   - 음수 → null(거부)
 *   - 상한(maxPerHit) 클램프 → 1회 호출이 대상을 통째로 깎지 못하게
 * 호출빈도 제한/세션 누적상한/서버 산정은 후속 과제(SECURITY-TODO)로 남는다.
 */

/**
 * 클라 수치값을 [0, maxPerHit] 범위의 유한 양수로 위생처리한다.
 * 비유한/비숫자/음수면 null(호출자가 거부 처리). 정상이면 maxPerHit 로 클램프한 값.
 */
export function clampValue(value: unknown, maxPerHit: number): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return null;
  if (!Number.isFinite(maxPerHit) || maxPerHit < 0) return null;
  return Math.min(value, maxPerHit);
}
