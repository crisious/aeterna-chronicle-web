/**
 * ugcGallery.ts — UGC 갤러리 (P12-05)
 *
 * 스크린샷/빌드 공유 게시판. 좋아요/신고.
 * Prisma 모델: UgcPost, UgcLike
 */
import { prisma } from '../db';

// ─── 타입 정의 ──────────────────────────────────────────────────

export type UgcPostType = 'screenshot' | 'build' | 'guide' | 'fanart';

export interface CreatePostInput {
  authorId: string;
  type: UgcPostType;
  title: string;
  description?: string;
  imageUrl?: string;
  /** 빌드 공유 시 장비/스킬 스냅샷 JSON */
  buildData?: Record<string, any>;
  tags?: string[];
}

export interface UgcPostView {
  id: string;
  authorId: string;
  authorName: string;
  type: UgcPostType;
  title: string;
  description: string | null;
  imageUrl: string | null;
  buildData: Record<string, any> | null;
  tags: string[];
  likeCount: number;
  viewCount: number;
  reportCount: number;
  isHidden: boolean;
  createdAt: string;
}

export interface UgcFeedOptions {
  type?: UgcPostType;
  sortBy?: 'latest' | 'popular' | 'trending';
  limit?: number;
  offset?: number;
  authorId?: string;
  tag?: string;
}

export type ReportReason = 'spam' | 'inappropriate' | 'harassment' | 'copyright' | 'other';

// ─── 상수 ───────────────────────────────────────────────────────

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const REPORT_HIDE_THRESHOLD = 5; // 신고 5건 → 자동 숨김
const TRENDING_HOURS = 48;        // 트렌딩 기준 시간

// ═══════════════════════════════════════════════════════════════
//  게시글 CRUD
// ═══════════════════════════════════════════════════════════════

/** 게시글 작성 */
export async function createPost(input: CreatePostInput): Promise<UgcPostView> {
  const post = await prisma.ugcPost.create({
    data: {
      authorId: input.authorId,
      type: input.type,
      title: input.title,
      description: input.description || null,
      imageUrl: input.imageUrl || null,
      buildData: input.buildData ? JSON.parse(JSON.stringify(input.buildData)) : undefined,
      tags: input.tags || [],
      likeCount: 0,
      viewCount: 0,
      reportCount: 0,
      isHidden: false,
    },
  });

  console.log(`[UGC] 게시글 작성: ${post.id} (${input.type}) by ${input.authorId}`);
  return toPostView(post);
}

/** 게시글 조회 (조회수 증가) */
export async function getPost(postId: string): Promise<UgcPostView | null> {
  const post = await prisma.ugcPost.findUnique({ where: { id: postId } });
  if (!post || post.isHidden) return null;

  // 조회수 비동기 증가
  prisma.ugcPost.update({
    where: { id: postId },
    data: { viewCount: { increment: 1 } },
  }).catch(() => {});

  return toPostView(post);
}

/** 게시글 삭제 (작성자만) */
export async function deletePost(postId: string, userId: string): Promise<boolean> {
  const post = await prisma.ugcPost.findUnique({ where: { id: postId } });
  if (!post || post.authorId !== userId) return false;

  await prisma.ugcPost.delete({ where: { id: postId } });
  // 관련 좋아요도 삭제
  await prisma.ugcLike.deleteMany({ where: { postId } });
  return true;
}

// ═══════════════════════════════════════════════════════════════
//  피드
// ═══════════════════════════════════════════════════════════════

/** 게시글 피드 조회 */
export async function getFeed(options: UgcFeedOptions = {}): Promise<UgcPostView[]> {
  const limit = Math.min(options.limit || DEFAULT_LIMIT, MAX_LIMIT);
  const offset = options.offset || 0;

  const where: any = { isHidden: false };
  if (options.type) where.type = options.type;
  if (options.authorId) where.authorId = options.authorId;
  if (options.tag) where.tags = { has: options.tag };

  let orderBy: any;
  switch (options.sortBy) {
    case 'popular':
      orderBy = { likeCount: 'desc' as const };
      break;
    case 'trending':
      where.createdAt = { gte: new Date(Date.now() - TRENDING_HOURS * 3600000) };
      orderBy = { likeCount: 'desc' as const };
      break;
    case 'latest':
    default:
      orderBy = { createdAt: 'desc' as const };
  }

  const posts = await prisma.ugcPost.findMany({
    where,
    orderBy,
    take: limit,
    skip: offset,
  });

  return posts.map(toPostView);
}

// ═══════════════════════════════════════════════════════════════
//  좋아요
// ═══════════════════════════════════════════════════════════════

/** 좋아요 토글 (이미 있으면 취소) */
export async function toggleLike(postId: string, userId: string): Promise<{ liked: boolean; likeCount: number }> {
  const existing = await prisma.ugcLike.findUnique({
    where: { postId_userId: { postId, userId } },
  });

  if (existing) {
    // 좋아요 취소
    await prisma.ugcLike.delete({
      where: { postId_userId: { postId, userId } },
    });
    const updated = await prisma.ugcPost.update({
      where: { id: postId },
      data: { likeCount: { decrement: 1 } },
    });
    return { liked: false, likeCount: updated.likeCount };
  } else {
    // 좋아요 추가
    await prisma.ugcLike.create({
      data: { postId, userId },
    });
    const updated = await prisma.ugcPost.update({
      where: { id: postId },
      data: { likeCount: { increment: 1 } },
    });
    return { liked: true, likeCount: updated.likeCount };
  }
}

/** 사용자의 좋아요 여부 확인 */
export async function hasLiked(postId: string, userId: string): Promise<boolean> {
  const like = await prisma.ugcLike.findUnique({
    where: { postId_userId: { postId, userId } },
  });
  return !!like;
}

// ═══════════════════════════════════════════════════════════════
//  신고
// ═══════════════════════════════════════════════════════════════

/** 게시글 신고 */
export async function reportPost(
  postId: string,
  reporterId: string,
  reason: ReportReason,
  detail?: string,
): Promise<{ reported: boolean; message: string }> {
  const post = await prisma.ugcPost.findUnique({ where: { id: postId } });
  if (!post) return { reported: false, message: '존재하지 않는 게시글입니다.' };
  if (post.authorId === reporterId) return { reported: false, message: '자신의 게시글은 신고할 수 없습니다.' };

  // 중복 신고 방지 (UgcReport 모델이 없으므로 reportCount만 사용)
  const updated = await prisma.ugcPost.update({
    where: { id: postId },
    data: {
      reportCount: { increment: 1 },
      // 신고 임계치 초과 시 자동 숨김
      isHidden: post.reportCount + 1 >= REPORT_HIDE_THRESHOLD ? true : undefined,
    },
  });

  if (updated.isHidden && !post.isHidden) {
    console.log(`[UGC] 자동 숨김: ${postId} (신고 ${updated.reportCount}건)`);
  }

  return { reported: true, message: '신고가 접수되었습니다.' };
}

/** GM 게시글 숨김/복원 */
export async function setPostVisibility(postId: string, isHidden: boolean): Promise<boolean> {
  const post = await prisma.ugcPost.findUnique({ where: { id: postId } });
  if (!post) return false;

  await prisma.ugcPost.update({
    where: { id: postId },
    data: { isHidden },
  });

  console.log(`[UGC] GM ${isHidden ? '숨김' : '복원'}: ${postId}`);
  return true;
}

// ─── 유틸 ───────────────────────────────────────────────────────

function toPostView(row: any): UgcPostView {
  return {
    id: row.id,
    authorId: row.authorId,
    authorName: row.authorName || row.authorId,
    type: row.type,
    title: row.title,
    description: row.description,
    imageUrl: row.imageUrl,
    buildData: row.buildData as Record<string, any> | null,
    tags: row.tags || [],
    likeCount: row.likeCount,
    viewCount: row.viewCount,
    reportCount: row.reportCount,
    isHidden: row.isHidden,
    createdAt: row.createdAt?.toISOString?.() || row.createdAt,
  };
}
