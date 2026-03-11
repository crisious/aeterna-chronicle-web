-- P3-09: PvP 아레나 시스템 테이블 생성
-- 매치 기록 + 레이팅 시스템

-- ─── PvP 매치 테이블 ────────────────────────────────────────
CREATE TABLE "pvp_matches" (
    "id" TEXT NOT NULL,
    "player1_id" TEXT NOT NULL,
    "player2_id" TEXT NOT NULL,
    "winner_id" TEXT,
    "player1_score" INTEGER NOT NULL DEFAULT 0,
    "player2_score" INTEGER NOT NULL DEFAULT 0,
    "arena_type" TEXT NOT NULL DEFAULT 'ranked',
    "season" INTEGER NOT NULL DEFAULT 1,
    "duration" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'matching',
    "started_at" TIMESTAMP(3),
    "ended_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pvp_matches_pkey" PRIMARY KEY ("id")
);

-- ─── PvP 레이팅 테이블 ─────────────────────────────────────
CREATE TABLE "pvp_ratings" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "season" INTEGER NOT NULL DEFAULT 1,
    "rating" INTEGER NOT NULL DEFAULT 1000,
    "tier" TEXT NOT NULL DEFAULT 'bronze',
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "streak" INTEGER NOT NULL DEFAULT 0,
    "peak_rating" INTEGER NOT NULL DEFAULT 1000,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pvp_ratings_pkey" PRIMARY KEY ("id")
);

-- ─── 인덱스 ─────────────────────────────────────────────────
CREATE INDEX "pvp_matches_player1_id_idx" ON "pvp_matches"("player1_id");
CREATE INDEX "pvp_matches_player2_id_idx" ON "pvp_matches"("player2_id");
CREATE INDEX "pvp_matches_season_arena_type_idx" ON "pvp_matches"("season", "arena_type");

CREATE UNIQUE INDEX "pvp_ratings_user_id_season_key" ON "pvp_ratings"("user_id", "season");
CREATE INDEX "pvp_ratings_season_rating_idx" ON "pvp_ratings"("season", "rating" DESC);
