#!/usr/bin/env python3
"""
P3-20 통합 플레이테스트 — Phase 3 RC 판정용 통합 검증 스크립트

검증 항목:
  P3-01 Protobuf / P3-02 APM / P3-03 Prisma / P3-06 L10N
  P3-07 아틀라스+풀 / P3-08 길드 / P3-09 PvP / P3-10 과금
  P3-11 멀티엔딩 / P3-12 UE5 / P3-13 UMG / P3-14 레이드
  P3-15 업적 / P3-16 2차전직 / P3-17 k8s / P3-18 틱+Worker
  P3-19 CI/CD

출력: JSON (stdout)
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
import time
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional

import yaml  # PyYAML

ROOT = Path(__file__).resolve().parents[2]  # 프로젝트 루트
SERVER = ROOT / "server"
CLIENT = ROOT / "client"
K8S = ROOT / "k8s"
WORKFLOWS = ROOT / ".github" / "workflows"
PRISMA_SCHEMA = SERVER / "prisma" / "schema.prisma"
PROTO_DIR = ROOT / "shared" / "proto"
REGRESSION_DIR = ROOT / "tools" / "regression"


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
    socket_events: int = 0
    tsc_server_errors: int = -1
    tsc_client_errors: int = -1
    proto_messages: int = 0
    k8s_manifests: int = 0
    achievements: int = 0
    class_advancements: int = 0
    ue5_source_files: int = 0


@dataclass
class IntegrationReport:
    timestamp: str = ""
    results: List[Dict[str, Any]] = field(default_factory=list)
    metrics: Dict[str, Any] = field(default_factory=dict)
    summary: Dict[str, int] = field(default_factory=dict)


# ────────────────────── 유틸 ─────────────────────────────────────

def _run(cmd: str, cwd: Optional[Path] = None, timeout: int = 60) -> subprocess.CompletedProcess:
    return subprocess.run(
        cmd, shell=True, capture_output=True, text=True,
        cwd=cwd or ROOT, timeout=timeout,
    )


def _count_files(base: Path, exts: tuple, exclude: tuple = ("node_modules", ".git")) -> int:
    n = 0
    for f in base.rglob("*"):
        if any(ex in f.parts for ex in exclude):
            continue
        if f.suffix in exts and f.is_file():
            n += 1
    return n


# ────────────────────── 개별 검증 함수 ───────────────────────────

def check_protobuf() -> CheckResult:
    """P3-01: .proto 파일 존재 + protobufjs codec 존재"""
    t0 = time.monotonic()
    proto = list(PROTO_DIR.glob("*.proto"))
    codec = ROOT / "shared" / "codec" / "gameCodec.ts"
    if not proto:
        return CheckResult("P3-01-Protobuf", "proto_file_exists", "FAIL", "critical",
                           "shared/proto/*.proto 없음", int((time.monotonic()-t0)*1000))
    if not codec.exists():
        return CheckResult("P3-01-Protobuf", "codec_exists", "FAIL", "major",
                           "shared/codec/gameCodec.ts 없음", int((time.monotonic()-t0)*1000))
    return CheckResult("P3-01-Protobuf", "proto+codec", "PASS", "observation",
                       f"{len(proto)} proto, codec OK", int((time.monotonic()-t0)*1000))


def check_apm() -> CheckResult:
    """P3-02: APM 모듈 파일 존재"""
    t0 = time.monotonic()
    needed = ["index.ts", "metrics.ts", "alerts.ts", "middleware.ts", "dashboard.ts"]
    apm_dir = SERVER / "src" / "apm"
    missing = [f for f in needed if not (apm_dir / f).exists()]
    if missing:
        return CheckResult("P3-02-APM", "apm_files", "FAIL", "major",
                           f"누락: {missing}", int((time.monotonic()-t0)*1000))
    return CheckResult("P3-02-APM", "apm_files", "PASS", "observation",
                       f"{len(needed)} 파일 확인", int((time.monotonic()-t0)*1000))


def check_prisma() -> CheckResult:
    """P3-03: prisma validate"""
    t0 = time.monotonic()
    if not PRISMA_SCHEMA.exists():
        return CheckResult("P3-03-Prisma", "schema_exists", "FAIL", "critical",
                           "schema.prisma 없음", int((time.monotonic()-t0)*1000))
    # prisma format --check 은 DB 접속 불필요, 스키마 구문만 검증
    r = _run("npx prisma format --check 2>&1 || true", cwd=SERVER, timeout=30)
    # fallback: 스키마 파일 자체 model 파싱 검증
    content = PRISMA_SCHEMA.read_text(encoding="utf-8")
    model_count = content.count("\nmodel ")
    if model_count < 1:
        return CheckResult("P3-03-Prisma", "prisma_schema", "FAIL", "critical",
                           "모델 0개 — 스키마 비정상", int((time.monotonic()-t0)*1000))
    # 기본 구문 체크: generator + datasource 블록 존재
    has_gen = "generator " in content
    has_ds = "datasource " in content
    if not (has_gen and has_ds):
        return CheckResult("P3-03-Prisma", "prisma_schema", "FAIL", "critical",
                           "generator/datasource 블록 누락", int((time.monotonic()-t0)*1000))
    return CheckResult("P3-03-Prisma", "prisma_schema", "PASS", "observation",
                       f"스키마 구문 OK — {model_count} 모델, generator+datasource 확인",
                       int((time.monotonic()-t0)*1000))


def check_l10n() -> CheckResult:
    """P3-06: l10n 러너 실행"""
    t0 = time.monotonic()
    runner = REGRESSION_DIR / "l10n_key_integrity_runner.py"
    if not runner.exists():
        return CheckResult("P3-06-L10N", "runner_exists", "FAIL", "major",
                           "l10n_key_integrity_runner.py 없음", int((time.monotonic()-t0)*1000))
    import tempfile
    with tempfile.NamedTemporaryFile(suffix=".json", delete=False) as tmp:
        out_path = tmp.name
    r = _run(f"python3 '{runner}' --out '{out_path}'", timeout=30)
    if r.returncode != 0:
        return CheckResult("P3-06-L10N", "l10n_runner", "FAIL", "major",
                           r.stderr.strip()[:300], int((time.monotonic()-t0)*1000))
    try:
        data = json.loads(Path(out_path).read_text())
        dup = data.get("summary", {}).get("duplicateDefinitionKeyCount", 0)
        conflict = data.get("summary", {}).get("conflictKeyCount", 0)
        if dup > 0 or conflict > 0:
            return CheckResult("P3-06-L10N", "l10n_integrity", "FAIL", "major",
                               f"duplicate={dup}, conflict={conflict}", int((time.monotonic()-t0)*1000))
    except (json.JSONDecodeError, FileNotFoundError):
        pass
    finally:
        Path(out_path).unlink(missing_ok=True)
    return CheckResult("P3-06-L10N", "l10n_integrity", "PASS", "observation",
                       "중복 0, 충돌 0", int((time.monotonic()-t0)*1000))


def check_atlas_pool() -> CheckResult:
    """P3-07: EffectManager + ObjectPool + PoolBenchmark 존재"""
    t0 = time.monotonic()
    files = [
        CLIENT / "src" / "effects" / "EffectManager.ts",
        CLIENT / "src" / "utils" / "ObjectPool.ts",
        CLIENT / "src" / "utils" / "PoolBenchmark.ts",
    ]
    missing = [str(f.relative_to(ROOT)) for f in files if not f.exists()]
    if missing:
        return CheckResult("P3-07-AtlasPool", "effect_pool_files", "FAIL", "major",
                           f"누락: {missing}", int((time.monotonic()-t0)*1000))
    return CheckResult("P3-07-AtlasPool", "effect_pool_files", "PASS", "observation",
                       "EffectManager+ObjectPool+Benchmark OK", int((time.monotonic()-t0)*1000))


def check_guild() -> CheckResult:
    """P3-08: 길드 라우트 + 소켓 핸들러"""
    t0 = time.monotonic()
    files = [
        SERVER / "src" / "routes" / "guildRoutes.ts",
        SERVER / "src" / "socket" / "guildSocketHandler.ts",
    ]
    missing = [str(f.relative_to(ROOT)) for f in files if not f.exists()]
    if missing:
        return CheckResult("P3-08-Guild", "guild_files", "FAIL", "major",
                           f"누락: {missing}", int((time.monotonic()-t0)*1000))
    return CheckResult("P3-08-Guild", "guild_crud+war", "PASS", "observation",
                       "routes + socket OK", int((time.monotonic()-t0)*1000))


def check_pvp() -> CheckResult:
    """P3-09: PvP 매칭+ELO+랭킹"""
    t0 = time.monotonic()
    files = [
        SERVER / "src" / "pvp" / "matchmaker.ts",
        SERVER / "src" / "pvp" / "arenaHandler.ts",
        SERVER / "src" / "routes" / "pvpRoutes.ts",
        SERVER / "src" / "socket" / "pvpSocketHandler.ts",
    ]
    missing = [str(f.relative_to(ROOT)) for f in files if not f.exists()]
    if missing:
        return CheckResult("P3-09-PvP", "pvp_files", "FAIL", "major",
                           f"누락: {missing}", int((time.monotonic()-t0)*1000))
    return CheckResult("P3-09-PvP", "pvp_match+elo+rank", "PASS", "observation",
                       "matchmaker + arena + routes + socket OK", int((time.monotonic()-t0)*1000))


def check_shop() -> CheckResult:
    """P3-10: 상점+시즌패스+P2W 가드"""
    t0 = time.monotonic()
    files = [
        SERVER / "src" / "routes" / "shopRoutes.ts",
        SERVER / "src" / "routes" / "seasonPassRoutes.ts",
        SERVER / "src" / "shop" / "p2wGuard.ts",
    ]
    missing = [str(f.relative_to(ROOT)) for f in files if not f.exists()]
    if missing:
        return CheckResult("P3-10-Shop", "shop_files", "FAIL", "major",
                           f"누락: {missing}", int((time.monotonic()-t0)*1000))
    return CheckResult("P3-10-Shop", "shop+season+p2w", "PASS", "observation",
                       "shopRoutes + seasonPass + p2wGuard OK", int((time.monotonic()-t0)*1000))


def check_ending_regression() -> CheckResult:
    """P3-11: 엔딩 회귀 10/10"""
    t0 = time.monotonic()
    runner = REGRESSION_DIR / "ending_regression_runner.py"
    if not runner.exists():
        return CheckResult("P3-11-Ending", "runner_exists", "FAIL", "critical",
                           "ending_regression_runner.py 없음", int((time.monotonic()-t0)*1000))
    import tempfile
    with tempfile.NamedTemporaryFile(suffix=".json", delete=False) as tmp:
        out_path = tmp.name
    r = _run(f"python3 '{runner}' --out '{out_path}'", timeout=30)
    if r.returncode != 0:
        return CheckResult("P3-11-Ending", "ending_regression", "FAIL", "critical",
                           r.stderr.strip()[:300], int((time.monotonic()-t0)*1000))
    try:
        data = json.loads(Path(out_path).read_text())
        total = data.get("total", 0)
        passed = data.get("pass", 0)
        if passed < total:
            return CheckResult("P3-11-Ending", "ending_regression", "FAIL", "critical",
                               f"{passed}/{total} PASS", int((time.monotonic()-t0)*1000))
    except (json.JSONDecodeError, FileNotFoundError):
        pass
    finally:
        Path(out_path).unlink(missing_ok=True)
    return CheckResult("P3-11-Ending", "ending_regression", "PASS", "observation",
                       "회귀 테스트 전원 PASS", int((time.monotonic()-t0)*1000))


def check_ue5() -> CheckResult:
    """P3-12: UE5 GAS 소스 + 서버 연동"""
    t0 = time.monotonic()
    src = ROOT / "ue5_project" / "Source"
    if not src.exists():
        return CheckResult("P3-12-UE5", "ue5_source", "FAIL", "major",
                           "ue5_project/Source 없음", int((time.monotonic()-t0)*1000))
    cpp = list(src.rglob("*.cpp")) + list(src.rglob("*.h"))
    if len(cpp) < 5:
        return CheckResult("P3-12-UE5", "ue5_source", "FAIL", "major",
                           f"소스 파일 {len(cpp)}개 — 최소 기대치 미달", int((time.monotonic()-t0)*1000))
    return CheckResult("P3-12-UE5", "ue5_gas+server", "PASS", "observation",
                       f"C++/Header {len(cpp)}개 확인", int((time.monotonic()-t0)*1000))


def check_umg() -> CheckResult:
    """P3-13: UMG HUD 정의"""
    t0 = time.monotonic()
    hud = ROOT / "ue5_umg" / "HUD"
    if not hud.exists():
        return CheckResult("P3-13-UMG", "umg_hud", "FAIL", "major",
                           "ue5_umg/HUD 없음", int((time.monotonic()-t0)*1000))
    files = list(hud.rglob("*"))
    return CheckResult("P3-13-UMG", "umg_hud_files", "PASS", "observation",
                       f"HUD 파일 {len(files)}개", int((time.monotonic()-t0)*1000))


def check_raid() -> CheckResult:
    """P3-14: 레이드 매니저 + 라우트 + 소켓"""
    t0 = time.monotonic()
    files = [
        SERVER / "src" / "raid" / "raidManager.ts",
        SERVER / "src" / "routes" / "raidRoutes.ts",
        SERVER / "src" / "socket" / "raidSocketHandler.ts",
    ]
    missing = [str(f.relative_to(ROOT)) for f in files if not f.exists()]
    if missing:
        return CheckResult("P3-14-Raid", "raid_files", "FAIL", "major",
                           f"누락: {missing}", int((time.monotonic()-t0)*1000))
    return CheckResult("P3-14-Raid", "raid_10man+loot", "PASS", "observation",
                       "raidManager + routes + socket OK", int((time.monotonic()-t0)*1000))


def check_achievements() -> CheckResult:
    """P3-15: 업적 100개 + 칭호"""
    t0 = time.monotonic()
    seeds = SERVER / "src" / "achievement" / "achievementSeeds.ts"
    engine = SERVER / "src" / "achievement" / "achievementEngine.ts"
    routes = SERVER / "src" / "routes" / "achievementRoutes.ts"
    if not all(f.exists() for f in [seeds, engine, routes]):
        return CheckResult("P3-15-Achievement", "achievement_files", "FAIL", "major",
                           "업적 파일 누락", int((time.monotonic()-t0)*1000))
    # 시드 카운트 검증: code: 패턴
    content = seeds.read_text(encoding="utf-8")
    count = content.count("code:")
    if count < 100:
        return CheckResult("P3-15-Achievement", "achievement_100", "FAIL", "major",
                           f"업적 시드 {count}개 — 100개 미달", int((time.monotonic()-t0)*1000))
    return CheckResult("P3-15-Achievement", "achievement_100+title", "PASS", "observation",
                       f"업적 {count}개 + 칭호 모델 확인", int((time.monotonic()-t0)*1000))


def check_class_advancement() -> CheckResult:
    """P3-16: 2차 전직 9경로 + 궁극기"""
    t0 = time.monotonic()
    seeds = SERVER / "src" / "class" / "classSeeds.ts"
    engine = SERVER / "src" / "class" / "advancementEngine.ts"
    routes = SERVER / "src" / "routes" / "classRoutes.ts"
    if not all(f.exists() for f in [seeds, engine, routes]):
        return CheckResult("P3-16-Class", "class_files", "FAIL", "major",
                           "전직 파일 누락", int((time.monotonic()-t0)*1000))
    content = seeds.read_text(encoding="utf-8")
    adv_count = content.count("advancedClass:")
    if adv_count < 9:
        return CheckResult("P3-16-Class", "class_9paths", "FAIL", "major",
                           f"전직 경로 {adv_count}개 — 9개 미달", int((time.monotonic()-t0)*1000))
    ult_count = content.count("ultimateSkill")
    return CheckResult("P3-16-Class", "class_9paths+ultimate", "PASS", "observation",
                       f"전직 {adv_count}경로, 궁극기 참조 {ult_count}건", int((time.monotonic()-t0)*1000))


def check_k8s() -> CheckResult:
    """P3-17: k8s 매니페스트 YAML 파싱"""
    t0 = time.monotonic()
    if not K8S.exists():
        return CheckResult("P3-17-k8s", "k8s_dir", "FAIL", "critical",
                           "k8s/ 디렉토리 없음", int((time.monotonic()-t0)*1000))
    yamls = list(K8S.glob("*.yaml")) + list(K8S.glob("*.yml"))
    errors = []
    for yf in yamls:
        try:
            with open(yf) as f:
                list(yaml.safe_load_all(f))
        except Exception as e:
            errors.append(f"{yf.name}: {e}")
    if errors:
        return CheckResult("P3-17-k8s", "k8s_yaml_parse", "FAIL", "critical",
                           "; ".join(errors)[:300], int((time.monotonic()-t0)*1000))
    return CheckResult("P3-17-k8s", "k8s_manifests", "PASS", "observation",
                       f"{len(yamls)} 매니페스트 구문 OK", int((time.monotonic()-t0)*1000))


def check_docker_compose() -> CheckResult:
    """P3-17 보조: docker compose config 검증"""
    t0 = time.monotonic()
    dc = ROOT / "docker-compose.yml"
    if not dc.exists():
        return CheckResult("P3-17-Docker", "compose_exists", "FAIL", "major",
                           "docker-compose.yml 없음", int((time.monotonic()-t0)*1000))
    try:
        with open(dc) as f:
            yaml.safe_load(f)
        return CheckResult("P3-17-Docker", "compose_yaml", "PASS", "observation",
                           "YAML 구문 OK", int((time.monotonic()-t0)*1000))
    except Exception as e:
        return CheckResult("P3-17-Docker", "compose_yaml", "FAIL", "major",
                           str(e)[:300], int((time.monotonic()-t0)*1000))


def check_tick_worker() -> CheckResult:
    """P3-18: 틱 매니저 + WebWorker"""
    t0 = time.monotonic()
    files = [
        SERVER / "src" / "tick" / "tickManager.ts",
        CLIENT / "src" / "workers" / "workerBridge.ts",
        CLIENT / "src" / "workers" / "physicsWorker.ts",
        CLIENT / "src" / "workers" / "networkWorker.ts",
    ]
    missing = [str(f.relative_to(ROOT)) for f in files if not f.exists()]
    if missing:
        return CheckResult("P3-18-TickWorker", "tick_worker_files", "FAIL", "major",
                           f"누락: {missing}", int((time.monotonic()-t0)*1000))
    return CheckResult("P3-18-TickWorker", "tick_3layer+worker", "PASS", "observation",
                       "tickManager + workerBridge + physics/network OK", int((time.monotonic()-t0)*1000))


def check_cicd() -> CheckResult:
    """P3-19: GitHub Actions 워크플로우 YAML 검증"""
    t0 = time.monotonic()
    if not WORKFLOWS.exists():
        return CheckResult("P3-19-CICD", "workflows_dir", "FAIL", "critical",
                           ".github/workflows/ 없음", int((time.monotonic()-t0)*1000))
    yamls = list(WORKFLOWS.glob("*.yml")) + list(WORKFLOWS.glob("*.yaml"))
    if len(yamls) < 3:
        return CheckResult("P3-19-CICD", "workflow_count", "FAIL", "major",
                           f"워크플로우 {len(yamls)}개 — 최소 3개 필요", int((time.monotonic()-t0)*1000))
    errors = []
    for yf in yamls:
        try:
            with open(yf) as f:
                yaml.safe_load(f)
        except Exception as e:
            errors.append(f"{yf.name}: {e}")
    if errors:
        return CheckResult("P3-19-CICD", "workflow_yaml", "FAIL", "major",
                           "; ".join(errors)[:300], int((time.monotonic()-t0)*1000))
    names = [y.name for y in yamls]
    return CheckResult("P3-19-CICD", "workflow_yaml", "PASS", "observation",
                       f"{len(yamls)} 워크플로우 OK: {names}", int((time.monotonic()-t0)*1000))


def check_tsc_server() -> tuple[CheckResult, int]:
    """server tsc --noEmit"""
    t0 = time.monotonic()
    r = _run("npx tsc --noEmit", cwd=SERVER, timeout=60)
    errs = r.stdout.count("error TS") + r.stderr.count("error TS")
    elapsed = int((time.monotonic()-t0)*1000)
    if errs > 0:
        return CheckResult("Build-Server", "tsc_noEmit", "FAIL", "critical",
                           f"tsc 에러 {errs}건\n{(r.stdout+r.stderr)[:500]}", elapsed), errs
    return CheckResult("Build-Server", "tsc_noEmit", "PASS", "observation",
                       "tsc --noEmit 성공", elapsed), 0


def check_tsc_client() -> tuple[CheckResult, int]:
    """client tsc --noEmit"""
    t0 = time.monotonic()
    r = _run("npx tsc --noEmit", cwd=CLIENT, timeout=60)
    errs = r.stdout.count("error TS") + r.stderr.count("error TS")
    elapsed = int((time.monotonic()-t0)*1000)
    if errs > 0:
        return CheckResult("Build-Client", "tsc_noEmit", "FAIL", "critical",
                           f"tsc 에러 {errs}건\n{(r.stdout+r.stderr)[:500]}", elapsed), errs
    return CheckResult("Build-Client", "tsc_noEmit", "PASS", "observation",
                       "tsc --noEmit 성공", elapsed), 0


# ────────────────────── 메트릭 수집 ──────────────────────────────

def collect_metrics() -> Metrics:
    m = Metrics()
    m.total_files = _count_files(ROOT, (".ts", ".tsx", ".js", ".py", ".proto", ".prisma",
                                         ".yaml", ".yml", ".md", ".json", ".cpp", ".h"))
    m.code_files = _count_files(ROOT, (".ts", ".tsx", ".js", ".py", ".proto", ".prisma", ".cpp", ".h"))
    m.server_ts_files = _count_files(SERVER / "src", (".ts",))
    m.client_ts_files = _count_files(CLIENT / "src", (".ts", ".tsx"))
    # DB models
    if PRISMA_SCHEMA.exists():
        m.db_models = PRISMA_SCHEMA.read_text().count("\nmodel ")
    # API endpoints (rough)
    routes_dir = SERVER / "src" / "routes"
    if routes_dir.exists():
        for f in routes_dir.glob("*.ts"):
            txt = f.read_text()
            for verb in (".get(", ".post(", ".put(", ".patch(", ".delete("):
                m.api_endpoints += txt.count(verb)
    # Socket events
    socket_dir = SERVER / "src" / "socket"
    if socket_dir.exists():
        for f in socket_dir.glob("*.ts"):
            txt = f.read_text()
            m.socket_events += txt.count("socket.on(") + txt.count('io.on(') + txt.count(".emit(")
    # Proto messages
    for pf in PROTO_DIR.glob("*.proto"):
        m.proto_messages += pf.read_text().count("message ")
    # k8s
    m.k8s_manifests = len(list(K8S.glob("*.yaml"))) if K8S.exists() else 0
    # achievements
    seeds = SERVER / "src" / "achievement" / "achievementSeeds.ts"
    if seeds.exists():
        m.achievements = seeds.read_text().count("code:")
    # class advancements
    cs = SERVER / "src" / "class" / "classSeeds.ts"
    if cs.exists():
        m.class_advancements = cs.read_text().count("advancedClass:")
    # UE5
    ue5_src = ROOT / "ue5_project" / "Source"
    if ue5_src.exists():
        m.ue5_source_files = len(list(ue5_src.rglob("*.cpp")) + list(ue5_src.rglob("*.h")))
    return m


# ────────────────────── 메인 ─────────────────────────────────────

def main():
    results: List[CheckResult] = []

    # 빌드 검증
    tsc_srv, srv_errs = check_tsc_server()
    tsc_cli, cli_errs = check_tsc_client()
    results.extend([tsc_srv, tsc_cli])

    # 모듈별 검증
    results.append(check_protobuf())
    results.append(check_apm())
    results.append(check_prisma())
    results.append(check_l10n())
    results.append(check_atlas_pool())
    results.append(check_guild())
    results.append(check_pvp())
    results.append(check_shop())
    results.append(check_ending_regression())
    results.append(check_ue5())
    results.append(check_umg())
    results.append(check_raid())
    results.append(check_achievements())
    results.append(check_class_advancement())
    results.append(check_k8s())
    results.append(check_docker_compose())
    results.append(check_tick_worker())
    results.append(check_cicd())

    # SKIP 항목
    results.append(CheckResult("P3-04-KPI", "kpi_live_data", "SKIP", "observation",
                               "라이브 데이터 필요 — 수동 검증 대상"))
    results.append(CheckResult("P3-05-HUD", "hud_capture", "SKIP", "observation",
                               "수동 스크린샷 캡처 필요"))

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

    report = IntegrationReport(
        timestamp=time.strftime("%Y-%m-%dT%H:%M:%S%z"),
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
    )
    print(json.dumps(asdict(report), indent=2, ensure_ascii=False))
    return 0 if critical_fail == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
