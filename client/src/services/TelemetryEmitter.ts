/**
 * TelemetryEmitter — 텔레메트리 이벤트 발행 (P10-08)
 *
 * GameScene에서 분리된 텔레메트리 전송 서비스.
 * 소켓 연결 시 서버로 전송, 오프라인 시 콘솔 로그 fallback.
 * 향후 로컬 버퍼링 + 배치 전송 확장 가능.
 */

import { buildDialogueChoiceTelemetry, DialogueChoiceTelemetryEvent } from '../telemetry/dialogueTelemetry';
import { NetworkService } from './NetworkService';

// ── 타입 정의 ─────────────────────────────────────────────────

export interface DialogueChoiceParams {
  sessionId: string;
  playerId: string;
  chapterId: string;
  sceneId: string;
  npcId: string;
  dialogueNodeId: string;
  choiceId: string;
  choiceTextKey: string;
  inputMode: string;
  latencyMs?: number;
  partyComp: string[];
  difficultyTier: string;
  buildVersion: string;
  platform: string;
  region: string;
}

// ── TelemetryEmitter ──────────────────────────────────────────

export class TelemetryEmitter {
  private offlineBuffer: DialogueChoiceTelemetryEvent[] = [];
  private static readonly MAX_BUFFER_SIZE = 100;

  constructor(private readonly networkService: NetworkService) {}

  /**
   * 대화 선택지 텔레메트리 발행
   */
  emitDialogueChoice(params: DialogueChoiceParams): void {
    const event = buildDialogueChoiceTelemetry(params);
    this.emit('telemetry:dialogue_choice', event);
  }

  /**
   * 범용 텔레메트리 이벤트 발행
   */
  emit(eventName: string, data: unknown): void {
    if (this.networkService.isConnected) {
      // 오프라인 버퍼가 있으면 먼저 플러시
      this.flushBuffer();
      this.networkService.emit(eventName, data);
    } else {
      console.log(`[Telemetry:offline] ${eventName}`, data);

      // 대화 선택 이벤트는 버퍼링
      if (eventName === 'telemetry:dialogue_choice') {
        this.offlineBuffer.push(data as DialogueChoiceTelemetryEvent);
        if (this.offlineBuffer.length > TelemetryEmitter.MAX_BUFFER_SIZE) {
          this.offlineBuffer.shift(); // 오래된 것부터 버림
        }
      }
    }
  }

  /**
   * 오프라인 버퍼 플러시 (연결 복구 시)
   */
  private flushBuffer(): void {
    if (this.offlineBuffer.length === 0) return;

    console.log(`[Telemetry] 오프라인 버퍼 플러시: ${this.offlineBuffer.length}건`);
    for (const event of this.offlineBuffer) {
      this.networkService.emit('telemetry:dialogue_choice', event);
    }
    this.offlineBuffer = [];
  }

  /**
   * 버퍼 상태 조회
   */
  getBufferSize(): number {
    return this.offlineBuffer.length;
  }
}
