import { afterEach, describe, expect, test } from 'vitest';
import { detectAndApply } from '../../client/src/utils/RendererDetector';
import {
  installStorageFallback,
  shouldSuppressGameShortcut,
} from '../../client/src/utils/BrowserCompatBootstrap';

type AnyRecord = Record<string, unknown>;

class MockElement {
  public readonly style: Record<string, string> = {};
  public readonly dataset: Record<string, string> = {};
  public readonly children: MockElement[] = [];
  public textContent = '';
  public className = '';
  private readonly attributes = new Map<string, string>();

  constructor(public readonly tagName: string) {}

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
    if (name.startsWith('data-')) {
      this.dataset[name.slice(5)] = value;
    }
  }

  getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null;
  }

  appendChild(child: MockElement): MockElement {
    this.children.push(child);
    return child;
  }

  contains(target: unknown): boolean {
    return target === this || this.children.includes(target as MockElement);
  }
}

function createStorageMock(options?: { setThrows?: boolean }) {
  const memory = new Map<string, string>();

  return {
    getItem(key: string): string | null {
      return memory.get(key) ?? null;
    },
    setItem(key: string, value: string): void {
      if (options?.setThrows) {
        throw new Error('QuotaExceededError');
      }
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
  };
}

function createDocumentMock(webgl2Available: boolean) {
  const body = new MockElement('body');
  const compatToast = new MockElement('div');
  compatToast.className = 'compat-toast';
  body.appendChild(compatToast);

  const documentMock = {
    body,
    createElement(tag: string) {
      if (tag === 'canvas') {
        return {
          getContext(type: string) {
            if (type === 'webgl2') return webgl2Available ? {} : null;
            if (type === 'webgl' || type === 'experimental-webgl') return webgl2Available ? {} : null;
            return null;
          },
        };
      }

      return new MockElement(tag);
    },
    querySelector(selector: string) {
      if (selector === '.compat-toast') {
        return compatToast;
      }
      return null;
    },
    addEventListener() {
      // noop
    },
  };

  return { body, compatToast, documentMock };
}

const originalGlobals: Array<{ key: keyof typeof globalThis; hadOwn: boolean; value: unknown }> = [];

function stubGlobal<K extends keyof typeof globalThis>(key: K, value: (typeof globalThis)[K]): void {
  originalGlobals.push({
    key,
    hadOwn: Object.prototype.hasOwnProperty.call(globalThis, key),
    value: globalThis[key],
  });
  Object.defineProperty(globalThis, key, {
    value,
    configurable: true,
    writable: true,
  });
}

afterEach(() => {
  while (originalGlobals.length > 0) {
    const entry = originalGlobals.pop()!;
    if (entry.hadOwn) {
      Object.defineProperty(globalThis, entry.key, {
        value: entry.value,
        configurable: true,
        writable: true,
      });
    } else {
      Reflect.deleteProperty(globalThis, entry.key);
    }
  }
});

describe('browser compatibility bootstrap', () => {
  test('Safari WebKit은 WebGL 사용 가능해도 Canvas 호환 모드로 강제한다', () => {
    const { body, documentMock } = createDocumentMock(true);

    stubGlobal('document', documentMock as unknown as Document);
    stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
      platform: 'MacIntel',
      maxTouchPoints: 0,
    } as Navigator);
    stubGlobal('CSS', {
      supports: (prop: string, value: string) => {
        if (prop === '-webkit-touch-callout') return true;
        if (prop === 'backdrop-filter' || prop === '-webkit-backdrop-filter') return value === 'blur(4px)';
        if (prop === 'color') return value.startsWith('color-mix');
        if (prop === 'height') return value === '100dvh';
        return false;
      },
    } as CSS);
    stubGlobal('sessionStorage', createStorageMock() as Storage);

    const caps = detectAndApply();

    expect(caps.renderer).toBe('canvas');
    expect(caps.compatMode).toBe('canvas');
    expect(body.getAttribute('data-renderer')).toBe('canvas');
    expect(body.getAttribute('data-browser')).toBe('webkit');
  });

  test('renderer=canvas 쿼리는 WebGL 가능 환경에서도 Canvas 렌더러를 강제한다', () => {
    const body = new MockElement('body');
    const documentMock = {
      body,
      createElement(tag: string) {
        if (tag === 'canvas') {
          return {
            getContext(type: string) {
              if (type === 'webgl2') return { getExtension: () => ({}) };
              if (type === 'webgl' || type === 'experimental-webgl') return { getExtension: () => ({}) };
              return null;
            },
          };
        }

        return new MockElement(tag);
      },
    };

    stubGlobal('document', documentMock as unknown as Document);
    stubGlobal('window', { location: { search: '?renderer=canvas' } } as Window & typeof globalThis);
    stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 Chrome/120.0.0.0 Safari/537.36',
      platform: 'Win32',
      maxTouchPoints: 0,
    } as Navigator);
    stubGlobal('CSS', {
      supports: (prop: string, value: string) => {
        if (prop === 'backdrop-filter' || prop === '-webkit-backdrop-filter') return value === 'blur(4px)';
        if (prop === 'color') return value.startsWith('color-mix');
        if (prop === 'height') return value === '100dvh';
        return false;
      },
    } as CSS);
    stubGlobal('sessionStorage', createStorageMock() as Storage);

    const caps = detectAndApply();

    expect(caps.renderer).toBe('canvas');
    expect(caps.webglVersion).toBe(2);
    expect(caps.compatMode).toBe('canvas');
    expect(body.getAttribute('data-renderer')).toBe('canvas');
    expect(body.getAttribute('data-browser')).toBe('blink');
  });

  test('localStorage 쓰기가 막히면 메모리 폴백으로 계속 동작한다', () => {
    const { documentMock } = createDocumentMock(false);
    const windowMock = {
      localStorage: createStorageMock({ setThrows: true }),
      sessionStorage: createStorageMock(),
      setTimeout,
    };

    const diagnostics = installStorageFallback(
      windowMock as unknown as Window & typeof globalThis,
      documentMock as unknown as Document,
    );

    expect(() => windowMock.localStorage.setItem('save-slot-1', '{"slot":1}')).not.toThrow();
    expect(windowMock.localStorage.getItem('save-slot-1')).toBe('{"slot":1}');
    expect(diagnostics.localStorage).toBe('memory');
  });

  test('IME 조합 중인 키 입력은 게임 단축키로 전달하지 않는다', () => {
    const target = { tagName: 'DIV', isContentEditable: false } as EventTarget & AnyRecord;

    expect(
      shouldSuppressGameShortcut({
        isComposing: true,
        key: 'I',
        target,
      } as KeyboardEvent, false),
    ).toBe(true);

    expect(
      shouldSuppressGameShortcut({
        isComposing: false,
        key: 'Process',
        target,
      } as KeyboardEvent, false),
    ).toBe(true);

    expect(
      shouldSuppressGameShortcut({
        isComposing: false,
        key: 'I',
        target,
      } as KeyboardEvent, false),
    ).toBe(false);
  });
});
