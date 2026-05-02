/**
 * 모바일 Viewport 정의 — 에셋 단계 stub (계섬월 Staff Engineer)
 *
 * 토픽: 모바일 반응형 적응 — 4종 viewport(360/375/414/430)
 * SSOT 위계: 본 파일은 4차 (런타임 상수) — DESIGN.md §8 반응형 브레이크포인트 미러
 *
 * 실제 구현은 Build 단계. 여기는 형(形)과 시그니처만.
 */

/** 모바일 viewport 4종 식별자 — 너비 기준 */
export type MobileViewportId = 'sm-360' | 'sm-375' | 'md-414' | 'md-430';

/** Viewport 메타 — 너비/높이/safe area 기본값/폰트 스케일 */
export interface MobileViewportSpec {
  readonly id: MobileViewportId;
  readonly widthPx: number;
  /** 가장 흔한 종횡비 기준 표준 높이 — 실제 런타임은 window.innerHeight 우선 */
  readonly heightPx: number;
  /** 노치/홀 디스플레이 회피용 기본 inset (top/right/bottom/left) — env(safe-area-inset-*) 폴백 */
  readonly safeAreaInsetPx: Readonly<{
    top: number;
    right: number;
    bottom: number;
    left: number;
  }>;
  /** 데스크탑(1920) 대비 폰트 스케일 — 14px 최소 가독성 보장 */
  readonly fontScale: number;
  /** 디바이스 카테고리 — HUD 변형 분기 키 */
  readonly category: 'compact' | 'standard';
}

/** 4종 viewport SSOT — DESIGN.md §8 미러 (수치 변경 시 양방향 갱신) */
export const MOBILE_VIEWPORTS: Readonly<Record<MobileViewportId, MobileViewportSpec>> = {
  'sm-360': {
    id: 'sm-360',
    widthPx: 360,
    heightPx: 800,
    safeAreaInsetPx: { top: 24, right: 0, bottom: 16, left: 0 },
    fontScale: 0.78,
    category: 'compact',
  },
  'sm-375': {
    id: 'sm-375',
    widthPx: 375,
    heightPx: 812,
    safeAreaInsetPx: { top: 44, right: 0, bottom: 34, left: 0 },
    fontScale: 0.82,
    category: 'compact',
  },
  'md-414': {
    id: 'md-414',
    widthPx: 414,
    heightPx: 896,
    safeAreaInsetPx: { top: 44, right: 0, bottom: 34, left: 0 },
    fontScale: 0.88,
    category: 'standard',
  },
  'md-430': {
    id: 'md-430',
    widthPx: 430,
    heightPx: 932,
    safeAreaInsetPx: { top: 47, right: 0, bottom: 34, left: 0 },
    fontScale: 0.92,
    category: 'standard',
  },
} as const;

/** 데스크탑 기준 너비 — 폰트 스케일 분모 SSOT */
export const DESKTOP_REFERENCE_WIDTH_PX = 1920;

/** 텍스트 최소 가독성 폰트 크기 (px) — 토픽 지표 4 */
export const MIN_LEGIBLE_FONT_PX = 14;

/** 모바일 모드 상한 너비 — 이 값을 넘으면 데스크탑 모드 */
export const MOBILE_MODE_MAX_WIDTH_PX = 430;

/** 모바일 모드 하한 너비 — 이 값 미만이면 인식 거부 (잘못된 viewport) */
export const MOBILE_MODE_MIN_WIDTH_PX = 320;

/**
 * 현재 window 너비로부터 가장 근접한 viewport spec 반환.
 * 너비가 모바일 범위(320~430) 밖이면 null.
 *
 * 알고리즘: closest-match by absolute width diff.
 */
export function resolveMobileViewport(widthPx: number): MobileViewportSpec | null {
  if (!Number.isFinite(widthPx)) return null;
  if (widthPx < MOBILE_MODE_MIN_WIDTH_PX || widthPx > MOBILE_MODE_MAX_WIDTH_PX) return null;

  let best: MobileViewportSpec | null = null;
  let bestDiff = Number.POSITIVE_INFINITY;
  for (const spec of Object.values(MOBILE_VIEWPORTS)) {
    const diff = Math.abs(spec.widthPx - widthPx);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = spec;
    }
  }
  return best;
}

/**
 * 모바일 모드 진입 여부 — 너비 ≤ 430 OR 터치-only 디바이스(coarse pointer).
 * SSR/노드 환경에서는 false.
 */
export function isMobileMode(): boolean {
  if (typeof window === 'undefined') return false;

  const widthOk = window.innerWidth > 0 && window.innerWidth <= MOBILE_MODE_MAX_WIDTH_PX;
  if (widthOk) return true;

  const nav = typeof navigator !== 'undefined' ? navigator : null;
  const touchPoints = nav && typeof nav.maxTouchPoints === 'number' ? nav.maxTouchPoints : 0;
  const coarsePointer =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(pointer: coarse)').matches;

  return touchPoints > 0 && coarsePointer;
}
