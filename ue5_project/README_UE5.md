# 에테르나 크로니클 — UE5 프로젝트 셋업 가이드

> UE5.5 C++ 프로젝트 | GAS 전투 프레임워크 | 공통 서버(Node.js) 연동

---

## 1. 프로젝트 개요

에테르나 크로니클의 **Unreal Engine 5 고사양 클라이언트**입니다.
Phase 3(정식 출시) 단계에서 PC/콘솔 하이엔드 유저를 대상으로 합니다.

### 핵심 기술 스택

| 구성요소 | 기술 |
|----------|------|
| 엔진 | Unreal Engine 5.5 |
| 언어 | C++ / Blueprint |
| 전투 시스템 | Gameplay Ability System (GAS) |
| 입력 | Enhanced Input |
| UI | UMG (Unreal Motion Graphics) |
| 네트워크 | WebSocket → 공통 Node.js 서버 |
| 직렬화 | Protobuf (shared/proto/game.proto) |
| 렌더링 | Nanite + Lumen |
| 물리 | Chaos Physics |

---

## 2. 프로젝트 구조

```
ue5_project/
├── Config/
│   ├── DefaultEngine.ini      ← 서버 URL, 렌더링 설정
│   ├── DefaultGame.ini         ← 프로젝트 메타데이터
│   └── DefaultInput.ini        ← 키 바인딩
├── Source/
│   └── AeternaChronicle/
│       ├── AeternaChronicle.Build.cs   ← 모듈 의존성
│       ├── AeternaChronicle.h/.cpp     ← 모듈 진입점, 로그 카테고리
│       ├── Combat/                      ← GAS 전투 시스템
│       │   ├── CombatTypes.h           ← 속성/열거형/구조체
│       │   ├── AeternaAbilitySystemComponent.h/.cpp
│       │   ├── AeternaGameplayAbility.h/.cpp
│       │   ├── AeternaAttributeSet.h/.cpp
│       │   └── DamageExecution.h/.cpp
│       ├── Character/                   ← 캐릭터 클래스
│       │   ├── AeternaCharacterBase.h/.cpp
│       │   └── AeternaPlayerCharacter.h/.cpp
│       └── Network/                     ← 서버 연동
│           ├── ServerConnection.h/.cpp
│           └── PacketSerializer.h/.cpp
├── Plugins/
│   └── README.md
└── README_UE5.md (이 문서)
```

---

## 3. 셋업 가이드

### 3.1 사전 요구사항

- Unreal Engine 5.5 (Epic Games Launcher 또는 소스 빌드)
- Visual Studio 2022 (Windows) 또는 Xcode 15+ (macOS)
- .NET 6.0 SDK (UBT 빌드용)

### 3.2 프로젝트 생성

1. UE5 에디터에서 "C++ 기본" 프로젝트 생성:
   - 프로젝트명: `AeternaChronicle`
   - 타겟: Desktop (High-End)

2. 생성된 프로젝트의 `Source/` 디렉토리에 이 저장소의 소스 파일을 복사.

3. `.uproject` 파일에 GAS 플러그인 활성화:
```json
{
    "Plugins": [
        { "Name": "GameplayAbilities", "Enabled": true },
        { "Name": "EnhancedInput", "Enabled": true }
    ]
}
```

4. Visual Studio에서 솔루션 재생성:
```
도구 → "Visual Studio 프로젝트 파일 생성"
```

### 3.3 서버 연결 설정

`Config/DefaultEngine.ini`의 `[/Script/AeternaChronicle.ServerSettings]` 섹션:

```ini
WebSocketURL=ws://your-server:3001
WebSocketReconnectInterval=5.0
WebSocketMaxRetries=10
ServerAPIBaseURL=http://your-server:3000/api
ClientType=unreal
```

---

## 4. GAS 아키텍처

### 4.1 전체 구조

```
AeternaCharacterBase (IAbilitySystemInterface)
├── AeternaAbilitySystemComponent (ASC)
│   ├── AeternaAttributeSet (HP, MP, ATK, DEF, SPD, CritRate, CritDmg)
│   ├── GameplayAbilities (스킬 목록)
│   └── GameplayEffects (버프/디버프/데미지)
└── AeternaPlayerCharacter
    ├── Enhanced Input 바인딩
    ├── 카메라 시스템
    └── ServerConnection (WebSocket)
```

### 4.2 어트리뷰트 (스탯)

| 어트리뷰트 | 설명 | 기본값 |
|------------|------|--------|
| Health / MaxHealth | 체력 | 100 |
| Mana / MaxMana | 마나 | 50 |
| AttackPower | 공격력 | 10 |
| DefensePower | 방어력 | 5 |
| Speed | 이동 속도 | 100 |
| CriticalRate | 크리티컬 확률 (0~1) | 0.05 |
| CriticalDamage | 크리티컬 배율 | 1.5 |

### 4.3 데미지 공식

```
BaseDmg = ATK × AbilityMultiplier
DefReduction = BaseDmg × (DEF / (DEF + 100))
NetDmg = max(BaseDmg - DefReduction, 1)
CritDmg = NetDmg × CritDamageMultiplier  (크리티컬 시)
FinalDmg = CritDmg × ElementAffinityMultiplier
```

방어력 감쇄 곡선:
- DEF 0 → 0% 감쇄
- DEF 50 → 33% 감쇄
- DEF 100 → 50% 감쇄
- DEF 200 → 66% 감쇄

### 4.4 속성 상성

| 공격 ↓ \ 방어 → | 화염 | 빙결 | 번개 | 대지 | 바람 | 빛 | 어둠 |
|-------------------|------|------|------|------|------|-----|------|
| 화염 | 0.75 | **1.5** | 1.0 | 1.0 | 1.0 | 1.0 | 1.0 |
| 빙결 | 0.5 | 0.75 | 1.0 | 1.0 | **1.5** | 1.0 | 1.0 |
| 번개 | 1.0 | **1.3** | 0.75 | 0.5 | 1.0 | 1.0 | 1.0 |
| 대지 | 1.0 | 1.0 | **1.5** | 0.75 | 0.5 | 1.0 | 1.0 |
| 바람 | 1.0 | 0.5 | 1.0 | **1.5** | 0.75 | 1.0 | 1.0 |
| 빛 | 1.0 | 1.0 | 1.0 | 1.0 | 1.0 | 0.75 | **1.5** |
| 어둠 | 1.0 | 1.0 | 1.0 | 1.0 | 1.0 | **1.5** | 0.75 |
| 시간(크로노) | 1.2 | 1.2 | 1.2 | 1.2 | 1.2 | 1.2 | 1.2 |

### 4.5 어빌리티 라이프사이클

```
CanActivateAbility() → 코스트/쿨다운/태그 조건 검증
    ↓ (통과)
ActivateAbility() → CommitAbility(코스트 소모 + 쿨다운 적용)
    ↓
[스킬 로직 실행] → DamageExecution으로 데미지 계산
    ↓
EndAbility() → 정리
```

---

## 5. 서버 연동

### 5.1 통신 흐름

```
UE5 Client                    Node.js Server
    │                              │
    ├─── WebSocket Connect ───────→│
    │                              │
    ├─── JoinRoom ────────────────→│
    │←── PlayerJoined ─────────────┤
    │                              │
    ├─── PlayerMove (100ms) ──────→│
    │←── OtherPlayerMoves ─────────┤
    │                              │
    ├─── PlayerAction ────────────→│
    │←── CombatResult ─────────────┤
    │                              │
```

### 5.2 패킷 직렬화

`PacketSerializer`는 `shared/proto/game.proto` 기반 바이너리 직렬화를 지원합니다.
Protobuf 라이브러리 없이도 수동 바이너리 인코딩으로 동작합니다.

JSON 폴백도 제공:
```cpp
FString Json = FAeternaPacketSerializer::SerializePlayerMoveAsJson(
    "player_1", 100.f, 200.f, "moving");
```

---

## 6. 빌드

### 6.1 에디터 빌드

```
UE5 에디터 → 도구 → "Visual Studio 프로젝트 파일 생성"
→ Visual Studio에서 빌드 (Development Editor | Win64)
```

### 6.2 커맨드라인 빌드

```bash
# Windows
"C:\UnrealEngine\Engine\Build\BatchFiles\Build.bat" \
    AeternaChronicle Win64 Development \
    -project="D:\Projects\AeternaChronicle\AeternaChronicle.uproject"

# 패키징
"C:\UnrealEngine\Engine\Build\BatchFiles\RunUAT.bat" BuildCookRun \
    -project="AeternaChronicle.uproject" \
    -platform=Win64 -clientconfig=Shipping \
    -cook -build -stage -pak -archive
```

---

## 7. 기존 산출물 연동

### 7.1 UE5 UMG HUD (ue5_umg/)

P1-03에서 생성된 `ue5_umg/HUD/Cpp/` 파일들과의 통합:

| HUD 위젯 | 연동 어트리뷰트 |
|-----------|-----------------|
| HudStatusBarWidget | Health, MaxHealth, Mana, MaxMana |
| HudQuickSlotBarWidget | 어빌리티 슬롯 (InputID 기반) |
| HudQuestTrackerWidget | (서버 동기화) |
| HudDialogueBoxWidget | (NPC 상호작용) |

통합 시 `HudContracts.h`의 인터페이스를 `AeternaAttributeSet` 변경 이벤트에 바인딩합니다.

---

## 8. 다음 단계

- [ ] Blueprint로 구체적 스킬 구현 (화염구, 빙결 화살 등)
- [ ] GameplayEffect 에셋 생성 (쿨다운, 버프, 디버프)
- [ ] AI (Behavior Tree + EQS) 몬스터 구현
- [ ] World Partition 맵 세팅
- [ ] Niagara VFX 전투 이펙트
- [ ] 사운드 시스템 (MetaSound)
- [ ] 콘솔 포팅 (PS5/XSX) — CommonUI 활용
