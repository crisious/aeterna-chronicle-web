import { Server, Socket } from 'socket.io';

// ─── 길드 소켓 이벤트 타입 ──────────────────────────────────────

interface GuildChatPayload {
  guildId: string;
  userId: string;
  nickname: string;
  message: string;
}

interface GuildNotification {
  guildId: string;
  type: 'join' | 'leave' | 'kick' | 'war_declared' | 'war_started' | 'war_finished' | 'role_changed';
  message: string;
  data?: Record<string, unknown>;
}

// ─── 길드 Room 이름 헬퍼 ────────────────────────────────────────
function guildRoom(guildId: string): string {
  return `guild:${guildId}`;
}

// ─── 길드 소켓 핸들러 초기화 ────────────────────────────────────

export function setupGuildSocketHandlers(io: Server): void {
  io.on('connection', (socket: Socket) => {

    /**
     * 길드 Room 입장 — 길드 채팅/알림 수신을 위해 Room에 조인
     */
    socket.on('guild:join', (data: { guildId: string }) => {
      const room = guildRoom(data.guildId);
      socket.join(room);
      console.log(`[Guild Socket] ${socket.id} joined ${room}`);
    });

    /**
     * 길드 Room 퇴장
     */
    socket.on('guild:leave', (data: { guildId: string }) => {
      const room = guildRoom(data.guildId);
      socket.leave(room);
      console.log(`[Guild Socket] ${socket.id} left ${room}`);
    });

    /**
     * 길드 채팅 — 같은 길드 Room 멤버에게 브로드캐스트
     */
    socket.on('guild:chat', (payload: GuildChatPayload) => {
      const { guildId, userId, nickname, message } = payload;
      if (!guildId || !userId || !message) return;

      const chatMessage = {
        guildId,
        userId,
        nickname,
        message,
        timestamp: new Date().toISOString(),
      };

      // 발신자 포함 전체 Room에 전송
      io.to(guildRoom(guildId)).emit('guild:chat', chatMessage);
    });

    /**
     * 길드 알림 — 가입/탈퇴/전쟁 등 이벤트 브로드캐스트
     * (서버 내부에서도 호출 가능하도록 io 인스턴스 활용)
     */
    socket.on('guild:notification', (payload: GuildNotification) => {
      const { guildId } = payload;
      if (!guildId) return;

      io.to(guildRoom(guildId)).emit('guild:notification', {
        ...payload,
        timestamp: new Date().toISOString(),
      });
    });
  });
}

/**
 * 서버 측에서 직접 길드 알림을 보낼 때 사용하는 유틸
 * (REST API 핸들러 등에서 import하여 사용)
 */
export function emitGuildNotification(io: Server, notification: GuildNotification): void {
  io.to(guildRoom(notification.guildId)).emit('guild:notification', {
    ...notification,
    timestamp: new Date().toISOString(),
  });
}
