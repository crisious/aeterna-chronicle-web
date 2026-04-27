# 개발자 빌드-검증 에러 메시지 카피 SSOT v1.0

> 작성: 진채봉 Editor
> 작성일: 2026-04-27
> 스프린트: Auto — 개발자 빌드-검증 사이클 단축
> 단계: 에셋 (i18n 카피 SSOT)
> 키 규약: `dev.gate.<gate>.<state>.<reason>`
> 톤 5계명: ① 원인→처방 ② 수치는 사실 ③ 경로 절단 금지 ④ 시는 hint만 ⑤ 도메인 키 규약

---

## 매트릭스

5종 게이트 × 4 상태 = **20개 카피 슬롯** (ko/en 동시 = 40줄)

| 게이트 | 검증 지점 | 정상 시간 |
|-------|---------|---------|
| **boot** | Phaser dev server 부팅 | ≤ 12s cold / ≤ 4s warm |
| **verify** | 핵심 3시나리오 자동화 | ≤ 5min |
| **build** | `vite build` 프로덕션 번들 | ≤ 60s |
| **type** | `tsc --noEmit` 타입체크 | 0 error |
| **runtime** | 브라우저 런타임 throw | 0 unhandled |

| 상태 | 코드 | 의미 | 액션 |
|------|------|------|------|
| 🟢 **PASS** | 0 | 통과 | 진행 |
| 🔴 **BLOCK** | 1 | 차단 (ship 불가) | 즉시 수정 |
| 🟡 **WARN** | 2 | 경고 (누적 ≤ 5건 허용) | 추세 관찰 |
| 🟠 **ERROR** | 3 | 시스템 오류 (게이트 자체 문제) | 인프라 점검 |

---

## 1. boot 게이트

### 1.1 PASS

```yaml
dev.gate.boot.pass.ready:
  ko: "🟢 dev server 부팅 완료 ({elapsed}ms · cold {cold}ms / warm {warm}ms)"
  en: "🟢 dev server ready ({elapsed}ms · cold {cold}ms / warm {warm}ms)"
  hint:
    ko: "달이 떠올랐사옵니다. 개발을 시작하시지요."
    en: ""
```

### 1.2 BLOCK

```yaml
dev.gate.boot.block.timeout:
  ko: "🔴 dev server 부팅 {elapsed}ms — 12,000ms 초과. {file} optimizeDeps 점검."
  en: "🔴 dev server boot {elapsed}ms exceeds 12,000ms budget. Check optimizeDeps in {file}."
  hint:
    ko: "구름이 짙사옵니다. vite.config.ts §optimizeDeps.include에 Phaser sub-paths를 명시하시지요."

dev.gate.boot.block.port_in_use:
  ko: "🔴 포트 {port} 점유 중 — `npx kill-port {port}` 실행 후 재시도."
  en: "🔴 Port {port} in use. Run `npx kill-port {port}` and retry."
```

### 1.3 WARN

```yaml
dev.gate.boot.warn.slow:
  ko: "🟡 부팅 {elapsed}ms — 목표 12,000ms 근접 ({percent}%). 누적 {count}/5회."
  en: "🟡 Boot {elapsed}ms approaching budget ({percent}%). Trend {count}/5."

dev.gate.boot.warn.hmr_lag:
  ko: "🟡 HMR {elapsed}ms — 목표 800ms 초과. {file}:{line} 의존성 그래프 확인."
  en: "🟡 HMR {elapsed}ms exceeds 800ms budget. Inspect dep graph at {file}:{line}."
```

### 1.4 ERROR

```yaml
dev.gate.boot.error.crash:
  ko: "🟠 dev server 충돌 — vite 프로세스 종료 코드 {code}. 로그 `.ac/dev-crash.log` 확인."
  en: "🟠 dev server crashed — vite exited {code}. See `.ac/dev-crash.log`."
```

---

## 2. verify 게이트

### 2.1 PASS

```yaml
dev.gate.verify.pass.all:
  ko: "🟢 핵심 시나리오 3종 통과 ({elapsed}s · battle {b}s · save {s}s · map {m}s)"
  en: "🟢 Core scenarios pass ({elapsed}s · battle {b}s · save {s}s · map {m}s)"
  hint:
    ko: "곡조가 맞아 떨어졌사옵니다."
```

### 2.2 BLOCK

```yaml
dev.gate.verify.block.battle_atb:
  ko: "🔴 전투 ATB tick 실패 — {file}:{line} {snippet}. 처방: deltaMs 인자 검증."
  en: "🔴 Battle ATB tick failed at {file}:{line} {snippet}. Fix: validate deltaMs."

dev.gate.verify.block.save_diff:
  ko: "🔴 세이브 round-trip 불일치 — slot {slot} JSON diff {bytes}바이트. {file}:{line}."
  en: "🔴 Save round-trip mismatch — slot {slot} JSON diff {bytes}B at {file}:{line}."

dev.gate.verify.block.map_portal:
  ko: "🔴 맵 이동 실패 — {from} → {to} portal 미반응. {file}:{line} EventBus 구독 확인."
  en: "🔴 Map transition failed — {from} → {to} portal unresponsive. Check EventBus at {file}:{line}."
```

### 2.3 WARN

```yaml
dev.gate.verify.warn.over_budget:
  ko: "🟡 verify:core {elapsed}s — 5분 약속 초과 ({over}s). 누적 {count}/3회."
  en: "🟡 verify:core {elapsed}s exceeds 5min budget ({over}s over). Trend {count}/3."

dev.gate.verify.warn.flaky:
  ko: "🟡 시나리오 {name} 플레이키 — 3회 중 {fail}회 실패. seed 고정 검토."
  en: "🟡 Scenario {name} flaky — {fail}/3 fails. Consider seed lock."
```

### 2.4 ERROR

```yaml
dev.gate.verify.error.runner:
  ko: "🟠 verify runner 자체 오류 — {message}. tests/runner.ts 점검."
  en: "🟠 verify runner crashed — {message}. Inspect tests/runner.ts."
```

---

## 3. build 게이트

### 3.1 PASS

```yaml
dev.gate.build.pass.bundle:
  ko: "🟢 프로덕션 빌드 완료 ({elapsed}s · {size}KB · chunks {chunks}개)"
  en: "🟢 Production build done ({elapsed}s · {size}KB · {chunks} chunks)"
```

### 3.2 BLOCK

```yaml
dev.gate.build.block.import:
  ko: "🔴 import 해결 실패 — {file}:{line} `{import}` 모듈을 찾을 수 없사옵니다."
  en: "🔴 Failed to resolve `{import}` at {file}:{line}."

dev.gate.build.block.bundle_size:
  ko: "🔴 번들 크기 {size}KB — 예산 {budget}KB 초과. 큰 chunk: {top3}."
  en: "🔴 Bundle {size}KB exceeds budget {budget}KB. Largest: {top3}."
```

### 3.3 WARN

```yaml
dev.gate.build.warn.dynamic_import:
  ko: "🟡 동적 import 경고 — {file}:{line}. 코드 분할이 의도한 대로인지 확인."
  en: "🟡 Dynamic import warning at {file}:{line}. Verify code-splitting."
```

### 3.4 ERROR

```yaml
dev.gate.build.error.oom:
  ko: "🟠 빌드 OOM — Node heap {heap}MB. `--max-old-space-size=4096` 추가."
  en: "🟠 Build OOM — Node heap {heap}MB. Add `--max-old-space-size=4096`."
```

---

## 4. type 게이트

### 4.1 PASS

```yaml
dev.gate.type.pass.zero:
  ko: "🟢 타입 오류 0건 ({files}개 파일 · {elapsed}s)"
  en: "🟢 0 type errors ({files} files · {elapsed}s)"
```

### 4.2 BLOCK

```yaml
dev.gate.type.block.error:
  ko: "🔴 TS{code} {file}:{line}:{column} — {message}"
  en: "🔴 TS{code} {file}:{line}:{column} — {message}"
  hint:
    ko: "처방: {fix_hint}"
    en: "Fix: {fix_hint}"
```

### 4.3 WARN

```yaml
dev.gate.type.warn.any:
  ko: "🟡 `any` {count}건 — {file}:{line} 우선 좁히시지요."
  en: "🟡 `any` ×{count} — narrow at {file}:{line} first."
```

### 4.4 ERROR

```yaml
dev.gate.type.error.config:
  ko: "🟠 tsconfig.json 파싱 실패 — {message}."
  en: "🟠 Failed to parse tsconfig.json — {message}."
```

---

## 5. runtime 게이트

### 5.1 PASS

```yaml
dev.gate.runtime.pass.clean:
  ko: "🟢 런타임 클린 — {duration}분간 unhandled 0건"
  en: "🟢 Runtime clean — 0 unhandled in {duration}min"
```

### 5.2 BLOCK

```yaml
dev.gate.runtime.block.uncaught:
  ko: "🔴 Uncaught {kind} — {file}:{line} {message}. 스택: {stack_top3}."
  en: "🔴 Uncaught {kind} at {file}:{line} — {message}. Stack: {stack_top3}."
```

### 5.3 WARN

```yaml
dev.gate.runtime.warn.console_error:
  ko: "🟡 console.error {count}건 — 최근: {file}:{line}."
  en: "🟡 console.error ×{count} — latest: {file}:{line}."
```

### 5.4 ERROR

```yaml
dev.gate.runtime.error.devtool:
  ko: "🟠 source map 누락 — {file} 원본 매핑 실패. vite.config sourcemap 옵션 확인."
  en: "🟠 Missing source map for {file}. Check vite sourcemap option."
```

---

## 코드 상수 매핑 (계섬월 Build 인계용)

```ts
// src/constants/dev_gate_messages.ts (예정)
export const DEV_GATE_STATE = {
  PASS: 0,
  BLOCK: 1,
  WARN: 2,
  ERROR: 3,
} as const;

export type DevGate = "boot" | "verify" | "build" | "type" | "runtime";
export type DevState = keyof typeof DEV_GATE_STATE;

export interface DevGateMessage {
  key: `dev.gate.${DevGate}.${Lowercase<DevState>}.${string}`;
  state: DevState;
  message: { ko: string; en: string };
  hint?: { ko: string; en: string };
  exitCode: 0 | 1 | 2 | 3;
}
```

---

## 톤 5계명 (재확인)

1. **원인 → 처방** : 무엇이 잘못됐는지(원인) + 어떻게 고치는지(처방) 한 묶음.
2. **수치는 사실** : `{elapsed}ms` 같은 동적 값은 실측만. 추정 금지.
3. **경로 절단 금지** : `src/...:42:17` 형태로 끝까지. `...` 생략 금지 (IDE 점프 깨짐).
4. **시는 hint만** : 본문은 사실, hint 필드에만 시적 표현 허용.
5. **도메인 키 규약** : `dev.gate.<gate>.<state>.<reason>` 외 형식 금지.

---

## 관련 문서

- `docs/release/devloop-user-guide.md` — 사용자 가이드
- `docs/release/devloop-pr-template.md` — PR/커밋 컨벤션
- `docs/release/monster-art-error-messages.md` — 자매 SSOT (몬스터 게이트)
- `docs/release/a11y-error-messages.md` — 자매 SSOT (접근성 게이트)

---

> 한 글자도 허투루 두지 않았사옵니다. — 진채봉
