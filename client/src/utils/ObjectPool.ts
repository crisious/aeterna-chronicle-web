/**
 * ObjectPool – 파티클/이펙트용 범용 오브젝트 풀 유틸리티
 *
 * GC 부하를 줄이기 위해 오브젝트를 재사용한다.
 * 사용 예:
 *   const pool = new ObjectPool(() => new Particle(), 64);
 *   const p = pool.acquire();
 *   // ... use p ...
 *   pool.release(p);
 */

/** 풀 통계 스냅샷 */
export interface PoolStats {
  /** 현재 활성(acquire 상태) 오브젝트 수 */
  active: number;
  /** 풀에 대기 중인 오브젝트 수 */
  pooled: number;
  /** 누적 생성 횟수 */
  created: number;
  /** 누적 재활용(acquire 시 풀에서 꺼낸) 횟수 */
  recycled: number;
}

export class ObjectPool<T> {
  private readonly pool: T[] = [];
  private readonly factory: () => T;
  private readonly reset?: (item: T) => void;
  private readonly maxSize: number;

  /** 통계 카운터 */
  private _created = 0;
  private _recycled = 0;
  private _active = 0;

  /**
   * @param factory  새 오브젝트를 생성하는 팩토리 함수
   * @param maxSize  풀 최대 크기 (초과 시 release된 오브젝트는 GC에 맡김)
   * @param reset    release 시 오브젝트 상태를 초기화하는 콜백 (선택)
   */
  constructor(factory: () => T, maxSize = 128, reset?: (item: T) => void) {
    this.factory = factory;
    this.maxSize = maxSize;
    this.reset = reset;
  }

  /** 풀에서 오브젝트를 꺼내거나, 없으면 새로 생성 */
  acquire(): T {
    this._active++;
    if (this.pool.length > 0) {
      this._recycled++;
      return this.pool.pop()!;
    }
    this._created++;
    return this.factory();
  }

  /** 사용 완료된 오브젝트를 풀에 반환 */
  release(item: T): void {
    this._active = Math.max(0, this._active - 1);
    if (this.reset) {
      this.reset(item);
    }
    if (this.pool.length < this.maxSize) {
      this.pool.push(item);
    }
  }

  /** 현재 풀에 대기 중인 오브젝트 수 */
  get available(): number {
    return this.pool.length;
  }

  /** 풀 초기화 (모든 대기 오브젝트 해제) */
  clear(): void {
    this.pool.length = 0;
    this._active = 0;
  }

  /** 미리 지정 수만큼 오브젝트를 생성해 풀에 채움 (prewarm alias) */
  prewarm(count: number): void {
    const toCreate = Math.min(count, this.maxSize - this.pool.length);
    for (let i = 0; i < toCreate; i++) {
      this._created++;
      this.pool.push(this.factory());
    }
  }

  /** warmUp — prewarm 과 동일. 직관적 이름 제공 */
  warmUp(count: number): void {
    this.prewarm(count);
  }

  /** 풀 통계 스냅샷 반환 */
  getStats(): PoolStats {
    return {
      active: this._active,
      pooled: this.pool.length,
      created: this._created,
      recycled: this._recycled
    };
  }
}
