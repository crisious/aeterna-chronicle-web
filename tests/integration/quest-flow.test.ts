/**
 * 통합 테스트 — 퀘스트 플로우 (8 tests)
 * 퀘스트 목록 조회 → 수주 → 진행 → 완료 → 보상
 */
import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';

let app: FastifyInstance;

// ── 인메모리 퀘스트 스토어 ──────────────────────────────────

const questDefs = [
  { id: 'q1', title: '슬라임 토벌', type: 'main', level: 1, objectives: [{ type: 'kill', target: 'slime', count: 5 }], reward: { gold: 100, exp: 50 } },
  { id: 'q2', title: '약초 수집', type: 'sub', level: 5, objectives: [{ type: 'collect', target: 'herb', count: 3 }], reward: { gold: 50, exp: 30 } },
  { id: 'q3', title: '상급 던전', type: 'main', level: 50, objectives: [{ type: 'kill', target: 'boss', count: 1 }], reward: { gold: 5000, exp: 2000 } },
];

const activeQuests: Record<string, { questId: string; progress: number[]; status: string }[]> = {};

beforeAll(async () => {
  app = Fastify({ logger: false });

  // 퀘스트 목록
  app.get('/api/quests', async () => questDefs);

  // 수주
  app.post('/api/quests/accept', async (req, reply) => {
    const { userId, questId, playerLevel } = req.body as Record<string, any>;
    const def = questDefs.find(q => q.id === questId);
    if (!def) return reply.status(404).send({ error: 'QUEST_NOT_FOUND' });
    if (playerLevel < def.level) return reply.status(400).send({ error: 'LEVEL_TOO_LOW' });
    if (!activeQuests[userId]) activeQuests[userId] = [];
    if (activeQuests[userId].find(q => q.questId === questId)) return reply.status(409).send({ error: 'ALREADY_ACCEPTED' });
    activeQuests[userId].push({ questId, progress: def.objectives.map(() => 0), status: 'in_progress' });
    return { questId, status: 'accepted' };
  });

  // 진행도 업데이트
  app.post('/api/quests/progress', async (req, reply) => {
    const { userId, questId, objectiveIndex, amount } = req.body as Record<string, any>;
    const quests = activeQuests[userId];
    const quest = quests?.find(q => q.questId === questId);
    if (!quest) return reply.status(404).send({ error: 'NOT_IN_PROGRESS' });
    const def = questDefs.find(q => q.id === questId)!;
    quest.progress[objectiveIndex] = Math.min(quest.progress[objectiveIndex] + amount, def.objectives[objectiveIndex].count);
    const complete = quest.progress.every((p, i) => p >= def.objectives[i].count);
    if (complete) quest.status = 'completed';
    return { progress: quest.progress, status: quest.status };
  });

  // 완료 및 보상
  app.post('/api/quests/complete', async (req, reply) => {
    const { userId, questId } = req.body as Record<string, any>;
    const quests = activeQuests[userId];
    const quest = quests?.find(q => q.questId === questId);
    if (!quest) return reply.status(404).send({ error: 'NOT_FOUND' });
    if (quest.status !== 'completed') return reply.status(400).send({ error: 'NOT_COMPLETE' });
    const def = questDefs.find(q => q.id === questId)!;
    activeQuests[userId] = quests.filter(q => q.questId !== questId);
    return { reward: def.reward, status: 'rewarded' };
  });

  // 포기
  app.post('/api/quests/abandon', async (req, reply) => {
    const { userId, questId } = req.body as Record<string, any>;
    const quests = activeQuests[userId];
    if (!quests?.find(q => q.questId === questId)) return reply.status(404).send({ error: 'NOT_FOUND' });
    activeQuests[userId] = quests.filter(q => q.questId !== questId);
    return { status: 'abandoned' };
  });

  await app.ready();
});

afterAll(async () => { await app.close(); });

// ── 테스트 ──────────────────────────────────────────────────

describe('Quest Flow 통합', () => {
  const userId = 'test-user-1';

  // 1. 퀘스트 목록 조회
  test('1. 퀘스트 목록 조회 → 3개', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/quests' });
    expect(JSON.parse(res.body)).toHaveLength(3);
  });

  // 2. 퀘스트 수주
  test('2. 슬라임 토벌 수주 성공', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/quests/accept', payload: { userId, questId: 'q1', playerLevel: 5 } });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).status).toBe('accepted');
  });

  // 3. 중복 수주 → 409
  test('3. 중복 수주 → 409', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/quests/accept', payload: { userId, questId: 'q1', playerLevel: 5 } });
    expect(res.statusCode).toBe(409);
  });

  // 4. 레벨 부족 수주 → 400
  test('4. 레벨 부족 수주 → 400', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/quests/accept', payload: { userId, questId: 'q3', playerLevel: 10 } });
    expect(res.statusCode).toBe(400);
  });

  // 5. 진행도 업데이트
  test('5. kill 3회 진행 → progress=[3]', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/quests/progress', payload: { userId, questId: 'q1', objectiveIndex: 0, amount: 3 } });
    expect(JSON.parse(res.body).progress[0]).toBe(3);
    expect(JSON.parse(res.body).status).toBe('in_progress');
  });

  // 6. 목표 달성 → completed
  test('6. kill 2회 추가 → completed', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/quests/progress', payload: { userId, questId: 'q1', objectiveIndex: 0, amount: 2 } });
    expect(JSON.parse(res.body).status).toBe('completed');
  });

  // 7. 완료 및 보상 수령
  test('7. 완료 → 보상 반환', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/quests/complete', payload: { userId, questId: 'q1' } });
    const body = JSON.parse(res.body);
    expect(body.status).toBe('rewarded');
    expect(body.reward.gold).toBe(100);
  });

  // 8. 퀘스트 포기
  test('8. 수주 후 포기', async () => {
    await app.inject({ method: 'POST', url: '/api/quests/accept', payload: { userId, questId: 'q2', playerLevel: 10 } });
    const res = await app.inject({ method: 'POST', url: '/api/quests/abandon', payload: { userId, questId: 'q2' } });
    expect(JSON.parse(res.body).status).toBe('abandoned');
  });
});
