/**
 * 유닛 테스트 — monsterAI (10 tests)
 * 상태 머신, 어그로, 스킬 쿨다운, 보스 패턴, 드롭 테이블
 */
import { describe, test, expect } from 'vitest';

// ── 타입/로직 재현 ──────────────────────────────────────────

type MonsterState = 'idle' | 'patrol' | 'chase' | 'attack' | 'flee' | 'dead';
type ElementType = 'neutral' | 'fire' | 'ice' | 'lightning' | 'earth' | 'dark' | 'light';

interface BehaviorConfig {
  aggro_range: number;
  patrol: boolean;
  flee_hp_pct: number;
  enrage_hp_pct: number;
}

interface DropEntry { itemId: string; rate: number; minQty: number; maxQty: number }
interface BossPhase { hpPercent: number; name: string; attackMultiplier: number }

function getNextState(current: MonsterState, hpPct: number, distToPlayer: number, config: BehaviorConfig): MonsterState {
  if (hpPct <= 0) return 'dead';
  if (config.flee_hp_pct > 0 && hpPct <= config.flee_hp_pct) return 'flee';
  if (distToPlayer <= config.aggro_range && distToPlayer > 2) return 'chase';
  if (distToPlayer <= 2) return 'attack';
  if (config.patrol && current === 'idle') return 'patrol';
  return current === 'chase' || current === 'attack' ? 'idle' : current;
}

function isInAggroRange(distance: number, aggroRange: number): boolean {
  return distance <= aggroRange;
}

function canUseSkill(lastUsed: number, cooldown: number, now: number): boolean {
  return (now - lastUsed) >= cooldown * 1000;
}

function getCurrentBossPhase(hpPct: number, phases: BossPhase[]): BossPhase | null {
  const sorted = [...phases].sort((a, b) => b.hpPercent - a.hpPercent);
  for (const phase of sorted) {
    if (hpPct <= phase.hpPercent) return phase;
  }
  return null;
}

function isEnraged(hpPct: number, enrageThreshold: number): boolean {
  return enrageThreshold > 0 && hpPct <= enrageThreshold;
}

function calculateDrops(table: DropEntry[], roll: number): DropEntry[] {
  return table.filter(e => roll <= e.rate);
}

function getElementMultiplier(attack: ElementType, defense: ElementType): number {
  const advantages: Record<string, string> = { fire: 'ice', ice: 'lightning', lightning: 'earth', earth: 'fire', light: 'dark', dark: 'light' };
  if (advantages[attack] === defense) return 1.5;
  if (advantages[defense] === attack) return 0.75;
  return 1.0;
}

// ── 테스트 ──────────────────────────────────────────────────

describe('monsterAI', () => {
  const config: BehaviorConfig = { aggro_range: 10, patrol: true, flee_hp_pct: 10, enrage_hp_pct: 30 };

  // 1. idle → patrol 전환
  test('1. idle 상태에서 patrol 설정 시 patrol 전환', () => {
    expect(getNextState('idle', 100, 20, config)).toBe('patrol');
  });

  // 2. 어그로 범위 내 → chase
  test('2. 어그로 범위 내 진입 시 chase', () => {
    expect(getNextState('idle', 80, 5, config)).toBe('chase');
  });

  // 3. 근접 거리 → attack
  test('3. 근접 거리 시 attack', () => {
    expect(getNextState('chase', 80, 1.5, config)).toBe('attack');
  });

  // 4. HP 0 → dead
  test('4. HP 0 이하 시 dead', () => {
    expect(getNextState('attack', 0, 1, config)).toBe('dead');
  });

  // 5. 도주 HP% 이하 → flee
  test('5. HP 10% 이하 시 flee', () => {
    expect(getNextState('attack', 8, 1, config)).toBe('flee');
  });

  // 6. 스킬 쿨다운 확인
  test('6. 쿨다운 경과 시 스킬 사용 가능', () => {
    expect(canUseSkill(1000, 5, 6001)).toBe(true);
    expect(canUseSkill(1000, 5, 5000)).toBe(false);
  });

  // 7. 보스 페이즈 전환
  test('7. HP% 기반 보스 페이즈 판정', () => {
    const phases: BossPhase[] = [
      { hpPercent: 75, name: '2페이즈', attackMultiplier: 1.5 },
      { hpPercent: 30, name: '3페이즈', attackMultiplier: 2.0 },
    ];
    expect(getCurrentBossPhase(50, phases)?.name).toBe('2페이즈');
    expect(getCurrentBossPhase(20, phases)?.name).toBe('3페이즈');
    expect(getCurrentBossPhase(90, phases)).toBeNull();
  });

  // 8. 광폭화 판정
  test('8. 광폭화 — HP 30% 이하', () => {
    expect(isEnraged(25, 30)).toBe(true);
    expect(isEnraged(35, 30)).toBe(false);
  });

  // 9. 드롭 판정
  test('9. 드롭 테이블 — 확률 이내 아이템 획득', () => {
    const table: DropEntry[] = [
      { itemId: 'gold', rate: 1.0, minQty: 10, maxQty: 50 },
      { itemId: 'rare_gem', rate: 0.1, minQty: 1, maxQty: 1 },
    ];
    expect(calculateDrops(table, 0.05)).toHaveLength(2);
    expect(calculateDrops(table, 0.5)).toHaveLength(1);
  });

  // 10. 원소 상성
  test('10. 원소 상성 — fire→ice=1.5배, ice→fire=0.75배', () => {
    expect(getElementMultiplier('fire', 'ice')).toBe(1.5);
    expect(getElementMultiplier('ice', 'fire')).toBe(0.75);
    expect(getElementMultiplier('fire', 'dark')).toBe(1.0);
  });
});
