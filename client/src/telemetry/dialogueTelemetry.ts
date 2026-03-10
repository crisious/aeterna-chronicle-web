export type InputMode = 'keyboard' | 'gamepad' | 'touch';

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
  inputMode: InputMode;
  latencyMs?: number;
  partyComp?: string[];
  difficultyTier?: 'story' | 'normal' | 'hard' | 'nightmare';
  buildVersion: string;
  platform: 'web' | 'unity' | 'ue5' | 'ps5' | 'xbox';
  region?: string;
  idempotencyKey: string;
}

export interface BuildChoiceTelemetryInput {
  sessionId: string;
  playerId: string;
  chapterId: string;
  sceneId: string;
  npcId: string;
  dialogueNodeId: string;
  choiceId: string;
  choiceTextKey: string;
  inputMode: InputMode;
  latencyMs?: number;
  partyComp?: string[];
  difficultyTier?: 'story' | 'normal' | 'hard' | 'nightmare';
  buildVersion: string;
  platform: 'web' | 'unity' | 'ue5' | 'ps5' | 'xbox';
  region?: string;
}

export function buildDialogueChoiceTelemetry(input: BuildChoiceTelemetryInput): DialogueChoiceTelemetryEvent {
  const eventId = cryptoRandomId();
  const eventTs = new Date().toISOString();
  const playerIdHash = `fnv1a:${fnv1a32(input.playerId)}`;
  const idempotencyKey = `${input.sessionId}:${input.dialogueNodeId}:${input.choiceId}`;

  return {
    eventId,
    eventTs,
    sessionId: input.sessionId,
    playerIdHash,
    chapterId: input.chapterId,
    sceneId: input.sceneId,
    npcId: input.npcId,
    dialogueNodeId: input.dialogueNodeId,
    choiceId: input.choiceId,
    choiceTextKey: input.choiceTextKey,
    inputMode: input.inputMode,
    latencyMs: input.latencyMs,
    partyComp: input.partyComp,
    difficultyTier: input.difficultyTier,
    buildVersion: input.buildVersion,
    platform: input.platform,
    region: input.region,
    idempotencyKey
  };
}

function cryptoRandomId(): string {
  const c = globalThis.crypto as Crypto | undefined;
  if (c && 'randomUUID' in c) {
    return c.randomUUID();
  }

  return `evt_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
}

function fnv1a32(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  const normalized = hash >>> 0;
  return normalized.toString(16).padStart(8, '0');
}
