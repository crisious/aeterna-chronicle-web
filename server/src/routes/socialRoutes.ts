import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend,
  blockUser,
  getFriendList,
  getPendingRequests,
  createParty,
  joinParty,
  leaveParty,
  transferLeader,
  getParty,
} from '../social/socialManager';
import {
  sendMail,
  getInbox,
  collectAttachments,
  deleteMail,
} from '../social/mailSystem';
import { extractUserIdFromRequest } from '../security/jwtManager';

// ─── 요청 타입 정의 ─────────────────────────────────────────────

interface FriendRequestBody { friendId: string; }
interface FriendBlockBody { targetId: string; }
interface FriendDeleteParams { id: string; }

interface PartyCreateBody { name?: string; }
interface PartyJoinBody { partyId: string; }
interface PartyLeaveBody { partyId: string; }
interface PartyLeaderBody { partyId: string; newLeaderId: string; }
interface PartyIdParams { id: string; }

interface MailSendBody {
  receiverId: string;
  subject: string;
  body: string;
  attachments?: Array<{ itemId: string; count: number }>;
}
interface MailInboxQuery { page?: string; }
interface MailIdParams { id: string; }

// ─── 라우트 등록 ────────────────────────────────────────────────

export async function socialRoutes(fastify: FastifyInstance): Promise<void> {

  // ═══ 친구 API ═══

  /** 친구 목록 조회 */
  fastify.get('/api/friends', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = await extractUserIdFromRequest(request);
    if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });

    try {
      const friends = await getFriendList(userId);
      return reply.send({ friends });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return reply.status(500).send({ error: message });
    }
  });

  /** 받은 친구 요청 목록 */
  fastify.get('/api/friends/pending', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = await extractUserIdFromRequest(request);
    if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });

    try {
      const requests = await getPendingRequests(userId);
      return reply.send({ requests });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return reply.status(500).send({ error: message });
    }
  });

  /** 친구 요청 발송 */
  fastify.post('/api/friends/request', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = await extractUserIdFromRequest(request);
    if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });
    const { friendId } = request.body as FriendRequestBody;
    if (!friendId) return reply.status(400).send({ error: 'friendId 필수' });

    try {
      const result = await sendFriendRequest(userId, friendId);
      return reply.status(201).send(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return reply.status(400).send({ error: message });
    }
  });

  /** 친구 요청 수락 */
  fastify.post('/api/friends/accept', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = await extractUserIdFromRequest(request);
    if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });
    const { friendId } = request.body as FriendRequestBody;
    if (!friendId) return reply.status(400).send({ error: 'friendId 필수' });

    try {
      const result = await acceptFriendRequest(userId, friendId);
      return reply.send(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return reply.status(400).send({ error: message });
    }
  });

  /** 친구 요청 거절 (P30 추가) */
  fastify.post('/api/friends/reject', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = await extractUserIdFromRequest(request);
    if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });
    const { friendId } = request.body as FriendRequestBody;
    if (!friendId) return reply.status(400).send({ error: 'friendId 필수' });

    try {
      const result = await rejectFriendRequest(userId, friendId);
      return reply.send(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return reply.status(400).send({ error: message });
    }
  });

  /** 사용자 차단 */
  fastify.post('/api/friends/block', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = await extractUserIdFromRequest(request);
    if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });
    const { targetId } = request.body as FriendBlockBody;
    if (!targetId) return reply.status(400).send({ error: 'targetId 필수' });

    try {
      const result = await blockUser(userId, targetId);
      return reply.send(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return reply.status(400).send({ error: message });
    }
  });

  /** 친구 삭제 */
  fastify.delete('/api/friends/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = await extractUserIdFromRequest(request);
    if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });
    const { id: friendId } = request.params as FriendDeleteParams;
    if (!friendId) return reply.status(400).send({ error: 'friendId 필수' });

    try {
      await removeFriend(userId, friendId);
      return reply.send({ success: true });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return reply.status(400).send({ error: message });
    }
  });

  // ═══ 파티 API ═══

  /** 파티 생성 */
  fastify.post('/api/party/create', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = await extractUserIdFromRequest(request);
    if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });
    const { name } = request.body as PartyCreateBody;

    try {
      const party = await createParty(userId, name);
      return reply.status(201).send(party);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return reply.status(400).send({ error: message });
    }
  });

  /** 파티 참가 */
  fastify.post('/api/party/join', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = await extractUserIdFromRequest(request);
    if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });
    const { partyId } = request.body as PartyJoinBody;
    if (!partyId) return reply.status(400).send({ error: 'partyId 필수' });

    try {
      const party = await joinParty(partyId, userId);
      return reply.send(party);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return reply.status(400).send({ error: message });
    }
  });

  /** 파티 탈퇴 */
  fastify.post('/api/party/leave', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = await extractUserIdFromRequest(request);
    if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });
    const { partyId } = request.body as PartyLeaveBody;
    if (!partyId) return reply.status(400).send({ error: 'partyId 필수' });

    try {
      const result = await leaveParty(partyId, userId);
      return reply.send(result ?? { success: true, disbanded: true });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return reply.status(400).send({ error: message });
    }
  });

  /** 리더 위임 */
  fastify.patch('/api/party/leader', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = await extractUserIdFromRequest(request);
    if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });
    const { partyId, newLeaderId } = request.body as PartyLeaderBody;
    if (!partyId || !newLeaderId) {
      return reply.status(400).send({ error: 'partyId, newLeaderId 필수' });
    }

    try {
      const party = await transferLeader(partyId, userId, newLeaderId);
      return reply.send(party);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return reply.status(400).send({ error: message });
    }
  });

  /** 파티 조회 */
  fastify.get('/api/party/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as PartyIdParams;

    try {
      const party = await getParty(id);
      if (!party) return reply.status(404).send({ error: '파티를 찾을 수 없습니다.' });
      return reply.send(party);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return reply.status(500).send({ error: message });
    }
  });

  // ═══ 우편 API ═══

  /** 수신함 조회 */
  fastify.get('/api/mail/inbox', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = await extractUserIdFromRequest(request);
    if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });
    const { page } = request.query as MailInboxQuery;

    try {
      const result = await getInbox(userId, page ? parseInt(page, 10) : 1);
      return reply.send(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return reply.status(500).send({ error: message });
    }
  });

  /** 우편 발송 */
  fastify.post('/api/mail/send', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = await extractUserIdFromRequest(request);
    if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });
    const { receiverId, subject, body, attachments } = request.body as MailSendBody;
    if (!receiverId || !subject || !body) {
      return reply.status(400).send({ error: 'receiverId, subject, body 필수' });
    }

    try {
      const mail = await sendMail({ senderId: userId, receiverId, subject, body, attachments });
      return reply.status(201).send(mail);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return reply.status(400).send({ error: message });
    }
  });

  /** 첨부 아이템 수령 */
  fastify.post('/api/mail/:id/collect', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = await extractUserIdFromRequest(request);
    if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });
    const { id } = request.params as MailIdParams;

    try {
      const result = await collectAttachments(id, userId);
      return reply.send(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return reply.status(400).send({ error: message });
    }
  });

  /** 우편 삭제 */
  fastify.delete('/api/mail/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = await extractUserIdFromRequest(request);
    if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });
    const { id } = request.params as MailIdParams;

    try {
      await deleteMail(id, userId);
      return reply.send({ success: true });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return reply.status(400).send({ error: message });
    }
  });
}
