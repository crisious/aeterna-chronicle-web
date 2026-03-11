import { Server, Socket } from 'socket.io';
import { redisClient, redisConnected } from '../redis';
import { DialogueChoiceTelemetryEvent, handleDialogueTelemetry } from '../telemetry/dialogueTelemetryServer';

/** 서버 측 playerMove rate limit: 소켓별 마지막 처리 시각 */
const lastMoveTimestamps = new Map<string, number>();
const MOVE_RATE_LIMIT_MS = 50;

export function setupSocketHandlers(io: Server) {
    io.on('connection', (socket: Socket) => {
        console.log(`[Socket] User connected: ${socket.id}`);

        /**
         * 특정 맵(던전/마을) Room 입장 처리
         * 동일 Room에 있는 사용자들끼리만 움직임과 전투 정보를 브로드캐스트 합니다.
         */
        socket.on('joinRoom', async (data: { roomId: string, characterId: string }) => {
            socket.join(data.roomId);
            console.log(`[Socket] Character ${data.characterId} joined Room ${data.roomId}`);

            // Redis에 현재 사용자의 위치 및 상태 저장 (빠른 읽기/쓰기)
            if (redisConnected) {
                await redisClient.hSet(`userState:${data.characterId}`, {
                    socketId: socket.id,
                    roomId: data.roomId,
                    online: 'true'
                });
            }

            // 방 안의 다른 유저에게 새로운 플레이어 접속 알림
            socket.to(data.roomId).emit('playerJoined', { characterId: data.characterId });
        });

        /**
         * 멀티플레이어 동기화: 플레이어 이동 (Dead Reckoning 방식)
         * 초당 여러 번 들어오므로 패킷 크기와 서버 부하를 최소화해야 합니다.
         */
        socket.on('playerMove', (data: { characterId: string, x: number, y: number, state: string }) => {
            // 서버 측 rate limit: 50ms 간격 이하의 이동 패킷은 무시
            const now = Date.now();
            const lastTime = lastMoveTimestamps.get(socket.id) ?? 0;
            if (now - lastTime < MOVE_RATE_LIMIT_MS) {
                return; // 무시 — 클라 스로틀(200ms) 위에 서버 방어선
            }
            lastMoveTimestamps.set(socket.id, now);

            // socket.rooms를 통해 자신이 속한 방 중 소켓ID가 아닌 진짜 게임 RoomID를 찾음
            const currentRoom = Array.from(socket.rooms).find(room => room !== socket.id);

            if (currentRoom) {
                // 같은 방 안에 있는 다른 플레이어들에게만 좌표를 뿌림 (나 제외)
                // [To-Do] 바이너리 데이터(Protobuf)로 변환 전송하여 패킷 최소화 필요
                socket.to(currentRoom).emit('playerMoved', data);
            }
        });

        /**
         * 전투 액션: 마법, 스킬, 공격 시전
         */
        socket.on('playerAction', (data: { characterId: string, actionType: string, targetId?: string }) => {
            const currentRoom = Array.from(socket.rooms).find(room => room !== socket.id);
            if (currentRoom) {
                socket.to(currentRoom).emit('playerActionCasted', data);
            }
        });

        /**
         * NPC 선택지 텔레메트리 이벤트 수신
         */
        socket.on('telemetry:dialogue_choice', async (payload: DialogueChoiceTelemetryEvent) => {
            await handleDialogueTelemetry(socket, payload);
        });

        /**
         * 연결 끊김 처리 (Disconnect)
         */
        socket.on('disconnect', async () => {
            console.log(`[Socket] User disconnected: ${socket.id}`);

            // rate limit 맵 정리
            lastMoveTimestamps.delete(socket.id);

            // Redis 내 유저 상태 정리: joinRoom에서 저장한 userState 해시 삭제
            if (redisConnected) {
                try {
                    // characterId는 소켓 연결 시 socket.id를 사용하므로 동일 키
                    await redisClient.del(`userState:${socket.id}`);
                    console.log(`[Socket] Redis userState cleaned for ${socket.id}`);
                } catch (err) {
                    console.warn(`[Socket] Redis cleanup failed for ${socket.id}:`, err);
                }
            }
        });
    });
}
