// ─── 콤보 데이터 클라이언트 미러 (E-S3) ────────────────────────
//
// server/src/combat/comboManager.ts 의 COMBO_DEFINITIONS 미러.
// SkillTreeUI 등 클라이언트 표시용으로 정적 lookup 제공.
//
// 동기화: design-consistency 회귀 테스트가 서버 ↔ 클라 미러 일치 검증.
// 데이터 변경 시 양쪽 동시 업데이트 필수.

export interface ComboMirror {
  id: string;
  name: string;
  description: string;
  classId: string;
  /** 콤보 시작 트리거 skill code (sequence[0]) */
  triggerSkillCode: string;
  /** 전체 sequence (skill code 들) */
  sequence: ReadonlyArray<string>;
  /** 데미지 보너스 (%) */
  damageBonus: number;
  /** 추가 효과 한 줄 설명 */
  bonusDescription: string;
}

/**
 * 30 콤보의 최소 미러. 상세 정보는 서버 API (`/combat/combos/:classId`) 로 조회 가능.
 * 본 미러는 "어떤 skill 이 어떤 콤보의 일부인지" 빠른 lookup 용.
 */
export const COMBO_MIRROR: ReadonlyArray<ComboMirror> = [
  // ek (5)
  { id: 'ek_stun_combo', name: '전격 강타', description: '돌진 → 에테르 슬래시 → 방패 강타', classId: 'ether_knight', triggerSkillCode: 'ek_charge', sequence: ['ek_charge', 'ek_ether_slash', 'ek_shield_bash'], damageBonus: 40, bonusDescription: '확정 기절 + 데미지 40%' },
  { id: 'ek_shield_wall', name: '철벽 방어', description: '에테르 가드 → 도발 → 전투 함성', classId: 'ether_knight', triggerSkillCode: 'ek_ether_guard', sequence: ['ek_ether_guard', 'ek_taunt', 'ek_war_cry'], damageBonus: 0, bonusDescription: '파티 방어력 +30% (10초)' },
  { id: 'ek_ether_burst', name: '에테르 폭쇄', description: '에테르 슬래시 → 연속 타격 → 에테르 폭발검', classId: 'ether_knight', triggerSkillCode: 'ek_ether_slash', sequence: ['ek_ether_slash', 'ek_combo_strike', 'ek_ether_explode_sword'], damageBonus: 50, bonusDescription: '광역 데미지 +50%' },
  { id: 'ek_thunder_combo', name: '뇌격 연쇄', description: '뇌격 → 번개 강타 → 천둥 도약', classId: 'ether_knight', triggerSkillCode: 'ek_thunder_strike', sequence: ['ek_thunder_strike', 'ek_lightning_smash', 'ek_thunder_leap'], damageBonus: 35, bonusDescription: '광역 마비' },
  { id: 'ek_divine_strike', name: '신성 일격', description: '에테르 무장 → 광역 도발 → 신성 심판', classId: 'ether_knight', triggerSkillCode: 'ek_ether_armament', sequence: ['ek_ether_armament', 'ek_aoe_taunt', 'ek_divine_judgment'], damageBonus: 60, bonusDescription: '신성 데미지 60% 증가' },
  // mw (5)
  { id: 'mw_freeze_combo', name: '동결 연쇄', description: '시간 동결 → 기억 화살 → 크로노스피어', classId: 'memory_weaver', triggerSkillCode: 'mw_time_freeze', sequence: ['mw_time_freeze', 'mw_memory_bolt', 'mw_chronosphere'], damageBonus: 50, bonusDescription: '광역 동결 + 데미지 50%' },
  { id: 'mw_silence_combo', name: '침묵 봉인', description: '기억 화살 → 정신 지배 → 영원의 직조', classId: 'memory_weaver', triggerSkillCode: 'mw_memory_bolt', sequence: ['mw_memory_bolt', 'mw_mind_control', 'mw_eternity_weave'], damageBonus: 40, bonusDescription: '단일 침묵 영구화' },
  { id: 'mw_time_loop', name: '시간 순환', description: '시간 정지 → 시간 역행 → 크로노스피어', classId: 'memory_weaver', triggerSkillCode: 'mw_time_stop', sequence: ['mw_time_stop', 'mw_time_reversal', 'mw_chronosphere'], damageBonus: 30, bonusDescription: '쿨다운 50% 즉시 회복' },
  { id: 'mw_ether_annihilation', name: '에테르 멸절', description: '에테르 레인 → 마력 폭발 → 영원의 직조', classId: 'memory_weaver', triggerSkillCode: 'mw_ether_rain', sequence: ['mw_ether_rain', 'mw_mana_burst', 'mw_eternity_weave'], damageBonus: 70, bonusDescription: '광역 멸절 +70%' },
  { id: 'mw_mind_shatter', name: '정신 파괴', description: '기억 폭풍 → 기억 연쇄 → 정신 지배', classId: 'memory_weaver', triggerSkillCode: 'mw_memory_storm', sequence: ['mw_memory_storm', 'mw_memory_chain', 'mw_mind_control'], damageBonus: 45, bonusDescription: '광역 침묵 + 데미지 45%' },
  // sw (5)
  { id: 'sw_assassin_combo', name: '암살자', description: '그림자 습격 → 독날 → 암살', classId: 'shadow_weaver', triggerSkillCode: 'sw_shadow_strike', sequence: ['sw_shadow_strike', 'sw_poison_blade', 'sw_assassinate'], damageBonus: 80, bonusDescription: '단일 처형 데미지 +80%' },
  { id: 'sw_shadow_storm', name: '그림자 폭풍', description: '그림자 분신 → 그림자 춤 → 그림자 폭발', classId: 'shadow_weaver', triggerSkillCode: 'sw_shadow_clone', sequence: ['sw_shadow_clone', 'sw_shadow_dance', 'sw_shadow_explosion'], damageBonus: 55, bonusDescription: '광역 + 분신 + 데미지 55%' },
  { id: 'sw_venom_rain', name: '독 비', description: '맹독 → 독 구름 → 독날', classId: 'shadow_weaver', triggerSkillCode: 'sw_deadly_poison', sequence: ['sw_deadly_poison', 'sw_poison_cloud', 'sw_poison_blade'], damageBonus: 0, bonusDescription: '독 5중첩 + dot 강화' },
  { id: 'sw_reaper_chain', name: '사신 연쇄', description: '저주 → 소멸 → 공허 처형', classId: 'shadow_weaver', triggerSkillCode: 'sw_curse', sequence: ['sw_curse', 'sw_vanish', 'sw_void_execution'], damageBonus: 45, bonusDescription: '저주 처형 +45%' },
  { id: 'sw_phantom_bind', name: '환영 속박', description: '연막 → 그림자 속박 → 함정', classId: 'shadow_weaver', triggerSkillCode: 'sw_smoke_bomb', sequence: ['sw_smoke_bomb', 'sw_shadow_bind', 'sw_trap'], damageBonus: 30, bonusDescription: '실명 + 이동 불가 + 감속' },
  // mb (5) — E-S1
  { id: 'mb_shatter_storm_combo', name: '파쇄 폭풍', description: '기억 파쇄 → 광역 파동 → 파쇄 폭풍', classId: 'memory_breaker', triggerSkillCode: 'mb_memory_shatter', sequence: ['mb_memory_shatter', 'mb_wide_wave', 'mb_shatter_storm'], damageBonus: 45, bonusDescription: '광역 침묵 + 데미지 45%' },
  { id: 'mb_rage_burst', name: '광폭 폭주', description: '분노 폭주 → 분노의 쇄도 → 광란의 일격', classId: 'memory_breaker', triggerSkillCode: 'mb_rage_rampage', sequence: ['mb_rage_rampage', 'mb_rage_surge', 'mb_frenzy_strike'], damageBonus: 60, bonusDescription: '자가 ATK +100% (10초)' },
  { id: 'mb_memory_drain_chain', name: '기억 약탈', description: '기억 흡수: 공격 → 방어 → 약탈', classId: 'memory_breaker', triggerSkillCode: 'mb_memory_drain_atk', sequence: ['mb_memory_drain_atk', 'mb_memory_drain_def', 'mb_memory_plunder'], damageBonus: 30, bonusDescription: '데미지의 50% HP+MP 흡수' },
  { id: 'mb_destruction_finale', name: '파괴 종결', description: '연쇄 파쇄 → 최종 파괴 → 기억 심판', classId: 'memory_breaker', triggerSkillCode: 'mb_chain_shatter', sequence: ['mb_chain_shatter', 'mb_final_destruction', 'mb_memory_judgment'], damageBonus: 80, bonusDescription: 'HP 30% 이하 처형 +80%' },
  { id: 'mb_ground_quake', name: '대지 진동', description: '대지 분쇄 → 파쇄 도약 → 대파쇄', classId: 'memory_breaker', triggerSkillCode: 'mb_ground_smash', sequence: ['mb_ground_smash', 'mb_shatter_leap', 'mb_great_shatter'], damageBonus: 50, bonusDescription: '광역 출혈 + 데미지 50%' },
  // tg (5) — E-S1
  { id: 'tg_time_lock', name: '시간 봉인', description: '시간 정지 → 감속 필드 → 시간 폭발', classId: 'time_guardian', triggerSkillCode: 'tg_time_stop', sequence: ['tg_time_stop', 'tg_slow_field', 'tg_time_explosion'], damageBonus: 50, bonusDescription: '광역 동결 + 데미지 50%' },
  { id: 'tg_rewind_chain', name: '시간 역행', description: '되감기 → 시간 치유 → 시간 도약', classId: 'time_guardian', triggerSkillCode: 'tg_rewind', sequence: ['tg_rewind', 'tg_time_heal', 'tg_time_leap'], damageBonus: 0, bonusDescription: '파티 HP 50% + 디버프 제거' },
  { id: 'tg_accel_burst', name: '가속 연사', description: '가속 → 시간 탄환 → 시간 복제', classId: 'time_guardian', triggerSkillCode: 'tg_accel', sequence: ['tg_accel', 'tg_time_bullet', 'tg_time_clone'], damageBonus: 40, bonusDescription: '5연속 사격 + 데미지 40%' },
  { id: 'tg_temporal_stasis', name: '시간 정지장', description: '시간 장벽 → 시간 정지 → 감속 필드', classId: 'time_guardian', triggerSkillCode: 'tg_time_barrier', sequence: ['tg_time_barrier', 'tg_time_stop', 'tg_slow_field'], damageBonus: 20, bonusDescription: '적 4초 기절' },
  { id: 'tg_chronos_judgment', name: '연대기 심판', description: '되감기 → 시간 폭발 → 시간 도약', classId: 'time_guardian', triggerSkillCode: 'tg_rewind', sequence: ['tg_rewind', 'tg_time_explosion', 'tg_time_leap'], damageBonus: 70, bonusDescription: '광역 50% 감속 + 데미지 70%' },
  // vw (5) — E-S1
  { id: 'vw_dimension_cut', name: '차원 절단', description: '공간 이동 → 차원 절단 → 공간 압축', classId: 'void_wanderer', triggerSkillCode: 'vw_spatial_shift', sequence: ['vw_spatial_shift', 'vw_dimension_cut', 'vw_spatial_compress'], damageBonus: 55, bonusDescription: '회피 불가 처치 + 80% 침묵' },
  { id: 'vw_void_torrent', name: '허공의 격류', description: '허공의 손 → 허공 연쇄 → 허공의 문', classId: 'void_wanderer', triggerSkillCode: 'vw_void_hand', sequence: ['vw_void_hand', 'vw_void_chain', 'vw_void_gate'], damageBonus: 60, bonusDescription: '다단 흡인 + 데미지 60%' },
  { id: 'vw_spatial_distortion_combo', name: '공간 왜곡', description: '공간 왜곡 → 공간 분열 → 차원 절단', classId: 'void_wanderer', triggerSkillCode: 'vw_spatial_distortion', sequence: ['vw_spatial_distortion', 'vw_spatial_fission', 'vw_dimension_cut'], damageBonus: 45, bonusDescription: '3 분신 추가 공격' },
  { id: 'vw_dimension_leap_chain', name: '차원 도약 연계', description: '차원 도약 → 차원 방벽 → 공간 이동', classId: 'void_wanderer', triggerSkillCode: 'vw_dimension_leap', sequence: ['vw_dimension_leap', 'vw_dimension_barrier', 'vw_spatial_shift'], damageBonus: 0, bonusDescription: '3초 무적 + 다음 크리 확정' },
  { id: 'vw_void_collapse', name: '공허 붕괴', description: '허공의 문 → 공간 압축 → 허공 연쇄', classId: 'void_wanderer', triggerSkillCode: 'vw_void_gate', sequence: ['vw_void_gate', 'vw_spatial_compress', 'vw_void_chain'], damageBonus: 90, bonusDescription: '광역 저주 + 데미지 90%' },
];

// ─── 빠른 lookup ───────────────────────────────────────────────

const _skillToCombos: Map<string, ComboMirror[]> = (() => {
  const m = new Map<string, ComboMirror[]>();
  for (const combo of COMBO_MIRROR) {
    for (const sk of combo.sequence) {
      if (!m.has(sk)) m.set(sk, []);
      m.get(sk)!.push(combo);
    }
  }
  return m;
})();

/**
 * skill code 가 참여하는 콤보 목록.
 * 하나의 skill 이 여러 콤보의 sequence 에 포함될 수 있음.
 */
export function getCombosUsingSkill(skillCode: string): ReadonlyArray<ComboMirror> {
  return _skillToCombos.get(skillCode) ?? [];
}

/** 클래스별 콤보 목록 */
export function getCombosByClass(classId: string): ReadonlyArray<ComboMirror> {
  return COMBO_MIRROR.filter((c) => c.classId === classId);
}
