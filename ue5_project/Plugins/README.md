# 에테르나 크로니클 — UE5 플러그인

## Gameplay Ability System (GAS)

UE5에 내장된 GAS는 별도 플러그인 설치 없이 `Build.cs`에서 모듈 참조로 사용 가능합니다.

### 사용 모듈

| 모듈 | 용도 |
|------|------|
| `GameplayAbilities` | 어빌리티 정의, ASC, GameplayEffect |
| `GameplayTags` | 태그 기반 시스템 (스킬, 상태, 쿨다운 식별) |
| `GameplayTasks` | 비동기 태스크 (몽타주 재생, 타겟 지정 등) |

### 활성화 방법

1. `.uproject` 파일에 플러그인 활성화:
```json
{
    "Plugins": [
        {
            "Name": "GameplayAbilities",
            "Enabled": true
        }
    ]
}
```

2. `Build.cs`에 모듈 의존성 추가 (이미 적용됨):
```csharp
PublicDependencyModuleNames.AddRange(new string[] {
    "GameplayAbilities",
    "GameplayTags",
    "GameplayTasks"
});
```

### 추가 권장 플러그인

| 플러그인 | 용도 | 상태 |
|----------|------|------|
| `EnhancedInput` | UE5 신규 입력 시스템 | 내장, 활성화 |
| `Niagara` | VFX 시스템 (전투 이펙트) | 내장, 필요 시 활성화 |
| `CommonUI` | 크로스 플랫폼 UI 프레임워크 | 내장, 콘솔 포팅 시 활용 |
| `WebSocket` | WebSocket 클라이언트 | 내장, 활성화 |

### 주의사항

- GAS는 `AActor`에 `UAbilitySystemComponent`를 부착하는 방식으로 작동합니다.
- 에테르나 크로니클에서는 `AeternaCharacterBase`가 `IAbilitySystemInterface`를 구현합니다.
- 네트워크 복제(Replication)는 `EGameplayEffectReplicationMode::Mixed` 모드를 사용합니다.
