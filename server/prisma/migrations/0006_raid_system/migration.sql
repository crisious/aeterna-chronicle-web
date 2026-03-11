-- 레이드 보스 시스템 마이그레이션 (P3-14)
-- 10인 레이드 + 전리품 분배

-- 레이드 보스 테이블
CREATE TABLE "raid_bosses" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "max_hp" INTEGER NOT NULL,
    "attack" INTEGER NOT NULL,
    "defense" INTEGER NOT NULL,
    "mechanics" JSONB,
    "loot_table" JSONB NOT NULL,
    "min_players" INTEGER NOT NULL DEFAULT 4,
    "max_players" INTEGER NOT NULL DEFAULT 10,
    "time_limit" INTEGER NOT NULL DEFAULT 600,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "raid_bosses_pkey" PRIMARY KEY ("id")
);

-- 레이드 세션 테이블
CREATE TABLE "raid_sessions" (
    "id" TEXT NOT NULL,
    "boss_id" TEXT NOT NULL,
    "guild_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'forming',
    "current_hp" INTEGER NOT NULL,
    "participants" JSONB NOT NULL,
    "started_at" TIMESTAMP(3),
    "ended_at" TIMESTAMP(3),
    "loot_result" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "raid_sessions_pkey" PRIMARY KEY ("id")
);

-- 인덱스
CREATE INDEX "raid_sessions_boss_id_idx" ON "raid_sessions"("boss_id");
CREATE INDEX "raid_sessions_guild_id_idx" ON "raid_sessions"("guild_id");
CREATE INDEX "raid_sessions_status_idx" ON "raid_sessions"("status");

-- 외래 키
ALTER TABLE "raid_sessions" ADD CONSTRAINT "raid_sessions_boss_id_fkey"
    FOREIGN KEY ("boss_id") REFERENCES "raid_bosses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
