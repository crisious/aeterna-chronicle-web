import { Socket } from 'socket.io';
import { persistDialogueTelemetry } from './dialogueTelemetryPersistence';
import { DialogueChoiceTelemetryEvent } from '../../../shared/types/telemetry';

export type { DialogueChoiceTelemetryEvent };

const dedupeWindowMs = 5 * 60 * 1000;
const idempotencyStore = new Map<string, number>();

/** 주기적 정리: 30초마다 만료된 idempotency 키 제거 (매 요청마다 순회 → 타이머 기반) */
const PRUNE_INTERVAL_MS = 30_000;
let pruneTimer: ReturnType<typeof setInterval> | null = null;

function startPruneTimer(): void {
  if (pruneTimer) return;
  pruneTimer = setInterval(() => {
    pruneExpired();
  }, PRUNE_INTERVAL_MS);
  // 서버 종료 시 타이머가 프로세스 유지하지 않도록
  if (pruneTimer && typeof pruneTimer === 'object' && 'unref' in pruneTimer) {
    pruneTimer.unref();
  }
}

startPruneTimer();

export function stopPruneTimer(): void {
  if (pruneTimer) {
    clearInterval(pruneTimer);
    pruneTimer = null;
  }
}

export async function handleDialogueTelemetry(socket: Socket, payload: DialogueChoiceTelemetryEvent): Promise<void> {
  // pruneExpired()는 이제 30초 타이머로 주기적 실행 — 매 요청마다 호출하지 않음

  if (!isValid(payload)) {
    socket.emit('telemetry:ack', {
      ok: false,
      reason: 'invalid_payload'
    });
    return;
  }

  const now = Date.now();
  const duplicated = idempotencyStore.has(payload.idempotencyKey);
  if (!duplicated) {
    idempotencyStore.set(payload.idempotencyKey, now + dedupeWindowMs);
  }

  console.log('[Telemetry:dialogue_choice]', {
    deduped: duplicated,
    eventId: payload.eventId,
    idempotencyKey: payload.idempotencyKey,
    chapterId: payload.chapterId,
    sceneId: payload.sceneId,
    npcId: payload.npcId,
    choiceId: payload.choiceId,
    latencyMs: payload.latencyMs,
    platform: payload.platform,
    buildVersion: payload.buildVersion
  });

  try {
    await persistDialogueTelemetry(payload, duplicated);
  } catch (error) {
    console.error('[Telemetry:dialogue_choice] persistence failed', {
      eventId: payload.eventId,
      reason: error instanceof Error ? error.message : String(error)
    });
  }

  socket.emit('telemetry:ack', {
    ok: true,
    deduped: duplicated,
    idempotencyKey: payload.idempotencyKey
  });
}

function isValid(payload: DialogueChoiceTelemetryEvent): boolean {
  const requiredStringKeys: Array<keyof DialogueChoiceTelemetryEvent> = [
    'eventId',
    'eventTs',
    'sessionId',
    'playerIdHash',
    'chapterId',
    'sceneId',
    'npcId',
    'dialogueNodeId',
    'choiceId',
    'choiceTextKey',
    'buildVersion',
    'platform',
    'idempotencyKey'
  ];

  return requiredStringKeys.every((key) => typeof payload[key] === 'string' && (payload[key] as string).length > 0);
}

function pruneExpired(): void {
  const now = Date.now();
  for (const [key, expiresAt] of idempotencyStore.entries()) {
    if (expiresAt <= now) {
      idempotencyStore.delete(key);
    }
  }
}
