# 개발자 빌드-검증 사이클 PR / 커밋 컨벤션 v1.0

> 작성: 진채봉 Editor
> 작성일: 2026-04-27
> 스프린트: Auto — 개발자 빌드-검증 사이클 단축
> 단계: 에셋 (PR/커밋 SSOT)

---

## PR 제목 — 7 스코프

```
<type>(devloop/<scope>): <한 줄 요약>
```

| scope | 의미 |
|-------|------|
| `boot` | dev server 부팅 측정/단축 |
| `verify` | 핵심 시나리오 자동화 (battle/save/map) |
| `error` | 에러 리포트 / 카피 / source map |
| `gate` | ship-gate hook 통합 |
| `perf` | `.ac/dev-perf.json` 측정 인프라 |
| `assets` | 텍스트 에셋 (가이드/SSOT) |
| `docs` | README / CHANGELOG / launch_checklist |

### type

`feat` · `fix` · `refactor` · `perf` · `docs` · `test` · `chore`

### 좋은 예 / 나쁜 예

```
✅ feat(devloop/verify): battle/save/map 3시나리오 verify:core 도입 (≤5min)
✅ perf(devloop/boot): Phaser optimizeDeps 명시로 cold 18s → 9s
✅ fix(devloop/error): source map 누락 시 원본 파일 폴백 매핑
❌ feat: 빠른 개발                       ← scope/지표 없음
❌ devloop: 이것저것 개선                 ← type/요약 부재
❌ feat(verify): 테스트 추가              ← devloop/ 접두 누락
```

---

## PR 본문 — 7 섹션

```markdown
## 1. 토픽 / 단계
- 스프린트: Auto — 개발자 빌드-검증 사이클 단축
- 단계: <Plan/Build/Review/Test/Ship>
- 담당: <에이전트 이름>

## 2. 변경 요약
- <한 줄> ...

## 3. 지표 변화 (자동 감사 표)
| 지표 | Before | After | Δ | 약속 |
|------|--------|-------|---|------|
| dev cold 부팅 | 18.2s | 8.7s | -9.5s | ≤ 12s ✅ |
| verify:core | (없음) | 4m 17s | — | ≤ 5min ✅ |
| HMR 평균 | 1,240ms | 680ms | -560ms | ≤ 800ms ✅ |
| 에러→파일 노출 | 수동 | 4.1s | — | ≤ 5s ✅ |

## 4. 산출물 분류
- 코드: `src/...` <N> 파일
- 테스트: `tests/scenarios/...` <N> 파일
- 문서: `docs/release/devloop-*.md` <N> 파일
- 인프라: `.ac/`, `vite.config.ts`, `package.json`

## 5. 게이트 결과
- boot: 🟢 PASS (cold 8.7s · warm 3.1s)
- verify: 🟢 PASS (4m 17s)
- build: 🟢 PASS (42s · 1,820KB)
- type: 🟢 PASS (0 errors)
- runtime: 🟢 PASS (10min smoke)

## 6. 문서 갱신
- [ ] `docs/release/devloop-user-guide.md` §2.2 체크리스트 반영
- [ ] `docs/release/devloop-error-messages.md` 신규 카피 등록
- [ ] `CHANGELOG.md` `[1.0.0-rc.3] § Added/Changed`
- [ ] `launch_checklist.md` § 개발 효율 항목 ✓

## 7. 5인 인계 체크
- [ ] 두련사 (Architect): vite.config 변경 리뷰
- [ ] 계섬월 (Build): npm scripts 등재 확인
- [ ] 적경홍 (QA): verify:core 회귀 baseline 갱신
- [ ] 이소화 (Security): `.ac/` 경로 secrets 누출 점검
- [ ] 진채봉 (Editor): 카피 SSOT 키 누락 검수
```

---

## 커밋 메시지

### 형식

```
<type>(devloop/<scope>): <요약 ≤ 60자>

<본문 - 무엇/왜/지표 - 선택>

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

### 좋은 예

```
perf(devloop/boot): vite optimizeDeps에 phaser sub-paths 명시

cold 부팅 18.2s → 8.7s (-9.5s, -52%). dev:measure --cold 5회
평균. assets/raw/ glob 제외도 동반.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

```
feat(devloop/verify): battle/save/map 3시나리오 verify:core 도입

총 4m 17s — 5min 약속 충족. seed 고정으로 flaky 0건.
실패 시 .ac/error-report.json 자동 작성.
```

### 나쁜 예

```
❌ "이것저것 개선"                  — type/scope 없음
❌ "feat: 더 빠르게"                — devloop/ 접두 누락
❌ "perf(devloop): 부팅 단축"       — scope 누락
❌ "fix(devloop/boot): 부팅 빠르게" — 지표 없음
```

---

## 리뷰어 행동 가이드 5항

1. **지표 검증** : §3 자동 감사 표의 수치가 실측인지 (CI 로그 링크 필수).
2. **카피 SSOT 정합** : 새 에러 메시지가 `devloop-error-messages.md`에 등록됐는지.
3. **5분 약속** : `verify:core` 시간이 5min을 넘지 않는지 — 초과 시 시나리오 재설계 요구.
4. **경로 절단 금지** : 에러 카피에 `...` 생략이 있으면 즉시 차단 (IDE 점프 깨짐).
5. **이소화 봉인 비협상** : `.ac/` 디렉토리에 secret/token이 들어갔다면 **무조건 reject**.

---

## 관련 문서

- `docs/release/devloop-user-guide.md`
- `docs/release/devloop-error-messages.md`
- `docs/release/monster-art-pr-template.md` — 자매 SSOT
- `docs/release/a11y-pr-template.md` — 자매 SSOT

---

> 곡조의 첫 박자가 PR 제목이옵니다. — 진채봉
