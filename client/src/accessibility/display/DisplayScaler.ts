/**
 * DisplayScaler — UI 스케일링 + 폰트 크기 관리 (P17-14)
 *
 * 기능:
 *   - UI 스케일 5단계 (75%~200%)
 *   - 폰트 크기 6단계 (12~24pt) — UI 스케일과 독립
 *   - 컴팩트/확장 모드 자동 전환
 *   - CSS 변수 기반 반응형 적용
 *   - 레이아웃 재계산 이벤트 발행
 */

// ─── 타입 ───────────────────────────────────────────────────────

export interface DisplayScalerConfig {
  /** UI 스케일 (0.75 | 1.0 | 1.25 | 1.5 | 2.0) */
  uiScale: number;
  /** 폰트 기본 크기 (12 | 14 | 16 | 18 | 20 | 24) */
  fontSizeBase: number;
}

export type LayoutMode = 'compact' | 'normal' | 'expanded';

// ─── 상수 ───────────────────────────────────────────────────────

const VALID_SCALES = [0.75, 1.0, 1.25, 1.5, 2.0];
const VALID_FONT_SIZES = [12, 14, 16, 18, 20, 24];
const STORAGE_KEY = 'aeterna_display_settings';

const CSS_VARS = {
  uiScale: '--ui-scale',
  fontBase: '--font-size-base',
  fontXs: '--font-size-xs',
  fontSm: '--font-size-sm',
  fontMd: '--font-size-md',
  fontLg: '--font-size-lg',
  fontXl: '--font-size-xl',
  font2xl: '--font-size-2xl',
  layoutMode: '--layout-mode',
} as const;

// ─── DisplayScaler ──────────────────────────────────────────────

export class DisplayScaler {
  private config: DisplayScalerConfig;
  private layoutMode: LayoutMode = 'normal';
  private resizeObserver: ResizeObserver | null = null;
  private listeners: Array<(config: DisplayScalerConfig, mode: LayoutMode) => void> = [];

  constructor(config?: Partial<DisplayScalerConfig>) {
    this.config = {
      uiScale: config?.uiScale ?? 1.0,
      fontSizeBase: config?.fontSizeBase ?? 16,
    };
  }

  // ── 초기화 ─────────────────────────────────────────────────

  /** 시스템 초기화 — 설정 로드 + CSS 적용 + resize 감지 */
  init(): void {
    this.loadSettings();
    this.applyAll();
    this.startResizeObserver();
  }

  /** 시스템 해제 */
  destroy(): void {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.listeners = [];
  }

  // ── UI 스케일 ──────────────────────────────────────────────

  /** UI 스케일 설정 */
  setUiScale(scale: number): void {
    // 가장 가까운 유효 스케일로 스냅
    const closest = VALID_SCALES.reduce((prev, curr) =>
      Math.abs(curr - scale) < Math.abs(prev - scale) ? curr : prev
    );
    this.config.uiScale = closest;
    this.applyAll();
    this.saveSettings();
  }

  getUiScale(): number {
    return this.config.uiScale;
  }

  /** 스케일 한 단계 증가 */
  scaleUp(): void {
    const idx = VALID_SCALES.indexOf(this.config.uiScale);
    if (idx < VALID_SCALES.length - 1) {
      this.setUiScale(VALID_SCALES[idx + 1]);
    }
  }

  /** 스케일 한 단계 감소 */
  scaleDown(): void {
    const idx = VALID_SCALES.indexOf(this.config.uiScale);
    if (idx > 0) {
      this.setUiScale(VALID_SCALES[idx - 1]);
    }
  }

  // ── 폰트 크기 ─────────────────────────────────────────────

  /** 폰트 기본 크기 설정 */
  setFontSize(size: number): void {
    const closest = VALID_FONT_SIZES.reduce((prev, curr) =>
      Math.abs(curr - size) < Math.abs(prev - size) ? curr : prev
    );
    this.config.fontSizeBase = closest;
    this.applyFontSize();
    this.saveSettings();
  }

  getFontSize(): number {
    return this.config.fontSizeBase;
  }

  /** 폰트 크기 한 단계 증가 */
  fontSizeUp(): void {
    const idx = VALID_FONT_SIZES.indexOf(this.config.fontSizeBase);
    if (idx < VALID_FONT_SIZES.length - 1) {
      this.setFontSize(VALID_FONT_SIZES[idx + 1]);
    }
  }

  /** 폰트 크기 한 단계 감소 */
  fontSizeDown(): void {
    const idx = VALID_FONT_SIZES.indexOf(this.config.fontSizeBase);
    if (idx > 0) {
      this.setFontSize(VALID_FONT_SIZES[idx - 1]);
    }
  }

  // ── 유틸리티 ───────────────────────────────────────────────

  /** 기준 px에 현재 스케일을 적용한 값 반환 */
  getEffectiveSize(basePx: number): number {
    return basePx * this.config.uiScale;
  }

  /** 현재 레이아웃 모드 */
  getLayoutMode(): LayoutMode {
    return this.layoutMode;
  }

  /** 컴팩트 모드 여부 */
  isCompactMode(): boolean {
    return this.layoutMode === 'compact';
  }

  /** 현재 설정 반환 */
  getConfig(): DisplayScalerConfig {
    return { ...this.config };
  }

  // ── 레이아웃 모드 판별 ─────────────────────────────────────

  /** 스케일 + 뷰포트 기반 레이아웃 모드 재계산 */
  recalculate(): void {
    const vw = window.innerWidth;
    const scale = this.config.uiScale;

    let newMode: LayoutMode;
    if (scale >= 1.5 || vw < 1280) {
      newMode = 'compact';
    } else if (scale <= 0.75 || vw >= 2560) {
      newMode = 'expanded';
    } else {
      newMode = 'normal';
    }

    const changed = newMode !== this.layoutMode;
    this.layoutMode = newMode;

    // CSS 변수 업데이트
    document.documentElement.style.setProperty(CSS_VARS.layoutMode, newMode);
    document.documentElement.dataset.layoutMode = newMode;

    if (changed) {
      this.notifyListeners();
    }
  }

  // ── CSS 적용 ───────────────────────────────────────────────

  /** 모든 CSS 변수 적용 */
  private applyAll(): void {
    this.applyUiScale();
    this.applyFontSize();
    this.recalculate();
    this.notifyListeners();
  }

  /** UI 스케일 CSS 변수 적용 */
  private applyUiScale(): void {
    const root = document.documentElement;
    root.style.setProperty(CSS_VARS.uiScale, String(this.config.uiScale));

    // UI 루트 컨테이너에 transform 적용
    const uiRoot = document.querySelector('.aeterna-ui-root') as HTMLElement | null;
    if (uiRoot) {
      uiRoot.style.transform = `scale(${this.config.uiScale})`;
      uiRoot.style.transformOrigin = 'top left';
    }
  }

  /** 폰트 크기 CSS 변수 적용 */
  private applyFontSize(): void {
    const root = document.documentElement;
    const base = this.config.fontSizeBase;

    root.style.setProperty(CSS_VARS.fontBase, `${base}px`);
    root.style.setProperty(CSS_VARS.fontXs, `${Math.round(base * 0.75)}px`);
    root.style.setProperty(CSS_VARS.fontSm, `${Math.round(base * 0.875)}px`);
    root.style.setProperty(CSS_VARS.fontMd, `${base}px`);
    root.style.setProperty(CSS_VARS.fontLg, `${Math.round(base * 1.25)}px`);
    root.style.setProperty(CSS_VARS.fontXl, `${Math.round(base * 1.5)}px`);
    root.style.setProperty(CSS_VARS.font2xl, `${base * 2}px`);
  }

  // ── Resize Observer ────────────────────────────────────────

  private startResizeObserver(): void {
    if (this.resizeObserver) return;

    this.resizeObserver = new ResizeObserver(() => {
      this.recalculate();
    });

    this.resizeObserver.observe(document.documentElement);
  }

  // ── 저장 / 로드 ────────────────────────────────────────────

  private saveSettings(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.config));
    } catch { /* ignore */ }
  }

  private loadSettings(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<DisplayScalerConfig>;
        if (parsed.uiScale && VALID_SCALES.includes(parsed.uiScale)) {
          this.config.uiScale = parsed.uiScale;
        }
        if (parsed.fontSizeBase && VALID_FONT_SIZES.includes(parsed.fontSizeBase)) {
          this.config.fontSizeBase = parsed.fontSizeBase;
        }
      }
    } catch { /* ignore */ }
  }

  // ── 리스너 ─────────────────────────────────────────────────

  /** 설정/모드 변경 리스너 등록 */
  onChange(listener: (config: DisplayScalerConfig, mode: LayoutMode) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      listener({ ...this.config }, this.layoutMode);
    }
  }
}

/** 싱글톤 인스턴스 */
export const displayScaler = new DisplayScaler();
