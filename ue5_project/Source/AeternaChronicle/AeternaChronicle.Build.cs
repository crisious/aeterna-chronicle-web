// AeternaChronicle.Build.cs
// 에테르나 크로니클 — UE5.5 빌드 설정

using UnrealBuildTool;

public class AeternaChronicle : ModuleRules
{
    public AeternaChronicle(ReadOnlyTargetRules Target) : base(Target)
    {
        PCHUsage = PCHUsageMode.UseExplicitOrSharedPCHs;

        // ─── 공개 의존 모듈 ───
        PublicDependencyModuleNames.AddRange(new string[]
        {
            "Core",
            "CoreUObject",
            "Engine",
            "InputCore",
            "EnhancedInput",

            // GAS (Gameplay Ability System) 모듈
            "GameplayAbilities",
            "GameplayTags",
            "GameplayTasks",

            // 네트워킹
            "WebSockets",
            "Sockets",
            "Networking",

            // UI
            "UMG",
            "Slate",
            "SlateCore",
        });

        // ─── 비공개 의존 모듈 ───
        PrivateDependencyModuleNames.AddRange(new string[]
        {
            "Json",
            "JsonUtilities",
            "HTTP",
            "Protobuf",      // Protobuf 직렬화용
        });

        // ─── Protobuf 인클루드 경로 ───
        PublicIncludePaths.AddRange(new string[]
        {
            "$(ModuleDir)/Network/Proto",
        });

        // ─── GAS 예측 실행 활성화 ───
        PublicDefinitions.Add("WITH_GAMEPLAY_DEBUGGER=1");
    }
}
