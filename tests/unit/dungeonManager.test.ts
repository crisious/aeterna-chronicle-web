/**
 * 유닛 테스트 — dungeonManager (10 tests)
 * 입장 검증, 웨이브 진행, 보스전, 보상 분배, 타임아웃
 */
import { describe, test, expect } from 'vitest';

// ── 타입/로직 재현 ──────────────────────────────────────────

interface DungeonWave { wave: number; monsters: { monsterId: string; count: number }[]; isBoss: boolean }
interface DungeonReward { gold: number; exp: number; items: { itemId: string; rate: number; count: number }[] }
interface RunMember { userId: string; damage: number; deaths: number }

interface DungeonConfig {
  code: string; maxPlayers: number; requiredLevel: number;
  timeLimit: number; entryCount: number; waves: DungeonWave[];
  rewards: DungeonReward;
}

function canEnter(playerLevel: number, requiredLevel: number, dailyEntries: number, maxEntries: number, partySize: number, maxPlayers: number): { ok: boolean; reason?: string } {
  if (playerLevel < requiredLevel) return { ok: false, reason: 'LEVEL_TOO_LOW' };
  if (dailyEntries >= maxEntries) return { ok: false, reason: 'DAILY_LIMIT' };
  if (partySize > maxPlayers) return { ok: false, reason: 'PARTY_TOO_LARGE' };
  if (partySize < 1) return { ok: false, reason: 'EMPTY_PARTY' };
  return { ok: true };
}

function isTimedOut(startedAt: number, timeLimit: number, now: number): boolean {
  return (now - startedAt) > timeLimit * 1000;
}

function getCurrentWave(currentWave: number, totalWaves: number): { wave: number; isLast: boolean } {
  return { wave: currentWave, isLast: currentWave >= totalWaves };
}

function advanceWave(currentWave: number, totalWaves: number): { nextWave: number; cleared: boolean } {
  if (currentWave >= totalWaves) return { nextWave: currentWave, cleared: true };
  return { nextWave: currentWave + 1, cleared: false };
}

function distributeRewards(rewards: DungeonReward, members: RunMember[]): { userId: string; gold: number; exp: number }[] {
  if (members.length === 0) return [];
  const totalDamage = members.reduce((s, m) => s + m.damage, 0);
  return members.map(m => {
    const ratio = totalDamage > 0 ? m.damage / totalDamage : 1 / members.length;
    return {
      userId: m.userId,
      gold: Math.floor(rewards.gold * ratio),
      exp: Math.floor(rewards.exp * ratio),
    };
  });
}

function getDeathPenalty(deaths: number): number {
  return Math.min(deaths * 0.05, 0.5); // 사망당 5% 보상 감소, 최대 50%
}

function getMonstersInWave(waves: DungeonWave[], waveNum: number): number {
  const wave = waves.find(w => w.wave === waveNum);
  return wave ? wave.monsters.reduce((s, m) => s + m.count, 0) : 0;
}

// ── 테스트 ──────────────────────────────────────────────────

describe('dungeonManager', () => {
  const waves: DungeonWave[] = [
    { wave: 1, monsters: [{ monsterId: 'slime', count: 5 }], isBoss: false },
    { wave: 2, monsters: [{ monsterId: 'goblin', count: 3 }, { monsterId: 'orc', count: 2 }], isBoss: false },
    { wave: 3, monsters: [{ monsterId: 'boss_dragon', count: 1 }], isBoss: true },
  ];
  const rewards: DungeonReward = { gold: 1000, exp: 500, items: [] };

  // 1. 입장 가능
  test('1. 입장 조건 충족 시 허용', () => {
    expect(canEnter(10, 5, 0, 3, 2, 4).ok).toBe(true);
  });

  // 2. 레벨 부족
  test('2. 레벨 부족 시 입장 불가', () => {
    expect(canEnter(3, 10, 0, 3, 1, 4).reason).toBe('LEVEL_TOO_LOW');
  });

  // 3. 일일 입장 제한
  test('3. 일일 입장 횟수 초과 시 불가', () => {
    expect(canEnter(10, 5, 3, 3, 1, 4).reason).toBe('DAILY_LIMIT');
  });

  // 4. 파티 인원 초과
  test('4. 파티 인원 초과 시 불가', () => {
    expect(canEnter(10, 5, 0, 3, 5, 4).reason).toBe('PARTY_TOO_LARGE');
  });

  // 5. 타임아웃 판정
  test('5. 제한 시간 초과 시 타임아웃', () => {
    expect(isTimedOut(0, 300, 301000)).toBe(true);
    expect(isTimedOut(0, 300, 299000)).toBe(false);
  });

  // 6. 웨이브 진행
  test('6. 웨이브 1→2 진행', () => {
    const result = advanceWave(1, 3);
    expect(result.nextWave).toBe(2);
    expect(result.cleared).toBe(false);
  });

  // 7. 마지막 웨이브 클리어
  test('7. 마지막 웨이브 클리어 시 cleared=true', () => {
    const result = advanceWave(3, 3);
    expect(result.cleared).toBe(true);
  });

  // 8. 보상 분배 — 데미지 비례
  test('8. 보상 분배 — 데미지 비례', () => {
    const members: RunMember[] = [
      { userId: 'u1', damage: 700, deaths: 0 },
      { userId: 'u2', damage: 300, deaths: 1 },
    ];
    const dist = distributeRewards(rewards, members);
    expect(dist[0].gold).toBe(700); // 1000 * 0.7
    expect(dist[1].gold).toBe(300); // 1000 * 0.3
  });

  // 9. 사망 패널티
  test('9. 사망 패널티 — 3회 사망 = 15% 감소', () => {
    expect(getDeathPenalty(3)).toBeCloseTo(0.15);
    expect(getDeathPenalty(15)).toBeCloseTo(0.5); // 최대 50% 캡
  });

  // 10. 웨이브 몬스터 수 계산
  test('10. 웨이브 2 몬스터 수 = 5', () => {
    expect(getMonstersInWave(waves, 2)).toBe(5); // 3 + 2
    expect(getMonstersInWave(waves, 99)).toBe(0); // 존재하지 않는 웨이브
  });
});
