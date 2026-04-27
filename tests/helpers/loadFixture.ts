/**
 * 테스트 fixture 로더
 *
 * 역할:
 * - tests/fixtures 하위 JSON/TXT 자원을 안정적으로 로드
 * - 개별 테스트가 경로 계산을 반복하지 않도록 공통화
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HelperDirectory = path.dirname(fileURLToPath(import.meta.url));
const FixtureDirectory = path.resolve(HelperDirectory, '../fixtures');

/** fixture 절대 경로 계산 */
export function resolveFixturePath(fileName: string): string {
  return path.resolve(FixtureDirectory, fileName);
}

/** JSON fixture 로드 */
export function loadJsonFixture<T>(fileName: string): T {
  const fixturePath = resolveFixturePath(fileName);
  const raw = fs.readFileSync(fixturePath, 'utf-8');
  return JSON.parse(raw) as T;
}

/** 텍스트 fixture 로드 */
export function loadTextFixture(fileName: string): string {
  return fs.readFileSync(resolveFixturePath(fileName), 'utf-8');
}
