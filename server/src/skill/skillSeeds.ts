// ─── 스킬 시드 데이터 (P5-02) ──────────────────────────────────
// 90개 스킬: 에테르 기사(30) + 기억술사(30) + 그림자 직조사(30)

import { Prisma } from '@prisma/client';
import { prisma } from '../db';

// ─── 레벨 스케일링 프리셋 ───────────────────────────────────────

/** 일반 액티브 스킬 레벨 스케일링 */
const ACTIVE_SCALING = [
  { level: 1, damageBonus: 0, cooldownReduction: 0, mpCostReduction: 0 },
  { level: 2, damageBonus: 10, cooldownReduction: 3, mpCostReduction: 2 },
  { level: 3, damageBonus: 22, cooldownReduction: 6, mpCostReduction: 5 },
  { level: 4, damageBonus: 36, cooldownReduction: 10, mpCostReduction: 8 },
  { level: 5, damageBonus: 50, cooldownReduction: 15, mpCostReduction: 12 },
];

/** 패시브 스킬 레벨 스케일링 */
const PASSIVE_SCALING = [
  { level: 1, damageBonus: 0, cooldownReduction: 0, mpCostReduction: 0 },
  { level: 2, damageBonus: 8, cooldownReduction: 0, mpCostReduction: 0 },
  { level: 3, damageBonus: 18, cooldownReduction: 0, mpCostReduction: 0 },
  { level: 4, damageBonus: 30, cooldownReduction: 0, mpCostReduction: 0 },
  { level: 5, damageBonus: 45, cooldownReduction: 0, mpCostReduction: 0 },
];

/** 궁극기 스케일링 (3레벨까지) */
const ULTIMATE_SCALING = [
  { level: 1, damageBonus: 0, cooldownReduction: 0, mpCostReduction: 0 },
  { level: 2, damageBonus: 25, cooldownReduction: 10, mpCostReduction: 5 },
  { level: 3, damageBonus: 55, cooldownReduction: 20, mpCostReduction: 10 },
];

// ─── 스킬 정의 타입 ────────────────────────────────────────────

interface SkillSeed {
  code: string;
  name: string;
  description: string;
  class: string;
  tier: number;
  type: string;
  element: string;
  damage: number;
  damageScale: number;
  mpCost: number;
  cooldown: number;
  castTime: number;
  range: number;
  targetType: string;
  aoeRadius: number | null;
  effect: Record<string, unknown> | null;
  maxLevel: number;
  levelScaling: typeof ACTIVE_SCALING | typeof PASSIVE_SCALING | typeof ULTIMATE_SCALING;
  prerequisites: string[];
  requiredLevel: number;
}

// ═══════════════════════════════════════════════════════════════
//  에테르 기사 (ether_knight) — 30 스킬
// ═══════════════════════════════════════════════════════════════

const ETHER_KNIGHT_SKILLS: SkillSeed[] = [
  // ── Tier 1: 기본 (8) ─────────────────────────────────────
  {
    code: 'ek_ether_slash', name: '에테르 슬래시',
    description: '에테르로 강화된 참격. 기본 공격 스킬.',
    class: 'ether_knight', tier: 1, type: 'active', element: 'aether',
    damage: 45, damageScale: 1.2, mpCost: 15, cooldown: 3, castTime: 0.3, range: 1.5,
    targetType: 'single', aoeRadius: null, effect: null,
    maxLevel: 5, levelScaling: ACTIVE_SCALING, prerequisites: [], requiredLevel: 1,
  },
  {
    code: 'ek_shield_bash', name: '방패 강타',
    description: '방패로 적을 강타하여 1.5초간 기절시킴.',
    class: 'ether_knight', tier: 1, type: 'active', element: 'neutral',
    damage: 30, damageScale: 0.8, mpCost: 20, cooldown: 8, castTime: 0.5, range: 1,
    targetType: 'single', aoeRadius: null,
    effect: { type: 'stun', duration: 1.5, value: 0 },
    maxLevel: 5, levelScaling: ACTIVE_SCALING, prerequisites: [], requiredLevel: 1,
  },
  {
    code: 'ek_taunt', name: '도발',
    description: '적의 주의를 끌어 3초간 자신에게 집중시킴.',
    class: 'ether_knight', tier: 1, type: 'active', element: 'neutral',
    damage: 0, damageScale: 0, mpCost: 25, cooldown: 12, castTime: 0, range: 5,
    targetType: 'aoe', aoeRadius: 5,
    effect: { type: 'taunt', duration: 3, value: 0 },
    maxLevel: 5, levelScaling: ACTIVE_SCALING, prerequisites: [], requiredLevel: 3,
  },
  {
    code: 'ek_ether_guard', name: '에테르 가드',
    description: '에테르 방어막으로 피해를 30% 감소.',
    class: 'ether_knight', tier: 1, type: 'active', element: 'aether',
    damage: 0, damageScale: 0, mpCost: 30, cooldown: 15, castTime: 0.3, range: 0,
    targetType: 'self', aoeRadius: null,
    effect: { type: 'defense_up', duration: 5, value: 30 },
    maxLevel: 5, levelScaling: ACTIVE_SCALING, prerequisites: [], requiredLevel: 5,
  },
  {
    code: 'ek_charge', name: '돌진',
    description: '적에게 돌진하여 피해를 주고 이동.',
    class: 'ether_knight', tier: 1, type: 'active', element: 'neutral',
    damage: 35, damageScale: 1.0, mpCost: 20, cooldown: 10, castTime: 0, range: 6,
    targetType: 'single', aoeRadius: null, effect: null,
    maxLevel: 5, levelScaling: ACTIVE_SCALING, prerequisites: [], requiredLevel: 5,
  },
  {
    code: 'ek_basic_heal', name: '기본 치유',
    description: 'HP를 소량 회복.',
    class: 'ether_knight', tier: 1, type: 'active', element: 'light',
    damage: 0, damageScale: 0, mpCost: 35, cooldown: 12, castTime: 1.0, range: 0,
    targetType: 'self', aoeRadius: null,
    effect: { type: 'heal', duration: 0, value: 150 },
    maxLevel: 5, levelScaling: ACTIVE_SCALING, prerequisites: [], requiredLevel: 7,
  },
  {
    code: 'ek_war_cry', name: '전투 함성',
    description: '아군 전체의 공격력을 15% 증가 (8초).',
    class: 'ether_knight', tier: 1, type: 'active', element: 'neutral',
    damage: 0, damageScale: 0, mpCost: 30, cooldown: 20, castTime: 0.5, range: 8,
    targetType: 'aoe', aoeRadius: 8,
    effect: { type: 'attack_up', duration: 8, value: 15 },
    maxLevel: 5, levelScaling: ACTIVE_SCALING, prerequisites: [], requiredLevel: 10,
  },
  {
    code: 'ek_ether_charge', name: '에테르 충전',
    description: 'MP를 회복하는 패시브. 전투 중 자동 발동.',
    class: 'ether_knight', tier: 1, type: 'passive', element: 'aether',
    damage: 0, damageScale: 0, mpCost: 0, cooldown: 0, castTime: 0, range: 0,
    targetType: 'self', aoeRadius: null,
    effect: { type: 'mp_regen', duration: 0, value: 5 },
    maxLevel: 5, levelScaling: PASSIVE_SCALING, prerequisites: [], requiredLevel: 8,
  },

  // ── Tier 2: Lv.30 전직 (8) ──────────────────────────────
  {
    code: 'ek_ether_explode_sword', name: '에테르 폭발검',
    description: '검에 에테르를 집중시켜 폭발. 고위력 단일 대상.',
    class: 'ether_knight', tier: 2, type: 'active', element: 'aether',
    damage: 120, damageScale: 1.8, mpCost: 45, cooldown: 8, castTime: 0.5, range: 1.5,
    targetType: 'single', aoeRadius: null, effect: null,
    maxLevel: 5, levelScaling: ACTIVE_SCALING, prerequisites: ['ek_ether_slash'], requiredLevel: 30,
  },
  {
    code: 'ek_counter', name: '반격',
    description: '피격 시 자동 반격 (패시브). 물리 피해 반사 20%.',
    class: 'ether_knight', tier: 2, type: 'passive', element: 'neutral',
    damage: 0, damageScale: 0, mpCost: 0, cooldown: 0, castTime: 0, range: 0,
    targetType: 'self', aoeRadius: null,
    effect: { type: 'reflect', duration: 0, value: 20 },
    maxLevel: 5, levelScaling: PASSIVE_SCALING, prerequisites: ['ek_shield_bash'], requiredLevel: 30,
  },
  {
    code: 'ek_rampart', name: '성벽',
    description: '이동 불가 대신 방어력 50% 증가 (6초).',
    class: 'ether_knight', tier: 2, type: 'active', element: 'earth',
    damage: 0, damageScale: 0, mpCost: 40, cooldown: 18, castTime: 0.3, range: 0,
    targetType: 'self', aoeRadius: null,
    effect: { type: 'defense_up', duration: 6, value: 50 },
    maxLevel: 5, levelScaling: ACTIVE_SCALING, prerequisites: ['ek_ether_guard'], requiredLevel: 32,
  },
  {
    code: 'ek_aoe_taunt', name: '광역 도발',
    description: '넓은 범위의 모든 적을 도발 (5초).',
    class: 'ether_knight', tier: 2, type: 'active', element: 'neutral',
    damage: 0, damageScale: 0, mpCost: 50, cooldown: 20, castTime: 0.5, range: 8,
    targetType: 'aoe', aoeRadius: 8,
    effect: { type: 'taunt', duration: 5, value: 0 },
    maxLevel: 5, levelScaling: ACTIVE_SCALING, prerequisites: ['ek_taunt'], requiredLevel: 33,
  },
  {
    code: 'ek_ether_absorb', name: '에테르 흡수',
    description: '적의 에테르를 흡수하여 HP/MP 동시 회복.',
    class: 'ether_knight', tier: 2, type: 'active', element: 'aether',
    damage: 40, damageScale: 0.6, mpCost: 30, cooldown: 14, castTime: 0.8, range: 3,
    targetType: 'single', aoeRadius: null,
    effect: { type: 'drain', duration: 0, value: 60 },
    maxLevel: 5, levelScaling: ACTIVE_SCALING, prerequisites: ['ek_basic_heal'], requiredLevel: 35,
  },
  {
    code: 'ek_combo_strike', name: '연속 타격',
    description: '3연속 빠른 참격. 총 피해량 높음.',
    class: 'ether_knight', tier: 2, type: 'active', element: 'neutral',
    damage: 90, damageScale: 1.5, mpCost: 40, cooldown: 6, castTime: 0.2, range: 1.5,
    targetType: 'single', aoeRadius: null, effect: null,
    maxLevel: 5, levelScaling: ACTIVE_SCALING, prerequisites: ['ek_ether_slash'], requiredLevel: 34,
  },
  {
    code: 'ek_ally_protect', name: '전우 보호',
    description: '아군 1명의 피해를 대신 받음 (6초).',
    class: 'ether_knight', tier: 2, type: 'active', element: 'neutral',
    damage: 0, damageScale: 0, mpCost: 35, cooldown: 25, castTime: 0, range: 8,
    targetType: 'ally', aoeRadius: null,
    effect: { type: 'protect', duration: 6, value: 100 },
    maxLevel: 5, levelScaling: ACTIVE_SCALING, prerequisites: ['ek_taunt'], requiredLevel: 36,
  },
  {
    code: 'ek_ether_armament', name: '에테르 무장',
    description: '에테르 무장 상태. ATK +25%, 이동속도 -10% (10초).',
    class: 'ether_knight', tier: 2, type: 'active', element: 'aether',
    damage: 0, damageScale: 0, mpCost: 50, cooldown: 30, castTime: 1.0, range: 0,
    targetType: 'self', aoeRadius: null,
    effect: { type: 'attack_up', duration: 10, value: 25 },
    maxLevel: 5, levelScaling: ACTIVE_SCALING, prerequisites: ['ek_war_cry'], requiredLevel: 38,
  },

  // ── Tier 3: Lv.50 전직 (8) ──────────────────────────────
  {
    code: 'ek_ether_storm', name: '에테르 폭풍',
    description: '주변 광역에 에테르 폭풍을 생성. 강력한 범위 피해.',
    class: 'ether_knight', tier: 3, type: 'active', element: 'aether',
    damage: 200, damageScale: 2.0, mpCost: 80, cooldown: 15, castTime: 1.0, range: 3,
    targetType: 'aoe', aoeRadius: 4,
    effect: null,
    maxLevel: 5, levelScaling: ACTIVE_SCALING, prerequisites: ['ek_ether_explode_sword'], requiredLevel: 50,
  },
  {
    code: 'ek_indomitable', name: '불굴의 의지',
    description: 'HP가 20% 이하일 때 방어력 100% 증가 (패시브).',
    class: 'ether_knight', tier: 3, type: 'passive', element: 'neutral',
    damage: 0, damageScale: 0, mpCost: 0, cooldown: 0, castTime: 0, range: 0,
    targetType: 'self', aoeRadius: null,
    effect: { type: 'defense_up_conditional', duration: 0, value: 100 },
    maxLevel: 5, levelScaling: PASSIVE_SCALING, prerequisites: ['ek_rampart'], requiredLevel: 50,
  },
  {
    code: 'ek_judgment_strike', name: '심판의 일격',
    description: '정의의 에테르를 실은 강타. 언데드 추가 피해.',
    class: 'ether_knight', tier: 3, type: 'active', element: 'light',
    damage: 250, damageScale: 2.2, mpCost: 70, cooldown: 12, castTime: 0.8, range: 1.5,
    targetType: 'single', aoeRadius: null,
    effect: { type: 'bonus_vs_undead', duration: 0, value: 50 },
    maxLevel: 5, levelScaling: ACTIVE_SCALING, prerequisites: ['ek_combo_strike'], requiredLevel: 53,
  },
  {
    code: 'ek_ether_barrier', name: '에테르 배리어',
    description: '파티 전체에 에테르 보호막 부여 (8초).',
    class: 'ether_knight', tier: 3, type: 'active', element: 'aether',
    damage: 0, damageScale: 0, mpCost: 90, cooldown: 30, castTime: 1.2, range: 10,
    targetType: 'aoe', aoeRadius: 10,
    effect: { type: 'shield', duration: 8, value: 300 },
    maxLevel: 5, levelScaling: ACTIVE_SCALING, prerequisites: ['ek_ally_protect'], requiredLevel: 55,
  },
  {
    code: 'ek_berserk', name: '광폭화',
    description: 'ATK 50% 증가, DEF 30% 감소 (12초).',
    class: 'ether_knight', tier: 3, type: 'active', element: 'neutral',
    damage: 0, damageScale: 0, mpCost: 60, cooldown: 35, castTime: 0.5, range: 0,
    targetType: 'self', aoeRadius: null,
    effect: { type: 'berserk', duration: 12, value: 50 },
    maxLevel: 5, levelScaling: ACTIVE_SCALING, prerequisites: ['ek_ether_armament'], requiredLevel: 56,
  },
  {
    code: 'ek_thunder_strike', name: '천둥 강타',
    description: '번개를 실은 검으로 내려치기. 감전 효과.',
    class: 'ether_knight', tier: 3, type: 'active', element: 'lightning',
    damage: 220, damageScale: 1.8, mpCost: 65, cooldown: 10, castTime: 0.6, range: 2,
    targetType: 'single', aoeRadius: null,
    effect: { type: 'shock', duration: 3, value: 30 },
    maxLevel: 5, levelScaling: ACTIVE_SCALING, prerequisites: ['ek_ether_explode_sword'], requiredLevel: 58,
  },
  {
    code: 'ek_life_ether', name: '생명의 에테르',
    description: '에테르로 생명력 회복. 파티원 HP 대량 회복.',
    class: 'ether_knight', tier: 3, type: 'active', element: 'light',
    damage: 0, damageScale: 0, mpCost: 85, cooldown: 25, castTime: 1.5, range: 10,
    targetType: 'aoe', aoeRadius: 10,
    effect: { type: 'heal', duration: 0, value: 400 },
    maxLevel: 5, levelScaling: ACTIVE_SCALING, prerequisites: ['ek_ether_absorb'], requiredLevel: 60,
  },
  {
    code: 'ek_iron_formation', name: '철벽 방진',
    description: '방진 자세로 주변 아군 방어력 40% 증가 (10초).',
    class: 'ether_knight', tier: 3, type: 'active', element: 'earth',
    damage: 0, damageScale: 0, mpCost: 75, cooldown: 28, castTime: 0.8, range: 6,
    targetType: 'aoe', aoeRadius: 6,
    effect: { type: 'defense_up', duration: 10, value: 40 },
    maxLevel: 5, levelScaling: ACTIVE_SCALING, prerequisites: ['ek_rampart', 'ek_ally_protect'], requiredLevel: 62,
  },

  // ── Tier 4: Lv.80 전직 (6) ──────────────────────────────
  {
    code: 'ek_ether_rampage', name: '에테르 폭주',
    description: '궁극기. 에테르를 폭주시켜 거대한 범위 피해 + 자가 힐.',
    class: 'ether_knight', tier: 4, type: 'ultimate', element: 'aether',
    damage: 500, damageScale: 3.0, mpCost: 150, cooldown: 60, castTime: 2.0, range: 5,
    targetType: 'aoe', aoeRadius: 6,
    effect: { type: 'self_heal', duration: 0, value: 500 },
    maxLevel: 3, levelScaling: ULTIMATE_SCALING, prerequisites: ['ek_ether_storm', 'ek_berserk'], requiredLevel: 80,
  },
  {
    code: 'ek_judgment_lightning', name: '심판의 낙뢰',
    description: '하늘에서 거대한 낙뢰를 소환. 광역 번개 피해.',
    class: 'ether_knight', tier: 4, type: 'active', element: 'lightning',
    damage: 400, damageScale: 2.5, mpCost: 120, cooldown: 25, castTime: 1.5, range: 8,
    targetType: 'aoe', aoeRadius: 5,
    effect: { type: 'shock', duration: 4, value: 40 },
    maxLevel: 5, levelScaling: ACTIVE_SCALING, prerequisites: ['ek_thunder_strike'], requiredLevel: 80,
  },
  {
    code: 'ek_eternal_shield', name: '영원의 방패',
    description: '10초간 피해 완전 면역. 이동 불가.',
    class: 'ether_knight', tier: 4, type: 'active', element: 'aether',
    damage: 0, damageScale: 0, mpCost: 130, cooldown: 60, castTime: 0.5, range: 0,
    targetType: 'self', aoeRadius: null,
    effect: { type: 'invincible', duration: 10, value: 0 },
    maxLevel: 5, levelScaling: ACTIVE_SCALING, prerequisites: ['ek_ether_barrier', 'ek_indomitable'], requiredLevel: 82,
  },
  {
    code: 'ek_annihilation_sword', name: '멸절의 검',
    description: '모든 에테르를 검에 집중. 단일 대상 최대 피해.',
    class: 'ether_knight', tier: 4, type: 'active', element: 'aether',
    damage: 600, damageScale: 3.5, mpCost: 140, cooldown: 30, castTime: 2.0, range: 2,
    targetType: 'single', aoeRadius: null, effect: null,
    maxLevel: 5, levelScaling: ACTIVE_SCALING, prerequisites: ['ek_judgment_strike'], requiredLevel: 85,
  },
  {
    code: 'ek_ether_domain', name: '에테르 도메인',
    description: '에테르 영역 전개. 영역 내 아군 버프 + 적 디버프 (15초).',
    class: 'ether_knight', tier: 4, type: 'active', element: 'aether',
    damage: 0, damageScale: 0, mpCost: 120, cooldown: 45, castTime: 1.5, range: 8,
    targetType: 'aoe', aoeRadius: 8,
    effect: { type: 'domain', duration: 15, value: 25 },
    maxLevel: 5, levelScaling: ACTIVE_SCALING, prerequisites: ['ek_iron_formation'], requiredLevel: 88,
  },
  {
    code: 'ek_immortal_will', name: '불멸의 의지',
    description: '치명상 시 1회 HP 1로 생존 (패시브). 60초 쿨다운.',
    class: 'ether_knight', tier: 4, type: 'passive', element: 'light',
    damage: 0, damageScale: 0, mpCost: 0, cooldown: 60, castTime: 0, range: 0,
    targetType: 'self', aoeRadius: null,
    effect: { type: 'cheat_death', duration: 0, value: 1 },
    maxLevel: 5, levelScaling: PASSIVE_SCALING, prerequisites: ['ek_indomitable', 'ek_life_ether'], requiredLevel: 90,
  },
];

// ═══════════════════════════════════════════════════════════════
//  기억술사 (memory_weaver) — 30 스킬
// ═══════════════════════════════════════════════════════════════

const MEMORY_WEAVER_SKILLS: SkillSeed[] = [
  // ── Tier 1: 기본 (8) ─────────────────────────────────────
  {
    code: 'mw_memory_arrow', name: '기억 화살',
    description: '기억을 응축한 마법 화살. 기본 원거리 공격.',
    class: 'memory_weaver', tier: 1, type: 'active', element: 'aether',
    damage: 40, damageScale: 1.3, mpCost: 12, cooldown: 2, castTime: 0.5, range: 10,
    targetType: 'single', aoeRadius: null, effect: null,
    maxLevel: 5, levelScaling: ACTIVE_SCALING, prerequisites: [], requiredLevel: 1,
  },
  {
    code: 'mw_memory_barrier', name: '기억 방벽',
    description: '기억의 결계로 피해 흡수 보호막 생성.',
    class: 'memory_weaver', tier: 1, type: 'active', element: 'aether',
    damage: 0, damageScale: 0, mpCost: 30, cooldown: 18, castTime: 0.8, range: 0,
    targetType: 'self', aoeRadius: null,
    effect: { type: 'shield', duration: 8, value: 120 },
    maxLevel: 5, levelScaling: ACTIVE_SCALING, prerequisites: [], requiredLevel: 2,
  },
  {
    code: 'mw_time_slow', name: '시간 감속',
    description: '대상의 이동/공격 속도 30% 감소 (4초).',
    class: 'memory_weaver', tier: 1, type: 'active', element: 'time',
    damage: 0, damageScale: 0, mpCost: 25, cooldown: 12, castTime: 0.5, range: 8,
    targetType: 'single', aoeRadius: null,
    effect: { type: 'slow', duration: 4, value: 30 },
    maxLevel: 5, levelScaling: ACTIVE_SCALING, prerequisites: [], requiredLevel: 4,
  },
  {
    code: 'mw_memory_summon', name: '기억 소환',
    description: '기억 속 존재를 소환해 보조 전투. (5초간 유지)',
    class: 'memory_weaver', tier: 1, type: 'active', element: 'aether',
    damage: 25, damageScale: 0.8, mpCost: 40, cooldown: 20, castTime: 1.0, range: 5,
    targetType: 'single', aoeRadius: null,
    effect: { type: 'summon', duration: 5, value: 1 },
    maxLevel: 5, levelScaling: ACTIVE_SCALING, prerequisites: [], requiredLevel: 5,
  },
  {
    code: 'mw_ether_bolt', name: '에테르 볼트',
    description: '순수 에테르 에너지 볼트. 빠른 시전.',
    class: 'memory_weaver', tier: 1, type: 'active', element: 'aether',
    damage: 50, damageScale: 1.1, mpCost: 18, cooldown: 3, castTime: 0.3, range: 10,
    targetType: 'single', aoeRadius: null, effect: null,
    maxLevel: 5, levelScaling: ACTIVE_SCALING, prerequisites: [], requiredLevel: 3,
  },
  {
    code: 'mw_focus', name: '정신 집중',
    description: 'INT 20% 증가 (10초). 패시브 버프.',
    class: 'memory_weaver', tier: 1, type: 'active', element: 'neutral',
    damage: 0, damageScale: 0, mpCost: 25, cooldown: 25, castTime: 0.5, range: 0,
    targetType: 'self', aoeRadius: null,
    effect: { type: 'int_up', duration: 10, value: 20 },
    maxLevel: 5, levelScaling: ACTIVE_SCALING, prerequisites: [], requiredLevel: 6,
  },
  {
    code: 'mw_memory_heal', name: '기억 치유',
    description: '기억 속 건강한 상태를 복원. 아군 HP 회복.',
    class: 'memory_weaver', tier: 1, type: 'active', element: 'light',
    damage: 0, damageScale: 0, mpCost: 35, cooldown: 14, castTime: 1.0, range: 8,
    targetType: 'ally', aoeRadius: null,
    effect: { type: 'heal', duration: 0, value: 180 },
    maxLevel: 5, levelScaling: ACTIVE_SCALING, prerequisites: [], requiredLevel: 7,
  },
  {
    code: 'mw_mana_amplify', name: '마력 증폭',
    description: 'MP 회복 속도 증가 (패시브).',
    class: 'memory_weaver', tier: 1, type: 'passive', element: 'aether',
    damage: 0, damageScale: 0, mpCost: 0, cooldown: 0, castTime: 0, range: 0,
    targetType: 'self', aoeRadius: null,
    effect: { type: 'mp_regen', duration: 0, value: 8 },
    maxLevel: 5, levelScaling: PASSIVE_SCALING, prerequisites: [], requiredLevel: 9,
  },

  // ── Tier 2: Lv.30 전직 (8) ──────────────────────────────
  {
    code: 'mw_memory_storm', name: '기억 폭풍',
    description: '기억의 파편으로 폭풍 생성. 광역 마법 피해.',
    class: 'memory_weaver', tier: 2, type: 'active', element: 'aether',
    damage: 130, damageScale: 1.8, mpCost: 55, cooldown: 10, castTime: 1.0, range: 8,
    targetType: 'aoe', aoeRadius: 4,
    effect: null,
    maxLevel: 5, levelScaling: ACTIVE_SCALING, prerequisites: ['mw_memory_arrow'], requiredLevel: 30,
  },
  {
    code: 'mw_time_stop', name: '시간 정지',
    description: '대상을 2초간 완전 정지.',
    class: 'memory_weaver', tier: 2, type: 'active', element: 'time',
    damage: 0, damageScale: 0, mpCost: 60, cooldown: 25, castTime: 0.8, range: 8,
    targetType: 'single', aoeRadius: null,
    effect: { type: 'freeze', duration: 2, value: 0 },
    maxLevel: 5, levelScaling: ACTIVE_SCALING, prerequisites: ['mw_time_slow'], requiredLevel: 30,
  },
  {
    code: 'mw_memory_clone', name: '기억 복제',
    description: '자신의 기억 복제체 생성. 일정 시간 보조 공격.',
    class: 'memory_weaver', tier: 2, type: 'active', element: 'aether',
    damage: 60, damageScale: 1.0, mpCost: 65, cooldown: 30, castTime: 1.5, range: 0,
    targetType: 'self', aoeRadius: null,
    effect: { type: 'clone', duration: 10, value: 1 },
    maxLevel: 5, levelScaling: ACTIVE_SCALING, prerequisites: ['mw_memory_summon'], requiredLevel: 32,
  },
  {
    code: 'mw_ether_rain', name: '에테르 레인',
    description: '하늘에서 에테르 비를 쏟아냄. 광역 지속 피해.',
    class: 'memory_weaver', tier: 2, type: 'active', element: 'aether',
    damage: 80, damageScale: 1.4, mpCost: 50, cooldown: 14, castTime: 1.2, range: 10,
    targetType: 'aoe', aoeRadius: 5,
    effect: { type: 'dot', duration: 5, value: 30 },
    maxLevel: 5, levelScaling: ACTIVE_SCALING, prerequisites: ['mw_ether_bolt'], requiredLevel: 33,
  },
  {
    code: 'mw_mind_control', name: '정신 지배',
    description: '적 1체를 3초간 아군으로 전향.',
    class: 'memory_weaver', tier: 2, type: 'active', element: 'dark',
    damage: 0, damageScale: 0, mpCost: 70, cooldown: 30, castTime: 1.5, range: 8,
    targetType: 'single', aoeRadius: null,
    effect: { type: 'charm', duration: 3, value: 0 },
    maxLevel: 5, levelScaling: ACTIVE_SCALING, prerequisites: ['mw_focus'], requiredLevel: 35,
  },
  {
    code: 'mw_memory_chain', name: '기억 연쇄',
    description: '대상에서 주변 적으로 연쇄 피해 (최대 4체).',
    class: 'memory_weaver', tier: 2, type: 'active', element: 'aether',
    damage: 70, damageScale: 1.3, mpCost: 45, cooldown: 8, castTime: 0.5, range: 10,
    targetType: 'single', aoeRadius: null,
    effect: { type: 'chain', duration: 0, value: 4 },
    maxLevel: 5, levelScaling: ACTIVE_SCALING, prerequisites: ['mw_memory_arrow'], requiredLevel: 34,
  },
  {
    code: 'mw_time_reversal', name: '시간 역행',
    description: '아군 1명의 HP를 5초 전 상태로 되돌림.',
    class: 'memory_weaver', tier: 2, type: 'active', element: 'time',
    damage: 0, damageScale: 0, mpCost: 75, cooldown: 35, castTime: 1.0, range: 8,
    targetType: 'ally', aoeRadius: null,
    effect: { type: 'time_heal', duration: 0, value: 5 },
    maxLevel: 5, levelScaling: ACTIVE_SCALING, prerequisites: ['mw_memory_heal'], requiredLevel: 37,
  },
  {
    code: 'mw_mana_burst', name: '마력 폭발',
    description: '현재 MP의 30%를 소모해 비례 피해.',
    class: 'memory_weaver', tier: 2, type: 'active', element: 'aether',
    damage: 0, damageScale: 2.5, mpCost: 0, cooldown: 18, castTime: 0.8, range: 6,
    targetType: 'aoe', aoeRadius: 4,
    effect: { type: 'mp_consume_ratio', duration: 0, value: 30 },
    maxLevel: 5, levelScaling: ACTIVE_SCALING, prerequisites: ['mw_mana_amplify'], requiredLevel: 38,
  },

  // ── Tier 3: Lv.50 전직 (8) ──────────────────────────────
  {
    code: 'mw_oblivion_arrow', name: '망각의 화살',
    description: '적의 기억을 지우는 화살. 스킬 사용 봉인 3초.',
    class: 'memory_weaver', tier: 3, type: 'active', element: 'dark',
    damage: 180, damageScale: 2.0, mpCost: 70, cooldown: 15, castTime: 0.8, range: 12,
    targetType: 'single', aoeRadius: null,
    effect: { type: 'silence', duration: 3, value: 0 },
    maxLevel: 5, levelScaling: ACTIVE_SCALING, prerequisites: ['mw_memory_chain'], requiredLevel: 50,
  },
  {
    code: 'mw_time_warp', name: '시간 왜곡',
    description: '영역 내 시간을 왜곡. 아군 속도 UP + 적 속도 DOWN.',
    class: 'memory_weaver', tier: 3, type: 'active', element: 'time',
    damage: 0, damageScale: 0, mpCost: 80, cooldown: 25, castTime: 1.0, range: 8,
    targetType: 'aoe', aoeRadius: 6,
    effect: { type: 'time_warp', duration: 8, value: 30 },
    maxLevel: 5, levelScaling: ACTIVE_SCALING, prerequisites: ['mw_time_stop'], requiredLevel: 50,
  },
  {
    code: 'mw_memory_reconstruct', name: '기억 재구성',
    description: '기억을 재구성해 아군 전원의 스킬 쿨다운 50% 초기화.',
    class: 'memory_weaver', tier: 3, type: 'active', element: 'aether',
    damage: 0, damageScale: 0, mpCost: 100, cooldown: 60, castTime: 2.0, range: 10,
    targetType: 'aoe', aoeRadius: 10,
    effect: { type: 'cooldown_reset', duration: 0, value: 50 },
    maxLevel: 5, levelScaling: ACTIVE_SCALING, prerequisites: ['mw_time_reversal'], requiredLevel: 53,
  },
  {
    code: 'mw_ether_laser', name: '에테르 레이저',
    description: '직선 방향 관통 레이저. 높은 단일 피해.',
    class: 'memory_weaver', tier: 3, type: 'active', element: 'aether',
    damage: 280, damageScale: 2.4, mpCost: 75, cooldown: 12, castTime: 1.0, range: 15,
    targetType: 'single', aoeRadius: null, effect: null,
    maxLevel: 5, levelScaling: ACTIVE_SCALING, prerequisites: ['mw_ether_rain'], requiredLevel: 55,
  },
  {
    code: 'mw_dimension_rift', name: '차원 균열',
    description: '시공간에 균열을 열어 지속 광역 피해.',
    class: 'memory_weaver', tier: 3, type: 'active', element: 'dark',
    damage: 150, damageScale: 1.6, mpCost: 85, cooldown: 20, castTime: 1.5, range: 8,
    targetType: 'aoe', aoeRadius: 5,
    effect: { type: 'dot', duration: 8, value: 50 },
    maxLevel: 5, levelScaling: ACTIVE_SCALING, prerequisites: ['mw_memory_storm'], requiredLevel: 56,
  },
  {
    code: 'mw_memory_prison', name: '기억의 감옥',
    description: '적을 기억 속에 가둠. 5초간 행동 불가 + 지속 피해.',
    class: 'memory_weaver', tier: 3, type: 'active', element: 'aether',
    damage: 100, damageScale: 1.2, mpCost: 90, cooldown: 30, castTime: 1.5, range: 8,
    targetType: 'single', aoeRadius: null,
    effect: { type: 'imprison', duration: 5, value: 40 },
    maxLevel: 5, levelScaling: ACTIVE_SCALING, prerequisites: ['mw_mind_control'], requiredLevel: 58,
  },
  {
    code: 'mw_time_accel', name: '시간 가속',
    description: '자신의 시전 속도/이동 속도 40% 증가 (10초).',
    class: 'memory_weaver', tier: 3, type: 'active', element: 'time',
    damage: 0, damageScale: 0, mpCost: 55, cooldown: 25, castTime: 0.3, range: 0,
    targetType: 'self', aoeRadius: null,
    effect: { type: 'haste', duration: 10, value: 40 },
    maxLevel: 5, levelScaling: ACTIVE_SCALING, prerequisites: ['mw_time_warp'], requiredLevel: 60,
  },
  {
    code: 'mw_ether_nova', name: '에테르 노바',
    description: '자신 중심 에테르 폭발. 광역 피해 + 넉백.',
    class: 'memory_weaver', tier: 3, type: 'active', element: 'aether',
    damage: 220, damageScale: 2.0, mpCost: 80, cooldown: 18, castTime: 0.5, range: 0,
    targetType: 'aoe', aoeRadius: 5,
    effect: { type: 'knockback', duration: 0, value: 3 },
    maxLevel: 5, levelScaling: ACTIVE_SCALING, prerequisites: ['mw_mana_burst'], requiredLevel: 62,
  },

  // ── Tier 4: Lv.80 전직 (6) ──────────────────────────────
  {
    code: 'mw_memory_domination', name: '기억 지배',
    description: '궁극기. 광역 정신 지배 + 대규모 피해.',
    class: 'memory_weaver', tier: 4, type: 'ultimate', element: 'dark',
    damage: 450, damageScale: 3.0, mpCost: 160, cooldown: 60, castTime: 2.5, range: 10,
    targetType: 'aoe', aoeRadius: 8,
    effect: { type: 'mass_charm', duration: 4, value: 0 },
    maxLevel: 3, levelScaling: ULTIMATE_SCALING, prerequisites: ['mw_memory_prison', 'mw_dimension_rift'], requiredLevel: 80,
  },
  {
    code: 'mw_time_collapse', name: '시간 붕괴',
    description: '시간축 자체를 붕괴시킴. 영역 내 모든 적 HP 비례 피해.',
    class: 'memory_weaver', tier: 4, type: 'active', element: 'time',
    damage: 300, damageScale: 2.5, mpCost: 130, cooldown: 30, castTime: 2.0, range: 8,
    targetType: 'aoe', aoeRadius: 6,
    effect: { type: 'hp_percent_damage', duration: 0, value: 15 },
    maxLevel: 5, levelScaling: ACTIVE_SCALING, prerequisites: ['mw_time_accel'], requiredLevel: 80,
  },
  {
    code: 'mw_dimension_annihilation', name: '차원 소멸',
    description: '차원을 소멸시켜 극대 피해. 긴 시전 시간.',
    class: 'memory_weaver', tier: 4, type: 'active', element: 'dark',
    damage: 550, damageScale: 3.2, mpCost: 140, cooldown: 25, castTime: 3.0, range: 12,
    targetType: 'single', aoeRadius: null, effect: null,
    maxLevel: 5, levelScaling: ACTIVE_SCALING, prerequisites: ['mw_ether_laser'], requiredLevel: 82,
  },
  {
    code: 'mw_ether_dark_star', name: '에테르 암흑성',
    description: '에테르 블랙홀 생성. 적을 끌어들이며 지속 피해.',
    class: 'memory_weaver', tier: 4, type: 'active', element: 'dark',
    damage: 200, damageScale: 2.0, mpCost: 120, cooldown: 35, castTime: 2.0, range: 10,
    targetType: 'aoe', aoeRadius: 6,
    effect: { type: 'pull_dot', duration: 6, value: 60 },
    maxLevel: 5, levelScaling: ACTIVE_SCALING, prerequisites: ['mw_ether_nova'], requiredLevel: 85,
  },
  {
    code: 'mw_absolute_memory', name: '절대 기억',
    description: '기억 완전 회귀. 30초 이내 사망 시 HP 100%로 부활 (패시브).',
    class: 'memory_weaver', tier: 4, type: 'passive', element: 'time',
    damage: 0, damageScale: 0, mpCost: 0, cooldown: 120, castTime: 0, range: 0,
    targetType: 'self', aoeRadius: null,
    effect: { type: 'auto_resurrect', duration: 30, value: 100 },
    maxLevel: 5, levelScaling: PASSIVE_SCALING, prerequisites: ['mw_memory_reconstruct'], requiredLevel: 88,
  },
  {
    code: 'mw_world_oblivion', name: '세계 망각',
    description: '세계 자체의 기억을 소거. 적 전원 디버프 제거 불가 + 피해.',
    class: 'memory_weaver', tier: 4, type: 'active', element: 'dark',
    damage: 400, damageScale: 2.8, mpCost: 150, cooldown: 45, castTime: 2.5, range: 15,
    targetType: 'aoe', aoeRadius: 10,
    effect: { type: 'irremovable_debuff', duration: 10, value: 30 },
    maxLevel: 5, levelScaling: ACTIVE_SCALING, prerequisites: ['mw_oblivion_arrow', 'mw_time_collapse'], requiredLevel: 90,
  },
];

// ═══════════════════════════════════════════════════════════════
//  그림자 직조사 (shadow_weaver) — 30 스킬
// ═══════════════════════════════════════════════════════════════

const SHADOW_WEAVER_SKILLS: SkillSeed[] = [
  // ── Tier 1: 기본 (8) ─────────────────────────────────────
  {
    code: 'sw_shadow_stab', name: '그림자 찌르기',
    description: '그림자를 두른 단검으로 빠른 찌르기.',
    class: 'shadow_weaver', tier: 1, type: 'active', element: 'dark',
    damage: 42, damageScale: 1.3, mpCost: 10, cooldown: 2, castTime: 0.1, range: 1,
    targetType: 'single', aoeRadius: null, effect: null,
    maxLevel: 5, levelScaling: ACTIVE_SCALING, prerequisites: [], requiredLevel: 1,
  },
  {
    code: 'sw_poison_coat', name: '독 바르기',
    description: '무기에 독을 발라 일정 시간 공격 시 중독 부여.',
    class: 'shadow_weaver', tier: 1, type: 'active', element: 'neutral',
    damage: 0, damageScale: 0, mpCost: 20, cooldown: 15, castTime: 0.5, range: 0,
    targetType: 'self', aoeRadius: null,
    effect: { type: 'poison_buff', duration: 15, value: 20 },
    maxLevel: 5, levelScaling: ACTIVE_SCALING, prerequisites: [], requiredLevel: 2,
  },
  {
    code: 'sw_stealth', name: '은신',
    description: '그림자 속으로 은신. 이동 속도 감소, 다음 공격 크리티컬.',
    class: 'shadow_weaver', tier: 1, type: 'active', element: 'dark',
    damage: 0, damageScale: 0, mpCost: 25, cooldown: 18, castTime: 0, range: 0,
    targetType: 'self', aoeRadius: null,
    effect: { type: 'stealth', duration: 8, value: 0 },
    maxLevel: 5, levelScaling: ACTIVE_SCALING, prerequisites: [], requiredLevel: 3,
  },
  {
    code: 'sw_shadow_step', name: '그림자 이동',
    description: '그림자를 통해 대상 뒤로 순간이동.',
    class: 'shadow_weaver', tier: 1, type: 'active', element: 'dark',
    damage: 0, damageScale: 0, mpCost: 20, cooldown: 10, castTime: 0, range: 8,
    targetType: 'single', aoeRadius: null,
    effect: { type: 'teleport', duration: 0, value: 0 },
    maxLevel: 5, levelScaling: ACTIVE_SCALING, prerequisites: [], requiredLevel: 4,
  },
  {
    code: 'sw_smoke_bomb', name: '연막',
    description: '연막을 투척해 범위 내 적 명중률 감소 (5초).',
    class: 'shadow_weaver', tier: 1, type: 'active', element: 'neutral',
    damage: 0, damageScale: 0, mpCost: 20, cooldown: 16, castTime: 0.2, range: 6,
    targetType: 'aoe', aoeRadius: 3,
    effect: { type: 'blind', duration: 5, value: 40 },
    maxLevel: 5, levelScaling: ACTIVE_SCALING, prerequisites: [], requiredLevel: 5,
  },
  {
    code: 'sw_vital_strike', name: '급소 공격',
    description: '급소를 정확히 노린 공격. 크리티컬 확률 +50%.',
    class: 'shadow_weaver', tier: 1, type: 'active', element: 'neutral',
    damage: 55, damageScale: 1.5, mpCost: 18, cooldown: 6, castTime: 0.2, range: 1,
    targetType: 'single', aoeRadius: null,
    effect: { type: 'crit_bonus', duration: 0, value: 50 },
    maxLevel: 5, levelScaling: ACTIVE_SCALING, prerequisites: [], requiredLevel: 6,
  },
  {
    code: 'sw_trap', name: '함정 설치',
    description: '바닥에 함정 설치. 적이 밟으면 피해 + 둔화.',
    class: 'shadow_weaver', tier: 1, type: 'active', element: 'neutral',
    damage: 35, damageScale: 0.8, mpCost: 22, cooldown: 14, castTime: 0.5, range: 5,
    targetType: 'aoe', aoeRadius: 2,
    effect: { type: 'slow', duration: 3, value: 40 },
    maxLevel: 5, levelScaling: ACTIVE_SCALING, prerequisites: [], requiredLevel: 8,
  },
  {
    code: 'sw_dagger_throw', name: '단검 투척',
    description: '단검을 투척해 원거리 피해. 패시브 출혈.',
    class: 'shadow_weaver', tier: 1, type: 'active', element: 'neutral',
    damage: 38, damageScale: 1.1, mpCost: 12, cooldown: 4, castTime: 0.2, range: 8,
    targetType: 'single', aoeRadius: null,
    effect: { type: 'bleed', duration: 4, value: 15 },
    maxLevel: 5, levelScaling: ACTIVE_SCALING, prerequisites: [], requiredLevel: 7,
  },

  // ── Tier 2: Lv.30 전직 (8) ──────────────────────────────
  {
    code: 'sw_shadow_explosion', name: '그림자 폭발',
    description: '자신 주변 그림자를 폭발. 광역 피해.',
    class: 'shadow_weaver', tier: 2, type: 'active', element: 'dark',
    damage: 110, damageScale: 1.6, mpCost: 45, cooldown: 10, castTime: 0.3, range: 0,
    targetType: 'aoe', aoeRadius: 4,
    effect: null,
    maxLevel: 5, levelScaling: ACTIVE_SCALING, prerequisites: ['sw_shadow_stab'], requiredLevel: 30,
  },
  {
    code: 'sw_deadly_poison', name: '맹독',
    description: '강력한 독. 대상 HP 지속 감소 (8초).',
    class: 'shadow_weaver', tier: 2, type: 'active', element: 'neutral',
    damage: 0, damageScale: 0, mpCost: 40, cooldown: 14, castTime: 0.5, range: 5,
    targetType: 'single', aoeRadius: null,
    effect: { type: 'poison', duration: 8, value: 50 },
    maxLevel: 5, levelScaling: ACTIVE_SCALING, prerequisites: ['sw_poison_coat'], requiredLevel: 30,
  },
  {
    code: 'sw_assassinate', name: '암살',
    description: '은신 상태에서 사용 시 피해 300%. 은신 해제.',
    class: 'shadow_weaver', tier: 2, type: 'active', element: 'dark',
    damage: 180, damageScale: 2.0, mpCost: 50, cooldown: 15, castTime: 0.2, range: 1,
    targetType: 'single', aoeRadius: null,
    effect: { type: 'stealth_bonus', duration: 0, value: 300 },
    maxLevel: 5, levelScaling: ACTIVE_SCALING, prerequisites: ['sw_stealth', 'sw_vital_strike'], requiredLevel: 32,
  },
  {
    code: 'sw_shadow_clone', name: '그림자 분신',
    description: '그림자 분신 2체를 생성. 적의 타게팅 교란.',
    class: 'shadow_weaver', tier: 2, type: 'active', element: 'dark',
    damage: 0, damageScale: 0, mpCost: 55, cooldown: 25, castTime: 0.5, range: 0,
    targetType: 'self', aoeRadius: null,
    effect: { type: 'clone', duration: 8, value: 2 },
    maxLevel: 5, levelScaling: ACTIVE_SCALING, prerequisites: ['sw_shadow_step'], requiredLevel: 33,
  },
  {
    code: 'sw_curse', name: '저주',
    description: '대상에게 저주를 걸어 받는 피해 25% 증가 (6초).',
    class: 'shadow_weaver', tier: 2, type: 'active', element: 'dark',
    damage: 0, damageScale: 0, mpCost: 35, cooldown: 16, castTime: 0.8, range: 8,
    targetType: 'single', aoeRadius: null,
    effect: { type: 'vulnerability', duration: 6, value: 25 },
    maxLevel: 5, levelScaling: ACTIVE_SCALING, prerequisites: ['sw_poison_coat'], requiredLevel: 34,
  },
  {
    code: 'sw_rapid_stab', name: '연속 찌르기',
    description: '초고속 5연속 찌르기.',
    class: 'shadow_weaver', tier: 2, type: 'active', element: 'neutral',
    damage: 100, damageScale: 1.6, mpCost: 40, cooldown: 6, castTime: 0.1, range: 1,
    targetType: 'single', aoeRadius: null, effect: null,
    maxLevel: 5, levelScaling: ACTIVE_SCALING, prerequisites: ['sw_shadow_stab'], requiredLevel: 35,
  },
  {
    code: 'sw_poison_cloud', name: '독안개',
    description: '독 안개를 퍼뜨려 범위 내 적 지속 중독.',
    class: 'shadow_weaver', tier: 2, type: 'active', element: 'neutral',
    damage: 30, damageScale: 0.6, mpCost: 50, cooldown: 18, castTime: 0.8, range: 6,
    targetType: 'aoe', aoeRadius: 4,
    effect: { type: 'poison', duration: 6, value: 35 },
    maxLevel: 5, levelScaling: ACTIVE_SCALING, prerequisites: ['sw_smoke_bomb', 'sw_poison_coat'], requiredLevel: 36,
  },
  {
    code: 'sw_shadow_bind', name: '그림자 속박',
    description: '적의 그림자를 밟아 3초간 이동 불가.',
    class: 'shadow_weaver', tier: 2, type: 'active', element: 'dark',
    damage: 0, damageScale: 0, mpCost: 30, cooldown: 12, castTime: 0.3, range: 6,
    targetType: 'single', aoeRadius: null,
    effect: { type: 'root', duration: 3, value: 0 },
    maxLevel: 5, levelScaling: ACTIVE_SCALING, prerequisites: ['sw_shadow_step'], requiredLevel: 38,
  },

  // ── Tier 3: Lv.50 전직 (8) ──────────────────────────────
  {
    code: 'sw_reaper_strike', name: '사신의 일격',
    description: 'HP 30% 이하 대상에게 피해 200% 증가.',
    class: 'shadow_weaver', tier: 3, type: 'active', element: 'dark',
    damage: 250, damageScale: 2.2, mpCost: 65, cooldown: 12, castTime: 0.3, range: 1.5,
    targetType: 'single', aoeRadius: null,
    effect: { type: 'execute_bonus', duration: 0, value: 200 },
    maxLevel: 5, levelScaling: ACTIVE_SCALING, prerequisites: ['sw_assassinate'], requiredLevel: 50,
  },
  {
    code: 'sw_soul_drain', name: '영혼 흡수',
    description: '적의 영혼을 흡수해 HP 회복 + 피해.',
    class: 'shadow_weaver', tier: 3, type: 'active', element: 'dark',
    damage: 160, damageScale: 1.6, mpCost: 55, cooldown: 14, castTime: 0.8, range: 4,
    targetType: 'single', aoeRadius: null,
    effect: { type: 'lifesteal', duration: 0, value: 50 },
    maxLevel: 5, levelScaling: ACTIVE_SCALING, prerequisites: ['sw_curse'], requiredLevel: 50,
  },
  {
    code: 'sw_shadow_dance', name: '그림자 춤',
    description: '그림자 사이를 오가며 6회 랜덤 타격.',
    class: 'shadow_weaver', tier: 3, type: 'active', element: 'dark',
    damage: 180, damageScale: 1.8, mpCost: 70, cooldown: 16, castTime: 0.2, range: 3,
    targetType: 'aoe', aoeRadius: 3,
    effect: null,
    maxLevel: 5, levelScaling: ACTIVE_SCALING, prerequisites: ['sw_rapid_stab', 'sw_shadow_clone'], requiredLevel: 53,
  },
  {
    code: 'sw_poison_king', name: '독의 왕',
    description: '모든 독 효과 피해 100% 증가 (패시브).',
    class: 'shadow_weaver', tier: 3, type: 'passive', element: 'neutral',
    damage: 0, damageScale: 0, mpCost: 0, cooldown: 0, castTime: 0, range: 0,
    targetType: 'self', aoeRadius: null,
    effect: { type: 'poison_amplify', duration: 0, value: 100 },
    maxLevel: 5, levelScaling: PASSIVE_SCALING, prerequisites: ['sw_deadly_poison', 'sw_poison_cloud'], requiredLevel: 55,
  },
  {
    code: 'sw_void_blade', name: '공허의 칼날',
    description: '공허의 힘을 실은 베기. 방어력 무시.',
    class: 'shadow_weaver', tier: 3, type: 'active', element: 'dark',
    damage: 280, damageScale: 2.4, mpCost: 70, cooldown: 14, castTime: 0.5, range: 2,
    targetType: 'single', aoeRadius: null,
    effect: { type: 'armor_pierce', duration: 0, value: 100 },
    maxLevel: 5, levelScaling: ACTIVE_SCALING, prerequisites: ['sw_shadow_explosion'], requiredLevel: 56,
  },
  {
    code: 'sw_dark_mist', name: '암흑 연무',
    description: '넓은 영역을 암흑으로 뒤덮어 적 명중률 대폭 감소.',
    class: 'shadow_weaver', tier: 3, type: 'active', element: 'dark',
    damage: 0, damageScale: 0, mpCost: 60, cooldown: 22, castTime: 1.0, range: 8,
    targetType: 'aoe', aoeRadius: 6,
    effect: { type: 'blind', duration: 6, value: 60 },
    maxLevel: 5, levelScaling: ACTIVE_SCALING, prerequisites: ['sw_smoke_bomb', 'sw_shadow_bind'], requiredLevel: 58,
  },
  {
    code: 'sw_shadow_altar', name: '그림자 제단',
    description: '그림자 제단 설치. 범위 내 아군 크리티컬 확률 +30%.',
    class: 'shadow_weaver', tier: 3, type: 'active', element: 'dark',
    damage: 0, damageScale: 0, mpCost: 75, cooldown: 30, castTime: 1.5, range: 5,
    targetType: 'aoe', aoeRadius: 5,
    effect: { type: 'crit_up', duration: 10, value: 30 },
    maxLevel: 5, levelScaling: ACTIVE_SCALING, prerequisites: ['sw_trap'], requiredLevel: 60,
  },
  {
    code: 'sw_phantom_frenzy', name: '환영 난무',
    description: '분신과 함께 다수의 적을 동시 공격.',
    class: 'shadow_weaver', tier: 3, type: 'active', element: 'dark',
    damage: 200, damageScale: 2.0, mpCost: 75, cooldown: 18, castTime: 0.3, range: 4,
    targetType: 'aoe', aoeRadius: 4,
    effect: null,
    maxLevel: 5, levelScaling: ACTIVE_SCALING, prerequisites: ['sw_shadow_dance'], requiredLevel: 62,
  },

  // ── Tier 4: Lv.80 전직 (6) ──────────────────────────────
  {
    code: 'sw_void_lord', name: '공허의 군주',
    description: '궁극기. 공허의 차원을 열어 대규모 광역 피해 + 공포.',
    class: 'shadow_weaver', tier: 4, type: 'ultimate', element: 'dark',
    damage: 500, damageScale: 3.2, mpCost: 160, cooldown: 60, castTime: 2.0, range: 8,
    targetType: 'aoe', aoeRadius: 7,
    effect: { type: 'fear', duration: 4, value: 0 },
    maxLevel: 3, levelScaling: ULTIMATE_SCALING, prerequisites: ['sw_void_blade', 'sw_phantom_frenzy'], requiredLevel: 80,
  },
  {
    code: 'sw_death_mark', name: '죽음의 표식',
    description: '대상에게 죽음의 표식. 5초 후 최대 HP 20% 피해.',
    class: 'shadow_weaver', tier: 4, type: 'active', element: 'dark',
    damage: 0, damageScale: 0, mpCost: 80, cooldown: 20, castTime: 0.5, range: 10,
    targetType: 'single', aoeRadius: null,
    effect: { type: 'delayed_damage', duration: 5, value: 20 },
    maxLevel: 5, levelScaling: ACTIVE_SCALING, prerequisites: ['sw_reaper_strike'], requiredLevel: 80,
  },
  {
    code: 'sw_shadow_dimension', name: '그림자 차원',
    description: '그림자 차원으로 진입. 5초간 완전 무적 + 이동 가능.',
    class: 'shadow_weaver', tier: 4, type: 'active', element: 'dark',
    damage: 0, damageScale: 0, mpCost: 120, cooldown: 45, castTime: 0, range: 0,
    targetType: 'self', aoeRadius: null,
    effect: { type: 'phase_shift', duration: 5, value: 0 },
    maxLevel: 5, levelScaling: ACTIVE_SCALING, prerequisites: ['sw_dark_mist'], requiredLevel: 82,
  },
  {
    code: 'sw_soul_harvest', name: '영혼 수확',
    description: '범위 내 적 영혼 수확. 킬 수만큼 ATK 영구 증가.',
    class: 'shadow_weaver', tier: 4, type: 'active', element: 'dark',
    damage: 350, damageScale: 2.5, mpCost: 100, cooldown: 30, castTime: 1.5, range: 6,
    targetType: 'aoe', aoeRadius: 5,
    effect: { type: 'permanent_atk_on_kill', duration: 0, value: 5 },
    maxLevel: 5, levelScaling: ACTIVE_SCALING, prerequisites: ['sw_soul_drain'], requiredLevel: 85,
  },
  {
    code: 'sw_absolute_dark', name: '절대 암흑',
    description: '전장 전체를 암흑으로 뒤덮음. 적 전원 실명 + 지속 피해.',
    class: 'shadow_weaver', tier: 4, type: 'active', element: 'dark',
    damage: 200, damageScale: 1.8, mpCost: 130, cooldown: 40, castTime: 2.0, range: 15,
    targetType: 'aoe', aoeRadius: 15,
    effect: { type: 'blind', duration: 8, value: 80 },
    maxLevel: 5, levelScaling: ACTIVE_SCALING, prerequisites: ['sw_dark_mist', 'sw_shadow_altar'], requiredLevel: 88,
  },
  {
    code: 'sw_nihil_blade', name: '허무의 칼날',
    description: '존재 자체를 베는 일격. 부활 불가 디버프.',
    class: 'shadow_weaver', tier: 4, type: 'active', element: 'dark',
    damage: 600, damageScale: 3.5, mpCost: 140, cooldown: 35, castTime: 1.0, range: 2,
    targetType: 'single', aoeRadius: null,
    effect: { type: 'no_resurrect', duration: 30, value: 0 },
    maxLevel: 5, levelScaling: ACTIVE_SCALING, prerequisites: ['sw_void_blade', 'sw_reaper_strike'], requiredLevel: 90,
  },
];

// ═══════════════════════════════════════════════════════════════
//  시드 실행 함수
// ═══════════════════════════════════════════════════════════════

const ALL_SKILLS: SkillSeed[] = [
  ...ETHER_KNIGHT_SKILLS,
  ...MEMORY_WEAVER_SKILLS,
  ...SHADOW_WEAVER_SKILLS,
];

/** 스킬 시드 실행 (upsert — 중복 실행 안전) */
export async function seedSkills(): Promise<{ created: number; updated: number }> {
  let created = 0;
  let updated = 0;

  for (const s of ALL_SKILLS) {
    const existing = await prisma.skill.findUnique({ where: { code: s.code } });
    if (existing) {
      await prisma.skill.update({
        where: { code: s.code },
        data: {
          name: s.name,
          description: s.description,
          class: s.class,
          tier: s.tier,
          type: s.type,
          element: s.element,
          damage: s.damage,
          damageScale: s.damageScale,
          mpCost: s.mpCost,
          cooldown: s.cooldown,
          castTime: s.castTime,
          range: s.range,
          targetType: s.targetType,
          aoeRadius: s.aoeRadius,
          effect: s.effect ? (s.effect as Prisma.InputJsonValue) : Prisma.JsonNull,
          maxLevel: s.maxLevel,
          levelScaling: s.levelScaling,
          prerequisites: s.prerequisites,
          requiredLevel: s.requiredLevel,
        },
      });
      updated++;
    } else {
      await prisma.skill.create({
        data: {
          code: s.code,
          name: s.name,
          description: s.description,
          class: s.class,
          tier: s.tier,
          type: s.type,
          element: s.element,
          damage: s.damage,
          damageScale: s.damageScale,
          mpCost: s.mpCost,
          cooldown: s.cooldown,
          castTime: s.castTime,
          range: s.range,
          targetType: s.targetType,
          aoeRadius: s.aoeRadius,
          effect: s.effect ? (s.effect as Prisma.InputJsonValue) : Prisma.JsonNull,
          maxLevel: s.maxLevel,
          levelScaling: s.levelScaling,
          prerequisites: s.prerequisites,
          requiredLevel: s.requiredLevel,
        },
      });
      created++;
    }
  }

  return { created, updated };
}

/** 검증: 스킬 수 확인 */
export function getSkillSeedCount(): { total: number; byClass: Record<string, number> } {
  const byClass: Record<string, number> = {};
  for (const s of ALL_SKILLS) {
    byClass[s.class] = (byClass[s.class] || 0) + 1;
  }
  return { total: ALL_SKILLS.length, byClass };
}
