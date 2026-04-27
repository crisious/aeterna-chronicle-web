# 첫 30분 튜토리얼·온보딩 — CHANGELOG 항목 초안 v1.0

> 작성: 진채봉 Editor
> 작성일: 2026-04-28
> 스프린트: Auto — 에테르나 크로니클 튜토리얼·온보딩 첫 30분 경험 설계
> 단계: 에셋 (CHANGELOG 항목 초안)
> 본 초안은 `CHANGELOG.md [1.0.0-rc.4] — Unreleased` 절에 머지될 예정
> 슬롯 _TBD_는 Build/Review/Ship 단계에서 실측 수치로 메우소서

---

## 1. 머지 위치

`CHANGELOG.md` 상단의 `## [1.0.0-rc.4] — Unreleased` 절 (없으면 신설) 아래 `### Added` 항목에 본 초안을 통째로 삽입하옵니다.

---

## 2. 항목 본문 (그대로 CHANGELOG에 붙여넣기)

```markdown
- **에테르나 크로니클 첫 30분 튜토리얼·온보딩 — 텍스트 에셋 묶음 v1.0** (Sprint Auto-Tutorial-Onboarding, 2026-04-28) — 진채봉 Editor 합본 정리
  - Phase 52에서 콘텐츠 728/728 · 어셋 1,454편을 갖췄으나, 첫 진입자가 ATB 전투/스킬/파티 시스템을 익힐 가이드가 비어 있어 손이 멎던 결을 메우고자, 사람 손에 잡히는 텍스트 에셋 5편 + README §🎓 첫 30분 절을 묶어 두옵니다.
  - 30분 약속: 핵심 시스템 5종(이동/대화/전투/스킬/세이브) 학습 커버리지 **100%** · 튜토리얼 누적 길이 **≤ 30:00** · 첫 보스 처치율 **≥ 90%** · 30분 이탈률 **≤ 15%** — `launch_checklist §2.20` SSOT 신설 예정
  - 산출물 5건 / 총 ~_TBD_ LOC — 에셋 단계 완료, Build(계섬월) 인계
  - **README §🎓 첫 30분 절 통합 예정** (`README.md` 📈 개발 현황 ↔ 🎵 사운드 시스템 사이) — 한눈 지표 4지표 표 · 빠른 시작 3명령 · 핵심 비트 3종 표 · 자세한 가이드 링크 4개 · ship-gate 3-AND 예고
  - **첫 30분 튜토리얼·온보딩 사용자 가이드 v1.0** (`docs/release/tutorial-onboarding-user-guide.md`) — 진채봉 Editor
    - 10개 절 + FAQ 7건 — 한 손 흐름도(오프닝 → 코칭 → 첫 전투 → 스킬 → 세이브 → 첫 보스 → 결말) · 5종 학습 약속 표 · 30분 비트 표 7행 · 보스 페이즈 P1/P2 코칭 카피 · 스킵·재시청·접근성 정책
    - 본 문서가 1차 SSOT — `README.md §🎓 첫 30분` 메아리, 약속 수치 변경 시 §1 흐름도와 §6 비트 표를 동시 갱신
  - **첫 30분 코칭/에러 카피 SSOT v1.0** (`docs/release/tutorial-onboarding-error-messages.md`) — 진채봉 Editor
    - 5종 게이트(move · dialog · battle · skill · save) × 4 상태(PASS/BLOCK/WARN/ERROR) = **20개 카피 슬롯** + 보조 4슬롯(시네마틱·보스 P2·승리·30분 초과) = **24슬롯** (ko/en 동시 = 48줄)
    - 키 규약 `coach.<gate>.<state>.<reason>` · 코드 상수 매핑 (계섬월 인계용 `src/constants/tutorial_coach_messages.ts` 스니펫)
    - 톤 5계명: 한 화면 1개념 · 권유형(~소서/~지요) · 수치는 사실 · 시는 hint만 · 도메인 키 규약
  - **첫 30분 PR / 커밋 메시지 컨벤션 v1.0** (`docs/release/tutorial-onboarding-pr-template.md`) — 진채봉 Editor
    - PR 제목 7 스코프 (`cinematic`/`coach`/`beat`/`boss`/`gate`/`copy`/`docs`)
    - PR 본문 7개 섹션 — 자동 감사 표(Before/After/Δ/약속) · 산출물 분류 · 게이트 결과 · 학습 약속 변경 여부 · i18n · 5인 인계 체크
    - 커밋 메시지 좋은 예 / 나쁜 예 + 리뷰어 행동 가이드 5항 (이소화 봉인 비협상 — 회차 첫 진입자 스킵 노출 0건) + ship-gate 3-AND
  - **README §🎓 첫 30분 절 — 골격 SSOT v1.0** (`docs/release/tutorial-onboarding-readme-skeleton.md`) — 진채봉 Editor
    - `README.md §🎓 첫 30분` 신설 골격 — 한눈 지표 4지표 표 · 빠른 시작 3명령 · 핵심 비트 3종 표 · 자세한 가이드 링크 4개 · ship-gate 3-AND 예고
    - 약속 수치 임의 갱신 금지 — 백능파(Strategy) 승인 필수 명시
    - 선택 배지 2종 (`Tutorial Coverage 100%` · `First 30min ≤30:00`) 추가 안내
  - **첫 30분 CHANGELOG 항목 초안 v1.0** (`docs/release/tutorial-onboarding-changelog-draft.md`) — 진채봉 Editor
    - 본 항목의 출전 — 9단계 Auto 스프린트가 진행됨에 따라 Build/Review/Ship 단계에서 실측 수치로 _TBD_ 슬롯을 메우도록 가이드
```

---

## 3. _TBD_ 슬롯 — 단계별 채움 가이드

| _TBD_ | 단계 | 누가 | 채움 방법 |
|-------|-----|------|---------|
| 총 LOC | Build (계섬월) | 계섬월 | `git diff --shortstat` × 5편 합산 |
| 5종 커버리지 % | Test (적경홍) | 적경홍 | `npm run verify:tutorial` 5회 평균 |
| 누적 길이 (분:초) | Test (적경홍) | 적경홍 | `.ac/tutorial-perf.json` 5회 평균 |
| 첫 보스 처치율 % | Test (적경홍) | 적경홍 | 1회차 진입자 기준 베타 데이터 |
| 30분 이탈률 % | Test (적경홍) | 적경홍 | 비트 ① ↔ 비트 ⑦ 도달 차이 |
| 카피 i18n 슬롯 수 | Review (정경패) | 정경패 | ko + en 누락 0 확인 후 24 확정 |

---

## 4. v1.0.0-rc.3 → rc.4 승급 트리거

본 항목이 CHANGELOG에 머지되면 자동으로 다음 절차가 도는 게 곡조에 맞사옵니다:

1. `VERSION` 파일: `1.0.0-rc.3` → `1.0.0-rc.4`
2. `CHANGELOG.md` 상단: `## [1.0.0-rc.4] — Unreleased` 절 신설 (이미 있으면 본 항목 삽입)
3. 머지 PR 라벨: `release-candidate`, `tutorial-onboarding`
4. 자동 트윗 (가춘운 협업) — "30분 안에 첫 매듭을 푸시옵소서" 카피 + Tutorial Coverage 100% 배지 캡처

---

## 5. 톤 — 진채봉 Editor 곡조

다른 항목들과 결을 맞추되 본 토픽 특유의 결을 살리옵니다:

- "메우고자" — 빈 자리 메우는 동작
- "묶어 두옵니다" — 합본 정리의 결
- "한 손 흐름도" / "한 화면 1개념" — 인지 부담 분산
- "다섯 곡조" — 5종 시스템의 운율
- "봉인" — 이소화 비협상 정책

---

## 6. 머지 후 후속 작업 (이번 스프린트 안에)

- [ ] `launch_checklist.md §2.20 튜토리얼 게이트` 신설 — 10개 체크 항목 (오프닝 스킵·5종 BLOCK·24슬롯·30분·이탈률·재시청·NG+ 스킵·접근성·자동 조정·ship-gate)
- [ ] `package.json` scripts 추가 — `verify:tutorial`, `verify:tutorial-copy`
- [ ] `.ac/tutorial-perf.json` 스키마 정의 — 5회 평균 / 비트별 시간 / 게이트별 BLOCK 횟수
- [ ] 적경홍(QA) 인계 — 첫 보스 처치율 & 30분 이탈률 측정 게이트 구성
- [ ] 가춘운(CMO) 협업 — 30분 영상 트레일러 카피 30초 (한 화면 1개념 톤 유지)

---

## 7. 관련 문서

- `tutorial-onboarding-user-guide.md` — 1차 SSOT 본문
- `tutorial-onboarding-error-messages.md` — 카피 SSOT (24슬롯)
- `tutorial-onboarding-pr-template.md` — PR/커밋 컨벤션
- `tutorial-onboarding-readme-skeleton.md` — README 절 골격
- `CHANGELOG.md` — 본 초안의 머지 대상
- `devloop-changelog-draft.md` · `sound-system-changelog-draft.md` — 동일 패턴 선례

---

> CHANGELOG는 우리가 어디까지 곡조를 엮었는지 보이는 자리이옵니다. 한 줄이라도 거짓으로 적으시면, 다음 회고에서 심요연 Analyst의 화살이 닿사옵니다.
