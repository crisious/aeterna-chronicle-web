import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { decodePng } from './decode-png.mjs';
import { RECOLOR_SPECS } from './build-character-recolor.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SPRITE_DIR = 'assets/generated/characters/sprites';

// 팔레트 스왑 코스메틱 무결성(Phase D Part②). FF6 식 리컬러는 *같은 도트의
// 색만 교체*이므로 반드시: (1) base 와 동일 치수, (2) 알파 실루엣 픽셀 단위
// 일치(프레임/형태 불변 — 재생성 없는 스왑), (3) 실제로 색이 바뀜(비-자명),
// (4) 색수 상한 유지(de-alpha 폭주 방지, Phase C 와 동일 32).
export const DEFAULT_MAX_COLORS = 32;

function colorCount(image) {
  const seen = new Set();
  const { data } = image;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    seen.add((data[i] << 24) | (data[i + 1] << 16) | (data[i + 2] << 8) | data[i + 3]);
  }
  return seen.size;
}

export function validateCharacterRecolor({
  repoRoot = REPO_ROOT,
  specs = RECOLOR_SPECS,
  maxColors = DEFAULT_MAX_COLORS,
} = {}) {
  const errors = [];
  const results = [];

  for (const [specId, spec] of Object.entries(specs)) {
    const basePath = path.resolve(repoRoot, SPRITE_DIR, `${spec.base}.png`);
    const variantPath = path.resolve(repoRoot, SPRITE_DIR, `char_${specId}.png`);
    let base;
    let variant;
    try {
      base = decodePng(basePath);
      variant = decodePng(variantPath);
    } catch (error) {
      errors.push(`Recolor "${specId}" unreadable: ${error.message}`);
      results.push({ specId, ok: false });
      continue;
    }

    const sameDims = base.width === variant.width && base.height === variant.height;
    let alphaIdentical = sameDims;
    let changed = 0;
    if (sameDims) {
      for (let i = 0; i < base.data.length; i += 4) {
        const ba = base.data[i + 3];
        const va = variant.data[i + 3];
        if ((ba === 0) !== (va === 0)) { alphaIdentical = false; break; }
        if (ba !== 0 && (base.data[i] !== variant.data[i] || base.data[i + 1] !== variant.data[i + 1] || base.data[i + 2] !== variant.data[i + 2])) {
          changed += 1;
        }
      }
    }
    const colors = colorCount(variant);
    const ok = sameDims && alphaIdentical && changed > 0 && colors <= maxColors;
    results.push({ specId, ok, sameDims, alphaIdentical, changedPixels: changed, colors });

    if (!sameDims) errors.push(`Recolor "${specId}" dimensions differ from base.`);
    else if (!alphaIdentical) errors.push(`Recolor "${specId}" alpha silhouette differs from base — 스왑이 형태를 바꿈.`);
    else if (changed === 0) errors.push(`Recolor "${specId}" identical to base — 색이 안 바뀜(스펙 map 확인).`);
    if (colors > maxColors) errors.push(`Recolor "${specId}" uses ${colors} colors, exceeding ceiling ${maxColors}.`);
  }

  return { ok: errors.length === 0, errors, results, maxColors };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const result = validateCharacterRecolor();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exit(result.ok ? 0 : 1);
}
