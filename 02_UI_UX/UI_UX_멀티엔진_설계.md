# 에테르나 크로니클 — UI/UX 설계 문서 (멀티 엔진)

> 작성일: 2026-02-22 | 버전: v2.1
> 엔진: Phaser.js (웹) / Unity Engine / Unreal Engine 5
> 기준 해상도: 1920×1080 (PC 기준), 3840×2160 (4K/콘솔)

> **업데이트 로그**
> | 버전 | 날짜 | 수정 내용 |
> |------|------|-----------|
> | v1.0 | 2026-02-20 | 웹 전용 UI/UX (`ui_ux_design.md`) |
> | v2.0 | 2026-02-22 | 멀티엔진 확장 — Phaser/Unity/UE5 UI 분리 설계, 게임패드/콘솔 Safe Zone, 접근성 고려 |
| v2.1 | 2026-03-05 | Google Stitch 기반 UI 생산 파이프라인 추가 — 디자인 토큰/컴포넌트 계약/엔진별 코드 변환 규칙 정의 |
> 참조 문서: 기술 아키텍처 설계서 v2.0

---

## 목차

1. [전체 화면 구성](#1-전체-화면-구성)
2. [게임플레이 HUD 설계](#2-게임플레이-hud-설계)
3. [주요 UI 화면 설계](#3-주요-ui-화면-설계)
4. [UX 설계 원칙](#4-ux-설계-원칙)
5. [비주얼 스타일 가이드](#5-비주얼-스타일-가이드)
6. [모바일/태블릿 호환성](#6-모바일태블릿-호환성)
7. [엔진별 UI 구현 기술 스택](#7-엔진별-ui-구현-기술-스택)
8. [Unity UI 설계 상세](#8-unity-ui-설계-상세)
9. [Unreal Engine 5 UI 설계 상세](#9-unreal-engine-5-ui-설계-상세)
10. [게임패드 / 컨트롤러 UI 설계](#10-게임패드--컨트롤러-ui-설계)
11. [콘솔 플랫폼 UI 설계](#11-콘솔-플랫폼-ui-설계)
12. [엔진별 해상도 및 스케일링 전략](#12-엔진별-해상도-및-스케일링-전략)
13. [Google Stitch 기반 UI 개발 파이프라인](#13-google-stitch-기반-ui-개발-파이프라인)

---

## 0. 엔진별 UI 플랫폼 개요

### 0.1 엔진별 UI 구현 방식 비교

| 항목 | Phaser.js (웹) | Unity Engine | Unreal Engine 5 |
|------|----------------|--------------|-----------------|
| UI 렌더러 | React DOM (HTML/CSS) | UI Toolkit / uGUI | UMG (Unreal Motion Graphics) |
| 마크업/스타일 | JSX + CSS Modules | UXML + USS | 블루프린트 + C++ |
| 애니메이션 | CSS Animation / Framer Motion | DOTween / UI Toolkit Anim | UMG 애니메이션 트랙 |
| 반응형 지원 | CSS 미디어 쿼리 | Canvas Scaler / PanelSettings | DPI Scaling + Safe Zone |
| 폰트 렌더링 | Google WebFont | TextMeshPro SDF | Slate 텍스트 렌더러 |
| 게임패드 지원 | 웹 Gamepad API (제한적) | Enhanced Input System | Enhanced Input + CommonUI |
| 지역화(L10n) | i18next | Unity Localization | FText + StringTable |
| 개발 미리보기 | 브라우저 실시간 HMR | Unity Editor Play Mode | UE5 에디터 프리뷰 |

### 0.2 Phase별 UI 우선 개발 대상

| Phase | 엔진 | UI 핵심 목표 |
|-------|------|--------------|
| Phase 1 (MVP) | Phaser.js 웹 | React 기반 HUD, 인벤토리, 퀘스트, 채팅 |
| Phase 2 (알파) | + Unity 추가 | UI Toolkit PC/모바일, 게임패드 내비게이션 |
| Phase 3 (정식) | + Unreal 추가 | UMG 콘솔 UI, 4K, 컨트롤러 완전 지원 |

### 0.3 공통 UI 설계 원칙 (엔진 무관)

1. **정보 계층**: 중요 정보(HP, 위협)는 항상 화면 하단 좌측
2. **색상 체계**: 아이템 등급·상태 색상은 세 엔진 모두 동일 팔레트 사용
3. **피드백**: 모든 액션에 0.1초 내 시각/청각 피드백
4. **비침습**: HUD가 게임 월드 시야를 최소한으로 가림
5. **접근성**: 색맹 모드, 텍스트 크기 조절은 세 엔진 모두 필수 지원

---

## 1. 전체 화면 구성

### 1.1 게임 화면 목록

| 화면 ID       | 화면 이름         | 설명                                              |
|---------------|-------------------|---------------------------------------------------|
| SCR-001       | 랜딩 페이지       | 게임 소개 및 시작 버튼                            |
| SCR-002       | 로그인 화면       | 소셜 로그인 / 이메일 로그인                       |
| SCR-003       | 회원가입 화면     | 계정 생성 폼                                      |
| SCR-004       | 캐릭터 선택       | 기존 캐릭터 목록 및 신규 생성 진입                |
| SCR-005       | 캐릭터 생성       | 종족, 직업, 외형 커스터마이징                     |
| SCR-006       | 로딩 화면         | 맵/지역 로딩 중 표시                              |
| SCR-007       | 메인 게임 HUD     | 실제 게임플레이 화면                              |
| SCR-008       | 캐릭터 정보창     | 스탯, 장비, 외형 (HUD 위에 오버레이)             |
| SCR-009       | 인벤토리          | 아이템 목록 및 관리 (오버레이)                    |
| SCR-010       | 스킬창            | 스킬 목록, 스킬 트리 (오버레이)                  |
| SCR-011       | 퀘스트 목록       | 진행 중/완료 퀘스트 (오버레이)                   |
| SCR-012       | 지도              | 월드맵 / 지역맵 (오버레이)                       |
| SCR-013       | 상점 UI           | NPC 상점 거래 (오버레이)                          |
| SCR-014       | 설정 화면         | 그래픽/사운드/키 설정 (오버레이)                 |
| SCR-015       | 길드 화면         | 길드 정보, 멤버 목록 (오버레이)                  |
| SCR-016       | 파티 화면         | 파티 구성 및 매칭 (오버레이)                     |
| SCR-017       | 거래소            | 플레이어 간 아이템 거래                           |
| SCR-018       | 메일함            | 시스템 메일 및 플레이어 간 메일                  |
| SCR-019       | 공지사항/이벤트   | 게임 공지 및 이벤트 목록                          |
| SCR-020       | 전투 결과 화면    | 전투 종료 후 결과 요약                            |
| SCR-021       | 사망 화면         | 캐릭터 사망 시 부활 선택                          |
| SCR-022       | 튜토리얼 오버레이 | 신규 유저 안내 UI                                 |

---

### 1.2 화면 전환 흐름도

```
[브라우저 접속]
      |
      v
[SCR-001: 랜딩 페이지]
      |
      |--[로그인 버튼]--------> [SCR-002: 로그인]
      |                               |
      |                               |--[소셜 로그인 성공]
      |                               |--[이메일/비밀번호 성공]
      |                               |
      |                               v
      |                         [인증 처리]
      |                               |
      |--[회원가입 버튼]-----> [SCR-003: 회원가입]
                                      |
                                      v
                               [회원가입 완료]
                                      |
                                      v
                         [SCR-004: 캐릭터 선택]
                                |          |
                         [캐릭터 있음]  [캐릭터 없음]
                                |          |
                                |          v
                                |    [SCR-005: 캐릭터 생성]
                                |          |
                                |          v
                                |    [생성 완료]
                                |          |
                                +----------+
                                           |
                                           v
                                 [SCR-006: 로딩 화면]
                                           |
                                           v
                         +-----[SCR-007: 메인 게임 HUD]-----+
                         |                                    |
              [C 키]     |     [I 키]          [K 키]         | [M 키]
                 v       |        v               v           |    v
         [SCR-008: 캐릭터] [SCR-009: 인벤토리] [SCR-010: 스킬] | [SCR-012: 지도]
                         |                                    |
              [Q 키]     |     [N 키]          [ESC 키]       |
                 v       |        v               v           |
         [SCR-011: 퀘스트] [SCR-018: 메일]  [SCR-014: 설정]  |
                         |                                    |
                 [NPC 상호작용]              [전투 종료]       |
                         |                      |             |
                         v                      v             |
                 [SCR-013: 상점]      [SCR-020: 전투 결과]    |
                                                              |
                                          [HP = 0]            |
                                              |               |
                                              v               |
                                    [SCR-021: 사망 화면]      |
                                         |       |            |
                                    [부활]   [마을 귀환]      |
                                         |       |            |
                                         +-------+            |
                                                 |            |
                                                 v            |
                                        [SCR-006: 로딩] ------+
```

---

### 1.3 Unity / Unreal 전용 추가 화면

| 화면 ID | 화면 이름 | 대상 엔진 | 설명 |
|---------|-----------|-----------|------|
| SCR-023 | 그래픽 옵션 (상세) | Unity / Unreal | 렌더링 품질, DLSS/FSR, VSync 설정 |
| SCR-024 | 컨트롤러 설정 | Unity / Unreal | 게임패드 버튼 리맵, 감도 설정 |
| SCR-025 | 게임패드 전용 HUD | Unity / Unreal | 컨트롤러 퀵슬롯 레이아웃 |
| SCR-026 | 콘솔 메인 메뉴 | Unreal 전용 | PS5 / Xbox Series X 타이틀 화면 |
| SCR-027 | 트로피 / 업적 UI | Unreal 전용 | PlayStation 트로피 / Xbox 업적 연동 |

---

## 2. 게임플레이 HUD 설계

### 2.1 메인 게임 화면 레이아웃 (1920x1080 기준)

```
+============================================================================================+
|  [MENU]  [MAP]  [PARTY]  [GUILD]  [SHOP]  [EVENT]          [서버: Asgard-1]  [21:34:07]  |
+============================================================================================+
|                                                                        +----------------+  |
|                                                                        |   MINIMAP      |  |
|                                                                        | +------------+ |  |
|                                                                        | |  .  *  .   | |  |
|                       [  GAME WORLD VIEWPORT  ]                        | | * [P] .  . | |  |
|                                                                        | |  .  .  *   | |  |
|                      (실제 게임 렌더링 영역)                            | +------------+ |  |
|                                                                        | [ 에레니아 숲 ] |  |
|                                                                        | [N][S][E][W]   |  |
|                                                                        +----------------+  |
|                                                                        +----------------+  |
|                                                                        |  BUFF / DEBUFF |  |
|                                                                        | [V][S][H][P].. |  |
|                                                                        +----------------+  |
|                                                                                            |
+--------------------------------------------------------------------------------------------+
|                                                           +------------------------------+ |
|  [AVATAR]  캐릭터명: 아리아                               |     CHAT WINDOW              | |
|  +--HP--+  [##########----------]  248 / 400             | [파티][길드][전체][귓말]      | |
|  +--MP--+  [######--------------]  123 / 300             |------------------------------|  |
|  +--EXP-+  [###-----------------]  Lv.34  42%            | <아리아> 안녕하세요!         | |
|                                                           | <시스템> 퀘스트 완료!        | |
|  +-------+-------+-------+-------+-------+-------+       | <파티원1> ㄱㄱ               | |
|  |  [1]  |  [2]  |  [3]  |  [4]  |  [5]  |  [6]  |       |------------------------------|  |
|  | Firbl | IceAr | Shield| Heal  | Potion| Buff  |       | [입력창................] [전송]| |
|  | CD:0s | CD:3s | CD:0s | CD:8s |  x12  | CD:0s |       +------------------------------+ |
|  +-------+-------+-------+-------+-------+-------+                                        |
|  |  [7]  |  [8]  |  [9]  |  [0]  |  [-]  |  [=]  |                                        |
|  | Dash  | Stun  | Summon| Tele  | Item  | Mount |                                        |
|  | CD:2s | CD:0s |CD:30s | CD:1m |  x5   | CD:0s |                                        |
|  +-------+-------+-------+-------+-------+-------+                                        |
+============================================================================================+
  [C]캐릭터  [I]인벤토리  [K]스킬  [Q]퀘스트  [M]지도  [P]파티  [G]길드  [ESC]메뉴
```

### 2.2 HUD 구성 요소 상세 설명

#### 상단 바 (Top Bar) - 높이 40px
```
+============================================================================================+
|  [MENU]  [MAP]  [PARTY]  [GUILD]  [SHOP]  [EVENT]          [서버: Asgard-1]  [21:34:07]  |
+============================================================================================+
  ^------메인 메뉴 단축버튼들------^               ^------서버 정보 및 게임 시간------^
  클릭 시 드롭다운 혹은 오버레이 화면 열림         우클릭 시 서버 이동 옵션 표시
```

#### 미니맵 영역 (우상단) - 200x200px
```
+----------------+
|   MINIMAP      |   - 클릭: 전체 지도 열기 (M키와 동일)
| +------------+ |   - 스크롤: 미니맵 줌 인/아웃
| |  .  *  .   | |   - [P] = 플레이어 위치 (녹색 점)
| | * [P] .  . | |   - [*] = 퀘스트 목표 (황금 별)
| |  .  .  *   | |   - [.] = 몬스터 (빨간 점)
| +------------+ |   - 드래그: 미니맵 패닝
| [ 에레니아 숲 ] |
| [N][S][E][W]   |   - 방향 버튼: 인접 구역 이동
+----------------+
```

#### 버프/디버프 영역 (미니맵 하단) - 200x60px
```
+----------------+
|  BUFF / DEBUFF |   - 각 아이콘: 마우스 오버 시 이름/지속시간 툴팁
| [V][S][H][P].. |   - 빨간 테두리: 디버프
+----------------+   - 초록 테두리: 버프
                      - 클릭: 버프 상세 정보
```

#### 캐릭터 상태바 (하단 좌측)
```
[AVATAR]  캐릭터명: 아리아
+--HP--+  [##########----------]  248 / 400    <- 빨간색 바
+--MP--+  [######--------------]  123 / 300    <- 파란색 바
+--EXP-+  [###-----------------]  Lv.34  42%  <- 황금색 바

- HP 20% 이하 시 바 깜박임 + 경고음
- AVATAR 클릭 시 캐릭터 정보창 열기 (C키와 동일)
- 마우스 오버 시 정확한 수치 툴팁 표시
```

#### 퀵슬롯 바 (하단 중앙) - 12슬롯 x 2줄
```
+-------+-------+-------+-------+-------+-------+
|  [1]  |  [2]  |  [3]  |  [4]  |  [5]  |  [6]  |
| Firbl | IceAr | Shield| Heal  | Potion| Buff  |   <- 윗줄: 1~6번 단축키
| CD:0s | CD:3s | CD:0s | CD:8s |  x12  | CD:0s |
+-------+-------+-------+-------+-------+-------+
|  [7]  |  [8]  |  [9]  |  [0]  |  [-]  |  [=]  |
| Dash  | Stun  | Summon| Tele  | Item  | Mount |   <- 아랫줄: 7~= 단축키
| CD:2s | CD:0s |CD:30s | CD:1m |  x5   | CD:0s |
+-------+-------+-------+-------+-------+-------+

각 슬롯:
- 아이콘 + 단축키 번호 + 쿨타임 오버레이 표시
- 드래그 앤 드롭으로 재배치 가능
- 우클릭: 슬롯 초기화 메뉴
- 쿨타임 중: 어둡게 처리 + 남은 시간(초) 표시
- 소모품: 남은 개수 우하단 표시
```

#### 채팅창 (하단 우측) - 380x180px
```
+------------------------------+
|     CHAT WINDOW              |   탭:
| [파티][길드][전체][귓말]      |   - 파티: 파티원끼리
|------------------------------|   - 길드: 길드원끼리
| <아리아> 안녕하세요!         |   - 전체: 지역 전체 채팅
| <시스템> 퀘스트 완료!        |   - 귓말: 1:1 귓속말
| <파티원1> ㄱㄱ               |
|------------------------------|
| [입력창................] [전송]|   - Enter: 채팅 전송
+------------------------------+   - 채팅창 드래그로 이동 가능
                                    - 크기 조절 핸들 (우하단)
                                    - 투명도 조절 슬라이더
```

### 2.3 반응형 고려사항

| 해상도          | 변경 사항                                                      |
|-----------------|----------------------------------------------------------------|
| 1920x1080       | 기본 레이아웃 (Full HD 기준)                                   |
| 1680x1050       | 채팅창 너비 축소 (350px), 퀵슬롯 아이콘 크기 소폭 감소         |
| 1440x900        | 미니맵 크기 축소 (180px), 상단바 텍스트 일부 아이콘으로 변환   |
| 1280x720        | 최소 지원 해상도. 채팅창 숨김 토글 제공, HUD 축소 모드         |
| 와이드 (2560+)  | 게임 뷰포트 확장, HUD는 화면 하단 중앙에 고정                  |

---

### 2.4 엔진별 HUD 구현 방식

#### Phaser.js (웹) HUD — React DOM 오버레이

React DOM이 Phaser 캔버스 위에 `position: absolute`로 오버레이되며, Zustand 스토어가 게임 상태를 실시간으로 UI에 동기화합니다.

```tsx
// HUDOverlay.tsx
const HUDOverlay: React.FC = () => {
  const { hp, maxHp, mp, maxMp, level, exp } = usePlayerStore();
  return (
    <div className="hud-overlay" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      <div className="status-bars" style={{ pointerEvents: 'auto' }}>
        <HealthBar current={hp} max={maxHp} />
        <ManaBar current={mp} max={maxMp} />
        <ExpBar level={level} progress={exp} />
      </div>
      <MiniMap />
      <QuickSlotBar />
      <ChatWindow />
    </div>
  );
};
```

#### Unity HUD — UI Toolkit (UXML/USS)

URP 2D 카메라 스택의 UI 레이어에 UIDocument가 렌더링되며, USS 스타일시트로 테마를 일괄 관리합니다.

```csharp
// HUDController.cs
public class HUDController : MonoBehaviour
{
    [SerializeField] private UIDocument hudDocument;
    private ProgressBar hpBar, mpBar, expBar;

    private void OnEnable()
    {
        var root = hudDocument.rootVisualElement;
        hpBar = root.Q<ProgressBar>("hp-bar");
        mpBar = root.Q<ProgressBar>("mp-bar");
        expBar = root.Q<ProgressBar>("exp-bar");

        GameManager.Instance.Player.OnHPChanged += UpdateHP;
        GameManager.Instance.Player.OnMPChanged += UpdateMP;
    }

    private void UpdateHP(int current, int max)
    {
        hpBar.value = (float)current / max * 100f;
        hpBar.title = $"{current} / {max}";
        // HP 20% 이하 위험 경고 클래스
        hpBar.EnableInClassList("hp-bar--danger", current <= max * 0.2f);
    }
}
```

```xml
<!-- hud.uxml -->
<ui:UXML xmlns:ui="UnityEngine.UIElements">
  <ui:VisualElement name="hud-root" class="hud-root">
    <ui:VisualElement class="status-panel">
      <ui:Image name="avatar-image" class="avatar" />
      <ui:VisualElement class="bars-container">
        <ui:Label name="character-name" class="character-name" />
        <ui:ProgressBar name="hp-bar" class="hp-bar" title="HP" />
        <ui:ProgressBar name="mp-bar" class="mp-bar" title="MP" />
        <ui:ProgressBar name="exp-bar" class="exp-bar" title="EXP" />
      </ui:VisualElement>
    </ui:VisualElement>
    <ui:VisualElement name="minimap-panel" class="minimap-panel" />
    <ui:VisualElement name="quickslot-bar" class="quickslot-bar" />
  </ui:VisualElement>
</ui:UXML>
```

```css
/* hud.uss */
.hp-bar > #unity-progress-bar-container > #unity-fill { background-color: #E74C3C; }
.hp-bar--danger > #unity-progress-bar-container > #unity-fill {
    animation-name: hp-blink;
    animation-duration: 0.5s;
    animation-iteration-count: infinite;
}
.mp-bar > #unity-progress-bar-container > #unity-fill { background-color: #3498DB; }
.exp-bar > #unity-progress-bar-container > #unity-fill { background-color: #F1C40F; }
```

#### Unreal Engine 5 HUD — UMG + C++

WBP_HUD 위젯이 PlayerController의 Viewport에 추가되며, GAS AttributeSet 델리게이트로 UI를 실시간 갱신합니다.

```cpp
// AC_HUDBase.cpp
void AAC_HUDBase::BeginPlay()
{
    Super::BeginPlay();
    if (HUDWidgetClass)
    {
        HUDWidget = CreateWidget<UUserWidget>(GetWorld(), HUDWidgetClass);
        HUDWidget->AddToViewport(0);

        // GAS 어트리뷰트 변경 구독
        if (auto* ASC = GetOwningPlayerController()
            ->GetPawn<AAC_PlayerCharacter>()->GetAbilitySystemComponent())
        {
            ASC->GetGameplayAttributeValueChangeDelegate(
                UAC_AttributeSet::GetHealthAttribute())
                .AddUObject(this, &AAC_HUDBase::OnHealthChanged);
        }
    }
}

void AAC_HUDBase::OnHealthChanged(const FOnAttributeChangeData& Data)
{
    // Blueprint 이벤트로 전달하여 UMG 애니메이션 트리거
    BP_OnHealthChanged(Data.NewValue,
        GetOwningPlayerController()
            ->GetPawn<AAC_PlayerCharacter>()
            ->GetAttributeSet()->GetMaxHealth());
}
```

---

## 3. 주요 UI 화면 설계

### 3.1 캐릭터 정보창 (SCR-008)

단축키: `C` / 화면 중앙 오버레이, 반투명 배경

**요약 와이어프레임 (중복 라인 제거본):**
- 좌측: 캐릭터 미리보기 + 외형 변경 버튼
- 중앙: 기본 프로필(이름/직업/종족/레벨/서버/길드)
- 우측: 기본 스탯/전투 스탯(기본값 + 장비 보너스 분리 표기)
- 하단: 장비 슬롯(머리/갑옷/무기/신발/반지/목걸이/외형/펫)
- 액션: `스탯 초기화`, `직업 변경`, `칭호 변경`

**장비 슬롯 동작:**
- 슬롯 클릭: 장착 해제 / 장비 세부 정보
- 슬롯 위에 아이템 드래그: 장착
- 마우스 오버: 현재 장착 장비 vs 드래그 중인 아이템 비교 툴팁

---

### 3.2 인벤토리 화면 (SCR-009)

단축키: `I` / 화면 우측 슬라이드인 패널

**요약 와이어프레임 (중복 라인 제거본):**
- 상단: 무게/닫기 + 탭(전체/장비/소모품/재료/기타/퀘스트)
- 중단: 검색/정렬 + 8xN 슬롯 그리드
- 하단: 선택 아이템 상세 + 액션(`장착`,`강화`,`분해`,`버리기`)
- 확장 요소: `탭 추가`, `가방 확장(100 다이아)`

**인벤토리 UX:**
- 아이템 등급별 슬롯 테두리 색상: 일반(회색), 고급(녹색), 희귀(파랑), 영웅(보라), 전설(주황), 신화(빨강)
- 드래그 앤 드롭: 아이템 이동, 퀵슬롯에 드래그 시 등록
- 우클릭 컨텍스트 메뉴: 사용/장착/이동/분해/버리기
- 무게 바: 80% 이상 시 황색, 100% 시 적색 경고

---

### 3.3 스킬창 (SCR-010)

단축키: `K` / 화면 중앙 오버레이

**요약 와이어프레임 (중복 라인 제거본):**
- 상단: 클래스 탭(기본/전직/공통) + 보유 스킬 포인트
- 좌측: 스킬 트리(습득/미습득/잠금 상태 시각화)
- 우측: 선택 스킬 상세(설명/레벨별 수치/쿨타임/마나)
- 하단: `스킬 초기화`, `프리셋 저장`, 프리셋 슬롯

---

### 3.4 상점 UI (SCR-013)

NPC와 상호작용 시 열리는 오버레이

**요약 와이어프레임 (중복 라인 제거본):**
- 상단: 상점명/닫기 + NPC 대사 박스
- 탭: 판매/구매/강화/보석 합성
- 좌측: 상점 목록(필터/검색/페이지네이션)
- 우측: 아이템 상세/수량 선택/합계/구매 확인
- 하단: 보유 골드/다이아 + 판매 동선 안내

---

### 3.5 퀘스트 목록 화면 (SCR-011)

단축키: `Q` / 화면 우측 슬라이드인 패널

**요약 와이어프레임 (중복 라인 제거본):**
- 상단: 상태 탭(진행중/완료 가능/완료) + 카테고리 탭(메인/서브/일일/길드/이벤트)
- 본문: 퀘스트 카드(보상/진행률/세부 목표/액션 버튼)
- 일일 퀘스트: 초기화 타이머 + 일괄 보상 수령
- 하단: 동시 추적 개수 설정(최대 3개)

---

## 4. UX 설계 원칙

### 4.1 신규 유저 온보딩 플로우

```
[신규 계정 첫 로그인]
         |
         v
[SCR-005: 캐릭터 생성 - 튜토리얼 모드]
   - 종족/직업 선택 시 각각 특성 설명 오버레이
   - "추천" 배지로 초보자 친화 직업 강조
         |
         v
[튜토리얼 마을 자동 진입]
   - 별도의 튜토리얼 전용 맵 (오픈 월드와 분리)
   - NPC "가이드 정령" 캐릭터가 따라다님
         |
         v
[단계별 튜토리얼 (총 8단계)]

  단계 1: 이동 방법
  - WASD / 마우스 클릭 이동 안내
  - 게임 화면 위에 반투명 화살표 오버레이
  - "A, D키를 눌러 이동해보세요!" 텍스트 말풍선

  단계 2: 첫 번째 전투
  - 슬라임 몬스터 1마리와의 전투 유도
  - 공격 버튼 (1번 키) 깜박임 강조
  - 전투 UI 각 요소 단계적 하이라이트

  단계 3: 아이템 줍기 / 인벤토리
  - 드롭된 아이템 강조 표시
  - I키 누르도록 안내
  - 인벤토리 화면 각 영역 설명 툴팁

  단계 4: 장비 장착
  - 획득한 장비를 캐릭터에 장착하는 방법
  - 드래그 앤 드롭 시연 애니메이션

  단계 5: 스킬 사용
  - 스킬창(K키) 열기
  - 첫 번째 스킬 습득 및 퀵슬롯 등록

  단계 6: 퀘스트 수행
  - NPC와 대화 → 퀘스트 수락 → 목표 완료 → 보상 수령
  - 퀘스트 추적 UI 안내

  단계 7: 상점 이용
  - 포션 구매 방법 안내
  - 골드 시스템 설명

  단계 8: 오픈 월드 진입
  - 튜토리얼 완료 보상 지급
  - 오픈 월드로 이동할지 선택 창
  - "언제든 튜토리얼 재확인 가능" 안내

         |
         v
[오픈 월드 진입 후 30분 추가 도움말]
  - 우하단 "?" 아이콘 항상 표시
  - 새로운 UI 요소 처음 접할 때 자동 툴팁 1회 제공
  - 도움말 센터: ESC → 도움말
```

---

### 4.2 단축키 시스템

#### 기본 단축키

| 카테고리     | 단축키          | 기능                        |
|--------------|----------------|-----------------------------|
| 이동         | WASD           | 캐릭터 이동                 |
| 이동         | 마우스 우클릭   | 클릭 이동 (포인트 앤 클릭)  |
| 상호작용     | F              | NPC/오브젝트 상호작용       |
| UI 토글      | C              | 캐릭터 정보창 열기/닫기     |
| UI 토글      | I              | 인벤토리 열기/닫기          |
| UI 토글      | K              | 스킬창 열기/닫기            |
| UI 토글      | Q              | 퀘스트 목록 열기/닫기       |
| UI 토글      | M              | 지도 열기/닫기              |
| UI 토글      | P              | 파티 창 열기/닫기           |
| UI 토글      | G              | 길드 창 열기/닫기           |
| UI 토글      | B              | 거래소 열기/닫기            |
| 퀵슬롯       | 1 ~ 0, -, =   | 퀵슬롯 1~12번 사용          |
| 채팅         | Enter          | 채팅 입력 창 활성화         |
| 채팅         | /              | 채팅 명령어 모드            |
| 전투         | Tab            | 가장 가까운 적 타겟          |
| 전투         | Shift+Tab      | 이전 타겟 선택              |
| 전투         | Esc            | 타겟 해제 / 메뉴            |
| 카메라       | 마우스 중클릭  | 카메라 회전                 |
| 카메라       | 스크롤         | 줌 인/아웃                  |
| 스크린샷     | Print Screen   | 스크린샷 저장               |
| 도움말       | F1             | 도움말 열기                 |
| 설정         | F10            | 게임 설정 열기              |

#### 단축키 커스터마이징
- 설정(ESC → 설정 → 키 설정)에서 모든 단축키 재지정 가능
- 충돌 시 경고 메시지 표시
- "기본값으로 초기화" 버튼 제공
- 프리셋 저장/불러오기 (최대 3개)

---

### 4.3 접근성 고려사항

#### 시각 접근성
- **텍스트 크기**: 설정에서 UI 전체 크기 75% ~ 150% 조절
- **색맹 지원**: 적녹색맹, 청황색맹, 완전색맹 모드 제공 (색상 필터 적용)
- **고대비 모드**: UI 요소 테두리 강조, 배경 불투명도 증가
- **아이템 등급 표시**: 색상 외 아이콘 모양으로도 등급 구별 (별, 다이아몬드 등)
- **깜박임 효과 제한**: 광과민성 발작 고려, 깜박임 애니메이션 비활성화 옵션

#### 청각 접근성
- **자막/텍스트**: 모든 NPC 대화 및 시스템 메시지 텍스트 병행 표시
- **시각적 알림**: 소리 대신 화면 테두리 플래시 등 시각 신호 옵션

#### 운동 접근성
- **클릭 이동 지원**: WASD 외 마우스만으로도 완전한 플레이 가능
- **클릭 허용 범위**: 버튼 최소 크기 44px x 44px (모바일 HIG 준수)
- **더블클릭 방지**: 중요 버튼 (구매, 버리기 등)은 확인 대화창 필수
- **드래그 보조**: 아이템 이동 시 우클릭 컨텍스트 메뉴도 제공 (드래그 없이 가능)

#### 인지 접근성
- **용어 일관성**: 게임 내 용어 통일 (아이템 "버리기" vs "삭제" 혼용 금지)
- **실행 취소**: 의도치 않은 아이템 버리기 5초 내 취소 가능 (UI 토스트 메시지)
- **진행 저장 안내**: 자동 저장 시각적 표시 (우하단 아이콘)
- **명확한 피드백**: 모든 버튼 클릭 시 즉각적인 시각/청각 피드백

---

### 4.4 튜토리얼 설계

#### 튜토리얼 원칙
1. **비침습적**: 튜토리얼이 게임 플레이를 방해하지 않도록 설계
2. **언제든 스킵**: 모든 단계에서 "튜토리얼 건너뛰기" 버튼 제공
3. **언제든 재확인**: 도움말 센터에서 모든 튜토리얼 다시 보기 가능
4. **보상 기반**: 튜토리얼 완료 시 실질적인 보상 지급으로 참여 유도

#### 튜토리얼 UI 컴포넌트
```
+--------------------------------------------------+
|  [가이드 정령 아이콘]  가이드 정령               |
|  "오른쪽 방향으로 이동해보세요!"                 |
|                                                  |
|   게임 화면 위에 반투명 화살표 오버레이          |
|   (-->)                                          |
|                                                  |
|  [건너뛰기]              [다음 단계] (2/8)       |
+--------------------------------------------------+

스포트라이트 효과:
- 주목해야 할 UI 영역 외 나머지 화면 30% 어둡게
- 해당 영역에 밝은 테두리 표시
- 마우스 포인터 해당 영역으로 자동 안내 (화살표 커서 커스텀)
```

#### 상황별 도움말 (Contextual Help)
- 처음 필드보스 조우 시: 필드보스 전투 팁 팝업
- 강화 실패 시: 강화 확률 및 보호석 안내
- 레벨 10/20/30 달성 시: 새로운 콘텐츠 잠금 해제 알림
- 길드 가입 시: 길드 시스템 간략 안내

---

## 5. 비주얼 스타일 가이드

### 5.1 아트 스타일 방향

**선택: 하이 퀄리티 2D 일러스트 + 픽셀아트 혼합 스타일**

- **캐릭터/몬스터**: 2D 스프라이트 기반, 애니메이션 풍부한 프레임 (8방향 이동)
- **배경/맵**: 상세한 2D 배경 레이어드 구조 (Parallax 스크롤)
- **UI 요소**: 깔끔한 현대적 디자인 + 판타지 테마 장식 (테두리, 아이콘)
- **아이템 아이콘**: 정밀한 픽셀아트 스타일 (64x64px 기본)
- **스킬 이펙트**: 파티클 시스템 기반의 화려한 2D 이펙트

**참조 스타일**: Hollow Knight의 섬세한 2D + Stardew Valley의 픽셀 아이콘 + Path of Exile의 다크 판타지 UI

---

### 5.2 컬러 팔레트

#### 기본 UI 팔레트
```
[배경 계열]
  메인 배경 (다크)  : #1A1A2E  - 딥 네이비 블랙
  패널 배경         : #16213E  - 다크 블루
  카드/박스 배경    : #0F3460  - 미드 네이비
  보더              : #533483  - 퍼플 틴트

[강조 계열]
  프라이머리        : #E94560  - 바이브런트 레드
  세컨더리          : #F5A623  - 앰버 골드 (버튼, 강조)
  액센트            : #00D2FF  - 사이안 (마나, 마법 계열)

[상태 표시]
  HP 바             : #E74C3C  - 레드
  MP 바             : #3498DB  - 블루
  EXP 바            : #F1C40F  - 골드
  버프 (긍정)       : #2ECC71  - 에메랄드 그린
  디버프 (부정)     : #E74C3C  - 레드

[아이템 등급]
  일반 (노멀)       : #9B9B9B  - 라이트 그레이
  고급 (매직)       : #3EBA6E  - 그린
  희귀 (레어)       : #4A90D9  - 블루
  영웅 (에픽)       : #9B59B6  - 퍼플
  전설 (레전드)     : #E67E22  - 오렌지
  신화 (미딕)       : #E74C3C  - 레드 + 글로우 이펙트

[텍스트]
  기본 텍스트       : #F0F0F0  - 오프 화이트
  서브 텍스트       : #B8B8C8  - 라이트 그레이 블루
  비활성 텍스트     : #555577  - 다크 그레이 블루
  강조 텍스트       : #F5A623  - 골드
```

---

### 5.3 폰트 선택 기준

#### 폰트 스택

| 용도           | 폰트명                | 굵기        | 크기 범위   |
|----------------|-----------------------|-------------|-------------|
| UI 기본 텍스트 | Noto Sans KR          | Regular 400 | 12px ~ 16px |
| 제목/헤더      | Noto Sans KR          | Bold 700    | 18px ~ 28px |
| 게임 수치      | Rajdhani              | SemiBold    | 14px ~ 20px |
| 아이템명 강조  | Cinzel Decorative     | Regular     | 14px ~ 18px |
| 시스템 메시지  | Noto Sans KR          | Medium 500  | 13px ~ 15px |
| 숫자/타이머    | Orbitron              | Regular     | 12px ~ 18px |

#### 폰트 사용 원칙
- 최소 가독성 보장: 소형 텍스트는 12px 미만 사용 금지
- 한국어 완벽 지원: Noto Sans KR을 기본으로, 영문 장식 폰트와 혼용
- 웹폰트 로딩: 폰트 로딩 전 system-ui fallback 처리로 레이아웃 시프트 방지
- 행간 (line-height): 기본 텍스트 1.6, 헤더 1.2

---

### 5.4 UI 컴포넌트 스타일 가이드

#### 버튼 스타일

```
기본 버튼 (Primary):
+------------------------+
|    [ 구매 확인 ]       |
+------------------------+
- 배경: #F5A623 (골드)
- 텍스트: #1A1A2E (다크)
- 테두리: #C4891C
- 호버: 밝기 110%
- 클릭: 밝기 90% + 미세 위치 이동 (1px 아래)
- 비활성: 투명도 40%

보조 버튼 (Secondary):
+------------------------+
|    [ 취소 ]            |
+------------------------+
- 배경: transparent
- 텍스트: #B8B8C8
- 테두리: #533483 (1px)
- 호버: 배경 rgba(83,52,131,0.3)

위험 버튼 (Danger):
+------------------------+
|    [ 아이템 버리기 ]   |
+------------------------+
- 배경: #E94560
- 클릭 전 확인 다이얼로그 필수
```

#### 패널/모달 스타일
```
+==================================================+
|  [ 판타지 테두리 장식 ]     패널 제목      [X]   |
+==================================================+
|                                                  |
|  패널 콘텐츠 영역                                |
|                                                  |
+==================================================+
- 배경: rgba(22, 33, 62, 0.95)  <- 약간의 블러 효과
- 테두리: 2px solid #533483
- 코너: 판타지 스타일 장식 SVG 이미지
- 박스 섀도우: 0 0 30px rgba(233,69,96,0.3)  <- 붉은 글로우
- 드래그 가능: 패널 헤더를 드래그해 이동
```

#### 툴팁 스타일
```
마우스 오버 시 표시:
+-------------------------------+
| [아이템 아이콘]  불꽃 지팡이 |
|               +15 [전설]      |
|-------------------------------|
| 마법 공격력: +280             |
| 치명타: +8%                   |
| 요구 레벨: 34                 |
|-------------------------------|
| "고대 화염룡의 뼈로 만든      |
| 전설의 지팡이."               |
+-------------------------------+
- 배경: rgba(15,52,96,0.97)
- 테두리 색상: 아이템 등급 색상과 동일
- 등장 애니메이션: 페이드인 0.1초
- 위치: 마우스 포인터 기준 우측 상단 우선, 화면 밖 벗어나면 자동 조정
```

#### 아이콘 시스템
```
크기 규격:
- 퀵슬롯 아이콘: 64x64px
- 인벤토리 아이콘: 64x64px
- UI 버튼 아이콘: 24x24px
- 버프/디버프 아이콘: 32x32px
- 미니맵 마커: 8x8px ~ 16x16px

스타일:
- 픽셀아트 스타일, 명확한 실루엣
- 등급별 외곽 광원 효과 (CSS filter: drop-shadow)
- 마우스 오버 시 약간의 확대 (scale 1.05)
```

#### 알림/토스트 메시지
```
화면 우하단 스택:
+----------------------------------+
| [V] 퀘스트 완료: 고대 마법사의  |
|     유언  +15,000 EXP  +5,000G  |
+----------------------------------+
+----------------------------------+
| [!] HP가 20% 이하입니다. 위험!  |
+----------------------------------+

- 최대 3개 동시 표시
- 4초 후 자동 사라짐 (페이드아웃)
- 클릭 시 즉시 닫기
- 클릭 시 관련 화면으로 이동 (퀘스트 알림 → 퀘스트창)
```

---

### 5.5 엔진별 비주얼 스타일 세부 지침

#### Phaser.js (웹)
- `pixelArt: true` 설정으로 픽셀 경계 선명도 유지
- `filter: drop-shadow()` CSS로 아이템 등급 글로우 효과
- CSS `@keyframes`로 HP 위험 깜박임, 퀘스트 완료 팡파르 애니메이션

#### Unity — URP 2D 라이팅 연동
- UI 레이어를 별도 Camera로 분리해 2D Light 영향 차단
- TextMeshPro SDF 폰트로 모든 해상도에서 선명한 텍스트
- DOTween으로 패널 열기/닫기 슬라이드 애니메이션

#### Unreal Engine 5 — 3D 환경과 UI 조화
- UMG 애니메이션으로 패널 열기/닫기에 물리 기반 이징 적용
- HDR 색영역에서 UI 과노출 방지 톤매핑 처리
- Slate 벡터 렌더링으로 4K에서도 선명한 UI

### 5.6 지역별 UI 테마 (에테르나 크로니클 특화)

| 지역 | 배경 팔레트 | 특수 UI 효과 |
|------|------------|--------------|
| 에레보스 (유령 도시) | 회백색 + 흰 안개 | UI에 반투명 유령 효과, 흰 vignette |
| 솔라리스 사막 | 황금빛 + 모래색 | 이프리타 불꽃 문양 테두리 |
| 실반헤임 | 에메랄드 + 은빛 | 엘파리스 잎사귀 장식 |
| 아르겐티움 수도 | 황금 + 제국 붉은색 | 칼리마르 제국 문장 |
| 망각의 고원 | 무채색 + 검은 공허 | 레테 눈 문양, 색상 desaturation |

**기억 에테르 시각 언어:**
- 기억 파편 획득: 은빛 입자 파티클 → UI 은빛 글로우
- MDS 발작: 화면 가장자리 흰 안개 vignette (위험 경고)
- 레테 영향 구역: UI 전체 보랏빛 color grading 오버레이
- 기억 공명 발동: 화면 외곽 청록색 pulse 링 효과

---

## 6. 모바일/태블릿 호환성

### 6.1 태블릿 지원 범위

**대상 디바이스**: iPad Pro 12.9" (1024x1366), iPad Air (1180x820), Android 태블릿 (1280x800 이상)

**방향**: 가로(Landscape) 모드 기준 설계

---

### 6.2 태블릿 레이아웃 조정

```
[태블릿 가로 모드 HUD - 1280x800]

+=========================================================================+
|  [메뉴]  [지도]  [파티]              [서버: Asgard-1]  [21:34]  [설정] |
+=========================================================================+
|                                              +----------+               |
|                                              | MINIMAP  |               |
|                                              | 120x120  |               |
|    [  GAME WORLD VIEWPORT  ]                 +----------+               |
|                                              [버프/디버프]               |
|                                                                         |
+-------------------------------------------------------------------------+
| [AV] 아리아 HP[###---]180/400  MP[##----]100/300                       |
|                                                            +---------+  |
| +---+---+---+---+---+---+---+---+---+---+                 |  채팅   |  |
| |[1]|[2]|[3]|[4]|[5]|[6]|[7]|[8]|[9]|[0]|                 | (축소)  |  |
| +---+---+---+---+---+---+---+---+---+---+                 | [펼치기]|  |
+=========================================================================+
 [C][I][K][Q]                                              [채팅] [설정]
 (하단 아이콘 바)
```

### 6.3 태블릿 전용 UX 변경사항

#### 터치 인터페이스 대응
| PC 상호작용   | 태블릿 대응                                  |
|---------------|----------------------------------------------|
| 마우스 오버   | 롱프레스 (0.5초) 시 툴팁 표시               |
| 우클릭 메뉴   | 롱프레스 (0.7초) 시 컨텍스트 메뉴 표시     |
| 드래그 앤 드롭| 롱프레스 후 드래그                          |
| 더블클릭      | 더블탭                                       |
| 스크롤        | 스와이프                                     |
| 마우스 이동   | 가상 조이스틱 (좌하단) 또는 터치포인트 이동 |

#### 태블릿 전용 설정
- **터치 HUD 모드** 자동 감지 및 전환
- 버튼 크기 자동 확대 (최소 44x44px 강제 적용)
- 퀵슬롯 2줄 → 1줄로 축소, 슬롯 크기 확대
- 채팅창 기본 접힘 상태, 버튼 탭으로 토글
- 가상 조이스틱 위치/투명도 조절 가능
- 핀치 줌: 게임 뷰포트 확대/축소

#### 미지원 기능 (태블릿)
- 복잡한 키보드 단축키 기반 고급 기능
  → 대신 전용 터치 UI 버튼 제공
- 매우 정밀한 클릭 필요 기능 (픽셀 단위 조작)
  → UI 요소 크기 자동 확대로 보완

### 6.4 태블릿 성능 최적화

```
성능 프리셋 (태블릿 자동 적용):
- 파티클 이펙트: 50% 감소
- 배경 레이어: 2단계 감소
- 렌더링 해상도: 0.85배
- 프레임 캡: 60fps → 30fps (배터리 절약 모드)
- 텍스처 품질: 고화질 → 중화질

사용자 설정에서 수동 조절 가능
```

---

## 7. 엔진별 UI 구현 기술 스택

### 7.1 Phaser.js (웹) UI 스택

```
Phaser.js WebGL 캔버스
  └── React DOM 오버레이 (position: absolute, pointer-events 분리)
        ├── HUD: HealthBar, ManaBar, ExpBar, MiniMap, QuickSlot
        ├── 오버레이 패널: Inventory, Skill, Quest, Map, Shop
        ├── 모달: ConfirmDialog, AlertModal
        ├── 채팅창: ChatWindow
        └── 알림/토스트: NotificationStack

상태 관리:  Zustand (게임 상태 → React 단방향 동기화)
스타일링:   Tailwind CSS + CSS Modules
애니메이션: Framer Motion + CSS Transitions
폰트:       Google Fonts (Noto Sans KR, Cinzel Decorative)
```

**Phaser ↔ React 브리지:**
```typescript
// PhaserEventBridge.ts
export class PhaserEventBridge {
    static onPlayerHPChanged(current: number, max: number): void {
        usePlayerStore.setState({ hp: current, maxHp: max });
    }
    static onItemPickup(item: ItemData): void {
        useInventoryStore.getState().addItem(item);
    }
    static onQuestProgress(questId: string, progress: QuestProgress): void {
        useQuestStore.getState().updateProgress(questId, progress);
    }
}
// GameScene.ts 에서 호출
this.player.on('hp-changed', (cur, max) =>
    PhaserEventBridge.onPlayerHPChanged(cur, max));
```

### 7.2 Unity UI 스택

```
URP Camera Stack
  ├── Game Camera (2D 월드 렌더링)
  └── UI Camera (UI Toolkit 전용)
        ├── UIDocument — hud.uxml + hud.uss
        ├── UIDocument — inventory.uxml
        ├── UIDocument — skill.uxml
        ├── UIDocument — quest.uxml
        └── Canvas (uGUI) — 월드 스페이스 네임태그, 몬스터 HP바

폰트:       TextMeshPro (SDF 렌더링)
애니메이션: DOTween Pro
지역화:     Unity Localization Package
입력:       New Input System (키보드/마우스/게임패드 통합)
```

**Unity 게임패드 포커스 내비게이션:**
```csharp
// UINavigationManager.cs
public class UINavigationManager : MonoBehaviour
{
    private void Start() =>
        InputSystem.onDeviceChange += OnDeviceChange;

    private void OnDeviceChange(InputDevice device, InputDeviceChange change)
    {
        if (change == InputDeviceChange.Added && device is Gamepad)
        {
            Cursor.visible = false;
            Cursor.lockState = CursorLockMode.Locked;
            // UI Toolkit 포커스 활성화
            var root = GetComponent<UIDocument>().rootVisualElement;
            root.focusable = true;
            root.Focus();
        }
        else if (change == InputDeviceChange.Removed && device is Gamepad)
        {
            Cursor.visible = true;
            Cursor.lockState = CursorLockMode.None;
        }
    }
}
```

### 7.3 Unreal Engine 5 UI 스택

```
UMG Widget 계층 (z-order 순)
  ├── WBP_HUD          (z=0)  — 기본 HUD
  ├── WBP_Inventory    (z=10) — 인벤토리 패널
  ├── WBP_Dialogue     (z=15) — 대화창
  ├── WBP_BattleUI     (z=20) — 전투 UI
  ├── WBP_Confirm      (z=30) — 확인 다이얼로그
  ├── WBP_Notification (z=40) — 알림 스택
  └── WBP_Loading      (z=100) — 로딩 화면

렌더링:  Slate + UMG (하드웨어 가속)
폰트:    UE5 Noto Sans KR .uasset (SDF)
애니메이션: UMG 키프레임 트랙
지역화:  FText + StringTable CSV
입력:    Enhanced Input + FocusNavigation (D-pad 내비게이션)
콘솔:    CommonUI Plugin (PS5/Xbox 버튼 아이콘 자동 전환)
```

**CommonUI 기반 위젯 베이스:**
```cpp
// AC_BaseWidget.h
UCLASS()
class UAC_BaseWidget : public UCommonUserWidget
{
    GENERATED_BODY()
public:
    UFUNCTION(BlueprintCallable) void PlayOpenAnimation();
    UFUNCTION(BlueprintCallable) void PlayCloseAnimation();
    virtual void NativeOnActivated() override;
    virtual void NativeOnDeactivated() override;
protected:
    UPROPERTY(Transient, meta=(BindWidgetAnim)) UWidgetAnimation* OpenAnim;
    UPROPERTY(Transient, meta=(BindWidgetAnim)) UWidgetAnimation* CloseAnim;
};
```

---

## 8. Unity UI 설계 상세

### 8.1 해상도 및 Canvas 스케일 설정

| 설정 항목 | 값 | 설명 |
|----------|----|------|
| Reference Resolution | 1920 × 1080 | UI 기준 해상도 |
| Canvas Scaler Mode | Scale With Screen Size | 화면 크기 자동 스케일 |
| Match Width or Height | 0.5 | 가로/세로 균형 |
| DPI 지원 | Screen.dpi 기준 자동 | 고DPI 선명도 유지 |

```csharp
// UIScaleManager.cs
public class UIScaleManager : MonoBehaviour
{
    [SerializeField] private UIDocument hudDoc;

    private void Start()
    {
        float scale = Mathf.Clamp(Screen.width / 1920f, 0.6f, 2.0f);
        hudDoc.panelSettings.scale = scale;
    }
}
```

### 8.2 Unity 인벤토리 UI (UXML)

```xml
<!-- inventory.uxml -->
<ui:UXML xmlns:ui="UnityEngine.UIElements">
  <ui:VisualElement name="inventory-root" class="panel-root">
    <ui:VisualElement class="panel-header">
      <ui:Label text="인벤토리" class="panel-title" />
      <ui:Label name="weight-label" class="weight-label" />
      <ui:Button name="close-btn" text="✕" class="close-btn" />
    </ui:VisualElement>
    <ui:VisualElement class="tab-bar">
      <ui:Button text="전체" class="tab-btn tab-btn--active" name="tab-all" />
      <ui:Button text="장비" class="tab-btn" name="tab-equip" />
      <ui:Button text="소모품" class="tab-btn" name="tab-consume" />
      <ui:Button text="재료" class="tab-btn" name="tab-material" />
    </ui:VisualElement>
    <ui:ScrollView name="item-scroll" class="item-scroll">
      <ui:VisualElement name="item-grid" class="item-grid" />
    </ui:ScrollView>
    <ui:VisualElement name="item-info" class="item-info-panel">
      <ui:Image name="item-icon" />
      <ui:Label name="item-name" class="item-name" />
      <ui:Label name="item-desc" class="item-desc" />
      <ui:VisualElement class="item-actions">
        <ui:Button name="btn-equip" text="장착" />
        <ui:Button name="btn-enhance" text="강화" />
        <ui:Button name="btn-discard" text="버리기" class="btn-danger" />
      </ui:VisualElement>
    </ui:VisualElement>
  </ui:VisualElement>
</ui:UXML>
```

```csharp
// InventoryUI.cs
public class InventoryUI : MonoBehaviour
{
    [SerializeField] private UIDocument uiDocument;
    [SerializeField] private VisualTreeAsset itemSlotTemplate;

    private void OnEnable()
    {
        var root = uiDocument.rootVisualElement;
        root.Q<Button>("tab-all").clicked += () => FilterItems(ItemType.All);
        root.Q<Button>("tab-equip").clicked += () => FilterItems(ItemType.Equip);
        root.Q<Button>("close-btn").clicked += () => gameObject.SetActive(false);
        RefreshInventory();
    }

    private void RefreshInventory()
    {
        var grid = uiDocument.rootVisualElement.Q<VisualElement>("item-grid");
        grid.Clear();
        foreach (var item in GameManager.Instance.Inventory.Items)
        {
            var slot = itemSlotTemplate.Instantiate();
            slot.Q<Image>("slot-icon").sprite = item.Data.Icon;
            slot.Q<Label>("slot-count").text = item.Quantity > 1
                ? item.Quantity.ToString() : "";
            slot.AddToClassList($"rarity-{item.Data.Rarity.ToString().ToLower()}");
            slot.RegisterCallback<ClickEvent>(_ => ShowItemInfo(item));
            grid.Add(slot);
        }
    }
}
```

### 8.3 Unity 대화 UI (타이핑 이펙트)

```csharp
// DialogueUI.cs
public class DialogueUI : MonoBehaviour
{
    [SerializeField] private UIDocument uiDocument;
    private Label npcNameLabel, dialogueText;
    private Coroutine typingCoroutine;

    public void ShowDialogue(DialogueData data)
    {
        gameObject.SetActive(true);
        var root = uiDocument.rootVisualElement;
        npcNameLabel = root.Q<Label>("npc-name");
        dialogueText = root.Q<Label>("dialogue-body");
        npcNameLabel.text = data.NPCName;

        if (typingCoroutine != null) StopCoroutine(typingCoroutine);
        typingCoroutine = StartCoroutine(TypeText(data.Text));
    }

    private IEnumerator TypeText(string text)
    {
        dialogueText.text = "";
        foreach (char c in text)
        {
            dialogueText.text += c;
            yield return new WaitForSeconds(0.03f);
        }
    }
}
```

### 8.4 Unity 모바일 UI 자동 전환

```csharp
// MobileUIAdapter.cs
public class MobileUIAdapter : MonoBehaviour
{
    [SerializeField] private UIDocument hudDoc;

    private void Start()
    {
        if (!Application.isMobilePlatform) return;
        var root = hudDoc.rootVisualElement;
        // 퀵슬롯 모바일 레이아웃
        root.Q<VisualElement>("quickslot-bar").AddToClassList("quickslot-mobile");
        // 채팅창 기본 접힘
        root.Q<VisualElement>("chat-window").AddToClassList("chat-collapsed");
        // 가상 조이스틱 표시
        root.Q<VisualElement>("virtual-joystick").RemoveFromClassList("hidden");
        // 최소 버튼 크기 강제 (44px)
        root.Query<Button>().ForEach(btn => {
            btn.style.minWidth = 44;
            btn.style.minHeight = 44;
        });
    }
}
```

---

## 9. Unreal Engine 5 UI 설계 상세

### 9.1 UMG 위젯 계층 구조

```
AC_PlayerController → AddToViewport()
  ├── WBP_HUD (z=0)
  │   ├── WBP_StatusBars   (HP/MP/EXP 바)
  │   ├── WBP_QuickSlot    (스킬/아이템 단축 슬롯)
  │   ├── WBP_MiniMap      (미니맵)
  │   ├── WBP_BuffDebuff   (버프/디버프 아이콘 목록)
  │   └── WBP_QuestTracker (퀘스트 HUD 추적)
  ├── WBP_Inventory  (z=10, 토글)
  ├── WBP_SkillTree  (z=10, 토글)
  ├── WBP_QuestLog   (z=10, 토글)
  ├── WBP_Map        (z=10, 토글)
  ├── WBP_Shop       (z=10, NPC 상호작용 시)
  ├── WBP_Dialogue   (z=15, 대화 중)
  ├── WBP_BattleUI   (z=20, 전투 중)
  ├── WBP_Confirm    (z=30, 확인 다이얼로그)
  ├── WBP_Notification (z=40, 알림 스택)
  └── WBP_Loading    (z=100, 로딩 화면)
```

### 9.2 UMG HUD C++ 바인딩

```cpp
// WBP_HUD.h
UCLASS()
class UWB_HUD : public UAC_BaseWidget
{
    GENERATED_BODY()
protected:
    UPROPERTY(meta=(BindWidget)) UProgressBar* HP_Bar;
    UPROPERTY(meta=(BindWidget)) UProgressBar* MP_Bar;
    UPROPERTY(meta=(BindWidget)) UProgressBar* EXP_Bar;
    UPROPERTY(meta=(BindWidget)) UTextBlock*   CharacterNameText;
    UPROPERTY(meta=(BindWidget)) UTextBlock*   LevelText;
    UPROPERTY(meta=(BindWidget)) UImage*       AvatarImage;

    UFUNCTION(BlueprintImplementableEvent)
    void BP_OnHealthChanged(float NewHealth, float MaxHealth);

    UFUNCTION(BlueprintImplementableEvent)
    void BP_OnManaChanged(float NewMana, float MaxMana);

    void NativeConstruct() override;
};
```

### 9.3 Unreal 대화 시스템 (타이핑 이펙트)

```cpp
// WBP_Dialogue.h
UCLASS()
class UWB_Dialogue : public UAC_BaseWidget
{
    GENERATED_BODY()
public:
    UFUNCTION(BlueprintCallable)
    void ShowDialogue(const FDialogueData& Data);
protected:
    UPROPERTY(meta=(BindWidget)) UTextBlock*      NPCNameText;
    UPROPERTY(meta=(BindWidget)) URichTextBlock*  DialogueBodyText;
    UPROPERTY(meta=(BindWidget)) UImage*          NPCPortraitImage;
    UPROPERTY(meta=(BindWidget)) UVerticalBox*    ChoiceContainer;

    UPROPERTY(EditDefaultsOnly) float TypingSpeed = 0.03f;

    FTimerHandle TypingTimerHandle;
    FString      FullText;
    int32        CurrentCharIndex = 0;

    void StartTypingEffect(const FString& Text);

    UFUNCTION() void TypeNextChar();
};
```

### 9.4 Unreal 4K / HDR / Safe Zone

| 항목 | 설정 | 비고 |
|------|------|------|
| 기준 해상도 | 3840 × 2160 (4K) | DPI 스케일 자동 |
| HDR 지원 | HDR10 + Dolby Vision | PostProcess Volume |
| DPI 스케일 | r.DPIScale=2.0 (4K) / 1.0 (FHD) | 자동 감지 |
| Safe Area | USafeZone 위젯 | TV 오버스캔 대응 |
| 텍스트 | SDF 렌더링 | 해상도 무관 선명도 |

---

## 10. 게임패드 / 컨트롤러 UI 설계

### 10.1 지원 컨트롤러

| 엔진 | 지원 컨트롤러 | 비고 |
|------|--------------|------|
| Phaser.js | 웹 Gamepad API (Xbox, PS 기본) | 제한적 지원 |
| Unity | Xbox, DualSense, Switch Pro | Enhanced Input System |
| Unreal | Xbox Series, DualSense | Enhanced Input + CommonUI |

### 10.2 게임패드 전용 HUD 레이아웃 (SCR-025)

```
[게임패드 HUD — 1920×1080]
+================================================================================+
|  [START: 메뉴]  [SELECT: 지도]                    [서버: Asgard-1]  [21:34]   |
+================================================================================+
|                                                       +------------------+     |
|                                                       |    MINIMAP       |     |
|          [  GAME WORLD VIEWPORT  ]                    +------------------+     |
|                                                       [버프/디버프]            |
|  L2: 이전 타겟   L1: 스킬 모드                R1: 다음 슬롯   R2: 강공격       |
+--------------------------------------------------------------------------------+
| [아바타] 아리아                    [△] 인벤토리    [○] 취소/닫기              |
| HP [##########----] 248/400        [□] 스킬창      [✕] 확인/상호작용          |
| MP [######--------] 123/300        [↑] 퀵슬롯1    [→] 퀵슬롯2                 |
| EXP Lv.34 42%                      [↓] 퀵슬롯3    [←] 퀵슬롯4                 |
|                                                                                |
|  [L1+↑] [L1+→] [L1+↓] [L1+←]    [R1+↑] [R1+→] [R1+↓] [R1+←]              |
|  Skill1  Skill2  Potion  Shield    Skill5  Skill6  Skill7  Mount               |
+================================================================================+
  [LS: 이동]  [RS: 카메라]  [L3: 스프린트]  [R3: 타겟 잠금]
```

### 10.3 게임패드 UI 내비게이션 원칙

| 원칙 | 내용 |
|------|------|
| 포커스 시각화 | 선택 요소에 밝은 테두리 + 펄스 애니메이션 |
| D-pad 내비게이션 | 인벤토리 그리드·메뉴 리스트 D-pad 탐색 |
| 확인/취소 통일 | ✕(PS)/A(Xbox) = 확인, ○(PS)/B(Xbox) = 취소 |
| 탭 전환 | L1/R1으로 탭(전체/장비/소모품) 전환 |
| 빠른 닫기 | ○(PS)/B(Xbox)으로 모든 패널 닫기 |
| 컨텍스트 힌트 | 화면 하단에 현재 사용 가능한 버튼 힌트 표시 |

### 10.4 컨텍스트 버튼 힌트 UI

```
[화면 하단 — 상황별 자동 변경]

일반 이동 중:
+============================================================================+
| [✕] 상호작용  [△] 인벤토리  [□] 스킬  [L3] 스프린트  [OPTIONS] 메뉴     |
+============================================================================+

NPC 대화 앞:
+============================================================================+
| [✕] 대화 시작  [△] 인벤토리  [○] 취소                                    |
+============================================================================+

인벤토리 열림:
+============================================================================+
| [✕] 장착  [△] 아이템 정보  [□] 분해  [L1/R1] 탭 전환  [○] 닫기         |
+============================================================================+
```

**Unity Enhanced Input 컨텍스트 힌트:**
```csharp
// ContextHintUI.cs
public class ContextHintUI : MonoBehaviour
{
    [SerializeField] private UIDocument document;

    public void SetContext(UIContext context)
    {
        var hintBar = document.rootVisualElement.Q<VisualElement>("hint-bar");
        hintBar.Clear();
        foreach (var hint in GetHintsForContext(context))
        {
            var container = new VisualElement();
            container.AddToClassList("hint-item");
            var icon = new Image();
            icon.sprite = InputIconManager.GetButtonIcon(hint.Action);
            container.Add(icon);
            container.Add(new Label(hint.Label));
            hintBar.Add(container);
        }
    }
}
```

---

## 11. 콘솔 플랫폼 UI 설계 (Unreal Engine 5)

### 11.1 PS5 / Xbox Series X 타겟 사양

| 항목 | PS5 | Xbox Series X |
|------|-----|---------------|
| 기본 해상도 | 4K (3840×2160) | 4K (3840×2160) |
| 프레임 타겟 | 60fps / 120fps | 60fps / 120fps |
| HDR | HDR10 + Dolby Vision | HDR10 |
| UI Safe Area | 5% 마진 | 5% 마진 |
| 트로피/업적 | PlayStation 트로피 | Xbox 업적 |

### 11.2 콘솔 Safe Area 처리

```
[TV 화면]
+==========================================+
|  [Safe Area 경계 — 5% 마진]             |
|   +------------------------------------+ |
|   |  [실제 UI 영역]                    | |
|   |  HP [###---] 248/400               | |
|   |  MP [##----] 123/300               | |
|   +------------------------------------+ |
+==========================================+
```

```cpp
// AC_ConsoleSafeArea.cpp
void UAC_ConsoleSafeArea::NativeConstruct()
{
    Super::NativeConstruct();
#if PLATFORM_PS5 || PLATFORM_XSX
    FDisplayMetrics Metrics;
    FSlateApplication::Get().GetDisplayMetrics(Metrics);
    if (auto* SafeZone = Cast<USafeZone>(GetParent()))
    {
        SafeZone->SetSafeAreaScale(FMargin(
            Metrics.TitleSafePaddingSize.X / Metrics.PrimaryDisplayWidth,
            Metrics.TitleSafePaddingSize.Y / Metrics.PrimaryDisplayHeight
        ));
    }
#endif
}
```

### 11.3 콘솔 메인 메뉴 (SCR-026)

```
[PS5 / Xbox 타이틀 화면]
+========================================================================+
|                  [에테르나 크로니클 로고]                              |
|                  [게임 타이틀 아트 배경]                              |
|                                                                        |
|                      [ 게임 시작 ]          <- 포커스                  |
|                      [ 계속하기  ]                                    |
|                      [ 캐릭터 선택 ]                                  |
|                      [ 설정      ]                                    |
|                      [ 종료      ]                                    |
|                                                                        |
|  [PSN: user123]  [서버: Asia-1]              [버전: 1.0.0]  [PS5]    |
+========================================================================+
  [✕] 선택   [○] 뒤로   [OPTIONS] 시스템 메뉴
```

### 11.4 트로피 / 업적 알림 UI (SCR-027)

```
[PS5 트로피 알림 — 우상단]        [Xbox 업적 알림 — 우상단]
+---------------------------+      +----------------------------+
| [트로피 아이콘] 트로피!   |      | [업적 아이콘] 15G 업적!   |
| "첫 번째 기억의 수호자"   |      | "망각의 추적자"            |
| 기억 파편 1개 수집        |      | 에레보스 탐사 완료         |
+---------------------------+      +----------------------------+
(5초 후 자동 사라짐)
```

### 11.5 콘솔 그래픽 설정 화면 (SCR-023)

```
[콘솔 그래픽 설정]
+========================================================================+
|  [ 그래픽 설정 ]                                         [○] 뒤로    |
+========================================================================+
|  화질 프리셋        [성능] [균형] [화질] [레이트레이싱]              |
|  해상도 스케일      [  80% ◄──────────────────────► 100%  ]          |
|  프레임 목표        [ 60fps ▼ ]  /  [ 120fps ▼ ]                     |
|  VSync             [켜기 ▼]                                          |
|  HDR               [자동 감지 ▼]                                     |
|  모션 블러          [◉ 켜기]  [○ 끄기]                              |
|  DLSS / FSR        [DLSS 3 ▼]  품질 [균형 ▼]                        |
|                                                                        |
|  예상 성능:  [████████────────] ~87fps                              |
|                                                                        |
|  [ 기본값으로 초기화 ]                  [ 적용 및 닫기 ]             |
+========================================================================+
  [D-pad] 선택   [L/R 스틱] 값 조정   [✕] 적용   [○] 취소
```

---

## 12. 엔진별 해상도 및 스케일링 전략

### 12.1 해상도 지원 매트릭스

| 해상도 | Phaser.js (웹) | Unity | Unreal |
|--------|----------------|-------|--------|
| 1280×720 (HD) | 최소 지원 | 지원 | 지원 |
| 1920×1080 (FHD) | 기준 해상도 | 기준 해상도 | 기준 해상도 |
| 2560×1440 (QHD) | CSS 스케일 지원 | 지원 | 지원 |
| 3840×2160 (4K) | 미지원 | 지원 | 기본 지원 |
| 울트라와이드 (21:9) | 뷰포트 확장 | Canvas Scaler | 자동 대응 |
| 콘솔 | 미지원 | 미지원 | PS5 / Xbox |

### 12.2 Phaser.js — 반응형 스케일

```typescript
// GameConfig.ts
export const GameConfig: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    backgroundColor: '#1A1A2E',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 1920, height: 1080,
        min: { width: 1280, height: 720 },
        max: { width: 3840, height: 2160 },
    },
    callbacks: {
        postBoot: (game) => {
            game.scale.on('resize', (size: Phaser.Structs.Size) => {
                // CSS 변수로 React UI 스케일 동기화
                document.documentElement.style.setProperty(
                    '--ui-scale', String(size.width / 1920));
            });
        }
    }
};
```

```css
/* 반응형 CSS */
.hud-overlay { transform: scale(var(--ui-scale, 1)); transform-origin: top left; }
@media (max-width: 1440px) { .chat-window { width: 350px; } }
@media (max-width: 1280px) { .chat-window { display: none; } }
```

### 12.3 Unity — Canvas Scaler 동적 조정

```csharp
// UIScaleController.cs
public class UIScaleController : MonoBehaviour
{
    [SerializeField] private UIDocument hudDoc;

    private void Awake()
    {
        float scale = Mathf.Clamp(Screen.width / 1920f, 0.6f, 2.0f);
        hudDoc.panelSettings.scale = scale;

        // 해상도별 USS 클래스 적용
        var root = hudDoc.rootVisualElement;
        if (Screen.width >= 3840)      root.AddToClassList("preset-4k");
        else if (Screen.width >= 2560) root.AddToClassList("preset-qhd");
        else if (Screen.width >= 1920) root.AddToClassList("preset-fhd");
        else                            root.AddToClassList("preset-hd");
    }
}
```

### 12.4 Unreal — DPI 및 Safe Zone 자동 적용

```cpp
// AC_GameUserSettings.cpp
void UAC_GameUserSettings::ApplyResolutionSettings(bool bCheck)
{
    Super::ApplyResolutionSettings(bCheck);
    float DPI = FPlatformMisc::GetDPIScaleFactorAtPoint(0, 0);
    GConfig->SetFloat(TEXT("UI"), TEXT("DPIScaleFactor"), DPI, GGameUserSettingsIni);

#if PLATFORM_PS5 || PLATFORM_XSX
    FDisplayMetrics Metrics;
    FSlateApplication::Get().GetDisplayMetrics(Metrics);
    SafeZoneMargin = FMargin(
        Metrics.TitleSafePaddingSize.X / Metrics.PrimaryDisplayWidth,
        Metrics.TitleSafePaddingSize.Y / Metrics.PrimaryDisplayHeight
    );
#endif
}
```

---

## 13. Google Stitch 기반 UI 개발 파이프라인

> 목표: UI 설계를 Google Stitch 중심으로 구조화해, **웹(React/Phaser) ↔ Unity ↔ UE5** 간 구현 편차를 최소화한다.

### 13.1 적용 범위 및 역할

| 단계 | 산출물 | 담당 | 비고 |
|---|---|---|---|
| 디자인 원본 | Stitch 프로젝트 (화면/컴포넌트/스타일) | UI 디자이너 | SSOT(시각 원본) |
| 토큰 추출 | color/typography/spacing/motion token JSON | UI 엔지니어 | 버전 태깅 필수 |
| 컴포넌트 계약 | 컴포넌트 스펙 문서(Props/State/Events) | 기획 + 클라 | 엔진 공통 계약 |
| 엔진 변환 | React/Unity/UE5 구현 코드 | 각 엔진 담당 | 엔진별 어댑터 레이어 |
| 검수 | 픽셀/동작/접근성 점검 | QA | 3엔진 동시 체크 |

### 13.2 폴더/아티팩트 규약 (권장)

```text
/ui
  /stitch
    stitch_export.json
    tokens.json
    component_map.json
  /contracts
    ui_component_contracts.md
  /phaser
    /react-ui
  /unity
    /ui-toolkit
  /unreal
    /umg
```

### 13.3 디자인 토큰 표준

| 토큰 그룹 | 예시 키 | 값 예시 | 설명 |
|---|---|---|---|
| Color | `color.hp.fill` | `#D64545` | HP 바 전경 |
| Color | `color.mp.fill` | `#3A7BFF` | MP 바 전경 |
| Typography | `font.body.kr` | `Pretendard` | 본문 한글 폰트 |
| Typography | `font.size.sm` | `14` | 소형 텍스트 |
| Spacing | `space.2` | `8` | 8px 스케일 단위 |
| Radius | `radius.md` | `8` | 기본 라운드 |
| Motion | `motion.fast` | `120ms` | 빠른 반응 애니메이션 |

### 13.4 컴포넌트 계약(Contract First)

모든 핵심 HUD 컴포넌트는 Stitch에서 시각 구조를 만든 뒤, 아래 계약을 문서화한다.

- 컴포넌트명: `HudStatusBar`
- 필수 Props: `hpCurrent`, `hpMax`, `mpCurrent`, `mpMax`, `level`, `expRatio`
- 상태(State): `dangerBlink` (HP 20% 미만)
- 이벤트(Event): `onAvatarClick`, `onTooltipOpen`
- 접근성: 색상 외 아이콘/텍스트 동시 표기

### 13.5 엔진별 변환 가이드

#### A) Phaser.js + React
- Stitch export → React 컴포넌트 템플릿 자동 생성
- 토큰은 CSS Variables로 주입
- HUD는 React, 월드는 Phaser Canvas로 분리

```css
:root {
  --color-hp-fill: #D64545;
  --space-2: 8px;
  --motion-fast: 120ms;
}
```

#### B) Unity (UI Toolkit)
- Stitch 토큰 → USS 변수로 매핑
- 컴포넌트 계약을 UXML 구조로 대응
- 런타임 데이터 바인딩은 C# ViewModel 계층에서 처리

```uss
:root {
  --color-hp-fill: #D64545;
  --space-2: 8px;
}
.hp-bar__fill { background-color: var(--color-hp-fill); }
```

#### C) Unreal Engine 5 (UMG)
- Stitch 컴포넌트 트리 → UMG 위젯 트리 수동/반자동 매핑
- 공통 토큰은 DataTable 또는 PrimaryDataAsset으로 관리
- 스타일 적용은 CommonUI Style Asset 활용 권장

### 13.6 Stitch 기반 개발 체크리스트

- [ ] 모든 신규 화면이 Stitch 프로젝트 ID로 추적 가능한가
- [ ] 토큰 변경 시 `tokens.json` 버전이 증가했는가
- [ ] 컴포넌트 계약 문서가 Props/State/Event를 포함하는가
- [ ] 3엔진 구현 결과가 주요 화면 기준 ±4px 이내로 일치하는가
- [ ] 다크/라이트(또는 접근성 모드) 대비 기준이 동일한가

### 13.7 운영 규칙 (변경 관리)

1. Stitch 원본 변경 → 토큰 버전 업데이트 → 엔진 반영 순으로 진행
2. 직접 엔진 코드에서 스타일 하드코딩 금지 (토큰 우선)
3. HUD 핵심 컴포넌트는 공통 계약을 먼저 수정한 뒤 구현
4. 릴리즈 직전에는 Stitch 기준 스냅샷과 실제 빌드 UI 비교 캡처를 남긴다

### 13.8 리스크 및 대응

| 리스크 | 증상 | 대응 |
|---|---|---|
| 토큰 드리프트 | 엔진별 색/간격 불일치 | 토큰 단일 저장소 + CI 검증 |
| 컴포넌트 분기 폭증 | 엔진별 UI 동작 달라짐 | 계약 문서 기반 테스트 케이스 고정 |
| 애니메이션 불일치 | 웹은 부드럽고 콘솔은 딱딱함 | motion token + 엔진별 fallback 정의 |
| 폰트 렌더 차이 | 한글 가독성 저하 | SDF/힌팅 설정 표준화 |

---

## 부록: 화면별 z-index 체계

```
[레이어 구조 (낮은 번호가 아래)]

z-index: 1     - 게임 월드 뷰포트 (기본 게임 화면)
z-index: 10    - HUD 기본 요소 (HP바, 미니맵, 퀵슬롯)
z-index: 20    - 채팅창
z-index: 30    - 오버레이 패널 (인벤토리, 스킬창 등)
z-index: 40    - 모달 다이얼로그 (구매 확인, 아이템 버리기)
z-index: 50    - 툴팁
z-index: 60    - 알림/토스트 메시지
z-index: 70    - 튜토리얼 스포트라이트 오버레이
z-index: 80    - 로딩 화면
z-index: 90    - 시스템 오류/긴급 공지 모달
z-index: 9999  - 개발자 디버그 패널 (배포 시 제거)
```

---

## 부록: 반응형 브레이크포인트

```css
/* 지원 브레이크포인트 */
@media (min-width: 1920px) { /* Full HD + */  }
@media (min-width: 1440px) { /* QHD/대형 모니터 */  }
@media (min-width: 1280px) { /* 기본 지원 최소값 */  }
@media (min-width: 1024px) { /* 태블릿 가로 */  }

/* 높이 기준 */
@media (min-height: 768px) { /* 세로 최소 보장 */  }
```

---

*본 문서는 에테르나 크로니클 RPG 게임 UI/UX 설계 문서 (멀티 엔진 확장판)입니다. 개발 진행에 따라 업데이트될 수 있습니다.*
*담당: UI/UX 에이전트 | 최종 수정: 2026-02-22 | 버전: v2.0*
