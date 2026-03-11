import { prisma } from '../db';
import { redisClient, redisConnected } from '../redis';
import { DialogueChoiceTelemetryEvent } from './dialogueTelemetryServer';

const REDIS_TTL_SECONDS = 60 * 24 * 60 * 60; // 60일

function baseKey(payload: DialogueChoiceTelemetryEvent): string {
  return `telemetry:dialogue_choice:${payload.eventId}`;
}

/**
 * 대화 선택지 텔레메트리를 Redis + PostgreSQL에 저장한다.
 * PostgreSQL 저장은 best-effort — 실패해도 서버는 계속 동작한다.
 */
export async function persistDialogueTelemetry(
  payload: DialogueChoiceTelemetryEvent,
  deduped: boolean
): Promise<void> {
  if (redisConnected) {
    await persistToRedis(payload, deduped);
  }
  await persistToPostgresBestEffort(payload, deduped);
}

/** Redis 해시 + 타임라인 sorted set + 카운터 원자적 기록 */
async function persistToRedis(payload: DialogueChoiceTelemetryEvent, deduped: boolean): Promise<void> {
  const key = baseKey(payload);
  const ts = Date.parse(payload.eventTs) || Date.now();

  await redisClient
    .multi()
    .hSet(key, {
      eventId: payload.eventId,
      eventTs: payload.eventTs,
      sessionId: payload.sessionId,
      playerIdHash: payload.playerIdHash,
      chapterId: payload.chapterId,
      sceneId: payload.sceneId,
      npcId: payload.npcId,
      dialogueNodeId: payload.dialogueNodeId,
      choiceId: payload.choiceId,
      choiceTextKey: payload.choiceTextKey,
      inputMode: payload.inputMode,
      latencyMs: String(payload.latencyMs ?? 0),
      partyCompJson: JSON.stringify(payload.partyComp ?? []),
      difficultyTier: payload.difficultyTier ?? '',
      buildVersion: payload.buildVersion,
      platform: payload.platform,
      region: payload.region ?? '',
      idempotencyKey: payload.idempotencyKey,
      deduped: String(deduped)
    })
    .expire(key, REDIS_TTL_SECONDS)
    .zAdd('telemetry:dialogue_choice:timeline', { score: ts, value: payload.eventId })
    .hIncrBy(
      `telemetry:dialogue_choice:counter:${payload.chapterId}:${payload.sceneId}:${payload.npcId}`,
      payload.choiceId,
      1
    )
    .exec();
}

/**
 * Prisma 모델 기반 PostgreSQL upsert.
 * idempotencyKey 중복 시 deduped 플래그만 갱신한다.
 * 테이블 미존재 등 오류 시 경고 로그만 남기고 서버 동작을 유지한다.
 */
async function persistToPostgresBestEffort(
  payload: DialogueChoiceTelemetryEvent,
  deduped: boolean
): Promise<void> {
  try {
    await prisma.telemetryDialogueChoice.upsert({
      where: { idempotencyKey: payload.idempotencyKey },
      create: {
        eventId: payload.eventId,
        eventTs: new Date(payload.eventTs),
        sessionId: payload.sessionId,
        playerIdHash: payload.playerIdHash,
        chapterId: payload.chapterId,
        sceneId: payload.sceneId,
        npcId: payload.npcId,
        dialogueNodeId: payload.dialogueNodeId,
        choiceId: payload.choiceId,
        choiceTextKey: payload.choiceTextKey,
        inputMode: payload.inputMode,
        latencyMs: payload.latencyMs ?? null,
        partyComp: payload.partyComp ?? undefined,
        difficultyTier: payload.difficultyTier ?? null,
        buildVersion: payload.buildVersion,
        platform: payload.platform,
        region: payload.region ?? null,
        idempotencyKey: payload.idempotencyKey,
        deduped,
      },
      update: {
        deduped,
      },
    });
  } catch (error) {
    // best-effort: 실패해도 서버 중단하지 않음
    console.warn('[Telemetry:dialogue_choice] postgres persistence skipped', {
      reason: error instanceof Error ? error.message : String(error),
      eventId: payload.eventId,
    });
  }
}
