-- 0002_guild_system: 길드 시스템 테이블 생성

-- 길드 마스터 테이블
CREATE TABLE "guilds" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "tag" VARCHAR(5) NOT NULL,
    "leader_id" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "exp" INTEGER NOT NULL DEFAULT 0,
    "max_members" INTEGER NOT NULL DEFAULT 30,
    "notice" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guilds_pkey" PRIMARY KEY ("id")
);

-- 길드 멤버 테이블
CREATE TABLE "guild_members" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "guild_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guild_members_pkey" PRIMARY KEY ("id")
);

-- 길드전 테이블
CREATE TABLE "guild_wars" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "attacker_id" TEXT NOT NULL,
    "defender_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attacker_score" INTEGER NOT NULL DEFAULT 0,
    "defender_score" INTEGER NOT NULL DEFAULT 0,
    "started_at" TIMESTAMP(3),
    "ended_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guild_wars_pkey" PRIMARY KEY ("id")
);

-- 유니크 인덱스
CREATE UNIQUE INDEX "guilds_name_key" ON "guilds"("name");
CREATE UNIQUE INDEX "guilds_tag_key" ON "guilds"("tag");
CREATE UNIQUE INDEX "guild_members_guild_id_user_id_key" ON "guild_members"("guild_id", "user_id");

-- 외래 키 제약
ALTER TABLE "guild_members"
    ADD CONSTRAINT "guild_members_guild_id_fkey"
    FOREIGN KEY ("guild_id") REFERENCES "guilds"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "guild_wars"
    ADD CONSTRAINT "guild_wars_attacker_id_fkey"
    FOREIGN KEY ("attacker_id") REFERENCES "guilds"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "guild_wars"
    ADD CONSTRAINT "guild_wars_defender_id_fkey"
    FOREIGN KEY ("defender_id") REFERENCES "guilds"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
