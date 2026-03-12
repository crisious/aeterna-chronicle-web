/**
 * shareRoutes.ts — SNS 공유 + 스트리머 + 레퍼럴 + UGC + 소셜프로필 라우트 (P12-01~07)
 */
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { createShare, getShare, getSocialShareUrls, getUserShares, SharePayload } from '../social/shareManager';
import { broadcastEvent, registerWebhook, unregisterWebhook, getWebhooks, getQueueStatus, sendCustomMessage, DiscordWebhookConfig, DiscordEventType } from '../social/discordBot';
import { startStreaming, stopStreaming, updateSettings, getLiveStreamers, getOverlayData, joinSpectate, leaveSpectate, getSpectators, getSession, StreamerSettings } from '../social/streamerMode';
import { createReferralCode, getReferralCode, redeemReferralCode, claimReward, getUserRewards, getReferralStats } from '../social/referralManager';
import { createPost, getPost, deletePost, getFeed, toggleLike, reportPost, setPostVisibility, CreatePostInput, UgcFeedOptions, ReportReason } from '../social/ugcGallery';
import { createCommunityEvent, getEvent, getActiveEvents, cancelEvent, joinEvent, updateScore, getLeaderboard as getEventLeaderboard, getActiveMultipliers, syncEventStatuses, CommunityEventConfig } from '../event/communityEventEngine';
import { getPublicProfile, setProfileVisibility, getLeaderboard, getFriendLeaderboard, getGuildRanking, LeaderboardType, ProfileVisibility } from '../social/socialProfile';

export async function communityRoutes(fastify: FastifyInstance): Promise<void> {

  // ═══ P12-01: SNS 공유 ═══

  fastify.post('/api/share', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as SharePayload;
    if (!body.userId || !body.type || !body.resourceId) {
      return reply.status(400).send({ error: 'userId, type, resourceId 필수' });
    }
    const result = await createShare(body);
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
    const { userId } = request.params as { userId: string };
    const query = request.query as { limit?: string; offset?: string };
    const shares = await getUserShares(userId, parseInt(query.limit || '20'), parseInt(query.offset || '0'));
    return { shares };
  });

  // ═══ P12-02: Discord 봇 ═══

  fastify.post('/api/discord/webhook', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as { id: string } & DiscordWebhookConfig;
    if (!body.id || !body.url) return reply.status(400).send({ error: 'id, url 필수' });
    registerWebhook(body.id, body);
    return { success: true };
  });

  fastify.delete('/api/discord/webhook/:id', async (request: FastifyRequest) => {
    const { id } = request.params as { id: string };
    return { removed: unregisterWebhook(id) };
  });

  fastify.get('/api/discord/webhooks', async () => {
    return { webhooks: getWebhooks() };
  });

  fastify.post('/api/discord/broadcast', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as { eventType: DiscordEventType; data: Record<string, any> };
    if (!body.eventType) return reply.status(400).send({ error: 'eventType 필수' });
    const result = broadcastEvent(body.eventType, body.data || {});
    return result;
  });

  fastify.get('/api/discord/queue', async () => getQueueStatus());

  // ═══ P12-03: 스트리머 모드 ═══

  fastify.post('/api/streamer/start', async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId, settings } = request.body as { userId: string; settings?: Partial<StreamerSettings> };
    if (!userId) return reply.status(400).send({ error: 'userId 필수' });
    const session = await startStreaming(userId, settings);
    return session;
  });

  fastify.post('/api/streamer/stop', async (request: FastifyRequest) => {
    const { userId } = request.body as { userId: string };
    return { stopped: await stopStreaming(userId) };
  });

  fastify.patch('/api/streamer/settings', async (request: FastifyRequest) => {
    const { userId, settings } = request.body as { userId: string; settings: Partial<StreamerSettings> };
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

  fastify.post('/api/streamer/spectate/join', async (request: FastifyRequest) => {
    const { streamerId, spectatorId } = request.body as { streamerId: string; spectatorId: string };
    return { joined: joinSpectate(streamerId, spectatorId) };
  });

  fastify.post('/api/streamer/spectate/leave', async (request: FastifyRequest) => {
    const { streamerId, spectatorId } = request.body as { streamerId: string; spectatorId: string };
    return { left: leaveSpectate(streamerId, spectatorId) };
  });

  fastify.get('/api/streamer/spectators/:streamerId', async (request: FastifyRequest) => {
    const { streamerId } = request.params as { streamerId: string };
    return { spectators: getSpectators(streamerId) };
  });

  fastify.get('/api/streamer/session/:userId', async (request: FastifyRequest) => {
    const { userId } = request.params as { userId: string };
    return { session: getSession(userId) };
  });

  // ═══ P12-04: 레퍼럴 ═══

  fastify.post('/api/referral/code', async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId, maxUses, expiryDays } = request.body as { userId: string; maxUses?: number; expiryDays?: number };
    if (!userId) return reply.status(400).send({ error: 'userId 필수' });
    const code = await createReferralCode(userId, { maxUses, expiryDays });
    return code;
  });

  fastify.get('/api/referral/code/:code', async (request: FastifyRequest, reply: FastifyReply) => {
    const { code } = request.params as { code: string };
    const info = await getReferralCode(code);
    if (!info) return reply.status(404).send({ error: '코드 없음' });
    return info;
  });

  fastify.post('/api/referral/redeem', async (request: FastifyRequest) => {
    const { code, userId } = request.body as { code: string; userId: string };
    return redeemReferralCode(code, userId);
  });

  fastify.post('/api/referral/claim', async (request: FastifyRequest) => {
    const { rewardId, userId } = request.body as { rewardId: string; userId: string };
    return { claimed: await claimReward(rewardId, userId) };
  });

  fastify.get('/api/referral/rewards/:userId', async (request: FastifyRequest) => {
    const { userId } = request.params as { userId: string };
    return { rewards: await getUserRewards(userId) };
  });

  fastify.get('/api/referral/stats/:userId', async (request: FastifyRequest) => {
    const { userId } = request.params as { userId: string };
    return getReferralStats(userId);
  });

  // ═══ P12-05: UGC 갤러리 ═══

  fastify.post('/api/ugc/post', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as CreatePostInput;
    if (!body.authorId || !body.type || !body.title) {
      return reply.status(400).send({ error: 'authorId, type, title 필수' });
    }
    const post = await createPost(body);
    return post;
  });

  fastify.get('/api/ugc/post/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const post = await getPost(id);
    if (!post) return reply.status(404).send({ error: '게시글 없음' });
    return post;
  });

  fastify.delete('/api/ugc/post/:id', async (request: FastifyRequest) => {
    const { id } = request.params as { id: string };
    const { userId } = request.query as { userId: string };
    return { deleted: await deletePost(id, userId) };
  });

  fastify.get('/api/ugc/feed', async (request: FastifyRequest) => {
    const query = request.query as UgcFeedOptions;
    return { posts: await getFeed(query) };
  });

  fastify.post('/api/ugc/like', async (request: FastifyRequest) => {
    const { postId, userId } = request.body as { postId: string; userId: string };
    return toggleLike(postId, userId);
  });

  fastify.post('/api/ugc/report', async (request: FastifyRequest) => {
    const { postId, reporterId, reason, detail } = request.body as {
      postId: string; reporterId: string; reason: ReportReason; detail?: string;
    };
    return reportPost(postId, reporterId, reason, detail);
  });

  fastify.patch('/api/ugc/visibility', async (request: FastifyRequest) => {
    const { postId, isHidden } = request.body as { postId: string; isHidden: boolean };
    return { updated: await setPostVisibility(postId, isHidden) };
  });

  // ═══ P12-06: 커뮤니티 이벤트 ═══

  fastify.post('/api/community-event', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as CommunityEventConfig;
    if (!body.name || !body.type || !body.startAt || !body.endAt || !body.createdBy) {
      return reply.status(400).send({ error: 'name, type, startAt, endAt, createdBy 필수' });
    }
    const event = await createCommunityEvent(body);
    return event;
  });

  fastify.get('/api/community-event/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const event = await getEvent(id);
    if (!event) return reply.status(404).send({ error: '이벤트 없음' });
    return event;
  });

  fastify.get('/api/community-events/active', async () => {
    return { events: await getActiveEvents() };
  });

  fastify.post('/api/community-event/:id/cancel', async (request: FastifyRequest) => {
    const { id } = request.params as { id: string };
    return { cancelled: await cancelEvent(id) };
  });

  fastify.post('/api/community-event/:id/join', async (request: FastifyRequest) => {
    const { id } = request.params as { id: string };
    const { userId } = request.body as { userId: string };
    return joinEvent(id, userId);
  });

  fastify.post('/api/community-event/:id/score', async (request: FastifyRequest) => {
    const { id } = request.params as { id: string };
    const { userId, scoreDelta } = request.body as { userId: string; scoreDelta: number };
    const newScore = await updateScore(id, userId, scoreDelta);
    return { score: newScore };
  });

  fastify.get('/api/community-event/:id/leaderboard', async (request: FastifyRequest) => {
    const { id } = request.params as { id: string };
    const { limit } = request.query as { limit?: string };
    return { leaderboard: await getEventLeaderboard(id, parseInt(limit || '50')) };
  });

  fastify.get('/api/community-events/multipliers', async () => {
    return getActiveMultipliers();
  });

  fastify.post('/api/community-events/sync', async () => {
    return syncEventStatuses();
  });

  // ═══ P12-07: 소셜 프로필 + 리더보드 ═══

  fastify.get('/api/profile/:userId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.params as { userId: string };
    const { viewerId } = request.query as { viewerId?: string };
    const profile = await getPublicProfile(userId, viewerId);
    if (!profile) return reply.status(404).send({ error: '프로필 없음 또는 비공개' });
    return profile;
  });

  fastify.patch('/api/profile/visibility', async (request: FastifyRequest) => {
    const { userId, visibility } = request.body as { userId: string; visibility: ProfileVisibility };
    return { updated: await setProfileVisibility(userId, visibility) };
  });

  fastify.get('/api/leaderboard/:type', async (request: FastifyRequest) => {
    const { type } = request.params as { type: LeaderboardType };
    const { limit, offset } = request.query as { limit?: string; offset?: string };
    const board = await getLeaderboard(type, parseInt(limit || '100'), parseInt(offset || '0'));
    return { leaderboard: board };
  });

  fastify.get('/api/leaderboard/:type/friends', async (request: FastifyRequest) => {
    const { type } = request.params as { type: LeaderboardType };
    const { userId } = request.query as { userId: string };
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
