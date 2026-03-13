#!/usr/bin/env python3
"""
에테르나 크로니클 — P15-05: 에셋 카탈로그 매니저
전체 에셋 DB(JSON), 생산 상태 추적, 의존성 그래프, 진행률 대시보드

사용법:
  python asset_catalog.py init                          # 카탈로그 초기화
  python asset_catalog.py add --id char_ether_knight_front --category character --status pending
  python asset_catalog.py update --id char_ether_knight_front --status done
  python asset_catalog.py status                        # 진행률 대시보드
  python asset_catalog.py deps --id char_ether_knight_front  # 의존성 확인
  python asset_catalog.py report                        # 상세 리포트
  python asset_catalog.py export --format csv           # CSV 내보내기
"""

import argparse
import json
import os
import sys
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Any

# ── 카탈로그 경로 ─────────────────────────────────────────
DEFAULT_CATALOG_PATH = Path("assets/catalog.json")

# ── 에셋 카테고리 정의 ────────────────────────────────────
CATEGORIES = {
    "character_illust": {"name": "캐릭터 일러스트", "priority": "P0"},
    "character_sprite": {"name": "캐릭터 스프라이트", "priority": "P0"},
    "npc_portrait":     {"name": "NPC 초상화", "priority": "P0"},
    "npc_sprite":       {"name": "NPC 스프라이트", "priority": "P0"},
    "monster_normal":   {"name": "일반 몬스터", "priority": "P0"},
    "monster_elite":    {"name": "엘리트 몬스터", "priority": "P1"},
    "monster_boss":     {"name": "던전 보스", "priority": "P0"},
    "monster_raid":     {"name": "레이드 보스", "priority": "P0"},
    "tileset":          {"name": "타일셋", "priority": "P0"},
    "background":       {"name": "배경", "priority": "P0"},
    "icon":             {"name": "아이콘", "priority": "P1"},
    "vfx":              {"name": "VFX 이펙트", "priority": "P1"},
    "ui":               {"name": "UI 요소", "priority": "P1"},
    "cosmetic":         {"name": "코스메틱", "priority": "P2"},
}

# 상태 정의
STATUSES = ["pending", "prompt_ready", "generating", "post_processing", "qa_review", "approved", "rejected", "done"]

# ── MVP 에셋 수량 (P0 기준 363개) ─────────────────────────
MVP_TARGETS = {
    "character_illust": 18,    # 6클래스 × 3뷰
    "character_sprite": 24,    # 6클래스 × 4전직 시트
    "npc_portrait": 30,        # NPC 30명
    "npc_sprite": 30,          # NPC 30명
    "monster_normal": 120,     # 일반 ~120종
    "monster_elite": 40,       # 엘리트 ~40종
    "monster_boss": 30,        # 던전 보스 ~30종
    "monster_raid": 8,         # 레이드 보스 8종
    "tileset": 27,             # 3지역 × 9 오토타일
    "background": 36,          # 3지역 × 4레이어 × 3시간대
}

# ── 카탈로그 클래스 ───────────────────────────────────────

class AssetCatalog:
    def __init__(self, path: Path = DEFAULT_CATALOG_PATH):
        self.path = path
        self.data: Dict[str, Any] = {
            "version": "1.0",
            "created_at": "",
            "updated_at": "",
            "assets": {},
            "metadata": {
                "total_target": sum(MVP_TARGETS.values()),
                "mvp_targets": MVP_TARGETS,
            }
        }
        if path.exists():
            self.load()

    def load(self):
        self.data = json.loads(self.path.read_text())

    def save(self):
        self.data["updated_at"] = datetime.now().isoformat()
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.path.write_text(json.dumps(self.data, indent=2, ensure_ascii=False))

    # ── CRUD ──────────────────────────────────────────────

    def add(self, asset_id: str, category: str, name: str = "",
            status: str = "pending", depends_on: List[str] = None,
            metadata: Dict = None):
        if asset_id in self.data["assets"]:
            print(f"⚠️ 이미 존재: {asset_id}")
            return False

        self.data["assets"][asset_id] = {
            "id": asset_id,
            "category": category,
            "name": name or asset_id,
            "status": status,
            "depends_on": depends_on or [],
            "prompt_file": "",
            "output_file": "",
            "engine": "",
            "seed": -1,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
            "metadata": metadata or {},
        }
        self.save()
        return True

    def update(self, asset_id: str, **kwargs):
        if asset_id not in self.data["assets"]:
            print(f"❌ 존재하지 않음: {asset_id}")
            return False

        asset = self.data["assets"][asset_id]
        for k, v in kwargs.items():
            if k in asset:
                asset[k] = v
        asset["updated_at"] = datetime.now().isoformat()
        self.save()
        return True

    def get(self, asset_id: str) -> Optional[Dict]:
        return self.data["assets"].get(asset_id)

    def remove(self, asset_id: str) -> bool:
        if asset_id in self.data["assets"]:
            del self.data["assets"][asset_id]
            self.save()
            return True
        return False

    def list_by_category(self, category: str) -> List[Dict]:
        return [a for a in self.data["assets"].values() if a["category"] == category]

    def list_by_status(self, status: str) -> List[Dict]:
        return [a for a in self.data["assets"].values() if a["status"] == status]

    # ── 초기화: MVP 대상 에셋 일괄 등록 ──────────────────

    def init_mvp(self):
        """MVP 363개 에셋 스켈레톤 등록"""
        count = 0

        # 캐릭터 일러스트 (6클래스 × 3뷰 = 18)
        classes = [
            ("ether_knight", "에테르기사"),
            ("memory_weaver", "기억술사"),
            ("shadow_weaver", "그림자직조사"),
            ("memory_breaker", "기억파괴자"),
            ("time_guardian", "시간수호자"),
            ("void_wanderer", "허공의방랑자"),
        ]
        views = ["front", "side", "back"]

        for cls_id, cls_name in classes:
            for view in views:
                aid = f"char_illust_{cls_id}_{view}"
                self.add(aid, "character_illust", f"{cls_name} {view}", metadata={"class": cls_name, "view": view})
                count += 1

        # 캐릭터 스프라이트 (6클래스 × 4전직 = 24)
        advancements = ["base", "adv1", "adv2", "adv3"]
        for cls_id, cls_name in classes:
            for adv in advancements:
                aid = f"char_sprite_{cls_id}_{adv}"
                deps = [f"char_illust_{cls_id}_front"]
                self.add(aid, "character_sprite", f"{cls_name} {adv} 시트",
                         depends_on=deps, metadata={"class": cls_name, "advancement": adv})
                count += 1

        # NPC 초상화 (30명)
        npcs = [
            "crio", "eris", "lumina", "mateus", "urgrom",
            "ifrita", "serafin", "naila", "torga", "milena",
            "kobal", "memoria", "hashur", "lunaria", "beltus",
            "okia", "seiren", "bellatrix", "arcana", "eva",
            "darius", "helena", "kai", "phoenix", "shadow",
            "nexus", "aurora", "frost", "ember", "storm",
        ]
        for npc_id in npcs:
            self.add(f"npc_portrait_{npc_id}", "npc_portrait", f"NPC {npc_id} 초상화")
            self.add(f"npc_sprite_{npc_id}", "npc_sprite", f"NPC {npc_id} 스프라이트",
                     depends_on=[f"npc_portrait_{npc_id}"])
            count += 2

        # 몬스터 (일반 120 + 엘리트 40 + 보스 30 + 레이드 8 = 198)
        for i in range(120):
            self.add(f"monster_normal_{i+1:03d}", "monster_normal", f"일반몬스터 #{i+1:03d}")
            count += 1
        for i in range(40):
            self.add(f"monster_elite_{i+1:03d}", "monster_elite", f"엘리트몬스터 #{i+1:03d}")
            count += 1
        for i in range(30):
            self.add(f"monster_boss_{i+1:03d}", "monster_boss", f"던전보스 #{i+1:03d}")
            count += 1

        raid_bosses = [
            "nebulos", "abyssal", "oblivion", "lethe",
            "time_sentinel", "abyss_leviathan", "chronos_prime", "void_architect",
        ]
        for rb in raid_bosses:
            self.add(f"monster_raid_{rb}", "monster_raid", f"레이드보스 {rb}")
            count += 1

        # 타일셋 (3지역 × 9 = 27)
        regions = ["erebos", "sylvanheim", "solaris"]
        tile_types = ["ground", "wall", "deco", "water", "cliff",
                      "bridge", "door", "stairs", "special"]
        for region in regions:
            for tt in tile_types:
                self.add(f"tile_{region}_{tt}", "tileset", f"{region} {tt} 타일")
                count += 1

        # 배경 (3지역 × 4레이어 × 3시간대 = 36)
        layers = ["sky", "far_bg", "mid_bg", "near_bg"]
        times = ["day", "night", "dusk"]
        for region in regions:
            for layer in layers:
                for tod in times:
                    self.add(f"bg_{region}_{layer}_{tod}", "background",
                             f"{region} {layer} {tod}")
                    count += 1

        print(f"MVP 카탈로그 초기화: {count}개 에셋 등록")
        self.save()

    # ── 진행률 대시보드 ──────────────────────────────────

    def status_dashboard(self):
        """진행률 대시보드 출력"""
        assets = self.data["assets"]
        total = len(assets)

        # 카테고리별 집계
        cat_stats = defaultdict(lambda: defaultdict(int))
        for a in assets.values():
            cat_stats[a["category"]][a["status"]] += 1
            cat_stats[a["category"]]["total"] += 1

        print(f"\n{'='*70}")
        print(f" 에테르나 크로니클 — 에셋 카탈로그 대시보드")
        print(f" 갱신: {self.data.get('updated_at', 'N/A')}")
        print(f"{'='*70}")

        total_done = sum(1 for a in assets.values() if a["status"] == "done")
        total_progress = total_done / max(total, 1) * 100

        print(f"\n 총 진행률: {total_done}/{total} ({total_progress:.1f}%)")
        print(f" {'█' * int(total_progress / 2)}{'░' * (50 - int(total_progress / 2))}")

        print(f"\n {'카테고리':<20} {'총':<6} {'대기':<6} {'생성중':<6} {'완료':<6} {'진행률':<8}")
        print(f" {'-'*60}")

        for cat_id, cat_info in CATEGORIES.items():
            stats = cat_stats.get(cat_id, {})
            t = stats.get("total", 0)
            if t == 0:
                continue
            pending = stats.get("pending", 0) + stats.get("prompt_ready", 0)
            in_progress = stats.get("generating", 0) + stats.get("post_processing", 0) + stats.get("qa_review", 0)
            done = stats.get("done", 0) + stats.get("approved", 0)
            pct = done / t * 100 if t > 0 else 0

            bar = f"{'█' * int(pct / 10)}{'░' * (10 - int(pct / 10))}"
            print(f" {cat_info['name']:<18} {t:<6} {pending:<6} {in_progress:<6} {done:<6} {bar} {pct:.0f}%")

        # 상태별 전체 집계
        status_counts = defaultdict(int)
        for a in assets.values():
            status_counts[a["status"]] += 1

        print(f"\n 상태별 집계:")
        for s in STATUSES:
            c = status_counts.get(s, 0)
            if c > 0:
                print(f"   {s:<18}: {c}")

    # ── 의존성 그래프 ────────────────────────────────────

    def deps_graph(self, asset_id: str, depth: int = 0):
        """의존성 트리 출력"""
        asset = self.get(asset_id)
        if not asset:
            print(f"{'  ' * depth}❌ {asset_id} (미등록)")
            return

        status_icon = "✅" if asset["status"] == "done" else "🔄" if asset["status"] in ("generating", "post_processing") else "⏳"
        print(f"{'  ' * depth}{status_icon} {asset_id} [{asset['status']}]")

        for dep_id in asset.get("depends_on", []):
            self.deps_graph(dep_id, depth + 1)

    # ── 리포트 ───────────────────────────────────────────

    def report(self) -> Dict:
        """상세 리포트 생성"""
        assets = self.data["assets"]
        report = {
            "timestamp": datetime.now().isoformat(),
            "total_assets": len(assets),
            "mvp_target": sum(MVP_TARGETS.values()),
            "coverage": len(assets) / max(sum(MVP_TARGETS.values()), 1) * 100,
            "status_breakdown": defaultdict(int),
            "category_breakdown": {},
            "blocked_assets": [],
        }

        for a in assets.values():
            report["status_breakdown"][a["status"]] += 1

        # 블로킹 분석
        for a in assets.values():
            if a["status"] == "pending" and a.get("depends_on"):
                blocking = [
                    dep for dep in a["depends_on"]
                    if dep in assets and assets[dep]["status"] != "done"
                ]
                if blocking:
                    report["blocked_assets"].append({
                        "id": a["id"],
                        "blocked_by": blocking,
                    })

        return dict(report)

    # ── CSV 내보내기 ─────────────────────────────────────

    def export_csv(self, output_path: Path):
        """CSV 내보내기"""
        import csv
        with open(output_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(["id", "category", "name", "status", "engine", "seed",
                           "depends_on", "prompt_file", "output_file", "updated_at"])
            for a in self.data["assets"].values():
                writer.writerow([
                    a["id"], a["category"], a["name"], a["status"],
                    a.get("engine", ""), a.get("seed", ""),
                    ";".join(a.get("depends_on", [])),
                    a.get("prompt_file", ""), a.get("output_file", ""),
                    a.get("updated_at", ""),
                ])
        print(f"CSV 내보내기: {output_path}")


def main():
    parser = argparse.ArgumentParser(description="에셋 카탈로그 매니저")
    parser.add_argument("command", choices=["init", "add", "update", "get", "remove",
                                            "status", "deps", "report", "export", "list"])
    parser.add_argument("--catalog", "-c", type=str, default=str(DEFAULT_CATALOG_PATH),
                        help="카탈로그 파일 경로")
    parser.add_argument("--id", type=str, help="에셋 ID")
    parser.add_argument("--category", type=str, help="카테고리")
    parser.add_argument("--name", type=str, help="에셋 이름")
    parser.add_argument("--status", type=str, choices=STATUSES, help="상태")
    parser.add_argument("--engine", type=str, help="엔진")
    parser.add_argument("--format", type=str, default="json", choices=["json", "csv"])
    parser.add_argument("--output", type=str, help="출력 경로")

    args = parser.parse_args()
    catalog = AssetCatalog(Path(args.catalog))

    if args.command == "init":
        catalog.data["created_at"] = datetime.now().isoformat()
        catalog.init_mvp()

    elif args.command == "add":
        if not args.id or not args.category:
            print("--id 와 --category 필수")
            return
        catalog.add(args.id, args.category, args.name or "", args.status or "pending")

    elif args.command == "update":
        if not args.id:
            print("--id 필수")
            return
        kwargs = {}
        if args.status: kwargs["status"] = args.status
        if args.engine: kwargs["engine"] = args.engine
        if args.name: kwargs["name"] = args.name
        catalog.update(args.id, **kwargs)

    elif args.command == "get":
        if not args.id:
            print("--id 필수")
            return
        asset = catalog.get(args.id)
        if asset:
            print(json.dumps(asset, indent=2, ensure_ascii=False))
        else:
            print(f"❌ 미등록: {args.id}")

    elif args.command == "remove":
        if not args.id:
            print("--id 필수")
            return
        catalog.remove(args.id)

    elif args.command == "status":
        catalog.status_dashboard()

    elif args.command == "deps":
        if not args.id:
            print("--id 필수")
            return
        catalog.deps_graph(args.id)

    elif args.command == "report":
        r = catalog.report()
        print(json.dumps(r, indent=2, ensure_ascii=False, default=str))

    elif args.command == "export":
        out = Path(args.output) if args.output else Path("catalog_export.csv")
        if args.format == "csv":
            catalog.export_csv(out)
        else:
            out.write_text(json.dumps(catalog.data, indent=2, ensure_ascii=False))
            print(f"JSON 내보내기: {out}")

    elif args.command == "list":
        if args.category:
            items = catalog.list_by_category(args.category)
        elif args.status:
            items = catalog.list_by_status(args.status)
        else:
            items = list(catalog.data["assets"].values())
        for a in items[:50]:
            print(f"  {a['status']:<16} {a['id']}")
        if len(items) > 50:
            print(f"  ... 외 {len(items)-50}개")


if __name__ == "__main__":
    main()
