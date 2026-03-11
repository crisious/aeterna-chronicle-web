/**
 * owasp_checklist.ts — OWASP Top 10 자동 보안 체크 스크립트 (P5-19)
 *
 * 실행: npx ts-node tools/security/owasp_checklist.ts
 *
 * 파일 존재 여부 + 설정값 검증 기반으로 10개 항목 PASS/FAIL 판정.
 * 실제 런타임 테스트가 아닌 정적 코드/설정 감사 수준.
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

// ── 경로 설정 ───────────────────────────────────────────────

const ROOT = path.resolve(__dirname, '..', '..');
const SERVER_SRC = path.join(ROOT, 'server', 'src');
const CLIENT_SRC = path.join(ROOT, 'client', 'src');

// ── 결과 타입 ───────────────────────────────────────────────

interface CheckResult {
  id: string;
  title: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  detail: string;
}

const results: CheckResult[] = [];

// ── 유틸 ────────────────────────────────────────────────────

function fileExists(relativePath: string): boolean {
  return fs.existsSync(path.join(ROOT, relativePath));
}

function fileContains(relativePath: string, pattern: RegExp): boolean {
  const fullPath = path.join(ROOT, relativePath);
  if (!fs.existsSync(fullPath)) return false;
  const content = fs.readFileSync(fullPath, 'utf-8');
  return pattern.test(content);
}

function addResult(id: string, title: string, pass: boolean, detail: string, warn = false): void {
  results.push({
    id,
    title,
    status: pass ? 'PASS' : warn ? 'WARN' : 'FAIL',
    detail,
  });
}

// ── A01: Broken Access Control ──────────────────────────────

function checkA01(): void {
  const authExists = fileExists('server/src/admin/authMiddleware.ts');
  const hasRoleCheck = authExists && fileContains(
    'server/src/admin/authMiddleware.ts',
    /role|permission|authorize|isAdmin/i,
  );

  const pass = authExists && hasRoleCheck;
  addResult(
    'A01',
    'Broken Access Control — 인증/인가 미들웨어',
    pass,
    authExists
      ? hasRoleCheck
        ? 'authMiddleware.ts 존재 + role 검증 패턴 확인'
        : 'authMiddleware.ts 존재하나 role 검증 패턴 미발견'
      : 'authMiddleware.ts 파일 없음',
  );
}

// ── A02: Cryptographic Failures ─────────────────────────────

function checkA02(): void {
  const envPath = path.join(ROOT, 'server', '.env');
  let pass = false;
  let detail = '.env 파일 없음';

  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    const match = content.match(/JWT_SECRET\s*=\s*(.+)/);
    if (match) {
      const secretLen = match[1].trim().replace(/["']/g, '').length;
      pass = secretLen >= 32;
      detail = pass
        ? `JWT_SECRET 길이 ${secretLen}자 (≥32 충족)`
        : `JWT_SECRET 길이 ${secretLen}자 (32자 미만 — 취약)`;
    } else {
      detail = '.env에 JWT_SECRET 미설정';
    }
  }

  addResult('A02', 'Cryptographic Failures — JWT 시크릿 강도', pass, detail);
}

// ── A03: Injection ──────────────────────────────────────────

function checkA03(): void {
  const prismaExists = fileExists('server/prisma/schema.prisma');
  const validatorExists = fileExists('server/src/security/inputValidator.ts');

  // Prisma 사용 시 파라미터 바인딩은 기본 적용
  const pass = prismaExists && validatorExists;
  addResult(
    'A03',
    'Injection — Prisma 파라미터 바인딩 + 입력 검증',
    pass,
    `Prisma schema: ${prismaExists ? '✓' : '✗'} | inputValidator.ts: ${validatorExists ? '✓' : '✗'}`,
  );
}

// ── A04: Insecure Design ────────────────────────────────────

function checkA04(): void {
  const rateLimiterExists = fileExists('server/src/security/rateLimiter.ts');

  addResult(
    'A04',
    'Insecure Design — Rate Limiter',
    rateLimiterExists,
    rateLimiterExists
      ? 'rateLimiter.ts 존재 — API 속도 제한 구현'
      : 'rateLimiter.ts 없음 — 무차별 대입 방어 부재',
  );
}

// ── A05: Security Misconfiguration ──────────────────────────

function checkA05(): void {
  const serverFile = path.join(SERVER_SRC, 'server.ts');
  let corsOk = false;
  let helmetOk = false;

  if (fs.existsSync(serverFile)) {
    const content = fs.readFileSync(serverFile, 'utf-8');
    corsOk = /cors/i.test(content);
    helmetOk = /helmet/i.test(content);
  }

  const pass = corsOk && helmetOk;
  addResult(
    'A05',
    'Security Misconfiguration — CORS + Helmet',
    pass,
    `CORS: ${corsOk ? '✓' : '✗'} | Helmet: ${helmetOk ? '✓' : '✗'}`,
    !pass, // 미충족 시 WARN
  );
}

// ── A06: Vulnerable Components ──────────────────────────────

function checkA06(): void {
  let pass = true;
  let detail = '';

  try {
    const serverDir = path.join(ROOT, 'server');
    if (fs.existsSync(path.join(serverDir, 'package.json'))) {
      const output = execSync('npm audit --json 2>/dev/null || true', {
        cwd: serverDir,
        encoding: 'utf-8',
        timeout: 30000,
      });

      try {
        const audit = JSON.parse(output);
        const vulns = audit.metadata?.vulnerabilities ?? {};
        const critical = (vulns.critical ?? 0) + (vulns.high ?? 0);
        pass = critical === 0;
        detail = `Critical: ${vulns.critical ?? 0}, High: ${vulns.high ?? 0}, Moderate: ${vulns.moderate ?? 0}`;
      } catch {
        detail = 'npm audit JSON 파싱 실패 — 수동 확인 필요';
        pass = false;
      }
    } else {
      detail = 'server/package.json 없음';
      pass = false;
    }
  } catch {
    detail = 'npm audit 실행 실패';
    pass = false;
  }

  addResult('A06', 'Vulnerable Components — npm audit', pass, detail, !pass);
}

// ── A07: Identification & Auth Failures ─────────────────────

function checkA07(): void {
  const jwtManagerExists = fileExists('server/src/security/jwtManager.ts');
  let hasExpiry = false;
  let hasLoginFailure = false;

  if (jwtManagerExists) {
    hasExpiry = fileContains('server/src/security/jwtManager.ts', /expiresIn|exp|ttl/i);
  }

  // 로그인 실패 처리 (authRoutes 또는 authMiddleware)
  const authRoutesPath = 'server/src/routes/authRoutes.ts';
  if (fileExists(authRoutesPath)) {
    hasLoginFailure = fileContains(authRoutesPath, /fail|invalid|unauthorized|wrong.*password/i);
  }

  const pass = jwtManagerExists && hasExpiry && hasLoginFailure;
  addResult(
    'A07',
    'Identification & Auth Failures — JWT 만료 + 로그인 실패 처리',
    pass,
    `jwtManager: ${jwtManagerExists ? '✓' : '✗'} | JWT 만료: ${hasExpiry ? '✓' : '✗'} | 로그인 실패 처리: ${hasLoginFailure ? '✓' : '✗'}`,
  );
}

// ── A08: Software & Data Integrity ──────────────────────────

function checkA08(): void {
  const schemaPath = 'server/prisma/schema.prisma';
  const schemaExists = fileExists(schemaPath);
  let integrityOk = false;

  if (schemaExists) {
    // 기본 무결성: generator + datasource 블록 존재 확인
    integrityOk = fileContains(schemaPath, /generator\s+client/) &&
                  fileContains(schemaPath, /datasource\s+db/);
  }

  addResult(
    'A08',
    'Software & Data Integrity — Prisma Schema 무결성',
    schemaExists && integrityOk,
    schemaExists
      ? integrityOk
        ? 'schema.prisma 구조 정상 (generator + datasource 확인)'
        : 'schema.prisma 존재하나 필수 블록 누락'
      : 'server/prisma/schema.prisma 없음',
  );
}

// ── A09: Security Logging & Monitoring ──────────────────────

function checkA09(): void {
  const loggerExists = fileExists('server/src/logging/structuredLogger.ts');
  const logMiddlewareExists = fileExists('server/src/logging/logMiddleware.ts');

  const pass = loggerExists;
  addResult(
    'A09',
    'Security Logging & Monitoring — 구조적 로거',
    pass,
    `structuredLogger.ts: ${loggerExists ? '✓' : '✗'} | logMiddleware.ts: ${logMiddlewareExists ? '✓' : '✗'}`,
  );
}

// ── A10: SSRF ───────────────────────────────────────────────

function checkA10(): void {
  // 외부 URL 화이트리스트 패턴 확인
  let hasWhitelist = false;
  let detail = '';

  // inputValidator 또는 서버 설정에서 URL 화이트리스트 확인
  const validatorPath = 'server/src/security/inputValidator.ts';
  if (fileExists(validatorPath)) {
    hasWhitelist = fileContains(validatorPath, /whitelist|allowedUrl|allowedDomain|urlPattern/i);
  }

  // server.ts에서도 확인
  if (!hasWhitelist) {
    const serverPath = 'server/src/server.ts';
    if (fileExists(serverPath)) {
      hasWhitelist = fileContains(serverPath, /whitelist|allowedOrigin|trustedUrl/i);
    }
  }

  addResult(
    'A10',
    'SSRF — 외부 URL 화이트리스트',
    hasWhitelist,
    hasWhitelist
      ? '외부 URL 화이트리스트 패턴 발견'
      : '외부 URL 화이트리스트 패턴 미발견 — SSRF 위험',
    !hasWhitelist,
  );
}

// ── 실행 ────────────────────────────────────────────────────

function main(): void {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║    OWASP Top 10 보안 감사 — 에테르나 크로니클       ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log('');

  checkA01();
  checkA02();
  checkA03();
  checkA04();
  checkA05();
  checkA06();
  checkA07();
  checkA08();
  checkA09();
  checkA10();

  // 결과 출력
  let passCount = 0;
  let failCount = 0;
  let warnCount = 0;

  for (const r of results) {
    const icon = r.status === 'PASS' ? '✅' : r.status === 'WARN' ? '⚠️' : '❌';
    console.log(`${icon} [${r.id}] ${r.title}`);
    console.log(`   ${r.status}: ${r.detail}`);
    console.log('');

    if (r.status === 'PASS') passCount++;
    else if (r.status === 'WARN') warnCount++;
    else failCount++;
  }

  console.log('────────────────────────────────────────────────────');
  console.log(`결과: ✅ PASS ${passCount} | ⚠️ WARN ${warnCount} | ❌ FAIL ${failCount} / 총 ${results.length}개`);
  console.log('');

  // 종료 코드 (CI 연동용)
  if (failCount > 0) {
    process.exit(1);
  }
}

main();
