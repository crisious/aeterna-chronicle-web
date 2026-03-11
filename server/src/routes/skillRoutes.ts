// ─── 스킬 트리 시스템 REST API (P5-02) ─────────────────────────
// GET    /api/skills/tree/:class     — 클래스별 스킬 트리
// GET    /api/skills/points/:userId  — 잔여 스킬 포인트
// GET    /api/skills/:userId         — 유저 보유 스킬
// POST   /api/skills/unlock          — 스킬 해금
// POST   /api/skills/levelup         — 스킬 레벨업
// PATCH  /api/skills/equip           — 슬롯 장착/해제
// POST   /api/skills/reset           — 스킬 리셋

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  getSkillTree,
  getUserSkills,
  getRemainingSkillPoints,
  unlockSkill,
  levelUpSkill,
  equipSkill,
  unequipSkill,
  resetSkills,
} from '../skill/skillEngine';

// ─── 요청 타입 ─────────────────────────────────────────────────

interface ClassParams {
  class: string;
}

interface UserIdParams {
  userId: string;
}

interface UnlockBody {
  userId: string;
  skillCode: string;
  characterLevel: number;
  characterClass: string;
}

interface LevelUpBody {
  userId: string;
  skillCode: string;
  characterLevel: number;
}

interface EquipBody {
  userId: string;
  skillCode: string;
  slotIndex: number;
  unequip?: boolean;
}

interface ResetBody {
  userId: string;
  characterLevel: number;
  currentGold: number;
}

// ─── 라우트 등록 ────────────────────────────────────────────────

export async function skillRoutes(fastify: FastifyInstance): Promise<void> {

  // GET /api/skills/tree/:class — 클래스별 스킬 트리
  fastify.get('/api/skills/tree/:class', async (
    request: FastifyRequest<{ Params: ClassParams }>,
    reply: FastifyReply,
  ) => {
    const className = request.params.class;
    const validClasses = ['ether_knight', 'memory_weaver', 'shadow_weaver'];
    if (!validClasses.includes(className)) {
      return reply.status(400).send({ error: '유효하지 않은 클래스', validClasses });
    }

    const tree = await getSkillTree(className);
    return reply.send({
      class: className,
      totalSkills: tree.length,
      tiers: {
        tier1: tree.filter((s) => s.tier === 1),
        tier2: tree.filter((s) => s.tier === 2),
        tier3: tree.filter((s) => s.tier === 3),
        tier4: tree.filter((s) => s.tier === 4),
      },
    });
  });

  // GET /api/skills/points/:userId — 잔여 스킬 포인트
  fastify.get('/api/skills/points/:userId', async (
    request: FastifyRequest<{ Params: UserIdParams; Querystring: { characterLevel?: string } }>,
    reply: FastifyReply,
  ) => {
    const { userId } = request.params;
    const query = request.query as Record<string, string>;
    const characterLevel = parseInt(query.characterLevel || '1', 10);

    const remaining = await getRemainingSkillPoints(userId, characterLevel);
    return reply.send({ userId, characterLevel, remainingPoints: remaining });
  });

  // GET /api/skills/:userId — 유저 보유 스킬
  fastify.get('/api/skills/:userId', async (
    request: FastifyRequest<{ Params: UserIdParams }>,
    reply: FastifyReply,
  ) => {
    const { userId } = request.params;
    const skills = await getUserSkills(userId);
    return reply.send({ userId, skills, count: skills.length });
  });

  // POST /api/skills/unlock — 스킬 해금
  fastify.post('/api/skills/unlock', async (
    request: FastifyRequest<{ Body: UnlockBody }>,
    reply: FastifyReply,
  ) => {
    const { userId, skillCode, characterLevel, characterClass } = request.body;

    if (!userId || !skillCode || !characterLevel || !characterClass) {
      return reply.status(400).send({ error: '필수 필드 누락: userId, skillCode, characterLevel, characterClass' });
    }

    const result = await unlockSkill(userId, skillCode, characterLevel, characterClass);
    if (!result.success) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send({ success: true, message: `스킬 [${skillCode}] 해금 완료` });
  });

  // POST /api/skills/levelup — 스킬 레벨업
  fastify.post('/api/skills/levelup', async (
    request: FastifyRequest<{ Body: LevelUpBody }>,
    reply: FastifyReply,
  ) => {
    const { userId, skillCode, characterLevel } = request.body;

    if (!userId || !skillCode || !characterLevel) {
      return reply.status(400).send({ error: '필수 필드 누락: userId, skillCode, characterLevel' });
    }

    const result = await levelUpSkill(userId, skillCode, characterLevel);
    if (!result.success) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send({ success: true, skillCode, newLevel: result.newLevel });
  });

  // PATCH /api/skills/equip — 슬롯 장착/해제
  fastify.patch('/api/skills/equip', async (
    request: FastifyRequest<{ Body: EquipBody }>,
    reply: FastifyReply,
  ) => {
    const { userId, skillCode, slotIndex, unequip } = request.body;

    if (!userId || !skillCode) {
      return reply.status(400).send({ error: '필수 필드 누락: userId, skillCode' });
    }

    if (unequip) {
      const result = await unequipSkill(userId, skillCode);
      if (!result.success) {
        return reply.status(400).send({ error: result.error });
      }
      return reply.send({ success: true, message: `스킬 [${skillCode}] 장착 해제` });
    }

    if (slotIndex === undefined || slotIndex === null) {
      return reply.status(400).send({ error: '슬롯 인덱스 필요 (0~5)' });
    }

    const result = await equipSkill(userId, skillCode, slotIndex);
    if (!result.success) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send({ success: true, message: `스킬 [${skillCode}] 슬롯 ${slotIndex}에 장착` });
  });

  // POST /api/skills/reset — 스킬 리셋
  fastify.post('/api/skills/reset', async (
    request: FastifyRequest<{ Body: ResetBody }>,
    reply: FastifyReply,
  ) => {
    const { userId, characterLevel, currentGold } = request.body;

    if (!userId || !characterLevel || currentGold === undefined) {
      return reply.status(400).send({ error: '필수 필드 누락: userId, characterLevel, currentGold' });
    }

    const result = await resetSkills(userId, characterLevel, currentGold);
    if (!result.success) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send({
      success: true,
      message: '스킬 리셋 완료',
      goldSpent: result.cost,
    });
  });
}
