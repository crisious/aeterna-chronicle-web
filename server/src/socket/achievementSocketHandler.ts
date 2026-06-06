import type { Server } from 'socket.io';
import { achievementEngine } from '../achievement/achievementEngine';

// ─── 업적 소켓 이벤트 핸들러 ──────────────────────────────────

/**
 * 업적 소켓 핸들러 초기화
 * - Socket.io 서버에 업적 관련 이벤트 바인딩
 * - achievementEngine에 io 인스턴스 주입
 */
export function setupAchievementSocketHandlers(io: Server): void {
  // 엔진에 io 인스턴스 바인딩 (unlock 시 user:${userId} Room 으로 achievement:unlocked 푸시).
  achievementEngine.setIo(io);

  // 보안: 기존 'achievement:check' / 'achievement:subscribe' 소켓 리스너를 제거했다.
  //  - achievement:check 는 클라가 보낸 {value,flag} 를 그대로 achievementEngine.check 에 넘겨
  //    업적/칭호를 무한 자가지급할 수 있었고(REST /api/achievements/check 와 동일 sink),
  //    게다가 data.userId 를 무인증 신뢰해 '타인 명의 업적 위조'까지 가능한 IDOR 였다.
  //  - achievement:subscribe 도 data.userId 로 임의 유저 Room 에 조인해 타인 알림 스트림을
  //    도청할 수 있는 IDOR 였다.
  // 두 이벤트는 클라이언트가 전혀 emit 하지 않으며(client/src grep 0건), 정당한 업적 진행은
  // 서버 내부(codexManager → achievementEngine.check)로만 흐른다. Socket.IO 핸드셰이크 JWT
  // 인증 미들웨어(io.use)가 도입되면(후속 배치) socket.data.userId 기반 인증 구독으로 복원한다.
}
