-- CreateTable: NPC 시스템
CREATE TABLE "npcs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT,
    "role" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "dialogue" JSONB NOT NULL,
    "schedule" JSONB,
    "behavior_tree" JSONB NOT NULL,
    "stats" JSONB,
    "shop_items" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "npcs_pkey" PRIMARY KEY ("id")
);

-- CreateTable: NPC 호감도
CREATE TABLE "npc_affinities" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "npc_id" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 0,
    "exp" INTEGER NOT NULL DEFAULT 0,
    "gifts" JSONB NOT NULL DEFAULT '[]',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "npc_affinities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "npcs_name_key" ON "npcs"("name");
CREATE INDEX "npcs_role_idx" ON "npcs"("role");
CREATE INDEX "npcs_location_idx" ON "npcs"("location");

-- CreateIndex
CREATE UNIQUE INDEX "npc_affinities_user_id_npc_id_key" ON "npc_affinities"("user_id", "npc_id");
