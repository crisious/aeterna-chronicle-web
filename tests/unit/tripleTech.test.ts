/**
 * Unit tests — Triple Tech 3인 협공 (CHRONO-S57)
 */
import { describe, it, expect } from 'vitest';
import {
  resolveTripleTech,
  listTripleTechs,
  getTripleTechById,
} from '../../shared/types/tripleTech';

describe('resolveTripleTech', () => {
  it('ether_knight + time_knight + memory_weaver → aetherna_final', () => {
    const tt = resolveTripleTech('ether_knight', 'time_knight', 'memory_weaver');
    expect(tt).not.toBeNull();
    expect(tt?.id).toBe('aetherna_final');
    expect(tt?.damageMultiplier).toBe(3.5);
    expect(tt?.aoe).toBe(true);
  });

  it('순서 무관 (회전)', () => {
    expect(resolveTripleTech('memory_weaver', 'ether_knight', 'time_knight')?.id).toBe('aetherna_final');
    expect(resolveTripleTech('time_knight', 'memory_weaver', 'ether_knight')?.id).toBe('aetherna_final');
  });

  it('동일 클래스 중복 → null', () => {
    expect(resolveTripleTech('ether_knight', 'ether_knight', 'time_knight')).toBeNull();
    expect(resolveTripleTech('ether_knight', 'ether_knight', 'ether_knight')).toBeNull();
  });

  it('미정의 조합 → null', () => {
    expect(resolveTripleTech('shadow_weaver', 'memory_breaker', 'void_wanderer')).toBeNull();
  });

  it('빈 문자열 → null', () => {
    expect(resolveTripleTech('', 'time_knight', 'memory_weaver')).toBeNull();
  });
});

describe('listTripleTechs / getTripleTechById', () => {
  it('전체 목록에 aetherna_final 포함', () => {
    const list = listTripleTechs();
    expect(list.length).toBeGreaterThanOrEqual(1);
    expect(list.find((t) => t.id === 'aetherna_final')).toBeDefined();
  });

  it('getTripleTechById 정상 조회', () => {
    expect(getTripleTechById('aetherna_final')?.name).toBe('에테르나 파이널');
  });

  it('getTripleTechById 미존재 → null', () => {
    expect(getTripleTechById('nonexistent')).toBeNull();
  });
});
