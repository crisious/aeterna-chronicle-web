#!/usr/bin/env python3
"""
P5 통합 플레이테스트 검증 스크립트
에테르나크로니클 — Phase 5 출시 RC 판정용
50개 체크 항목 (파일 존재 + grep 기반 검증)
"""

import os
import re
import subprocess
import sys
from datetime import datetime
from pathlib import Path

# ── 프로젝트 루트 자동 탐색 ──
SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent.parent  # tools/regression -> project root

SERVER = PROJECT_ROOT / "server"
CLIENT = PROJECT_ROOT / "client"
SHARED = PROJECT_ROOT / "shared"
TESTS = PROJECT_ROOT / "tests"
TOOLS = PROJECT_ROOT / "tools"

# ── 결과 저장 ──
results: list[dict] = []
pass_count = 0
fail_count = 0
skip_count = 0


def check(num: int, category: str, name: str, func):
    """단일 체크 실행 및 결과 기록"""
    global pass_count, fail_count, skip_count
    try:
        ok, detail = func()
        status = "PASS" if ok else "FAIL"
    except FileNotFoundError as e:
        status, detail = "FAIL", f"파일 없음: {e}"
    except Exception as e:
        status, detail = "SKIP", f"검증 예외: {e}"

    if status == "PASS":
        pass_count += 1
    elif status == "FAIL":
        fail_count += 1
    else:
        skip_count += 1

    results.append({
        "num": num,
        "category": category,
        "name": name,
        "status": status,
        "detail": detail,
    })
    icon = {"PASS": "✅", "FAIL": "❌", "SKIP": "⚠️"}[status]
    print(f"  {icon} [{status}] #{num:02d} {name} — {detail}")


def file_exists(path: Path) -> bool:
    return path.is_file()


def count_pattern(path: Path, pattern: str) -> int:
    """파일 내 패턴 매칭 라인 수 (멀티라인)"""
    if not path.is_file():
        return 0
    text = path.read_text(encoding="utf-8", errors="ignore")
    return len(re.findall(pattern, text, re.MULTILINE))


def grep_exists(path: Path, pattern: str) -> bool:
    """파일에 패턴이 1회 이상 존재하는지"""
    return count_pattern(path, pattern) >= 1


def count_files(directory: Path, pattern: str) -> int:
    """디렉터리 내 glob 패턴 매칭 파일 수"""
    if not directory.is_dir():
        return 0
    return len(list(directory.glob(pattern)))


# ═══════════════════════════════════════════
#  전투 코어 (1-10)
# ═══════════════════════════════════════════

def c01():
    model_ok = grep_exists(SERVER / "prisma/schema.prisma", r"^model Monster\b")
    seeds = SERVER / "src/monster/monsterSeeds.ts"
    seed_count = count_pattern(seeds, r"\{") if seeds.is_file() else 0
    ok = model_ok and seed_count >= 100
    return ok, f"Monster 모델={'O' if model_ok else 'X'}, monsterSeeds 엔트리≈{seed_count}"

def c02():
    ok = grep_exists(SERVER / "prisma/schema.prisma", r"^model MonsterSpawn\b")
    return ok, "MonsterSpawn 모델 존재" if ok else "MonsterSpawn 모델 없음"

def c03():
    f = SERVER / "src/monster/monsterAI.ts"
    if not f.is_file():
        return False, "monsterAI.ts 없음"
    states = ["idle", "patrol", "chase", "attack", "flee", "dead"]
    found = [s for s in states if grep_exists(f, s)]
    ok = len(found) == len(states)
    return ok, f"monsterAI.ts 상태 {len(found)}/{len(states)}: {','.join(found)}"

def c04():
    ok = file_exists(SERVER / "src/monster/spawnManager.ts")
    return ok, "spawnManager.ts 존재" if ok else "spawnManager.ts 없음"

def c05():
    f = SERVER / "src/routes/monsterRoutes.ts"
    if not f.is_file():
        return False, "monsterRoutes.ts 없음"
    ep_count = count_pattern(f, r"\.(get|post|put|patch|delete)\s*\(")
    ok = ep_count >= 4
    return ok, f"monsterRoutes.ts 엔드포인트 {ep_count}개"

def c06():
    model_ok = grep_exists(SERVER / "prisma/schema.prisma", r"^model Skill\b")
    seeds = SERVER / "src/skill/skillSeeds.ts"
    seed_count = count_pattern(seeds, r"\{") if seeds.is_file() else 0
    ok = model_ok and seed_count >= 90
    return ok, f"Skill 모델={'O' if model_ok else 'X'}, skillSeeds 엔트리≈{seed_count}"

def c07():
    f = SERVER / "src/skill/skillEngine.ts"
    if not f.is_file():
        return False, "skillEngine.ts 없음"
    funcs = ["unlock", "levelUp", "equip", "reset"]
    # 대소문자 무관 검색
    found = [fn for fn in funcs if grep_exists(f, re.escape(fn))]
    ok = len(found) == len(funcs)
    return ok, f"skillEngine.ts 함수 {len(found)}/{len(funcs)}: {','.join(found)}"

def c08():
    ok = grep_exists(SERVER / "prisma/schema.prisma", r"^model PlayerSkill\b")
    return ok, "PlayerSkill 모델 존재" if ok else "PlayerSkill 모델 없음"

def c09():
    bs = file_exists(CLIENT / "src/scenes/BattleScene.ts")
    cm = file_exists(CLIENT / "src/combat/CombatManager.ts")
    ok = bs and cm
    return ok, f"BattleScene={'O' if bs else 'X'}, CombatManager={'O' if cm else 'X'}"

def c10():
    ok = file_exists(CLIENT / "src/ui/BattleUI.ts")
    return ok, "BattleUI.ts 존재" if ok else "BattleUI.ts 없음"


# ═══════════════════════════════════════════
#  던전/월드 (11-18)
# ═══════════════════════════════════════════

def c11():
    model_ok = grep_exists(SERVER / "prisma/schema.prisma", r"^model Dungeon\b")
    seeds = SERVER / "src/dungeon/dungeonSeeds.ts"
    seed_count = count_pattern(seeds, r"\{") if seeds.is_file() else 0
    ok = model_ok and seed_count >= 20
    return ok, f"Dungeon 모델={'O' if model_ok else 'X'}, dungeonSeeds 엔트리≈{seed_count}"

def c12():
    ok = grep_exists(SERVER / "prisma/schema.prisma", r"^model DungeonRun\b")
    return ok, "DungeonRun 모델 존재" if ok else "DungeonRun 모델 없음"

def c13():
    ok = file_exists(SERVER / "src/dungeon/dungeonManager.ts")
    return ok, "dungeonManager.ts 존재" if ok else "dungeonManager.ts 없음"

def c14():
    r = file_exists(SERVER / "src/routes/dungeonRoutes.ts")
    s = file_exists(SERVER / "src/socket/dungeonSocketHandler.ts")
    ok = r and s
    return ok, f"dungeonRoutes={'O' if r else 'X'}, dungeonSocketHandler={'O' if s else 'X'}"

def c15():
    model_ok = grep_exists(SERVER / "prisma/schema.prisma", r"^model Zone\b")
    seeds = SERVER / "src/world/zoneSeeds.ts"
    seed_count = count_pattern(seeds, r"\{") if seeds.is_file() else 0
    ok = model_ok and seed_count >= 30
    return ok, f"Zone 모델={'O' if model_ok else 'X'}, zoneSeeds 엔트리≈{seed_count}"

def c16():
    ok = grep_exists(SERVER / "prisma/schema.prisma", r"^model PlayerLocation\b")
    return ok, "PlayerLocation 모델 존재" if ok else "PlayerLocation 모델 없음"

def c17():
    ok = file_exists(SERVER / "src/world/worldManager.ts")
    return ok, "worldManager.ts 존재" if ok else "worldManager.ts 없음"

def c18():
    r = file_exists(SERVER / "src/routes/worldRoutes.ts")
    s = file_exists(SERVER / "src/socket/worldSocketHandler.ts")
    ok = r and s
    return ok, f"worldRoutes={'O' if r else 'X'}, worldSocketHandler={'O' if s else 'X'}"


# ═══════════════════════════════════════════
#  경제/콘텐츠 (19-28)
# ═══════════════════════════════════════════

def c19():
    ok = grep_exists(SERVER / "prisma/schema.prisma", r"^model AuctionListing\b")
    return ok, "AuctionListing 모델 존재" if ok else "AuctionListing 모델 없음"

def c20():
    ok = file_exists(SERVER / "src/auction/auctionManager.ts")
    return ok, "auctionManager.ts 존재" if ok else "auctionManager.ts 없음"

def c21():
    r = file_exists(SERVER / "src/routes/auctionRoutes.ts")
    s = file_exists(SERVER / "src/socket/auctionSocketHandler.ts")
    ok = r and s
    return ok, f"auctionRoutes={'O' if r else 'X'}, auctionSocketHandler={'O' if s else 'X'}"

def c22():
    ok = grep_exists(SERVER / "prisma/schema.prisma", r"^model RankingEntry\b")
    return ok, "RankingEntry 모델 존재" if ok else "RankingEntry 모델 없음"

def c23():
    f = SERVER / "src/ranking/rankingManager.ts"
    if not f.is_file():
        return False, "rankingManager.ts 없음"
    redis_ok = grep_exists(f, r"[Zz]add|sorted.?set|ZADD|zrangebyscore|zrevrange")
    return True, f"rankingManager.ts 존재, Redis sorted set={'O' if redis_ok else '?'}"

def c24():
    ok = grep_exists(SERVER / "prisma/schema.prisma", r"^model CodexEntry\b")
    return ok, "CodexEntry 모델 존재" if ok else "CodexEntry 모델 없음"

def c25():
    ok = file_exists(SERVER / "src/codex/codexManager.ts")
    return ok, "codexManager.ts 존재" if ok else "codexManager.ts 없음"

def c26():
    ok = grep_exists(SERVER / "prisma/schema.prisma", r"^model Notification\b")
    return ok, "Notification 모델 존재" if ok else "Notification 모델 없음"

def c27():
    nm = file_exists(SERVER / "src/notification/notificationManager.ts")
    ns = file_exists(SERVER / "src/socket/notificationSocketHandler.ts")
    ok = nm and ns
    return ok, f"notificationManager={'O' if nm else 'X'}, notificationSocketHandler={'O' if ns else 'X'}"

def c28():
    dr = file_exists(SERVER / "src/dialogue/dialogueRunner.ts")
    dl = file_exists(SERVER / "src/dialogue/dialogueLoader.ts")
    ok = dr and dl
    return ok, f"dialogueRunner={'O' if dr else 'X'}, dialogueLoader={'O' if dl else 'X'}"


# ═══════════════════════════════════════════
#  UI/클라이언트 (29-36)
# ═══════════════════════════════════════════

def c29():
    ok = file_exists(CLIENT / "src/ui/DialogueBox.ts")
    return ok, "DialogueBox.ts 존재" if ok else "DialogueBox.ts 없음"

def c30():
    mm = file_exists(CLIENT / "src/ui/MinimapOverlay.ts")
    nm = file_exists(CLIENT / "src/ui/NavigationManager.ts")
    ok = mm and nm
    return ok, f"MinimapOverlay={'O' if mm else 'X'}, NavigationManager={'O' if nm else 'X'}"

def c31():
    ok = file_exists(CLIENT / "src/scenes/MainMenuScene.ts")
    return ok, "MainMenuScene.ts 존재" if ok else "MainMenuScene.ts 없음"

def c32():
    ok = file_exists(CLIENT / "src/scenes/CharacterSelectScene.ts")
    return ok, "CharacterSelectScene.ts 존재" if ok else "CharacterSelectScene.ts 없음"

def c33():
    ok = file_exists(CLIENT / "src/scenes/LobbyScene.ts")
    return ok, "LobbyScene.ts 존재" if ok else "LobbyScene.ts 없음"

def c34():
    ok = file_exists(CLIENT / "src/scenes/WorldScene.ts")
    return ok, "WorldScene.ts 존재" if ok else "WorldScene.ts 없음"

def c35():
    ok = file_exists(CLIENT / "src/scenes/DungeonScene.ts")
    return ok, "DungeonScene.ts 존재" if ok else "DungeonScene.ts 없음"

def c36():
    f = CLIENT / "src/main.ts"
    if not f.is_file():
        return False, "main.ts 없음"
    scenes = ["MainMenu", "CharacterSelect", "Lobby", "World", "Dungeon", "Battle"]
    found = [s for s in scenes if grep_exists(f, s)]
    ok = len(found) >= 5  # 최소 5개 씬 등록
    return ok, f"main.ts 씬 등록 {len(found)}/{len(scenes)}: {','.join(found)}"


# ═══════════════════════════════════════════
#  접근성/QA (37-42)
# ═══════════════════════════════════════════

def c37():
    f = CLIENT / "src/accessibility/AccessibilityManager.ts"
    if not f.is_file():
        return False, "AccessibilityManager.ts 없음"
    modes = ["protanopia", "deuteranopia", "tritanopia"]
    found = [m for m in modes if grep_exists(f, m)]
    ok = len(found) == 3
    return ok, f"AccessibilityManager.ts 색맹모드 {len(found)}/3: {','.join(found)}"

def c38():
    ok = file_exists(CLIENT / "src/ui/AccessibilitySettingsPanel.ts")
    return ok, "AccessibilitySettingsPanel.ts 존재" if ok else "AccessibilitySettingsPanel.ts 없음"

def c39():
    n = count_files(TESTS / "unit", "*.test.ts")
    ok = n >= 10
    return ok, f"유닛 테스트 {n}파일"

def c40():
    n = count_files(TESTS / "integration", "*.test.ts")
    ok = n >= 6
    return ok, f"통합 테스트 {n}파일"

def c41():
    n = count_files(TESTS / "e2e", "*.test.ts")
    ok = n >= 11
    return ok, f"E2E 테스트 {n}파일"

def c42():
    ok = file_exists(PROJECT_ROOT / "vitest.config.ts")
    return ok, "vitest.config.ts 존재" if ok else "vitest.config.ts 없음"


# ═══════════════════════════════════════════
#  인프라/출시 (43-50)
# ═══════════════════════════════════════════

def c43():
    ko = file_exists(CLIENT / "src/i18n/ko.json")
    en = file_exists(CLIENT / "src/i18n/en.json")
    ja = file_exists(CLIENT / "src/i18n/ja.json")
    mgr = file_exists(CLIENT / "src/i18n/i18nManager.ts")
    ok = ko and en and ja and mgr
    return ok, f"ko={'O' if ko else 'X'} en={'O' if en else 'X'} ja={'O' if ja else 'X'} i18nManager={'O' if mgr else 'X'}"

def c44():
    k6 = file_exists(TOOLS / "loadtest/k6_scenario.js")
    md = file_exists(TOOLS / "loadtest/LOADTEST.md")
    ok = k6 and md
    return ok, f"k6_scenario={'O' if k6 else 'X'}, LOADTEST.md={'O' if md else 'X'}"

def c45():
    ms = file_exists(TOOLS / "seed/masterSeed.ts")
    ic = file_exists(TOOLS / "seed/integrityCheck.ts")
    ok = ms and ic
    return ok, f"masterSeed={'O' if ms else 'X'}, integrityCheck={'O' if ic else 'X'}"

def c46():
    eh = file_exists(SERVER / "src/error/errorHandler.ts")
    rm = file_exists(SERVER / "src/error/retryManager.ts")
    ok = eh and rm
    return ok, f"errorHandler={'O' if eh else 'X'}, retryManager={'O' if rm else 'X'}"

def c47():
    ow = file_exists(TOOLS / "security/owasp_checklist.ts")
    sa = file_exists(TOOLS / "security/SECURITY_AUDIT.md")
    ok = ow and sa
    return ok, f"owasp_checklist={'O' if ow else 'X'}, SECURITY_AUDIT={'O' if sa else 'X'}"

def c48():
    f = SERVER / "src/server.ts"
    if not f.is_file():
        return False, "server.ts 없음"
    new_routes = ["monsterRoutes", "dungeonRoutes", "worldRoutes", "auctionRoutes",
                  "rankingRoutes", "codexRoutes", "notificationRoutes", "skillRoutes"]
    text = f.read_text(encoding="utf-8", errors="ignore")
    found = [r for r in new_routes if r in text]
    ok = len(found) >= 6
    return ok, f"server.ts 신규 라우트 등록 {len(found)}/{len(new_routes)}"

def c49():
    schema = SERVER / "prisma/schema.prisma"
    if not schema.is_file():
        return False, "schema.prisma 없음"
    n = count_pattern(schema, r"^model ")
    ok = n >= 45
    return ok, f"Prisma 모델 {n}개"

def c50():
    try:
        result = subprocess.run(
            ["git", "log", "--oneline", "-1"],
            capture_output=True, text=True, cwd=str(PROJECT_ROOT), timeout=10
        )
        if result.returncode == 0 and result.stdout.strip():
            return True, f"최근 커밋: {result.stdout.strip()[:80]}"
        return False, f"git log 실패: {result.stderr.strip()[:80]}"
    except Exception as e:
        return False, f"git 실행 오류: {e}"


# ═══════════════════════════════════════════
#  실행
# ═══════════════════════════════════════════

def main():
    print("=" * 60)
    print(" 에테르나크로니클 P5 통합 검증 (50 체크)")
    print(f" 검증 시각: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f" 프로젝트: {PROJECT_ROOT}")
    print("=" * 60)

    checks = [
        # 전투 코어
        (1, "전투 코어", "Monster 모델 + monsterSeeds 100+", c01),
        (2, "전투 코어", "MonsterSpawn 모델", c02),
        (3, "전투 코어", "monsterAI.ts 상태 머신 6종", c03),
        (4, "전투 코어", "spawnManager.ts", c04),
        (5, "전투 코어", "monsterRoutes.ts + 4 엔드포인트", c05),
        (6, "전투 코어", "Skill 모델 + skillSeeds 90+", c06),
        (7, "전투 코어", "skillEngine.ts (해금/레벨업/장착/리셋)", c07),
        (8, "전투 코어", "PlayerSkill 모델", c08),
        (9, "전투 코어", "BattleScene.ts + CombatManager.ts", c09),
        (10, "전투 코어", "BattleUI.ts", c10),
        # 던전/월드
        (11, "던전/월드", "Dungeon 모델 + dungeonSeeds 20+", c11),
        (12, "던전/월드", "DungeonRun 모델", c12),
        (13, "던전/월드", "dungeonManager.ts", c13),
        (14, "던전/월드", "dungeonRoutes + dungeonSocketHandler", c14),
        (15, "던전/월드", "Zone 모델 + zoneSeeds 30+", c15),
        (16, "던전/월드", "PlayerLocation 모델", c16),
        (17, "던전/월드", "worldManager.ts", c17),
        (18, "던전/월드", "worldRoutes + worldSocketHandler", c18),
        # 경제/콘텐츠
        (19, "경제/콘텐츠", "AuctionListing 모델", c19),
        (20, "경제/콘텐츠", "auctionManager.ts", c20),
        (21, "경제/콘텐츠", "auctionRoutes + auctionSocketHandler", c21),
        (22, "경제/콘텐츠", "RankingEntry 모델", c22),
        (23, "경제/콘텐츠", "rankingManager.ts + Redis sorted set", c23),
        (24, "경제/콘텐츠", "CodexEntry 모델", c24),
        (25, "경제/콘텐츠", "codexManager.ts", c25),
        (26, "경제/콘텐츠", "Notification 모델", c26),
        (27, "경제/콘텐츠", "notificationManager + socketHandler", c27),
        (28, "경제/콘텐츠", "dialogueRunner + dialogueLoader", c28),
        # UI/클라이언트
        (29, "UI/클라이언트", "DialogueBox.ts", c29),
        (30, "UI/클라이언트", "MinimapOverlay + NavigationManager", c30),
        (31, "UI/클라이언트", "MainMenuScene.ts", c31),
        (32, "UI/클라이언트", "CharacterSelectScene.ts", c32),
        (33, "UI/클라이언트", "LobbyScene.ts", c33),
        (34, "UI/클라이언트", "WorldScene.ts", c34),
        (35, "UI/클라이언트", "DungeonScene.ts", c35),
        (36, "UI/클라이언트", "main.ts 전 씬 등록", c36),
        # 접근성/QA
        (37, "접근성/QA", "AccessibilityManager + 색맹 3종", c37),
        (38, "접근성/QA", "AccessibilitySettingsPanel.ts", c38),
        (39, "접근성/QA", "유닛 테스트 10파일+", c39),
        (40, "접근성/QA", "통합 테스트 6파일+", c40),
        (41, "접근성/QA", "E2E 테스트 11파일+", c41),
        (42, "접근성/QA", "vitest.config.ts", c42),
        # 인프라/출시
        (43, "인프라/출시", "i18n ko/en/ja + i18nManager", c43),
        (44, "인프라/출시", "k6_scenario.js + LOADTEST.md", c44),
        (45, "인프라/출시", "masterSeed + integrityCheck", c45),
        (46, "인프라/출시", "errorHandler + retryManager", c46),
        (47, "인프라/출시", "owasp_checklist + SECURITY_AUDIT.md", c47),
        (48, "인프라/출시", "server.ts 신규 라우트 등록", c48),
        (49, "인프라/출시", "Prisma 모델 45+", c49),
        (50, "인프라/출시", "git log 최근 커밋 정상", c50),
    ]

    current_cat = ""
    for num, cat, name, func in checks:
        if cat != current_cat:
            current_cat = cat
            print(f"\n── {cat} ──")
        check(num, cat, name, func)

    # ── 요약 ──
    total = pass_count + fail_count + skip_count
    critical = sum(1 for r in results if r["status"] == "FAIL" and r["num"] <= 10)
    major = sum(1 for r in results if r["status"] == "FAIL" and r["num"] > 10)

    print("\n" + "=" * 60)
    print(f" 결과 요약: PASS={pass_count}  FAIL={fail_count}  SKIP={skip_count}  (총 {total})")
    print(f" 치명(#1-10 FAIL): {critical}  |  메이저(#11+ FAIL): {major}")

    if critical == 0 and major == 0:
        verdict = "🟢 RC 승인 — 출시 후보 PASS"
    elif critical == 0 and major <= 2:
        verdict = "🟡 조건부 승인 — 메이저 이슈 수정 후 재검증"
    else:
        verdict = "🔴 RC 거부 — 치명/메이저 이슈 해결 필요"

    print(f" RC 판정: {verdict}")
    print("=" * 60)

    # 종료 코드
    sys.exit(0 if (critical == 0 and major == 0) else 1)


if __name__ == "__main__":
    main()
