/**
 * ColorBlindFilter — 색약 모드 필터 관리 (P17-11)
 *
 * 기능:
 *   1. SVG feColorMatrix 기반 포스트프로세싱 셰이더 적용
 *   2. CSS 변수 팔레트 오버라이드
 *   3. 패턴 구분자 활성화/비활성화
 *   4. 필터 강도 조절 (부분 색약 지원)
 *
 * 의존: AccessibilityManager (상위 관리자)
 * 참조: colorblind_palettes.json
 */

import type { ColorBlindMode } from '../AccessibilityManager';
import palettes from './colorblind_palettes.json';

// ─── 타입 ───────────────────────────────────────────────────────

export interface ColorBlindFilterConfig {
  mode: ColorBlindMode;
  /** 필터 강도 0.0 ~ 1.0 (부분 색약 지원) */
  intensity: number;
  /** 패턴 구분자 활성화 */
  patternsEnabled: boolean;
}

/** 팔레트 키 타입 */
type PaletteKey = keyof typeof palettes.modes.none.palette;

// ─── 상수 ───────────────────────────────────────────────────────

const CSS_VAR_PREFIX = '--cb-';
const PATTERN_CLASS = 'cb-patterns-active';
const INTENSITY_PROPERTY = '--cb-intensity';

/** feColorMatrix 행렬 — AccessibilityManager SVG와 동기화 */
const MATRICES: Record<Exclude<ColorBlindMode, 'none'>, number[][]> = {
  protanopia: [
    [0.567, 0.433, 0, 0, 0],
    [0.558, 0.442, 0, 0, 0],
    [0, 0.242, 0.758, 0, 0],
    [0, 0, 0, 1, 0],
  ],
  deuteranopia: [
    [0.625, 0.375, 0, 0, 0],
    [0.7, 0.3, 0, 0, 0],
    [0, 0.3, 0.7, 0, 0],
    [0, 0, 0, 1, 0],
  ],
  tritanopia: [
    [0.95, 0.05, 0, 0, 0],
    [0, 0.433, 0.567, 0, 0],
    [0, 0.475, 0.525, 0, 0],
    [0, 0, 0, 1, 0],
  ],
};

// ─── 필터 클래스 ────────────────────────────────────────────────

export class ColorBlindFilter {
  private config: ColorBlindFilterConfig;
  private styleElement: HTMLStyleElement | null = null;
  private canvas: HTMLCanvasElement | null = null;

  constructor(config?: Partial<ColorBlindFilterConfig>) {
    this.config = {
      mode: config?.mode ?? 'none',
      intensity: config?.intensity ?? 1.0,
      patternsEnabled: config?.patternsEnabled ?? true,
    };
  }

  // ── 초기화 ─────────────────────────────────────────────────

  /** DOM 바인딩 + 초기 적용 */
  init(canvas?: HTMLCanvasElement): void {
    this.canvas = canvas ?? document.querySelector('canvas') ?? null;
    this.ensureStyleElement();
    this.apply();
  }

  /** 정리 */
  destroy(): void {
    this.removePaletteVars();
    this.styleElement?.remove();
    this.styleElement = null;
    document.documentElement.classList.remove(PATTERN_CLASS);
  }

  // ── 모드 전환 ──────────────────────────────────────────────

  /** 색약 모드 전환 — 셰이더 + 팔레트 + 패턴 일괄 적용 */
  setMode(mode: ColorBlindMode): void {
    this.config.mode = mode;
    this.apply();
  }

  getMode(): ColorBlindMode {
    return this.config.mode;
  }

  // ── 강도 ───────────────────────────────────────────────────

  /** 필터 강도 설정 (0.0 = 기본 시각, 1.0 = 최대 보정) */
  setIntensity(value: number): void {
    this.config.intensity = Math.max(0, Math.min(1, value));
    document.documentElement.style.setProperty(INTENSITY_PROPERTY, String(this.config.intensity));
    this.applyCanvasFilter();
  }

  getIntensity(): number {
    return this.config.intensity;
  }

  // ── 패턴 ───────────────────────────────────────────────────

  /** 패턴 구분자 활성화/비활성화 */
  setPatterns(enabled: boolean): void {
    this.config.patternsEnabled = enabled;
    this.applyPatterns();
  }

  getPatternsEnabled(): boolean {
    return this.config.patternsEnabled;
  }

  // ── 내부: 일괄 적용 ────────────────────────────────────────

  private apply(): void {
    this.applyCanvasFilter();
    this.applyPalette();
    this.applyPatterns();
  }

  /** Canvas에 SVG 필터 적용 */
  private applyCanvasFilter(): void {
    if (!this.canvas) return;
    const mode = this.config.mode;

    if (mode === 'none') {
      this.canvas.style.filter = 'none';
      return;
    }

    // 강도 < 1 인 경우 CSS opacity trick으로 부분 적용
    if (this.config.intensity < 1) {
      // 강도 보간: none 행렬(단위행렬)과 목표 행렬 사이를 보간
      const filterId = `${mode}-filter-partial`;
      this.injectPartialFilter(filterId, mode, this.config.intensity);
      this.canvas.style.filter = `url(#${filterId})`;
    } else {
      this.canvas.style.filter = `url(#${mode}-filter)`;
    }
  }

  /** 부분 강도용 동적 SVG 필터 생성 */
  private injectPartialFilter(id: string, mode: Exclude<ColorBlindMode, 'none'>, t: number): void {
    // 기존 필터 제거
    document.getElementById(id)?.remove();

    const identity = [
      [1, 0, 0, 0, 0],
      [0, 1, 0, 0, 0],
      [0, 0, 1, 0, 0],
      [0, 0, 0, 1, 0],
    ];
    const target = MATRICES[mode];

    // 선형 보간
    const interpolated = identity.map((row, i) =>
      row.map((val, j) => val + (target[i][j] - val) * t)
    );

    const values = interpolated.map(row => row.join(' ')).join('\n        ');

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.id = id;
    svg.setAttribute('style', 'position:absolute;width:0;height:0;overflow:hidden');
    svg.innerHTML = `
      <defs>
        <filter id="${id}">
          <feColorMatrix type="matrix" values="${values}"/>
        </filter>
      </defs>`;
    document.body.appendChild(svg);
  }

  /** CSS 변수로 팔레트 오버라이드 */
  private applyPalette(): void {
    this.removePaletteVars();

    const modeData = palettes.modes[this.config.mode];
    if (!modeData) return;

    const root = document.documentElement;
    const palette = modeData.palette as Record<string, string>;

    for (const [key, value] of Object.entries(palette)) {
      root.style.setProperty(`${CSS_VAR_PREFIX}${key}`, value);
    }
  }

  /** CSS 팔레트 변수 제거 */
  private removePaletteVars(): void {
    const root = document.documentElement;
    const defaultPalette = palettes.modes.none.palette as Record<string, string>;
    for (const key of Object.keys(defaultPalette)) {
      root.style.removeProperty(`${CSS_VAR_PREFIX}${key}`);
    }
  }

  /** 패턴 클래스 토글 */
  private applyPatterns(): void {
    const root = document.documentElement;
    if (this.config.mode !== 'none' && this.config.patternsEnabled) {
      root.classList.add(PATTERN_CLASS);
    } else {
      root.classList.remove(PATTERN_CLASS);
    }
  }

  /** 스타일 요소 보장 */
  private ensureStyleElement(): void {
    if (this.styleElement) return;
    this.styleElement = document.createElement('style');
    this.styleElement.id = 'aeterna-cb-filter-styles';
    this.styleElement.textContent = `
      /* 패턴 구분자 활성 시 추가 시각적 단서 */
      .cb-patterns-active [data-rarity="common"]    { border-style: solid !important; }
      .cb-patterns-active [data-rarity="uncommon"]   { border-style: dashed !important; }
      .cb-patterns-active [data-rarity="rare"]       { border-style: double !important; }
      .cb-patterns-active [data-rarity="epic"]       { border-style: ridge !important; }
      .cb-patterns-active [data-rarity="legendary"]  { border-style: dotted !important; border-width: 3px !important; }
      .cb-patterns-active [data-rarity="mythic"]     { border-style: groove !important; border-width: 3px !important; }

      .cb-patterns-active [data-status="buff"]::before    { content: "▲ "; }
      .cb-patterns-active [data-status="debuff"]::before  { content: "▼ "; }
      .cb-patterns-active [data-status="cooldown"]::before { content: "⏳ "; }
      .cb-patterns-active [data-status="warning"]::before { content: "⚠ "; }

      .cb-patterns-active [data-team="ally"]::before  { content: "[아군] "; }
      .cb-patterns-active [data-team="enemy"]::before { content: "[적] "; }
      .cb-patterns-active [data-team="party"]::before { content: "[파티] "; }
      .cb-patterns-active [data-team="all"]::before   { content: "[전체] "; }
    `;
    document.head.appendChild(this.styleElement);
  }
}

/** 싱글톤 인스턴스 */
export const colorBlindFilter = new ColorBlindFilter();
