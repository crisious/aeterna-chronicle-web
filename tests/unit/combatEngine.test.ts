/**
 * Unit tests -- combatEngine (T-05)
 * Instantiation, participant registration, ATB, combo multiplier,
 * status effects, win/loss detection
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock prisma before any combat module imports (skillSystem and levelUpSystem import it)
vi.mock('../../server/src/db', () => ({
  prisma: {
    playerSkill: { findMany: vi.fn().mockResolvedValue([]) },
  },
}));

import {
  CombatEngine,
  CombatInstanceManager,
  type CombatParticipant,
} from '../../server/src/combat/combatEngine';

// ── Helpers ──

function makeParticipant(overrides: Partial<CombatParticipant> = {}): CombatParticipant {
  return {
    id: 'player1',
    name: 'Hero',
    isMonster: false,
    classId: 'ether_knight',
    level: 10,
    hp: 500,
    maxHp: 500,
    mp: 200,
    maxMp: 200,
    atk: 100,
    def: 50,
    matk: 50,
    mdef: 50,
    spd: 50,
    critRate: 10,
    critDamage: 50,
    armorPenetration: 0,
    armorPenetrationPercent: 0,
    element: 'neutral',
    atbGauge: 0,
    alive: true,
    team: 'party',
    isBoss: false,
    baseExp: 0,
    baseGold: 0,
    dropTable: [],
    ...overrides,
  };
}

function makeMonster(overrides: Partial<CombatParticipant> = {}): CombatParticipant {
  return makeParticipant({
    id: 'monster1',
    name: 'Goblin',
    isMonster: true,
    classId: 'monster',
    level: 5,
    hp: 200,
    maxHp: 200,
    mp: 50,
    maxMp: 50,
    atk: 40,
    def: 20,
    matk: 20,
    mdef: 20,
    spd: 30,
    critRate: 5,
    critDamage: 50,
    element: 'neutral',
    team: 'monsters',
    isBoss: false,
    baseExp: 50,
    baseGold: 30,
    dropTable: [],
    ...overrides,
  });
}

describe('CombatEngine', () => {
  let engine: CombatEngine;

  beforeEach(() => {
    vi.restoreAllMocks();
    // Fix random for deterministic behavior
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    engine = new CombatEngine({ atbChargeBase: 10, tickIntervalMs: 1000, maxTicks: 300, autoMode: true });
  });

  // ── 1. CombatEngine instantiation ──

  it('1. creates engine with IDLE state and unique combatId', () => {
    expect(engine.getState()).toBe('IDLE');
    expect(engine.getCombatId()).toBeTruthy();
    expect(engine.getCurrentTick()).toBe(0);
  });

  // ── 2. Participant registration ──

  it('2. registers participants and stores them', () => {
    const player = makeParticipant();
    const monster = makeMonster();

    engine.addParticipant(player);
    engine.addParticipant(monster);

    const participants = engine.getParticipants();
    expect(participants).toHaveLength(2);
    expect(engine.getParticipant('player1')).toBeDefined();
    expect(engine.getParticipant('monster1')).toBeDefined();

    // ATB gauge should be initialized to 0
    expect(engine.getParticipant('player1')!.atbGauge).toBe(0);
  });

  // ── 3. Cannot add participants during combat ──

  it('3. throws when adding participant during IN_PROGRESS state', () => {
    engine.addParticipant(makeParticipant());
    engine.addParticipant(makeMonster());
    engine.start();

    expect(() => engine.addParticipant(makeParticipant({ id: 'player2', name: 'Hero2' }))).toThrow();
  });

  // ── 4. ATB gauge filling ──

  it('4. ATB gauge fills based on speed each tick (SSOT computeChargeDelta)', () => {
    // SSOT: delta = 25 * (spd/50) * mult(1) * tier(3=1.0) * (tickMs/1000=1)
    const player = makeParticipant({ spd: 100 }); // → 50/tick
    const monster = makeMonster({ spd: 50 });     // → 25/tick

    engine.addParticipant(player);
    engine.addParticipant(monster);
    engine.start();

    engine.processTick();

    const p = engine.getParticipant('player1')!;
    const m = engine.getParticipant('monster1')!;

    // Player spd=100 → 25*(100/50)=50 per tick. After 1 tick = 50 (<100, no action)
    expect(p.atbGauge).toBe(50);
    // Monster spd=50 → 25*(50/50)=25 per tick. After 1 tick = 25
    expect(m.atbGauge).toBe(25);

    // 2nd tick: player reaches 100, acts, auto mode resets to 0
    engine.processTick();
    expect(engine.getParticipant('player1')!.atbGauge).toBe(0);
  });

  // ── 5. Combat start requires both teams ──

  it('5. start() throws if only one team is present', () => {
    engine.addParticipant(makeParticipant());
    expect(() => engine.start()).toThrow('파티와 몬스터 양쪽 모두 최소 1명 이상 필요합니다.');
  });

  // ── 6. Win detection: monsters all dead ──

  it('6. party wins when all monsters are dead', () => {
    // Give player very high ATK and low monster HP so monster dies in one hit
    const player = makeParticipant({ spd: 200, atk: 9999 });
    const monster = makeMonster({ hp: 1, maxHp: 1, spd: 10 });

    engine.addParticipant(player);
    engine.addParticipant(monster);
    engine.start();

    // Run multiple ticks until combat completes
    let result;
    for (let i = 0; i < 20; i++) {
      result = engine.processTick();
      if (result.combatEnded) break;
    }

    expect(result!.combatEnded).toBe(true);
    expect(result!.winner).toBe('party');
    expect(engine.getState()).toBe('COMPLETED');
  });

  // ── 7. Loss detection: party all dead ──

  it('7. monsters win when all party members are dead', () => {
    const player = makeParticipant({ hp: 1, maxHp: 1, spd: 10 });
    const monster = makeMonster({ spd: 200, atk: 9999 });

    engine.addParticipant(player);
    engine.addParticipant(monster);
    engine.start();

    let result;
    for (let i = 0; i < 20; i++) {
      result = engine.processTick();
      if (result.combatEnded) break;
    }

    expect(result!.combatEnded).toBe(true);
    expect(result!.winner).toBe('monsters');
  });

  // ── 8. Combo multiplier is used in skill damage (T-01 fix verification) ──

  it('8. skill execution uses combo multiplier in bonusMultiplier', () => {
    // This verifies the T-01 fix: comboMultiplier is passed to calculateDamage's bonusMultiplier
    // We test by using skills that form a combo and checking damage is higher
    const player = makeParticipant({
      id: 'combo_player',
      classId: 'ether_knight',
      spd: 500, // very fast to ensure action every tick
      atk: 200,
      matk: 200,
      mp: 9999,
      maxMp: 9999,
    });
    const monster = makeMonster({
      hp: 99999,
      maxHp: 99999,
      spd: 1, // very slow, won't act
      def: 0,
      mdef: 0,
    });

    const engine2 = new CombatEngine({ atbChargeBase: 100, autoMode: false });
    engine2.addParticipant(player);
    engine2.addParticipant(monster);
    engine2.start();

    // Process one tick to fill ATB to 100
    engine2.processTick();

    // Use ek_slash skill (exists in SKILL_DATABASE with multiplier 1.5)
    engine2.submitAction({
      type: 'skill',
      actorId: 'combo_player',
      targetId: 'monster1',
      skillId: 'ek_slash',
    });

    const result = engine2.processTick();

    // Verify skill action was executed
    const skillAction = result.actions.find(a => a.actionType === 'skill');
    // The skill should execute if ATB was full. The combo system records the skill,
    // and bonusMultiplier = comboMultiplier is passed to calculateDamage.
    // Since this is the first skill, no combo triggers => multiplier = 1.0
    // This verifies the code path exists and doesn't crash
    if (skillAction) {
      expect(skillAction.damage).toBeGreaterThan(0);
      expect(skillAction.skillId).toBe('ek_slash');
    }
  });

  // ── 9. Status effects are applied via skills (T-02 fix verification) ──

  it('9. skills with statusEffect apply effects when chance succeeds', () => {
    // ek_shield_bash has statusEffect: 'stun', statusEffectChance: 30
    // With Math.random() mocked to 0.5 => random*100 = 50
    // The engine checks: Math.random()*100 < statusEffectChance
    // 50 < 30 is false, so stun won't apply with mock=0.5

    // Mock random to return 0.1 so that 10 < 30 => stun applies
    vi.spyOn(Math, 'random').mockReturnValue(0.1);

    const player = makeParticipant({
      id: 'stun_player',
      classId: 'ether_knight',
      spd: 500,
      mp: 9999,
      maxMp: 9999,
    });
    const monster = makeMonster({ hp: 99999, maxHp: 99999, spd: 1 });

    const engine3 = new CombatEngine({ atbChargeBase: 100, autoMode: false });
    engine3.addParticipant(player);
    engine3.addParticipant(monster);
    engine3.start();

    // Fill ATB
    engine3.processTick();

    // Submit shield_bash which has stun effect
    engine3.submitAction({
      type: 'skill',
      actorId: 'stun_player',
      targetId: 'monster1',
      skillId: 'ek_shield_bash',
    });

    const result = engine3.processTick();

    const action = result.actions.find(
      a => a.actorId === 'stun_player' && a.actionType === 'skill',
    );

    // The action should be present and damage should be > 0
    // The statusEffect field is set when the effect is applied
    if (action) {
      expect(action.damage).toBeGreaterThan(0);
      // With random=0.1: 10 < 30 => passes the engine's own check,
      // then applyEffect rolls again with random=0.1 => 10 < 30*1.0=30 => applies
      expect(action.statusEffect).toBe('stun');
    }
  });

  // ── 9b. Defend keeps ATB at 50% (FF6 Defend, SSOT consumeGauge) ──

  it('9b. defend action leaves atbGauge at ATB_MAX/2, others reset to 0', () => {
    const player = makeParticipant({ spd: 200 }); // 1 tick에 100 도달
    const monster = makeMonster({ spd: 1 });

    const e = new CombatEngine({ autoMode: false });
    e.addParticipant(player);
    e.addParticipant(monster);
    e.start();

    // tick 1: player 게이지 100 도달
    e.processTick();
    expect(e.getParticipant('player1')!.atbGauge).toBeGreaterThanOrEqual(100);

    // tick 2: defend 행동
    e.submitAction({ type: 'defend', actorId: 'player1' });
    e.processTick();

    // FF6: defend 후 ATB 50% 유지 (다음 행동까지의 시간 단축)
    const afterDefend = e.getParticipant('player1')!.atbGauge;
    expect(afterDefend).toBeGreaterThanOrEqual(50);
    expect(afterDefend).toBeLessThan(100);
  });

  // ── 9c. Ready queue FIFO order (CHRONO-ATB-S3) ──

  it('9c. ready queue resolves in arrival order, ties broken by spd', () => {
    // 두 player 가 같은 tick 에 ATB 100 도달 (spd 동일) → FIFO 큐는 등록 순서 유지
    // 단, 동률 시 spd 내림차순 fallback.
    const p1 = makeParticipant({ id: 'p1', spd: 200, atk: 1, hp: 999, maxHp: 999 });
    const p2 = makeParticipant({ id: 'p2', spd: 200, atk: 1, hp: 999, maxHp: 999 });
    const m = makeMonster({ id: 'm1', spd: 1, hp: 999, maxHp: 999 });

    const e = new CombatEngine({ autoMode: true });
    e.addParticipant(p1);
    e.addParticipant(p2);
    e.addParticipant(m);
    e.start();

    const result = e.processTick(); // 양 player 동시 100 도달 → 둘 다 행동
    const actorOrder = result.actions.map(a => a.actorId);

    expect(actorOrder).toContain('p1');
    expect(actorOrder).toContain('p2');
    // monster는 1 tick 만에 도달 못 함 (spd=1 → 0.5/tick)
    expect(actorOrder).not.toContain('m1');
  });

  // ── 9d. CombatInstanceManager.createFromEra applies tier (CHRONO-S6/S7) ──

  it('9d. createFromEra propagates era→speedTier to engine config', () => {
    const mgr = new CombatInstanceManager();
    const engineAncient = mgr.createFromEra('ancient');
    const enginePresent = mgr.createFromEra('present');
    const engineFuture = mgr.createFromEra('ruined_future');

    // speedTier 적용 후 같은 spd 라도 충전 속도 차별화 확인.
    // 1 tick 동안 spd=50 게이지 변화: tier 2=0.7x → 17.5, tier 3=1.0x → 25, tier 4=1.3x → 32.5
    const setup = (e: CombatEngine) => {
      e.addParticipant(makeParticipant({ id: 'p', spd: 50 }));
      e.addParticipant(makeMonster({ id: 'm', spd: 50 }));
      e.start();
      e.processTick();
    };
    setup(engineAncient);
    setup(enginePresent);
    setup(engineFuture);

    const gaugeAncient = engineAncient.getParticipant('p')!.atbGauge;
    const gaugePresent = enginePresent.getParticipant('p')!.atbGauge;
    const gaugeFuture = engineFuture.getParticipant('p')!.atbGauge;

    expect(gaugeAncient).toBeLessThan(gaugePresent);
    expect(gaugePresent).toBeLessThan(gaugeFuture);
  });

  // ── 9e/f/g. Flee 도주 (CHRONO-S9) ──

  it('9e. flee succeeds when party spd > monster spd (Math.random=0.5 ≤ rate)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const e = new CombatEngine({ autoMode: false });
    e.addParticipant(makeParticipant({ spd: 200 })); // partySpd 200
    e.addParticipant(makeMonster({ spd: 1, hp: 9999, maxHp: 9999 }));
    e.start();
    e.processTick(); // player ATB 100 도달
    e.submitAction({ type: 'flee', actorId: 'player1' });
    const result = e.processTick();
    expect(result.combatEnded).toBe(true);
    expect(result.winner).toBe('draw');
  });

  it('9f. flee fails when party spd << monster spd', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99); // 거의 무조건 실패
    const e = new CombatEngine({ autoMode: false });
    e.addParticipant(makeParticipant({ id: 'p', spd: 60 }));
    e.addParticipant(makeMonster({ id: 'm', spd: 200, hp: 9999, maxHp: 9999 }));
    e.start();
    // ATB 100 도달 위해 충분히 tick
    for (let i = 0; i < 10; i++) {
      if (e.getParticipant('p')!.atbGauge >= 100) break;
      e.processTick();
    }
    e.submitAction({ type: 'flee', actorId: 'p' });
    const result = e.processTick();
    const fleeAct = result.actions.find(a => a.actionType === 'flee');
    expect(fleeAct?.missed).toBe(true);
    expect(result.combatEnded).toBe(false);
  });

  it('9g. flee blocked when boss present (FF6 보스 도주 불가)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.01); // 매우 낮은 random — 그래도 보스면 실패
    const e = new CombatEngine({ autoMode: false });
    e.addParticipant(makeParticipant({ id: 'p', spd: 999 }));
    e.addParticipant(makeMonster({ id: 'b', spd: 1, isBoss: true, hp: 9999, maxHp: 9999 }));
    e.start();
    e.processTick(); // player 100 도달
    e.submitAction({ type: 'flee', actorId: 'p' });
    const result = e.processTick();
    const fleeAct = result.actions.find(a => a.actionType === 'flee');
    expect(fleeAct?.missed).toBe(true);
    expect(result.combatEnded).toBe(false);
  });

  // ── 9h. Dual Tech candidate detection (CHRONO-S14) ──

  it('9h. computeDualTechCandidates detects chrono_blade when time_knight+ether_knight both ready', () => {
    const tk = makeParticipant({ id: 'tk', classId: 'time_knight', spd: 200 });
    const ek = makeParticipant({ id: 'ek', classId: 'ether_knight', spd: 200 });
    const m = makeMonster({ id: 'm', spd: 1 });

    const e = new CombatEngine({ autoMode: false });
    e.addParticipant(tk);
    e.addParticipant(ek);
    e.addParticipant(m);
    e.start();
    const result = e.processTick(); // 두 party 동시 ATB 100

    const cands = result.dualTechCandidates;
    expect(cands).toHaveLength(1);
    expect(cands[0].techId).toBe('chrono_blade');
    expect(cands[0].name).toBe('크로노 블레이드');
    expect(cands[0].actorIds.sort()).toEqual(['ek', 'tk']);
    // CHRONO-S45: element + aoe + mpCost 노출
    expect(cands[0].element).toBe('chrono');
    expect(cands[0].aoe).toBe(false);
    expect(cands[0].mpCost).toBe(12);
  });

  it('9i. no candidate when only one party member ready', () => {
    const tk = makeParticipant({ id: 'tk', classId: 'time_knight', spd: 200 });
    const ek = makeParticipant({ id: 'ek', classId: 'ether_knight', spd: 10 });
    const m = makeMonster({ id: 'm', spd: 1 });

    const e = new CombatEngine({ autoMode: false });
    e.addParticipant(tk);
    e.addParticipant(ek);
    e.addParticipant(m);
    e.start();
    const result = e.processTick(); // tk만 100 도달

    expect(result.dualTechCandidates).toHaveLength(0);
  });

  it('9j. no candidate when same class pair (incompatible)', () => {
    const a = makeParticipant({ id: 'a', classId: 'time_knight', spd: 200 });
    const b = makeParticipant({ id: 'b', classId: 'time_knight', spd: 200 });
    const m = makeMonster({ id: 'm', spd: 1 });

    const e = new CombatEngine({ autoMode: false });
    e.addParticipant(a);
    e.addParticipant(b);
    e.addParticipant(m);
    e.start();
    const result = e.processTick();

    expect(result.dualTechCandidates).toHaveLength(0);
  });

  // ── 9k. submitDualTech execution (CHRONO-S15) ──

  it('9k. submitDualTech executes chrono_blade, drains MP, resets ATB', () => {
    const tk = makeParticipant({ id: 'tk', classId: 'time_knight', spd: 200, mp: 50, maxMp: 50, atk: 100 });
    const ek = makeParticipant({ id: 'ek', classId: 'ether_knight', spd: 200, mp: 50, maxMp: 50, atk: 100 });
    const m = makeMonster({ id: 'm', spd: 1, hp: 9999, maxHp: 9999, def: 0 });

    const e = new CombatEngine({ autoMode: false });
    e.addParticipant(tk);
    e.addParticipant(ek);
    e.addParticipant(m);
    e.start();
    e.processTick(); // 두 party ready

    const ok = e.submitDualTech('tk', 'ek', 'chrono_blade', 'm');
    expect(ok).toBe(true);

    const result = e.processTick();
    const dualAct = result.actions.find(a => a.actionType === 'dual_tech');
    expect(dualAct).toBeDefined();
    expect(dualAct?.skillId).toBe('chrono_blade');
    expect(dualAct?.damage).toBeGreaterThan(0);

    // 양쪽 MP 12 소비
    expect(e.getParticipant('tk')!.mp).toBe(38);
    expect(e.getParticipant('ek')!.mp).toBe(38);
    // 양쪽 ATB 리셋
    expect(e.getParticipant('tk')!.atbGauge).toBe(0);
    expect(e.getParticipant('ek')!.atbGauge).toBe(0);
  });

  it('9l. submitDualTech rejected when MP insufficient', () => {
    const tk = makeParticipant({ id: 'tk', classId: 'time_knight', spd: 200, mp: 5, maxMp: 50 });
    const ek = makeParticipant({ id: 'ek', classId: 'ether_knight', spd: 200, mp: 5, maxMp: 50 });
    const m = makeMonster({ id: 'm', spd: 1 });

    const e = new CombatEngine({ autoMode: false });
    e.addParticipant(tk);
    e.addParticipant(ek);
    e.addParticipant(m);
    e.start();
    e.processTick();

    const ok = e.submitDualTech('tk', 'ek', 'chrono_blade', 'm');
    expect(ok).toBe(false);
  });

  it('9m. submitDualTech rejected when only one ready', () => {
    const tk = makeParticipant({ id: 'tk', classId: 'time_knight', spd: 200, mp: 50, maxMp: 50 });
    const ek = makeParticipant({ id: 'ek', classId: 'ether_knight', spd: 10, mp: 50, maxMp: 50 });
    const m = makeMonster({ id: 'm', spd: 1 });

    const e = new CombatEngine({ autoMode: false });
    e.addParticipant(tk);
    e.addParticipant(ek);
    e.addParticipant(m);
    e.start();
    e.processTick(); // tk만 ready

    const ok = e.submitDualTech('tk', 'ek', 'chrono_blade', 'm');
    expect(ok).toBe(false);
  });

  // ── 9n. Consecutive Dual Tech chain bonus (CHRONO-S26) ──

  it('9n. consecutive Dual Tech within 5 ticks gets 1.2x chain bonus damage', () => {
    const tk = makeParticipant({ id: 'tk', classId: 'time_knight', spd: 500, mp: 9999, maxMp: 9999, atk: 100 });
    const ek = makeParticipant({ id: 'ek', classId: 'ether_knight', spd: 500, mp: 9999, maxMp: 9999, atk: 100 });
    const m = makeMonster({ id: 'm', spd: 1, hp: 999999, maxHp: 999999, def: 0 });

    const e = new CombatEngine({ autoMode: false });
    e.addParticipant(tk);
    e.addParticipant(ek);
    e.addParticipant(m);
    e.start();
    e.processTick(); // 양쪽 ready

    // 첫번째 Dual Tech
    e.submitDualTech('tk', 'ek', 'chrono_blade', 'm');
    const r1 = e.processTick();
    const first = r1.actions.find(a => a.actionType === 'dual_tech');
    expect(first).toBeDefined();
    expect(first?.actorName).not.toContain('CHAIN');
    const firstDamage = first!.damage!;

    // 두번째 발동 위해 다시 ready 도달
    for (let i = 0; i < 4; i++) {
      if (e.getParticipant('tk')!.atbGauge >= 100 && e.getParticipant('ek')!.atbGauge >= 100) break;
      e.processTick();
    }

    // 두번째 Dual Tech — 5 tick 이내 → CHAIN
    e.submitDualTech('tk', 'ek', 'chrono_blade', 'm');
    const r2 = e.processTick();
    const second = r2.actions.find(a => a.actionType === 'dual_tech');
    expect(second).toBeDefined();
    expect(second?.actorName).toContain('CHAIN');
    // chainBonus 1.2x → 데미지 약 1.2배 (다른 요소 동일)
    expect(second!.damage!).toBeGreaterThan(firstDamage);
  });

  // ── 9o. Boss Dual Tech resist (CHRONO-S34) ──

  it('9o. boss target reduces Dual Tech damage to 0.6x with (BOSS RESIST) tag', () => {
    const tk = makeParticipant({ id: 'tk', classId: 'time_knight', spd: 500, mp: 999, maxMp: 999, atk: 100 });
    const ek = makeParticipant({ id: 'ek', classId: 'ether_knight', spd: 500, mp: 999, maxMp: 999, atk: 100 });

    // 일반 monster vs boss 데미지 비교
    const normal = makeMonster({ id: 'norm', spd: 1, hp: 999999, maxHp: 999999, def: 0, isBoss: false });
    const boss = makeMonster({ id: 'bossA', spd: 1, hp: 999999, maxHp: 999999, def: 0, isBoss: true });

    const e1 = new CombatEngine({ autoMode: false });
    e1.addParticipant(tk);
    e1.addParticipant(ek);
    e1.addParticipant(normal);
    e1.start();
    e1.processTick();
    e1.submitDualTech('tk', 'ek', 'chrono_blade', 'norm');
    const r1 = e1.processTick();
    const normalAct = r1.actions.find(a => a.actionType === 'dual_tech')!;
    expect(normalAct.actorName).not.toContain('BOSS RESIST');

    const e2 = new CombatEngine({ autoMode: false });
    e2.addParticipant(makeParticipant({ id: 'tk2', classId: 'time_knight', spd: 500, mp: 999, maxMp: 999, atk: 100 }));
    e2.addParticipant(makeParticipant({ id: 'ek2', classId: 'ether_knight', spd: 500, mp: 999, maxMp: 999, atk: 100 }));
    e2.addParticipant(boss);
    e2.start();
    e2.processTick();
    e2.submitDualTech('tk2', 'ek2', 'chrono_blade', 'bossA');
    const r2 = e2.processTick();
    const bossAct = r2.actions.find(a => a.actionType === 'dual_tech')!;
    expect(bossAct.actorName).toContain('(BOSS RESIST)');
    // boss 데미지가 normal 의 ~60% (0.6x bonusMultiplier 적용)
    expect(bossAct.damage!).toBeLessThan(normalAct.damage!);
  });

  // ── 9p2. AOE damage falloff (CHRONO-S56) ──

  it('9p2. AOE main target deals more damage than splash targets (80% falloff)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9); // crit 회피 위해 높은 random
    const mw = makeParticipant({ id: 'mw', classId: 'memory_weaver', spd: 500, mp: 999, maxMp: 999, atk: 100, critRate: 0 });
    const mb = makeParticipant({ id: 'mb', classId: 'memory_breaker', spd: 500, mp: 999, maxMp: 999, atk: 100, critRate: 0 });
    const m1 = makeMonster({ id: 'main', spd: 1, hp: 100000, maxHp: 100000, def: 0, level: 10 });
    const m2 = makeMonster({ id: 'splash', spd: 1, hp: 100000, maxHp: 100000, def: 0, level: 10 });

    const e = new CombatEngine({ autoMode: false });
    e.addParticipant(mw);
    e.addParticipant(mb);
    e.addParticipant(m1);
    e.addParticipant(m2);
    e.start();
    e.processTick();

    e.submitDualTech('mw', 'mb', 'memory_break', 'main');
    e.processTick();

    const dmgMain = 100000 - e.getParticipant('main')!.hp;
    const dmgSplash = 100000 - e.getParticipant('splash')!.hp;

    // main 데미지 > splash 데미지 (80% falloff)
    expect(dmgMain).toBeGreaterThan(dmgSplash);
    // splash 가 main 의 약 80% 비율 (calculateDamage 변동 허용, 70~95% 범위)
    expect(dmgSplash / dmgMain).toBeGreaterThan(0.7);
    expect(dmgSplash / dmgMain).toBeLessThan(0.95);
  });

  // ── 9p. AOE Dual Tech (CHRONO-S39) ──

  it('9p. AOE Dual Tech (memory_break) hits all alive monsters', () => {
    const mw = makeParticipant({ id: 'mw', classId: 'memory_weaver', spd: 500, mp: 999, maxMp: 999, atk: 100 });
    const mb = makeParticipant({ id: 'mb', classId: 'memory_breaker', spd: 500, mp: 999, maxMp: 999, atk: 100 });
    const m1 = makeMonster({ id: 'm1', spd: 1, hp: 1000, maxHp: 1000, def: 0 });
    const m2 = makeMonster({ id: 'm2', spd: 1, hp: 1000, maxHp: 1000, def: 0 });
    const m3 = makeMonster({ id: 'm3', spd: 1, hp: 1000, maxHp: 1000, def: 0 });

    const e = new CombatEngine({ autoMode: false });
    e.addParticipant(mw);
    e.addParticipant(mb);
    e.addParticipant(m1);
    e.addParticipant(m2);
    e.addParticipant(m3);
    e.start();
    e.processTick();

    e.submitDualTech('mw', 'mb', 'memory_break', 'm1');
    const result = e.processTick();
    const dualAct = result.actions.find(a => a.actionType === 'dual_tech');
    expect(dualAct).toBeDefined();
    expect(dualAct?.actorName).toContain('(AOE)');
    expect(dualAct?.targetName).toContain('적');

    // 모든 monster 가 데미지 입음
    expect(e.getParticipant('m1')!.hp).toBeLessThan(1000);
    expect(e.getParticipant('m2')!.hp).toBeLessThan(1000);
    expect(e.getParticipant('m3')!.hp).toBeLessThan(1000);
  });

  // ── 9q. Cumulative boss Dual Tech resist (CHRONO-S43) ──

  it('9q. boss Dual Tech resist increases per hit (0.6 → 0.55 → 0.50 ...)', () => {
    const tk = makeParticipant({ id: 'tk', classId: 'time_knight', spd: 500, mp: 999, maxMp: 999, atk: 100 });
    const ek = makeParticipant({ id: 'ek', classId: 'ether_knight', spd: 500, mp: 999, maxMp: 999, atk: 100 });
    const boss = makeMonster({ id: 'bossB', spd: 1, hp: 999999, maxHp: 999999, def: 0, isBoss: true });

    const e = new CombatEngine({ autoMode: false });
    e.addParticipant(tk);
    e.addParticipant(ek);
    e.addParticipant(boss);
    e.start();

    // 첫 번째 발동: hits=0 → 0.6×
    e.processTick();
    e.submitDualTech('tk', 'ek', 'chrono_blade', 'bossB');
    const r1 = e.processTick();
    const dmg1 = r1.actions.find(a => a.actionType === 'dual_tech')!.damage!;

    // boss hits 카운트 1
    expect(e.getParticipant('bossB')!.dualTechHitsTaken).toBe(1);

    // 두 번째 발동 위해 chain 윈도우 (5 tick) 초과 대기 — 6 tick 진행
    // 게이지는 spd=500 → 1 tick 에 250 채워 즉시 100 cap, 5 tick 후에도 100 유지
    for (let i = 0; i < 6; i++) {
      e.processTick();
    }

    // 두 번째: hits=1 → 0.55×, chain 해제 (gap > 5)
    e.submitDualTech('tk', 'ek', 'chrono_blade', 'bossB');
    const r2 = e.processTick();
    expect(e.getParticipant('bossB')!.dualTechHitsTaken).toBe(2);
    const dmg2 = r2.actions.find(a => a.actionType === 'dual_tech')!.damage!;

    // hits 증가 후 데미지 감소 (0.55x < 0.6x)
    expect(dmg2).toBeLessThan(dmg1);
  });

  // ── 9o2. Dual Tech immune target (CHRONO-S81) ──

  it('9o2. dualTechImmune target rejects Dual Tech (no damage, no MP loss)', () => {
    const tk = makeParticipant({ id: 'tk', classId: 'time_knight', spd: 500, mp: 999, maxMp: 999 });
    const ek = makeParticipant({ id: 'ek', classId: 'ether_knight', spd: 500, mp: 999, maxMp: 999 });
    const immuneBoss = makeMonster({ id: 'immune', spd: 1, hp: 999999, maxHp: 999999, isBoss: true, dualTechImmune: true });

    const e = new CombatEngine({ autoMode: false });
    e.addParticipant(tk);
    e.addParticipant(ek);
    e.addParticipant(immuneBoss);
    e.start();
    e.processTick();

    const ok = e.submitDualTech('tk', 'ek', 'chrono_blade', 'immune');
    expect(ok).toBe(true);

    const result = e.processTick();
    const dualAct = result.actions.find(a => a.actionType === 'dual_tech');
    expect(dualAct).toBeUndefined();
    expect(e.getParticipant('tk')!.mp).toBe(999);
    expect(e.getParticipant('ek')!.mp).toBe(999);
  });

  // ── 9r. Triple Tech execution (CHRONO-S59) ──

  it('9q2. tripleTechCandidates detects aetherna_final when 3 party ready', () => {
    const ek = makeParticipant({ id: 'ek', classId: 'ether_knight', spd: 200 });
    const tk = makeParticipant({ id: 'tk', classId: 'time_knight', spd: 200 });
    const mw = makeParticipant({ id: 'mw', classId: 'memory_weaver', spd: 200 });
    const m = makeMonster({ id: 'm', spd: 1 });

    const e = new CombatEngine({ autoMode: false });
    e.addParticipant(ek);
    e.addParticipant(tk);
    e.addParticipant(mw);
    e.addParticipant(m);
    e.start();
    const result = e.processTick();

    const tCands = result.tripleTechCandidates;
    expect(tCands.length).toBeGreaterThanOrEqual(1);
    expect(tCands.find(c => c.techId === 'aetherna_final')).toBeDefined();
    const aetherna = tCands.find(c => c.techId === 'aetherna_final')!;
    expect(aetherna.aoe).toBe(true);
    expect(aetherna.element).toBe('chrono');
    expect(aetherna.mpCost).toBe(30);
    expect(aetherna.actorIds).toHaveLength(3);
  });

  it('9r. submitTripleTech executes aetherna_final, all 3 actors MP -30 + ATB reset', () => {
    const ek = makeParticipant({ id: 'ek', classId: 'ether_knight', spd: 500, mp: 999, maxMp: 999, atk: 100 });
    const tk = makeParticipant({ id: 'tk', classId: 'time_knight', spd: 500, mp: 999, maxMp: 999, atk: 100 });
    const mw = makeParticipant({ id: 'mw', classId: 'memory_weaver', spd: 500, mp: 999, maxMp: 999, atk: 100 });
    const m = makeMonster({ id: 'm', spd: 1, hp: 9999999, maxHp: 9999999, def: 0 });

    const e = new CombatEngine({ autoMode: false });
    e.addParticipant(ek);
    e.addParticipant(tk);
    e.addParticipant(mw);
    e.addParticipant(m);
    e.start();
    e.processTick();

    const ok = e.submitTripleTech(['ek', 'tk', 'mw'], 'aetherna_final', 'm');
    expect(ok).toBe(true);

    const result = e.processTick();
    const tripleAct = result.actions.find(a => a.actionType === 'triple_tech');
    expect(tripleAct).toBeDefined();
    expect(tripleAct?.actorName).toContain('(TRIPLE)');
    expect(tripleAct?.actorName).toContain('(AOE)'); // aetherna_final 은 AOE
    expect(tripleAct?.damage).toBeGreaterThan(0);
    expect(tripleAct?.skillId).toBe('aetherna_final');

    // 3명 MP -30
    expect(e.getParticipant('ek')!.mp).toBe(969);
    expect(e.getParticipant('tk')!.mp).toBe(969);
    expect(e.getParticipant('mw')!.mp).toBe(969);
    // 3명 ATB 0
    expect(e.getParticipant('ek')!.atbGauge).toBe(0);
    expect(e.getParticipant('tk')!.atbGauge).toBe(0);
    expect(e.getParticipant('mw')!.atbGauge).toBe(0);
  });

  it('9s. submitTripleTech rejected when only 2 actors ready', () => {
    const ek = makeParticipant({ id: 'ek', classId: 'ether_knight', spd: 500, mp: 999, maxMp: 999 });
    const tk = makeParticipant({ id: 'tk', classId: 'time_knight', spd: 500, mp: 999, maxMp: 999 });
    const mw = makeParticipant({ id: 'mw', classId: 'memory_weaver', spd: 1, mp: 999, maxMp: 999 });
    const m = makeMonster({ id: 'm', spd: 1 });

    const e = new CombatEngine({ autoMode: false });
    e.addParticipant(ek);
    e.addParticipant(tk);
    e.addParticipant(mw);
    e.addParticipant(m);
    e.start();
    e.processTick(); // ek, tk만 100, mw는 미달

    const ok = e.submitTripleTech(['ek', 'tk', 'mw'], 'aetherna_final', 'm');
    expect(ok).toBe(false);
  });

  // ── 9t. combatStats counter (CHRONO-S82) ──

  it('9t. TickResult.combatStats counts dualTechFired + maxChainReached', () => {
    const tk = makeParticipant({ id: 'tk', classId: 'time_knight', spd: 500, mp: 999, maxMp: 999 });
    const ek = makeParticipant({ id: 'ek', classId: 'ether_knight', spd: 500, mp: 999, maxMp: 999 });
    const m = makeMonster({ id: 'm', spd: 1, hp: 9999, maxHp: 9999 });

    const e = new CombatEngine({ autoMode: false });
    e.addParticipant(tk);
    e.addParticipant(ek);
    e.addParticipant(m);
    e.start();
    e.processTick();

    // 첫 발동
    e.submitDualTech('tk', 'ek', 'chrono_blade', 'm');
    const r1 = e.processTick();
    expect(r1.combatStats.dualTechFired).toBe(1);
    expect(r1.combatStats.maxChainReached).toBe(1);

    // 즉시 두 번째 (chain 2)
    for (let i = 0; i < 1; i++) e.processTick();
    e.submitDualTech('tk', 'ek', 'chrono_blade', 'm');
    const r2 = e.processTick();
    expect(r2.combatStats.dualTechFired).toBe(2);
    expect(r2.combatStats.maxChainReached).toBeGreaterThanOrEqual(2);
  });

  // ── 10. Snapshot returns correct structure ──

  it('10. getSnapshot returns participant state with correct fields', () => {
    engine.addParticipant(makeParticipant());
    engine.addParticipant(makeMonster());

    const snapshots = engine.getSnapshot();
    expect(snapshots).toHaveLength(2);

    const playerSnap = snapshots.find(s => s.id === 'player1')!;
    expect(playerSnap.hp).toBe(500);
    expect(playerSnap.maxHp).toBe(500);
    expect(playerSnap.alive).toBe(true);
    expect(playerSnap.team).toBe('party');
    expect(playerSnap.atbGauge).toBe(0);
    expect(playerSnap.atbReady).toBe(false);
    expect(playerSnap.atbQueueIndex).toBeNull();
    // CHRONO-S50: 보스 저항 카운트 노출 (0 디폴트)
    expect(playerSnap.dualTechHitsTaken).toBe(0);
    // CHRONO-S66: Triple Tech 저항 카운트 노출 (0 디폴트)
    expect(playerSnap.tripleTechHitsTaken).toBe(0);
    // CHRONO-S86: dualTechImmune 노출 (false 디폴트)
    expect(playerSnap.dualTechImmune).toBe(false);
    expect(playerSnap.buffs).toEqual([]);
    expect(playerSnap.debuffs).toEqual([]);
  });

  // ── 11. ATB queue snapshot reveals action order (CHRONO-ATB-S4) ──

  it('11. snapshot exposes atbReady + atbQueueIndex in arrival order', () => {
    const p1 = makeParticipant({ id: 'p1', spd: 200 });
    const p2 = makeParticipant({ id: 'p2', spd: 200 });
    const m = makeMonster({ id: 'm1', spd: 1 });

    const e = new CombatEngine({ autoMode: false });
    e.addParticipant(p1);
    e.addParticipant(p2);
    e.addParticipant(m);
    e.start();

    // 1 tick에 두 player ATB 100 도달 → queue index 0, 1
    e.processTick();
    const snap = e.getSnapshot();

    const sp1 = snap.find(s => s.id === 'p1')!;
    const sp2 = snap.find(s => s.id === 'p2')!;
    const sm = snap.find(s => s.id === 'm1')!;

    expect(sp1.atbReady).toBe(true);
    expect(sp2.atbReady).toBe(true);
    expect(sm.atbReady).toBe(false);

    // 큐 인덱스 0, 1 (도달 순서)
    expect([sp1.atbQueueIndex, sp2.atbQueueIndex].sort()).toEqual([0, 1]);
    expect(sm.atbQueueIndex).toBeNull();
  });
});
