/**
 * chapterManager.ts — 5챕터 스토리 시스템 (P6-10)
 *
 * 역할:
 *   - 챕터 해금 검증 (레벨 + 선행 완료 + 기억 파편)
 *   - 챕터 진행 트래킹 (메인 퀘스트 완료 시 자동 갱신)
 *   - 스토리 플래그 저장 (선택지 결과 → 엔딩 분기 연동)
 */

import { prisma } from '../db';
import { Prisma } from '@prisma/client';

// ── 타입 정의 ──────────────────────────────────────────────────

export interface ChapterDefinition {
  chapter: number;
  region: string;
  requiredLevel: number;
  gateConditions: GateCondition[];
}

export interface GateCondition {
  type: 'chapter_complete' | 'tutorial_complete' | 'memory_fragment' | 'class_advancement';
  value: number | string;  // 챕터 번호, 파편 수, 전직 차수
}

export type ChapterStatus = 'locked' | 'unlocked' | 'in_progress' | 'completed';

export interface StoryFlag {
  key: string;
  value: string | number | boolean;
}

// ── 5챕터 정의 ──────────────────────────────────────────────────

export const CHAPTER_DEFINITIONS: ChapterDefinition[] = [
  {
    chapter: 1,
    region: '에레보스', // 칸텔라 마을 사건 → 기억 각성
    requiredLevel: 1,
    gateConditions: [
      { type: 'tutorial_complete', value: 1 },
    ],
  },
  {
    chapter: 2,
    region: '실반헤임', // 기억의 숲, 첫 번째 파편
    requiredLevel: 15,
    gateConditions: [
      { type: 'chapter_complete', value: 1 },
      { type: 'memory_fragment', value: 1 },
    ],
  },
  {
    chapter: 3,
    region: '솔라리스/브리탈리아', // 솔리안 유적, 이프리타
    requiredLevel: 30,
    gateConditions: [
      { type: 'chapter_complete', value: 2 },
      { type: 'class_advancement', value: 1 },
    ],
  },
  {
    chapter: 4,
    region: '아르겐티움/북방 영원빙원', // 제국 심장 + 기억석 사원
    requiredLevel: 50,
    gateConditions: [
      { type: 'chapter_complete', value: 3 },
      { type: 'memory_fragment', value: 3 },
    ],
  },
  {
    chapter: 5,
    region: '망각의 고원', // 최종 결전, 레테와의 대결
    requiredLevel: 70,
    gateConditions: [
      { type: 'chapter_complete', value: 4 },
      { type: 'memory_fragment', value: 4 },
    ],
  },
];

// ── 챕터 진행도 관리 ────────────────────────────────────────────

/** 유저의 전체 챕터 진행도 조회 */
export async function getChapterProgress(userId: string) {
  const progress = await prisma.chapterProgress.findMany({
    where: { userId },
    orderBy: { chapter: 'asc' },
  });

  // 없는 챕터는 locked 로 채움
  return CHAPTER_DEFINITIONS.map(def => {
    const existing = progress.find(p => p.chapter === def.chapter);
    return {
      chapter: def.chapter,
      region: def.region,
      requiredLevel: def.requiredLevel,
      status: (existing?.status ?? 'locked') as ChapterStatus,
      completedAt: existing?.completedAt ?? null,
      flags: (existing?.flags ?? {}) as Record<string, unknown>,
      cutscenesSeen: (existing?.cutscenesSeen ?? []) as string[],
    };
  });
}

/** 챕터 해금 시도 */
export async function unlockChapter(
  userId: string,
  chapter: number,
  context: UnlockContext,
): Promise<{ success: boolean; reason?: string }> {
  const def = CHAPTER_DEFINITIONS.find(d => d.chapter === chapter);
  if (!def) return { success: false, reason: '존재하지 않는 챕터' };

  // 레벨 검증
  if (context.level < def.requiredLevel) {
    return { success: false, reason: `레벨 ${def.requiredLevel} 이상 필요 (현재: ${context.level})` };
  }

  // 게이트 조건 검증
  for (const cond of def.gateConditions) {
    const check = checkGateCondition(cond, context);
    if (!check.passed) {
      return { success: false, reason: check.reason };
    }
  }

  // 이미 해금 여부 확인
  const existing = await prisma.chapterProgress.findUnique({
    where: { userId_chapter: { userId, chapter } },
  });

  if (existing && existing.status !== 'locked') {
    return { success: false, reason: '이미 해금된 챕터' };
  }

  // 해금 처리
  await prisma.chapterProgress.upsert({
    where: { userId_chapter: { userId, chapter } },
    create: {
      userId,
      chapter,
      status: 'unlocked',
      flags: {} as Prisma.InputJsonValue,
      cutscenesSeen: [] as unknown as Prisma.InputJsonValue,
    },
    update: {
      status: 'unlocked',
    },
  });

  return { success: true };
}

/** 챕터 상태 갱신 (진행 중 / 완료) */
export async function updateChapterStatus(
  userId: string,
  chapter: number,
  status: 'in_progress' | 'completed',
): Promise<void> {
  const data: Record<string, unknown> = { status };
  if (status === 'completed') {
    data.completedAt = new Date();
  }

  await prisma.chapterProgress.upsert({
    where: { userId_chapter: { userId, chapter } },
    create: {
      userId,
      chapter,
      status,
      completedAt: status === 'completed' ? new Date() : null,
      flags: {} as Prisma.InputJsonValue,
      cutscenesSeen: [] as unknown as Prisma.InputJsonValue,
    },
    update: data,
  });
}

/** 스토리 플래그 저장 (선택지 결과 기록) */
export async function setStoryFlag(
  userId: string,
  chapter: number,
  flagKey: string,
  flagValue: string | number | boolean,
): Promise<void> {
  const existing = await prisma.chapterProgress.findUnique({
    where: { userId_chapter: { userId, chapter } },
  });

  const currentFlags = (existing?.flags ?? {}) as Record<string, unknown>;
  currentFlags[flagKey] = flagValue;

  await prisma.chapterProgress.upsert({
    where: { userId_chapter: { userId, chapter } },
    create: {
      userId,
      chapter,
      status: 'in_progress',
      flags: currentFlags as Prisma.InputJsonValue,
      cutscenesSeen: [] as unknown as Prisma.InputJsonValue,
    },
    update: {
      flags: currentFlags as Prisma.InputJsonValue,
    },
  });
}

/** 스토리 플래그 조회 */
export async function getStoryFlags(
  userId: string,
  chapter?: number,
): Promise<Record<string, unknown>> {
  if (chapter != null) {
    const progress = await prisma.chapterProgress.findUnique({
      where: { userId_chapter: { userId, chapter } },
    });
    return (progress?.flags ?? {}) as Record<string, unknown>;
  }

  // 전 챕터 플래그 통합
  const all = await prisma.chapterProgress.findMany({
    where: { userId },
  });
  const merged: Record<string, unknown> = {};
  for (const p of all) {
    const flags = p.flags as Record<string, unknown>;
    for (const [k, v] of Object.entries(flags)) {
      merged[`ch${p.chapter}_${k}`] = v;
    }
  }
  return merged;
}

// ── 게이트 조건 검증 ────────────────────────────────────────────

export interface UnlockContext {
  level: number;
  completedChapters: number[];       // 완료된 챕터 번호 배열
  memoryFragments: number;            // 보유 기억 파편 수
  classAdvancement: number;           // 전직 차수 (0=미전직, 1=1차, 2=2차)
  tutorialCompleted: boolean;
}

function checkGateCondition(
  cond: GateCondition,
  ctx: UnlockContext,
): { passed: boolean; reason?: string } {
  switch (cond.type) {
    case 'tutorial_complete':
      return ctx.tutorialCompleted
        ? { passed: true }
        : { passed: false, reason: '튜토리얼 미완료' };

    case 'chapter_complete': {
      const reqChapter = Number(cond.value);
      return ctx.completedChapters.includes(reqChapter)
        ? { passed: true }
        : { passed: false, reason: `챕터 ${reqChapter} 미완료` };
    }

    case 'memory_fragment': {
      const reqFragments = Number(cond.value);
      return ctx.memoryFragments >= reqFragments
        ? { passed: true }
        : { passed: false, reason: `기억 파편 ${reqFragments}개 필요 (현재: ${ctx.memoryFragments})` };
    }

    case 'class_advancement': {
      const reqAdv = Number(cond.value);
      return ctx.classAdvancement >= reqAdv
        ? { passed: true }
        : { passed: false, reason: `${reqAdv}차 전직 필요` };
    }

    default:
      return { passed: false, reason: `알 수 없는 조건 타입: ${cond.type}` };
  }
}
