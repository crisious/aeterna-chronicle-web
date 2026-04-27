/**
 * Unit tests — uiSfxRouter (Phase 54 / v1.0.0-rc.3)
 *
 * UI 인터랙션 SFX 라우팅 + throttle 검증.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  resolveUiSfx,
  applyUiSfx,
  dispatchUi,
  auditUiSfxCoverage,
  _resetUiSfxThrottle,
  UI_SFX_TABLE,
  ALL_UI_EVENTS,
  type UiEvent,
} from '../../../client/src/sound/uiSfxRouter';

interface MockSm {
  playSfx: ReturnType<typeof vi.fn>;
}
function makeMockSm(): MockSm {
  return { playSfx: vi.fn() };
}

describe('uiSfxRouter', () => {
  beforeEach(() => {
    _resetUiSfxThrottle();
  });

  // ─── resolveUiSfx ────────────────────────────────────────────
  describe('resolveUiSfx — 기본 매핑', () => {
    it('menu_hover → sfx_ui_hover + throttle 80ms', () => {
      const r = resolveUiSfx({ kind: 'menu_hover' });
      expect(r.keys).toEqual(['sfx_ui_hover']);
      expect(r.throttleMs).toBe(80);
      expect(r.confidence).toBe('exact');
    });

    it('menu_click → sfx_ui_click + throttle 30ms', () => {
      const r = resolveUiSfx({ kind: 'menu_click' });
      expect(r.keys).toEqual(['sfx_ui_click']);
      expect(r.throttleMs).toBe(30);
    });

    it('fragment_acquire → 2키 합성 (fragment_collect + resonance_burst)', () => {
      const r = resolveUiSfx({ kind: 'fragment_acquire' });
      expect(r.keys).toEqual(['sfx_mem_fragment_collect', 'sfx_mem_resonance_burst']);
      expect(r.throttleMs).toBe(0);
    });

    it('알 수 없는 kind: fallback (sfx_ui_click)', () => {
      const r = resolveUiSfx({ kind: 'phantom_event' as any });
      expect(r.keys).toEqual(['sfx_ui_click']);
      expect(r.confidence).toBe('fallback');
    });
  });

  describe('resolveUiSfx — rarity 변형 (item_acquire)', () => {
    it('common: detune 0, voice 합성 없음', () => {
      const r = resolveUiSfx({ kind: 'item_acquire', rarity: 'common' });
      expect(r.keys).toEqual(['sfx_ui_item_pickup']);
      expect(r.overrides?.[0]).toMatchObject({ detune: 0 });
    });

    it('rare/epic: detune 50/100, voice 합성 없음', () => {
      expect(resolveUiSfx({ kind: 'item_acquire', rarity: 'rare' }).overrides?.[0])
        .toMatchObject({ detune: 50 });
      expect(resolveUiSfx({ kind: 'item_acquire', rarity: 'epic' }).overrides?.[0])
        .toMatchObject({ detune: 100 });
    });

    it('legendary: detune 150 + voice 합성 (achievement)', () => {
      const r = resolveUiSfx({ kind: 'item_acquire', rarity: 'legendary' });
      expect(r.keys).toEqual(['sfx_ui_item_pickup', 'sfx_ui_achievement']);
      expect(r.overrides?.[0]).toMatchObject({ detune: 150 });
      expect(r.overrides?.[1]).toMatchObject({ volume: 0.85 });
    });

    it('mythic: detune 200 + voice 합성', () => {
      const r = resolveUiSfx({ kind: 'item_acquire', rarity: 'mythic' });
      expect(r.keys).toHaveLength(2);
      expect(r.overrides?.[0]).toMatchObject({ detune: 200 });
    });
  });

  // ─── applyUiSfx + throttle ──────────────────────────────────
  describe('applyUiSfx — throttle', () => {
    it('throttleMs > 0이고 첫 호출: 재생', () => {
      const sm = makeMockSm();
      const event: UiEvent = { kind: 'menu_hover' };
      applyUiSfx(sm as any, resolveUiSfx(event), event);
      expect(sm.playSfx).toHaveBeenCalledTimes(1);
    });

    it('throttle 윈도우 내 재호출: 차단 (재생 안 됨)', () => {
      const sm = makeMockSm();
      const event: UiEvent = { kind: 'menu_hover' };
      applyUiSfx(sm as any, resolveUiSfx(event), event);
      applyUiSfx(sm as any, resolveUiSfx(event), event); // 80ms 안에 재호출
      expect(sm.playSfx).toHaveBeenCalledTimes(1);
    });

    it('refId 다르면 별도 throttle 키 — 둘 다 재생', () => {
      const sm = makeMockSm();
      applyUiSfx(sm as any, resolveUiSfx({ kind: 'menu_hover', refId: 'btnA' }), { kind: 'menu_hover', refId: 'btnA' });
      applyUiSfx(sm as any, resolveUiSfx({ kind: 'menu_hover', refId: 'btnB' }), { kind: 'menu_hover', refId: 'btnB' });
      expect(sm.playSfx).toHaveBeenCalledTimes(2);
    });

    it('throttleMs=0 (item_acquire 등): 항상 재생', () => {
      const sm = makeMockSm();
      const event: UiEvent = { kind: 'item_acquire', rarity: 'common' };
      applyUiSfx(sm as any, resolveUiSfx(event), event);
      applyUiSfx(sm as any, resolveUiSfx(event), event);
      applyUiSfx(sm as any, resolveUiSfx(event), event);
      expect(sm.playSfx).toHaveBeenCalledTimes(3);
    });

    it('event 미전달: throttle 검사 스킵, 항상 재생', () => {
      const sm = makeMockSm();
      const route = resolveUiSfx({ kind: 'menu_hover' });
      applyUiSfx(sm as any, route);
      applyUiSfx(sm as any, route);
      expect(sm.playSfx).toHaveBeenCalledTimes(2);
    });
  });

  // ─── dispatchUi ──────────────────────────────────────────────
  describe('dispatchUi', () => {
    it('resolve + apply 일괄, route 반환', () => {
      const sm = makeMockSm();
      const route = dispatchUi(sm as any, { kind: 'menu_confirm' });
      expect(sm.playSfx).toHaveBeenCalledWith('sfx_ui_confirm', undefined);
      expect(route.confidence).toBe('exact');
    });
  });

  // ─── 커버리지 (사운드 100% 약속) ────────────────────────────
  describe('auditUiSfxCoverage', () => {
    it('20 UI 이벤트 모두 커버 — 약속 게이트', () => {
      const report = auditUiSfxCoverage();
      expect(report.coveragePct).toBe(100);
      expect(report.missing).toHaveLength(0);
      expect(report.totalEvents).toBe(ALL_UI_EVENTS.length);
    });

    it('UI_SFX_TABLE 모든 키가 빈 배열 아님', () => {
      for (const kind of ALL_UI_EVENTS) {
        expect(UI_SFX_TABLE[kind].length, kind).toBeGreaterThan(0);
      }
    });
  });
});
