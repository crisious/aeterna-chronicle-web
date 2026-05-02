/**
 * Safe Area / 노치 회피 유틸 — 에셋 단계 stub (계섬월 Staff Engineer)
 *
 * 토픽: HUD·메뉴·전투 UI 모바일 변형 — safe area · 노치 회피
 * 정합: env(safe-area-inset-*) CSS 변수 + Phaser camera viewport 양방향 동기.
 */

import type { MobileViewportSpec } from '../config/mobile-viewport';

/** Safe area inset (px) — top/right/bottom/left */
export interface SafeAreaInset {
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly left: number;
}

/** 화면 방향 */
export type ScreenOrientation = 'portrait' | 'landscape';

/** 해상된 안전 영역 메타 */
export interface ResolvedSafeArea {
  readonly inset: SafeAreaInset;
  readonly orientation: ScreenOrientation;
  /** 안전 영역의 실제 가용 너비/높이 */
  readonly innerWidth: number;
  readonly innerHeight: number;
  /** 출처 — env() 우선, 실패 시 viewport spec 폴백 */
  readonly source: 'env-css' | 'viewport-spec' | 'fallback-zero';
}

/** env() CSS 변수 키 4종 — root에 주입 시 동일 키 사용 */
const SAFE_AREA_CSS_KEYS = [
  '--safe-area-inset-top',
  '--safe-area-inset-right',
  '--safe-area-inset-bottom',
  '--safe-area-inset-left',
] as const;

function readPx(value: string | null | undefined): number | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const num = parseFloat(trimmed);
  return Number.isFinite(num) ? num : null;
}

function detectOrientation(): ScreenOrientation {
  if (typeof window === 'undefined') return 'portrait';
  const w = window.innerWidth;
  const h = window.innerHeight;
  if (!w || !h) return 'portrait';
  return w > h ? 'landscape' : 'portrait';
}

/**
 * 현재 환경의 safe area inset 해상.
 * 1순위: getComputedStyle root에서 `--safe-area-inset-*` CSS 변수
 * 2순위: viewport spec 기본값
 * 3순위: 0 폴백
 */
export function resolveSafeArea(viewport: MobileViewportSpec): ResolvedSafeArea {
  const orientation = detectOrientation();
  const winW = typeof window !== 'undefined' && window.innerWidth ? window.innerWidth : viewport.widthPx;
  const winH = typeof window !== 'undefined' && window.innerHeight ? window.innerHeight : viewport.heightPx;

  // 1순위: CSS env 변수
  if (typeof window !== 'undefined' && typeof getComputedStyle === 'function') {
    try {
      const style = getComputedStyle(document.documentElement);
      const top = readPx(style.getPropertyValue(SAFE_AREA_CSS_KEYS[0]));
      const right = readPx(style.getPropertyValue(SAFE_AREA_CSS_KEYS[1]));
      const bottom = readPx(style.getPropertyValue(SAFE_AREA_CSS_KEYS[2]));
      const left = readPx(style.getPropertyValue(SAFE_AREA_CSS_KEYS[3]));
      if (top !== null || right !== null || bottom !== null || left !== null) {
        const inset: SafeAreaInset = {
          top: top ?? 0,
          right: right ?? 0,
          bottom: bottom ?? 0,
          left: left ?? 0,
        };
        return {
          inset,
          orientation,
          innerWidth: Math.max(0, winW - inset.left - inset.right),
          innerHeight: Math.max(0, winH - inset.top - inset.bottom),
          source: 'env-css',
        };
      }
    } catch {
      // getComputedStyle 실패 시 spec 폴백
    }
  }

  // 2순위: viewport spec
  const spec = viewport.safeAreaInsetPx;
  return {
    inset: { top: spec.top, right: spec.right, bottom: spec.bottom, left: spec.left },
    orientation,
    innerWidth: Math.max(0, winW - spec.left - spec.right),
    innerHeight: Math.max(0, winH - spec.top - spec.bottom),
    source: 'viewport-spec',
  };
}

/**
 * Phaser Scene viewport에 safe area 적용 — HUD를 안전 영역 내부로 클램프.
 * Scene.cameras.main viewport를 inset 만큼 줄임.
 */
export function applySafeAreaToScene(
  scene: Phaser.Scene,
  resolved: ResolvedSafeArea,
): void {
  if (!scene || !scene.cameras || !scene.cameras.main) return;
  const cam = scene.cameras.main;
  const { top, left } = resolved.inset;
  cam.setViewport(left, top, resolved.innerWidth, resolved.innerHeight);
}

/** CSS root에 safe area 변수 주입 — DOM UI(대화/메뉴) 동기화 */
export function injectSafeAreaCssVars(resolved: ResolvedSafeArea): void {
  if (typeof document === 'undefined' || !document.documentElement) return;
  const root = document.documentElement;
  const { top, right, bottom, left } = resolved.inset;
  root.style.setProperty(SAFE_AREA_CSS_KEYS[0], `${top}px`);
  root.style.setProperty(SAFE_AREA_CSS_KEYS[1], `${right}px`);
  root.style.setProperty(SAFE_AREA_CSS_KEYS[2], `${bottom}px`);
  root.style.setProperty(SAFE_AREA_CSS_KEYS[3], `${left}px`);
}

/** orientation change 구독 — matchMedia + resize 폴백 */
export function watchOrientationChange(
  onChange: (next: ScreenOrientation) => void,
): () => void {
  if (typeof window === 'undefined') return () => undefined;

  let last: ScreenOrientation = detectOrientation();
  const fire = () => {
    const next = detectOrientation();
    if (next !== last) {
      last = next;
      onChange(next);
    }
  };

  let mql: MediaQueryList | null = null;
  if (typeof window.matchMedia === 'function') {
    mql = window.matchMedia('(orientation: portrait)');
    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', fire);
    } else if (typeof (mql as unknown as { addListener?: (cb: () => void) => void }).addListener === 'function') {
      (mql as unknown as { addListener: (cb: () => void) => void }).addListener(fire);
    }
  }
  window.addEventListener('resize', fire);

  return () => {
    if (mql) {
      if (typeof mql.removeEventListener === 'function') {
        mql.removeEventListener('change', fire);
      } else if (typeof (mql as unknown as { removeListener?: (cb: () => void) => void }).removeListener === 'function') {
        (mql as unknown as { removeListener: (cb: () => void) => void }).removeListener(fire);
      }
    }
    window.removeEventListener('resize', fire);
  };
}
