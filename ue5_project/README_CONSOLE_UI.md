# P3-13: UMG 콘솔 UI 시스템

> **에테르나 크로니클** — UE5.5 콘솔 UI 프레임워크  
> Safe Zone · 4K/HDR · 게임패드 내비게이션 · 접근성

---

## 아키텍처 개요

```
┌─────────────────────────────────────────────────────┐
│                  ConsoleUIManager                    │
│     (GameInstance Subsystem — 위젯 스택 관리)        │
│                                                     │
│  ┌──────────┐  ┌──────────┐  ┌────────────────────┐ │
│  │ PushUI() │  │ PopUI()  │  │ 입력 모드 자동 전환 │ │
│  └────┬─────┘  └────┬─────┘  └─────────┬──────────┘ │
│       │              │                  │            │
│  ┌────▼──────────────▼──────────────────▼──────────┐ │
│  │              UI Widget Stack                     │ │
│  │  [0] HUD → [1] 인벤토리 → [2] 아이템 상세      │ │
│  └──────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
         │                    │                │
    ┌────▼────┐      ┌───────▼──────┐   ┌─────▼──────┐
    │SafeZone │      │ Resolution   │   │Controller  │
    │Wrapper  │      │ Manager      │   │Navigation  │
    │         │      │              │   │            │
    │PS5: 90% │      │4K/HDR/스케일 │   │D-pad/스틱  │
    │Xbox:93% │      │ST.2084 PQ   │   │A/B 매핑    │
    │PC: 100% │      │FPS 타겟     │   │탭 전환     │
    └─────────┘      └─────────────┘   └────────────┘
```

---

## 파일 구조

```
ue5_project/
├── Source/AeternaChronicle/UI/
│   ├── ConsoleUIManager.h/.cpp      # UI 위젯 스택 + 입력 모드 전환
│   ├── SafeZoneWrapper.h/.cpp       # 플랫폼별 Safe Zone 래퍼
│   ├── ResolutionManager.h/.cpp     # 해상도 + HDR + UI 스케일
│   ├── ControllerNavigation.h/.cpp  # 게임패드 포커스 내비게이션
│   ├── HUD/
│   │   └── ConsoleHudOverlay.h/.cpp # 기존 HUD 콘솔 적응 레이어
│   └── Settings/
│       ├── DisplaySettings.h/.cpp   # 디스플레이 설정 메뉴
│       └── AccessibilitySettings.h/.cpp # 접근성 설정 메뉴
├── Config/
│   ├── DefaultEngine.ini            # HDR, 렌더링 품질 프리셋
│   └── DefaultInput.ini             # 게임패드 바인딩
└── README_CONSOLE_UI.md             # 이 문서
```

---

## 1. ConsoleUIManager — 위젯 스택

UI 레이어를 스택으로 관리. 메뉴를 열면 Push, 닫으면 Pop.

```cpp
// 인벤토리 열기
UConsoleUIManager* UIMgr = GetGameInstance()->GetSubsystem<UConsoleUIManager>();
UIMgr->PushUI(InventoryWidget, /*bConsumeInput=*/true, /*DefaultFocus=*/TEXT("FirstSlotBtn"));

// B 버튼 → 자동 Pop (ControllerNavigation이 처리)
```

### 입력 모드 자동 전환
- 게임패드 키 감지 → **게임패드 모드** (마우스 커서 숨김)
- 마우스/키보드 감지 → **마우스+키보드 모드** (커서 표시)
- `OnInputModeChanged` 델리게이트로 UI 힌트 텍스트 갱신

---

## 2. Safe Zone

### 플랫폼별 기본값

| 플랫폼 | Safe Zone 비율 | 근거 |
|---------|---------------|------|
| PS5 | 90% | Sony TRC 필수 요구사항 |
| Xbox Series X/S | 93% | Xbox XR 권장 |
| Nintendo Switch 2 | 90% | 닌텐도 가이드라인 |
| PC | 100% | 패딩 불필요 |

### 사용자 조절

설정 메뉴에서 Safe Zone 슬라이더로 런타임 조절 가능 (50% ~ 100%).

```cpp
// Safe Zone 래퍼 사용
USafeZoneWrapper* Wrapper = CreateWidget<USafeZoneWrapper>(this);
Wrapper->InitializeForCurrentPlatform(); // 자동 감지
Wrapper->SetSafeZonePadding(0.9f);       // 수동 설정
```

### 콘솔 인증 체크리스트
- [x] PS5 TRC: Title Safe Area ≤ 90%
- [x] Xbox XR: UI 요소가 93% 영역 내
- [x] 런타임 조절 UI 제공
- [x] Safe Zone 설정 영속화 (SaveGame)

---

## 3. 해상도 + HDR

### 해상도 프리셋

| 프리셋 | 해상도 | 기본 플랫폼 |
|--------|--------|------------|
| 4K | 3840×2160 | PS5, Xbox Series X |
| 1440p | 2560×1440 | Xbox Series S |
| 1080p | 1920×1080 | PC 저사양 |
| Auto | 네이티브 감지 | PC 기본 |

### HDR 설정

**톤매핑: ST.2084 PQ (Perceptual Quantizer)**

```ini
; DefaultEngine.ini
r.HDR.EnableHDROutput=1
r.HDR.Display.OutputDevice=3   ; ST.2084
r.HDR.Display.ColorGamut=2     ; Rec.2020
r.HDR.UI.Level=200.0           ; UI 밝기 (니트)
```

| 파라미터 | 범위 | 기본값 | 설명 |
|----------|------|--------|------|
| Peak Brightness | 400~10000 nit | 1000 nit | 디스플레이 최대 밝기 |
| Paper White | 80~500 nit | 200 nit | SDR 기준 백색 밝기 |
| UI Brightness | 0.5~2.0× | 1.0× | UI 레이어 밝기 보정 |

### UI 스케일링 (DPI 기반)

| 해상도 | 자동 스케일 |
|--------|-----------|
| 4K (2160p) | 2.0× |
| 1440p | 1.33× |
| 1080p | 1.0× |

수동 조절: 0.5× ~ 2.0× (설정 메뉴 슬라이더)

---

## 4. 게임패드 내비게이션

### 기본 매핑 (서양식)

| 버튼 | UI 동작 | 키보드 대체 |
|------|---------|-----------|
| D-pad / 왼쪽 스틱 | 포커스 이동 | 방향키 |
| A (Cross) | 확인 | Enter |
| B (Circle) | 취소/뒤로 | Escape |
| LB/RB | 탭 전환 | Q/E |
| LT 홀드 + D-pad | 확장 퀵슬롯 (4~7) | 5~8 |
| Start | 시스템 메뉴 | — |

### 일본식 매핑 (옵션)

| 버튼 | UI 동작 |
|------|---------|
| B (Circle) | 확인 |
| A (Cross) | 취소 |

설정 메뉴 → 접근성 → 컨트롤러 매핑에서 전환.

### 포커스 검색 알고리즘

1. 현재 포커스 위젯의 화면 중심좌표 계산
2. 입력 방향과 일치하는 후보 위젯 필터링
3. `주 축 거리 + 부 축 거리 × 2.0` 점수로 최적 후보 선택
4. 같은 행/열의 인접 위젯 우선

### 스틱 연속 입력

| 파라미터 | 기본값 | 설명 |
|----------|--------|------|
| 데드존 | 0.25 | 스틱 감도 |
| 첫 반복 대기 | 0.3초 | 꾹 누르기 시작 → 첫 반복 |
| 반복 간격 | 0.15초 | 이후 연속 반복 속도 |

---

## 5. HUD 콘솔 적응

기존 `ue5_umg/HUD/` 위젯을 `ConsoleHudOverlay`로 래핑:

- **Safe Zone 적용** — 모든 HUD 요소가 Safe Zone 안에 배치
- **게임패드 퀵슬롯** — D-pad 4방향 (기본) + LT+D-pad 4방향 (확장) = 8슬롯
- **입력 힌트 자동 전환** — 마우스 모드면 "1~8", 게임패드 모드면 "D-Pad ↑" 등
- **UI 스케일 자동** — ResolutionManager 이벤트 구독, 해상도 변경 시 자동 조절

---

## 6. 접근성 (WCAG 2.1 AA)

### 색맹 보정

| 모드 | CVar | 대상 |
|------|------|------|
| Protanopia (적색맹) | r.ColorDeficiency 1 | 빨강-초록 구분 어려움 |
| Deuteranopia (녹색맹) | r.ColorDeficiency 2 | 가장 흔한 색맹 유형 |
| Tritanopia (청색맹) | r.ColorDeficiency 3 | 파랑-노랑 구분 어려움 |

`r.ColorDeficiencyCorrection 1`로 시뮬레이션이 아닌 **보정** 모드 사용.

### 자막 크기

| 프리셋 | 폰트 크기 |
|--------|----------|
| 작게 | 14pt |
| 보통 | 18pt |
| 크게 | 24pt |
| 매우 크게 | 32pt |

### 추가 접근성 옵션

- 화면 흔들림 감소 (카메라 쉐이크 비활성화)
- 고대비 UI 모드
- 햅틱 피드백 on/off
- 자막 배경 투명도 조절

---

## 7. 렌더링 품질 프리셋 (DefaultEngine.ini)

| 프리셋 | 대상 | 해상도 | HDR | 특이사항 |
|--------|------|--------|-----|---------|
| PS5 | PlayStation 5 | 4K 네이티브 | ✅ | 전 품질 최대 |
| Xbox Series X | Xbox X | 4K 네이티브 | ✅ | PS5 동급 |
| Xbox Series S | Xbox S | 1440p (75%) | ✅ | GI/이펙트 한 단계 절감 |
| PC High | 고사양 PC | 네이티브 | 선택 | 전 품질 최대 |
| PC Medium | 중간 PC | 85% 스케일 | — | 중간 품질 |
| PC Low | 저사양 PC | 67% 스케일 | — | 최소 품질 |

---

## 통합 가이드

### 새 UI 위젯 추가 시

```cpp
// 1. 위젯 생성
UUserWidget* MyMenu = CreateWidget<UMyMenuWidget>(GetWorld());

// 2. Safe Zone 래퍼 안에 배치 (블루프린트에서 USafeZoneWrapper를 루트로 설정)

// 3. ConsoleUIManager로 Push
UConsoleUIManager* UIMgr = GetGameInstance()->GetSubsystem<UConsoleUIManager>();
UIMgr->PushUI(MyMenu, true, TEXT("DefaultButton"));

// 4. ControllerNavigation이 자동으로 포커스 체인 구성 + 게임패드 입력 처리
```

### HDR 테스트 체크리스트

1. HDR 모니터/TV에서 `r.HDR.EnableHDROutput 1` 확인
2. UI 텍스트가 너무 밝거나 어둡지 않은지 → `r.HDR.UI.Level` 조절
3. SDR 폴백: HDR 미지원 디스플레이에서 정상 표시 확인
4. 페이퍼 화이트/피크 밝기 슬라이더 범위 검증

---

*최종 업데이트: 2026-03-11 | P3-13 콘솔 UI 시스템 초기 구현*
