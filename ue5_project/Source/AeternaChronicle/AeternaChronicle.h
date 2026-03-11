// AeternaChronicle.h
// 에테르나 크로니클 — 모듈 헤더

#pragma once

#include "CoreMinimal.h"
#include "Modules/ModuleManager.h"

// ─── 전역 로그 카테고리 ───
DECLARE_LOG_CATEGORY_EXTERN(LogAeterna, Log, All);
DECLARE_LOG_CATEGORY_EXTERN(LogAeternaCombat, Log, All);
DECLARE_LOG_CATEGORY_EXTERN(LogAeternaNetwork, Log, All);

// ─── Gameplay Tag 매크로 ───
// 자주 사용하는 태그를 네이티브로 등록
#define AETERNA_TAG(TagName) FGameplayTag::RequestGameplayTag(FName(TagName))
