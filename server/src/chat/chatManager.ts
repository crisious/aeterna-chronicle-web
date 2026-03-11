/**
 * 채팅 관리자 — 채널 관리, 도배 방지, 메시지 이력
 * P4-14: 채팅 고도화
 *
 * 채널 타입: world, guild, party, whisper, system
 * 도배 방지: 3초 내 3회 이상 → 10초 뮤트
 * 메시지 이력: 최근 100건 Redis 캐시
 */
import { redisClient, redisConnected } from '../redis';
import { filterProfanity, FilterResult } from './profanityFilter';

// ─── 타입 ───────────────────────────────────────────────────────

export type ChannelType = 'world' | 'guild' | 'party' | 'whisper' | 'system';

export interface ChatMessage {
  id: string;
  channel: ChannelType;
  channelId: string;   // "world", "guild:{guildId}", "party:{partyId}", "whisper:{u1}:{u2}"
  senderId: string;
  senderName: string;
  content: string;
  timestamp: number;
  isFiltered: boolean;
}

export interface SendResult {
  success: boolean;
  message?: ChatMessage;
  error?: string;
  muted?: boolean;
  filterResult?: FilterResult;
}

// ─── 채널 멤버십 ────────────────────────────────────────────────

/** channelId → Set<userId> */
const channelMembers = new Map<string, Set<string>>();
/** userId → Set<channelId> */
const userChannels = new Map<string, Set<string>>();

/** 채널 입장 */
export function joinChannel(userId: string, channelId: string): void {
  if (!channelMembers.has(channelId)) channelMembers.set(channelId, new Set());
  channelMembers.get(channelId)!.add(userId);

  if (!userChannels.has(userId)) userChannels.set(userId, new Set());
  userChannels.get(userId)!.add(channelId);
}

/** 채널 퇴장 */
export function leaveChannel(userId: string, channelId: string): void {
  channelMembers.get(channelId)?.delete(userId);
  userChannels.get(userId)?.delete(channelId);
}

/** 유저의 모든 채널에서 퇴장 */
export function leaveAllChannels(userId: string): void {
  const channels = userChannels.get(userId);
  if (channels) {
    for (const ch of channels) {
      channelMembers.get(ch)?.delete(userId);
    }
    userChannels.delete(userId);
  }
}

/** 채널의 멤버 목록 */
export function getChannelMembers(channelId: string): string[] {
  return Array.from(channelMembers.get(channelId) ?? []);
}

// ─── 도배 방지 (Spam Guard) ─────────────────────────────────────

const SPAM_WINDOW_MS = 3_000;     // 3초
const SPAM_MAX_COUNT = 3;          // 3회
const MUTE_DURATION_MS = 10_000;   // 10초 뮤트

/** userId → 최근 메시지 타임스탬프 */
const spamTracker = new Map<string, number[]>();
/** userId → 뮤트 해제 시각 */
const muteUntil = new Map<string, number>();

/** 뮤트 상태 확인 */
export function isMuted(userId: string): boolean {
  const until = muteUntil.get(userId);
  if (!until) return false;
  if (Date.now() >= until) {
    muteUntil.delete(userId);
    return false;
  }
  return true;
}

/** 도배 체크 + 뮤트 적용 */
function checkSpam(userId: string): boolean {
  const now = Date.now();
  if (!spamTracker.has(userId)) spamTracker.set(userId, []);
  const timestamps = spamTracker.get(userId)!;

  // 윈도우 밖 제거
  while (timestamps.length > 0 && now - timestamps[0] > SPAM_WINDOW_MS) {
    timestamps.shift();
  }

  timestamps.push(now);

  if (timestamps.length >= SPAM_MAX_COUNT) {
    muteUntil.set(userId, now + MUTE_DURATION_MS);
    spamTracker.delete(userId);
    return true; // 뮤트됨
  }
  return false;
}

// ─── 메시지 이력 (Redis 캐시) ───────────────────────────────────

const MAX_HISTORY = 100;
/** 인메모리 fallback */
const memoryHistory = new Map<string, ChatMessage[]>();

/** 메시지 이력에 추가 */
async function pushHistory(channelId: string, msg: ChatMessage): Promise<void> {
  const key = `chat:history:${channelId}`;
  const json = JSON.stringify(msg);

  if (redisConnected) {
    try {
      await redisClient.lPush(key, json);
      await redisClient.lTrim(key, 0, MAX_HISTORY - 1);
      await redisClient.expire(key, 3600); // 1시간 TTL
      return;
    } catch {
      // fallback
    }
  }

  if (!memoryHistory.has(channelId)) memoryHistory.set(channelId, []);
  const history = memoryHistory.get(channelId)!;
  history.unshift(msg);
  if (history.length > MAX_HISTORY) history.pop();
}

/** 메시지 이력 조회 */
export async function getHistory(channelId: string, limit = 50): Promise<ChatMessage[]> {
  const key = `chat:history:${channelId}`;

  if (redisConnected) {
    try {
      const items = await redisClient.lRange(key, 0, limit - 1);
      return items.map((s) => JSON.parse(s) as ChatMessage);
    } catch {
      // fallback
    }
  }

  const history = memoryHistory.get(channelId) ?? [];
  return history.slice(0, limit);
}

// ─── 메시지 전송 ────────────────────────────────────────────────

let messageCounter = 0;

/**
 * 메시지 전송 처리: 도배 방지 → 욕설 필터 → 이력 저장
 */
export async function sendMessage(
  channel: ChannelType,
  channelId: string,
  senderId: string,
  senderName: string,
  content: string,
): Promise<SendResult> {
  // 1) 뮤트 확인
  if (isMuted(senderId)) {
    const remaining = (muteUntil.get(senderId) ?? 0) - Date.now();
    return {
      success: false,
      muted: true,
      error: `도배 방지로 ${Math.ceil(remaining / 1000)}초 동안 채팅이 제한됩니다.`,
    };
  }

  // 2) 도배 체크
  const spammed = checkSpam(senderId);
  if (spammed) {
    return {
      success: false,
      muted: true,
      error: '도배가 감지되어 10초 동안 채팅이 제한됩니다.',
    };
  }

  // 3) 욕설 필터
  const filterResult = filterProfanity(content);

  // 4) 메시지 생성
  const msg: ChatMessage = {
    id: `msg_${Date.now()}_${++messageCounter}`,
    channel,
    channelId,
    senderId,
    senderName,
    content: filterResult.filtered,
    timestamp: Date.now(),
    isFiltered: filterResult.hasProfanity,
  };

  // 5) 이력 저장
  await pushHistory(channelId, msg);

  return { success: true, message: msg, filterResult };
}
