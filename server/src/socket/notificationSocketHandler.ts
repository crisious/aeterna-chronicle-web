/**
 * notificationSocketHandler.ts — 알림 소켓 핸들러 (P5-10)
 *
 * 이벤트:
 *   notification:new    — 새 알림 전송 (서버 → 클라이언트)
 *   notification:badge  — 미읽음 배지 수 갱신 (서버 → 클라이언트)
 *   notification:subscribe — 유저 알림 룸 구독 (클라이언트 → 서버)
 */

import type { Server, Socket } from 'socket.io';
import { notificationManager } from '../notification/notificationManager';

export function setupNotificationSocketHandlers(io: Server): void {
  // notificationManager에 io 바인딩 (실시간 푸시용)
  notificationManager.setIo(io);

  io.on('connection', (socket: Socket) => {

    /**
     * 알림 구독: 인증된 본인 룸에만 조인
     * SECURITY-IDOR: 클라가 보낸 data.userId 를 신뢰하면 임의 유저 룸(user:*)에 조인해 타인의
     * 모든 개인 알림 스트림(알림/거래/우편 푸시)을 도청할 수 있었다. socket.data.userId(핸드셰이크
     * 인증값, socketAuthGate)만 사용한다.
     */
    socket.on('notification:subscribe', async () => {
      const userId = socket.data.userId;
      if (!userId) return;

      // 본인 전용 룸 조인
      socket.join(`user:${userId}`);

      // 접속 시 미읽음 배지 수 전송
      const unreadCount = await notificationManager.getUnreadCount(userId);
      socket.emit('notification:badge', { unreadCount });
    });
  });
}
