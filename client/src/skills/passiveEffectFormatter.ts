// ─── 패시브 효과 한국어 표시 (Phase 55-S4 / B) ─────────────────
// 18종 effect type 의 게임 내 표시용 문구 생성.
// 9종 구현됨(P1+P2+P3) — 게임 효과를 정확히 반영
// 5종 stub(P4 대기) — "구현 대기" 표시
// 4종은 18종에 미포함(스킬 시드에 없음 — 서버 데이터 누락 시 fallback 으로 unknown)

import { scalePassiveLevel } from './passiveLevelScaling';

export const IMPLEMENTED_EFFECT_TYPES: ReadonlyArray<string> = [
  // Phase 1
  'mp_regen',
  'evasion_up',
  'bonus_hit_chance',
  'low_hp_atk_up',
  'defense_up_conditional',
  // Phase 3
  'reflect',
  'projectile_reflect',
  'battle_regen',
  'cheat_death',
  // Phase 4 (부분)
  'crit_echo',
  'move_damage_aura',
  'auto_resurrect',
  'poison_amplify',
];

export const PENDING_EFFECT_TYPES: ReadonlyArray<string> = [
  'drain_amplify',
];

export interface PassiveEffectFormat {
  /** 사용자에게 보여줄 문구 (한 줄) */
  text: string;
  /** 색상 힌트 — 'implemented' | 'pending' | 'unknown' */
  status: 'implemented' | 'pending' | 'unknown';
}

/**
 * effect.type + value(+ skillLevel) 을 한국어 문구로 변환.
 *
 * skillLevel 미입력 시 raw value 표시. 입력 시 PASSIVE_SCALING 적용한 실효값 표시.
 *
 * 9종 구현 effect 는 정확한 효과 문구.
 * 5종 stub 은 "구현 대기" 표시 (Phase 4).
 * 미인식 type 은 "미상 효과" 표시.
 */
export function formatPassiveEffect(
  effectType: string,
  value: number,
  skillLevel?: number,
): PassiveEffectFormat {
  const scaled = skillLevel !== undefined ? scalePassiveLevel(value, skillLevel) : value;

  switch (effectType) {
    // ─ Phase 1 (상시) ─────────────────────────────────────
    case 'mp_regen':
      return { text: `매 턴 MP +${scaled} 회복`, status: 'implemented' };
    case 'evasion_up':
      return { text: `회피율 +${scaled}%`, status: 'implemented' };
    case 'bonus_hit_chance':
      return { text: `명중률 +${scaled}%`, status: 'implemented' };
    case 'low_hp_atk_up':
      return { text: `HP 30% 미만 시 공격력 +${scaled}%`, status: 'implemented' };
    case 'defense_up_conditional':
      return { text: `피격 시 방어력 +${scaled}%`, status: 'implemented' };

    // ─ Phase 3 (트리거) ───────────────────────────────────
    case 'reflect':
      return { text: `물리 피격 시 ${scaled}% 데미지 반사`, status: 'implemented' };
    case 'projectile_reflect':
      return { text: `마법 피격 시 ${scaled}% 데미지 반사`, status: 'implemented' };
    case 'battle_regen':
      return { text: `매 턴 HP +${scaled} 회복`, status: 'implemented' };
    case 'cheat_death':
      return { text: `사망 시 ${scaled}회 1HP 로 생존`, status: 'implemented' };

    // ─ Phase 4 (부분 구현) ────────────────────────────────
    case 'crit_echo':
      return { text: `크리티컬 시 추가 데미지 +${scaled}%`, status: 'implemented' };
    case 'move_damage_aura':
      return { text: `매 턴 적군 전체에 ${scaled} 데미지`, status: 'implemented' };
    case 'auto_resurrect':
      return { text: `사망 시 ${scaled}% HP 로 부활`, status: 'implemented' };
    case 'poison_amplify':
      return { text: `시전자 DoT 데미지 +${scaled}%`, status: 'implemented' };

    // ─ Phase 4 (대기 — stub) ──────────────────────────────
    case 'drain_amplify':
      return { text: `흡수 효과 +${scaled}% (구현 대기)`, status: 'pending' };

    default:
      return { text: `미상 효과: ${effectType} (${scaled})`, status: 'unknown' };
  }
}

/** Phaser Text color 변환 */
export const STATUS_COLOR: Record<PassiveEffectFormat['status'], string> = {
  implemented: '#88ccff',
  pending: '#999999',
  unknown: '#cc6666',
};
