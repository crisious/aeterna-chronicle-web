/**
 * spawnManager.ts — 존별 몬스터 스폰/리스폰 관리
 *
 * - 존별 스폰 포인트 관리 + 최대 수량 제한
 * - 리스폰 타이머 (몬스터별 respawnTime)
 * - 동적 난이도 조절 (접속자 수 기반)
 * - 필드 보스 출현 스케줄
 * - MonsterAI 인스턴스 라이프사이클 관리
 */
import { prisma } from '../db';
import {
  MonsterAI,
  type MonsterSkill,
  type BehaviorConfig,
  type DropEntry,
  type ElementType,
  type PlayerTarget,
  type MonsterAIEvent,
  type MonsterSnapshot,
} from './monsterAI';

// ─── 타입 정의 ──────────────────────────────────────────────────

/** DB에서 로드한 스폰 포인트 */
interface SpawnPoint {
  id: string;
  monsterId: string;
  zoneId: string;
  posX: number;
  posY: number;
  maxCount: number;
  isActive: boolean;
}

/** DB에서 로드한 몬스터 마스터 데이터 */
interface MonsterData {
  id: string;
  code: string;
  name: string;
  type: string;
  element: string;
  level: number;
  hp: number;
  attack: number;
  defense: number;
  speed: number;
  skills: unknown;
  dropTable: unknown;
  expReward: number;
  goldReward: number;
  behavior: unknown;
  respawnTime: number;
}

/** 리스폰 대기열 항목 */
interface RespawnEntry {
  spawnPointId: string;
  monsterId: string;
  respawnAt: number; // Date.now() 기준 타임스탬프
}

/** 필드 보스 스케줄 항목 */
interface FieldBossSchedule {
  monsterId: string;
  zoneId: string;
  intervalMinutes: number;
  lastSpawnedAt: number;
}

// ─── 스폰 매니저 ────────────────────────────────────────────────

class SpawnManager {
  /** 존 → 활성 MonsterAI 인스턴스 맵 */
  private zoneMonsters: Map<string, Map<string, MonsterAI>> = new Map();

  /** 스폰 포인트별 현재 활성 수 */
  private spawnPointCounts: Map<string, number> = new Map();

  /** 리스폰 대기열 */
  private respawnQueue: RespawnEntry[] = [];

  /** 몬스터 마스터 데이터 캐시 */
  private monsterDataCache: Map<string, MonsterData> = new Map();

  /** 스폰 포인트 캐시 */
  private spawnPointCache: Map<string, SpawnPoint> = new Map();

  /** 존별 접속자 수 (외부에서 갱신) */
  private zonePlayerCounts: Map<string, number> = new Map();

  /** 필드 보스 스케줄 */
  private fieldBossSchedules: FieldBossSchedule[] = [];

  /** 동적 난이도 배율 캐시 */
  private difficultyMultipliers: Map<string, number> = new Map();

  /** 초기화 여부 */
  private initialized: boolean = false;

  // ─── 초기화 ──────────────────────────────────────────────────

  /**
   * DB에서 몬스터/스폰 데이터를 로드하고 초기 스폰 수행
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // 몬스터 마스터 데이터 로드
    const monsters = await prisma.monster.findMany();
    for (const m of monsters) {
      this.monsterDataCache.set(m.id, m as unknown as MonsterData);
    }

    // 활성 스폰 포인트 로드
    const spawnPoints = await prisma.monsterSpawn.findMany({
      where: { isActive: true },
    });

    for (const sp of spawnPoints) {
      const point: SpawnPoint = {
        id: sp.id,
        monsterId: sp.monsterId,
        zoneId: sp.zoneId,
        posX: sp.posX,
        posY: sp.posY,
        maxCount: sp.maxCount,
        isActive: sp.isActive,
      };
      this.spawnPointCache.set(sp.id, point);

      // 초기 스폰
      this._spawnAtPoint(point);
    }

    // 필드 보스 스케줄 설정
    for (const m of monsters) {
      if (m.type === 'field_boss') {
        const relatedSpawn = spawnPoints.find(sp => sp.monsterId === m.id);
        if (relatedSpawn) {
          this.fieldBossSchedules.push({
            monsterId: m.id,
            zoneId: relatedSpawn.zoneId,
            intervalMinutes: Math.max(30, m.respawnTime / 60), // 최소 30분
            lastSpawnedAt: Date.now(),
          });
        }
      }
    }

    this.initialized = true;
  }

  // ─── 틱 처리 (로직 틱에서 호출) ───────────────────────────────

  /**
   * 스폰 매니저 틱 — 리스폰 처리 + 필드 보스 스케줄 + AI 업데이트
   */
  tick(deltaMs: number, getPlayersInZone: (zoneId: string) => PlayerTarget[]): MonsterAIEvent[] {
    const allEvents: MonsterAIEvent[] = [];
    const now = Date.now();

    // 1) 리스폰 큐 처리
    this._processRespawnQueue(now);

    // 2) 필드 보스 스케줄 체크
    this._checkFieldBossSchedules(now);

    // 3) 동적 난이도 갱신 (10초 간격)
    this._updateDifficultyMultipliers();

    // 4) 각 존의 몬스터 AI 틱
    for (const [zoneId, monsters] of this.zoneMonsters.entries()) {
      const players = getPlayersInZone(zoneId);

      for (const [instanceId, ai] of monsters.entries()) {
        if (ai.state === 'dead') {
          // 죽은 몬스터 제거 + 리스폰 큐 추가
          monsters.delete(instanceId);
          this._scheduleRespawn(instanceId, ai);
          continue;
        }

        const events = ai.tick(deltaMs, players);
        allEvents.push(...events);
      }
    }

    return allEvents;
  }

  // ─── 스폰 로직 ───────────────────────────────────────────────

  private _spawnAtPoint(point: SpawnPoint): void {
    const monsterData = this.monsterDataCache.get(point.monsterId);
    if (!monsterData) return;

    const zoneMap = this._getOrCreateZoneMap(point.zoneId);
    const currentCount = this.spawnPointCounts.get(point.id) ?? 0;

    // 동적 난이도에 따른 스폰 수 조정
    const multiplier = this.difficultyMultipliers.get(point.zoneId) ?? 1.0;
    const adjustedMax = Math.max(1, Math.round(point.maxCount * multiplier));

    const toSpawn = Math.max(0, adjustedMax - currentCount);

    for (let i = 0; i < toSpawn; i++) {
      // 스폰 위치에 약간의 오프셋 추가
      const offsetX = (Math.random() - 0.5) * 4;
      const offsetY = (Math.random() - 0.5) * 4;

      const instanceId = `${point.id}_${Date.now()}_${i}`;
      const ai = new MonsterAI({
        monsterId: monsterData.id,
        code: monsterData.code,
        name: monsterData.name,
        type: monsterData.type,
        element: monsterData.element as ElementType,
        level: monsterData.level,
        hp: monsterData.hp,
        attack: monsterData.attack,
        defense: monsterData.defense,
        speed: monsterData.speed,
        skills: monsterData.skills as MonsterSkill[],
        behavior: monsterData.behavior as BehaviorConfig,
        dropTable: monsterData.dropTable as DropEntry[],
        expReward: monsterData.expReward,
        goldReward: monsterData.goldReward,
        posX: point.posX + offsetX,
        posY: point.posY + offsetY,
      });

      zoneMap.set(instanceId, ai);
    }

    this.spawnPointCounts.set(point.id, currentCount + toSpawn);
  }

  private _scheduleRespawn(instanceId: string, ai: MonsterAI): void {
    // instanceId에서 spawnPointId 추출
    const parts = instanceId.split('_');
    const spawnPointId = parts[0];
    const monsterData = this.monsterDataCache.get(ai.monsterId);
    if (!monsterData) return;

    // 스폰 포인트 카운트 감소
    const current = this.spawnPointCounts.get(spawnPointId) ?? 1;
    this.spawnPointCounts.set(spawnPointId, Math.max(0, current - 1));

    // 필드보스/레이드보스는 별도 스케줄로 관리
    if (monsterData.type === 'field_boss' || monsterData.type === 'raid_boss') return;

    this.respawnQueue.push({
      spawnPointId,
      monsterId: ai.monsterId,
      respawnAt: Date.now() + monsterData.respawnTime * 1000,
    });
  }

  private _processRespawnQueue(now: number): void {
    const ready = this.respawnQueue.filter(r => now >= r.respawnAt);
    this.respawnQueue = this.respawnQueue.filter(r => now < r.respawnAt);

    for (const entry of ready) {
      const point = this.spawnPointCache.get(entry.spawnPointId);
      if (point && point.isActive) {
        this._spawnAtPoint(point);
      }
    }
  }

  // ─── 필드 보스 스케줄 ─────────────────────────────────────────

  private _checkFieldBossSchedules(now: number): void {
    for (const schedule of this.fieldBossSchedules) {
      const elapsed = (now - schedule.lastSpawnedAt) / 60000; // 분
      if (elapsed >= schedule.intervalMinutes) {
        // 해당 존에 이미 필드 보스가 있는지 확인
        const zoneMap = this.zoneMonsters.get(schedule.zoneId);
        if (zoneMap) {
          const hasActiveBoss = Array.from(zoneMap.values()).some(
            ai => ai.monsterId === schedule.monsterId && ai.state !== 'dead'
          );
          if (hasActiveBoss) continue;
        }

        // 필드 보스 스폰
        const monsterData = this.monsterDataCache.get(schedule.monsterId);
        if (monsterData) {
          const map = this._getOrCreateZoneMap(schedule.zoneId);
          const instanceId = `fb_${schedule.monsterId}_${now}`;
          const ai = new MonsterAI({
            monsterId: monsterData.id,
            code: monsterData.code,
            name: monsterData.name,
            type: monsterData.type,
            element: monsterData.element as ElementType,
            level: monsterData.level,
            hp: monsterData.hp,
            attack: monsterData.attack,
            defense: monsterData.defense,
            speed: monsterData.speed,
            skills: monsterData.skills as MonsterSkill[],
            behavior: monsterData.behavior as BehaviorConfig,
            dropTable: monsterData.dropTable as DropEntry[],
            expReward: monsterData.expReward,
            goldReward: monsterData.goldReward,
            posX: 50 + Math.random() * 20,
            posY: 50 + Math.random() * 20,
          });
          map.set(instanceId, ai);
        }

        schedule.lastSpawnedAt = now;
      }
    }
  }

  // ─── 동적 난이도 조절 ─────────────────────────────────────────

  /**
   * 접속자 수에 따른 스폰 배율 조정
   *   0~5명: 1.0x, 6~15명: 1.3x, 16~30명: 1.6x, 31+명: 2.0x
   */
  private _updateDifficultyMultipliers(): void {
    for (const [zoneId, playerCount] of this.zonePlayerCounts.entries()) {
      let mult = 1.0;
      if (playerCount > 30) mult = 2.0;
      else if (playerCount > 15) mult = 1.6;
      else if (playerCount > 5) mult = 1.3;
      this.difficultyMultipliers.set(zoneId, mult);
    }
  }

  // ─── 외부 인터페이스 ─────────────────────────────────────────

  /** 존별 접속자 수 갱신 */
  updateZonePlayerCount(zoneId: string, count: number): void {
    this.zonePlayerCounts.set(zoneId, count);
  }

  /** 특정 존의 몬스터 스냅샷 목록 반환 */
  getZoneMonsters(zoneId: string): MonsterSnapshot[] {
    const zoneMap = this.zoneMonsters.get(zoneId);
    if (!zoneMap) return [];
    return Array.from(zoneMap.values())
      .filter(ai => ai.state !== 'dead')
      .map(ai => ai.getSnapshot());
  }

  /** 특정 몬스터 인스턴스에 데미지 적용 */
  damageMonster(zoneId: string, instanceId: string, attackerId: string, damage: number, attackerLevel: number) {
    const zoneMap = this.zoneMonsters.get(zoneId);
    if (!zoneMap) return null;
    const ai = zoneMap.get(instanceId);
    if (!ai) return null;
    return ai.takeDamage(attackerId, damage, attackerLevel);
  }

  /** 모든 존의 전체 몬스터 수 */
  getTotalMonsterCount(): number {
    let total = 0;
    for (const zoneMap of this.zoneMonsters.values()) {
      total += zoneMap.size;
    }
    return total;
  }

  /**
   * 특정 존의 활성 몬스터 요약 반환 (P7-08: 월드 브로드캐스트용)
   */
  getActiveSpawns(zoneId: string): Array<{ id: string; code: string; hp: number; x: number; y: number }> {
    const zoneMap = this.zoneMonsters.get(zoneId);
    if (!zoneMap) return [];

    const result: Array<{ id: string; code: string; hp: number; x: number; y: number }> = [];
    for (const [id, monster] of zoneMap) {
      result.push({
        id,
        code: monster.code ?? id,
        hp: monster.hp ?? 0,
        x: monster.x ?? 0,
        y: monster.y ?? 0,
      });
    }
    return result;
  }

  /** 정리 (서버 종료 시) */
  shutdown(): void {
    this.zoneMonsters.clear();
    this.respawnQueue = [];
    this.fieldBossSchedules = [];
    this.initialized = false;
  }

  // ─── 내부 유틸 ────────────────────────────────────────────────

  private _getOrCreateZoneMap(zoneId: string): Map<string, MonsterAI> {
    let map = this.zoneMonsters.get(zoneId);
    if (!map) {
      map = new Map();
      this.zoneMonsters.set(zoneId, map);
    }
    return map;
  }
}

/** 싱글턴 인스턴스 */
export const spawnManager = new SpawnManager();
