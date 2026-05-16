/**
 * Unit tests — shared/types/chronoEraAtb (CHRONO-S6)
 * 시대 → ATB SpeedTier 매핑 회귀 가드.
 */
import { describe, it, expect } from 'vitest';
import {
  chronoEraToSpeedTier,
  isChronoEraId,
  chronoEraToEnemyMultipliers,
} from '../../shared/types/chronoEraAtb';

describe('chronoEraToSpeedTier', () => {
  it('ancient → tier 2 (0.7x, 회상 분위기)', () => {
    expect(chronoEraToSpeedTier('ancient')).toBe(2);
  });

  it('present → tier 3 (FF6 standard 1.0x)', () => {
    expect(chronoEraToSpeedTier('present')).toBe(3);
  });

  it('ruined_future → tier 4 (1.3x, 긴박감)', () => {
    expect(chronoEraToSpeedTier('ruined_future')).toBe(4);
  });

  it('unknown era → fallback tier 3 (안전 디폴트)', () => {
    expect(chronoEraToSpeedTier('chaos_age' as never)).toBe(3);
  });
});

describe('chronoEraToEnemyMultipliers (CHRONO-S12)', () => {
  it('ancient → 0.9x HP, 0.95x spd, -2 level', () => {
    const m = chronoEraToEnemyMultipliers('ancient');
    expect(m.hp).toBe(0.9);
    expect(m.attackSpeed).toBe(0.95);
    expect(m.reward).toBe(1.0);
    expect(m.levelOffset).toBe(-2);
  });

  it('present → 1.0x baseline', () => {
    const m = chronoEraToEnemyMultipliers('present');
    expect(m.hp).toBe(1.0);
    expect(m.attackSpeed).toBe(1.0);
    expect(m.reward).toBe(1.0);
    expect(m.levelOffset).toBe(0);
  });

  it('ruined_future → 1.25x HP, 1.15x spd, +6 level, 1.25x reward', () => {
    const m = chronoEraToEnemyMultipliers('ruined_future');
    expect(m.hp).toBe(1.25);
    expect(m.attackSpeed).toBe(1.15);
    expect(m.reward).toBe(1.25);
    expect(m.levelOffset).toBe(6);
  });

  it('unknown era → present fallback', () => {
    const m = chronoEraToEnemyMultipliers('chaos_age' as never);
    expect(m).toEqual({ hp: 1.0, attackSpeed: 1.0, reward: 1.0, levelOffset: 0 });
  });
});

describe('isChronoEraId', () => {
  it('accepts valid era ids', () => {
    expect(isChronoEraId('ancient')).toBe(true);
    expect(isChronoEraId('present')).toBe(true);
    expect(isChronoEraId('ruined_future')).toBe(true);
  });

  it('rejects unknown strings', () => {
    expect(isChronoEraId('distant_past')).toBe(false);
    expect(isChronoEraId('')).toBe(false);
  });

  it('rejects non-string values', () => {
    expect(isChronoEraId(null)).toBe(false);
    expect(isChronoEraId(undefined)).toBe(false);
    expect(isChronoEraId(42)).toBe(false);
    expect(isChronoEraId({ id: 'ancient' })).toBe(false);
  });
});
