/**
 * Unit tests — CombatReconnectManager (Phase 54 / v1.0.0-rc.3)
 *
 * 보안 직결: setupCombatSocketHandler가 본 사이클에서 처음 production 활성화됨.
 * canControl이 권한 검증의 단일 게이트이므로, 회귀 시 멀티플레이어 전투에서
 * 권한 우회가 가능. 본 테스트가 게이트 정합성을 보장한다.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  CombatReconnectManager,
} from '../../../server/src/combat/combatReconnectManager';

describe('CombatReconnectManager', () => {
  let mgr: CombatReconnectManager;
  const GRACE_MS = 30_000;

  beforeEach(() => {
    mgr = new CombatReconnectManager(GRACE_MS);
  });

  // ─── register ────────────────────────────────────────────────
  describe('register', () => {
    it('첫 등록: connected=true 세션 반환, reconnected=false', () => {
      const result = mgr.register('c1', 'p1', 's1', 1000);
      expect(result.session.connected).toBe(true);
      expect(result.session.combatId).toBe('c1');
      expect(result.session.participantId).toBe('p1');
      expect(result.session.socketId).toBe('s1');
      expect(result.previousSocketId).toBeUndefined();
      expect(result.reconnected).toBe(false);
    });

    it('동일 socketId 재등록: previousSocketId 미반환', () => {
      mgr.register('c1', 'p1', 's1', 1000);
      const result = mgr.register('c1', 'p1', 's1', 2000);
      expect(result.previousSocketId).toBeUndefined();
    });

    it('다른 socketId로 동일 참가자 등록: previousSocketId 반환 (세션 탈취)', () => {
      mgr.register('c1', 'p1', 's1', 1000);
      const result = mgr.register('c1', 'p1', 's2', 2000);
      expect(result.previousSocketId).toBe('s1');
      expect(result.session.socketId).toBe('s2');
    });

    it('grace 윈도우 내 재접속: reconnected=true', () => {
      mgr.register('c1', 'p1', 's1', 1000);
      mgr.markSocketDisconnected('s1', 2000);
      const result = mgr.register('c1', 'p1', 's2', 2000 + GRACE_MS - 1);
      expect(result.reconnected).toBe(true);
    });

    it('grace 윈도우 만료 후 재등록: reconnected=false', () => {
      mgr.register('c1', 'p1', 's1', 1000);
      mgr.markSocketDisconnected('s1', 2000);
      const result = mgr.register('c1', 'p1', 's2', 2000 + GRACE_MS + 1);
      expect(result.reconnected).toBe(false);
    });

    it('빈 combatId/participantId/socketId: throw', () => {
      expect(() => mgr.register('', 'p1', 's1')).toThrow(/combatId/);
      expect(() => mgr.register('c1', '', 's1')).toThrow(/participantId/);
      expect(() => mgr.register('c1', 'p1', '')).toThrow(/socketId/);
      expect(() => mgr.register('   ', 'p1', 's1')).toThrow(/combatId/);
    });
  });

  // ─── canControl (보안 직결) ──────────────────────────────────
  describe('canControl — 권한 검증 게이트', () => {
    it('등록된 socketId만 통과', () => {
      mgr.register('c1', 'p1', 's1');
      expect(mgr.canControl('c1', 'p1', 's1')).toBe(true);
      expect(mgr.canControl('c1', 'p1', 's2')).toBe(false);
    });

    it('미등록 참가자: false', () => {
      mgr.register('c1', 'p1', 's1');
      expect(mgr.canControl('c1', 'p_unknown', 's1')).toBe(false);
    });

    it('미등록 전투: false', () => {
      mgr.register('c1', 'p1', 's1');
      expect(mgr.canControl('c_unknown', 'p1', 's1')).toBe(false);
    });

    it('disconnect 직후: false (connected=false)', () => {
      mgr.register('c1', 'p1', 's1', 1000);
      mgr.markSocketDisconnected('s1', 2000);
      expect(mgr.canControl('c1', 'p1', 's1')).toBe(false);
    });

    it('세션 탈취 후 이전 소켓: false, 신규 소켓: true', () => {
      mgr.register('c1', 'p1', 's1');
      mgr.register('c1', 'p1', 's2');
      expect(mgr.canControl('c1', 'p1', 's1')).toBe(false);
      expect(mgr.canControl('c1', 'p1', 's2')).toBe(true);
    });

    it('cross-combat 격리: c1의 권한이 c2에 영향 없음', () => {
      mgr.register('c1', 'p1', 's1');
      mgr.register('c2', 'p1', 's1');
      expect(mgr.canControl('c1', 'p1', 's1')).toBe(true);
      expect(mgr.canControl('c2', 'p1', 's1')).toBe(true);
    });
  });

  // ─── markSocketDisconnected ─────────────────────────────────
  describe('markSocketDisconnected', () => {
    it('한 소켓에 묶인 모든 참가자 disconnect', () => {
      mgr.register('c1', 'p1', 's1', 1000);
      mgr.register('c1', 'p2', 's1', 1000);
      const changed = mgr.markSocketDisconnected('s1', 5000);
      expect(changed).toHaveLength(2);
      expect(changed.every(s => !s.connected)).toBe(true);
      expect(changed.every(s => s.disconnectedAt === 5000)).toBe(true);
      expect(changed.every(s => s.expiresAt === 5000 + GRACE_MS)).toBe(true);
    });

    it('미등록 socketId: 빈 배열', () => {
      const changed = mgr.markSocketDisconnected('s_unknown');
      expect(changed).toHaveLength(0);
    });

    it('disconnect 후 keysBySocket 정리', () => {
      mgr.register('c1', 'p1', 's1');
      mgr.markSocketDisconnected('s1');
      // 같은 소켓 다시 disconnect: 이미 정리되어 빈 배열
      expect(mgr.markSocketDisconnected('s1')).toHaveLength(0);
    });
  });

  // ─── markCombatSocketDisconnected ───────────────────────────
  describe('markCombatSocketDisconnected', () => {
    it('지정 전투의 소켓만 disconnect, 다른 전투는 유지', () => {
      mgr.register('c1', 'p1', 's1', 1000);
      mgr.register('c2', 'p2', 's1', 1000);
      const changed = mgr.markCombatSocketDisconnected('c1', 's1', 5000);
      expect(changed).toHaveLength(1);
      expect(changed[0].combatId).toBe('c1');
      expect(mgr.canControl('c2', 'p2', 's1')).toBe(true);
    });
  });

  // ─── getPresence ─────────────────────────────────────────────
  describe('getPresence', () => {
    it('connected/recovering/expired 분류 정확', () => {
      mgr.register('c1', 'p1', 's1', 1000);  // connected
      mgr.register('c1', 'p2', 's2', 1000);
      mgr.markSocketDisconnected('s2', 2000); // recovering (grace 내)
      mgr.register('c1', 'p3', 's3', 1000);
      mgr.markSocketDisconnected('s3', 2000); // expired (grace 만료 후 조회)

      const presence = mgr.getPresence('c1', 2000 + GRACE_MS / 2);
      expect(presence.total).toBe(3);
      expect(presence.connectedCount).toBe(1);
      expect(presence.recoveringCount).toBe(2); // p2, p3 모두 grace 내
      expect(presence.expiredCount).toBe(0);

      const laterPresence = mgr.getPresence('c1', 2000 + GRACE_MS + 1);
      expect(laterPresence.expiredCount).toBe(2);
      expect(laterPresence.recoveringCount).toBe(0);
    });

    it('미등록 전투: 모두 0', () => {
      const p = mgr.getPresence('c_unknown');
      expect(p).toEqual({ total: 0, connectedCount: 0, recoveringCount: 0, expiredCount: 0 });
    });
  });

  // ─── isAbandoned ─────────────────────────────────────────────
  describe('isAbandoned', () => {
    it('전투에 참가자 없음: false', () => {
      expect(mgr.isAbandoned('c1')).toBe(false);
    });

    it('1명이라도 connected: false', () => {
      mgr.register('c1', 'p1', 's1');
      mgr.register('c1', 'p2', 's2');
      mgr.markSocketDisconnected('s2');
      expect(mgr.isAbandoned('c1')).toBe(false);
    });

    it('1명이라도 recovering(grace 내): false', () => {
      mgr.register('c1', 'p1', 's1', 1000);
      mgr.markSocketDisconnected('s1', 2000);
      expect(mgr.isAbandoned('c1', 2000 + GRACE_MS / 2)).toBe(false);
    });

    it('전원 expired: true', () => {
      mgr.register('c1', 'p1', 's1', 1000);
      mgr.markSocketDisconnected('s1', 2000);
      expect(mgr.isAbandoned('c1', 2000 + GRACE_MS + 1)).toBe(true);
    });
  });

  // ─── pruneExpired ────────────────────────────────────────────
  describe('pruneExpired', () => {
    it('grace 만료 세션만 제거, connected/recovering 유지', () => {
      mgr.register('c1', 'p1', 's1', 1000); // connected
      mgr.register('c1', 'p2', 's2', 1000);
      mgr.markSocketDisconnected('s2', 2000); // recovering at +halfGrace, expired at +graceMs+1
      mgr.register('c1', 'p3', 's3', 1000);
      mgr.markSocketDisconnected('s3', 2000); // 동일

      const removed = mgr.pruneExpired(2000 + GRACE_MS + 1);
      expect(removed).toHaveLength(2);
      expect(removed.every(s => !s.connected)).toBe(true);
      expect(mgr.canControl('c1', 'p1', 's1')).toBe(true);
      expect(mgr.canControl('c1', 'p2', 's2')).toBe(false);
    });

    it('만료된 세션 없음: 빈 배열', () => {
      mgr.register('c1', 'p1', 's1');
      expect(mgr.pruneExpired()).toHaveLength(0);
    });
  });

  // ─── removeCombat ────────────────────────────────────────────
  describe('removeCombat', () => {
    it('지정 전투의 모든 세션 제거 + 카운트 반환', () => {
      mgr.register('c1', 'p1', 's1');
      mgr.register('c1', 'p2', 's2');
      mgr.register('c2', 'p3', 's3');
      const count = mgr.removeCombat('c1');
      expect(count).toBe(2);
      expect(mgr.canControl('c1', 'p1', 's1')).toBe(false);
      expect(mgr.canControl('c2', 'p3', 's3')).toBe(true);
    });

    it('미등록 전투: 0', () => {
      expect(mgr.removeCombat('c_unknown')).toBe(0);
    });
  });

  // ─── reset ───────────────────────────────────────────────────
  describe('reset', () => {
    it('모든 세션 삭제', () => {
      mgr.register('c1', 'p1', 's1');
      mgr.register('c2', 'p2', 's2');
      mgr.reset();
      expect(mgr.canControl('c1', 'p1', 's1')).toBe(false);
      expect(mgr.getPresence('c1').total).toBe(0);
    });
  });

  // ─── getGraceMs ──────────────────────────────────────────────
  describe('getGraceMs', () => {
    it('생성자에 전달된 값 반환', () => {
      expect(new CombatReconnectManager(15_000).getGraceMs()).toBe(15_000);
      expect(new CombatReconnectManager().getGraceMs()).toBe(30_000);
    });
  });
});
