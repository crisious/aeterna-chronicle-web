/**
 * skillResolver.ts — 소유 스킬의 데미지 배율 해석 (서버 권위)  [SECURITY]
 *
 * raid 등 전투 sink 에서 클라가 skillId 를 보낼 때, 서버가 (a) 그 유저가 실제 소유한 스킬인지,
 * (b) 공격 가능한 active/ultimate 스킬인지 검증하고 Skill.damageScale(배율)을 반환한다.
 * 배율을 클라가 정하지 못하게 해, 임의 고배율 위조를 차단한다.
 *
 * SECURITY-TODO(후속): mpCost 차감·cooldown 적용은 별도 상태 관리가 필요해 미반영(호출빈도는
 * actionRateLimiter 가 캡). 현재는 "소유한 active 스킬의 서버 정의 배율"까지 보장한다.
 */
import { prisma } from '../db';

/**
 * userId 가 소유한 active/ultimate 스킬이면 그 damageScale(배율)을 반환, 아니면 null.
 * (미소유 / passive 스킬 → null → 호출자가 거부)
 */
export async function resolveOwnedSkillMultiplier(
  userId: string,
  skillId: string,
): Promise<number | null> {
  if (!userId || !skillId) return null;
  const playerSkill = await prisma.playerSkill.findFirst({
    where: { userId, skillId },
    include: { skill: { select: { type: true, damageScale: true } } },
  });
  if (!playerSkill || playerSkill.skill.type === 'passive') return null;
  return playerSkill.skill.damageScale;
}
