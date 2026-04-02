/**
 * classSkills.ts — 클래스별 기본 전투 스킬 6종 (4 active + 1 passive + 1 ultimate)
 *
 * skillSeeds.ts 120개 시드 중 tier 1-2 기반 선별.
 */

import type { SkillSlot } from '../combat/CombatManager';

/** 클래스 → 기본 전투 스킬 6종 */
export const classSkills: Record<string, SkillSlot[]> = {

  // ═══ 에테르 기사 (ether_knight) ═══
  ether_knight: [
    {
      skillId: 'ek_ether_slash', name: '에테르 슬래시',
      damage: 45, damageScale: 1.2, mpCost: 15, cooldown: 3, currentCooldown: 0,
      element: 'aether', sfxKey: 'sfx_combat_slash', icon: 'skill_ek_slash',
    },
    {
      skillId: 'ek_shield_bash', name: '방패 강타',
      damage: 30, damageScale: 0.8, mpCost: 20, cooldown: 8, currentCooldown: 0,
      element: 'neutral', sfxKey: 'sfx_combat_hit', icon: 'skill_ek_shield',
    },
    {
      skillId: 'ek_charge', name: '돌진',
      damage: 35, damageScale: 1.0, mpCost: 20, cooldown: 10, currentCooldown: 0,
      element: 'neutral', sfxKey: 'sfx_combat_slash', icon: 'skill_ek_charge',
    },
    {
      skillId: 'ek_ether_explode_sword', name: '에테르 폭발검',
      damage: 120, damageScale: 1.8, mpCost: 45, cooldown: 8, currentCooldown: 0,
      element: 'aether', sfxKey: 'sfx_combat_magic_cast', icon: 'skill_ek_explode',
    },
    // passive — 에테르 충전 (MP 회복)
    {
      skillId: 'ek_ether_charge', name: '에테르 충전',
      damage: 0, damageScale: 0, mpCost: 0, cooldown: 0, currentCooldown: 0,
      element: 'aether', sfxKey: 'sfx_combat_magic_cast', icon: 'skill_ek_passive',
    },
    // ultimate — 에테르 폭주
    {
      skillId: 'ek_ether_rampage', name: '에테르 폭주',
      damage: 500, damageScale: 3.0, mpCost: 150, cooldown: 60, currentCooldown: 0,
      element: 'aether', sfxKey: 'sfx_combat_magic_cast', icon: 'skill_ek_ultimate',
    },
  ],

  // ═══ 기억술사 (memory_weaver) ═══
  memory_weaver: [
    {
      skillId: 'mw_memory_arrow', name: '기억 화살',
      damage: 40, damageScale: 1.3, mpCost: 12, cooldown: 2, currentCooldown: 0,
      element: 'aether', sfxKey: 'sfx_combat_magic_cast', icon: 'skill_mw_arrow',
    },
    {
      skillId: 'mw_ether_bolt', name: '에테르 볼트',
      damage: 50, damageScale: 1.1, mpCost: 18, cooldown: 3, currentCooldown: 0,
      element: 'aether', sfxKey: 'sfx_combat_magic_cast', icon: 'skill_mw_bolt',
    },
    {
      skillId: 'mw_memory_heal', name: '기억 치유',
      damage: 0, damageScale: 0, mpCost: 35, cooldown: 14, currentCooldown: 0,
      element: 'light', sfxKey: 'sfx_combat_magic_cast', icon: 'skill_mw_heal',
    },
    {
      skillId: 'mw_memory_storm', name: '기억 폭풍',
      damage: 130, damageScale: 1.8, mpCost: 55, cooldown: 10, currentCooldown: 0,
      element: 'aether', sfxKey: 'sfx_combat_magic_cast', icon: 'skill_mw_storm',
    },
    // passive — 마력 증폭 (MP 회복)
    {
      skillId: 'mw_mana_amplify', name: '마력 증폭',
      damage: 0, damageScale: 0, mpCost: 0, cooldown: 0, currentCooldown: 0,
      element: 'aether', sfxKey: 'sfx_combat_magic_cast', icon: 'skill_mw_passive',
    },
    // ultimate — 기억 지배
    {
      skillId: 'mw_memory_domination', name: '기억 지배',
      damage: 450, damageScale: 3.0, mpCost: 160, cooldown: 60, currentCooldown: 0,
      element: 'dark', sfxKey: 'sfx_combat_magic_cast', icon: 'skill_mw_ultimate',
    },
  ],

  // ═══ 그림자 직조사 (shadow_weaver) ═══
  shadow_weaver: [
    {
      skillId: 'sw_shadow_stab', name: '그림자 찌르기',
      damage: 42, damageScale: 1.3, mpCost: 10, cooldown: 2, currentCooldown: 0,
      element: 'dark', sfxKey: 'sfx_combat_slash', icon: 'skill_sw_stab',
    },
    {
      skillId: 'sw_vital_strike', name: '급소 공격',
      damage: 55, damageScale: 1.5, mpCost: 18, cooldown: 6, currentCooldown: 0,
      element: 'neutral', sfxKey: 'sfx_combat_slash', icon: 'skill_sw_vital',
    },
    {
      skillId: 'sw_smoke_bomb', name: '연막',
      damage: 0, damageScale: 0, mpCost: 20, cooldown: 16, currentCooldown: 0,
      element: 'neutral', sfxKey: 'sfx_combat_hit', icon: 'skill_sw_smoke',
    },
    {
      skillId: 'sw_shadow_explosion', name: '그림자 폭발',
      damage: 110, damageScale: 1.6, mpCost: 45, cooldown: 10, currentCooldown: 0,
      element: 'dark', sfxKey: 'sfx_combat_magic_cast', icon: 'skill_sw_explosion',
    },
    // passive — 독 바르기 (자가 버프)
    {
      skillId: 'sw_poison_coat', name: '독 바르기',
      damage: 0, damageScale: 0, mpCost: 20, cooldown: 15, currentCooldown: 0,
      element: 'neutral', sfxKey: 'sfx_combat_hit', icon: 'skill_sw_passive',
    },
    // ultimate — 공허의 군주
    {
      skillId: 'sw_void_lord', name: '공허의 군주',
      damage: 500, damageScale: 3.2, mpCost: 160, cooldown: 60, currentCooldown: 0,
      element: 'dark', sfxKey: 'sfx_combat_magic_cast', icon: 'skill_sw_ultimate',
    },
  ],

  // ═══ 기억 파괴자 (memory_breaker) ═══
  memory_breaker: [
    {
      skillId: 'mb_memory_shatter', name: '기억 파쇄',
      damage: 50, damageScale: 1.3, mpCost: 12, cooldown: 3, currentCooldown: 0,
      element: 'neutral', sfxKey: 'sfx_combat_hit', icon: 'skill_mb_shatter',
    },
    {
      skillId: 'mb_ground_smash', name: '대지 분쇄',
      damage: 55, damageScale: 1.2, mpCost: 25, cooldown: 10, currentCooldown: 0,
      element: 'neutral', sfxKey: 'sfx_combat_hit', icon: 'skill_mb_ground',
    },
    {
      skillId: 'mb_rage_rampage', name: '분노 폭주',
      damage: 0, damageScale: 0, mpCost: 30, cooldown: 20, currentCooldown: 0,
      element: 'dark', sfxKey: 'sfx_combat_magic_cast', icon: 'skill_mb_rage',
    },
    {
      skillId: 'mb_shatter_storm', name: '파쇄 폭풍',
      damage: 90, damageScale: 1.4, mpCost: 55, cooldown: 12, currentCooldown: 0,
      element: 'neutral', sfxKey: 'sfx_combat_magic_cast', icon: 'skill_mb_storm',
    },
    // passive — 기억 과부하 (추가 피해)
    {
      skillId: 'mb_memory_overload', name: '기억 과부하',
      damage: 0, damageScale: 0, mpCost: 0, cooldown: 0, currentCooldown: 0,
      element: 'dark', sfxKey: 'sfx_combat_hit', icon: 'skill_mb_passive',
    },
    // ultimate — 분노의 쇄도
    {
      skillId: 'mb_rage_surge', name: '분노의 쇄도',
      damage: 450, damageScale: 4.0, mpCost: 150, cooldown: 60, currentCooldown: 0,
      element: 'dark', sfxKey: 'sfx_combat_magic_cast', icon: 'skill_mb_ultimate',
    },
  ],
};
