/**
 * storyRoutes.ts — 스토리 챕터 + 컷씬 REST API (P6-10)
 *
 * 엔드포인트:
 *   GET  /api/story/chapters/:userId     — 챕터 진행도 조회
 *   POST /api/story/unlock/:chapter      — 챕터 해금
 *   GET  /api/story/cutscenes/:userId    — 시청 컷씬 목록 (갤러리)
 *   POST /api/story/cutscene/trigger     — 컷씬 트리거
 *   POST /api/story/flag                 — 스토리 플래그 저장
 *   GET  /api/story/flags/:userId        — 스토리 플래그 조회
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type {
  UnlockContext} from '../story/chapterManager';
import {
  getChapterProgress,
  unlockChapter,
  updateChapterStatus,
  setStoryFlag,
  getStoryFlags
} from '../story/chapterManager';
import type {
  CutsceneTrigger} from '../story/cutsceneRunner';
import {
  triggerCutscene,
  getSeenCutscenes,
  getChapterCutscenes
} from '../story/cutsceneRunner';

// ── 요청 타입 ───────────────────────────────────────────────────

interface ChapterParams { chapter: string; }
// 라우트 경로상 :userId 세그먼트는 남아 있으나 actor 로 신뢰하지 않는다(인증 행위자 사용).
interface UserIdParams { userId: string; }

// IDOR 방지: userId 는 요청에서 받지 않고 인증된 행위자(request.authUserId)를 actor 로 사용한다.
interface UnlockBody {
  level: number;
  completedChapters: number[];
  memoryFragments: number;
  classAdvancement: number;
  tutorialCompleted: boolean;
}

interface CutsceneTriggerBody {
  chapter: number;
  trigger: string;
}

interface FlagBody {
  chapter: number;
  key: string;
  value: string | number | boolean;
}

interface StatusBody {
  chapter: number;
  status: string;
}

interface FlagsQuery { chapter?: string; }

// ── 라우트 등록 ─────────────────────────────────────────────────

export async function storyRoutes(fastify: FastifyInstance): Promise<void> {

  /** GET /api/story/chapters/:userId — 전체 챕터 진행도 */
  fastify.get('/api/story/chapters/:userId', async (
    request: FastifyRequest<{ Params: UserIdParams }>,
    reply: FastifyReply,
  ) => {
    // IDOR 방지: params 의 userId 대신 인증된 행위자를 actor 로 사용한다.
    const userId = request.authUserId;
    if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });
    const progress = await getChapterProgress(userId);
    return reply.send({ chapters: progress });
  });

  /** POST /api/story/unlock/:chapter — 챕터 해금 */
  fastify.post('/api/story/unlock/:chapter', async (
    request: FastifyRequest<{ Params: ChapterParams; Body: UnlockBody }>,
    reply: FastifyReply,
  ) => {
    // IDOR 방지: body 의 userId 대신 인증된 행위자를 actor 로 사용한다.
    const userId = request.authUserId;
    if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });

    const chapter = parseInt(request.params.chapter, 10);
    const body = request.body;

    if (isNaN(chapter)) {
      return reply.status(400).send({ error: '필수 파라미터 누락' });
    }

    const context: UnlockContext = {
      level: body.level,
      completedChapters: body.completedChapters ?? [],
      memoryFragments: body.memoryFragments ?? 0,
      classAdvancement: body.classAdvancement ?? 0,
      tutorialCompleted: body.tutorialCompleted ?? false,
    };

    const result = await unlockChapter(userId, chapter, context);
    if (!result.success) {
      return reply.status(403).send({ error: result.reason });
    }
    return reply.send({ chapter, status: 'unlocked' });
  });

  /** POST /api/story/status — 챕터 상태 갱신 */
  fastify.post('/api/story/status', async (
    request: FastifyRequest<{ Body: StatusBody }>,
    reply: FastifyReply,
  ) => {
    // IDOR 방지: body 의 userId 대신 인증된 행위자를 actor 로 사용한다.
    const userId = request.authUserId;
    if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });

    const { chapter, status } = request.body;
    if (!chapter || !status) {
      return reply.status(400).send({ error: '필수 파라미터 누락' });
    }
    if (!['in_progress', 'completed'].includes(status)) {
      return reply.status(400).send({ error: '유효하지 않은 상태' });
    }
    await updateChapterStatus(userId, chapter, status as 'in_progress' | 'completed');
    return reply.send({ chapter, status });
  });

  /** GET /api/story/cutscenes/:userId — 시청 컷씬 목록 (갤러리) */
  fastify.get('/api/story/cutscenes/:userId', async (
    request: FastifyRequest<{ Params: UserIdParams }>,
    reply: FastifyReply,
  ) => {
    // IDOR 방지: params 의 userId 대신 인증된 행위자를 actor 로 사용한다.
    const userId = request.authUserId;
    if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });
    const seen = await getSeenCutscenes(userId);

    // 갤러리: 모든 컷씬 데이터 + 시청 여부
    const gallery = [1, 2, 3, 4, 5].flatMap(ch => {
      const cutscenes = getChapterCutscenes(ch);
      return cutscenes.map(cs => ({
        ...cs,
        seen: seen.includes(cs.id),
      }));
    });

    return reply.send({ cutscenes: gallery });
  });

  /** POST /api/story/cutscene/trigger — 컷씬 트리거 */
  fastify.post('/api/story/cutscene/trigger', async (
    request: FastifyRequest<{ Body: CutsceneTriggerBody }>,
    reply: FastifyReply,
  ) => {
    // IDOR 방지: body 의 userId 대신 인증된 행위자를 actor 로 사용한다.
    const userId = request.authUserId;
    if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });

    const { chapter, trigger } = request.body;
    if (!chapter || !trigger) {
      return reply.status(400).send({ error: '필수 파라미터 누락' });
    }

    const cutscene = await triggerCutscene(userId, chapter, trigger as CutsceneTrigger);
    if (!cutscene) {
      return reply.status(404).send({ error: '해당 컷씬 없음' });
    }
    return reply.send({ cutscene });
  });

  /** POST /api/story/flag — 스토리 플래그 저장 */
  fastify.post('/api/story/flag', async (
    request: FastifyRequest<{ Body: FlagBody }>,
    reply: FastifyReply,
  ) => {
    // IDOR 방지: body 의 userId 대신 인증된 행위자를 actor 로 사용한다.
    const userId = request.authUserId;
    if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });

    const { chapter, key, value } = request.body;
    if (!chapter || !key || value === undefined) {
      return reply.status(400).send({ error: '필수 파라미터 누락' });
    }

    await setStoryFlag(userId, chapter, key, value);
    return reply.send({ chapter, flag: { [key]: value } });
  });

  /** GET /api/story/flags/:userId — 스토리 플래그 조회 */
  fastify.get('/api/story/flags/:userId', async (
    request: FastifyRequest<{ Params: UserIdParams; Querystring: FlagsQuery }>,
    reply: FastifyReply,
  ) => {
    // IDOR 방지: params 의 userId 대신 인증된 행위자를 actor 로 사용한다.
    const userId = request.authUserId;
    if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });
    const query = request.query as FlagsQuery;
    const chapter = query.chapter ? parseInt(query.chapter, 10) : undefined;
    const flags = await getStoryFlags(userId, chapter);
    return reply.send({ flags });
  });
}
