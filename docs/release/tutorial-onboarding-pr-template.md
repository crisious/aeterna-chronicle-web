# 첫 30분 튜토리얼·온보딩 PR / 커밋 메시지 컨벤션 v1.0

> 작성: 진채봉 Editor
> 작성일: 2026-04-28
> 스프린트: Auto — 에테르나 크로니클 튜토리얼·온보딩 첫 30분 경험 설계
> 단계: 에셋 (PR/커밋 메시지 SSOT)
> 기존 컨벤션 호환: `devloop-pr-template.md`, `sound-system-pr-template.md`

---

## 1. PR 제목 컨벤션

### 1.1 형식

```
<type>(<scope>): <50자 이내 한 줄 요지>
```

### 1.2 7개 스코프

| 스코프 | 의미 | 예시 |
|-------|------|------|
| `cinematic` | 오프닝 시네마틱 (비트 ①) | `feat(cinematic): 오프닝 5컷 + 스킵·재시청 추가` |
| `coach` | 코칭 오버레이 (비트 ②~⑤) | `feat(coach): move 게이트 5초 카운트다운 도입` |
| `beat` | 비트 흐름 제어 | `fix(beat): ⑤ 세이브 강제 진입 race condition 해소` |
| `boss` | 첫 보스 — 망각의 잔영 (비트 ⑥) | `feat(boss): P2 광역기 + 아이템 버튼 깜빡임` |
| `gate` | 5종 학습 게이트 판정 | `fix(gate): skill BLOCK 판정 mp<5 오프바이원` |
| `copy` | 카피 SSOT (24슬롯) | `docs(copy): coach.battle.pass.first_kill ko/en 정정` |
| `docs` | 가이드·README·CHANGELOG | `docs(docs): tutorial-onboarding-user-guide v1.0 추가` |

### 1.3 Type 어휘

- `feat` — 새 기능 (비트/코칭/보스 추가)
- `fix` — 버그 수정 (게이트 오판정, 카피 오타)
- `docs` — 문서 (본 SSOT 4종 갱신)
- `refactor` — 동작 동일, 구조 개선
- `test` — 게이트 검증 테스트 추가
- `perf` — 30분 길이 단축 최적화
- `revert` — 봉인 또는 회귀 복구

---

## 2. PR 본문 — 7개 섹션 템플릿

```markdown
## 🎯 토픽
첫 30분 튜토리얼·온보딩 — <비트 / 게이트 / 카피 슬롯>

## 📊 자동 감사 (Before / After / Δ / 약속)

| 지표 | Before | After | Δ | 약속 |
|-----|--------|-------|---|-----|
| 5종 학습 커버리지 | _% | _% | _ | **100%** |
| 튜토리얼 길이 (5회 평균) | _s | _s | _ | **≤ 1800s** |
| 첫 보스 처치율 | _% | _% | _ | **≥ 90%** |
| 30분 이탈률 | _% | _% | _ | **≤ 15%** |
| 카피 i18n 커버리지 | _% | _% | _ | **100%** |

> 측정: `.ac/tutorial-perf.json` (5회 평균) · `npm run verify:tutorial`

## 📦 산출물 분류

- 코드: `client/src/scenes/tutorial/<file>.ts` — _ LOC
- 카피: `tutorial-onboarding-error-messages.md` — _ 슬롯 갱신
- 문서: `tutorial-onboarding-user-guide.md §_` — _ 줄

## ✅ 게이트 결과

- [ ] 🟢 5종 학습 커버리지 = 100%
- [ ] 🟢 누적 5회 평균 ≤ 30:00
- [ ] 🟢 카피 ko + en 동시 채워짐 (hint 선택)
- [ ] 🟢 키 규약 `coach.<gate>.<state>.<reason>` 100%
- [ ] 🟢 톤 5계명 통과 (명령형 0건, 시 본문 0건, 수치 누락 0건)
- [ ] 🟢 스킵 거버넌스 — 비트 ②~⑤ 스킵 노출 0건

## 🎓 학습 약속 변경 여부
- [ ] 변경 없음 — `tutorial-onboarding-user-guide.md §6` 비트 표 그대로
- [ ] 변경 있음 — 백능파 Strategy 승인 댓글 첨부 ☞ ____

## 🌏 i18n
- [ ] ko 새 슬롯: _ 개
- [ ] en 새 슬롯: _ 개
- [ ] 누락 0건 (`npm run verify:tutorial-copy` 🟢)

## 👥 5인 인계 체크
- [ ] **백능파** (Strategy) — 약속 수치 동의 ☑
- [ ] **두련사** (Architect) — 비트 흐름 상태머신 검토 ☑
- [ ] **계섬월** (Build) — 코칭 오버레이 구현 호환 ☑
- [ ] **정경패** (Review) — 톤·문법·30분 길이 정합 ☑
- [ ] **이소화** (Security) — 스킵 거버넌스·세이브 검증 ☑
```

---

## 3. 커밋 메시지 — 좋은 예 / 나쁜 예

### 3.1 좋은 예 ✅

```
feat(coach): skill BLOCK 슬롯 mp<5 카피 + 우선순위 hint 추가

- coach.skill.block.no_mp: ko/en 동시 채움
- hint: "MP가 ½ 미만일 땐 기본 공격이 곡조에 맞사옵니다"
- src/constants/tutorial_coach_messages.ts 미러 갱신
- verify:tutorial-copy 🟢 (24/24 슬롯)

Refs: tutorial-onboarding-error-messages.md §4.2
```

```
fix(beat): ⑤ 세이브 강제 진입 — Esc 누르면 메뉴 닫히던 버그 봉인

- 비트 ⑤ 진행 중 Esc 차단 (TutorialState === 'save_required')
- 누적 5회 평균 길이 28:42 → 28:51 (+9s, 약속 30:00 내)
- e2e: tutorial.spec.ts → 'must save before proceeding' 🟢

Refs: tutorial-onboarding-user-guide.md §5.2
```

```
docs(copy): 톤 5계명 위반 1건 정정 — 명령형 → 권유형

- coach.move.block.idle:
  Before: "움직여라. 5초 동안 멈춰 있다."
  After:  "5초 동안 한 걸음도 떼지 않으셨사옵니다. WASD 또는 방향키로 움직여 보소서."
- ko 1슬롯 갱신, en 변동 없음
- 가춘운(CMO) 톤 협의 완료

Refs: tutorial-onboarding-error-messages.md §1.2
```

### 3.2 나쁜 예 ❌

```
update tutorial         ← 무엇을 어떻게 바꾸었는지 없음
```

```
feat: add tutorial      ← 스코프 없음, 한국어 톤 없음
```

```
fix(coach): 카피 수정    ← 어떤 슬롯·게이트인지 모호, 수치 없음
```

```
[튜토리얼] 보스 약화      ← type/scope 누락, 약속 위반 여부 불명
```

---

## 4. 리뷰어 행동 가이드 5항

| # | 가이드 | 누가 |
|---|------|------|
| 1 | **약속 수치 검증** — Before/After/Δ가 약속을 위반하지 않는지 5초 안에 판단 | 백능파 |
| 2 | **비트 흐름 상태 검토** — 비트 ②~⑤ BLOCK 처리가 race condition 없는지 | 두련사 |
| 3 | **30분 길이 정합** — 누적 5회 평균이 ≤ 30:00 인지, 초과 시 보스 HP 5% 하향 트리거 | 정경패 |
| 4 | **톤 5계명** — 한 화면 1개념·권유형·수치 사실·시는 hint만·키 규약 | 진채봉 (본인) + 가춘운 |
| 5 | **스킵 거버넌스 (비협상)** — 비트 ②~⑤ 스킵 노출 0건, NG+에서만 스킵 허용 | **이소화** |

> 5번은 **이소화 봉인 비협상**이옵니다. 회차 첫 진입자에게 스킵 버튼이 한 번이라도 보이면, 어떤 사정이라도 머지 거부.

---

## 5. ship-gate 3-AND

머지 가능 조건 — 세 가닥 모두:

```
① 5종 커버리지 100% (npm run verify:tutorial 🟢)
   AND
② 누적 5회 평균 ≤ 30:00 (.ac/tutorial-perf.json)
   AND
③ 카피 i18n 100% (npm run verify:tutorial-copy 🟢)
```

한 가닥이라도 끊기면 PR 머지 거부 — 자동 봇이 BLOCK 라벨을 붙이옵니다.

---

## 6. 봉인(revert) 트리거

다음 중 하나라도 머지 후 발견 시 즉시 revert:

| # | 트리거 | 책임 |
|---|------|------|
| 1 | 첫 회차 진입자에게 비트 ②~⑤ 스킵 노출 | 이소화 (즉시) |
| 2 | 누적 5회 평균 길이 ≥ 33:00 | 정경패 (1일 내) |
| 3 | 5종 학습 커버리지 < 95% | 백능파 (1일 내) |
| 4 | 카피 ko 또는 en 누락 | 진채봉 (즉시) |

---

## 7. 관련 문서

- `tutorial-onboarding-user-guide.md` — 1차 SSOT 본문
- `tutorial-onboarding-error-messages.md` — 카피 SSOT (24슬롯)
- `tutorial-onboarding-readme-skeleton.md` — README 절 골격
- `tutorial-onboarding-changelog-draft.md` — CHANGELOG 항목 초안
- `devloop-pr-template.md` · `sound-system-pr-template.md` — 동일 패턴 선례

---

> 곡조에 맞는 PR이라야 머지가 깨끗하옵니다. 한 줄 제목·일곱 절 본문·다섯 인계 — 이 셋을 어기지 마옵소서.
