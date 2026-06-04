/**
 * generateLocationMigrationSql.mjs — monster-location-map.generated.json → Prisma 마이그레이션 0016 SQL
 *
 * 목표 존별로 code 를 묶어 UPDATE "monsters" SET "location"=zone WHERE "code" IN (...) 를 생성.
 * code 기준이라 멱등(재실행해도 같은 값). 기존 행이 없으면 0행 갱신(무해).
 * 시드 리터럴(monsterSeeds.ts)도 같은 맵에서 재작성하므로 둘이 어긋날 수 없다.
 *
 * 실행: node tools/seed/generateLocationMigrationSql.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..', '..');
const mapPath = resolve(__dirname, 'monster-location-map.generated.json');
const migDir = resolve(repoRoot, 'server/prisma/migrations/0016_monster_location_to_zone_code');
const migPath = resolve(migDir, 'migration.sql');

const map = JSON.parse(readFileSync(mapPath, 'utf8'));

// zone -> [codes]
const byZone = {};
for (const [code, zone] of Object.entries(map)) (byZone[zone] ??= []).push(code);

const zones = Object.keys(byZone).sort();
const total = Object.keys(map).length;

const lines = [];
lines.push('-- 0016_monster_location_to_zone_code');
lines.push('-- 몬스터 Monster.location 을 구 지역명(twilight_forest 등) → 신 Zone.code(silvanhome_entrance 등)로 정합화.');
lines.push('-- 하이브리드 매핑(테마 region 우선 + 레벨 적합 존 배치)을 tools/seed/monsterLocationMigration.mjs 로 결정적 산출,');
lines.push('-- tools/seed/monster-location-map.generated.json 을 SSOT 로 시드 리터럴과 본 SQL 을 동시 생성(둘이 항상 일치).');
lines.push('-- code 기준 UPDATE 라 멱등하며, 대상 행이 없으면 0행 갱신(무해). #208 levelRange 폴백은 미배정 존(11개) 안전망으로 존치.');
lines.push(`-- 총 ${total}마리 → ${zones.length}개 Zone.code.`);
lines.push('');
lines.push('BEGIN;');
lines.push('');
for (const zone of zones) {
  const codes = byZone[zone].slice().sort();
  const inList = codes.map((c) => `'${c}'`).join(', ');
  lines.push(`-- ${zone} (${codes.length})`);
  lines.push(`UPDATE "monsters" SET "location" = '${zone}' WHERE "code" IN (${inList});`);
  lines.push('');
}
lines.push('COMMIT;');
lines.push('');

mkdirSync(migDir, { recursive: true });
writeFileSync(migPath, lines.join('\n'), 'utf8');
console.log(`마이그레이션 생성: ${migPath}`);
console.log(`  ${total}마리 → ${zones.length}개 존, UPDATE ${zones.length}문`);
