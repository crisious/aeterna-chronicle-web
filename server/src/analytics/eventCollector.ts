/**
 * P14-02: 이벤트 수집 SDK
 * 클라이언트/서버 양측 이벤트 트래킹
 * 세션/전투/경제/소셜/진행 이벤트 정의 + 수집 + 버퍼링 + 전송
 */

// uuid 대체 — crypto.randomUUID 사용
function uuidv4(): string {
  // Node 19+ / 브라우저 지원
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  // 폴백: 간이 UUID v4
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}
import {
  GameEvent, EventCategory, BaseEvent,
  SessionEvent, CombatEvent, EconomyEvent, SocialEvent, ProgressionEvent,
} from './dataWarehouse';

// ─── 수집기 설정 ───────────────────────────────────────────────

export interface EventCollectorConfig {
  /** 이벤트 버퍼 최대 크기 (초과 시 자동 flush) */
  bufferSize: number;
  /** 자동 flush 간격 (ms) */
  flushIntervalMs: number;
  /** 이벤트 전송 대상 */
  transport: 'redis_stream' | 'kafka' | 'http';
  /** 전송 엔드포인트 */
  endpoint: string;
  /** 서버 ID (자동 주입) */
  serverId: string;
  /** 샘플링 비율 (0~1, 1=전수 수집) */
  samplingRate: number;
  /** 디버그 모드 */
  debug: boolean;
}

const DEFAULT_CONFIG: EventCollectorConfig = {
  bufferSize: 1000,
  flushIntervalMs: 5000,
  transport: 'redis_stream',
  endpoint: 'etherna:events',
  serverId: 'server-1',
  samplingRate: 1.0,
  debug: false,
};

// ─── 이벤트 빌더 ───────────────────────────────────────────────

function createBaseEvent(
  category: EventCategory,
  eventType: string,
  userId: string,
  characterId: string,
  sessionId: string,
  serverId: string,
): BaseEvent {
  return {
    eventId: uuidv4(),
    eventType,
    category,
    userId,
    characterId,
    serverId,
    sessionId,
    timestamp: new Date(),
    metadata: {},
  };
}

// ─── 이벤트 수집기 클래스 ──────────────────────────────────────

export class EventCollector {
  private config: EventCollectorConfig;
  private buffer: GameEvent[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private totalCollected = 0;
  private totalFlushed = 0;
  private totalDropped = 0;

  constructor(config: Partial<EventCollectorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /** 수집기 시작 (자동 flush 타이머) */
  start(): void {
    if (this.flushTimer) return;
    this.flushTimer = setInterval(() => this.flush(), this.config.flushIntervalMs);
    if (this.config.debug) {
      console.log(`[EventCollector] Started — buffer=${this.config.bufferSize}, flush=${this.config.flushIntervalMs}ms`);
    }
  }

  /** 수집기 정지 (버퍼 최종 flush) */
  async stop(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    await this.flush();
    if (this.config.debug) {
      console.log(`[EventCollector] Stopped — total collected=${this.totalCollected}, flushed=${this.totalFlushed}, dropped=${this.totalDropped}`);
    }
  }

  /** 이벤트 수집 (버퍼에 추가) */
  collect(event: GameEvent): void {
    // 샘플링
    if (this.config.samplingRate < 1.0 && Math.random() > this.config.samplingRate) {
      this.totalDropped++;
      return;
    }

    this.buffer.push(event);
    this.totalCollected++;

    // 버퍼 초과 시 자동 flush
    if (this.buffer.length >= this.config.bufferSize) {
      this.flush();
    }
  }

  /** 버퍼 flush (전송) */
  async flush(): Promise<number> {
    if (this.buffer.length === 0) return 0;

    const batch = this.buffer.splice(0);
    const count = batch.length;

    try {
      await this.transport(batch);
      this.totalFlushed += count;
      if (this.config.debug) {
        console.log(`[EventCollector] Flushed ${count} events via ${this.config.transport}`);
      }
    } catch (err) {
      // 실패 시 버퍼 앞에 재삽입 (재시도)
      this.buffer.unshift(...batch);
      console.error(`[EventCollector] Flush failed — ${count} events re-queued`, err);
    }

    return count;
  }

  /** 통계 조회 */
  getStats(): { collected: number; flushed: number; dropped: number; buffered: number } {
    return {
      collected: this.totalCollected,
      flushed: this.totalFlushed,
      dropped: this.totalDropped,
      buffered: this.buffer.length,
    };
  }

  // ─── 편의 메서드: 세션 이벤트 ───────────────────────────────

  trackSessionStart(userId: string, characterId: string, sessionId: string, platform: SessionEvent['metadata']['platform'], clientVersion: string): void {
    const event: SessionEvent = {
      ...createBaseEvent('session', 'session_start', userId, characterId, sessionId, this.config.serverId),
      category: 'session',
      eventType: 'session_start',
      metadata: { platform, clientVersion },
    };
    this.collect(event);
  }

  trackSessionEnd(userId: string, characterId: string, sessionId: string, platform: SessionEvent['metadata']['platform'], clientVersion: string, durationMs: number): void {
    const event: SessionEvent = {
      ...createBaseEvent('session', 'session_end', userId, characterId, sessionId, this.config.serverId),
      category: 'session',
      eventType: 'session_end',
      metadata: { platform, clientVersion, durationMs },
    };
    this.collect(event);
  }

  // ─── 편의 메서드: 전투 이벤트 ───────────────────────────────

  trackCombatEnd(userId: string, characterId: string, sessionId: string, meta: CombatEvent['metadata']): void {
    const event: CombatEvent = {
      ...createBaseEvent('combat', 'combat_end', userId, characterId, sessionId, this.config.serverId),
      category: 'combat',
      eventType: 'combat_end',
      metadata: meta,
    };
    this.collect(event);
  }

  trackSkillUse(userId: string, characterId: string, sessionId: string, skillId: string, zoneCode: string): void {
    const event: CombatEvent = {
      ...createBaseEvent('combat', 'skill_use', userId, characterId, sessionId, this.config.serverId),
      category: 'combat',
      eventType: 'skill_use',
      metadata: { zoneCode, targetType: 'monster', targetId: '', skillId },
    };
    this.collect(event);
  }

  // ─── 편의 메서드: 경제 이벤트 ───────────────────────────────

  trackGoldEarn(userId: string, characterId: string, sessionId: string, amount: number, source: string): void {
    const event: EconomyEvent = {
      ...createBaseEvent('economy', 'gold_earn', userId, characterId, sessionId, this.config.serverId),
      category: 'economy',
      eventType: 'gold_earn',
      metadata: { quantity: 1, goldAmount: amount, source },
    };
    this.collect(event);
  }

  trackGoldSpend(userId: string, characterId: string, sessionId: string, amount: number, source: string): void {
    const event: EconomyEvent = {
      ...createBaseEvent('economy', 'gold_spend', userId, characterId, sessionId, this.config.serverId),
      category: 'economy',
      eventType: 'gold_spend',
      metadata: { quantity: 1, goldAmount: amount, source },
    };
    this.collect(event);
  }

  trackItemAcquire(userId: string, characterId: string, sessionId: string, itemId: string, itemName: string, quantity: number, source: string): void {
    const event: EconomyEvent = {
      ...createBaseEvent('economy', 'item_acquire', userId, characterId, sessionId, this.config.serverId),
      category: 'economy',
      eventType: 'item_acquire',
      metadata: { itemId, itemName, quantity, source },
    };
    this.collect(event);
  }

  // ─── 편의 메서드: 소셜 이벤트 ───────────────────────────────

  trackGuildJoin(userId: string, characterId: string, sessionId: string, guildId: string): void {
    const event: SocialEvent = {
      ...createBaseEvent('social', 'guild_join', userId, characterId, sessionId, this.config.serverId),
      category: 'social',
      eventType: 'guild_join',
      metadata: { guildId },
    };
    this.collect(event);
  }

  trackPvpMatch(userId: string, characterId: string, sessionId: string, result: 'win' | 'loss' | 'draw', ratingChange: number): void {
    const event: SocialEvent = {
      ...createBaseEvent('social', 'pvp_match', userId, characterId, sessionId, this.config.serverId),
      category: 'social',
      eventType: 'pvp_match',
      metadata: { pvpResult: result, ratingChange },
    };
    this.collect(event);
  }

  // ─── 편의 메서드: 진행 이벤트 ───────────────────────────────

  trackLevelUp(userId: string, characterId: string, sessionId: string, fromLevel: number, toLevel: number): void {
    const event: ProgressionEvent = {
      ...createBaseEvent('progression', 'level_up', userId, characterId, sessionId, this.config.serverId),
      category: 'progression',
      eventType: 'level_up',
      metadata: { fromLevel, toLevel },
    };
    this.collect(event);
  }

  trackQuestComplete(userId: string, characterId: string, sessionId: string, questId: string): void {
    const event: ProgressionEvent = {
      ...createBaseEvent('progression', 'quest_complete', userId, characterId, sessionId, this.config.serverId),
      category: 'progression',
      eventType: 'quest_complete',
      metadata: { questId },
    };
    this.collect(event);
  }

  trackDungeonClear(userId: string, characterId: string, sessionId: string, dungeonId: string, difficulty: 'normal' | 'heroic' | 'legendary'): void {
    const event: ProgressionEvent = {
      ...createBaseEvent('progression', 'dungeon_clear', userId, characterId, sessionId, this.config.serverId),
      category: 'progression',
      eventType: 'dungeon_clear',
      metadata: { dungeonId, difficulty },
    };
    this.collect(event);
  }

  // ─── 전송 레이어 ─────────────────────────────────────────────

  private async transport(events: GameEvent[]): Promise<void> {
    switch (this.config.transport) {
      case 'redis_stream':
        await this.sendToRedisStream(events);
        break;
      case 'kafka':
        await this.sendToKafka(events);
        break;
      case 'http':
        await this.sendToHttp(events);
        break;
    }
  }

  private async sendToRedisStream(events: GameEvent[]): Promise<void> {
    // Redis XADD 배치
    // XADD etherna:events * event_id {id} event_type {type} ...
    console.log(`[EventCollector] → Redis Stream "${this.config.endpoint}" (${events.length} events)`);
  }

  private async sendToKafka(events: GameEvent[]): Promise<void> {
    // Kafka producer.send({ topic: endpoint, messages: [...] })
    console.log(`[EventCollector] → Kafka topic "${this.config.endpoint}" (${events.length} events)`);
  }

  private async sendToHttp(events: GameEvent[]): Promise<void> {
    // HTTP POST to endpoint with JSON body
    console.log(`[EventCollector] → HTTP POST "${this.config.endpoint}" (${events.length} events)`);
  }
}

// ─── 싱글턴 인스턴스 ────────────────────────────────────────────

let globalCollector: EventCollector | null = null;

export function getEventCollector(config?: Partial<EventCollectorConfig>): EventCollector {
  if (!globalCollector) {
    globalCollector = new EventCollector(config);
    globalCollector.start();
  }
  return globalCollector;
}

export async function shutdownEventCollector(): Promise<void> {
  if (globalCollector) {
    await globalCollector.stop();
    globalCollector = null;
  }
}
