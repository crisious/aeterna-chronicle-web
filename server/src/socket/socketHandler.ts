import { Server, Socket } from 'socket.io';
import { redisClient, redisConnected } from '../redis';
import { DialogueChoiceTelemetryEvent, handleDialogueTelemetry } from '../telemetry/dialogueTelemetryServer';
import {
    loadProto,
    isBinary,
    decodePlayerMove,
    encodePlayerMove,
    decodePlayerAction,
    encodePlayerAction,
    decodeJoinRoom,
    encodePlayerJoined
} from '../../../shared/codec/gameCodec';

/** 서버 측 playerMove rate limit: 소켓별 마지막 처리 시각 */
const lastMoveTimestamps = new Map<string, number>();
const MOVE_RATE_LIMIT_MS = 50;

/** 개발 모드 여부 — 바이트 크기 비교 로그 출력용 */
const IS_DEV = process.env.NODE_ENV !== 'production';

export async function setupSocketHandlers(io: Server) {
    // Protobuf 코덱 초기화 (서버 시작 시 한 번)
    await loadProto();
    console.log('[Protobuf] 코덱 초기화 완료');

    io.on('connection', (socket: Socket) => {
        console.log(`[Socket] User connected: ${socket.id}`);

        /**
         * 특정 맵(던전/마을) Room 입장 처리
         * 바이너리(Protobuf) 수신 시 decode, JSON fallback 지원
         */
        socket.on('joinRoom', async (data: unknown) => {
            let roomId: string;
            let characterId: string;

            if (isBinary(data)) {
                const decoded = decodeJoinRoom(new Uint8Array(data));
                roomId = decoded.roomId;
                characterId = decoded.characterId;

                if (IS_DEV) {
                    const jsonSize = Buffer.byteLength(JSON.stringify({ roomId, characterId }));
                    console.log(`[Protobuf] joinRoom: ${(data as Uint8Array).byteLength}B (proto) vs ${jsonSize}B (json)`);
                }
            } else {
                const jsonData = data as { roomId: string; characterId: string };
                roomId = jsonData.roomId;
                characterId = jsonData.characterId;
            }

            socket.join(roomId);
            console.log(`[Socket] Character ${characterId} joined Room ${roomId}`);

            // Redis에 현재 사용자의 위치 및 상태 저장
            if (redisConnected) {
                await redisClient.hSet(`userState:${characterId}`, {
                    socketId: socket.id,
                    roomId: roomId,
                    online: 'true'
                });
            }

            // 방 안의 다른 유저에게 새로운 플레이어 접속 알림 (Protobuf 바이너리)
            const joinedBuf = encodePlayerJoined({ characterId });
            socket.to(roomId).emit('playerJoined', joinedBuf);
        });

        /**
         * 멀티플레이어 동기화: 플레이어 이동 (Dead Reckoning 방식)
         * 바이너리(Protobuf) 수신 시 decode, JSON fallback 지원
         */
        socket.on('playerMove', (data: unknown) => {
            // 서버 측 rate limit: 50ms 간격 이하의 이동 패킷은 무시
            const now = Date.now();
            const lastTime = lastMoveTimestamps.get(socket.id) ?? 0;
            if (now - lastTime < MOVE_RATE_LIMIT_MS) {
                return;
            }
            lastMoveTimestamps.set(socket.id, now);

            let moveData: { characterId: string; x: number; y: number; state: string };

            if (isBinary(data)) {
                moveData = decodePlayerMove(new Uint8Array(data));

                if (IS_DEV) {
                    const jsonSize = Buffer.byteLength(JSON.stringify(moveData));
                    console.log(`[Protobuf] playerMove: ${(data as Uint8Array).byteLength}B (proto) vs ${jsonSize}B (json)`);
                }
            } else {
                moveData = data as { characterId: string; x: number; y: number; state: string };
            }

            const currentRoom = Array.from(socket.rooms).find(room => room !== socket.id);

            if (currentRoom) {
                // Protobuf 바이너리로 브로드캐스트
                const buf = encodePlayerMove(moveData);
                socket.to(currentRoom).emit('playerMoved', buf);
            }
        });

        /**
         * 전투 액션: 마법, 스킬, 공격 시전
         * 바이너리(Protobuf) 수신 시 decode, JSON fallback 지원
         */
        socket.on('playerAction', (data: unknown) => {
            let actionData: { characterId: string; actionType: string; targetId?: string };

            if (isBinary(data)) {
                actionData = decodePlayerAction(new Uint8Array(data));

                if (IS_DEV) {
                    const jsonSize = Buffer.byteLength(JSON.stringify(actionData));
                    console.log(`[Protobuf] playerAction: ${(data as Uint8Array).byteLength}B (proto) vs ${jsonSize}B (json)`);
                }
            } else {
                actionData = data as { characterId: string; actionType: string; targetId?: string };
            }

            const currentRoom = Array.from(socket.rooms).find(room => room !== socket.id);
            if (currentRoom) {
                const buf = encodePlayerAction(actionData);
                socket.to(currentRoom).emit('playerActionCasted', buf);
            }
        });

        /**
         * NPC 선택지 텔레메트리 이벤트 수신 — JSON 유지 (저빈도, 복잡한 구조)
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

            // Redis 내 유저 상태 정리
            if (redisConnected) {
                try {
                    await redisClient.del(`userState:${socket.id}`);
                    console.log(`[Socket] Redis userState cleaned for ${socket.id}`);
                } catch (err) {
                    console.warn(`[Socket] Redis cleanup failed for ${socket.id}:`, err);
                }
            }
        });
    });
}
