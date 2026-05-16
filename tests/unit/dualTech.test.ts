/**
 * Unit tests — Dual Tech 2인 협공 (CHRONO-S13)
 */
import { describe, it, expect } from 'vitest';
import {
  resolveDualTech,
  listDualTechs,
  getDualTechById,
  listDualTechsByClass,
  listDualTechsByElement,
  listAoeDualTechs,
} from '../../shared/types/dualTech';

describe('resolveDualTech', () => {
  it('time_knight + ether_knight → chrono_blade (정방향)', () => {
    const dt = resolveDualTech('time_knight', 'ether_knight');
    expect(dt).not.toBeNull();
    expect(dt?.id).toBe('chrono_blade');
    expect(dt?.damageMultiplier).toBe(2.2);
  });

  it('순서 무관 (역방향 조회)', () => {
    const dt = resolveDualTech('ether_knight', 'time_knight');
    expect(dt?.id).toBe('chrono_blade');
  });

  it('동일 클래스 쌍 → null (자기 자신과 협공 불가)', () => {
    expect(resolveDualTech('time_knight', 'time_knight')).toBeNull();
  });

  it('호환 없는 쌍 → null', () => {
    expect(resolveDualTech('time_knight', 'random_class')).toBeNull();
  });

  it('빈 문자열 → null', () => {
    expect(resolveDualTech('', 'ether_knight')).toBeNull();
    expect(resolveDualTech('time_knight', '')).toBeNull();
  });
});

describe('listDualTechs / getDualTechById', () => {
  it('전체 목록 ≥ 3종 (chrono_blade / shadow_eclipse / memory_warp)', () => {
    const list = listDualTechs();
    expect(list.length).toBeGreaterThanOrEqual(3);
    expect(list.find((dt) => dt.id === 'chrono_blade')).toBeDefined();
    expect(list.find((dt) => dt.id === 'shadow_eclipse')).toBeDefined();
    expect(list.find((dt) => dt.id === 'memory_warp')).toBeDefined();
  });

  it('getDualTechById 3종 모두 정상 조회', () => {
    expect(getDualTechById('chrono_blade')?.name).toBe('크로노 블레이드');
    expect(getDualTechById('shadow_eclipse')?.name).toBe('섀도우 이클립스');
    expect(getDualTechById('memory_warp')?.name).toBe('메모리 워프');
  });

  it('getDualTechById 미존재 ID → null', () => {
    expect(getDualTechById('nonexistent')).toBeNull();
  });
});

describe('resolveDualTech — additional pairs (CHRONO-S16)', () => {
  it('shadow_weaver + ether_knight → shadow_eclipse', () => {
    expect(resolveDualTech('shadow_weaver', 'ether_knight')?.id).toBe('shadow_eclipse');
    expect(resolveDualTech('ether_knight', 'shadow_weaver')?.id).toBe('shadow_eclipse');
  });

  it('memory_weaver + time_knight → memory_warp', () => {
    expect(resolveDualTech('memory_weaver', 'time_knight')?.id).toBe('memory_warp');
    expect(resolveDualTech('time_knight', 'memory_weaver')?.id).toBe('memory_warp');
  });

  it('damage multipliers in design range 2.0~2.5', () => {
    for (const dt of listDualTechs()) {
      expect(dt.damageMultiplier).toBeGreaterThanOrEqual(2.0);
      expect(dt.damageMultiplier).toBeLessThanOrEqual(2.5);
    }
  });
});

describe('resolveDualTech — CHRONO-S20 추가 6종', () => {
  it('time_knight + shadow_weaver → chrono_sealing', () => {
    expect(resolveDualTech('time_knight', 'shadow_weaver')?.id).toBe('chrono_sealing');
  });

  it('ether_knight + memory_weaver → ether_recall', () => {
    expect(resolveDualTech('ether_knight', 'memory_weaver')?.id).toBe('ether_recall');
  });

  it('shadow_weaver + memory_weaver → shadow_memory', () => {
    expect(resolveDualTech('shadow_weaver', 'memory_weaver')?.id).toBe('shadow_memory');
  });

  it('time_guardian + ether_knight → guardian_pact', () => {
    expect(resolveDualTech('time_guardian', 'ether_knight')?.id).toBe('guardian_pact');
  });

  it('void_wanderer + time_knight → void_pierce', () => {
    expect(resolveDualTech('void_wanderer', 'time_knight')?.id).toBe('void_pierce');
  });

  it('memory_breaker + shadow_weaver → memory_shatter', () => {
    expect(resolveDualTech('memory_breaker', 'shadow_weaver')?.id).toBe('memory_shatter');
  });

  it('전체 목록 21종 모두 unique id (CHRONO-S42 완성)', () => {
    const list = listDualTechs();
    expect(list).toHaveLength(21);
    const ids = list.map(dt => dt.id);
    expect(new Set(ids).size).toBe(21);
  });
});

describe('resolveDualTech — CHRONO-S42 cross-product 완성 (21 = C(7,2))', () => {
  it('memory_weaver + time_guardian → memory_pact', () => {
    expect(resolveDualTech('memory_weaver', 'time_guardian')?.id).toBe('memory_pact');
  });
  it('time_guardian + void_wanderer → guardian_void', () => {
    expect(resolveDualTech('time_guardian', 'void_wanderer')?.id).toBe('guardian_void');
  });
  it('time_guardian + memory_breaker → guardian_break', () => {
    expect(resolveDualTech('time_guardian', 'memory_breaker')?.id).toBe('guardian_break');
  });

  it('7 클래스 모든 페어 (C(7,2)=21) 매핑 완성', () => {
    const classes = [
      'ether_knight', 'time_knight', 'shadow_weaver', 'memory_weaver',
      'time_guardian', 'void_wanderer', 'memory_breaker',
    ];
    for (let i = 0; i < classes.length; i++) {
      for (let j = i + 1; j < classes.length; j++) {
        const dt = resolveDualTech(classes[i], classes[j]);
        expect(dt, `${classes[i]} + ${classes[j]} 페어 매핑 누락`).not.toBeNull();
      }
    }
  });
});

describe('resolveDualTech — CHRONO-S35 추가 3종', () => {
  it('void_wanderer + memory_breaker → void_oblivion', () => {
    expect(resolveDualTech('void_wanderer', 'memory_breaker')?.id).toBe('void_oblivion');
  });

  it('time_guardian + shadow_weaver → guardian_eclipse', () => {
    expect(resolveDualTech('time_guardian', 'shadow_weaver')?.id).toBe('guardian_eclipse');
  });

  it('memory_weaver + void_wanderer → memory_void', () => {
    expect(resolveDualTech('memory_weaver', 'void_wanderer')?.id).toBe('memory_void');
  });
});

describe('resolveDualTech — CHRONO-S38 추가 6종', () => {
  it('ether_knight + memory_breaker → ether_break', () => {
    expect(resolveDualTech('ether_knight', 'memory_breaker')?.id).toBe('ether_break');
  });
  it('ether_knight + void_wanderer → ether_void', () => {
    expect(resolveDualTech('ether_knight', 'void_wanderer')?.id).toBe('ether_void');
  });
  it('time_knight + time_guardian → time_overflow', () => {
    expect(resolveDualTech('time_knight', 'time_guardian')?.id).toBe('time_overflow');
  });
  it('time_knight + memory_breaker → time_break', () => {
    expect(resolveDualTech('time_knight', 'memory_breaker')?.id).toBe('time_break');
  });
  it('shadow_weaver + void_wanderer → shadow_void', () => {
    expect(resolveDualTech('shadow_weaver', 'void_wanderer')?.id).toBe('shadow_void');
  });
  it('memory_weaver + memory_breaker → memory_break', () => {
    expect(resolveDualTech('memory_weaver', 'memory_breaker')?.id).toBe('memory_break');
  });
});

describe('listDualTechsByClass / listDualTechsByElement / listAoeDualTechs (CHRONO-S54)', () => {
  it('listDualTechsByClass(ether_knight) → ether_knight 포함 모든 페어', () => {
    const list = listDualTechsByClass('ether_knight');
    expect(list.length).toBe(6); // ether_knight 가 7 클래스 중 다른 6과 페어
    for (const dt of list) {
      expect(dt.partnerClasses).toContain('ether_knight');
    }
  });

  it('listDualTechsByClass(unknown) → 빈 배열', () => {
    expect(listDualTechsByClass('nonexistent_class')).toHaveLength(0);
    expect(listDualTechsByClass('')).toHaveLength(0);
  });

  it('listDualTechsByElement(chrono) → chrono 협공만 (chrono_blade, memory_warp, time_overflow, time_break)', () => {
    const list = listDualTechsByElement('chrono');
    expect(list.length).toBeGreaterThanOrEqual(3);
    for (const dt of list) {
      expect(dt.element).toBe('chrono');
    }
  });

  it('listAoeDualTechs → 3종 (memory_break, time_overflow, void_oblivion)', () => {
    const aoe = listAoeDualTechs();
    expect(aoe.length).toBe(3);
    const ids = aoe.map((d) => d.id).sort();
    expect(ids).toEqual(['memory_break', 'time_overflow', 'void_oblivion']);
  });
});
