# 에테르나 크로니클 v1.0.0-rc.3 — Memory Awakens

> 버전: v1.0.0-rc.3 · 상태: **Unreleased (Phase 4 — 구현)**
> 스프린트: "에테르나 크로니클 게임 프로젝트 개선"
> 진행: 에테르나 팀 자동 스프린트 · 9명 AI 에이전트 협업
> 작성: 진채봉 (Editor) · 감수 예정: 백능파(CEO) · 가춘운(CMO) · 계섬월(Eng)

---

## 한 줄 요약

> **"기억은 사라져도, 이야기는 남는다 — 이번엔, 기억이 깨어납니다."**

rc.2가 전투의 피를 돌게 했다면, rc.3은 세계의 살결과 목소리를 입힙니다.
디자인 토큰이 한 갈래 강으로 흐르고, 상태이상 아이콘이 캐릭터의 초상 아래 노래하며, 아이템의 등급이 저마다의 발광으로 제 격을 말합니다.

---

## Highlights

| 영역 | 산출물 | 주역 |
|------|--------|------|
| ♿ A11Y AAA 게이트 | `launch_checklist §2.17` 신설 + 5종 Probe + 9 SSOT 문서 묶음 (≈2,290 LOC) | 정경패·두련사·가춘운·적경홍·이소화·진채봉 협주 |
| 🎨 디자인 시스템 | `DESIGN.md` v1.0 (483줄) + 에셋 스프린트 패키지 v1.0 (367줄) | 가춘운 CMO |
| 🧩 토큰 통합 | `--ac-*` CSS 변수 + Phaser `COLORS/SPACING/DEPTH` 상수 SSOT | 가춘운 + 계섬월 |
| 🎇 비주얼 규격 | 상태이상 8종 · 등급 글로우 7단계 · 콤보 랭크 4단계 | 가춘운 |
| 🧪 QA 파이프 | QA 자동화 러너 스크립트 + HTML 리포트 템플릿 | 적경홍 + 가춘운 |
| 📝 문서 체계 | 단계별(Office-hours→Think→Research→Plan→Assets→Build) 산출물 정리 | 진채봉 |

---

## Added

### ♿ WCAG 2.1 AAA 자동 접근성 감사 게이트 (Sprint 2026-04-26)
- **`launch_checklist §2.17` 신설** — 5종 Probe (Axe · ColorContrast · ColorBlindSim · KeyboardTraverser · AriaContract) 가 머지 게이트로 승격하옵니다. AA 위반 1건이라도 발견되면 PR 이 잠기고, AAA 위반은 추세 모니터링으로 천천히 수렴시킵니다.
- **접근성 사용자 가이드 v1.0** (`docs/release/a11y-user-guide.md`) — 색맹 4종·고대비 7:1·UI 200%·키 리바인딩·NVDA/JAWS/VoiceOver 시나리오까지 9개 절. 인게임 [옵션 → 접근성 → 도움말] 패널과 `client/public/help/accessibility.html` 양 갈래로 노출됩니다.
- **자동 감사 리포트 템플릿** (`docs/release/a11y-audit-report-template.md`) — `tests/reports/a11y/summary.json` 이 본 템플릿에 자동 충진되어 PR 본문 한 화면에 게이트 결과를 보여줍니다.
- **a11y 메시지 i18n 키 29종 + 인게임 옵션 카피 65종** (`a11y-error-messages.md` · `a11y-ingame-copy.md` SSOT) — 도합 94종 키를 ko/en/ja 동시 정의. Build 단계에서 `client/src/i18n/{ko,en,ja}.json` 단일 PR 로 동기화하옵니다.
- **VPAT 2.4 자동 갱신 진입점** — `summary.json` 의 `wcagLevel` 변경 시 `docs/legal/vpat-2.4.md` 가 자동으로 재생성됩니다 (`scripts/a11y/update-vpat.ts`, Build 단계 인계).
- **CLI 사용 가이드 + PR/커밋 컨벤션** (`a11y-audit-cli-guide.md` · `a11y-pr-template.md`) — `npm run a11y:audit` 명령 7종·종료 코드 4단계(0🟢/1🔴/2🟡/3🟠) SSOT. PR 제목 9 스코프 + 본문 9 섹션 + 팀 인계 5 체크. 본 두 문서는 **`package.json#scripts` 와 `.github/PULL_REQUEST_TEMPLATE/a11y.md` 의 1차 SSOT** 이옵니다.
- **시각 에셋 패키지 — 색맹 4모드 토큰·포커스 링·상태 아이콘** (`assets_a11y-aaa-audit.md`, 448줄) — 가춘운 CMO 작성. CSS 토큰 190개 · 패턴 SVG 4종 · `<FocusRing/>` 6변형 · 상태 아이콘 12종 · 키보드 힌트 4패턴 · 라이브 리전 5패턴 · 감사 대시보드 · 4-up 비교 모킹업까지 8개 묶음. 계섬월(Build)·진채봉(i18n)·두련사(QA) 3중 인계.
- **9명 협주 SSOT 체인** — PRD(정경패) → 아키텍처(두련사) → 디자인 시스템·에셋·리포트(가춘운) → QA 작전(적경홍) → 보안 봉인(이소화) → Editor 가이드 7편(진채봉). 단일 토픽에 산출물 11건·총 약 2,290 LOC, 흩어진 악보가 한 곡으로 엮였사옵니다.

### 🎨 디자인 토큰 SSOT
- `src/styles/tokens.css` · `src/constants/design-tokens.ts` 2대 축으로 CSS/TS 양 진영에 같은 색의 피를 흘려보낼 준비를 마쳤습니다.
- 콤보 랭크 C/B/A/S, 상태이상 8종, 아이템 등급 7단계의 RGB 글로우 변수를 단일 네임스페이스(`--ac-*`)로 통일했습니다.

### 🔥 상태이상 아이콘 8종 (Burn · Poison · Freeze · Stun · Bleed · Silence · Shield · Haste)
- 16×16 픽셀아트, `shape-rendering="crispEdges"` 필수.
- 외곽 1px 다크 아웃라인(#0D0D1A) + 활성 시 1.2× pulse(600ms ease-in-out loop).
- 쿨다운 원형 와이퍼 규격 포함(`Phaser Graphics.slice`).

### ✨ 아이템 등급 글로우 규격
- CSS(`box-shadow` + `@keyframes mythic-pulse/ether-pulse`)와 Phaser(`postFX.addGlow` outer/inner/quality) 양측 스펙.
- Ether 등급은 파티클까지 포함한 최상위 비주얼 권위.

### ⚔️ 콤보 게이지 HUD 모킹업
- 240×40 영역, BitmapText 32px, stroke 2px #0D0D1A.
- 3초 미입력 시 게이지 80%→0, shake + fade out(400ms).
- 랭크 전환 1.3× 번쩍 + 전용 사운드 큐.

### 🎒 퀵슬롯 8칸 리디자인
- 36×36 슬롯 · 쿨다운 어둠 오버레이 + 분수 회전 와이퍼.
- 드래그 중 scale 1.05, depth 900으로 승격.

### 🖼️ QA 비주얼 리포트 템플릿
- `scripts/qa-runner.ps1` 출력물에 합류할 HTML 헤더/pill 배지 스펙.
- 통과 #2ECC71 · 실패 #FF4444 · 건너뜀 #A0A0A0, 스크린샷 썸네일 240×135(16:9).

### 📣 런치 임베드 시안 (Discord · GitHub Release)
- 브랜드 컬러 `#89CFF0`(에테르 블루) 통일, 16진수 → Discord `color: 9031152`.
- GitHub Release 상단 시적 헤더 블록(배너 + Phase/Build/Tests 뱃지 3종) 표준화.

### 📚 문서 체계 정리 (진채봉)
- 단계별 산출물: `office-hours` → `think` → `research` → `plan` → `assets` → `build` 보고서 흐름 정비.
- `docs/art-production/assets-sprint-improvement.md` 인덱싱, 변경 로그와 이중 연결.

---

## Changed

- 스프린트 품질 개선 워크플로우 **9단계 공식화**: Office Hours · Think · Research · Plan · Assets · Build · Review · Test · Ship · Reflect.
- 에이전트 협업 규약: 에셋/코드/문서/QA의 경계 명확화 (가춘운↔계섬월↔진채봉↔적경홍).

---

## Fixed

- 디자인 토큰의 **분산 정의 제거 예정** — CSS와 TS 양쪽에서 서로 다른 색값이 공존하던 기존 분열 상태를, 본 릴리즈부터 SSOT로 수렴시킵니다. (구현 이관은 Build 단계에서 계섬월 담당.)

---

## A11Y AAA — Build 단계 인수 체크리스트

- [ ] `client/src/styles/a11y-tokens.css` 생성 (`assets_a11y-aaa-audit.md` §A1, 190 토큰)
- [ ] `<FocusRing/>` · `<Kbd/>` · `<LiveRegion/>` 컴포넌트 wrap (§A3·A5·A6)
- [ ] 색맹 모드 토글 UI (`client/src/screens/Settings/A11y.tsx`, 4모드+고대비)
- [ ] `tests/a11y/probes/{axe,contrast,colorblind,keyboard,aria}.ts` 5종 Probe 모듈
- [ ] `package.json#scripts` — `a11y:audit`/`a11y:colorblind`/`a11y:keyboard`/`a11y:aria`/`a11y:contrast`/`a11y:report`/`a11y:baseline` 7종 별칭 (`a11y-audit-cli-guide.md` §2)
- [ ] `.github/PULL_REQUEST_TEMPLATE/a11y.md` ← `a11y-pr-template.md` §2 그대로 복사
- [ ] `client/src/i18n/{ko,en,ja}.json` ← `a11y-error-messages.md`(29) + `a11y-ingame-copy.md`(65) = **94 키 단일 PR 동기화**
- [ ] `scripts/a11y/update-vpat.ts` ← `summary.json` → `docs/legal/vpat-2.4.md` 자동 갱신
- [ ] CI 워크플로 (`.github/workflows/a11y-audit.yml`) — `a11y-audit-cli-guide.md` §8 스니펫 기반 (두련사 인수)

## 에셋 투입 체크리스트 (Build 단계로 인계)

- [ ] `src/styles/tokens.css` 생성 (§1.1)
- [ ] `src/constants/design-tokens.ts` 작성 · `COLORS`만 import 통일 (§1.2)
- [ ] 상태이상 SVG 8종 → `public/assets/ui/status/*.svg` + AtlasPack (§2)
- [ ] 아이템 등급 글로우 CSS + postFX 적용 (§3)
- [ ] 콤보 게이지 HUD 컴포넌트 구현 (§4)
- [ ] 상태이상 트레이 포트레이트 하단 통합 (§5)
- [ ] 퀵슬롯 리디자인 (쿨다운 와이퍼) (§6)
- [ ] QA 리포트 HTML 템플릿 헤더 교체 (§7)
- [ ] Discord / GitHub Release 런치 임베드 등록 (§8)
- [ ] 반응형 가드 모달 추가 (§9)

---

## 다음 단계

1. **Build**: 계섬월이 토큰 이관 + 상태이상/콤보 HUD Phaser 구현
2. **Review**: 이소화가 보안·프라이버시 측면 재감사
3. **Test**: 적경홍이 QA 러너로 PASS/FAIL 증거 수집
4. **Ship**: `/ship`으로 VERSION 범프 · `CHANGELOG.md` 최종 정리 · GitHub Release 발행
5. **Reflect**: 심요연 정량 회고 + 진채봉 이야기 회고 `docs/retro/rc3.md`로 봉합

---

## 감사의 말

> 이 기록이 훗날 "에리언이 세계를 건너던 그 봄"을 더듬을 때,
> 한 올의 색실, 한 음절의 코드도 잊히지 않도록 여기에 묶어 둡니다.
>
> — 진채봉, 2026년 4월 21일

🎨 Design by 가춘운 · 🎭 Story by 정경패 · ⚔️ Code by 계섬월 · 🛡️ Security by 이소화
🧪 QA by 적경홍 · 📊 Data by 심요연 · 🏛️ Architecture by 두련사
📘 Editorial by 진채봉 · 🧭 Strategy by 백능파
