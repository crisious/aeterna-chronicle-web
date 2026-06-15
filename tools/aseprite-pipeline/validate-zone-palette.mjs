import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { decodePng } from './decode-png.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const ATLAS_DIR = 'assets/generated/atlas';
const ENV_BG_DIR = 'assets/generated/aseprite/environmentBackground';

// 존별 무드 시그니처 베이스라인 — 각 존 FAR-DAY 배경의 평균 RGB.
// CT 원칙(B10): 존마다 고유한 팔레트 무드(채도·색온도)를 가진다. 단 존은
// 캐릭터 실루엣과 달리 테마상 서로 유사할 수 있어(abyss↔oblivion 둘 다 어두운
// 보이드, 평균색 거리 9) 존 간 distinctiveness 게이트는 부적합하다. 대신
// 각 존을 *자기 베이스라인*에 대해 검증해 재생성/병합 사고로 인한 팔레트
// 손상(워시아웃·색 뒤집힘)을 잡는 회귀 가드로 둔다. 의도된 아트 변경 시엔
// 이 베이스라인을 갱신한다(2026-06-16 커밋 아트 기준 측정값).
export const ZONE_PALETTE_BASELINE = {
  abyss: { r: 39, g: 36, b: 78 },
  argentium: { r: 132, g: 95, b: 63 },
  britalia: { r: 57, g: 122, b: 164 },
  erebos: { r: 63, g: 123, b: 73 },
  fog_sea: { r: 65, g: 122, b: 140 },
  northland: { r: 87, g: 134, b: 160 },
  oblivion: { r: 46, g: 42, b: 79 },
  solaris: { r: 159, g: 116, b: 68 },
  sylvanheim: { r: 50, g: 120, b: 100 },
  temporal_rift: { r: 78, g: 125, b: 136 },
};

// 베이스라인으로부터 허용 RGB 유클리드 거리. 현재 모든 존이 0 이지만(베이스라인이
// 측정값) 35 면 미세 재생성 변동은 허용하고 워시아웃/색 뒤집힘은 잡는다.
export const DEFAULT_TOLERANCE = 35;

// 채도 바닥(평균색의 HSV S). 존마다 뚜렷한 색 정체성을 강제 — 회색 mush 방지.
// 현재 최소 채도 0.426(temporal_rift)라 0.30 은 마진을 둔 회귀 가드.
export const DEFAULT_MIN_SATURATION = 0.3;

function meanSignature(image) {
  const { data } = image;
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
    n += 1;
  }
  if (n === 0) return { r: 0, g: 0, b: 0, saturation: 0 };
  r = Math.round(r / n);
  g = Math.round(g / n);
  b = Math.round(b / n);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const saturation = max === 0 ? 0 : (max - min) / max;
  return { r, g, b, saturation };
}

function resolveFarDayFile(repoRoot, zone) {
  const atlasPath = path.resolve(repoRoot, ATLAS_DIR, `atlas_bg_${zone}.json`);
  const atlas = JSON.parse(readFileSync(atlasPath, 'utf8'));
  const sprite = (atlas.sprites ?? []).find((s) => /-BG-FAR-DAY\.png$/.test(s.file));
  if (!sprite) throw new Error(`no FAR-DAY sprite in atlas_bg_${zone}.json`);
  return path.resolve(repoRoot, ENV_BG_DIR, sprite.file);
}

export function validateZonePalette({
  repoRoot = REPO_ROOT,
  baseline = ZONE_PALETTE_BASELINE,
  tolerance = DEFAULT_TOLERANCE,
  minSaturation = DEFAULT_MIN_SATURATION,
} = {}) {
  const errors = [];
  const results = [];

  for (const [zone, base] of Object.entries(baseline)) {
    let sig;
    try {
      sig = meanSignature(decodePng(resolveFarDayFile(repoRoot, zone)));
    } catch (error) {
      errors.push(`Zone "${zone}" FAR-DAY unreadable: ${error.message}`);
      results.push({ zone, ok: false, signature: null, drift: null });
      continue;
    }
    const drift = Math.round(Math.hypot(sig.r - base.r, sig.g - base.g, sig.b - base.b));
    const sat = +sig.saturation.toFixed(3);
    const okDrift = drift <= tolerance;
    const okSat = sig.saturation >= minSaturation;
    results.push({ zone, ok: okDrift && okSat, signature: { r: sig.r, g: sig.g, b: sig.b, saturation: sat }, drift });
    if (!okDrift) {
      errors.push(`Zone "${zone}" palette drifted ${drift} from baseline (max ${tolerance}) — rgb(${sig.r},${sig.g},${sig.b}) vs rgb(${base.r},${base.g},${base.b}).`);
    }
    if (!okSat) {
      errors.push(`Zone "${zone}" saturation ${sat} below floor ${minSaturation} (회색 mush 의심).`);
    }
  }

  return { ok: errors.length === 0, errors, results, tolerance, minSaturation };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const result = validateZonePalette();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exit(result.ok ? 0 : 1);
}
