# 🎵 CHANGELOG 항목 초안 — 사운드 시스템 통합 v1.0

> 작성: 진채봉 Editor
> 작성일: 2026-04-27
> 스코프: `CHANGELOG.md` `[1.0.0-rc.3] — Unreleased` 절에 추가할 항목 초안
> 사용 흐름: 본 초안을 검토 → `CHANGELOG.md` Added/Changed 절에 그대로 붙여넣기

---

## Added (추가) 항목 — 그대로 붙여넣기

```markdown
- **에테르나 크로니클 BGM·SFX 사운드 시스템 통합 — 텍스트 에셋 묶음 v1.0** (Sprint Auto-Sound-Integration, 2026-04-27) — 진채봉 Editor 합본 정리
  - Phase 52에서 비주얼 어셋 1,454개는 갖췄으나 사운드 레이어가 비어 플레이 체감이 정적이던 결을 메우고자, 사람 손에 잡히는 텍스트 에셋 5편을 묶어 두옵니다.
  - 사운드 약속: BGM 매핑 커버리지 **100%** · 핵심 전투 SFX 커버리지 **100%** · 라이선스 위험 **0건** · SFX 평균 응답 지연 **≤ 50ms** — `launch_checklist §2.19` SSOT 신설 예정
  - 산출물 5건 / 총 ~700 LOC — 에셋 단계 → Build(계섬월) 인계 완료
  - **사운드 시스템 사용자 가이드 v1.0** (`docs/release/sound-system-user-guide.md`) — 진채봉 Editor
    - 9개 절 + FAQ 7건 — 한 손 흐름도(씬 진입 → SFX → UI → 라이선스 게이트) · 씬 BGM 매핑 표 7카테고리(보스/필드/마을/이벤트/시즌/심연/시스템) · 전투 SFX 카탈로그 5군(스킬 30 + 타격 8 + 회피 4 + 크리티컬 3 + 상태 12) · UI 사운드 9액션 LUFS 정규화 표
    - 본 문서가 1차 SSOT — `README.md §🎵 사운드 시스템` 메아리, 약속 수치 변경 시 §1 흐름도 동시 갱신
  - **사운드 시스템 에러 메시지 카피 SSOT v1.0** (`docs/release/sound-system-error-messages.md`) — 진채봉 Editor
    - 4종 게이트(coverage-bgm · coverage-sfx · license · normalize) × 4 상태(PASS/BLOCK/WARN/ERROR) = **16개 카피 슬롯** (ko/en 동시 = 32줄)
    - 키 규약 `audio.gate.<gate>.<state>.<reason>` · 코드 상수 매핑 (계섬월 인계용 `src/constants/audio_gate_messages.ts` 스니펫)
    - 톤 5계명: 원인→처방 · 수치는 사실 · 경로 절단 금지 · 시는 hint만 · 도메인 키 규약
  - **사운드 시스템 PR / 커밋 메시지 컨벤션 v1.0** (`docs/release/sound-system-pr-template.md`) — 진채봉 Editor
    - PR 제목 7 스코프 (`bgm`/`sfx`/`ui`/`gate`/`license`/`assets`/`docs`)
    - PR 본문 7개 섹션 — 자동 감사 표(Before/After/Δ/약속) · 산출물 분류 · 라이선스 증빙 · i18n · 5인 인계 체크
    - 커밋 메시지 좋은 예 / 나쁜 예 + 리뷰어 행동 가이드 5항 (이소화 봉인 비협상 명시) + 3-AND 머지 게이트
  - **README 사운드 시스템 절 — 골격 SSOT v1.0** (`docs/release/sound-system-readme-skeleton.md`) — 진채봉 Editor
    - `README.md §🎵 사운드 시스템` 신설 골격 — 한눈 지표 4지표 표 · 빠른 시작 3명령 · 핵심 카테고리 3종 표 · 자세한 가이드 링크 4개 · ship-gate 3-AND 예고
    - 약속 수치 임의 갱신 금지 — 백능파(Strategy) 승인 필수 명시
    - 선택 배지 2종 (`Audio Coverage 100%` · `License Risks 0`) 추가 안내
  - **사운드 시스템 CHANGELOG 항목 초안 v1.0** (`docs/release/sound-system-changelog-draft.md`) — 진채봉 Editor
    - 본 항목의 출전 — 9단계 Auto 스프린트가 진행됨에 따라 Build/Review/Ship 단계에서 실측 수치로 _TBD_ 슬롯을 메우도록 가이드
```

---

## Changed (변경) 항목 — 후속 단계에서 추가될 후보

> 본 절은 Build·Test·Ship 단계에서 다음 항목들이 확정되면 등재합니다. 현재는 후보 목록만.

```markdown
- **CHANGELOG 후보**: README.md §🎵 사운드 시스템 절 신설 (위 골격 SSOT 적용 시)
- **CHANGELOG 후보**: launch_checklist.md §2.19 사운드 게이트 신설 (4종 게이트 체크 항목)
- **CHANGELOG 후보**: package.json scripts에 `audio:*` 6종 추가 (계섬월 Build 단계)
- **CHANGELOG 후보**: src/systems/SoundManager.ts 인터페이스 안정화 (두련사 ADR 후)
- **CHANGELOG 후보**: docs/legal/audio-credits.md 자동 등재 게이트 활성화 (이소화 봉인 후)
```

---

## 통계 — 현재 스프린트 산출물

| 항목 | 수치 |
|------|------|
| 텍스트 에셋 편수 | 5편 |
| 총 LOC (예상) | ~700 |
| 카피 슬롯 (ko/en) | 16 슬롯 / 32줄 |
| FAQ | 7건 |
| PR 스코프 | 7종 |
| npm 명령어 (예고) | 6종 |
| 게이트 종류 | 4종 |
| 5인 인계 체크 | 5항 |

---

## 인계 메모 — 다음 단계

- **에셋 → Build(계섬월)**: 본 묶음을 보고 `package.json`에 `audio:*` 6종 명령어 + `scripts/audio/` 게이트 스크립트 4종 신설.
- **Build → Review(가춘운)**: 본 묶음의 카피 톤을 마케팅 톤과 한 결로 조율.
- **Review → Test(적경홍)**: 게이트 4종 실측 — `audio:gate` 합본이 60s 내 완료되는지 확인.
- **Test → Ship(진채봉 본인)**: VERSION 범프 + 본 항목을 `CHANGELOG.md`에 정식 등재 + 릴리스 노트 발행.

---

> 본 초안은 머지 시점이 아닌 **에셋 단계** 산출물입니다. Build/Review/Test 단계 진척에 따라 실측 수치로 갱신될 예정.
