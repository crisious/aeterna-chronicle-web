/**
 * BrowserCompatBootstrap — 크로스브라우저 안정성 부트스트랩
 *
 * 작성: Phase 54 / v1.0.0-rc.3 (2026-04-27)
 *   — 스프린트 산출물에 테스트 (`tests/unit/browserCompat.test.ts`) 만 있고
 *     본 모듈이 누락되어 있었던 것을 본 사이클에서 보강.
 *
 * 책임:
 *  1) `installStorageFallback` — localStorage 쓰기 실패(QuotaExceeded 등) 시
 *      메모리 폴백으로 자동 전환, 진단 정보 반환.
 *  2) `shouldSuppressGameShortcut` — IME 조합 중 키 입력은 게임 단축키로
 *      전달하지 않음. textarea/input/contentEditable 포커스도 차단.
 *
 * RendererDetector와는 책임 분리:
 *  - RendererDetector: WebGL/Canvas 폴백 + body[data-*] 마킹
 *  - BrowserCompatBootstrap: storage/keyboard 런타임 폴백
 */

// ─── 1) Storage Fallback ────────────────────────────────────────

export type StorageBackend = 'native' | 'memory';

export interface StorageFallbackDiagnostics {
  localStorage: StorageBackend;
  sessionStorage: StorageBackend;
}

/**
 * 메모리 기반 Storage 구현 — quota/private mode 회피용.
 */
function createMemoryStorage(): Storage {
  const memory = new Map<string, string>();
  return {
    getItem(key: string): string | null {
      return memory.get(key) ?? null;
    },
    setItem(key: string, value: string): void {
      memory.set(key, String(value));
    },
    removeItem(key: string): void {
      memory.delete(key);
    },
    clear(): void {
      memory.clear();
    },
    key(index: number): string | null {
      return Array.from(memory.keys())[index] ?? null;
    },
    get length(): number {
      return memory.size;
    },
  } as Storage;
}

/**
 * 단일 Storage 객체의 setItem 가용성을 시도한다.
 * 실패 시 메모리 폴백 + window.<key> 재정의.
 */
function probeAndPatch(
  win: Window & typeof globalThis,
  key: 'localStorage' | 'sessionStorage',
): StorageBackend {
  const probeKey = `__compat_probe_${key}__`;
  try {
    const native = win[key];
    native.setItem(probeKey, '1');
    native.removeItem(probeKey);
    return 'native';
  } catch {
    const fallback = createMemoryStorage();
    Object.defineProperty(win, key, {
      configurable: true,
      get() {
        return fallback;
      },
    });
    return 'memory';
  }
}

/**
 * 두 Storage(localStorage, sessionStorage)를 점검하고 필요 시 폴백 설치.
 *
 * @param win 대상 window (테스트용 mock 가능)
 * @param _doc document — UI 토스트 노출 훅 자리 (현재는 비활성, 후속 PR)
 * @returns 어떤 백엔드로 동작하는지 진단 정보
 */
export function installStorageFallback(
  win: Window & typeof globalThis,
  _doc?: Document,
): StorageFallbackDiagnostics {
  return {
    localStorage: probeAndPatch(win, 'localStorage'),
    sessionStorage: probeAndPatch(win, 'sessionStorage'),
  };
}

// ─── 2) Game Shortcut Suppression ────────────────────────────────

/**
 * 입력 위젯 포커스 여부 — 단축키가 텍스트 입력을 가로채지 않도록.
 */
function isInputFocused(target: EventTarget | null): boolean {
  if (!target) return false;
  const t = target as { tagName?: string; isContentEditable?: boolean };
  if (t.isContentEditable) return true;
  const tag = (t.tagName || '').toUpperCase();
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

/**
 * 키 이벤트가 게임 단축키로 전달되어야 하는지 판정.
 *
 * 차단 조건:
 *  - IME 조합 중 (`isComposing` true 또는 `key === 'Process'`)
 *  - 입력 위젯에 포커스 (`force=false`인 경우)
 *
 * @param ev 키보드 이벤트 (테스트에서는 부분 객체도 허용)
 * @param force 입력 위젯 포커스 여부 무시 — 메뉴 단축키 등
 */
export function shouldSuppressGameShortcut(
  ev: Pick<KeyboardEvent, 'isComposing' | 'key' | 'target'>,
  force?: boolean,
): boolean {
  if (ev.isComposing) return true;
  if (ev.key === 'Process') return true;
  if (!force && isInputFocused(ev.target)) return true;
  return false;
}
