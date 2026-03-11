#!/usr/bin/env python3
"""
P6 통합 RC 검증 스크립트
에테르나크로니클 — Phase 6 오픈 베타 판정용
60개 체크 항목 (파일 존재 + grep 기반 검증)
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
K8S = PROJECT_ROOT / "k8s"
GITHUB = PROJECT_ROOT / ".github"
ADMIN = PROJECT_ROOT / "admin-dashboard"
MONITORING = PROJECT_ROOT / "monitoring"

# ── 결과 저장 ──
results: list[dict] = []
pass_count = 0
fail_count = 0
skip_count = 0


def check(num: int, category: str, desc: str, condition: bool, detail: str = ""):
    global pass_count, fail_count, skip_count
    status = "PASS" if condition else "FAIL"
    if condition:
        pass_count += 1
    else:
        fail_count += 1
    results.append({
        "num": num,
        "category": category,
        "desc": desc,
        "status": status,
        "detail": detail,
    })
    icon = "✅" if condition else "❌"
    print(f"  {icon} [{num:02d}] {desc} → {status}" + (f"  ({detail})" if detail else ""))


def file_exists(path: Path) -> bool:
    return path.is_file()


def dir_exists(path: Path) -> bool:
    return path.is_dir()


def grep_count(path: Path, pattern: str) -> int:
    """파일 내 패턴 매칭 횟수 반환 (MULTILINE 기본)"""
    if not path.is_file():
        return 0
    try:
        content = path.read_text(encoding="utf-8", errors="replace")
        return len(re.findall(pattern, content, re.MULTILINE))
    except Exception:
        return 0


def count_files_in_dir(path: Path, ext: str = "") -> int:
    if not path.is_dir():
        return 0
    if ext:
        return len([f for f in path.rglob(f"*{ext}") if f.is_file()])
    return len([f for f in path.rglob("*") if f.is_file()])


def count_models_in_prisma() -> int:
    schema = SERVER / "prisma" / "schema.prisma"
    return grep_count(schema, r"^model\s+\w+")


# ══════════════════════════════════════════════
#  수익화 (10)
# ══════════════════════════════════════════════
def check_monetization():
    print("\n═══ 수익화 (Monetization) ═══")
    schema = SERVER / "prisma" / "schema.prisma"

    # 1. SeasonPass 모델 + seasonPassEngine.ts
    has_model = grep_count(schema, r"^model\s+SeasonPass\b") > 0
    has_engine = file_exists(SERVER / "src" / "seasonpass" / "seasonPassEngine.ts")
    check(1, "수익화", "SeasonPass 모델 + seasonPassEngine.ts", has_model and has_engine,
          f"model={'Y' if has_model else 'N'}, engine={'Y' if has_engine else 'N'}")

    # 2. seasonPassSeeds.ts (50단계 시드)
    seeds_path = SERVER / "src" / "seasonpass" / "seasonPassSeeds.ts"
    has_seeds = file_exists(seeds_path)
    tier_count = grep_count(seeds_path, r"tier:|level:|stage:") if has_seeds else 0
    check(2, "수익화", "seasonPassSeeds.ts 존재 (50단계 시드)", has_seeds and tier_count >= 50,
          f"file={'Y' if has_seeds else 'N'}, tiers={tier_count}")

    # 3. seasonPassRoutes.ts에 5개+ 엔드포인트
    routes_path = SERVER / "src" / "routes" / "seasonPassRoutes.ts"
    has_routes = file_exists(routes_path)
    endpoint_count = grep_count(routes_path, r"\.(get|post|put|patch|delete)\s*\(") if has_routes else 0
    if endpoint_count == 0 and has_routes:
        # fastify 스타일 라우트도 카운트
        endpoint_count = grep_count(routes_path, r"(GET|POST|PUT|PATCH|DELETE|method:)")
    check(3, "수익화", "seasonPassRoutes.ts에 5개+ 엔드포인트", has_routes and endpoint_count >= 5,
          f"file={'Y' if has_routes else 'N'}, endpoints={endpoint_count}")

    # 4. PaymentReceipt 모델 + paymentManager.ts
    has_receipt = grep_count(schema, r"^model\s+PaymentReceipt\b") > 0
    has_pm = file_exists(SERVER / "src" / "payment" / "paymentManager.ts")
    check(4, "수익화", "PaymentReceipt 모델 + paymentManager.ts", has_receipt and has_pm,
          f"model={'Y' if has_receipt else 'N'}, manager={'Y' if has_pm else 'N'}")

    # 5. paymentRoutes.ts
    has_pr = file_exists(SERVER / "src" / "routes" / "paymentRoutes.ts")
    check(5, "수익화", "paymentRoutes.ts 존재", has_pr)

    # 6. CosmeticItem / PlayerCosmetic 모델
    has_ci = grep_count(schema, r"^model\s+CosmeticItem\b") > 0
    has_pc = grep_count(schema, r"^model\s+PlayerCosmetic\b") > 0
    check(6, "수익화", "CosmeticItem/PlayerCosmetic 모델", has_ci and has_pc,
          f"CosmeticItem={'Y' if has_ci else 'N'}, PlayerCosmetic={'Y' if has_pc else 'N'}")

    # 7. cosmeticShop.ts
    has_cs = file_exists(SERVER / "src" / "cosmetic" / "cosmeticShop.ts")
    check(7, "수익화", "cosmeticShop.ts 존재", has_cs)

    # 8. cosmeticSeeds.ts (50개+)
    cs_path = SERVER / "src" / "cosmetic" / "cosmeticSeeds.ts"
    has_css = file_exists(cs_path)
    item_count = grep_count(cs_path, r"(name:|code:|id:)") if has_css else 0
    check(8, "수익화", "cosmeticSeeds.ts 존재 (50개+)", has_css and item_count >= 50,
          f"file={'Y' if has_css else 'N'}, items={item_count}")

    # 9. cosmeticRoutes.ts
    has_cr = file_exists(SERVER / "src" / "routes" / "cosmeticRoutes.ts")
    check(9, "수익화", "cosmeticRoutes.ts 존재", has_cr)

    # 10. p2wGuard.ts에 validateCosmeticP2w 함수
    p2w_path = SERVER / "src" / "shop" / "p2wGuard.ts"
    has_p2w = file_exists(p2w_path)
    has_func = grep_count(p2w_path, r"validateCosmeticP2w") > 0 if has_p2w else False
    check(10, "수익화", "p2wGuard.ts에 validateCosmeticP2w 함수", has_p2w and has_func,
          f"file={'Y' if has_p2w else 'N'}, func={'Y' if has_func else 'N'}")


# ══════════════════════════════════════════════
#  전투 고도화 (6)
# ══════════════════════════════════════════════
def check_combat():
    print("\n═══ 전투 고도화 (Combat Advanced) ═══")

    # 11. statusEffectManager.ts + 10종 상태이상
    se_path = SERVER / "src" / "combat" / "statusEffectManager.ts"
    has_se = file_exists(se_path)
    effect_count = grep_count(se_path, r"(BURN|FREEZE|POISON|STUN|BLEED|BLIND|SILENCE|SLOW|CURSE|PARALYZE|SLEEP|CONFUSE|WEAKEN|SHOCK|PETRIFY|DOT|HOT|TAUNT|FEAR|CHARM|buff|debuff|statusEffect|effect_type|effectType)")
    check(11, "전투", "statusEffectManager.ts + 10종 상태이상", has_se and effect_count >= 10,
          f"file={'Y' if has_se else 'N'}, effects={effect_count}")

    # 12. StatusEffectRenderer.ts
    has_ser = file_exists(CLIENT / "src" / "combat" / "StatusEffectRenderer.ts")
    check(12, "전투", "StatusEffectRenderer.ts 존재", has_ser)

    # 13. comboManager.ts + 15개 콤보
    cm_path = SERVER / "src" / "combat" / "comboManager.ts"
    has_cm = file_exists(cm_path)
    combo_count = grep_count(cm_path, r"(combo|chain|sequence|COMBO|name:|code:)")
    check(13, "전투", "comboManager.ts + 15개 콤보", has_cm and combo_count >= 15,
          f"file={'Y' if has_cm else 'N'}, combos={combo_count}")

    # 14. ComboUI.ts
    has_cui = file_exists(CLIENT / "src" / "ui" / "ComboUI.ts")
    check(14, "전투", "ComboUI.ts 존재", has_cui)

    # 15. combatRoutes.ts
    has_cr = file_exists(SERVER / "src" / "routes" / "combatRoutes.ts")
    check(15, "전투", "combatRoutes.ts 존재", has_cr)

    # 16. CombatManager.ts에 status_effect/combo 훅
    cm_client = CLIENT / "src" / "combat" / "CombatManager.ts"
    has_cmc = file_exists(cm_client)
    has_se_hook = grep_count(cm_client, r"(statusEffect|status_effect|applyEffect|StatusEffect)") > 0 if has_cmc else False
    has_combo_hook = grep_count(cm_client, r"(combo|Combo|comboManager|executeCombo)") > 0 if has_cmc else False
    check(16, "전투", "CombatManager.ts에 status_effect/combo 훅",
          has_cmc and has_se_hook and has_combo_hook,
          f"file={'Y' if has_cmc else 'N'}, se_hook={'Y' if has_se_hook else 'N'}, combo_hook={'Y' if has_combo_hook else 'N'}")


# ══════════════════════════════════════════════
#  소셜 고도화 (10)
# ══════════════════════════════════════════════
def check_social():
    print("\n═══ 소셜 고도화 (Social Advanced) ═══")

    # 17. guildLevelManager.ts
    has_glm = file_exists(SERVER / "src" / "guild" / "guildLevelManager.ts")
    check(17, "소셜", "guildLevelManager.ts 존재", has_glm)

    # 18. guildSkills.ts + 5종 스킬
    gs_path = SERVER / "src" / "guild" / "guildSkills.ts"
    has_gs = file_exists(gs_path)
    skill_count = grep_count(gs_path, r"(name:|code:|skill_id|skillId|SKILL_)")
    check(18, "소셜", "guildSkills.ts + 5종 스킬", has_gs and skill_count >= 5,
          f"file={'Y' if has_gs else 'N'}, skills={skill_count}")

    # 19. GuildSkill 모델
    schema = SERVER / "prisma" / "schema.prisma"
    has_gsm = grep_count(schema, r"^model\s+GuildSkill\b") > 0
    check(19, "소셜", "GuildSkill 모델 존재", has_gsm)

    # 20. guildWarEngine.ts
    has_gwe = file_exists(SERVER / "src" / "guild" / "guildWarEngine.ts")
    check(20, "소셜", "guildWarEngine.ts 존재", has_gwe)

    # 21. guildWarSocketHandler.ts
    has_gwsh = file_exists(SERVER / "src" / "socket" / "guildWarSocketHandler.ts")
    check(21, "소셜", "guildWarSocketHandler.ts 존재", has_gwsh)

    # 22. pvpNormalizer.ts
    has_pvpn = file_exists(SERVER / "src" / "pvp" / "pvpNormalizer.ts")
    check(22, "소셜", "pvpNormalizer.ts 존재", has_pvpn)

    # 23. pvpSeasonReward.ts
    has_pvpsr = file_exists(SERVER / "src" / "pvp" / "pvpSeasonReward.ts")
    check(23, "소셜", "pvpSeasonReward.ts 존재", has_pvpsr)

    # 24. MatchmakingTicket 모델
    has_mmt = grep_count(schema, r"^model\s+MatchmakingTicket\b") > 0
    check(24, "소셜", "MatchmakingTicket 모델 존재", has_mmt)

    # 25. matchmakingQueue.ts
    has_mmq = file_exists(SERVER / "src" / "matchmaking" / "matchmakingQueue.ts")
    check(25, "소셜", "matchmakingQueue.ts 존재", has_mmq)

    # 26. matchmakingSocketHandler.ts
    has_mmsh = file_exists(SERVER / "src" / "socket" / "matchmakingSocketHandler.ts")
    check(26, "소셜", "matchmakingSocketHandler.ts 존재", has_mmsh)


# ══════════════════════════════════════════════
#  스토리/세이브 (8)
# ══════════════════════════════════════════════
def check_story():
    print("\n═══ 스토리/세이브 (Story & Save) ═══")
    schema = SERVER / "prisma" / "schema.prisma"

    # 27. ChapterProgress 모델
    has_cp = grep_count(schema, r"^model\s+ChapterProgress\b") > 0
    check(27, "스토리", "ChapterProgress 모델 존재", has_cp)

    # 28. chapterManager.ts + 5챕터
    ch_path = SERVER / "src" / "story" / "chapterManager.ts"
    has_ch = file_exists(ch_path)
    chapter_count = grep_count(ch_path, r"(chapter|Chapter|CHAPTER)")
    check(28, "스토리", "chapterManager.ts + 5챕터", has_ch and chapter_count >= 5,
          f"file={'Y' if has_ch else 'N'}, refs={chapter_count}")

    # 29. cutsceneRunner.ts + 15개 컷씬
    cs_path = SERVER / "src" / "story" / "cutsceneRunner.ts"
    has_cs = file_exists(cs_path)
    cutscene_count = grep_count(cs_path, r"(cutscene|scene_id|sceneId|CUTSCENE|name:|id:)")
    check(29, "스토리", "cutsceneRunner.ts + 15개 컷씬", has_cs and cutscene_count >= 15,
          f"file={'Y' if has_cs else 'N'}, refs={cutscene_count}")

    # 30. CutsceneScene.ts
    has_css = file_exists(CLIENT / "src" / "scenes" / "CutsceneScene.ts")
    check(30, "스토리", "CutsceneScene.ts 존재", has_css)

    # 31. storyRoutes.ts
    has_sr = file_exists(SERVER / "src" / "routes" / "storyRoutes.ts")
    check(31, "스토리", "storyRoutes.ts 존재", has_sr)

    # 32. SaveSlot 모델
    has_ss = grep_count(schema, r"^model\s+SaveSlot\b") > 0
    check(32, "스토리", "SaveSlot 모델 존재", has_ss)

    # 33. saveManager.ts
    has_sm = file_exists(SERVER / "src" / "save" / "saveManager.ts")
    check(33, "스토리", "saveManager.ts 존재", has_sm)

    # 34. saveRoutes.ts
    has_svr = file_exists(SERVER / "src" / "routes" / "saveRoutes.ts")
    check(34, "스토리", "saveRoutes.ts 존재", has_svr)


# ══════════════════════════════════════════════
#  운영 (12)
# ══════════════════════════════════════════════
def check_operations():
    print("\n═══ 운영 (Operations) ═══")
    schema = SERVER / "prisma" / "schema.prisma"

    # 35. Report/Sanction 모델
    has_report = grep_count(schema, r"^model\s+Report\b") > 0
    has_sanction = grep_count(schema, r"^model\s+Sanction\b") > 0
    check(35, "운영", "Report/Sanction 모델 존재", has_report and has_sanction,
          f"Report={'Y' if has_report else 'N'}, Sanction={'Y' if has_sanction else 'N'}")

    # 36. reportManager.ts
    has_rm = file_exists(SERVER / "src" / "report" / "reportManager.ts")
    check(36, "운영", "reportManager.ts 존재", has_rm)

    # 37. reportRoutes.ts
    has_rr = file_exists(SERVER / "src" / "routes" / "reportRoutes.ts")
    check(37, "운영", "reportRoutes.ts 존재", has_rr)

    # 38. admin-dashboard/ + 12개+ 파일
    has_admin = dir_exists(ADMIN)
    admin_files = count_files_in_dir(ADMIN)
    check(38, "운영", "admin-dashboard/ + 12개+ 파일", has_admin and admin_files >= 12,
          f"dir={'Y' if has_admin else 'N'}, files={admin_files}")

    # 39. KpiSnapshot 모델
    has_kpi = grep_count(schema, r"^model\s+KpiSnapshot\b") > 0
    check(39, "운영", "KpiSnapshot 모델 존재", has_kpi)

    # 40. analyticsEngine.ts
    has_ae = file_exists(SERVER / "src" / "analytics" / "analyticsEngine.ts")
    check(40, "운영", "analyticsEngine.ts 존재", has_ae)

    # 41. analyticsRoutes.ts
    has_ar = file_exists(SERVER / "src" / "routes" / "analyticsRoutes.ts")
    check(41, "운영", "analyticsRoutes.ts 존재", has_ar)

    # 42. grafana-kpi.json
    has_grafana = file_exists(MONITORING / "grafana-kpi.json")
    check(42, "운영", "grafana-kpi.json 존재", has_grafana)

    # 43. assetPipeline.ts
    has_ap = file_exists(TOOLS / "assets" / "assetPipeline.ts")
    check(43, "운영", "assetPipeline.ts 존재", has_ap)

    # 44. cdnConfig.ts
    has_cdn = file_exists(TOOLS / "assets" / "cdnConfig.ts")
    check(44, "운영", "cdnConfig.ts 존재", has_cdn)

    # 45. assets.yml 워크플로우
    has_assets = file_exists(GITHUB / "workflows" / "assets.yml")
    check(45, "운영", "assets.yml 워크플로우 존재", has_assets)

    # 46. opsAlertManager.ts
    has_oam = file_exists(SERVER / "src" / "ops" / "opsAlertManager.ts")
    check(46, "운영", "opsAlertManager.ts 존재", has_oam)


# ══════════════════════════════════════════════
#  프로덕션 (8)
# ══════════════════════════════════════════════
def check_production():
    print("\n═══ 프로덕션 (Production) ═══")

    # 47. production.yml 워크플로우
    has_prod = file_exists(GITHUB / "workflows" / "production.yml")
    check(47, "프로덕션", "production.yml 워크플로우 존재", has_prod)

    # 48. k8s/production/ + 6개+ 매니페스트
    prod_dir = K8S / "production"
    has_pd = dir_exists(prod_dir)
    manifest_count = count_files_in_dir(prod_dir) if has_pd else 0
    check(48, "프로덕션", "k8s/production/ + 6개+ 매니페스트", has_pd and manifest_count >= 6,
          f"dir={'Y' if has_pd else 'N'}, manifests={manifest_count}")

    # 49. rollback.sh
    has_rb = file_exists(TOOLS / "deploy" / "rollback.sh")
    check(49, "프로덕션", "rollback.sh 존재", has_rb)

    # 50. PRODUCTION.md
    has_pm = file_exists(PROJECT_ROOT / "PRODUCTION.md")
    check(50, "프로덕션", "PRODUCTION.md 존재", has_pm)

    # 51. migrate.sh + backup.sh + restore.sh
    has_migrate = file_exists(TOOLS / "db" / "migrate.sh")
    has_backup = file_exists(TOOLS / "db" / "backup.sh")
    has_restore = file_exists(TOOLS / "db" / "restore.sh")
    check(51, "프로덕션", "migrate.sh + backup.sh + restore.sh",
          has_migrate and has_backup and has_restore,
          f"migrate={'Y' if has_migrate else 'N'}, backup={'Y' if has_backup else 'N'}, restore={'Y' if has_restore else 'N'}")

    # 52. db-backup.yml 워크플로우
    has_dbb = file_exists(GITHUB / "workflows" / "db-backup.yml")
    check(52, "프로덕션", "db-backup.yml 워크플로우 존재", has_dbb)

    # 53. webhookSender.ts
    has_ws = file_exists(SERVER / "src" / "ops" / "webhookSender.ts")
    check(53, "프로덕션", "webhookSender.ts 존재", has_ws)

    # 54. opsRoutes.ts
    has_or = file_exists(SERVER / "src" / "routes" / "opsRoutes.ts")
    check(54, "프로덕션", "opsRoutes.ts 존재", has_or)


# ══════════════════════════════════════════════
#  오픈 베타 (6)
# ══════════════════════════════════════════════
def check_beta():
    print("\n═══ 오픈 베타 (Open Beta) ═══")
    schema = SERVER / "prisma" / "schema.prisma"

    # 55. BetaInvite / FeedbackReport 모델
    has_bi = grep_count(schema, r"^model\s+BetaInvite\b") > 0
    has_fr = grep_count(schema, r"^model\s+FeedbackReport\b") > 0
    check(55, "베타", "BetaInvite/FeedbackReport 모델 존재", has_bi and has_fr,
          f"BetaInvite={'Y' if has_bi else 'N'}, FeedbackReport={'Y' if has_fr else 'N'}")

    # 56. betaManager.ts
    has_bm = file_exists(SERVER / "src" / "beta" / "betaManager.ts")
    check(56, "베타", "betaManager.ts 존재", has_bm)

    # 57. betaRoutes.ts
    has_br = file_exists(SERVER / "src" / "routes" / "betaRoutes.ts")
    check(57, "베타", "betaRoutes.ts 존재", has_br)

    # 58. FeedbackForm.ts
    has_ff = file_exists(CLIENT / "src" / "ui" / "FeedbackForm.ts")
    check(58, "베타", "FeedbackForm.ts 존재", has_ff)

    # 59. BETA.md
    has_beta = file_exists(PROJECT_ROOT / "BETA.md")
    check(59, "베타", "BETA.md 존재", has_beta)

    # 60. Prisma 모델 수 57개+
    model_count = count_models_in_prisma()
    check(60, "베타", "Prisma 모델 수 57개+", model_count >= 57,
          f"models={model_count}")


# ══════════════════════════════════════════════
#  메인
# ══════════════════════════════════════════════
def main():
    print("=" * 60)
    print("  에테르나크로니클 — P6 통합 RC 검증")
    print(f"  실행 시각: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"  프로젝트 루트: {PROJECT_ROOT}")
    print("=" * 60)

    check_monetization()
    check_combat()
    check_social()
    check_story()
    check_operations()
    check_production()
    check_beta()

    # ── 요약 ──
    print("\n" + "=" * 60)
    print(f"  결과 요약: PASS={pass_count}  FAIL={fail_count}  SKIP={skip_count}  TOTAL={len(results)}")
    print("=" * 60)

    # 치명/메이저 분류
    critical_fails = [r for r in results if r["status"] == "FAIL" and r["category"] in ("프로덕션", "베타")]
    major_fails = [r for r in results if r["status"] == "FAIL" and r["category"] not in ("프로덕션", "베타")]

    print(f"\n  치명 결함 (프로덕션/베타 FAIL): {len(critical_fails)}건")
    for f in critical_fails:
        print(f"    ❌ [{f['num']:02d}] {f['desc']}")

    print(f"  메이저 결함 (기타 FAIL): {len(major_fails)}건")
    for f in major_fails:
        print(f"    ❌ [{f['num']:02d}] {f['desc']}")

    # RC 판정
    print("\n" + "─" * 60)
    if len(critical_fails) == 0 and len(major_fails) == 0:
        print("  🎉 RC 판정: ✅ 오픈 베타 승인 (PASS)")
        print("  치명 0건 / 메이저 0건 → Phase 6 완료, 오픈 베타 진입 가능")
    elif len(critical_fails) == 0:
        print(f"  ⚠️  RC 판정: 조건부 승인 (메이저 {len(major_fails)}건)")
        print("  치명 0건이나 메이저 이슈 잔존 → 핫픽스 후 재판정 권고")
    else:
        print(f"  ❌ RC 판정: 불합격 (치명 {len(critical_fails)}건, 메이저 {len(major_fails)}건)")
        print("  치명 결함 해소 후 재검증 필수")
    print("─" * 60)

    # 종료 코드
    sys.exit(0 if (len(critical_fails) == 0 and len(major_fails) == 0) else 1)


if __name__ == "__main__":
    main()
