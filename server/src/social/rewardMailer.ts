import { prisma } from '../db';
import { sendSystemMail } from './mailSystem';

// ─── 타입 정의 ──────────────────────────────────────────────────

/** 보상 아이템 */
interface RewardItem {
  itemId: string;
  count: number;
}

/** 보상 우편 종류 */
type RewardReason =
  | 'level_up'
  | 'achievement'
  | 'event'
  | 'attendance'
  | 'admin_grant'
  | 'compensation'
  | 'season_reward';

// ─── 상수 ───────────────────────────────────────────────────────

/** 만료 임박 알림 기준 (일) */
const EXPIRE_WARNING_DAYS = 3;

// ═══════════════════════════════════════════════════════════════
//  시스템 보상 우편 발송 유틸
// ═══════════════════════════════════════════════════════════════

/** 보상 우편 발송 (레벨업/업적/이벤트/출석 등 자동 발송) */
export async function sendRewardMail(
  receiverId: string,
  reason: RewardReason,
  title: string,
  body: string,
  rewards: RewardItem[],
  expiresInDays = 30,
): Promise<void> {
  await sendSystemMail(receiverId, `[${reasonLabel(reason)}] ${title}`, body, rewards);
  // 발송 로그는 prisma 트랜잭션 로그와 별도로 콘솔 기록
  console.log(`[RewardMailer] ${reason} → ${receiverId} | items: ${rewards.length}`);
}

/** 레벨업 보상 우편 */
export async function sendLevelUpReward(
  receiverId: string,
  level: number,
  rewards: RewardItem[],
): Promise<void> {
  await sendRewardMail(
    receiverId,
    'level_up',
    `레벨 ${level} 달성 보상`,
    `축하합니다! 레벨 ${level}에 도달하여 보상을 지급합니다.`,
    rewards,
  );
}

/** 업적 달성 보상 우편 */
export async function sendAchievementReward(
  receiverId: string,
  achievementName: string,
  rewards: RewardItem[],
): Promise<void> {
  await sendRewardMail(
    receiverId,
    'achievement',
    `업적 달성: ${achievementName}`,
    `'${achievementName}' 업적을 달성하여 보상을 지급합니다.`,
    rewards,
  );
}

/** 이벤트 보상 우편 */
export async function sendEventReward(
  receiverId: string,
  eventName: string,
  rewards: RewardItem[],
): Promise<void> {
  await sendRewardMail(
    receiverId,
    'event',
    `이벤트 보상: ${eventName}`,
    `'${eventName}' 이벤트 보상이 도착했습니다.`,
    rewards,
  );
}

/** 출석 보상 우편 */
export async function sendAttendanceReward(
  receiverId: string,
  day: number,
  rewards: RewardItem[],
): Promise<void> {
  await sendRewardMail(
    receiverId,
    'attendance',
    `${day}일 출석 보상`,
    `${day}일 출석을 달성하여 특별 보상을 지급합니다.`,
    rewards,
  );
}

// ═══════════════════════════════════════════════════════════════
//  일괄 수령
// ═══════════════════════════════════════════════════════════════

/** 미수령 첨부 우편 일괄 수령 */
export async function collectAllAttachments(userId: string): Promise<{
  collected: number;
  items: Array<{ mailId: string; attachments: RewardItem[] }>;
}> {
  // 미수령 + 첨부 있는 우편 조회
  const mails = await prisma.mail.findMany({
    where: {
      receiverId: userId,
      isCollected: false,
      attachments: { not: { equals: null } },
    },
    orderBy: { createdAt: 'asc' },
  });

  const results: Array<{ mailId: string; attachments: RewardItem[] }> = [];

  // 트랜잭션으로 일괄 처리
  await prisma.$transaction(async (tx) => {
    for (const mail of mails) {
      const attachments = mail.attachments as unknown as RewardItem[] | null;
      if (!attachments || attachments.length === 0) continue;

      await tx.mail.update({
        where: { id: mail.id },
        data: { isCollected: true, isRead: true },
      });

      results.push({ mailId: mail.id, attachments });
    }
  });

  return { collected: results.length, items: results };
}

// ═══════════════════════════════════════════════════════════════
//  만료 임박 알림
// ═══════════════════════════════════════════════════════════════

/** 만료 임박 우편 목록 조회 (3일 이내 만료) */
export async function getExpiringMails(userId: string): Promise<Array<{
  id: string;
  subject: string;
  expiresAt: Date;
  hasAttachment: boolean;
  isCollected: boolean;
}>> {
  const now = new Date();
  const warningDate = new Date();
  warningDate.setDate(warningDate.getDate() + EXPIRE_WARNING_DAYS);

  const mails = await prisma.mail.findMany({
    where: {
      receiverId: userId,
      expiresAt: {
        gte: now,
        lte: warningDate,
      },
    },
    orderBy: { expiresAt: 'asc' },
    select: {
      id: true,
      subject: true,
      expiresAt: true,
      attachments: true,
      isCollected: true,
    },
  });

  return mails.map((m) => ({
    id: m.id,
    subject: m.subject,
    expiresAt: m.expiresAt!,
    hasAttachment: !!(m.attachments && (m.attachments as unknown as RewardItem[]).length > 0),
    isCollected: m.isCollected,
  }));
}

// ─── 헬퍼 ───────────────────────────────────────────────────────

function reasonLabel(reason: RewardReason): string {
  const labels: Record<RewardReason, string> = {
    level_up: '레벨업',
    achievement: '업적',
    event: '이벤트',
    attendance: '출석',
    admin_grant: '관리자 지급',
    compensation: '보상',
    season_reward: '시즌 보상',
  };
  return labels[reason];
}
