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

// ─── 요청 타입 정의 ─────────────────────────────────────────────

interface UserIdBody { userId: string; }
interface FriendRequestBody { userId: string; friendId: string; }
interface FriendAcceptBody { userId: string; friendId: string; }
interface FriendBlockBody { userId: string; targetId: string; }
interface FriendDeleteParams { id: string; }

interface PartyCreateBody { leaderId: string; name?: string; }
interface PartyJoinBody { partyId: string; userId: string; }
interface PartyLeaveBody { partyId: string; userId: string; }
interface PartyLeaderBody { partyId: string; currentLeaderId: string; newLeaderId: string; }
interface PartyIdParams { id: string; }

interface MailSendBody {
  senderId?: string;
  receiverId: string;
  subject: string;
  body: string;
  attachments?: Array<{ itemId: string; count: number }>;
}
interface MailInboxQuery { userId: string; page?: string; }
interface MailIdParams { id: string; }
interface MailCollectBody { userId: string; }

// ─── 라우트 등록 ────────────────────────────────────────────────

export async function socialRoutes(fastify: FastifyInstance): Promise<void> {

  // ═══ 친구 API ═══

  /** 친구 목록 조회 */
  fastify.get('/api/friends', async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.query as UserIdBody;
    if (!userId) return reply.status(400).send({ error: 'userId 필수' });

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
    const { userId } = request.query as UserIdBody;
    if (!userId) return reply.status(400).send({ error: 'userId 필수' });

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
    const { userId, friendId } = request.body as FriendRequestBody;
    if (!userId || !friendId) return reply.status(400).send({ error: 'userId, friendId 필수' });

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
    const { userId, friendId } = request.body as FriendAcceptBody;
    if (!userId || !friendId) return reply.status(400).send({ error: 'userId, friendId 필수' });

    try {
      const result = await acceptFriendRequest(userId, friendId);
      return reply.send(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return reply.status(400).send({ error: message });
    }
  });

  /** 사용자 차단 */
  fastify.post('/api/friends/block', async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId, targetId } = request.body as FriendBlockBody;
    if (!userId || !targetId) return reply.status(400).send({ error: 'userId, targetId 필수' });

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
    const { id: friendId } = request.params as FriendDeleteParams;
    const { userId } = request.query as UserIdBody;
    if (!userId || !friendId) return reply.status(400).send({ error: 'userId, friendId 필수' });

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
    const { leaderId, name } = request.body as PartyCreateBody;
    if (!leaderId) return reply.status(400).send({ error: 'leaderId 필수' });

    try {
      const party = await createParty(leaderId, name);
      return reply.status(201).send(party);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return reply.status(400).send({ error: message });
    }
  });

  /** 파티 참가 */
  fastify.post('/api/party/join', async (request: FastifyRequest, reply: FastifyReply) => {
    const { partyId, userId } = request.body as PartyJoinBody;
    if (!partyId || !userId) return reply.status(400).send({ error: 'partyId, userId 필수' });

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
    const { partyId, userId } = request.body as PartyLeaveBody;
    if (!partyId || !userId) return reply.status(400).send({ error: 'partyId, userId 필수' });

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
    const { partyId, currentLeaderId, newLeaderId } = request.body as PartyLeaderBody;
    if (!partyId || !currentLeaderId || !newLeaderId) {
      return reply.status(400).send({ error: 'partyId, currentLeaderId, newLeaderId 필수' });
    }

    try {
      const party = await transferLeader(partyId, currentLeaderId, newLeaderId);
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
    const { userId, page } = request.query as MailInboxQuery;
    if (!userId) return reply.status(400).send({ error: 'userId 필수' });

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
    const { senderId, receiverId, subject, body, attachments } = request.body as MailSendBody;
    if (!receiverId || !subject || !body) {
      return reply.status(400).send({ error: 'receiverId, subject, body 필수' });
    }

    try {
      const mail = await sendMail({ senderId, receiverId, subject, body, attachments });
      return reply.status(201).send(mail);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return reply.status(400).send({ error: message });
    }
  });

  /** 첨부 아이템 수령 */
  fastify.post('/api/mail/:id/collect', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as MailIdParams;
    const { userId } = request.body as MailCollectBody;
    if (!userId) return reply.status(400).send({ error: 'userId 필수' });

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
    const { id } = request.params as MailIdParams;
    const { userId } = request.query as UserIdBody;
    if (!userId) return reply.status(400).send({ error: 'userId 필수' });

    try {
      await deleteMail(id, userId);
      return reply.send({ success: true });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return reply.status(400).send({ error: message });
    }
  });
}
