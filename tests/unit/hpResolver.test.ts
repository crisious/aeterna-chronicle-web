/**
 * 유닛 테스트 — hpResolver (P7-10: maxHp 실연동)
 * 캐시 동작, 기본값 반환, 캐시 무효화 검증
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { getCharacterMaxHp, clearHpCache, invalidateHpCache } from '../../server/src/combat/hpResolver';

describe('hpResolver', () => {
  beforeEach(() => {
    clearHpCache();
  });

  it('캐시 미스 시 기본값(1000)을 반환한다', () => {
    const result = getCharacterMaxHp('nonexistent-character');
    expect(result).toBe(1000);
  });

  it('동일 ID로 반복 호출하면 동일 값을 반환한다', () => {
    const r1 = getCharacterMaxHp('test-char-1');
    const r2 = getCharacterMaxHp('test-char-1');
    expect(r1).toBe(r2);
  });

  it('clearHpCache 후 캐시 미스 상태로 돌아간다', () => {
    // 첫 호출로 캐시 트리거
    getCharacterMaxHp('test-char-2');
    clearHpCache();
    // 캐시 클리어 후 기본값 반환
    const result = getCharacterMaxHp('test-char-2');
    expect(result).toBe(1000);
  });

  it('invalidateHpCache는 특정 캐릭터 캐시만 제거한다', () => {
    getCharacterMaxHp('char-a');
    getCharacterMaxHp('char-b');
    invalidateHpCache('char-a');
    // char-a는 기본값, char-b는 이전 값 유지 (캐시 내)
    const a = getCharacterMaxHp('char-a');
    expect(a).toBe(1000);
  });
});
