# 🪷 [Plan/Eng] 몬스터 아트 파이프라인 — 아키텍처 설계

> 작성: 두련사 (Eng Manager / SRE)
> 작성일: 2026-04-27
> 스프린트: Auto — 몬스터 아트 파이프라인 표준화
> 단계: Plan (아키텍처 설계)
> 선행: `think_monster-art-pipeline-design.md` (가춘운), `research_monster-art-pipeline-design.md` (가춘운)
> 토픽 SSOT: 보스/엘리트/일반 비주얼 위계 + AI→터치업 워크플로우 + 라이선스 게이트 + 로드맵 §몬스터 다양성

---

## 0. 한 줄 진단

> 허허, 기획은 풍성하나 파이프라인은 빈 항아리와 같사옵니다. 항아리가 새지 않도록 **다섯 단(段)의 격자**를 두고, 그 격자 사이로 흐르는 물이 곧 데이터 플로우이옵니다.

핵심 결정: **단일 거대 스크립트(batch_monsters.py 172줄)를 폐기하지 않고, 그 위에 “게이트형 파이프라인”을 얹어 점진적으로 흡수합니다.** 빅뱅 재작성은 인연을 거스르는 일이옵니다.

---

## 1. 모듈 분리도 (5 단·5 격자)

```
┌────────────────────────────────────────────────────────────────────┐
│                     monster-art-pipeline (신설 도량)                │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ① catalog/         monster_catalog.json (160종 SSOT)               │
│       └─ monster-design/overview.md → JSON 정규화 산물               │
│                                                                    │
│  ② tier-tokens/     design_tokens/monster_tier.ts                   │
│       └─ DESIGN.md §10 ⇄ 코드 SSOT (size/outline/rim/palette/idle) │
│                                                                    │
│  ③ generators/      generate.ts  (① + ② → AI 호출 + 메타 sidecar)   │
│       ├─ providers/firefly.ts   (라이선스-안전, 1순위)               │
│       ├─ providers/sdxl.ts      (LoRA 출처 추적 강제)                │
│       └─ prompts/{normal,elite,boss}.tpl                           │
│                                                                    │
│  ④ touchup/         자동 후처리 (사람 손길 전후)                     │
│       ├─ rembg.ts           배경 제거                                │
│       ├─ quantize.ts        팔레트 16/24/32색 강제                   │
│       ├─ outline.ts         외곽선 2px 재작업                        │
│       └─ frame_split.ts     idle/attack/hit/death 슬라이싱           │
│                                                                    │
│  ⑤ gate/            라이선스·품질 검증 (PR 머지 차단)                 │
│       ├─ license_check.ts   (모델/LoRA/프롬프트 정규식 5종)          │
│       ├─ palette_audit.ts   (양자화 통과 여부)                       │
│       ├─ pixel_diff.ts      (AI 원본 vs 최종 ≥ 60%)                 │
│       ├─ silhouette.ts      (16x16 축소 시 카테고리 식별)            │
│       └─ reverse_search.ts  (유사도 < 80%, Google Lens API)         │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
              ↓ (통과한 자만)
   client/public/assets/monsters/{normal,elite,boss}/<id>/
```

**격자(boundary) 원칙**: ②는 ③을 모르고, ③은 ⑤를 모릅니다. 한 단(段)을 갈아도 위·아래는 흔들리지 않게 — 단방향 의존만 허락하옵니다.

---

## 2. 데이터 플로우

```
[작가 의도]
   │ docs/art-production/monster-design/<chapter>/<id>.md  (텍스트 정의)
   │
   ▼  ① catalog 빌드 (Build 단계 사전 1회)
[monster_catalog.json] (id · tier · region · silhouette_class · base_or_variant)
   │
   ▼  ③ generate(id) 호출
[ai_raw/<id>.png] + [ai_raw/<id>.meta.json]   ← 모델/LoRA/프롬프트/seed 기록
   │
   ▼  ④ touchup 자동 4단계
[touchup_auto/<id>.png] + [palette.json]
   │
   ▼  (수동) Aseprite 픽셀 정정 — Build 단계 사람 작업
[touchup_final/<id>.png] + [<id>.aseprite]
   │
   ▼  ④ frame_split → 애니메이션 시트
[atlas/<id>.png] + [atlas/<id>.json]
   │
   ▼  ⑤ gate 5종 자동 검증 (CI에서 강제)
   │   ├─ PASS → assets/monsters/ 진입 + manifest 갱신
   │   └─ FAIL → 차단 + 리포트 (어느 게이트, 어떤 픽셀, 어떤 키워드)
   │
   ▼
[클라이언트 런타임]
   MonsterRegistry.ts → Phaser AtlasLoader → BattleScene
```

**불변식 3가지**:
1. `assets/monsters/` 안의 모든 파일은 **반드시 `.meta.json`을 동반**한다 (출처·라이선스·모델 추적).
2. 게이트 통과 도장(`gate.passed_at`)이 없는 에셋은 런타임에서 로드 불가 (manifest에서 제외).
3. tier_tokens(②)와 실제 에셋 사이즈가 어긋나면 빌드 실패 (정합성 단언 스크립트).

---

## 3. 변경·신설 파일 목록

### 3.1 신설 (Plan→Build 단계 인계)

| 경로 | 책임자 | 라인 추산 | 비고 |
|------|--------|-----------|------|
| `DESIGN.md §10 Monster Tier Tokens` | 가춘운 | +120 | 5축 토큰 SSOT |
| `client/src/design_tokens/monster_tier.ts` | 계섬월 | 80 | DESIGN.md ⇄ 코드 |
| `scripts/monster-pipeline/catalog.ts` | 두련사 | 150 | overview.md → JSON |
| `scripts/monster-pipeline/generate.ts` | 심요연 + 가춘운 | 200 | 프롬프트 빌더 + 호출 |
| `scripts/monster-pipeline/providers/{firefly,sdxl}.ts` | 심요연 | 120×2 | provider 추상화 |
| `scripts/monster-pipeline/touchup/{rembg,quantize,outline,frame_split}.ts` | 계섬월 | 80×4 | 후처리 4종 |
| `scripts/monster-pipeline/gate/license_check.ts` | 이소화 | 180 | 정규식 5종 + 메타 검증 |
| `scripts/monster-pipeline/gate/palette_audit.ts` | 이소화 | 100 | 색상 양자화 검증 |
| `scripts/monster-pipeline/gate/pixel_diff.ts` | 이소화 | 90 | SSIM 기반 유사도 |
| `scripts/monster-pipeline/gate/silhouette.ts` | 가춘운 | 70 | 16×16 다운샘플 분류 |
| `scripts/monster-pipeline/gate/reverse_search.ts` | 이소화 | 110 | Google Lens API |
| `scripts/monster-pipeline/cli.ts` | 두련사 | 120 | `npm run mp:<cmd>` 진입점 |
| `client/public/assets/monsters/manifest.json` | 자동 생성 | — | 게이트 통과 SSOT |
| `tests/pipeline/monster-pipeline.spec.ts` | 적경홍 | 250 | 5 게이트 회귀 |
| `.github/workflows/monster-art-gate.yml` | 두련사 | 60 | PR 차단 게이트 |
| `docs/art-production/monster-pipeline-sop.md` | 가춘운 + 진채봉 | 300 | 5단계 SOP 사람 가이드 |

**총 신설**: ~17 파일 / ~2,500 LOC

### 3.2 수정 (기존 코드 흡수)

| 경로 | 변경 내용 |
|------|-----------|
| `scripts/batch_monsters.py` | `cli.ts → generate.ts`로 점진 마이그레이션 — Build 1주차 deprecation 헤더만 추가, 2주차 폐기 |
| `docs/art-production/ai-prompt-master.md` | v2로 업데이트 — 등급별 분기 템플릿 명시 |
| `docs/art-production/monster-design/overview.md` | 프론트매터 추가 (catalog 빌드 입력) |
| `docs/release/launch_checklist.md` | §몬스터 다양성 항목에 게이트 통과율 KPI 추가 |
| `package.json#scripts` | `mp:catalog`, `mp:generate`, `mp:touchup`, `mp:gate`, `mp:all` 5종 |

---

## 4. 엣지 케이스 (반드시 짚어야 할 것)

| # | 시나리오 | 처리 |
|---|---------|------|
| E1 | AI 모델 API 다운 / 쿼터 초과 | provider fallback 체인(Firefly→SDXL) + exponential backoff, 실패 시 catalog에 `pending` 마킹 |
| E2 | Reverse search API 일일 한도 초과 | 게이트는 `WARN`(차단 X), 야간 배치로 재검증 |
| E3 | 사람 터치업이 게이트 통과 후 누군가 AI 원본을 슬쩍 다시 넣음 | `pixel_diff` 매 PR마다 재실행 (메타에 캐시된 hash와 대조) |
| E4 | 동일 ID로 변종 5종 추가 | manifest에서 `<id>__v01..v05` 네임스페이스, base는 `__v00` 고정 |
| E5 | 팔레트 양자화 후 색상 17개 (1색 초과) | `palette_audit`가 가장 가까운 정의 색으로 자동 swap, 그래도 초과면 BLOCK |
| E6 | 보스 64×64 토큰인데 비대칭 허용 → 80×64 출력 | tier 토큰에 `aspect_ratio_max: 1.5` 명시, 초과 시 BLOCK |
| E7 | 작가명 "Yoshitaka Amano" 등이 프롬프트에 우회 표기("아마노 요시타카") | 정규식 + 한/영/일 다국어 사전, 룰 갱신은 `license_check.dictionary.yml` SSOT |
| E8 | LoRA 라이선스 변경 (사후 회수) | 모델 메타에 `license_version` 기록, 월 1회 `relicense_audit` 잡 |
| E9 | 색맹 4모드에서 등급 식별 실패 | 게이트 `silhouette.ts`가 시뮬레이션 4종 모두에서 카테고리 분류 동치 검증 |
| E10 | 160종 전부 빌드하면 CI 1시간 초과 | 변경된 `id`만 증분 빌드 (`git diff` + 의존성 그래프), 전체는 야간 cron |

---

## 5. 테스트 커버리지 전략 (적경홍 인계)

| 레이어 | 도구 | 커버리지 목표 |
|--------|------|---------------|
| 단위 | Vitest | 게이트 5종 각각 PASS/FAIL 케이스 ≥ 4건 → **≥ 90% 라인** |
| 통합 | Vitest + 샘플 PNG 픽스처 12종 | 정상 1, E1~E10 + 보너스 → **시나리오 12건 회귀** |
| E2E | Playwright (헤드리스) | manifest → MonsterRegistry → Phaser 로드 → 16×16 분류 시각 회귀 |
| 시각 회귀 | pixelmatch + odiff | tier별 골든 스냅샷 9종 (3 tier × 3 chapter) |
| 라이선스 | 정규식 사전 fuzz | 위장 표기 1,000건 합성 → 차단율 100% |

**CI 게이트 토폴로지** (`monster-art-gate.yml`):
```
on: pull_request paths: ['client/public/assets/monsters/**', 'scripts/monster-pipeline/**']
jobs:
  catalog-sync   ─┐
  license-check   │── (병렬) ──┐
  palette-audit   │            │
  pixel-diff      │            │── summary 집계 ──┐
  silhouette      │            │                  │
  reverse-search ─┘            │                  ▼
                               └──── tests/* ───→ PR 코멘트 (어느 게이트, 어떤 자산)
종료코드: 0 PASS / 1 BLOCK / 2 WARN  (a11y 게이트와 동일 컨벤션)
```

---

## 6. 성능·운영 고려

- **증분 빌드**: `id`별 SHA-256 해시 캐시 → 변경 자산만 재처리. 160종 풀빌드 추산 30-40분, 증분 1-3분.
- **아티팩트 보존**: `ai_raw/`는 git-ignore, S3/R2에 90일 보존 (라이선스 분쟁 시 추적용).
- **쿼터 모니터링**: provider별 일일 호출 수 → `analytics/monster-pipeline-usage.json` 일 단위 누계.
- **롤백 단순화**: `manifest.json`만 이전 커밋으로 되돌리면 게임 내에서 즉시 이전 자산 사용 (atomic).

---

## 7. 단계별 인계 (Build로 전달)

**Week 1 (P0 — 기초 격자 세우기)**
1. `DESIGN.md §10 Monster Tier Tokens` 픽스 — 가춘운
2. `monster_tier.ts` + `catalog.ts` + `cli.ts` 골격 — 두련사·계섬월
3. 게이트 5종 중 `license_check` + `palette_audit` 우선 (가장 위험) — 이소화

**Week 2 (P1 — 흐름 잇기)**
4. `generate.ts` + provider 2종 — 심요연·가춘운
5. touchup 4종 + frame_split — 계섬월
6. CI 워크플로우 + 시각 회귀 골든 — 두련사·적경홍

**Week 3 (P1 — 시범 가동)**
7. MVP 60종 (1·2 챕터, 일반 위주) 파이프라인 통과 — 가춘운 외주 협주
8. 도감 UI 스코프 결정 (정경패와 협의)

**Week 4 (P2 — 굳히기)**
9. 변종 시스템(`__v01..vNN` 자동 생성) — 가춘운·심요연
10. `batch_monsters.py` 폐기 + SOP v1.0 동결

---

## 8. 미정 항목 (정경패 PRD에서 결정 요청)

- [ ] 도감 UI를 본 스프린트 스코프에 포함? (가춘운 강력 추천 / 두련사 의견: 별도 스프린트 권장 — 본 스프린트 4주는 파이프라인 자체로 빠듯)
- [ ] MVP 60종 vs 풀 160종 1차 목표
- [ ] Reverse search 유료 API 비용 승인 (월 ~$50 추산)
- [ ] AI 원본 보존 90일 vs 영구 (법무 자문 필요 — 이소화)

---

## 9. 두련사의 한 줄

> **"다섯 격자 — 카탈로그·토큰·생성·터치업·게이트 — 이 다섯이 어긋나지 않으면, 160종이 흘러도 항아리는 새지 아니하옵니다. 빅뱅을 멀리하고, 한 단씩 쌓아 올리시지요."**

다음은 적경홍의 테스트 전략 디테일과 이소화의 라이선스 사전(辭典) 합의가 이 설계 위에서 진행되어야 합니다. 인연이 닿으면 자연히 풀리는 법이옵니다.

---

*— 두련사, 2026-04-27 Plan 단계 (Eng Architecture)*
