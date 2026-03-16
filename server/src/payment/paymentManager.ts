/**
 * P6-02 프리미엄 화폐 + IAP 관리자
 * - 상품 카탈로그 (크리스탈 패키지: 100/500/1100/2400/5500/12000)
 * - 결제 생성 → 영수증 검증 (웹 결제 시뮬레이션)
 * - 크리스탈 지급 (User.crystal 필드)
 * - 첫 구매 2배 보너스
 * - 환불 처리
 */

import { prisma } from '../db';

// ─── 상품 카탈로그 ──────────────────────────────────────────────

export interface CrystalProduct {
  id: string;
  name: string;
  crystalAmount: number;    // 기본 지급 크리스탈
  bonusAmount: number;      // 보너스 크리스탈
  price: number;            // 원화 가격 (KRW)
  firstPurchaseBonus: boolean; // 첫 구매 2배 적용 여부
}

/** 크리스탈 상품 카탈로그 */
export const CRYSTAL_PRODUCTS: CrystalProduct[] = [
  {
    id: 'crystal_100',
    name: '크리스탈 100개',
    crystalAmount: 100,
    bonusAmount: 0,
    price: 1200,
    firstPurchaseBonus: true,
  },
  {
    id: 'crystal_500',
    name: '크리스탈 500개',
    crystalAmount: 500,
    bonusAmount: 50,
    price: 5900,
    firstPurchaseBonus: true,
  },
  {
    id: 'crystal_1100',
    name: '크리스탈 1,100개',
    crystalAmount: 1100,
    bonusAmount: 150,
    price: 11900,
    firstPurchaseBonus: true,
  },
  {
    id: 'crystal_2400',
    name: '크리스탈 2,400개',
    crystalAmount: 2400,
    bonusAmount: 400,
    price: 24900,
    firstPurchaseBonus: true,
  },
  {
    id: 'crystal_5500',
    name: '크리스탈 5,500개',
    crystalAmount: 5500,
    bonusAmount: 1000,
    price: 54900,
    firstPurchaseBonus: true,
  },
  {
    id: 'crystal_12000',
    name: '크리스탈 12,000개',
    crystalAmount: 12000,
    bonusAmount: 3000,
    price: 109900,
    firstPurchaseBonus: true,
  },
];

// ─── 결제 처리 ──────────────────────────────────────────────────

/** 결제 생성 (영수증 생성) */
export async function createPayment(
  userId: string,
  productId: string,
  platform: string,
  receiptData?: string,
): Promise<{ receiptId: string; product: CrystalProduct }> {
  // 상품 확인
  const product = CRYSTAL_PRODUCTS.find((p) => p.id === productId);
  if (!product) throw new Error(`존재하지 않는 상품: ${productId}`);

  // 유저 확인
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('유저를 찾을 수 없습니다.');

  // 영수증 생성
  const receipt = await prisma.paymentReceipt.create({
    data: {
      userId,
      platform,
      productId,
      amount: product.price,
      currency: 'KRW',
      crystalAmount: product.crystalAmount + product.bonusAmount,
      receiptData: receiptData ?? null,
      status: 'pending',
    },
  });

  return { receiptId: receipt.id, product };
}

/** 영수증 검증 + 크리스탈 지급 */
export async function verifyAndGrant(receiptId: string): Promise<{
  crystalGranted: number;
  isFirstPurchase: boolean;
  totalCrystal: number;
}> {
  const receipt = await prisma.paymentReceipt.findUnique({ where: { id: receiptId } });
  if (!receipt) throw new Error('영수증을 찾을 수 없습니다.');
  if (receipt.status !== 'pending') throw new Error(`이미 처리된 영수증입니다. (상태: ${receipt.status})`);

  // 상품 조회
  const product = CRYSTAL_PRODUCTS.find((p) => p.id === receipt.productId);
  if (!product) throw new Error('상품 정보를 찾을 수 없습니다.');

  // 웹 결제 시뮬레이션: 영수증 데이터 검증 (실제 환경에서는 스토어 API 호출)
  // iOS: Apple App Store 영수증 검증 API
  // Android: Google Play 영수증 검증 API
  // 여기서는 시뮬레이션으로 항상 성공 처리

  // 첫 구매 여부 확인
  const previousPurchase = await prisma.paymentReceipt.findFirst({
    where: {
      userId: receipt.userId,
      productId: receipt.productId,
      status: 'verified',
    },
  });
  const isFirstPurchase = !previousPurchase && product.firstPurchaseBonus;

  // 크리스탈 계산 (첫 구매 시 2배)
  let crystalGranted = product.crystalAmount + product.bonusAmount;
  if (isFirstPurchase) {
    crystalGranted *= 2;
  }

  // 트랜잭션: 영수증 확정 + 크리스탈 지급
  const [, updatedUser] = await prisma.$transaction([
    prisma.paymentReceipt.update({
      where: { id: receiptId },
      data: {
        status: 'verified',
        crystalAmount: crystalGranted,
        verifiedAt: new Date(),
      },
    }),
    prisma.user.update({
      where: { id: receipt.userId },
      data: { crystal: { increment: crystalGranted } },
    }),
  ]);

  return {
    crystalGranted,
    isFirstPurchase,
    totalCrystal: updatedUser.crystal,
  };
}

/** 환불 처리 */
export async function refundPayment(receiptId: string): Promise<{
  crystalDeducted: number;
  remainingCrystal: number;
}> {
  const receipt = await prisma.paymentReceipt.findUnique({ where: { id: receiptId } });
  if (!receipt) throw new Error('영수증을 찾을 수 없습니다.');
  if (receipt.status !== 'verified') throw new Error('검증 완료된 결제만 환불 가능합니다.');

  // 유저 크리스탈 확인
  const user = await prisma.user.findUnique({ where: { id: receipt.userId } });
  if (!user) throw new Error('유저를 찾을 수 없습니다.');

  // 환불할 크리스탈 (부족하면 0까지만 차감)
  const crystalToDeduct = Math.min(receipt.crystalAmount, user.crystal);

  // 트랜잭션: 영수증 환불 + 크리스탈 차감
  const [, updatedUser] = await prisma.$transaction([
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

  return {
    crystalDeducted: crystalToDeduct,
    remainingCrystal: updatedUser.crystal,
  };
}

/** 결제 이력 조회 */
export async function getPaymentHistory(
  userId: string,
  page = 1,
  limit = 20,
): Promise<{
  receipts: Array<{
    id: string;
    productId: string;
    amount: number;
    crystalAmount: number;
    status: string;
    platform: string;
    createdAt: Date;
  }>;
  total: number;
}> {
  const take = Math.min(limit, 100);
  const skip = (Math.max(page, 1) - 1) * take;

  const [receipts, total] = await Promise.all([
    prisma.paymentReceipt.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      select: {
        id: true,
        productId: true,
        amount: true,
        crystalAmount: true,
        status: true,
        platform: true,
        createdAt: true,
      },
    }),
    prisma.paymentReceipt.count({ where: { userId } }),
  ]);

  return { receipts, total };
}
