/**
 * P9-12 GDPR/개인정보 라우트
 *
 * - POST /api/gdpr/consent         — 동의 기록
 * - GET  /api/gdpr/consent/:userId — 동의 상태 조회
 * - POST /api/gdpr/export/:userId  — 개인정보 내보내기 (JSON)
 * - POST /api/gdpr/delete/:userId  — 데이터 삭제 요청
 */
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  recordConsent,
  getUserConsents,
  exportUserData,
  deleteUserData,
} from '../security/gdprManager';

// ─── 타입 ───────────────────────────────────────────────────────

interface ConsentBody {
  userId: string;
  consentType: string;
  granted: boolean;
  version: string;
}

interface UserIdParams {
  userId: string;
}

// ─── 라우트 ─────────────────────────────────────────────────────

export async function gdprRoutes(fastify: FastifyInstance): Promise<void> {

  // ── POST /api/gdpr/consent — 동의 기록/갱신 ──────────────────
  fastify.post('/api/gdpr/consent', async (
    request: FastifyRequest<{ Body: ConsentBody }>,
    reply: FastifyReply,
  ) => {
    const { userId, consentType, granted, version } = request.body;

    if (!userId || !consentType || typeof granted !== 'boolean' || !version) {
      return reply.status(400).send({ error: 'userId, consentType, granted, version은 필수입니다.' });
    }

    try {
      await recordConsent({ userId, consentType, granted, version });
      return reply.send({ success: true, consentType, granted });
    } catch (err) {
      const message = err instanceof Error ? err.message : '동의 기록 실패';
      return reply.status(400).send({ error: message });
    }
  });

  // ── GET /api/gdpr/consent/:userId — 동의 상태 조회 ───────────
  fastify.get('/api/gdpr/consent/:userId', async (
    request: FastifyRequest<{ Params: UserIdParams }>,
    reply: FastifyReply,
  ) => {
    const { userId } = request.params;

    try {
      const consents = await getUserConsents(userId);
      return reply.send({ userId, consents });
    } catch (err) {
      const message = err instanceof Error ? err.message : '동의 조회 실패';
      return reply.status(400).send({ error: message });
    }
  });

  // ── POST /api/gdpr/export/:userId — 개인정보 내보내기 ────────
  fastify.post('/api/gdpr/export/:userId', async (
    request: FastifyRequest<{ Params: UserIdParams }>,
    reply: FastifyReply,
  ) => {
    const { userId } = request.params;

    try {
      const dataPackage = await exportUserData(userId);

      // JSON 파일 다운로드 응답
      reply.header('Content-Type', 'application/json');
      reply.header(
        'Content-Disposition',
        `attachment; filename="gdpr_export_${userId}_${Date.now()}.json"`,
      );
      return reply.send(dataPackage);
    } catch (err) {
      const message = err instanceof Error ? err.message : '데이터 내보내기 실패';
      return reply.status(400).send({ error: message });
    }
  });

  // ── POST /api/gdpr/delete/:userId — 데이터 삭제 요청 ────────
  fastify.post('/api/gdpr/delete/:userId', async (
    request: FastifyRequest<{ Params: UserIdParams }>,
    reply: FastifyReply,
  ) => {
    const { userId } = request.params;

    try {
      const result = await deleteUserData(userId);
      return reply.send({
        success: true,
        message: '유저 데이터가 삭제되었습니다.',
        ...result,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : '데이터 삭제 실패';
      return reply.status(400).send({ error: message });
    }
  });
}
