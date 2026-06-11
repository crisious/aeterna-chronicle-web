import { beforeAll, beforeEach, describe, expect, test } from 'vitest';

import { AccessibilityManager } from '../../client/src/accessibility/AccessibilityManager';

const STORAGE_KEY = 'aeterna_accessibility_settings';

// node 환경 localStorage 미존재 → in-memory shim 주입 (jsdom/happy-dom 없이도 동작, eraStorage.test.ts 패턴)
beforeAll(() => {
  if (typeof globalThis.localStorage === 'undefined') {
    const store = new Map<string, string>();
    (globalThis as { localStorage: Storage }).localStorage = {
      getItem: (k) => store.get(k) ?? null,
      setItem: (k, v) => { store.set(k, String(v)); },
      removeItem: (k) => { store.delete(k); },
      clear: () => { store.clear(); },
      key: (i) => Array.from(store.keys())[i] ?? null,
      get length() { return store.size; },
    } as Storage;
  }
});

/**
 * 유닛 테스트 — AccessibilityManager.keyboardOnlyMode (전키보드 UI P6 컷오버 토글).
 * 켜면 게임 캔버스 포인터(마우스·터치)를 비활성화하는 토글. 여기선 상태 머신을 검증
 * (캔버스 적용은 gameCanvas.style.pointerEvents 한 줄 — DOM 필요해 통합 검증 영역).
 * 컷오버(기본 ON): 감사 high 5건 + med 2건(PR #270~#274) 전부 해소 후 전환.
 * 기존 사용자의 저장 설정(opt-out 포함)은 loadSettings 머지가 그대로 존중한다.
 */
describe('AccessibilityManager — keyboardOnlyMode 토글', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('기본값은 true (키보드 컷오버 — 신규 사용자는 키보드 전용으로 시작)', () => {
    const am = new AccessibilityManager();
    expect(am.getSettings().keyboardOnlyMode).toBe(true);
  });

  test('setKeyboardOnlyMode 가 상태를 토글하고 getSettings 에 반영', () => {
    const am = new AccessibilityManager();
    am.setKeyboardOnlyMode(false);
    expect(am.getSettings().keyboardOnlyMode).toBe(false);
    am.setKeyboardOnlyMode(true);
    expect(am.getSettings().keyboardOnlyMode).toBe(true);
  });

  test('저장된 opt-out(false)은 컷오버 후에도 존중 — loadSettings 가 기본값으로 덮지 않는다', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ keyboardOnlyMode: false }));
    const am = new AccessibilityManager();
    expect(am.loadSettings().keyboardOnlyMode).toBe(false);
  });

  test('구버전 저장분(keyboardOnlyMode 키 부재)은 새 기본 true 로 마이그레이션', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ reduceMotion: true }));
    const am = new AccessibilityManager();
    const s = am.loadSettings();
    expect(s.keyboardOnlyMode).toBe(true);
    expect(s.reduceMotion).toBe(true);
  });
});
