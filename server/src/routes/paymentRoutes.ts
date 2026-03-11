/**
 * P6-02 결제/프리미엄 화폐 라우트
 * - GET  /api/payment/products       — 상품 카탈로그
 * - POST /api/payment/purchase       — 결제 생성
 * - POST /api/payment/verify         — 영수증 검증 + 크리스탈 지급
 * - POST /api/payment/refund         — 환불 처리
 * - GET  /api/payment/history/:userId — 결제 이력
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  CRYSTAL_PRODUCTS,
  createPayment,
  verifyAndGrant,
  refundPayment,
  getPaymentHistory,
} from '../payment/paymentManager';

// ─── 타입 ───────────────────────────────────────────────────────

interface PurchaseBody {
  userId: string;
  productId: string;
  platform: string;       // web, ios, android
  receiptData?: string;
}

interface VerifyBody {
  receiptId: string;
}

interface RefundBody {
  receiptId: string;
}

interface UserIdParams {
  userId: string;
}

interface PaginationQuery {
  page?: string;
  limit?: string;
}

// ─── 라우트 ─────────────────────────────────────────────────────

export async function paymentRoutes(fastify: FastifyInstance): Promise<void> {

  // ── GET /api/payment/products — 상품 카탈로그 ─────────────────
  fastify.get('/api/payment/products', async (_request, reply: FastifyReply) => {
    return reply.send({ products: CRYSTAL_PRODUCTS });
  });

  // ── POST /api/payment/purchase — 결제 생성 ───────────────────
  fastify.post('/api/payment/purchase', async (
    request: FastifyRequest<{ Body: PurchaseBody }>,
    reply: FastifyReply,
  ) => {
    const { userId, productId, platform, receiptData } = request.body;

    if (!userId || !productId || !platform) {
      return reply.status(400).send({ error: 'userId, productId, platform은 필수입니다.' });
    }

    try {
      const result = await createPayment(userId, productId, platform, receiptData);
      return reply.status(201).send(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : '결제 생성 실패';
      return reply.status(400).send({ error: message });
    }
  });

  // ── POST /api/payment/verify — 영수증 검증 + 크리스탈 지급 ───
  fastify.post('/api/payment/verify', async (
    request: FastifyRequest<{ Body: VerifyBody }>,
    reply: FastifyReply,
  ) => {
    const { receiptId } = request.body;

    if (!receiptId) {
      return reply.status(400).send({ error: 'receiptId는 필수입니다.' });
    }

    try {
      const result = await verifyAndGrant(receiptId);
      return reply.send(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : '영수증 검증 실패';
      return reply.status(400).send({ error: message });
    }
  });

  // ── POST /api/payment/refund — 환불 처리 ─────────────────────
  fastify.post('/api/payment/refund', async (
    request: FastifyRequest<{ Body: RefundBody }>,
    reply: FastifyReply,
  ) => {
    const { receiptId } = request.body;

    if (!receiptId) {
      return reply.status(400).send({ error: 'receiptId는 필수입니다.' });
    }

    try {
      const result = await refundPayment(receiptId);
      return reply.send(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : '환불 처리 실패';
      return reply.status(400).send({ error: message });
    }
  });

  // ── GET /api/payment/history/:userId — 결제 이력 ─────────────
  fastify.get('/api/payment/history/:userId', async (
    request: FastifyRequest<{ Params: UserIdParams; Querystring: PaginationQuery }>,
    reply: FastifyReply,
  ) => {
    const { userId } = request.params;
    const page = parseInt(request.query.page ?? '1', 10);
    const limit = parseInt(request.query.limit ?? '20', 10);

    try {
      const result = await getPaymentHistory(userId, page, limit);
      return reply.send(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : '이력 조회 실패';
      return reply.status(400).send({ error: message });
    }
  });
}
