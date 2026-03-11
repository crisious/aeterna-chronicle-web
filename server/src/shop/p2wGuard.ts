/**
 * P2W 가드 — Pay-to-Win 제로 원칙을 코드 레벨에서 강제하는 모듈.
 *
 * 상점 아이템 구매 시 해당 아이템이 캐릭터 전투 스탯에
 * 직접적인 영향을 주는지 검증한다.
 * 위반 시 구매를 거부하고 위반 로그를 남긴다.
 */

// ─── P2W 금지 카테고리/키워드 정의 ───────────────────────────────

/** 허용되는 상점 카테고리 (코스메틱·편의·시즌패스·번들) */
const ALLOWED_CATEGORIES = new Set([
  'cosmetic',
  'convenience',
  'season_pass',
  'bundle',
]);

/** 스탯 직접 영향을 나타내는 금지 키워드 (이름/설명에 포함되면 거부) */
const STAT_KEYWORDS = [
  'attack_boost',
  'defense_boost',
  'hp_boost',
  'mp_boost',
  'damage_increase',
  'stat_upgrade',
  'power_up',
  'exp_multiplier',
  'drop_rate_boost',
  'combat_advantage',
];

// ─── 타입 ────────────────────────────────────────────────────

export interface P2wCheckResult {
  allowed: boolean;
  reason?: string;
}

export interface P2wCheckTarget {
  category: string;
  name: string;
  description?: string | null;
}

// ─── 위반 로그 ──────────────────────────────────────────────

/** P2W 위반 시 서버 로그에 기록 (향후 텔레메트리 연동 가능) */
function logViolation(item: P2wCheckTarget, reason: string): void {
  console.warn(
    `[P2W-GUARD] 위반 감지 — item="${item.name}" category="${item.category}" reason="${reason}"`
  );
}

// ─── 검증 함수 ──────────────────────────────────────────────

/**
 * 아이템이 P2W 제로 원칙을 준수하는지 검증한다.
 * @returns allowed=true 면 구매 가능, false 면 거부 + reason 포함
 */
export function validateP2w(item: P2wCheckTarget): P2wCheckResult {
  // 1) 카테고리 화이트리스트 검증
  if (!ALLOWED_CATEGORIES.has(item.category)) {
    const reason = `허용되지 않는 카테고리: ${item.category}`;
    logViolation(item, reason);
    return { allowed: false, reason };
  }

  // 2) 이름/설명에서 스탯 직접 영향 키워드 탐지
  const searchText = `${item.name} ${item.description ?? ''}`.toLowerCase();
  for (const keyword of STAT_KEYWORDS) {
    if (searchText.includes(keyword)) {
      const reason = `P2W 금지 키워드 감지: ${keyword}`;
      logViolation(item, reason);
      return { allowed: false, reason };
    }
  }

  return { allowed: true };
}
