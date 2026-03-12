/**
 * shareManager.ts — SNS 공유 API (P12-01)
 *
 * 업적/스크린샷/캐릭터 카드 공유. Open Graph 메타 + 공유 URL 생성.
 * 공유 대상: Twitter, Facebook, Discord, 커스텀 링크
 */
import { prisma } from '../db';
import { redisClient, redisConnected } from '../redis';
import crypto from 'crypto';

// ─── 타입 정의 ──────────────────────────────────────────────────

export type ShareType = 'achievement' | 'screenshot' | 'character_card' | 'build';

export interface SharePayload {
  userId: string;
  type: ShareType;
  /** 공유 대상 리소스 ID (업적 ID, 빌드 ID 등) */
  resourceId: string;
  /** 사용자 커스텀 메시지 (선택) */
  message?: string;
  /** 스크린샷 URL (screenshot 타입 시 필수) */
  imageUrl?: string;
}

export interface ShareResult {
  shareId: string;
  shareUrl: string;
  ogMeta: OpenGraphMeta;
  shortCode: string;
}

export interface OpenGraphMeta {
  title: string;
  description: string;
  image: string;
  url: string;
  type: string;
  siteName: string;
}

interface CharacterSummary {
  name: string;
  level: number;
  className: string;
  guildName?: string;
}

// ─── 상수 ───────────────────────────────────────────────────────

const BASE_URL = process.env.SHARE_BASE_URL || 'https://aeterna.game';
const SITE_NAME = '에테르나 크로니클';
const DEFAULT_IMAGE = `${BASE_URL}/assets/og-default.png`;
const SHARE_CODE_LENGTH = 8;
const SHARE_CACHE_TTL = 3600; // 1시간

// ─── 공유 코드 생성 ─────────────────────────────────────────────

function generateShareCode(): string {
  return crypto.randomBytes(SHARE_CODE_LENGTH / 2).toString('hex');
}

// ─── Open Graph 메타 생성 ───────────────────────────────────────

async function buildOgMeta(payload: SharePayload): Promise<OpenGraphMeta> {
  const base: OpenGraphMeta = {
    title: SITE_NAME,
    description: '',
    image: DEFAULT_IMAGE,
    url: '',
    type: 'website',
    siteName: SITE_NAME,
  };

  switch (payload.type) {
    case 'achievement': {
      const achievement = await prisma.achievement.findUnique({
        where: { id: payload.resourceId },
      });
      if (achievement) {
        base.title = `🏆 ${achievement.name} — ${SITE_NAME}`;
        base.description = `업적 달성: ${achievement.description}`;
        base.image = (achievement as any).iconUrl || DEFAULT_IMAGE;
      }
      break;
    }
    case 'screenshot': {
      base.title = `📸 스크린샷 — ${SITE_NAME}`;
      base.description = payload.message || '에테르나 크로니클의 한 장면';
      base.image = payload.imageUrl || DEFAULT_IMAGE;
      break;
    }
    case 'character_card': {
      const character = await getCharacterSummary(payload.userId);
      if (character) {
        base.title = `⚔️ ${character.name} (Lv.${character.level} ${character.className})`;
        base.description = character.guildName
          ? `길드: ${character.guildName} — ${SITE_NAME}`
          : `모험가 — ${SITE_NAME}`;
        base.image = `${BASE_URL}/api/share/card/${payload.userId}.png`;
      }
      break;
    }
    case 'build': {
      base.title = `🛡️ 빌드 공유 — ${SITE_NAME}`;
      base.description = payload.message || '나만의 빌드를 확인하세요!';
      break;
    }
  }

  return base;
}

// ─── 캐릭터 요약 조회 ───────────────────────────────────────────

async function getCharacterSummary(userId: string): Promise<CharacterSummary | null> {
  const save = await prisma.gameSave.findFirst({
    where: { userId },
    select: {
      state: true,
    },
    orderBy: { updatedAt: 'desc' },
  });
  if (!save) return null;

  const state = save.state as any;
  return {
    name: state?.characterName || '모험가',
    level: state?.level || 1,
    className: state?.className || '전사',
    guildName: state?.guildName,
  };
}

// ═══════════════════════════════════════════════════════════════
//  공개 API
// ═══════════════════════════════════════════════════════════════

/** 공유 링크 생성 */
export async function createShare(payload: SharePayload): Promise<ShareResult> {
  const shortCode = generateShareCode();
  const shareUrl = `${BASE_URL}/s/${shortCode}`;
  const ogMeta = await buildOgMeta(payload);
  ogMeta.url = shareUrl;

  // DB 저장 (JSON 필드에 메타 포함)
  const share = await prisma.share.create({
    data: {
      id: shortCode,
      userId: payload.userId,
      type: payload.type,
      resourceId: payload.resourceId,
      message: payload.message || null,
      imageUrl: payload.imageUrl || null,
      ogMeta: JSON.parse(JSON.stringify(ogMeta)),
      viewCount: 0,
    },
  });

  // Redis 캐시
  if (redisConnected()) {
    await redisClient.setex(
      `share:${shortCode}`,
      SHARE_CACHE_TTL,
      JSON.stringify({ ogMeta, type: payload.type, resourceId: payload.resourceId }),
    );
  }

  return {
    shareId: share.id,
    shareUrl,
    ogMeta,
    shortCode,
  };
}

/** 공유 링크 조회 (OG 메타 반환용) */
export async function getShare(shortCode: string): Promise<ShareResult | null> {
  // Redis 캐시 먼저
  if (redisConnected()) {
    const cached = await redisClient.get(`share:${shortCode}`);
    if (cached) {
      const data = JSON.parse(cached);
      return {
        shareId: shortCode,
        shareUrl: `${BASE_URL}/s/${shortCode}`,
        ogMeta: data.ogMeta,
        shortCode,
      };
    }
  }

  const share = await prisma.share.findUnique({ where: { id: shortCode } });
  if (!share) return null;

  // 조회수 증가
  await prisma.share.update({
    where: { id: shortCode },
    data: { viewCount: { increment: 1 } },
  });

  const ogMeta = share.ogMeta as unknown as OpenGraphMeta;
  return {
    shareId: share.id,
    shareUrl: `${BASE_URL}/s/${shortCode}`,
    ogMeta,
    shortCode,
  };
}

/** SNS 플랫폼별 공유 URL 생성 */
export function getSocialShareUrls(shareUrl: string, title: string): Record<string, string> {
  const encoded = encodeURIComponent(shareUrl);
  const encodedTitle = encodeURIComponent(title);

  return {
    twitter: `https://twitter.com/intent/tweet?url=${encoded}&text=${encodedTitle}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encoded}`,
    discord: shareUrl, // Discord은 URL 붙여넣기로 OG 프리뷰 자동 생성
    clipboard: shareUrl,
  };
}

/** 사용자 공유 이력 조회 */
export async function getUserShares(userId: string, limit = 20, offset = 0) {
  return prisma.share.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  });
}
