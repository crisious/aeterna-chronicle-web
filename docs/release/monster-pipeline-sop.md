# 🐉 몬스터 아트 파이프라인 SOP v1.0 — 사용자 가이드

> 작성: 진채봉 (Editor)
> 작성일: 2026-04-27
> 스프린트: Auto — 몬스터 아트 파이프라인 표준화
> 단계: 에셋 (Build 인수용 SSOT)
> 선행: `prd_monster-art-pipeline.md` (정경패) · `plan_monster-art-pipeline-architecture.md` (두련사) ·
>       `design-system_monster-art-pipeline.md` (가춘운) · `qa-plan_monster-art-pipeline.md` (적경홍) ·
>       `security-checklist_monster-art-pipeline.md` (이소화)
> 본 문서가 1차 SSOT — 인게임 [도움말 → 아트 파이프라인] · 사내 위키 동시 노출

---

## 0. 한눈에 보는 5단(段) 흐름

```
  ① catalog ──→ ② tier-tokens ──→ ③ generate ──→ ④ touchup ──→ ⑤ gate
  (160 SSOT)    (DESIGN.md §10)    (AI · 메타)    (사람 손)    (CI 차단)
       │              │                │              │           │
       └──────── 단방향 의존 (역류 금지) ──────────────────────────┘
```

> 항아리 다섯 격자가 한 결로 흐르는 사이, 시(詩)가 픽셀이 되옵니다.

---

## 1. 빠른 명령어 7종 — 한 손에 잡기

| # | 명령 | 의미 | 소요 |
|---|------|------|------|
| 1 | `npm run monsters:catalog` | overview.md → catalog.json 정규화 | ~3s |
| 2 | `npm run monsters:tokens` | DESIGN.md §10 ⇄ TS 토큰 동기화 | ~1s |
| 3 | `npm run monsters:generate -- --id <ID>` | 단일 몬스터 AI 생성 | 30~90s |
| 4 | `npm run monsters:generate -- --tier normal --chapter 1` | 챕터·등급 배치 생성 | ~분 |
| 5 | `npm run monsters:touchup -- --id <ID>` | 자동 후처리 (배경 제거 + 양자화) | ~5s |
| 6 | `npm run monsters:gate` | 5종 게이트 일괄 검증 | ~10s |
| 7 | `npm run monsters:audit` | 라이선스·메타 감사 리포트 | ~3s |

> 한 호흡, 한 명령 — 외울 일은 ① catalog → ⑤ gate 다섯뿐이옵니다.

---

## 2. 단계별 상세 — 5단(段)을 차례로

### 2.1 ① catalog — 빈 항아리에 이름을 새기다

**입력**: `docs/monster-design/overview.md` (160종 SSOT)
**산출**: `client/src/data/monster_catalog.json`

```bash
npm run monsters:catalog
```

확인 포인트:
- `id` 필드 충돌 0건 (총 160종, 중복 차단)
- `chapter ∈ {1..8}`, `tier ∈ {normal, elite, boss}`
- `silhouette ∈ {humanoid, beast, insect, mech, elemental}`

> 위 5축 외 값이 들어오면 **🔴 BLOCK** 으로 차단되옵니다.

### 2.2 ② tier-tokens — DESIGN.md §10 의 메아리

**입력**: `DESIGN.md §10 Monster Tier Tokens`
**산출**: `src/design-tokens/monster_tier.ts`

```bash
npm run monsters:tokens
```

확인 포인트:
- `MONSTER_TIER.normal.size = 32×32`, `elite = 48×48`, `boss = 96×96`
- 림라이트: `null / #FFD700-1px / #89CFF0-2px`
- idle 진폭: `±1px / ±2px / ±3px`

**원칙**: 토큰을 코드에서 직접 수정하지 마옵소서. **DESIGN.md 가 본가(本家)** 이옵니다.

### 2.3 ③ generate — 컨셉을 청한다

**입력**: catalog 한 행 + tier 토큰
**산출**: `client/public/assets/generated/<id>/raw.png` + `meta.json` (사이드카)

```bash
# 단일
npm run monsters:generate -- --id chapter1.normal.shadow_wisp_01

# 배치 (챕터 1 일반 전체)
npm run monsters:generate -- --tier normal --chapter 1
```

**1순위 모델**: Adobe Firefly (라이선스-안전)
**2순위**: SDXL + LoRA — 출처 메타 강제 기록

> 메타 사이드카가 비면 **이소화의 봉인**으로 ④ 단계 진입 자체가 막히옵니다.

### 2.4 ④ touchup — 사람의 손길

**자동 단계** (선행):
```bash
npm run monsters:touchup -- --id <ID>
```
- `rembg`: 배경 제거 (알파 채널 정리)
- `quantize`: Tier별 팔레트 강제 (16/24/32색)
- `outline`: 외곽선 재작성 (2px 검정)

**수동 단계** (Aseprite, 사람 손):
1. **실루엣 점검** (16×16 축소 시 카테고리 식별 가능?)
2. **광원 강조** (림라이트 위치 = top-left 통일)
3. **호흡(idle) 4~12프레임 분리**
4. **챕터 팔레트 적용** (`palettes/chapter<N>.aseprite-pal`)
5. **수출** → `final.png` + `idle.png` (스프라이트 시트)

> "AI 는 컨셉, 사람이 픽셀" — 가춘운의 5계명 ④조이옵니다.

### 2.5 ⑤ gate — CI 의 다섯 관문

```bash
npm run monsters:gate
```

| 관문 | 검증 | 실패 시 |
|------|------|---------|
| ⓐ schema | catalog/메타 JSON 스키마 | 🔴 BLOCK |
| ⓑ tier_visual | 토큰 일치율 ≥ 95% | 🔴 BLOCK |
| ⓒ palette | 챕터·Tier 팔레트 100% | 🔴 BLOCK |
| ⓓ license | 모델·LoRA 출처 메타 존재 | 🔴 BLOCK |
| ⓔ pixel_diff | AI vs 최종 픽셀 차이 ≥ 60% | 🟡 WARN(누적 ≤ 5건) |

종료 코드: `0` 🟢 PASS · `1` 🔴 BLOCK · `2` 🟡 WARN · `3` 🟠 ERROR

---

## 3. 등급별 시각 약속 — 보스·엘리트·일반

| Tier | 사이즈 | 외곽 | 림라이트 | 팔레트 | idle | 인트로 |
|------|--------|------|---------|--------|------|--------|
| **NORMAL** | 32×32 | 2px 순흑 | 없음 | 16색 | ±1px / 4f / 6fps | 0ms |
| **ELITE** | 48×48 | 2px 흑 + 1px 금 | 1px 골드 #FFD700 | 24색 | ±2px / 6f / 8fps | 800ms |
| **BOSS** | 96×96 | 2px 흑 + 2px 발광 | 2px 에테르 #89CFF0 | 32색 | ±3px / 12f / 10fps | 3,000~5,000ms |

**원칙**: 크기로 위협하면 단조롭사옵고, 광원으로 위협하면 시(詩)가 되옵니다.

---

## 4. 자주 마주치는 매듭 — Troubleshooting

### 4.1 "라이선스 메타가 비었습니다"

원인: `meta.json` 누락 또는 `model_id`/`lora` 필드 없음.
처방:
```bash
npm run monsters:audit -- --id <ID> --fix-meta
```

### 4.2 "픽셀 차이율이 38% 입니다 (최소 60%)"

원인: ④ touchup 의 사람 손길이 부족하옵니다.
처방: Aseprite 에서 외곽선 재작성 + 팔레트 양자화 다시 진행.

### 4.3 "팔레트 위반: 챕터1 에 #FF4444 사용"

원인: 챕터 팔레트(에레보스 = 청-자) 외 색 혼입.
처방: `palettes/chapter1.aseprite-pal` 적용 → 양자화.

### 4.4 "Tier 토큰 불일치: elite 인데 림라이트 없음"

원인: 림라이트 1px 골드 누락.
처방: Aseprite 에서 top-left 1px 골드 라인 추가, 또는 `--auto-rim` 플래그.

---

## 5. 인계 약속 — 다음 단계로

| 받는 이 | 인계물 |
|---------|--------|
| **계섬월 (Build)** | `npm run monsters:*` 7종 스크립트 본 SOP 그대로 구현 |
| **적경홍 (QA)** | 5 게이트 회귀 시나리오 — `qa-plan_monster-art-pipeline.md` 매트릭스 |
| **이소화 (Security)** | 라이선스 게이트(ⓓ)가 본 SOP §2.5 표 그대로 |
| **가춘운 (Design)** | DESIGN.md §10 가 본 SOP §3 표와 정합 — 변경 시 SOP 동시 갱신 |
| **심요연 (Data)** | 게이트 종료 코드 → 대시보드 분포 추적 |

---

## 6. 변경 약속 (Change Discipline)

본 SOP 는 **DESIGN.md §10** 의 메아리이옵니다. 토큰이 바뀌면 본 문서 §3 표가 먼저 갱신되어야 하옵고, CHANGELOG.md `[Changed]` 절에 한 줄 남기옵소서.

> 곡조가 한 번 어긋나면, 악보 전체가 흐트러지옵나이다.

---

> 가을 달빛처럼 맑게, 다섯 격자를 흐르옵소서.
