/**
 * networkWorker.ts — 네트워크 직렬화/역직렬화 WebWorker
 *
 * Protobuf 인코딩/디코딩을 메인 스레드에서 분리하여
 * 대량 패킷 처리 시 프레임 드롭을 방지한다.
 * Vite worker import: import NetworkWorker from './networkWorker?worker'
 */

import * as protobuf from 'protobufjs';

// ── 메시지 타입 정의 ──────────────────────────────────────────

/** 메인 → Worker 요청 */
interface EncodeRequest {
  type: 'encode';
  id: string;
  messageType: string;  // 'PlayerMove' | 'PlayerAction' | 'JoinRoom' 등
  payload: Record<string, unknown>;
}

interface DecodeRequest {
  type: 'decode';
  id: string;
  messageType: string;
  buffer: ArrayBuffer;
}

interface BatchDecodeRequest {
  type: 'batch-decode';
  id: string;
  items: Array<{
    messageType: string;
    buffer: ArrayBuffer;
  }>;
}

type WorkerRequest = EncodeRequest | DecodeRequest | BatchDecodeRequest;

/** Worker → 메인 응답 */
interface EncodeResponse {
  type: 'encode-result';
  id: string;
  buffer: ArrayBuffer;
}

interface DecodeResponse {
  type: 'decode-result';
  id: string;
  payload: Record<string, unknown>;
}

interface BatchDecodeResponse {
  type: 'batch-decode-result';
  id: string;
  results: Array<Record<string, unknown>>;
}

// ── Protobuf 초기화 ───────────────────────────────────────────

/** 인라인 proto 정의 (gameCodec.ts와 동일) */
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

/** 메시지 타입 맵 (초기화 후 사용) */
let messageTypes: Map<string, protobuf.Type> = new Map();
let initialized = false;

/** camelCase → snake_case 변환 */
function toSnakeCase(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(obj)) {
    const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
    result[snakeKey] = obj[key];
  }
  return result;
}

/** snake_case → camelCase 변환 */
function toCamelCase(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
    result[camelKey] = obj[key];
  }
  return result;
}

/** Proto 초기화 */
function initProto(): void {
  if (initialized) return;

  const root = protobuf.parse(PROTO_DEFINITION).root;
  const typeNames = ['PlayerMove', 'PlayerAction', 'JoinRoom', 'PlayerJoined', 'PvpAction', 'PvpResult'];

  for (const name of typeNames) {
    messageTypes.set(name, root.lookupType(`aeterna.${name}`));
  }

  initialized = true;
}

// ── Worker 메시지 핸들러 ──────────────────────────────────────

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  initProto();

  const request = e.data;

  switch (request.type) {
    case 'encode': {
      const msgType = messageTypes.get(request.messageType);
      if (!msgType) {
        console.error(`[NetworkWorker] 알 수 없는 메시지 타입: ${request.messageType}`);
        return;
      }
      const msg = msgType.create(toSnakeCase(request.payload));
      const encoded = msgType.encode(msg).finish();
      const ab = encoded.buffer.slice(encoded.byteOffset, encoded.byteOffset + encoded.byteLength) as ArrayBuffer;
      const response: EncodeResponse = {
        type: 'encode-result',
        id: request.id,
        buffer: ab,
      };
      self.postMessage(response, [ab]);
      break;
    }

    case 'decode': {
      const msgType = messageTypes.get(request.messageType);
      if (!msgType) {
        console.error(`[NetworkWorker] 알 수 없는 메시지 타입: ${request.messageType}`);
        return;
      }
      const decoded = msgType.decode(new Uint8Array(request.buffer));
      const obj = msgType.toObject(decoded) as Record<string, unknown>;
      const response: DecodeResponse = {
        type: 'decode-result',
        id: request.id,
        payload: toCamelCase(obj),
      };
      self.postMessage(response);
      break;
    }

    case 'batch-decode': {
      const results: Array<Record<string, unknown>> = [];
      for (const item of request.items) {
        const msgType = messageTypes.get(item.messageType);
        if (!msgType) {
          results.push({});
          continue;
        }
        const decoded = msgType.decode(new Uint8Array(item.buffer));
        const obj = msgType.toObject(decoded) as Record<string, unknown>;
        results.push(toCamelCase(obj));
      }
      const response: BatchDecodeResponse = {
        type: 'batch-decode-result',
        id: request.id,
        results,
      };
      self.postMessage(response);
      break;
    }
  }
};

// Worker 준비 완료 신호
self.postMessage({ type: 'ready' });
