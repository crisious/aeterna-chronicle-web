import type { Server, Socket } from 'socket.io';
import {
  setUserOnline,
  setUserOffline,
  sendFriendRequest,
  acceptFriendRequest,
  isUserOnline,
} from '../social/socialManager';

// ─── 소켓 이벤트 페이로드 타입 ──────────────────────────────────

// SECURITY-IDOR: actor 신원(userId/inviterId)은 payload 가 아니라 socket.data.userId(핸드셰이크 인증)를
// 사용한다. 아래 인터페이스에는 정당한 'target/상대' id 와 부가 데이터만 남긴다.

interface FriendRequestPayload {
  friendId: string;
}

interface FriendAcceptPayload {
  friendId: string;
}

interface PartyInvitePayload {
  partyId: string;
  targetUserId: string;
}

interface PartyJoinPayload {
  partyId: string;
}

interface PartyLeavePayload {
  partyId: string;
}

interface PartyChatPayload {
  partyId: string;
  // SECURITY-TODO: nickname 은 표시 라벨이라 유지하되 서버 조회값으로 대체 권장(스푸핑 여지, 식별자 아님).
  nickname: string;
  message: string;
}

interface MailNotifyPayload {
  receiverId: string;
  mailId: string;
  subject: string;
  senderId?: string | null;
}

// ─── 유저-소켓 매핑 ─────────────────────────────────────────────

/** userId → socketId 매핑 (단일 세션 가정) */
const userSocketMap = new Map<string, string>();
/** socketId → userId 역매핑 */
const socketUserMap = new Map<string, string>();

/** 특정 유저에게 이벤트 전송 헬퍼 */
function emitToUser(io: Server, userId: string, event: string, data: unknown): void {
  const socketId = userSocketMap.get(userId);
  if (socketId) {
    io.to(socketId).emit(event, data);
  }
}

// ─── 파티 Room 이름 헬퍼 ────────────────────────────────────────

function partyRoom(partyId: string): string {
  return `party:${partyId}`;
}

// ═══════════════════════════════════════════════════════════════
//  소셜 소켓 핸들러 초기화
// ═══════════════════════════════════════════════════════════════

export function setupSocialSocketHandlers(io: Server): void {
  io.on('connection', (socket: Socket) => {

    // ── 인증 & 온라인 등록 ──
    // SECURITY-IDOR: actor 는 socket.data.userId(핸드셰이크 인증)로 고정. 이전에는 data.userId 를
    // 신뢰해 임의 유저를 사칭하면 이후 emitToUser 라우팅·온라인상태가 전부 그 명의가 되는 루트였다.
    socket.on('social:auth', async () => {
      const userId = socket.data.userId;
      if (!userId) return;

      userSocketMap.set(userId, socket.id);
      socketUserMap.set(socket.id, userId);

      await setUserOnline(userId);

      // 친구들에게 온라인 알림 브로드캐스트
      socket.broadcast.emit('friend:online', { userId });
    });

    // ── 연결 해제 → 오프라인 처리 ──
    socket.on('disconnect', async () => {
      const userId = socketUserMap.get(socket.id);
      if (!userId) return;

      userSocketMap.delete(userId);
      socketUserMap.delete(socket.id);

      await setUserOffline(userId);
      socket.broadcast.emit('friend:offline', { userId });
      console.log(`[Social] ${userId} 오프라인`);
    });

    // ═══ 친구 이벤트 ═══

    /** 친구 요청 */
    socket.on('friend:request', async (data: FriendRequestPayload) => {
      const userId = socket.data.userId; // SECURITY-IDOR: 요청 주체 = 인증 사용자
      if (!userId) return;
      const { friendId } = data;
      try {
        const result = await sendFriendRequest(userId, friendId);
        // 요청 받은 유저에게 실시간 알림
        emitToUser(io, friendId, 'friend:request', {
          from: userId,
          friendshipId: result.id,
        });
        socket.emit('friend:request:sent', { success: true, friendId });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        socket.emit('friend:request:error', { error: message });
      }
    });

    /** 친구 요청 수락 */
    socket.on('friend:accept', async (data: FriendAcceptPayload) => {
      const userId = socket.data.userId; // SECURITY-IDOR: 수락 주체 = 인증 사용자
      if (!userId) return;
      const { friendId } = data;
      try {
        await acceptFriendRequest(userId, friendId);
        // 요청한 유저에게 수락 알림
        emitToUser(io, friendId, 'friend:accept', { userId });
        socket.emit('friend:accept:done', { success: true, friendId });

        // 상대 온라인 여부도 함께 전달
        const online = await isUserOnline(friendId);
        socket.emit('friend:online', { userId: friendId, online });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        socket.emit('friend:accept:error', { error: message });
      }
    });

    // ═══ 파티 이벤트 ═══

    /** 파티 초대 전송 */
    socket.on('party:invite', (data: PartyInvitePayload) => {
      const inviterId = socket.data.userId; // SECURITY-IDOR: 초대 주체 = 인증 사용자
      if (!inviterId) return;
      const { partyId, targetUserId } = data;
      emitToUser(io, targetUserId, 'party:invite', {
        partyId,
        inviterId,
      });
    });

    /** 파티 Room 참가 */
    socket.on('party:join', async (data: PartyJoinPayload) => {
      const userId = socket.data.userId; // SECURITY-IDOR: 참가 주체 = 인증 사용자
      if (!userId) return;
      const { partyId } = data;
      const room = partyRoom(partyId);
      socket.join(room);

      // 파티원에게 알림
      io.to(room).emit('party:join', { userId, partyId });
    });

    /** 파티 Room 탈퇴 */
    socket.on('party:leave', (data: PartyLeavePayload) => {
      const userId = socket.data.userId; // SECURITY-IDOR: 탈퇴 주체 = 인증 사용자
      if (!userId) return;
      const { partyId } = data;
      const room = partyRoom(partyId);

      io.to(room).emit('party:leave', { userId, partyId });
      socket.leave(room);
    });

    /** 파티 채팅 */
    // SECURITY-IDOR: 발신 actor = socket.data.userId. nickname 은 표시 라벨로 SECURITY-TODO(서버조회 권장).
    socket.on('party:chat', (payload: PartyChatPayload) => {
      const userId = socket.data.userId;
      if (!userId) return;
      const { partyId, nickname, message } = payload;
      if (!partyId || !message) return;

      const chatMessage = {
        partyId,
        userId,
        nickname,
        message,
        timestamp: new Date().toISOString(),
      };

      io.to(partyRoom(partyId)).emit('party:chat', chatMessage);
    });

    // ═══ 우편 이벤트 ═══
    // 우편은 REST API로 발송하되, 실시간 알림만 소켓으로 전달
    // sendMail 호출 후 외부에서 notifyNewMail()을 호출하는 패턴

  }); // end io.on('connection')
}

// ─── 외부에서 호출 가능한 우편 알림 헬퍼 ────────────────────────

let _io: Server | null = null;

/** Socket.io 인스턴스 바인딩 (server.ts에서 호출) */
export function bindSocialIO(io: Server): void {
  _io = io;
}

/** 새 우편 수신 실시간 알림 */
export function notifyNewMail(data: MailNotifyPayload): void {
  if (!_io) return;
  emitToUser(_io, data.receiverId, 'mail:received', {
    mailId: data.mailId,
    subject: data.subject,
    senderId: data.senderId ?? null,
  });
}
