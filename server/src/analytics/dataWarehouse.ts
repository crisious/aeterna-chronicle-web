/**
 * P14-01: 데이터 웨어하우스 설계
 * ClickHouse/BigQuery 스키마 + ETL 파이프라인 + 이벤트 스키마 정의
 * 
 * 아키텍처:
 *   PostgreSQL (OLTP) → ETL Worker → ClickHouse (OLAP)
 *   이벤트 스트림: eventCollector → Kafka/Redis Stream → ClickHouse
 */

// ─── ClickHouse 테이블 스키마 정의 ───────────────────────────────

export interface ClickHouseSchema {
  database: string;
  tables: ClickHouseTable[];
}

export interface ClickHouseTable {
  name: string;
  engine: 'MergeTree' | 'ReplacingMergeTree' | 'AggregatingMergeTree' | 'SummingMergeTree';
  orderBy: string[];
  partitionBy?: string;
  ttlDays?: number;
  columns: ClickHouseColumn[];
}

export interface ClickHouseColumn {
  name: string;
  type: 'String' | 'UInt8' | 'UInt16' | 'UInt32' | 'UInt64' | 'Int32' | 'Int64'
    | 'Float32' | 'Float64' | 'DateTime' | 'Date' | 'UUID' | 'Enum8'
    | 'Array(String)' | 'Map(String, String)' | 'Nullable(String)' | 'Nullable(Float64)';
  comment?: string;
}

// ─── 이벤트 스키마 정의 (5종) ──────────────────────────────────

export type EventCategory = 'session' | 'combat' | 'economy' | 'social' | 'progression';

export interface BaseEvent {
  eventId: string;         // UUID v4
  eventType: string;       // e.g. 'session_start', 'combat_kill'
  category: EventCategory;
  userId: string;
  characterId: string;
  serverId: string;
  timestamp: Date;
  sessionId: string;
  metadata: Record<string, unknown>;
}

export interface SessionEvent extends BaseEvent {
  category: 'session';
  eventType: 'session_start' | 'session_end' | 'session_heartbeat';
  metadata: {
    platform: 'web' | 'unity' | 'mobile';
    clientVersion: string;
    ip?: string;
    deviceId?: string;
    durationMs?: number;     // session_end 시
  };
}

export interface CombatEvent extends BaseEvent {
  category: 'combat';
  eventType: 'combat_start' | 'combat_end' | 'combat_kill' | 'combat_death'
    | 'skill_use' | 'damage_dealt' | 'damage_taken';
  metadata: {
    zoneCode: string;
    dungeonId?: string;
    targetType: 'monster' | 'player' | 'boss' | 'raid_boss';
    targetId: string;
    skillId?: string;
    damage?: number;
    isCritical?: boolean;
    resultWin?: boolean;
    durationMs?: number;
    partySize?: number;
  };
}

export interface EconomyEvent extends BaseEvent {
  category: 'economy';
  eventType: 'gold_earn' | 'gold_spend' | 'item_acquire' | 'item_consume'
    | 'item_trade' | 'crystal_purchase' | 'shop_buy' | 'auction_sell';
  metadata: {
    itemId?: string;
    itemName?: string;
    quantity: number;
    goldAmount?: number;
    crystalAmount?: number;
    source: string;        // 'quest_reward', 'monster_drop', 'shop', 'auction', etc.
    tradePartnerId?: string;
  };
}

export interface SocialEvent extends BaseEvent {
  category: 'social';
  eventType: 'guild_join' | 'guild_leave' | 'chat_message' | 'friend_add'
    | 'friend_remove' | 'party_join' | 'party_leave' | 'pvp_match';
  metadata: {
    guildId?: string;
    channelType?: 'world' | 'guild' | 'party' | 'whisper';
    friendId?: string;
    partyId?: string;
    pvpResult?: 'win' | 'loss' | 'draw';
    ratingChange?: number;
  };
}

export interface ProgressionEvent extends BaseEvent {
  category: 'progression';
  eventType: 'level_up' | 'quest_complete' | 'achievement_unlock'
    | 'class_advance' | 'dungeon_clear' | 'season_pass_level' | 'pet_evolve';
  metadata: {
    fromLevel?: number;
    toLevel?: number;
    questId?: string;
    achievementId?: string;
    classId?: string;
    dungeonId?: string;
    difficulty?: 'normal' | 'heroic' | 'legendary';
    seasonPassTier?: number;
    petId?: string;
    evolutionStage?: number;
  };
}

export type GameEvent = SessionEvent | CombatEvent | EconomyEvent | SocialEvent | ProgressionEvent;

// ─── 데이터 웨어하우스 스키마 ────────────────────────────────────

export const WAREHOUSE_SCHEMA: ClickHouseSchema = {
  database: 'etherna_analytics',
  tables: [
    // 원시 이벤트 테이블
    {
      name: 'events_raw',
      engine: 'MergeTree',
      orderBy: ['category', 'eventType', 'timestamp'],
      partitionBy: 'toYYYYMM(timestamp)',
      ttlDays: 365,
      columns: [
        { name: 'event_id', type: 'UUID', comment: '이벤트 고유 ID' },
        { name: 'event_type', type: 'String', comment: '이벤트 타입' },
        { name: 'category', type: 'Enum8', comment: 'session=1, combat=2, economy=3, social=4, progression=5' },
        { name: 'user_id', type: 'String', comment: '유저 ID' },
        { name: 'character_id', type: 'String', comment: '캐릭터 ID' },
        { name: 'server_id', type: 'String', comment: '서버 ID' },
        { name: 'session_id', type: 'String', comment: '세션 ID' },
        { name: 'timestamp', type: 'DateTime', comment: '이벤트 발생 시각' },
        { name: 'metadata', type: 'Map(String, String)', comment: '이벤트 메타데이터' },
      ],
    },
    // 일별 유저 활동 집계
    {
      name: 'daily_user_activity',
      engine: 'SummingMergeTree',
      orderBy: ['date', 'user_id'],
      partitionBy: 'toYYYYMM(date)',
      ttlDays: 730,
      columns: [
        { name: 'date', type: 'Date', comment: '집계 날짜' },
        { name: 'user_id', type: 'String', comment: '유저 ID' },
        { name: 'session_count', type: 'UInt32', comment: '세션 수' },
        { name: 'total_play_time_ms', type: 'UInt64', comment: '총 플레이 시간 (ms)' },
        { name: 'combat_count', type: 'UInt32', comment: '전투 횟수' },
        { name: 'gold_earned', type: 'Int64', comment: '골드 획득량' },
        { name: 'gold_spent', type: 'Int64', comment: '골드 소비량' },
        { name: 'quests_completed', type: 'UInt32', comment: '퀘스트 완료 수' },
        { name: 'levels_gained', type: 'UInt32', comment: '레벨업 횟수' },
        { name: 'chat_messages', type: 'UInt32', comment: '채팅 메시지 수' },
        { name: 'pvp_matches', type: 'UInt32', comment: 'PvP 매치 수' },
      ],
    },
    // 시간별 서버 메트릭
    {
      name: 'hourly_server_metrics',
      engine: 'SummingMergeTree',
      orderBy: ['hour', 'server_id'],
      partitionBy: 'toYYYYMM(hour)',
      ttlDays: 180,
      columns: [
        { name: 'hour', type: 'DateTime', comment: '집계 시각 (시 단위)' },
        { name: 'server_id', type: 'String', comment: '서버 ID' },
        { name: 'active_users', type: 'UInt32', comment: '동시 접속자' },
        { name: 'new_sessions', type: 'UInt32', comment: '신규 세션' },
        { name: 'events_total', type: 'UInt64', comment: '총 이벤트 수' },
        { name: 'avg_latency_ms', type: 'Float32', comment: '평균 응답시간 (ms)' },
      ],
    },
    // 경제 흐름 집계
    {
      name: 'economy_flow_daily',
      engine: 'SummingMergeTree',
      orderBy: ['date', 'source'],
      partitionBy: 'toYYYYMM(date)',
      ttlDays: 730,
      columns: [
        { name: 'date', type: 'Date', comment: '집계 날짜' },
        { name: 'source', type: 'String', comment: '골드 소스/싱크' },
        { name: 'gold_in', type: 'Int64', comment: '유입 골드' },
        { name: 'gold_out', type: 'Int64', comment: '유출 골드' },
        { name: 'crystal_in', type: 'Int64', comment: '유입 크리스탈' },
        { name: 'crystal_out', type: 'Int64', comment: '유출 크리스탈' },
        { name: 'transactions', type: 'UInt32', comment: '거래 건수' },
      ],
    },
    // 리텐션 코호트
    {
      name: 'retention_cohort',
      engine: 'ReplacingMergeTree',
      orderBy: ['cohort_date', 'days_since_join', 'segment'],
      partitionBy: 'toYYYYMM(cohort_date)',
      columns: [
        { name: 'cohort_date', type: 'Date', comment: '가입일 코호트' },
        { name: 'days_since_join', type: 'UInt16', comment: '가입 후 경과일' },
        { name: 'segment', type: 'String', comment: '유저 세그먼트' },
        { name: 'cohort_size', type: 'UInt32', comment: '코호트 크기' },
        { name: 'retained_users', type: 'UInt32', comment: '잔존 유저 수' },
        { name: 'retention_rate', type: 'Float32', comment: '잔존율 (0~1)' },
      ],
    },
  ],
};

// ─── ETL 파이프라인 설정 ────────────────────────────────────────

export interface EtlPipelineConfig {
  source: 'postgresql' | 'redis_stream' | 'kafka';
  destination: 'clickhouse';
  schedule: string;            // cron expression
  batchSize: number;
  retryPolicy: {
    maxRetries: number;
    backoffMs: number;
  };
  transformations: EtlTransformation[];
}

export interface EtlTransformation {
  name: string;
  type: 'map' | 'filter' | 'aggregate' | 'enrich';
  config: Record<string, unknown>;
}

export const ETL_PIPELINES: EtlPipelineConfig[] = [
  {
    source: 'redis_stream',
    destination: 'clickhouse',
    schedule: '*/5 * * * *',    // 5분마다
    batchSize: 10000,
    retryPolicy: { maxRetries: 3, backoffMs: 5000 },
    transformations: [
      {
        name: 'parseMetadata',
        type: 'map',
        config: { parseJson: true, flattenDepth: 1 },
      },
      {
        name: 'filterInvalid',
        type: 'filter',
        config: { requiredFields: ['event_id', 'user_id', 'timestamp'] },
      },
    ],
  },
  {
    source: 'postgresql',
    destination: 'clickhouse',
    schedule: '0 3 * * *',      // 매일 03시 (일별 집계)
    batchSize: 50000,
    retryPolicy: { maxRetries: 3, backoffMs: 10000 },
    transformations: [
      {
        name: 'aggregateDaily',
        type: 'aggregate',
        config: {
          groupBy: ['user_id', 'date'],
          metrics: ['session_count', 'play_time', 'combat_count', 'gold_flow'],
        },
      },
      {
        name: 'enrichUserSegment',
        type: 'enrich',
        config: { lookupTable: 'user_segments', joinKey: 'user_id' },
      },
    ],
  },
  {
    source: 'postgresql',
    destination: 'clickhouse',
    schedule: '0 4 * * 1',      // 매주 월요일 04시 (주간 코호트)
    batchSize: 100000,
    retryPolicy: { maxRetries: 3, backoffMs: 15000 },
    transformations: [
      {
        name: 'buildRetentionCohort',
        type: 'aggregate',
        config: {
          cohortField: 'created_at',
          retentionDays: [1, 3, 7, 14, 30, 60, 90],
          segmentBy: ['channel', 'region'],
        },
      },
    ],
  },
];

// ─── ClickHouse 클라이언트 인터페이스 ──────────────────────────

export interface WarehouseClient {
  /** 이벤트 배치 삽입 */
  insertEvents(events: GameEvent[]): Promise<{ inserted: number; errors: number }>;

  /** 일별 활동 집계 실행 */
  runDailyAggregation(date: Date): Promise<{ rowsAffected: number }>;

  /** 리텐션 코호트 갱신 */
  updateRetentionCohort(cohortDate: Date, days: number[]): Promise<{ cohortsUpdated: number }>;

  /** 경제 흐름 집계 */
  aggregateEconomyFlow(date: Date): Promise<{ sources: number; totalIn: number; totalOut: number }>;

  /** 커스텀 쿼리 실행 (어드민 대시보드용) */
  query<T>(sql: string, params?: Record<string, unknown>): Promise<T[]>;
}

// ─── 팩토리 ──────────────────────────────────────────────────────

export function createWarehouseClient(config: {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
}): WarehouseClient {
  // ClickHouse HTTP 인터페이스 기반 구현
  const baseUrl = `http://${config.host}:${config.port}`;

  return {
    async insertEvents(events) {
      const rows = events.map(e => ({
        event_id: e.eventId,
        event_type: e.eventType,
        category: e.category,
        user_id: e.userId,
        character_id: e.characterId,
        server_id: e.serverId,
        session_id: e.sessionId,
        timestamp: e.timestamp.toISOString(),
        metadata: e.metadata,
      }));

      console.log(`[Warehouse] Inserting ${rows.length} events to ${config.database}.events_raw`);
      // 실제 구현: HTTP POST to ClickHouse with JSONEachRow format
      return { inserted: rows.length, errors: 0 };
    },

    async runDailyAggregation(date) {
      const dateStr = date.toISOString().split('T')[0];
      console.log(`[Warehouse] Running daily aggregation for ${dateStr}`);
      // INSERT INTO daily_user_activity SELECT ... FROM events_raw WHERE toDate(timestamp) = '${dateStr}' GROUP BY user_id
      return { rowsAffected: 0 };
    },

    async updateRetentionCohort(cohortDate, days) {
      console.log(`[Warehouse] Updating retention cohort ${cohortDate.toISOString().split('T')[0]} for days [${days.join(',')}]`);
      return { cohortsUpdated: days.length };
    },

    async aggregateEconomyFlow(date) {
      const dateStr = date.toISOString().split('T')[0];
      console.log(`[Warehouse] Aggregating economy flow for ${dateStr}`);
      return { sources: 0, totalIn: 0, totalOut: 0 };
    },

    async query<T>(sql: string, _params?: Record<string, unknown>): Promise<T[]> {
      console.log(`[Warehouse] Executing query: ${sql.substring(0, 100)}...`);
      // HTTP GET/POST to ClickHouse with FORMAT JSON
      return [] as T[];
    },
  };
}

// ─── DDL 생성 헬퍼 ──────────────────────────────────────────────

export function generateDDL(schema: ClickHouseSchema): string {
  const lines: string[] = [];
  lines.push(`CREATE DATABASE IF NOT EXISTS ${schema.database};`);
  lines.push('');

  for (const table of schema.tables) {
    lines.push(`CREATE TABLE IF NOT EXISTS ${schema.database}.${table.name} (`);
    const colDefs = table.columns.map(c => {
      const comment = c.comment ? ` COMMENT '${c.comment}'` : '';
      return `  ${c.name} ${c.type}${comment}`;
    });
    lines.push(colDefs.join(',\n'));
    lines.push(`) ENGINE = ${table.engine}()`);
    lines.push(`ORDER BY (${table.orderBy.join(', ')})`);
    if (table.partitionBy) lines.push(`PARTITION BY ${table.partitionBy}`);
    if (table.ttlDays) lines.push(`TTL timestamp + INTERVAL ${table.ttlDays} DAY`);
    lines.push(';');
    lines.push('');
  }

  return lines.join('\n');
}
