-- 업적 시스템 마이그레이션
-- P3-15: Achievement System

-- ─── 업적 테이블 ────────────────────────────────────────────────
CREATE TABLE "achievements" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "tier" TEXT NOT NULL DEFAULT 'bronze',
    "icon" TEXT,
    "points" INTEGER NOT NULL DEFAULT 10,
    "is_hidden" BOOLEAN NOT NULL DEFAULT false,
    "condition" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "achievements_pkey" PRIMARY KEY ("id")
);

-- ─── 업적 달성 기록 테이블 ──────────────────────────────────────
CREATE TABLE "achievement_unlocks" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "achievement_id" TEXT NOT NULL,
    "unlocked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "achievement_unlocks_pkey" PRIMARY KEY ("id")
);

-- ─── 칭호 테이블 ────────────────────────────────────────────────
CREATE TABLE "titles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "rarity" TEXT NOT NULL DEFAULT 'common',
    "achievement_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "titles_pkey" PRIMARY KEY ("id")
);

-- ─── 유니크 제약 ────────────────────────────────────────────────
CREATE UNIQUE INDEX "achievements_code_key" ON "achievements"("code");
CREATE UNIQUE INDEX "achievement_unlocks_user_id_achievement_id_key" ON "achievement_unlocks"("user_id", "achievement_id");
CREATE UNIQUE INDEX "titles_name_key" ON "titles"("name");

-- ─── 인덱스 ─────────────────────────────────────────────────────
CREATE INDEX "achievements_category_idx" ON "achievements"("category");
CREATE INDEX "achievement_unlocks_user_id_idx" ON "achievement_unlocks"("user_id");

-- ─── 외래키 ─────────────────────────────────────────────────────
ALTER TABLE "achievement_unlocks"
    ADD CONSTRAINT "achievement_unlocks_achievement_id_fkey"
    FOREIGN KEY ("achievement_id") REFERENCES "achievements"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
