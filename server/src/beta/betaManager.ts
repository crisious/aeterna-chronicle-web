/**
 * 오픈 베타 매니저 (P6-19)
 * - 초대 코드 생성 (배치, 100개씩)
 * - 코드 검증 + 사용 처리
 * - 베타 서버 용량 제한 (최대 5000명)
 * - 피드백 접수/분류/상태관리
 */
import { prisma } from '../db';
import { Prisma } from '@prisma/client';
import crypto from 'crypto';

// ─── 상수 ───────────────────────────────────────────────────────
const BETA_MAX_USERS = Number(process.env.BETA_MAX_USERS ?? '5000');
const CODE_LENGTH = 8;
const DEFAULT_BATCH_SIZE = 100;
const CODE_EXPIRY_DAYS = 30;

// ─── 타입 ───────────────────────────────────────────────────────
export interface GenerateCodesResult {
  codes: string[];
  count: number;
  expiresAt: Date;
}

export interface ValidateCodeResult {
  valid: boolean;
  reason?: string;
  code?: string;
}

export interface FeedbackInput {
  userId: string;
  type: string;
  title: string;
  description: string;
  priority?: string;
  screenshot?: string;
  metadata?: Record<string, unknown>;
}

export interface FeedbackFilter {
  type?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

// ─── BetaManager 클래스 ─────────────────────────────────────────
class BetaManager {

  // ── 초대 코드 생성 ────────────────────────────────────────────

  /** 고유 초대 코드 문자열 생성 */
  private generateCode(): string {
    // ETHB-XXXXXXXX 포맷
    const random = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `ETHB-${random}`;
  }

  /** 배치로 초대 코드 생성 */
  async generateCodes(
    count: number = DEFAULT_BATCH_SIZE,
    expiryDays: number = CODE_EXPIRY_DAYS,
    email?: string
  ): Promise<GenerateCodesResult> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiryDays);

    const codes: string[] = [];
    const data = [];

    for (let i = 0; i < count; i++) {
      let code: string;
      // 중복 방지 루프
      do {
        code = this.generateCode();
      } while (codes.includes(code));

      codes.push(code);
      data.push({
        code,
        email: email ?? null,
        expiresAt,
      });
    }

    // Prisma createMany로 일괄 생성
    await prisma.betaInvite.createMany({ data });

    return { codes, count: codes.length, expiresAt };
  }

  // ── 코드 검증 + 사용 처리 ────────────────────────────────────

  /** 초대 코드 검증 */
  async validateCode(code: string): Promise<ValidateCodeResult> {
    const invite = await prisma.betaInvite.findUnique({
      where: { code: code.toUpperCase().trim() },
    });

    if (!invite) {
      return { valid: false, reason: '존재하지 않는 초대 코드입니다.' };
    }
    if (invite.isUsed) {
      return { valid: false, reason: '이미 사용된 초대 코드입니다.' };
    }
    if (invite.expiresAt < new Date()) {
      return { valid: false, reason: '만료된 초대 코드입니다.' };
    }

    return { valid: true, code: invite.code };
  }

  /** 초대 코드 사용 처리 */
  async redeemCode(code: string, userId: string): Promise<ValidateCodeResult> {
    // 서버 용량 확인
    const currentUsers = await prisma.betaInvite.count({
      where: { isUsed: true },
    });
    if (currentUsers >= BETA_MAX_USERS) {
      return { valid: false, reason: `베타 서버 용량 초과 (최대 ${BETA_MAX_USERS}명)` };
    }

    // 코드 검증
    const validation = await this.validateCode(code);
    if (!validation.valid) return validation;

    // 사용 처리
    await prisma.betaInvite.update({
      where: { code: code.toUpperCase().trim() },
      data: { isUsed: true, usedBy: userId },
    });

    return { valid: true, code: code.toUpperCase().trim() };
  }

  // ── 관리자 API ────────────────────────────────────────────────

  /** 초대 코드 목록 조회 */
  async listCodes(options: {
    used?: boolean;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ codes: unknown[]; total: number }> {
    const { limit = 50, offset = 0 } = options;
    const where = options.used !== undefined ? { isUsed: options.used } : {};

    const [codes, total] = await Promise.all([
      prisma.betaInvite.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.betaInvite.count({ where }),
    ]);

    return { codes, total };
  }

  /** 베타 통계 */
  async getStats(): Promise<{
    totalCodes: number;
    usedCodes: number;
    availableCodes: number;
    maxUsers: number;
  }> {
    const [totalCodes, usedCodes] = await Promise.all([
      prisma.betaInvite.count(),
      prisma.betaInvite.count({ where: { isUsed: true } }),
    ]);
    return {
      totalCodes,
      usedCodes,
      availableCodes: totalCodes - usedCodes,
      maxUsers: BETA_MAX_USERS,
    };
  }

  // ── 피드백 시스템 ─────────────────────────────────────────────

  /** 피드백 접수 */
  async submitFeedback(input: FeedbackInput): Promise<unknown> {
    return prisma.feedbackReport.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        description: input.description,
        priority: input.priority ?? 'normal',
        screenshot: input.screenshot ?? null,
        metadata: (input.metadata ?? Prisma.JsonNull) as Prisma.InputJsonValue,
      },
    });
  }

  /** 피드백 목록 조회 */
  async listFeedback(filter: FeedbackFilter = {}): Promise<{
    reports: unknown[];
    total: number;
  }> {
    const { limit = 50, offset = 0 } = filter;
    const where: Record<string, string> = {};
    if (filter.type) where.type = filter.type;
    if (filter.status) where.status = filter.status;

    const [reports, total] = await Promise.all([
      prisma.feedbackReport.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.feedbackReport.count({ where }),
    ]);

    return { reports, total };
  }

  /** 피드백 상태 업데이트 */
  async updateFeedbackStatus(
    id: string,
    status: string
  ): Promise<unknown> {
    return prisma.feedbackReport.update({
      where: { id },
      data: { status },
    });
  }
}

// 싱글턴
export const betaManager = new BetaManager();
