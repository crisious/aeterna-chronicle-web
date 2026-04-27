# 🌐 크로스브라우저 호환성 검증 가이드 v1.0

> **작성**: 진채봉 Editor
> **스프린트**: 에테르나 크로니클 크로스브라우저 호환성 검증 — Firefox · Safari
> **목적**: `launch_checklist.md §2.1` 3건 (Chrome / Firefox / Safari) 회귀 테스트 SSOT
> **단계**: Asset · Build → Test → Ship 인계용 템플릿
> **대상 빌드**: v1.0-rc.3 (CBT 직전)

---

## 0. 이 문서의 위치

```
launch_checklist.md §2.1 (체크박스 3건)
        │
        └─▶ cross-browser-compatibility-guide.md  ← 본 문서 (테스트 절차·매트릭스·이슈 템플릿)
                │
                ├─▶ test/cross-browser/*.spec.ts  (적경홍 QA — Playwright 자동화)
                └─▶ docs/release/release_notes_v1.0-rc.3.md (Ship 단계 결과 반영)
```

---

## 1. 테스트 매트릭스

### 1.1 브라우저 × OS 매트릭스 (CBT 최소 커버리지)

| 우선순위 | 브라우저 | 버전 | OS | 비고 |
|----------|----------|------|----|----|
| **P0** | Chrome | 최신 안정판 (Stable) | Windows 11 | 기준 브라우저 (Reference) |
| **P0** | Firefox | 최신 안정판 (Stable) | Windows 11 | WebGL 컨텍스트 차이 주의 |
| **P0** | Safari | 17.x 이상 | macOS Sonoma+ | WebAudio·IndexedDB 정책 차이 |
| **P1** | Chrome | 최신 안정판 | macOS | 폰트 렌더링 차이 |
| **P1** | Edge (Chromium) | 최신 안정판 | Windows 11 | 회귀 안전망 |
| **P2** | Firefox ESR | 115 ESR | Windows 11 | 기업 환경 대비 |

> **외부 검증 도구 권장**: BrowserStack · Sauce Labs (Safari 실기 부재 시)

### 1.2 검증 차원 3종

| 차원 | 범위 | 책임 |
|------|------|------|
| **렌더링** | Phaser 캔버스 · CSS 디자인 시스템 · 폰트 · 이펙트 | 가춘운 CMO + 진채봉 검수 |
| **입력** | 마우스 · 키보드 · 포커스 트랩 · 단축키 | 적경홍 QA |
| **저장** | LocalStorage · IndexedDB · SaveSlot 마이그레이션 | 계섬월 Eng |

---

## 2. 회귀 테스트 시나리오 (Smoke + Critical Path)

### 2.1 렌더링 회귀 — 12 케이스

- [ ] **R-01** 메인 메뉴 진입 시 로고·배경 페이드인 정상 (Chrome 기준 ±50ms 이내)
- [ ] **R-02** Phaser 캔버스 1920×1080 스케일 모드 정상 (`Scale.FIT` 검증)
- [ ] **R-03** ATB 게이지 5상태 (empty → charging-1/2/3 → ready) 색상 일치
- [ ] **R-04** 대미지 팝업 7종 (일반·크리티컬·회복·빗나감·약점·저항·면역) 글꼴 굵기·크기 동일
- [ ] **R-05** 상태이상 SVG 8종 crispEdges 렌더 정상 (Burn·Poison·Freeze·Stun·Bleed·Silence·Shield·Haste)
- [ ] **R-06** NPC 대화박스 반응형 3단계 (1280/1024/768) 줄바꿈 정상
- [ ] **R-07** 아이템 등급 글로우 키프레임 (`mythic-pulse`, `ether-pulse`) 60fps 유지
- [ ] **R-08** 지역별 발광 액센트 8개 존 색상 일치
- [ ] **R-09** 픽셀 폰트 안티앨리어싱 OFF 적용 (`image-rendering: pixelated`)
- [ ] **R-10** `prefers-reduced-motion` 활성 시 키프레임 자동 정지
- [ ] **R-11** WebGL 컨텍스트 손실(Lost) 시 자동 복구 토스트 노출
- [ ] **R-12** Safari WebKit `backdrop-filter` 폴백 동작 확인

### 2.2 입력 회귀 — 8 케이스

- [ ] **I-01** WASD/방향키 이동 입력 지연 ≤16ms
- [ ] **I-02** 단축키 (I=인벤토리, M=지도, ESC=메뉴) 모든 브라우저 일관
- [ ] **I-03** Tab 키 포커스 트랩 정상 (모달 내부 순환)
- [ ] **I-04** 한글 IME 입력 시 게임 단축키 비활성 (compositionstart/end 가드)
- [ ] **I-05** 마우스 휠 줌 in/out 양방향 동작
- [ ] **I-06** 우클릭 컨텍스트 메뉴 차단 (게임 영역 내)
- [ ] **I-07** 키보드 동시 입력 (이동+공격) 정상
- [ ] **I-08** Safari 트랙패드 핀치-줌 차단

### 2.3 저장 회귀 — 6 케이스

- [ ] **S-01** 새 게임 → 저장 → 새로고침 → 로드 정상
- [ ] **S-02** SaveSlot 1·2·3 독립 저장 유지
- [ ] **S-03** IndexedDB 용량 초과(QuotaExceededError) 시 사용자 알림
- [ ] **S-04** Safari 사생활 보호 모드(Private)에서 LocalStorage 폴백 안내
- [ ] **S-05** 구버전 세이브 → 신버전 마이그레이션 무손실
- [ ] **S-06** 세이브 파일 손상 감지 시 백업본(`save.bak`) 자동 복구

---

## 3. 브라우저별 알려진 차이점 & 대응

### 3.1 Firefox

| 항목 | 차이 | 대응 |
|------|------|------|
| WebGL `preserveDrawingBuffer` | 기본값 차이 | Phaser config 명시 |
| 폰트 렌더링 | hinting 차이로 1px 시프트 | `font-smoothing` 토큰 통일 |
| LocalStorage 동기 쓰기 | 약간 느림 | 쓰기 디바운스 200ms |

### 3.2 Safari (WebKit)

| 항목 | 차이 | 대응 |
|------|------|------|
| IndexedDB 7일 미사용 시 자동 삭제 | ITP 정책 | 주간 keep-alive ping |
| `requestAnimationFrame` 백그라운드 탭에서 1Hz | 전력 절약 | `visibilitychange` 핸들러로 일시정지 |
| WebAudio AudioContext 자동 재생 차단 | 사용자 제스처 필요 | 첫 클릭 시 `resume()` |
| `:has()` 선택자 | 16.4+ 지원 | 폴백 클래스 병행 |

### 3.3 Chrome (기준)

| 항목 | 비고 |
|------|------|
| Reference 브라우저로 사용 | 모든 회귀는 Chrome 결과를 정상치(±5%)로 비교 |

---

## 4. 이슈 리포트 템플릿

````markdown
## [BUG-CB-XXX] {{한 줄 요약}}

- **브라우저**: Firefox 124.0 / Windows 11
- **재현율**: 5/5 (항상)
- **심각도**: P0 / P1 / P2
- **카테고리**: 렌더링 / 입력 / 저장
- **체크리스트 ID**: R-XX / I-XX / S-XX

### 재현 절차
1. ...
2. ...

### 기대 동작
Chrome 기준과 동일한 ...

### 실제 동작
Firefox에서 ...

### 증거
- 스크린샷: `evidence/cb-xxx-firefox.png`
- 콘솔 로그: `evidence/cb-xxx-console.txt`
- 영상: (선택)

### 임시 우회
(있으면 기재)
````

---

## 5. Build → Test → Ship 인계 체크리스트

### Build 단계 (계섬월)
- [ ] `playwright.config.ts` projects에 firefox·webkit 추가
- [ ] `test/cross-browser/` 디렉터리 생성, 시나리오 §2 기반 spec 작성
- [ ] CI 워크플로 `cross-browser.yml` PR 트리거 등록

### Test 단계 (적경홍)
- [ ] 자동화 시나리오 26 케이스 모두 PASS
- [ ] 수동 검증 (Safari 실기 또는 BrowserStack) §2.1 R-08·R-12 확인
- [ ] 발견된 이슈 본 문서 §4 템플릿으로 `docs/release/cross-browser-issues.md`에 누적

### Ship 단계 (진채봉)
- [ ] `launch_checklist.md §2.1` 3건 [x] 처리
- [ ] `release_notes_v1.0-rc.3.md` Fixed 섹션에 호환성 패치 기재
- [ ] CHANGELOG `[1.0.0-rc.3]`에 본 검증 결과 한 줄 요약 추가
- [ ] 발견 이슈 0건이 아니면 `Known Issues` 섹션에 명시

---

## 6. 유저 FAQ — CBT 안내 카드

> 이 절은 CBT 참가자에게 그대로 노출 가능한 안내문이옵니다. 적경홍 QA의 검증이 완료된 후 `client/public/help/browser-faq.html` 에 동봉 예정.

### Q1. 어떤 브라우저를 추천하나요?

| 권장도 | 브라우저 | 비고 |
|--------|----------|------|
| ⭐⭐⭐ | Chrome / Edge (최신) | 가장 안정적인 경험 |
| ⭐⭐⭐ | Firefox (최신) | 안정적 — 일부 IME 입력 케이스 점검 중 |
| ⭐⭐ | Safari 17+ | 일반 창 사용 권장 (Private 모드 비권장) |
| ⛔ | IE / Safari 16 이하 | 미지원 — 진입 시 안내 화면 |

### Q2. Safari Private(사생활 보호) 모드에서 게임이 안 켜져요

Safari Private 창은 IndexedDB가 차단되어 진행도를 저장할 수 없사옵니다. **일반 창**으로 다시 열어주옵소서. (정식 출시 시 체험 모드 진입 옵션을 제공할 예정)

### Q3. 7일 만에 접속했더니 세이브가 사라졌어요 (Safari)

Apple ITP 정책으로 7일 미접속 시 브라우저 저장소가 자동 초기화되옵니다. 저희는 다음을 적용 중이옵니다:
- 진입 시 "지속 저장" 권한 자동 요청 (한 번 허용하면 면제)
- 향후 Steam Cloud / 계정 동기화로 영구 보존 예정

### Q4. BGM이 처음에 안 들려요

브라우저 정책상 첫 클릭 또는 키 입력 전에는 자동 재생이 차단되옵니다. 화면을 한 번 클릭하시면 BGM이 시작되옵니다.

### Q5. 한글 입력 중 ESC가 메뉴를 열어버려요 (Firefox)

알려진 이슈로(BUG-CB-005) 차기 패치에서 IME 조합 가드를 추가하옵니다. 임시로 한글 입력 종료(엔터/스페이스) 후 ESC를 사용하시옵소서.

### Q6. 화면이 깨져 보입니다

`Ctrl + Shift + R`(Cmd + Shift + R)로 강력 새로고침 후 재시도하시고, 그래도 동일하면 `F12 → Console` 의 에러 메시지를 첨부하여 디스코드 #bug-report 채널에 제보해주옵소서.

---

## 7. 참조

- `docs/release/launch_checklist.md` — §2.1 빌드 검증
- `docs/release/atb-battle-system-guide.md` — ATB 렌더 SSOT
- `client/src/styles/design-system.css` — CSS 변수 호환성 영역
- `DESIGN.md` §7 테마 & 접근성

---

> *"흩어진 곡조를 세 악기로 함께 울려, 어느 무대에서도 그 가락이 어긋나지 않게 하옵소서."*
> — 진채봉
