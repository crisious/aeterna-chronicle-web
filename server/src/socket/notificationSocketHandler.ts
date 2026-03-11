/**
 * notificationSocketHandler.ts — 알림 소켓 핸들러 (P5-10)
 *
 * 이벤트:
 *   notification:new    — 새 알림 전송 (서버 → 클라이언트)
 *   notification:badge  — 미읽음 배지 수 갱신 (서버 → 클라이언트)
 *   notification:subscribe — 유저 알림 룸 구독 (클라이언트 → 서버)
 */

import { Server, Socket } from 'socket.io';
import { notificationManager } from '../notification/notificationManager';

export function setupNotificationSocketHandlers(io: Server): void {
  // notificationManager에 io 바인딩 (실시간 푸시용)
  notificationManager.setIo(io);

  io.on('connection', (socket: Socket) => {

    /**
     * 알림 구독: 유저별 룸에 자동 조인
     * 클라이언트에서 인증 후 userId와 함께 호출
     */
    socket.on('notification:subscribe', async (data: { userId: string }) => {
      if (!data.userId) return;

      // 유저 전용 룸 조인
      socket.join(`user:${data.userId}`);
      console.log(`[Notification] ${data.userId} 알림 구독 (socket: ${socket.id})`);

      // 접속 시 미읽음 배지 수 전송
      const unreadCount = await notificationManager.getUnreadCount(data.userId);
      socket.emit('notification:badge', { unreadCount });
    });
  });
}
