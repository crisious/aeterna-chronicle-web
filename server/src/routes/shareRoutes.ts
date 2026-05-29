/**
 * shareRoutes.ts — SNS 공유 + 스트리머 + 레퍼럴 + UGC + 소셜프로필 라우트 (P12-01~07)
 */
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { SharePayload } from '../social/shareManager';
import { createShare, getShare, getSocialShareUrls, getUserShares } from '../social/shareManager';
import type { DiscordWebhookConfig, DiscordEventType } from '../social/discordBot';
import { broadcastEvent, registerWebhook, unregisterWebhook, getWebhooks, getQueueStatus } from '../social/discordBot';
import type { StreamerSettings } from '../social/streamerMode';
import { startStreaming, stopStreaming, updateSettings, getLiveStreamers, getOverlayData, joinSpectate, leaveSpectate, getSpectators, getSession } from '../social/streamerMode';
import { createReferralCode, getReferralCode, redeemReferralCode, claimReward, getUserRewards, getReferralStats } from '../social/referralManager';
import type { CreatePostInput, UgcFeedOptions, ReportReason } from '../social/ugcGallery';
import { createPost, getPost, deletePost, getFeed, toggleLike, reportPost, setPostVisibility } from '../social/ugcGallery';
import type { CommunityEventConfig } from '../event/communityEventEngine';
import { createCommunityEvent, getEvent, getActiveEvents, cancelEvent, joinEvent, updateScore, getLeaderboard as getEventLeaderboard, getActiveMultipliers, syncEventStatuses } from '../event/communityEventEngine';
import type { LeaderboardType, ProfileVisibility } from '../social/socialProfile';
import { getPublicProfile, setProfileVisibility, getLeaderboard, getFriendLeaderboard, getGuildRanking } from '../social/socialProfile';
import { requireAdmin } from '../admin/authMiddleware';

export async function communityRoutes(fastify: FastifyInstance): Promise<void> {

  // ═══ P12-01: SNS 공유 ═══

  fastify.post('/api/share', async (request: FastifyRequest, reply: FastifyReply) => {
    // IDOR 방지: 공유 소유자는 body.userId 가 아니라 인증된 행위자
    const userId = request.authUserId;
    if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });
    const { userId: _ignoredUserId, ...rest } = request.body as SharePayload;
    if (!rest.type || !rest.resourceId) {
      return reply.status(400).send({ error: 'type, resourceId 필수' });
    }
    const result = await createShare({ ...rest, userId });
    const socialUrls = getSocialShareUrls(result.shareUrl, result.ogMeta.title);
    return { ...result, socialUrls };
  });

  fastify.get('/api/share/:code', async (request: FastifyRequest, reply: FastifyReply) => {
    const { code } = request.params as { code: string };
    const result = await getShare(code);
    if (!result) return reply.status(404).send({ error: '공유 링크를 찾을 수 없습니다.' });
    return result;
  });

  /** Open Graph 메타 렌더링 (크롤러용) */
  fastify.get('/s/:code', async (request: FastifyRequest, reply: FastifyReply) => {
    const { code } = request.params as { code: string };
    const result = await getShare(code);
    if (!result) return reply.status(404).send('Not Found');

    const og = result.ogMeta;
    const html = `<!DOCTYPE html><html><head>
      <meta property="og:title" content="${escapeHtml(og.title)}" />
      <meta property="og:description" content="${escapeHtml(og.description)}" />
      <meta property="og:image" content="${escapeHtml(og.image)}" />
      <meta property="og:url" content="${escapeHtml(og.url)}" />
      <meta property="og:type" content="${og.type}" />
      <meta property="og:site_name" content="${escapeHtml(og.siteName)}" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta http-equiv="refresh" content="0;url=${escapeHtml(og.url)}" />
    </head><body>Redirecting...</body></html>`;

    return reply.type('text/html').send(html);
  });

  fastify.get('/api/share/user/:userId', async (request: FastifyRequest, reply: FastifyReply) => {
    // IDOR 방지: 사적 공유 이력은 params.userId 가 아니라 인증된 행위자 본인 것만
    const userId = request.authUserId;
    if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });
    const query = request.query as { limit?: string; offset?: string };
    const shares = await getUserShares(userId, parseInt(query.limit || '20'), parseInt(query.offset || '0'));
    return { shares };
  });

  // ═══ P12-02: Discord 봇 ═══

  // GM/관리자성 엔드포인트: 웹훅 등록·삭제·조회, broadcast, 큐 상태는 admin 권한 필요
  fastify.post(
    '/api/discord/webhook',
    { preHandler: requireAdmin('admin', 'discord_register_webhook') },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = request.body as { id: string } & DiscordWebhookConfig;
      if (!body.id || !body.url) return reply.status(400).send({ error: 'id, url 필수' });
      registerWebhook(body.id, body);
      return { success: true };
    },
  );

  fastify.delete(
    '/api/discord/webhook/:id',
    { preHandler: requireAdmin('admin', 'discord_unregister_webhook') },
    async (request: FastifyRequest) => {
      const { id } = request.params as { id: string };
      return { removed: unregisterWebhook(id) };
    },
  );

  fastify.get(
    '/api/discord/webhooks',
    { preHandler: requireAdmin('admin', 'discord_list_webhooks') },
    async () => {
      return { webhooks: getWebhooks() };
    },
  );

  fastify.post(
    '/api/discord/broadcast',
    { preHandler: requireAdmin('admin', 'discord_broadcast') },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = request.body as { eventType: DiscordEventType; data: Record<string, any> };
      if (!body.eventType) return reply.status(400).send({ error: 'eventType 필수' });
      const result = broadcastEvent(body.eventType, body.data || {});
      return result;
    },
  );

  fastify.get(
    '/api/discord/queue',
    { preHandler: requireAdmin('admin', 'discord_queue_status') },
    async () => getQueueStatus(),
  );

  // ═══ P12-03: 스트리머 모드 ═══

  fastify.post('/api/streamer/start', async (request: FastifyRequest, reply: FastifyReply) => {
    // IDOR 방지: 스트리머 본인 = 인증된 행위자
    const userId = request.authUserId;
    if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });
    const { settings } = request.body as { settings?: Partial<StreamerSettings> };
    const session = await startStreaming(userId, settings);
    return session;
  });

  fastify.post('/api/streamer/stop', async (request: FastifyRequest, reply: FastifyReply) => {
    // IDOR 방지: 인증된 행위자 본인의 스트림만 종료
    const userId = request.authUserId;
    if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });
    return { stopped: await stopStreaming(userId) };
  });

  fastify.patch('/api/streamer/settings', async (request: FastifyRequest, reply: FastifyReply) => {
    // IDOR 방지: 인증된 행위자 본인의 설정만 변경
    const userId = request.authUserId;
    if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });
    const { settings } = request.body as { settings: Partial<StreamerSettings> };
    return { settings: updateSettings(userId, settings) };
  });

  fastify.get('/api/streamer/live', async () => {
    return { streamers: await getLiveStreamers() };
  });

  fastify.get('/api/streamer/overlay/:userId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.params as { userId: string };
    const data = await getOverlayData(userId);
    if (!data) return reply.status(404).send({ error: '오버레이 데이터 없음' });
    return data;
  });

  fastify.post('/api/streamer/spectate/join', async (request: FastifyRequest, reply: FastifyReply) => {
    // IDOR 방지: 관전자 = 인증된 행위자 본인 (spectatorId 신뢰 안 함)
    const spectatorId = request.authUserId;
    if (!spectatorId) return reply.status(401).send({ error: '인증이 필요합니다.' });
    const { streamerId } = request.body as { streamerId: string };
    return { joined: joinSpectate(streamerId, spectatorId) };
  });

  fastify.post('/api/streamer/spectate/leave', async (request: FastifyRequest, reply: FastifyReply) => {
    // IDOR 방지: 관전자 = 인증된 행위자 본인 (spectatorId 신뢰 안 함)
    const spectatorId = request.authUserId;
    if (!spectatorId) return reply.status(401).send({ error: '인증이 필요합니다.' });
    const { streamerId } = request.body as { streamerId: string };
    return { left: leaveSpectate(streamerId, spectatorId) };
  });

  fastify.get('/api/streamer/spectators/:streamerId', async (request: FastifyRequest) => {
    const { streamerId } = request.params as { streamerId: string };
    return { spectators: getSpectators(streamerId) };
  });

  fastify.get('/api/streamer/session/:userId', async (request: FastifyRequest, reply: FastifyReply) => {
    // IDOR 방지: 세션은 streamKey(비밀)를 포함하므로 본인 세션만 조회 가능
    const authUserId = request.authUserId;
    if (!authUserId) return reply.status(401).send({ error: '인증이 필요합니다.' });
    const { userId } = request.params as { userId: string };
    if (userId !== authUserId) return reply.status(403).send({ error: '본인 세션만 조회할 수 있습니다.' });
    return { session: getSession(authUserId) };
  });

  // ═══ P12-04: 레퍼럴 ═══

  fastify.post('/api/referral/code', async (request: FastifyRequest, reply: FastifyReply) => {
    // IDOR 방지: 코드 소유자 = 인증된 행위자
    const userId = request.authUserId;
    if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });
    const { maxUses, expiryDays } = request.body as { maxUses?: number; expiryDays?: number };
    const code = await createReferralCode(userId, { maxUses, expiryDays });
    return code;
  });

  fastify.get('/api/referral/code/:code', async (request: FastifyRequest, reply: FastifyReply) => {
    const { code } = request.params as { code: string };
    const info = await getReferralCode(code);
    if (!info) return reply.status(404).send({ error: '코드 없음' });
    return info;
  });

  fastify.post('/api/referral/redeem', async (request: FastifyRequest, reply: FastifyReply) => {
    // IDOR 방지: 코드를 사용하는 신규 유저 = 인증된 행위자
    const userId = request.authUserId;
    if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });
    const { code } = request.body as { code: string };
    return redeemReferralCode(code, userId);
  });

  fastify.post('/api/referral/claim', async (request: FastifyRequest, reply: FastifyReply) => {
    // IDOR 방지: 보상 수령자 = 인증된 행위자 (manager 가 보상 소유권 2차 검증)
    const userId = request.authUserId;
    if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });
    const { rewardId } = request.body as { rewardId: string };
    return { claimed: await claimReward(rewardId, userId) };
  });

  fastify.get('/api/referral/rewards/:userId', async (request: FastifyRequest, reply: FastifyReply) => {
    // IDOR 방지: 사적 보상 목록은 본인 것만
    const userId = request.authUserId;
    if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });
    return { rewards: await getUserRewards(userId) };
  });

  fastify.get('/api/referral/stats/:userId', async (request: FastifyRequest, reply: FastifyReply) => {
    // IDOR 방지: 사적 초대 통계는 본인 것만
    const userId = request.authUserId;
    if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });
    return getReferralStats(userId);
  });

  // ═══ P12-05: UGC 갤러리 ═══

  fastify.post('/api/ugc/post', async (request: FastifyRequest, reply: FastifyReply) => {
    // IDOR 방지: 작성자 = 인증된 행위자 (body.authorId 신뢰 안 함)
    const userId = request.authUserId;
    if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });
    const { authorId: _ignoredAuthorId, ...rest } = request.body as CreatePostInput;
    if (!rest.type || !rest.title) {
      return reply.status(400).send({ error: 'type, title 필수' });
    }
    const post = await createPost({ ...rest, authorId: userId });
    return post;
  });

  fastify.get('/api/ugc/post/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const post = await getPost(id);
    if (!post) return reply.status(404).send({ error: '게시글 없음' });
    return post;
  });

  fastify.delete('/api/ugc/post/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    // IDOR 방지: 삭제 행위자 = 인증된 본인 (manager 가 authorId 일치 2차 검증)
    const userId = request.authUserId;
    if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });
    const { id } = request.params as { id: string };
    return { deleted: await deletePost(id, userId) };
  });

  fastify.get('/api/ugc/feed', async (request: FastifyRequest) => {
    const query = request.query as UgcFeedOptions;
    return { posts: await getFeed(query) };
  });

  fastify.post('/api/ugc/like', async (request: FastifyRequest, reply: FastifyReply) => {
    // IDOR 방지: 좋아요 행위자 = 인증된 행위자
    const userId = request.authUserId;
    if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });
    const { postId } = request.body as { postId: string };
    return toggleLike(postId, userId);
  });

  fastify.post('/api/ugc/report', async (request: FastifyRequest, reply: FastifyReply) => {
    // IDOR 방지: 신고자 = 인증된 행위자 (reporterId 신뢰 안 함)
    const reporterId = request.authUserId;
    if (!reporterId) return reply.status(401).send({ error: '인증이 필요합니다.' });
    const { postId, reason, detail } = request.body as {
      postId: string; reason: ReportReason; detail?: string;
    };
    return reportPost(postId, reporterId, reason, detail);
  });

  // GM 모더레이션: 임의 게시글 숨김/복원은 moderator 권한 필요
  fastify.patch(
    '/api/ugc/visibility',
    { preHandler: requireAdmin('moderator', 'ugc_set_visibility') },
    async (request: FastifyRequest) => {
      const { postId, isHidden } = request.body as { postId: string; isHidden: boolean };
      return { updated: await setPostVisibility(postId, isHidden) };
    },
  );

  // ═══ P12-06: 커뮤니티 이벤트 ═══

  // GM 전용: 커뮤니티 이벤트 생성은 admin 권한 필요. createdBy 는 인증된 GM 으로 강제.
  fastify.post(
    '/api/community-event',
    { preHandler: requireAdmin('admin', 'community_event_create') },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.authUserId;
      if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });
      const { createdBy: _ignoredCreatedBy, ...rest } = request.body as CommunityEventConfig;
      if (!rest.name || !rest.type || !rest.startAt || !rest.endAt) {
        return reply.status(400).send({ error: 'name, type, startAt, endAt 필수' });
      }
      const event = await createCommunityEvent({ ...rest, createdBy: userId });
      return event;
    },
  );

  fastify.get('/api/community-event/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const event = await getEvent(id);
    if (!event) return reply.status(404).send({ error: '이벤트 없음' });
    return event;
  });

  fastify.get('/api/community-events/active', async () => {
    return { events: await getActiveEvents() };
  });

  // GM 전용: 이벤트 취소는 admin 권한 필요
  fastify.post(
    '/api/community-event/:id/cancel',
    { preHandler: requireAdmin('admin', 'community_event_cancel') },
    async (request: FastifyRequest) => {
      const { id } = request.params as { id: string };
      return { cancelled: await cancelEvent(id) };
    },
  );

  fastify.post('/api/community-event/:id/join', async (request: FastifyRequest, reply: FastifyReply) => {
    // IDOR 방지: 참여자 = 인증된 행위자 (body.userId 신뢰 안 함)
    const userId = request.authUserId;
    if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });
    const { id } = request.params as { id: string };
    return joinEvent(id, userId);
  });

  // 점수 권위(authority): 임의 userId 의 점수를 임의 delta 로 조작하는 것을 막기 위해 admin 권한 필요
  fastify.post(
    '/api/community-event/:id/score',
    { preHandler: requireAdmin('admin', 'community_event_score') },
    async (request: FastifyRequest) => {
      const { id } = request.params as { id: string };
      const { userId, scoreDelta } = request.body as { userId: string; scoreDelta: number };
      const newScore = await updateScore(id, userId, scoreDelta);
      return { score: newScore };
    },
  );

  fastify.get('/api/community-event/:id/leaderboard', async (request: FastifyRequest) => {
    const { id } = request.params as { id: string };
    const { limit } = request.query as { limit?: string };
    return { leaderboard: await getEventLeaderboard(id, parseInt(limit || '50')) };
  });

  fastify.get('/api/community-events/multipliers', async () => {
    return getActiveMultipliers();
  });

  // 시스템/GM 전용: 이벤트 상태 동기화는 admin 권한 필요
  fastify.post(
    '/api/community-events/sync',
    { preHandler: requireAdmin('admin', 'community_event_sync') },
    async () => {
      return syncEventStatuses();
    },
  );

  // ═══ P12-07: 소셜 프로필 + 리더보드 ═══

  fastify.get('/api/profile/:userId', async (request: FastifyRequest, reply: FastifyReply) => {
    // IDOR 방지: 가시성 판정의 viewer 는 query.viewerId 가 아니라 인증된 행위자
    const viewerId = request.authUserId;
    if (!viewerId) return reply.status(401).send({ error: '인증이 필요합니다.' });
    const { userId } = request.params as { userId: string };
    const profile = await getPublicProfile(userId, viewerId);
    if (!profile) return reply.status(404).send({ error: '프로필 없음 또는 비공개' });
    return profile;
  });

  fastify.patch('/api/profile/visibility', async (request: FastifyRequest, reply: FastifyReply) => {
    // IDOR 방지: 본인 프로필 공개 설정만 변경 (body.userId 신뢰 안 함)
    const userId = request.authUserId;
    if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });
    const { visibility } = request.body as { visibility: ProfileVisibility };
    return { updated: await setProfileVisibility(userId, visibility) };
  });

  fastify.get('/api/leaderboard/:type', async (request: FastifyRequest) => {
    const { type } = request.params as { type: LeaderboardType };
    const { limit, offset } = request.query as { limit?: string; offset?: string };
    const board = await getLeaderboard(type, parseInt(limit || '100'), parseInt(offset || '0'));
    return { leaderboard: board };
  });

  fastify.get('/api/leaderboard/:type/friends', async (request: FastifyRequest, reply: FastifyReply) => {
    // IDOR 방지: 친구 리더보드는 인증된 본인의 친구 관계 기준
    const userId = request.authUserId;
    if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });
    const { type } = request.params as { type: LeaderboardType };
    const board = await getFriendLeaderboard(userId, type);
    return { leaderboard: board };
  });

  fastify.get('/api/leaderboard/guild', async (request: FastifyRequest) => {
    const { limit } = request.query as { limit?: string };
    return { ranking: await getGuildRanking(parseInt(limit || '50')) };
  });
}

// ─── HTML 이스케이프 ────────────────────────────────────────────

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
