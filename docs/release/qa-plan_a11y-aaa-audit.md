# ⚔️ QA 작전 계획 — WCAG 2.1 AAA 자동 접근성 감사

> 작성: 적경홍 (QA Lead / SRE) · 붉은 갑옷, 전선 지휘소에서 보고드립니다
> 스프린트: Auto — 색맹·키보드·스크린 리더 전수 검증
> 단계: **Plan (테스트 케이스·QA 체크리스트 준비)** → Build·Test 인계용 작전 명령서
> SSOT: `plan_a11y-aaa-audit-architecture.md` (두련사) · `prd_a11y-aaa-audit.md` (정경패) · `design_a11y-aaa-audit-report.md` (가춘운) · `security-checklist_a11y-aaa-audit.md` (이소화)
> 게이트 대상: `launch_checklist.md §2.17` · §4 미해결 4건

---

## 0. 한 줄 작전 개요

> **현황**: 런타임 자산은 진을 갖췄으나 회귀 방어선이 비었음.
> **판정**: 5 Probe × 6 핵심 씬 × 4 색맹 시뮬 = **42 케이스 작전 매트릭스**로 일거에 봉쇄.
> **조치**: P0 28 / P1 10 / P2 4. Build Day 2 PoC 통과 → Test Day 5 게이트 발효.

---

## 1. 작전 목표 (Definition of Done)

QA 관점 Ship 가능 판정 조건:

| # | 항목 | 임계치 | 검증 방법 |
|---|------|--------|----------|
| D1 | axe-core AAA Critical | **0건** | `tests/reports/a11y/summary.json` |
| D2 | axe-core AAA Serious | **0건** | 동상 |
| D3 | ColorContrastProbe AAA 위반 | **0건** | 대비비 7:1 측정 (큰글자 4.5:1) |
| D4 | ColorBlindSimulator SSIM | **≥ 0.95** vs 베이스라인 (4종) | 스냅샷 회귀 |
| D5 | KeyboardTraverser 데드엔드 | **0건** (5 핵심 씬) | E2E 자동 트래버스 |
| D6 | AriaContractChecker 누락 | **0건** | `AriaLabelMap` ↔ DOM diff |
| D7 | `git diff --stat` | **≠ 0** (코드 게이트) | 커밋 강제 |
| D8 | PR 머지 + 리포트 산출 | **둘 다** | CI artifact 첨부 |

> 8항 중 단 하나라도 미달이면 **Ship 불가**. 백능파 CEO 보고 후 HOLD.

---

## 2. 테스트 매트릭스 (작전 진형)

```
            ┌─ AxeProbe ─┬─ Contrast ─┬─ CBSim ─┬─ KbdTrav ─┬─ Aria ─┐
씬 1 메인메뉴 │  T-AXE-01  │  T-CON-01  │ T-CB-01 │ T-KBD-01  │ T-AR-01│
씬 2 캐릭생성  │  T-AXE-02  │  T-CON-02  │ T-CB-02 │ T-KBD-02  │ T-AR-02│
씬 3 월드맵    │  T-AXE-03  │  T-CON-03  │ T-CB-03 │ T-KBD-03  │ T-AR-03│
씬 4 ATB전투   │  T-AXE-04  │  T-CON-04  │ T-CB-04 │ T-KBD-04  │ T-AR-04│
씬 5 인벤토리  │  T-AXE-05  │  T-CON-05  │ T-CB-05 │ T-KBD-05  │ T-AR-05│
씬 6 세이브UI  │  T-AXE-06  │  T-CON-06  │ T-CB-06 │ T-KBD-06  │ T-AR-06│
                                              + 통합 12 케이스 = 총 42
```

**우선순위 분포**: P0 28 (전투/세이브/메인 핵심) · P1 10 (월드맵/인벤) · P2 4 (캐릭생성 보조)

---

## 3. 테스트 케이스 카탈로그

### 3.1 색맹 모드 (ColorBlindSimulator) — 4종 시뮬 × 6 씬 = 24 케이스

| ID | 씬 | 시뮬 | 우선 | Given-When-Then 요약 | 단언 |
|----|----|------|------|---------------------|------|
| T-CB-04-D | ATB 전투 | deuteranopia | P0 | HP/MP/ATB 게이지 풀 충전 → 시뮬 적용 → 라벨·패턴·아이콘 중 2종 이상 식별 가능 | 텍스트 라벨 OCR 인식률 ≥ 95% |
| T-CB-04-P | ATB 전투 | protanopia | P0 | 적/아군 머리 위 마커 → 시뮬 적용 → 화살표/▲/■ 형태 구분 가능 | 형태 토큰 매핑 100% |
| T-CB-04-T | ATB 전투 | tritanopia | P0 | 상태이상 아이콘 8종(독·화상·빙결 등) → 형태/테두리 구분 | 시각 회귀 SSIM ≥ 0.95 |
| T-CB-04-A | ATB 전투 | achromatopsia | P0 | 그레이스케일 변환 → 모든 정보 식별 가능 | 명도 차 ≥ 3 단계 |
| T-CB-05-D | 인벤토리 | deuteranopia | P0 | 등급별 아이템 보더(Common~Mythic 6종) → 색 외 형태/별 표기 | 등급 라벨 가시성 100% |
| T-CB-06-* | 세이브 UI | 4종 | P0 | 슬롯 상태(빈/저장됨/손상) → 색 외 아이콘 | 아이콘 매핑 100% |
| T-CB-01-* | 메인메뉴 | 4종 | P1 | 버튼 hover/active 상태 → 색 외 underline/굵기 | 상태 시각화 100% |
| T-CB-03-* | 월드맵 | 4종 | P1 | 지역 마커(미방문/방문/클리어) → 형태 구분 | 마커 토큰 100% |
| T-CB-02-* | 캐릭생성 | 4종 | P2 | 클래스 컬러 카드 → 아이콘+텍스트 병행 | 식별률 ≥ 95% |

> 가춘운 디자인 SSOT: 모든 시각 요소는 **색+형태+텍스트 삼중 인코딩** 원칙. QA는 이 원칙 위반을 잡습니다.

### 3.2 키보드 네비게이션 (KeyboardTraverser) — 6 케이스 + 통합 1

| ID | 씬 | 우선 | 시나리오 | 단언 |
|----|----|------|----------|------|
| T-KBD-01 | 메인메뉴 | P0 | Tab으로 모든 인터랙티브 요소 순회 → Shift+Tab 역순 동일 → Enter 활성화 | 포커스 트랩 0, 데드엔드 0 |
| T-KBD-04 | ATB 전투 | P0 | Arrow로 타겟 선택 → Enter 스킬 사용 → Esc 취소 → Tab 메뉴 이동 | IME 충돌 0, 단축키 충돌 0 |
| T-KBD-05 | 인벤토리 | P0 | 그리드 Arrow 4방향 → Enter 사용/장착 → Tab 카테고리 전환 → Esc 닫기 | 모달 Esc 탈출 100% |
| T-KBD-06 | 세이브 UI | P0 | 슬롯 Arrow 선택 → Enter 저장 → 확인 다이얼로그 Tab/Esc | 다이얼로그 포커스 트랩 정상 |
| T-KBD-03 | 월드맵 | P1 | Arrow 이동 → Enter 진입 → M 미니맵 토글 → Esc 닫기 | 단축키 표시 100% |
| T-KBD-02 | 캐릭생성 | P2 | 폼 필드 Tab 순회 → 라디오/체크 Space → Enter 제출 | 폼 검증 메시지 발화 |
| T-KBD-INT | **풀 루프** | **P0** | 메인→캐릭생성→월드맵→전투→인벤→세이브 전 구간 키보드만 | **데드엔드 0건** (US-A11Y-02 수용) |

**포커스 링 가시성 보조 단언**: 모든 배경 위 대비 **3:1 이상** (가춘운 토큰 `#FFD700` × 3px outline).

### 3.3 스크린 리더 호환성 (AriaContract + Live Region) — 6 케이스 + 3 통합

| ID | 씬 | 우선 | 시나리오 | 단언 |
|----|----|------|----------|------|
| T-AR-04 | ATB 전투 | P0 | 전투 로그 갱신 → `aria-live=polite` 영역 mutation 감지 → 텍스트 발화 모킹 | NVDA 모킹 발화 큐 ≥ 1 |
| T-AR-04-CRIT | ATB 전투 | P0 | HP 20% 이하 경고 → `aria-live=assertive` 발화 | 즉시 발화 검증 |
| T-AR-06 | 세이브 UI | P0 | 저장 완료 알림 → live region 발화 | 알림 텍스트 일치 |
| T-AR-05 | 인벤토리 | P0 | 아이템 장착/해제 → role/state aria-pressed 토글 | ARIA state 정합 |
| T-AR-01 | 메인메뉴 | P0 | landmark 6종(banner/nav/main/complementary/contentinfo/region) 존재 | 6/6 통과 |
| T-AR-03 | 월드맵 | P1 | NPC 대화창 진입 → `role=dialog` + aria-modal=true | 다이얼로그 의미론 정합 |
| T-AR-02 | 캐릭생성 | P2 | 폼 라벨 `aria-describedby` 오류 안내 연결 | 오류 발화 검증 |
| T-AR-CONTRACT | **전체** | **P0** | `AriaLabelMap` ↔ 실제 DOM diff | **누락 0건** |
| T-AR-VERSION | **전체** | **P0** | `ARIA_CONTRACT_VERSION` 락 | 버전 mismatch 시 fail |

> **모킹 전략**: 실 NVDA/JAWS는 CI에서 구동 불가 → `aria-live` mutation observer + speech queue 모킹으로 회귀 차단. 실 디바이스 검증은 **Test 단계 수동 1회** (계섬월 협조).

### 3.4 axe-core AAA 룰셋 (AxeProbe) — 6 씬 × 자동 풀스캔

| ID | 씬 | 우선 | axe 룰 카테고리 | 임계치 |
|----|----|------|-----------------|--------|
| T-AXE-01 | 메인메뉴 | P0 | wcag2aaa, best-practice | Critical 0 / Serious 0 |
| T-AXE-04 | ATB 전투 | P0 | 동상 | 동상 |
| T-AXE-05 | 인벤토리 | P0 | 동상 | 동상 |
| T-AXE-06 | 세이브 UI | P0 | 동상 | 동상 |
| T-AXE-03 | 월드맵 | P1 | 동상 | Moderate ≤ 3 (예외 사유 명시) |
| T-AXE-02 | 캐릭생성 | P2 | 동상 | 동상 |

### 3.5 색 대비 (ColorContrastProbe) — 6 씬

| ID | 씬 | 우선 | 측정 대상 | 임계치 |
|----|----|------|-----------|--------|
| T-CON-04 | ATB 전투 | P0 | HP/MP/ATB 게이지 텍스트, 데미지 숫자, 스킬명 | AAA 7:1 (큰글자 4.5:1) |
| T-CON-05 | 인벤토리 | P0 | 아이템 이름·설명·등급 | 동상 |
| T-CON-06 | 세이브 UI | P0 | 슬롯 메타·시간·캐릭터명 | 동상 |
| T-CON-01 | 메인메뉴 | P0 | 메뉴 항목·버전 표기 | 동상 |
| T-CON-03 | 월드맵 | P1 | 지역명·NPC 이름표 | 동상 |
| T-CON-02 | 캐릭생성 | P2 | 폼 라벨·플레이스홀더 | 동상 |

> Canvas 텍스트는 `OffscreenCanvas` 픽셀 샘플링으로 측정 (두련사 도면 §4.1).

---

## 4. QA 체크리스트 (Build → Test → Ship 인계용)

### 4.1 Build 단계 인수 (계섬월 → 적경홍)

- [ ] **B-01**: `scripts/a11y/audit.ts` 단일 진입점 존재 + `npm run a11y` 동작
- [ ] **B-02**: 5 Probe 모듈 각각 단위 테스트 ≥ 1건 통과
- [ ] **B-03**: `tests/reports/a11y/summary.json` 스키마 정의 + 샘플 산출
- [ ] **B-04**: Playwright `tests/e2e/a11y/*.spec.ts` 6 씬 스캐폴드
- [ ] **B-05**: **CanvasA11yLayer PoC** (백능파 CEO 조건 — Build Day 2 데드라인)
- [ ] **B-06**: `AriaLabelMap` 컨트랙트 버전 락(`ARIA_CONTRACT_VERSION`)
- [ ] **B-07**: 4종 색맹 시뮬 베이스라인 스냅샷 커밋
- [ ] **B-08**: `git diff --stat ≠ 0` (코드 게이트 실증)

### 4.2 Test 단계 실행 (적경홍 본인)

- [ ] **T-01**: 42 케이스 전체 실행 (`npm run a11y -- --all`)
- [ ] **T-02**: P0 28 케이스 100% 통과 확인
- [ ] **T-03**: P1 10 케이스 ≥ 90% 통과
- [ ] **T-04**: 회귀 스냅샷 diff 검토 (SSIM < 0.95 시 사유 기재)
- [ ] **T-05**: 실 NVDA 1회 수동 검증 (계섬월 협조, 전투/세이브 시나리오)
- [ ] **T-06**: 실 키보드 풀 루프 1회 (T-KBD-INT 인간 재현)
- [ ] **T-07**: 헬스 스코어 산출 (`/qa Standard`) 및 본 문서에 기록
- [ ] **T-08**: 버그 발견 시 `BUG-A11Y-XXX` ID 부여 → 계섬월 인계
- [ ] **T-09**: Ship 가능/불가 판정 → 백능파 보고

### 4.3 Ship 단계 게이트 (적경홍 → 진채봉)

- [ ] **S-01**: `tests/reports/a11y/summary.json` Critical=0, Serious=0
- [ ] **S-02**: `launch_checklist.md §2.17 / §4` 자동 토글 ✅
- [ ] **S-03**: `tests/reports/a11y/report.html` PR 코멘트 첨부
- [ ] **S-04**: VPAT 2.4 근거 데이터 진채봉에게 인계
- [ ] **S-05**: `/canary` 5분 모니터링 — a11y 토글 정상 동작 확인
- [ ] **S-06**: 회고용 메트릭 기록 (실행 시간, 케이스 통과율, FP/FN)

---

## 5. 리스크 영역 (전선 정찰 보고)

| # | 리스크 | 확률 | 영향 | 대응 |
|---|--------|------|------|------|
| R1 | Canvas 내부 텍스트 측정 불가 → ColorContrastProbe 사각지대 | 중 | 상 | OffscreenCanvas 샘플링 + Phaser BitmapText 메타 추출 (두련사 PoC) |
| R2 | NVDA/JAWS CI 미지원 → SR 회귀 방어 약화 | 상 | 중 | live region mutation 모킹 + Test 단계 수동 1회 강제 |
| R3 | 4종 색맹 스냅샷 변경 시 false positive 폭증 | 중 | 중 | SSIM 0.95 임계치 + diff 시각화 리뷰 게이트 |
| R4 | axe-core가 Phaser canvas DOM을 못 읽음 | 상 | 중 | ARIA shadow DOM 미러링 (CanvasA11yLayer) — B-05 PoC 의존 |
| R5 | 키보드 트래버스 무한 루프 | 저 | 상 | 200스텝 hard timeout + 사이클 감지 |
| R6 | 7일 커밋 0건 표류 재발 | 중 | 상 | DoD `git diff --stat ≠ 0` 강제 (백능파 조건) |

---

## 6. 팀 인계 사항

- **계섬월 (Engineer)**: 5 Probe 구현 시 본 매트릭스의 단언 컬럼을 테스트 코드로 직역. 버그 재현 단계는 `BUG-A11Y-XXX` 템플릿(`docs/release/cross-browser-issues.md` 형식 차용)으로 받습니다.
- **이소화 (Security)**: T1(SSRF)·T2(PII)·T5(DOM XSS) 위협은 본 QA 매트릭스 외부 — 보안 체크리스트와 **공동 검증** 진행 (Test Day 4 합동 점검).
- **진채봉 (Editor)**: Ship 단계 인계 시 `summary.json` + `report.html` + 본 QA 결과를 릴리스 노트 §접근성 항목에 반영.
- **가춘운 (CMO)**: 색맹 스냅샷 회귀 발생 시 디자인 토큰 재검토 협조 요청.
- **두련사 (Eng Manager)**: B-05 CanvasA11yLayer PoC가 Build Day 2 안에 안 나오면 본 작전 매트릭스 P0 28 중 18(axe·contrast 의존)이 무력화 — **즉시 보고**.

---

## 7. 메트릭 기록란 (Test 단계에서 채움)

| 항목 | 목표 | 실측 | 판정 |
|------|------|------|------|
| 총 실행 시간 | ≤ 5분 | _TBD_ | _TBD_ |
| P0 통과율 | 100% | _TBD_ | _TBD_ |
| P1 통과율 | ≥ 90% | _TBD_ | _TBD_ |
| Critical | 0 | _TBD_ | _TBD_ |
| Serious | 0 | _TBD_ | _TBD_ |
| 헬스 스코어 | ≥ 90/100 | _TBD_ | _TBD_ |

---

## 8. Run-book — Test 단계 명령 시퀀스 (적경홍 직접 실행)

> 출정 시 본 시퀀스를 위에서 아래로. 각 단계는 **앞 단계 통과 시에만** 다음으로.

```bash
# [STEP 1] 환경 점검 — 사전 확인 (60초)
node --version                          # ≥ 20.x
npm run typecheck                       # TS Errors 0 (회귀 방어)
git status --short                      # 워킹트리 정리

# [STEP 2] 자산 빌드 — Probe·시뮬·테마 로딩 (90초)
npm run build:a11y                      # CanvasA11yLayer + AriaContract 미러링
npm run a11y:baseline -- --refresh=false # 4 색맹 스냅샷 무결성 체크 only

# [STEP 3] 풀스캔 실행 — 42 케이스 (≤ 5분 목표)
npm run a11y -- --scenes=all --probes=all --report=tests/reports/a11y

# [STEP 4] 게이트 자동 판정
node scripts/a11y/gate.ts tests/reports/a11y/summary.json
#   exit 0 → AA 0 / AAA ≤ 5 → 🟢 PASS
#   exit 1 → AA ≥ 1        → 🔴 BLOCK
#   exit 2 → AAA ≥ 6       → 🟡 WARN

# [STEP 5] 헬스 스코어 산출
npm run a11y:score          # /qa Standard 결과 → 본 문서 §7 메트릭란에 기록

# [STEP 6] 수동 검증 — 인간만이 잡는 사각지대 (15분)
#   (a) 실 NVDA: ATB 전투 → HP 20% 발화 / 세이브 완료 발화
#   (b) 실 키보드: 메인→캐릭→월드→전투→인벤→세이브 풀 루프, 마우스 금지
#   결과: T-AR-04-CRIT, T-AR-06, T-KBD-INT 수동 ✅/❌ 표기

# [STEP 7] PR 첨부 산출물 검증
ls tests/reports/a11y/      # summary.json · report.html · snapshots/cb-*.png 4종
```

**실패 시 분기:**
- 🔴 BLOCK → 즉시 백능파 보고 + 계섬월 재공격 명령 + Ship 보류
- 🟡 WARN → AAA 위반 5건까지 허용, 단 launch_checklist에 사유 명시
- 스냅샷 회귀 → 가춘운 디자인 토큰 점검 요청, false positive면 베이스라인 갱신

---

## 9. BUG-A11Y 보고 템플릿 (계섬월 인계 양식)

```markdown
# BUG-A11Y-XXX: <한 줄 증상>

**발견 케이스**: T-CB-04-D (또는 해당 케이스 ID)
**우선순위**: P0 / P1 / P2
**WCAG 위반**: 1.4.6 Contrast (Enhanced) AAA / 2.1.1 Keyboard A / 4.1.2 Name·Role·Value A
**환경**: Chrome 130 · Windows 11 · NVDA 2024.4 · 1920×1080
**재현율**: __/10

## 재현 단계
1. ...
2. ...
3. ...

## 기대 결과
- 색·형태·텍스트 삼중 인코딩으로 식별 가능

## 실제 결과
- 색만으로 표현되어 deuteranopia 시뮬에서 적·아군 구분 불가

## 증거
- 스크린샷: tests/reports/a11y/snapshots/bug-a11y-xxx-*.png
- 측정값: 대비비 4.2:1 (목표 7:1)
- 콘솔 로그: <첨부>

## 영향 범위
- 씬: ATB 전투
- 사용자: deuteranopia · protanopia (색맹 인구의 ~6%)
- 머지 게이트: 🔴 BLOCK / 🟡 WARN / 🟢 통과

## 권장 수정
- AriaLabelMap 갱신 또는 가춘운 토큰 `--semantic-danger` 패턴 오버레이 적용
```

> 본 양식 사용 시 BUG ID는 `BUG-A11Y-001`부터 순번. 이미 `cross-browser-issues.md` BUG-CB-XXX와 충돌 없도록 prefix 분리.

---

> **보고 종료**.
> 현황: 작전 명령서 §1~§9 완비 — Run-book·BUG 양식까지 발효.
> 판정: Build 단계 진군 가능. Test 단계는 본 §8 시퀀스 그대로 실행하면 됨.
> 조치: 계섬월 5 Probe 구현 대기, B-05 CanvasA11yLayer PoC Day 2 보고 대기, 두련사 도면 §4.1 의존성 모니터링.
> 전선 이상 무. — 적경홍, 붉은 갑옷에 걸어 맹세함.
