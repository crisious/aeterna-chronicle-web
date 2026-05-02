# 개발자 빌드-검증 사이클 가이드 v1.0 — 에테르나 크로니클

> 작성: 진채봉 Editor
> 작성일: 2026-04-27
> 스프린트: Auto — 개발자 빌드-검증 사이클 단축
> 단계: 에셋 (텍스트 에셋 SSOT)
> 본 문서가 1차 SSOT — `README.md §개발 효율` · 인게임 [도움말 → 개발자 도구]에서 메아리됨

---

## 목차

1. [한 손 흐름도](#1-한-손-흐름도)
2. [부팅 — Phaser dev server](#2-부팅--phaser-dev-server)
3. [검증 — 핵심 시나리오 자동화](#3-검증--핵심-시나리오-자동화)
4. [에러 — 원인 파일 즉시 식별](#4-에러--원인-파일-즉시-식별)
5. [지표 약속](#5-지표-약속)
6. [npm 명령어 표](#6-npm-명령어-표)
7. [FAQ 7건](#7-faq-7건)
8. [로드맵 진척 매트릭스](#8-로드맵-진척-매트릭스)
9. [관련 문서](#9-관련-문서)

---

## 1. 한 손 흐름도

```
[코드 변경]
    │
    ▼
[① 부팅]   npm run dev:fast      ── ≤ 8s (목표)
    │      └─ vite cold start 측정 + warm cache
    ▼
[② 검증]   npm run verify:core   ── ≤ 5min (지표)
    │      ├─ 전투 시나리오 (ATB tick)
    │      ├─ 세이브 시나리오 (slot 1·2·3 round-trip)
    │      └─ 맵 이동 시나리오 (Ch.1~4 portal)
    ▼
[③ 에러]   .ac/error-report.json ── 원인 파일/라인 즉시 노출
    │      └─ stack → source map → 코드 스니펫 3줄
    ▼
[OK?]
  YES → 커밋 (devloop 컨벤션, `docs/release/devloop-pr-template.md`)
  NO  → 에러 카피 SSOT 참조 (`docs/release/devloop-error-messages.md`)
```

**5분 약속**: 코드 한 줄 고치고 `npm run verify:core` → 5분 안에 🟢/🔴 판정.

---

## 2. 부팅 — Phaser dev server

### 2.1 측정

| 시나리오 | 명령 | 목표 |
|---------|------|------|
| Cold (첫 부팅) | `npm run dev:measure -- --cold` | ≤ 12s |
| Warm (캐시 적중) | `npm run dev:measure -- --warm` | ≤ 4s |
| HMR (단일 파일) | `npm run dev:measure -- --hmr` | ≤ 800ms |

측정 결과는 `.ac/dev-perf.json`에 누적 — 5회 평균이 SSOT.

### 2.2 단축 레버 (체크리스트)

- [ ] `vite.config.ts` `optimizeDeps.include` 에 Phaser sub-paths 명시
- [ ] `assets/raw/` glob 제외 (`server.fs.deny`)
- [ ] `tsconfig.json` `incremental: true` + `.tsbuildinfo` gitignore
- [ ] `vite-plugin-checker` 비동기 모드 (`overlay: false`로 부팅 차단 해제)
- [ ] 절대경로 alias 안정화 (`@/` 단일 진입점)

### 2.3 확인 포인트

- 부팅 후 `http://localhost:5173`에서 메인 메뉴 1프레임 안에 등장
- 콘솔 `[vite] ready in <ms>` 값 확인
- 12s 초과 시 **🟡 WARN** — 누적 5회 초과 시 **🔴 BLOCK** (ship-gate hook)

---

## 3. 검증 — 핵심 시나리오 자동화

### 3.1 3개 시나리오 SSOT

| # | 이름 | 검증 지점 | 예상 시간 |
|---|------|---------|---------|
| 1 | **전투(ATB)** | 1턴 tick · 스킬 1회 · HP 동기화 · 승리 시 EXP 적립 | ≤ 90s |
| 2 | **세이브** | slot 1 저장 → slot 2 저장 → slot 1 복원 → JSON 동치 | ≤ 60s |
| 3 | **맵 이동** | Ch.1 → Ch.2 portal · BGM 전환 · NPC 위치 복원 | ≤ 120s |

합계: **≤ 4분 30초** + 에러 리포트 30초 → **5분 약속** 충족.

### 3.2 사용

```bash
# 전체 (전투 + 세이브 + 맵)
npm run verify:core

# 단일 시나리오
npm run verify:battle
npm run verify:save
npm run verify:map

# 회귀(regression) 전용 — Phase 52 baseline 비교
npm run verify:core -- --regression
```

### 3.3 결과 형식

```
✓ battle    87s  (baseline 91s · -4s)
✓ save      52s  (baseline 50s · +2s)
✓ map      118s  (baseline 122s · -4s)
─────────────────────────────────────
🟢 PASS · 4m 17s · 0 error · 0 warning
```

실패 시 **즉시** `.ac/error-report.json` 작성 → 다음 절 참조.

---

## 4. 에러 — 원인 파일 즉시 식별

### 4.1 약속

> **에러 발생 시, 5초 안에 원인 파일/라인이 콘솔에 떠야 한다.**

### 4.2 에러 리포트 구조

```json
{
  "timestamp": "2026-04-27T12:34:56+09:00",
  "scenario": "battle",
  "stage": "atb_tick",
  "file": "src/systems/atb/Tick.ts",
  "line": 142,
  "column": 17,
  "snippet": [
    "  140 |   const next = queue.peek();",
    "  141 |   if (!next) return;",
    "> 142 |   next.act(deltaMs);  // ← TypeError: deltaMs is undefined",
    "  143 |   queue.advance();",
    "  144 | }"
  ],
  "hint": "deltaMs 인자 누락 — `Tick.run(deltaMs)` 호출처 확인",
  "related": ["src/scenes/BattleScene.ts:88"]
}
```

### 4.3 카피 SSOT

에러 메시지 본문은 `docs/release/devloop-error-messages.md` 참조. 5종 게이트(boot · verify · build · type · runtime) × 4 상태(PASS/BLOCK/WARN/ERROR) 매트릭스로 i18n ko/en 동시 정의.

### 4.4 모션 감소 / 색약 대응

콘솔 출력은 ANSI 컬러 외 **🟢🔴🟡🟠 이모지**를 병행 — `NO_COLOR=1` 환경에서도 상태 판독 가능.

---

## 5. 지표 약속

| 지표 | 목표 | 측정 |
|------|------|------|
| 코드 변경 → 검증 완료 | ≤ 5분 | `verify:core` 실측 평균 |
| 에러 발생 → 원인 파일 노출 | ≤ 5초 | error-report 작성 latency |
| dev server cold 부팅 | ≤ 12s | `dev:measure --cold` |
| HMR 반영 | ≤ 800ms | vite HMR 로그 |

지표 위반 시 본 문서 §1 흐름도에 **누적 카운터** 갱신 — 3회 연속 위반 시 백능파 HOLD 트리거.

---

## 6. npm 명령어 표

| 명령 | 용도 | 단계 |
|------|------|------|
| `npm run dev:fast` | 빠른 부팅 (warm cache 우선) | 부팅 |
| `npm run dev:measure` | 부팅 시간 측정 (`.ac/dev-perf.json`) | 부팅 |
| `npm run verify:core` | 핵심 3시나리오 자동화 | 검증 |
| `npm run verify:battle` | 전투 단일 | 검증 |
| `npm run verify:save` | 세이브 단일 | 검증 |
| `npm run verify:map` | 맵 이동 단일 | 검증 |
| `npm run error:explain` | 마지막 에러 리포트 사람말 풀이 | 에러 |

> ⚠️ 본 표는 **계섬월(Build) 인계 전 명세** — 실제 스크립트는 Build 단계에서 `package.json`에 등재.

---

## 7. FAQ 7건

**Q1. dev:fast가 12s를 넘으면?**
A. `npm run dev:measure -- --cold` 5회 측정 → 평균이 12s 초과면 §2.2 체크리스트 순회. 그래도 안 되면 두련사 Architect에게 인계.

**Q2. verify:core가 5분 넘으면 실패인가?**
A. 시간 초과는 **🟡 WARN** — PASS는 가능. 다만 누적 3회 초과 시 시나리오 재설계.

**Q3. 시나리오를 추가하려면?**
A. `tests/scenarios/<name>.scenario.ts` + `verify:core` 매니페스트 등록. 단, 4번째 시나리오 추가는 5분 약속 깨짐 — PM 승인 필수.

**Q4. 에러 리포트가 안 만들어지면?**
A. `.ac/` 디렉토리 권한 확인. Windows에서 OneDrive 동기화 충돌 가능 → `.ac/`를 OneDrive 제외 폴더에 이동.

**Q5. CI에서도 같은 명령을 쓰나?**
A. 동일. CI는 `--reporter=junit` 추가하여 GitHub Actions 결과 패널 노출.

**Q6. Phaser 핫리로드가 무거운데?**
A. `Scene.restart()` 대신 `Scene.scene.run()` 사용. 무거운 텍스처는 `BootScene`에서 `cache.txt.has()` 가드.

**Q7. 에러 카피가 시적이라 헤맨다.**
A. 시는 `hint` 필드에만 — `file:line`은 절대 시화하지 않음. §4.2 SSOT 참조.

---

## 8. 로드맵 진척 매트릭스

| 항목 | 현재 | 목표 | 상태 |
|------|------|------|------|
| dev cold 부팅 측정 도구 | ❌ | ✅ | 🔴 미착수 |
| verify:core 3시나리오 | ❌ | ✅ | 🔴 미착수 |
| 에러 리포트 SSOT | ✅ (본 문서) | ✅ | 🟢 |
| i18n 에러 카피 | ✅ (devloop-error-messages.md) | ✅ | 🟢 |
| ship-gate hook 통합 | ❌ | ✅ | 🟡 다음 스프린트 |

---

## 9. 관련 문서

- `docs/release/devloop-error-messages.md` — 에러 메시지 카피 SSOT
- `docs/release/devloop-pr-template.md` — PR/커밋 컨벤션
- `docs/release/devloop-readme-skeleton.md` — README 개발자 가이드 절 골격
- `docs/release/launch_checklist.md` — §개발 효율 항목 체크
- `CHANGELOG.md` — `[1.0.0-rc.3]` 본 스프린트 변경분

---

## v1.0 → v1.1 정합 푸터 (2026-04-30)

본 가이드는 **v1.0 (2026-04-27)** 본문을 그대로 유지하되, 다음 새 SSOT와의 정합을 명문화하옵니다:

| 새 SSOT | 본 가이드 영향 | 갱신 시점 |
|---------|--------------|-----------|
| `design-system_dev-loop.md` (가춘운, 2026-04-30) | §6 npm 명령어 표 최상단에 **`npm run loop`** 통합 명령 추가 (v1.1 본문 갱신은 Build 단계에 일괄) | Build (계섬월) |
| `devloop-changelog-draft.md` (본 진채봉, 2026-04-30) | §9 관련 문서에 CHANGELOG 항목 초안 링크 추가 | 즉시 (본 푸터로 대체) |
| `devloop-readme-skeleton.md` v1.1 (본 진채봉, 2026-04-30) | §1 한 손 흐름도가 v1.1에서 단일 명령 흐름으로 압축됨 — 본 가이드 §1은 상세 풀이 유지(폴백 명령 단계별 설명 보존) | Build (계섬월) |

**호환 약속**: v1.0의 3 명령 (`dev:fast` / `verify:core` / `error:explain`)은 v1.1에서도 **폴백 명령으로 그대로 동작** — 단일 명령 `npm run loop`는 이 셋을 오케스트레이션하는 thin wrapper일 뿐이옵니다. 기존 절차서·CI 설정 깨지지 않사옵니다.

---

> 흩어진 악보를 한데 모아 곡조를 맞추었사옵니다. — 진채봉
