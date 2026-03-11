/**
 * i18nManager.ts — 다국어(L10N) 관리 모듈
 * 
 * 기능:
 * - 언어 전환 (ko / en / ja)
 * - 키 기반 문자열 조회 (점 표기법)
 * - Fallback: 현재 언어에 키가 없으면 en → ko 순서로 탐색
 * - 동적 파라미터 치환 ({key} 형식)
 * - localStorage 기반 설정 영속화
 */

import ko from './ko.json';
import en from './en.json';
import ja from './ja.json';

// ── 타입 정의 ──────────────────────────────────────────────

/** 지원 언어 코드 */
export type SupportedLocale = 'ko' | 'en' | 'ja';

/** 중첩 JSON 구조를 위한 재귀 타입 */
type NestedRecord = { [key: string]: string | NestedRecord };

/** 동적 파라미터 맵 */
type Params = Record<string, string | number>;

// ── 상수 ────────────────────────────────────────────────────

const LOCALE_STORAGE_KEY = 'aeterna_locale';
const DEFAULT_LOCALE: SupportedLocale = 'ko';
const FALLBACK_LOCALE: SupportedLocale = 'en';

/** 언어별 번역 데이터 */
const LOCALE_DATA: Record<SupportedLocale, NestedRecord> = {
  ko: ko as unknown as NestedRecord,
  en: en as unknown as NestedRecord,
  ja: ja as unknown as NestedRecord,
};

// ── I18nManager 클래스 ──────────────────────────────────────

class I18nManager {
  private _locale: SupportedLocale;
  private _listeners: Array<(locale: SupportedLocale) => void> = [];

  constructor() {
    this._locale = this._loadSavedLocale();
  }

  // ── public API ──

  /** 현재 언어 코드 반환 */
  get locale(): SupportedLocale {
    return this._locale;
  }

  /** 지원 언어 목록 */
  get supportedLocales(): SupportedLocale[] {
    return ['ko', 'en', 'ja'];
  }

  /**
   * 언어 전환
   * @param locale 전환할 언어 코드
   */
  setLocale(locale: SupportedLocale): void {
    if (!LOCALE_DATA[locale]) {
      console.warn(`[i18n] 지원하지 않는 언어: ${locale}. 기본값(${DEFAULT_LOCALE}) 유지.`);
      return;
    }
    this._locale = locale;
    this._saveLocale(locale);
    this._notifyListeners();
  }

  /**
   * 번역 키로 문자열 조회
   * 
   * @param key 점 표기법 키 (예: "ui.menu.start")
   * @param params 동적 파라미터 (예: { level: 10 })
   * @returns 번역된 문자열. 키가 없으면 키 자체를 반환.
   * 
   * @example
   * i18n.t('ui.battle.levelUp', { level: 10 })
   * // → "레벨 업! Lv.10"
   */
  t(key: string, params?: Params): string {
    // 1차: 현재 언어
    let value = this._resolve(this._locale, key);

    // 2차: fallback 언어 (en)
    if (value === null && this._locale !== FALLBACK_LOCALE) {
      value = this._resolve(FALLBACK_LOCALE, key);
    }

    // 3차: 기본 언어 (ko)
    if (value === null && this._locale !== DEFAULT_LOCALE && FALLBACK_LOCALE !== DEFAULT_LOCALE) {
      value = this._resolve(DEFAULT_LOCALE, key);
    }

    // 키를 찾지 못한 경우
    if (value === null) {
      console.warn(`[i18n] 누락 키: "${key}" (locale: ${this._locale})`);
      return key;
    }

    // 파라미터 치환
    if (params) {
      return this._interpolate(value, params);
    }
    return value;
  }

  /**
   * 키 존재 여부 확인
   */
  has(key: string, locale?: SupportedLocale): boolean {
    return this._resolve(locale ?? this._locale, key) !== null;
  }

  /**
   * 언어 변경 리스너 등록
   * @returns 해제 함수
   */
  onChange(listener: (locale: SupportedLocale) => void): () => void {
    this._listeners.push(listener);
    return () => {
      this._listeners = this._listeners.filter(l => l !== listener);
    };
  }

  /**
   * 특정 섹션의 전체 번역 데이터 반환
   * @param section 섹션 키 (예: "combat.skills")
   */
  getSection(section: string): Record<string, string> {
    const data = LOCALE_DATA[this._locale];
    const node = this._getNode(data, section);
    if (!node || typeof node === 'string') return {};
    return this._flatten(node);
  }

  // ── private 헬퍼 ──

  /** 점 표기법으로 중첩 객체 탐색 */
  private _resolve(locale: SupportedLocale, key: string): string | null {
    const data = LOCALE_DATA[locale];
    if (!data) return null;
    const result = this._getNode(data, key);
    return typeof result === 'string' ? result : null;
  }

  /** 중첩 객체에서 키 경로로 노드 접근 */
  private _getNode(data: NestedRecord, key: string): string | NestedRecord | null {
    const parts = key.split('.');
    let current: string | NestedRecord = data;
    for (const part of parts) {
      if (typeof current !== 'object' || current === null) return null;
      const nextVal: string | NestedRecord | undefined = (current as NestedRecord)[part];
      if (nextVal === undefined) return null;
      current = nextVal;
    }
    return current;
  }

  /** {key} 형식 파라미터 치환 */
  private _interpolate(text: string, params: Params): string {
    return text.replace(/\{(\w+)\}/g, (_match, paramKey: string) => {
      const val = params[paramKey];
      return val !== undefined ? String(val) : `{${paramKey}}`;
    });
  }

  /** 중첩 객체를 flat key-value로 변환 */
  private _flatten(node: NestedRecord, prefix = ''): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [k, v] of Object.entries(node)) {
      const fullKey = prefix ? `${prefix}.${k}` : k;
      if (typeof v === 'string') {
        result[fullKey] = v;
      } else {
        Object.assign(result, this._flatten(v, fullKey));
      }
    }
    return result;
  }

  /** localStorage에서 저장된 언어 로드 */
  private _loadSavedLocale(): SupportedLocale {
    try {
      const saved = localStorage.getItem(LOCALE_STORAGE_KEY) as SupportedLocale | null;
      if (saved && LOCALE_DATA[saved]) return saved;
    } catch {
      // SSR / 테스트 환경에서 localStorage 접근 불가 시 무시
    }
    return DEFAULT_LOCALE;
  }

  /** 현재 언어를 localStorage에 저장 */
  private _saveLocale(locale: SupportedLocale): void {
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    } catch {
      // 저장 실패 시 무시
    }
  }

  /** 리스너 일괄 호출 */
  private _notifyListeners(): void {
    for (const listener of this._listeners) {
      try {
        listener(this._locale);
      } catch (err) {
        console.error('[i18n] 리스너 오류:', err);
      }
    }
  }
}

// ── 싱글턴 인스턴스 ─────────────────────────────────────────

/** 전역 i18n 매니저 인스턴스 */
export const i18n = new I18nManager();

/** 편의 함수: 번역 키 조회 */
export const t = (key: string, params?: Params): string => i18n.t(key, params);

export default i18n;
