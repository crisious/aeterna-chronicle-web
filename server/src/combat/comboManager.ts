// ─── 콤보/체인 시스템 (P6-05) ──────────────────────────────────
// 15개 콤보 체인 (클래스별 5개), 콤보 윈도우, 체인 배율,
// 히트 카운터 보너스

import { StatusEffectId } from './statusEffectManager';

// ─── 콤보 정의 타입 ────────────────────────────────────────────

export interface ComboDefinition {
  id: string;
  name: string;
  description: string;
  classId: string;
  /** 필요한 스킬 코드 순서 */
  skillSequence: string[];
  /** 콤보 완성 시 데미지 보너스 (%) */
  damageBonus: number;
  /** 콤보 완성 시 부여되는 상태이상 (null = 없음) */
  statusEffect: StatusEffectId | null;
  /** 상태이상 적용 확률 (%) */
  statusEffectChance: number;
  /** 상태이상 값 */
  statusEffectValue: number;
  /** 추가 효과 설명 */
  bonusDescription: string;
}

// ─── 체인 히트 보너스 정의 ─────────────────────────────────────

export interface ChainBonus {
  hitThreshold: number;
  damageMultiplier: number;
  label: string;
}

const CHAIN_BONUSES: ChainBonus[] = [
  { hitThreshold: 10, damageMultiplier: 1.10, label: '10 HITS!' },
  { hitThreshold: 30, damageMultiplier: 1.25, label: '30 HITS!!' },
  { hitThreshold: 50, damageMultiplier: 1.50, label: '50 HITS!!!' },
];

// ─── 상수 ──────────────────────────────────────────────────────

const COMBO_WINDOW_MS = 3000; // 3초 이내 연속 사용
const CHAIN_DECAY_MS = 3000;  // 3초 동안 히트 없으면 체인 리셋

// ─── 15개 콤보 정의 ────────────────────────────────────────────

const COMBO_DEFINITIONS: ComboDefinition[] = [
  // ═══ 에테르 기사 (ether_knight) — 5개 ═══
  {
    id: 'ek_stun_combo',
    name: '전격 강타',
    description: '돌진 → 에테르 슬래시 → 방패 강타 = 확정 기절',
    classId: 'ether_knight',
    skillSequence: ['ek_charge', 'ek_ether_slash', 'ek_shield_bash'],
    damageBonus: 40,
    statusEffect: 'stun',
    statusEffectChance: 100,
    statusEffectValue: 0,
    bonusDescription: '확정 기절 + 데미지 40% 증가',
  },
  {
    id: 'ek_shield_wall',
    name: '철벽 방어',
    description: '에테르 가드 → 도발 → 전투 함성 = 팀 방어 강화',
    classId: 'ether_knight',
    skillSequence: ['ek_ether_guard', 'ek_taunt', 'ek_war_cry'],
    damageBonus: 0,
    statusEffect: 'defense_up' as unknown as StatusEffectId,
    statusEffectChance: 100,
    statusEffectValue: 30,
    bonusDescription: '파티 전원 방어력 30% 증가 (10초)',
  },
  {
    id: 'ek_ether_burst',
    name: '에테르 폭쇄',
    description: '에테르 슬래시 → 연속 타격 → 에테르 폭발검 = 대폭발',
    classId: 'ether_knight',
    skillSequence: ['ek_ether_slash', 'ek_combo_strike', 'ek_ether_explode_sword'],
    damageBonus: 50,
    statusEffect: 'burn',
    statusEffectChance: 60,
    statusEffectValue: 50,
    bonusDescription: '데미지 50% 증가 + 60% 확률 화상',
  },
  {
    id: 'ek_thunder_combo',
    name: '뇌전 연격',
    description: '돌진 → 천둥 강타 → 에테르 폭풍 = 광역 마비',
    classId: 'ether_knight',
    skillSequence: ['ek_charge', 'ek_thunder_strike', 'ek_ether_storm'],
    damageBonus: 35,
    statusEffect: 'stun',
    statusEffectChance: 50,
    statusEffectValue: 0,
    bonusDescription: '광역 피해 35% 증가 + 50% 기절',
  },
  {
    id: 'ek_divine_strike',
    name: '신성 일격',
    description: '기본 치유 → 전투 함성 → 심판의 일격 = 정의 심판',
    classId: 'ether_knight',
    skillSequence: ['ek_basic_heal', 'ek_war_cry', 'ek_judgment_strike'],
    damageBonus: 45,
    statusEffect: null,
    statusEffectChance: 0,
    statusEffectValue: 0,
    bonusDescription: 'HP 회복 후 신성 데미지 45% 증가',
  },

  // ═══ 기억술사 (memory_weaver) — 5개 ═══
  {
    id: 'mw_freeze_combo',
    name: '시간 결박',
    description: '시간 감속 → 기억 화살 → 기억 폭풍 = 빙결 콤보',
    classId: 'memory_weaver',
    skillSequence: ['mw_time_slow', 'mw_memory_arrow', 'mw_memory_storm'],
    damageBonus: 40,
    statusEffect: 'freeze',
    statusEffectChance: 80,
    statusEffectValue: 0,
    bonusDescription: '80% 확률 빙결 + 데미지 40% 증가',
  },
  {
    id: 'mw_silence_combo',
    name: '기억 봉인',
    description: '에테르 볼트 → 기억 연쇄 → 망각의 화살 = 침묵 콤보',
    classId: 'memory_weaver',
    skillSequence: ['mw_ether_bolt', 'mw_memory_chain', 'mw_oblivion_arrow'],
    damageBonus: 35,
    statusEffect: 'silence',
    statusEffectChance: 100,
    statusEffectValue: 0,
    bonusDescription: '확정 침묵 + 데미지 35% 증가',
  },
  {
    id: 'mw_time_loop',
    name: '시간 순환',
    description: '시간 감속 → 시간 정지 → 시간 왜곡 = 영역 지배',
    classId: 'memory_weaver',
    skillSequence: ['mw_time_slow', 'mw_time_stop', 'mw_time_warp'],
    damageBonus: 30,
    statusEffect: 'slow',
    statusEffectChance: 100,
    statusEffectValue: 0,
    bonusDescription: '범위 내 적 전원 감속 + 아군 가속',
  },
  {
    id: 'mw_ether_annihilation',
    name: '에테르 소멸',
    description: '에테르 레인 → 에테르 노바 → 에테르 레이저 = 대폭발',
    classId: 'memory_weaver',
    skillSequence: ['mw_ether_rain', 'mw_ether_nova', 'mw_ether_laser'],
    damageBonus: 50,
    statusEffect: 'burn',
    statusEffectChance: 70,
    statusEffectValue: 40,
    bonusDescription: '연쇄 에테르 폭발, 데미지 50% 증가',
  },
  {
    id: 'mw_mind_shatter',
    name: '정신 파쇄',
    description: '정신 집중 → 정신 지배 → 기억의 감옥 = 완전 제압',
    classId: 'memory_weaver',
    skillSequence: ['mw_focus', 'mw_mind_control', 'mw_memory_prison'],
    damageBonus: 30,
    statusEffect: 'charm',
    statusEffectChance: 70,
    statusEffectValue: 0,
    bonusDescription: '70% 매혹 + 감옥 지속 피해 30% 증가',
  },

  // ═══ 그림자 직조사 (shadow_weaver) — 5개 ═══
  {
    id: 'sw_assassin_combo',
    name: '암살 연쇄',
    description: '은신 → 급소 공격 → 맹독 = 즉사 콤보',
    classId: 'shadow_weaver',
    skillSequence: ['sw_stealth', 'sw_vital_strike', 'sw_deadly_poison'],
    damageBonus: 50,
    statusEffect: 'poison',
    statusEffectChance: 100,
    statusEffectValue: 80,
    bonusDescription: '확정 맹독 3중첩 + 데미지 50% 증가',
  },
  {
    id: 'sw_shadow_storm',
    name: '그림자 폭풍',
    description: '그림자 이동 → 그림자 폭발 → 그림자 춤 = 광역 학살',
    classId: 'shadow_weaver',
    skillSequence: ['sw_shadow_step', 'sw_shadow_explosion', 'sw_shadow_dance'],
    damageBonus: 40,
    statusEffect: 'blind',
    statusEffectChance: 60,
    statusEffectValue: 0,
    bonusDescription: '광역 피해 40% 증가 + 60% 실명',
  },
  {
    id: 'sw_venom_rain',
    name: '맹독비',
    description: '독 바르기 → 독안개 → 단검 투척 = 독 확산',
    classId: 'shadow_weaver',
    skillSequence: ['sw_poison_coat', 'sw_poison_cloud', 'sw_dagger_throw'],
    damageBonus: 30,
    statusEffect: 'poison',
    statusEffectChance: 100,
    statusEffectValue: 60,
    bonusDescription: '범위 독 확산 + 출혈 동시 부여',
  },
  {
    id: 'sw_reaper_chain',
    name: '사신 연쇄',
    description: '저주 → 영혼 흡수 → 사신의 일격 = 처형 콤보',
    classId: 'shadow_weaver',
    skillSequence: ['sw_curse', 'sw_soul_drain', 'sw_reaper_strike'],
    damageBonus: 45,
    statusEffect: 'curse',
    statusEffectChance: 100,
    statusEffectValue: 0,
    bonusDescription: '저주 상태에서 처형 데미지 45% 추가',
  },
  {
    id: 'sw_phantom_bind',
    name: '환영 속박',
    description: '연막 → 그림자 속박 → 함정 설치 = 탈출 불가',
    classId: 'shadow_weaver',
    skillSequence: ['sw_smoke_bomb', 'sw_shadow_bind', 'sw_trap'],
    damageBonus: 30,
    statusEffect: 'slow',
    statusEffectChance: 100,
    statusEffectValue: 0,
    bonusDescription: '실명 + 이동 불가 + 감속 동시 적용',
  },
];

// ─── 플레이어 콤보 상태 ────────────────────────────────────────

interface PlayerComboState {
  /** 최근 사용한 스킬 이력 [{ code, timestamp }] */
  skillHistory: Array<{ code: string; timestamp: number }>;
  /** 연속 히트 카운터 */
  hitCount: number;
  /** 마지막 히트 시각 */
  lastHitTime: number;
}

// ─── 콤보 결과 ─────────────────────────────────────────────────

export interface ComboResult {
  /** 완성된 콤보 (null = 미완성) */
  combo: ComboDefinition | null;
  /** 체인 히트 수 */
  hitCount: number;
  /** 총 데미지 배율 (콤보 + 체인 합산) */
  totalMultiplier: number;
  /** 체인 보너스 라벨 (없으면 null) */
  chainLabel: string | null;
}

// ─── ComboManager ──────────────────────────────────────────────

export class ComboManager {
  /** playerId → 콤보 상태 */
  private states: Map<string, PlayerComboState> = new Map();

  // ─── 스킬 사용 기록 + 콤보 판정 ─────────────────────────────

  /**
   * 스킬 사용 시 호출. 콤보 달성 여부 + 히트 카운트 반환
   * @param playerId 플레이어 ID
   * @param skillCode 사용한 스킬 코드
   * @param classId 플레이어 클래스
   * @param hitCount 이번 스킬로 발생한 히트 수 (기본 1)
   */
  recordSkillUse(
    playerId: string,
    skillCode: string,
    classId: string,
    hitCount: number = 1,
  ): ComboResult {
    const now = Date.now();
    let state = this.states.get(playerId);

    if (!state) {
      state = { skillHistory: [], hitCount: 0, lastHitTime: 0 };
      this.states.set(playerId, state);
    }

    // 체인 타이머 체크 — 3초 초과 시 히트 카운터 리셋
    if (now - state.lastHitTime > CHAIN_DECAY_MS) {
      state.hitCount = 0;
    }

    // 히트 카운트 추가
    state.hitCount += hitCount;
    state.lastHitTime = now;

    // 콤보 윈도우 내 스킬 히스토리 정리 (3초 초과 제거)
    state.skillHistory = state.skillHistory.filter(
      s => now - s.timestamp <= COMBO_WINDOW_MS
    );

    // 신규 스킬 추가
    state.skillHistory.push({ code: skillCode, timestamp: now });

    // 콤보 매칭 (해당 클래스만)
    const matchedCombo = this._matchCombo(state.skillHistory, classId);

    // 콤보 달성 시 히스토리 초기화 (연속 콤보 방지)
    if (matchedCombo) {
      state.skillHistory = [];
    }

    // 체인 보너스 계산
    const chainBonus = this._getChainBonus(state.hitCount);

    // 총 배율 계산
    const comboMultiplier = matchedCombo ? (1 + matchedCombo.damageBonus / 100) : 1.0;
    const chainMultiplier = chainBonus?.damageMultiplier ?? 1.0;
    const totalMultiplier = comboMultiplier * chainMultiplier;

    return {
      combo: matchedCombo,
      hitCount: state.hitCount,
      totalMultiplier,
      chainLabel: chainBonus?.label ?? null,
    };
  }

  // ─── 콤보 매칭 ───────────────────────────────────────────────

  private _matchCombo(
    history: Array<{ code: string; timestamp: number }>,
    classId: string,
  ): ComboDefinition | null {
    const codes = history.map(h => h.code);

    // 해당 클래스 콤보만 검사
    const classCombos = COMBO_DEFINITIONS.filter(c => c.classId === classId);

    for (const combo of classCombos) {
      const seq = combo.skillSequence;
      if (seq.length > codes.length) continue;

      // 마지막 N개 스킬이 콤보 시퀀스와 일치하는지 확인
      const recent = codes.slice(codes.length - seq.length);
      const matched = seq.every((skill, i) => recent[i] === skill);

      if (matched) return combo;
    }

    return null;
  }

  // ─── 체인 보너스 ─────────────────────────────────────────────

  private _getChainBonus(hitCount: number): ChainBonus | null {
    // 가장 높은 달성 임계값 찾기
    let best: ChainBonus | null = null;
    for (const bonus of CHAIN_BONUSES) {
      if (hitCount >= bonus.hitThreshold) {
        best = bonus;
      }
    }
    return best;
  }

  // ─── 조회 ────────────────────────────────────────────────────

  /** 플레이어 현재 히트 카운트 */
  getHitCount(playerId: string): number {
    const state = this.states.get(playerId);
    if (!state) return 0;

    // 체인 만료 체크
    if (Date.now() - state.lastHitTime > CHAIN_DECAY_MS) {
      state.hitCount = 0;
    }

    return state.hitCount;
  }

  /** 현재 체인 배율 */
  getChainMultiplier(playerId: string): number {
    const hits = this.getHitCount(playerId);
    const bonus = this._getChainBonus(hits);
    return bonus?.damageMultiplier ?? 1.0;
  }

  /** 클래스별 사용 가능한 콤보 목록 */
  getClassCombos(classId: string): ComboDefinition[] {
    return COMBO_DEFINITIONS.filter(c => c.classId === classId);
  }

  /** 전체 콤보 목록 */
  getAllCombos(): ComboDefinition[] {
    return [...COMBO_DEFINITIONS];
  }

  /** 플레이어 상태 초기화 (전투 종료 시) */
  resetPlayer(playerId: string): void {
    this.states.delete(playerId);
  }

  /** 다음 콤보 힌트 (현재 히스토리 기반) */
  getNextHint(playerId: string, classId: string): Array<{
    comboName: string;
    nextSkill: string;
    progress: number; // 0~1
  }> {
    const state = this.states.get(playerId);
    if (!state) return [];

    const now = Date.now();
    const validHistory = state.skillHistory.filter(
      s => now - s.timestamp <= COMBO_WINDOW_MS
    );
    const codes = validHistory.map(h => h.code);
    if (codes.length === 0) return [];

    const hints: Array<{ comboName: string; nextSkill: string; progress: number }> = [];
    const classCombos = COMBO_DEFINITIONS.filter(c => c.classId === classId);

    for (const combo of classCombos) {
      const seq = combo.skillSequence;
      // 현재 히스토리의 마지막 부분이 콤보 시작과 일치하는지 확인
      for (let startLen = 1; startLen < seq.length; startLen++) {
        const prefix = seq.slice(0, startLen);
        const recentSlice = codes.slice(codes.length - startLen);

        if (prefix.length === recentSlice.length &&
            prefix.every((s, i) => s === recentSlice[i])) {
          hints.push({
            comboName: combo.name,
            nextSkill: seq[startLen],
            progress: startLen / seq.length,
          });
        }
      }
    }

    return hints;
  }
}

// ─── 싱글턴 인스턴스 ───────────────────────────────────────────

export const comboManager = new ComboManager();

// ─── 체인 보너스 Export ────────────────────────────────────────

export { CHAIN_BONUSES, COMBO_DEFINITIONS };
