/**
 * HighContrastTheme — 고대비 테마 관리 (P17-14)
 *
 * WCAG 2.1 기준:
 *   - 1.4.3 대비 (최소) AA: 4.5:1 → 실제 7:1+ 달성 (AAA)
 *   - 1.4.6 대비 (향상) AAA: 7:1 → 전체 텍스트 토큰 7:1+
 *   - 1.4.11 비텍스트 대비 AA: 3:1 → 테두리/아이콘 3:1+
 *   - 2.4.7 포커스 가시성 AA: 3px+ 고대비 테두리
 */

import paletteData from './high_contrast_palette.json';

// ─── 타입 ───────────────────────────────────────────────────────

type ThemeName = 'default' | 'high_contrast';

interface ThemeTokens {
  [key: string]: string;
}

// ─── 상수 ───────────────────────────────────────────────────────

const CSS_VAR_PREFIX = '--aeterna-';
const HC_CLASS = 'aeterna-high-contrast';
const STORAGE_KEY = 'aeterna_high_contrast';
const STYLE_ID = 'aeterna-hc-theme-styles';

// ─── HighContrastTheme ──────────────────────────────────────────

export class HighContrastTheme {
  private enabled = false;
  private currentTheme: ThemeName = 'default';
  private styleElement: HTMLStyleElement | null = null;

  // ── 초기화 ─────────────────────────────────────────────────

  /** 초기화 — 저장된 설정 로드 + 적용 */
  init(): void {
    this.loadSetting();
    if (this.enabled) {
      this.applyTheme('high_contrast');
    } else {
      this.applyTheme('default');
    }
  }

  /** 정리 */
  destroy(): void {
    this.styleElement?.remove();
    this.styleElement = null;
    document.documentElement.classList.remove(HC_CLASS);
  }

  // ── 활성화 / 비활성화 ──────────────────────────────────────

  /** 고대비 모드 활성화 */
  enable(): void {
    this.enabled = true;
    this.applyTheme('high_contrast');
    this.saveSetting();
  }

  /** 고대비 모드 비활성화 (기본 테마 복원) */
  disable(): void {
    this.enabled = false;
    this.applyTheme('default');
    this.saveSetting();
  }

  /** 토글 */
  toggle(): void {
    if (this.enabled) {
      this.disable();
    } else {
      this.enable();
    }
  }

  /** 현재 활성 상태 */
  isEnabled(): boolean {
    return this.enabled;
  }

  // ── 토큰 조회 ──────────────────────────────────────────────

  /** 현재 테마의 특정 토큰값 반환 */
  getToken(name: string): string {
    const theme = this.getCurrentTokens();
    return theme[name] ?? '';
  }

  /** 현재 테마의 전체 토큰 반환 */
  getCurrentTokens(): ThemeTokens {
    const themeData = paletteData.themes[this.currentTheme];
    return themeData?.tokens ?? {};
  }

  // ── 대비비 검증 ────────────────────────────────────────────

  /**
   * 두 색상의 WCAG 대비비 계산
   * @returns ratio (1:1 ~ 21:1), passes (7:1 이상 여부)
   */
  validateContrast(fg: string, bg: string): { ratio: number; passes: boolean } {
    const fgLum = this.getRelativeLuminance(fg);
    const bgLum = this.getRelativeLuminance(bg);

    const lighter = Math.max(fgLum, bgLum);
    const darker = Math.min(fgLum, bgLum);
    const ratio = (lighter + 0.05) / (darker + 0.05);

    return {
      ratio: Math.round(ratio * 10) / 10,
      passes: ratio >= 7.0,
    };
  }

  /** 전체 토큰 대비비 일괄 검증 (고대비 테마) */
  validateAll(): Array<{ token: string; color: string; ratio: number; passes: boolean }> {
    const results: Array<{ token: string; color: string; ratio: number; passes: boolean }> = [];
    const tokens = paletteData.themes.high_contrast.tokens;
    const bg = tokens['bg-primary'] ?? '#000000';

    for (const [key, value] of Object.entries(tokens)) {
      if (key.startsWith('text-') || key.startsWith('border-')) {
        const { ratio, passes } = this.validateContrast(value, bg);
        results.push({ token: key, color: value, ratio, passes });
      }
    }

    return results;
  }

  // ── 내부: 테마 적용 ────────────────────────────────────────

  /** CSS 변수 + 클래스 적용 */
  private applyTheme(theme: ThemeName): void {
    this.currentTheme = theme;
    const tokens = this.getCurrentTokens();
    const root = document.documentElement;

    // CSS 변수 설정
    for (const [key, value] of Object.entries(tokens)) {
      root.style.setProperty(`${CSS_VAR_PREFIX}${key}`, value);
    }

    // 클래스 토글
    if (theme === 'high_contrast') {
      root.classList.add(HC_CLASS);
      this.injectHighContrastStyles();
    } else {
      root.classList.remove(HC_CLASS);
    }
  }

  /** 고대비 전용 스타일시트 주입 */
  private injectHighContrastStyles(): void {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      /* ── 고대비 테마 글로벌 스타일 ── */

      .${HC_CLASS} {
        background-color: var(${CSS_VAR_PREFIX}bg-primary) !important;
        color: var(${CSS_VAR_PREFIX}text-primary) !important;
      }

      /* 텍스트 강화 */
      .${HC_CLASS} * {
        text-shadow: none !important;
      }

      .${HC_CLASS} .ui-text,
      .${HC_CLASS} [data-ui-text] {
        color: var(${CSS_VAR_PREFIX}text-primary) !important;
        font-weight: bold !important;
      }

      /* 패널/카드 */
      .${HC_CLASS} .ui-panel,
      .${HC_CLASS} [data-ui-panel] {
        background-color: var(${CSS_VAR_PREFIX}bg-panel) !important;
        border: 2px solid var(${CSS_VAR_PREFIX}border-accent) !important;
      }

      /* 버튼 */
      .${HC_CLASS} .ui-button,
      .${HC_CLASS} [data-ui-button],
      .${HC_CLASS} button {
        background-color: var(${CSS_VAR_PREFIX}bg-primary) !important;
        color: var(${CSS_VAR_PREFIX}text-primary) !important;
        border: 2px solid var(${CSS_VAR_PREFIX}border-accent) !important;
      }

      .${HC_CLASS} .ui-button:hover,
      .${HC_CLASS} [data-ui-button]:hover,
      .${HC_CLASS} button:hover {
        background-color: var(${CSS_VAR_PREFIX}bg-hover) !important;
      }

      /* 포커스 인디케이터 (3px+ 고대비) */
      .${HC_CLASS} :focus-visible {
        outline: var(${CSS_VAR_PREFIX}focus-width) solid var(${CSS_VAR_PREFIX}border-focus) !important;
        outline-offset: 2px !important;
        box-shadow: var(${CSS_VAR_PREFIX}focus-glow) !important;
      }

      /* 입력 필드 */
      .${HC_CLASS} input,
      .${HC_CLASS} textarea,
      .${HC_CLASS} select {
        background-color: var(${CSS_VAR_PREFIX}bg-input) !important;
        color: var(${CSS_VAR_PREFIX}text-primary) !important;
        border: 2px solid var(${CSS_VAR_PREFIX}border-default) !important;
      }

      /* 툴팁 */
      .${HC_CLASS} .tooltip,
      .${HC_CLASS} [data-tooltip] {
        background-color: var(${CSS_VAR_PREFIX}tooltip-bg) !important;
        border: 2px solid var(${CSS_VAR_PREFIX}tooltip-border) !important;
        color: var(${CSS_VAR_PREFIX}text-primary) !important;
      }

      /* 프로그레스 바 (HP/MP/EXP) */
      .${HC_CLASS} .progress-bar-bg {
        background-color: var(${CSS_VAR_PREFIX}hp-bar-bg) !important;
        border: 1px solid var(${CSS_VAR_PREFIX}border-default) !important;
      }

      /* 스크롤바 */
      .${HC_CLASS} ::-webkit-scrollbar-thumb {
        background-color: var(${CSS_VAR_PREFIX}border-default) !important;
      }
      .${HC_CLASS} ::-webkit-scrollbar-track {
        background-color: var(${CSS_VAR_PREFIX}bg-primary) !important;
      }

      /* 링크 */
      .${HC_CLASS} a {
        color: var(${CSS_VAR_PREFIX}text-link) !important;
        text-decoration: underline !important;
      }
    `;
    document.head.appendChild(style);
  }

  // ── 색상 유틸리티 ──────────────────────────────────────────

  /** hex 색상 → 상대 휘도 (WCAG 2.1 공식) */
  private getRelativeLuminance(hex: string): number {
    const rgb = this.hexToRgb(hex);
    if (!rgb) return 0;

    const [r, g, b] = rgb.map(c => {
      const s = c / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  /** hex → [r, g, b] */
  private hexToRgb(hex: string): [number, number, number] | null {
    const match = hex.replace('#', '').match(/.{2}/g);
    if (!match || match.length < 3) return null;
    return [parseInt(match[0], 16), parseInt(match[1], 16), parseInt(match[2], 16)];
  }

  // ── 저장 / 로드 ────────────────────────────────────────────

  private saveSetting(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ enabled: this.enabled }));
    } catch { /* ignore */ }
  }

  private loadSetting(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw) as { enabled?: boolean };
        this.enabled = data.enabled ?? false;
      }
    } catch { /* ignore */ }
  }
}

/** 싱글톤 인스턴스 */
export const highContrastTheme = new HighContrastTheme();
