/**
 * notificationManager.ts — 알림 시스템 (P5-10)
 *
 * 역할:
 *   - 알림 생성/조회/읽음 처리/일괄 읽음/삭제
 *   - Socket.io 실시간 푸시 (notification:new, notification:badge)
 */

import { prisma } from '../db';
import type { Server } from 'socket.io';

// ── 타입 정의 ──────────────────────────────────────────────────

/** 알림 타입 */
export type NotificationType =
  | 'system'
  | 'achievement'
  | 'mail'
  | 'guild'
  | 'pvp'
  | 'quest'
  | 'event'
  | 'social';

/** 알림 생성 파라미터 */
export interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
}

/** 알림 조회 필터 */
export interface NotificationFilter {
  userId: string;
  type?: NotificationType;
  isRead?: boolean;
  limit?: number;
  offset?: number;
}

/** 알림 응답 */
export interface NotificationData {
  id: string;
  type: string;
  title: string;
  message: string;
  data: unknown;
  isRead: boolean;
  createdAt: Date;
}

// ── 알림 매니저 ─────────────────────────────────────────────────

class NotificationManager {
  private io: Server | null = null;

  /** Socket.io 인스턴스 바인딩 */
  setIo(io: Server): void {
    this.io = io;
  }

  /**
   * 알림 생성 + 실시간 푸시
   */
  async create(params: CreateNotificationParams): Promise<NotificationData> {
    const notification = await prisma.notification.create({
      data: {
        userId: params.userId,
        type: params.type,
        title: params.title,
        message: params.message,
        data: params.data as Parameters<typeof prisma.notification.create>[0]['data']['data'],
      },
    });

    // 실시간 소켓 푸시
    if (this.io) {
      this.io.to(`user:${params.userId}`).emit('notification:new', {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data,
        createdAt: notification.createdAt,
      });

      // 미읽음 배지 수 갱신
      await this.emitBadge(params.userId);
    }

    return {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      data: notification.data,
      isRead: notification.isRead,
      createdAt: notification.createdAt,
    };
  }

  /**
   * 알림 목록 조회 (필터/페이징)
   */
  async list(filter: NotificationFilter): Promise<{ notifications: NotificationData[]; total: number }> {
    const where: Record<string, unknown> = { userId: filter.userId };
    if (filter.type) where['type'] = filter.type;
    if (filter.isRead !== undefined) where['isRead'] = filter.isRead;

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: filter.limit ?? 50,
        skip: filter.offset ?? 0,
      }),
      prisma.notification.count({ where }),
    ]);

    return {
      notifications: notifications.map(n => ({
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        data: n.data,
        isRead: n.isRead,
        createdAt: n.createdAt,
      })),
      total,
    };
  }

  /**
   * 단일 알림 읽음 처리
   */
  async markRead(notificationId: string, userId: string): Promise<boolean> {
    const result = await prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true },
    });

    if (result.count > 0 && this.io) {
      await this.emitBadge(userId);
    }

    return result.count > 0;
  }

  /**
   * 전체 읽음 처리
   */
  async markAllRead(userId: string): Promise<number> {
    const result = await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    if (result.count > 0 && this.io) {
      await this.emitBadge(userId);
    }

    return result.count;
  }

  /**
   * 알림 삭제
   */
  async remove(notificationId: string, userId: string): Promise<boolean> {
    const result = await prisma.notification.deleteMany({
      where: { id: notificationId, userId },
    });

    if (result.count > 0 && this.io) {
      await this.emitBadge(userId);
    }

    return result.count > 0;
  }

  /**
   * 미읽음 알림 수 조회
   */
  async getUnreadCount(userId: string): Promise<number> {
    return prisma.notification.count({
      where: { userId, isRead: false },
    });
  }

  /**
   * 미읽음 배지 수 실시간 전송
   */
  private async emitBadge(userId: string): Promise<void> {
    if (!this.io) return;

    const count = await this.getUnreadCount(userId);
    this.io.to(`user:${userId}`).emit('notification:badge', { unreadCount: count });
  }
}

export const notificationManager = new NotificationManager();
