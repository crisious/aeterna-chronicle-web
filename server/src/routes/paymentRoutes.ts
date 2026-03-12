/**
 * P6-02 + P9-10/11 결제/프리미엄 화폐 + Stripe 라우트
 *
 * - GET  /api/payment/products           — 상품 카탈로그
 * - POST /api/payment/purchase           — 결제 생성 (기존)
 * - POST /api/payment/verify             — 영수증 검증 + 크리스탈 지급 (기존)
 * - POST /api/payment/refund             — 환불 처리 (기존)
 * - GET  /api/payment/history/:userId    — 결제 이력
 * - POST /api/stripe/checkout            — Stripe Checkout Session 생성 (P9-10)
 * - POST /api/stripe/webhook             — Stripe Webhook 수신 (P9-10)
 * - POST /api/stripe/subscribe           — 시즌패스 구독 (P9-11)
 * - POST /api/stripe/refund              — Stripe 환불 (P9-11)
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  CRYSTAL_PRODUCTS,
  createPayment,
  verifyAndGrant,
  refundPayment,
  getPaymentHistory,
} from '../payment/paymentManager';
import {
  createCheckoutSession,
  constructWebhookEvent,
  handleCheckoutCompleted,
  handlePaymentFailed,
} from '../payment/stripeManager';
import {
  createSeasonPassSubscription,
  processStripeRefund,
  handleSubscriptionActivated,
  handleSubscriptionCanceled,
  handleDisputeCreated,
  handleDisputeClosed,
} from '../payment/stripeSubscription';

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

interface StripeCheckoutBody {
  userId: string;
  productId: string;
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
}

interface StripeSubscribeBody {
  userId: string;
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
}

interface StripeRefundBody {
  receiptId: string;
  reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer';
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

  // ═══════════════════════════════════════════════════════════════
  // P9-10: Stripe Checkout Session 생성
  // ═══════════════════════════════════════════════════════════════

  fastify.post('/api/stripe/checkout', async (
    request: FastifyRequest<{ Body: StripeCheckoutBody }>,
    reply: FastifyReply,
  ) => {
    const { userId, productId, successUrl, cancelUrl, customerEmail } = request.body;

    if (!userId || !productId || !successUrl || !cancelUrl) {
      return reply.status(400).send({
        error: 'userId, productId, successUrl, cancelUrl은 필수입니다.',
      });
    }

    try {
      const result = await createCheckoutSession({
        userId, productId, successUrl, cancelUrl, customerEmail,
      });
      return reply.send(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Checkout 세션 생성 실패';
      return reply.status(400).send({ error: message });
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // P9-10: Stripe Webhook 수신
  // ═══════════════════════════════════════════════════════════════

  fastify.post('/api/stripe/webhook', {
    config: { rawBody: true },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const signature = request.headers['stripe-signature'] as string;
    if (!signature) {
      return reply.status(400).send({ error: 'stripe-signature 헤더 누락' });
    }

    let event;
    try {
      const rawBody = (request as any).rawBody || JSON.stringify(request.body);
      event = constructWebhookEvent(rawBody, signature);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Webhook 서명 검증 실패';
      return reply.status(400).send({ error: message });
    }

    // 이벤트 타입별 분기
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        await handleCheckoutCompleted(session as any);
        break;
      }
      case 'payment_intent.payment_failed': {
        const pi = event.data.object;
        await handlePaymentFailed(pi as any);
        break;
      }
      case 'customer.subscription.created':
      case 'invoice.paid': {
        if (event.type === 'customer.subscription.created') {
          await handleSubscriptionActivated(event.data.object as any);
        }
        break;
      }
      case 'customer.subscription.deleted': {
        await handleSubscriptionCanceled(event.data.object as any);
        break;
      }
      case 'charge.dispute.created': {
        await handleDisputeCreated(event.data.object as any);
        break;
      }
      case 'charge.dispute.closed': {
        await handleDisputeClosed(event.data.object as any);
        break;
      }
      default:
        // 미처리 이벤트 무시
        break;
    }

    return reply.send({ received: true });
  });

  // ═══════════════════════════════════════════════════════════════
  // P9-11: 시즌패스 구독
  // ═══════════════════════════════════════════════════════════════

  fastify.post('/api/stripe/subscribe', async (
    request: FastifyRequest<{ Body: StripeSubscribeBody }>,
    reply: FastifyReply,
  ) => {
    const { userId, successUrl, cancelUrl, customerEmail } = request.body;

    if (!userId || !successUrl || !cancelUrl) {
      return reply.status(400).send({
        error: 'userId, successUrl, cancelUrl은 필수입니다.',
      });
    }

    try {
      const result = await createSeasonPassSubscription({
        userId, successUrl, cancelUrl, customerEmail,
      });
      return reply.send(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : '구독 생성 실패';
      return reply.status(400).send({ error: message });
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // P9-11: Stripe 환불
  // ═══════════════════════════════════════════════════════════════

  fastify.post('/api/stripe/refund', async (
    request: FastifyRequest<{ Body: StripeRefundBody }>,
    reply: FastifyReply,
  ) => {
    const { receiptId, reason } = request.body;

    if (!receiptId) {
      return reply.status(400).send({ error: 'receiptId는 필수입니다.' });
    }

    try {
      const result = await processStripeRefund({ receiptId, reason });
      return reply.send(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Stripe 환불 실패';
      return reply.status(400).send({ error: message });
    }
  });
}
