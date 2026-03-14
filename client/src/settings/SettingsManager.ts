/**
 * P28-07: 설정 화면 완성 — 통합 설정 매니저
 *
 * 그래픽/오디오/조작/접근성 설정 + 키 리바인딩.
 * SettingsScene에서 UI 렌더링, 여기서 데이터 관리.
 */

// ─── 설정 타입 ──────────────────────────────────────────────────

export interface GraphicsSettings {
  /** 해상도 배율 (0.5 ~ 2.0) */
  resolutionScale: number;
  /** 파티클 밀도 (low/medium/high) */
  particleDensity: 'low' | 'medium' | 'high';
  /** 화면 흔들림 효과 */
  screenShake: boolean;
  /** V-Sync */
  vsync: boolean;
  /** 안티앨리어싱 */
  antiAliasing: boolean;
  /** FPS 표시 */
  showFps: boolean;
}

export interface AudioSettings {
  masterVolume: number;   // 0.0 ~ 1.0
  bgmVolume: number;
  sfxVolume: number;
  ambientVolume: number;
  voiceVolume: number;
  muted: boolean;
}

export interface ControlSettings {
  /** 키 바인딩 (액션 → 키 코드) */
  keybindings: Record<string, string>;
  /** 마우스 감도 (0.1 ~ 3.0) */
  mouseSensitivity: number;
  /** 더블클릭으로 자동이동 */
  doubleClickAutoMove: boolean;
  /** 드래그로 카메라 이동 */
  dragCameraMove: boolean;
}

export interface AccessibilitySettings {
  /** UI 스케일 (0.8 ~ 1.5) */
  uiScale: number;
  /** 색맹 모드 */
  colorblindMode: 'off' | 'protanopia' | 'deuteranopia' | 'tritanopia';
  /** 자막 크기 */
  subtitleSize: 'small' | 'medium' | 'large';
  /** 고대비 모드 */
  highContrast: boolean;
  /** 화면 읽기 보조 텍스트 활성화 */
  screenReaderHints: boolean;
  /** 깜빡임 감소 */
  reduceFlashing: boolean;
  /** 자동 전투 (접근성 보조) */
  autoBattleAssist: boolean;
}

export interface GameSettings {
  graphics: GraphicsSettings;
  audio: AudioSettings;
  controls: ControlSettings;
  accessibility: AccessibilitySettings;
  language: 'ko' | 'en' | 'ja';
}

// ─── 기본값 ──────────────────────────────────────────────────────

const DEFAULT_KEYBINDINGS: Record<string, string> = {
  move_up: 'KeyW',
  move_down: 'KeyS',
  move_left: 'KeyA',
  move_right: 'KeyD',
  attack: 'Space',
  skill_1: 'Digit1',
  skill_2: 'Digit2',
  skill_3: 'Digit3',
  skill_4: 'Digit4',
  inventory: 'KeyI',
  quest_log: 'KeyJ',
  world_map: 'KeyM',
  minimap_toggle: 'KeyN',
  chat_toggle: 'Enter',
  settings: 'Escape',
  screenshot: 'F12',
};

export const DEFAULT_SETTINGS: GameSettings = {
  graphics: {
    resolutionScale: 1.0,
    particleDensity: 'medium',
    screenShake: true,
    vsync: true,
    antiAliasing: true,
    showFps: false,
  },
  audio: {
    masterVolume: 0.8,
    bgmVolume: 0.7,
    sfxVolume: 0.8,
    ambientVolume: 0.5,
    voiceVolume: 0.7,
    muted: false,
  },
  controls: {
    keybindings: { ...DEFAULT_KEYBINDINGS },
    mouseSensitivity: 1.0,
    doubleClickAutoMove: true,
    dragCameraMove: true,
  },
  accessibility: {
    uiScale: 1.0,
    colorblindMode: 'off',
    subtitleSize: 'medium',
    highContrast: false,
    screenReaderHints: false,
    reduceFlashing: false,
    autoBattleAssist: false,
  },
  language: 'ko',
};

// ─── 저장/로드 ──────────────────────────────────────────────────

const SETTINGS_KEY = 'aeterna_game_settings_v2';

export class SettingsManager {
  private settings: GameSettings;
  private listeners: Array<(settings: GameSettings) => void> = [];

  constructor() {
    this.settings = this.load();
  }

  get current(): Readonly<GameSettings> {
    return this.settings;
  }

  /** 설정 부분 업데이트 */
  update(partial: Partial<GameSettings>): void {
    this.settings = this.deepMerge(this.settings, partial);
    this.save();
    this.notifyListeners();
  }

  /** 그래픽 설정 업데이트 */
  updateGraphics(partial: Partial<GraphicsSettings>): void {
    this.settings.graphics = { ...this.settings.graphics, ...partial };
    this.save();
    this.notifyListeners();
  }

  /** 오디오 설정 업데이트 */
  updateAudio(partial: Partial<AudioSettings>): void {
    this.settings.audio = { ...this.settings.audio, ...partial };
    this.save();
    this.notifyListeners();
  }

  /** 조작 설정 업데이트 */
  updateControls(partial: Partial<ControlSettings>): void {
    this.settings.controls = { ...this.settings.controls, ...partial };
    this.save();
    this.notifyListeners();
  }

  /** 접근성 설정 업데이트 */
  updateAccessibility(partial: Partial<AccessibilitySettings>): void {
    this.settings.accessibility = { ...this.settings.accessibility, ...partial };
    this.save();
    this.notifyListeners();
  }

  /** 키 리바인딩 */
  rebindKey(action: string, newKey: string): boolean {
    // 동일 키가 이미 다른 액션에 바인딩되어 있는지 확인
    const existing = Object.entries(this.settings.controls.keybindings)
      .find(([a, k]) => k === newKey && a !== action);
    if (existing) {
      // 충돌 시 기존 바인딩 해제 (스왑)
      const oldKey = this.settings.controls.keybindings[action];
      this.settings.controls.keybindings[existing[0]] = oldKey;
    }
    this.settings.controls.keybindings[action] = newKey;
    this.save();
    this.notifyListeners();
    return true;
  }

  /** 기본값으로 초기화 */
  resetToDefault(): void {
    this.settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
    this.save();
    this.notifyListeners();
  }

  /** 키바인딩만 초기화 */
  resetKeybindings(): void {
    this.settings.controls.keybindings = { ...DEFAULT_KEYBINDINGS };
    this.save();
    this.notifyListeners();
  }

  /** 변경 리스너 등록 */
  onChange(listener: (settings: GameSettings) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /** 키 코드 → 표시 라벨 */
  static keyLabel(code: string): string {
    const labels: Record<string, string> = {
      Space: '스페이스',
      Enter: '엔터',
      Escape: 'ESC',
      KeyW: 'W', KeyA: 'A', KeyS: 'S', KeyD: 'D',
      KeyI: 'I', KeyJ: 'J', KeyM: 'M', KeyN: 'N',
      Digit1: '1', Digit2: '2', Digit3: '3', Digit4: '4',
      F12: 'F12',
    };
    return labels[code] ?? code.replace('Key', '').replace('Digit', '');
  }

  private load(): GameSettings {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        return this.deepMerge(JSON.parse(JSON.stringify(DEFAULT_SETTINGS)), saved);
      }
    } catch { /* ignore corrupt data */ }
    return JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  }

  private save(): void {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
    } catch { /* storage full */ }
  }

  private notifyListeners(): void {
    for (const fn of this.listeners) {
      try { fn(this.settings); } catch { /* listener error */ }
    }
  }

  private deepMerge(target: any, source: any): any {
    const result = { ...target };
    for (const key of Object.keys(source)) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    return result;
  }
}

/** 싱글톤 인스턴스 */
export const settingsManager = new SettingsManager();
