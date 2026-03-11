/**
 * saveManager.ts — 세이브/체크포인트 시스템 (P6-11)
 *
 * 역할:
 *   - 자동 세이브: 존 이동/퀘스트 완료/챕터 진행 시 slot=0 저장
 *   - 수동 세이브: 슬롯 1~3, 마을/안전지대에서만 가능
 *   - 세이브 데이터: 캐릭터 스탯/인벤토리/퀘스트/챕터/위치/플래그 스냅샷
 *   - 로드: 슬롯 선택 → 상태 복원
 *   - 삭제: 수동 슬롯만 삭제 가능
 */

import { prisma } from '../db';
import { Prisma } from '@prisma/client';

// ── 타입 정의 ──────────────────────────────────────────────────

/** 세이브 데이터 스냅샷 구조 */
export interface SaveData {
  character: {
    level: number;
    exp: number;
    hp: number;
    mp: number;
    classId: string;
    stats?: Record<string, number>;
  };
  inventory: unknown[];
  equipment: Record<string, unknown>;
  questProgress: unknown[];
  chapterProgress: unknown[];
  storyFlags: Record<string, unknown>;
  location: {
    zoneId: string;
    x: number;
    y: number;
  };
  currencies: Record<string, number>;
  playtime: number;  // 총 플레이 시간 (초)
}

/** 세이브 슬롯 정보 (목록 조회용) */
export interface SaveSlotInfo {
  slot: number;
  label: string | null;
  chapter: number;
  level: number;
  location: string | null;
  playtime: number;
  updatedAt: Date;
  isEmpty: boolean;
}

/** 안전 지대 목록 (마을/거점) */
const SAFE_ZONES = [
  'argentium_town',
  'silvanheim_village',
  'solaris_city',
  'britallia_outpost',
  'frostlands_camp',
  'erebos_sanctuary',
  'tutorial_area',
];

// ── 세이브 관리 ─────────────────────────────────────────────────

/** 전체 슬롯 조회 */
export async function getAllSaves(userId: string): Promise<SaveSlotInfo[]> {
  const saves = await prisma.saveSlot.findMany({
    where: { userId },
    orderBy: { slot: 'asc' },
  });

  // 슬롯 0~3 모두 반환 (없는 슬롯은 빈 슬롯으로 표시)
  const result: SaveSlotInfo[] = [];
  for (let slot = 0; slot <= 3; slot++) {
    const existing = saves.find(s => s.slot === slot);
    if (existing) {
      result.push({
        slot: existing.slot,
        label: existing.label,
        chapter: existing.chapter,
        level: existing.level,
        location: existing.location,
        playtime: existing.playtime,
        updatedAt: existing.updatedAt,
        isEmpty: false,
      });
    } else {
      result.push({
        slot,
        label: null,
        chapter: 1,
        level: 1,
        location: null,
        playtime: 0,
        updatedAt: new Date(0),
        isEmpty: true,
      });
    }
  }
  return result;
}

/** 자동 세이브 (slot=0) */
export async function autoSave(userId: string, data: SaveData): Promise<void> {
  await writeSave(userId, 0, data, '자동 저장');
}

/** 수동 세이브 (slot=1~3) */
export async function manualSave(
  userId: string,
  slot: number,
  data: SaveData,
  label?: string,
): Promise<{ success: boolean; reason?: string }> {
  // 슬롯 범위 검증
  if (slot < 1 || slot > 3) {
    return { success: false, reason: '수동 세이브 슬롯은 1~3만 사용 가능' };
  }

  // 안전 지대 검증
  if (!SAFE_ZONES.includes(data.location.zoneId)) {
    return { success: false, reason: '마을/안전지대에서만 저장 가능합니다.' };
  }

  await writeSave(userId, slot, data, label ?? `슬롯 ${slot}`);
  return { success: true };
}

/** 세이브 기록 (공통) */
async function writeSave(
  userId: string,
  slot: number,
  data: SaveData,
  label: string,
): Promise<void> {
  await prisma.saveSlot.upsert({
    where: { userId_slot: { userId, slot } },
    create: {
      userId,
      slot,
      label,
      data: data as unknown as Prisma.InputJsonValue,
      playtime: data.playtime,
      chapter: data.character.level > 0
        ? (data.chapterProgress as Array<{ chapter: number; status: string }>)
            .filter(c => c.status === 'in_progress' || c.status === 'completed')
            .reduce((max, c) => Math.max(max, c.chapter), 1)
        : 1,
      level: data.character.level,
      location: data.location.zoneId,
    },
    update: {
      label,
      data: data as unknown as Prisma.InputJsonValue,
      playtime: data.playtime,
      chapter: (data.chapterProgress as Array<{ chapter: number; status: string }>)
        .filter(c => c.status === 'in_progress' || c.status === 'completed')
        .reduce((max, c) => Math.max(max, c.chapter), 1),
      level: data.character.level,
      location: data.location.zoneId,
    },
  });
}

/** 세이브 로드 */
export async function loadSave(
  userId: string,
  slot: number,
): Promise<SaveData | null> {
  const save = await prisma.saveSlot.findUnique({
    where: { userId_slot: { userId, slot } },
  });

  if (!save) return null;
  return save.data as unknown as SaveData;
}

/** 수동 슬롯 삭제 (자동 세이브 slot=0은 삭제 불가) */
export async function deleteSave(
  userId: string,
  slot: number,
): Promise<{ success: boolean; reason?: string }> {
  if (slot === 0) {
    return { success: false, reason: '자동 세이브 슬롯은 삭제할 수 없습니다.' };
  }
  if (slot < 1 || slot > 3) {
    return { success: false, reason: '유효하지 않은 슬롯 번호' };
  }

  const existing = await prisma.saveSlot.findUnique({
    where: { userId_slot: { userId, slot } },
  });
  if (!existing) {
    return { success: false, reason: '해당 슬롯에 저장 데이터 없음' };
  }

  await prisma.saveSlot.delete({
    where: { userId_slot: { userId, slot } },
  });
  return { success: true };
}

/** 자동 세이브 트리거: 존 이동 시 호출 */
export async function onZoneChange(userId: string, data: SaveData): Promise<void> {
  await autoSave(userId, data);
}

/** 자동 세이브 트리거: 퀘스트 완료 시 호출 */
export async function onQuestComplete(userId: string, data: SaveData): Promise<void> {
  await autoSave(userId, data);
}

/** 자동 세이브 트리거: 챕터 진행 시 호출 */
export async function onChapterProgress(userId: string, data: SaveData): Promise<void> {
  await autoSave(userId, data);
}
