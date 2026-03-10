import { Socket } from 'socket.io';
import { persistDialogueTelemetry } from './dialogueTelemetryPersistence';

export interface DialogueChoiceTelemetryEvent {
  eventId: string;
  eventTs: string;
  sessionId: string;
  playerIdHash: string;
  chapterId: string;
  sceneId: string;
  npcId: string;
  dialogueNodeId: string;
  choiceId: string;
  choiceTextKey: string;
  inputMode: 'keyboard' | 'gamepad' | 'touch';
  latencyMs?: number;
  partyComp?: string[];
  difficultyTier?: 'story' | 'normal' | 'hard' | 'nightmare';
  buildVersion: string;
  platform: 'web' | 'unity' | 'ue5' | 'ps5' | 'xbox';
  region?: string;
  idempotencyKey: string;
}

const dedupeWindowMs = 5 * 60 * 1000;
const idempotencyStore = new Map<string, number>();

export async function handleDialogueTelemetry(socket: Socket, payload: DialogueChoiceTelemetryEvent): Promise<void> {
  pruneExpired();

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
