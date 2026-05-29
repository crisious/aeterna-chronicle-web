/**
 * 펫 시스템 REST API 라우트
 */
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../db';
import { summonPet, dismissPet, feedPet, evolvePet } from '../pet/petEngine';
import { PET_SKILLS, PET_SPECIES } from '../pet/petSeeds';

// ─── 타입 정의 ──────────────────────────────────────────────────

interface UserIdParams { userId: string; }
interface PetIdParams  { petId: string; }
// 펫 변경 요청 body — actor 식별자(ownerId)는 신뢰하지 않으므로 제거하고 인증된 행위자를 사용
interface SummonBody   { petId: string; }
interface DismissBody  { petId: string; }
interface FeedBody     { petId: string; }
interface EvolveBody   { petId: string; }

// ─── 라우트 등록 ────────────────────────────────────────────────

export async function petRoutes(fastify: FastifyInstance) {

  /** GET /api/pets/:userId — 보유 펫 목록 */
  fastify.get('/api/pets/:userId', async (
    request: FastifyRequest<{ Params: UserIdParams }>,
    reply: FastifyReply,
  ) => {
    // 경로의 userId 는 공격자 제어 식별자이므로 신뢰하지 않고 인증된 행위자를 사용
    const userId = request.authUserId;
    if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });
    const pets = await prisma.pet.findMany({
      where: { ownerId: userId },
      orderBy: { createdAt: 'desc' },
    });
    return { success: true, data: pets };
  });

  /** GET /api/pets/skills — 전체 스킬 목록 (시드 데이터) */
  fastify.get('/api/pets/skills', async (_request, _reply) => {
    // DB에 시드된 스킬 조회
    const skills = await prisma.petSkill.findMany({ orderBy: { unlockLevel: 'asc' } });
    // DB가 비어 있으면 시드 데이터 반환
    if (skills.length === 0) {
      return { success: true, data: PET_SKILLS, source: 'seed' };
    }
    return { success: true, data: skills };
  });

  /** GET /api/pets/species — 전체 펫 종 목록 (시드 데이터) */
  fastify.get('/api/pets/species', async (_request, _reply) => {
    return { success: true, data: PET_SPECIES };
  });

  /** GET /api/pets/detail/:petId — 펫 상세 */
  fastify.get('/api/pets/detail/:petId', async (
    request: FastifyRequest<{ Params: PetIdParams }>,
    reply: FastifyReply,
  ) => {
    // petId 는 공격자 제어 식별자이며 펫은 유저 소유 리소스이므로 소유권을 검증
    const userId = request.authUserId;
    if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });
    const { petId } = request.params;
    const pet = await prisma.pet.findUnique({ where: { id: petId } });
    if (!pet) return { success: false, error: '펫을 찾을 수 없습니다.' };
    if (pet.ownerId !== userId) {
      return reply.status(403).send({ error: '해당 펫에 접근할 권한이 없습니다.' });
    }
    return { success: true, data: pet };
  });

  /** POST /api/pets/summon — 펫 소환 */
  fastify.post('/api/pets/summon', async (
    request: FastifyRequest<{ Body: SummonBody }>,
    reply: FastifyReply,
  ) => {
    try {
      // ownerId 는 신뢰하지 않고 인증된 행위자를 actor 로 사용
      const userId = request.authUserId;
      if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });
      const { petId } = request.body;
      const pet = await summonPet(userId, petId);
      return { success: true, data: pet };
    } catch (err) {
      reply.code(400);
      return { success: false, error: (err as Error).message };
    }
  });

  /** POST /api/pets/dismiss — 펫 해제 */
  fastify.post('/api/pets/dismiss', async (
    request: FastifyRequest<{ Body: DismissBody }>,
    reply: FastifyReply,
  ) => {
    try {
      // ownerId 는 신뢰하지 않고 인증된 행위자를 actor 로 사용
      const userId = request.authUserId;
      if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });
      const { petId } = request.body;
      const pet = await dismissPet(userId, petId);
      return { success: true, data: pet };
    } catch (err) {
      reply.code(400);
      return { success: false, error: (err as Error).message };
    }
  });

  /** POST /api/pets/feed — 먹이 주기 (유대감 +5) */
  fastify.post('/api/pets/feed', async (
    request: FastifyRequest<{ Body: FeedBody }>,
    reply: FastifyReply,
  ) => {
    try {
      // ownerId 는 신뢰하지 않고 인증된 행위자를 actor 로 사용
      const userId = request.authUserId;
      if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });
      const { petId } = request.body;
      const pet = await feedPet(userId, petId);
      return { success: true, data: pet };
    } catch (err) {
      reply.code(400);
      return { success: false, error: (err as Error).message };
    }
  });

  /** POST /api/pets/evolve — 등급 진화 */
  fastify.post('/api/pets/evolve', async (
    request: FastifyRequest<{ Body: EvolveBody }>,
    reply: FastifyReply,
  ) => {
    try {
      // ownerId 는 신뢰하지 않고 인증된 행위자를 actor 로 사용
      const userId = request.authUserId;
      if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });
      const { petId } = request.body;
      const pet = await evolvePet(userId, petId);
      return { success: true, data: pet };
    } catch (err) {
      reply.code(400);
      return { success: false, error: (err as Error).message };
    }
  });
}
