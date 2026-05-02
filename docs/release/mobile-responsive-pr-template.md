# 모바일 반응형 PR / 커밋 메시지 컨벤션 v1.0

> 작성: 진채봉 Editor
> 작성일: 2026-04-29
> 스코프: 본 스프린트(`Auto-Mobile-Responsive`) PR/커밋 양식
> 봉인: 이소화 비협상 4항 (하단 §6)

---

## 1. PR 제목 — 7 스코프

```
mobile(<scope>): <한 줄 요약>
```

| 스코프 | 용례 |
|--------|------|
| `viewport` | 4종(360/375/414/430) 레이아웃 검증 게이트 |
| `touch` | pointer 이벤트 매핑·디바운스·지연 측정 |
| `hud` | 좌상단 HP/MP 바, 미니맵, 퀘스트 트래커 |
| `battle-ui` | ATB·스킬슬롯·타겟 인디케이터 모바일 변형 |
| `safe-area` | env(safe-area-inset-*) 보정·노치 회피 |
| `font` | fontSize ≥ 14px 정책·Phaser Text 일괄 보정 |
| `docs` | 본 문서들·README·CHANGELOG·launch_checklist |

**예시**

```
mobile(viewport): mob-360 ATB 게이지 viewport-out 보정
mobile(touch): pointerdown→click p95 132ms→82ms 단축
mobile(safe-area): mob-430 닫기 버튼 노치 회피 + 패딩 토큰 추가
mobile(docs): README §📱 모바일 반응형 절 신설
```

---

## 2. PR 본문 — 7 섹션

### 2.1 자동 감사 표 (필수)

| 지표 | Before | After | Δ | 약속 |
|------|--------|-------|---|------|
| Viewport 시나리오 동작률 | 12/16 | **16/16** | +4 | 100% |
| 터치 지연 p95 (ms) | 132 | **82** | -50 | ≤ 100 |
| 본문 fontSize 위반 건수 | 7 | **0** | -7 | 0 |
| Safe-area 침범 건수 | 3 | **0** | -3 | 0 |

### 2.2 Schema 안정성 약속

- 디자인 토큰 `client/src/config/design-tokens.ts §responsive.breakpoints` **append-only**.
- 기존 데스크탑 1920×1080 좌표 변경 금지. 모바일 보정은 컨테이너 scale·offset으로만.

### 2.3 입력 핸들러 메모

- `pointerup` 단일 사용 → `pointerdown + pointerup` 페어 변경 시, 하위 호환 어댑터 30일 유지.
- 키보드/게임패드 입력 경로 변경 없음을 본문에 명시.

### 2.4 봉인 4항 (이소화 비협상 — 반드시 체크)

- [ ] 약속 4지표 수치를 임의 갱신하지 않았다 (백능파 승인 첨부 시에만 가능).
- [ ] ERROR 메시지는 2줄(본문+path) 형식을 지킨다.
- [ ] NO_COLOR=1 환경에서 동일 정보가 보존된다.
- [ ] outlier 면제는 PR 본문에 사유 메모 + `// MOBILE_WARN_ALLOW:` 주석 동반.

### 2.5 5인 인계 체크

- [ ] **두련사** (Architect) — 4 게이트 흐름 변경 없음, 새 게이트 추가 시 *선禪 4계* 미러 갱신.
- [ ] **계섬월** (Build) — `client/src/constants/mobile_responsive_messages.ts` 카피 4슬롯 동기화.
- [ ] **정경패** (Review) — `mobile.<gate>.<state>.<reason>` 키 규약 준수 검토.
- [ ] **적경홍** (QA) — `npm run mobile:gate` 4 게이트 모두 PASS, CI 로그 첨부.
- [ ] **이소화** (Sentinel) — 봉인 4항 전수 검토, 위반 시 즉시 RFC.

### 2.6 디자인 미러 (가춘운)

- DESIGN.md §8. 반응형 브레이크포인트 갱신 여부 명시.
- 스타일 가이드 페이지(`style-guide.html`)에 모바일 viewport 4종 미리보기 추가.

### 2.7 ship-gate 3-AND

본 PR 머지 후 다음 3개 모두 충족해야 ship-gate 통과:

1. `npm run mobile:gate` PASS
2. `npm run save:gate` PASS (이전 스프린트 자산 회귀 없음)
3. `npm run data:validate` PASS

---

## 3. 커밋 메시지 — Conventional Commits

```
<type>(<scope>): <한 줄 요약>

<본문 — 무엇을 왜 바꿨는지, 한 단락>

Refs: #<issue>
Co-Authored-By: <Agent Name> <noreply@anthropic.com>
```

**type 매트릭스**

| type | 사용처 |
|------|--------|
| `feat` | viewport·touch·UI 변형 신규 |
| `fix` | 잘림·지연·가독성 회귀 수정 |
| `refactor` | 좌표 계산 → safe-area 토큰 추출 |
| `test` | 4 게이트 자동 검사 추가 |
| `docs` | 본 문서들·README·CHANGELOG |
| `chore` | npm scripts·CI workflow 변경 |

---

## 4. 리뷰어 행동 가이드 5항

1. **이소화 봉인 비협상** — 약속 4지표 수치 변경, 2줄 ERROR 위반, NO_COLOR 미지원, outlier 면제 사유 누락 시 즉시 RFC.
2. **카운트 순서** — `[mobile.<gate>.<state>.<reason>]` → 본문 → path → hint. 어긋나면 가춘운 디자인 미러로 회부.
3. **NO_COLOR 필수** — `NO_COLOR=1 npm run mobile:gate` 출력에 ANSI 코드가 남아있으면 차단.
4. **outlier 면제 절차** — `// MOBILE_WARN_ALLOW: <사유>` 주석 + 백능파 승인 메모 PR 본문 첨부.
5. **데스크탑 회귀 검사** — `npm run test` 데스크탑 1920×1080 시나리오 0회귀 확인.

---

## 5. ship-gate 3-AND (재확인)

```
mobile:gate (4 게이트) ∧ save:gate (4 안전망) ∧ data:validate (4 게이트)
       =  ALL PASS  → ship 가능
```

> 셋 중 하나라도 FAIL이면 출시 차단. 백능파 승인 없이 우회 불가.

---

## 6. 봉인 항목 4종 (이소화 비협상)

1. **약속 4지표 수치 (viewport 100% / touch ≤ 100ms / font ≥ 14px / safe-area 0건)** — 임의 갱신 금지.
2. **4 게이트 순서 (Viewport → Touch → UI Variant → Font)** — 재배치 금지.
3. **빠른 시작 3명령 (`npm run mobile:viewport` / `mobile:touch-latency` / `mobile:gate`)** — 명령어 이름 변경 금지.
4. **ship-gate 3-AND (mobile:gate ∧ save:gate ∧ data:validate)** — AND 조건 해제 금지.

---

## 7. 예시 PR

```markdown
## 요약
mob-360에서 ATB 게이지가 viewport-out 되던 결, atbBar 컨테이너에 safe-area-inset 보정 + scale 0.85 적용으로 메우옵니다.

## 자동 감사
| 지표 | Before | After | Δ |
|------|--------|-------|---|
| Viewport 시나리오 | 12/16 | 16/16 | +4 |
| 터치 지연 p95 | 132ms | 82ms | -50ms |
| Font 위반 | 7 | 0 | -7 |
| Safe-area 침범 | 3 | 0 | -3 |

## 봉인 체크
- [x] 약속 4지표 임의 갱신 없음
- [x] ERROR 2줄 형식 준수
- [x] NO_COLOR=1 PASS
- [x] outlier 면제 0건

## 5인 인계
- [x] 두련사: *선禪 4계* 변경 없음
- [x] 계섬월: 카피 4슬롯 동기화
- [x] 정경패: 키 규약 준수
- [x] 적경홍: `mobile:gate` PASS, 로그 첨부
- [x] 이소화: 봉인 4항 PASS

Refs: #N/A
Co-Authored-By: 진채봉 <noreply@anthropic.com>
```

---

> 본 문서가 PR/커밋 1차 SSOT. 봉인 4항 변경은 백능파(Strategy) + 이소화(Sentinel) 양인 승인 필수.
