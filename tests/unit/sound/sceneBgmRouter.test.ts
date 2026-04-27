/**
 * Unit tests — sceneBgmRouter (Phase 54 / v1.0.0-rc.3)
 *
 * 사운드 100% 커버리지 약속의 게이트.
 * 우선순위: event > boss > region+scene+time > fallback.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  resolveBgm,
  applyBgmRoute,
  routeAndPlay,
  auditBgmCoverage,
  REGION_BGM_TABLE,
  BOSS_BGM_TABLE,
  EVENT_BGM_TABLE,
  FALLBACK_BGM,
  ALL_REGIONS,
  ALL_SCENES,
  ALL_TIMES,
  type BgmRouteContext,
} from '../../../client/src/sound/sceneBgmRouter';

interface MockSoundManager {
  playBgm: ReturnType<typeof vi.fn>;
}

function makeMockSm(): MockSoundManager {
  return { playBgm: vi.fn() };
}

describe('sceneBgmRouter', () => {
  // ─── resolveBgm 우선순위 ─────────────────────────────────────
  describe('resolveBgm — 우선순위', () => {
    it('1) event가 boss/region보다 우선', () => {
      const ctx: BgmRouteContext = {
        scene: 'event',
        eventId: 'awakening',
        bossId: 'memory_golem',
        region: 'erebos',
        time: 'day',
      };
      const r = resolveBgm(ctx);
      expect(r.bgmKey).toBe(EVENT_BGM_TABLE.awakening);
      expect(r.confidence).toBe('exact');
    });

    it('2) boss가 region보다 우선', () => {
      const ctx: BgmRouteContext = {
        scene: 'boss',
        bossId: 'memory_golem',
        region: 'erebos',
        time: 'day',
      };
      const r = resolveBgm(ctx);
      expect(r.bgmKey).toBe(BOSS_BGM_TABLE.memory_golem);
      expect(r.confidence).toBe('exact');
    });

    it('3) region+scene+time 매핑 (field/day)', () => {
      const r = resolveBgm({ scene: 'field', region: 'sylvanheim', time: 'day' });
      expect(r.bgmKey).toBe(REGION_BGM_TABLE.sylvanheim.field.day);
      expect(r.confidence).toBe('exact');
    });

    it('3) region+scene+time — time 미지정 시 day 기본', () => {
      const r = resolveBgm({ scene: 'field', region: 'solaris' });
      expect(r.bgmKey).toBe(REGION_BGM_TABLE.solaris.field.day);
    });

    it('4) fallback — region 없음, event 없음, boss 없음', () => {
      const r = resolveBgm({ scene: 'title' });
      expect(r.bgmKey).toBe(FALLBACK_BGM.title);
      expect(r.confidence).toBe('fallback');
    });

    it('4) fallback — 알 수 없는 boss (테이블 미등록)', () => {
      const r = resolveBgm({ scene: 'boss', bossId: 'unknown_boss' });
      expect(r.confidence).toBe('fallback');
      expect(r.bgmKey).toBe(FALLBACK_BGM.boss);
    });

    it('4) fallback — 알 수 없는 event', () => {
      const r = resolveBgm({ scene: 'event', eventId: 'never_defined' });
      expect(r.confidence).toBe('fallback');
      expect(r.bgmKey).toBe(FALLBACK_BGM.event);
    });
  });

  // ─── 페이드 정책 ─────────────────────────────────────────────
  describe('resolveBgm — 페이드 정책', () => {
    it('boss/battle: FADE_FAST (600ms)', () => {
      expect(resolveBgm({ scene: 'boss', bossId: 'memory_golem' }).fadeMs).toBe(600);
      expect(resolveBgm({ scene: 'battle', region: 'erebos' }).fadeMs).toBe(600);
    });

    it('event/ending: FADE_SLOW (2500ms)', () => {
      expect(resolveBgm({ scene: 'event', eventId: 'awakening' }).fadeMs).toBe(2500);
      expect(resolveBgm({ scene: 'ending', region: 'erebos' }).fadeMs).toBe(2500);
    });

    it('field/town: FADE_NORMAL (1500ms)', () => {
      expect(resolveBgm({ scene: 'field', region: 'sylvanheim' }).fadeMs).toBe(1500);
      expect(resolveBgm({ scene: 'town', region: 'argentium' }).fadeMs).toBe(1500);
    });
  });

  // ─── applyBgmRoute / routeAndPlay ────────────────────────────
  describe('applyBgmRoute', () => {
    it('SoundManager.playBgm을 bgmKey + fadeMs로 호출', () => {
      const sm = makeMockSm();
      applyBgmRoute(sm as any, { bgmKey: 'bgm_test', fadeMs: 800, confidence: 'exact' });
      expect(sm.playBgm).toHaveBeenCalledWith('bgm_test', 800);
    });
  });

  describe('routeAndPlay', () => {
    it('resolve + apply 일괄, route 객체 반환', () => {
      const sm = makeMockSm();
      const route = routeAndPlay(sm as any, {
        scene: 'boss',
        bossId: 'memory_golem',
      });
      expect(sm.playBgm).toHaveBeenCalledWith(route.bgmKey, route.fadeMs);
      expect(route.confidence).toBe('exact');
    });
  });

  // ─── 커버리지 검증 (사운드 100% 약속) ───────────────────────
  describe('auditBgmCoverage', () => {
    it('REGION_BGM_TABLE 100% 커버 — 약속 게이트', () => {
      const report = auditBgmCoverage();
      expect(report.coveragePct).toBe(100);
      expect(report.missing).toHaveLength(0);
      expect(report.totalCells).toBe(
        ALL_REGIONS.length * ALL_SCENES.length * ALL_TIMES.length
      );
      expect(report.coveredCells).toBe(report.totalCells);
    });
  });

  // ─── 직접 테이블 정합성 ────────────────────────────────────
  describe('테이블 정합성', () => {
    it('FALLBACK_BGM은 모든 SceneKind 커버', () => {
      for (const scene of ALL_SCENES) {
        expect(FALLBACK_BGM[scene]).toBeTruthy();
      }
    });

    it('REGION_BGM_TABLE은 모든 region/scene/time 조합에 키 보유', () => {
      for (const region of ALL_REGIONS) {
        for (const scene of ALL_SCENES) {
          for (const time of ALL_TIMES) {
            const key = REGION_BGM_TABLE[region][scene][time];
            expect(key, `${region}/${scene}/${time}`).toBeTruthy();
            expect(key.length, `${region}/${scene}/${time}`).toBeGreaterThan(0);
          }
        }
      }
    });

    it('BOSS_BGM_TABLE 6종 모두 존재 (memory_golem · malatus · lawar · kain · lethe · oblivion_remnant)', () => {
      for (const boss of ['memory_golem', 'malatus', 'lawar', 'kain', 'lethe', 'oblivion_remnant']) {
        expect(BOSS_BGM_TABLE[boss], boss).toBeTruthy();
      }
    });

    it('EVENT_BGM_TABLE 4종 모두 존재', () => {
      for (const evt of ['awakening', 'farewell', 'revelation', 'fragment_collect']) {
        expect(EVENT_BGM_TABLE[evt], evt).toBeTruthy();
      }
    });
  });
});
