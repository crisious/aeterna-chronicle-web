/**
 * l10n_validator.ts — 3언어 (ko/en/ja) 번역 키 누락/불일치 검증 스크립트
 *
 * 실행: npx ts-node tools/regression/l10n_validator.ts
 *
 * 검증 항목:
 * 1. 키 누락: 기준 언어(ko) 대비 en/ja 누락 키 목록
 * 2. 역방향 누락: en/ja에만 존재하고 ko에 없는 키
 * 3. 빈 문자열: 값이 "" 인 키
 * 4. 파라미터 불일치: {param} 패턴이 언어 간 다른 키
 */

import * as fs from 'fs';
import * as path from 'path';

// ── 타입 정의 ──

type NestedRecord = { [key: string]: string | NestedRecord };
type FlatMap = Map<string, string>;
type Locale = 'ko' | 'en' | 'ja';

// ── 유틸 함수 ──

/** 중첩 JSON을 flat key-value Map으로 변환 */
function flatten(obj: NestedRecord, prefix = ''): FlatMap {
  const result: FlatMap = new Map();
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') {
      result.set(fullKey, value);
    } else if (typeof value === 'object' && value !== null) {
      const nested = flatten(value as NestedRecord, fullKey);
      nested.forEach((v, k) => result.set(k, v));
    }
  }
  return result;
}

/** 문자열에서 {param} 패턴 추출 */
function extractParams(text: string): string[] {
  const matches = text.match(/\{(\w+)\}/g);
  return matches ? matches.sort() : [];
}

/** JSON 파일 로드 */
function loadLocale(locale: Locale): FlatMap {
  const filePath = path.resolve(__dirname, `../../client/src/i18n/${locale}.json`);
  if (!fs.existsSync(filePath)) {
    console.error(`❌ 파일 없음: ${filePath}`);
    process.exit(1);
  }
  const raw = fs.readFileSync(filePath, 'utf-8');
  const data = JSON.parse(raw) as NestedRecord;
  return flatten(data);
}

// ── 검증 로직 ──

interface ValidationResult {
  missingKeys: { locale: Locale; keys: string[] }[];
  extraKeys: { locale: Locale; keys: string[] }[];
  emptyValues: { locale: Locale; keys: string[] }[];
  paramMismatches: { key: string; details: string }[];
  totalKeys: Record<Locale, number>;
}

function validate(): ValidationResult {
  const locales: Locale[] = ['ko', 'en', 'ja'];
  const data: Record<Locale, FlatMap> = {
    ko: loadLocale('ko'),
    en: loadLocale('en'),
    ja: loadLocale('ja'),
  };

  const baseLocale: Locale = 'ko';
  const baseKeys = new Set(data[baseLocale].keys());

  const result: ValidationResult = {
    missingKeys: [],
    extraKeys: [],
    emptyValues: [],
    paramMismatches: [],
    totalKeys: { ko: data.ko.size, en: data.en.size, ja: data.ja.size },
  };

  // 1. 키 누락 & 역방향 누락 & 빈 문자열
  for (const locale of locales) {
    const localeKeys = new Set(data[locale].keys());

    if (locale !== baseLocale) {
      // 기준(ko) 대비 누락
      const missing = [...baseKeys].filter(k => !localeKeys.has(k));
      if (missing.length > 0) {
        result.missingKeys.push({ locale, keys: missing });
      }

      // 역방향: locale에만 존재
      const extra = [...localeKeys].filter(k => !baseKeys.has(k));
      if (extra.length > 0) {
        result.extraKeys.push({ locale, keys: extra });
      }
    }

    // 빈 문자열
    const emptyKeys: string[] = [];
    data[locale].forEach((value, key) => {
      if (value.trim() === '') emptyKeys.push(key);
    });
    if (emptyKeys.length > 0) {
      result.emptyValues.push({ locale, keys: emptyKeys });
    }
  }

  // 2. 파라미터 불일치
  for (const key of baseKeys) {
    const baseVal = data[baseLocale].get(key)!;
    const baseParams = extractParams(baseVal);

    for (const locale of locales) {
      if (locale === baseLocale) continue;
      const val = data[locale].get(key);
      if (!val) continue; // 이미 누락으로 처리됨

      const localeParams = extractParams(val);
      if (JSON.stringify(baseParams) !== JSON.stringify(localeParams)) {
        result.paramMismatches.push({
          key,
          details: `${baseLocale}=${baseParams.join(',')} vs ${locale}=${localeParams.join(',')}`,
        });
      }
    }
  }

  return result;
}

// ── 리포트 출력 ──

function printReport(result: ValidationResult): void {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('  에테르나 크로니클 — L10N 검증 리포트');
  console.log('═══════════════════════════════════════════════════\n');

  // 키 통계
  console.log(`📊 키 수: ko=${result.totalKeys.ko}  en=${result.totalKeys.en}  ja=${result.totalKeys.ja}\n`);

  let hasIssue = false;

  // 누락 키
  if (result.missingKeys.length > 0) {
    hasIssue = true;
    console.log('❌ 누락 키 (기준 ko 대비)');
    for (const { locale, keys } of result.missingKeys) {
      console.log(`  [${locale}] ${keys.length}건`);
      keys.forEach(k => console.log(`    - ${k}`));
    }
    console.log();
  }

  // 역방향 누락
  if (result.extraKeys.length > 0) {
    hasIssue = true;
    console.log('⚠️  역방향 누락 (ko에 없는 키)');
    for (const { locale, keys } of result.extraKeys) {
      console.log(`  [${locale}] ${keys.length}건`);
      keys.forEach(k => console.log(`    - ${k}`));
    }
    console.log();
  }

  // 빈 문자열
  if (result.emptyValues.length > 0) {
    hasIssue = true;
    console.log('🔲 빈 문자열');
    for (const { locale, keys } of result.emptyValues) {
      console.log(`  [${locale}] ${keys.length}건`);
      keys.forEach(k => console.log(`    - ${k}`));
    }
    console.log();
  }

  // 파라미터 불일치
  if (result.paramMismatches.length > 0) {
    hasIssue = true;
    console.log('🔀 파라미터 불일치');
    for (const { key, details } of result.paramMismatches) {
      console.log(`  - ${key}: ${details}`);
    }
    console.log();
  }

  if (!hasIssue) {
    console.log('✅ 모든 검증 통과! 3언어 키 완벽 일치.\n');
  }

  console.log('═══════════════════════════════════════════════════\n');

  // 실패 시 exit code 1
  if (hasIssue) process.exit(1);
}

// ── 실행 ──

const result = validate();
printReport(result);
