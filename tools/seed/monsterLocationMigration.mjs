/**
 * monsterLocationMigration.mjs — 몬스터 시드 location(구 지역명) → Zone.code(신 체계) 결정적 매핑 계산기
 *
 * 배경: Monster.location 시드는 구 9개 매크로존(twilight_forest 등)을 쓰는데, DB Zone.code 는
 * 신 43개 존(erebos_outskirts 등)을 쓴다. combatRoutes 의 where:{location:zoneId} 직매칭이 0건이라
 * #208 가 levelRange 폴백으로 우회 중. 이 스크립트는 폴백을 정합으로 승격시키기 위해 각 몬스터를
 * 유효한 Zone.code 로 결정적으로 배치한다.
 *
 * 원칙(사용자 승인: 하이브리드) — 테마 region 우선, 단 레벨이 도저히 안 맞으면 레벨 우선:
 *   1) 버킷별 THEME_PREF region 순서로, 그 region 안에 몬스터 레벨을 담는 존이 있으면 거기로(중심 최근접).
 *   2) 그 region 이 레벨을 못 담고(레벨>regionMax) 뒤 선호 region 이 담을 수 있으면 그쪽으로 양보.
 *   3) 아무 선호 region 도 담지 못하면 첫 선호 region 의 최상위 존으로 clamp(과레벨 보스 허용).
 *   4) 레벨이 모든 선호 region 보다 낮으면(예: 숲 L1-9 < silvanhome min10) 전역 레벨적합 최저존으로.
 *
 * 출력: tools/seed/monster-location-map.generated.json  ({ [code]: zoneCode })
 * 실행: node tools/seed/monsterLocationMigration.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..', '..');
const seedPath = resolve(repoRoot, 'server/src/monster/monsterSeeds.ts');
const outPath = resolve(__dirname, 'monster-location-map.generated.json');

// ─── 신 존 43개 (recon 으로 검증된 zoneSeeds.ts 값; ZONE_SEEDS 가 미export 라 인라인) ───
const ZONES = [
  ['argentium_plaza', 'argentium', 1, 15], ['argentium_market', 'argentium', 1, 10],
  ['argentium_sewer', 'argentium', 3, 10], ['argentium_tower', 'argentium', 10, 15],
  ['silvanhome_entrance', 'silvanhome', 10, 18], ['silvanhome_ancient', 'silvanhome', 12, 22],
  ['silvanhome_mist', 'silvanhome', 15, 25], ['silvanhome_sanctum', 'silvanhome', 20, 28],
  ['silvanhome_crystal', 'silvanhome', 18, 30],
  ['erebos_outskirts', 'erebos', 25, 33], ['erebos_center', 'erebos', 28, 38],
  ['erebos_cathedral', 'erebos', 30, 40], ['erebos_catacomb', 'erebos', 35, 45],
  ['solaris_oasis', 'solaris', 35, 45], ['solaris_storm', 'solaris', 38, 48],
  ['solaris_mine', 'solaris', 40, 50], ['solaris_temple', 'solaris', 45, 55],
  ['northland_village', 'northland', 50, 58], ['northland_cave', 'northland', 55, 63],
  ['northland_peak', 'northland', 60, 68], ['northland_lake', 'northland', 58, 70],
  ['britallia_port', 'britallia', 15, 25], ['britallia_blackmarket', 'britallia', 18, 30],
  ['britallia_pirate', 'britallia', 20, 35], ['britallia_arena', 'britallia', 25, 40],
  ['oblivion_plateau', 'oblivion_plateau', 70, 75], ['oblivion_rift', 'oblivion_plateau', 72, 78],
  ['oblivion_sanctum', 'oblivion_plateau', 75, 80],
  ['mist_sea_outskirts', 'mist_sea', 60, 65], ['mist_sea_lighthouse', 'mist_sea', 65, 70],
  ['mist_sea_archipelago', 'mist_sea', 70, 75], ['mist_sea_spire', 'mist_sea', 75, 80],
  ['mist_sea_abyss', 'mist_sea', 80, 80],
  ['abyss_gate', 'abyss_of_memory', 60, 65], ['abyss_sunken_streets', 'abyss_of_memory', 63, 70],
  ['abyss_library', 'abyss_of_memory', 65, 72], ['abyss_trial_hall', 'abyss_of_memory', 68, 75],
  ['abyss_core', 'abyss_of_memory', 75, 80],
  ['rift_threshold', 'temporal_rift', 75, 85], ['rift_mirror_city', 'temporal_rift', 80, 90],
  ['rift_frozen_battlefield', 'temporal_rift', 85, 95], ['rift_reverse_forest', 'temporal_rift', 88, 95],
  ['rift_core', 'temporal_rift', 92, 100],
].map(([code, region, min, max]) => ({ code, region, min, max }));

// ─── 버킷별 테마 선호 region 순서 (하이브리드) ───
const THEME_PREF = {
  twilight_forest: ['silvanhome', 'argentium'],   // 황혼의숲→기억의숲(forest→forest), L1-9 는 argentium
  kronos_city: ['britallia', 'argentium', 'erebos'], // 도시/하수도, 시간테마는 이 레벨대에 없음 → 레벨로
  aetheria_village: ['erebos', 'silvanhome', 'britallia'], // 에테르/기억 유령
  shadow_fortress: ['erebos', 'solaris'],          // 죽음/그림자/카타콤
  crystal_cavern: ['northland', 'solaris', 'silvanhome'], // 수정/결정/얼음동굴
  void_abyss: ['abyss_of_memory', 'oblivion_plateau'],    // 공허/심연
  mist_sea: ['mist_sea'],                           // 동명, 81+ 는 상층존 clamp
  temporal_rift: ['temporal_rift'],                 // 동명·정합
  memory_abyss: ['temporal_rift'],                  // 동명 abyss(80止) 불가 → 레벨로 rift
};

const center = (z) => (z.min + z.max) / 2;
const nearest = (zs, lvl) => zs.reduce((a, b) => (Math.abs(center(b) - lvl) < Math.abs(center(a) - lvl) ? b : a));
const topZone = (zs) => zs.reduce((a, b) => (b.max > a.max || (b.max === a.max && b.min > a.min) ? b : a));
const regionZones = (r) => ZONES.filter((z) => z.region === r);
const fitsLevel = (zs, lvl) => zs.filter((z) => lvl >= z.min && lvl <= z.max);

function assign(level, oldLoc) {
  const pref = THEME_PREF[oldLoc] ?? [];
  for (let i = 0; i < pref.length; i++) {
    const zr = regionZones(pref[i]);
    const regionMin = Math.min(...zr.map((z) => z.min));
    const regionMax = Math.max(...zr.map((z) => z.max));
    if (level < regionMin) continue; // 이 테마 region 엔 너무 낮음 → 다음 선호로
    const fit = fitsLevel(zr, level);
    if (fit.length) return { zone: nearest(fit, level).code, rule: 'theme-fit', region: pref[i] };
    // level > regionMax: 뒤 선호 region 이 제대로 담을 수 있으면 양보
    const laterFits = pref.slice(i + 1).some((r) => fitsLevel(regionZones(r), level).length > 0);
    if (laterFits) continue;
    return { zone: topZone(zr).code, rule: 'theme-clamp', region: pref[i] }; // 과레벨 clamp
  }
  // 모든 선호 region 보다 낮거나(숲 L1-9) 선호가 비었음 → 전역 레벨적합 최저존
  const globalFit = fitsLevel(ZONES, level);
  if (globalFit.length) {
    // 가장 낮은(=시작) 적합 존: min 최소, 동률이면 max 최소
    const lowest = globalFit.reduce((a, b) => (b.min < a.min || (b.min === a.min && b.max < a.max) ? b : a));
    return { zone: lowest.code, rule: 'level-fallback', region: lowest.region };
  }
  // 안전망: 어떤 존도 못 담음(이론상 없음) → 전역 최고존
  return { zone: topZone(ZONES).code, rule: 'global-clamp', region: topZone(ZONES).region };
}

// ─── 시드 파싱: {code, level, location} ───
const src = readFileSync(seedPath, 'utf8');
const lines = src.split(/\r?\n/);
const records = [];
let curCode = null;
let curLevel = null;
const codeRe = /code:\s*'([^']+)'/;
const lvlRe = /level:\s*(\d+)/;
const locRe = /location:\s*'([^']+)'/;
// 주의: 초기 그룹은 멀티라인 객체(code 줄 ≠ location 줄), temporal_rift/memory_abyss 는
// 단일라인 객체(code·level·location 한 줄). 그래서 code 매칭 후 continue 하면 안 되고,
// 같은 줄의 location 까지 마저 검사해야 단일라인 60마리를 안 놓친다.
for (const line of lines) {
  const cm = codeRe.exec(line);
  if (cm) {
    curCode = cm[1];
    curLevel = null;
    const lm = lvlRe.exec(line); // 레벨은 보통 code 와 같은 줄
    if (lm) curLevel = Number(lm[1]);
  } else if (curLevel === null) {
    const lm = lvlRe.exec(line); // 멀티라인에서 level 이 별도 줄이면 첫 등장 채택
    if (lm) curLevel = Number(lm[1]);
  }
  const locm = locRe.exec(line);
  if (locm && curCode) {
    records.push({ code: curCode, level: curLevel, location: locm[1] });
    curCode = null; // 한 객체당 location 1회
    curLevel = null;
  }
}

// ─── 계산 ───
const validZoneCodes = new Set(ZONES.map((z) => z.code));
const map = {};
const byBucket = {};   // oldLoc -> { targetZone -> count }
const byZone = {};     // targetZone -> count
const violations = []; // 배정존 범위가 레벨을 안 담는 경우(의도된 clamp/fallback 포함)
const ruleCount = {};

for (const r of records) {
  if (r.level === null) {
    console.error(`[WARN] level 파싱 실패: ${r.code} (location=${r.location})`);
  }
  const lvl = r.level ?? 1;
  const res = assign(lvl, r.location);
  map[r.code] = res.zone;
  ruleCount[res.rule] = (ruleCount[res.rule] ?? 0) + 1;
  (byBucket[r.location] ??= {});
  byBucket[r.location][res.zone] = (byBucket[r.location][res.zone] ?? 0) + 1;
  byZone[res.zone] = (byZone[res.zone] ?? 0) + 1;
  const z = ZONES.find((x) => x.code === res.zone);
  if (lvl < z.min || lvl > z.max) {
    violations.push({ code: r.code, level: lvl, bucket: r.location, zone: res.zone, range: `${z.min}-${z.max}`, rule: res.rule, delta: lvl > z.max ? `+${lvl - z.max}` : `-${z.min - lvl}` });
  }
}

// ─── 리포트 ───
console.log(`\n=== 입력 ===`);
console.log(`레코드: ${records.length}마리, 구 버킷: ${Object.keys(byBucket).length}개`);
console.log(`유효 Zone.code 배정: ${Object.values(map).every((z) => validZoneCodes.has(z)) ? 'OK 전부 유효' : '!! 무효 존 존재'}`);
console.log(`규칙별: ${JSON.stringify(ruleCount)}`);

console.log(`\n=== 버킷 → 목표 존 분포 ===`);
for (const bucket of Object.keys(byBucket)) {
  const dist = Object.entries(byBucket[bucket]).sort((a, b) => b[1] - a[1]);
  const total = dist.reduce((s, [, c]) => s + c, 0);
  console.log(`\n[${bucket}] ${total}마리`);
  for (const [zone, c] of dist) console.log(`   ${zone.padEnd(24)} ${c}`);
}

console.log(`\n=== 존별 총계(배정된 존만) ===`);
for (const [zone, c] of Object.entries(byZone).sort((a, b) => b[1] - a[1])) {
  console.log(`   ${zone.padEnd(24)} ${c}`);
}
const emptyZones = ZONES.filter((z) => !byZone[z.code]).map((z) => z.code);
console.log(`\n배정 0인 존(=#208 폴백 의존 유지): ${emptyZones.length}개`);
console.log(`   ${emptyZones.join(', ')}`);

console.log(`\n=== 레벨-범위 불일치(의도된 clamp/fallback) ${violations.length}건 ===`);
for (const v of violations) console.log(`   ${v.code.padEnd(16)} L${String(v.level).padEnd(3)} ${v.bucket} → ${v.zone}(${v.range}) ${v.delta} [${v.rule}]`);

writeFileSync(outPath, JSON.stringify(map, null, 2) + '\n', 'utf8');
console.log(`\n맵 기록: ${outPath} (${Object.keys(map).length} 항목)`);
