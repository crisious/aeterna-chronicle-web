/**
 * guildHousing.ts — 길드 하우스 시스템 (P8-16)
 *
 * 길드 하우스 = 길드 공유 공간
 *   - 길드 레벨에 따라 해금 (Lv.3+)
 *   - 레벨업 시 가구 슬롯 확장
 *   - housingManager (P8-09) 의 가구 시스템 연동
 *   - 길드 버프 효과: 배치된 가구 조합에 따라 길드원 전체 버프
 *
 * Prisma 모델: GuildHouse (guildId, level, furnitureSlots)
 */
import { prisma } from '../db';

// ─── 상수 ─────────────────────────────────────────────────────

/** 길드 하우스 해금 최소 길드 레벨 */
export const GUILD_HOUSE_MIN_LEVEL = 3;

/** 길드 하우스 최대 레벨 */
export const GUILD_HOUSE_MAX_LEVEL = 5;

/** 레벨별 가구 슬롯 수 */
export const FURNITURE_SLOTS_BY_LEVEL: Record<number, number> = {
  1: 10,
  2: 20,
  3: 35,
  4: 50,
  5: 80,
};

/** 가구 마스터 데이터 (P10-19: TODO 해소) */
const FURNITURE_MASTER: Record<string, { name: string }> = {
  guild_banner: { name: '길드 깃발' },
  trophy_case: { name: '트로피 진열장' },
  war_table: { name: '전쟁 탁자' },
  buff_altar: { name: '버프 제단' },
  storage_chest: { name: '공용 창고' },
  training_dummy: { name: '훈련 허수아비' },
  guild_forge: { name: '길드 대장간' },
  healing_fountain: { name: '치유의 샘' },
  alchemy_table: { name: '연금술 탁자' },
  garden_plot: { name: '정원 화단' },
};

/** 길드 하우스 레벨업 비용 (길드 골드) */
export const HOUSE_UPGRADE_COST: Record<number, number> = {
  2: 10000,
  3: 25000,
  4: 50000,
  5: 100000,
};

/** 가구 조합 버프 */
export interface GuildHouseBuff {
  id: string;
  name: string;
  description: string;
  requiredFurniture: string[];
  effect: {
    stat: string;
    value: number;
    type: 'percent' | 'flat';
  };
}

export const GUILD_HOUSE_BUFFS: readonly GuildHouseBuff[] = [
  {
    id: 'training_room',
    name: '훈련실 세트',
    description: '길드원 전체 전투 경험치 +5%',
    requiredFurniture: ['training_dummy', 'weapon_rack', 'sparring_mat'],
    effect: { stat: 'combat_exp', value: 5, type: 'percent' },
  },
  {
    id: 'crafting_workshop',
    name: '제작 공방 세트',
    description: '제작 성공률 +3%',
    requiredFurniture: ['anvil', 'workbench', 'furnace'],
    effect: { stat: 'craft_success', value: 3, type: 'percent' },
  },
  {
    id: 'library',
    name: '서재 세트',
    description: '스킬 쿨타임 -2%',
    requiredFurniture: ['bookshelf', 'study_desk', 'magic_globe'],
    effect: { stat: 'skill_cooldown', value: -2, type: 'percent' },
  },
  {
    id: 'banquet_hall',
    name: '연회장 세트',
    description: 'HP 회복량 +5%',
    requiredFurniture: ['grand_table', 'chandelier', 'feast_supplies'],
    effect: { stat: 'hp_recovery', value: 5, type: 'percent' },
  },
  {
    id: 'trophy_room',
    name: '전리품실 세트',
    description: '골드 획득량 +3%',
    requiredFurniture: ['trophy_stand', 'display_case', 'guild_banner'],
    effect: { stat: 'gold_bonus', value: 3, type: 'percent' },
  },
];

// ─── 타입 ─────────────────────────────────────────────────────

export interface GuildHouseData {
  guildId: string;
  level: number;
  maxSlots: number;
  usedSlots: number;
  placedFurniture: PlacedFurniture[];
  activeBuffs: GuildHouseBuff[];
}

export interface PlacedFurniture {
  slotIndex: number;
  furnitureId: string;
  furnitureName: string;
  placedAt: Date;
}

// ─── 핵심 로직 ──────────────────────────────────────────────

/**
 * 길드 하우스 초기화 (길드 레벨 3 도달 시 자동 호출)
 */
export async function initGuildHouse(guildId: string): Promise<GuildHouseData> {
  const existing = await prisma.guildHouse.findUnique({ where: { guildId } });
  if (existing) {
    return toGuildHouseData(existing);
  }

  const guild = await prisma.guild.findUnique({ where: { id: guildId } });
  if (!guild || guild.level < GUILD_HOUSE_MIN_LEVEL) {
    throw new Error('guild_level_insufficient');
  }

  const house = await prisma.guildHouse.create({
    data: {
      guildId,
      level: 1,
      furnitureSlots: FURNITURE_SLOTS_BY_LEVEL[1],
    },
  });

  return toGuildHouseData(house);
}

/**
 * 길드 하우스 레벨업
 */
export async function upgradeGuildHouse(
  guildId: string,
  requesterId: string,
): Promise<{ success: boolean; newLevel?: number; error?: string }> {
  const house = await prisma.guildHouse.findUnique({ where: { guildId } });
  if (!house) return { success: false, error: 'house_not_found' };

  if (house.level >= GUILD_HOUSE_MAX_LEVEL) {
    return { success: false, error: 'max_level' };
  }

  // 권한 확인
  const member = await prisma.guildMember.findUnique({
    where: { guildId_userId: { guildId, userId: requesterId } },
  });
  if (!member || member.role !== 'leader') {
    return { success: false, error: 'leader_only' };
  }

  const nextLevel = house.level + 1;
  const cost = HOUSE_UPGRADE_COST[nextLevel];

  // 길드 골드 차감
  const guild = await prisma.guild.findUnique({ where: { id: guildId } });
  if (!guild || guild.gold < cost) {
    return { success: false, error: 'insufficient_gold' };
  }

  await prisma.$transaction([
    prisma.guild.update({
      where: { id: guildId },
      data: { gold: { decrement: cost } },
    }),
    prisma.guildHouse.update({
      where: { guildId },
      data: {
        level: nextLevel,
        furnitureSlots: FURNITURE_SLOTS_BY_LEVEL[nextLevel],
      },
    }),
  ]);

  return { success: true, newLevel: nextLevel };
}

/**
 * 가구 배치
 */
export async function placeFurniture(
  guildId: string,
  userId: string,
  furnitureId: string,
  slotIndex: number,
): Promise<{ success: boolean; error?: string }> {
  const house = await prisma.guildHouse.findUnique({ where: { guildId } });
  if (!house) return { success: false, error: 'house_not_found' };

  if (slotIndex < 0 || slotIndex >= house.furnitureSlots) {
    return { success: false, error: 'invalid_slot' };
  }

  // 길드원 확인
  const member = await prisma.guildMember.findUnique({
    where: { guildId_userId: { guildId, userId } },
  });
  if (!member) return { success: false, error: 'not_member' };

  // 가구 소유 확인 (길드 창고 또는 개인 인벤토리)
  const hasItem = await prisma.inventoryItem.findFirst({
    where: { userId, itemCode: furnitureId, amount: { gte: 1 } },
  });
  if (!hasItem) return { success: false, error: 'furniture_not_owned' };

  // 슬롯 중복 확인
  const slotOccupied = await prisma.guildHouseFurniture.findUnique({
    where: { guildId_slotIndex: { guildId, slotIndex } },
  });
  if (slotOccupied) return { success: false, error: 'slot_occupied' };

  await prisma.$transaction([
    prisma.inventoryItem.update({
      where: { id: hasItem.id },
      data: { amount: { decrement: 1 } },
    }),
    prisma.guildHouseFurniture.create({
      data: {
        guildId,
        slotIndex,
        furnitureId,
        placedBy: userId,
      },
    }),
  ]);

  return { success: true };
}

/**
 * 활성 버프 계산 (배치된 가구 기반)
 */
export async function calculateActiveBuffs(guildId: string): Promise<GuildHouseBuff[]> {
  const furniture = await prisma.guildHouseFurniture.findMany({
    where: { guildId },
  });
  const placedIds = new Set(furniture.map(f => f.furnitureId));

  return GUILD_HOUSE_BUFFS.filter(buff =>
    buff.requiredFurniture.every(req => placedIds.has(req)),
  );
}

/**
 * 길드 하우스 정보 조회
 */
export async function getGuildHouse(guildId: string): Promise<GuildHouseData | null> {
  const house = await prisma.guildHouse.findUnique({ where: { guildId } });
  if (!house) return null;
  return toGuildHouseData(house);
}

// ─── 내부 유틸 ──────────────────────────────────────────────

async function toGuildHouseData(house: any): Promise<GuildHouseData> {
  const furniture = await prisma.guildHouseFurniture.findMany({
    where: { guildId: house.guildId },
  });
  const activeBuffs = await calculateActiveBuffs(house.guildId);

  return {
    guildId: house.guildId,
    level: house.level,
    maxSlots: house.furnitureSlots,
    usedSlots: furniture.length,
    placedFurniture: furniture.map(f => ({
      slotIndex: f.slotIndex,
      furnitureId: f.furnitureId,
      furnitureName: FURNITURE_MASTER[f.furnitureId]?.name ?? f.furnitureId,
      placedAt: f.createdAt,
    })),
    activeBuffs,
  };
}
