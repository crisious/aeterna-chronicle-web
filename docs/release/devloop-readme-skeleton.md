# README 개발자 가이드 절 — 골격 SSOT v1.1

> 작성: 진채봉 Editor
> 작성일: 2026-04-30 (v1.0 2026-04-27 → v1.1 갱신)
> 스프린트: Auto — 개발자 빌드-검증 사이클 단축 (대표 본인 1인 사용자 본)
> 단계: 에셋 (README 통합 전 골격)
> 용도: `README.md`에 §⚡ 개발 효율 절 신설 시 그대로 복사 — 토큰만 교체
> v1.1 변경점: 단일 명령 **`npm run loop`** 통합 (가춘운 `design-system_dev-loop.md` v1.0 미러), 게이트 5종 명시, ship-gate 3-AND 예고

---

## 위치 제안

`README.md` 내 `## ⚡ 성능 최적화` 다음, `## 📁 문서 링크` 이전에 **`## ⚡ 개발 효율 — 빌드-검증 사이클`** 절 신설.

---

## 골격 (그대로 복사)

```markdown
## ⚡ 개발 효율 — 빌드-검증 사이클

> Phase 52 이후 신규 콘텐츠(시나리오/스킬/맵) 추가 시 작업 → 검증 사이클을 5분 이내로 묶는 것이 목표입니다.
> 본 시스템의 사용자는 **개발자 본인** — 화면이 아니라 **터미널이 사용자 인터페이스**.

### 🎯 한눈 지표

| 지표 | 약속 | 측정 |
|------|------|------|
| 코드 변경 → 핵심 시나리오 검증 | ≤ **5분** | `npm run loop` |
| dev server cold 부팅 | ≤ **12초** | `npm run dev:measure -- --cold` |
| HMR 반영 | ≤ **800ms** | vite 콘솔 로그 |
| 에러 → 원인 파일/라인 노출 | ≤ **5초** | 2줄 규칙 (1줄=원인, 2줄=`path:line:col`) |

### 🚀 빠른 시작 — 단일 명령

```bash
# 통합 사이클 — boot · scenario(×3) · gate(≤5:00) 한 번에
npm run loop
```

출력 예시 (80자 폭, NO_COLOR 모드 호환):

```
▶ npm run loop                                                    [16:42:01]
├─ ① boot (Phaser dev server)
│   ✓ vite ready                                              1.42s   ▮▮░░░░░░░░
├─ ② scenario (headless × 3)
│   ✓ battle: ATB → 적 처치 → EXP                             18.7s
│   ✓ save: 슬롯1 저장 → 새로고침 → 로드                      12.3s
│   ✓ map: 시작방 → 던전1 → 마을복귀                          15.8s
└─ ③ gate (≤ 5:00)
    ✓ total                                                  48.2s ◀ 4:11.8 여유
```

실패 시 **2줄 규칙** (대표 핵심 요구):

```
✗ battle: ATB → 적 처치 → EXP                                 FAILED
› TypeError: Cannot read 'hp' of undefined
› client/src/scenes/BattleScene.ts:142:18    ← 클릭→VSCode 이동
```

### 🔧 폴백 명령 (단계별 단독 실행)

```bash
npm run dev:fast        # ① 부팅만 (warm cache)
npm run verify:core     # ② 시나리오 3종만 (≤4:30)
npm run error:explain   # ③ 마지막 에러 사람말 풀이
npm run dev:measure -- --cold   # cold 부팅 측정
```

### 🔍 핵심 시나리오 3종

| # | 이름 | 검증 | 시간 약속 |
|---|------|------|-----------|
| 1 | **전투(ATB)** | tick · 스킬 발동 · HP 감소 · EXP 획득 | ≤ 90s |
| 2 | **세이브** | slot 1·2·3 round-trip JSON 동치 | ≤ 60s |
| 3 | **맵 이동** | portal · BGM 전환 · NPC 위치 | ≤ 120s |

> 합계 ≤ **4m 30s** + 게이트 표지 30s = **5분 약속**

### 🚪 5 게이트 키 규약

모든 에러 메시지는 `dev.gate.<gate>.<state>.<reason>` 키로 카탈로그화 — 5 게이트 × 4 상태 = 20개 슬롯.

| 게이트 | 검증 지점 | 정상 시간 |
|-------|---------|---------|
| **boot** | Phaser dev server 부팅 | ≤ 12s cold / ≤ 4s warm |
| **verify** | 핵심 3시나리오 자동화 | ≤ 5min |
| **build** | `vite build` 프로덕션 번들 | ≤ 60s |
| **type** | `tsc --noEmit` 타입체크 | 0 error |
| **runtime** | 브라우저 런타임 throw | 0 unhandled |

상태: `🟢 PASS` (0) · `🔴 BLOCK` (1) · `🟡 WARN` (2) · `🟠 ERROR` (3)

### 📕 자세한 가이드

- [개발자 빌드-검증 사이클 가이드](docs/release/devloop-user-guide.md) — 본 절의 1차 SSOT
- [에러 메시지 카피 SSOT](docs/release/devloop-error-messages.md) — 5 게이트 × 4 상태 = 20슬롯
- [PR / 커밋 컨벤션](docs/release/devloop-pr-template.md) — 7 스코프 / 7 섹션
- [CHANGELOG 항목 초안](docs/release/devloop-changelog-draft.md) — 본 스프린트 변경분
- [디자인 시스템 (CLI)](docs/release/design-system_dev-loop.md) — 4상태 ANSI · 80자 폭 · 트리 글리프

### 🛡️ ship-gate 3-AND hook (다음 스프린트)

다음 스프린트에서 `verify:core 🟢 PASS` AND `git diff --stat ≠ 0` AND `git log --since=7d ≥ 1` 셋이 모두 만족돼야 push 가능하도록 봇 하네스에 hook 신설 예정.

```bash
# 봇 하네스 의사코드
ship-gate := npm run loop && \
             [ -n "$(git diff --stat)" ] && \
             [ "$(git log --since=7d --oneline | wc -l)" -ge 1 ]
```
```

---

## 토큰 교체 가이드

골격을 복사한 뒤, 다음 토큰만 실제 값으로 교체하시옵소서:

| 토큰 | 의미 | 충진 시점 |
|------|------|-----------|
| `≤ 5분` | verify:core 약속 | (변경 없음 — SSOT 봉인) |
| `≤ 12초` | cold 부팅 약속 | (변경 없음 — SSOT 봉인) |
| `≤ 800ms` | HMR 약속 | (변경 없음 — SSOT 봉인) |
| `≤ 5초` | 에러 노출 약속 | (변경 없음 — SSOT 봉인) |
| 시나리오 시간 (90s/60s/120s) | 실측 baseline 확정 후 갱신 | Build → Test 단계 |
| 출력 예시 시각/수치 | 실측 한 줄로 교체 | Test (적경홍) 단계 |

> ⚠️ **약속 수치는 본 SSOT 변경 없이는 README에서 임의 갱신 금지** — 백능파(Strategy) 승인 필수.

---

## 봉인 5종 — 이소화 비협상

1. **4 약속 수치** (≤5분 / ≤12s / ≤800ms / ≤5s) — 백능파 승인 없이 갱신 금지
2. **단일 명령 `npm run loop`** — 빠른 시작은 1명령, 폴백은 별도 절
3. **5 게이트 키 규약** `dev.gate.<gate>.<state>.<reason>` — 코드 상수와 1:1
4. **80자 폭 절단** — 출력 예시는 80자 안에서 끊기, 넘으면 `…`
5. **2줄 에러 규칙** — 1줄=사람말 원인, 2줄=`path:line:col`. 스택트레이스는 `--verbose`로만

---

## 이미지 배지 추가 (선택)

```markdown
[![Loop](https://img.shields.io/badge/npm%20run%20loop-≤5min-brightgreen?style=for-the-badge)](docs/release/devloop-user-guide.md)
[![Boot](https://img.shields.io/badge/dev%20cold-≤12s-blue?style=for-the-badge)](docs/release/devloop-user-guide.md)
[![Error](https://img.shields.io/badge/error%20locate-≤5s-success?style=for-the-badge)](docs/release/devloop-error-messages.md)
```

상단 배지 행에 `Phase`/`Tickets` 옆으로 추가 가능. 현재 README 배지 스타일과 정합.

---

## 관련 문서

- `README.md` — 통합 대상
- `docs/release/devloop-user-guide.md` — 본 절의 1차 SSOT
- `docs/release/devloop-error-messages.md` — 5 게이트 카피 카탈로그
- `docs/release/devloop-pr-template.md` — PR/커밋 컨벤션
- `docs/release/devloop-changelog-draft.md` — CHANGELOG 항목 초안
- `docs/release/design-system_dev-loop.md` — 가춘운 디자인 시스템 (4상태 ANSI · 80자 폭)
- `CHANGELOG.md` — `[1.0.0-rc.3]` 본 스프린트 변경분

---

## v1.0 → v1.1 변경 일지

| 항목 | v1.0 (2026-04-27) | v1.1 (2026-04-30) |
|------|-------------------|-------------------|
| 빠른 시작 | 3 명령 분리 (`dev:fast` / `verify:core` / `error:explain`) | **단일 명령 `npm run loop`** + 4 폴백 |
| 게이트 수 | 명시 안 함 | **5 게이트 명시** (boot/verify/build/type/runtime) |
| 출력 예시 | 없음 | **80자 폭 트리 글리프** 예시 추가 (가춘운 디자인 미러) |
| 2줄 에러 규칙 | 없음 | **신설** — 대표 핵심 요구 명문화 |
| 봉인 항목 | 없음 | **5종 신설** — 이소화 비협상 |
| ship-gate | 미정 | **3-AND hook 의사코드** 추가 |
| 배지 | 2종 | 3종 (`error locate ≤5s` 추가) |

---

> README는 첫 만남의 시이옵니다. 단 한 줄 `npm run loop`로 모든 것이 시작되옵소서. — 진채봉
