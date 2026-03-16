import { Prisma } from '@prisma/client';
import { prisma } from '../db';
import { inventoryManager } from '../inventory/inventoryManager';

// ─── 타입 정의 ──────────────────────────────────────────────────

/** 우편 첨부 아이템 */
interface MailAttachment {
  itemId: string;
  count: number;
}

/** 우편 발송 파라미터 */
interface SendMailParams {
  senderId?: string | null;   // null이면 시스템 우편
  receiverId: string;
  subject: string;
  body: string;
  attachments?: MailAttachment[];
  expiresInDays?: number;     // 기본 30일
}

// ─── 상수 ───────────────────────────────────────────────────────

const DEFAULT_EXPIRE_DAYS = 30;
const MAIL_PAGE_SIZE = 20;

// ═══════════════════════════════════════════════════════════════
//  우편 발송
// ═══════════════════════════════════════════════════════════════

/** 유저간 또는 시스템 우편 발송 */
export async function sendMail(params: SendMailParams) {
  const { senderId, receiverId, subject, body, attachments, expiresInDays } = params;

  if (senderId && senderId === receiverId) {
    throw new Error('자기 자신에게 우편을 보낼 수 없습니다.');
  }

  const expireDays = expiresInDays ?? DEFAULT_EXPIRE_DAYS;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expireDays);

  return prisma.mail.create({
    data: {
      senderId: senderId ?? null,
      receiverId,
      subject,
      body,
      attachments: attachments && attachments.length > 0
        ? (JSON.parse(JSON.stringify(attachments)) as Prisma.InputJsonValue)
        : undefined,
      expiresAt,
    },
  });
}

/** 시스템 보상 우편 (간편 헬퍼) */
export async function sendSystemMail(
  receiverId: string,
  subject: string,
  body: string,
  attachments: MailAttachment[],
) {
  return sendMail({
    senderId: null,
    receiverId,
    subject,
    body,
    attachments,
  });
}

// ═══════════════════════════════════════════════════════════════
//  우편 조회
// ═══════════════════════════════════════════════════════════════

/** 수신함 조회 (페이지네이션, 최신 순) */
export async function getInbox(receiverId: string, page = 1) {
  const skip = (page - 1) * MAIL_PAGE_SIZE;

  const [mails, total] = await Promise.all([
    prisma.mail.findMany({
      where: { receiverId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: MAIL_PAGE_SIZE,
    }),
    prisma.mail.count({ where: { receiverId } }),
  ]);

  return { mails, total, page, pageSize: MAIL_PAGE_SIZE };
}

/** 단일 우편 조회 + 읽음 처리 */
export async function readMail(mailId: string, userId: string) {
  const mail = await prisma.mail.findUnique({ where: { id: mailId } });
  if (!mail) throw new Error('우편을 찾을 수 없습니다.');
  if (mail.receiverId !== userId) throw new Error('본인의 우편만 읽을 수 있습니다.');

  if (!mail.isRead) {
    await prisma.mail.update({
      where: { id: mailId },
      data: { isRead: true },
    });
  }

  return mail;
}

// ═══════════════════════════════════════════════════════════════
//  첨부 아이템 수령
// ═══════════════════════════════════════════════════════════════

/** 첨부 아이템 수령 처리 */
export async function collectAttachments(mailId: string, userId: string) {
  const mail = await prisma.mail.findUnique({ where: { id: mailId } });
  if (!mail) throw new Error('우편을 찾을 수 없습니다.');
  if (mail.receiverId !== userId) throw new Error('본인의 우편만 수령할 수 있습니다.');
  if (mail.isCollected) throw new Error('이미 수령한 우편입니다.');

  const attachments = mail.attachments as MailAttachment[] | null;
  if (!attachments || attachments.length === 0) {
    throw new Error('첨부 아이템이 없습니다.');
  }

  // 인벤토리에 아이템 추가
  const addResults = [];
  for (const att of attachments) {
    const result = await inventoryManager.addItem(userId, att.itemId, att.count);
    if (!result.success) {
      throw new Error(`아이템 수령 실패 (${att.itemId}): ${result.message}`);
    }
    addResults.push({ itemId: att.itemId, count: att.count, slotId: result.slotId });
  }

  // 수령 완료 플래그 처리
  const updated = await prisma.mail.update({
    where: { id: mailId },
    data: { isCollected: true, isRead: true },
  });

  return { mail: updated, collectedItems: attachments, addResults };
}

// ═══════════════════════════════════════════════════════════════
//  우편 삭제
// ═══════════════════════════════════════════════════════════════

/** 단일 우편 삭제 */
export async function deleteMail(mailId: string, userId: string) {
  const mail = await prisma.mail.findUnique({ where: { id: mailId } });
  if (!mail) throw new Error('우편을 찾을 수 없습니다.');
  if (mail.receiverId !== userId) throw new Error('본인의 우편만 삭제할 수 있습니다.');

  // 미수령 첨부가 있으면 삭제 차단
  const attachments = mail.attachments as MailAttachment[] | null;
  if (attachments && attachments.length > 0 && !mail.isCollected) {
    throw new Error('첨부 아이템을 먼저 수령해야 삭제할 수 있습니다.');
  }

  return prisma.mail.delete({ where: { id: mailId } });
}

// ═══════════════════════════════════════════════════════════════
//  만료 우편 자동 정리
// ═══════════════════════════════════════════════════════════════

/** 만료된 우편 일괄 삭제 (주기적 호출용) */
export async function purgeExpiredMails(): Promise<number> {
  const now = new Date();

  const result = await prisma.mail.deleteMany({
    where: {
      expiresAt: { lte: now },
    },
  });

  return result.count;
}
