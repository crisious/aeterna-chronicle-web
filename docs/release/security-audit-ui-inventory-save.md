# 보안 감사 보고서 — UI · 인벤토리 · 세이브 시스템

> 작성: 이소화 (Security Analyst)
> 단계: QA (테스트)
> 스프린트: Auto · UI·인벤토리·세이브 E2E·통합 테스트 작성
> 토픽: 회귀 버그 선제 차단으로 CBT 안정성 확보
> 작성일: 2026-04-26

---

기(氣)의 흐름을 짚어 본 결과, 세이브 라우트에 **사기(邪氣)** 가 깃들었사옵니다.
즉시 봉인이 필요한 항목과 회귀 가드로 묶어 놓은 항목을 분리하여 보고드립니다.

## 1. 종합 위험도

| 영역 | 위험 | 비고 |
|------|------|------|
| npm audit | **상** | critical 1 (protobufjs RCE) · high 1 (fastify 5.7.2 미만) · moderate 3 |
| saveRoutes 인증 | **상** | JWT 가드 부재 → IDOR / 무단 덮어쓰기 가능 |
| save slot 검증 | **중** | `Number('abc') = NaN` 이 범위 검증 우회 (회귀 가드 작성됨) |
| XSS (응답) | 하 | 현재 라우트는 사용자 입력을 echo 하지 않음 — 클라 렌더 정책 의존 |
| SQL Injection | 하 | Prisma 파라미터 바인딩이 1차 방어 → 안전 |
| Prototype Pollution | 하 | Fastify JSON 파서가 `__proto__` 자동 차단 |
| DoS 페이로드 | 하 | 10,000 길이 inventory 도 5xx 없이 처리 |

---

## 2. 즉시 봉인 (P0)

### 2.1 [상] saveRoutes 인증 가드 부재

`server/src/routes/saveRoutes.ts` 의 모든 엔드포인트가 `body.userId` / `params.userId`
만 신뢰하고 JWT 검증을 하지 않습니다.

```ts
// 현재 (saveRoutes.ts:62~78)
fastify.post('/api/save/:slot', async (request, reply) => {
  const { userId, data, label } = request.body; // ← body 만 신뢰
  // ...
});
```

**공격 시나리오**: 공격자가 임의의 `userId` 를 보내 다른 유저의 슬롯을 덮어쓸 수 있습니다.

**처방**:
```ts
import { extractUserIdFromRequest } from '../security/jwtManager';

fastify.post('/api/save/:slot', async (request, reply) => {
  const userId = await extractUserIdFromRequest(request);
  if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });
  // body.userId 무시, JWT 의 userId 만 사용
});
```

`inventoryRoutes.ts` 는 이미 같은 패턴으로 가드하고 있으므로 동일 적용 가능.

### 2.2 [상] npm audit — critical / high

```
protobufjs <7.5.5             critical  Arbitrary code execution
fastify    <5.7.2             high      Content-Type 헤더 탭으로 body 검증 우회
axios      <1.15.0             moderate  SSRF / 클라우드 메타데이터 유출
```

**처방**: `npm audit fix` 로 protobufjs · fastify 패치는 비파괴적으로 적용 가능.
`uuid <14` 만 breaking change 이므로 별도 PR.

---

## 3. 회귀 가드 (P1)

### 3.1 [중] save slot NaN 우회

`Number('abc') === NaN` 이며 `NaN < 1` 도 `NaN > 3` 도 false. 따라서
`if (slot < 1 || slot > 3)` 검증이 비정수 슬롯을 통과시킵니다.

**처방**:
```ts
const slot = Number(request.params.slot);
if (!Number.isInteger(slot) || slot < 1 || slot > 3) {
  return reply.status(400).send({ error: '유효하지 않은 슬롯' });
}
```

**회귀 가드 위치**: `tests/integration/security-ui-inventory-save.test.ts`
의 `[회귀] 슬롯 파라미터가 비정수 (NaN) 일 때 현재 동작을 SSOT 로 고정` 테스트.
수정 후 `expect(res.statusCode).toBe(400)` 로 강화 필요.

### 3.2 [중] save label 길이 / 문자 검증 부재

label 파라미터가 임의 길이 · 임의 문자열을 허용. 클라이언트가 `innerHTML` 로 렌더하면
저장형 XSS 가능. 현재 응답 echo 가 없어 즉시 위협은 낮음.

**처방**: 라우트에서 Zod 스키마로 `label.length <= 50` + 문자 화이트리스트 적용,
클라이언트는 모든 사용자 라벨을 `textContent` 로 렌더 (이미 i18n 키 시스템 사용 중).

---

## 4. 작성된 테스트 (이번 스프린트 산출물)

`tests/integration/security-ui-inventory-save.test.ts` — **22 tests passing**

| 영역 | 케이스 수 | 핵심 |
|------|----------|------|
| XSS | 6 | 5종 페이로드 + 인벤토리 응답 raw HTML 부재 검증 |
| SQL Injection | 6 | 5종 페이로드 + 슬롯 범위 검증 |
| CSRF / 인증 | 3 | inventory 401 가드 + saveRoutes TODO 가드 |
| IDOR | 2 | 빈/null userId 거부 |
| Payload | 4 | prototype pollution 3종 + DoS 10K 인벤토리 |
| 회귀 | 1 | NaN 슬롯 우회 SSOT 고정 |

실행:
```bash
npx vitest run tests/integration/security-ui-inventory-save.test.ts \
  --config tests/vitest.config.ts
```

---

## 5. 다음 단계 권고

1. **Ship 단계 P0 게이트**: saveRoutes JWT 가드 패치 + `npm audit fix` 적용
2. 본 보안 테스트를 CI 의 `test:integration` 매트릭스에 포함 (현재 `tests/integration/**` 글롭에 자동 포함됨)
3. 다음 스프린트에 **CSRF 토큰 + Origin 헤더 검증** 미들웨어 도입 검토
   (현재 JWT 만으로는 `withCredentials` 쿠키 시나리오에서 부족)
4. SaveData JSON 스키마 Zod 검증 — DB 저장 전 구조 검증으로 손상된 세이브 차단

---

> 도(道) 는 보이지 않는 곳에서 흘러야 합니다.
> 인증 가드가 한 줄 빠진 라우트는 결계가 끊어진 진(陣) 과 같사옵니다.
