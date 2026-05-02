/**
 * tests/unit/dataValidator.test.ts — data-validator 핵심 로직 회귀 보장 (계섬월)
 *
 * 베어낸 칼은 다시 베어야 검이다 — 다음 콘텐츠 추가에서 결함이 새지 않도록 회귀 그물.
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { resetSchemaCache, validateAgainstSchema } from '../../scripts/data-validator/validators/schema-validator';
import { auditReferences } from '../../scripts/data-validator/validators/reference-auditor';
import { auditBalance, computeDistribution } from '../../scripts/data-validator/validators/balance-outlier';
import { loadJsonWithSourceMap, locateByPointer } from '../../scripts/data-validator/helpers';

let tmpRoot: string;

function writeJson(rel: string, content: unknown): string {
  const full = path.join(tmpRoot, rel);
  mkdirSync(path.dirname(full), { recursive: true });
  writeFileSync(full, JSON.stringify(content, null, 2), 'utf8');
  return full;
}

beforeEach(() => {
  tmpRoot = mkdtempSync(path.join(tmpdir(), 'aeterna-validator-'));
  resetSchemaCache();
});

afterEach(() => {
  rmSync(tmpRoot, { recursive: true, force: true });
});

describe('schema-validator', () => {
  test('정상 스킬 데이터는 0 findings', async () => {
    const file = writeJson('data/skills/ok.json', [
      { id: 'skl_a', nameKo: '기본', classId: 'ether_knight', effectId: 'eff_a', damage: 10, castTime: 0.5 },
    ]);
    const result = await validateAgainstSchema('skill', file);
    expect(result.findings).toHaveLength(0);
    expect(result.recordCount).toBe(1);
  });

  test('필수 필드 누락 → SCHEMA_REQUIRED + LocationCue', async () => {
    const file = writeJson('data/skills/missing.json', [
      { id: 'skl_x', nameKo: '미완', classId: 'ether_knight' },
    ]);
    const result = await validateAgainstSchema('skill', file);
    expect(result.findings.length).toBeGreaterThan(0);
    const codes = result.findings.map((f) => f.code);
    expect(codes).toContain('SCHEMA_REQUIRED');
    for (const f of result.findings) {
      expect(f.location.filePath).toBe(file);
      expect(typeof f.location.jsonPointer).toBe('string');
      expect(f.severity).toBe('error');
    }
  });

  test('id pattern / enum 위반 동시 검출 (allErrors)', async () => {
    const file = writeJson('data/skills/bad.json', [
      { id: 'BAD-ID', nameKo: '고장', classId: 'unknown', effectId: 'eff_x' },
    ]);
    const result = await validateAgainstSchema('skill', file);
    const codes = result.findings.map((f) => f.code);
    expect(codes).toContain('SCHEMA_PATTERN');
    expect(codes).toContain('SCHEMA_ENUM');
  });
});

describe('reference-auditor', () => {
  test('encounter→monster 끊긴 참조는 REF_BROKEN_LINK error', async () => {
    writeJson('data/monsters/m.json', [
      { id: 'mon_a', nameKo: 'A', regionId: 'erebos', tierId: 't1', hp: 50, exp: 10 },
    ]);
    writeJson('data/encounters/e.json', [
      { id: 'enc_x', regionId: 'erebos', chapter: 1, monsterIds: ['mon_a', 'mon_GHOST'], weight: 1 },
    ]);
    const findings = await auditReferences(tmpRoot);
    const broken = findings.filter((f) => f.code === 'REF_BROKEN_LINK');
    expect(broken).toHaveLength(1);
    expect(broken[0].severity).toBe('error');
    expect(broken[0].messageKo).toContain('mon_GHOST');
    expect(broken[0].location.filePath).toContain('encounters');
  });

  test('미참조 monster는 REF_UNUSED_TARGET warn', async () => {
    writeJson('data/monsters/m.json', [
      { id: 'mon_lonely', nameKo: '외톨이', regionId: 'erebos', tierId: 't1', hp: 50, exp: 10 },
    ]);
    const findings = await auditReferences(tmpRoot);
    const unused = findings.filter((f) => f.code === 'REF_UNUSED_TARGET' && f.domain === 'monster');
    expect(unused).toHaveLength(1);
    expect(unused[0].severity).toBe('warn');
  });
});

describe('balance-outlier', () => {
  test('computeDistribution — 평균/표준편차 정확', () => {
    const dist = computeDistribution('monster', 'hp', [10, 20, 30, 40, 50]);
    expect(dist.count).toBe(5);
    expect(dist.mean).toBeCloseTo(30, 5);
    // sample stdev (N-1) of [10..50] = sqrt(250) ≈ 15.81
    expect(dist.stdev).toBeCloseTo(15.811, 2);
    expect(dist.min).toBe(10);
    expect(dist.max).toBe(50);
  });

  test('±3σ 초과 → BAL_OUTLIER_3SIGMA error', async () => {
    // 정상 표본 20개 + 극단 outlier 1개. 표본 수가 작으면 outlier 자체가 stdev를 부풀려 3σ 미달.
    const normals = Array.from({ length: 20 }, (_, i) => ({
      id: `mon_${i + 1}`,
      nameKo: `잡병 ${i + 1}`,
      regionId: 'erebos',
      tierId: 't1',
      hp: 50 + (i % 5) * 5,
      exp: 10 + (i % 5),
    }));
    writeJson('data/monsters/dist.json', [
      ...normals,
      { id: 'mon_BOSS', nameKo: '거인', regionId: 'erebos', tierId: 'boss', hp: 99999, exp: 9999 },
    ]);
    const result = await auditBalance({}, tmpRoot);
    const errors = result.findings.filter((f) => f.severity === 'error' && f.code === 'BAL_OUTLIER_3SIGMA');
    expect(errors.length).toBeGreaterThan(0);
    const bossHpErr = errors.find((f) => f.messageKo.includes('mon_BOSS') && f.messageKo.includes('hp'));
    expect(bossHpErr).toBeDefined();
    expect(bossHpErr!.location.jsonPointer).toContain('/hp');
  });

  test('표본 < 3 또는 stdev=0이면 outlier 없음', async () => {
    writeJson('data/monsters/few.json', [
      { id: 'mon_a', nameKo: 'A', regionId: 'erebos', tierId: 't1', hp: 100, exp: 10 },
      { id: 'mon_b', nameKo: 'B', regionId: 'erebos', tierId: 't1', hp: 100, exp: 10 },
    ]);
    const result = await auditBalance({}, tmpRoot);
    expect(result.outliers).toHaveLength(0);
  });
});

describe('helpers — source map', () => {
  test('jsonPointer→line/column 추적', () => {
    const file = writeJson('data/sample.json', { a: 1, b: { c: 'x' } });
    const { pointers } = loadJsonWithSourceMap(file);
    const cAt = locateByPointer(pointers, '/b/c');
    expect(cAt.line).toBeGreaterThanOrEqual(1);
    // 부모 fallback
    const missing = locateByPointer(pointers, '/b/c/d/e');
    expect(missing.line).toBeGreaterThanOrEqual(1);
  });
});
