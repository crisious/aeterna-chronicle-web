/**
 * housingManager.ts — 하우징 시스템 기초 (P8-09)
 *
 * 역할:
 *   - 개인 집 생성/삭제/조회
 *   - 가구 배치/이동/제거
 *   - 타 플레이어 집 방문
 *   - 하우징 공간 제한 관리
 */

import { prisma } from '../db';

// ─── 타입 정의 ──────────────────────────────────────────────────

export interface HouseTheme {
  code: string;
  name: string;
  description: string;
  maxSlots: number;        // 가구 배치 가능 슬롯 수
  maxVisitors: number;     // 동시 방문자 수
  requiredLevel: number;
  cost: { gold: number; diamond: number };
}

export interface FurniturePlacement {
  furnitureId: string;
  slotIndex: number;       // 0-based 슬롯 인덱스
  rotation: number;        // 0, 90, 180, 270
  x: number;
  y: number;
  z: number;
}

export interface VisitResult {
  success: boolean;
  house?: {
    ownerId: string;
    ownerName: string;
    theme: string;
    furniture: FurniturePlacement[];
    visitorCount: number;
  };
  message: string;
}

// ─── 하우스 테마 정의 ───────────────────────────────────────────

export const HOUSE_THEMES: HouseTheme[] = [
  {
    code: 'HOUSE_BASIC',
    name: '기본 오두막',
    description: '모험가가 처음 얻는 소박한 오두막. 작지만 포근하다.',
    maxSlots: 10,
    maxVisitors: 4,
    requiredLevel: 10,
    cost: { gold: 5000, diamond: 0 },
  },
  {
    code: 'HOUSE_COTTAGE',
    name: '숲속 코티지',
    description: '황혼의 숲에 위치한 아담한 코티지. 넉넉한 공간.',
    maxSlots: 20,
    maxVisitors: 6,
    requiredLevel: 30,
    cost: { gold: 20000, diamond: 0 },
  },
  {
    code: 'HOUSE_MANSION',
    name: '크로노스 저택',
    description: '크로노스 시가지의 고풍스러운 저택. 넓은 내부와 정원.',
    maxSlots: 35,
    maxVisitors: 10,
    requiredLevel: 50,
    cost: { gold: 100000, diamond: 500 },
  },
  {
    code: 'HOUSE_PALACE',
    name: '에테르 궁전',
    description: '에테르 에너지로 건축된 궁전. 최고급 하우징.',
    maxSlots: 50,
    maxVisitors: 20,
    requiredLevel: 70,
    cost: { gold: 500000, diamond: 2000 },
  },
  {
    code: 'HOUSE_MIST',
    name: '안개해 수상 가옥',
    description: '안개해 위에 떠 있는 신비로운 수상 가옥. 시즌 2 한정.',
    maxSlots: 40,
    maxVisitors: 12,
    requiredLevel: 75,
    cost: { gold: 300000, diamond: 1500 },
  },
];

// ═══════════════════════════════════════════════════════════════
//  집 생성
// ═══════════════════════════════════════════════════════════════

export async function createHouse(
  userId: string,
  themeCode: string,
): Promise<{ success: boolean; houseId?: string; message: string }> {
  // 1. 이미 집이 있는지 확인
  const existing = await prisma.playerHouse.findUnique({ where: { userId } });
  if (existing) {
    return { success: false, message: '이미 집을 소유하고 있습니다.' };
  }

  // 2. 테마 유효성
  const theme = HOUSE_THEMES.find((t) => t.code === themeCode);
  if (!theme) {
    return { success: false, message: '존재하지 않는 하우스 테마입니다.' };
  }

  // 3. 레벨 확인
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { success: false, message: '유저를 찾을 수 없습니다.' };
  if ((user.level ?? 1) < theme.requiredLevel) {
    return { success: false, message: `레벨 ${theme.requiredLevel} 이상 필요합니다.` };
  }

  // 4. 재화 확인 + 차감
  if (user.gold < theme.cost.gold || user.diamond < theme.cost.diamond) {
    return { success: false, message: '재화가 부족합니다.' };
  }

  const house = await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: {
        gold: { decrement: theme.cost.gold },
        diamond: { decrement: theme.cost.diamond },
      },
    });

    return tx.playerHouse.create({
      data: {
        userId,
        themeCode,
        maxSlots: theme.maxSlots,
        maxVisitors: theme.maxVisitors,
        furniture: [],
        isPublic: true,
      },
    });
  });

  return { success: true, houseId: house.id, message: `${theme.name} 구매 완료!` };
}

// ═══════════════════════════════════════════════════════════════
//  가구 배치
// ═══════════════════════════════════════════════════════════════

export async function placeFurniture(
  userId: string,
  placement: FurniturePlacement,
): Promise<{ success: boolean; message: string }> {
  const house = await prisma.playerHouse.findUnique({ where: { userId } });
  if (!house) return { success: false, message: '집이 없습니다.' };

  const currentFurniture = (house.furniture as unknown as FurniturePlacement[]) || [];

  // 슬롯 한도 확인
  if (currentFurniture.length >= house.maxSlots) {
    return { success: false, message: `가구 슬롯이 가득 찼습니다. (최대 ${house.maxSlots})` };
  }

  // 같은 슬롯 중복 확인
  if (currentFurniture.some((f) => f.slotIndex === placement.slotIndex)) {
    return { success: false, message: '이미 사용 중인 슬롯입니다.' };
  }

  // 플레이어 가구 인벤토리 확인
  const ownedFurniture = await prisma.houseFurniture.findFirst({
    where: { userId, furnitureId: placement.furnitureId, isPlaced: false },
  });
  if (!ownedFurniture) {
    return { success: false, message: '해당 가구를 보유하고 있지 않거나 이미 배치 중입니다.' };
  }

  await prisma.$transaction([
    prisma.playerHouse.update({
      where: { userId },
      data: {
        furniture: [...currentFurniture, placement] as unknown as any,
      },
    }),
    prisma.houseFurniture.update({
      where: { id: ownedFurniture.id },
      data: { isPlaced: true },
    }),
  ]);

  return { success: true, message: '가구 배치 완료!' };
}

// ═══════════════════════════════════════════════════════════════
//  가구 제거
// ═══════════════════════════════════════════════════════════════

export async function removeFurniture(
  userId: string,
  slotIndex: number,
): Promise<{ success: boolean; message: string }> {
  const house = await prisma.playerHouse.findUnique({ where: { userId } });
  if (!house) return { success: false, message: '집이 없습니다.' };

  const currentFurniture = (house.furniture as unknown as FurniturePlacement[]) || [];
  const target = currentFurniture.find((f) => f.slotIndex === slotIndex);
  if (!target) return { success: false, message: '해당 슬롯에 가구가 없습니다.' };

  const remaining = currentFurniture.filter((f) => f.slotIndex !== slotIndex);

  await prisma.$transaction([
    prisma.playerHouse.update({
      where: { userId },
      data: { furniture: remaining as unknown as any },
    }),
    prisma.houseFurniture.updateMany({
      where: { userId, furnitureId: target.furnitureId, isPlaced: true },
      data: { isPlaced: false },
    }),
  ]);

  return { success: true, message: '가구 제거 완료!' };
}

// ═══════════════════════════════════════════════════════════════
//  집 방문
// ═══════════════════════════════════════════════════════════════

export async function visitHouse(
  visitorId: string,
  targetUserId: string,
): Promise<VisitResult> {
  const house = await prisma.playerHouse.findUnique({ where: { userId: targetUserId } });
  if (!house) return { success: false, message: '대상 플레이어의 집이 없습니다.' };

  if (!house.isPublic && visitorId !== targetUserId) {
    return { success: false, message: '비공개 하우스입니다.' };
  }

  const owner = await prisma.user.findUnique({ where: { id: targetUserId } });

  return {
    success: true,
    house: {
      ownerId: targetUserId,
      ownerName: owner?.nickname ?? '알 수 없음',
      theme: house.themeCode,
      furniture: (house.furniture as unknown as FurniturePlacement[]) || [],
      visitorCount: 0, // 실시간 카운트는 소켓 핸들러에서 관리
    },
    message: '방문 성공!',
  };
}

// ═══════════════════════════════════════════════════════════════
//  집 조회
// ═══════════════════════════════════════════════════════════════

export async function getMyHouse(userId: string) {
  const house = await prisma.playerHouse.findUnique({ where: { userId } });
  if (!house) return null;

  const theme = HOUSE_THEMES.find((t) => t.code === house.themeCode);
  const furnitureList = await prisma.houseFurniture.findMany({ where: { userId } });

  return {
    ...house,
    themeName: theme?.name ?? house.themeCode,
    themeDescription: theme?.description ?? '',
    ownedFurniture: furnitureList,
  };
}

// ═══════════════════════════════════════════════════════════════
//  집 업그레이드 (테마 변경)
// ═══════════════════════════════════════════════════════════════

export async function upgradeHouse(
  userId: string,
  newThemeCode: string,
): Promise<{ success: boolean; message: string }> {
  const house = await prisma.playerHouse.findUnique({ where: { userId } });
  if (!house) return { success: false, message: '집이 없습니다.' };

  const newTheme = HOUSE_THEMES.find((t) => t.code === newThemeCode);
  if (!newTheme) return { success: false, message: '존재하지 않는 테마입니다.' };

  if (newTheme.maxSlots <= house.maxSlots) {
    return { success: false, message: '현재 집보다 상위 등급만 업그레이드 가능합니다.' };
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { success: false, message: '유저를 찾을 수 없습니다.' };
  if ((user.level ?? 1) < newTheme.requiredLevel) {
    return { success: false, message: `레벨 ${newTheme.requiredLevel} 이상 필요합니다.` };
  }
  if (user.gold < newTheme.cost.gold || user.diamond < newTheme.cost.diamond) {
    return { success: false, message: '재화가 부족합니다.' };
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: {
        gold: { decrement: newTheme.cost.gold },
        diamond: { decrement: newTheme.cost.diamond },
      },
    }),
    prisma.playerHouse.update({
      where: { userId },
      data: {
        themeCode: newThemeCode,
        maxSlots: newTheme.maxSlots,
        maxVisitors: newTheme.maxVisitors,
      },
    }),
  ]);

  return { success: true, message: `${newTheme.name}(으)로 업그레이드 완료!` };
}

// ═══════════════════════════════════════════════════════════════
//  공개/비공개 전환
// ═══════════════════════════════════════════════════════════════

export async function toggleHousePublic(
  userId: string,
): Promise<{ success: boolean; isPublic: boolean; message: string }> {
  const house = await prisma.playerHouse.findUnique({ where: { userId } });
  if (!house) return { success: false, isPublic: false, message: '집이 없습니다.' };

  const updated = await prisma.playerHouse.update({
    where: { userId },
    data: { isPublic: !house.isPublic },
  });

  return {
    success: true,
    isPublic: updated.isPublic,
    message: updated.isPublic ? '하우스를 공개로 전환했습니다.' : '하우스를 비공개로 전환했습니다.',
  };
}
