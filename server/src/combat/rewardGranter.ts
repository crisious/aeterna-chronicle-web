/**
 * rewardGranter.ts — 전투 종료 시 서버 산정 보상(골드) 자동 지급
 *
 * SECURITY/경제: 기존에는 클라이언트가 /api/party/:id/reward 로 goldTotal 을 보내 지급 → 골드 발행 취약.
 * 이제 전투 종료(파티 승리) 시 서버가 rewardEngine.calculateRewards 로 산정한 goldPerMember 를
 * 파티 캐릭터에 직접 지급한다(클라이언트는 액수를 정하지 못함). HTTP(/combat/:id/tick)와
 * 소켓 틱 루프 양쪽에서 호출되며, combatId 당 1회만 지급한다(중복 방지).
 */
import { prisma } from '../db';
import type { RewardResult } from './rewardEngine';

/** 이미 보상을 지급한 combatId (중복 지급 방지) */
const rewardedCombats = new Set<string>();

/**
 * 파티 승리 보상(골드)을 파티 캐릭터에 1회 지급.
 * @param combatId      전투 세션 id (중복 지급 키)
 * @param partyCharacterIds 파티 참가자(캐릭터) id 목록
 * @param rewards       서버 산정 보상(goldPerMember 사용)
 */
export async function grantCombatGold(
  combatId: string,
  partyCharacterIds: string[],
  rewards: RewardResult,
): Promise<void> {
  if (
    rewardedCombats.has(combatId) ||
    partyCharacterIds.length === 0 ||
    rewards.goldPerMember <= 0
  ) {
    return;
  }
  // 지급 전 선점(동시 호출/재틱 중복 방지). 실패 시 해제하여 재시도 허용.
  rewardedCombats.add(combatId);
  try {
    await prisma.$transaction(
      partyCharacterIds.map((id) =>
        prisma.character.update({
          where: { id },
          data: { gold: { increment: rewards.goldPerMember } },
        }),
      ),
    );
  } catch (err) {
    rewardedCombats.delete(combatId);
    throw err;
  }
}

/** 전투 세션 정리 시 보상 기록도 정리(메모리 누수 방지). */
export function clearCombatReward(combatId: string): void {
  rewardedCombats.delete(combatId);
}
