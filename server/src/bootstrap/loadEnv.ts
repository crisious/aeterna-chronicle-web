/**
 * loadEnv.ts — 로컬 개발용 .env 로더
 *
 * dotenv 의존성 없이 server/.env 또는 루트 .env 를 부팅 전에 읽는다.
 * 이미 주입된 프로세스 환경변수는 덮어쓰지 않는다.
 */

import fs from 'fs';
import path from 'path';

function stripQuotes(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
    || (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function loadEnvFile(filePath: string): void {
  if (!fs.existsSync(filePath)) return;

  const content = fs.readFileSync(filePath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const separatorIndex = line.indexOf('=');
    if (separatorIndex <= 0) continue;

    const key = line.slice(0, separatorIndex).trim();
    if (!key || process.env[key] !== undefined) continue;

    process.env[key] = stripQuotes(line.slice(separatorIndex + 1));
  }
}

const cwd = process.cwd();
const candidatePaths = [
  path.resolve(cwd, '.env'),
  path.resolve(cwd, 'server/.env'),
  path.resolve(cwd, '../.env'),
];

for (const filePath of candidatePaths) {
  loadEnvFile(filePath);
}
