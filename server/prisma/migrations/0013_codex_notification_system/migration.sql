-- CreateTable: 도감/컬렉션 (P5-08)
CREATE TABLE "codex_entries" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "target_code" TEXT NOT NULL,
    "discovered" BOOLEAN NOT NULL DEFAULT true,
    "percentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unlocked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "codex_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "codex_entries_user_id_idx" ON "codex_entries"("user_id");
CREATE INDEX "codex_entries_category_idx" ON "codex_entries"("category");
CREATE UNIQUE INDEX "codex_entries_user_id_category_target_code_key" ON "codex_entries"("user_id", "category", "target_code");

-- CreateTable: 알림 시스템 (P5-10)
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notifications_user_id_is_read_idx" ON "notifications"("user_id", "is_read");
CREATE INDEX "notifications_created_at_idx" ON "notifications"("created_at");
