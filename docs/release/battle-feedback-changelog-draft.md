# ⚔️ CHANGELOG 항목 초안 — 전투 피드백 가독성 v1.0

> 작성: 진채봉 Editor
> 작성일: 2026-06-20
> 스코프: `CHANGELOG.md` `[1.0.0-rc.3] — Unreleased` 절에 추가할 항목 초안
> 사용 흐름: 본 초안을 검토 → `CHANGELOG.md` Added 절에 그대로 붙여넣기

---

## Added (추가) 항목 — 그대로 붙여넣기

```markdown
- **에테르나 크로니클 전투 피드백 가독성 — 텍스트 에셋 묶음 v1.0** (Sprint Auto-Battle-Feedback-UX, 2026-06-20) — 진채봉 Editor 합본 정리
  - Phase 52까지 전투 시스템은 갖췄으나 데미지·상태이상 표시가 색상 의존적이라, 색약 플레이어(인구 약 8%)와 빠른 연타 구간에서 정보가 묻히던 결을 메우고자 텍스트 에셋 5편을 묶어 두옵니다.
  - 가독 약속 4지표: 데미지·상태 명도 대비 **텍스트 ≥7:1 / 아이콘 ≥3:1 (WCAG AAA)** · 전투 텍스트 최소 폰트 **≥14px (데미지 28px)** · 색약 비색상 단서 커버리지 **100%** · 데미지 팝업 체류 **≥900ms · 겹침 0** — `launch_checklist §2.20` SSOT 신설 예정
  - 산출물 5건 — 에셋 단계 → Build(계섬월) 인계 완료
  - **전투 피드백 가독성 사용자 가이드 v1.0** (`docs/release/battle-feedback-user-guide.md`) — 진채봉 Editor
    - 9개 절 + FAQ 8건 — 한 손 흐름도(타격 → 팝업 → 속성 태그 → 상태이상 → 게이트) · 데미지 결과 7종 색/폰트 표 · 속성 6종 이모지 매핑 표 · 상태이상 전투 15종(지속피해 3/봉쇄 4/저하 3/강화 5) 표 · 가독성 4약속
    - 본 문서가 1차 SSOT — `README.md §⚔️ 전투 피드백 가독성` 메아리, 약속 수치 변경 시 §1 흐름도 동시 갱신
  - **전투 피드백 가독성 에러 메시지 카피 SSOT v1.0** (`docs/release/battle-feedback-error-messages.md`) — 진채봉 Editor
    - 4종 게이트(contrast · legibility · colorblind · overlap) × 4 상태(PASS/BLOCK/WARN/ERROR) = **16개 카피 슬롯** (ko/en 동시 = 32줄)
    - 키 규약 `battle.feedback.<gate>.<state>.<reason>` · 코드 상수 매핑 (계섬월 인계용 `client/src/constants/battle_feedback_gate_messages.ts` 스니펫)
    - 톤 5계명: 원인→처방 · 수치는 사실 · 경로 절단 금지 · 시는 hint만 · 도메인 키 규약
  - **전투 피드백 가독성 PR / 커밋 메시지 컨벤션 v1.0** (`docs/release/battle-feedback-pr-template.md`) — 진채봉 Editor
    - PR 제목 6 스코프 (`damage`/`status`/`contrast`/`colorblind`/`gate`/`docs`)
    - PR 본문 7개 섹션 — 자동 감사 표(Before/After/Δ/약속) · 산출물 분류 · 디자인 토큰 SSOT 위계 정합 · 접근성 약속 · i18n · 5인 인계 체크
    - 커밋 메시지 좋은 예 / 나쁜 예 + 리뷰어 행동 가이드 5항 (이소화 접근성 봉인 비협상 명시) + 3-AND 머지 게이트
  - **README 전투 피드백 가독성 절 — 골격 SSOT v1.0** (`docs/release/battle-feedback-readme-skeleton.md`) — 진채봉 Editor
    - `README.md §⚔️ 전투 피드백 가독성` 신설 골격 — 한눈 지표 4지표 표 · 빠른 시작 3명령 · 핵심 표시 요소 3종(데미지 7/속성 6/상태 15) 표 · 자세한 가이드 링크 4개 · ship-gate 3-AND 예고
    - 약속 수치 임의 갱신 금지 — 백능파(Strategy) 승인 필수 명시
    - 선택 배지 2종 (`Battle Contrast AAA` · `Colorblind Cues 100%`) 추가 안내
  - **전투 피드백 가독성 CHANGELOG 항목 초안 v1.0** (`docs/release/battle-feedback-changelog-draft.md`) — 진채봉 Editor
    - 본 항목의 출전 — 9단계 Auto 스프린트가 진행됨에 따라 Build/Review/Ship 단계에서 실측 수치로 _TBD_ 슬롯을 메우도록 가이드
```

---

## Changed (변경) 항목 — 후속 단계에서 추가될 후보

> 본 절은 Build·Test·Ship 단계에서 다음 항목들이 확정되면 등재합니다. 현재는 후보 목록만.

```markdown
- **CHANGELOG 후보**: README.md §⚔️ 전투 피드백 가독성 절 신설 (위 골격 SSOT 적용 시)
- **CHANGELOG 후보**: launch_checklist.md §2.20 전투 가독성 게이트 신설 (4종 게이트 체크 항목)
- **CHANGELOG 후보**: package.json scripts에 `battle:*` 6종 추가 (계섬월 Build 단계)
- **CHANGELOG 후보**: battle-tokens.ts §1 damage miss/resist/immune 외곽선 토큰 추가 (대비 보강)
- **CHANGELOG 후보**: BattleScene 데미지 팝업 속성 이모지 태그 배선 (formatDamageTypeTag 연결)
- **CHANGELOG 후보**: StatusEffectRenderer 버프/디버프 테두리 형태 단서 분리 (이소화 접근성 봉인 후)
```

---

## 통계 — 현재 스프린트 산출물

| 항목 | 수치 |
|------|------|
| 텍스트 에셋 편수 | 5편 |
| 카피 슬롯 (ko/en) | 16 슬롯 / 32줄 |
| FAQ | 8건 |
| PR 스코프 | 6종 |
| npm 명령어 (예고) | 6종 |
| 게이트 종류 | 4종 |
| 데미지 결과/속성/상태 | 7 / 6 / 15종 |
| 5인 인계 체크 | 5항 |

---

## 인계 메모 — 다음 단계

- **에셋 → Build(계섬월)**: 본 묶음을 보고 `package.json`에 `battle:*` 6종 명령어 + `scripts/battle/` 게이트 스크립트 4종 신설. `battle_feedback_gate_messages.ts` 상수 배선.
- **Build → Review(가춘운)**: 데미지/상태 색·폰트 변경은 `DESIGN.md §5 → CSS → battle-tokens.ts` 단방향 위계 준수 확인. 카피 톤 마케팅과 한 결로 조율.
- **Review → Test(적경홍)**: 게이트 4종 실측 — `battle:gate` 합본이 60s 내 완료되는지, 대비/색약/체류 worst-case 측정.
- **Test → Ship(진채봉 본인)**: VERSION 범프 + 본 항목을 `CHANGELOG.md`에 정식 등재 + 릴리스 노트 발행. _TBD_ 슬롯을 실측치로 치환.

---

> 본 초안은 머지 시점이 아닌 **에셋 단계** 산출물입니다. Build/Review/Test 단계 진척에 따라 실측 수치로 갱신될 예정. 약속 4지표의 정본은 `battle-feedback-user-guide.md`.
