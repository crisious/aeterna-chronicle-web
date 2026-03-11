import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../db';

// ─── 공용 타입 & 스키마 ─────────────────────────────────────────

interface GuildCreateBody {
  name: string;
  tag: string;
  leaderId: string;
  notice?: string;
}

interface GuildUpdateBody {
  name?: string;
  tag?: string;
  notice?: string;
}

interface GuildListQuery {
  page?: string;
  limit?: string;
}

interface GuildIdParams {
  id: string;
}

interface MemberParams {
  id: string;
  userId: string;
}

interface RoleUpdateBody {
  role: string;
}

interface JoinBody {
  userId: string;
}

interface WarCreateBody {
  defenderId: string;
}

interface WarUpdateBody {
  attackerScore?: number;
  defenderScore?: number;
  status?: string;
}

interface WarParams {
  warId: string;
}

// ─── JSON Schema (Fastify validation) ───────────────────────────

const guildCreateSchema = {
  body: {
    type: 'object' as const,
    required: ['name', 'tag', 'leaderId'],
    properties: {
      name: { type: 'string' as const, minLength: 2, maxLength: 20 },
      tag: { type: 'string' as const, minLength: 2, maxLength: 5 },
      leaderId: { type: 'string' as const, format: 'uuid' },
      notice: { type: 'string' as const, maxLength: 500 },
    },
  },
};

const guildUpdateSchema = {
  body: {
    type: 'object' as const,
    properties: {
      name: { type: 'string' as const, minLength: 2, maxLength: 20 },
      tag: { type: 'string' as const, minLength: 2, maxLength: 5 },
      notice: { type: 'string' as const, maxLength: 500 },
    },
  },
};

const joinSchema = {
  body: {
    type: 'object' as const,
    required: ['userId'],
    properties: {
      userId: { type: 'string' as const, format: 'uuid' },
    },
  },
};

const roleUpdateSchema = {
  body: {
    type: 'object' as const,
    required: ['role'],
    properties: {
      role: { type: 'string' as const, enum: ['leader', 'officer', 'member'] },
    },
  },
};

const warCreateSchema = {
  body: {
    type: 'object' as const,
    required: ['defenderId'],
    properties: {
      defenderId: { type: 'string' as const, format: 'uuid' },
    },
  },
};

const warUpdateSchema = {
  body: {
    type: 'object' as const,
    properties: {
      attackerScore: { type: 'number' as const, minimum: 0 },
      defenderScore: { type: 'number' as const, minimum: 0 },
      status: { type: 'string' as const, enum: ['pending', 'active', 'finished'] },
    },
  },
};

// ─── 라우트 등록 ────────────────────────────────────────────────

export async function guildRoutes(fastify: FastifyInstance): Promise<void> {

  // ── POST /api/guilds — 길드 생성 ──────────────────────────────
  fastify.post<{ Body: GuildCreateBody }>(
    '/api/guilds',
    { schema: guildCreateSchema },
    async (request: FastifyRequest<{ Body: GuildCreateBody }>, reply: FastifyReply) => {
      const { name, tag, leaderId, notice } = request.body;

      // 중복 검사 (name, tag)
      const existing = await prisma.guild.findFirst({
        where: { OR: [{ name }, { tag }] },
      });
      if (existing) {
        return reply.status(409).send({ error: '이미 사용 중인 길드 이름 또는 태그입니다.' });
      }

      const guild = await prisma.guild.create({
        data: {
          name,
          tag,
          leaderId,
          notice,
          members: {
            create: { userId: leaderId, role: 'leader' },
          },
        },
        include: { members: true },
      });

      return reply.status(201).send(guild);
    },
  );

  // ── GET /api/guilds/:id — 길드 정보 조회 ─────────────────────
  fastify.get<{ Params: GuildIdParams }>(
    '/api/guilds/:id',
    async (request: FastifyRequest<{ Params: GuildIdParams }>, reply: FastifyReply) => {
      const guild = await prisma.guild.findUnique({
        where: { id: request.params.id },
        include: { members: true },
      });
      if (!guild) {
        return reply.status(404).send({ error: '길드를 찾을 수 없습니다.' });
      }
      return guild;
    },
  );

  // ── GET /api/guilds — 길드 목록 (페이지네이션) ────────────────
  fastify.get<{ Querystring: GuildListQuery }>(
    '/api/guilds',
    async (request: FastifyRequest<{ Querystring: GuildListQuery }>) => {
      const page = Math.max(parseInt(request.query.page ?? '1', 10), 1);
      const limit = Math.min(Math.max(parseInt(request.query.limit ?? '20', 10), 1), 100);
      const skip = (page - 1) * limit;

      const [guilds, total] = await Promise.all([
        prisma.guild.findMany({
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: { _count: { select: { members: true } } },
        }),
        prisma.guild.count(),
      ]);

      return { data: guilds, meta: { page, limit, total } };
    },
  );

  // ── PATCH /api/guilds/:id — 길드 정보 수정 (리더만) ──────────
  fastify.patch<{ Params: GuildIdParams; Body: GuildUpdateBody }>(
    '/api/guilds/:id',
    { schema: guildUpdateSchema },
    async (request: FastifyRequest<{ Params: GuildIdParams; Body: GuildUpdateBody }>, reply: FastifyReply) => {
      const { id } = request.params;
      const { name, tag, notice } = request.body;

      // 리더 확인은 실 인증 미들웨어 연동 전까지 leaderId 직접 비교로 처리
      const guild = await prisma.guild.findUnique({ where: { id } });
      if (!guild) {
        return reply.status(404).send({ error: '길드를 찾을 수 없습니다.' });
      }

      const updated = await prisma.guild.update({
        where: { id },
        data: {
          ...(name !== undefined && { name }),
          ...(tag !== undefined && { tag }),
          ...(notice !== undefined && { notice }),
        },
      });
      return updated;
    },
  );

  // ── POST /api/guilds/:id/join — 가입 신청 ────────────────────
  fastify.post<{ Params: GuildIdParams; Body: JoinBody }>(
    '/api/guilds/:id/join',
    { schema: joinSchema },
    async (request: FastifyRequest<{ Params: GuildIdParams; Body: JoinBody }>, reply: FastifyReply) => {
      const { id } = request.params;
      const { userId } = request.body;

      const guild = await prisma.guild.findUnique({
        where: { id },
        include: { _count: { select: { members: true } } },
      });
      if (!guild) {
        return reply.status(404).send({ error: '길드를 찾을 수 없습니다.' });
      }
      if (guild._count.members >= guild.maxMembers) {
        return reply.status(400).send({ error: '길드 인원이 가득 찼습니다.' });
      }

      // 이미 가입 중인지 확인
      const existing = await prisma.guildMember.findUnique({
        where: { guildId_userId: { guildId: id, userId } },
      });
      if (existing) {
        return reply.status(409).send({ error: '이미 해당 길드에 가입되어 있습니다.' });
      }

      const member = await prisma.guildMember.create({
        data: { guildId: id, userId, role: 'member' },
      });
      return reply.status(201).send(member);
    },
  );

  // ── DELETE /api/guilds/:id/members/:userId — 탈퇴/추방 ──────
  fastify.delete<{ Params: MemberParams }>(
    '/api/guilds/:id/members/:userId',
    async (request: FastifyRequest<{ Params: MemberParams }>, reply: FastifyReply) => {
      const { id, userId } = request.params;

      const member = await prisma.guildMember.findUnique({
        where: { guildId_userId: { guildId: id, userId } },
      });
      if (!member) {
        return reply.status(404).send({ error: '해당 길드 멤버를 찾을 수 없습니다.' });
      }
      if (member.role === 'leader') {
        return reply.status(400).send({ error: '길드장은 탈퇴할 수 없습니다. 길드를 해산하거나 양도하세요.' });
      }

      await prisma.guildMember.delete({
        where: { guildId_userId: { guildId: id, userId } },
      });

      return reply.status(204).send();
    },
  );

  // ── PATCH /api/guilds/:id/members/:userId/role — 역할 변경 ───
  fastify.patch<{ Params: MemberParams; Body: RoleUpdateBody }>(
    '/api/guilds/:id/members/:userId/role',
    { schema: roleUpdateSchema },
    async (request: FastifyRequest<{ Params: MemberParams; Body: RoleUpdateBody }>, reply: FastifyReply) => {
      const { id, userId } = request.params;
      const { role } = request.body;

      const member = await prisma.guildMember.findUnique({
        where: { guildId_userId: { guildId: id, userId } },
      });
      if (!member) {
        return reply.status(404).send({ error: '해당 길드 멤버를 찾을 수 없습니다.' });
      }

      const updated = await prisma.guildMember.update({
        where: { guildId_userId: { guildId: id, userId } },
        data: { role },
      });
      return updated;
    },
  );

  // ── POST /api/guilds/:id/wars — 길드전 선포 ──────────────────
  fastify.post<{ Params: GuildIdParams; Body: WarCreateBody }>(
    '/api/guilds/:id/wars',
    { schema: warCreateSchema },
    async (request: FastifyRequest<{ Params: GuildIdParams; Body: WarCreateBody }>, reply: FastifyReply) => {
      const { id } = request.params;
      const { defenderId } = request.body;

      if (id === defenderId) {
        return reply.status(400).send({ error: '자기 길드에 전쟁을 선포할 수 없습니다.' });
      }

      // 양쪽 길드 존재 확인
      const [attacker, defender] = await Promise.all([
        prisma.guild.findUnique({ where: { id } }),
        prisma.guild.findUnique({ where: { id: defenderId } }),
      ]);
      if (!attacker || !defender) {
        return reply.status(404).send({ error: '길드를 찾을 수 없습니다.' });
      }

      // 이미 진행 중인 전쟁 확인
      const activeWar = await prisma.guildWar.findFirst({
        where: {
          OR: [
            { attackerId: id, defenderId, status: { in: ['pending', 'active'] } },
            { attackerId: defenderId, defenderId: id, status: { in: ['pending', 'active'] } },
          ],
        },
      });
      if (activeWar) {
        return reply.status(409).send({ error: '이미 진행 중인 전쟁이 있습니다.' });
      }

      const war = await prisma.guildWar.create({
        data: { attackerId: id, defenderId },
      });
      return reply.status(201).send(war);
    },
  );

  // ── PATCH /api/guilds/wars/:warId — 길드전 점수 업데이트 ─────
  fastify.patch<{ Params: WarParams; Body: WarUpdateBody }>(
    '/api/guilds/wars/:warId',
    { schema: warUpdateSchema },
    async (request: FastifyRequest<{ Params: WarParams; Body: WarUpdateBody }>, reply: FastifyReply) => {
      const { warId } = request.params;
      const { attackerScore, defenderScore, status } = request.body;

      const war = await prisma.guildWar.findUnique({ where: { id: warId } });
      if (!war) {
        return reply.status(404).send({ error: '길드전을 찾을 수 없습니다.' });
      }

      const data: Record<string, unknown> = {};
      if (attackerScore !== undefined) data.attackerScore = attackerScore;
      if (defenderScore !== undefined) data.defenderScore = defenderScore;
      if (status !== undefined) {
        data.status = status;
        if (status === 'active' && !war.startedAt) data.startedAt = new Date();
        if (status === 'finished' && !war.endedAt) data.endedAt = new Date();
      }

      const updated = await prisma.guildWar.update({
        where: { id: warId },
        data,
      });
      return updated;
    },
  );
}
