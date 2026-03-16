/**
 * worldManager.ts — 월드맵/필드 매니저 (P5-04)
 *
 * - 존 이동 (레벨 제한 + 인접 존 검증)
 * - 필드 몬스터 존재 확인 (MonsterSpawn 연동)
 * - NPC 조회
 * - 텔레포트 (마을 허브 전용)
 * - 플레이어 위치 CRUD
 */
import { prisma } from '../db';

// ─── 타입 정의 ──────────────────────────────────────────────────

/** 존 레벨 범위 */
export interface LevelRange {
  min: number;
  max: number;
}

/** NPC 배치 정보 */
export interface ZoneNpc {
  npcId: string;
  name: string;
  posX: number;
  posY: number;
  role: string; // shop, quest, dialogue, craft
}

/** 이동 결과 */
export interface MoveResult {
  ok: true;
  zone: {
    code: string;
    name: string;
    region: string;
    levelRange: LevelRange;
    isHub: boolean;
  };
  position: { x: number; y: number };
}

/** 텔레포트 결과 */
export interface TeleportResult {
  ok: true;
  zone: {
    code: string;
    name: string;
    region: string;
  };
}

// ─── 월드 매니저 ────────────────────────────────────────────────

class WorldManager {
  // ── 존 이동 ──

  /**
   * 존 이동 — 레벨 제한 + 인접 존 검증
   * @param userId 유저 ID
   * @param targetZoneCode 이동 대상 존 코드
   * @returns 이동 결과
   */
  async moveToZone(
    userId: string,
    targetZoneCode: string,
  ): Promise<MoveResult | { ok: false; error: string }> {
    // 대상 존 조회
    const targetZone = await prisma.zone.findUnique({ where: { code: targetZoneCode } });
    if (!targetZone) return { ok: false, error: '존재하지 않는 존입니다.' };

    // 현재 위치 조회
    const currentLocation = await prisma.playerLocation.findUnique({ where: { userId } });

    // 인접 존 검증 (최초 접속 시 스킵)
    if (currentLocation) {
      const currentZone = await prisma.zone.findFirst({ where: { id: currentLocation.zoneId } });
      if (currentZone) {
        const connections = currentZone.connections as unknown as string[];
        if (!connections.includes(targetZoneCode)) {
          return { ok: false, error: `현재 존(${currentZone.name})에서 이동할 수 없는 존입니다.` };
        }
      }
    }

    // 레벨 검증
    const character = await prisma.character.findFirst({
      where: { userId },
      select: { level: true },
    });
    const levelRange = targetZone.levelRange as unknown as LevelRange;
    if (character && character.level < levelRange.min) {
      return { ok: false, error: `레벨 ${levelRange.min} 이상만 입장 가능합니다. (현재 Lv.${character.level})` };
    }

    // 기본 진입 위치 (맵 데이터 있으면 스폰 포인트, 없으면 0,0)
    const spawnPos = { x: 0, y: 0 };

    // 위치 업데이트 (upsert)
    await prisma.playerLocation.upsert({
      where: { userId },
      update: { zoneId: targetZone.id, posX: spawnPos.x, posY: spawnPos.y },
      create: { userId, zoneId: targetZone.id, posX: spawnPos.x, posY: spawnPos.y },
    });

    return {
      ok: true,
      zone: {
        code: targetZone.code,
        name: targetZone.name,
        region: targetZone.region,
        levelRange,
        isHub: targetZone.isHub,
      },
      position: spawnPos,
    };
  }

  // ── 텔레포트 (마을 허브 전용) ──

  /**
   * 방문한 적 있는 마을(허브) 존으로 즉시 이동
   */
  async teleportToHub(
    userId: string,
    targetZoneCode: string,
  ): Promise<TeleportResult | { ok: false; error: string }> {
    const targetZone = await prisma.zone.findUnique({ where: { code: targetZoneCode } });
    if (!targetZone) return { ok: false, error: '존재하지 않는 존입니다.' };
    if (!targetZone.isHub) return { ok: false, error: '텔레포트는 마을(허브)으로만 가능합니다.' };

    // 레벨 검증
    const character = await prisma.character.findFirst({
      where: { userId },
      select: { level: true },
    });
    const levelRange = targetZone.levelRange as unknown as LevelRange;
    if (character && character.level < levelRange.min) {
      return { ok: false, error: `레벨 ${levelRange.min} 이상만 텔레포트 가능합니다.` };
    }

    await prisma.playerLocation.upsert({
      where: { userId },
      update: { zoneId: targetZone.id, posX: 0, posY: 0 },
      create: { userId, zoneId: targetZone.id, posX: 0, posY: 0 },
    });

    return {
      ok: true,
      zone: {
        code: targetZone.code,
        name: targetZone.name,
        region: targetZone.region,
      },
    };
  }

  // ── 필드 몬스터 조회 ──

  /**
   * 특정 존의 활성 몬스터 스폰 목록 조회
   */
  async getFieldMonsters(zoneCode: string): Promise<{ monsterId: string; posX: number; posY: number; maxCount: number }[]> {
    const zone = await prisma.zone.findUnique({ where: { code: zoneCode } });
    if (!zone) return [];

    const spawns = await prisma.monsterSpawn.findMany({
      where: { zoneId: zone.id, isActive: true },
    });

    return spawns.map((s) => ({
      monsterId: s.monsterId,
      posX: s.posX,
      posY: s.posY,
      maxCount: s.maxCount,
    }));
  }

  // ── NPC 조회 ──

  /**
   * 특정 존에 배치된 NPC 목록
   */
  async getZoneNpcs(zoneCode: string): Promise<ZoneNpc[]> {
    const zone = await prisma.zone.findUnique({ where: { code: zoneCode } });
    if (!zone) return [];
    return (zone.npcs ?? []) as unknown as ZoneNpc[];
  }

  // ── 현재 위치 조회 ──

  /**
   * 유저의 현재 위치 반환
   */
  async getPlayerLocation(userId: string): Promise<{
    zoneId: string;
    zoneCode: string;
    zoneName: string;
    posX: number;
    posY: number;
  } | null> {
    const loc = await prisma.playerLocation.findUnique({ where: { userId } });
    if (!loc) return null;

    const zone = await prisma.zone.findFirst({ where: { id: loc.zoneId } });
    if (!zone) return null;

    return {
      zoneId: zone.id,
      zoneCode: zone.code,
      zoneName: zone.name,
      posX: loc.posX,
      posY: loc.posY,
    };
  }
}

export const worldManager = new WorldManager();
