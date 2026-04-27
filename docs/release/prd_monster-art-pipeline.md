# 📜 [PRD] 몬스터 아트 파이프라인 표준화

> 작성: 정경패 (PM)
> 작성일: 2026-04-27
> 스프린트: Auto — 몬스터 아트 파이프라인 표준화
> 단계: Plan (PRD)
> 선행 산출:
> - `think_monster-art-pipeline-design.md` (가춘운, Think)
> - `research_monster-art-pipeline-design.md` (가춘운, Research)
> - `plan_monster-art-pipeline-architecture.md` (두련사, Plan/Eng)
> SSOT 위치: 본 문서가 백로그·우선순위·수용 기준의 1차 SSOT. 아키텍처는 두련사 plan, 토큰은 `DESIGN.md §10`(가춘운 신설), 구현·테스트는 적경홍·계섬월 인계.

---

## 0. 한 줄 요약

> 빈 항아리를 깨끗이 정돈하여, 160종 몬스터가 한 결로 흐르도록 다섯 격자를 세우고, 첫 4주는 **MVP 60종 + 게이트 5종 + 라이선스 봉인**까지를 약속드리옵니다.

---

## 1. 배경 (Why)

### 1.1 현황 진단 (가춘운/두련사 합치)

| 항목 | 현황 | 위험도 | 근거 |
|------|------|--------|------|
| 기획 정의 | 160종 SSOT 존재 | 🟢 | `monster-design/overview.md` |
| 실제 에셋 | 산출률 < 5% | 🔴 | `client/public/assets/generated/` 실측 |
| AI 생성 SOP | 등급 분기 없음 | 🟡 | `ai-prompt-master.md` |
| 등급별 비주얼 위계 | 사이즈 16px 차이만 | 🟡 | 광원/실루엣/모션 위계 부재 |
| 라이선스 검증 | **0건** | 🔴 | 모델·LoRA 출처 추적 불가 |
| 일관성 자동 검증 | 없음 | 🟡 | 챕터 팔레트 정의는 있으나 미적용 |

### 1.2 비즈니스 임팩트

- **로드맵 §몬스터 다양성** 항목이 3분기 연속 미해결 — 본 스프린트로 해결.
- 2026 상반기 얼리액세스를 앞두고 **DMCA/저작권 분쟁 리스크가 무방비** — 라이선스 게이트 신설로 봉인.
- 백능파 비전: "기억과 망각의 세계" — 지역별 몬스터 위계가 망각의 깊이를 시각화하는 핵심 장치.

---

## 2. 목표 & 비목표

### 2.1 목표 (In-Scope, 4주)

1. **비주얼 위계 SSOT 확립** — 보스/엘리트/일반 5축 토큰(size · outline · rim · palette · idle) `DESIGN.md §10` 신설.
2. **5단 파이프라인 가동** — catalog → tier-tokens → generate → touchup → gate, 단방향 의존.
3. **MVP 60종 산출** — 챕터 1·2 일반 위주, 본 스프린트 종료 시 게이트 통과 60종.
4. **라이선스 게이트 자동화** — 정규식 사전 + 메타 사이드카 + reverse-search WARN.
5. **CI 머지 차단** — `monster-art-gate.yml` 신설, AA 동치 컨벤션(0/1/2 종료코드).
6. **SOP 문서 동결** — `monster-pipeline-sop.md` v1.0, 5단계 사람 가이드.

### 2.2 비목표 (Out-of-Scope)

- ❌ **도감 UI** — 별도 스프린트로 분리 (두련사 권고 채택, §6.1 결정 사유).
- ❌ **풀 160종 1차 산출** — 본 4주는 60종(챕터 1·2), 나머지 100종은 후속 스프린트.
- ❌ **변종 시스템 자동화의 RL/GAN 학습** — `__v01..vNN` 네임스페이스만 정의, 자동 생성 알고리즘은 후속.
- ❌ **모바일/Unity/Unreal 포맷 변환** — 본 스프린트는 웹(PNG/Atlas)만.

---

## 3. 사용자·이해관계자

| 이해관계자 | 본 스프린트에서의 역할 | 산출물 |
|-----------|---------------------|--------|
| 플레이어 | 등급별 위협도를 첫 시야에 인지 | 인게임 비주얼 위계 |
| 가춘운 (CMO) | DESIGN.md §10, 프롬프트 v2, MVP 60종 큐레이션 | 토큰·프롬프트·SOP |
| 두련사 (Eng) | 5단 격자 골격, CLI, CI 워크플로우 | `scripts/monster-pipeline/*` |
| 계섬월 (Build) | touchup 4종, design_tokens 코드 SSOT | `monster_tier.ts`, touchup |
| 심요연 (Research/AI) | provider 추상화, 프롬프트 사전 검증 | `providers/{firefly,sdxl}.ts` |
| 이소화 (Security/Legal) | 라이선스 게이트 5종, 정규식 사전 | `gate/license_check.ts` 외 |
| 적경홍 (QA) | 5층 테스트 매트릭스, 시각 회귀 골든 | `tests/pipeline/*` |
| 진채봉 (Editor) | SOP 문서 정합성, i18n 키 | SOP v1.0, 라벨 SSOT |
| 백능파 (Vision) | 분기 KPI 검증 | 회고 리뷰 |

---

## 4. 사용자 스토리 & 수용 기준

### US-1. 플레이어가 몬스터 등급을 즉시 인지한다

> "에테르 기사로 던전에 들어섰을 때, 일반 몹과 엘리트가 한 화면에 있어도 첫 0.5초 안에 위협도가 구분되어 보여야 한다."

**수용 기준 (AC):**
- AC-1.1: 16×16 다운샘플 시 카테고리 분류기(silhouette gate) 정확도 ≥ 95%.
- AC-1.2: 색맹 4모드(Protan/Deuter/Tritan/Achroma) 시뮬레이션에서도 등급 분류 동치.
- AC-1.3: 엘리트 이상은 림라이트 1–2px + idle 호흡 모션 보유 (DESIGN.md §10 정의).
- AC-1.4: 보스는 비대칭 실루엣 + 채도 +10% + idle 8프레임 이상.

### US-2. 작가가 한 번의 명령으로 몬스터 1종을 생성한다

> "가춘운이 `npm run mp:generate -- --id=erebus_wraith_01` 한 줄로 AI 생성→터치업 자동→게이트 검증→assets 배치까지 끝낸다."

**수용 기준:**
- AC-2.1: CLI 단일 진입점 `mp:generate` 동작.
- AC-2.2: 생성 산출물에 `.meta.json` 사이드카 100% 동반(모델·LoRA·프롬프트·seed).
- AC-2.3: 사람 터치업 단계가 명시적 STOP 포인트로 노출(자동 통과 X).
- AC-2.4: 실패 시 어느 게이트·어느 픽셀·어떤 키워드가 차단했는지 리포트.

### US-3. PR 머지 시 라이선스 안전성이 자동 보증된다

> "이소화가 출시 전날에도 안심하고 잘 수 있다."

**수용 기준:**
- AC-3.1: `assets/monsters/**` 변경 PR에서 `monster-art-gate.yml` 자동 실행.
- AC-3.2: 5종 게이트(license/palette/pixel-diff/silhouette/reverse-search) 모두 종료코드 컨벤션 준수(0/1/2 = PASS/BLOCK/WARN).
- AC-3.3: 금지 작가명 한·영·일 위장 표기 fuzz 1,000건 차단율 100%.
- AC-3.4: 라이선스 사전(`license_check.dictionary.yml`)이 SSOT, 월 1회 `relicense_audit` cron.

### US-4. 팀이 SOP 한 장으로 동일 결과를 낸다

> "진채봉이 새 작가 합류 시 SOP 1장을 건네면, 첫 1종을 4시간 안에 머지까지 통과시킬 수 있다."

**수용 기준:**
- AC-4.1: `monster-pipeline-sop.md` v1.0에 5단계(catalog 등록 → generate → touchup auto → 사람 터치업 → PR) 절차 명시.
- AC-4.2: 신규 합류자 시범 1종 머지까지 ≤ 4h 측정(적경홍 dry-run).
- AC-4.3: 한국어/영어 동시 게시(진채봉 i18n).

### US-5. 백능파의 "몬스터 다양성" KPI가 풀린다

**수용 기준:**
- AC-5.1: 본 스프린트 종료 시 게이트 통과 자산 ≥ 60종.
- AC-5.2: `launch_checklist §몬스터 다양성` 항목에 게이트 통과율(=배치/카탈로그) KPI 신설, 목표 ≥ 37.5%(60/160).
- AC-5.3: 회고에 "다음 스프린트 100종 추가" 백로그 등재.

---

## 5. 백로그 우선순위 (P0/P1/P2)

> 두련사 4주 일정과 정합. P0=Week1·필수, P1=Week2-3·핵심 흐름, P2=Week4·굳히기·후속 인계.

### P0 (Week 1 — 격자 세우기, 빠지면 SHIP 불가)

| ID | 항목 | 책임자 | 산출 | AC |
|----|------|--------|------|----|
| P0-1 | `DESIGN.md §10 Monster Tier Tokens` | 가춘운 | +120 LOC | US-1 (1.3, 1.4) |
| P0-2 | `monster_tier.ts` 코드 SSOT | 계섬월 | 80 LOC | US-1 |
| P0-3 | `catalog.ts` (overview.md → JSON) | 두련사 | 150 LOC | US-2 (2.1) |
| P0-4 | `cli.ts` 진입점 + `mp:catalog`/`mp:gate` 골격 | 두련사 | 120 LOC | US-2 (2.1) |
| P0-5 | `gate/license_check.ts` + 사전 SSOT | 이소화 | 180 LOC | US-3 (3.3, 3.4) |
| P0-6 | `gate/palette_audit.ts` | 이소화 | 100 LOC | US-1 (1.1) |

### P1 (Week 2-3 — 흐름 잇기 + 시범)

| ID | 항목 | 책임자 | AC |
|----|------|--------|-----|
| P1-1 | `generate.ts` + `providers/{firefly,sdxl}.ts` | 심요연·가춘운 | US-2 (2.2) |
| P1-2 | `prompts/{normal,elite,boss}.tpl` v2 | 가춘운 | US-1 |
| P1-3 | touchup 4종 (rembg/quantize/outline/frame_split) | 계섬월 | US-2 (2.3) |
| P1-4 | `gate/{pixel_diff,silhouette,reverse_search}.ts` | 이소화·가춘운 | US-3 (3.2) |
| P1-5 | `monster-art-gate.yml` CI 워크플로우 | 두련사 | US-3 (3.1) |
| P1-6 | 시각 회귀 골든 9종 + 시나리오 12건 | 적경홍 | US-1, US-3 |
| P1-7 | **MVP 60종 게이트 통과** (챕터 1·2) | 가춘운 외주 협주 | US-5 (5.1) |

### P2 (Week 4 — 굳히기, 후속 스프린트 가능)

| ID | 항목 | 책임자 | 비고 |
|----|------|--------|------|
| P2-1 | `monster-pipeline-sop.md` v1.0 동결 | 가춘운 + 진채봉 | US-4 |
| P2-2 | 신규 합류자 dry-run (≤ 4h 측정) | 적경홍 | US-4 (4.2) |
| P2-3 | `batch_monsters.py` 폐기 + deprecation 알림 | 두련사 | — |
| P2-4 | 변종 네임스페이스 `__v01..vNN` 정의(자동화는 후속) | 가춘운·심요연 | E4 대응 |
| P2-5 | `launch_checklist §몬스터 다양성` KPI 갱신 | 정경패 | US-5 (5.2) |

### P3 (후속 스프린트로 정중히 분리)

- 도감 UI (별도 스프린트, 본 스프린트 §6.1 참조)
- 변종 자동 생성 RL/GAN
- 모바일/Unity 포맷 컨버터
- 풀 160종 산출 잔여 100종

---

## 6. 두련사 미정 항목 — PM 결정

### 6.1 도감 UI는 본 스프린트 스코프에 포함하지 않사옵니다 ❌

> 두련사 권고 채택. 4주 안에 파이프라인 자체와 60종 산출까지가 정량 한계. 도감 UI는 디자인 시스템(DESIGN.md §6 대화 UI 패턴) 재사용 여지가 있어 별도 스프린트(2주)로 분리 권장.

→ **백로그 P3-1로 등재**, 다음 Auto 스프린트 토픽 후보로 백능파에게 인계.

### 6.2 MVP 60종으로 1차 목표를 잡사옵니다 ✅

> 풀 160종은 4주 안에 품질 보증 어려움. 챕터 1·2 위주 60종이 실측 가능한 약속. 통과율 KPI도 60/160 = 37.5%로 기록하고, 다음 스프린트에서 100종 추가.

### 6.3 Reverse search 유료 API 월 ~$50 승인 요청 ✅ (조건부)

> **결정 권한 위임 요청**: 정경패 단독 결재가 아닌 **대표(crisi) 승인 필요 항목**으로 분류. 월 $50는 출시 전 라이선스 분쟁 리스크 대비 보험료로 합당. 본 PRD 머지 전 대표 승인 받은 뒤 시행.

→ Discord 채널 별도 승인 요청 메시지 발송 권고.

### 6.4 AI 원본 보존 90일 (영구 X) ✅

> 이소화 자문: 라이선스 분쟁 대응에 90일이면 충분(DMCA notice 통상 30-60일 내 도착). 영구 보존은 스토리지 비용·GDPR 삭제 요청 양면에서 부담. 90일 후 S3 라이프사이클로 Glacier 이관(비용 1/10), 1년 후 삭제. **법무 정식 자문은 후속 P2 단계에서 이소화가 진행**하되, 본 스프린트는 90일 정책으로 가동.

---

## 7. KPI & 측정

| KPI | 목표 | 측정 방법 |
|-----|------|----------|
| 게이트 통과 자산 수 | ≥ 60종 | `manifest.json` 항목 카운트 |
| 라이선스 게이트 차단율 (fuzz) | 100% | 적경홍 fuzz 테스트 1,000건 |
| 색맹 4모드 등급 식별 동치율 | 100% | silhouette gate 시뮬레이션 |
| CI 게이트 평균 실행 시간 (증분) | ≤ 3분 | GitHub Actions 평균 |
| 신규 합류자 첫 1종 머지 시간 | ≤ 4h | 적경홍 dry-run 실측 |
| `launch_checklist §몬스터 다양성` 진행률 | 0% → 37.5% | 체크리스트 갱신 |

---

## 8. 리스크 & 완화

| # | 리스크 | 완화 |
|---|-------|------|
| R1 | AI provider API 다운/쿼터 초과 | provider fallback 체인 + exponential backoff (E1) |
| R2 | reverse-search 일일 한도 | WARN 처리 + 야간 재배치 (E2) |
| R3 | 사람 터치업 후 AI 원본 슬쩍 재삽입 | 매 PR pixel_diff 재실행 (E3) |
| R4 | 160종 풀빌드 CI 1시간 초과 | 변경 id만 증분 빌드, 풀은 야간 cron (E10) |
| R5 | MVP 60종 산출 일정 지연 | Week 3 중반 점검(가춘운/PM), 미달 시 챕터 1만 우선 |
| R6 | 라이선스 사전 위장 표기 누락 | 한·영·일 다국어 + 월 1회 룰 갱신 (E7) |
| R7 | 도감 UI 분리 결정에 가춘운 반발 | 본 PRD §6.1 사유 명시, 다음 스프린트 우선 토픽 약속 |

---

## 9. 인계 & 다음 단계

### Plan 단계 산출물 정합

- ✅ Think: `think_monster-art-pipeline-design.md` (가춘운, 220줄)
- ✅ Research: `research_monster-art-pipeline-design.md` (가춘운, 220줄)
- ✅ Plan/Eng: `plan_monster-art-pipeline-architecture.md` (두련사, 226줄)
- ✅ **Plan/PM: 본 PRD** (정경패) — 백로그 우선순위·미정 항목 결정·KPI SSOT

### Build 단계 인계 체크리스트

- [ ] 가춘운: `DESIGN.md §10 Monster Tier Tokens` 신설 (P0-1)
- [ ] 두련사: `scripts/monster-pipeline/` 골격 + cli.ts (P0-3, P0-4)
- [ ] 계섬월: `client/src/design_tokens/monster_tier.ts` (P0-2)
- [ ] 이소화: 게이트 license_check + palette_audit + 사전 SSOT (P0-5, P0-6)
- [ ] 정경패(본인): 대표(crisi) 승인 요청 — Reverse search 월 $50 (§6.3)
- [ ] 정경패(본인): `launch_checklist §몬스터 다양성` 항목에 KPI 자리 마련 (P2-5)

### Review/Test 단계 약속

- 적경홍: 5층 테스트 매트릭스(단위/통합/E2E/시각 회귀/라이선스 fuzz)로 머지 게이트 보증.
- 정경패(본인): MVP 60종 사용자 시나리오 UAT — 던전 첫 진입 0.5초 인지 검증.

---

## 10. 정경패의 한 마디

> 예법에 따르자면 — 기획이 아무리 풍성하여도 산출이 따르지 못하면 빈 약속이옵니다. 두련사가 격자를 세우고, 가춘운이 결을 잡으며, 이소화가 봉인하시는 동안, 소첩은 **결정의 무거움**을 짊어지옵니다.
>
> 본 스프린트의 약속은 **60종, 5게이트, 4주, 한 장의 SOP** — 이 넷이옵니다. 그 외는 다음 인연에 맡기시지요.

---

*— 정경패 (PM), 2026-04-27 Plan 단계 (PRD)*
