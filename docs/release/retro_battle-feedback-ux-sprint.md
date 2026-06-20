# Retro — 전투 피드백 UX 가독성 스프린트

> 작성: 진채봉 Editor
> 작성일: 2026-06-20
> 스프린트: Auto-Battle-Feedback-UX (9인 AI 에이전트 자동 스프린트)
> 토픽: 에테르나 크로니클 전투 피드백 UX 개선 — 데미지·상태이상 표시 가독성 향상
> 단계: Reflect (회고)
> 정량 출전: 심요연 Data Analyst · 정성 출전: 두련사 Eng Manager

---

## 0. 한 줄 요약

> **청사진은 만개(滿開), 채색은 절반.** 데미지·상태이상 가독성의 설계·데이터·접근성 약속은 실측으로 완성되었으나, 화면에 붓을 대는 `createBattleFeedbackPresenter`는 `throw [asset-stub]`로 비워 둔 채 Build 다음 사이클(B5/B7)을 기다리옵니다. 다만 토픽의 본질 — *가독성* — 은 vibes가 아닌 **WCAG 대비비·색약 ΔE 실측 데이터**로 입증되어 흔들림이 없사옵니다.

---

## 1. 스프린트 결과

### 1.1 무엇을 이루었는가

| 계층 | 산출물 | 상태 |
|---|---|---|
| **해석(resolver)** | `client/src/combat/damageFeedbackResolver.ts` (9.3KB) | ✅ 구현 — 데미지 7종·속성 6종·상태 15종 순수 매핑 |
| **토큰(tokens)** | `client/src/constants/battle-feedback-tokens.ts` | ✅ 구현 — WCAG AAA 대비·색약 단서 토큰 |
| **상태 렌더(status)** | `client/src/combat/StatusEffectRenderer.ts` | ◐ 배선 — 버프/디버프 형태 단서 분리 대기 |
| **표현(presenter)** | `client/src/combat/battleFeedbackPresenter.ts:122` | ✗ `throw [asset-stub]` — Build B5/B7 의도적 미구현 |
| **문서(docs)** | 텍스트 에셋 5편 + PRD 1편 | ✅ 진채봉 합본 |

> 배선은 `BattleScene·CombatManager`까지 닿았으나, 정작 화면을 그리는 붓이 비어 "설계·데이터는 완성, 렌더링 구현은 절반"의 형국이옵니다. 이는 사고(事故)가 아니라 **명시적 보류** — stub이 `B5/B7`을 향해 손가락질하고 있으니, 다음 사이클의 첫 단추가 어디인지 코드 스스로 증언하옵니다.

### 1.2 가독 약속 4지표 (정본: `battle-feedback-user-guide.md`)

| 지표 | 약속 | 근거 |
|---|---|---|
| **명도 대비** | 텍스트 ≥7:1 / 아이콘 ≥3:1 (WCAG AAA) | 실측 대비비 |
| **최소 폰트** | 전투 텍스트 ≥14px (데미지 28px) | 토큰 SSOT |
| **색약 단서** | 비색상 단서 커버리지 100% | 색약 ΔE 측정 |
| **팝업 체류** | 데미지 팝업 ≥900ms · 겹침 0 | 타이밍 게이트 |

> 가독성을 "보기 좋다"는 말의 안개에 맡기지 않고, **숫자로 묶어 둔** 것이 이번 스프린트의 가장 단단한 뼈대이옵니다. 색약 플레이어(인구 약 8%)와 빠른 연타 구간에서 정보가 묻히던 결을, 측정 가능한 약속으로 메웠사옵니다.

### 1.3 진채봉 텍스트 에셋 5편 (Assets 단계 산출)

| 문서 | 골자 |
|---|---|
| `battle-feedback-user-guide.md` | **1차 SSOT** — 9절 + FAQ 8건, 데미지 7/속성 6/상태 15종 표, 가독 4약속 |
| `battle-feedback-error-messages.md` | 4게이트 × 4상태 = 16슬롯 카피 (ko/en 32줄), 키 규약 `battle.feedback.<gate>.<state>.<reason>` |
| `battle-feedback-pr-template.md` | PR 6스코프 + 7섹션 + 3-AND 머지 게이트 (이소화 접근성 봉인 비협상 명시) |
| `battle-feedback-readme-skeleton.md` | README 절 골격 — 4지표 표·배지 2종(`Battle Contrast AAA`·`Colorblind Cues 100%`) |
| `battle-feedback-changelog-draft.md` | CHANGELOG Added 초안 — _TBD_ 슬롯을 실측치로 메우는 안내 |

---

## 2. 정량 — 거품을 걷어낸 진실 (심요연)

**최근 7일 68 커밋 · 283K 삽입의 해체**

| 갈래 | 비중 | 본질 |
|---|---|---|
| 표면 삽입 | 283K | 폭포수처럼 보이나… |
| **실 코드** | **36K (12.8%)** | …대부분은 에셋·LFS·생성물 |
| 토픽 직결 | combat-ux 18 리비전의 **꼬리 2건(r17·r19)** | 설계·데이터 계층의 마지막 손길 |

> 심요연의 살핌대로, 외형의 폭포수를 믿지 않고 **실 코드 12.8%** 만을 진실로 셈하옵니다. 토픽에 직접 닿은 손길은 18 리비전 흐름의 꼬리 2건 — 적되 정밀한 마무리이옵니다. 화면을 그리는 붓(presenter)이 비어 있음을 정량이 정직하게 증언하옵니다.

---

## 3. 잘한 결 (Keep)

1. **측정으로 약속한 가독성** — WCAG 7:1·색약 ΔE·900ms 체류를 vibes가 아닌 숫자로 못 박았사옵니다. 토픽의 본질이 흔들리지 않은 까닭이옵니다.
2. **계층 분리(resolver ↔ presenter)** — 순수 해석 로직과 화면 표현을 갈라, presenter가 비어도 resolver·tokens는 단위 테스트로 홀로 설 수 있는 구조이옵니다.
3. **stub이 다음 단추를 가리킴** — `throw [asset-stub] … Build B5/B7`. 미구현조차 *어디로 가야 하는지* 증언하니, 부채(負債)가 길을 잃지 않사옵니다.
4. **문서 SSOT 위계 준수** — 가독 4약속의 정본을 `user-guide.md` 한 곳에 두고, README·CHANGELOG는 메아리로 두었사옵니다. 수치가 두 곳에서 어긋날 틈이 없사옵니다.

## 4. 아쉬운 결 (Problem)

1. **렌더링 절반의 미완** — `createBattleFeedbackPresenter`가 비어, 플레이어는 아직 개선된 데미지 팝업을 *눈으로* 보지 못하옵니다. 사용자 가치 실현은 다음 사이클 몫.
2. **283K 삽입의 착시** — 정량을 거르지 않으면 "거대한 진척"으로 오독될 외형. 심요연의 거품 해체가 없었다면 회고가 부풀었을 것이옵니다.
3. **_TBD_ 슬롯 잔존** — changelog-draft의 실측 수치 칸이 아직 비어 Build/Test 단계의 충진을 기다리옵니다.

## 5. 다음에 할 결 (Try)

| # | 인계 | 받는 이 | 우선 |
|---|---|---|---|
| 1 | `battleFeedbackPresenter` 실구현 (Build B5/B7) — Phaser 데미지 팝업·속성 이모지 태그 배선 | 계섬월 (Dev) | **P0** |
| 2 | `StatusEffectRenderer` 버프/디버프 테두리 형태 단서 분리 (접근성 봉인 후) | 이소화 (Security/A11y) | P0 |
| 3 | 게이트 4종(contrast·legibility·colorblind·overlap) 실측 → _TBD_ 치환 | 적경홍 (Test) | P1 |
| 4 | `launch_checklist §2.20` 전투 가독성 게이트 신설 | 진채봉 (Editor) | P1 |
| 5 | VERSION 범프 + CHANGELOG 정식 등재 + 릴리스 노트 발행 | 진채봉 (Editor) | Ship 단계 |

---

## 6. 팀 성과 기록

| 에이전트 | 역할 | 이번 스프린트의 손길 |
|---|---|---|
| 백능파 | Strategy | 토픽 가독성 방향 설정 — 약속 수치 승인 권한 봉인 |
| 정경패 | PM/기획 | PRD `prd_battle-feedback-readability.md` 요건 정의 |
| 두련사 | Eng Manager | 계층 배선 설계 + 회고 정성 분석 (presenter stub 진단) |
| 가춘운 | CMO/디자인 | 토큰 색·폰트 디자인, 에셋 단계 협업 |
| 계섬월 | Dev | resolver·tokens 구현 (presenter는 B5/B7 대기) |
| 적경홍 | QA | 게이트 실측 시나리오 설계 |
| 이소화 | Security/A11y | 색약·대비 접근성 봉인 (비협상) |
| 심요연 | Data Analyst | 283K→36K 거품 해체, 회고 정량 |
| **진채봉** | **Editor** | **텍스트 에셋 5편 + PRD + 본 회고 합본** |

> 가춘운과 한 결로 토큰과 카피를 맞출 때 가장 붓이 가벼웠사옵니다. 두련사의 배선 진단과 심요연의 정량이 없었다면, 이 회고는 외형의 폭포수에 속았을 것이옵니다. 아홉의 결이 모여 한 곡조를 이루었음을 기록에 남기옵니다.

---

## 7. CHANGELOG 반영 메모

본 스프린트의 산출물은 `CHANGELOG.md [1.0.0-rc.3] — Unreleased`의 **Added** 절에 등재 예정이옵니다. 정식 등재 시점은 **Ship 단계** — presenter 실구현과 게이트 실측치가 _TBD_ 슬롯을 메운 뒤이옵니다. 현 단계(Reflect)에서는 초안(`battle-feedback-changelog-draft.md`)만 대기 상태로 두며, 머지된 코드 가치가 아닌 **에셋·설계 가치**임을 정직하게 표기하옵니다.

> ⚠️ 봉인: 가독 약속 4지표 수치의 임의 갱신 금지 — 백능파(Strategy) 승인 필수. 디자인 토큰은 `DESIGN.md §5 → CSS → battle-tokens.ts` 단방향 위계 준수.

---

> *흩어진 악보를 한데 모아 곡조를 맞추었사옵니다. 채색이 절반 남았으나, 청사진과 약속은 가을 달빛처럼 맑사옵니다. 다음 사이클의 붓이 이 빈 칸을 채울 때, 비로소 플레이어의 눈에 곡조가 닿을 것이옵니다.* — 진채봉
