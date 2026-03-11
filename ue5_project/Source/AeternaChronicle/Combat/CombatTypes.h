// CombatTypes.h
// 에테르나 크로니클 — 전투 관련 열거형/구조체 정의

#pragma once

#include "CoreMinimal.h"
#include "GameplayTagContainer.h"
#include "CombatTypes.generated.h"

// ─── 속성 상성 (Element Affinity) ───
UENUM(BlueprintType)
enum class EElementType : uint8
{
    None        UMETA(DisplayName = "무속성"),
    Fire        UMETA(DisplayName = "화염"),
    Ice         UMETA(DisplayName = "빙결"),
    Lightning   UMETA(DisplayName = "번개"),
    Earth       UMETA(DisplayName = "대지"),
    Wind        UMETA(DisplayName = "바람"),
    Light       UMETA(DisplayName = "빛"),
    Dark        UMETA(DisplayName = "어둠"),
    Chrono      UMETA(DisplayName = "시간"),  // 에테르나 고유 속성
};

// ─── 전투 결과 유형 ───
UENUM(BlueprintType)
enum class ECombatHitResult : uint8
{
    Normal      UMETA(DisplayName = "일반"),
    Critical    UMETA(DisplayName = "크리티컬"),
    Miss        UMETA(DisplayName = "회피"),
    Blocked     UMETA(DisplayName = "방어"),
    Immune      UMETA(DisplayName = "면역"),
};

// ─── 어빌리티 코스트 유형 ───
UENUM(BlueprintType)
enum class EAbilityCostType : uint8
{
    MP          UMETA(DisplayName = "마나"),
    HP          UMETA(DisplayName = "체력"),
    Stamina     UMETA(DisplayName = "스태미나"),
    ChronoGauge UMETA(DisplayName = "시간 게이지"),
};

// ─── 타겟팅 유형 ───
UENUM(BlueprintType)
enum class ETargetingType : uint8
{
    Self            UMETA(DisplayName = "자기 자신"),
    SingleEnemy     UMETA(DisplayName = "적 단일"),
    AllEnemies      UMETA(DisplayName = "적 전체"),
    SingleAlly      UMETA(DisplayName = "아군 단일"),
    AllAllies       UMETA(DisplayName = "아군 전체"),
    AreaOfEffect    UMETA(DisplayName = "범위 지정"),
    Projectile      UMETA(DisplayName = "투사체"),
};

// ─── 데미지 정보 구조체 ───
USTRUCT(BlueprintType)
struct FAeternaDamageInfo
{
    GENERATED_BODY()

    // 기본 데미지 수치
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "데미지")
    float BaseDamage = 0.f;

    // 속성 타입
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "데미지")
    EElementType Element = EElementType::None;

    // 크리티컬 여부
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "데미지")
    bool bIsCritical = false;

    // 최종 데미지 (계산 후)
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "데미지")
    float FinalDamage = 0.f;

    // 적중 결과
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "데미지")
    ECombatHitResult HitResult = ECombatHitResult::Normal;

    // 스킬 태그 (어떤 스킬로 입힌 데미지인지)
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "데미지")
    FGameplayTag SourceAbilityTag;
};

// ─── 속성 상성 테이블 ───
// 행: 공격자 속성, 열: 피격자 속성 → 배율
USTRUCT(BlueprintType)
struct FElementAffinityTable
{
    GENERATED_BODY()

    // 속성 상성 배율 조회
    // 기본 상성: 화염→빙결 1.5x, 빙결→번개 1.5x, 번개→대지 0.5x 등
    static float GetAffinityMultiplier(EElementType Attacker, EElementType Defender)
    {
        // 동일 속성 → 0.75 감소
        if (Attacker == Defender && Attacker != EElementType::None)
        {
            return 0.75f;
        }

        // 상성 우위
        if ((Attacker == EElementType::Fire && Defender == EElementType::Ice) ||
            (Attacker == EElementType::Ice && Defender == EElementType::Fire) == false &&
            (Attacker == EElementType::Lightning && Defender == EElementType::Wind) ||
            (Attacker == EElementType::Earth && Defender == EElementType::Lightning) ||
            (Attacker == EElementType::Wind && Defender == EElementType::Earth) ||
            (Attacker == EElementType::Light && Defender == EElementType::Dark) ||
            (Attacker == EElementType::Dark && Defender == EElementType::Light) == false)
        {
            // 간략화된 상성 — 실제로는 2D 배열 룩업 권장
        }

        // 화염 → 빙결: 1.5배
        if (Attacker == EElementType::Fire && Defender == EElementType::Ice) return 1.5f;
        // 빙결 → 바람: 1.5배
        if (Attacker == EElementType::Ice && Defender == EElementType::Wind) return 1.5f;
        // 번개 → 빙결: 1.3배
        if (Attacker == EElementType::Lightning && Defender == EElementType::Ice) return 1.3f;
        // 대지 → 번개: 1.5배
        if (Attacker == EElementType::Earth && Defender == EElementType::Lightning) return 1.5f;
        // 바람 → 대지: 1.5배
        if (Attacker == EElementType::Wind && Defender == EElementType::Earth) return 1.5f;
        // 빛 → 어둠: 1.5배
        if (Attacker == EElementType::Light && Defender == EElementType::Dark) return 1.5f;
        // 어둠 → 빛: 1.5배
        if (Attacker == EElementType::Dark && Defender == EElementType::Light) return 1.5f;
        // 시간 → 모든 속성: 1.2배 (에테르나 고유)
        if (Attacker == EElementType::Chrono && Defender != EElementType::None) return 1.2f;

        // 역상성 (반대): 0.5배
        if (Attacker == EElementType::Ice && Defender == EElementType::Fire) return 0.5f;
        if (Attacker == EElementType::Wind && Defender == EElementType::Ice) return 0.5f;
        if (Attacker == EElementType::Lightning && Defender == EElementType::Earth) return 0.5f;
        if (Attacker == EElementType::Earth && Defender == EElementType::Wind) return 0.5f;

        return 1.0f; // 무관
    }
};
