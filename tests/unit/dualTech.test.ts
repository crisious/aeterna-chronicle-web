/**
 * Unit tests — Dual Tech 2인 협공 (CHRONO-S13)
 */
import { describe, it, expect } from 'vitest';
import {
  resolveDualTech,
  listDualTechs,
  getDualTechById,
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
  it('전체 목록에 chrono_blade 포함', () => {
    const list = listDualTechs();
    expect(list.length).toBeGreaterThanOrEqual(1);
    expect(list.find((dt) => dt.id === 'chrono_blade')).toBeDefined();
  });

  it('getDualTechById chrono_blade 정상 조회', () => {
    expect(getDualTechById('chrono_blade')?.name).toBe('크로노 블레이드');
  });

  it('getDualTechById 미존재 ID → null', () => {
    expect(getDualTechById('nonexistent')).toBeNull();
  });
});
