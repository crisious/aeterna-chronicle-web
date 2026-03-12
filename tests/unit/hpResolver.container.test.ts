/**
 * P10-18: hpResolver — ServiceContainer 기반 테스트
 *
 * 기존 hpResolver.test.ts의 싱글턴 직접 import를
 * ServiceContainer 기반으로 전환하여 테스트 격리를 보장한다.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createTestContainer } from '../helpers/testContainer';
import { ServiceContainer } from '../../server/src/core/serviceContainer';
import { getCharacterMaxHp, clearHpCache, invalidateHpCache } from '../../server/src/combat/hpResolver';

describe('hpResolver (ServiceContainer 기반)', () => {
  let container: ServiceContainer;

  beforeEach(() => {
    const ctx = createTestContainer();
    container = ctx.container;

    // 컨테이너가 올바르게 초기화되었는지 확인
    expect(container.has('prisma')).toBe(true);
    expect(container.has('redis')).toBe(true);

    clearHpCache();
  });

  it('격리된 컨테이너에서 prisma/redis가 등록되어 있다', () => {
    expect(container.has('prisma')).toBe(true);
    expect(container.has('redis')).toBe(true);
    expect(container.has('socketIO')).toBe(true);

    const services = container.listServices();
    expect(services.length).toBe(3);
  });

  it('캐시 미스 시 기본값(1000)을 반환한다', () => {
    const result = getCharacterMaxHp('container-test-char-1');
    expect(result).toBe(1000);
  });

  it('동일 ID로 반복 호출하면 동일 값을 반환한다', () => {
    const r1 = getCharacterMaxHp('container-test-char-2');
    const r2 = getCharacterMaxHp('container-test-char-2');
    expect(r1).toBe(r2);
  });

  it('clearHpCache 후 캐시 미스 상태로 돌아간다', () => {
    getCharacterMaxHp('container-test-char-3');
    clearHpCache();
    const result = getCharacterMaxHp('container-test-char-3');
    expect(result).toBe(1000);
  });

  it('invalidateHpCache는 특정 캐릭터 캐시만 제거한다', () => {
    getCharacterMaxHp('char-x');
    getCharacterMaxHp('char-y');
    invalidateHpCache('char-x');
    const x = getCharacterMaxHp('char-x');
    expect(x).toBe(1000);
  });

  it('컨테이너 clear 후 서비스가 비어있다', () => {
    container.clear();
    expect(container.has('prisma')).toBe(false);
    expect(container.listServices()).toHaveLength(0);
  });

  it('컨테이너에서 미등록 서비스 resolve 시 에러를 던진다', () => {
    expect(() => container.resolve('nonexistent')).toThrow('미등록');
  });

  it('tryResolve는 미등록 시 null을 반환한다', () => {
    const result = container.tryResolve('nonexistent');
    expect(result).toBeNull();
  });
});
