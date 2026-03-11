-- P5-03: 던전 시스템
CREATE TABLE "dungeons" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "zone_id" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL DEFAULT 'normal',
    "required_level" INTEGER NOT NULL,
    "max_players" INTEGER NOT NULL DEFAULT 4,
    "waves" JSONB NOT NULL,
    "rewards" JSONB NOT NULL,
    "time_limit" INTEGER NOT NULL DEFAULT 600,
    "entry_count" INTEGER NOT NULL DEFAULT 3,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dungeons_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "dungeons_code_key" ON "dungeons"("code");
CREATE INDEX "dungeons_zone_id_idx" ON "dungeons"("zone_id");
CREATE INDEX "dungeons_difficulty_idx" ON "dungeons"("difficulty");

CREATE TABLE "dungeon_runs" (
    "id" TEXT NOT NULL,
    "dungeon_id" TEXT NOT NULL,
    "leader_id" TEXT NOT NULL,
    "members" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'in_progress',
    "current_wave" INTEGER NOT NULL DEFAULT 1,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),
    "loot_result" JSONB,

    CONSTRAINT "dungeon_runs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "dungeon_runs_dungeon_id_idx" ON "dungeon_runs"("dungeon_id");
CREATE INDEX "dungeon_runs_leader_id_idx" ON "dungeon_runs"("leader_id");

-- P5-04: 월드맵/필드 시스템
CREATE TABLE "zones" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "level_range" JSONB NOT NULL,
    "connections" JSONB NOT NULL,
    "npcs" JSONB NOT NULL DEFAULT '[]',
    "ambient_sound" TEXT,
    "bgm" TEXT,
    "map_data" JSONB,
    "is_hub" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "zones_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "zones_code_key" ON "zones"("code");
CREATE INDEX "zones_region_idx" ON "zones"("region");

CREATE TABLE "player_locations" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "zone_id" TEXT NOT NULL,
    "pos_x" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pos_y" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "player_locations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "player_locations_user_id_key" ON "player_locations"("user_id");
