import { describe, expect, it } from 'vitest';
// @ts-expect-error - pipeline validators are plain .mjs with no type declarations
import { validateCharacterPalette, DEFAULT_MAX_COLORS } from '../../tools/aseprite-pipeline/validate-character-palette.mjs';
// @ts-expect-error - pipeline validators are plain .mjs with no type declarations
import { validateCharacterSilhouette, DEFAULT_MIN_DISTANCE } from '../../tools/aseprite-pipeline/validate-character-silhouette.mjs';

// Phase C — CT/FF6 quality gates over the generated character sprite sheets.
// These run against the real roster + generated PNGs so a regression (color
// creep past the ceiling, or a new class that is a silhouette clone) fails CI.
describe('character sprite quality gates', () => {
  it('every class palette stays within the post-composite color ceiling', () => {
    const result = validateCharacterPalette();

    expect(result.errors).toEqual([]);
    expect(result.ok).toBe(true);
    expect(result.results.length).toBeGreaterThanOrEqual(6);
    for (const entry of result.results) {
      expect(entry.colors).toBeGreaterThan(0);
      expect(entry.colors).toBeLessThanOrEqual(DEFAULT_MAX_COLORS);
    }
  });

  it('every class idle silhouette is distinguishable from every other (CT form-first)', () => {
    const result = validateCharacterSilhouette();

    expect(result.errors).toEqual([]);
    expect(result.ok).toBe(true);
    expect(result.minPair).not.toBeNull();
    expect(result.minPair.distance).toBeGreaterThanOrEqual(DEFAULT_MIN_DISTANCE);
  });
});
