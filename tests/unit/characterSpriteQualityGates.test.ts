import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
// @ts-expect-error - pipeline validators are plain .mjs with no type declarations
import { validateCharacterPalette, DEFAULT_MAX_COLORS } from '../../tools/aseprite-pipeline/validate-character-palette.mjs';
// @ts-expect-error - pipeline validators are plain .mjs with no type declarations
import { validateCharacterSilhouette, DEFAULT_MIN_DISTANCE } from '../../tools/aseprite-pipeline/validate-character-silhouette.mjs';

// Phase C — CT/FF6 quality gates over the generated character sprite sheets.
// These run against the real roster + generated PNGs so a regression (color
// creep past the ceiling, or a new class that is a silhouette clone) fails.
//
// PNGs are Git LFS objects. The CI Test Suite checkout does NOT fetch LFS, so
// in that environment the sprite sheets are pointer stubs, not real images, and
// pixel-level validation cannot run. We skip there (keeping CI green) while
// fully enforcing the gates locally / pre-commit and in any LFS-materialized
// run. Enforcing in CI is a follow-up that needs `lfs: true` on the Test Suite
// checkout (deferred — it would also fetch unrelated bulk art LFS objects).
function spritesAreLfsPointers(): boolean {
  try {
    const head = readFileSync(
      resolve(process.cwd(), 'assets/generated/aseprite/character/char_ether_knight_base.png'),
    )
      .subarray(0, 48)
      .toString('utf8');
    return head.startsWith('version https://git-lfs');
  } catch {
    return false;
  }
}

const lfsPointers = spritesAreLfsPointers();

describe('character sprite quality gates', () => {
  it.skipIf(lfsPointers)('every class palette stays within the post-composite color ceiling', () => {
    const result = validateCharacterPalette();

    expect(result.errors).toEqual([]);
    expect(result.ok).toBe(true);
    expect(result.results.length).toBeGreaterThanOrEqual(6);
    for (const entry of result.results) {
      expect(entry.colors).toBeGreaterThan(0);
      expect(entry.colors).toBeLessThanOrEqual(DEFAULT_MAX_COLORS);
    }
  });

  it.skipIf(lfsPointers)('every class idle silhouette is distinguishable from every other (CT form-first)', () => {
    const result = validateCharacterSilhouette();

    expect(result.errors).toEqual([]);
    expect(result.ok).toBe(true);
    expect(result.minPair).not.toBeNull();
    expect(result.minPair.distance).toBeGreaterThanOrEqual(DEFAULT_MIN_DISTANCE);
  });
});
