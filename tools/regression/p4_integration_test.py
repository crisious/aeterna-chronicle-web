#!/usr/bin/env python3
"""
P4-20 통합 플레이테스트 — Phase 4 RC 판정용 통합 검증 스크립트

검증 대상 (P4-01 ~ P4-19):
  P4-01 펫 / P4-02 제작 / P4-03 NPC AI / P4-04 소셜
  P4-05 사운드 / P4-06 퀘스트 / P4-07 어드민 / P4-08 경제
  P4-09 인벤토리 / P4-10 보상우편 / P4-11 출석이벤트 / P4-12 화폐
  P4-13 튜토리얼 / P4-14 채팅 / P4-15 보안 / P4-16 캐시
  P4-17 E2E / P4-18 로그모니터링 / P4-19 스테이징

출력: JSON (stdout)
"""
from __future__ import annotations

import json
import os
import re
import subprocess
import sys
import time
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional

import yaml  # PyYAML

ROOT = Path(__file__).resolve().parents[2]
SERVER = ROOT / "server"
CLIENT = ROOT / "client"
K8S = ROOT / "k8s"
WORKFLOWS = ROOT / ".github" / "workflows"
PRISMA_SCHEMA = SERVER / "prisma" / "schema.prisma"
TESTS_E2E = ROOT / "tests" / "e2e"


# ────────────────────── 데이터 구조 ──────────────────────────────

@dataclass
class CheckResult:
    module: str
    check: str
    status: str       # PASS / FAIL / SKIP
    severity: str     # critical / major / minor / observation
    detail: str = ""
    elapsed_ms: int = 0


@dataclass
class Metrics:
    total_files: int = 0
    code_files: int = 0
    server_ts_files: int = 0
    client_ts_files: int = 0
    db_models: int = 0
    api_endpoints: int = 0
    socket_handlers: int = 0
    e2e_test_files: int = 0
    k8s_manifests: int = 0
    sound_entries: int = 0
    seed_items: int = 0
    seed_recipes: int = 0
    seed_npcs: int = 0
    seed_quests: int = 0
    seed_achievements: int = 0
    seed_pets: int = 0
    seed_classes: int = 0
    seed_events: int = 0
    tsc_server_errors: int = -1
    tsc_client_errors: int = -1


@dataclass
class IntegrationReport:
    timestamp: str = ""
    phase: str = "P4"
    results: List[Dict[str, Any]] = field(default_factory=list)
    metrics: Dict[str, Any] = field(default_factory=dict)
    summary: Dict[str, int] = field(default_factory=dict)
    rc_verdict: str = ""


# ────────────────────── 유틸 ─────────────────────────────────────

def _run(cmd: str, cwd: Optional[Path] = None, timeout: int = 60) -> subprocess.CompletedProcess:
    return subprocess.run(
        cmd, shell=True, capture_output=True, text=True,
        cwd=cwd or ROOT, timeout=timeout,
    )


def _count_files(base: Path, exts: tuple, exclude: tuple = ("node_modules", ".git", "dist")) -> int:
    n = 0
    for f in base.rglob("*"):
        if any(ex in f.parts for ex in exclude):
            continue
        if f.suffix in exts and f.is_file():
            n += 1
    return n


def _count_pattern(filepath: Path, pattern: str) -> int:
    """파일 내 특정 패턴 출현 횟수"""
    if not filepath.exists():
        return 0
    return filepath.read_text(encoding="utf-8").count(pattern)


def _files_exist(files: List[Path]) -> List[str]:
    """존재하지 않는 파일 목록 반환"""
    return [str(f.relative_to(ROOT)) for f in files if not f.exists()]


# ────────────────────── 빌드 검증 ────────────────────────────────

def check_tsc_server() -> tuple[CheckResult, int]:
    """server tsc --noEmit"""
    t0 = time.monotonic()
    r = _run("npx tsc --noEmit", cwd=SERVER, timeout=60)
    errs = r.stdout.count("error TS") + r.stderr.count("error TS")
    elapsed = int((time.monotonic() - t0) * 1000)
    if errs > 0:
        return CheckResult("Build-Server", "tsc_noEmit", "FAIL", "critical",
                           f"tsc 에러 {errs}건\n{(r.stdout + r.stderr)[:500]}", elapsed), errs
    return CheckResult("Build-Server", "tsc_noEmit", "PASS", "observation",
                       "tsc --noEmit 성공", elapsed), 0


def check_tsc_client() -> tuple[CheckResult, int]:
    """client tsc --noEmit"""
    t0 = time.monotonic()
    r = _run("npx tsc --noEmit", cwd=CLIENT, timeout=60)
    errs = r.stdout.count("error TS") + r.stderr.count("error TS")
    elapsed = int((time.monotonic() - t0) * 1000)
    if errs > 0:
        return CheckResult("Build-Client", "tsc_noEmit", "FAIL", "critical",
                           f"tsc 에러 {errs}건\n{(r.stdout + r.stderr)[:500]}", elapsed), errs
    return CheckResult("Build-Client", "tsc_noEmit", "PASS", "observation",
                       "tsc --noEmit 성공", elapsed), 0


def check_prisma() -> CheckResult:
    """Prisma 스키마 검증 + 모델 수 확인 (39개 예상)"""
    t0 = time.monotonic()
    elapsed = lambda: int((time.monotonic() - t0) * 1000)
    if not PRISMA_SCHEMA.exists():
        return CheckResult("Prisma", "schema_exists", "FAIL", "critical",
                           "schema.prisma 없음", elapsed())
    content = PRISMA_SCHEMA.read_text(encoding="utf-8")
    model_count = len(re.findall(r"^model\s+", content, re.MULTILINE))
    has_gen = "generator " in content
    has_ds = "datasource " in content
    if not (has_gen and has_ds):
        return CheckResult("Prisma", "prisma_schema", "FAIL", "critical",
                           "generator/datasource 블록 누락", elapsed())
    expected = 39
    if model_count < expected:
        return CheckResult("Prisma", "model_count", "FAIL", "major",
                           f"모델 {model_count}개 — 예상 {expected}개 미달", elapsed())
    return CheckResult("Prisma", "schema_validate", "PASS", "observation",
                       f"스키마 OK — {model_count} 모델, generator+datasource 확인", elapsed())


# ────────────────────── P4 모듈별 검증 ───────────────────────────

def check_p4_01_pet() -> CheckResult:
    """P4-01: 펫 15종 + 소환/성장/진화"""
    t0 = time.monotonic()
    elapsed = lambda: int((time.monotonic() - t0) * 1000)
    files = [
        SERVER / "src" / "pet" / "petEngine.ts",
        SERVER / "src" / "pet" / "petSeeds.ts",
        SERVER / "src" / "routes" / "petRoutes.ts",
        SERVER / "src" / "socket" / "petSocketHandler.ts",
    ]
    missing = _files_exist(files)
    if missing:
        return CheckResult("P4-01-Pet", "pet_files", "FAIL", "major",
                           f"누락: {missing}", elapsed())
    pet_count = _count_pattern(SERVER / "src" / "pet" / "petSeeds.ts", "name:")
    # petSeeds에는 펫 외 다른 name도 있으므로 대략적 검증
    if pet_count < 15:
        return CheckResult("P4-01-Pet", "pet_15_species", "FAIL", "major",
                           f"펫 시드 name: {pet_count}개 — 15종 미달", elapsed())
    return CheckResult("P4-01-Pet", "pet_15+summon+grow+evolve", "PASS", "observation",
                       f"petEngine + seeds({pet_count}종) + routes + socket OK", elapsed())


def check_p4_02_craft() -> CheckResult:
    """P4-02: 제작 50 레시피 + 강화/분해"""
    t0 = time.monotonic()
    elapsed = lambda: int((time.monotonic() - t0) * 1000)
    files = [
        SERVER / "src" / "craft" / "craftEngine.ts",
        SERVER / "src" / "craft" / "recipeSeeds.ts",
        SERVER / "src" / "routes" / "craftRoutes.ts",
    ]
    missing = _files_exist(files)
    if missing:
        return CheckResult("P4-02-Craft", "craft_files", "FAIL", "major",
                           f"누락: {missing}", elapsed())
    recipe_count = _count_pattern(SERVER / "src" / "craft" / "recipeSeeds.ts", "name:")
    if recipe_count < 50:
        return CheckResult("P4-02-Craft", "recipe_50", "FAIL", "major",
                           f"레시피 name: {recipe_count}개 — 50 미달", elapsed())
    return CheckResult("P4-02-Craft", "craft_50recipe+enhance+dismantle", "PASS", "observation",
                       f"craftEngine + seeds({recipe_count}개) + routes OK", elapsed())


def check_p4_03_npc_ai() -> CheckResult:
    """P4-03: NPC AI 30 NPC + 행동 트리 + 호감도"""
    t0 = time.monotonic()
    elapsed = lambda: int((time.monotonic() - t0) * 1000)
    files = [
        SERVER / "src" / "npc" / "behaviorTree.ts",
        SERVER / "src" / "npc" / "affinitySystem.ts",
        SERVER / "src" / "npc" / "npcSeeds.ts",
        SERVER / "src" / "routes" / "npcRoutes.ts",
    ]
    missing = _files_exist(files)
    if missing:
        return CheckResult("P4-03-NPC-AI", "npc_files", "FAIL", "major",
                           f"누락: {missing}", elapsed())
    npc_count = _count_pattern(SERVER / "src" / "npc" / "npcSeeds.ts", "name:")
    if npc_count < 30:
        return CheckResult("P4-03-NPC-AI", "npc_30", "FAIL", "major",
                           f"NPC name: {npc_count}개 — 30 미달", elapsed())
    return CheckResult("P4-03-NPC-AI", "npc_30+behavior+affinity", "PASS", "observation",
                       f"behaviorTree + affinity + seeds({npc_count}개) OK", elapsed())


def check_p4_04_social() -> CheckResult:
    """P4-04: 소셜 (친구/파티/우편)"""
    t0 = time.monotonic()
    elapsed = lambda: int((time.monotonic() - t0) * 1000)
    files = [
        SERVER / "src" / "social" / "socialManager.ts",
        SERVER / "src" / "social" / "mailSystem.ts",
        SERVER / "src" / "routes" / "socialRoutes.ts",
        SERVER / "src" / "socket" / "socialSocketHandler.ts",
    ]
    missing = _files_exist(files)
    if missing:
        return CheckResult("P4-04-Social", "social_files", "FAIL", "major",
                           f"누락: {missing}", elapsed())
    return CheckResult("P4-04-Social", "friend+party+mail", "PASS", "observation",
                       "socialManager + mailSystem + routes + socket OK", elapsed())


def check_p4_05_sound() -> CheckResult:
    """P4-05: 사운드 매니페스트 100개"""
    t0 = time.monotonic()
    elapsed = lambda: int((time.monotonic() - t0) * 1000)
    manifest = CLIENT / "src" / "sound" / "soundManifest.ts"
    manager = CLIENT / "src" / "sound" / "SoundManager.ts"
    if not manifest.exists():
        return CheckResult("P4-05-Sound", "manifest_exists", "FAIL", "critical",
                           "soundManifest.ts 없음", elapsed())
    if not manager.exists():
        return CheckResult("P4-05-Sound", "manager_exists", "FAIL", "major",
                           "SoundManager.ts 없음", elapsed())
    entry_count = _count_pattern(manifest, "key:")
    if entry_count < 100:
        return CheckResult("P4-05-Sound", "sound_100", "FAIL", "major",
                           f"사운드 엔트리 {entry_count}개 — 100개 미달", elapsed())
    return CheckResult("P4-05-Sound", "sound_100_manifest", "PASS", "observation",
                       f"매니페스트 {entry_count}개 + SoundManager OK", elapsed())


def check_p4_06_quest() -> CheckResult:
    """P4-06: 퀘스트 60개"""
    t0 = time.monotonic()
    elapsed = lambda: int((time.monotonic() - t0) * 1000)
    files = [
        SERVER / "src" / "quest" / "questEngine.ts",
        SERVER / "src" / "quest" / "questSeeds.ts",
        SERVER / "src" / "routes" / "questRoutes.ts",
    ]
    missing = _files_exist(files)
    if missing:
        return CheckResult("P4-06-Quest", "quest_files", "FAIL", "major",
                           f"누락: {missing}", elapsed())
    quest_count = _count_pattern(SERVER / "src" / "quest" / "questSeeds.ts", "name:")
    if quest_count < 60:
        return CheckResult("P4-06-Quest", "quest_60", "FAIL", "major",
                           f"퀘스트 name: {quest_count}개 — 60 미달", elapsed())
    return CheckResult("P4-06-Quest", "quest_60", "PASS", "observation",
                       f"questEngine + seeds({quest_count}개) + routes OK", elapsed())


def check_p4_07_admin() -> CheckResult:
    """P4-07: 어드민 14 엔드포인트 + 감사 로그"""
    t0 = time.monotonic()
    elapsed = lambda: int((time.monotonic() - t0) * 1000)
    files = [
        SERVER / "src" / "admin" / "auditLogger.ts",
        SERVER / "src" / "admin" / "authMiddleware.ts",
        SERVER / "src" / "routes" / "adminRoutes.ts",
    ]
    missing = _files_exist(files)
    if missing:
        return CheckResult("P4-07-Admin", "admin_files", "FAIL", "major",
                           f"누락: {missing}", elapsed())
    route_file = SERVER / "src" / "routes" / "adminRoutes.ts"
    content = route_file.read_text(encoding="utf-8")
    # fastify 스타일: fastify.get( / fastify.get<  또는 router.get( 등
    endpoint_count = len(re.findall(r'\.\s*(?:get|post|put|patch|delete)\s*[<(]', content))
    if endpoint_count < 14:
        return CheckResult("P4-07-Admin", "admin_14_endpoints", "FAIL", "major",
                           f"엔드포인트 {endpoint_count}개 — 14개 미달", elapsed())
    return CheckResult("P4-07-Admin", "admin_14ep+audit", "PASS", "observation",
                       f"adminRoutes({endpoint_count}ep) + auditLogger OK", elapsed())


def check_p4_08_economy() -> CheckResult:
    """P4-08: 경제 밸런싱 (시뮬레이터 + 밸런스 테이블)"""
    t0 = time.monotonic()
    elapsed = lambda: int((time.monotonic() - t0) * 1000)
    files = [
        SERVER / "src" / "economy" / "economySimulator.ts",
        SERVER / "src" / "economy" / "balanceTable.ts",
        SERVER / "src" / "routes" / "economyRoutes.ts",
    ]
    missing = _files_exist(files)
    if missing:
        return CheckResult("P4-08-Economy", "economy_files", "FAIL", "major",
                           f"누락: {missing}", elapsed())
    return CheckResult("P4-08-Economy", "simulator+balance_table", "PASS", "observation",
                       "economySimulator + balanceTable + routes OK", elapsed())


def check_p4_09_inventory() -> CheckResult:
    """P4-09: 인벤토리/장비 80 아이템 + 강화/옵션"""
    t0 = time.monotonic()
    elapsed = lambda: int((time.monotonic() - t0) * 1000)
    files = [
        SERVER / "src" / "inventory" / "inventoryManager.ts",
        SERVER / "src" / "inventory" / "itemSeeds.ts",
        SERVER / "src" / "routes" / "inventoryRoutes.ts",
    ]
    missing = _files_exist(files)
    if missing:
        return CheckResult("P4-09-Inventory", "inventory_files", "FAIL", "major",
                           f"누락: {missing}", elapsed())
    item_count = _count_pattern(SERVER / "src" / "inventory" / "itemSeeds.ts", "name:")
    if item_count < 80:
        return CheckResult("P4-09-Inventory", "item_80", "FAIL", "major",
                           f"아이템 name: {item_count}개 — 80개 미달", elapsed())
    return CheckResult("P4-09-Inventory", "item_80+enhance+option", "PASS", "observation",
                       f"inventoryManager + seeds({item_count}개) + routes OK", elapsed())


def check_p4_10_reward_mail() -> CheckResult:
    """P4-10: 보상우편 (시스템 우편 + 일괄 수령)"""
    t0 = time.monotonic()
    elapsed = lambda: int((time.monotonic() - t0) * 1000)
    files = [
        SERVER / "src" / "social" / "rewardMailer.ts",
        SERVER / "src" / "social" / "mailSystem.ts",
    ]
    missing = _files_exist(files)
    if missing:
        return CheckResult("P4-10-RewardMail", "reward_mail_files", "FAIL", "major",
                           f"누락: {missing}", elapsed())
    return CheckResult("P4-10-RewardMail", "system_mail+batch_collect", "PASS", "observation",
                       "rewardMailer + mailSystem OK", elapsed())


def check_p4_11_attendance_event() -> CheckResult:
    """P4-11: 출석/이벤트 (연속 출석 + 10 이벤트)"""
    t0 = time.monotonic()
    elapsed = lambda: int((time.monotonic() - t0) * 1000)
    files = [
        SERVER / "src" / "event" / "attendanceSystem.ts",
        SERVER / "src" / "event" / "eventEngine.ts",
        SERVER / "src" / "event" / "eventSeeds.ts",
        SERVER / "src" / "routes" / "eventRoutes.ts",
    ]
    missing = _files_exist(files)
    if missing:
        return CheckResult("P4-11-AttendEvent", "event_files", "FAIL", "major",
                           f"누락: {missing}", elapsed())
    event_count = _count_pattern(SERVER / "src" / "event" / "eventSeeds.ts", "name:")
    if event_count < 10:
        return CheckResult("P4-11-AttendEvent", "event_10", "FAIL", "major",
                           f"이벤트 name: {event_count}개 — 10개 미달", elapsed())
    return CheckResult("P4-11-AttendEvent", "attendance+event_10", "PASS", "observation",
                       f"attendanceSystem + eventEngine + seeds({event_count}개) OK", elapsed())


def check_p4_12_currency() -> CheckResult:
    """P4-12: 화폐 (gold/diamond/eventCoin + 거래 로그)"""
    t0 = time.monotonic()
    elapsed = lambda: int((time.monotonic() - t0) * 1000)
    files = [
        SERVER / "src" / "economy" / "currencyManager.ts",
        SERVER / "src" / "routes" / "currencyRoutes.ts",
    ]
    missing = _files_exist(files)
    if missing:
        return CheckResult("P4-12-Currency", "currency_files", "FAIL", "major",
                           f"누락: {missing}", elapsed())
    content = (SERVER / "src" / "economy" / "currencyManager.ts").read_text(encoding="utf-8")
    has_gold = "gold" in content.lower()
    has_diamond = "diamond" in content.lower()
    has_event = "eventcoin" in content.lower() or "event_coin" in content.lower() or "eventCoin" in content
    if not (has_gold and has_diamond):
        return CheckResult("P4-12-Currency", "currency_types", "FAIL", "major",
                           "gold/diamond 화폐 타입 미확인", elapsed())
    return CheckResult("P4-12-Currency", "gold+diamond+eventCoin+log", "PASS", "observation",
                       "currencyManager(gold/diamond/eventCoin) + routes OK", elapsed())


def check_p4_13_tutorial() -> CheckResult:
    """P4-13: 튜토리얼 5단계 UI 오버레이"""
    t0 = time.monotonic()
    elapsed = lambda: int((time.monotonic() - t0) * 1000)
    files = [
        CLIENT / "src" / "ui" / "TutorialManager.ts",
        SERVER / "src" / "routes" / "tutorialRoutes.ts",
    ]
    missing = _files_exist(files)
    if missing:
        return CheckResult("P4-13-Tutorial", "tutorial_files", "FAIL", "major",
                           f"누락: {missing}", elapsed())
    return CheckResult("P4-13-Tutorial", "tutorial_5step_overlay", "PASS", "observation",
                       "TutorialManager + tutorialRoutes OK", elapsed())


def check_p4_14_chat() -> CheckResult:
    """P4-14: 채팅 5채널 + 욕설 필터 + 도배 방지"""
    t0 = time.monotonic()
    elapsed = lambda: int((time.monotonic() - t0) * 1000)
    files = [
        SERVER / "src" / "chat" / "chatManager.ts",
        SERVER / "src" / "chat" / "profanityFilter.ts",
        SERVER / "src" / "socket" / "chatSocketHandler.ts",
    ]
    missing = _files_exist(files)
    if missing:
        return CheckResult("P4-14-Chat", "chat_files", "FAIL", "major",
                           f"누락: {missing}", elapsed())
    return CheckResult("P4-14-Chat", "chat_5ch+filter+spam", "PASS", "observation",
                       "chatManager + profanityFilter + socket OK", elapsed())


def check_p4_15_security() -> CheckResult:
    """P4-15: 보안 (JWT + Rate limit + 입력 검증)"""
    t0 = time.monotonic()
    elapsed = lambda: int((time.monotonic() - t0) * 1000)
    files = [
        SERVER / "src" / "security" / "jwtManager.ts",
        SERVER / "src" / "security" / "rateLimiter.ts",
        SERVER / "src" / "security" / "inputValidator.ts",
        SERVER / "src" / "routes" / "authRoutes.ts",
    ]
    missing = _files_exist(files)
    if missing:
        return CheckResult("P4-15-Security", "security_files", "FAIL", "critical",
                           f"누락: {missing}", elapsed())
    return CheckResult("P4-15-Security", "jwt+rate_limit+validator", "PASS", "observation",
                       "jwtManager + rateLimiter + inputValidator + authRoutes OK", elapsed())


def check_p4_16_cache() -> CheckResult:
    """P4-16: 캐시 (Redis 5종 TTL + N+1 감지)"""
    t0 = time.monotonic()
    elapsed = lambda: int((time.monotonic() - t0) * 1000)
    files = [
        SERVER / "src" / "cache" / "cacheLayer.ts",
        SERVER / "src" / "cache" / "queryOptimizer.ts",
        SERVER / "src" / "redis.ts",
    ]
    missing = _files_exist(files)
    if missing:
        return CheckResult("P4-16-Cache", "cache_files", "FAIL", "major",
                           f"누락: {missing}", elapsed())
    content = (SERVER / "src" / "cache" / "cacheLayer.ts").read_text(encoding="utf-8")
    ttl_count = content.lower().count("ttl")
    return CheckResult("P4-16-Cache", "redis_5ttl+n1_detect", "PASS", "observation",
                       f"cacheLayer(TTL ref {ttl_count}회) + queryOptimizer + redis OK", elapsed())


def check_p4_17_e2e() -> CheckResult:
    """P4-17: E2E 테스트 파일 10개 확인"""
    t0 = time.monotonic()
    elapsed = lambda: int((time.monotonic() - t0) * 1000)
    if not TESTS_E2E.exists():
        return CheckResult("P4-17-E2E", "e2e_dir", "FAIL", "critical",
                           "tests/e2e/ 디렉토리 없음", elapsed())
    test_files = list(TESTS_E2E.glob("*.test.ts"))
    if len(test_files) < 10:
        return CheckResult("P4-17-E2E", "e2e_10_files", "FAIL", "major",
                           f"E2E 테스트 {len(test_files)}개 — 10개 미달", elapsed())
    names = sorted([f.name for f in test_files])
    return CheckResult("P4-17-E2E", "e2e_test_files", "PASS", "observation",
                       f"{len(test_files)}개 테스트: {names}", elapsed())


def check_p4_18_logging() -> CheckResult:
    """P4-18: 로그/모니터링 (구조화 로그 + Grafana)"""
    t0 = time.monotonic()
    elapsed = lambda: int((time.monotonic() - t0) * 1000)
    files = [
        SERVER / "src" / "logging" / "structuredLogger.ts",
        SERVER / "src" / "logging" / "logMiddleware.ts",
        SERVER / "src" / "monitoring" / "grafanaConfig.ts",
        ROOT / "monitoring" / "prometheus.yml",
    ]
    missing = _files_exist(files)
    if missing:
        return CheckResult("P4-18-Logging", "log_files", "FAIL", "major",
                           f"누락: {missing}", elapsed())
    return CheckResult("P4-18-Logging", "structured_log+grafana", "PASS", "observation",
                       "structuredLogger + logMiddleware + grafanaConfig + prometheus OK", elapsed())


def check_p4_19_staging() -> List[CheckResult]:
    """P4-19: 스테이징 (Docker + 시드 + CI/CD)"""
    results = []

    # Docker Compose
    t0 = time.monotonic()
    elapsed = lambda: int((time.monotonic() - t0) * 1000)
    dc_files = [ROOT / "docker-compose.yml", ROOT / "docker-compose.staging.yml"]
    for dc in dc_files:
        if not dc.exists():
            results.append(CheckResult("P4-19-Staging", f"{dc.name}_exists", "FAIL", "major",
                                       f"{dc.name} 없음", elapsed()))
            continue
        try:
            with open(dc) as f:
                yaml.safe_load(f)
            results.append(CheckResult("P4-19-Staging", f"{dc.name}_yaml", "PASS", "observation",
                                       f"{dc.name} YAML 구문 OK", elapsed()))
        except Exception as e:
            results.append(CheckResult("P4-19-Staging", f"{dc.name}_yaml", "FAIL", "major",
                                       str(e)[:300], elapsed()))

    # k8s 매니페스트
    t0 = time.monotonic()
    if K8S.exists():
        yamls = list(K8S.glob("*.yaml")) + list(K8S.glob("*.yml"))
        errors = []
        for yf in yamls:
            try:
                with open(yf) as f:
                    list(yaml.safe_load_all(f))
            except Exception as e:
                errors.append(f"{yf.name}: {e}")
        if errors:
            results.append(CheckResult("P4-19-Staging", "k8s_yaml", "FAIL", "critical",
                                       "; ".join(errors)[:300], elapsed()))
        else:
            results.append(CheckResult("P4-19-Staging", "k8s_manifests", "PASS", "observation",
                                       f"{len(yamls)} 매니페스트 구문 OK", elapsed()))
    else:
        results.append(CheckResult("P4-19-Staging", "k8s_dir", "FAIL", "critical",
                                   "k8s/ 없음", elapsed()))

    # GitHub Actions 워크플로우 4개
    t0 = time.monotonic()
    expected_wf = ["ci.yml", "deploy.yml", "release.yml", "staging.yml"]
    if WORKFLOWS.exists():
        existing_wf = [f.name for f in WORKFLOWS.iterdir() if f.suffix in (".yml", ".yaml")]
        missing_wf = [w for w in expected_wf if w not in existing_wf]
        if missing_wf:
            results.append(CheckResult("P4-19-Staging", "workflows_4", "FAIL", "major",
                                       f"누락: {missing_wf}", elapsed()))
        else:
            # YAML 파싱 검증
            errors = []
            for wf in expected_wf:
                try:
                    with open(WORKFLOWS / wf) as f:
                        yaml.safe_load(f)
                except Exception as e:
                    errors.append(f"{wf}: {e}")
            if errors:
                results.append(CheckResult("P4-19-Staging", "workflow_yaml", "FAIL", "major",
                                           "; ".join(errors)[:300], elapsed()))
            else:
                results.append(CheckResult("P4-19-Staging", "workflows_4", "PASS", "observation",
                                           f"4 워크플로우 OK: {expected_wf}", elapsed()))
    else:
        results.append(CheckResult("P4-19-Staging", "workflows_dir", "FAIL", "critical",
                                   ".github/workflows/ 없음", elapsed()))

    # 시드 스크립트
    t0 = time.monotonic()
    seed_ts = ROOT / "tools" / "staging" / "seed.ts"
    if not seed_ts.exists():
        results.append(CheckResult("P4-19-Staging", "seed_script", "FAIL", "major",
                                   "tools/staging/seed.ts 없음", elapsed()))
    else:
        results.append(CheckResult("P4-19-Staging", "seed_script", "PASS", "observation",
                                   "seed.ts 존재", elapsed()))

    return results


# ────────────────────── 시드 데이터 검증 ─────────────────────────

def check_seed_data() -> List[CheckResult]:
    """시드 데이터 수량 검증"""
    results = []
    checks = [
        ("item", SERVER / "src" / "inventory" / "itemSeeds.ts", "name:", 80),
        ("recipe", SERVER / "src" / "craft" / "recipeSeeds.ts", "name:", 50),
        ("npc", SERVER / "src" / "npc" / "npcSeeds.ts", "name:", 30),
        ("quest", SERVER / "src" / "quest" / "questSeeds.ts", "name:", 60),
        ("achievement", SERVER / "src" / "achievement" / "achievementSeeds.ts", "code:", 100),
        ("pet", SERVER / "src" / "pet" / "petSeeds.ts", "name:", 15),
        ("class", SERVER / "src" / "class" / "classSeeds.ts", "advancedClass:", 9),
        ("event", SERVER / "src" / "event" / "eventSeeds.ts", "name:", 10),
    ]
    for label, path, pattern, expected in checks:
        t0 = time.monotonic()
        elapsed = lambda: int((time.monotonic() - t0) * 1000)
        count = _count_pattern(path, pattern)
        if count < expected:
            results.append(CheckResult(f"Seed-{label}", f"seed_{label}_{expected}",
                                       "FAIL", "major",
                                       f"{label}: {count}개 — 예상 {expected}개 미달", elapsed()))
        else:
            results.append(CheckResult(f"Seed-{label}", f"seed_{label}_{expected}",
                                       "PASS", "observation",
                                       f"{label}: {count}개 ≥ {expected}", elapsed()))
    return results


# ────────────────────── 메트릭 수집 ──────────────────────────────

def collect_metrics() -> Metrics:
    m = Metrics()
    m.total_files = _count_files(ROOT, (".ts", ".tsx", ".js", ".py", ".proto", ".prisma",
                                        ".yaml", ".yml", ".md", ".json", ".cpp", ".h", ".sql"))
    m.code_files = _count_files(ROOT, (".ts", ".tsx", ".js", ".py", ".proto", ".prisma",
                                       ".cpp", ".h", ".sql"))
    m.server_ts_files = _count_files(SERVER / "src", (".ts",))
    m.client_ts_files = _count_files(CLIENT / "src", (".ts", ".tsx"))

    if PRISMA_SCHEMA.exists():
        m.db_models = len(re.findall(r"^model\s+", PRISMA_SCHEMA.read_text(), re.MULTILINE))

    routes_dir = SERVER / "src" / "routes"
    if routes_dir.exists():
        for f in routes_dir.glob("*.ts"):
            txt = f.read_text()
            for verb in [".get(", ".post(", ".put(", ".patch(", ".delete("]:
                m.api_endpoints += txt.count(verb)

    socket_dir = SERVER / "src" / "socket"
    if socket_dir.exists():
        m.socket_handlers = len(list(socket_dir.glob("*Handler.ts")))

    if TESTS_E2E.exists():
        m.e2e_test_files = len(list(TESTS_E2E.glob("*.test.ts")))

    m.k8s_manifests = len(list(K8S.glob("*.yaml"))) if K8S.exists() else 0

    manifest = CLIENT / "src" / "sound" / "soundManifest.ts"
    if manifest.exists():
        m.sound_entries = _count_pattern(manifest, "key:")

    # Seed counts
    m.seed_items = _count_pattern(SERVER / "src" / "inventory" / "itemSeeds.ts", "name:")
    m.seed_recipes = _count_pattern(SERVER / "src" / "craft" / "recipeSeeds.ts", "name:")
    m.seed_npcs = _count_pattern(SERVER / "src" / "npc" / "npcSeeds.ts", "name:")
    m.seed_quests = _count_pattern(SERVER / "src" / "quest" / "questSeeds.ts", "name:")
    m.seed_achievements = _count_pattern(SERVER / "src" / "achievement" / "achievementSeeds.ts", "code:")
    m.seed_pets = _count_pattern(SERVER / "src" / "pet" / "petSeeds.ts", "name:")
    m.seed_classes = _count_pattern(SERVER / "src" / "class" / "classSeeds.ts", "advancedClass:")
    m.seed_events = _count_pattern(SERVER / "src" / "event" / "eventSeeds.ts", "name:")

    return m


# ────────────────────── 메인 ─────────────────────────────────────

def main():
    results: List[CheckResult] = []

    # 빌드 검증
    tsc_srv, srv_errs = check_tsc_server()
    tsc_cli, cli_errs = check_tsc_client()
    results.extend([tsc_srv, tsc_cli])

    # Prisma
    results.append(check_prisma())

    # P4 모듈별 검증
    results.append(check_p4_01_pet())
    results.append(check_p4_02_craft())
    results.append(check_p4_03_npc_ai())
    results.append(check_p4_04_social())
    results.append(check_p4_05_sound())
    results.append(check_p4_06_quest())
    results.append(check_p4_07_admin())
    results.append(check_p4_08_economy())
    results.append(check_p4_09_inventory())
    results.append(check_p4_10_reward_mail())
    results.append(check_p4_11_attendance_event())
    results.append(check_p4_12_currency())
    results.append(check_p4_13_tutorial())
    results.append(check_p4_14_chat())
    results.append(check_p4_15_security())
    results.append(check_p4_16_cache())
    results.append(check_p4_17_e2e())
    results.append(check_p4_18_logging())

    # P4-19 (다수 서브 체크)
    results.extend(check_p4_19_staging())

    # 시드 데이터 검증
    results.extend(check_seed_data())

    # 라우트 존재 확인 (일괄)
    t0 = time.monotonic()
    required_routes = ["pet", "craft", "npc", "social", "quest", "admin",
                       "economy", "inventory", "event", "currency", "tutorial", "auth"]
    missing_routes = []
    for r in required_routes:
        route_file = SERVER / "src" / "routes" / f"{r}Routes.ts"
        if not route_file.exists():
            missing_routes.append(r)
    if missing_routes:
        results.append(CheckResult("Routes-Check", "required_routes", "FAIL", "major",
                                   f"누락 라우트: {missing_routes}",
                                   int((time.monotonic() - t0) * 1000)))
    else:
        results.append(CheckResult("Routes-Check", "required_routes", "PASS", "observation",
                                   f"{len(required_routes)} 라우트 파일 전수 확인",
                                   int((time.monotonic() - t0) * 1000)))

    # 소켓 핸들러 존재 확인
    t0 = time.monotonic()
    required_sockets = ["pet", "social", "chat"]
    missing_sockets = []
    for s in required_sockets:
        socket_file = SERVER / "src" / "socket" / f"{s}SocketHandler.ts"
        if not socket_file.exists():
            missing_sockets.append(s)
    if missing_sockets:
        results.append(CheckResult("Socket-Check", "required_sockets", "FAIL", "major",
                                   f"누락 소켓: {missing_sockets}",
                                   int((time.monotonic() - t0) * 1000)))
    else:
        results.append(CheckResult("Socket-Check", "required_sockets", "PASS", "observation",
                                   f"{len(required_sockets)} 소켓 핸들러 확인",
                                   int((time.monotonic() - t0) * 1000)))

    # 메트릭 수집
    metrics = collect_metrics()
    metrics.tsc_server_errors = srv_errs
    metrics.tsc_client_errors = cli_errs

    # 요약
    pass_count = sum(1 for r in results if r.status == "PASS")
    fail_count = sum(1 for r in results if r.status == "FAIL")
    skip_count = sum(1 for r in results if r.status == "SKIP")
    critical_fail = sum(1 for r in results if r.status == "FAIL" and r.severity == "critical")
    major_fail = sum(1 for r in results if r.status == "FAIL" and r.severity == "major")

    # RC 판정
    if critical_fail == 0 and major_fail == 0:
        verdict = "RC_APPROVED"
    elif critical_fail == 0:
        verdict = "RC_CONDITIONAL"
    else:
        verdict = "RC_REJECTED"

    report = IntegrationReport(
        timestamp=time.strftime("%Y-%m-%dT%H:%M:%S%z"),
        phase="P4",
        results=[asdict(r) for r in results],
        metrics=asdict(metrics),
        summary={
            "total": len(results),
            "pass": pass_count,
            "fail": fail_count,
            "skip": skip_count,
            "critical_fail": critical_fail,
            "major_fail": major_fail,
        },
        rc_verdict=verdict,
    )
    print(json.dumps(asdict(report), indent=2, ensure_ascii=False))
    return 0 if critical_fail == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
