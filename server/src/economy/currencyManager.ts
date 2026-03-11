import { prisma } from '../db';

// ─── 타입 정의 ──────────────────────────────────────────────────

/** 화폐 종류 */
type CurrencyType = 'gold' | 'diamond' | 'event_coin';

/** 거래 사유 */
type TransactionReason =
  | 'quest_reward'
  | 'shop_purchase'
  | 'craft_cost'
  | 'attendance_reward'
  | 'event_reward'
  | 'level_up_reward'
  | 'pvp_reward'
  | 'raid_reward'
  | 'transfer_send'
  | 'transfer_receive'
  | 'admin_grant'
  | 'admin_deduct';

/** 화폐 변경 파라미터 */
interface CurrencyChangeParams {
  userId: string;
  currency: CurrencyType;
  amount: number;        // 양수=획득, 음수=소비
  reason: TransactionReason;
  referenceId?: string;  // 관련 엔티티 ID (퀘스트ID, 상점ID 등)
}

/** 잔액 조회 결과 */
interface BalanceResult {
  gold: number;
  diamond: number;
  eventCoin: number;
}

/** 거래 이력 항목 */
interface TransactionEntry {
  id: string;
  currency: string;
  amount: number;
  balance: number;
  reason: string;
  referenceId: string | null;
  createdAt: Date;
}

// ─── 상수 ───────────────────────────────────────────────────────

/** 유저간 송금 수수료율 (10%) */
const TRANSFER_FEE_RATE = 0.1;

/** 일일 송금 한도 */
const DAILY_TRANSFER_LIMIT = 100000;

/** 거래 이력 페이지 크기 */
const HISTORY_PAGE_SIZE = 20;

// ─── 화폐 필드 매핑 ─────────────────────────────────────────────

/** DB 필드명 매핑 */
function currencyField(currency: CurrencyType): 'gold' | 'diamond' | 'eventCoin' {
  switch (currency) {
    case 'gold': return 'gold';
    case 'diamond': return 'diamond';
    case 'event_coin': return 'eventCoin';
  }
}

// ═══════════════════════════════════════════════════════════════
//  화폐 변경 (트랜잭션 안전)
// ═══════════════════════════════════════════════════════════════

/** 화폐 추가/차감 (원자적 트랜잭션) */
export async function changeCurrency(params: CurrencyChangeParams): Promise<{
  newBalance: number;
  transactionId: string;
}> {
  const { userId, currency, amount, reason, referenceId } = params;
  const field = currencyField(currency);

  return prisma.$transaction(async (tx) => {
    // 1. 현재 잔액 조회 (FOR UPDATE 효과: 트랜잭션 내 직렬화)
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { [field]: true },
    });

    if (!user) throw new Error('유저를 찾을 수 없습니다.');

    const currentBalance = (user as Record<string, unknown>)[field] as number;
    const newBalance = currentBalance + amount;

    // 잔액 부족 체크
    if (newBalance < 0) {
      throw new Error(`${currency} 잔액이 부족합니다. (보유: ${currentBalance}, 필요: ${Math.abs(amount)})`);
    }

    // 2. 잔액 업데이트
    await tx.user.update({
      where: { id: userId },
      data: { [field]: newBalance },
    });

    // 3. 거래 로그 기록
    const log = await tx.transactionLog.create({
      data: {
        userId,
        currency,
        amount,
        balance: newBalance,
        reason,
        referenceId: referenceId ?? null,
      },
    });

    return { newBalance, transactionId: log.id };
  });
}

/** 화폐 획득 (편의 래퍼) */
export async function addCurrency(
  userId: string,
  currency: CurrencyType,
  amount: number,
  reason: TransactionReason,
  referenceId?: string,
) {
  if (amount <= 0) throw new Error('획득 금액은 양수여야 합니다.');
  return changeCurrency({ userId, currency, amount, reason, referenceId });
}

/** 화폐 소비 (편의 래퍼) */
export async function spendCurrency(
  userId: string,
  currency: CurrencyType,
  amount: number,
  reason: TransactionReason,
  referenceId?: string,
) {
  if (amount <= 0) throw new Error('소비 금액은 양수여야 합니다.');
  return changeCurrency({ userId, currency, amount: -amount, reason, referenceId });
}

// ═══════════════════════════════════════════════════════════════
//  잔액 조회
// ═══════════════════════════════════════════════════════════════

/** 유저 잔액 조회 */
export async function getBalance(userId: string): Promise<BalanceResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { gold: true, diamond: true, eventCoin: true },
  });

  if (!user) throw new Error('유저를 찾을 수 없습니다.');

  return {
    gold: user.gold,
    diamond: user.diamond,
    eventCoin: user.eventCoin,
  };
}

// ═══════════════════════════════════════════════════════════════
//  거래 이력
// ═══════════════════════════════════════════════════════════════

/** 거래 이력 조회 (페이지네이션) */
export async function getTransactionHistory(
  userId: string,
  options?: {
    currency?: CurrencyType;
    page?: number;
    limit?: number;
  },
): Promise<{
  transactions: TransactionEntry[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const page = options?.page ?? 1;
  const pageSize = options?.limit ?? HISTORY_PAGE_SIZE;
  const skip = (page - 1) * pageSize;

  const where: Record<string, unknown> = { userId };
  if (options?.currency) where.currency = options.currency;

  const [transactions, total] = await Promise.all([
    prisma.transactionLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.transactionLog.count({ where }),
  ]);

  return { transactions, total, page, pageSize };
}

// ═══════════════════════════════════════════════════════════════
//  유저간 골드 송금
// ═══════════════════════════════════════════════════════════════

/** 유저간 골드 송금 (수수료 10%) */
export async function transferGold(
  senderId: string,
  receiverId: string,
  amount: number,
): Promise<{
  sent: number;
  fee: number;
  received: number;
  senderBalance: number;
  receiverBalance: number;
}> {
  if (senderId === receiverId) throw new Error('자기 자신에게 송금할 수 없습니다.');
  if (amount <= 0) throw new Error('송금 금액은 양수여야 합니다.');

  // 일일 송금 한도 체크
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayTransfers = await prisma.transactionLog.aggregate({
    where: {
      userId: senderId,
      currency: 'gold',
      reason: 'transfer_send',
      createdAt: { gte: todayStart },
    },
    _sum: { amount: true },
  });

  const todayTotal = Math.abs(todayTransfers._sum.amount ?? 0);
  if (todayTotal + amount > DAILY_TRANSFER_LIMIT) {
    throw new Error(`일일 송금 한도 초과 (한도: ${DAILY_TRANSFER_LIMIT}, 오늘 송금: ${todayTotal})`);
  }

  const fee = Math.floor(amount * TRANSFER_FEE_RATE);
  const received = amount - fee;

  // 수신자 존재 확인
  const receiver = await prisma.user.findUnique({ where: { id: receiverId } });
  if (!receiver) throw new Error('수신자를 찾을 수 없습니다.');

  // 트랜잭션으로 양쪽 처리
  const result = await prisma.$transaction(async (tx) => {
    // 송신자 차감
    const sender = await tx.user.findUnique({
      where: { id: senderId },
      select: { gold: true },
    });
    if (!sender) throw new Error('송신자를 찾을 수 없습니다.');
    if (sender.gold < amount) throw new Error(`골드 잔액 부족 (보유: ${sender.gold}, 필요: ${amount})`);

    const senderNewBalance = sender.gold - amount;
    await tx.user.update({
      where: { id: senderId },
      data: { gold: senderNewBalance },
    });

    // 수신자 추가
    const receiverData = await tx.user.findUnique({
      where: { id: receiverId },
      select: { gold: true },
    });
    const receiverNewBalance = (receiverData?.gold ?? 0) + received;
    await tx.user.update({
      where: { id: receiverId },
      data: { gold: receiverNewBalance },
    });

    // 거래 로그 (양쪽)
    await tx.transactionLog.create({
      data: {
        userId: senderId,
        currency: 'gold',
        amount: -amount,
        balance: senderNewBalance,
        reason: 'transfer_send',
        referenceId: receiverId,
      },
    });

    await tx.transactionLog.create({
      data: {
        userId: receiverId,
        currency: 'gold',
        amount: received,
        balance: receiverNewBalance,
        reason: 'transfer_receive',
        referenceId: senderId,
      },
    });

    return { senderBalance: senderNewBalance, receiverBalance: receiverNewBalance };
  });

  return {
    sent: amount,
    fee,
    received,
    senderBalance: result.senderBalance,
    receiverBalance: result.receiverBalance,
  };
}
