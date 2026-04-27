/**
 * Unit tests — combatSfxRouter (Phase 54 / v1.0.0-rc.3)
 *
 * 핵심 전투 SFX 100% 커버리지 약속의 게이트.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  resolveCombatSfx,
  applyCombatSfx,
  dispatchCombat,
  auditCombatSfxCoverage,
  COMBAT_SFX_TABLE,
  ALL_COMBAT_EVENTS,
  type CombatEvent,
} from '../../../client/src/sound/combatSfxRouter';

interface MockSm {
  playSfx: ReturnType<typeof vi.fn>;
  playSfxAt: ReturnType<typeof vi.fn>;
}

function makeMockSm(): MockSm {
  return { playSfx: vi.fn(), playSfxAt: vi.fn() };
}

describe('combatSfxRouter', () => {
  beforeEach(() => {
    // Math.random 고정 → pickRandom 결정적
    vi.spyOn(Math, 'random').mockReturnValue(0);
  });

  // ─── resolveCombatSfx by kind ────────────────────────────────
  describe('resolveCombatSfx', () => {
    it('attack_swing — weapon별 풀에서 1개 + detune override', () => {
      const r = resolveCombatSfx({ kind: 'attack_swing', weapon: 'sword' });
      expect(r.keys).toHaveLength(1);
      expect(COMBAT_SFX_TABLE.attack.sword).toContain(r.keys[0]);
      expect(r.overrides?.[0]).toMatchObject({ detune: expect.any(Number) });
      expect(r.confidence).toBe('exact');
    });

    it('attack_swing — weapon 미지정 시 sword 폴백', () => {
      const r = resolveCombatSfx({ kind: 'attack_swing' });
      expect(COMBAT_SFX_TABLE.attack.sword).toContain(r.keys[0]);
    });

    it('attack_hit — material별 키, 일반 1개', () => {
      const r = resolveCombatSfx({ kind: 'attack_hit', material: 'metal' });
      expect(r.keys).toEqual(['sfx_hit_metal']);
    });

    it('attack_hit + isCritical — material + critical 합성 (3키)', () => {
      const r = resolveCombatSfx({ kind: 'attack_hit', material: 'flesh', isCritical: true });
      expect(r.keys[0]).toBe('sfx_hit_flesh');
      expect(r.keys.slice(1)).toEqual(COMBAT_SFX_TABLE.events.critical);
    });

    it('skill_cast + element — magic 키 + voice 합성 (2키)', () => {
      const r = resolveCombatSfx({ kind: 'skill_cast', element: 'fire' });
      expect(r.keys).toEqual(['sfx_magic_fire', 'voice_combat_skill_cast']);
      expect(r.overrides?.[1]).toMatchObject({ volume: 0.6 });
    });

    it('skill_cast 무 element — events.skill_cast 폴백', () => {
      const r = resolveCombatSfx({ kind: 'skill_cast' });
      expect(r.keys).toEqual(COMBAT_SFX_TABLE.events.skill_cast);
    });

    it('skill_hit + element + crit — magic 키 + critical 합성', () => {
      const r = resolveCombatSfx({ kind: 'skill_hit', element: 'ice', isCritical: true });
      expect(r.keys[0]).toBe('sfx_magic_ice');
      expect(r.keys.slice(1)).toEqual(COMBAT_SFX_TABLE.events.critical);
    });

    it('events 직접 매핑 — dodge, guard_block 등', () => {
      expect(resolveCombatSfx({ kind: 'dodge' }).keys).toEqual(COMBAT_SFX_TABLE.events.dodge);
      expect(resolveCombatSfx({ kind: 'guard_block' }).keys).toEqual(COMBAT_SFX_TABLE.events.guard_block);
      expect(resolveCombatSfx({ kind: 'enemy_death' }).keys).toEqual(COMBAT_SFX_TABLE.events.enemy_death);
    });

    it('알 수 없는 kind — fallback', () => {
      const r = resolveCombatSfx({ kind: 'unknown_event' as any });
      expect(r.confidence).toBe('fallback');
      expect(r.keys).toEqual(['sfx_hit_flesh']);
    });
  });

  // ─── applyCombatSfx ──────────────────────────────────────────
  describe('applyCombatSfx', () => {
    it('pos 없으면 playSfx, 있으면 playSfxAt', () => {
      const sm = makeMockSm();
      applyCombatSfx(sm as any, {
        keys: ['k1', 'k2'],
        overrides: [{ detune: 50 }, undefined],
        confidence: 'exact',
      });
      expect(sm.playSfx).toHaveBeenCalledWith('k1', { detune: 50 });
      expect(sm.playSfx).toHaveBeenCalledWith('k2', undefined);
      expect(sm.playSfxAt).not.toHaveBeenCalled();

      const sm2 = makeMockSm();
      applyCombatSfx(sm2 as any, {
        keys: ['k1'],
        overrides: [undefined],
        confidence: 'exact',
      }, { x: 100, y: 200 });
      expect(sm2.playSfxAt).toHaveBeenCalledWith('k1', 100, 200);
    });
  });

  // ─── dispatchCombat ──────────────────────────────────────────
  describe('dispatchCombat', () => {
    it('worldX/worldY 있으면 3D 재생, 없으면 일반', () => {
      const sm = makeMockSm();
      dispatchCombat(sm as any, { kind: 'attack_hit', material: 'flesh', worldX: 50, worldY: 60 });
      expect(sm.playSfxAt).toHaveBeenCalled();
      expect(sm.playSfx).not.toHaveBeenCalled();
    });

    it('worldX 없으면 일반 재생', () => {
      const sm = makeMockSm();
      dispatchCombat(sm as any, { kind: 'attack_hit', material: 'flesh' });
      expect(sm.playSfx).toHaveBeenCalled();
      expect(sm.playSfxAt).not.toHaveBeenCalled();
    });
  });

  // ─── 커버리지 (사운드 100% 약속) ────────────────────────────
  describe('auditCombatSfxCoverage', () => {
    it('17 이벤트 모두 커버 — 약속 게이트', () => {
      const report = auditCombatSfxCoverage();
      expect(report.coveragePct).toBe(100);
      expect(report.missing).toHaveLength(0);
      expect(report.totalEvents).toBe(ALL_COMBAT_EVENTS.length);
    });

    it('events 테이블 모든 키가 빈 배열 아님', () => {
      for (const kind of ALL_COMBAT_EVENTS) {
        expect(COMBAT_SFX_TABLE.events[kind].length, kind).toBeGreaterThan(0);
      }
    });
  });
});
