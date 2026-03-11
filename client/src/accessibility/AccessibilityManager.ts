/**
 * AccessibilityManager — 접근성 관리자 (P5-12)
 *
 * 기능:
 *   - 색맹 모드 3종 (Protanopia / Deuteranopia / Tritanopia) — CSS 필터 적용
 *   - 고대비 모드 (텍스트/UI 테두리 강화)
 *   - UI 스케일링 (75%~200%)
 *   - 자막 시스템 (크기 조절 3단계, 배경 불투명도)
 *   - 키보드 전체 내비게이션 (Tab/Enter/Escape 포커스 체인)
 *   - 스크린리더 ARIA 라벨 자동 부여
 *   - 모션 감소 모드 (애니메이션 비활성화)
 *   - 설정 localStorage 저장/로드
 */

// ─── 타입 정의 ──────────────────────────────────────────────────

/** 색맹 모드 종류 */
export type ColorBlindMode = 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia';

/** 자막 크기 단계 */
export type SubtitleSize = 'small' | 'medium' | 'large';

/** 접근성 설정 전체 */
export interface AccessibilitySettings {
  /** 색맹 모드 */
  colorBlindMode: ColorBlindMode;
  /** 고대비 모드 */
  highContrast: boolean;
  /** UI 스케일 (0.75 ~ 2.0) */
  uiScale: number;
  /** 자막 활성화 */
  subtitlesEnabled: boolean;
  /** 자막 크기 */
  subtitleSize: SubtitleSize;
  /** 자막 배경 불투명도 (0.0 ~ 1.0) */
  subtitleBgOpacity: number;
  /** 키보드 내비게이션 활성화 */
  keyboardNavEnabled: boolean;
  /** 스크린리더 ARIA 라벨 자동 부여 */
  screenReaderEnabled: boolean;
  /** 모션 감소 모드 */
  reduceMotion: boolean;
}

/** 포커스 가능 UI 요소 */
export interface FocusableElement {
  id: string;
  label: string;
  group: string;
  order: number;
  onActivate: () => void;
}

/** 자막 항목 */
export interface SubtitleEntry {
  id: string;
  speaker: string;
  text: string;
  duration: number; // ms
  timestamp: number;
}

// ─── 상수 ───────────────────────────────────────────────────────

const STORAGE_KEY = 'aeterna_accessibility_settings';
const MIN_UI_SCALE = 0.75;
const MAX_UI_SCALE = 2.0;

/** 색맹 CSS 필터 매트릭스 (SVG feColorMatrix) */
const COLOR_BLIND_FILTERS: Record<ColorBlindMode, string> = {
  none: 'none',
  protanopia:
    'url(#protanopia-filter)',
  deuteranopia:
    'url(#deuteranopia-filter)',
  tritanopia:
    'url(#tritanopia-filter)',
};

/** 색맹 CSS 필터 — CSS filter 방식 fallback (SVG 미지원 브라우저용) */
export const COLOR_BLIND_CSS_FILTERS: Record<ColorBlindMode, string> = {
  none: 'none',
  // Protanopia: 적색 인식 불가 — 적-녹 혼동 (적색 약화)
  protanopia: 'saturate(0.8) hue-rotate(-20deg)',
  // Deuteranopia: 녹색 인식 불가 — 적-녹 혼동 (녹색 약화)
  deuteranopia: 'saturate(0.7) hue-rotate(20deg)',
  // Tritanopia: 청색 인식 불가 — 청-황 혼동
  tritanopia: 'saturate(0.9) hue-rotate(180deg) saturate(0.7) hue-rotate(-180deg)',
};

/** 자막 크기 매핑 (px) */
const SUBTITLE_SIZE_PX: Record<SubtitleSize, number> = {
  small: 14,
  medium: 18,
  large: 24,
};

/** 기본 설정값 */
const DEFAULT_SETTINGS: AccessibilitySettings = {
  colorBlindMode: 'none',
  highContrast: false,
  uiScale: 1.0,
  subtitlesEnabled: false,
  subtitleSize: 'medium',
  subtitleBgOpacity: 0.7,
  keyboardNavEnabled: false,
  screenReaderEnabled: false,
  reduceMotion: false,
};

// ─── SVG 필터 정의 (색맹 시뮬레이션) ────────────────────────────

/**
 * 색맹 필터용 SVG 정의.
 * DOM에 한 번 삽입하면 CSS filter: url(#...) 로 참조 가능.
 */
const COLOR_BLIND_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" style="position:absolute;width:0;height:0;overflow:hidden">
  <defs>
    <!-- Protanopia (적색맹) -->
    <filter id="protanopia-filter">
      <feColorMatrix type="matrix" values="
        0.567, 0.433, 0,     0, 0
        0.558, 0.442, 0,     0, 0
        0,     0.242, 0.758, 0, 0
        0,     0,     0,     1, 0"/>
    </filter>
    <!-- Deuteranopia (녹색맹) -->
    <filter id="deuteranopia-filter">
      <feColorMatrix type="matrix" values="
        0.625, 0.375, 0,   0, 0
        0.7,   0.3,   0,   0, 0
        0,     0.3,   0.7, 0, 0
        0,     0,     0,   1, 0"/>
    </filter>
    <!-- Tritanopia (청색맹) -->
    <filter id="tritanopia-filter">
      <feColorMatrix type="matrix" values="
        0.95, 0.05,  0,     0, 0
        0,    0.433, 0.567, 0, 0
        0,    0.475, 0.525, 0, 0
        0,    0,     0,     1, 0"/>
    </filter>
  </defs>
</svg>`;

// ─── 접근성 관리자 ──────────────────────────────────────────────

export class AccessibilityManager {
  private settings: AccessibilitySettings;
  private focusChain: FocusableElement[] = [];
  private currentFocusIndex = -1;
  private subtitleQueue: SubtitleEntry[] = [];
  private subtitleOverlay: HTMLDivElement | null = null;
  private svgInjected = false;
  private gameCanvas: HTMLCanvasElement | null = null;
  private ariaContainer: HTMLDivElement | null = null;
  private keyHandler: ((e: KeyboardEvent) => void) | null = null;

  constructor() {
    this.settings = { ...DEFAULT_SETTINGS };
  }

  // ── 초기화 / 해제 ──────────────────────────────────────────

  /** 접근성 시스템 초기화 — 게임 부팅 시 1회 호출 */
  init(canvas?: HTMLCanvasElement): void {
    this.gameCanvas = canvas ?? document.querySelector('canvas') ?? null;
    this.loadSettings();
    this.injectSvgFilters();
    this.createAriaContainer();
    this.createSubtitleOverlay();
    this.applyAllSettings();
    this.bindKeyboardNavigation();
  }

  /** 접근성 시스템 해제 — 게임 종료 시 호출 */
  destroy(): void {
    this.unbindKeyboardNavigation();
    this.subtitleOverlay?.remove();
    this.ariaContainer?.remove();
    this.subtitleOverlay = null;
    this.ariaContainer = null;
  }

  // ── 설정 저장/로드 ─────────────────────────────────────────

  /** localStorage에서 설정 불러오기 */
  loadSettings(): AccessibilitySettings {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<AccessibilitySettings>;
        this.settings = { ...DEFAULT_SETTINGS, ...parsed };
      }
    } catch {
      // 파싱 실패 시 기본값 유지
      this.settings = { ...DEFAULT_SETTINGS };
    }
    return { ...this.settings };
  }

  /** localStorage에 설정 저장 */
  saveSettings(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch {
      // 저장소 가득 참 등 — 무시
    }
  }

  /** 현재 설정 반환 (복사본) */
  getSettings(): AccessibilitySettings {
    return { ...this.settings };
  }

  /** 설정 일괄 적용 */
  updateSettings(partial: Partial<AccessibilitySettings>): void {
    Object.assign(this.settings, partial);
    // 스케일 범위 보정
    this.settings.uiScale = Math.max(MIN_UI_SCALE, Math.min(MAX_UI_SCALE, this.settings.uiScale));
    this.settings.subtitleBgOpacity = Math.max(0, Math.min(1, this.settings.subtitleBgOpacity));
    this.applyAllSettings();
    this.saveSettings();
  }

  /** 설정 초기화 */
  resetSettings(): void {
    this.settings = { ...DEFAULT_SETTINGS };
    this.applyAllSettings();
    this.saveSettings();
  }

  // ── 색맹 모드 ─────────────────────────────────────────────

  /** 색맹 모드 설정 */
  setColorBlindMode(mode: ColorBlindMode): void {
    this.settings.colorBlindMode = mode;
    this.applyColorBlindFilter();
    this.saveSettings();
  }

  /** 색맹 CSS 필터 적용 */
  private applyColorBlindFilter(): void {
    const canvas = this.gameCanvas;
    if (!canvas) return;

    const mode = this.settings.colorBlindMode;
    if (mode === 'none') {
      canvas.style.filter = canvas.style.filter.replace(/url\(#[a-z]+-filter\)/g, '').trim() || 'none';
    } else {
      // SVG 필터 사용 (정확도 높음), fallback으로 CSS 필터
      const svgFilter = COLOR_BLIND_FILTERS[mode];
      const existing = canvas.style.filter.replace(/url\(#[a-z]+-filter\)/g, '').trim();
      canvas.style.filter = existing && existing !== 'none'
        ? `${svgFilter} ${existing}`
        : svgFilter;
    }
  }

  // ── 고대비 모드 ────────────────────────────────────────────

  /** 고대비 모드 토글 */
  setHighContrast(enabled: boolean): void {
    this.settings.highContrast = enabled;
    this.applyHighContrast();
    this.saveSettings();
  }

  /** 고대비 CSS 적용 */
  private applyHighContrast(): void {
    const root = document.documentElement;
    if (this.settings.highContrast) {
      root.classList.add('aeterna-high-contrast');
      // 고대비 스타일 주입
      this.injectHighContrastStyles();
    } else {
      root.classList.remove('aeterna-high-contrast');
    }
  }

  /** 고대비 스타일시트 동적 주입 */
  private injectHighContrastStyles(): void {
    if (document.getElementById('aeterna-hc-styles')) return;
    const style = document.createElement('style');
    style.id = 'aeterna-hc-styles';
    style.textContent = `
      .aeterna-high-contrast * {
        border-color: #FFD700 !important;
        outline-color: #FFD700 !important;
      }
      .aeterna-high-contrast .ui-text,
      .aeterna-high-contrast [data-ui-text] {
        color: #FFFFFF !important;
        text-shadow: 2px 2px 0 #000, -1px -1px 0 #000 !important;
        font-weight: bold !important;
      }
      .aeterna-high-contrast .ui-panel,
      .aeterna-high-contrast [data-ui-panel] {
        border: 2px solid #FFD700 !important;
        background-color: rgba(0, 0, 0, 0.9) !important;
      }
      .aeterna-high-contrast .ui-button,
      .aeterna-high-contrast [data-ui-button] {
        border: 2px solid #FFD700 !important;
        background-color: #1a1a2e !important;
        color: #FFFFFF !important;
      }
      .aeterna-high-contrast .ui-button:focus,
      .aeterna-high-contrast [data-ui-button]:focus {
        outline: 3px solid #00FF00 !important;
        outline-offset: 2px !important;
      }
    `;
    document.head.appendChild(style);
  }

  // ── UI 스케일링 ────────────────────────────────────────────

  /** UI 스케일 설정 (0.75 ~ 2.0) */
  setUiScale(scale: number): void {
    this.settings.uiScale = Math.max(MIN_UI_SCALE, Math.min(MAX_UI_SCALE, scale));
    this.applyUiScale();
    this.saveSettings();
  }

  /** UI 스케일 CSS 변수 적용 */
  private applyUiScale(): void {
    document.documentElement.style.setProperty('--aeterna-ui-scale', String(this.settings.uiScale));
    // Phaser UI 컨테이너에도 transform 적용
    const uiRoot = document.querySelector('.aeterna-ui-root') as HTMLElement | null;
    if (uiRoot) {
      uiRoot.style.transform = `scale(${this.settings.uiScale})`;
      uiRoot.style.transformOrigin = 'top left';
    }
  }

  // ── 자막 시스템 ────────────────────────────────────────────

  /** 자막 활성화/비활성화 */
  setSubtitlesEnabled(enabled: boolean): void {
    this.settings.subtitlesEnabled = enabled;
    if (this.subtitleOverlay) {
      this.subtitleOverlay.style.display = enabled ? 'block' : 'none';
    }
    this.saveSettings();
  }

  /** 자막 크기 설정 */
  setSubtitleSize(size: SubtitleSize): void {
    this.settings.subtitleSize = size;
    this.applySubtitleStyles();
    this.saveSettings();
  }

  /** 자막 배경 불투명도 설정 */
  setSubtitleBgOpacity(opacity: number): void {
    this.settings.subtitleBgOpacity = Math.max(0, Math.min(1, opacity));
    this.applySubtitleStyles();
    this.saveSettings();
  }

  /** 자막 표시 */
  showSubtitle(entry: SubtitleEntry): void {
    if (!this.settings.subtitlesEnabled || !this.subtitleOverlay) return;

    this.subtitleQueue.push(entry);
    this.renderSubtitle(entry);

    // duration 후 자동 제거
    setTimeout(() => {
      this.subtitleQueue = this.subtitleQueue.filter(s => s.id !== entry.id);
      this.renderCurrentSubtitle();
    }, entry.duration);
  }

  /** 자막 즉시 제거 */
  clearSubtitles(): void {
    this.subtitleQueue = [];
    if (this.subtitleOverlay) {
      this.subtitleOverlay.innerHTML = '';
    }
  }

  /** 자막 오버레이 생성 */
  private createSubtitleOverlay(): void {
    if (this.subtitleOverlay) return;
    const overlay = document.createElement('div');
    overlay.id = 'aeterna-subtitle-overlay';
    overlay.setAttribute('role', 'log');
    overlay.setAttribute('aria-live', 'polite');
    overlay.setAttribute('aria-label', '게임 자막');
    overlay.style.cssText = `
      position: fixed;
      bottom: 10%;
      left: 50%;
      transform: translateX(-50%);
      max-width: 80%;
      text-align: center;
      pointer-events: none;
      z-index: 9999;
      display: ${this.settings.subtitlesEnabled ? 'block' : 'none'};
    `;
    document.body.appendChild(overlay);
    this.subtitleOverlay = overlay;
    this.applySubtitleStyles();
  }

  /** 현재 자막 렌더링 */
  private renderSubtitle(entry: SubtitleEntry): void {
    if (!this.subtitleOverlay) return;
    const el = document.createElement('div');
    el.dataset.subtitleId = entry.id;
    el.style.cssText = `
      padding: 8px 16px;
      margin-bottom: 4px;
      border-radius: 4px;
      background: rgba(0, 0, 0, ${this.settings.subtitleBgOpacity});
      color: #FFFFFF;
      font-size: ${SUBTITLE_SIZE_PX[this.settings.subtitleSize]}px;
      line-height: 1.4;
    `;
    el.textContent = entry.speaker ? `[${entry.speaker}] ${entry.text}` : entry.text;
    this.subtitleOverlay.appendChild(el);
  }

  /** 큐 기반 자막 재렌더링 */
  private renderCurrentSubtitle(): void {
    if (!this.subtitleOverlay) return;
    this.subtitleOverlay.innerHTML = '';
    for (const entry of this.subtitleQueue) {
      this.renderSubtitle(entry);
    }
  }

  /** 자막 스타일 적용 */
  private applySubtitleStyles(): void {
    if (!this.subtitleOverlay) return;
    const children = this.subtitleOverlay.querySelectorAll<HTMLDivElement>('[data-subtitle-id]');
    children.forEach(el => {
      el.style.fontSize = `${SUBTITLE_SIZE_PX[this.settings.subtitleSize]}px`;
      el.style.background = `rgba(0, 0, 0, ${this.settings.subtitleBgOpacity})`;
    });
  }

  // ── 키보드 내비게이션 ──────────────────────────────────────

  /** 키보드 내비게이션 활성화/비활성화 */
  setKeyboardNavEnabled(enabled: boolean): void {
    this.settings.keyboardNavEnabled = enabled;
    if (enabled) {
      this.bindKeyboardNavigation();
    } else {
      this.unbindKeyboardNavigation();
      this.currentFocusIndex = -1;
    }
    this.saveSettings();
  }

  /** 포커스 체인에 요소 등록 */
  registerFocusable(element: FocusableElement): void {
    // 중복 방지
    const existing = this.focusChain.findIndex(e => e.id === element.id);
    if (existing >= 0) {
      this.focusChain[existing] = element;
    } else {
      this.focusChain.push(element);
    }
    // order 기준 정렬
    this.focusChain.sort((a, b) => a.order - b.order);
  }

  /** 포커스 체인에서 요소 제거 */
  unregisterFocusable(id: string): void {
    this.focusChain = this.focusChain.filter(e => e.id !== id);
    if (this.currentFocusIndex >= this.focusChain.length) {
      this.currentFocusIndex = this.focusChain.length - 1;
    }
  }

  /** 포커스 체인 초기화 */
  clearFocusChain(): void {
    this.focusChain = [];
    this.currentFocusIndex = -1;
  }

  /** 현재 포커스된 요소 ID */
  getCurrentFocusId(): string | null {
    if (this.currentFocusIndex < 0 || this.currentFocusIndex >= this.focusChain.length) return null;
    return this.focusChain[this.currentFocusIndex].id;
  }

  /** 다음 요소로 포커스 이동 */
  focusNext(): void {
    if (this.focusChain.length === 0) return;
    this.currentFocusIndex = (this.currentFocusIndex + 1) % this.focusChain.length;
    this.announceCurrentFocus();
  }

  /** 이전 요소로 포커스 이동 */
  focusPrev(): void {
    if (this.focusChain.length === 0) return;
    this.currentFocusIndex = this.currentFocusIndex <= 0
      ? this.focusChain.length - 1
      : this.currentFocusIndex - 1;
    this.announceCurrentFocus();
  }

  /** 현재 포커스 요소 활성화 */
  activateCurrent(): void {
    if (this.currentFocusIndex < 0 || this.currentFocusIndex >= this.focusChain.length) return;
    this.focusChain[this.currentFocusIndex].onActivate();
  }

  /** 키보드 이벤트 바인딩 */
  private bindKeyboardNavigation(): void {
    if (this.keyHandler) return;
    this.keyHandler = (e: KeyboardEvent) => {
      if (!this.settings.keyboardNavEnabled) return;

      switch (e.key) {
        case 'Tab':
          e.preventDefault();
          if (e.shiftKey) {
            this.focusPrev();
          } else {
            this.focusNext();
          }
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          this.activateCurrent();
          break;
        case 'Escape':
          e.preventDefault();
          this.currentFocusIndex = -1;
          this.announce('포커스 해제');
          break;
      }
    };
    document.addEventListener('keydown', this.keyHandler);
  }

  /** 키보드 이벤트 해제 */
  private unbindKeyboardNavigation(): void {
    if (this.keyHandler) {
      document.removeEventListener('keydown', this.keyHandler);
      this.keyHandler = null;
    }
  }

  // ── 스크린리더 / ARIA ──────────────────────────────────────

  /** 스크린리더 모드 설정 */
  setScreenReaderEnabled(enabled: boolean): void {
    this.settings.screenReaderEnabled = enabled;
    this.applyAriaLabels();
    this.saveSettings();
  }

  /** ARIA 라이브 영역 컨테이너 생성 */
  private createAriaContainer(): void {
    if (this.ariaContainer) return;
    const container = document.createElement('div');
    container.id = 'aeterna-aria-live';
    container.setAttribute('aria-live', 'assertive');
    container.setAttribute('aria-atomic', 'true');
    container.setAttribute('role', 'status');
    container.style.cssText = `
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
    `;
    document.body.appendChild(container);
    this.ariaContainer = container;
  }

  /** 스크린리더에 메시지 전달 (aria-live) */
  announce(message: string): void {
    if (!this.ariaContainer || !this.settings.screenReaderEnabled) return;
    // 비우고 다시 채워야 스크린리더가 재읽기
    this.ariaContainer.textContent = '';
    requestAnimationFrame(() => {
      if (this.ariaContainer) {
        this.ariaContainer.textContent = message;
      }
    });
  }

  /** UI 요소에 ARIA 라벨 자동 부여 */
  private applyAriaLabels(): void {
    if (!this.settings.screenReaderEnabled) return;

    // 캔버스에 role 부여
    if (this.gameCanvas) {
      this.gameCanvas.setAttribute('role', 'application');
      this.gameCanvas.setAttribute('aria-label', '에테르나 크로니클 게임 화면');
    }

    // data-aria-label 속성이 있는 DOM 요소에 aria-label 복사
    const elements = document.querySelectorAll('[data-aria-label]');
    elements.forEach(el => {
      const label = el.getAttribute('data-aria-label');
      if (label) {
        el.setAttribute('aria-label', label);
        el.setAttribute('role', el.getAttribute('data-aria-role') ?? 'button');
        el.setAttribute('tabindex', '0');
      }
    });
  }

  /** 포커스 요소 ARIA 안내 */
  private announceCurrentFocus(): void {
    if (this.currentFocusIndex < 0 || this.currentFocusIndex >= this.focusChain.length) return;
    const el = this.focusChain[this.currentFocusIndex];
    this.announce(`${el.label} — ${el.group}`);
  }

  // ── 모션 감소 ──────────────────────────────────────────────

  /** 모션 감소 모드 설정 */
  setReduceMotion(enabled: boolean): void {
    this.settings.reduceMotion = enabled;
    this.applyReduceMotion();
    this.saveSettings();
  }

  /** 모션 감소 CSS 적용 */
  private applyReduceMotion(): void {
    const root = document.documentElement;
    if (this.settings.reduceMotion) {
      root.classList.add('aeterna-reduce-motion');
      this.injectReduceMotionStyles();
    } else {
      root.classList.remove('aeterna-reduce-motion');
    }
  }

  /** 모션 감소 스타일시트 동적 주입 */
  private injectReduceMotionStyles(): void {
    if (document.getElementById('aeterna-rm-styles')) return;
    const style = document.createElement('style');
    style.id = 'aeterna-rm-styles';
    style.textContent = `
      .aeterna-reduce-motion *,
      .aeterna-reduce-motion *::before,
      .aeterna-reduce-motion *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
        scroll-behavior: auto !important;
      }
    `;
    document.head.appendChild(style);
  }

  /** 모션 감소 상태인지 확인 (Phaser 애니메이션 체크용) */
  isMotionReduced(): boolean {
    return this.settings.reduceMotion;
  }

  // ── SVG 필터 삽입 ──────────────────────────────────────────

  /** 색맹 필터 SVG를 DOM에 삽입 */
  private injectSvgFilters(): void {
    if (this.svgInjected) return;
    const container = document.createElement('div');
    container.innerHTML = COLOR_BLIND_SVG;
    document.body.appendChild(container);
    this.svgInjected = true;
  }

  // ── 전체 적용 ──────────────────────────────────────────────

  /** 모든 설정 한 번에 적용 */
  private applyAllSettings(): void {
    this.applyColorBlindFilter();
    this.applyHighContrast();
    this.applyUiScale();
    this.applyReduceMotion();
    this.applyAriaLabels();
    if (this.subtitleOverlay) {
      this.subtitleOverlay.style.display = this.settings.subtitlesEnabled ? 'block' : 'none';
      this.applySubtitleStyles();
    }
    if (this.settings.keyboardNavEnabled) {
      this.bindKeyboardNavigation();
    } else {
      this.unbindKeyboardNavigation();
    }
  }
}

// ── 싱글톤 인스턴스 ──────────────────────────────────────────

/** 전역 접근성 관리자 인스턴스 */
export const accessibilityManager = new AccessibilityManager();
