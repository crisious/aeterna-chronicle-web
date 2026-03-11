import { Server, Socket } from 'socket.io';
import { achievementEngine } from '../achievement/achievementEngine';

// ─── 업적 소켓 이벤트 핸들러 ──────────────────────────────────

/**
 * 업적 소켓 핸들러 초기화
 * - Socket.io 서버에 업적 관련 이벤트 바인딩
 * - achievementEngine에 io 인스턴스 주입
 */
export function setupAchievementSocketHandlers(io: Server): void {
  // 엔진에 io 인스턴스 바인딩 (unlock 시 소켓 알림용)
  achievementEngine.setIo(io);

  io.on('connection', (socket: Socket) => {

    /**
     * 유저 Room 입장 — 업적 알림 수신을 위해 유저별 Room에 조인
     */
    socket.on('achievement:subscribe', (data: { userId: string }) => {
      if (!data.userId) return;
      socket.join(`user:${data.userId}`);
    });

    /**
     * 업적 체크 요청 — 클라이언트에서 직접 이벤트 트리거
     * (REST API /api/achievements/check 와 동일 기능의 소켓 버전)
     */
    socket.on('achievement:check', async (data: {
      userId: string;
      type: string;
      value?: number;
      flag?: string;
    }) => {
      if (!data.userId || !data.type) return;

      try {
        const results = await achievementEngine.check({
          userId: data.userId,
          type: data.type,
          value: data.value,
          flag: data.flag,
        });

        // 달성 결과를 요청한 소켓에도 직접 응답
        if (results.length > 0) {
          socket.emit('achievement:check_result', {
            unlocked: results.length,
            achievements: results,
          });
        }
      } catch (err) {
        socket.emit('achievement:error', {
          message: '업적 체크 중 오류가 발생했습니다.',
        });
      }
    });
  });
}
