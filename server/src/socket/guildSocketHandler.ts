import type { Server, Socket } from 'socket.io';
import { isGuildMember } from '../guild/guildMembership';

// ─── 길드 소켓 이벤트 타입 ──────────────────────────────────────

interface GuildChatPayload {
  guildId: string;
  // SECURITY-IDOR: 발신 actor userId 는 payload 가 아니라 socket.data.userId(핸드셰이크 인증)를 쓴다.
  // SECURITY-TODO: nickname 은 표시 라벨이라 유지하되 서버 조회값 대체 권장(식별자 아님).
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
     * SECURITY-IDOR: 인증된 본인이 그 길드의 멤버일 때만 조인을 허용한다(이전에는 임의 guildId 룸에
     * 조인해 타 길드 채팅/알림을 도청할 수 있었다).
     */
    socket.on('guild:join', async (data: { guildId: string }) => {
      const userId = socket.data.userId;
      if (!userId || !data.guildId) return;
      if (!(await isGuildMember(data.guildId, userId))) return;
      socket.join(guildRoom(data.guildId));
    });

    /**
     * 길드 Room 퇴장
     */
    socket.on('guild:leave', (data: { guildId: string }) => {
      if (!data.guildId) return;
      socket.leave(guildRoom(data.guildId));
    });

    /**
     * 길드 채팅 — 같은 길드 Room 멤버에게 브로드캐스트
     * SECURITY-IDOR: 발신 actor = socket.data.userId, 그리고 그 유저가 해당 길드원일 때만 발신 허용
     * (이전에는 payload.userId 로 타인 사칭 + 비길드원이 임의 길드에 채팅 주입 가능).
     */
    socket.on('guild:chat', async (payload: GuildChatPayload) => {
      const userId = socket.data.userId;
      const { guildId, nickname, message } = payload;
      if (!userId || !guildId || !message) return;
      if (!(await isGuildMember(guildId, userId))) return;

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

    // 보안: 클라이언트가 직접 emit 하던 'guild:notification' 리스너를 제거했다.
    // 이전에는 임의 클라가 'war_declared'/'role_changed' 등 시스템 알림을 위조해 길드 룸에
    // 브로드캐스트할 수 있었다. 정당한 길드 알림은 서버 내부의 emitGuildNotification(아래)으로만 발생한다.
    // (client/src grep 결과 guild:notification 을 emit 하는 클라이언트 없음)
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
