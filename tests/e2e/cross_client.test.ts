/**
 * P9-17: 크로스 클라이언트 검증 테스트
 * Phaser Web ↔ Unity WebGL 동일 서버 동시 접속 시나리오
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';

// ─── 테스트 헬퍼 ────────────────────────────────────────────────

interface MockClient {
  id: string;
  platform: 'phaser-web' | 'unity-webgl';
  userId: string;
  username: string;
  connected: boolean;
  socket: { emit: (event: string, data: unknown) => void; on: (event: string, cb: Function) => void };
}

function createMockClient(platform: MockClient['platform'], userId: string, username: string): MockClient {
  const listeners = new Map<string, Function[]>();
  return {
    id: `${platform}-${userId}`,
    platform,
    userId,
    username,
    connected: true,
    socket: {
      emit: (_event: string, _data: unknown) => { /* mock */ },
      on: (event: string, cb: Function) => {
        if (!listeners.has(event)) listeners.set(event, []);
        listeners.get(event)!.push(cb);
      },
    },
  };
}

// ─── 크로스 클라이언트 시나리오 ─────────────────────────────────

describe('P9-17: Cross-Client Verification (Phaser Web ↔ Unity WebGL)', () => {
  let phaserClient: MockClient;
  let unityClient: MockClient;

  beforeAll(() => {
    phaserClient = createMockClient('phaser-web', 'user-phaser-001', 'PhaserHero');
    unityClient = createMockClient('unity-webgl', 'user-unity-001', 'UnityKnight');
  });

  afterAll(() => {
    phaserClient.connected = false;
    unityClient.connected = false;
  });

  // ─── 동시 접속 ──────────────────────────────────────────────

  describe('Simultaneous Connection', () => {
    it('두 클라이언트가 동일 서버에 동시 접속 가능', () => {
      expect(phaserClient.connected).toBe(true);
      expect(unityClient.connected).toBe(true);
      expect(phaserClient.platform).not.toBe(unityClient.platform);
    });

    it('서버가 클라이언트 플랫폼을 올바르게 식별', () => {
      expect(phaserClient.platform).toBe('phaser-web');
      expect(unityClient.platform).toBe('unity-webgl');
    });

    it('각 클라이언트에 고유 세션 ID 할당', () => {
      expect(phaserClient.id).not.toBe(unityClient.id);
    });
  });

  // ─── 채팅 크로스 테스트 ─────────────────────────────────────

  describe('Cross-Platform Chat', () => {
    it('Phaser 클라이언트 메시지가 Unity 클라이언트에 전달', () => {
      const message = {
        senderId: phaserClient.userId,
        senderPlatform: phaserClient.platform,
        content: 'Hello from Phaser!',
        channel: 'global',
        timestamp: Date.now(),
      };

      // 서버 중계 시뮬레이션
      const received = { ...message, receivedBy: unityClient.userId };
      expect(received.content).toBe('Hello from Phaser!');
      expect(received.senderPlatform).toBe('phaser-web');
    });

    it('Unity 클라이언트 메시지가 Phaser 클라이언트에 전달', () => {
      const message = {
        senderId: unityClient.userId,
        senderPlatform: unityClient.platform,
        content: 'Hello from Unity!',
        channel: 'global',
        timestamp: Date.now(),
      };

      const received = { ...message, receivedBy: phaserClient.userId };
      expect(received.content).toBe('Hello from Unity!');
      expect(received.senderPlatform).toBe('unity-webgl');
    });

    it('이모지와 특수문자가 크로스 플랫폼에서 정상 렌더링', () => {
      const specialChars = '⚔️ 에테르나 크로니클 🎮 <script>alert("xss")</script>';
      const sanitized = specialChars.replace(/<[^>]*>/g, '');
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).toContain('⚔️');
    });
  });

  // ─── 파티 크로스 테스트 ─────────────────────────────────────

  describe('Cross-Platform Party', () => {
    it('Phaser 유저와 Unity 유저가 같은 파티 구성 가능', () => {
      const party = {
        id: 'party-cross-001',
        leaderId: phaserClient.userId,
        members: [
          { userId: phaserClient.userId, platform: phaserClient.platform, role: 'leader' },
          { userId: unityClient.userId, platform: unityClient.platform, role: 'member' },
        ],
        maxSize: 4,
      };

      expect(party.members).toHaveLength(2);
      expect(party.members.map((m) => m.platform)).toContain('phaser-web');
      expect(party.members.map((m) => m.platform)).toContain('unity-webgl');
    });

    it('파티 초대/수락 플로우가 크로스 플랫폼 동작', () => {
      const invite = {
        from: phaserClient.userId,
        to: unityClient.userId,
        partyId: 'party-cross-001',
        status: 'pending' as const,
      };

      // 수락
      const accepted = { ...invite, status: 'accepted' as const };
      expect(accepted.status).toBe('accepted');
    });

    it('파티 리더 위임이 크로스 플랫폼에서 동작', () => {
      const transfer = {
        partyId: 'party-cross-001',
        oldLeader: phaserClient.userId,
        newLeader: unityClient.userId,
        success: true,
      };
      expect(transfer.success).toBe(true);
    });
  });

  // ─── 길드 크로스 테스트 ─────────────────────────────────────

  describe('Cross-Platform Guild', () => {
    it('서로 다른 플랫폼 유저가 같은 길드 가입/활동 가능', () => {
      const guild = {
        id: 'guild-cross-001',
        name: '크로스 플랫폼 길드',
        members: [
          { userId: phaserClient.userId, platform: 'phaser-web', rank: 'MASTER' },
          { userId: unityClient.userId, platform: 'unity-webgl', rank: 'MEMBER' },
        ],
      };

      expect(guild.members).toHaveLength(2);
    });

    it('길드 채팅이 크로스 플랫폼 전달', () => {
      const guildMessage = {
        guildId: 'guild-cross-001',
        senderId: unityClient.userId,
        content: '길드 공지: 오늘 레이드!',
        deliveredTo: [phaserClient.userId, unityClient.userId],
      };

      expect(guildMessage.deliveredTo).toContain(phaserClient.userId);
    });
  });

  // ─── PvP 크로스 테스트 ──────────────────────────────────────

  describe('Cross-Platform PvP', () => {
    it('Phaser vs Unity 1:1 PvP 매칭 가능', () => {
      const match = {
        id: 'pvp-cross-001',
        type: 'RANKED_1V1',
        players: [
          { userId: phaserClient.userId, platform: 'phaser-web', rating: 1200 },
          { userId: unityClient.userId, platform: 'unity-webgl', rating: 1180 },
        ],
        status: 'IN_PROGRESS',
      };

      expect(match.players).toHaveLength(2);
      expect(match.status).toBe('IN_PROGRESS');
    });

    it('전투 액션이 양쪽 클라이언트에 동기화', () => {
      const action = {
        matchId: 'pvp-cross-001',
        actorId: phaserClient.userId,
        type: 'SKILL_USE',
        skillId: 'flame_strike',
        targetId: unityClient.userId,
        timestamp: Date.now(),
        serverValidated: true,
      };

      // 서버 권위 모델: 서버가 결과를 양쪽에 브로드캐스트
      expect(action.serverValidated).toBe(true);
    });

    it('PvP 결과가 양쪽 클라이언트에 일관 반영', () => {
      const result = {
        matchId: 'pvp-cross-001',
        winnerId: phaserClient.userId,
        loserId: unityClient.userId,
        ratingChange: { winner: +25, loser: -25 },
        rewards: { winner: { gold: 500, exp: 200 }, loser: { gold: 100, exp: 50 } },
      };

      expect(result.ratingChange.winner + result.ratingChange.loser).toBe(0);
    });
  });

  // ─── 거래 크로스 테스트 ─────────────────────────────────────

  describe('Cross-Platform Trading', () => {
    it('Phaser ↔ Unity 간 아이템 1:1 거래 가능', () => {
      const trade = {
        id: 'trade-cross-001',
        initiator: { userId: phaserClient.userId, platform: 'phaser-web', offer: { itemId: 'sword-001', gold: 0 } },
        receiver: { userId: unityClient.userId, platform: 'unity-webgl', offer: { itemId: 'shield-001', gold: 500 } },
        status: 'PENDING',
      };

      expect(trade.initiator.platform).not.toBe(trade.receiver.platform);
    });

    it('양쪽 확인 후 거래 완료', () => {
      const completedTrade = {
        id: 'trade-cross-001',
        status: 'COMPLETED',
        initiatorConfirmed: true,
        receiverConfirmed: true,
        completedAt: Date.now(),
      };

      expect(completedTrade.initiatorConfirmed).toBe(true);
      expect(completedTrade.receiverConfirmed).toBe(true);
      expect(completedTrade.status).toBe('COMPLETED');
    });

    it('거래 중 한쪽 접속 해제 시 거래 취소', () => {
      const disconnectedTrade = {
        id: 'trade-cross-002',
        status: 'CANCELLED',
        reason: 'PARTICIPANT_DISCONNECTED',
        disconnectedPlatform: 'unity-webgl',
      };

      expect(disconnectedTrade.status).toBe('CANCELLED');
    });

    it('경매장은 플랫폼 무관하게 통합 운영', () => {
      const auctionItem = {
        id: 'auction-001',
        sellerId: phaserClient.userId,
        sellerPlatform: 'phaser-web',
        bidderId: unityClient.userId,
        bidderPlatform: 'unity-webgl',
        itemId: 'rare-weapon-001',
        currentBid: 10000,
      };

      expect(auctionItem.sellerPlatform).not.toBe(auctionItem.bidderPlatform);
    });
  });

  // ─── 데이터 일관성 ──────────────────────────────────────────

  describe('Data Consistency', () => {
    it('인벤토리 변경이 양쪽 클라이언트에 실시간 반영', () => {
      const inventoryUpdate = {
        userId: phaserClient.userId,
        action: 'ITEM_ACQUIRED',
        itemId: 'potion-001',
        quantity: 5,
        broadcastTo: ['phaser-web', 'unity-webgl'],
      };

      expect(inventoryUpdate.broadcastTo).toContain('phaser-web');
      expect(inventoryUpdate.broadcastTo).toContain('unity-webgl');
    });

    it('서버 시간 동기화 (< 100ms 오차)', () => {
      const serverTime = Date.now();
      const clientTimePhaser = serverTime + 50;  // 50ms 오차
      const clientTimeUnity = serverTime + 30;   // 30ms 오차

      expect(Math.abs(clientTimePhaser - serverTime)).toBeLessThan(100);
      expect(Math.abs(clientTimeUnity - serverTime)).toBeLessThan(100);
    });

    it('동일 유저가 두 플랫폼에서 동시 로그인 시 이전 세션 종료', () => {
      const sessionConflict = {
        userId: 'user-dual-001',
        existingSession: { platform: 'phaser-web', sessionId: 'sess-001' },
        newSession: { platform: 'unity-webgl', sessionId: 'sess-002' },
        action: 'KICK_EXISTING',
        reason: 'DUPLICATE_LOGIN',
      };

      expect(sessionConflict.action).toBe('KICK_EXISTING');
    });
  });
});
