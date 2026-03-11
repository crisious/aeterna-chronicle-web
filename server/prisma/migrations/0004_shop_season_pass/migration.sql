-- P3-10: 과금 시스템 — 상점 + 시즌 패스 + P2W 가드
-- 코스메틱/편의 과금 전용, P2W 제로 원칙 준수

-- ─── 상점 아이템 테이블 ─────────────────────────────────────
CREATE TABLE "shop_items" (
    "id"          TEXT NOT NULL DEFAULT gen_random_uuid(),
    "name"        TEXT NOT NULL,
    "category"    TEXT NOT NULL,
    "price"       INTEGER NOT NULL,
    "currency"    TEXT NOT NULL DEFAULT 'crystal',
    "rarity"      TEXT NOT NULL DEFAULT 'common',
    "description" TEXT,
    "image_url"   TEXT,
    "is_active"   BOOLEAN NOT NULL DEFAULT true,
    "start_date"  TIMESTAMP(3),
    "end_date"    TIMESTAMP(3),
    "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shop_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "shop_items_category_is_active_idx" ON "shop_items"("category", "is_active");

-- ─── 구매 기록 테이블 ───────────────────────────────────────
CREATE TABLE "purchases" (
    "id"         TEXT NOT NULL DEFAULT gen_random_uuid(),
    "user_id"    TEXT NOT NULL,
    "item_id"    TEXT NOT NULL,
    "price"      INTEGER NOT NULL,
    "currency"   TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchases_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "purchases_user_id_idx" ON "purchases"("user_id");

ALTER TABLE "purchases"
    ADD CONSTRAINT "purchases_item_id_fkey"
    FOREIGN KEY ("item_id") REFERENCES "shop_items"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- ─── 시즌 패스 테이블 ───────────────────────────────────────
CREATE TABLE "season_passes" (
    "id"              TEXT NOT NULL DEFAULT gen_random_uuid(),
    "season"          INTEGER NOT NULL,
    "name"            TEXT NOT NULL,
    "start_date"      TIMESTAMP(3) NOT NULL,
    "end_date"        TIMESTAMP(3) NOT NULL,
    "free_rewards"    JSONB NOT NULL,
    "premium_rewards" JSONB NOT NULL,
    "is_active"       BOOLEAN NOT NULL DEFAULT true,
    "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "season_passes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "season_passes_season_key" ON "season_passes"("season");

-- ─── 시즌 패스 진행도 테이블 ────────────────────────────────
CREATE TABLE "season_pass_progress" (
    "id"              TEXT NOT NULL DEFAULT gen_random_uuid(),
    "user_id"         TEXT NOT NULL,
    "season_pass_id"  TEXT NOT NULL,
    "level"           INTEGER NOT NULL DEFAULT 0,
    "exp"             INTEGER NOT NULL DEFAULT 0,
    "is_premium"      BOOLEAN NOT NULL DEFAULT false,
    "claimed_free"    JSONB NOT NULL DEFAULT '[]',
    "claimed_premium" JSONB NOT NULL DEFAULT '[]',
    "updated_at"      TIMESTAMP(3) NOT NULL,

    CONSTRAINT "season_pass_progress_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "season_pass_progress_user_id_season_pass_id_key"
    ON "season_pass_progress"("user_id", "season_pass_id");

ALTER TABLE "season_pass_progress"
    ADD CONSTRAINT "season_pass_progress_season_pass_id_fkey"
    FOREIGN KEY ("season_pass_id") REFERENCES "season_passes"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
