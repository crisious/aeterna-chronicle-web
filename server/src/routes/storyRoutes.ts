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

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  getChapterProgress,
  unlockChapter,
  updateChapterStatus,
  setStoryFlag,
  getStoryFlags,
  UnlockContext,
} from '../story/chapterManager';
import {
  triggerCutscene,
  getSeenCutscenes,
  getChapterCutscenes,
  CutsceneTrigger,
} from '../story/cutsceneRunner';

// ── 요청 타입 ───────────────────────────────────────────────────

interface UserIdParams { userId: string; }
interface ChapterParams { chapter: string; }

interface UnlockBody {
  userId: string;
  level: number;
  completedChapters: number[];
  memoryFragments: number;
  classAdvancement: number;
  tutorialCompleted: boolean;
}

interface CutsceneTriggerBody {
  userId: string;
  chapter: number;
  trigger: string;
}

interface FlagBody {
  userId: string;
  chapter: number;
  key: string;
  value: string | number | boolean;
}

interface StatusBody {
  userId: string;
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
    const { userId } = request.params;
    const progress = await getChapterProgress(userId);
    return reply.send({ chapters: progress });
  });

  /** POST /api/story/unlock/:chapter — 챕터 해금 */
  fastify.post('/api/story/unlock/:chapter', async (
    request: FastifyRequest<{ Params: ChapterParams; Body: UnlockBody }>,
    reply: FastifyReply,
  ) => {
    const chapter = parseInt(request.params.chapter, 10);
    const body = request.body;

    if (!body.userId || isNaN(chapter)) {
      return reply.status(400).send({ error: '필수 파라미터 누락' });
    }

    const context: UnlockContext = {
      level: body.level,
      completedChapters: body.completedChapters ?? [],
      memoryFragments: body.memoryFragments ?? 0,
      classAdvancement: body.classAdvancement ?? 0,
      tutorialCompleted: body.tutorialCompleted ?? false,
    };

    const result = await unlockChapter(body.userId, chapter, context);
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
    const { userId, chapter, status } = request.body;
    if (!userId || !chapter || !status) {
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
    const { userId } = request.params;
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
    const { userId, chapter, trigger } = request.body;
    if (!userId || !chapter || !trigger) {
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
    const { userId, chapter, key, value } = request.body;
    if (!userId || !chapter || !key || value === undefined) {
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
    const { userId } = request.params;
    const query = request.query as FlagsQuery;
    const chapter = query.chapter ? parseInt(query.chapter, 10) : undefined;
    const flags = await getStoryFlags(userId, chapter);
    return reply.send({ flags });
  });
}
