// ─── 스킬 트리 분기 (D-S1) ─────────────────────────────────────
//
// 현재 prerequisite 시스템은 **선형** — 모든 prereq 만족 시 해금.
// 분기 시스템은 같은 group 내 **mutual exclusion** — 그 중 하나만 선택.
//
// 예: 에테르 기사 tier 2 의 "전직 분기" — Sword Mastery / Shield Mastery / Magic Mastery
//   같은 group 의 다른 skill 이 이미 해금됐으면 신규 해금 거부.
//
// 본 모듈은 in-memory map 으로 정의 — DB schema 변경 없이 동작.
// skillEngine.unlockSkill 에서 검증 호출.
//
// 향후 확장: schema.prisma 의 Skill 모델에 branchGroup 컬럼 추가하여
// SSOT 통합. 현 시점에는 in-memory 정의로 충분.

/**
 * branchGroup → 그 그룹에 속한 skill code 들 (mutually exclusive).
 *
 * 디자인 원칙:
 *   - 같은 그룹은 같은 클래스 + 같은 tier 여야 의미 있음
 *   - 한 skill 은 최대 1 그룹에 속함 (현 모델)
 *   - 그룹 명: '<class>_t<tier>_<concept>'
 */
export const SKILL_BRANCH_GROUPS: Record<string, ReadonlyArray<string>> = {
  // ── 에테르 기사 tier 2 — 마스터리 분기 (3 중 택 1) ────────
  ether_knight_t2_mastery: [
    'ek_sword_mastery',
    'ek_shield_mastery',
    'ek_magic_mastery',
  ],

  // ── 기억술사 tier 2 — 학파 분기 (3 중 택 1) ───────────────
  memory_weaver_t2_school: [
    'mw_chrono_school',
    'mw_arcane_school',
    'mw_void_school',
  ],

  // ── 그림자 직조사 tier 2 — 무기 분기 (3 중 택 1) ──────────
  shadow_weaver_t2_weapon: [
    'sw_dagger_path',
    'sw_bow_path',
    'sw_chakram_path',
  ],

  // ── 기억 파괴자 tier 2 — 분노 분기 (2 중 택 1) ────────────
  memory_breaker_t2_rage: [
    'mb_berserker_path',
    'mb_destroyer_path',
  ],

  // ── 시간 수호자 tier 2 — 흐름 분기 (3 중 택 1) ────────────
  time_guardian_t2_flow: [
    'tg_chrono_path',
    'tg_pause_path',
    'tg_loop_path',
  ],

  // ── 허공의 방랑자 tier 2 — 차원 분기 (3 중 택 1) ──────────
  void_wanderer_t2_dimension: [
    'vw_warp_path',
    'vw_void_path',
    'vw_phase_path',
  ],
};

/** skill code → branchGroup (역방향 lookup, 자동 생성) */
const _skillToBranchGroup: Map<string, string> = (() => {
  const m = new Map<string, string>();
  for (const [group, codes] of Object.entries(SKILL_BRANCH_GROUPS)) {
    for (const c of codes) m.set(c, group);
  }
  return m;
})();

// ─── 공개 API ──────────────────────────────────────────────────

/**
 * skill code 가 속한 branchGroup 반환. 분기 외 skill 이면 null.
 */
export function getBranchGroup(skillCode: string): string | null {
  return _skillToBranchGroup.get(skillCode) ?? null;
}

/**
 * 같은 branchGroup 의 다른 skill code 들 반환 (자기 자신 제외).
 * 분기 외 skill 이면 빈 배열.
 */
export function getSiblingBranchSkills(skillCode: string): ReadonlyArray<string> {
  const group = getBranchGroup(skillCode);
  if (!group) return [];
  const siblings = SKILL_BRANCH_GROUPS[group] ?? [];
  return siblings.filter((c) => c !== skillCode);
}

/**
 * 두 skill code 가 같은 분기 그룹에 속하는지.
 * 같은 그룹이면 mutually exclusive — 한 쪽 unlock 됐으면 다른 쪽 불가.
 */
export function isMutuallyExclusive(skillCodeA: string, skillCodeB: string): boolean {
  if (skillCodeA === skillCodeB) return false;
  const groupA = getBranchGroup(skillCodeA);
  if (!groupA) return false;
  return groupA === getBranchGroup(skillCodeB);
}

/** 모든 분기 그룹 ID 목록 (테스트 / UI용) */
export function listBranchGroups(): string[] {
  return Object.keys(SKILL_BRANCH_GROUPS);
}
