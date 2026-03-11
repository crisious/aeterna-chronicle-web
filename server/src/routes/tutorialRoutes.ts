/**
 * 튜토리얼 REST API 라우트
 * P4-13: 튜토리얼 시스템
 *
 * - GET  /api/tutorial/:userId           — 진행 상태
 * - POST /api/tutorial/:userId/complete  — 단계 완료
 * - POST /api/tutorial/:userId/skip      — 스킵
 * - POST /api/tutorial/:userId/reset     — 재시청
 */
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../db';

// ─── 튜토리얼 단계 정의 ─────────────────────────────────────────

export const TUTORIAL_STEPS = [
  { step: 0, name: 'not_started', label: '시작 전' },
  { step: 1, name: 'movement',    label: '이동 튜토리얼' },
  { step: 2, name: 'combat',      label: '전투 튜토리얼' },
  { step: 3, name: 'inventory',   label: '인벤토리 튜토리얼' },
  { step: 4, name: 'quest',       label: '퀘스트 튜토리얼' },
  { step: 5, name: 'social',      label: '소셜 튜토리얼' },
] as const;

export const MAX_TUTORIAL_STEP = 5;

// ─── 요청 타입 ──────────────────────────────────────────────────

interface UserIdParams {
  userId: string;
}

// ─── 라우트 등록 ────────────────────────────────────────────────

export async function tutorialRoutes(fastify: FastifyInstance): Promise<void> {
  // ── 진행 상태 조회 ────────────────────────────────────────────
  fastify.get(
    '/api/tutorial/:userId',
    async (request: FastifyRequest<{ Params: UserIdParams }>, reply: FastifyReply) => {
      const { userId } = request.params;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, tutorialStep: true },
      });

      if (!user) {
        return reply.status(404).send({ error: '사용자를 찾을 수 없습니다.' });
      }

      const currentStep = TUTORIAL_STEPS.find((s) => s.step === user.tutorialStep);
      const isCompleted = user.tutorialStep >= MAX_TUTORIAL_STEP;

      return reply.send({
        userId: user.id,
        tutorialStep: user.tutorialStep,
        currentStepName: currentStep?.name ?? 'unknown',
        currentStepLabel: currentStep?.label ?? '알 수 없음',
        isCompleted,
        totalSteps: MAX_TUTORIAL_STEP,
        steps: TUTORIAL_STEPS,
      });
    },
  );

  // ── 단계 완료 ─────────────────────────────────────────────────
  fastify.post(
    '/api/tutorial/:userId/complete',
    async (request: FastifyRequest<{ Params: UserIdParams }>, reply: FastifyReply) => {
      const { userId } = request.params;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, tutorialStep: true },
      });

      if (!user) {
        return reply.status(404).send({ error: '사용자를 찾을 수 없습니다.' });
      }

      if (user.tutorialStep >= MAX_TUTORIAL_STEP) {
        return reply.send({
          userId: user.id,
          tutorialStep: user.tutorialStep,
          message: '이미 모든 튜토리얼을 완료했습니다.',
          isCompleted: true,
        });
      }

      const nextStep = user.tutorialStep + 1;
      const updated = await prisma.user.update({
        where: { id: userId },
        data: { tutorialStep: nextStep },
        select: { id: true, tutorialStep: true },
      });

      const stepInfo = TUTORIAL_STEPS.find((s) => s.step === nextStep);

      return reply.send({
        userId: updated.id,
        tutorialStep: updated.tutorialStep,
        completedStep: stepInfo?.label ?? `Step ${nextStep}`,
        isCompleted: nextStep >= MAX_TUTORIAL_STEP,
      });
    },
  );

  // ── 스킵 ──────────────────────────────────────────────────────
  fastify.post(
    '/api/tutorial/:userId/skip',
    async (request: FastifyRequest<{ Params: UserIdParams }>, reply: FastifyReply) => {
      const { userId } = request.params;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, tutorialStep: true },
      });

      if (!user) {
        return reply.status(404).send({ error: '사용자를 찾을 수 없습니다.' });
      }

      const updated = await prisma.user.update({
        where: { id: userId },
        data: { tutorialStep: MAX_TUTORIAL_STEP },
        select: { id: true, tutorialStep: true },
      });

      return reply.send({
        userId: updated.id,
        tutorialStep: updated.tutorialStep,
        message: '튜토리얼을 스킵했습니다.',
        isCompleted: true,
      });
    },
  );

  // ── 재시청 (리셋) ─────────────────────────────────────────────
  fastify.post(
    '/api/tutorial/:userId/reset',
    async (request: FastifyRequest<{ Params: UserIdParams }>, reply: FastifyReply) => {
      const { userId } = request.params;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true },
      });

      if (!user) {
        return reply.status(404).send({ error: '사용자를 찾을 수 없습니다.' });
      }

      const updated = await prisma.user.update({
        where: { id: userId },
        data: { tutorialStep: 0 },
        select: { id: true, tutorialStep: true },
      });

      return reply.send({
        userId: updated.id,
        tutorialStep: updated.tutorialStep,
        message: '튜토리얼이 초기화되었습니다. 재시청 가능합니다.',
        isCompleted: false,
      });
    },
  );
}
