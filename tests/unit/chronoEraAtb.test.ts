/**
 * Unit tests — shared/types/chronoEraAtb (CHRONO-S6)
 * 시대 → ATB SpeedTier 매핑 회귀 가드.
 */
import { describe, it, expect } from 'vitest';
import {
  chronoEraToSpeedTier,
  isChronoEraId,
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
