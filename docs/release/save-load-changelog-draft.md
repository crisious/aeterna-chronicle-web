# 💾 CHANGELOG 항목 초안 — 세이브·로드 시스템 안정성 검증 v1.0

> 작성: 진채봉 Editor
> 작성일: 2026-04-28
> 스코프: `CHANGELOG.md` `[1.0.0-rc.3] — Unreleased` 절에 추가할 항목 초안
> 사용 흐름: 본 초안을 검토 → `CHANGELOG.md` Added 절 상단(가장 최신)에 그대로 붙여넣기
> 메아리: `docs/release/save-load-user-guide.md` (1차 SSOT)

---

## Added (추가) 항목 — 그대로 붙여넣기

```markdown
- **에테르나 크로니클 세이브·로드 시스템 안정성 검증 — 텍스트 에셋 묶음 v1.0** (Sprint Auto-Save-Load-Stability, 2026-04-28) — 진채봉 Editor 합본 정리
  - Phase 52에서 콘텐츠 728/728 · 어셋 1,454편을 갖췄으나, 유저가 진행 도중 잃을 수 있는 데이터(파티 레벨/인벤토리/시나리오 진척/맵 해금)가 늘어남에 따라, 사람 손에 잡히는 텍스트 에셋 5편 + 디자인 시스템 합본을 묶어 두옵니다.
  - 안정성 약속 4지표: 세이브/로드 왕복 데이터 일치 **100%** · 손상 파일 → 마지막 정상 백업 자동 복구 **100%** · v1→v2 마이그레이션 호환 **100%** · 로드 검증 누락 필드 기본값 적용 **100%** — `launch_checklist §2.21` SSOT 신설 예정
  - 4중 안전망: 자동 회전 백업 4슬롯 + 챕터 영구 백업 6슬롯 + 수동 5슬롯 + 격리/레거시 60일 보존 = **총 15슬롯 + 보관 봉인**
  - 산출물 5건 / 총 ~1,400 LOC — 에셋 단계 완료, Build(계섬월) 인계
  - **세이브·로드 시스템 사용자 가이드 v1.0** (`docs/release/save-load-user-guide.md`) — 진채봉 Editor
    - 9개 절 + FAQ 7건 — 한 손 흐름도(자동세이브 → 직렬화 → 백업 회전 → 로드 검증 → 손상 복구) · schema v2 6영역 표 · v1→v2 마이그레이션 변환 규칙 표 · 자동세이브 트리거 5종(씬 전환/보스/레벨업/챕터 클리어/30s idle) · 백업 회전 정책 · 4단계 검증 파이프라인 · 누락 필드 기본값 정책
    - 본 문서가 1차 SSOT — `README.md §💾 세이브·로드` 메아리, 약속 수치 변경 시 §1 흐름도 동시 갱신
  - **세이브·로드 에러 메시지 카피 SSOT v1.0** (`docs/release/save-load-error-messages.md`) — 진채봉 Editor
    - 4종 게이트(roundtrip · migration · recovery · validation) × 4 상태(PASS/BLOCK/WARN/ERROR) = **16개 카피 슬롯** + ko/en 동시 = **32줄**
    - 키 규약 `save.gate.<gate>.<state>.<reason>` · 코드 상수 매핑 (계섬월 인계용 `src/constants/save_gate_messages.ts` 스니펫)
    - 톤 5계명: 원인→처방 · 수치는 사실 · 경로 절단 금지 · 시는 hint만 · 도메인 키 규약
  - **세이브·로드 PR / 커밋 메시지 컨벤션 v1.0** (`docs/release/save-load-pr-template.md`) — 진채봉 Editor
    - PR 제목 7 스코프 (`schema`/`migrate`/`auto`/`backup`/`recovery`/`validate`/`docs`)
    - PR 본문 7개 섹션 — 자동 감사 표(Before/After/Δ/약속) · schema 안정성 약속 · 마이그레이션 회복 · 5인 인계 체크
    - 리뷰어 행동 가이드 5항 (이소화 봉인 비협상 — 격리/레거시 60일 보존 · 4슬롯 회전 · 6슬롯 챕터 영구 백업) + ship-gate 3-AND
  - **README §💾 세이브·로드 절 — 골격 SSOT v1.0** (`docs/release/save-load-readme-skeleton.md`) — 진채봉 Editor
    - `README.md §💾 세이브·로드` 신설 골격 — 한눈 지표 4지표 표 · 빠른 시작 3명령 · 4중 안전망 표 · 자세한 가이드 링크 4개 · ship-gate 3-AND 예고
    - 약속 수치 임의 갱신 금지 — 백능파(Strategy) 승인 필수 명시
    - 봉인 항목 4종 (격리/레거시 60일 · 4슬롯 회전 · 6슬롯 영구) — 이소화 비협상
    - 선택 배지 2종 (`Save Round-Trip 100%` · `Auto Recovery 100%`) 추가 안내
  - **세이브·로드 CHANGELOG 항목 초안 v1.0** (`docs/release/save-load-changelog-draft.md`) — 진채봉 Editor
    - 본 항목의 출전 — 9단계 Auto 스프린트가 진행됨에 따라 Build/Review/Ship 단계에서 실측 수치로 _TBD_ 슬롯을 메우도록 가이드
  - 연관 SSOT 정합:
    - 디자인 시스템 `docs/release/design-system_save-load-system.md` (가춘운, 2026-04-28) — 6슬롯 상태 토큰 + 안심톤 카피 + 손상 복구 다이얼로그 SSOT
    - 아키텍처 두련사 *선禪 4계* — Schema → AutoSave → Backup → Validate (4 단계 그대로 본 문서들에 미러)
    - 게이트 백능파 *왕복 100% · 자동 백업 복구* HOLD 결정 정합
```

---

## Changed (변경) 항목 — 후속 단계에서 추가될 후보

> 본 절은 Build·Test·Ship 단계에서 다음 항목들이 확정되면 등재합니다. 현재는 후보 목록만.

```markdown
- **CHANGELOG 후보**: README.md §💾 세이브·로드 절 신설 (위 골격 SSOT 적용 시)
- **CHANGELOG 후보**: launch_checklist.md §2.21 세이브·로드 게이트 신설 (4종 게이트 체크 항목)
- **CHANGELOG 후보**: package.json scripts에 `save:*` 6종 추가 (계섬월 Build 단계)
- **CHANGELOG 후보**: client/src/save/schema.v2.ts 인터페이스 안정화 (두련사 ADR 후)
- **CHANGELOG 후보**: client/src/save/migrate.v1-to-v2.ts 변환 규칙 표 100% 커버리지 도달
- **CHANGELOG 후보**: client/src/save/BackupRotator.ts + Checksum.ts 봉인 (이소화 비협상)
- **CHANGELOG 후보**: scripts/save/fixtures/v1/*.save 100건 fixture 추가 (적경홍 QA)
```

---

## Deprecated / Removed (예정)

```markdown
- **Deprecated 후보**: 베타 시기 v1 schema (`saves/*.save` 단일 파일) — v2 마이그레이션 60일 후 자동 정리
- **Removed 후보**: (없음 — 본 스프린트는 신설 + 안전망 추가, 제거 없음)
```

---

## 통계 — 현재 스프린트 산출물

| 항목 | 수치 |
|------|------|
| 텍스트 에셋 편수 | 5편 (+ 가춘운 디자인 시스템 1편) |
| 총 LOC (예상) | ~1,400 |
| 카피 슬롯 (ko/en) | 16 슬롯 / 32줄 |
| FAQ | 7건 |
| PR 스코프 | 7종 |
| npm 명령어 (예고) | 6종 |
| 게이트 종류 | 4종 |
| 5인 인계 체크 | 5항 |
| 안전망 슬롯 합계 | 15슬롯 + 격리/레거시 보관 |
| 봉인 항목 | 4종 (이소화 비협상) |

---

## 인계 메모 — 다음 단계

- **에셋 → Build(계섬월)**: 본 묶음을 보고 `package.json`에 `save:*` 6종 명령어 + `client/src/save/` 5파일 + `scripts/save/` 게이트 스크립트 4종 신설.
- **Build → Review(가춘운)**: 본 묶음의 카피 톤을 디자인 시스템 §3.1 안심톤 표와 한 결로 조율 (이미 정합 — 검증만).
- **Review → Test(적경홍)**: 게이트 4종 실측 — `save:gate` 합본이 90s 내 완료되는지 확인. 손상 시뮬 fixture 36건 동작 검증.
- **Test → Security(이소화)**: 격리/레거시 60일 보존 봉인 검증, 자동 회전 4슬롯 + 챕터 영구 6슬롯 봉인 비협상.
- **Security → Ship(진채봉 본인)**: VERSION 범프 + 본 항목을 `CHANGELOG.md`에 정식 등재 + 릴리스 노트 발행.

---

## ⚠️ 절대 깨지 말아야 할 약속

1. **유저는 잃지 않는다** — 자동 회전 4 + 챕터 영구 6 + 수동 5 + 격리/레거시 60일 = 15슬롯 + 보관
2. **schema 변경은 무조건 마이그레이션 페어** — 필드 삭제/타입 변경 PR에 변환 규칙 갱신 누락 시 즉시 차단
3. **체크섬 자기 참조 회피** — 같은 데이터에서 다른 해시 = 모든 슬롯 *손상* 오분류 위험
4. **격리/보존 60일 봉인** — 이소화 비협상

---

> 본 초안은 머지 시점이 아닌 **에셋 단계** 산출물입니다. Build/Review/Test/Security 단계 진척에 따라 실측 수치로 갱신될 예정.
