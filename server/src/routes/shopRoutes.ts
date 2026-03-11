import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../db';
import { validateP2w } from '../shop/p2wGuard';

// ─── 타입 정의 ──────────────────────────────────────────────

interface ShopListQuery {
  category?: string;
  currency?: string;
  page?: string;
  limit?: string;
}

interface ItemIdParams {
  id: string;
}

interface PurchaseBody {
  userId: string;
  itemId: string;
}

interface UserIdParams {
  userId: string;
}

// ─── 상점 라우트 ────────────────────────────────────────────

export async function shopRoutes(fastify: FastifyInstance): Promise<void> {

  // ── GET /api/shop/items — 상점 목록 (카테고리·화폐 필터, 페이지네이션) ──
  fastify.get('/api/shop/items', async (
    request: FastifyRequest<{ Querystring: ShopListQuery }>,
    reply: FastifyReply
  ) => {
    const { category, currency, page = '1', limit = '20' } = request.query;
    const take = Math.min(parseInt(limit, 10) || 20, 100);
    const skip = (Math.max(parseInt(page, 10) || 1, 1) - 1) * take;

    const now = new Date();
    const where: Record<string, unknown> = {
      isActive: true,
      OR: [
        { startDate: null },
        { startDate: { lte: now } },
      ],
    };

    // 기간이 끝난 아이템 제외
    if (!category) {
      // 추가 필터 없음
    }
    if (category) where['category'] = category;
    if (currency) where['currency'] = currency;

    const [items, total] = await Promise.all([
      prisma.shopItem.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
      prisma.shopItem.count({ where }),
    ]);

    return reply.send({ items, total, page: parseInt(page, 10), limit: take });
  });

  // ── GET /api/shop/items/:id — 아이템 상세 ──────────────────
  fastify.get('/api/shop/items/:id', async (
    request: FastifyRequest<{ Params: ItemIdParams }>,
    reply: FastifyReply
  ) => {
    const item = await prisma.shopItem.findUnique({
      where: { id: request.params.id },
    });
    if (!item) return reply.status(404).send({ error: '아이템을 찾을 수 없습니다.' });
    return reply.send(item);
  });

  // ── POST /api/shop/purchase — 구매 (잔액 검증 + P2W 가드) ──
  fastify.post('/api/shop/purchase', async (
    request: FastifyRequest<{ Body: PurchaseBody }>,
    reply: FastifyReply
  ) => {
    const { userId, itemId } = request.body;

    if (!userId || !itemId) {
      return reply.status(400).send({ error: 'userId와 itemId는 필수입니다.' });
    }

    // 아이템 조회
    const item = await prisma.shopItem.findUnique({ where: { id: itemId } });
    if (!item) return reply.status(404).send({ error: '아이템을 찾을 수 없습니다.' });
    if (!item.isActive) return reply.status(400).send({ error: '현재 판매 중이 아닌 아이템입니다.' });

    // 기간 검증
    const now = new Date();
    if (item.startDate && item.startDate > now) {
      return reply.status(400).send({ error: '아직 판매 시작 전입니다.' });
    }
    if (item.endDate && item.endDate < now) {
      return reply.status(400).send({ error: '판매 기간이 종료되었습니다.' });
    }

    // P2W 가드 검증 — 스탯 직접 영향 아이템 구매 차단
    const p2wResult = validateP2w({
      category: item.category,
      name: item.name,
      description: item.description,
    });
    if (!p2wResult.allowed) {
      return reply.status(403).send({
        error: 'P2W 정책 위반으로 구매가 거부되었습니다.',
        reason: p2wResult.reason,
      });
    }

    // 유저 존재 확인
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return reply.status(404).send({ error: '유저를 찾을 수 없습니다.' });

    // TODO: 실제 화폐 잔액 검증 (현재 User 모델에 잔액 필드 미존재)
    // 잔액 차감 로직은 화폐 시스템 구현 후 추가 예정

    // 구매 기록 생성
    const purchase = await prisma.purchase.create({
      data: {
        userId,
        itemId,
        price: item.price,
        currency: item.currency,
      },
      include: { item: true },
    });

    return reply.status(201).send(purchase);
  });

  // ── GET /api/shop/purchases/:userId — 유저 구매 내역 ───────
  fastify.get('/api/shop/purchases/:userId', async (
    request: FastifyRequest<{ Params: UserIdParams; Querystring: ShopListQuery }>,
    reply: FastifyReply
  ) => {
    const { userId } = request.params;
    const { page = '1', limit = '20' } = request.query;
    const take = Math.min(parseInt(limit, 10) || 20, 100);
    const skip = (Math.max(parseInt(page, 10) || 1, 1) - 1) * take;

    const [purchases, total] = await Promise.all([
      prisma.purchase.findMany({
        where: { userId },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: { item: true },
      }),
      prisma.purchase.count({ where: { userId } }),
    ]);

    return reply.send({ purchases, total, page: parseInt(page, 10), limit: take });
  });
}
