-- P5-01: Monster System
CREATE TABLE "monsters" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "element" TEXT NOT NULL DEFAULT 'neutral',
    "level" INTEGER NOT NULL,
    "hp" INTEGER NOT NULL,
    "attack" INTEGER NOT NULL,
    "defense" INTEGER NOT NULL,
    "speed" INTEGER NOT NULL,
    "skills" JSONB DEFAULT '[]',
    "drop_table" JSONB NOT NULL,
    "exp_reward" INTEGER NOT NULL,
    "gold_reward" INTEGER NOT NULL,
    "behavior" JSONB NOT NULL,
    "location" TEXT,
    "respawn_time" INTEGER NOT NULL DEFAULT 30,
    "lore" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "monsters_code_key" ON "monsters"("code");
CREATE INDEX "monsters_type_idx" ON "monsters"("type");
CREATE INDEX "monsters_level_idx" ON "monsters"("level");
CREATE INDEX "monsters_location_idx" ON "monsters"("location");

CREATE TABLE "monster_spawns" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "monster_id" TEXT NOT NULL,
    "zone_id" TEXT NOT NULL,
    "pos_x" DOUBLE PRECISION NOT NULL,
    "pos_y" DOUBLE PRECISION NOT NULL,
    "max_count" INTEGER NOT NULL DEFAULT 3,
    "is_active" BOOLEAN NOT NULL DEFAULT true
);
CREATE INDEX "monster_spawns_zone_id_idx" ON "monster_spawns"("zone_id");
