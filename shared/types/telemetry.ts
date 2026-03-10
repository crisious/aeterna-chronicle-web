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
