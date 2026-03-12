/**
 * streamerMode.ts — 스트리머 모드 (P12-03)
 *
 * 관전 API + 오버레이 데이터 엔드포인트.
 * 실시간 전투/PvP 통계 스트림. OBS/Streamlabs 오버레이 호환.
 */
import { prisma } from '../db';
import { redisClient, redisConnected } from '../redis';

// ─── 타입 정의 ──────────────────────────────────────────────────

export interface StreamerSession {
  userId: string;
  streamKey: string;
  isLive: boolean;
  startedAt: string;
  viewerCount: number;
  settings: StreamerSettings;
}

export interface StreamerSettings {
  /** 개인정보 숨김 (길드명, 친구목록 등) */
  hidePersonalInfo: boolean;
  /** 채팅 오버레이 활성 */
  showChat: boolean;
  /** 전투 통계 오버레이 */
  showCombatStats: boolean;
  /** PvP 전적 오버레이 */
  showPvpStats: boolean;
  /** 장비 정보 공개 */
  showEquipment: boolean;
  /** 관전 허용 */
  allowSpectate: boolean;
  /** 관전 지연(초) — 스나이핑 방지 */
  spectateDelay: number;
}

export interface OverlayData {
  character: {
    name: string;
    level: number;
    className: string;
    hp: number;
    maxHp: number;
    mp: number;
    maxMp: number;
  };
  combat?: {
    dps: number;
    totalDamage: number;
    kills: number;
    deaths: number;
    comboDuration: number;
  };
  pvp?: {
    rating: number;
    wins: number;
    losses: number;
    winRate: number;
    rank: number;
  };
  dungeon?: {
    name: string;
    floor: number;
    timeElapsed: number;
    monstersKilled: number;
  };
  equipment?: Array<{
    slot: string;
    name: string;
    rarity: string;
    level: number;
  }>;
}

export interface SpectateSession {
  streamerId: string;
  spectatorId: string;
  joinedAt: string;
}

// ─── 상수 ───────────────────────────────────────────────────────

const STREAM_KEY_LENGTH = 16;
const OVERLAY_CACHE_TTL = 5;   // 5초 (실시간 데이터)
const SESSION_TTL = 86400;      // 24시간

const DEFAULT_SETTINGS: StreamerSettings = {
  hidePersonalInfo: true,
  showChat: true,
  showCombatStats: true,
  showPvpStats: true,
  showEquipment: false,
  allowSpectate: true,
  spectateDelay: 30,
};

// ─── 인메모리 세션 ──────────────────────────────────────────────

const activeSessions: Map<string, StreamerSession> = new Map();
const spectators: Map<string, SpectateSession[]> = new Map(); // streamerId → spectators

// ─── 스트림 키 생성 ─────────────────────────────────────────────

import crypto from 'crypto';

function generateStreamKey(): string {
  return crypto.randomBytes(STREAM_KEY_LENGTH / 2).toString('hex');
}

// ═══════════════════════════════════════════════════════════════
//  스트리머 세션 관리
// ═══════════════════════════════════════════════════════════════

/** 스트리머 모드 시작 */
export async function startStreaming(
  userId: string,
  settings?: Partial<StreamerSettings>,
): Promise<StreamerSession> {
  const existing = activeSessions.get(userId);
  if (existing?.isLive) return existing;

  const session: StreamerSession = {
    userId,
    streamKey: generateStreamKey(),
    isLive: true,
    startedAt: new Date().toISOString(),
    viewerCount: 0,
    settings: { ...DEFAULT_SETTINGS, ...settings },
  };

  activeSessions.set(userId, session);

  // Redis에 라이브 상태 저장
  if (redisConnected()) {
    await redisClient.setex(`streamer:live:${userId}`, SESSION_TTL, JSON.stringify(session));
    await redisClient.sadd('streamer:live_set', userId);
  }

  console.log(`[StreamerMode] ${userId} 스트리밍 시작`);
  return session;
}

/** 스트리머 모드 종료 */
export async function stopStreaming(userId: string): Promise<boolean> {
  const session = activeSessions.get(userId);
  if (!session) return false;

  session.isLive = false;
  activeSessions.delete(userId);
  spectators.delete(userId);

  if (redisConnected()) {
    await redisClient.del(`streamer:live:${userId}`);
    await redisClient.srem('streamer:live_set', userId);
    await redisClient.del(`streamer:overlay:${userId}`);
  }

  console.log(`[StreamerMode] ${userId} 스트리밍 종료`);
  return true;
}

/** 설정 업데이트 */
export function updateSettings(
  userId: string,
  settings: Partial<StreamerSettings>,
): StreamerSettings | null {
  const session = activeSessions.get(userId);
  if (!session) return null;

  session.settings = { ...session.settings, ...settings };
  return session.settings;
}

/** 라이브 스트리머 목록 */
export async function getLiveStreamers(): Promise<StreamerSession[]> {
  return Array.from(activeSessions.values()).filter((s) => s.isLive);
}

// ═══════════════════════════════════════════════════════════════
//  오버레이 데이터
// ═══════════════════════════════════════════════════════════════

/** 오버레이 데이터 업데이트 (게임 서버에서 주기적 호출) */
export async function updateOverlayData(userId: string, data: OverlayData): Promise<void> {
  const session = activeSessions.get(userId);
  if (!session?.isLive) return;

  // 설정에 따라 데이터 필터링
  const filtered = filterOverlayData(data, session.settings);

  if (redisConnected()) {
    await redisClient.setex(
      `streamer:overlay:${userId}`,
      OVERLAY_CACHE_TTL,
      JSON.stringify(filtered),
    );
  }
}

/** 오버레이 데이터 조회 (OBS/Streamlabs에서 polling) */
export async function getOverlayData(userId: string): Promise<OverlayData | null> {
  if (redisConnected()) {
    const cached = await redisClient.get(`streamer:overlay:${userId}`);
    if (cached) return JSON.parse(cached);
  }
  return null;
}

/** 설정 기반 데이터 필터링 */
function filterOverlayData(data: OverlayData, settings: StreamerSettings): OverlayData {
  const filtered = { ...data };

  if (!settings.showCombatStats) delete filtered.combat;
  if (!settings.showPvpStats) delete filtered.pvp;
  if (!settings.showEquipment) delete filtered.equipment;
  if (settings.hidePersonalInfo && filtered.character) {
    // 개인정보 마스킹은 클라이언트 레벨에서 처리
  }

  return filtered;
}

// ═══════════════════════════════════════════════════════════════
//  관전 시스템
// ═══════════════════════════════════════════════════════════════

/** 관전 시작 */
export function joinSpectate(streamerId: string, spectatorId: string): boolean {
  const session = activeSessions.get(streamerId);
  if (!session?.isLive || !session.settings.allowSpectate) return false;

  const list = spectators.get(streamerId) || [];
  if (list.some((s) => s.spectatorId === spectatorId)) return true; // 이미 관전 중

  list.push({
    streamerId,
    spectatorId,
    joinedAt: new Date().toISOString(),
  });
  spectators.set(streamerId, list);
  session.viewerCount = list.length;

  return true;
}

/** 관전 종료 */
export function leaveSpectate(streamerId: string, spectatorId: string): boolean {
  const list = spectators.get(streamerId);
  if (!list) return false;

  const idx = list.findIndex((s) => s.spectatorId === spectatorId);
  if (idx === -1) return false;

  list.splice(idx, 1);

  const session = activeSessions.get(streamerId);
  if (session) session.viewerCount = list.length;

  return true;
}

/** 관전자 목록 */
export function getSpectators(streamerId: string): SpectateSession[] {
  return spectators.get(streamerId) || [];
}

/** 세션 조회 */
export function getSession(userId: string): StreamerSession | null {
  return activeSessions.get(userId) || null;
}
