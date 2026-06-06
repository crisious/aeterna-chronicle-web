/**
 * 채팅 소켓 핸들러 — 실시간 메시지 송수신
 * P4-14: 채팅 고도화
 *
 * 이벤트:
 * - chat:send    — 채널에 메시지 전송
 * - chat:join    — 채널 입장
 * - chat:leave   — 채널 퇴장
 * - chat:whisper — 1:1 귓속말
 * - chat:system  — 서버 공지 브로드캐스트 (서버 전용)
 */
import type { Server, Socket } from 'socket.io';
import type {
  ChannelType} from '../chat/chatManager';
import {
  joinChannel,
  leaveChannel,
  leaveAllChannels,
  sendMessage,
  getHistory,
} from '../chat/chatManager';

// ─── 페이로드 타입 ──────────────────────────────────────────────

interface ChatAuthPayload {
  // SECURITY-IDOR: actor userId 는 payload 가 아니라 socket.data.userId(핸드셰이크 인증)를 쓴다.
  nickname: string;
}

interface ChatSendPayload {
  channel: ChannelType;
  channelId: string;
  content: string;
}

interface ChatJoinPayload {
  channelId: string;
}

interface ChatLeavePayload {
  channelId: string;
}

interface ChatWhisperPayload {
  targetUserId: string;
  content: string;
}

interface ChatSystemPayload {
  content: string;
  /** 서버 공지 인증 키 (간이 보안) */
  adminKey?: string;
}

// ─── 유저-소켓 매핑 ─────────────────────────────────────────────

const chatUserMap = new Map<string, { socketId: string; nickname: string }>();
const chatSocketUserMap = new Map<string, string>(); // socketId → userId

// ─── IO 인스턴스 ────────────────────────────────────────────────

let chatIO: Server | null = null;

/** 외부에서 IO 참조가 필요할 때 사용 */
export function getChatIO(): Server | null {
  return chatIO;
}

// ─── 핸들러 등록 ────────────────────────────────────────────────

export function setupChatSocketHandlers(io: Server): void {
  chatIO = io;

  io.on('connection', (socket: Socket) => {
    let currentUserId: string | null = null;

    // ── 인증 (chat 네임스페이스 재사용) ──────────────────────────
    // SECURITY-IDOR: actor 는 핸드셰이크 인증값(socket.data.userId)으로 고정. 이전에는 payload.userId 를
    // 신뢰해, 임의 유저를 사칭하면 이후 모든 chat:send/whisper/join 이 그 명의로 발신되는 신뢰사슬 루트였다.
    socket.on('chat:auth', (payload: ChatAuthPayload) => {
      const userId = socket.data.userId;
      if (!userId) return;
      currentUserId = userId;
      // SECURITY-TODO: nickname 도 서버(유저/캐릭터) 조회값으로 대체 권장 — 현재는 표시명 스푸핑 여지가
      // 남는다(식별자가 아니라 표시 라벨이라 영향은 낮음; 모더레이션/뮤트는 userId 기준).
      chatUserMap.set(userId, { socketId: socket.id, nickname: payload.nickname });
      chatSocketUserMap.set(socket.id, userId);

      // 기본 월드 채널 자동 입장
      joinChannel(userId, 'world');
      socket.join('chat:world');
    });

    // ── 채널 입장 ────────────────────────────────────────────────
    socket.on('chat:join', async (payload: ChatJoinPayload) => {
      if (!currentUserId) return;

      joinChannel(currentUserId, payload.channelId);
      socket.join(`chat:${payload.channelId}`);

      // 이력 전송
      const history = await getHistory(payload.channelId, 50);
      socket.emit('chat:history', { channelId: payload.channelId, messages: history });
    });

    // ── 채널 퇴장 ────────────────────────────────────────────────
    socket.on('chat:leave', (payload: ChatLeavePayload) => {
      if (!currentUserId) return;

      leaveChannel(currentUserId, payload.channelId);
      socket.leave(`chat:${payload.channelId}`);
    });

    // ── 메시지 전송 ──────────────────────────────────────────────
    socket.on('chat:send', async (payload: ChatSendPayload) => {
      if (!currentUserId) return;

      const userInfo = chatUserMap.get(currentUserId);
      if (!userInfo) return;

      const result = await sendMessage(
        payload.channel,
        payload.channelId,
        currentUserId,
        userInfo.nickname,
        payload.content,
      );

      if (!result.success) {
        socket.emit('chat:error', { error: result.error, muted: result.muted });
        return;
      }

      // 해당 채널 룸에 브로드캐스트
      io.to(`chat:${payload.channelId}`).emit('chat:message', result.message);
    });

    // ── 귓속말 (1:1) ────────────────────────────────────────────
    socket.on('chat:whisper', async (payload: ChatWhisperPayload) => {
      if (!currentUserId) return;

      const userInfo = chatUserMap.get(currentUserId);
      if (!userInfo) return;

      const targetInfo = chatUserMap.get(payload.targetUserId);
      if (!targetInfo) {
        socket.emit('chat:error', { error: '상대방이 오프라인입니다.' });
        return;
      }

      // 귓속말 채널 ID 생성 (정렬하여 일관성 유지)
      const ids = [currentUserId, payload.targetUserId].sort();
      const channelId = `whisper:${ids[0]}:${ids[1]}`;

      const result = await sendMessage(
        'whisper',
        channelId,
        currentUserId,
        userInfo.nickname,
        payload.content,
      );

      if (!result.success) {
        socket.emit('chat:error', { error: result.error, muted: result.muted });
        return;
      }

      // 양쪽 소켓에 전달
      socket.emit('chat:whisper', result.message);
      io.to(targetInfo.socketId).emit('chat:whisper', result.message);
    });

    // ── 서버 공지 (system) ──────────────────────────────────────
    socket.on('chat:system', async (payload: ChatSystemPayload) => {
      const systemKey = process.env.CHAT_ADMIN_KEY || 'aeterna-system-key';
      if (payload.adminKey !== systemKey) {
        socket.emit('chat:error', { error: '공지 권한이 없습니다.' });
        return;
      }

      const result = await sendMessage('system', 'system', 'SYSTEM', '시스템', payload.content);
      if (result.success && result.message) {
        io.emit('chat:system', result.message);
      }
    });

    // ── 연결 해제 ────────────────────────────────────────────────
    socket.on('disconnect', () => {
      if (currentUserId) {
        leaveAllChannels(currentUserId);
        chatUserMap.delete(currentUserId);
      }
      chatSocketUserMap.delete(socket.id);
    });
  });
}
