/**
 * P9-11 Stripe 구독/환불
 *
 * - 시즌패스 프리미엄 → Stripe Subscription (월간)
 * - 환불: Stripe Refund API + PaymentReceipt 상태 갱신
 * - 분쟁(Dispute) Webhook 처리
 * - 구독 생명주기: 생성 → 갱신 → 취소 → 만료
 */
import Stripe from 'stripe';
import { prisma } from '../db';

// ─── Stripe 인스턴스 ────────────────────────────────────────────

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';

let stripe: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripe) {
    if (!STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY 환경변수가 설정되지 않았습니다.');
    }
    stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2024-12-18.acacia' });
  }
  return stripe;
}

// ─── 시즌패스 구독 상수 ─────────────────────────────────────────

/** 시즌패스 프리미엄 Stripe Price ID (월간 구독) */
const SEASON_PASS_PRICE_ID = process.env.STRIPE_PRICE_SEASON_PASS || 'price_season_pass_premium';

/** 프리미엄 패스 크리스탈 가격 (기존 인게임 결제용, 비교 참조) */
const PREMIUM_PASS_CRYSTAL_PRICE = 980;

// ─── 구독 생성 ──────────────────────────────────────────────────

export interface CreateSubscriptionParams {
  userId: string;
  customerEmail?: string;
  successUrl: string;
  cancelUrl: string;
}

/**
 * Stripe Checkout Session (subscription mode)으로 시즌패스 구독 생성.
 */
export async function createSeasonPassSubscription(
  params: CreateSubscriptionParams,
): Promise<{ sessionId: string; url: string }> {
  const { userId, successUrl, cancelUrl, customerEmail } = params;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('유저를 찾을 수 없습니다.');

  const s = getStripe();

  // 기존 Stripe Customer 조회 또는 생성
  let customerId: string | undefined;
  const existingCustomers = await s.customers.list({
    email: customerEmail ?? user.email,
    limit: 1,
  });

  if (existingCustomers.data.length > 0) {
    customerId = existingCustomers.data[0].id;
  }

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: SEASON_PASS_PRICE_ID, quantity: 1 }],
    metadata: { userId, type: 'season_pass_premium' },
    success_url: successUrl,
    cancel_url: cancelUrl,
  };

  if (customerId) {
    sessionParams.customer = customerId;
  } else {
    sessionParams.customer_email = customerEmail ?? user.email;
  }

  const session = await s.checkout.sessions.create(sessionParams);

  return { sessionId: session.id, url: session.url! };
}

// ─── 구독 Webhook 핸들러 ────────────────────────────────────────

/**
 * customer.subscription.created / invoice.paid
 * 시즌패스 프리미엄 활성화.
 */
export async function handleSubscriptionActivated(
  subscription: Stripe.Subscription,
): Promise<void> {
  const userId = subscription.metadata?.userId;
  if (!userId) return;

  // 현재 활성 시즌 조회
  const activeSeason = await prisma.seasonPass.findFirst({
    where: { isActive: true },
  });
  if (!activeSeason) return;

  // 시즌 패스 프리미엄 활성화
  await prisma.seasonPassProgress.updateMany({
    where: { userId, seasonId: activeSeason.id },
    data: { isPremium: true },
  });
}

/**
 * customer.subscription.deleted — 구독 취소/만료 처리.
 * 이미 지급된 시즌패스 보상은 유지하되, 다음 시즌부터 프리미엄 비활성화.
 */
export async function handleSubscriptionCanceled(
  subscription: Stripe.Subscription,
): Promise<void> {
  const userId = subscription.metadata?.userId;
  if (!userId) return;

  // 프리미엄 상태는 현재 시즌 종료까지 유지 (다음 시즌에 비갱신)
  console.log(`[Stripe] 구독 취소: userId=${userId}, subId=${subscription.id}`);
}

// ─── 환불 ───────────────────────────────────────────────────────

export interface RefundParams {
  receiptId: string;
  reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer';
}

/**
 * Stripe Refund API로 환불 + PaymentReceipt 상태 갱신.
 */
export async function processStripeRefund(
  params: RefundParams,
): Promise<{ refundId: string; crystalDeducted: number }> {
  const { receiptId, reason } = params;

  const receipt = await prisma.paymentReceipt.findUnique({ where: { id: receiptId } });
  if (!receipt) throw new Error('영수증을 찾을 수 없습니다.');
  if (receipt.status !== 'verified') throw new Error('검증 완료된 결제만 환불 가능합니다.');
  if (receipt.platform !== 'stripe') throw new Error('Stripe 결제만 환불 가능합니다.');

  const s = getStripe();

  // Stripe Payment Intent 조회 (Checkout Session → Payment Intent)
  let paymentIntentId: string | null = null;
  if (receipt.receiptData) {
    try {
      const session = await s.checkout.sessions.retrieve(receipt.receiptData);
      paymentIntentId =
        typeof session.payment_intent === 'string'
          ? session.payment_intent
          : session.payment_intent?.id ?? null;
    } catch {
      throw new Error('Stripe 세션 조회 실패');
    }
  }

  if (!paymentIntentId) throw new Error('Payment Intent를 찾을 수 없습니다.');

  // Stripe Refund 생성
  const refund = await s.refunds.create({
    payment_intent: paymentIntentId,
    reason: reason ?? 'requested_by_customer',
  });

  // 유저 크리스탈 차감
  const user = await prisma.user.findUnique({ where: { id: receipt.userId } });
  if (!user) throw new Error('유저를 찾을 수 없습니다.');
  const crystalToDeduct = Math.min(receipt.crystalAmount, user.crystal);

  // 트랜잭션: 영수증 환불 상태 + 크리스탈 차감
  await prisma.$transaction([
    prisma.paymentReceipt.update({
      where: { id: receiptId },
      data: {
        status: 'refunded',
        refundStatus: 'completed',
      },
    }),
    prisma.user.update({
      where: { id: receipt.userId },
      data: { crystal: { decrement: crystalToDeduct } },
    }),
  ]);

  return { refundId: refund.id, crystalDeducted: crystalToDeduct };
}

// ─── 분쟁(Dispute) Webhook ──────────────────────────────────────

/**
 * charge.dispute.created — 분쟁 발생 시 처리.
 * 해당 결제 건의 영수증을 disputed 상태로 변경하고, 유저 크리스탈 동결.
 */
export async function handleDisputeCreated(
  dispute: Stripe.Dispute,
): Promise<void> {
  const paymentIntentId =
    typeof dispute.payment_intent === 'string'
      ? dispute.payment_intent
      : dispute.payment_intent?.id;

  if (!paymentIntentId) return;

  const s = getStripe();

  // Payment Intent에서 Checkout Session 찾기
  const sessions = await s.checkout.sessions.list({
    payment_intent: paymentIntentId,
    limit: 1,
  });

  if (sessions.data.length === 0) return;

  const sessionId = sessions.data[0].id;

  // 영수증 상태를 disputed로 변경
  const receipt = await prisma.paymentReceipt.findFirst({
    where: { receiptData: sessionId },
  });

  if (!receipt) return;

  await prisma.paymentReceipt.update({
    where: { id: receipt.id },
    data: {
      status: 'refunded',
      refundStatus: 'disputed',
    },
  });

  // 크리스탈 차감 (분쟁 시 즉시 환수)
  const user = await prisma.user.findUnique({ where: { id: receipt.userId } });
  if (user) {
    const deduct = Math.min(receipt.crystalAmount, user.crystal);
    await prisma.user.update({
      where: { id: receipt.userId },
      data: { crystal: { decrement: deduct } },
    });
  }

  console.warn(
    `[Stripe] 분쟁 발생: disputeId=${dispute.id}, userId=${receipt.userId}, amount=${receipt.amount}`,
  );
}

/**
 * charge.dispute.closed — 분쟁 종료 (승소 시 크리스탈 복원 가능).
 */
export async function handleDisputeClosed(
  dispute: Stripe.Dispute,
): Promise<void> {
  if (dispute.status === 'won') {
    // 판매자 승소: 크리스탈 복원 로직 (필요 시 구현)
    console.log(`[Stripe] 분쟁 승소: disputeId=${dispute.id}`);
  } else {
    console.log(`[Stripe] 분쟁 패소/기타: disputeId=${dispute.id}, status=${dispute.status}`);
  }
}
