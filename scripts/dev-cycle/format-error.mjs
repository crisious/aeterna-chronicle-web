#!/usr/bin/env node
// ── type/build 게이트 — tsc/vite stderr 파서 ───────────────────
// 사용:
//   npm run typecheck:client 2>&1 | node scripts/dev-cycle/format-error.mjs --gate=type
//   npm run build:client 2>&1 | node scripts/dev-cycle/format-error.mjs --gate=build
// 기능: 첫 에러의 file:line:col을 즉시 노출 + 원인 한 줄 + 처방 hint
// 종료 코드: 0 PASS · 1 BLOCK · 2 WARN

import { resolve, relative, isAbsolute } from 'node:path';
import { C, colorize, errorCard, icon } from './cli-colors.mjs';

const args = new Map(
    process.argv.slice(2).map((a) => {
        const [k, v] = a.split('=');
        return [k.replace(/^--/, ''), v ?? true];
    }),
);
const gate = args.get('gate') ?? 'type';
const ROOT = process.cwd();

// TS 에러 패턴: src/foo.ts(12,34): error TS2304: Cannot find name 'X'.
const TS_RE = /^(.+?)\((\d+),(\d+)\):\s+error\s+TS(\d+):\s+(.+)$/;
// Vite/Rollup: error during build: ... in <file> at line N column M
//  실제 출력 다양 → 두 변형 처리
const VITE_RE = /^(?:\[plugin\s+[^\]]+\]\s+)?(?:Error|error):?\s+(.+?)\s+in\s+(.+?):(\d+):(\d+)/;
const VITE_RES_RE = /^Could not resolve\s+["']([^"']+)["']\s+from\s+["']([^"']+)["']/;

const FIX_HINTS = {
    2304: '심볼 import 경로/이름 확인',
    2322: '대상 타입과 표현식 타입 좁히기 — 유니온/제네릭 인자 점검',
    2339: '존재하지 않는 멤버 — 인터페이스/Optional chaining 검토',
    2345: '인자 타입 불일치 — overload 시그니처 또는 캐스트 정밀화',
    7006: 'implicit any — 매개변수 타입 명시',
    18046: 'unknown 좁히기 — 타입 가드 또는 zod 파싱',
};

let stdin = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => (stdin += c));
process.stdin.on('end', () => {
    const lines = stdin.split(/\r?\n/);
    const errors = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        let m = line.match(TS_RE);
        if (m) {
            errors.push({
                kind: 'ts',
                code: Number(m[4]),
                file: toRel(m[1]),
                line: Number(m[2]),
                column: Number(m[3]),
                message: m[5],
                snippet: lines[i + 1]?.trim() ?? '',
            });
            continue;
        }
        m = line.match(VITE_RE);
        if (m) {
            errors.push({
                kind: 'vite',
                file: toRel(m[2]),
                line: Number(m[3]),
                column: Number(m[4]),
                message: m[1],
            });
            continue;
        }
        m = line.match(VITE_RES_RE);
        if (m) {
            errors.push({
                kind: 'resolve',
                file: toRel(m[2]),
                line: 1,
                column: 1,
                message: `Cannot resolve '${m[1]}'`,
                importName: m[1],
            });
        }
    }

    // pass through original output
    process.stdout.write(stdin);

    if (errors.length === 0) {
        process.stdout.write(
            `\n${colorize('PASS', icon('PASS'))} ${C.dim}dev.gate.${gate}.pass.zero${C.reset}  ${colorize('PASS', '0 errors')}\n`,
        );
        process.exit(0);
    }

    const first = errors[0];
    const total = errors.length;
    process.stdout.write('\n');

    let title, message, hint, fileLine, snippet;
    if (first.kind === 'ts') {
        const fix = FIX_HINTS[first.code] ?? 'tsc --noEmit 후 첫 에러부터 단계적 해소';
        title = `TS${first.code} · type 게이트 차단`;
        message = first.message;
        hint = fix;
        snippet = first.snippet;
    } else if (first.kind === 'resolve') {
        title = `import 해결 실패 · build 게이트 차단`;
        message = `'${first.importName}' 모듈을 찾을 수 없습니다.`;
        hint = '경로 오타 / package.json 의존성 / tsconfig paths 점검';
    } else {
        title = `${gate} 게이트 차단`;
        message = first.message;
        hint = '첫 에러부터 단계적 해소';
    }

    process.stdout.write(
        errorCard({
            title,
            file: first.file,
            line: first.line,
            column: first.column,
            message,
            snippet,
            hint,
        }) + '\n',
    );
    process.stdout.write(
        `  ${C.dim}총 에러 ${C.accent}${total}${C.reset}${C.dim}건 — 첫 1건만 SSOT 노출. 해결 후 재실행.${C.reset}\n`,
    );
    process.stdout.write(
        `  ${C.dim}dev.gate.${gate}.block.${first.kind === 'resolve' ? 'import' : 'error'}${C.reset}\n`,
    );
    process.exit(1);
});

function toRel(p) {
    if (!p) return p;
    const abs = isAbsolute(p) ? p : resolve(ROOT, p);
    const rel = relative(ROOT, abs);
    // 윈도우 경로 정규화
    return rel.split('\\').join('/');
}
