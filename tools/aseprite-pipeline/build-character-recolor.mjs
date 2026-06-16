import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { decodePng } from './decode-png.mjs';
import { encodePng } from './encode-png.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SPRITE_DIR = 'assets/generated/characters/sprites';
// 리컬러는 base 의 팔레트 스왑 파생물(Aseprite 소스 없음)이라 canonical sprites/
// 와 분리된 recolors/ 에 둔다. 런타임 커버리지 테스트는 이 경로를 파생물로 제외.
const OUT_DIR = 'assets/generated/characters/recolors';

// FF6 Past/Esper 식 팔레트 스왑 코스메틱(Phase D Part②). base 도트는 그대로
// 두고(실루엣/프레임 불변) 색만 정확-매칭 remap 해 시즌 스킨 파생물을 만든다.
// 각 from→to 는 base PNG 의 *정확한* post-composite 색이라 tolerance 불필요.
// 새 스킨 추가 = 여기 항목 추가(클래스별 base 팔레트는 build-character-recolor
// --probe 로 확인). 키 형식: "<classId>_<skin>".
export const RECOLOR_SPECS = {
  // ether_knight "ember" — 차가운 이더 블루/실버 → 앰버/브론즈 가을 무드.
  ether_knight_ember: {
    base: 'char_ether_knight_base',
    map: [
      { from: [137, 207, 240], to: [255, 150, 70] },  // 이더 글로우 블루 → 앰버
      { from: [62, 146, 178], to: [210, 90, 50] },    // 틸 액센트 → 크림슨
      { from: [142, 104, 255], to: [255, 138, 60] },  // 퍼플 액센트 → 오렌지
      { from: [192, 192, 192], to: [200, 160, 120] }, // 실버 아머 → 브론즈
      { from: [113, 121, 126], to: [130, 108, 92] },  // 그레이 아머 → 웜 그레이
      { from: [26, 26, 46], to: [42, 22, 30] },        // 다크 케이프 블루 → 다크 와인
      { from: [16, 17, 32], to: [32, 18, 26] },
      { from: [13, 13, 26], to: [28, 15, 22] },
    ],
  },
  // memory_weaver "ember" — 보라 로브/이더 블루 → 러스트/앰버.
  memory_weaver_ember: {
    base: 'char_memory_weaver_base',
    map: [
      { from: [57, 43, 103], to: [103, 60, 38] },
      { from: [48, 35, 91], to: [91, 52, 34] },
      { from: [126, 85, 181], to: [200, 130, 70] },
      { from: [151, 183, 207], to: [207, 170, 130] },
      { from: [137, 207, 240], to: [255, 150, 70] },
    ],
  },
  // shadow_weaver "ember" — 그림자 보라 → 앰버(다크 뉴트럴은 유지).
  shadow_weaver_ember: {
    base: 'char_shadow_weaver_base',
    map: [
      { from: [31, 19, 47], to: [47, 28, 18] },
      { from: [28, 15, 42], to: [42, 24, 14] },
      { from: [124, 58, 173], to: [190, 100, 55] },
      { from: [59, 41, 82], to: [82, 55, 38] },
    ],
  },
  // memory_breaker "ember" — 회색 아머 → 브론즈(이미 따뜻한 레드는 유지).
  memory_breaker_ember: {
    base: 'char_memory_breaker_base',
    map: [
      { from: [149, 157, 164], to: [170, 140, 105] },
      { from: [157, 160, 164], to: [175, 150, 115] },
      { from: [74, 85, 92], to: [95, 78, 58] },
      { from: [36, 45, 50], to: [52, 42, 32] },
    ],
  },
  // time_guardian "ember" — 블루 → 앰버(골드는 ember 와 어울려 유지).
  time_guardian_ember: {
    base: 'char_time_guardian_base',
    map: [
      { from: [45, 83, 124], to: [124, 85, 45] },
      { from: [78, 128, 175], to: [178, 128, 78] },
    ],
  },
  // void_wanderer "ember" — 보이드 보라/마젠타/시안 → 앰버/크림슨.
  void_wanderer_ember: {
    base: 'char_void_wanderer_base',
    map: [
      { from: [55, 31, 84], to: [88, 55, 30] },
      { from: [102, 54, 139], to: [160, 95, 50] },
      { from: [130, 39, 164], to: [205, 90, 40] },
      { from: [154, 86, 180], to: [210, 130, 75] },
      { from: [255, 0, 255], to: [255, 120, 40] },
      { from: [45, 72, 89], to: [110, 82, 52] },
      { from: [0, 206, 209], to: [235, 150, 60] },
      { from: [26, 26, 46], to: [46, 30, 24] },
    ],
  },

  // === "Frost/Winter" 시즌 — Ember 의 역방향. 따뜻한/시그니처 accent 를
  // 얼음 블루·시안·화이트로. 차가운 톤은 그대로/밝게, 피부톤은 보존. ===
  ether_knight_frost: {
    base: 'char_ether_knight_base',
    map: [
      { from: [255, 215, 0], to: [190, 225, 245] },   // 골드 → 얼음 화이트블루
      { from: [62, 146, 178], to: [120, 205, 235] },  // 틸 → 밝은 시안
      { from: [142, 104, 255], to: [130, 195, 250] }, // 퍼플 → 아이스 블루
      { from: [255, 91, 91], to: [120, 170, 215] },   // 레드 → 쿨 블루
      { from: [137, 207, 240], to: [200, 235, 250] }, // 글로우 → 더 밝은 아이스
    ],
  },
  memory_weaver_frost: {
    base: 'char_memory_weaver_base',
    map: [
      { from: [57, 43, 103], to: [40, 70, 112] },
      { from: [48, 35, 91], to: [34, 58, 100] },
      { from: [126, 85, 181], to: [110, 165, 215] },
      { from: [151, 183, 207], to: [200, 230, 245] },
      { from: [137, 207, 240], to: [205, 235, 250] },
    ],
  },
  shadow_weaver_frost: {
    base: 'char_shadow_weaver_base',
    map: [
      { from: [31, 19, 47], to: [20, 32, 52] },
      { from: [28, 15, 42], to: [17, 30, 48] },
      { from: [124, 58, 173], to: [70, 125, 185] },
      { from: [59, 41, 82], to: [44, 68, 100] },
      { from: [86, 14, 16], to: [34, 64, 96] },        // 다크 레드 → 딥 아이스
    ],
  },
  memory_breaker_frost: {
    base: 'char_memory_breaker_base',
    map: [
      { from: [160, 22, 28], to: [44, 95, 155] },      // 레드 → 아이스 블루
      { from: [83, 18, 22], to: [32, 62, 102] },
      { from: [92, 42, 26], to: [42, 74, 108] },
      { from: [122, 64, 38], to: [72, 115, 155] },
      { from: [202, 118, 83], to: [155, 195, 225] },
    ],
  },
  time_guardian_frost: {
    base: 'char_time_guardian_base',
    map: [
      { from: [218, 165, 32], to: [175, 215, 238] },   // 골드 → 아이스
      { from: [255, 214, 88], to: [212, 236, 250] },
      { from: [202, 134, 45], to: [150, 192, 222] },
      { from: [137, 87, 21], to: [70, 112, 152] },
      { from: [124, 72, 34], to: [60, 102, 142] },
    ],
  },
  void_wanderer_frost: {
    base: 'char_void_wanderer_base',
    map: [
      { from: [255, 0, 255], to: [60, 200, 232] },     // 마젠타 → 시안
      { from: [130, 39, 164], to: [52, 122, 192] },
      { from: [154, 86, 180], to: [112, 172, 216] },
      { from: [55, 31, 84], to: [36, 70, 112] },
      { from: [102, 54, 139], to: [70, 122, 182] },
    ],
  },
};

function key(r, g, b) {
  return (r << 16) | (g << 8) | b;
}

function buildLookup(map) {
  const lut = new Map();
  for (const { from, to } of map) lut.set(key(from[0], from[1], from[2]), to);
  return lut;
}

/** base PNG 를 remap 해 변형 PNG + 사이드카 JSON(atlas/image 키만 교체) 생성. */
export function buildRecolor(specId, { repoRoot = REPO_ROOT, spec = RECOLOR_SPECS[specId] } = {}) {
  if (!spec) throw new Error(`Unknown recolor spec: ${specId}`);
  const basePng = path.resolve(repoRoot, SPRITE_DIR, `${spec.base}.png`);
  const baseJson = path.resolve(repoRoot, SPRITE_DIR, `${spec.base}.json`);
  const outName = `char_${specId}`;
  mkdirSync(path.resolve(repoRoot, OUT_DIR), { recursive: true });
  const outPng = path.resolve(repoRoot, OUT_DIR, `${outName}.png`);
  const outJson = path.resolve(repoRoot, OUT_DIR, `${outName}.json`);

  const img = decodePng(basePng);
  const lut = buildLookup(spec.map);
  const data = Buffer.from(img.data);
  let changed = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    const to = lut.get(key(data[i], data[i + 1], data[i + 2]));
    if (to) {
      data[i] = to[0];
      data[i + 1] = to[1];
      data[i + 2] = to[2];
      changed += 1;
    }
  }
  writeFileSync(outPng, encodePng({ width: img.width, height: img.height, data }));

  // 사이드카 JSON: 프레임/태그는 base 와 동일(실루엣 불변), atlas/image 키만 교체.
  if (existsSync(baseJson)) {
    const sidecar = JSON.parse(readFileSync(baseJson, 'utf8'));
    sidecar.atlas = outName;
    sidecar.image = `${outName}.png`;
    writeFileSync(outJson, `${JSON.stringify(sidecar, null, 2)}\n`);
  }

  return { specId, outPng, outJson, width: img.width, height: img.height, changedPixels: changed };
}

function probe(specId) {
  const spec = RECOLOR_SPECS[specId];
  const img = decodePng(path.resolve(REPO_ROOT, SPRITE_DIR, `${spec.base}.png`));
  const cnt = new Map();
  for (let i = 0; i < img.data.length; i += 4) {
    if (img.data[i + 3] < 128) continue;
    const k = `${img.data[i]},${img.data[i + 1]},${img.data[i + 2]}`;
    cnt.set(k, (cnt.get(k) ?? 0) + 1);
  }
  return [...cnt.entries()].sort((a, b) => b[1] - a[1]).slice(0, 16);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const args = process.argv.slice(2);
  const idsArg = args.indexOf('--ids');
  const ids = idsArg >= 0 ? args[idsArg + 1].split(',') : Object.keys(RECOLOR_SPECS);
  if (args.includes('--probe')) {
    for (const id of ids) process.stdout.write(`${id}:\n${JSON.stringify(probe(id), null, 2)}\n`);
    process.exit(0);
  }
  const results = ids.map((id) => buildRecolor(id));
  process.stdout.write(`${JSON.stringify(results, null, 2)}\n`);
}
