/**
 * gameCodec.ts — Protobuf 바이너리 인코딩/디코딩 코덱
 *
 * Socket.IO 고빈도 이벤트(playerMove, playerAction, joinRoom, playerJoined)를
 * Protobuf 바이너리로 변환하여 패킷 크기를 30~50% 절감한다.
 *
 * P10-05: .proto 파일을 SSOT(Single Source of Truth)로 사용.
 * - 서버(Node.js): loadSync()로 .proto 파일 직접 로드
 * - 클라이언트(브라우저/Vite): 인라인 fallback 문자열 사용
 */
import * as protobuf from 'protobufjs';
import * as path from 'path';

/**
 * 인라인 proto 정의 — 브라우저 환경 fallback 전용.
 * ⚠️ 이 문자열은 shared/proto/game.proto와 반드시 동일해야 합니다.
 * 서버 환경에서는 .proto 파일을 직접 로드하므로 이 문자열은 사용되지 않습니다.
 */
const PROTO_FALLBACK = `
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

message PvpAction {
  string character_id = 1;
  string action_type = 2;
  string target_id = 3;
  int32 damage = 4;
  string skill_id = 5;
}

message PvpResult {
  string match_id = 1;
  string winner_id = 2;
  int32 player1_score = 3;
  int32 player2_score = 4;
  int32 rating_change = 5;
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

export interface IPvpAction {
  characterId: string;
  actionType: string;
  targetId?: string;
  damage?: number;
  skillId?: string;
}

export interface IPvpResult {
  matchId: string;
  winnerId: string;
  player1Score: number;
  player2Score: number;
  ratingChange: number;
}

/** 내부 메시지 타입 참조 (loadProto 후 초기화) */
let PlayerMoveType: protobuf.Type | null = null;
let PlayerActionType: protobuf.Type | null = null;
let JoinRoomType: protobuf.Type | null = null;
let PlayerJoinedType: protobuf.Type | null = null;
let PvpActionType: protobuf.Type | null = null;
let PvpResultType: protobuf.Type | null = null;
let _initialized = false;

/** Node.js 환경 여부 판별 */
function isNodeEnv(): boolean {
  return typeof process !== 'undefined' && process.versions != null && process.versions.node != null;
}

/**
 * Proto 정의 로드 — 서버/클라이언트 시작 시 한 번만 호출
 * - Node.js: shared/proto/game.proto 파일을 직접 로드 (SSOT)
 * - 브라우저: 인라인 fallback 문자열 파싱
 * 중복 호출 시 무시한다.
 */
export async function loadProto(): Promise<void> {
  if (_initialized) return;

  let root: protobuf.Root;

  if (isNodeEnv()) {
    // P10-05: .proto 파일을 SSOT로 직접 로드
    const protoPath = path.resolve(__dirname, '../proto/game.proto');
    root = protobuf.loadSync(protoPath);
  } else {
    // 브라우저 환경: 인라인 fallback
    root = protobuf.parse(PROTO_FALLBACK).root;
  }

  PlayerMoveType = root.lookupType('aeterna.PlayerMove');
  PlayerActionType = root.lookupType('aeterna.PlayerAction');
  JoinRoomType = root.lookupType('aeterna.JoinRoom');
  PlayerJoinedType = root.lookupType('aeterna.PlayerJoined');
  PvpActionType = root.lookupType('aeterna.PvpAction');
  PvpResultType = root.lookupType('aeterna.PvpResult');
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

export function encodePvpAction(data: IPvpAction): Uint8Array {
  ensureInitialized();
  const msg = PvpActionType!.create(toSnakeCase(data as unknown as Record<string, unknown>));
  return PvpActionType!.encode(msg).finish();
}

export function encodePvpResult(data: IPvpResult): Uint8Array {
  ensureInitialized();
  const msg = PvpResultType!.create(toSnakeCase(data as unknown as Record<string, unknown>));
  return PvpResultType!.encode(msg).finish();
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

export function decodePvpAction(buf: Uint8Array): IPvpAction {
  ensureInitialized();
  const decoded = PvpActionType!.decode(buf);
  const obj = PvpActionType!.toObject(decoded) as Record<string, unknown>;
  return toCamelCase(obj) as unknown as IPvpAction;
}

export function decodePvpResult(buf: Uint8Array): IPvpResult {
  ensureInitialized();
  const decoded = PvpResultType!.decode(buf);
  const obj = PvpResultType!.toObject(decoded) as Record<string, unknown>;
  return toCamelCase(obj) as unknown as IPvpResult;
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
