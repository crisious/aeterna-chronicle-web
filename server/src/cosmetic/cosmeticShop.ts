/**
 * P6-03 코스메틱 상점
 * - 카탈로그 조회 (카테고리/레어리티 필터)
 * - 구매 (크리스탈/골드 차감 + P2W 가드 검증)
 * - 장착/해제 (슬롯별)
 * - 한정 판매 기간 체크
 * - p2wGuard 연동: affectsStats=true인 아이템 등록/구매 차단
 */

import { prisma } from '../db';

// ─── 장착 슬롯 정의 ────────────────────────────────────────────

/** 코스메틱 카테고리 → 장착 슬롯 매핑 */
const CATEGORY_SLOT_MAP: Record<string, string> = {
  skin: 'character_skin',
  weapon_skin: 'weapon_skin',
  pet_skin: 'pet_skin',
  mount: 'mount',
  emote: 'emote',
  title_effect: 'title_effect',
};

// ─── 카탈로그 조회 ──────────────────────────────────────────────

/** 코스메틱 카탈로그 조회 (카테고리/레어리티 필터 + 기간 체크) */
export async function getCosmeticCatalog(filters?: {
  category?: string;
  rarity?: string;
  page?: number;
  limit?: number;
}) {
  const now = new Date();
  const take = Math.min(filters?.limit ?? 20, 100);
  const skip = (Math.max(filters?.page ?? 1, 1) - 1) * take;

  const where: Record<string, unknown> = {
    // 판매 기간 체크: availableFrom이 없거나 현재 시간 이전
    OR: [
      { availableFrom: null },
      { availableFrom: { lte: now } },
    ],
    // 판매 종료 전이거나 종료일 없음
    AND: [
      {
        OR: [
          { availableTo: null },
          { availableTo: { gte: now } },
        ],
      },
    ],
  };

  if (filters?.category) where['category'] = filters.category;
  if (filters?.rarity) where['rarity'] = filters.rarity;

  const [items, total] = await Promise.all([
    prisma.cosmeticItem.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
    prisma.cosmeticItem.count({ where }),
  ]);

  return { items, total, page: filters?.page ?? 1, limit: take };
}

/** 추천/한정 아이템 조회 */
export async function getFeaturedCosmetics() {
  const now = new Date();

  // 한정 아이템 (isLimited + 판매 기간 내)
  const limited = await prisma.cosmeticItem.findMany({
    where: {
      isLimited: true,
      OR: [
        { availableFrom: null },
        { availableFrom: { lte: now } },
      ],
      AND: [
        {
          OR: [
            { availableTo: null },
            { availableTo: { gte: now } },
          ],
        },
      ],
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  // 전설 아이템 추천
  const legendary = await prisma.cosmeticItem.findMany({
    where: { rarity: 'legendary' },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  return { limited, legendary };
}

// ─── 구매 ───────────────────────────────────────────────────────

/** 코스메틱 아이템 구매 */
export async function purchaseCosmetic(
  userId: string,
  cosmeticId: string,
): Promise<{ success: boolean; playerCosmetic: { id: string; cosmeticId: string } }> {
  // 아이템 조회
  const item = await prisma.cosmeticItem.findUnique({ where: { id: cosmeticId } });
  if (!item) throw new Error('코스메틱 아이템을 찾을 수 없습니다.');

  // P2W 가드: affectsStats=true 아이템 구매 차단
  if (item.affectsStats) {
    console.warn(`[P2W-GUARD] 코스메틱 구매 차단 — code="${item.code}" affectsStats=true`);
    throw new Error('P2W 정책 위반: 스탯에 영향을 주는 코스메틱은 구매할 수 없습니다.');
  }

  // 한정 판매 기간 체크
  const now = new Date();
  if (item.availableFrom && item.availableFrom > now) {
    throw new Error('아직 판매 시작 전입니다.');
  }
  if (item.availableTo && item.availableTo < now) {
    throw new Error('판매 기간이 종료되었습니다.');
  }

  // 이미 보유 여부 확인
  const existing = await prisma.playerCosmetic.findUnique({
    where: { userId_cosmeticId: { userId, cosmeticId } },
  });
  if (existing) throw new Error('이미 보유한 코스메틱입니다.');

  // 유저 확인 + 잔액 검증
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('유저를 찾을 수 없습니다.');

  // 가격 타입별 차감
  if (item.priceType === 'crystal') {
    if (user.crystal < item.price) {
      throw new Error(`크리스탈이 부족합니다. (보유: ${user.crystal}, 필요: ${item.price})`);
    }
  } else if (item.priceType === 'gold') {
    if (user.gold < item.price) {
      throw new Error(`골드가 부족합니다. (보유: ${user.gold}, 필요: ${item.price})`);
    }
  } else if (item.priceType === 'season_reward') {
    // 시즌 보상은 시즌 패스 시스템에서 직접 지급 — 상점 구매 불가
    throw new Error('시즌 보상 아이템은 상점에서 구매할 수 없습니다.');
  }

  // 트랜잭션: 화폐 차감 + 코스메틱 지급
  const currencyField = item.priceType === 'crystal' ? 'crystal' : 'gold';

  const [, playerCosmetic] = await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { [currencyField]: { decrement: item.price } },
    }),
    prisma.playerCosmetic.create({
      data: {
        userId,
        cosmeticId,
      },
    }),
  ]);

  return { success: true, playerCosmetic: { id: playerCosmetic.id, cosmeticId: playerCosmetic.cosmeticId } };
}

// ─── 장착/해제 ──────────────────────────────────────────────────

/** 코스메틱 장착 */
export async function equipCosmetic(
  userId: string,
  cosmeticId: string,
): Promise<{ equipped: boolean; slot: string }> {
  // 보유 확인
  const playerCosmetic = await prisma.playerCosmetic.findUnique({
    where: { userId_cosmeticId: { userId, cosmeticId } },
  });
  if (!playerCosmetic) throw new Error('보유하지 않은 코스메틱입니다.');

  // 카테고리 조회 → 슬롯 결정
  const item = await prisma.cosmeticItem.findUnique({ where: { id: cosmeticId } });
  if (!item) throw new Error('코스메틱 아이템 정보를 찾을 수 없습니다.');

  const slot = CATEGORY_SLOT_MAP[item.category] ?? item.category;

  // 같은 슬롯의 기존 장착 해제
  await prisma.playerCosmetic.updateMany({
    where: {
      userId,
      equippedSlot: slot,
      isEquipped: true,
    },
    data: { isEquipped: false, equippedSlot: null },
  });

  // 새 아이템 장착
  await prisma.playerCosmetic.update({
    where: { userId_cosmeticId: { userId, cosmeticId } },
    data: { isEquipped: true, equippedSlot: slot },
  });

  return { equipped: true, slot };
}

/** 코스메틱 해제 */
export async function unequipCosmetic(
  userId: string,
  cosmeticId: string,
): Promise<{ unequipped: boolean }> {
  const playerCosmetic = await prisma.playerCosmetic.findUnique({
    where: { userId_cosmeticId: { userId, cosmeticId } },
  });
  if (!playerCosmetic) throw new Error('보유하지 않은 코스메틱입니다.');
  if (!playerCosmetic.isEquipped) throw new Error('장착되어 있지 않은 코스메틱입니다.');

  await prisma.playerCosmetic.update({
    where: { userId_cosmeticId: { userId, cosmeticId } },
    data: { isEquipped: false, equippedSlot: null },
  });

  return { unequipped: true };
}

// ─── 보유 조회 ──────────────────────────────────────────────────

/** 유저 보유 코스메틱 조회 */
export async function getPlayerCosmetics(userId: string) {
  const cosmetics = await prisma.playerCosmetic.findMany({
    where: { userId },
    orderBy: { acquiredAt: 'desc' },
  });

  // 코스메틱 상세 정보 조인
  const cosmeticIds = cosmetics.map((c) => c.cosmeticId);
  const items = await prisma.cosmeticItem.findMany({
    where: { id: { in: cosmeticIds } },
  });

  const itemMap = new Map(items.map((i) => [i.id, i]));

  return cosmetics.map((c) => ({
    ...c,
    item: itemMap.get(c.cosmeticId) ?? null,
  }));
}
