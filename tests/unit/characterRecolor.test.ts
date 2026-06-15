import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
// @ts-expect-error - pipeline validators are plain .mjs with no type declarations
import { validateCharacterRecolor, DEFAULT_MAX_COLORS } from '../../tools/aseprite-pipeline/validate-character-recolor.mjs';
// @ts-expect-error - plain .mjs
import { RECOLOR_SPECS } from '../../tools/aseprite-pipeline/build-character-recolor.mjs';

// Phase D Part② — FF6 식 팔레트 스왑 코스메틱. base 도트의 색만 교체한 스킨이
// (1) 같은 치수, (2) 알파 실루엣 픽셀 일치(형태 불변), (3) 실제 색 변경,
// (4) 색수 상한 내인지 검증. 스프라이트 PNG 는 LFS — CI(lfs:true)·로컬선 실행,
// 비-LFS 환경선 skip(characterSpriteQualityGates 와 동일 패턴).
function spritesAreLfsPointers(): boolean {
  try {
    const head = readFileSync(
      resolve(process.cwd(), 'assets/generated/characters/sprites/char_ether_knight_base.png'),
    )
      .subarray(0, 48)
      .toString('utf8');
    return head.startsWith('version https://git-lfs');
  } catch {
    return false;
  }
}

const lfsPointers = spritesAreLfsPointers();

describe('character recolor cosmetics (Phase D Part②)', () => {
  it('적어도 하나의 리컬러 스펙이 정의돼 있다(ether_knight ember 파일럿)', () => {
    expect(Object.keys(RECOLOR_SPECS).length).toBeGreaterThanOrEqual(1);
    expect(RECOLOR_SPECS).toHaveProperty('ether_knight_ember');
  });

  it.skipIf(lfsPointers)('모든 리컬러가 base 실루엣을 보존하며 실제로 색만 바꾼다', () => {
    const result = validateCharacterRecolor();

    expect(result.errors).toEqual([]);
    expect(result.ok).toBe(true);
    expect(result.results.length).toBe(Object.keys(RECOLOR_SPECS).length);
    for (const entry of result.results) {
      expect(entry.sameDims, `${entry.specId} dims`).toBe(true);
      expect(entry.alphaIdentical, `${entry.specId} silhouette`).toBe(true);
      expect(entry.changedPixels, `${entry.specId} recolored`).toBeGreaterThan(0);
      expect(entry.colors, `${entry.specId} color ceiling`).toBeLessThanOrEqual(DEFAULT_MAX_COLORS);
    }
  });
});
