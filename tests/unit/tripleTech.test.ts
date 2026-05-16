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
  it('전체 목록 3종 (aetherna_final + chrono_break + void_eternity)', () => {
    const list = listTripleTechs();
    expect(list.length).toBe(3);
    expect(list.find((t) => t.id === 'aetherna_final')).toBeDefined();
    expect(list.find((t) => t.id === 'chrono_break')).toBeDefined();
    expect(list.find((t) => t.id === 'void_eternity')).toBeDefined();
  });

  it('getTripleTechById 3종 정상 조회', () => {
    expect(getTripleTechById('aetherna_final')?.name).toBe('에테르나 파이널');
    expect(getTripleTechById('chrono_break')?.name).toBe('크로노 브레이크');
    expect(getTripleTechById('void_eternity')?.name).toBe('보이드 이터니티');
  });

  it('getTripleTechById 미존재 → null', () => {
    expect(getTripleTechById('nonexistent')).toBeNull();
  });

  it('damageMultiplier 3.0~3.8 design range', () => {
    for (const tt of listTripleTechs()) {
      expect(tt.damageMultiplier).toBeGreaterThanOrEqual(3.0);
      expect(tt.damageMultiplier).toBeLessThanOrEqual(3.8);
    }
  });
});

describe('resolveTripleTech — CHRONO-S58 추가 2종', () => {
  it('time_knight + memory_weaver + shadow_weaver → chrono_break', () => {
    expect(resolveTripleTech('time_knight', 'memory_weaver', 'shadow_weaver')?.id).toBe('chrono_break');
  });

  it('void_wanderer + time_guardian + memory_breaker → void_eternity', () => {
    expect(resolveTripleTech('void_wanderer', 'time_guardian', 'memory_breaker')?.id).toBe('void_eternity');
  });
});
