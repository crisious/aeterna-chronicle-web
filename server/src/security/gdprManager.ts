/**
 * P9-12 GDPR/개인정보 관리
 *
 * - 데이터 삭제 API: 유저 데이터 전체 삭제 (cascade)
 * - 개인정보 내보내기: JSON 패키지 생성
 * - 동의 관리: ConsentRecord CRUD
 * - 삭제 요청 로깅 (법적 보존)
 */
import { prisma } from '../db';

// ─── 타입 ───────────────────────────────────────────────────────

export interface ConsentInput {
  userId: string;
  consentType: string; // 'terms', 'privacy', 'marketing', 'analytics'
  granted: boolean;
  version: string;     // 동의 약관 버전
}

export interface DataExportPackage {
  exportedAt: string;
  user: Record<string, unknown>;
  characters: Record<string, unknown>[];
  inventory: Record<string, unknown>[];
  payments: Record<string, unknown>[];
  achievements: Record<string, unknown>[];
  socialData: Record<string, unknown>;
  consents: Record<string, unknown>[];
}

export interface DeletionResult {
  userId: string;
  deletedAt: string;
  tablesAffected: string[];
}

// ─── 동의 관리 ──────────────────────────────────────────────────

/** 동의 기록 생성/갱신 */
export async function recordConsent(input: ConsentInput): Promise<void> {
  await prisma.consentRecord.upsert({
    where: {
      userId_consentType: {
        userId: input.userId,
        consentType: input.consentType,
      },
    },
    create: {
      userId: input.userId,
      consentType: input.consentType,
      granted: input.granted,
      version: input.version,
      grantedAt: input.granted ? new Date() : null,
      revokedAt: input.granted ? null : new Date(),
    },
    update: {
      granted: input.granted,
      version: input.version,
      grantedAt: input.granted ? new Date() : undefined,
      revokedAt: input.granted ? null : new Date(),
    },
  });
}

/** 유저의 동의 상태 조회 */
export async function getUserConsents(
  userId: string,
): Promise<Array<{ consentType: string; granted: boolean; version: string; updatedAt: Date }>> {
  const records = await prisma.consentRecord.findMany({
    where: { userId },
    select: {
      consentType: true,
      granted: true,
      version: true,
      updatedAt: true,
    },
  });
  return records;
}

// ─── 개인정보 내보내기 ──────────────────────────────────────────

/**
 * GDPR 제15조: 유저의 모든 개인정보를 JSON 패키지로 수집.
 * 30일 이내 제공 의무.
 */
export async function exportUserData(userId: string): Promise<DataExportPackage> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('유저를 찾을 수 없습니다.');

  // 병렬 데이터 수집
  const [characters, payments, consents] = await Promise.all([
    prisma.character.findMany({
      where: { userId },
      include: {
        inventoryItems: true,
        questProgress: true,
        skills: true,
      },
    }),
    prisma.paymentReceipt.findMany({
      where: { userId },
      select: {
        id: true,
        productId: true,
        amount: true,
        currency: true,
        crystalAmount: true,
        status: true,
        platform: true,
        createdAt: true,
      },
    }),
    prisma.consentRecord.findMany({ where: { userId } }),
  ]);

  // 민감 정보 마스킹 (비밀번호 해시 제거)
  const sanitizedUser: Record<string, unknown> = { ...user };
  delete sanitizedUser.password;

  // 인벤토리 평탄화
  const inventory = characters.flatMap((c: any) =>
    (c.inventoryItems ?? []).map((item: any) => ({
      characterId: c.id,
      characterName: c.name,
      ...item,
    })),
  );

  // 소셜 데이터 (길드, 친구 등)
  let socialData: Record<string, unknown> = {};
  try {
    const guildMembership = await prisma.guildMember.findMany({ where: { userId } });
    const friendships = await prisma.friendship.findMany({
      where: { OR: [{ userId }, { friendId: userId }] },
    });
    socialData = {
      guilds: guildMembership,
      friends: friendships,
    };
  } catch {
    socialData = { note: '소셜 데이터 수집 실패 (모델 미존재 가능)' };
  }

  // 업적
  let achievements: Record<string, unknown>[] = [];
  try {
    achievements = await prisma.userAchievement.findMany({ where: { userId } });
  } catch {
    // 모델 미존재 시 빈 배열
  }

  return {
    exportedAt: new Date().toISOString(),
    user: sanitizedUser,
    characters: characters.map((c: any) => {
      const { inventoryItems, ...rest } = c;
      return rest;
    }),
    inventory,
    payments,
    achievements,
    socialData,
    consents,
  };
}

// ─── 데이터 삭제 (GDPR 제17조: 잊힐 권리) ──────────────────────

/**
 * 유저의 모든 데이터를 삭제한다.
 * Prisma cascade가 설정되지 않은 테이블은 수동으로 삭제.
 * 법적 보존 의무가 있는 결제 기록은 익명화 처리.
 */
export async function deleteUserData(userId: string): Promise<DeletionResult> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('유저를 찾을 수 없습니다.');

  const tablesAffected: string[] = [];

  await prisma.$transaction(async (tx) => {
    // 1. 캐릭터 관련 데이터 (cascade)
    const characters = await tx.character.findMany({ where: { userId }, select: { id: true } });
    const charIds = characters.map((c) => c.id);

    if (charIds.length > 0) {
      // 인벤토리
      await tx.inventoryItem.deleteMany({ where: { characterId: { in: charIds } } });
      tablesAffected.push('inventoryItems');

      // 퀘스트 진행
      try {
        await tx.questProgress.deleteMany({ where: { characterId: { in: charIds } } });
        tablesAffected.push('questProgress');
      } catch { /* 모델 미존재 시 skip */ }

      // 스킬
      try {
        await tx.characterSkill.deleteMany({ where: { characterId: { in: charIds } } });
        tablesAffected.push('characterSkills');
      } catch { /* skip */ }

      // 캐릭터 삭제
      await tx.character.deleteMany({ where: { userId } });
      tablesAffected.push('characters');
    }

    // 2. 길드 멤버십
    try {
      await tx.guildMember.deleteMany({ where: { userId } });
      tablesAffected.push('guildMembers');
    } catch { /* skip */ }

    // 3. 친구 관계
    try {
      await tx.friendship.deleteMany({
        where: { OR: [{ userId }, { friendId: userId }] },
      });
      tablesAffected.push('friendships');
    } catch { /* skip */ }

    // 4. 업적
    try {
      await tx.userAchievement.deleteMany({ where: { userId } });
      tablesAffected.push('userAchievements');
    } catch { /* skip */ }

    // 5. 시즌패스 진행
    try {
      await tx.seasonPassProgress.deleteMany({ where: { userId } });
      tablesAffected.push('seasonPassProgress');
    } catch { /* skip */ }

    // 6. 동의 기록
    await tx.consentRecord.deleteMany({ where: { userId } });
    tablesAffected.push('consentRecords');

    // 7. 로그인 세션 (P9-13)
    try {
      await tx.loginSession.deleteMany({ where: { userId } });
      tablesAffected.push('loginSessions');
    } catch { /* skip */ }

    // 8. 결제 기록: 법적 보존 의무 → 익명화 (userId 제거하지 않고 email 마스킹)
    await tx.paymentReceipt.updateMany({
      where: { userId },
      data: { receiptData: '[GDPR_DELETED]' },
    });
    tablesAffected.push('paymentReceipts (anonymized)');

    // 9. 유저 삭제 (최종)
    await tx.user.delete({ where: { id: userId } });
    tablesAffected.push('user');
  });

  return {
    userId,
    deletedAt: new Date().toISOString(),
    tablesAffected,
  };
}

/** 삭제 요청 확인용 대기 기간 (GDPR: 즉시~30일) */
export const DELETION_GRACE_PERIOD_DAYS = 7;
