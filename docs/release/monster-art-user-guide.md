# 🐉 에테르나 크로니클 — 몬스터 아트 파이프라인 사용자 가이드 v1.0

> 작성: 진채봉 (Editor) · 흩어진 다섯 격자를 한 결로 엮었사옵니다
> 스프린트: Auto — 몬스터 아트 파이프라인 표준화 (2026-04-27)
> 단계: 개발 (구현) — Build 인계 가능 SSOT
> 연계: `prd_monster-art-pipeline.md` · `plan_monster-art-pipeline-architecture.md` · `design-system_monster-art-pipeline.md` · `monster-pipeline-sop.md` · `monster-art-error-messages.md` · `launch_checklist.md §몬스터 다양성`
> 노출 위치: `client/public/help/monster-art.html` · 사내 위키 [Art Pipeline → Monster] · 인게임 [도움말 → 아트 파이프라인] (Build 단계 노출)
> 머지 게이트: 본 가이드의 모든 🟢 항목은 `tests/reports/monster-art/summary.json` 자동 검증 통과를 전제로 함

---

## 목차

1. [이 문서의 쓰임](#1-이-문서의-쓰임)
2. [한눈에 보는 5단(段) 흐름](#2-한눈에-보는-5단段-흐름)
3. [등급별 시각 약속 — 보스·엘리트·일반](#3-등급별-시각-약속--보스엘리트일반)
4. [AI 생성 → 사람 손 워크플로우](#4-ai-생성--사람-손-워크플로우)
5. [라이선스 안전성 — 다섯째 관문](#5-라이선스-안전성--다섯째-관문)
6. [도감(Bestiary) 활용 — 플레이어 관점](#6-도감bestiary-활용--플레이어-관점)
7. [문제 해결 (FAQ)](#7-문제-해결-faq)
8. [로드맵 §몬스터 다양성 — 진척 현황](#8-로드맵-몬스터-다양성--진척-현황)
9. [참조 문서 다리표](#9-참조-문서-다리표)

---

## 1. 이 문서의 쓰임

본 문서는 **아티스트** · **빌드 엔지니어 (계섬월)** · **CBT 검수자** · **호기심 많은 플레이어** 가 한 화면에서 몬스터 아트 파이프라인의 결을 읽도록 작성되었사옵니다. 기술 명세는 `monster-pipeline-sop.md` 에, 코드 구현은 `client/src/data/monster_catalog.json` · `src/design-tokens/monster_tier.ts` 에 있고, 본 문서는 **사용자 관점의 활용·확인 가이드** 입니다.

> 🪧 **표기 약속**
> - 🟢 = 5종 게이트 자동 검증 통과 / 🟡 = WARN(누적 ≤ 5건 임계 내) / 🔴 = BLOCK (`monster-art-error-messages.md` 참조)
> - 코드블록의 `npm run monsters:*` 는 모두 `monster-pipeline-sop.md §1` 의 7종 명령어와 1:1 매핑됩니다.
> - **본가(本家)** 표기: 토큰의 SSOT는 `DESIGN.md §10` 이옵고, 본 가이드는 그 메아리이옵니다.

---

## 2. 한눈에 보는 5단(段) 흐름

```
  ① catalog ──→ ② tier-tokens ──→ ③ generate ──→ ④ touchup ──→ ⑤ gate
  (160 SSOT)    (DESIGN.md §10)    (AI · 메타)    (사람 손)    (CI 차단)
       │              │                │              │           │
       └──────── 단방향 의존 (역류 금지) ──────────────────────────┘
```

| 단(段) | 입력 | 산출 | 사람의 손길 | 소요 |
|--------|------|------|------------|------|
| ① catalog | `docs/art-production/monster-design/overview.md` | `monster_catalog.json` | 신규 종 추가 시 행 1개 | ~3s |
| ② tier-tokens | `DESIGN.md §10` | `monster_tier.ts` | 토큰 변경은 본가에서만 | ~1s |
| ③ generate | catalog 1행 + tier 토큰 | `raw.png` + `meta.json` | 프롬프트 검수 | 30~90s/종 |
| ④ touchup | `raw.png` | `final.png` + `idle.png` | Aseprite — **사람이 픽셀** | 5~30분/종 |
| ⑤ gate | 5종 검증 | `summary.json` (PASS/BLOCK/WARN) | PR 머지 직전 | ~10s |

> 곡(曲)으로 빗대오면, ① 가사 정리 → ② 조성 잡기 → ③ 멜로디 시연 → ④ 사람 손가락의 윤색 → ⑤ 합주 검수이옵니다.

---

## 3. 등급별 시각 약속 — 보스·엘리트·일반

본 표가 곧 게이트 ⓑ tier_visual 의 합격 기준이옵니다. 95% 이상 일치해야 통과하옵니다.

| Tier | 사이즈 | 외곽 | 림라이트 | 팔레트 | idle | 인트로 | 입자 |
|------|--------|------|---------|--------|------|--------|------|
| **NORMAL** 🌑 | 32×32 | 2px 순흑 | 없음 | 16색 | ±1px / 4f / 6fps | 0ms | 없음 |
| **ELITE** ⭐ | 48×48 | 2px 흑 + 1px 금 | 1px 골드 `#FFD700` | 24색 | ±2px / 6f / 8fps | 800ms | 2~3개 |
| **BOSS** 👑 | 64×64 (최대 96) | 2px 흑 + 2px 발광 | 2px 에테르 `#89CFF0` | 32색 | ±3px / 8f / 10fps | 3,000~5,000ms | 5~8개 + screen ambient |

**페이즈2 약속(BOSS)**: HP 50% 이하 시 `glowColor` 가 `#89CFF0` → `#FF4444` (진홍·분노) 로 전환되옵니다. 코드 상수 `MONSTER_TIER.boss.phase2` 참조.

**원칙**: 크기로 위협하면 단조롭사옵고, 광원으로 위협하면 시(詩)가 되옵나이다.

### 3.1 빠른 식별 — 16×16 축소 시

도감 썸네일에서 카테고리 5종(humanoid · beast · insect · mech · elemental)이 **실루엣만으로 구분**되어야 하옵니다. ④ touchup 의 첫 점검 항목이옵니다.

> 16픽셀로 보아도 알아볼 수 있어야, 픽셀 한 알이 시(詩)가 되옵니다.

---

## 4. AI 생성 → 사람 손 워크플로우

### 4.1 1순위 모델: Adobe Firefly (라이선스-안전)

- 학습 데이터가 **Adobe Stock + 공개 도메인** 으로 한정 — 상업 이용 안전.
- `meta.json` 의 `model_id: "firefly-v3"` 로 자동 기록.
- 생성 결과의 90% 이상은 본 모델 사용을 권장하옵나이다.

### 4.2 2순위 모델: SDXL + LoRA (출처 메타 강제)

- LoRA 출처가 **CC0 / CC-BY / 사내 학습본** 중 하나여야 ⓓ license 게이트 통과.
- 메타 누락 시 `monster.gate.license.block.no_source` 메시지로 PR 차단.
- 자세한 화이트리스트는 `security-checklist_monster-art-pipeline.md §3` 참조.

### 4.3 사람의 손길 — 5단계 (Aseprite, ④ touchup)

1. **실루엣 점검** (16×16 축소 시 카테고리 식별 가능?)
2. **광원 강조** (림라이트 위치 = `top-left` 통일, BOSS 는 `full-silhouette`)
3. **호흡(idle) 4~12프레임 분리** — Tier별 amplitude/fps 매트릭스 적용
4. **챕터 팔레트 적용** (`art/palettes/monster/<region>/<tier>.gpl`)
5. **수출** → `final.png` (정지) + `idle.png` (스프라이트 시트)

> "AI 는 컨셉, 사람이 픽셀" — 가춘운 CMO/Design 의 5계명 ④조이옵니다. 픽셀 차이율 60% 이상이 ⑤ pixel_diff 의 합격선이옵니다.

### 4.4 빠른 명령 — 한 호흡

```bash
# 단일 종 한 번에
npm run monsters:generate -- --id chapter1.normal.shadow_wisp_01
npm run monsters:touchup  -- --id chapter1.normal.shadow_wisp_01
npm run monsters:gate     -- --id chapter1.normal.shadow_wisp_01

# 챕터 단위 배치
npm run monsters:generate -- --tier normal --chapter 1
npm run monsters:gate
```

---

## 5. 라이선스 안전성 — 다섯째 관문

ⓓ license 게이트는 **이소화 Security 의 봉인** 이옵나이다. 협상 불가, 우회 불가.

| 검증 항목 | 합격 기준 | 실패 시 |
|-----------|----------|---------|
| `meta.json` 존재 | 모든 raw.png 옆에 사이드카 | 🔴 BLOCK |
| `model_id` 필드 | 화이트리스트 (`firefly-v3` / `sdxl-1.0` / 사내학습) | 🔴 BLOCK |
| `lora` 출처 | CC0 / CC-BY / 사내 명시 | 🔴 BLOCK |
| `prompt` 보존 | 평문 그대로 (재현 가능) | 🔴 BLOCK |
| `seed` 보존 | 정수 (재생성 가능) | 🟡 WARN |

> 봉인이 풀리면 게임 전체의 출시가 흔들리옵나이다. 이소화의 다섯 항목은 모두 **🔴 BLOCK** 이옵고, `seed` 만 🟡 WARN 이옵나이다.

자세한 항목은 `security-checklist_monster-art-pipeline.md` 참조.

---

## 6. 도감(Bestiary) 활용 — 플레이어 관점

### 6.1 도감 카드 위계 — 한눈에 잡히는 약속

| 요소 | NORMAL | ELITE | BOSS |
|------|--------|-------|------|
| 테두리 | 흑 2px | 흑 2px + 금 1px | 그라디언트 `#89CFF0 → #FFD700` 2px |
| 배경 | `#1A1A2E` 단색 | `#1A1A2E` + 미세 노이즈 | 별빛 입자 (5~8개) |
| 라벨 | "일반" | "엘리트 ⭐" | "보스 👑" |
| HP바 | 단일 | 골드 림 | 청-금 그라디언트 + 페이즈2 진홍 전환 |

### 6.2 카테고리 필터 5종

`humanoid` · `beast` · `insect` · `mech` · `elemental` — 도감 좌측 사이드바 아이콘으로 노출. 카피 SSOT 는 `monster-bestiary-ingame-copy.md` 참조.

### 6.3 페이즈2 컷씬 — 보스 한정

HP 50% 도달 시 3,000ms 인트로 컷씬이 한 번 더 재생되옵니다. 림라이트가 `#89CFF0` → `#FF4444` 로 전환되며, 입자 spawn rate 가 8 → 12 로 상승하옵나이다. **모션 감소 옵션** 활성화 시에는 컷씬 길이가 800ms 로 단축되옵니다 (접근성 조항).

---

## 7. 문제 해결 (FAQ)

### Q1. "라이선스 메타가 비었습니다"
**처방**: `npm run monsters:audit -- --id <ID> --fix-meta` 후 결손 필드 채움. SDXL 사용 시 LoRA 출처를 반드시 명시.

### Q2. "픽셀 차이율이 38% 입니다 (최소 60%)"
**처방**: ④ touchup 의 사람 손길이 부족하옵니다. Aseprite 에서 외곽선 재작성 + 팔레트 양자화 다시 진행.

### Q3. "팔레트 위반: 챕터1 에 `#FF4444` 사용"
**처방**: 챕터 팔레트(에레보스 = 청-자) 외 색 혼입. `palettes/chapter1.aseprite-pal` 적용 → 양자화.

### Q4. "Tier 토큰 불일치: elite 인데 림라이트 없음"
**처방**: 림라이트 1px 골드 누락. Aseprite 에서 top-left 1px 골드 라인 추가, 또는 `--auto-rim` 플래그.

### Q5. "보스 인트로가 너무 깁니다"
**처방**: 모션 감소 옵션 ON 시 800ms 로 자동 단축. 코드 분기는 `client/src/scenes/BossIntroScene.ts` 의 `prefersReducedMotion()` 가드 참조.

### Q6. "도감에 새 몬스터가 안 보입니다"
**처방**: ① catalog 단계 누락. `npm run monsters:catalog` 후 `monster_catalog.json` 의 `id` 필드 충돌 0건 확인.

### Q7. "AI 가 같은 컨셉만 뽑아냅니다"
**처방**: 프롬프트 시드 분산이 필요하옵니다. `art/prompts/monster_prompts.json` 의 `seed_pool` 항목에 정수 5~10개 추가, 카테고리별 프롬프트 변주 추가.

---

## 8. 로드맵 §몬스터 다양성 — 진척 현황

`launch_checklist.md §몬스터 다양성` 의 미해결 4건이 본 파이프라인으로 해소 경로에 들었사옵니다.

| # | 항목 | 이전 | 본 스프린트 | 상태 |
|---|------|------|-----------|------|
| 1 | 챕터별 몬스터 종 수 (≥ 30종/챕터) | 18종/챕터 | MVP 60종 (Ch.1·2 각 30) | 🟡 진행 |
| 2 | 등급별 시각 위계 일관성 | 임의 (디자이너 손) | DESIGN.md §10 토큰 SSOT | 🟢 PASS |
| 3 | 라이선스 안전성 검증 자동화 | 수동 검수 | ⓓ license 게이트 자동 차단 | 🟢 PASS |
| 4 | 도감 카드 시각 표준 | 단일 템플릿 | 3티어 SVG 모킹업 | 🟢 PASS |

**MVP 스코프 (백능파 HOLD 결정 반영)**: Ch.1 에레보스 30종 + Ch.2 실반헤임 30종 = **60종**. Ch.3~8 은 본 파이프라인 검증 후 차기 스프린트에서 일괄 확장.

---

## 9. 참조 문서 다리표

| 관점 | 문서 | 작성자 |
|------|------|--------|
| **요구사항** | `prd_monster-art-pipeline.md` | 정경패 PM |
| **아키텍처** | `plan_monster-art-pipeline-architecture.md` | 두련사 SRE |
| **디자인 시스템** | `design-system_monster-art-pipeline.md` | 가춘운 CMO/Design |
| **에셋 패키지** | `assets_monster-art-pipeline.md` | 가춘운 CMO/Design |
| **QA 작전** | `qa-plan_monster-art-pipeline.md` | 적경홍 QA Lead |
| **보안 봉인** | `security-checklist_monster-art-pipeline.md` | 이소화 Security |
| **빠른 SOP** | `monster-pipeline-sop.md` | 진채봉 Editor |
| **에러 카피** | `monster-art-error-messages.md` | 진채봉 Editor |
| **인게임 카피** | `monster-bestiary-ingame-copy.md` | 진채봉 Editor |
| **PR 컨벤션** | `monster-art-pr-template.md` | 진채봉 Editor |

---

> 곡조 한 줄, 픽셀 한 알. 본 가이드는 다섯 격자가 한 결로 흐를 때만 의미가 있사옵나이다.
> — 진채봉 拜
