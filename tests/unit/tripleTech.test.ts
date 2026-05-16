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
  it('전체 목록 8종 (CHRONO-S71 확장)', () => {
    const list = listTripleTechs();
    expect(list.length).toBe(8);
    const ids = list.map((t) => t.id);
    expect(new Set(ids).size).toBe(8);
  });

  it('getTripleTechById 8종 정상 조회', () => {
    const ids = [
      'aetherna_final', 'chrono_break', 'void_eternity',
      'ether_dark_riff', 'guardian_oath',
      'time_void_break', 'shadow_chrono', 'memory_shatter_pact',
    ];
    for (const id of ids) {
      expect(getTripleTechById(id), `${id} 조회 실패`).not.toBeNull();
    }
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

describe('resolveTripleTech — CHRONO-S69 추가 2종', () => {
  it('ether_knight + shadow_weaver + void_wanderer → ether_dark_riff', () => {
    expect(resolveTripleTech('ether_knight', 'shadow_weaver', 'void_wanderer')?.id).toBe('ether_dark_riff');
  });

  it('ether_knight + time_guardian + memory_breaker → guardian_oath', () => {
    expect(resolveTripleTech('ether_knight', 'time_guardian', 'memory_breaker')?.id).toBe('guardian_oath');
  });
});

describe('resolveTripleTech — CHRONO-S71 추가 3종', () => {
  it('time_knight + void_wanderer + memory_breaker → time_void_break', () => {
    expect(resolveTripleTech('time_knight', 'void_wanderer', 'memory_breaker')?.id).toBe('time_void_break');
  });
  it('time_knight + shadow_weaver + void_wanderer → shadow_chrono', () => {
    expect(resolveTripleTech('time_knight', 'shadow_weaver', 'void_wanderer')?.id).toBe('shadow_chrono');
  });
  it('memory_weaver + shadow_weaver + memory_breaker → memory_shatter_pact', () => {
    expect(resolveTripleTech('memory_weaver', 'shadow_weaver', 'memory_breaker')?.id).toBe('memory_shatter_pact');
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
