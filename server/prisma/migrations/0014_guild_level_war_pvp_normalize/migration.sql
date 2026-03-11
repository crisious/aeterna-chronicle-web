-- P6-06: 길드 스킬 테이블
CREATE TABLE "guild_skills" (
    "id"          TEXT NOT NULL PRIMARY KEY,
    "guild_id"    TEXT NOT NULL,
    "skill_code"  TEXT NOT NULL,
    "level"       INTEGER NOT NULL DEFAULT 1,
    "unlocked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "guild_skills_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "guilds"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "guild_skills_guild_id_skill_code_key" ON "guild_skills"("guild_id", "skill_code");

-- P6-07: 길드전 확장 필드 (거점 점령 + 승자)
ALTER TABLE "guild_wars" ADD COLUMN "winner_id"      TEXT;
ALTER TABLE "guild_wars" ADD COLUMN "fortress_a"     TEXT;
ALTER TABLE "guild_wars" ADD COLUMN "fortress_b"     TEXT;
ALTER TABLE "guild_wars" ADD COLUMN "fortress_c"     TEXT;
ALTER TABLE "guild_wars" ADD COLUMN "reward_claimed" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX "guild_wars_status_idx" ON "guild_wars"("status");
