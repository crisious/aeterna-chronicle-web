# 🐛 크로스브라우저 호환성 이슈 트래커

> **작성**: 진채봉 Editor
> **최종 갱신**: 2026-04-26 (Build 단계 — 사전 조사 결과 5건 등록)
> **연동**: `cross-browser-compatibility-guide.md` §4 이슈 템플릿
> **상태 범례**: 🟢 RESOLVED · 🟡 WORKAROUND · 🔴 OPEN · ⚪ TRIAGE

---

## 요약 보드

| ID | 요약 | 브라우저 | 심각도 | 카테고리 | 상태 | 담당 |
|----|------|----------|--------|----------|------|------|
| BUG-CB-001 | WebGL `preserveDrawingBuffer` 기본값 차이로 ATB 스크린샷 캡처 시 빈 프레임 | Firefox 124+ | P1 | 렌더링 (R-02) | 🟡 WORKAROUND | 계섬월 |
| BUG-CB-002 | Safari Private 모드에서 IndexedDB `open()` 즉시 reject → 세이브 슬롯 진입 불가 | Safari 17.x (Private) | P0 | 저장 (S-04) | 🔴 OPEN | 계섬월 |
| BUG-CB-003 | Safari ITP — 7일 미접속 시 IndexedDB 자동 삭제로 진행도 유실 | Safari 17.x | P0 | 저장 (S-05) | 🟡 WORKAROUND | 계섬월 |
| BUG-CB-004 | WebAudio AudioContext 첫 사용자 제스처 전까지 BGM 무음 | Safari · Firefox(부분) | P1 | 렌더링/입력 (R-11 인접) | 🟡 WORKAROUND | 가춘운 |
| BUG-CB-005 | Firefox 한글 IME 입력 중 ESC 키가 메뉴를 즉시 열어 조합 문자 손실 | Firefox 124+ | P2 | 입력 (I-04) | 🔴 OPEN | 적경홍 |

> 신규 이슈는 가이드 §4 템플릿을 복사해 아래 `## 상세` 섹션 **상단**에 추가하옵소서.

---

## 상세

### [BUG-CB-005] Firefox에서 한글 IME 조합 중 ESC 키로 메뉴가 즉시 열려 입력이 끊김

- **브라우저**: Firefox 124.0 / Windows 11
- **재현율**: 5/5 (항상)
- **심각도**: P2
- **카테고리**: 입력
- **체크리스트 ID**: I-04

#### 재현 절차
1. 인벤토리 진입 → 검색창에 한글 입력 시작 ("아이" 까지 입력)
2. 조합 미완 상태에서 ESC 키 입력
3. ESC가 `keydown`으로 즉시 발화하여 메뉴가 닫힘

#### 기대 동작
Chrome처럼 IME 조합 중에는 ESC를 무시하고, 조합 종료 후 다음 ESC만 메뉴 닫기로 처리.

#### 실제 동작
Firefox는 `compositionend` 보다 `keydown(ESC)` 가 먼저 dispatch되는 케이스가 있어, 가드가 한 박자 늦음.

#### 임시 우회
없음 — Test 단계에서 `compositionstart` ~ `compositionend` 구간 동안 ESC 한정 deferred-handler로 큐잉하는 패치 검토 예정.

---

### [BUG-CB-004] WebAudio AudioContext 자동 재생 차단으로 BGM 무음

- **브라우저**: Safari 17.x · Firefox(설정에 따라)
- **재현율**: Safari 5/5 · Firefox 2/5
- **심각도**: P1
- **카테고리**: 렌더링/오디오
- **체크리스트 ID**: 가이드 §3.2 (인접) · 신규 A-01 후보

#### 재현 절차
1. 메인 메뉴 직진입 (사용자 클릭 없이 자동 로드)
2. 메인 BGM이 재생되지 않음
3. 첫 클릭 후에야 BGM이 시작됨

#### 기대 동작
첫 사용자 제스처 전까지는 무음이 정상 — 단, 첫 제스처 직후 즉시 `AudioContext.resume()` 호출로 끊김 없이 BGM 시작.

#### 실제 동작
현재 일부 씬에서 `resume()` 트리거가 메인 메뉴 진입 시점에만 걸려 있어, 외부 링크에서 직접 게임 씬으로 진입하면 영원히 무음.

#### 임시 우회
🟡 모든 입력 가능 씬의 첫 `pointerdown`/`keydown` 핸들러에 `audioContext.state === 'suspended'` 가드 + `resume()` 일괄 적용 (계섬월 패치 예정).

---

### [BUG-CB-003] Safari ITP — 7일 미접속 시 IndexedDB 자동 삭제

- **브라우저**: Safari 17.x / macOS Sonoma+
- **재현율**: 7일 경과 시 항상 (정책)
- **심각도**: P0 (CBT 진행도 유실)
- **카테고리**: 저장
- **체크리스트 ID**: S-05 (마이그레이션) · S-06 (백업) 인접

#### 재현 절차
1. 새 게임 시작 → 챕터 1 클리어 → IndexedDB 세이브
2. 7일 이상 사이트 미방문
3. 재방문 시 세이브 슬롯이 비어 있음 (Apple ITP 정책)

#### 기대 동작
7일 경과 후에도 마지막 세이브가 유지되어야 함.

#### 실제 동작
Safari ITP가 First-party storage를 자동 청소.

#### 임시 우회
🟡 다음 두 가지 병행:
1. **주간 keep-alive ping**: 게임 진입 시 `navigator.storage.persist()` 요청 → "지속 저장" 권한 획득 시 ITP 면제
2. **이중 백업**: IndexedDB와 별개로 LocalStorage에 마지막 세이브 메타(슬롯·챕터·플레이타임)만 미러링하여 복구 안내 가능

> Test 단계에서 Safari 실기 또는 BrowserStack으로 7일 시뮬레이션 검증.

---

### [BUG-CB-002] Safari Private 모드에서 세이브 슬롯 진입 불가

- **브라우저**: Safari 17.x (Private Browsing) / macOS·iPadOS
- **재현율**: 5/5 (항상)
- **심각도**: P0
- **카테고리**: 저장
- **체크리스트 ID**: S-04

#### 재현 절차
1. Safari Private 창에서 게임 URL 진입
2. 메인 메뉴 → 새 게임 클릭
3. "저장 슬롯 초기화 실패" 오류 후 진입 차단

#### 기대 동작
사용자에게 "사생활 보호 모드에서는 진행도가 저장되지 않습니다. 일반 창으로 다시 열어주세요." 안내 후 **체험 모드**(메모리 전용)로 진입 가능.

#### 실제 동작
IndexedDB `open()` 이 즉시 reject되어 로딩 화면에서 멈춤.

#### 임시 우회
계섬월이 클라이언트에 `safariITPWarning` 토스트(`i18n` 7종 추가분 사용) + 메모리 폴백 어댑터 추가 예정. Test 단계에서 검증.

---

### [BUG-CB-001] Firefox WebGL `preserveDrawingBuffer` 기본값 차이

- **브라우저**: Firefox 124+ / Windows 11
- **재현율**: 5/5
- **심각도**: P1 (스크린샷 기능 한정)
- **카테고리**: 렌더링
- **체크리스트 ID**: R-02

#### 재현 절차
1. 게임 진입 → 전투 씬에서 스크린샷 단축키(F12) 입력
2. 캡처된 PNG가 검은 화면

#### 기대 동작
현재 프레임이 그대로 캡처되어야 함.

#### 실제 동작
Firefox는 `preserveDrawingBuffer: false` 가 기본이라, `requestAnimationFrame` 외부 시점의 `toDataURL()` 호출 시 빈 버퍼.

#### 임시 우회
🟡 Phaser config에 `render.preserveDrawingBuffer: true` 명시 (메모리 사용량 ~5% 증가 트레이드오프). 또는 캡처 직전 `renderer.snapshot()` API 사용으로 우회.

---

> **운영 노트**: 본 트래커는 Test 단계에서 적경홍 QA가 자동화 26 케이스 결과를 누적 기록하며, Ship 단계에서 진채봉이 release_notes의 `Known Issues` 섹션과 동기화하옵니다.
