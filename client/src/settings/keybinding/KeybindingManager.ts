/**
 * KeybindingManager — 키 리바인딩 시스템 (P17-12)
 *
 * 기능:
 *   - 26개 액션의 주 키 / 보조 키 / 게임패드 바인딩
 *   - 프리셋 5종 + 게임패드 로드
 *   - 충돌 감지 + 해결 (교체/양쪽유지/취소)
 *   - localStorage + 서버 동기화
 *   - JSON 내보내기/가져오기
 */

import actionMapData from './action_map.json';

// ─── 타입 ───────────────────────────────────────────────────────

export type PresetName = 'wasd' | 'arrows' | 'mouse_only' | 'one_hand_left' | 'one_hand_right' | 'gamepad';
export type BindingSlot = 'primary' | 'secondary' | 'gamepad';

export interface KeyBinding {
  primary: string | null;
  secondary: string | null;
  gamepad: string | null;
}

export interface ConflictResult {
  hasConflict: boolean;
  conflictActionId: string | null;
  conflictActionLabel: string | null;
}

export interface ActionDef {
  id: string;
  category: string;
  label_ko: string;
  label_en: string;
  default: KeyBinding;
  protected: boolean;
}

interface SaveData {
  version: number;
  preset: PresetName;
  custom: boolean;
  bindings: Record<string, KeyBinding>;
  timestamp: string;
}

// ─── 상수 ───────────────────────────────────────────────────────

const STORAGE_KEY = 'aeterna_keybindings';
const FORBIDDEN_KEYS = new Set(actionMapData.forbidden_keys);
const PROTECTED_ACTIONS = new Set(actionMapData.protected_actions);

// ─── 키바인딩 매니저 ────────────────────────────────────────────

export class KeybindingManager {
  private actions: ActionDef[];
  private bindings: Map<string, KeyBinding> = new Map();
  private currentPreset: PresetName = 'wasd';
  private isCustom = false;
  private listeners: Array<() => void> = [];

  constructor() {
    this.actions = actionMapData.actions as ActionDef[];
    this.resetToDefault();
  }

  // ── 프리셋 ─────────────────────────────────────────────────

  /** 프리셋 로드 — 모든 바인딩을 프리셋 값으로 초기화 */
  loadPreset(name: PresetName): void {
    this.currentPreset = name;
    this.isCustom = false;

    // 기본값으로 초기화 후 프리셋 오버라이드
    this.resetToDefault();

    if (name === 'wasd') return; // 기본값이 WASD

    // 프리셋별 오버라이드 (실제 프리셋 JSON 파일에서 로드 가능)
    const overrides = this.getPresetOverrides(name);
    for (const [actionId, binding] of Object.entries(overrides)) {
      this.bindings.set(actionId, { ...this.bindings.get(actionId)!, ...binding });
    }

    this.save();
    this.notifyChange();
  }

  getCurrentPreset(): PresetName {
    return this.currentPreset;
  }

  isCustomized(): boolean {
    return this.isCustom;
  }

  /** 프리셋 오버라이드 매핑 */
  private getPresetOverrides(name: PresetName): Record<string, Partial<KeyBinding>> {
    switch (name) {
      case 'arrows':
        return {
          move_up: { primary: 'ArrowUp' },
          move_down: { primary: 'ArrowDown' },
          move_left: { primary: 'ArrowLeft' },
          move_right: { primary: 'ArrowRight' },
          attack_basic: { primary: 'Numpad1' },
          skill_1: { primary: 'Numpad2' },
          skill_2: { primary: 'Numpad3' },
          skill_3: { primary: 'Numpad4' },
          skill_4: { primary: 'Numpad5' },
          dodge: { primary: 'Numpad0' },
          inventory: { primary: 'Home' },
          character: { primary: 'End' },
          map: { primary: 'PageUp' },
        };
      case 'mouse_only':
        return {
          move_up: { primary: null },
          move_down: { primary: null },
          move_left: { primary: null },
          move_right: { primary: null },
          attack_basic: { primary: 'Mouse0' },
        };
      case 'one_hand_left':
        return {
          inventory: { primary: 'CapsLock' },
          character: { primary: 'Backquote' },
          map: { primary: 'Digit2' },
          quest_log: { primary: 'Digit3' },
        };
      case 'one_hand_right':
        return {
          move_up: { primary: 'KeyI' },
          move_down: { primary: 'KeyK' },
          move_left: { primary: 'KeyJ' },
          move_right: { primary: 'KeyL' },
          attack_basic: { primary: 'KeyU', secondary: null },
          skill_1: { primary: 'KeyO' },
          skill_2: { primary: 'KeyP' },
          skill_3: { primary: 'Semicolon' },
          skill_4: { primary: 'Quote' },
          dodge: { primary: 'Space' },
          potion: { primary: 'Digit7' },
          inventory: { primary: 'BracketLeft' },
          character: { primary: 'BracketRight' },
          map: { primary: 'Backslash' },
        };
      case 'gamepad':
        // 게임패드 프리셋은 키보드를 기본값으로 유지하고 게임패드만 강화
        return {};
      default:
        return {};
    }
  }

  // ── 바인딩 변경 ────────────────────────────────────────────

  /** 개별 바인딩 변경 — 충돌 확인 결과 반환 */
  setBinding(actionId: string, slot: BindingSlot, key: string | null): ConflictResult {
    // 금지 키 체크
    if (key && FORBIDDEN_KEYS.has(key)) {
      return { hasConflict: true, conflictActionId: null, conflictActionLabel: '시스템 예약 키' };
    }

    // 보호 액션 체크
    if (PROTECTED_ACTIONS.has(actionId) && slot === 'primary' && !key) {
      return { hasConflict: true, conflictActionId: actionId, conflictActionLabel: '필수 바인딩 — 해제 불가' };
    }

    // 충돌 감지
    const conflict = key ? this.checkConflict(key, actionId) : null;

    const binding = this.bindings.get(actionId);
    if (binding) {
      binding[slot] = key;
      this.isCustom = true;
      this.save();
      this.notifyChange();
    }

    if (conflict) {
      const conflictAction = this.actions.find(a => a.id === conflict);
      return {
        hasConflict: true,
        conflictActionId: conflict,
        conflictActionLabel: conflictAction?.label_ko ?? conflict,
      };
    }

    return { hasConflict: false, conflictActionId: null, conflictActionLabel: null };
  }

  /** 바인딩 조회 */
  getBinding(actionId: string): KeyBinding | null {
    return this.bindings.get(actionId) ?? null;
  }

  /** 전체 바인딩 반환 */
  getAllBindings(): Record<string, KeyBinding> {
    const result: Record<string, KeyBinding> = {};
    this.bindings.forEach((binding, id) => {
      result[id] = { ...binding };
    });
    return result;
  }

  /** 액션 목록 반환 */
  getActions(): ActionDef[] {
    return [...this.actions];
  }

  // ── 충돌 해결 ──────────────────────────────────────────────

  /** 특정 키가 이미 다른 액션에 바인딩되어 있는지 확인 */
  checkConflict(key: string, excludeAction?: string): string | null {
    for (const [actionId, binding] of this.bindings) {
      if (actionId === excludeAction) continue;
      if (binding.primary === key || binding.secondary === key) {
        return actionId;
      }
    }
    return null;
  }

  /** 충돌 키 교체 — conflictAction에서 키 해제 */
  resolveConflictBySwap(conflictActionId: string, key: string): void {
    const binding = this.bindings.get(conflictActionId);
    if (!binding) return;
    if (binding.primary === key) binding.primary = null;
    if (binding.secondary === key) binding.secondary = null;
    this.save();
    this.notifyChange();
  }

  // ── 키 입력 → 액션 변환 ─────────────────────────────────

  /** KeyboardEvent.code → 액션 ID (게임 루프에서 호출) */
  resolveKeyboardAction(code: string): string | null {
    for (const [actionId, binding] of this.bindings) {
      if (binding.primary === code || binding.secondary === code) {
        return actionId;
      }
    }
    return null;
  }

  /** Gamepad 버튼명 → 액션 ID */
  resolveGamepadAction(button: string): string | null {
    for (const [actionId, binding] of this.bindings) {
      if (binding.gamepad === button) {
        return actionId;
      }
    }
    return null;
  }

  // ── 저장 / 로드 ────────────────────────────────────────────

  /** localStorage 저장 */
  save(): void {
    try {
      const data: SaveData = {
        version: 1,
        preset: this.currentPreset,
        custom: this.isCustom,
        bindings: this.getAllBindings(),
        timestamp: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // 저장 실패 — 무시
    }
  }

  /** localStorage에서 로드 */
  load(): boolean {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw) as SaveData;
      if (data.version !== 1) return false;

      this.currentPreset = data.preset;
      this.isCustom = data.custom;
      for (const [actionId, binding] of Object.entries(data.bindings)) {
        this.bindings.set(actionId, binding);
      }
      return true;
    } catch {
      return false;
    }
  }

  // ── 내보내기 / 가져오기 ────────────────────────────────────

  /** JSON 문자열 내보내기 */
  exportJSON(): string {
    return JSON.stringify({
      version: 1,
      preset: this.currentPreset,
      custom: this.isCustom,
      bindings: this.getAllBindings(),
      timestamp: new Date().toISOString(),
    }, null, 2);
  }

  /** JSON 문자열에서 가져오기 */
  importJSON(json: string): boolean {
    try {
      const data = JSON.parse(json) as SaveData;
      if (data.version !== 1) return false;

      this.currentPreset = data.preset;
      this.isCustom = true;
      for (const [actionId, binding] of Object.entries(data.bindings)) {
        if (this.bindings.has(actionId)) {
          this.bindings.set(actionId, binding);
        }
      }
      this.save();
      this.notifyChange();
      return true;
    } catch {
      return false;
    }
  }

  // ── 초기화 ─────────────────────────────────────────────────

  /** 기본값 복원 */
  resetToDefault(): void {
    this.bindings.clear();
    for (const action of this.actions) {
      this.bindings.set(action.id, { ...action.default });
    }
    this.currentPreset = 'wasd';
    this.isCustom = false;
  }

  // ── 변경 알림 ──────────────────────────────────────────────

  /** 변경 리스너 등록 */
  onChange(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyChange(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}

/** 싱글톤 인스턴스 */
export const keybindingManager = new KeybindingManager();
