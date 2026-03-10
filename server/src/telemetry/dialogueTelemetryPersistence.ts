import { prisma } from '../db';
import { redisClient, redisConnected } from '../redis';
import { DialogueChoiceTelemetryEvent } from './dialogueTelemetryServer';

const REDIS_TTL_SECONDS = 60 * 24 * 60 * 60; // 60 days

function baseKey(payload: DialogueChoiceTelemetryEvent): string {
  return `telemetry:dialogue_choice:${payload.eventId}`;
}

export async function persistDialogueTelemetry(
  payload: DialogueChoiceTelemetryEvent,
  deduped: boolean
): Promise<void> {
  if (redisConnected) {
    await persistToRedis(payload, deduped);
  }
  await persistToPostgresBestEffort(payload, deduped);
}

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
 * Prisma 모델이 아직 schema.prisma에 반영되지 않았을 수 있으므로
 * raw SQL + best-effort로 기록한다. (테이블 미존재 시 서버 동작은 유지)
 */
async function persistToPostgresBestEffort(
  payload: DialogueChoiceTelemetryEvent,
  deduped: boolean
): Promise<void> {
  const eventTs = new Date(payload.eventTs);
  const latencyMs = payload.latencyMs ?? null;
  const partyComp = JSON.stringify(payload.partyComp ?? []);
  const difficultyTier = payload.difficultyTier ?? null;
  const region = payload.region ?? null;

  try {
    await prisma.$executeRawUnsafe(
      `
      INSERT INTO telemetry_dialogue_choice_events (
        event_id,
        event_ts,
        session_id,
        player_id_hash,
        chapter_id,
        scene_id,
        npc_id,
        dialogue_node_id,
        choice_id,
        choice_text_key,
        input_mode,
        latency_ms,
        party_comp,
        difficulty_tier,
        build_version,
        platform,
        region,
        idempotency_key,
        deduped,
        created_at
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
        $11,$12,$13,$14,$15,$16,$17,$18,$19,NOW()
      )
      ON CONFLICT (idempotency_key)
      DO UPDATE SET deduped = EXCLUDED.deduped;
      `,
      payload.eventId,
      eventTs,
      payload.sessionId,
      payload.playerIdHash,
      payload.chapterId,
      payload.sceneId,
      payload.npcId,
      payload.dialogueNodeId,
      payload.choiceId,
      payload.choiceTextKey,
      payload.inputMode,
      latencyMs,
      partyComp,
      difficultyTier,
      payload.buildVersion,
      payload.platform,
      region,
      payload.idempotencyKey,
      deduped
    );
  } catch (error) {
    console.warn('[Telemetry:dialogue_choice] postgres persistence skipped', {
      reason: error instanceof Error ? error.message : String(error),
      eventId: payload.eventId
    });
  }
}
