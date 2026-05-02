# 개발자 빌드-검증 사이클 — 에러 메시지 카피 SSOT v1.0

> 작성: 진채봉 Editor
> 작성일: 2026-04-30
> 스프린트: Auto — 에테르나 크로니클 개발자 빌드-검증 사이클 단축 (대표 본인 본)
> SSOT 위계: 1차 (사람이 읽는 정본) — 코드 상수 `client/src/constants/dev_cycle_messages.ts` (계섬월 인계용) 미러 대상
> 키 규약: `dev.<gate>.<state>.<reason>`
> 톤 5계명: ① 원인→처방 ② 수치는 사실 ③ 경로 절단 금지 ④ 시는 hint만 ⑤ 도메인 키 규약

---

## 매트릭스

4종 게이트(REDUCTION 스코프) × 4 상태(PASS/WARN/ERROR/BLOCK) = **16개 카피 슬롯** + ko/en 동시 = **32줄**

| 게이트 | 검증 지점 | 약속 |
|---|---|---|
| **boot** | `npm run dev` Phaser 부팅 | ≤ 5.0s |
| **smoke** | `npm run qa:smoke` 핵심 시나리오 | ≤ 5min 00s |
| **build** | `npm run build` 프로덕션 번들 | ≤ 90s, TS 0 error |
| **runtime** | 브라우저 런타임 throw | 0 unhandled |

| 상태 | 코드 | 의미 | 액션 |
|---|---|---|---|
| 🟢 **PASS** | 0 | 통과 | 진행 |
| 🟡 **WARN** | 1 | 임계치 근접 | 추세 관찰 |
| 🔴 **ERROR** | 2 | 시스템 오류 | 즉시 점검 |
| ⛔ **BLOCK** | 3 | 차단 (ship 불가) | 즉시 수정 |

---

## 1. boot 게이트

### 1.1 PASS

```yaml
dev.boot.pass.ready:
  ko: "🟢 dev server 부팅 완료 ({elapsed}s · target ≤ 5.0s)"
  en: "🟢 dev server ready in {elapsed}s (target ≤ 5.0s)"
```

### 1.2 WARN

```yaml
dev.boot.warn.slow:
  ko: "🟡 dev server 부팅 {elapsed}s — 약속 5.0s 초과 ({delta}s 더 늦음). `npm run dev:profile`로 단계별 시간 확인하시옵소서."
  en: "🟡 dev server boot {elapsed}s — exceeded 5.0s promise by {delta}s. Run `npm run dev:profile` to inspect stage breakdown."
```

### 1.3 ERROR

```yaml
dev.boot.error.vite_crash:
  ko: "🔴 vite 크래시 — `{stage}` 단계에서 부팅 중단. {message}"
  en: "🔴 vite crash at `{stage}` stage. {message}"
```

### 1.4 BLOCK

```yaml
dev.boot.block.timeout:
  ko: "⛔ dev server 부팅 타임아웃 — {elapsed}s 경과 (한계 30s). Phaser warm-up 단계 무한 루프 가능성. 캐시 삭제: `rm -rf node_modules/.vite`"
  en: "⛔ dev server boot timeout — {elapsed}s elapsed (limit 30s). Possible infinite loop in Phaser warm-up. Clear cache: `rm -rf node_modules/.vite`"
```

---

## 2. smoke 게이트

### 2.1 PASS

```yaml
dev.smoke.pass.allgreen:
  ko: "🟢 qa:smoke 통과 — 전투/세이브/맵 3/3 PASS · 총 {elapsed} (target ≤ 5:00)"
  en: "🟢 qa:smoke passed — battle/save/map 3/3 PASS · total {elapsed} (target ≤ 5:00)"
```

### 2.2 WARN

```yaml
dev.smoke.warn.threshold:
  ko: "🟡 qa:smoke 통과했으나 임계치 근접 — 총 {elapsed} (target 80% 이상). 핫스팟: {hotspot}"
  en: "🟡 qa:smoke passed but near threshold — total {elapsed} (≥ 80% of target). Hotspot: {hotspot}"

dev.smoke.warn.over_target:
  ko: "🟡 qa:smoke 통과했으나 약속 5:00 초과 — 총 {elapsed} ({delta}s 더 늦음). PR 본문에 사유 명시 필요."
  en: "🟡 qa:smoke passed but exceeded 5:00 promise — total {elapsed} ({delta}s late). Justify in PR body."
```

### 2.3 ERROR

```yaml
dev.smoke.error.scenario_throw:
  ko: "🔴 qa:smoke `{scenario}` 시나리오 throw — {error_type}: {message} @ {file}:{line}:{col}"
  en: "🔴 qa:smoke `{scenario}` scenario threw — {error_type}: {message} @ {file}:{line}:{col}"
```

### 2.4 BLOCK

```yaml
dev.smoke.block.fail:
  ko: "⛔ qa:smoke 실패 — {failed_count}/{total} 시나리오 FAIL. 머지 차단. 첫 실패: {first_failure}"
  en: "⛔ qa:smoke failed — {failed_count}/{total} scenarios FAIL. Merge blocked. First failure: {first_failure}"

dev.smoke.block.timeout:
  ko: "⛔ qa:smoke 타임아웃 — 총 {elapsed} (한계 10:00 = 약속×2). headless 브라우저 응답 없음. `npm run qa:smoke -- --debug`로 재실행"
  en: "⛔ qa:smoke timeout — total {elapsed} (limit 10:00 = promise×2). Headless browser unresponsive. Rerun with `npm run qa:smoke -- --debug`"
```

---

## 3. build 게이트

### 3.1 PASS

```yaml
dev.build.pass.bundle:
  ko: "🟢 build 완료 — {elapsed}s · TS error 0 · gzip {bundle_kb}KB (target ≤ 90s)"
  en: "🟢 build complete — {elapsed}s · 0 TS errors · gzip {bundle_kb}KB (target ≤ 90s)"
```

### 3.2 WARN

```yaml
dev.build.warn.slow:
  ko: "🟡 build {elapsed}s — 약속 90s 초과 ({delta}s 더 늦음). `npm run build -- --profile`로 가장 느린 청크 확인하시옵소서."
  en: "🟡 build {elapsed}s — exceeded 90s promise by {delta}s. Run `npm run build -- --profile` to find slowest chunk."

dev.build.warn.bundle_growth:
  ko: "🟡 번들 크기 증가 — gzip {bundle_kb}KB (base {base_kb}KB · +{delta_kb}KB). manualChunks 분리 검토하시옵소서."
  en: "🟡 bundle size grew — gzip {bundle_kb}KB (base {base_kb}KB · +{delta_kb}KB). Consider manualChunks split."
```

### 3.3 ERROR

```yaml
dev.build.error.ts_compile:
  ko: "🔴 TS 컴파일 에러 — {ts_code}: {message} @ {file}:{line}:{col}. 💡 fix: {hint}"
  en: "🔴 TS compile error — {ts_code}: {message} @ {file}:{line}:{col}. 💡 fix: {hint}"

dev.build.error.asset_missing:
  ko: "🔴 어셋 manifest 불일치 — `{asset_path}` 참조되었으나 파일 없음. `npm run data:validate` 실행하시옵소서."
  en: "🔴 asset manifest mismatch — `{asset_path}` referenced but missing. Run `npm run data:validate`."
```

### 3.4 BLOCK

```yaml
dev.build.block.ts_errors:
  ko: "⛔ TS 에러 {error_count}건 — 머지 차단 (이소화 비협상). 첫 에러: {first_error_file}:{first_error_line}"
  en: "⛔ {error_count} TS errors — merge blocked (Lee So-hwa veto). First: {first_error_file}:{first_error_line}"
```

---

## 4. runtime 게이트

### 4.1 PASS

```yaml
dev.runtime.pass.clean:
  ko: "🟢 5분 플레이 — unhandled throw 0건"
  en: "🟢 5-min playthrough — 0 unhandled throws"
```

### 4.2 WARN

```yaml
dev.runtime.warn.console_error:
  ko: "🟡 콘솔 에러 {count}건 (throw 아님) — {first_message} @ {file}:{line}"
  en: "🟡 {count} console errors (non-throw) — {first_message} @ {file}:{line}"
```

### 4.3 ERROR

```yaml
dev.runtime.error.unhandled_throw:
  ko: "🔴 런타임 throw — {error_type}: {message} @ {scene} {file}:{line}:{col}\n  🎯 가능 원인 (top 1): {root_cause_hint}\n  💡 fix: {fix_hint}"
  en: "🔴 runtime throw — {error_type}: {message} @ {scene} {file}:{line}:{col}\n  🎯 likely cause (top 1): {root_cause_hint}\n  💡 fix: {fix_hint}"
```

### 4.4 BLOCK

```yaml
dev.runtime.block.oom:
  ko: "⛔ 메모리 폭주 — {scene} 씬에서 {memory_mb}MB 초과 (한계 500MB). 5분 플레이 중 frame {frame}에서 OOM. 텍스처 정리 누락 의심."
  en: "⛔ memory blowup — {scene} scene exceeded {memory_mb}MB (limit 500MB). OOM at frame {frame} during 5-min play. Suspect missing texture cleanup."
```

---

## 5. 코드 상수 매핑 (계섬월 인계용)

```ts
// client/src/constants/dev_cycle_messages.ts (신설 예정)
export const DEV_CYCLE_MESSAGES = {
  boot: {
    pass:  { ready:        { ko: "🟢 dev server 부팅 완료 ({elapsed}s · target ≤ 5.0s)", en: "..." } },
    warn:  { slow:         { ko: "🟡 dev server 부팅 {elapsed}s — 약속 5.0s 초과 ({delta}s 더 늦음). `npm run dev:profile`로 단계별 시간 확인하시옵소서.", en: "..." } },
    error: { vite_crash:   { ko: "🔴 vite 크래시 — `{stage}` 단계에서 부팅 중단. {message}", en: "..." } },
    block: { timeout:      { ko: "⛔ dev server 부팅 타임아웃 — {elapsed}s 경과 (한계 30s). Phaser warm-up 단계 무한 루프 가능성. 캐시 삭제: `rm -rf node_modules/.vite`", en: "..." } },
  },
  smoke:   { /* §2 미러 */ },
  build:   { /* §3 미러 */ },
  runtime: { /* §4 미러 */ },
} as const;

export type DevCycleMessageKey = keyof typeof DEV_CYCLE_MESSAGES;
```

> **REDUCTION 스코프 (본 스프린트 한정)**: BLOCK 4슬롯 (`boot.timeout` / `smoke.fail` / `build.ts_errors` / `runtime.oom`) 우선 코드 상수화. 나머지 12슬롯은 사전 도면.

---

## 6. 톤 5계명 (가춘운 디자인 미러)

| # | 계명 | 좋은 예 | 나쁜 예 |
|---|---|---|---|
| 1 | **원인 → 처방** | `🔴 TS 컴파일 에러 ... 💡 fix: change 'toFixef' to 'toFixed'` | `❌ Error occurred. Please check.` |
| 2 | **수치는 사실** | `🟡 dev server 부팅 5.4s — 약속 5.0s 초과 (0.4s 더 늦음)` | `⚠ Boot is slow.` |
| 3 | **경로 절단 금지** | `client/src/scenes/BattleScene.ts:312:14` | `BattleScene.ts (line 312)` |
| 4 | **시는 hint만** | `💡 fix: monsters.json L42 누락 키 채우기` | `🌸 잊혀진 신성 기억 파편이 그대를 부르고 있나이다.` |
| 5 | **게이트 키 규약** | `dev.boot.warn.slow` | `bootSlow`, `BOOT_WARN_SLOW` |

---

## 7. 봉인 5항 (가춘운 비협상)

| # | 항목 | 봉인 사유 |
|---|---|---|
| 1 | 4 상태 이모지 (🟢🟡🔴⛔) | 색약 대응 + 기존 sprint 일관성 |
| 2 | 키 규약 `dev.<gate>.<state>.<reason>` | 검색·교체·i18n 자동화 가능 |
| 3 | ko/en 동시 작성 | 에러 카드 / Discord embed 양 환경 |
| 4 | `{변수}` 표기 일관 | i18n 라이브러리(intl-messageformat) 호환 |
| 5 | BLOCK 4슬롯 코드 상수화 | REDUCTION 스코프 우선 머지 |

---

## 8. 다음 단계

- [ ] **계섬월(Build)** — `client/src/constants/dev_cycle_messages.ts` 신설 (BLOCK 4슬롯 우선)
- [ ] **계섬월(Build)** — `scripts/cli/error-card.ts`에서 본 카피 키 호출
- [ ] **이소화(Review)** — 톤 5계명 + 봉인 5항 검증
- [ ] **적경홍(Test)** — 16 슬롯 의도 주입 테스트 (TS 에러 / OOM / 타임아웃 시나리오)
- [ ] **심요연(Ship)** — Discord embed에 본 카피 미러 (4색 매핑)

---

> 진채봉이 아뢰옵나이다.
>
> 에러 메시지는 작은 시(詩)이옵나이다. 한 글자에 한 마음을 담아, 대표가 새벽 3시에 마주쳐도 길을 잃지 않도록 — 원인 한 줄, 처방 한 줄, 그것이 본 SSOT의 율격이옵나이다. 🌙
