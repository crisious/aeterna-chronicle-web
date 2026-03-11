-- P4-02: 제작 시스템 마이그레이션

-- 레시피 테이블
CREATE TABLE "recipes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "result_item_id" TEXT NOT NULL,
    "result_count" INTEGER NOT NULL DEFAULT 1,
    "materials" JSONB NOT NULL,
    "required_level" INTEGER NOT NULL DEFAULT 1,
    "craft_time" INTEGER NOT NULL DEFAULT 5,
    "success_rate" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "is_unlocked" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recipes_pkey" PRIMARY KEY ("id")
);

-- 제작 로그 테이블
CREATE TABLE "craft_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "recipe_id" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "result_item" TEXT,
    "crafted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "craft_logs_pkey" PRIMARY KEY ("id")
);

-- 인덱스
CREATE UNIQUE INDEX "recipes_name_key" ON "recipes"("name");
CREATE INDEX "recipes_category_idx" ON "recipes"("category");
CREATE INDEX "craft_logs_user_id_idx" ON "craft_logs"("user_id");
