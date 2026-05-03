// ─── 분기 데이터 클라이언트 미러 (D-S3) ────────────────────────
//
// server/src/skill/skillBranches.ts 의 SKILL_BRANCH_GROUPS 미러.
// SkillTreeUI 등 클라 표시용 정적 lookup.
//
// 동기화: design-consistency 회귀 테스트가 server ↔ client mirror 일치 검증.

export const BRANCH_GROUPS_MIRROR: Record<string, ReadonlyArray<string>> = {
  ether_knight_t2_style: [
    'ek_ether_explode_sword',
    'ek_combo_strike',
    'ek_ether_absorb',
  ],
  memory_weaver_t2_style: [
    'mw_memory_storm',
    'mw_time_stop',
    'mw_mind_control',
  ],
  shadow_weaver_t2_style: [
    'sw_shadow_explosion',
    'sw_assassinate',
    'sw_curse',
  ],
  memory_breaker_t2_rage: [
    'mb_shatter_rush',
    'mb_frenzy_strike',
  ],
  time_guardian_t2_flow: [
    'tg_time_heal',
    'tg_time_explosion',
    'tg_time_prison',
  ],
  void_wanderer_t2_dimension: [
    'vw_dimension_leap',
    'vw_void_hand',
    'vw_void_eye',
  ],
};

const _skillToGroup: Map<string, string> = (() => {
  const m = new Map<string, string>();
  for (const [g, codes] of Object.entries(BRANCH_GROUPS_MIRROR)) {
    for (const c of codes) m.set(c, g);
  }
  return m;
})();

export function getBranchGroupClient(skillCode: string): string | null {
  return _skillToGroup.get(skillCode) ?? null;
}

export function getBranchSiblingsClient(skillCode: string): ReadonlyArray<string> {
  const g = getBranchGroupClient(skillCode);
  if (!g) return [];
  return (BRANCH_GROUPS_MIRROR[g] ?? []).filter((c) => c !== skillCode);
}

/** group ID → 사람이 읽기 좋은 라벨 */
export function formatBranchLabel(groupId: string): string {
  const labels: Record<string, string> = {
    ether_knight_t2_style: '에테르 기사 — 전투 스타일 (3중 택 1)',
    memory_weaver_t2_style: '기억술사 — 운용 (3중 택 1)',
    shadow_weaver_t2_style: '그림자 직조사 — 처형 (3중 택 1)',
    memory_breaker_t2_rage: '기억 파괴자 — 분노 (2중 택 1)',
    time_guardian_t2_flow: '시간 수호자 — 흐름 (3중 택 1)',
    void_wanderer_t2_dimension: '허공의 방랑자 — 차원 (3중 택 1)',
  };
  return labels[groupId] ?? groupId;
}
