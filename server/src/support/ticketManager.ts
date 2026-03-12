/**
 * P9-16: 고객 지원 티켓 관리 시스템
 * - Prisma: SupportTicket 모델
 * - 인게임 문의 API: 생성/조회/답변
 * - 어드민 티켓 관리: 목록/필터/할당/답변/종료
 */

import { prisma } from '../db';
import { writeAuditLog } from '../admin/auditLogger';

// ─── 타입 정의 ──────────────────────────────────────────────────

export enum TicketCategory {
  PAYMENT = 'PAYMENT',
  BUG_REPORT = 'BUG_REPORT',
  ACCOUNT = 'ACCOUNT',
  ABUSE_REPORT = 'ABUSE_REPORT',
  GAMEPLAY = 'GAMEPLAY',
  SUGGESTION = 'SUGGESTION',
  OTHER = 'OTHER',
}

export enum TicketStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  WAITING_USER = 'WAITING_USER',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

export enum TicketPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export interface TicketMessage {
  id: string;
  ticketId: string;
  senderId: string;
  senderType: 'USER' | 'ADMIN' | 'SYSTEM';
  content: string;
  attachments?: string[];
  createdAt: Date;
}

export interface CreateTicketInput {
  userId: string;
  category: TicketCategory;
  subject: string;
  message: string;
  attachments?: string[];
}

export interface TicketFilterOptions {
  status?: TicketStatus;
  category?: TicketCategory;
  priority?: TicketPriority;
  assignedTo?: string;
  userId?: string;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'priority';
  sortOrder?: 'asc' | 'desc';
}

// ─── 자동 우선순위 결정 ─────────────────────────────────────────

function autoAssignPriority(category: TicketCategory): TicketPriority {
  switch (category) {
    case TicketCategory.PAYMENT:
      return TicketPriority.HIGH;
    case TicketCategory.ABUSE_REPORT:
      return TicketPriority.HIGH;
    case TicketCategory.ACCOUNT:
      return TicketPriority.MEDIUM;
    case TicketCategory.BUG_REPORT:
      return TicketPriority.MEDIUM;
    case TicketCategory.GAMEPLAY:
      return TicketPriority.LOW;
    case TicketCategory.SUGGESTION:
      return TicketPriority.LOW;
    default:
      return TicketPriority.LOW;
  }
}

// ─── 티켓 생성 ──────────────────────────────────────────────────

/**
 * 인게임 문의 티켓을 생성한다.
 */
export async function createTicket(input: CreateTicketInput) {
  const priority = autoAssignPriority(input.category);

  const ticket = await prisma.supportTicket.create({
    data: {
      userId: input.userId,
      category: input.category,
      subject: input.subject,
      status: TicketStatus.OPEN,
      priority,
      messages: {
        create: {
          senderId: input.userId,
          senderType: 'USER',
          content: input.message,
          attachments: input.attachments ?? [],
        },
      },
    },
    include: { messages: true },
  });

  return ticket;
}

// ─── 티켓 조회 (유저) ───────────────────────────────────────────

/**
 * 유저의 자신의 티켓 목록을 조회한다.
 */
export async function getUserTickets(userId: string, page = 1, limit = 10) {
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    prisma.supportTicket.findMany({
      where: { userId },
      include: {
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { updatedAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.supportTicket.count({ where: { userId } }),
  ]);
  return { items, total, page, limit };
}

/**
 * 티켓 상세 조회 (유저용 — 본인 티켓만)
 */
export async function getTicketDetail(ticketId: string, userId: string) {
  const ticket = await prisma.supportTicket.findFirst({
    where: { id: ticketId, userId },
    include: {
      messages: { orderBy: { createdAt: 'asc' } },
    },
  });
  return ticket;
}

// ─── 유저 답변 ──────────────────────────────────────────────────

/**
 * 유저가 기존 티켓에 답변(메시지)을 추가한다.
 */
export async function addUserReply(ticketId: string, userId: string, content: string, attachments?: string[]) {
  // 본인 티켓인지 확인
  const ticket = await prisma.supportTicket.findFirst({
    where: { id: ticketId, userId },
  });
  if (!ticket) throw new Error('TICKET_NOT_FOUND');
  if (ticket.status === TicketStatus.CLOSED) throw new Error('TICKET_CLOSED');

  const message = await prisma.ticketMessage.create({
    data: {
      ticketId,
      senderId: userId,
      senderType: 'USER',
      content,
      attachments: attachments ?? [],
    },
  });

  // 상태를 OPEN으로 변경 (어드민 응답 대기)
  await prisma.supportTicket.update({
    where: { id: ticketId },
    data: { status: TicketStatus.OPEN, updatedAt: new Date() },
  });

  return message;
}

// ─── 어드민 티켓 관리 ───────────────────────────────────────────

/**
 * 어드민 티켓 목록 조회 (필터 지원)
 */
export async function getAdminTicketList(options: TicketFilterOptions) {
  const { status, category, priority, assignedTo, userId, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = options;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (category) where.category = category;
  if (priority) where.priority = priority;
  if (assignedTo) where.assignedTo = assignedTo;
  if (userId) where.userId = userId;

  const [items, total] = await Promise.all([
    prisma.supportTicket.findMany({
      where,
      include: {
        user: { select: { id: true, username: true, email: true } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
    }),
    prisma.supportTicket.count({ where }),
  ]);

  return { items, total, page, limit };
}

/**
 * 어드민이 티켓을 자신에게 할당한다.
 */
export async function assignTicket(ticketId: string, adminId: string) {
  const ticket = await prisma.supportTicket.update({
    where: { id: ticketId },
    data: {
      assignedTo: adminId,
      status: TicketStatus.IN_PROGRESS,
      updatedAt: new Date(),
    },
  });

  await writeAuditLog({
    adminId,
    action: 'TICKET_ASSIGNED',
    targetId: ticketId,
    details: { assignedTo: adminId },
  });

  return ticket;
}

/**
 * 어드민이 티켓에 답변한다.
 */
export async function addAdminReply(ticketId: string, adminId: string, content: string, attachments?: string[]) {
  const message = await prisma.ticketMessage.create({
    data: {
      ticketId,
      senderId: adminId,
      senderType: 'ADMIN',
      content,
      attachments: attachments ?? [],
    },
  });

  await prisma.supportTicket.update({
    where: { id: ticketId },
    data: { status: TicketStatus.WAITING_USER, updatedAt: new Date() },
  });

  return message;
}

/**
 * 어드민이 티켓을 종료한다.
 */
export async function closeTicket(ticketId: string, adminId: string, resolution: string) {
  const ticket = await prisma.supportTicket.update({
    where: { id: ticketId },
    data: {
      status: TicketStatus.CLOSED,
      resolution,
      closedAt: new Date(),
      closedBy: adminId,
      updatedAt: new Date(),
    },
  });

  // 종료 시스템 메시지
  await prisma.ticketMessage.create({
    data: {
      ticketId,
      senderId: adminId,
      senderType: 'SYSTEM',
      content: `티켓이 종료되었습니다. 해결 내용: ${resolution}`,
    },
  });

  await writeAuditLog({
    adminId,
    action: 'TICKET_CLOSED',
    targetId: ticketId,
    details: { resolution },
  });

  return ticket;
}

/**
 * 티켓 우선순위 변경 (어드민)
 */
export async function updateTicketPriority(ticketId: string, adminId: string, priority: TicketPriority) {
  const ticket = await prisma.supportTicket.update({
    where: { id: ticketId },
    data: { priority, updatedAt: new Date() },
  });

  await writeAuditLog({
    adminId,
    action: 'TICKET_PRIORITY_CHANGED',
    targetId: ticketId,
    details: { priority },
  });

  return ticket;
}

// ─── 통계 ───────────────────────────────────────────────────────

/**
 * 티켓 통계 (어드민 대시보드)
 */
export async function getTicketStats() {
  const [open, inProgress, waitingUser, resolved, closed, byCategory, avgResolutionTime] = await Promise.all([
    prisma.supportTicket.count({ where: { status: TicketStatus.OPEN } }),
    prisma.supportTicket.count({ where: { status: TicketStatus.IN_PROGRESS } }),
    prisma.supportTicket.count({ where: { status: TicketStatus.WAITING_USER } }),
    prisma.supportTicket.count({ where: { status: TicketStatus.RESOLVED } }),
    prisma.supportTicket.count({ where: { status: TicketStatus.CLOSED } }),
    prisma.supportTicket.groupBy({
      by: ['category'],
      _count: { id: true },
    }),
    prisma.$queryRaw`
      SELECT AVG(EXTRACT(EPOCH FROM ("closedAt" - "createdAt"))) as avg_seconds
      FROM "SupportTicket"
      WHERE "closedAt" IS NOT NULL
    ` as Promise<Array<{ avg_seconds: number }>>,
  ]);

  return {
    statusCounts: { open, inProgress, waitingUser, resolved, closed },
    total: open + inProgress + waitingUser + resolved + closed,
    byCategory,
    avgResolutionTimeHours: avgResolutionTime?.[0]?.avg_seconds
      ? Math.round(avgResolutionTime[0].avg_seconds / 3600)
      : null,
  };
}

export default {
  createTicket,
  getUserTickets,
  getTicketDetail,
  addUserReply,
  getAdminTicketList,
  assignTicket,
  addAdminReply,
  closeTicket,
  updateTicketPriority,
  getTicketStats,
};
