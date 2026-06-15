import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
// @ts-expect-error - pipeline validators are plain .mjs with no type declarations
import { validateZonePalette, ZONE_PALETTE_BASELINE, DEFAULT_TOLERANCE, DEFAULT_MIN_SATURATION } from '../../tools/aseprite-pipeline/validate-zone-palette.mjs';

// Phase E — CT/FF6 zone palette mood gate (B10) over the generated zone
// backgrounds. Each zone's FAR-DAY backdrop must keep its color identity:
// stay within tolerance of its committed mood baseline (catches regeneration /
// merge corruption — washout, hue flip) and hold a saturation floor (no gray
// mush). Cross-zone distinctiveness is intentionally NOT gated: zones may share
// a mood by design (abyss/oblivion are both dark voids, mean-color distance 9).
//
// Zone background PNGs are Git LFS objects. With `lfs: true` on the CI Test
// Suite checkout (added alongside the bulk-art landing) they are real images
// and this gate runs in CI. In any environment that did not fetch LFS the
// sprites are pointer stubs, so we skip (mirrors characterSpriteQualityGates).
function bgIsLfsPointer(): boolean {
  try {
    const head = readFileSync(
      resolve(process.cwd(), 'assets/generated/aseprite/environmentBackground/ABY-BG-FAR-DAY.png'),
    )
      .subarray(0, 48)
      .toString('utf8');
    return head.startsWith('version https://git-lfs');
  } catch {
    return false;
  }
}

const lfsPointers = bgIsLfsPointer();

describe('zone palette mood gates', () => {
  it.skipIf(lfsPointers)('every zone background holds its mood baseline and saturation floor', () => {
    const result = validateZonePalette();

    expect(result.errors).toEqual([]);
    expect(result.ok).toBe(true);
    // 10 존 전부 평가됐는지(베이스라인 키 수와 일치).
    expect(result.results.length).toBe(Object.keys(ZONE_PALETTE_BASELINE).length);
    for (const entry of result.results) {
      expect(entry.signature, `${entry.zone} signature`).not.toBeNull();
      expect(entry.drift, `${entry.zone} drift`).toBeLessThanOrEqual(DEFAULT_TOLERANCE);
      expect(entry.signature.saturation, `${entry.zone} saturation`).toBeGreaterThanOrEqual(DEFAULT_MIN_SATURATION);
    }
  });
});
