/**
 * P9-10 Stripe 실결제 연동
 *
 * - Checkout Session 생성 (크리스탈 6종 패키지)
 * - Webhook 수신 (checkout.session.completed → 크리스탈 지급)
 * - Stripe Price ID 매핑
 * - 서명 검증 (STRIPE_WEBHOOK_SECRET)
 * - 기존 paymentManager와 통합 (PaymentReceipt 활용)
 */
import Stripe from 'stripe';
import { prisma } from '../db';
import { CRYSTAL_PRODUCTS, CrystalProduct } from './paymentManager';

// ─── Stripe 초기화 ──────────────────────────────────────────────

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';

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

// ─── Stripe Price ID 매핑 ───────────────────────────────────────

/**
 * 크리스탈 상품 ID → Stripe Price ID 매핑.
 * 실제 운영 시 Stripe Dashboard에서 생성한 Price ID로 교체.
 */
const STRIPE_PRICE_MAP: Record<string, string> = {
  crystal_100: process.env.STRIPE_PRICE_CRYSTAL_100 || 'price_crystal_100',
  crystal_500: process.env.STRIPE_PRICE_CRYSTAL_500 || 'price_crystal_500',
  crystal_1100: process.env.STRIPE_PRICE_CRYSTAL_1100 || 'price_crystal_1100',
  crystal_2400: process.env.STRIPE_PRICE_CRYSTAL_2400 || 'price_crystal_2400',
  crystal_5500: process.env.STRIPE_PRICE_CRYSTAL_5500 || 'price_crystal_5500',
  crystal_12000: process.env.STRIPE_PRICE_CRYSTAL_12000 || 'price_crystal_12000',
};

/** 상품 ID로 Stripe Price ID 조회 */
export function getStripePriceId(productId: string): string | null {
  return STRIPE_PRICE_MAP[productId] ?? null;
}

// ─── Checkout Session ───────────────────────────────────────────

export interface CreateCheckoutParams {
  userId: string;
  productId: string;
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
}

/**
 * Stripe Checkout Session 생성.
 * metadata에 userId, productId를 저장하여 webhook에서 식별.
 */
export async function createCheckoutSession(
  params: CreateCheckoutParams,
): Promise<{ sessionId: string; url: string }> {
  const { userId, productId, successUrl, cancelUrl, customerEmail } = params;

  // 상품 확인
  const product = CRYSTAL_PRODUCTS.find((p) => p.id === productId);
  if (!product) throw new Error(`존재하지 않는 상품: ${productId}`);

  const priceId = getStripePriceId(productId);
  if (!priceId) throw new Error(`Stripe Price ID 미설정: ${productId}`);

  // 유저 확인
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('유저를 찾을 수 없습니다.');

  const s = getStripe();

  const session = await s.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    metadata: {
      userId,
      productId,
      crystalAmount: String(product.crystalAmount + product.bonusAmount),
    },
    customer_email: customerEmail ?? user.email,
    success_url: successUrl,
    cancel_url: cancelUrl,
  });

  // PaymentReceipt 생성 (pending)
  await prisma.paymentReceipt.create({
    data: {
      userId,
      platform: 'stripe',
      productId,
      amount: product.price,
      currency: 'KRW',
      crystalAmount: product.crystalAmount + product.bonusAmount,
      receiptData: session.id,
      status: 'pending',
    },
  });

  return { sessionId: session.id, url: session.url! };
}

// ─── Webhook 처리 ───────────────────────────────────────────────

/**
 * Stripe Webhook raw body에서 이벤트 구성 + 서명 검증.
 */
export function constructWebhookEvent(
  rawBody: Buffer | string,
  signature: string,
): Stripe.Event {
  if (!STRIPE_WEBHOOK_SECRET) {
    throw new Error('STRIPE_WEBHOOK_SECRET이 설정되지 않았습니다.');
  }
  return getStripe().webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET);
}

/**
 * checkout.session.completed 이벤트 처리.
 * metadata에서 userId, productId 추출 → 크리스탈 지급.
 */
export async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
): Promise<{ userId: string; crystalGranted: number } | null> {
  const userId = session.metadata?.userId;
  const productId = session.metadata?.productId;

  if (!userId || !productId) {
    console.error('[Stripe] checkout.session.completed: metadata 누락', session.id);
    return null;
  }

  const product = CRYSTAL_PRODUCTS.find((p) => p.id === productId);
  if (!product) {
    console.error('[Stripe] 알 수 없는 상품:', productId);
    return null;
  }

  // 중복 처리 방지: 이미 verified 된 영수증 확인
  const existingReceipt = await prisma.paymentReceipt.findFirst({
    where: { receiptData: session.id, status: 'verified' },
  });
  if (existingReceipt) {
    console.warn('[Stripe] 중복 webhook 무시:', session.id);
    return null;
  }

  // 첫 구매 여부 확인
  const previousPurchase = await prisma.paymentReceipt.findFirst({
    where: { userId, productId, status: 'verified' },
  });
  const isFirstPurchase = !previousPurchase && product.firstPurchaseBonus;

  let crystalGranted = product.crystalAmount + product.bonusAmount;
  if (isFirstPurchase) {
    crystalGranted *= 2;
  }

  // 트랜잭션: 영수증 확정 + 크리스탈 지급
  await prisma.$transaction([
    prisma.paymentReceipt.updateMany({
      where: { receiptData: session.id, status: 'pending' },
      data: {
        status: 'verified',
        crystalAmount: crystalGranted,
        verifiedAt: new Date(),
      },
    }),
    prisma.user.update({
      where: { id: userId },
      data: { crystal: { increment: crystalGranted } },
    }),
  ]);

  return { userId, crystalGranted };
}

/**
 * payment_intent.payment_failed 이벤트 처리.
 */
export async function handlePaymentFailed(
  paymentIntent: Stripe.PaymentIntent,
): Promise<void> {
  const sessionId = paymentIntent.metadata?.sessionId;
  if (!sessionId) return;

  await prisma.paymentReceipt.updateMany({
    where: { receiptData: sessionId, status: 'pending' },
    data: { status: 'failed' },
  });
}
