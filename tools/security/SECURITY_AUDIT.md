# 🔒 SECURITY_AUDIT.md — 에테르나 크로니클 보안 감사 리포트

> **감사 일자**: 2026-03-11  
> **감사 도구**: `tools/security/owasp_checklist.ts`  
> **기준**: OWASP Top 10 (2021)

---

## 요약

| 등급 | 항목 수 | 비율 |
|------|---------|------|
| ✅ PASS | 6 | 60% |
| ⚠️ WARN | 2 | 20% |
| ❌ FAIL | 2 | 20% |

---

## 항목별 상세

### A01: Broken Access Control — 인증/인가 미들웨어

| 항목 | 상태 |
|------|------|
| `authMiddleware.ts` 존재 | ✅ |
| role/permission 검증 패턴 | ✅ |

**현재 상태**: PASS  
**비고**: 관리자 라우트에 미들웨어 적용 확인. 모든 보호 라우트에 일관 적용 여부 수동 확인 권장.

---

### A02: Cryptographic Failures — JWT 시크릿 강도

| 항목 | 상태 |
|------|------|
| `.env` JWT_SECRET 설정 | ⚠️ 확인 필요 |
| 길이 ≥ 32자 | ⚠️ 확인 필요 |

**현재 상태**: WARN (환경별 확인 필요)  
**권장 조치**:
- JWT_SECRET을 최소 32자 이상의 랜덤 문자열로 설정
- `openssl rand -base64 48` 등으로 생성 권장
- 프로덕션에서는 Vault/Secret Manager 사용

---

### A03: Injection — Prisma 파라미터 바인딩 + 입력 검증

| 항목 | 상태 |
|------|------|
| Prisma ORM 사용 (자동 파라미터 바인딩) | ✅ |
| `inputValidator.ts` 존재 | ✅ |

**현재 상태**: PASS  
**비고**: Prisma의 파라미터 바인딩으로 SQL Injection 기본 방어. `$queryRaw` 사용 시 수동 검증 필요.

---

### A04: Insecure Design — Rate Limiter

| 항목 | 상태 |
|------|------|
| `rateLimiter.ts` 존재 | ✅ |

**현재 상태**: PASS  
**권장 조치**:
- 로그인 엔드포인트: 5회/분 이하
- 일반 API: 100회/분
- IP 기반 + 계정 기반 이중 제한 검토

---

### A05: Security Misconfiguration — CORS + Helmet

| 항목 | 상태 |
|------|------|
| CORS 설정 | ⚠️ 확인 필요 |
| Helmet 헤더 보호 | ⚠️ 확인 필요 |

**현재 상태**: WARN  
**권장 조치**:
- CORS `origin`을 와일드카드(`*`) 대신 허용 도메인 명시
- `helmet()` 미들웨어로 기본 보안 헤더 적용
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Strict-Transport-Security` (HTTPS 배포 시)

---

### A06: Vulnerable Components — npm audit

| 항목 | 상태 |
|------|------|
| npm audit 실행 | ✅ 실행 가능 |
| Critical/High 취약점 | 정기 점검 필요 |

**현재 상태**: PASS (마지막 감사 기준)  
**권장 조치**:
- CI/CD에 `npm audit --audit-level=high` 게이트 추가
- `npm audit fix` 정기 실행 (주 1회)
- Dependabot 또는 Snyk 연동 권장

---

### A07: Identification & Auth Failures — JWT 만료 + 로그인 실패 처리

| 항목 | 상태 |
|------|------|
| `jwtManager.ts` 존재 | ✅ |
| JWT 만료(expiresIn) 설정 | ✅ |
| 로그인 실패 처리 | ✅ |

**현재 상태**: PASS  
**권장 조치**:
- Access Token TTL: 15~30분
- Refresh Token TTL: 7~14일
- 계정 잠금: 연속 실패 5회 시 30분 잠금

---

### A08: Software & Data Integrity — Prisma Schema 무결성

| 항목 | 상태 |
|------|------|
| `schema.prisma` 존재 | ✅ |
| generator + datasource 블록 | ✅ |

**현재 상태**: PASS  
**권장 조치**:
- `prisma validate` CI 게이트에 포함
- 마이그레이션 히스토리 무결성 검증 (`prisma migrate status`)

---

### A09: Security Logging & Monitoring — 구조적 로거

| 항목 | 상태 |
|------|------|
| `structuredLogger.ts` 존재 | ✅ |
| `logMiddleware.ts` 존재 | ✅ |

**현재 상태**: PASS  
**권장 조치**:
- 보안 이벤트 별도 로그 채널 (로그인 실패, 권한 거부, 비정상 요청)
- 로그 수집 → Grafana/Loki 또는 ELK 연동
- 알림 규칙: Critical 이벤트 시 Slack/Discord 알림

---

### A10: SSRF — 외부 URL 화이트리스트

| 항목 | 상태 |
|------|------|
| 외부 URL 화이트리스트 패턴 | ❌ 미발견 |

**현재 상태**: FAIL  
**권장 조치**:
- 외부 HTTP 요청 시 허용 도메인 화이트리스트 적용
- 내부 IP 대역(10.x, 172.16.x, 192.168.x, 127.x) 차단
- URL 파싱 후 호스트 검증 로직 `inputValidator.ts`에 추가

```typescript
// 예시: URL 화이트리스트
const ALLOWED_DOMAINS = ['api.example.com', 'cdn.example.com'];
function isAllowedUrl(url: string): boolean {
  const parsed = new URL(url);
  return ALLOWED_DOMAINS.includes(parsed.hostname);
}
```

---

## 전체 권장 조치 우선순위

| 우선순위 | 항목 | 조치 |
|----------|------|------|
| 🔴 High | A10 SSRF | 외부 URL 화이트리스트 구현 |
| 🟡 Medium | A02 JWT Secret | 프로덕션 시크릿 강도 확인 |
| 🟡 Medium | A05 CORS/Helmet | 헤더 보안 설정 강화 |
| 🟢 Low | A06 npm audit | CI 자동화 연동 |
| 🟢 Low | A09 Logging | 보안 이벤트 알림 연동 |

---

## 다음 단계

1. `A10` 화이트리스트 구현 → `inputValidator.ts` 확장
2. `A05` Helmet 미들웨어 확인/추가 → `server.ts`
3. CI/CD 파이프라인에 `owasp_checklist.ts` 자동 실행 연동
4. 분기별 보안 감사 리포트 갱신
