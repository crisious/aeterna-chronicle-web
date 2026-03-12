/**
 * 어드민 대시보드 REST API 라우트
 * P4-07: 유저 관리 / 공지 / 감사 로그 / 통계 / 서버 상태 / 이벤트 관리
 */
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Prisma } from '@prisma/client';
import { prisma } from '../db';
import { requireAdmin, getAdminUser } from '../admin/authMiddleware';
import { writeAuditLog, queryAuditLogs } from '../admin/auditLogger';
import { inventoryManager } from '../inventory/inventoryManager';
import { getActiveSanctions, getUserSanctions, revokeSanction, applySanction, SanctionLevel } from '../security/abuseDetector';
import { getAdminTicketList, assignTicket, addAdminReply, closeTicket, updateTicketPriority, getTicketStats, TicketPriority } from '../support/ticketManager';
import type { Server as SocketServer } from 'socket.io';
import os from 'os';

// Socket.io 인스턴스 참조 (서버 초기화 시 설정)
let ioRef: SocketServer | null = null;

/** Socket.io 인스턴스를 어드민 라우트에 바인딩 */
export function setAdminSocketIo(io: SocketServer): void {
  ioRef = io;
}

// ─── 타입 정의 ──────────────────────────────────────────────────
interface UserSearchQuery {
  search?: string;
  role?: string;
  isBanned?: string;
  page?: string;
  limit?: string;
}

interface UserIdParams {
  id: string;
}

interface BanBody {
  reason?: string;
}

interface GrantItemBody {
  itemId: string;
  count?: number;
}

interface AnnouncementBody {
  title: string;
  content: string;
  type?: string;
  startAt?: string;
  endAt?: string;
}

interface AnnouncementIdParams {
  id: string;
}

interface LogQuery {
  action?: string;
  adminId?: string;
  from?: string;
  to?: string;
  page?: string;
  limit?: string;
}

interface EventBody {
  code: string;
  name: string;
  description: string;
  type?: string;
  config: Record<string, unknown>;
  rewards: Record<string, unknown>;
  startAt: string;
  endAt: string;
}

interface EventIdParams {
  id: string;
}

interface EventPatchBody {
  name?: string;
  description?: string;
  type?: string;
  config?: Record<string, unknown>;
  rewards?: Record<string, unknown>;
  isActive?: boolean;
  startAt?: string;
  endAt?: string;
}

// ─── 라우트 등록 ────────────────────────────────────────────────
export async function adminRoutes(fastify: FastifyInstance): Promise<void> {

  // ════════════════════════════════════════════════════════════
  // 1. 유저 관리
  // ════════════════════════════════════════════════════════════

  /** GET /admin/users — 유저 목록 (검색/필터/페이지네이션) */
  fastify.get<{ Querystring: UserSearchQuery }>('/admin/users', {
    preHandler: requireAdmin('moderator'),
  }, async (request, reply) => {
    const { search, role, isBanned, page: pageStr, limit: limitStr } = request.query;
    const page = Math.max(parseInt(pageStr || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(limitStr || '20', 10), 1), 100);

    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { id: search },
      ];
    }
    if (role) where.role = role;
    if (isBanned !== undefined) where.isBanned = isBanned === 'true';

    const [rawUsers, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true, email: true, role: true,
          isBanned: true, bannedAt: true, banReason: true, createdAt: true,
          // P10-03: admin-dashboard 기대 필드 추가
          characters: { select: { name: true, level: true }, take: 1, orderBy: { level: 'desc' } },
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    // P10-03: AdminUserRow DTO로 매핑 (nickname/level/lastLoginAt)
    const users = rawUsers.map((u) => ({
      id: u.id,
      email: u.email,
      nickname: u.characters[0]?.name ?? u.email.split('@')[0],
      role: u.role,
      isBanned: u.isBanned,
      bannedAt: u.bannedAt,
      banReason: u.banReason,
      level: u.characters[0]?.level ?? 1,
      lastLoginAt: u.updatedAt,
      createdAt: u.createdAt,
    }));

    return reply.send({ users, total, page, limit, totalPages: Math.ceil(total / limit) });
  });

  /** GET /admin/users/:id — 유저 상세 */
  fastify.get<{ Params: UserIdParams }>('/admin/users/:id', {
    preHandler: requireAdmin('moderator'),
  }, async (request, reply) => {
    const user = await prisma.user.findUnique({
      where: { id: request.params.id },
      select: {
        id: true, email: true, role: true,
        isBanned: true, bannedAt: true, banReason: true,
        createdAt: true, updatedAt: true,
        characters: { select: { id: true, name: true, classId: true, level: true } },
      },
    });
    if (!user) return reply.status(404).send({ error: '유저를 찾을 수 없습니다.' });

    // P10-03: AdminUserDetail DTO로 매핑
    const topChar = user.characters[0];
    return reply.send({
      ...user,
      nickname: topChar?.name ?? user.email.split('@')[0],
      level: topChar?.level ?? 1,
      lastLoginAt: user.updatedAt,
    });
  });

  /** PATCH /admin/users/:id/ban — 유저 밴 */
  fastify.patch<{ Params: UserIdParams; Body: BanBody }>('/admin/users/:id/ban', {
    preHandler: requireAdmin('admin', 'user_ban'),
  }, async (request, reply) => {
    const admin = getAdminUser(request);
    const { id } = request.params;
    const { reason } = request.body || {};

    const user = await prisma.user.update({
      where: { id },
      data: { isBanned: true, bannedAt: new Date(), banReason: reason || null },
      select: { id: true, email: true, isBanned: true, bannedAt: true, banReason: true },
    });

    await writeAuditLog({
      adminId: admin.userId, action: 'user_ban',
      targetType: 'user', targetId: id,
      details: { reason } as Prisma.InputJsonValue, ip: request.ip,
    });

    return reply.send(user);
  });

  /** PATCH /admin/users/:id/unban — 유저 밴 해제 */
  fastify.patch<{ Params: UserIdParams }>('/admin/users/:id/unban', {
    preHandler: requireAdmin('admin', 'user_unban'),
  }, async (request, reply) => {
    const admin = getAdminUser(request);
    const { id } = request.params;

    const user = await prisma.user.update({
      where: { id },
      data: { isBanned: false, bannedAt: null, banReason: null },
      select: { id: true, email: true, isBanned: true },
    });

    await writeAuditLog({
      adminId: admin.userId, action: 'user_unban',
      targetType: 'user', targetId: id,
      details: {} as Prisma.InputJsonValue, ip: request.ip,
    });

    return reply.send(user);
  });

  /** POST /admin/users/:id/grant-item — 아이템 지급 */
  fastify.post<{ Params: UserIdParams; Body: GrantItemBody }>('/admin/users/:id/grant-item', {
    preHandler: requireAdmin('admin', 'item_grant'),
  }, async (request, reply) => {
    const admin = getAdminUser(request);
    const { id } = request.params;
    const { itemId, count = 1 } = request.body;

    if (!itemId) return reply.status(400).send({ error: 'itemId는 필수입니다.' });

    // 유저 존재 확인
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return reply.status(404).send({ error: '유저를 찾을 수 없습니다.' });

    // 인벤토리 시스템 연동: 아이템 지급
    const grantResult = await inventoryManager.addItem(id, itemId, count);
    if (!grantResult.success) {
      return reply.status(400).send({ error: `아이템 지급 실패: ${grantResult.message}` });
    }

    await writeAuditLog({
      adminId: admin.userId, action: 'item_grant',
      targetType: 'item', targetId: id,
      details: { itemId, count, recipientUserId: id, slotId: grantResult.slotId } as Prisma.InputJsonValue,
      ip: request.ip,
    });

    return reply.send({ success: true, userId: id, itemId, count, slotId: grantResult.slotId });
  });

  // ════════════════════════════════════════════════════════════
  // 2. 공지사항
  // ════════════════════════════════════════════════════════════

  /** POST /admin/announcements — 공지 생성 */
  fastify.post<{ Body: AnnouncementBody }>('/admin/announcements', {
    preHandler: requireAdmin('admin', 'announcement_create'),
  }, async (request, reply) => {
    const admin = getAdminUser(request);
    const { title, content, type, startAt, endAt } = request.body;

    if (!title || !content) {
      return reply.status(400).send({ error: 'title과 content는 필수입니다.' });
    }

    const announcement = await prisma.announcement.create({
      data: {
        title,
        content,
        type: type || 'info',
        startAt: startAt ? new Date(startAt) : null,
        endAt: endAt ? new Date(endAt) : null,
        createdBy: admin.userId,
      },
    });

    await writeAuditLog({
      adminId: admin.userId, action: 'announcement_create',
      targetType: 'announcement', targetId: announcement.id,
      details: { title, type } as Prisma.InputJsonValue, ip: request.ip,
    });

    return reply.status(201).send(announcement);
  });

  /** GET /admin/announcements — 공지 목록 */
  fastify.get('/admin/announcements', {
    preHandler: requireAdmin('moderator'),
  }, async (_request, reply) => {
    const announcements = await prisma.announcement.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return reply.send(announcements);
  });

  /** DELETE /admin/announcements/:id — 공지 삭제 */
  fastify.delete<{ Params: AnnouncementIdParams }>('/admin/announcements/:id', {
    preHandler: requireAdmin('admin', 'announcement_delete'),
  }, async (request, reply) => {
    const admin = getAdminUser(request);
    const { id } = request.params;

    try {
      await prisma.announcement.delete({ where: { id } });
    } catch {
      return reply.status(404).send({ error: '공지를 찾을 수 없습니다.' });
    }

    await writeAuditLog({
      adminId: admin.userId, action: 'announcement_delete',
      targetType: 'announcement', targetId: id,
      details: {} as Prisma.InputJsonValue, ip: request.ip,
    });

    return reply.send({ success: true });
  });

  // ════════════════════════════════════════════════════════════
  // 3. 감사 로그 조회
  // ════════════════════════════════════════════════════════════

  /** GET /admin/logs — 감사 로그 조회 (타입/날짜 필터) */
  fastify.get<{ Querystring: LogQuery }>('/admin/logs', {
    preHandler: requireAdmin('admin'),
  }, async (request, reply) => {
    const { action, adminId, from, to, page, limit } = request.query;
    const result = await queryAuditLogs({
      action,
      adminId,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
    return reply.send(result);
  });

  // ════════════════════════════════════════════════════════════
  // 4. 통계 (DAU/MAU/동시접속/매출)
  // ════════════════════════════════════════════════════════════

  /** GET /admin/stats — 대시보드 통계 */
  fastify.get('/admin/stats', {
    preHandler: requireAdmin('admin'),
  }, async (_request, reply) => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // DAU: 오늘 생성된 또는 업데이트된 유저 수 (간이 지표)
    const dau = await prisma.user.count({
      where: { updatedAt: { gte: todayStart } },
    });

    // MAU: 이번 달 활동 유저 수
    const mau = await prisma.user.count({
      where: { updatedAt: { gte: monthStart } },
    });

    // 전체 유저 수
    const totalUsers = await prisma.user.count();

    // 밴된 유저 수
    const bannedUsers = await prisma.user.count({ where: { isBanned: true } });

    // 매출: 이번 달 구매 합계
    const revenueResult = await prisma.purchase.aggregate({
      _sum: { price: true },
      where: { createdAt: { gte: monthStart } },
    });

    // 동시접속 — Socket.io 실제 연결 수
    const concurrentUsers = ioRef ? ioRef.engine.clientsCount : 0;

    return reply.send({
      dau,
      mau,
      totalUsers,
      bannedUsers,
      monthlyRevenue: revenueResult._sum.price ?? 0,
      concurrentUsers,
      timestamp: now.toISOString(),
    });
  });

  // ════════════════════════════════════════════════════════════
  // 5. 서버 상태
  // ════════════════════════════════════════════════════════════

  /** GET /admin/server-health — 서버 헬스 체크 */
  fastify.get('/admin/server-health', {
    preHandler: requireAdmin('moderator'),
  }, async (_request, reply) => {
    const uptime = process.uptime();
    const mem = process.memoryUsage();

    // DB 연결 체크
    let dbStatus = 'ok';
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      dbStatus = 'error';
    }

    return reply.send({
      status: 'ok',
      uptime: Math.floor(uptime),
      memory: {
        rss: Math.round(mem.rss / 1024 / 1024),
        heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
        heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
      },
      system: {
        platform: os.platform(),
        cpus: os.cpus().length,
        loadAvg: os.loadavg(),
        freeMem: Math.round(os.freemem() / 1024 / 1024),
        totalMem: Math.round(os.totalmem() / 1024 / 1024),
      },
      db: dbStatus,
      timestamp: new Date().toISOString(),
    });
  });

  // ════════════════════════════════════════════════════════════
  // 6. 이벤트 관리
  // ════════════════════════════════════════════════════════════

  /** POST /admin/events — 이벤트 생성 */
  fastify.post<{ Body: EventBody }>('/admin/events', {
    preHandler: requireAdmin('admin', 'event_create'),
  }, async (request, reply) => {
    const admin = getAdminUser(request);
    const { code, name, description, type, config, rewards, startAt, endAt } = request.body;

    if (!code || !name || !description || !startAt || !endAt) {
      return reply.status(400).send({ error: 'code, name, description, startAt, endAt는 필수입니다.' });
    }

    const event = await prisma.gameEvent.create({
      data: {
        code,
        name,
        description,
        type: type || 'general',
        config: config as Prisma.InputJsonValue,
        rewards: (rewards ?? {}) as Prisma.InputJsonValue,
        startAt: new Date(startAt),
        endAt: new Date(endAt),
      },
    });

    await writeAuditLog({
      adminId: admin.userId, action: 'event_create',
      targetType: 'event', targetId: event.id,
      details: { name, type } as Prisma.InputJsonValue, ip: request.ip,
    });

    return reply.status(201).send(event);
  });

  /** PATCH /admin/events/:id — 이벤트 수정 */
  fastify.patch<{ Params: EventIdParams; Body: EventPatchBody }>('/admin/events/:id', {
    preHandler: requireAdmin('admin', 'event_update'),
  }, async (request, reply) => {
    const admin = getAdminUser(request);
    const { id } = request.params;
    const body = request.body;

    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.description !== undefined) data.description = body.description;
    if (body.type !== undefined) data.type = body.type;
    if (body.config !== undefined) data.config = body.config as Prisma.InputJsonValue;
    if (body.rewards !== undefined) data.rewards = body.rewards as Prisma.InputJsonValue;
    if (body.isActive !== undefined) data.isActive = body.isActive;
    if (body.startAt !== undefined) data.startAt = new Date(body.startAt);
    if (body.endAt !== undefined) data.endAt = new Date(body.endAt);

    try {
      const event = await prisma.gameEvent.update({ where: { id }, data });

      await writeAuditLog({
        adminId: admin.userId, action: 'event_update',
        targetType: 'event', targetId: id,
        details: data as Prisma.InputJsonValue, ip: request.ip,
      });

      return reply.send(event);
    } catch {
      return reply.status(404).send({ error: '이벤트를 찾을 수 없습니다.' });
    }
  });

  // ─── P9-14: 제재 관리 API ──────────────────────────────────────

  /** 활성 제재 목록 조회 */
  server.get('/admin/sanctions', { preHandler: [requireAdmin] }, async (request: FastifyRequest<{ Querystring: { page?: string; limit?: string } }>, reply: FastifyReply) => {
    const page = parseInt(request.query.page ?? '1', 10);
    const limit = parseInt(request.query.limit ?? '20', 10);
    const result = await getActiveSanctions(page, limit);
    return reply.send(result);
  });

  /** 특정 유저 제재 이력 조회 */
  server.get('/admin/sanctions/user/:id', { preHandler: [requireAdmin] }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const sanctions = await getUserSanctions(request.params.id);
    return reply.send({ userId: request.params.id, sanctions });
  });

  /** 수동 제재 적용 */
  server.post('/admin/sanctions', { preHandler: [requireAdmin] }, async (request: FastifyRequest<{ Body: { userId: string; level: string; reason: string; evidence?: string } }>, reply: FastifyReply) => {
    const admin = getAdminUser(request);
    const { userId, level, reason, evidence } = request.body as any;
    if (!Object.values(SanctionLevel).includes(level)) {
      return reply.status(400).send({ error: '유효하지 않은 제재 레벨입니다.' });
    }
    await applySanction(userId, level as SanctionLevel, reason, evidence ?? 'MANUAL_ADMIN', admin.id);
    return reply.send({ success: true, userId, level, reason });
  });

  /** 제재 해제 */
  server.delete('/admin/sanctions/:id', { preHandler: [requireAdmin] }, async (request: FastifyRequest<{ Params: { id: string }; Body: { reason: string } }>, reply: FastifyReply) => {
    const admin = getAdminUser(request);
    const { reason } = request.body as any;
    await revokeSanction(request.params.id, admin.id, reason);
    return reply.send({ success: true, sanctionId: request.params.id });
  });

  // ─── P9-16: 어드민 티켓 관리 API ──────────────────────────────

  /** 티켓 목록 (필터) */
  server.get('/admin/tickets', { preHandler: [requireAdmin] }, async (request: FastifyRequest<{ Querystring: Record<string, string> }>, reply: FastifyReply) => {
    const q = request.query;
    const result = await getAdminTicketList({
      status: q.status as any,
      category: q.category as any,
      priority: q.priority as any,
      assignedTo: q.assignedTo,
      userId: q.userId,
      page: q.page ? parseInt(q.page) : undefined,
      limit: q.limit ? parseInt(q.limit) : undefined,
    });
    return reply.send(result);
  });

  /** 티켓 통계 */
  server.get('/admin/tickets/stats', { preHandler: [requireAdmin] }, async (_request, reply: FastifyReply) => {
    const stats = await getTicketStats();
    return reply.send(stats);
  });

  /** 티켓 할당 */
  server.post('/admin/tickets/:id/assign', { preHandler: [requireAdmin] }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const admin = getAdminUser(request);
    const ticket = await assignTicket(request.params.id, admin.id);
    return reply.send(ticket);
  });

  /** 티켓 답변 */
  server.post('/admin/tickets/:id/reply', { preHandler: [requireAdmin] }, async (request: FastifyRequest<{ Params: { id: string }; Body: { content: string; attachments?: string[] } }>, reply: FastifyReply) => {
    const admin = getAdminUser(request);
    const { content, attachments } = request.body as any;
    const message = await addAdminReply(request.params.id, admin.id, content, attachments);
    return reply.send(message);
  });

  /** 티켓 종료 */
  server.post('/admin/tickets/:id/close', { preHandler: [requireAdmin] }, async (request: FastifyRequest<{ Params: { id: string }; Body: { resolution: string } }>, reply: FastifyReply) => {
    const admin = getAdminUser(request);
    const { resolution } = request.body as any;
    const ticket = await closeTicket(request.params.id, admin.id, resolution);
    return reply.send(ticket);
  });

  /** 티켓 우선순위 변경 */
  server.patch('/admin/tickets/:id/priority', { preHandler: [requireAdmin] }, async (request: FastifyRequest<{ Params: { id: string }; Body: { priority: string } }>, reply: FastifyReply) => {
    const admin = getAdminUser(request);
    const { priority } = request.body as any;
    if (!Object.values(TicketPriority).includes(priority as TicketPriority)) {
      return reply.status(400).send({ error: '유효하지 않은 우선순위입니다.' });
    }
    const ticket = await updateTicketPriority(request.params.id, admin.id, priority as TicketPriority);
    return reply.send(ticket);
  });
}
