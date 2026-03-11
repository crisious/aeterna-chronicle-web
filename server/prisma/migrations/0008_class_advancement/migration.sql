-- 2차 전직 시스템: class_advancements 테이블 생성
CREATE TABLE "class_advancements" (
    "id" TEXT NOT NULL,
    "base_class" TEXT NOT NULL,
    "advanced_class" TEXT NOT NULL,
    "tier" INTEGER NOT NULL,
    "required_level" INTEGER NOT NULL,
    "quest_id" TEXT,
    "skills" JSONB NOT NULL,
    "stat_bonus" JSONB NOT NULL,
    "ultimate_skill" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "class_advancements_pkey" PRIMARY KEY ("id")
);

-- 유니크 제약: 하나의 베이스 클래스당 하나의 전직 티어
CREATE UNIQUE INDEX "class_advancements_base_class_tier_key" ON "class_advancements"("base_class", "tier");
