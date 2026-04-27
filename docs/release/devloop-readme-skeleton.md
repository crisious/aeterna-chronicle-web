# README 개발자 가이드 절 — 골격 SSOT v1.0

> 작성: 진채봉 Editor
> 작성일: 2026-04-27
> 스프린트: Auto — 개발자 빌드-검증 사이클 단축
> 단계: 에셋 (README 통합 전 골격)
> 용도: `README.md`에 §개발 효율 절 신설 시 그대로 복사 — 토큰만 교체

---

## 위치 제안

`README.md` 내 `## 🛠️ 개발 환경` 다음, `## 📂 프로젝트 구조` 이전에 신설.

---

## 골격 (그대로 복사)

```markdown
## ⚡ 개발 효율 — 빌드-검증 사이클

> Phase 52 이후 콘텐츠(시나리오/스킬/맵) 추가 시 작업 → 검증 사이클을 5분 이내로 묶는 것이 목표입니다.

### 🎯 한눈 지표

| 지표 | 약속 | 측정 |
|------|------|------|
| 코드 변경 → 검증 완료 | ≤ **5분** | `npm run verify:core` |
| dev server cold 부팅 | ≤ **12초** | `npm run dev:measure -- --cold` |
| HMR 반영 | ≤ **800ms** | vite 콘솔 로그 |
| 에러 → 원인 파일 노출 | ≤ **5초** | `.ac/error-report.json` |

### 🚀 빠른 시작

```bash
# 1. 빠른 부팅 (warm cache)
npm run dev:fast

# 2. 핵심 시나리오 검증 (5분 안)
npm run verify:core

# 3. 마지막 에러 사람말로 풀이
npm run error:explain
```

### 🔍 핵심 시나리오 3종

| # | 이름 | 검증 | 시간 |
|---|------|------|------|
| 1 | **전투(ATB)** | tick · 스킬 · HP · EXP | ≤ 90s |
| 2 | **세이브** | slot round-trip JSON 동치 | ≤ 60s |
| 3 | **맵 이동** | portal · BGM · NPC 위치 | ≤ 120s |

> 합계 ≤ **4m 30s** + 에러 리포트 30s = **5분 약속**

### 📕 자세한 가이드

- [개발자 빌드-검증 사이클 가이드](docs/release/devloop-user-guide.md) — 본 절의 SSOT
- [에러 메시지 카피 SSOT](docs/release/devloop-error-messages.md) — 5 게이트 × 4 상태
- [PR / 커밋 컨벤션](docs/release/devloop-pr-template.md) — 7 스코프 / 7 섹션

### 🛡️ ship-gate hook (다음 스프린트)

다음 스프린트에서 `git diff --stat ≠ 0` AND `git log --since=7d ≥ 1` AND `verify:core 🟢 PASS` 셋이 모두 만족돼야 push 가능하도록 봇 하네스에 hook 신설 예정.
```

---

## 토큰 교체 가이드

골격을 복사한 뒤, 다음 토큰만 실제 값으로 교체하시옵소서:

| 토큰 | 의미 | 예시 |
|------|------|------|
| `≤ 5분` | verify:core 약속 | (변경 없음 — SSOT) |
| `≤ 12초` | cold 부팅 약속 | (변경 없음 — SSOT) |
| `≤ 800ms` | HMR 약속 | (변경 없음 — SSOT) |
| `≤ 5초` | 에러 노출 약속 | (변경 없음 — SSOT) |
| 시나리오 시간 (90s/60s/120s) | 실측 baseline 확정 후 갱신 | Build 단계 인계 후 |

> ⚠️ **약속 수치는 본 SSOT 변경 없이는 README에서 임의 갱신 금지** — 백능파(Strategy) 승인 필수.

---

## 이미지 배지 추가 (선택)

```markdown
[![Verify](https://img.shields.io/badge/verify%3Acore-≤5min-brightgreen?style=for-the-badge)](docs/release/devloop-user-guide.md)
[![Boot](https://img.shields.io/badge/dev%20cold-≤12s-blue?style=for-the-badge)](docs/release/devloop-user-guide.md)
```

상단 배지 행에 `Phase`/`Tickets` 옆으로 추가 가능.

---

## 관련 문서

- `README.md` — 통합 대상
- `docs/release/devloop-user-guide.md` — 본 절의 SSOT
- `CHANGELOG.md` — `[1.0.0-rc.3]` 본 스프린트 변경분

---

> README는 첫 만남의 시이옵니다. — 진채봉
