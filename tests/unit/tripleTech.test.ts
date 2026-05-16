/**
 * Unit tests — Triple Tech 3인 협공 (CHRONO-S57)
 */
import { describe, it, expect } from 'vitest';
import {
  resolveTripleTech,
  listTripleTechs,
  getTripleTechById,
  listTripleTechsByClass,
  listTripleTechsByElement,
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

  it('미정의 조합 → null (e+t+s 페어는 아직 매핑 없음)', () => {
    expect(resolveTripleTech('ether_knight', 'time_knight', 'shadow_weaver')).toBeNull();
  });

  it('빈 문자열 → null', () => {
    expect(resolveTripleTech('', 'time_knight', 'memory_weaver')).toBeNull();
  });
});

describe('listTripleTechs / getTripleTechById', () => {
  it('전체 목록 13종 (CHRONO-S76 확장)', () => {
    const list = listTripleTechs();
    expect(list.length).toBe(13);
    const ids = list.map((t) => t.id);
    expect(new Set(ids).size).toBe(13);
  });

  it('getTripleTechById 13종 정상 조회', () => {
    const ids = [
      'aetherna_final', 'chrono_break', 'void_eternity',
      'ether_dark_riff', 'guardian_oath',
      'time_void_break', 'shadow_chrono', 'memory_shatter_pact',
      'shadow_void_break', 'guardian_void_strike',
      'time_memory_guardian', 'ether_shadow_memory', 'void_guardian_shadow',
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

describe('resolveTripleTech — CHRONO-S72 추가 2종', () => {
  it('shadow_weaver + void_wanderer + memory_breaker → shadow_void_break', () => {
    expect(resolveTripleTech('shadow_weaver', 'void_wanderer', 'memory_breaker')?.id).toBe('shadow_void_break');
  });
  it('ether_knight + time_guardian + void_wanderer → guardian_void_strike', () => {
    expect(resolveTripleTech('ether_knight', 'time_guardian', 'void_wanderer')?.id).toBe('guardian_void_strike');
  });
});

describe('resolveTripleTech — CHRONO-S76 추가 3종', () => {
  it('time_knight + memory_weaver + time_guardian → time_memory_guardian', () => {
    expect(resolveTripleTech('time_knight', 'memory_weaver', 'time_guardian')?.id).toBe('time_memory_guardian');
  });
  it('ether_knight + shadow_weaver + memory_weaver → ether_shadow_memory', () => {
    expect(resolveTripleTech('ether_knight', 'shadow_weaver', 'memory_weaver')?.id).toBe('ether_shadow_memory');
  });
  it('shadow_weaver + time_guardian + void_wanderer → void_guardian_shadow', () => {
    expect(resolveTripleTech('shadow_weaver', 'time_guardian', 'void_wanderer')?.id).toBe('void_guardian_shadow');
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

describe('listTripleTechsByClass / listTripleTechsByElement (CHRONO-S77)', () => {
  it('listTripleTechsByClass(ether_knight) → ether_knight 포함 트리플들', () => {
    const list = listTripleTechsByClass('ether_knight');
    expect(list.length).toBeGreaterThanOrEqual(2);
    for (const tt of list) {
      expect(tt.partnerClasses).toContain('ether_knight');
    }
  });

  it('listTripleTechsByClass(unknown) → 빈 배열', () => {
    expect(listTripleTechsByClass('nonexistent')).toHaveLength(0);
    expect(listTripleTechsByClass('')).toHaveLength(0);
  });

  it('listTripleTechsByElement(chrono) → chrono 트리플만', () => {
    const list = listTripleTechsByElement('chrono');
    expect(list.length).toBeGreaterThanOrEqual(2);
    for (const tt of list) {
      expect(tt.element).toBe('chrono');
    }
  });

  it('listTripleTechsByElement(dark) → dark 트리플만', () => {
    const list = listTripleTechsByElement('dark');
    expect(list.length).toBeGreaterThanOrEqual(3);
    for (const tt of list) {
      expect(tt.element).toBe('dark');
    }
  });
});
