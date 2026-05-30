# Prisma 마이그레이션 드리프트 복구 가이드

> 작성: 2026-05-29 · **갱신: 2026-05-31 — ✅ 해소(0015 마이그레이션 생성 + 실 DB 검증)**

## ✅ 적용 결과 (2026-05-31)

옵션 A(추가 마이그레이션)를 실제 Postgres로 수행·검증해 드리프트를 해소했다.

- **`server/prisma/migrations/migration_lock.toml`** 신설 (`provider = "postgresql"` — 누락되어 있었음).
- **`server/prisma/migrations/0015_sync_schema_drift/migration.sql`** 신설 — `prisma migrate diff --from-migrations(0001~0014) --to-schema-datamodel` 으로 생성한 누락 **74 테이블** 추가분.
- **검증**: 빈 DB 에 `prisma migrate deploy`(0001~0015 전체) → **정확히 110 테이블** 재현. 이후 `migrate diff --from-migrations --to-schema-datamodel --exit-code` → **"No difference detected"**(드리프트 0).
- **0012 번호 중복**: `migrate deploy` 가 디렉터리명 사전순으로 정상 적용함을 실증(비차단). 리네임은 기존 환경 `_prisma_migrations` 와 어긋나므로 **수행하지 않음**.

### ⚠️ 기존 환경(dev/staging/prod, db push 로 구축됨) 베이스라인 — 1회 필요
이미 테이블이 존재하는 환경은 `migrate deploy` 가 0001~0015 를 재적용하려다 "이미 존재" 충돌이 난다. 최초 1회 baseline 처리:
```bash
# 기존 환경 DATABASE_URL 기준 — 모든 마이그레이션을 '적용됨'으로 표시(SQL 재실행 안 함)
for m in 0001_initial 0002_guild_system 0003_pvp_arena 0004_shop_season_pass \
  0005_ending_system 0006_raid_system 0007_achievement_system 0008_class_advancement \
  0009_craft_system 0010_npc_system 0011_social_system 0012_dungeon_world_system \
  0012_monster_system 0013_codex_notification_system 0014_guild_level_war_pvp_normalize \
  0015_sync_schema_drift; do
  npx prisma migrate resolve --applied "$m" --schema server/prisma/schema.prisma
done
```
> **신규 환경**(빈 DB)은 베이스라인 불필요 — `migrate deploy` 만으로 110 테이블 생성(검증 완료).

---

## (이하 원래 분석 기록)

## 1. 확인된 문제 (배포 차단급)

| 항목 | 값 | 근거 |
|---|---|---|
| `schema.prisma` 모델 수 | **110** | `grep -c '^model ' server/prisma/schema.prisma` |
| 마이그레이션 `CREATE TABLE` 수 | **36** | `grep -rc 'CREATE TABLE' server/prisma/migrations` (15개 디렉터리 합) |
| 마이그레이션 누락 모델 | **약 74** | `prisma migrate diff --from-empty --to-schema-datamodel` → 110 테이블 vs 이력 36 |

`prisma migrate diff --from-empty --to-schema-datamodel server/prisma/schema.prisma --script` 는 **110개** `CREATE TABLE` 을 생성한다. 즉 전체 스키마는 110 테이블이지만 정식 마이그레이션 이력에는 36개만 존재한다.

### 영향
현재 개발/스테이징 DB 는 `npm run seed:reset`(= `prisma db push --force-reset`)로 구축되어 110 테이블이 모두 존재한다. 그러나 **프로덕션 배포 경로(`prisma migrate deploy`)는 36 테이블만 생성**하므로, 빈 DB 에 `migrate deploy` 로 구축하면 약 74개 테이블이 누락된다.

누락 모델에는 런타임 핵심이 다수 포함된다(예시): `PaymentReceipt`, `SaveSlot`/`GameSave`, `PartyMember`/`PartyInvite`, `InventorySlot`/`InventoryItem`, `Item`, `Skill`/`PlayerSkill`, `Quest`/`QuestProgress`, `Pet`/`PetSkill`, `Sanction`, `Report`, `Trade`, `CombatLog`, `Equipment`, `StoryProgress`, `WorldBoss`, `Dialogue`, `CosmeticItem`/`PlayerCosmetic`, `MatchmakingTicket`, `ChapterProgress`, `Notification`(일부) 등.
> 참고: 방금 머지 예정인 IDOR 하드닝(PR #174)이 사용하는 `partyMember`/`partyInvite`/`paymentReceipt`/`inventorySlot` 도 누락 모델군에 속한다 → `migrate deploy` 환경에서는 해당 코드가 런타임 실패한다.

### 마이그레이션 0012 번호 중복 — **비차단(cosmetic)**
`0012_dungeon_world_system` 과 `0012_monster_system` 두 디렉터리가 동일 번호를 가진다. 그러나 Prisma 는 **디렉터리명 사전순**으로 정렬·적용하고(`dungeon_world` < `monster`), `_prisma_migrations` 는 디렉터리명으로 추적하므로 하드 에러가 아니다. 생성 테이블도 disjoint(dungeons/dungeon_runs/zones/player_locations vs monsters/monster_spawns). 하드 실패는 아니나, 향후 혼선을 막기 위해 하나를 `0012a_*` 또는 `0015_*` 로 재번호하는 것을 권장한다(선택).

## 2. 복구 절차 (DB 환경에서 수행)

### 옵션 A — 추가 마이그레이션 (권장, 비파괴적)
기존 이력(0001~0014)을 보존하고, 누락분을 채우는 단일 마이그레이션을 추가한다. **shadow DB(개발용 Postgres)가 필요**하다.

```bash
# 1) 개발 Postgres 가 떠 있는 상태에서, 기존 마이그레이션 상태 → 현재 스키마의 차이를 SQL 로 생성
npx prisma migrate diff \
  --from-migrations server/prisma/migrations \
  --to-schema-datamodel server/prisma/schema.prisma \
  --shadow-database-url "$SHADOW_DATABASE_URL" \
  --script > server/prisma/migrations/0015_sync_schema_drift/migration.sql
# (migration.sql 의 CREATE TABLE 이 약 74개인지 확인)

# 2) 빈 검증 DB 에 전체 이력 적용 → 110 테이블 재현 확인
DATABASE_URL="$VERIFY_DB_URL" npx prisma migrate deploy
DATABASE_URL="$VERIFY_DB_URL" psql -c "\dt" | wc -l   # 110(+_prisma_migrations) 확인

# 3) 통과 시 커밋
```

### 옵션 B — 베이스라인 리셋 (이력 단일화)
기존 환경에 이미 110 테이블이 있다면, 단일 베이스라인으로 정리할 수 있다(더 disruptive — 모든 환경에서 `migrate resolve` 조정 필요).

```bash
# 전체 스키마를 단일 베이스라인 SQL 로 생성
npx prisma migrate diff --from-empty \
  --to-schema-datamodel server/prisma/schema.prisma --script \
  > server/prisma/migrations/0000_baseline/migration.sql
# 기존 환경에는 이미 적용된 것으로 표시
npx prisma migrate resolve --applied 0000_baseline
```

## 3. 검증 게이트 (필수)
- 빈 Postgres 에 `prisma migrate deploy` → 테이블 수 **110**(+`_prisma_migrations`) 확인.
- `npm run seed:check` 또는 `qa:auto` 로 시드/런타임 무결성 확인.
- CI(`production.yml`)의 `validate` 잡에 `migrate deploy` 드라이런 추가 검토.

## 4. 연관
- 릴리스 자동화가 git 태그 0개로 미검증(`production.yml`/`release.yml` 가동 이력 0) — 첫 태그 배포 전 본 드리프트 해소 필수.
- 본 문서는 정적 분석 기반이며, 실제 SQL 생성/적용은 위 DB 게이트 통과 후 진행할 것.
