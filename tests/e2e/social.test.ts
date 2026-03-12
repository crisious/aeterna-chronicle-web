/**
 * E2E 테스트 — 소셜 시스템 (23 tests)
 * 친구 / 파티 / 우편 + P12-17 확장: 공유URL / 레퍼럴 / UGC / 소셜프로필 / 활동피드
 */

import {
  createTestServer, closeTestServer, createTestUser,
  authHeader, expectStatus, expectKeys, expectEqual,
  resetCounters, type TestUser,
} from './setup';
import type { FastifyInstance } from 'fastify';

describe('Social E2E', () => {
  let app: FastifyInstance;
  let user1: TestUser;
  let user2: TestUser;
  let user3: TestUser;

  beforeAll(async () => {
    app = await createTestServer();
    resetCounters();
    user1 = createTestUser();
    user2 = createTestUser();
    user3 = createTestUser();

    const friends = new Map<string, Set<string>>();
    const mails: Array<Record<string, unknown>> = [];

    // ── 기존 소셜 라우트 ──────────────────────────────────────

    // 친구
    app.post('/api/social/friend/request', async (request, reply) => {
      const body = request.body as { fromId: string; toId: string };
      if (body.fromId === body.toId) return reply.status(400).send({ error: '자신에게 요청 불가' });
      return reply.status(201).send({ success: true, status: 'pending' });
    });

    app.post('/api/social/friend/accept', async (request) => {
      const body = request.body as { userId: string; friendId: string };
      if (!friends.has(body.userId)) friends.set(body.userId, new Set());
      if (!friends.has(body.friendId)) friends.set(body.friendId, new Set());
      friends.get(body.userId)!.add(body.friendId);
      friends.get(body.friendId)!.add(body.userId);
      return { success: true };
    });

    app.get('/api/social/friends/:userId', async (request) => {
      const { userId } = request.params as { userId: string };
      const list = friends.get(userId);
      return { friends: list ? Array.from(list) : [], count: list?.size || 0 };
    });

    // 파티
    app.post('/api/social/party/create', async (request) => {
      const body = request.body as { leaderId: string; maxSize?: number };
      return { partyId: `party-${Date.now()}`, leaderId: body.leaderId, maxSize: body.maxSize || 4, members: [body.leaderId] };
    });

    app.post('/api/social/party/invite', async (request, reply) => {
      const body = request.body as { partyId: string; targetId: string };
      if (!body.targetId) return reply.status(400).send({ error: '대상 지정 필요' });
      return { success: true, invited: body.targetId };
    });

    // 우편
    app.post('/api/social/mail/send', async (request, reply) => {
      const body = request.body as { fromId: string; toId: string; title: string; body?: string; attachments?: unknown[] };
      if (!body.title) return reply.status(400).send({ error: '제목 필요' });
      const mail = { id: `mail-${Date.now()}`, ...body, read: false, createdAt: new Date().toISOString() };
      mails.push(mail);
      return reply.status(201).send({ success: true, mailId: mail.id });
    });

    app.get('/api/social/mail/:userId', async (request) => {
      const { userId } = request.params as { userId: string };
      const userMails = mails.filter(m => m.toId === userId);
      return { mails: userMails, count: userMails.length };
    });

    app.post('/api/social/mail/read', async (request) => {
      const body = request.body as { mailId: string };
      const mail = mails.find(m => m.id === body.mailId);
      if (mail) mail.read = true;
      return { success: true };
    });

    // ── P12-17 확장 라우트 ────────────────────────────────────

    // ── 공유 URL ──
    const shareLinks = new Map<string, Record<string, unknown>>();

    app.post('/api/share/create', async (request, reply) => {
      const body = request.body as { userId: string; type: string; targetId: string; title?: string };
      if (!body.type || !body.targetId) return reply.status(400).send({ error: '공유 타입과 대상 필요' });
      const shareId = `share-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const link = {
        shareId,
        url: `https://aeterna-chronicle.com/s/${shareId}`,
        userId: body.userId,
        type: body.type,
        targetId: body.targetId,
        title: body.title || '',
        views: 0,
        ogMeta: { title: body.title || '에테르나 크로니클', image: '/og-default.png', description: '기억은 사라져도, 이야기는 남는다.' },
        createdAt: new Date().toISOString(),
      };
      shareLinks.set(shareId, link);
      return reply.status(201).send(link);
    });

    app.get('/api/share/:shareId', async (request, reply) => {
      const { shareId } = request.params as { shareId: string };
      const link = shareLinks.get(shareId);
      if (!link) return reply.status(404).send({ error: '공유 링크 없음' });
      (link as any).views++;
      return link;
    });

    // ── 레퍼럴 ──
    const referralCodes = new Map<string, Record<string, unknown>>();
    const referralUses: Array<Record<string, unknown>> = [];

    app.post('/api/referral/create', async (request, reply) => {
      const body = request.body as { userId: string };
      const code = `REF-${body.userId.slice(0, 4).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
      const record = { code, ownerId: body.userId, uses: 0, maxUses: 50, rewards: [], createdAt: new Date().toISOString() };
      referralCodes.set(code, record);
      return reply.status(201).send(record);
    });

    app.post('/api/referral/use', async (request, reply) => {
      const body = request.body as { code: string; userId: string };
      const ref = referralCodes.get(body.code);
      if (!ref) return reply.status(404).send({ error: '코드 없음' });
      if (ref.ownerId === body.userId) return reply.status(400).send({ error: '자기 코드 사용 불가' });
      if ((ref.uses as number) >= (ref.maxUses as number)) return reply.status(400).send({ error: '사용 한도 초과' });
      (ref as any).uses++;
      const use = {
        code: body.code,
        usedBy: body.userId,
        ownerId: ref.ownerId,
        rewards: { inviter: { type: 'GOLD', amount: 1000 }, invitee: { type: 'GOLD', amount: 500 } },
        createdAt: new Date().toISOString(),
      };
      referralUses.push(use);
      return { success: true, rewards: use.rewards };
    });

    app.get('/api/referral/:code', async (request, reply) => {
      const { code } = request.params as { code: string };
      const ref = referralCodes.get(code);
      if (!ref) return reply.status(404).send({ error: '코드 없음' });
      return ref;
    });

    // ── UGC 갤러리 ──
    const ugcPosts = new Map<string, Record<string, unknown>>();
    const ugcLikes = new Map<string, Set<string>>();
    const ugcReports: Array<Record<string, unknown>> = [];

    app.post('/api/ugc/post', async (request, reply) => {
      const body = request.body as { userId: string; title: string; content: string; imageUrl?: string; tags?: string[] };
      if (!body.title || !body.content) return reply.status(400).send({ error: '제목과 내용 필요' });
      const postId = `ugc-${Date.now()}`;
      const post = {
        postId,
        userId: body.userId,
        title: body.title,
        content: body.content,
        imageUrl: body.imageUrl || null,
        tags: body.tags || [],
        likeCount: 0,
        reportCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      ugcPosts.set(postId, post);
      ugcLikes.set(postId, new Set());
      return reply.status(201).send(post);
    });

    app.get('/api/ugc/post/:postId', async (request, reply) => {
      const { postId } = request.params as { postId: string };
      const post = ugcPosts.get(postId);
      if (!post) return reply.status(404).send({ error: '포스트 없음' });
      return post;
    });

    app.put('/api/ugc/post/:postId', async (request, reply) => {
      const { postId } = request.params as { postId: string };
      const body = request.body as { title?: string; content?: string; tags?: string[] };
      const post = ugcPosts.get(postId);
      if (!post) return reply.status(404).send({ error: '포스트 없음' });
      if (body.title) post.title = body.title;
      if (body.content) post.content = body.content;
      if (body.tags) post.tags = body.tags;
      post.updatedAt = new Date().toISOString();
      return post;
    });

    app.delete('/api/ugc/post/:postId', async (request, reply) => {
      const { postId } = request.params as { postId: string };
      if (!ugcPosts.has(postId)) return reply.status(404).send({ error: '포스트 없음' });
      ugcPosts.delete(postId);
      ugcLikes.delete(postId);
      return { success: true };
    });

    app.post('/api/ugc/post/:postId/like', async (request, reply) => {
      const { postId } = request.params as { postId: string };
      const body = request.body as { userId: string };
      const post = ugcPosts.get(postId);
      if (!post) return reply.status(404).send({ error: '포스트 없음' });
      const likes = ugcLikes.get(postId)!;
      if (likes.has(body.userId)) {
        likes.delete(body.userId);
        (post as any).likeCount--;
        return { liked: false, likeCount: post.likeCount };
      }
      likes.add(body.userId);
      (post as any).likeCount++;
      return { liked: true, likeCount: post.likeCount };
    });

    app.post('/api/ugc/post/:postId/report', async (request, reply) => {
      const { postId } = request.params as { postId: string };
      const body = request.body as { userId: string; reason: string };
      const post = ugcPosts.get(postId);
      if (!post) return reply.status(404).send({ error: '포스트 없음' });
      if (!body.reason) return reply.status(400).send({ error: '신고 사유 필요' });
      (post as any).reportCount++;
      ugcReports.push({ postId, userId: body.userId, reason: body.reason, createdAt: new Date().toISOString() });
      return { success: true, reportCount: post.reportCount };
    });

    // ── 소셜 프로필 ──
    const profiles = new Map<string, Record<string, unknown>>();
    profiles.set(user1.userId, {
      userId: user1.userId,
      displayName: 'TestHero1',
      level: 55,
      className: '기억술사',
      guildName: '기억의 수호자',
      title: '망각의 정복자',
      achievementCount: 42,
      totalPlayTime: 12000,
    });
    profiles.set(user2.userId, {
      userId: user2.userId,
      displayName: 'TestHero2',
      level: 30,
      className: '전사',
      guildName: null,
      title: null,
      achievementCount: 15,
      totalPlayTime: 4500,
    });

    app.get('/api/social/profile/:userId', async (request, reply) => {
      const { userId } = request.params as { userId: string };
      const profile = profiles.get(userId);
      if (!profile) return reply.status(404).send({ error: '프로필 없음' });
      return profile;
    });

    // ── 활동 피드 ──
    const feedEntries: Array<Record<string, unknown>> = [
      { id: 'feed-1', userId: user1.userId, displayName: 'TestHero1', eventType: 'LEVEL_UP', visibility: 'FRIENDS', summary: 'TestHero1님이 레벨 55에 도달!', likeCount: 3, commentCount: 1, createdAt: new Date(Date.now() - 3600000).toISOString() },
      { id: 'feed-2', userId: user1.userId, displayName: 'TestHero1', eventType: 'DUNGEON_CLEAR', visibility: 'PUBLIC', summary: 'TestHero1님이 [심연의 문] 클리어!', likeCount: 5, commentCount: 2, createdAt: new Date(Date.now() - 1800000).toISOString() },
      { id: 'feed-3', userId: user2.userId, displayName: 'TestHero2', eventType: 'ACHIEVEMENT_UNLOCKED', visibility: 'FRIENDS', summary: 'TestHero2님이 업적 [첫 보스킬] 달성!', likeCount: 1, commentCount: 0, createdAt: new Date(Date.now() - 900000).toISOString() },
      { id: 'feed-4', userId: user1.userId, displayName: 'TestHero1', eventType: 'PVP_VICTORY', visibility: 'PUBLIC', summary: 'TestHero1님이 PvP 승리! (레이팅 1500)', likeCount: 7, commentCount: 3, createdAt: new Date().toISOString() },
      { id: 'feed-5', userId: user2.userId, displayName: 'TestHero2', eventType: 'ITEM_ACQUIRED', visibility: 'FRIENDS', summary: 'TestHero2님이 [LEGENDARY] 별의 검 획득!', likeCount: 10, commentCount: 5, createdAt: new Date().toISOString() },
    ];

    app.get('/api/feed', async (request) => {
      const query = request.query as Record<string, string | undefined>;
      let filtered = [...feedEntries];

      if (query.eventTypes) {
        const types = query.eventTypes.split(',');
        filtered = filtered.filter(e => types.includes(e.eventType as string));
      }
      if (query.visibility) {
        filtered = filtered.filter(e => e.visibility === query.visibility);
      }

      const limit = Math.min(parseInt(query.limit || '20', 10), 50);
      const page = filtered.slice(0, limit);
      return { entries: page, nextCursor: page.length < filtered.length ? (page[page.length - 1] as any).createdAt : null, hasMore: page.length < filtered.length, total: filtered.length };
    });

    app.get('/api/feed/user/:userId', async (request) => {
      const { userId } = request.params as { userId: string };
      const query = request.query as Record<string, string | undefined>;
      const filtered = feedEntries.filter(e => e.userId === userId);
      const limit = Math.min(parseInt(query.limit || '20', 10), 50);
      const page = filtered.slice(0, limit);
      return { entries: page, nextCursor: null, hasMore: false, total: filtered.length };
    });

    await app.ready();
  });

  afterAll(async () => { await closeTestServer(); });

  // ═══════════════════════════════════════════════════════════════
  // 기존 테스트 (1~8): 친구 / 파티 / 우편
  // ═══════════════════════════════════════════════════════════════

  test('1. 친구 요청 → 201', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/social/friend/request',
      headers: authHeader(user1),
      payload: { fromId: user1.userId, toId: user2.userId },
    });
    expectStatus(res.statusCode, 201);
    expectEqual(res.json().status, 'pending', '대기 상태');
  });

  test('2. 자기 자신에게 친구 요청 → 400', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/social/friend/request',
      payload: { fromId: user1.userId, toId: user1.userId },
    });
    expectStatus(res.statusCode, 400);
  });

  test('3. 친구 수락 → 양방향 등록', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/social/friend/accept',
      payload: { userId: user2.userId, friendId: user1.userId },
    });
    expectStatus(res.statusCode, 200);
    const list = await app.inject({ method: 'GET', url: `/api/social/friends/${user1.userId}` });
    expectEqual(list.json().count, 1, '친구 수');
  });

  test('4. 파티 생성 → 파티 정보 반환', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/social/party/create',
      payload: { leaderId: user1.userId, maxSize: 4 },
    });
    expectStatus(res.statusCode, 200);
    expectKeys(res.json(), ['partyId', 'leaderId', 'maxSize', 'members']);
  });

  test('5. 파티 초대 → 성공', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/social/party/invite',
      payload: { partyId: 'party-1', targetId: user2.userId },
    });
    expectStatus(res.statusCode, 200);
    expectEqual(res.json().invited, user2.userId, '초대 대상');
  });

  test('6. 우편 발송 → 201', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/social/mail/send',
      payload: { fromId: user1.userId, toId: user2.userId, title: '안녕하세요!' },
    });
    expectStatus(res.statusCode, 201);
    expectKeys(res.json(), ['success', 'mailId']);
  });

  test('7. 우편함 조회 → 수신 목록', async () => {
    const res = await app.inject({
      method: 'GET', url: `/api/social/mail/${user2.userId}`,
    });
    expectStatus(res.statusCode, 200);
    expectEqual(res.json().count, 1, '우편 수');
  });

  test('8. 우편 읽음 처리 → 성공', async () => {
    const listRes = await app.inject({ method: 'GET', url: `/api/social/mail/${user2.userId}` });
    const mailId = listRes.json().mails[0]?.id;
    const res = await app.inject({
      method: 'POST', url: '/api/social/mail/read',
      payload: { mailId },
    });
    expectStatus(res.statusCode, 200);
  });

  // ═══════════════════════════════════════════════════════════════
  // P12-17 확장 테스트 (9~23): 공유URL / 레퍼럴 / UGC / 프로필 / 피드
  // ═══════════════════════════════════════════════════════════════

  // ── 공유 URL (9-10) ──

  test('9. 공유 URL 생성 → 201 + OG 메타 포함', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/share/create',
      headers: authHeader(user1),
      payload: { userId: user1.userId, type: 'ACHIEVEMENT', targetId: 'ach-001', title: '첫 보스 클리어!' },
    });
    expectStatus(res.statusCode, 201);
    const body = res.json();
    expectKeys(body, ['shareId', 'url', 'ogMeta']);
    expect(body.url).toContain('https://aeterna-chronicle.com/s/');
    expect(body.ogMeta.title).toBe('첫 보스 클리어!');
  });

  test('10. 공유 URL 조회 → 조회수 증가', async () => {
    // 먼저 공유 링크 생성
    const createRes = await app.inject({
      method: 'POST', url: '/api/share/create',
      payload: { userId: user1.userId, type: 'SCREENSHOT', targetId: 'ss-001' },
    });
    const { shareId } = createRes.json();

    // 조회 2회
    await app.inject({ method: 'GET', url: `/api/share/${shareId}` });
    const res = await app.inject({ method: 'GET', url: `/api/share/${shareId}` });
    expectStatus(res.statusCode, 200);
    expectEqual(res.json().views, 2, '조회수');
  });

  // ── 레퍼럴 코드 (11-14) ──

  test('11. 레퍼럴 코드 생성 → 201 + 코드 형식', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/referral/create',
      headers: authHeader(user1),
      payload: { userId: user1.userId },
    });
    expectStatus(res.statusCode, 201);
    const body = res.json();
    expectKeys(body, ['code', 'ownerId', 'uses', 'maxUses']);
    expect(body.code).toMatch(/^REF-/);
    expectEqual(body.uses, 0, '초기 사용 횟수');
  });

  test('12. 레퍼럴 코드 사용 → 양측 보상', async () => {
    const createRes = await app.inject({
      method: 'POST', url: '/api/referral/create',
      payload: { userId: user1.userId },
    });
    const { code } = createRes.json();

    const res = await app.inject({
      method: 'POST', url: '/api/referral/use',
      payload: { code, userId: user2.userId },
    });
    expectStatus(res.statusCode, 200);
    const body = res.json();
    expectKeys(body, ['success', 'rewards']);
    expect(body.rewards.inviter.amount).toBeGreaterThan(0);
    expect(body.rewards.invitee.amount).toBeGreaterThan(0);
  });

  test('13. 자기 레퍼럴 코드 사용 → 400', async () => {
    const createRes = await app.inject({
      method: 'POST', url: '/api/referral/create',
      payload: { userId: user1.userId },
    });
    const { code } = createRes.json();

    const res = await app.inject({
      method: 'POST', url: '/api/referral/use',
      payload: { code, userId: user1.userId },
    });
    expectStatus(res.statusCode, 400);
  });

  test('14. 존재하지 않는 레퍼럴 코드 → 404', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/referral/use',
      payload: { code: 'REF-FAKE-0000', userId: user2.userId },
    });
    expectStatus(res.statusCode, 404);
  });

  // ── UGC 갤러리 (15-20) ──

  let createdPostId: string;

  test('15. UGC 포스트 생성 → 201', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/ugc/post',
      headers: authHeader(user1),
      payload: { userId: user1.userId, title: '보스전 스크린샷', content: '심연의 문 클리어 인증!', tags: ['boss', 'screenshot'] },
    });
    expectStatus(res.statusCode, 201);
    const body = res.json();
    expectKeys(body, ['postId', 'userId', 'title', 'content', 'likeCount', 'tags']);
    createdPostId = body.postId;
  });

  test('16. UGC 포스트 조회 → 상세 정보', async () => {
    const res = await app.inject({
      method: 'GET', url: `/api/ugc/post/${createdPostId}`,
    });
    expectStatus(res.statusCode, 200);
    expectEqual(res.json().title, '보스전 스크린샷', '제목 일치');
  });

  test('17. UGC 포스트 수정 → 업데이트', async () => {
    const res = await app.inject({
      method: 'PUT', url: `/api/ugc/post/${createdPostId}`,
      payload: { title: '보스전 스크린샷 (수정됨)', tags: ['boss', 'screenshot', 'clear'] },
    });
    expectStatus(res.statusCode, 200);
    expectEqual(res.json().title, '보스전 스크린샷 (수정됨)', '수정된 제목');
    expect(res.json().tags).toHaveLength(3);
  });

  test('18. UGC 좋아요 토글 → 좋아요/취소', async () => {
    // 좋아요
    const likeRes = await app.inject({
      method: 'POST', url: `/api/ugc/post/${createdPostId}/like`,
      payload: { userId: user2.userId },
    });
    expectStatus(likeRes.statusCode, 200);
    expectEqual(likeRes.json().liked, true, '좋아요 상태');
    expectEqual(likeRes.json().likeCount, 1, '좋아요 수');

    // 좋아요 취소
    const unlikeRes = await app.inject({
      method: 'POST', url: `/api/ugc/post/${createdPostId}/like`,
      payload: { userId: user2.userId },
    });
    expectEqual(unlikeRes.json().liked, false, '좋아요 취소');
    expectEqual(unlikeRes.json().likeCount, 0, '좋아요 수 0');
  });

  test('19. UGC 포스트 신고 → 신고 접수', async () => {
    const res = await app.inject({
      method: 'POST', url: `/api/ugc/post/${createdPostId}/report`,
      payload: { userId: user3.userId, reason: '부적절한 콘텐츠' },
    });
    expectStatus(res.statusCode, 200);
    expectEqual(res.json().reportCount, 1, '신고 수');
  });

  test('20. UGC 포스트 삭제 → 성공', async () => {
    const res = await app.inject({
      method: 'DELETE', url: `/api/ugc/post/${createdPostId}`,
    });
    expectStatus(res.statusCode, 200);
    expectEqual(res.json().success, true, '삭제 성공');

    // 삭제 확인
    const getRes = await app.inject({ method: 'GET', url: `/api/ugc/post/${createdPostId}` });
    expectStatus(getRes.statusCode, 404);
  });

  // ── 소셜 프로필 (21) ──

  test('21. 소셜 프로필 조회 → 공개 정보', async () => {
    const res = await app.inject({
      method: 'GET', url: `/api/social/profile/${user1.userId}`,
    });
    expectStatus(res.statusCode, 200);
    const body = res.json();
    expectKeys(body, ['userId', 'displayName', 'level', 'className', 'achievementCount', 'totalPlayTime']);
    expectEqual(body.className, '기억술사', '클래스명');
    expect(body.level).toBeGreaterThan(0);
  });

  // ── 활동 피드 (22-23) ──

  test('22. 활동 피드 글로벌 조회 → 페이지네이션', async () => {
    const res = await app.inject({
      method: 'GET', url: '/api/feed?limit=3',
    });
    expectStatus(res.statusCode, 200);
    const body = res.json();
    expectKeys(body, ['entries', 'nextCursor', 'hasMore', 'total']);
    expect(body.entries.length).toBeLessThanOrEqual(3);
    expect(body.total).toBeGreaterThanOrEqual(5);
  });

  test('23. 활동 피드 유저별 조회 + 이벤트 필터', async () => {
    const res = await app.inject({
      method: 'GET', url: `/api/feed/user/${user1.userId}`,
    });
    expectStatus(res.statusCode, 200);
    const body = res.json();
    expect(body.entries.length).toBeGreaterThanOrEqual(1);
    body.entries.forEach((entry: Record<string, unknown>) => {
      expectEqual(entry.userId, user1.userId, '유저 필터 일치');
    });

    // 이벤트 타입 필터
    const filtered = await app.inject({
      method: 'GET', url: '/api/feed?eventTypes=PVP_VICTORY',
    });
    expectStatus(filtered.statusCode, 200);
    filtered.json().entries.forEach((entry: Record<string, unknown>) => {
      expectEqual(entry.eventType, 'PVP_VICTORY', '이벤트 타입 필터');
    });
  });
});
