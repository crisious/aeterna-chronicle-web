import { prisma } from '../db';

// ─── 타입 정의 ──────────────────────────────────────────────────

/** 이벤트 타입 */
type EventType = 'login_bonus' | 'double_drop' | 'discount' | 'collection' | 'challenge';

/** 이벤트 보상 항목 */
interface EventRewardEntry {
  id: string;       // 보상 고유 ID (수령 추적용)
  type: 'gold' | 'diamond' | 'item' | 'event_coin';
  itemId?: string;
  amount: number;
  condition?: {      // 수령 조건
    type: string;    // login_count, collect_count, score 등
    target: number;
  };
}

/** 이벤트 진행 상태 */
interface ProgressState {
  [key: string]: number | string | boolean;
}

/** 보상 수령 결과 */
interface ClaimResult {
  success: boolean;
  rewardId: string;
  reward?: EventRewardEntry;
  message: string;
}

// ═══════════════════════════════════════════════════════════════
//  이벤트 활성/비활성 자동 관리
// ═══════════════════════════════════════════════════════════════

/** 시간 기반 이벤트 활성 상태 동기화 (주기적 호출) */
export async function syncEventStatus(): Promise<{ activated: number; deactivated: number }> {
  const now = new Date();

  // 시작 시각 도래 → 활성화
  const toActivate = await prisma.gameEvent.updateMany({
    where: {
      isActive: false,
      startAt: { lte: now },
      endAt: { gt: now },
    },
    data: { isActive: true },
  });

  // 종료 시각 경과 → 비활성화
  const toDeactivate = await prisma.gameEvent.updateMany({
    where: {
      isActive: true,
      endAt: { lte: now },
    },
    data: { isActive: false },
  });

  return { activated: toActivate.count, deactivated: toDeactivate.count };
}

// ═══════════════════════════════════════════════════════════════
//  활성 이벤트 조회
// ═══════════════════════════════════════════════════════════════

/** 현재 활성 이벤트 목록 */
export async function getActiveEvents() {
  const now = new Date();

  return prisma.gameEvent.findMany({
    where: {
      isActive: true,
      startAt: { lte: now },
      endAt: { gt: now },
    },
    orderBy: { startAt: 'asc' },
  });
}

/** 이벤트 상세 조회 */
export async function getEventById(eventId: string) {
  return prisma.gameEvent.findUnique({ where: { id: eventId } });
}

// ═══════════════════════════════════════════════════════════════
//  이벤트 진행도
// ═══════════════════════════════════════════════════════════════

/** 유저의 이벤트 진행도 조회 (없으면 초기 생성) */
export async function getEventProgress(userId: string, eventId: string) {
  let progress = await prisma.eventProgress.findUnique({
    where: { userId_eventId: { userId, eventId } },
  });

  if (!progress) {
    progress = await prisma.eventProgress.create({
      data: {
        userId,
        eventId,
        progress: {} as object,
        claimed: [],
      },
    });
  }

  return progress;
}

/** 이벤트 진행도 업데이트 */
export async function updateEventProgress(
  userId: string,
  eventId: string,
  progressUpdate: ProgressState,
) {
  const existing = await getEventProgress(userId, eventId);
  const currentProgress = existing.progress as ProgressState;
  const merged = { ...currentProgress, ...progressUpdate };

  return prisma.eventProgress.update({
    where: { id: existing.id },
    data: { progress: merged as object },
  });
}

// ═══════════════════════════════════════════════════════════════
//  이벤트 타입별 로직
// ═══════════════════════════════════════════════════════════════

/** 로그인 보너스: 로그인 시 카운트 증가 */
export async function processLoginBonus(userId: string, eventId: string): Promise<void> {
  const progress = await getEventProgress(userId, eventId);
  const state = progress.progress as ProgressState;
  const loginCount = (typeof state.loginCount === 'number' ? state.loginCount : 0) + 1;
  await updateEventProgress(userId, eventId, { loginCount });
}

/** 이벤트 타입별 진행 상태 체크 (범용) */
export function checkRewardEligibility(
  reward: EventRewardEntry,
  progress: ProgressState,
): boolean {
  if (!reward.condition) return true; // 무조건 수령 가능

  const { type, target } = reward.condition;
  const current = typeof progress[type] === 'number' ? (progress[type] as number) : 0;
  return current >= target;
}

// ═══════════════════════════════════════════════════════════════
//  보상 수령
// ═══════════════════════════════════════════════════════════════

/** 이벤트 보상 수령 */
export async function claimEventReward(
  userId: string,
  eventId: string,
  rewardId: string,
): Promise<ClaimResult> {
  // 이벤트 존재 & 활성 확인
  const event = await prisma.gameEvent.findUnique({ where: { id: eventId } });
  if (!event) return { success: false, rewardId, message: '이벤트를 찾을 수 없습니다.' };
  if (!event.isActive) return { success: false, rewardId, message: '비활성 이벤트입니다.' };

  // 보상 테이블에서 해당 보상 찾기
  const rewards = event.rewards as unknown as EventRewardEntry[];
  const reward = rewards.find((r) => r.id === rewardId);
  if (!reward) return { success: false, rewardId, message: '해당 보상을 찾을 수 없습니다.' };

  // 진행도 확인
  const progressRecord = await getEventProgress(userId, eventId);
  const claimed = progressRecord.claimed as string[];

  // 중복 수령 방지
  if (claimed.includes(rewardId)) {
    return { success: false, rewardId, message: '이미 수령한 보상입니다.' };
  }

  // 수령 조건 확인
  const progress = progressRecord.progress as ProgressState;
  if (!checkRewardEligibility(reward, progress)) {
    return { success: false, rewardId, message: '수령 조건을 충족하지 못했습니다.' };
  }

  // 수령 처리 (claimed 목록에 추가)
  const newClaimed = [...claimed, rewardId];
  await prisma.eventProgress.update({
    where: { id: progressRecord.id },
    data: { claimed: newClaimed },
  });

  return {
    success: true,
    rewardId,
    reward,
    message: '보상을 수령했습니다.',
  };
}

// ═══════════════════════════════════════════════════════════════
//  2배 드롭 / 할인 효과 조회
// ═══════════════════════════════════════════════════════════════

/** 현재 활성 이벤트 중 특정 타입 효과 조회 */
export async function getActiveEventEffect(type: EventType): Promise<{
  active: boolean;
  events: Array<{ id: string; name: string; config: Record<string, unknown> }>;
}> {
  const now = new Date();
  const events = await prisma.gameEvent.findMany({
    where: {
      type,
      isActive: true,
      startAt: { lte: now },
      endAt: { gt: now },
    },
  });

  return {
    active: events.length > 0,
    events: events.map((e) => ({
      id: e.id,
      name: e.name,
      config: e.config as Record<string, unknown>,
    })),
  };
}

/** 2배 드롭 배율 조회 (기본 1.0, 이벤트 활성 시 config.multiplier) */
export async function getDropMultiplier(): Promise<number> {
  const effect = await getActiveEventEffect('double_drop');
  if (!effect.active) return 1.0;

  // 가장 높은 배율 적용
  let maxMultiplier = 1.0;
  for (const e of effect.events) {
    const multiplier = typeof e.config.multiplier === 'number' ? e.config.multiplier : 2.0;
    if (multiplier > maxMultiplier) maxMultiplier = multiplier;
  }
  return maxMultiplier;
}

/** 할인율 조회 (기본 0, 이벤트 활성 시 config.discountRate) */
export async function getDiscountRate(): Promise<number> {
  const effect = await getActiveEventEffect('discount');
  if (!effect.active) return 0;

  let maxDiscount = 0;
  for (const e of effect.events) {
    const rate = typeof e.config.discountRate === 'number' ? e.config.discountRate : 0.1;
    if (rate > maxDiscount) maxDiscount = rate;
  }
  return maxDiscount;
}
