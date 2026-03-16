import { Prisma } from '@prisma/client';
import { prisma } from '../db';
import { redisClient, redisConnected } from '../redis';

// ─── 타입 정의 ──────────────────────────────────────────────────

/** 파티 멤버 구조 */
interface PartyMember {
  userId: string;
  role: 'leader' | 'member';
  joinedAt: string;
}

/** Json → PartyMember[] 안전 캐스팅 */
function toMembers(json: Prisma.JsonValue): PartyMember[] {
  return json as unknown as PartyMember[];
}

/** PartyMember[] → Prisma InputJsonValue */
function toJson(members: PartyMember[]): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(members)) as Prisma.InputJsonValue;
}

// ─── Redis 키 헬퍼 ──────────────────────────────────────────────

const ONLINE_KEY = 'social:online';                       // Hash: userId → timestamp
const ONLINE_TTL = 300;                                    // 5분 heartbeat 기준 만료

function userOnlineKey(userId: string): string {
  return `social:online:${userId}`;
}

// ═══════════════════════════════════════════════════════════════
//  친구 시스템
// ═══════════════════════════════════════════════════════════════

/** 친구 요청 발송 */
export async function sendFriendRequest(userId: string, friendId: string) {
  if (userId === friendId) {
    throw new Error('자기 자신에게 친구 요청을 보낼 수 없습니다.');
  }

  // 이미 관계가 존재하는지 확인
  const existing = await prisma.friendship.findFirst({
    where: {
      OR: [
        { userId, friendId },
        { userId: friendId, friendId: userId },
      ],
    },
  });

  if (existing) {
    if (existing.status === 'blocked') {
      throw new Error('차단된 사용자입니다.');
    }
    throw new Error('이미 친구 요청이 존재합니다.');
  }

  return prisma.friendship.create({
    data: { userId, friendId, status: 'pending' },
  });
}

/** 친구 요청 수락 */
export async function acceptFriendRequest(userId: string, friendId: string) {
  const request = await prisma.friendship.findUnique({
    where: { userId_friendId: { userId: friendId, friendId: userId } },
  });

  if (!request || request.status !== 'pending') {
    throw new Error('유효한 친구 요청이 없습니다.');
  }

  return prisma.friendship.update({
    where: { id: request.id },
    data: { status: 'accepted' },
  });
}

/** 친구 요청 거절 */
export async function rejectFriendRequest(userId: string, friendId: string) {
  const request = await prisma.friendship.findUnique({
    where: { userId_friendId: { userId: friendId, friendId: userId } },
  });

  if (!request || request.status !== 'pending') {
    throw new Error('유효한 친구 요청이 없습니다.');
  }

  return prisma.friendship.delete({ where: { id: request.id } });
}

/** 친구 삭제 */
export async function removeFriend(userId: string, friendId: string) {
  const relation = await prisma.friendship.findFirst({
    where: {
      OR: [
        { userId, friendId, status: 'accepted' },
        { userId: friendId, friendId: userId, status: 'accepted' },
      ],
    },
  });

  if (!relation) {
    throw new Error('친구 관계가 존재하지 않습니다.');
  }

  return prisma.friendship.delete({ where: { id: relation.id } });
}

/** 사용자 차단 */
export async function blockUser(userId: string, targetId: string) {
  const existing = await prisma.friendship.findFirst({
    where: {
      OR: [
        { userId, friendId: targetId },
        { userId: targetId, friendId: userId },
      ],
    },
  });

  if (existing) {
    return prisma.friendship.update({
      where: { id: existing.id },
      data: { userId, friendId: targetId, status: 'blocked' },
    });
  }

  return prisma.friendship.create({
    data: { userId, friendId: targetId, status: 'blocked' },
  });
}

/** 친구 목록 조회 (accepted 상태만) */
export async function getFriendList(userId: string) {
  const relations = await prisma.friendship.findMany({
    where: {
      OR: [
        { userId, status: 'accepted' },
        { friendId: userId, status: 'accepted' },
      ],
    },
  });

  const friendIds = relations.map((r) =>
    r.userId === userId ? r.friendId : r.userId,
  );

  const friends = await Promise.all(
    friendIds.map(async (fid) => ({
      userId: fid,
      online: await isUserOnline(fid),
    })),
  );

  return friends;
}

/** 받은 친구 요청 목록 */
export async function getPendingRequests(userId: string) {
  return prisma.friendship.findMany({
    where: { friendId: userId, status: 'pending' },
  });
}

// ═══════════════════════════════════════════════════════════════
//  온라인 상태 추적 (Redis)
// ═══════════════════════════════════════════════════════════════

/** 유저 온라인 등록 */
export async function setUserOnline(userId: string): Promise<void> {
  if (!redisConnected()) return;
  await redisClient.set(userOnlineKey(userId), Date.now().toString(), { EX: ONLINE_TTL });
  await redisClient.hSet(ONLINE_KEY, userId, Date.now().toString());
}

/** 유저 오프라인 처리 */
export async function setUserOffline(userId: string): Promise<void> {
  if (!redisConnected()) return;
  await redisClient.del(userOnlineKey(userId));
  await redisClient.hDel(ONLINE_KEY, userId);
}

/** 온라인 여부 확인 */
export async function isUserOnline(userId: string): Promise<boolean> {
  if (!redisConnected()) return false;
  const val = await redisClient.get(userOnlineKey(userId));
  return val !== null;
}

/** 온라인 heartbeat 갱신 */
export async function refreshOnlineStatus(userId: string): Promise<void> {
  if (!redisConnected()) return;
  await redisClient.set(userOnlineKey(userId), Date.now().toString(), { EX: ONLINE_TTL });
}

// ═══════════════════════════════════════════════════════════════
//  파티 시스템
// ═══════════════════════════════════════════════════════════════

/** 파티 생성 */
export async function createParty(leaderId: string, name?: string) {
  return prisma.party.create({
    data: {
      leaderId,
      name: name ?? null,
      status: 'open',
      members: {
        create: {
          userId: leaderId,
          role: 'leader',
        },
      },
    },
    include: { members: true },
  });
}

/** 파티 참가 */
export async function joinParty(partyId: string, userId: string) {
  const party = await prisma.party.findUnique({
    where: { id: partyId },
    include: { members: true },
  });
  if (!party) throw new Error('파티를 찾을 수 없습니다.');

  if (party.members.some((m) => m.userId === userId)) {
    throw new Error('이미 파티에 참가 중입니다.');
  }
  if (party.members.length >= party.maxSize) {
    throw new Error('파티가 가득 찼습니다.');
  }
  if (party.status === 'in_dungeon') {
    throw new Error('던전 진행 중인 파티에는 참가할 수 없습니다.');
  }

  const newMemberCount = party.members.length + 1;
  const newStatus = newMemberCount >= party.maxSize ? 'full' : 'open';

  return prisma.party.update({
    where: { id: partyId },
    data: {
      status: newStatus,
      members: {
        create: { userId, role: 'member' },
      },
    },
    include: { members: true },
  });
}

/** 파티 탈퇴 */
export async function leaveParty(partyId: string, userId: string) {
  const party = await prisma.party.findUnique({
    where: { id: partyId },
    include: { members: true },
  });
  if (!party) throw new Error('파티를 찾을 수 없습니다.');

  const member = party.members.find((m) => m.userId === userId);
  if (!member) throw new Error('파티 멤버가 아닙니다.');

  // 리더가 나가면 파티 해산
  if (party.leaderId === userId) {
    await prisma.partyMember.deleteMany({ where: { partyId } });
    return prisma.party.delete({ where: { id: partyId } });
  }

  await prisma.partyMember.delete({ where: { id: member.id } });
  const remainingCount = party.members.length - 1;
  const newStatus = remainingCount < party.maxSize ? 'open' : party.status;

  return prisma.party.update({
    where: { id: partyId },
    data: { status: newStatus },
    include: { members: true },
  });
}

/** 파티 해산 (리더 전용) */
export async function disbandParty(partyId: string, leaderId: string) {
  const party = await prisma.party.findUnique({ where: { id: partyId } });
  if (!party) throw new Error('파티를 찾을 수 없습니다.');
  if (party.leaderId !== leaderId) throw new Error('리더만 파티를 해산할 수 있습니다.');

  return prisma.party.delete({ where: { id: partyId } });
}

/** 리더 위임 */
export async function transferLeader(partyId: string, currentLeaderId: string, newLeaderId: string) {
  const party = await prisma.party.findUnique({
    where: { id: partyId },
    include: { members: true },
  });
  if (!party) throw new Error('파티를 찾을 수 없습니다.');
  if (party.leaderId !== currentLeaderId) throw new Error('리더만 위임할 수 있습니다.');

  if (!party.members.some((m) => m.userId === newLeaderId)) {
    throw new Error('위임 대상이 파티 멤버가 아닙니다.');
  }

  // 역할 교체: 새 리더 → leader, 기존 리더 → member
  await prisma.partyMember.updateMany({
    where: { partyId, userId: newLeaderId },
    data: { role: 'leader' },
  });
  await prisma.partyMember.updateMany({
    where: { partyId, userId: currentLeaderId },
    data: { role: 'member' },
  });

  return prisma.party.update({
    where: { id: partyId },
    data: { leaderId: newLeaderId },
    include: { members: true },
  });
}

/** 파티 상태 변경 (던전 입장 등) */
export async function setPartyStatus(partyId: string, status: string) {
  return prisma.party.update({
    where: { id: partyId },
    data: { status },
  });
}

/** 파티 조회 */
export async function getParty(partyId: string) {
  return prisma.party.findUnique({ where: { id: partyId }, include: { members: true } });
}

/** 유저가 속한 파티 조회 */
export async function getPartyByUserId(userId: string) {
  const member = await prisma.partyMember.findFirst({
    where: { userId },
    include: { party: { include: { members: true } } },
  });
  return member?.party ?? null;
}
