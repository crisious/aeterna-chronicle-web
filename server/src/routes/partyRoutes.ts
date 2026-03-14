/**
 * partyRoutes.ts — P27-01: 파티 시스템 전용 API
 *
 * socialRoutes의 기본 파티 CRUD 를 보완하는 확장 엔드포인트:
 *   POST   /api/party/invite           — 파티 초대
 *   POST   /api/party/invite/accept    — 초대 수락
 *   POST   /api/party/invite/reject    — 초대 거절
 *   POST   /api/party/disband          — 파티 해산
 *   POST   /api/party/kick             — 멤버 추방
 *   GET    /api/party/search           — 파티 찾기
 *   GET    /api/party/:id/combat       — 파티 전투 상태 조회
 *   POST   /api/party/:id/ready        — 전투 준비 완료 토글
 *   POST   /api/party/:id/reward       — 파티 보상 분배
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../db';

// ── 타입 정의 ──────────────────────────────────────────────────

interface InviteBody {
  partyId: string;
  inviterId: string;
  targetUserId: string;
}

interface InviteResponseBody {
  inviteId: string;
  userId: string;
}

interface DisbandBody {
  partyId: string;
  leaderId: string;
}

interface KickBody {
  partyId: string;
  leaderId: string;
  targetUserId: string;
}

interface SearchQuery {
  minLevel?: string;
  maxLevel?: string;
  className?: string;
  page?: string;
  limit?: string;
}

interface PartyIdParams {
  id: string;
}

interface ReadyBody {
  userId: string;
  ready: boolean;
}

interface RewardBody {
  userId: string;
  distribution: 'equal' | 'contribution' | 'leader';
  rewards: Array<{ itemId: string; quantity: number }>;
  goldTotal: number;
}

// ── 유틸 ──────────────────────────────────────────────────────

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : 'Unknown error';
}

// ── 라우트 등록 ─────────────────────────────────────────────────

export async function partyRoutes(fastify: FastifyInstance): Promise<void> {

  // ═══ 파티 초대 ═══

  /** POST /api/party/invite — 파티 초대 발송 */
  fastify.post('/api/party/invite', async (request: FastifyRequest, reply: FastifyReply) => {
    const { partyId, inviterId, targetUserId } = request.body as InviteBody;
    if (!partyId || !inviterId || !targetUserId) {
      return reply.status(400).send({ error: 'partyId, inviterId, targetUserId 필수' });
    }

    try {
      // 파티 존재 + 초대자가 멤버인지 확인
      const party = await prisma.party.findUnique({
        where: { id: partyId },
        include: { members: true },
      });
      if (!party) return reply.status(404).send({ error: '파티를 찾을 수 없습니다' });

      const isMember = party.members.some(m => m.userId === inviterId);
      if (!isMember) return reply.status(403).send({ error: '파티 멤버만 초대할 수 있습니다' });

      if (party.members.length >= 4) {
        return reply.status(400).send({ error: '파티 최대 인원(4명)에 도달했습니다' });
      }

      // 이미 파티에 있는지 확인
      const alreadyMember = party.members.some(m => m.userId === targetUserId);
      if (alreadyMember) return reply.status(409).send({ error: '이미 파티에 있는 유저입니다' });

      // 초대 레코드 생성
      const invite = await prisma.partyInvite.create({
        data: {
          partyId,
          inviterId,
          targetUserId,
          status: 'pending',
          expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5분 만료
        },
      });

      return reply.status(201).send({ invite });
    } catch (err: unknown) {
      return reply.status(400).send({ error: errMsg(err) });
    }
  });

  /** POST /api/party/invite/accept — 초대 수락 */
  fastify.post('/api/party/invite/accept', async (request: FastifyRequest, reply: FastifyReply) => {
    const { inviteId, userId } = request.body as InviteResponseBody;
    if (!inviteId || !userId) return reply.status(400).send({ error: 'inviteId, userId 필수' });

    try {
      const invite = await prisma.partyInvite.findUnique({ where: { id: inviteId } });
      if (!invite || invite.targetUserId !== userId) {
        return reply.status(404).send({ error: '초대를 찾을 수 없습니다' });
      }
      if (invite.status !== 'pending') {
        return reply.status(400).send({ error: `이미 처리된 초대입니다 (${invite.status})` });
      }
      if (invite.expiresAt < new Date()) {
        await prisma.partyInvite.update({ where: { id: inviteId }, data: { status: 'expired' } });
        return reply.status(410).send({ error: '만료된 초대입니다' });
      }

      // 초대 상태 업데이트 + 파티 멤버 추가
      const [, party] = await prisma.$transaction([
        prisma.partyInvite.update({ where: { id: inviteId }, data: { status: 'accepted' } }),
        prisma.party.update({
          where: { id: invite.partyId },
          data: { members: { create: { userId, role: 'member' } } },
          include: { members: true },
        }),
      ]);

      return reply.send({ party });
    } catch (err: unknown) {
      return reply.status(400).send({ error: errMsg(err) });
    }
  });

  /** POST /api/party/invite/reject — 초대 거절 */
  fastify.post('/api/party/invite/reject', async (request: FastifyRequest, reply: FastifyReply) => {
    const { inviteId, userId } = request.body as InviteResponseBody;
    if (!inviteId || !userId) return reply.status(400).send({ error: 'inviteId, userId 필수' });

    try {
      const invite = await prisma.partyInvite.findUnique({ where: { id: inviteId } });
      if (!invite || invite.targetUserId !== userId) {
        return reply.status(404).send({ error: '초대를 찾을 수 없습니다' });
      }

      await prisma.partyInvite.update({ where: { id: inviteId }, data: { status: 'rejected' } });
      return reply.send({ success: true });
    } catch (err: unknown) {
      return reply.status(400).send({ error: errMsg(err) });
    }
  });

  // ═══ 파티 해산/추방 ═══

  /** POST /api/party/disband — 파티 해산 (리더 전용) */
  fastify.post('/api/party/disband', async (request: FastifyRequest, reply: FastifyReply) => {
    const { partyId, leaderId } = request.body as DisbandBody;
    if (!partyId || !leaderId) return reply.status(400).send({ error: 'partyId, leaderId 필수' });

    try {
      const party = await prisma.party.findUnique({ where: { id: partyId } });
      if (!party) return reply.status(404).send({ error: '파티를 찾을 수 없습니다' });
      if (party.leaderId !== leaderId) return reply.status(403).send({ error: '리더만 해산할 수 있습니다' });

      await prisma.$transaction([
        prisma.partyMember.deleteMany({ where: { partyId } }),
        prisma.partyInvite.deleteMany({ where: { partyId } }),
        prisma.party.delete({ where: { id: partyId } }),
      ]);

      return reply.send({ success: true, disbanded: true });
    } catch (err: unknown) {
      return reply.status(400).send({ error: errMsg(err) });
    }
  });

  /** POST /api/party/kick — 멤버 추방 (리더 전용) */
  fastify.post('/api/party/kick', async (request: FastifyRequest, reply: FastifyReply) => {
    const { partyId, leaderId, targetUserId } = request.body as KickBody;
    if (!partyId || !leaderId || !targetUserId) {
      return reply.status(400).send({ error: 'partyId, leaderId, targetUserId 필수' });
    }

    try {
      const party = await prisma.party.findUnique({ where: { id: partyId } });
      if (!party) return reply.status(404).send({ error: '파티를 찾을 수 없습니다' });
      if (party.leaderId !== leaderId) return reply.status(403).send({ error: '리더만 추방할 수 있습니다' });
      if (targetUserId === leaderId) return reply.status(400).send({ error: '리더는 자신을 추방할 수 없습니다' });

      await prisma.partyMember.deleteMany({ where: { partyId, userId: targetUserId } });

      const updated = await prisma.party.findUnique({
        where: { id: partyId },
        include: { members: true },
      });

      return reply.send({ party: updated });
    } catch (err: unknown) {
      return reply.status(400).send({ error: errMsg(err) });
    }
  });

  // ═══ 파티 찾기 ═══

  /** GET /api/party/search — 공개 파티 검색 */
  fastify.get('/api/party/search', async (request: FastifyRequest, reply: FastifyReply) => {
    const query = request.query as SearchQuery;
    const page = query.page ? parseInt(query.page, 10) : 1;
    const limit = query.limit ? Math.min(parseInt(query.limit, 10), 20) : 10;

    try {
      const where: Record<string, unknown> = { isPublic: true };
      if (query.minLevel) (where as Record<string, unknown>).minLevel = { gte: parseInt(query.minLevel, 10) };

      const [parties, total] = await prisma.$transaction([
        prisma.party.findMany({
          where,
          include: { members: { include: { user: { select: { id: true, name: true } } } } },
          take: limit,
          skip: (page - 1) * limit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.party.count({ where }),
      ]);

      return reply.send({ parties, total, page, pages: Math.ceil(total / limit) });
    } catch (err: unknown) {
      return reply.status(500).send({ error: errMsg(err) });
    }
  });

  // ═══ 파티 전투 동기화 (P27-03) ═══

  /** GET /api/party/:id/combat — 파티 전투 상태 조회 */
  fastify.get('/api/party/:id/combat', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as PartyIdParams;

    try {
      const party = await prisma.party.findUnique({
        where: { id },
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  characters: {
                    where: { isActive: true },
                    select: { id: true, classId: true, level: true, hp: true, maxHp: true, mp: true, maxMp: true },
                    take: 1,
                  },
                },
              },
            },
          },
        },
      });

      if (!party) return reply.status(404).send({ error: '파티를 찾을 수 없습니다' });

      const combatState = party.members.map(m => {
        const char = m.user.characters[0];
        return {
          userId: m.userId,
          userName: m.user.name,
          role: m.role,
          ready: m.combatReady ?? false,
          character: char ? {
            id: char.id,
            classId: char.classId,
            level: char.level,
            hp: char.hp,
            maxHp: char.maxHp,
            mp: char.mp,
            maxMp: char.maxMp,
          } : null,
        };
      });

      return reply.send({ partyId: id, combatState });
    } catch (err: unknown) {
      return reply.status(500).send({ error: errMsg(err) });
    }
  });

  /** POST /api/party/:id/ready — 전투 준비 토글 */
  fastify.post('/api/party/:id/ready', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as PartyIdParams;
    const { userId, ready } = request.body as ReadyBody;
    if (!userId) return reply.status(400).send({ error: 'userId 필수' });

    try {
      await prisma.partyMember.updateMany({
        where: { partyId: id, userId },
        data: { combatReady: ready },
      });

      // 전원 준비 완료 확인
      const members = await prisma.partyMember.findMany({ where: { partyId: id } });
      const allReady = members.every(m => m.combatReady);

      return reply.send({ ready, allReady, readyCount: members.filter(m => m.combatReady).length, total: members.length });
    } catch (err: unknown) {
      return reply.status(400).send({ error: errMsg(err) });
    }
  });

  /** POST /api/party/:id/reward — 파티 보상 분배 */
  fastify.post('/api/party/:id/reward', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as PartyIdParams;
    const { distribution, rewards, goldTotal } = request.body as RewardBody;

    try {
      const party = await prisma.party.findUnique({
        where: { id },
        include: { members: true },
      });
      if (!party) return reply.status(404).send({ error: '파티를 찾을 수 없습니다' });

      const memberCount = party.members.length;
      const goldPerMember = Math.floor(goldTotal / memberCount);

      const distributions = party.members.map(m => ({
        userId: m.userId,
        gold: distribution === 'leader' && m.userId === party.leaderId
          ? goldTotal
          : goldPerMember,
        items: distribution === 'equal'
          ? rewards.map(r => ({ ...r, quantity: Math.floor(r.quantity / memberCount) }))
          : [],
      }));

      // 골드 분배 트랜잭션
      await prisma.$transaction(
        distributions.map(d =>
          prisma.character.updateMany({
            where: { userId: d.userId, isActive: true },
            data: { gold: { increment: d.gold } },
          }),
        ),
      );

      return reply.send({ success: true, distributions });
    } catch (err: unknown) {
      return reply.status(400).send({ error: errMsg(err) });
    }
  });
}
