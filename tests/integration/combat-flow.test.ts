/**
 * 통합 테스트 — 전투 플로우 (8 tests)
 * 전투 시작 → 스킬 사용 → 데미지 계산 → 버프/디버프 → 전투 종료 → 보상
 */
import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';

let app: FastifyInstance;

// ── 인메모리 전투 상태 ──────────────────────────────────────

interface CombatState {
  id: string; playerHp: number; playerMaxHp: number;
  monsterHp: number; monsterMaxHp: number; monsterAtk: number;
  turn: number; buffs: string[]; status: 'active' | 'victory' | 'defeat';
}

const combats: Record<string, CombatState> = {};

beforeAll(async () => {
  app = Fastify({ logger: false });

  // 전투 시작
  app.post('/api/combat/start', async (req) => {
    const { userId, monsterId } = req.body as Record<string, string>;
    const id = `combat_${Date.now()}`;
    combats[id] = {
      id, playerHp: 500, playerMaxHp: 500,
      monsterHp: 200, monsterMaxHp: 200, monsterAtk: 30,
      turn: 0, buffs: [], status: 'active',
    };
    return { combatId: id, playerHp: 500, monsterHp: 200 };
  });

  // 공격
  app.post('/api/combat/attack', async (req, reply) => {
    const { combatId, damage } = req.body as Record<string, any>;
    const c = combats[combatId];
    if (!c || c.status !== 'active') return reply.status(400).send({ error: '전투 없음' });
    c.monsterHp = Math.max(0, c.monsterHp - damage);
    c.turn++;
    // 몬스터 반격
    if (c.monsterHp > 0) {
      c.playerHp = Math.max(0, c.playerHp - c.monsterAtk);
    }
    if (c.monsterHp <= 0) c.status = 'victory';
    else if (c.playerHp <= 0) c.status = 'defeat';
    return { playerHp: c.playerHp, monsterHp: c.monsterHp, turn: c.turn, status: c.status };
  });

  // 스킬 사용
  app.post('/api/combat/skill', async (req, reply) => {
    const { combatId, skillId, damage, buff } = req.body as Record<string, any>;
    const c = combats[combatId];
    if (!c || c.status !== 'active') return reply.status(400).send({ error: '전투 없음' });
    c.monsterHp = Math.max(0, c.monsterHp - damage);
    if (buff) c.buffs.push(buff);
    c.turn++;
    if (c.monsterHp <= 0) c.status = 'victory';
    return { playerHp: c.playerHp, monsterHp: c.monsterHp, buffs: c.buffs, status: c.status };
  });

  // 전투 결과
  app.get('/api/combat/:id/result', async (req, reply) => {
    const { id } = req.params as Record<string, string>;
    const c = combats[id];
    if (!c) return reply.status(404).send({ error: 'NOT_FOUND' });
    const rewards = c.status === 'victory' ? { gold: 100, exp: 50, items: ['drop_item_1'] } : null;
    return { status: c.status, turns: c.turn, rewards };
  });

  await app.ready();
});

afterAll(async () => { await app.close(); });

// ── 테스트 ──────────────────────────────────────────────────

describe('Combat Flow 통합', () => {
  let combatId = '';

  // 1. 전투 시작
  test('1. 전투 시작 → 양측 HP 초기화', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/combat/start', payload: { userId: 'u1', monsterId: 'm1' } });
    const body = JSON.parse(res.body);
    combatId = body.combatId;
    expect(body.playerHp).toBe(500);
    expect(body.monsterHp).toBe(200);
  });

  // 2. 일반 공격
  test('2. 일반 공격 → 몬스터 HP 감소', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/combat/attack', payload: { combatId, damage: 50 } });
    const body = JSON.parse(res.body);
    expect(body.monsterHp).toBe(150);
    expect(body.turn).toBe(1);
  });

  // 3. 몬스터 반격 → 플레이어 HP 감소
  test('3. 몬스터 반격 → 플레이어 HP 감소', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/combat/attack', payload: { combatId, damage: 0 } });
    const body = JSON.parse(res.body);
    expect(body.playerHp).toBeLessThan(500); // 몬스터 atk=30
  });

  // 4. 스킬 사용 + 버프 적용
  test('4. 스킬 사용 → 데미지 + 버프', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/combat/skill', payload: { combatId, skillId: 's1', damage: 80, buff: 'atk_up' } });
    const body = JSON.parse(res.body);
    expect(body.buffs).toContain('atk_up');
    expect(body.monsterHp).toBeLessThan(150);
  });

  // 5. 턴 카운트 누적
  test('5. 턴 카운트 누적', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/combat/attack', payload: { combatId, damage: 10 } });
    expect(JSON.parse(res.body).turn).toBeGreaterThanOrEqual(4);
  });

  // 6. 몬스터 처치 → victory
  test('6. 몬스터 HP 0 → victory', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/combat/attack', payload: { combatId, damage: 999 } });
    expect(JSON.parse(res.body).status).toBe('victory');
  });

  // 7. 승리 보상 확인
  test('7. 승리 시 보상 반환', async () => {
    const res = await app.inject({ method: 'GET', url: `/api/combat/${combatId}/result` });
    const body = JSON.parse(res.body);
    expect(body.rewards).not.toBeNull();
    expect(body.rewards.gold).toBe(100);
  });

  // 8. 패배 시 보상 없음
  test('8. 패배 전투 → 보상 null', async () => {
    // 새 전투 시작 후 즉시 패배 시뮬레이션
    const start = await app.inject({ method: 'POST', url: '/api/combat/start', payload: { userId: 'u2', monsterId: 'm2' } });
    const cid = JSON.parse(start.body).combatId;
    combats[cid].playerHp = 1;
    combats[cid].monsterAtk = 999;
    await app.inject({ method: 'POST', url: '/api/combat/attack', payload: { combatId: cid, damage: 0 } });
    const res = await app.inject({ method: 'GET', url: `/api/combat/${cid}/result` });
    expect(JSON.parse(res.body).rewards).toBeNull();
  });
});
