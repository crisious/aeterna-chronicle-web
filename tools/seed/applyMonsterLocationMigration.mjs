/**
 * applyMonsterLocationMigration.mjs — monster-location-map.generated.json 을 monsterSeeds.ts 에 적용
 *
 * 각 몬스터 객체의 location: '<구 지역명>' 을 code 별 목표 Zone.code 로 in-place 치환한다.
 * 단일라인/멀티라인 객체 모두 지원: code 를 만나면 그 code 의 다음 location 리터럴 한 개만 교체.
 *
 * 실행: node tools/seed/applyMonsterLocationMigration.mjs   (먼저 monsterLocationMigration.mjs 로 맵 생성)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..', '..');
const seedPath = resolve(repoRoot, 'server/src/monster/monsterSeeds.ts');
const mapPath = resolve(__dirname, 'monster-location-map.generated.json');

const map = JSON.parse(readFileSync(mapPath, 'utf8'));
const src = readFileSync(seedPath, 'utf8');
const lines = src.split(/\r?\n/);

const codeRe = /code:\s*'([^']+)'/;
const locRe = /location:\s*'[^']+'/;

let curCode = null;
let replaced = 0;
const missing = [];
const out = lines.map((line) => {
  const cm = codeRe.exec(line);
  if (cm) curCode = cm[1];
  if (curCode && locRe.test(line)) {
    const target = map[curCode];
    const code = curCode;
    curCode = null;
    if (!target) {
      missing.push(code);
      return line; // 맵에 없는 code(이론상 없음) → 원본 보존
    }
    replaced += 1;
    return line.replace(locRe, `location: '${target}'`);
  }
  return line;
});

writeFileSync(seedPath, out.join('\n'), 'utf8');
console.log(`치환 완료: ${replaced}건 (맵 항목 ${Object.keys(map).length}개)`);
if (missing.length) console.log(`[WARN] 맵에 없는 code ${missing.length}개: ${missing.join(', ')}`);
