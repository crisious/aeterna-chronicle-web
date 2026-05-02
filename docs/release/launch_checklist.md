# 출시 체크리스트 (P17-10)

> 작성일: 2026-03-13 | 버전: v1.0
> 상태: Sprint 3-4 (#318)

---

## 개요

법적/기술/마케팅/접근성 전 분야 출시 요건 통합 체크리스트.
총 **62개 항목** — 각 항목의 상태를 `[ ]`(미완)→`[x]`(완료)로 추적.

---

## 1. 법적 (Legal) — 14항목

### 1.1 EULA (최종 사용자 라이선스 계약)

- [ ] EULA 한국어 초안 작성
- [ ] EULA 영문 초안 작성
- [ ] 법률 검토 의뢰 (또는 자체 검토)
- [ ] 게임 내 EULA 동의 화면 구현

#### EULA 핵심 조항

```
1. 라이선스 부여: 비독점적, 양도 불가, 개인 비상업적 사용 한정
2. 지적재산권: 모든 게임 콘텐츠의 저작권은 개발사에 귀속
3. 제한 사항: 역공학, 복제, 재배포, 변조 금지
4. 온라인 서비스: PvP/순위 서버 운영 조건 및 종료 고지 의무
5. 면책: 예기치 못한 데이터 손실, 서비스 중단에 대한 면책
6. 해지: 위반 시 라이선스 즉시 종료
7. 준거법: 대한민국 법률 (국제 판매 시 소비자 보호법 추가 기재)
```

### 1.2 개인정보처리방침 (Privacy Policy)

- [ ] 수집 데이터 항목 정의 (텔레메트리, 계정, 결제)
- [ ] GDPR 준수 확인 (EU 판매 시)
- [ ] PIPA(개인정보보호법) 준수 확인 (한국)
- [ ] 한/영 버전 작성
- [ ] 게임 내 링크 + 웹사이트 게시

#### 수집 데이터 목록

| 데이터 유형 | 수집 항목 | 목적 | 보유 기간 |
|------------|---------|------|----------|
| 필수 | Steam ID (익명 해시) | 세이브 동기화 | 계정 삭제까지 |
| 필수 | 플레이 통계 | 밸런스 분석 | 1년 후 익명화 |
| 선택 (옵트인) | 크래시 리포트 | 버그 수정 | 90일 |
| 선택 (옵트인) | 하드웨어 정보 | 최적화 | 90일 후 삭제 |
| 수집 안 함 | 실명, 이메일*, 결제 정보 | — | — |

> *이메일은 Steam/itch.io 플랫폼이 관리, 개발사 직접 수집 없음

### 1.3 연령 등급

- [ ] GRAC (게임물관리위원회) 등급 신청 — 한국
- [ ] IARC 글로벌 등급 자동 분류 (Steam/itch.io 제출 시)
- [ ] 자체 콘텐츠 디스크립터 정리

#### 등급 예상 분류

| 기관 | 예상 등급 | 사유 |
|------|---------|------|
| GRAC | 12세 이용가 | 판타지 폭력(비현실적), 경미한 유혈 표현 |
| IARC | Everyone 10+ | Fantasy Violence |
| ESRB | E10+ | Fantasy Violence, Mild Language |
| PEGI | 12 | Non-realistic violence |

#### 콘텐츠 디스크립터

| 요소 | 수준 | 설명 |
|------|------|------|
| 폭력 | 경미 (판타지) | 검/마법 전투, 비현실적 이펙트, 유혈 최소 |
| 공포 | 경미 | 어두운 던전, 그림자 생물 — 호러가 아님 |
| 도박 | 없음 | 가챠/확률형 아이템 없음 |
| 과금 | 없음 | 완전 유료 (추가 과금 없음) |
| 온라인 상호작용 | 있음 | PvP, 텍스트 채팅 |
| 사용자 생성 콘텐츠 | 없음 | — |

### 1.4 쿠키 / 환불 정책

- [ ] 쿠키 정책 (웹사이트 보유 시만)
- [ ] 환불 정책 — 플랫폼 정책 따름 (Steam 2시간/14일, itch.io 자체)

---

## 2. 기술 (Technical) — 18항목

### 2.1 빌드 검증

- [ ] Chrome 브라우저 호환성 테스트
- [ ] Firefox 브라우저 호환성 테스트
- [ ] Safari 브라우저 호환성 테스트
- [x] 최소 사양 머신에서 30fps 이상 확인
- [x] 권장 사양 머신에서 60fps 이상 확인

### 2.2 세이브 시스템

- [x] 새 게임 → 저장 → 로드 정상 동작
- [x] 구버전 세이브 호환성 (마이그레이션 로직)
- [ ] Steam Cloud 동기화 정상 동작
- [x] 세이브 파일 손상 시 복구/경고 처리

### 2.3 네트워크 / PvP

- [ ] PvP 매칭 서버 스트레스 테스트 (동시 500+)
- [x] 네트워크 끊김 시 graceful 처리 (재접속/오프라인 전환)
- [x] 서버 점검 모드 구현 + 알림

### 2.4 크래시 / 오류 처리

- [ ] Sentry 크래시 리포팅 연동 확인 (DSN 미설정)
- [x] 미처리 예외 시 사용자 친화적 오류 화면
- [ ] 크래시 후 자동 세이브 복구

### 2.5 보안

- [x] PvP 안티치트 설정 확인 (antiCheatEngine.ts — speed/damage/position hack 감지)
- [x] 클라이언트-서버 통신 암호화 (TLS)
- [x] 치트/핵 사용 시 감지 + 경고 로직

### 2.6 COPPA / 연령 보호 (P9 정합)

- [x] COPPA 비해당 확인 (13세 미만 데이터 미수집, Steam 연령 게이트 의존)
- [x] GDPR 구현 동작 확인 — gdprManager.ts (데이터 삭제/익명화/내보내기 API 구현 완료)

### 2.17 WCAG 2.1 AAA 자동 접근성 감사 게이트 (Sprint 2026-04-26)

> 본 항목은 "WCAG 2.1 AAA 접근성 자동 감사 — 색맹 모드·키보드 네비·스크린 리더" 스프린트의 SSOT 게이트이옵니다.
> 연계 문서: `prd_a11y-aaa-audit.md` · `plan_a11y-aaa-audit-architecture.md` · `qa-plan_a11y-aaa-audit.md` · `a11y-audit-report-template.md`
> 자동화 스크립트: `scripts/a11y/audit.ts` (Build 단계 인계 — 계섬월/두련사)

- [x] `npm run a11y:audit` 5종 Probe 통합 실행 — Axe · ColorContrast · ColorBlindSim · KeyboardTraverser · AriaContract
- [x] AA 위반 0건 — 머지 게이트 차단 규칙 적용 (CI `gate.yml`)
- [x] AAA 위반 ≤ 5건 — `tests/reports/a11y/summary.json` 기록·추세 모니터링
- [x] 색맹 시뮬 4종 (Protanopia · Deuteranopia · Tritanopia · Achromatopsia) 스냅샷 — 게이지 식별 100%
- [x] 키보드 트래버스 — 트랩 0건, 가시 포커스 100%, Tab 순환 닫힘
- [x] ARIA 컨트랙트 — `AriaLabelMap.ts` SSOT 100% 매칭, 누락 라벨 0건
- [ ] 스크린 리더 (NVDA · JAWS · VoiceOver) 수동 시나리오 3종 — 적경홍 QA 수기 충진
- [ ] VPAT 2.4 자동 갱신 — `summary.json` → `docs/legal/vpat-2.4.md` 파이프라인 가동
- [ ] §4.1 / §4.2 / §4.3 / §4.4 토글 — 본 항목 통과 시 일괄 🟢 승격

### 2.18 개발 효율 — 빌드-검증 사이클 게이트 (Sprint 2026-04-27)

> 본 항목은 "에테르나 크로니클 개발자 빌드-검증 사이클 단축" 스프린트의 SSOT 게이트이옵니다.
> 연계 문서: `devloop-user-guide.md` · `devloop-error-messages.md` · `devloop-pr-template.md` · `devloop-readme-skeleton.md`
> 자동화 스크립트: `scripts/devloop/measure.ts` · `tests/scenarios/{battle,save,map}.scenario.ts` (Build 단계 인계 — 계섬월/두련사)

- [ ] `npm run dev:measure -- --cold` 5회 평균 ≤ **12,000ms** — `.ac/dev-perf.json` 기록
- [ ] `npm run dev:measure -- --warm` 5회 평균 ≤ **4,000ms** — 캐시 적중 효과 검증
- [ ] HMR 단일 파일 갱신 ≤ **800ms** — vite 콘솔 `[hmr]` 로그 SSOT
- [ ] `npm run verify:core` 합계 ≤ **5분** — battle 90s + save 60s + map 120s + 리포트 30s 약속
- [ ] `verify:battle` ATB tick 1회 + 스킬 1회 + HP 동기화 + EXP 적립 — 4지점 모두 PASS
- [ ] `verify:save` slot 1·2·3 round-trip JSON 동치 — `JSON.stringify` deep-equal
- [ ] `verify:map` Ch.1 → Ch.2 portal · BGM 전환 · NPC 위치 복원 3지점 PASS
- [ ] 에러 발생 시 `.ac/error-report.json` 작성 latency ≤ **5초** — `{file, line, snippet, hint, related}` 필드 5종 필수
- [ ] 에러 카피 5 게이트(boot · verify · build · type · runtime) × 4 상태 = 20 슬롯 i18n ko/en 100% 충진
- [ ] ship-gate hook (다음 스프린트) — `git diff --stat ≠ 0` AND `git log --since=7d ≥ 1` AND `verify:core 🟢 PASS` 3-AND 조건

> 참고: §2.19 자리는 사운드 시스템 통합 게이트(2026-04-27 스프린트)에 예약되어 있사옵니다. `sound-system-changelog-draft.md` 머지 시 신설 예정.

### 2.20 첫 30분 튜토리얼·온보딩 게이트 (Sprint Auto-Tutorial-Onboarding 2026-04-28)

> 본 항목은 "에테르나 크로니클 튜토리얼·온보딩 첫 30분 경험 설계" 스프린트의 SSOT 게이트이옵니다.
> 연계 문서: `tutorial-onboarding-user-guide.md` · `tutorial-onboarding-error-messages.md` · `tutorial-onboarding-pr-template.md` · `tutorial-onboarding-readme-skeleton.md` · `tutorial-onboarding-changelog-draft.md`
> 자동화 스크립트: `scripts/tutorial/measure.ts` · `tests/tutorial/{move,dialog,battle,skill,save}.spec.ts` (Build 단계 인계 — 계섬월/두련사)
> 핵심 약속: 신규 진입자가 첫 회차에서 30분 안에 핵심 5종(이동/대화/전투/스킬/세이브)을 100% 학습 완료하고 첫 보스를 처치한다.

- [ ] **5종 학습 커버리지 = 100%** — `npm run verify:tutorial` 5회 자동 검증 (move·dialog·battle·skill·save 모두 BLOCK→PASS 전이)
- [ ] **누적 5회 평균 길이 ≤ 30:00** — `.ac/tutorial-perf.json` 기록 · 32:00 초과 시 정경패 Reviewer가 보스 HP 5% 자동 하향
- [ ] **첫 보스 처치율 ≥ 90%** — 1회차 진입자 베타 데이터 기준 (적경홍 QA 인계)
- [ ] **30분 이탈률 ≤ 15%** — 비트 ① 진입 ↔ 비트 ⑦ 도달 차이 (심요연 Analyst 측정)
- [ ] **카피 24슬롯 i18n 100% 충진** — `npm run verify:tutorial-copy` 🟢 (5 게이트 × 4 상태 = 20 + 보조 4 = 24슬롯, ko + en 동시)
- [ ] **키 규약 통일 100%** — `coach.<gate>.<state>.<reason>` 정규식 lint 0 위반
- [ ] **재시청 진입 ≤ 3클릭** — 메인 메뉴 → [도움말] → [튜토리얼 다시 보기] / 인게임 일시정지 → [도움말] → [지난 코칭 보기]
- [ ] **NG+ 스킵 정책** — 비트 ②~⑤ 첫 회차 스킵 노출 0건 · 회차(NG+)에서만 [메뉴 → 튜토리얼 스킵 ▶▶] 단일 클릭 허용
- [ ] **접근성** — 자막 ko/en 16/20/24px 3단계 · 코칭 오버레이 ARIA `role="status" aria-live="polite"` · 모션 감소 모드 ON 시 화면 흔들림·플래시 0%
- [ ] **ship-gate 3-AND** — `verify:tutorial 🟢` AND `누적 5회 평균 ≤ 30:00` AND `verify:tutorial-copy 🟢` 모두 PASS · 한 가닥이라도 끊기면 봉인(이소화 Security 비협상)

### 2.22 데이터 검증 시스템 게이트 (Sprint Auto-Data-Validation 2026-04-28)

> 본 항목은 "에테르나 크로니클 게임 데이터 검증 시스템 구축" 스프린트의 SSOT 게이트이옵니다.
> 연계 문서: `data-validation-user-guide.md` · `data-validation-error-messages.md` · `data-validation-pr-template.md` · `data-validation-readme-skeleton.md` · `data-validation-changelog-draft.md` · `design-system_data-validation.md` (가춘운)
> 자동화 스크립트: `scripts/validate-data.ts` (4 게이트 — Schema/Load/Audit/Report) · `data/schemas/<domain>.schema.json` (Build 단계 인계 — 계섬월/두련사)
> 핵심 약속: Phase 52 누적 데이터(스킬·아이템·몬스터·시나리오 JSON 수백~수천 건) 위에 콘텐츠 1건 추가할 때마다, 4 게이트가 자동으로 schema·참조·밸런스·노출을 보증한다.
> 백능파 게이트 (REDUCTION): `monster_data.json` 단일 ajv 검증 PASS + 1커밋 머지 — 본 스프린트 한정 스코프.

- [ ] **Schema 통과 = 100%** — `npm run data:validate` 1회 실행 → 전 데이터 파일 ajv 검증 PASS율 100% (REDUCTION 스코프: `monsterManifest.json` 우선)
- [ ] **참조 끊김 = 0건** — `npm run data:audit:refs` 3종 참조(skill→effect / item→category / encounter→monster) 모두 끊김 0건
- [ ] **Balance outlier ±2σ 내** — `npm run data:audit:balance` 챕터별 HP/데미지/EXP 분포 z-score 기록 · ±3σ 초과는 머지 차단 · ±2σ 초과는 정경패 + 백능파 승인 필수
- [ ] **실패 노출 = 100%** — 모든 ERROR/WARN 줄에 `path:line:field` 3정보 포함 (가춘운 디자인 §4 *2줄 ERROR* 1:1 일치) · NO_COLOR 환경 회귀 테스트 PASS
- [ ] **카피 16슬롯 i18n 100% 충진** — `npm run verify:data-copy` 🟢 (4 게이트 × 4 상태 = 16슬롯, ko + en 동시 = 32줄)
- [ ] **키 규약 통일 100%** — `data.<domain>.<gate>.<state>.<reason>` 정규식 lint 0 위반
- [ ] **출력 모드 3종 회귀** — TTY 컬러 / NO_COLOR / `--json` 세 모드 모두 동일 카운트(PASS·WARN·ERROR) 산출
- [ ] **outlier 면제 절차** — `// @balance-exempt: <근거>` 주석 + PR 본문 §밸런스 메모 (정경패 + 백능파 승인 트레일 첨부) 외 통과 ❌
- [ ] **Schema 안정성 약속** — 하위 호환(기존 manifest 무수정 PASS) · append-only(필드 *제거* 없음, deprecated 마킹만) · required 추가 시 마이그레이션 스크립트 동봉
- [ ] **ship-gate 3-AND** — `npm run data:validate 🟢 (Schema 100%)` AND `data:audit:refs 🟢 (끊김 0건)` AND `data:audit:balance 🟢 (±3σ 초과 0건)` 모두 PASS · 한 가닥이라도 끊기면 봉인(이소화 Security 비협상)

---

## 3. 마케팅 (Marketing) — 12항목

### 3.1 스토어 페이지

- [ ] Steam 스토어 페이지 라이브 (P17-01)
- [ ] itch.io 페이지 라이브 (P17-09)
- [ ] 스토어 설명문 최종 교정 (한/영)
- [ ] 스크린샷 최종 선정 + 업로드
- [ ] 트레일러 업로드 (최소 1개)

### 3.2 프레스 / 커뮤니티

- [x] 프레스 킷 완성 + 배포 (P17-03)
- [x] 프레스 릴리즈 발송 (P17-04)
- [ ] Discord 공식 서버 오픈 (P17-06)
- [ ] 소셜 미디어 출시 공지 준비 (P17-05)

### 3.3 베타 / 리뷰

- [ ] 베타 테스트 완료 + 피드백 반영 (P17-07)
- [ ] 리뷰 키 발급 (프레스 15곳+)
- [ ] 유튜버/스트리머 키 발급 (20곳+)

---

## 4. 접근성 (Accessibility) — 10항목

### 4.1 시각 접근성

- [x] 색약 모드 3종 동작 확인 (P17-11)
- [x] 고대비 모드 명암비 7:1 확인 (P17-14)
- [x] UI 스케일링 75%~200% 레이아웃 정상 (P17-14)
- [x] 폰트 크기 독립 조절 정상 (12~24pt)

### 4.2 입력 접근성

- [x] 키 리바인딩 전 액션 커스텀 가능 (P17-12)
- [ ] 게임패드 전체 내비게이션 가능
- [x] 마우스 전용 플레이 가능

### 4.3 청각/인지 접근성

- [ ] 화면 낭독기 호환 테스트 (미테스트)
- [x] 자막 시스템 커스텀 (크기/색상/배경) 동작 (Sprint 5-6)
- [x] 모션 감소 모드 정상 동작 (Sprint 5-6)

### 4.4 접근성 선언서

- [ ] VPAT 2.4 기반 자발적 접근성 선언서 작성

#### VPAT 2.4 자발적 접근성 선언서 초안

```
┌──────────────────────────────────────────────────┐
│  Voluntary Product Accessibility Template (VPAT) │
│  WCAG 2.1 Edition — Aeterna Chronicle            │
├──────────────────────────────────────────────────┤
│  Product: Aeterna Chronicle v1.0                 │
│  Date: [출시일]                                   │
│  Developer: [개발팀명]                            │
│  Contact: [접근성 피드백 이메일]                    │
├──────────────────────────────────────────────────┤
│  Overall Conformance Level: Partially Conforms   │
│  Target Level: WCAG 2.1 Level AA                 │
├──────────────────────────────────────────────────┤
│  Notes:                                          │
│  - Canvas 기반 게임으로 100% WCAG 준수 불가        │
│  - UI 오버레이(HTML)는 AA 수준 달성                │
│  - 게임플레이 캔버스는 대체 텍스트 + ARIA 지원      │
│  - 지속적 개선 계획 수립                           │
└──────────────────────────────────────────────────┘
```

**WCAG 2.1 주요 기준별 현황:**

| 기준 | 설명 | 수준 | 상태 |
|------|------|------|------|
| 1.1.1 | 비텍스트 콘텐츠 | A | 부분 지원 — 게임 캔버스에 aria-label 제공 |
| 1.3.1 | 정보와 관계 | A | 지원 — HTML UI에 시맨틱 마크업 |
| 1.4.1 | 색상 사용 | A | 지원 — 색약 모드 + 패턴 구분자 |
| 1.4.3 | 대비 (최소) | AA | 지원 — 고대비 모드 7:1 이상 |
| 1.4.4 | 텍스트 크기 조절 | AA | 지원 — UI 스케일링 200%까지 |
| 2.1.1 | 키보드 | A | 지원 — 전체 키보드 내비게이션 |
| 2.4.7 | 포커스 가시성 | AA | 지원 — 3px 고대비 포커스 인디케이터 |
| 3.3.1 | 오류 식별 | A | 지원 — 폼/설정 오류 텍스트 안내 |
| 4.1.2 | 이름, 역할, 값 | A | 부분 지원 — HTML UI에 ARIA, 캔버스 제한적 |

---

## 5. 운영 (Operations) — 8항목

### 5.1 서버 인프라

- [x] 게임 서버 프로덕션 배포 준비
- [x] CDN 에셋 배포 확인
- [x] 모니터링 / 알림 설정 (서버 다운 시)
- [ ] 서버 스케일링 계획 (출시 트래픽 대비)

### 5.2 출시 당일 프로세스

- [ ] 출시 시각 확정 (시간대별 — KST/PST/UTC)
- [ ] Steam "Release" 버튼 담당자 확정
- [ ] 출시 직후 핫라인 채널 (Discord #launch-support)
- [ ] 출시 후 24시간 모니터링 당번 배정

---

## 6. 최종 출시 시퀀스 (D-Day 타임라인)

| 시간 (KST) | 액션 |
|------------|------|
| D-7 | 최종 빌드 브랜치 동결 (code freeze) |
| D-3 | Steam/itch.io 최종 빌드 업로드 |
| D-2 | 프레스 릴리즈 발송 |
| D-1 | 소셜 미디어 카운트다운 시작 |
| D-Day 09:00 | Steam 출시 버튼 클릭 |
| D-Day 09:05 | itch.io 공개 전환 |
| D-Day 09:10 | Discord 공지 + 소셜 미디어 출시 포스트 |
| D-Day 09:30 | 스토어 페이지 정상 접근 확인 |
| D-Day ~12:00 | 첫 3시간 크래시/이슈 모니터링 |
| D-Day ~18:00 | 첫 리뷰 확인 + 대응 |
| D+1 | 핫픽스 필요 시 즉시 패치 |
| D+3 | 출시 회고 미팅 |
| D+7 | 첫 주 데이터 리뷰 + 패치 노트 |

---

## 체크리스트 요약

| 카테고리 | 항목 수 | 완료 |
|---------|--------|------|
| 법적 | 14 | /14 |
| 기술 | 18 | /18 |
| 마케팅 | 12 | /12 |
| 접근성 | 10 | /10 |
| 운영 | 8 | /8 |
| **합계** | **62** | **/62** |
