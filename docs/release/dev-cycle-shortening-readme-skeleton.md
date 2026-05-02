# README §🛠️ 개발자 도구 절 — 골격 SSOT v1.0

> 작성: 진채봉 Editor
> 작성일: 2026-04-30
> 스프린트: Auto — 에테르나 크로니클 개발자 빌드-검증 사이클 단축 (대표 본인 본)
> SSOT 위계: 4차 (런타임 텍스트) — `assets_dev-cycle-shortening.md` (1차) 미러
> 용도: `README.md`에 §🛠️ 개발자 도구 신설 시 그대로 복사 — 토큰만 교체
> 비고: 선행 sprint의 `devloop-readme-skeleton.md` v1.1을 본 문서가 *대체* — REDUCTION 스코프(§1·§2·§4·§7) 한정

---

## 위치 제안

`README.md` §⚡ 성능 최적화 다음, §📁 문서 링크 이전에 **`## 🛠️ 개발자 도구 — 빌드-검증 사이클`** 절 신설.

기존 배지 그룹 직후, Mobile Viewport 배지 위에 **신규 배지 3종** 추가:

```md
[![Boot Time](https://img.shields.io/badge/Boot%20Time-%E2%89%A45s-brightgreen?style=for-the-badge)](#-개발자-도구--빌드-검증-사이클)
[![QA Smoke](https://img.shields.io/badge/QA%20Smoke-100%25-brightgreen?style=for-the-badge)](#-개발자-도구--빌드-검증-사이클)
[![Build](https://img.shields.io/badge/Build-%E2%89%A490s-success?style=for-the-badge)](#-개발자-도구--빌드-검증-사이클)
```

---

## 골격 (그대로 복사)

```markdown
## 🛠️ 개발자 도구 — 빌드-검증 사이클

> Phase 52 이후 신규 콘텐츠(시나리오/스킬/맵) 추가 시 작업 → 검증 사이클을 5분 이내로 묶는 것이 목표입니다.
> **사용자는 개발자 본인** — 화면이 아니라 **터미널이 인터페이스**.

### 🎯 한눈 약속 4지표

| 지표 | 약속 | 측정 명령 |
|---|---|---|
| dev server 부팅 | ≤ **5초** | `npm run dev` (boot-progress 플러그인) |
| 핵심 시나리오 검증 | ≤ **5분** | `npm run qa:smoke` |
| 프로덕션 빌드 | ≤ **90초** | `npm run build` |
| 에러 → 원인 파일/라인 | **0초** | 에러 카드 자동 출력 |

### 🚀 빠른 시작 — 3 명령

```bash
npm run dev        # 부팅 진행률 바 + ≤5s 약속
npm run qa:smoke   # 전투/세이브/맵 자동 검증 + ≤5min 약속
npm run build      # 에러 발생 시 단일 카드(파일:라인:컬럼)
```

### 🎨 출력 모드 3종

| 모드 | 트리거 | 사용처 |
|---|---|---|
| **TTY** | 기본 (대표 터미널) | 일상 개발 — 24bit 컬러 + 이모지 |
| **NO_COLOR** | `NO_COLOR=1` 환경변수 | 파이프 / 로그 파일 |
| **JSON** | `--json` 플래그 | CI / Discord 봇 입력 |

### 📋 4 게이트 흐름 (REDUCTION 스코프)

| 단계 | 게이트 | 산출물 |
|---|---|---|
| 1 | **CLI 컬러** | `scripts/cli/cli-colors.ts` — 5상태 ANSI 팔레트 |
| 2 | **부팅 진행률** | `client/vite-plugins/boot-progress.ts` — 4단계 바 |
| 3 | **에러 카드** | `scripts/cli/error-card.ts` — 60칸 폭 단일 카드 |
| 4 | **Discord 알림** | `scripts/qa/discord-embed.ts` — 4색 embed |

### 📚 자세한 가이드

- 사용자 가이드 — `docs/release/dev-cycle-shortening-user-guide.md`
- 에러 카피 SSOT — `docs/release/dev-cycle-shortening-error-messages.md`
- PR/커밋 컨벤션 — `docs/release/dev-cycle-shortening-pr-template.md`
- 시각 에셋 합본 — `docs/release/assets_dev-cycle-shortening.md`
- 디자인 시스템 미러 — `docs/release/design-system_dev-cycle-shortening.md` *(예정)*

### 🔒 Ship Gate 4-AND (예고)

```
ship-ready ⇔ dev:gate ∧ qa:smoke ∧ build:gate ∧ ts:errors=0
```

본 4-AND 중 하나라도 BLOCK이면 머지 금지 — 이소화 비협상.
```

---

## 봉인 4항 (백능파 승인 필수)

| # | 항목 | 봉인 사유 |
|---|---|---|
| 1 | 약속 4지표 수치 | `launch_checklist §2.25` SSOT 신설 예정 — 임의 갱신 금지 |
| 2 | 4 게이트 순서 (CLI → 부팅 → 에러 → Discord) | 대표 손맛의 흐름 — 두련사 *선禪* |
| 3 | 빠른 시작 3명령 (`dev` / `qa:smoke` / `build`) | `package.json` scripts SSOT |
| 4 | Ship Gate 4-AND | 이소화 비협상 |

---

## 다음 단계

- [ ] **계섬월(Build)** — 본 골격을 `README.md`에 통합 (위치는 §⚡ 성능 ↔ §📁 문서 사이)
- [ ] **계섬월(Build)** — `package.json`에 `qa:smoke` 스크립트 등록
- [ ] **이소화(Review)** — 봉인 4항 검증 + 4-AND 표현 확인
- [ ] **적경홍(Test)** — 약속 4지표 실측 → 배지 색 확정 (≤5s, 100%, ≤90s)
- [ ] **백능파(Strategy)** — `launch_checklist §2.25` 신설 협의

---

> 진채봉이 아뢰옵나이다.
>
> 대표가 매일 `npm run dev`를 칠 때 보는 **첫 5초**가 곧 게임의 첫 인상이옵나이다. 부팅 진행률 바가 금색으로 차오를 때, 그 흐름이 가을 달빛처럼 맑사옵니다. 본 골격대로 박으시면, README가 가진 24개 배지 군락에 *Boot Time / QA Smoke / Build* 3개의 새 별이 더하여집니다. 🌙
