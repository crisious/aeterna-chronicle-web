/**
 * Unit tests -- comboManager (T-03)
 * Skill sequence matching, combo window expiry, chain bonus,
 * combo hints, player state reset
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ComboManager, CHAIN_BONUSES, COMBO_DEFINITIONS } from '../../server/src/combat/comboManager';

describe('ComboManager', () => {
  let cm: ComboManager;

  beforeEach(() => {
    cm = new ComboManager();
    vi.restoreAllMocks();
  });

  // ── 1. Correct combo triggers on matching skill sequence ──

  it('1. triggers ek_stun_combo when correct 3-skill sequence is used', () => {
    const classId = 'ether_knight';
    const playerId = 'p1';

    cm.recordSkillUse(playerId, 'ek_charge', classId);
    cm.recordSkillUse(playerId, 'ek_ether_slash', classId);
    const result = cm.recordSkillUse(playerId, 'ek_shield_bash', classId);

    expect(result.combo).not.toBeNull();
    expect(result.combo!.id).toBe('ek_stun_combo');
    expect(result.combo!.damageBonus).toBe(40);
  });

  // ── 2. Wrong sequence does not trigger combo ──

  it('2. does not trigger combo when skill sequence is wrong', () => {
    const classId = 'ether_knight';
    const playerId = 'p1';

    cm.recordSkillUse(playerId, 'ek_ether_slash', classId);
    cm.recordSkillUse(playerId, 'ek_charge', classId);
    const result = cm.recordSkillUse(playerId, 'ek_shield_bash', classId);

    expect(result.combo).toBeNull();
  });

  // ── 3. Combo window expiry resets skill history ──

  it('3. skills outside the 3-second combo window are pruned', () => {
    const classId = 'ether_knight';
    const playerId = 'p1';

    // Record first skill at time 0
    const originalDateNow = Date.now;
    let mockTime = 1000;
    vi.spyOn(Date, 'now').mockImplementation(() => mockTime);

    cm.recordSkillUse(playerId, 'ek_charge', classId);

    // Advance time by 4 seconds (past the 3s combo window)
    mockTime += 4000;
    cm.recordSkillUse(playerId, 'ek_ether_slash', classId);
    const result = cm.recordSkillUse(playerId, 'ek_shield_bash', classId);

    // Should NOT match because ek_charge was pruned
    expect(result.combo).toBeNull();
  });

  // ── 4. Chain bonus at 10 hits ──

  it('4. chain bonus activates at 10 hits with 1.10 multiplier', () => {
    const playerId = 'p1';
    const classId = 'ether_knight';
    let result;

    for (let i = 0; i < 10; i++) {
      result = cm.recordSkillUse(playerId, 'ek_charge', classId, 1);
    }

    expect(result!.hitCount).toBe(10);
    expect(result!.chainLabel).toBe('10 HITS!');
    // No combo matched, so totalMultiplier = 1.0 (combo) * 1.10 (chain) = 1.10
    expect(result!.totalMultiplier).toBeCloseTo(1.10, 2);
  });

  // ── 5. Chain bonus at 30 hits ──

  it('5. chain bonus escalates to 1.25 at 30 hits', () => {
    const playerId = 'p1';
    const classId = 'ether_knight';
    let result;

    for (let i = 0; i < 30; i++) {
      result = cm.recordSkillUse(playerId, 'ek_charge', classId, 1);
    }

    expect(result!.hitCount).toBe(30);
    expect(result!.chainLabel).toBe('30 HITS!!');
    expect(result!.totalMultiplier).toBeCloseTo(1.25, 2);
  });

  // ── 6. Chain bonus at 50 hits ──

  it('6. chain bonus escalates to 1.50 at 50 hits', () => {
    const playerId = 'p1';
    const classId = 'ether_knight';
    let result;

    for (let i = 0; i < 50; i++) {
      result = cm.recordSkillUse(playerId, 'ek_charge', classId, 1);
    }

    expect(result!.hitCount).toBe(50);
    expect(result!.chainLabel).toBe('50 HITS!!!');
    expect(result!.totalMultiplier).toBeCloseTo(1.50, 2);
  });

  // ── 7. Combo hint generation ──

  it('7. provides next-skill hints when partial combo sequence is entered', () => {
    const classId = 'ether_knight';
    const playerId = 'p1';

    cm.recordSkillUse(playerId, 'ek_charge', classId);

    const hints = cm.getNextHint(playerId, classId);

    // ek_charge is the first skill of ek_stun_combo and ek_thunder_combo
    expect(hints.length).toBeGreaterThanOrEqual(1);

    const stunHint = hints.find(h => h.comboName === '전격 강타');
    expect(stunHint).toBeDefined();
    expect(stunHint!.nextSkill).toBe('ek_ether_slash');
    expect(stunHint!.progress).toBeCloseTo(1 / 3, 2);
  });

  // ── 8. Player state reset clears history and hit count ──

  it('8. resetPlayer clears all state for the player', () => {
    const playerId = 'p1';
    const classId = 'ether_knight';

    cm.recordSkillUse(playerId, 'ek_charge', classId, 5);
    expect(cm.getHitCount(playerId)).toBe(5);

    cm.resetPlayer(playerId);

    expect(cm.getHitCount(playerId)).toBe(0);
    expect(cm.getNextHint(playerId, classId)).toEqual([]);
  });

  // ── 9. Combo multiplier combines with chain multiplier ──

  it('9. totalMultiplier = comboMultiplier * chainMultiplier', () => {
    const playerId = 'p1';
    const classId = 'ether_knight';

    // Build up 10 hits first so chain bonus kicks in
    for (let i = 0; i < 8; i++) {
      cm.recordSkillUse(playerId, 'some_skill', classId, 1);
    }

    // Now enter the combo sequence (adds 3 more hits = 11 total, triggers 10 HITS!)
    cm.recordSkillUse(playerId, 'ek_charge', classId, 1);
    cm.recordSkillUse(playerId, 'ek_ether_slash', classId, 1);
    const result = cm.recordSkillUse(playerId, 'ek_shield_bash', classId, 1);

    expect(result.combo).not.toBeNull();
    expect(result.hitCount).toBe(11);
    // combo: 1 + 40/100 = 1.4, chain: 1.10 => 1.4 * 1.10 = 1.54
    expect(result.totalMultiplier).toBeCloseTo(1.4 * 1.10, 2);
  });

  // ── 10. Cross-class combo does not trigger ──

  it('10. skill sequence from wrong class does not trigger combo', () => {
    const playerId = 'p1';
    // Use shadow_weaver skills but claim class is ether_knight
    cm.recordSkillUse(playerId, 'sw_stealth', 'ether_knight');
    cm.recordSkillUse(playerId, 'sw_vital_strike', 'ether_knight');
    const result = cm.recordSkillUse(playerId, 'sw_deadly_poison', 'ether_knight');

    expect(result.combo).toBeNull();
  });

  // ── 11. Chain hit counter resets after 3 second decay ──

  it('11. hit counter resets after chain decay window (3s)', () => {
    const playerId = 'p1';
    const classId = 'ether_knight';

    let mockTime = 10000;
    vi.spyOn(Date, 'now').mockImplementation(() => mockTime);

    cm.recordSkillUse(playerId, 'ek_charge', classId, 5);
    expect(cm.getHitCount(playerId)).toBe(5);

    // Advance past 3s decay
    mockTime += 4000;
    expect(cm.getHitCount(playerId)).toBe(0);
  });

  // ── E-S1: COMBO_DEFINITIONS 데이터 회귀 ──

  it('12. COMBO_DEFINITIONS 30개 — 6 클래스 × 5 (E-S1 mb/tg/vw 추가 후)', () => {
    expect(COMBO_DEFINITIONS.length).toBe(30);
  });

  it('13. 모든 6 클래스 콤보 5개씩', () => {
    const byClass: Record<string, number> = {};
    for (const c of COMBO_DEFINITIONS) {
      byClass[c.classId] = (byClass[c.classId] ?? 0) + 1;
    }
    expect(byClass).toEqual({
      ether_knight: 5,
      memory_weaver: 5,
      shadow_weaver: 5,
      memory_breaker: 5,
      time_guardian: 5,
      void_wanderer: 5,
    });
  });

  it('14. 모든 콤보 id 유니크', () => {
    const ids = COMBO_DEFINITIONS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('15. 모든 콤보 skillSequence 길이 ≥ 2', () => {
    for (const c of COMBO_DEFINITIONS) {
      expect(c.skillSequence.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('16. mb/tg/vw 신규 15 콤보 — 클래스 prefix 와 skill prefix 일치', () => {
    const newClasses = ['memory_breaker', 'time_guardian', 'void_wanderer'];
    const prefixMap: Record<string, string> = {
      memory_breaker: 'mb_',
      time_guardian: 'tg_',
      void_wanderer: 'vw_',
    };
    for (const c of COMBO_DEFINITIONS.filter((c) => newClasses.includes(c.classId))) {
      const expected = prefixMap[c.classId];
      for (const sk of c.skillSequence) {
        expect(sk.startsWith(expected)).toBe(true);
      }
    }
  });
});
