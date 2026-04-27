# README §🎓 첫 30분 절 — 골격 SSOT v1.0

> 작성: 진채봉 Editor
> 작성일: 2026-04-28
> 스프린트: Auto — 에테르나 크로니클 튜토리얼·온보딩 첫 30분 경험 설계
> 단계: 에셋 (README 골격 SSOT)
> 본 골격은 `README.md` 본문에 통합 예정 — 통합 위치: `📈 개발 현황 ↔ 🎵 사운드 시스템` 사이 (Phase 52 콘텐츠 다음 자리)
> 약속 수치 임의 갱신 금지 — 백능파 Strategy 승인 필수

---

## 1. 절 이름과 위치

```
README.md 흐름:
  ⚡ 개발 효율
  📈 개발 현황
  🎓 첫 30분          ← ★ 여기 신설
  🎵 사운드 시스템
  🎮 핵심 시스템
  ...
```

이름: `🎓 첫 30분 — 신규 플레이어 학습 보장`

---

## 2. 절 본문 — 통합용 마크다운 (그대로 README에 붙여넣기)

```markdown
## 🎓 첫 30분 — 신규 플레이어 학습 보장

> 처음 만나는 자가 30분 안에 다섯 곡조(이동·대화·전투·스킬·세이브)를 익히고 첫 보스를 베도록, 한 자락 텍스트 길을 깔았사옵니다.

### 한눈 지표

| 지표 | 약속 | 측정 |
|------|------|------|
| 핵심 5종 학습 커버리지 | **100%** | `npm run verify:tutorial` |
| 튜토리얼 누적 길이 | **≤ 30:00** | `.ac/tutorial-perf.json` (5회 평균) |
| 첫 보스 처치율 | **≥ 90%** | 1회차 진입자 기준 |
| 30분 이탈률 | **≤ 15%** | 비트 ① ↔ 비트 ⑦ 도달 차이 |

> 약속 수치 임의 갱신 금지 — 백능파(Strategy) 승인 필수.

### 빠른 시작 (3 명령)

```bash
npm run dev:fast              # Phaser dev server (≤ 8s)
npm run verify:tutorial        # 5종 학습 게이트 5회 자동 검증
npm run verify:tutorial-copy   # 24개 카피 슬롯 ko/en 누락 검증
```

### 핵심 비트 3종 (자세한 흐름은 가이드 §1)

| 비트 | 시간 | 학습 |
|-----|-----|-----|
| ② 이동·대화 | 3:00~7:00 | move + dialog |
| ③ 첫 전투 | 7:00~12:00 | battle (ATB 1개념) |
| ⑤ 세이브 | 17:00~20:00 | save (slot 1 강제) |

> 전체 7비트 + 게이트 5종 + 카피 24슬롯은 본문 SSOT 참조:

### 자세한 가이드

- 📘 [사용자 가이드 — 첫 30분](docs/release/tutorial-onboarding-user-guide.md) (1차 SSOT)
- 🌏 [코칭/에러 카피 SSOT](docs/release/tutorial-onboarding-error-messages.md) (24슬롯 ko/en)
- 🛠️ [PR/커밋 컨벤션](docs/release/tutorial-onboarding-pr-template.md)
- ♿ [접근성 인게임 카피](docs/release/a11y-ingame-copy.md) (자막·ARIA)

### ship-gate 3-AND (예고)

머지 가능 조건 — 세 가닥 모두 통과:

1. **5종 학습 커버리지 100%** — `npm run verify:tutorial` 🟢
2. **누적 5회 평균 ≤ 30:00** — `.ac/tutorial-perf.json` 🟢
3. **카피 i18n 100%** — `npm run verify:tutorial-copy` 🟢

> 한 가닥이라도 끊기면 봉인 — 이소화(Security) 비협상.
```

---

## 3. 선택 배지 2종 (README 상단 배지 줄에 추가 권장)

```markdown
[![Tutorial Coverage](https://img.shields.io/badge/Tutorial%20Coverage-100%25-brightgreen?style=for-the-badge)](#-첫-30분--신규-플레이어-학습-보장)
[![Tutorial Length](https://img.shields.io/badge/First%2030min-≤30:00-blue?style=for-the-badge)](#-첫-30분--신규-플레이어-학습-보장)
```

---

## 4. 통합 절차

| # | 단계 | 책임 | 검증 |
|---|------|------|------|
| 1 | README.md `📈 개발 현황` 절 끝에 빈 줄 + `## 🎓 첫 30분` 삽입 | 진채봉 | git diff 1줄짜리 마커 확인 |
| 2 | §2 본문 그대로 붙여넣기 | 진채봉 | markdown lint 0 error |
| 3 | 상단 배지 줄에 §3 두 배지 추가 | 진채봉 | 배지 렌더 시각 확인 |
| 4 | 메아리 검증 — `tutorial-onboarding-user-guide.md §1` 흐름도와 §6 비트 표가 README §🎓 본문과 일치 | 정경패 | 표 4행 동기 |
| 5 | 약속 수치 변경 시 — 가이드 §1 흐름도와 §6 비트 표를 동시 갱신 | 백능파 승인 | 3중 동기 검증 |

---

## 5. 메아리 정책 (단방향 미러)

```
[1차 SSOT] tutorial-onboarding-user-guide.md
    │
    ▼ (단방향 미러 — 사람이 읽는 정본 → README 메아리)
[2차 미러] README.md §🎓 첫 30분
    │
    ▼ (단방향 미러)
[3차 코드] src/constants/tutorial_coach_messages.ts (24슬롯)
```

> 절대 코드 → 문서 역방향 갱신 금지. README → 가이드 역방향 갱신도 금지.

---

## 6. 통합 후 검증 체크리스트

- [ ] README §🎓 절이 정확히 한 번만 존재
- [ ] 한눈 지표 4행이 가이드 §8과 동일
- [ ] 빠른 시작 3명령이 `package.json` scripts와 일치
- [ ] 핵심 비트 3종 표 4행이 가이드 §6 비트 표 ②·③·⑤과 동일
- [ ] 자세한 가이드 4링크 모두 살아 있음 (404 0건)
- [ ] ship-gate 3-AND 문구가 PR 템플릿 §5와 글자 단위로 일치
- [ ] 배지 2종 렌더 정상 (shields.io 4xx 0건)

---

## 7. 관련 문서

- `tutorial-onboarding-user-guide.md` — 1차 SSOT 본문
- `tutorial-onboarding-error-messages.md` — 카피 SSOT
- `tutorial-onboarding-pr-template.md` — PR/커밋 컨벤션
- `tutorial-onboarding-changelog-draft.md` — CHANGELOG 항목 초안
- `devloop-readme-skeleton.md` · `sound-system-readme-skeleton.md` — 동일 패턴 선례

---

> README는 첫 인사이옵니다. 한 줄이라도 정본과 어긋나면, 신규 플레이어가 먼저 길을 잃사옵니다.
