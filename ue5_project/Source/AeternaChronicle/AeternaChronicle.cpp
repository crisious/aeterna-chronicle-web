// AeternaChronicle.cpp
// 에테르나 크로니클 — 모듈 구현

#include "AeternaChronicle.h"
#include "Modules/ModuleManager.h"

// ─── 로그 카테고리 정의 ───
DEFINE_LOG_CATEGORY(LogAeterna);
DEFINE_LOG_CATEGORY(LogAeternaCombat);
DEFINE_LOG_CATEGORY(LogAeternaNetwork);

IMPLEMENT_PRIMARY_GAME_MODULE(FDefaultGameModuleImpl, AeternaChronicle, "AeternaChronicle");
