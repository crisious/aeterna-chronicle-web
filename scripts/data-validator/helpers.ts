/**
 * scripts/data-validator/helpers.ts — 데이터 파일 로더/경로 유틸 (계섬월 Build)
 *
 * 책임:
 *   1) resolveDataGlob — 도메인별 .json 파일 경로 수집 (data/, client/src/data/ 양쪽 지원)
 *   2) loadJsonWithSourceMap — JSON 파싱 + jsonPointer→line/column 근사 추적
 *
 * 위치 추적은 외부 의존 없이 자체 토크나이저로 구현. 의존 사슬을 늘리지 않는다.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { DataDomainId } from './types.ts';

const HERE = path.dirname(fileURLToPath(import.meta.url));

export function resolveWorkspaceRoot(override?: string): string {
  if (override) return path.resolve(override);
  // scripts/data-validator/helpers.ts → workspace root는 ../../
  return path.resolve(HERE, '..', '..');
}

export function resolveSchemaPath(domain: DataDomainId): string {
  return path.join(HERE, 'schemas', `${domain}.schema.json`);
}

/**
 * 도메인별 데이터 파일 경로 목록.
 * 후보 루트: `data/`, `client/src/data/` × `<domain>s/` 또는 `<domain>/` 하위 *.json
 *  - 디렉터리가 없으면 빈 배열 (도메인 0건은 PASS).
 *  - `_*.json`, `*.schema.json` 은 제외.
 */
export function resolveDataGlob(domain: DataDomainId, workspaceRoot: string): string[] {
  const subDirs = [`${domain}s`, domain]; // 'skills' / 'skill' 모두 지원
  const roots = [
    path.join(workspaceRoot, 'data'),
    path.join(workspaceRoot, 'client', 'src', 'data'),
  ];
  const results: string[] = [];
  for (const root of roots) {
    for (const sub of subDirs) {
      const dir = path.join(root, sub);
      if (!isDirectory(dir)) continue;
      collectJsonFiles(dir, results);
    }
  }
  return results;
}

function isDirectory(p: string): boolean {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}

function collectJsonFiles(dir: string, out: string[]): void {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      collectJsonFiles(full, out);
      continue;
    }
    if (!e.isFile()) continue;
    if (!e.name.endsWith('.json')) continue;
    if (e.name.startsWith('_')) continue;
    if (e.name.endsWith('.schema.json')) continue;
    out.push(full);
  }
}

/**
 * JSON 파일을 읽고, jsonPointer→{line, column} 매핑을 함께 반환.
 * 자체 미니 파서 — 외부 의존 없음. 라인/컬럼은 1-base.
 */
export function loadJsonWithSourceMap(filePath: string): {
  data: unknown;
  pointers: Map<string, { line: number; column: number }>;
  raw: string;
} {
  const raw = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(raw);
  const pointers = buildPointerMap(raw);
  return { data, pointers, raw };
}

/**
 * RFC6901 jsonPointer 빌더용 escape.
 */
export function escapePointerToken(token: string | number): string {
  const s = String(token);
  return s.replace(/~/g, '~0').replace(/\//g, '~1');
}

/**
 * 자체 JSON 토크나이저 — 토큰별 라인/컬럼 추적하며 jsonPointer 맵 생성.
 * 표준 JSON만 지원 (주석/트레일링 콤마 X — JSON5 아님).
 */
function buildPointerMap(raw: string): Map<string, { line: number; column: number }> {
  const map = new Map<string, { line: number; column: number }>();
  let i = 0;
  let line = 1;
  let column = 1;
  const len = raw.length;

  function advance(n = 1): void {
    for (let k = 0; k < n; k++) {
      const ch = raw[i++];
      if (ch === '\n') {
        line++;
        column = 1;
      } else {
        column++;
      }
    }
  }

  function skipWs(): void {
    while (i < len) {
      const ch = raw[i];
      if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
        advance(1);
      } else {
        break;
      }
    }
  }

  function readString(): string {
    // 가정: 현재 i는 '"' 위치
    advance(1); // 시작 따옴표
    let out = '';
    while (i < len) {
      const ch = raw[i];
      if (ch === '"') {
        advance(1);
        return out;
      }
      if (ch === '\\') {
        const next = raw[i + 1];
        advance(2);
        switch (next) {
          case 'n': out += '\n'; break;
          case 't': out += '\t'; break;
          case 'r': out += '\r'; break;
          case '"': out += '"'; break;
          case '\\': out += '\\'; break;
          case '/': out += '/'; break;
          case 'b': out += '\b'; break;
          case 'f': out += '\f'; break;
          case 'u': {
            const hex = raw.substr(i, 4);
            advance(4);
            out += String.fromCharCode(parseInt(hex, 16));
            break;
          }
          default: out += next ?? '';
        }
      } else {
        out += ch;
        advance(1);
      }
    }
    return out;
  }

  function skipPrimitive(): void {
    // number, true, false, null
    while (i < len) {
      const ch = raw[i];
      if (ch === ',' || ch === '}' || ch === ']' || ch === ' ' || ch === '\n' || ch === '\t' || ch === '\r') return;
      advance(1);
    }
  }

  function parseValue(pointer: string): void {
    skipWs();
    if (i >= len) return;
    map.set(pointer, { line, column });
    const ch = raw[i];
    if (ch === '{') {
      advance(1);
      skipWs();
      if (raw[i] === '}') { advance(1); return; }
      while (i < len) {
        skipWs();
        if (raw[i] !== '"') break;
        const keyLine = line;
        const keyCol = column;
        const key = readString();
        const childPointer = `${pointer}/${escapePointerToken(key)}`;
        map.set(childPointer, { line: keyLine, column: keyCol });
        skipWs();
        if (raw[i] === ':') advance(1);
        skipWs();
        parseValue(childPointer);
        skipWs();
        if (raw[i] === ',') { advance(1); continue; }
        if (raw[i] === '}') { advance(1); return; }
        break;
      }
    } else if (ch === '[') {
      advance(1);
      skipWs();
      if (raw[i] === ']') { advance(1); return; }
      let idx = 0;
      while (i < len) {
        skipWs();
        const childPointer = `${pointer}/${idx}`;
        map.set(childPointer, { line, column });
        parseValue(childPointer);
        skipWs();
        if (raw[i] === ',') { advance(1); idx++; continue; }
        if (raw[i] === ']') { advance(1); return; }
        break;
      }
    } else if (ch === '"') {
      readString();
    } else {
      skipPrimitive();
    }
  }

  parseValue('');
  return map;
}

/**
 * jsonPointer를 받아 {line, column} 반환. 못 찾으면 {line:1, column:1}.
 */
export function locateByPointer(
  pointers: Map<string, { line: number; column: number }>,
  jsonPointer: string,
): { line: number; column: number } {
  if (pointers.has(jsonPointer)) return pointers.get(jsonPointer)!;
  // 점진적 fallback — 가장 가까운 부모 포인터
  let p = jsonPointer;
  while (p.length > 0) {
    const slash = p.lastIndexOf('/');
    if (slash < 0) break;
    p = p.slice(0, slash);
    if (pointers.has(p)) return pointers.get(p)!;
  }
  return { line: 1, column: 1 };
}

/**
 * 문제 라인을 ±2 라인 snippet으로 추출.
 */
export function buildSnippet(raw: string, line: number, contextLines = 2): string {
  const lines = raw.split(/\r?\n/);
  const start = Math.max(0, line - 1 - contextLines);
  const end = Math.min(lines.length, line + contextLines);
  const out: string[] = [];
  for (let l = start; l < end; l++) {
    const marker = (l + 1) === line ? '>' : ' ';
    out.push(`${marker} ${String(l + 1).padStart(4)} | ${lines[l] ?? ''}`);
  }
  return out.join('\n');
}
