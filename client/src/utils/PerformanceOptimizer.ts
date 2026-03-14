/**
 * P28-11: 성능 최적화
 * P28-15: 텍스처/메모리 최적화
 * P28-16: 네트워크/GC 최적화
 *
 * - Phaser 텍스처 메모리 프로파일링
 * - 씬 전환 시 메모리 해제
 * - 소켓 이벤트 디바운싱
 * - 오브젝트 풀링
 * - GC 부하 감소
 */

import * as Phaser from 'phaser';

// ─── 텍스처 메모리 프로파일러 ──────────────────────────────────

export interface TextureMemoryInfo {
  key: string;
  width: number;
  height: number;
  estimatedBytes: number;
}

export class TextureProfiler {
  /**
   * 현재 로드된 텍스처의 메모리 사용량 추정
   */
  static profile(textures: Phaser.Textures.TextureManager): {
    total: TextureMemoryInfo[];
    totalBytes: number;
    totalMB: string;
  } {
    const infos: TextureMemoryInfo[] = [];
    const keys = textures.getTextureKeys();

    for (const key of keys) {
      if (key === '__DEFAULT' || key === '__MISSING') continue;
      const tex = textures.get(key);
      const source = tex.source[0];
      if (source) {
        const w = source.width;
        const h = source.height;
        // RGBA: 4 bytes per pixel
        const bytes = w * h * 4;
        infos.push({ key, width: w, height: h, estimatedBytes: bytes });
      }
    }

    const totalBytes = infos.reduce((sum, i) => sum + i.estimatedBytes, 0);

    return {
      total: infos.sort((a, b) => b.estimatedBytes - a.estimatedBytes),
      totalBytes,
      totalMB: (totalBytes / 1024 / 1024).toFixed(2),
    };
  }

  /**
   * 미사용 텍스처 감지 (현재 씬에서 참조되지 않는 텍스처)
   */
  static findUnused(scene: Phaser.Scene): string[] {
    const usedKeys = new Set<string>();

    // 씬의 모든 게임 오브젝트에서 사용 중인 텍스처 키 수집
    scene.children.list.forEach(obj => {
      if ('texture' in obj && (obj as any).texture?.key) {
        usedKeys.add((obj as any).texture.key);
      }
    });

    const allKeys = scene.textures.getTextureKeys()
      .filter(k => k !== '__DEFAULT' && k !== '__MISSING');

    return allKeys.filter(k => !usedKeys.has(k));
  }
}

// ─── 씬 메모리 해제 매니저 ───────────────────────────────────────

export class SceneMemoryManager {
  /**
   * 씬 전환 시 이전 씬의 리소스를 정리
   */
  static cleanup(scene: Phaser.Scene, options: {
    /** 텍스처 해제 (기본: false — 공유 텍스처 주의) */
    unloadTextures?: boolean;
    /** 특정 텍스처 키만 해제 */
    textureKeys?: string[];
    /** 사운드 정리 */
    cleanSounds?: boolean;
    /** 이벤트 리스너 정리 */
    cleanEvents?: boolean;
  } = {}): void {
    const { unloadTextures = false, textureKeys, cleanSounds = true, cleanEvents = true } = options;

    // 모든 게임 오브젝트 파괴
    scene.children.removeAll(true);

    // 타이머 정리
    scene.time.removeAllEvents();

    // 트윈 정리
    scene.tweens.killAll();

    // 사운드 정리
    if (cleanSounds) {
      scene.sound.removeAll();
    }

    // 이벤트 정리
    if (cleanEvents) {
      scene.events.removeAllListeners();
    }

    // 텍스처 해제
    if (textureKeys) {
      for (const key of textureKeys) {
        if (scene.textures.exists(key)) {
          scene.textures.remove(key);
        }
      }
    } else if (unloadTextures) {
      const unused = TextureProfiler.findUnused(scene);
      for (const key of unused) {
        scene.textures.remove(key);
      }
    }

    console.info(`[SceneMemory] 씬 "${scene.scene.key}" 정리 완료`);
  }
}

// ─── 소켓 이벤트 디바운서 ────────────────────────────────────────

export class SocketDebouncer {
  private timers = new Map<string, ReturnType<typeof setTimeout>>();
  private buffers = new Map<string, unknown[]>();

  /**
   * 이벤트를 디바운싱하여 마지막 값만 전달
   */
  debounce<T>(eventName: string, callback: (data: T) => void, delayMs = 100): (data: T) => void {
    return (data: T) => {
      const existing = this.timers.get(eventName);
      if (existing) clearTimeout(existing);

      this.timers.set(
        eventName,
        setTimeout(() => {
          callback(data);
          this.timers.delete(eventName);
        }, delayMs),
      );
    };
  }

  /**
   * 이벤트를 배치로 모아서 일괄 전달
   */
  batch<T>(eventName: string, callback: (items: T[]) => void, intervalMs = 200, maxBatch = 50): (data: T) => void {
    return (data: T) => {
      let buffer = this.buffers.get(eventName) as T[] | undefined;
      if (!buffer) {
        buffer = [];
        this.buffers.set(eventName, buffer);

        setTimeout(() => {
          const items = this.buffers.get(eventName) as T[];
          this.buffers.delete(eventName);
          if (items && items.length > 0) {
            callback(items);
          }
        }, intervalMs);
      }

      buffer.push(data);
      if (buffer.length >= maxBatch) {
        this.buffers.delete(eventName);
        callback(buffer);
      }
    };
  }

  /** 모든 펜딩 타이머 정리 */
  destroy(): void {
    this.timers.forEach(t => clearTimeout(t));
    this.timers.clear();
    this.buffers.clear();
  }
}

// ─── 오브젝트 풀 (제네릭) ────────────────────────────────────────

export class ObjectPool<T> {
  private pool: T[] = [];
  private active = new Set<T>();
  private factory: () => T;
  private reset: (obj: T) => void;

  constructor(factory: () => T, reset: (obj: T) => void, initialSize = 10) {
    this.factory = factory;
    this.reset = reset;

    for (let i = 0; i < initialSize; i++) {
      this.pool.push(factory());
    }
  }

  acquire(): T {
    const obj = this.pool.pop() ?? this.factory();
    this.active.add(obj);
    return obj;
  }

  release(obj: T): void {
    if (!this.active.has(obj)) return;
    this.active.delete(obj);
    this.reset(obj);
    this.pool.push(obj);
  }

  releaseAll(): void {
    this.active.forEach(obj => {
      this.reset(obj);
      this.pool.push(obj);
    });
    this.active.clear();
  }

  get stats() {
    return {
      pooled: this.pool.length,
      active: this.active.size,
      total: this.pool.length + this.active.size,
    };
  }
}

// ─── 네트워크 최적화: Delta 전송 ──────────────────────────────────

export class DeltaEncoder {
  private lastState = new Map<string, unknown>();

  /**
   * 이전 상태와 비교하여 변경된 필드만 추출
   */
  encode(key: string, state: Record<string, unknown>): Record<string, unknown> | null {
    const prev = this.lastState.get(key) as Record<string, unknown> | undefined;
    if (!prev) {
      this.lastState.set(key, { ...state });
      return state; // 첫 전송은 전체
    }

    const delta: Record<string, unknown> = {};
    let hasChanges = false;

    for (const [field, value] of Object.entries(state)) {
      if (JSON.stringify(prev[field]) !== JSON.stringify(value)) {
        delta[field] = value;
        hasChanges = true;
      }
    }

    if (hasChanges) {
      this.lastState.set(key, { ...state });
      return delta;
    }

    return null; // 변경 없음
  }

  /** 상태 초기화 */
  clear(key?: string): void {
    if (key) {
      this.lastState.delete(key);
    } else {
      this.lastState.clear();
    }
  }
}

// ─── 번들 크기 분석 유틸 ──────────────────────────────────────────

export interface BundleAnalysis {
  totalSizeKB: number;
  chunks: { name: string; sizeKB: number }[];
  largestChunk: string;
  recommendation: string;
}

/**
 * Vite 빌드 후 번들 크기 분석 (빌드 스크립트에서 호출)
 */
export function analyzeBundleSize(buildDir: string): BundleAnalysis {
  // 이 함수는 Node.js 환경에서 실행됨 (빌드 스크립트)
  // 클라이언트 번들에 포함되지 않음
  return {
    totalSizeKB: 0,
    chunks: [],
    largestChunk: '',
    recommendation: 'Vite 빌드 후 `vite-bundle-visualizer`로 상세 분석 권장',
  };
}
