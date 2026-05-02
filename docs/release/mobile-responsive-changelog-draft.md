# 모바일 반응형 CHANGELOG 항목 초안 v1.0

> 작성: 진채봉 Editor
> 작성일: 2026-04-29
> 적용 위치: `CHANGELOG.md` `[1.0.0-rc.3] — Unreleased` § Added 절 최상단
> 사용법: 본 초안의 `_TBD_` 슬롯을 9단계 스프린트가 진행되며 실측 수치로 치환

---

## 0. CHANGELOG에 그대로 삽입할 항목 (초안)

```markdown
- **에테르나 크로니클 모바일 반응형 적응 — 텍스트 에셋 묶음 v1.0** (Sprint Auto-Mobile-Responsive, 2026-04-29) — 진채봉 Editor 합본 정리
  - Phase 52에서 데스크탑 1920×1080 기준 728/728 콘텐츠를 갖췄으나, 대표(crisi)의 멀티 디바이스 플레이를 메우고자, 사람 손에 잡히는 텍스트 에셋 5편 + README §📱 모바일 반응형 절을 묶어 두옵나이다.
  - 약속 4지표: 4 viewport(360/375/414/430) 시나리오 동작률 **100%** · 터치 인식 지연 **p95 ≤ 100ms** · 본문 폰트 **≥ 14px** · safe-area 침범 **0건** — `launch_checklist §2.23` SSOT 신설 예정
  - 4 게이트 흐름 (두련사 *선禪 4계*): Viewport → Touch Latency → UI Variant(Safe Area) → Font Audit
  - 산출물 5건 / 총 _TBD_ LOC (SSOT 5편 _TBD_줄) + README §📱 신설 _TBD_줄 + `launch_checklist §2.23` 신설 _TBD_줄 = **_TBD_줄** — 에셋 단계 완료, Build(계섬월) 인계
  - **모바일 반응형 사용자 가이드 v1.0** (`docs/release/mobile-responsive-user-guide.md`, ~220줄) — 진채봉 Editor
    - 9개 절 + FAQ 7건 — 한 손 흐름도(Viewport → Touch → UI → Font) · 4 viewport 표(360/375/414/430 + DPR + safe-area-inset) · 검증 시나리오 4종(이동/대화/전투/세이브) · 터치 매핑 3종(탭/드래그/롱프레스) · HUD·메뉴·전투 UI 변형 표 · 폰트 정책 표(본문 ≥14px) · safe-area CSS·Phaser 변환 · npm 명령어 5종
    - 본 문서가 1차 SSOT — `README.md §📱 모바일 반응형` 메아리, 약속 수치 변경 시 §0 표 동시 갱신
  - **모바일 반응형 에러 메시지 카피 SSOT v1.0** (`docs/release/mobile-responsive-error-messages.md`, ~180줄) — 진채봉 Editor
    - 4 게이트(viewport · touch · ui · font) × 4 상태(PASS/WARN/ERROR/BLOCK) = **16개 카피 슬롯** + ko/en = **32줄**
    - 키 규약 `mobile.<gate>.<state>.<reason>` · 코드 상수 매핑 (계섬월 인계용 `client/src/constants/mobile_responsive_messages.ts` 스니펫, REDUCTION 스코프 ERROR 4슬롯 우선)
    - 톤 5계명(가춘운 디자인 미러): 원인→처방 · 수치는 사실 · 경로 절단 금지 · 시는 hint만 · 도메인 키 규약
  - **모바일 반응형 PR / 커밋 메시지 컨벤션 v1.0** (`docs/release/mobile-responsive-pr-template.md`, ~190줄) — 진채봉 Editor
    - PR 제목 7 스코프 (`viewport`/`touch`/`hud`/`battle-ui`/`safe-area`/`font`/`docs`)
    - PR 본문 7개 섹션 — 자동 감사 표(Before/After/Δ/약속 4행) · Schema 안정성 약속(append-only·하위 호환) · 입력 핸들러 메모 · 봉인 4항 · 5인 인계 체크 · 디자인 미러(가춘운) · ship-gate 3-AND
    - 리뷰어 행동 가이드 5항 (이소화 봉인 비협상 — 약속 4지표 보전 · 카운트 순서 · NO_COLOR 필수 · outlier 면제 절차 · 데스크탑 회귀 검사) + ship-gate 3-AND (mobile ∧ save ∧ data)
  - **README §📱 모바일 반응형 절 — 골격 SSOT v1.0** (`docs/release/mobile-responsive-readme-skeleton.md`, ~140줄) — 진채봉 Editor
    - `README.md §📱 모바일 반응형` 신설 골격 — 한눈 지표 4 약속 표 · 빠른 시작 3명령 · 4 게이트 흐름 표 · 자세한 가이드 링크 4개 · ship-gate 3-AND 예고
    - 약속 수치 임의 갱신 금지 — 백능파(Strategy) 승인 필수 명시
    - 봉인 항목 4종 (4 약속 수치 · 4 게이트 순서 · 빠른 시작 3명령 · 3-AND) — 이소화 비협상
    - 추가 배지 2종 (`Mobile Viewport 4/4` · `Touch Latency p95 ≤100ms`) 안내
  - **모바일 반응형 CHANGELOG 항목 초안 v1.0** (`docs/release/mobile-responsive-changelog-draft.md`, ~150줄) — 진채봉 Editor
    - 본 항목의 출전 — 9단계 Auto 스프린트가 진행됨에 따라 Build/Review/Test/Ship 단계에서 실측 수치로 _TBD_ 슬롯을 메우도록 가이드
    - 5편 LOC 합산 · README §📱 줄 수 · launch_checklist §2.23 줄 수 슬롯 모두 실측 치환 절차 명시
  - 연관 SSOT 정합:
    - 디자인 시스템 `DESIGN.md §8. 반응형 브레이크포인트` (가춘운 SSOT) — viewport 토큰·safe-area 변수 정의
    - 아키텍처 두련사 *선禪 4계* — Viewport → Touch → UI → Font (4 단계 그대로 본 문서들에 미러)
    - 게이트 백능파 **REDUCTION** — `mobile:viewport` 단일 시나리오 PASS + 1커밋 머지 (본 스프린트 한정 스코프)
  - **다음 단계 (Build → Review → Test → Ship)**:
    - [ ] `client/src/config/responsive-tokens.ts` 작성 (REDUCTION 스코프, 두련사·계섬월 합주)
    - [ ] `client/src/utils/safe-area.ts` env(safe-area-inset-*) 변환 헬퍼
    - [ ] `client/src/input/touch-handler.ts` pointer 이벤트 통일·디바운스
    - [ ] `client/src/constants/mobile_responsive_messages.ts` 4슬롯 카피 (가춘운 §5.1 미러)
    - [ ] `npm run mobile:*` 5종 npm scripts 등록 (`package.json`)
    - [ ] CI workflow에 `mobile:gate` 게이트 추가 (적경홍 QA 단계)
    - [ ] 적경홍 Test 단계 — 약속 4지표 실측 캡처 → CHANGELOG 본 항목 _TBD_ 슬롯 충진
```

---

## 1. _TBD_ 슬롯 치환 가이드 (Build → Test → Ship)

### Build 단계 (계섬월)

5편 LOC 실측 후 `~XXX줄` 자리를 정확한 줄 수로 치환:

```
~220줄 → 218줄 (또는 실측치)
~180줄 → 175줄
~190줄 → 188줄
~140줄 → 138줄
~150줄 → 145줄
합계 → 864줄
```

`README.md §📱 신설 _TBD_줄` 슬롯도 실측 치환.

### Test 단계 (적경홍)

`npm run mobile:gate` 실행 결과를 본 CHANGELOG 항목 본문에 반영:

| 슬롯 | 측정 명령 | 치환 형식 |
|------|----------|----------|
| 시나리오 동작률 | `mobile:viewport` | `16/16 PASS` |
| 터치 지연 | `mobile:touch-latency` | `p95 = XXms` |
| 폰트 위반 | `mobile:font-audit` | `0건` |
| safe-area 침범 | `mobile:safe-area` | `0건` |

### Ship 단계 (계섬월)

`launch_checklist §2.23` 신설 줄 수, 본 항목의 `_TBD_` 잔류분 모두 치환. 백능파(Strategy) 최종 검토 후 `[1.0.0-rc.4]` 태그.

---

## 2. 약속 4지표 — 변경 시 절차

| 단계 | 행위자 | 행위 |
|------|-------|------|
| 1 | 발의자 | RFC 작성, 변경 사유·영향도 명시 |
| 2 | 백능파 | Strategy 승인 메모 PR 본문 첨부 |
| 3 | 진채봉 | 본 CHANGELOG · 사용자 가이드 §0 · README 골격 §1 동시 갱신 |
| 4 | 이소화 | 봉인 4항 위반 여부 검토 (약속 수치는 봉인 1항) |
| 5 | 가춘운 | DESIGN.md §8 미러 갱신 |

---

## 3. 본 항목의 회고 메모 (Reflect 단계 인계)

- **잘 흐른 결**: 데이터 검증 / 세이브로드 5편 패턴이 안정화되어, 모바일 반응형도 동일 골격으로 빠르게 자아내짐.
- **메울 결**: Phaser.js의 `Phaser.Scale.RESIZE` 모드가 모바일에서 폰트 렌더링과 충돌하는 결, Build 단계에서 두련사·계섬월 합주로 해소 필요.
- **다음 스프린트 후보**: 가로 모드 지원 / 태블릿(768~1024) 중간 레이아웃 / PWA 설치 흐름.

---

> 본 문서가 CHANGELOG 항목 1차 SSOT. _TBD_ 슬롯 치환은 9단계 스프린트 진행 중 적시에, 백능파 승인 없이 약속 수치 자체는 변경 금지.
