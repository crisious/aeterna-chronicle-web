/**
 * Unit tests — eraStorage (CHRONO-S5)
 * WorldScene 시대 선택 localStorage 영속화 회귀 가드.
 */
import { describe, it, expect, beforeEach, beforeAll } from 'vitest';

const STORAGE_KEY = 'aeterna_last_era';

// node 환경 localStorage 미존재 → in-memory shim 주입 (jsdom/happy-dom 없이도 동작)
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

const { loadLastEra, saveLastEra, clearLastEra } = await import('../../client/src/time/eraStorage');

describe('eraStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('loadLastEra returns null when key missing', () => {
    expect(loadLastEra()).toBeNull();
  });

  it('saveLastEra + loadLastEra roundtrip ancient', () => {
    saveLastEra('ancient');
    expect(loadLastEra()).toBe('ancient');
  });

  it('saveLastEra + loadLastEra roundtrip present', () => {
    saveLastEra('present');
    expect(loadLastEra()).toBe('present');
  });

  it('saveLastEra + loadLastEra roundtrip ruined_future', () => {
    saveLastEra('ruined_future');
    expect(loadLastEra()).toBe('ruined_future');
  });

  it('loadLastEra rejects invalid era and returns null', () => {
    localStorage.setItem(STORAGE_KEY, 'distant_past');
    expect(loadLastEra()).toBeNull();
  });

  it('saveLastEra ignores invalid era input', () => {
    saveLastEra('ancient');
    saveLastEra('bogus' as never);
    // 직전 유효 값이 유지됨 (덮어쓰기 안 됨)
    expect(loadLastEra()).toBe('ancient');
  });

  it('clearLastEra removes saved era', () => {
    saveLastEra('ruined_future');
    clearLastEra();
    expect(loadLastEra()).toBeNull();
  });
});
