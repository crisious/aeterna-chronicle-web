/**
 * RendererDetector — 크로스브라우저 호환성 검출기 v1.0
 * 작성: 가춘운 (CMO/디자인) · 2026-04-26
 * 스프린트: 크로스브라우저 호환성 검증 (Firefox·Safari)
 *
 * 역할:
 *  1. WebGL 지원 여부 + 컨텍스트 손실 감지 → Phaser 렌더러 자동 폴백
 *  2. 브라우저 엔진 판별 (Gecko / WebKit / Blink) → body[data-browser] 부여
 *  3. CSS 호환 시트가 참조하는 data-* 속성 일괄 세팅
 *  4. 호환 모드 진입 시 사용자에게 토스트 안내
 *
 * design-system-compat.css의 다음 셀렉터와 1:1 매칭:
 *   body[data-renderer="canvas"]   → postFX/Bloom 폴백
 *   body[data-compat-mode="canvas|fallback"] → .compat-toast 활성화
 */

export type RendererMode = 'webgl' | 'canvas';
export type BrowserEngine = 'gecko' | 'webkit' | 'blink' | 'unknown';
export type CompatMode = 'normal' | 'canvas' | 'fallback';

export interface RendererCapabilities {
  renderer: RendererMode;
  engine: BrowserEngine;
  isIOSSafari: boolean;
  supportsBackdropFilter: boolean;
  supportsColorMix: boolean;
  supportsDVH: boolean;
  webglVersion: 0 | 1 | 2;
  compatMode: CompatMode;
}

const CANVAS_FALLBACK_REASON_KEY = 'aeterna:renderer-fallback-reason';

/**
 * WebGL 컨텍스트 가용성 + 버전 검출
 */
function detectWebGL(): { version: 0 | 1 | 2; canvas2dRequired: boolean } {
  try {
    const test = document.createElement('canvas');

    // WebGL2 우선 시도
    const gl2 = test.getContext('webgl2');
    if (gl2) {
      // 컨텍스트 손실 즉시 감지
      const lost = (gl2 as WebGL2RenderingContext).getExtension('WEBGL_lose_context');
      if (lost) {
        // 정상 종료
        return { version: 2, canvas2dRequired: false };
      }
      return { version: 2, canvas2dRequired: false };
    }

    const gl1 =
      test.getContext('webgl') ||
      test.getContext('experimental-webgl');
    if (gl1) {
      return { version: 1, canvas2dRequired: false };
    }
  } catch (err) {
    console.warn('[RendererDetector] WebGL probe failed:', err);
  }
  return { version: 0, canvas2dRequired: true };
}

/**
 * 브라우저 엔진 판별
 * UA 스니핑은 마지막 수단 — 가능하면 feature detection 우선
 */
function detectEngine(): BrowserEngine {
  // Firefox: -moz-appearance 지원 → Gecko
  if (typeof CSS !== 'undefined' && CSS.supports?.('-moz-appearance', 'none')) {
    return 'gecko';
  }
  // Safari/iOS: -webkit-touch-callout
  if (typeof CSS !== 'undefined' && CSS.supports?.('-webkit-touch-callout', 'none')) {
    return 'webkit';
  }
  // Chromium 계열: Blink
  if (typeof navigator !== 'undefined' && /Chrome|Edg|Chromium/.test(navigator.userAgent)) {
    return 'blink';
  }
  return 'unknown';
}

/**
 * iOS Safari 식별 (iPad 데스크톱 모드 포함)
 */
function detectIOSSafari(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
  return isIOS && isSafari;
}

/**
 * @supports 기반 능력 점검
 */
function probeFeatures(): {
  backdropFilter: boolean;
  colorMix: boolean;
  dvh: boolean;
} {
  const supports = (typeof CSS !== 'undefined' && CSS.supports) ? CSS.supports.bind(CSS) : () => false;
  return {
    backdropFilter:
      supports('backdrop-filter', 'blur(4px)') ||
      supports('-webkit-backdrop-filter', 'blur(4px)'),
    colorMix: supports('color', 'color-mix(in srgb, red, blue)'),
    dvh: supports('height', '100dvh'),
  };
}

/**
 * 메인 검출 + body 속성 일괄 부여
 * main.ts 부트스트랩에서 가장 먼저 호출
 */
export function detectAndApply(): RendererCapabilities {
  const webgl = detectWebGL();
  const engine = detectEngine();
  const isIOSSafari = detectIOSSafari();
  const features = probeFeatures();

  const renderer: RendererMode = webgl.version === 0 ? 'canvas' : 'webgl';

  let compatMode: CompatMode = 'normal';
  if (renderer === 'canvas') {
    compatMode = 'canvas';
  } else if (!features.backdropFilter || !features.colorMix) {
    compatMode = 'fallback';
  }

  // body 속성 부여 (CSS 호환 시트와 매칭)
  if (typeof document !== 'undefined' && document.body) {
    document.body.setAttribute('data-renderer', renderer);
    document.body.setAttribute('data-browser', engine);
    document.body.setAttribute('data-compat-mode', compatMode);
    if (isIOSSafari) document.body.setAttribute('data-ios-safari', 'true');
  }

  // 폴백 사유 기록 (텔레메트리 수집용)
  if (compatMode !== 'normal') {
    try {
      sessionStorage.setItem(
        CANVAS_FALLBACK_REASON_KEY,
        JSON.stringify({
          renderer,
          engine,
          features,
          ts: Date.now(),
        }),
      );
    } catch {
      /* 시크릿 모드 등에서 sessionStorage 차단 가능 — 무시 */
    }
  }

  return {
    renderer,
    engine,
    isIOSSafari,
    supportsBackdropFilter: features.backdropFilter,
    supportsColorMix: features.colorMix,
    supportsDVH: features.dvh,
    webglVersion: webgl.version,
    compatMode,
  };
}

/**
 * Phaser 게임 인스턴스 생성 후 컨텍스트 손실 감지 후크
 * canvas로 즉시 폴백 + 새로고침 안내 토스트
 */
export function attachContextLossHandler(canvas: HTMLCanvasElement): void {
  const onLost = (e: Event) => {
    e.preventDefault(); // 복구 가능성 유지
    console.error('[RendererDetector] WebGL context lost — switching to canvas mode');
    document.body.setAttribute('data-renderer', 'canvas');
    document.body.setAttribute('data-compat-mode', 'canvas');
    showCompatToast('그래픽 모드 전환됨 — 일부 효과가 단순화됩니다');
  };
  canvas.addEventListener('webglcontextlost', onLost, false);
}

/**
 * 호환 토스트 메시지 강제 표시 (CSS의 .compat-toast 활성화)
 */
export function showCompatToast(message: string, durationMs = 4000): void {
  let toast = document.querySelector<HTMLDivElement>('.compat-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'compat-toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.style.display = 'block';
  window.setTimeout(() => {
    if (toast) toast.style.display = 'none';
  }, durationMs);
}

/**
 * 디버그용 — 콘솔에 호환성 리포트 덤프
 */
export function logCapabilities(caps: RendererCapabilities): void {
  console.groupCollapsed(
    `%c[Aeterna] Renderer: ${caps.renderer.toUpperCase()} · ${caps.engine} · compat=${caps.compatMode}`,
    'color:#89CFF0;font-weight:bold',
  );
  console.table(caps);
  console.groupEnd();
}
