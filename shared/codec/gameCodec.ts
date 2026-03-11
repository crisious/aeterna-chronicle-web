/**
 * gameCodec.ts — Protobuf 바이너리 인코딩/디코딩 코덱
 *
 * Socket.IO 고빈도 이벤트(playerMove, playerAction, joinRoom, playerJoined)를
 * Protobuf 바이너리로 변환하여 패킷 크기를 30~50% 절감한다.
 *
 * 서버(CommonJS)와 클라이언트(ESM/Vite) 양쪽에서 동작해야 하므로
 * .proto 파일 로드 대신 인라인 proto 문자열 + protobuf.parse() 방식을 사용한다.
 */
import * as protobuf from 'protobufjs';

/** 인라인 proto 정의 — 파일시스템 의존성 제거 */
const PROTO_DEFINITION = `
syntax = "proto3";
package aeterna;

message PlayerMove {
  string character_id = 1;
  float x = 2;
  float y = 3;
  string state = 4;
}

message PlayerAction {
  string character_id = 1;
  string action_type = 2;
  string target_id = 3;
}

message JoinRoom {
  string room_id = 1;
  string character_id = 2;
}

message PlayerJoined {
  string character_id = 1;
}
`;

/** 메시지 타입별 인터페이스 */
export interface IPlayerMove {
  characterId: string;
  x: number;
  y: number;
  state: string;
}

export interface IPlayerAction {
  characterId: string;
  actionType: string;
  targetId?: string;
}

export interface IJoinRoom {
  roomId: string;
  characterId: string;
}

export interface IPlayerJoined {
  characterId: string;
}

/** 내부 메시지 타입 참조 (loadProto 후 초기화) */
let PlayerMoveType: protobuf.Type | null = null;
let PlayerActionType: protobuf.Type | null = null;
let JoinRoomType: protobuf.Type | null = null;
let PlayerJoinedType: protobuf.Type | null = null;
let _initialized = false;

/**
 * Proto 정의 로드 — 서버/클라이언트 시작 시 한 번만 호출
 * 중복 호출 시 무시한다.
 */
export async function loadProto(): Promise<void> {
  if (_initialized) return;

  const root = protobuf.parse(PROTO_DEFINITION).root;
  PlayerMoveType = root.lookupType('aeterna.PlayerMove');
  PlayerActionType = root.lookupType('aeterna.PlayerAction');
  JoinRoomType = root.lookupType('aeterna.JoinRoom');
  PlayerJoinedType = root.lookupType('aeterna.PlayerJoined');
  _initialized = true;
}

/** 초기화 여부 확인 */
function ensureInitialized(): void {
  if (!_initialized) {
    throw new Error('[gameCodec] loadProto()가 호출되지 않았습니다.');
  }
}

// ─── camelCase ↔ snake_case 변환 유틸 ───────────────────────

/** camelCase 객체 → snake_case 객체 (Protobuf 필드명 매칭) */
function toSnakeCase(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(obj)) {
    const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
    result[snakeKey] = obj[key];
  }
  return result;
}

/** snake_case 객체 → camelCase 객체 (앱 내부 인터페이스 매칭) */
function toCamelCase(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
    result[camelKey] = obj[key];
  }
  return result;
}

// ─── Encode 함수들 ──────────────────────────────────────────

export function encodePlayerMove(data: IPlayerMove): Uint8Array {
  ensureInitialized();
  const msg = PlayerMoveType!.create(toSnakeCase(data as unknown as Record<string, unknown>));
  return PlayerMoveType!.encode(msg).finish();
}

export function encodePlayerAction(data: IPlayerAction): Uint8Array {
  ensureInitialized();
  const msg = PlayerActionType!.create(toSnakeCase(data as unknown as Record<string, unknown>));
  return PlayerActionType!.encode(msg).finish();
}

export function encodeJoinRoom(data: IJoinRoom): Uint8Array {
  ensureInitialized();
  const msg = JoinRoomType!.create(toSnakeCase(data as unknown as Record<string, unknown>));
  return JoinRoomType!.encode(msg).finish();
}

export function encodePlayerJoined(data: IPlayerJoined): Uint8Array {
  ensureInitialized();
  const msg = PlayerJoinedType!.create(toSnakeCase(data as unknown as Record<string, unknown>));
  return PlayerJoinedType!.encode(msg).finish();
}

// ─── Decode 함수들 ──────────────────────────────────────────

export function decodePlayerMove(buf: Uint8Array): IPlayerMove {
  ensureInitialized();
  const decoded = PlayerMoveType!.decode(buf);
  const obj = PlayerMoveType!.toObject(decoded) as Record<string, unknown>;
  return toCamelCase(obj) as unknown as IPlayerMove;
}

export function decodePlayerAction(buf: Uint8Array): IPlayerAction {
  ensureInitialized();
  const decoded = PlayerActionType!.decode(buf);
  const obj = PlayerActionType!.toObject(decoded) as Record<string, unknown>;
  return toCamelCase(obj) as unknown as IPlayerAction;
}

export function decodeJoinRoom(buf: Uint8Array): IJoinRoom {
  ensureInitialized();
  const decoded = JoinRoomType!.decode(buf);
  const obj = JoinRoomType!.toObject(decoded) as Record<string, unknown>;
  return toCamelCase(obj) as unknown as IJoinRoom;
}

export function decodePlayerJoined(buf: Uint8Array): IPlayerJoined {
  ensureInitialized();
  const decoded = PlayerJoinedType!.decode(buf);
  const obj = PlayerJoinedType!.toObject(decoded) as Record<string, unknown>;
  return toCamelCase(obj) as unknown as IPlayerJoined;
}

/**
 * 바이너리 여부 판별 — Buffer 또는 Uint8Array면 true
 * 서버(Node.js)와 클라이언트(브라우저) 양쪽에서 안전하게 동작한다.
 */
export function isBinary(data: unknown): data is Uint8Array {
  if (data instanceof Uint8Array) return true;
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(data)) return true;
  return false;
}
