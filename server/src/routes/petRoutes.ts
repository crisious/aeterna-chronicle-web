/**
 * 펫 시스템 REST API 라우트
 */
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../db';
import { summonPet, dismissPet, feedPet, evolvePet, grantExp } from '../pet/petEngine';
import { PET_SKILLS, PET_SPECIES } from '../pet/petSeeds';

// ─── 타입 정의 ──────────────────────────────────────────────────

interface UserIdParams { userId: string; }
interface PetIdParams  { petId: string; }
interface SummonBody   { ownerId: string; petId: string; }
interface DismissBody  { ownerId: string; petId: string; }
interface FeedBody     { ownerId: string; petId: string; }
interface EvolveBody   { ownerId: string; petId: string; }

// ─── 라우트 등록 ────────────────────────────────────────────────

export async function petRoutes(fastify: FastifyInstance) {

  /** GET /api/pets/:userId — 보유 펫 목록 */
  fastify.get('/api/pets/:userId', async (
    request: FastifyRequest<{ Params: UserIdParams }>,
    _reply: FastifyReply,
  ) => {
    const { userId } = request.params;
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
    _reply: FastifyReply,
  ) => {
    const { petId } = request.params;
    const pet = await prisma.pet.findUnique({ where: { id: petId } });
    if (!pet) return { success: false, error: '펫을 찾을 수 없습니다.' };
    return { success: true, data: pet };
  });

  /** POST /api/pets/summon — 펫 소환 */
  fastify.post('/api/pets/summon', async (
    request: FastifyRequest<{ Body: SummonBody }>,
    reply: FastifyReply,
  ) => {
    try {
      const { ownerId, petId } = request.body;
      const pet = await summonPet(ownerId, petId);
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
      const { ownerId, petId } = request.body;
      const pet = await dismissPet(ownerId, petId);
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
      const { ownerId, petId } = request.body;
      const pet = await feedPet(ownerId, petId);
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
      const { ownerId, petId } = request.body;
      const pet = await evolvePet(ownerId, petId);
      return { success: true, data: pet };
    } catch (err) {
      reply.code(400);
      return { success: false, error: (err as Error).message };
    }
  });
}
