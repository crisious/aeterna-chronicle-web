// ─── 클라이언트용 PASSIVE_SCALING 미러 ──────────────────────────
// 서버 PASSIVE_SCALING.damageBonus 와 동일 테이블. 클라가 표시용으로 같은 식 사용.
// 서버 변경 시 동기화 책임 — 단순한 매핑이라 drift 위험 낮음.

const PASSIVE_LEVEL_VALUE_BONUS: Record<number, number> = {
  1: 0,
  2: 8,
  3: 18,
  4: 30,
  5: 45,
};

/**
 * raw value 를 skillLevel 에 맞게 scaling 한 floor 결과.
 * 서버 passiveResolver.scalePassiveValue 와 동일 식.
 */
export function scalePassiveLevel(rawValue: number, skillLevel: number): number {
  const clamped = Math.max(1, Math.min(5, skillLevel));
  const bonus = PASSIVE_LEVEL_VALUE_BONUS[clamped] ?? 0;
  return Math.floor(rawValue * (1 + bonus / 100));
}
