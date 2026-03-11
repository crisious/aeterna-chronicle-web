/**
 * 통합 테스트 — 소셜 + 채팅 플로우 (10 tests)
 * 친구 추가/삭제, 우편 발송/수신, 채팅 메시지, 비속어 필터
 */
import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';

let app: FastifyInstance;

// ── 인메모리 상태 ───────────────────────────────────────────

const friends: Record<string, Set<string>> = {};
const mails: { id: string; from: string; to: string; subject: string; body: string; read: boolean; items?: string[] }[] = [];
const chatMessages: { channel: string; userId: string; text: string; timestamp: number; filtered: boolean }[] = [];
const PROFANITY_LIST = ['비속어1', '욕설', 'badword'];

function filterProfanity(text: string): { filtered: string; hasProfanity: boolean } {
  let result = text;
  let found = false;
  for (const word of PROFANITY_LIST) {
    if (result.includes(word)) {
      result = result.replace(new RegExp(word, 'g'), '***');
      found = true;
    }
  }
  return { filtered: result, hasProfanity: found };
}

beforeAll(async () => {
  app = Fastify({ logger: false });

  // 친구 추가
  app.post('/api/social/friend/add', async (req, reply) => {
    const { userId, targetId } = req.body as Record<string, string>;
    if (userId === targetId) return reply.status(400).send({ error: 'CANNOT_ADD_SELF' });
    if (!friends[userId]) friends[userId] = new Set();
    if (friends[userId].has(targetId)) return reply.status(409).send({ error: 'ALREADY_FRIENDS' });
    friends[userId].add(targetId);
    if (!friends[targetId]) friends[targetId] = new Set();
    friends[targetId].add(userId);
    return { status: 'added', friendCount: friends[userId].size };
  });

  // 친구 삭제
  app.post('/api/social/friend/remove', async (req, reply) => {
    const { userId, targetId } = req.body as Record<string, string>;
    friends[userId]?.delete(targetId);
    friends[targetId]?.delete(userId);
    return { status: 'removed' };
  });

  // 친구 목록
  app.get('/api/social/friends/:userId', async (req) => {
    const { userId } = req.params as Record<string, string>;
    return { friends: Array.from(friends[userId] ?? []) };
  });

  // 우편 발송
  app.post('/api/mail/send', async (req, reply) => {
    const { from, to, subject, body, items } = req.body as Record<string, any>;
    if (!subject || !body) return reply.status(400).send({ error: 'MISSING_FIELDS' });
    const id = `mail_${Date.now()}_${mails.length}`;
    mails.push({ id, from, to, subject, body, read: false, items });
    return { mailId: id };
  });

  // 우편 수신
  app.get('/api/mail/inbox/:userId', async (req) => {
    const { userId } = req.params as Record<string, string>;
    return { mails: mails.filter(m => m.to === userId) };
  });

  // 우편 읽기
  app.post('/api/mail/read', async (req, reply) => {
    const { mailId } = req.body as Record<string, string>;
    const mail = mails.find(m => m.id === mailId);
    if (!mail) return reply.status(404).send({ error: 'NOT_FOUND' });
    mail.read = true;
    return { ...mail };
  });

  // 채팅 메시지 전송
  app.post('/api/chat/send', async (req) => {
    const { channel, userId, text } = req.body as Record<string, string>;
    const { filtered, hasProfanity } = filterProfanity(text);
    const msg = { channel, userId, text: filtered, timestamp: Date.now(), filtered: hasProfanity };
    chatMessages.push(msg);
    return { text: filtered, filtered: hasProfanity };
  });

  // 채팅 히스토리
  app.get('/api/chat/history/:channel', async (req) => {
    const { channel } = req.params as Record<string, string>;
    return { messages: chatMessages.filter(m => m.channel === channel) };
  });

  await app.ready();
});

afterAll(async () => { await app.close(); });

describe('Social + Chat Flow 통합', () => {
  // 1. 친구 추가
  test('1. 친구 추가 → 양방향 등록', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/social/friend/add', payload: { userId: 'u1', targetId: 'u2' } });
    expect(JSON.parse(res.body).status).toBe('added');
  });

  // 2. 중복 친구 추가 → 409
  test('2. 중복 친구 추가 → 409', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/social/friend/add', payload: { userId: 'u1', targetId: 'u2' } });
    expect(res.statusCode).toBe(409);
  });

  // 3. 자기 자신 추가 → 400
  test('3. 자기 자신 친구 추가 → 400', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/social/friend/add', payload: { userId: 'u1', targetId: 'u1' } });
    expect(res.statusCode).toBe(400);
  });

  // 4. 친구 목록 확인
  test('4. 친구 목록 조회', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/social/friends/u1' });
    expect(JSON.parse(res.body).friends).toContain('u2');
  });

  // 5. 우편 발송
  test('5. 우편 발송 성공', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/mail/send', payload: { from: 'u1', to: 'u2', subject: '선물', body: '받아주세요', items: ['item_001'] } });
    expect(JSON.parse(res.body).mailId).toBeTruthy();
  });

  // 6. 우편 수신 확인
  test('6. 수신 우편함 확인', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/mail/inbox/u2' });
    const body = JSON.parse(res.body);
    expect(body.mails).toHaveLength(1);
    expect(body.mails[0].read).toBe(false);
  });

  // 7. 우편 읽기 → read 플래그
  test('7. 우편 읽기 → read=true', async () => {
    const inbox = await app.inject({ method: 'GET', url: '/api/mail/inbox/u2' });
    const mailId = JSON.parse(inbox.body).mails[0].id;
    const res = await app.inject({ method: 'POST', url: '/api/mail/read', payload: { mailId } });
    expect(JSON.parse(res.body).read).toBe(true);
  });

  // 8. 일반 채팅 메시지
  test('8. 일반 채팅 메시지 전송', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/chat/send', payload: { channel: 'general', userId: 'u1', text: '안녕하세요!' } });
    expect(JSON.parse(res.body).filtered).toBe(false);
  });

  // 9. 비속어 필터링
  test('9. 비속어 포함 메시지 → 필터링', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/chat/send', payload: { channel: 'general', userId: 'u2', text: '이건 비속어1 테스트' } });
    const body = JSON.parse(res.body);
    expect(body.filtered).toBe(true);
    expect(body.text).toContain('***');
  });

  // 10. 채팅 히스토리 조회
  test('10. 채팅 히스토리 조회', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/chat/history/general' });
    expect(JSON.parse(res.body).messages.length).toBeGreaterThanOrEqual(2);
  });
});
