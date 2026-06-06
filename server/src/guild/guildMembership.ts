/**
 * guildMembership.ts — 길드원 여부 검증 헬퍼  [SECURITY-IDOR]
 *
 * 소켓/REST 핸들러가 "이 actor(socket.data.userId)가 정말 그 길드 소속인가"를 검증해
 * 타 길드 명의 행위(선전포고·거점공격·길드채팅·룸 도청)를 차단하는 데 쓴다.
 */
import { prisma } from '../db';

/** userId 가 guildId 의 길드원이면 true. */
export async function isGuildMember(guildId: string, userId: string): Promise<boolean> {
  if (!guildId || !userId) return false;
  const member = await prisma.guildMember.findUnique({
    where: { guildId_userId: { guildId, userId } },
  });
  return member !== null;
}
