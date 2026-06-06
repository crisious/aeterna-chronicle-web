/**
 * skillResolver.ts — 소유 스킬의 데미지 배율·쿨다운 해석 (서버 권위)  [SECURITY]
 *
 * raid 등 전투 sink 에서 클라가 skillId 를 보낼 때, 서버가 (a) 그 유저가 실제 소유한 스킬인지,
 * (b) 공격 가능한 active/ultimate 스킬인지 검증하고 Skill.damageScale(배율)·cooldown(초)을 반환한다.
 * 배율/쿨다운을 클라가 정하지 못하게 해, 임의 고배율 위조·연사를 차단한다.
 *
 * mpCost 는 raid 의 per-session MP 풀(ManaManager)이 차감한다(combatEngine 동일 클래스 재사용).
 */
import { prisma } from '../db';

export interface ResolvedSkill {
  /** Skill.damageScale — 데미지 배율 */
  multiplier: number;
  /** Skill.cooldown — 재사용 대기(초). 0 이면 쿨다운 없음 */
  cooldown: number;
  /** Skill.mpCost — MP 소모량 */
  mpCost: number;
}

/**
 * userId 가 소유한 active/ultimate 스킬이면 {multiplier, cooldown, mpCost} 반환, 아니면 null.
 * (미소유 / passive 스킬 → null → 호출자가 거부)
 */
export async function resolveOwnedSkill(
  userId: string,
  skillId: string,
): Promise<ResolvedSkill | null> {
  if (!userId || !skillId) return null;
  const playerSkill = await prisma.playerSkill.findFirst({
    where: { userId, skillId },
    include: { skill: { select: { type: true, damageScale: true, cooldown: true, mpCost: true } } },
  });
  if (!playerSkill || playerSkill.skill.type === 'passive') return null;
  return {
    multiplier: playerSkill.skill.damageScale,
    cooldown: playerSkill.skill.cooldown,
    mpCost: playerSkill.skill.mpCost,
  };
}
