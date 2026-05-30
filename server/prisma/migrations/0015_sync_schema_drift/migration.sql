-- 0015_sync_schema_drift
-- SECURITY/RELEASE: schema.prisma 110 모델 중 마이그레이션 누락분(74 테이블, db push 전용)을 정식 마이그레이션화.
-- prisma migrate diff --from-migrations(0001~0014) --to-schema-datamodel 으로 생성. migrate deploy 가 전체 110 테이블을 재현하도록 함.

-- AlterTable
ALTER TABLE "Character" ADD COLUMN     "account_id" TEXT,
ADD COLUMN     "chapter_progress" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "gold" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "guild_id" TEXT,
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "max_hp" INTEGER NOT NULL DEFAULT 200,
ADD COLUMN     "max_mp" INTEGER NOT NULL DEFAULT 100,
ADD COLUMN     "play_time_hours" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "season_pass_level" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "stat_points" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "ban_expires_at" TIMESTAMP(3),
ADD COLUMN     "ban_reason" TEXT,
ADD COLUMN     "banned_at" TIMESTAMP(3),
ADD COLUMN     "crystal" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "diamond" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "event_coin" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "gold" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "is_banned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "last_login_at" TIMESTAMP(3),
ADD COLUMN     "level" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "name" TEXT,
ADD COLUMN     "nickname" TEXT,
ADD COLUMN     "role" TEXT NOT NULL DEFAULT 'user',
ADD COLUMN     "tutorial_step" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "username" TEXT;

-- AlterTable
ALTER TABLE "achievements" ADD COLUMN     "icon_url" TEXT,
ADD COLUMN     "reward" TEXT;

-- AlterTable
ALTER TABLE "codex_entries" ADD COLUMN     "code" TEXT,
ADD COLUMN     "content" TEXT,
ADD COLUMN     "title" TEXT,
ADD COLUMN     "unlock_condition" TEXT,
ALTER COLUMN "user_id" SET DEFAULT '',
ALTER COLUMN "category" SET DEFAULT '',
ALTER COLUMN "target_code" SET DEFAULT '';

-- AlterTable
ALTER TABLE "dungeon_runs" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "duration_min" DOUBLE PRECISION,
ADD COLUMN     "result" TEXT;

-- AlterTable
ALTER TABLE "dungeons" ADD COLUMN     "daily_run_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "recommended_level" INTEGER,
ADD COLUMN     "tags" JSONB;

-- AlterTable
ALTER TABLE "guild_members" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "guild_wars" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "guilds" ADD COLUMN     "gold" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "member_count" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "monsters" ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ALTER COLUMN "skills" SET NOT NULL;

-- AlterTable
ALTER TABLE "parties" DROP COLUMN "members";

-- AlterTable
ALTER TABLE "purchases" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "season_pass_progress" ADD COLUMN     "season_id" TEXT,
ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "season_passes" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "shop_items" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "titles" ADD COLUMN     "earned_at" TIMESTAMP(3),
ADD COLUMN     "title_id" TEXT,
ADD COLUMN     "user_id" TEXT,
ALTER COLUMN "name" DROP NOT NULL;

-- CreateTable
CREATE TABLE "admin_audit_logs" (
    "id" TEXT NOT NULL,
    "admin_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" TEXT,
    "details" JSONB,
    "ip" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "announcements" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'info',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "start_at" TIMESTAMP(3),
    "end_at" TIMESTAMP(3),
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "announcements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_events" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "rewards" JSONB NOT NULL,
    "start_at" TIMESTAMP(3) NOT NULL,
    "end_at" TIMESTAMP(3) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "game_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_records" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "day" INTEGER NOT NULL,
    "reward" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_progress" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "progress" JSONB NOT NULL,
    "claimed" JSONB NOT NULL DEFAULT '[]',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transaction_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "balance" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "reference_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transaction_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_titles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title_id" TEXT NOT NULL,
    "equipped_at" TIMESTAMP(3),
    "granted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_titles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pets" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "species" TEXT NOT NULL,
    "family" TEXT,
    "grade" TEXT NOT NULL DEFAULT 'common',
    "level" INTEGER NOT NULL DEFAULT 1,
    "exp" INTEGER NOT NULL DEFAULT 0,
    "max_exp" INTEGER NOT NULL DEFAULT 100,
    "hp" INTEGER NOT NULL DEFAULT 100,
    "attack" INTEGER NOT NULL DEFAULT 10,
    "defense" INTEGER NOT NULL DEFAULT 5,
    "affinity" INTEGER NOT NULL DEFAULT 0,
    "evolution_stage" TEXT NOT NULL DEFAULT 'baby',
    "appearance_key" TEXT,
    "skills" JSONB NOT NULL DEFAULT '[]',
    "bond" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "obtained_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pet_skills" (
    "id" TEXT NOT NULL,
    "pet_id" TEXT NOT NULL,
    "skill_id" TEXT NOT NULL,
    "name" TEXT,
    "description" TEXT,
    "damage" INTEGER NOT NULL DEFAULT 0,
    "cooldown" INTEGER NOT NULL DEFAULT 10,
    "effect_type" TEXT,
    "target_type" TEXT NOT NULL DEFAULT 'single',
    "unlock_level" INTEGER NOT NULL DEFAULT 1,
    "unlocked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pet_skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quests" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "chapter" INTEGER,
    "required_level" INTEGER NOT NULL DEFAULT 1,
    "prerequisites" JSONB NOT NULL DEFAULT '[]',
    "objectives" JSONB NOT NULL,
    "rewards" JSONB NOT NULL,
    "npc_id" TEXT,
    "time_limit" INTEGER,
    "is_repeatable" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "tags" JSONB,
    "difficulty" INTEGER,
    "daily_completion_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quest_progress" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "character_id" TEXT,
    "quest_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'in_progress',
    "progress" JSONB NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "quest_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "items" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "sub_type" TEXT,
    "grade" TEXT NOT NULL DEFAULT 'common',
    "level" INTEGER NOT NULL DEFAULT 1,
    "stats" JSONB,
    "price" INTEGER NOT NULL DEFAULT 0,
    "sell_price" INTEGER NOT NULL DEFAULT 0,
    "stackable" BOOLEAN NOT NULL DEFAULT false,
    "max_stack" INTEGER NOT NULL DEFAULT 1,
    "tradeable" BOOLEAN NOT NULL DEFAULT true,
    "icon" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "tags" JSONB,
    "required_level" INTEGER,
    "class_restriction" TEXT,
    "daily_usage_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_slots" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "enhancement" INTEGER NOT NULL DEFAULT 0,
    "options" JSONB,
    "is_equipped" BOOLEAN NOT NULL DEFAULT false,
    "equip_slot" TEXT,
    "obtained_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skills" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "class" TEXT NOT NULL,
    "tier" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "element" TEXT NOT NULL DEFAULT 'neutral',
    "damage" INTEGER NOT NULL DEFAULT 0,
    "damage_scale" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "mp_cost" INTEGER NOT NULL DEFAULT 0,
    "cooldown" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cast_time" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "range" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "target_type" TEXT NOT NULL DEFAULT 'single',
    "aoe_radius" DOUBLE PRECISION,
    "effect" JSONB,
    "max_level" INTEGER NOT NULL DEFAULT 5,
    "level_scaling" JSONB NOT NULL,
    "prerequisites" JSONB NOT NULL DEFAULT '[]',
    "required_level" INTEGER NOT NULL DEFAULT 1,
    "icon" TEXT,
    "animation" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "branch_group" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_skills" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "character_id" TEXT,
    "skill_id" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "is_equipped" BOOLEAN NOT NULL DEFAULT false,
    "slot_index" INTEGER,
    "unlocked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "player_skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auction_listings" (
    "id" TEXT NOT NULL,
    "seller_id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "slot_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "price_type" TEXT NOT NULL DEFAULT 'gold',
    "buyout_price" INTEGER NOT NULL,
    "bid_price" INTEGER,
    "current_bid" INTEGER,
    "bidder_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "fee" INTEGER NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auction_listings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ranking_entries" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "rank" INTEGER,
    "season" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ranking_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_receipts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'KRW',
    "crystal_amount" INTEGER NOT NULL,
    "receipt_data" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "refund_status" TEXT,
    "verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cosmetic_items" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "rarity" TEXT NOT NULL DEFAULT 'rare',
    "price_type" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "affects_stats" BOOLEAN NOT NULL DEFAULT false,
    "preview" TEXT,
    "description" TEXT,
    "is_limited" BOOLEAN NOT NULL DEFAULT false,
    "available_from" TIMESTAMP(3),
    "available_to" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cosmetic_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_cosmetics" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "cosmetic_id" TEXT NOT NULL,
    "is_equipped" BOOLEAN NOT NULL DEFAULT false,
    "equipped_slot" TEXT,
    "acquired_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "player_cosmetics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matchmaking_tickets" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "queue_type" TEXT NOT NULL,
    "content_id" TEXT,
    "role" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "gear_score" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'waiting',
    "matched_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "matchmaking_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chapter_progress" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "chapter" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'locked',
    "completed_at" TIMESTAMP(3),
    "flags" JSONB NOT NULL DEFAULT '{}',
    "cutscenes_seen" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chapter_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "save_slots" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "slot" INTEGER NOT NULL,
    "label" TEXT,
    "data" JSONB NOT NULL,
    "playtime" INTEGER NOT NULL DEFAULT 0,
    "chapter" INTEGER NOT NULL DEFAULT 1,
    "level" INTEGER NOT NULL DEFAULT 1,
    "location" TEXT,
    "thumbnail" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "save_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "beta_invites" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "email" TEXT,
    "used_by" TEXT,
    "is_used" BOOLEAN NOT NULL DEFAULT false,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "beta_invites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedback_reports" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "status" TEXT NOT NULL DEFAULT 'open',
    "screenshot" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedback_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "reporter_id" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "evidence" JSONB,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewer_id" TEXT,
    "action" TEXT,
    "review_note" TEXT,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sanctions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "level" TEXT,
    "reason" TEXT NOT NULL,
    "evidence" TEXT,
    "duration" INTEGER,
    "issued_by" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "expires_at" TIMESTAMP(3),
    "applied_by" TEXT,
    "revoked_at" TIMESTAMP(3),
    "revoked_by" TEXT,
    "revoke_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sanctions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guild_houses" (
    "guild_id" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "furniture_slots" INTEGER NOT NULL DEFAULT 10,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guild_houses_pkey" PRIMARY KEY ("guild_id")
);

-- CreateTable
CREATE TABLE "guild_house_furniture" (
    "id" TEXT NOT NULL,
    "guild_id" TEXT NOT NULL,
    "slot_index" INTEGER NOT NULL,
    "furniture_id" TEXT NOT NULL,
    "placed_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guild_house_furniture_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guild_raids" (
    "id" TEXT NOT NULL,
    "guild_id" TEXT NOT NULL,
    "boss_id" TEXT NOT NULL,
    "leader_id" TEXT NOT NULL,
    "participants" TEXT[],
    "status" TEXT NOT NULL,
    "scaled_boss_hp" INTEGER,
    "total_damage" BIGINT,
    "duration_ms" INTEGER,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guild_raids_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kpi_snapshots" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "metric" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "segment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kpi_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_houses" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "theme_code" TEXT NOT NULL,
    "max_slots" INTEGER NOT NULL DEFAULT 10,
    "max_visitors" INTEGER NOT NULL DEFAULT 4,
    "furniture" JSONB NOT NULL DEFAULT '[]',
    "is_public" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "player_houses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "house_furniture" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "furniture_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "rarity" TEXT NOT NULL DEFAULT 'common',
    "is_placed" BOOLEAN NOT NULL DEFAULT false,
    "acquired_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "house_furniture_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_participations" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "rank" INTEGER,
    "rewards" JSONB NOT NULL DEFAULT '[]',
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_participations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consent_records" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "consent_type" TEXT NOT NULL,
    "granted" BOOLEAN NOT NULL DEFAULT false,
    "version" TEXT NOT NULL,
    "granted_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consent_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "login_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "device_name" TEXT NOT NULL,
    "device_type" TEXT NOT NULL,
    "ip_address" TEXT NOT NULL,
    "user_agent" TEXT NOT NULL,
    "access_token" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_active_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "login_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shares" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "resource_id" TEXT NOT NULL,
    "message" TEXT,
    "image_url" TEXT,
    "og_meta" JSONB NOT NULL,
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shares_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referral_codes" (
    "code" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "used_count" INTEGER NOT NULL DEFAULT 0,
    "max_uses" INTEGER NOT NULL DEFAULT 50,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "referral_codes_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "referral_rewards" (
    "id" TEXT NOT NULL,
    "referrer_id" TEXT NOT NULL,
    "referred_id" TEXT NOT NULL,
    "code_used" TEXT NOT NULL,
    "reward_type" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "side" TEXT NOT NULL,
    "claimed" BOOLEAN NOT NULL DEFAULT false,
    "claimed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "referral_rewards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ugc_posts" (
    "id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "image_url" TEXT,
    "build_data" JSONB,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "like_count" INTEGER NOT NULL DEFAULT 0,
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "report_count" INTEGER NOT NULL DEFAULT 0,
    "is_hidden" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ugc_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ugc_likes" (
    "id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ugc_likes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_events" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "start_at" TIMESTAMP(3) NOT NULL,
    "end_at" TIMESTAMP(3) NOT NULL,
    "config" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "participant_count" INTEGER NOT NULL DEFAULT 0,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "community_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trades" (
    "id" TEXT NOT NULL,
    "requester_id" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "expires_at" TIMESTAMP(3),
    "requester_offer" JSONB,
    "target_offer" JSONB,
    "requester_confirmed" BOOLEAN NOT NULL DEFAULT false,
    "target_confirmed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_tickets" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "assigned_to" TEXT,
    "resolution" TEXT,
    "closed_at" TIMESTAMP(3),
    "closed_by" TEXT,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_messages" (
    "id" TEXT NOT NULL,
    "ticket_id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "sender_type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "attachments" JSONB NOT NULL DEFAULT '[]',
    "is_internal" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_feed_entries" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "visibility" TEXT NOT NULL DEFAULT 'FRIENDS',
    "payload" JSONB NOT NULL DEFAULT '{}',
    "summary" TEXT NOT NULL,
    "like_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_feed_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feed_likes" (
    "id" TEXT NOT NULL,
    "entry_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feed_likes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tuning_proposals" (
    "id" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_name" TEXT NOT NULL,
    "parameter" TEXT NOT NULL,
    "current_value" DOUBLE PRECISION NOT NULL,
    "proposed_value" DOUBLE PRECISION NOT NULL,
    "change_percent" DOUBLE PRECISION NOT NULL,
    "reason" TEXT NOT NULL,
    "metrics" JSONB NOT NULL DEFAULT '{}',
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewed_at" TIMESTAMP(3),
    "reviewed_by" TEXT,
    "reject_reason" TEXT,
    "applied_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tuning_proposals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ab_experiments" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "feature_key" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "traffic_percent" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "assignment_method" TEXT NOT NULL DEFAULT 'user_id_hash',
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "min_sample_size" INTEGER NOT NULL DEFAULT 500,
    "significance_level" DOUBLE PRECISION NOT NULL DEFAULT 0.05,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ab_experiments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ab_variants" (
    "id" TEXT NOT NULL,
    "experiment_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "config" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "ab_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ab_assignments" (
    "id" TEXT NOT NULL,
    "experiment_id" TEXT NOT NULL,
    "variant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "converted" BOOLEAN NOT NULL DEFAULT false,
    "converted_at" TIMESTAMP(3),
    "metric_value" DOUBLE PRECISION,

    CONSTRAINT "ab_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "party_members" (
    "id" TEXT NOT NULL,
    "party_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "combat_ready" BOOLEAN NOT NULL DEFAULT false,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "party_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "party_invites" (
    "id" TEXT NOT NULL,
    "party_id" TEXT NOT NULL,
    "inviter_id" TEXT NOT NULL,
    "target_user_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "party_invites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "combat_logs" (
    "id" TEXT NOT NULL,
    "dungeon_id" TEXT,
    "skill_id" TEXT,
    "player_id" TEXT,
    "target_id" TEXT,
    "target_type" TEXT,
    "result" TEXT,
    "damage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "duration_min" DOUBLE PRECISION,
    "is_clear" BOOLEAN NOT NULL DEFAULT false,
    "duration" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "combat_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skill_usage_stats" (
    "id" TEXT NOT NULL,
    "skill_id" TEXT NOT NULL,
    "user_id" TEXT,
    "use_count" INTEGER NOT NULL DEFAULT 1,
    "total_damage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "win_rate" DOUBLE PRECISION,
    "play_time_min" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "skill_usage_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dungeon_clears" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "dungeon_id" TEXT NOT NULL,
    "clear_time" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dungeon_clears_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "endless_dungeon_progress" (
    "id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "week_id" TEXT NOT NULL,
    "highest_floor" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "endless_dungeon_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipment" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "item_id" TEXT,
    "name" TEXT,
    "transcendence_level" INTEGER NOT NULL DEFAULT 0,
    "is_destroyed" BOOLEAN NOT NULL DEFAULT false,
    "stats" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transcendence_logs" (
    "id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "equipment_id" TEXT NOT NULL,
    "previous_level" INTEGER NOT NULL,
    "target_level" INTEGER NOT NULL,
    "result_level" INTEGER NOT NULL,
    "success" BOOLEAN NOT NULL,
    "destroyed" BOOLEAN NOT NULL DEFAULT false,
    "protected" BOOLEAN NOT NULL DEFAULT false,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transcendence_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_saves" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "state" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "game_saves_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_items" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "character_id" TEXT,
    "item_id" TEXT NOT NULL,
    "item_code" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "amount" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quest_completions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "quest_id" TEXT NOT NULL,
    "pet_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quest_completions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "story_progress" (
    "id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "current_chapter" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "story_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pvp_rankings" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL DEFAULT 1000,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "pvp_rankings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pvp_season_rewards" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "tier" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "rewards" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pvp_season_rewards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_achievements" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "achievement_id" TEXT NOT NULL,
    "unlocked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_achievements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_actions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "action_type" TEXT NOT NULL,
    "rating" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pet_evolution_history" (
    "id" TEXT NOT NULL,
    "pet_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "pet_family" TEXT NOT NULL,
    "from_stage" TEXT NOT NULL,
    "to_stage" TEXT NOT NULL,
    "materials_consumed" JSONB NOT NULL DEFAULT '[]',
    "stats_before" JSONB NOT NULL DEFAULT '{}',
    "stats_after" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pet_evolution_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "players" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "nickname" TEXT,
    "level" INTEGER NOT NULL DEFAULT 1,
    "class_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "character_skills" (
    "id" TEXT NOT NULL,
    "character_id" TEXT NOT NULL,
    "skill_id" TEXT NOT NULL,
    "skill_code" TEXT,
    "level" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "character_skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "furnitures" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "rarity" TEXT NOT NULL DEFAULT 'common',
    "description" TEXT,
    "effect" JSONB,
    "recipe" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "furnitures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pvp_maps" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_en" TEXT,
    "name_ja" TEXT,
    "season" INTEGER NOT NULL DEFAULT 1,
    "description" TEXT,
    "width" INTEGER NOT NULL DEFAULT 20,
    "height" INTEGER NOT NULL DEFAULT 20,
    "environment_effects" JSONB,
    "terrain_features" JSONB,
    "spawn_points" JSONB,
    "min_rating" INTEGER NOT NULL DEFAULT 0,
    "unlock_condition" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pvp_maps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "world_bosses" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "max_hp" INTEGER NOT NULL,
    "attack" INTEGER NOT NULL DEFAULT 0,
    "defense" INTEGER NOT NULL DEFAULT 0,
    "skills" JSONB,
    "phases" JSONB,
    "loot_table" JSONB,
    "required_level" INTEGER NOT NULL DEFAULT 1,
    "weekly_schedule" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "world_bosses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dialogues" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "chapter" INTEGER NOT NULL DEFAULT 0,
    "scene" TEXT,
    "speaker" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "portrait" TEXT,
    "voice_key" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "next_code" TEXT,
    "choices" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dialogues_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "admin_audit_logs_admin_id_idx" ON "admin_audit_logs"("admin_id");

-- CreateIndex
CREATE INDEX "admin_audit_logs_action_idx" ON "admin_audit_logs"("action");

-- CreateIndex
CREATE INDEX "admin_audit_logs_created_at_idx" ON "admin_audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "announcements_is_active_start_at_end_at_idx" ON "announcements"("is_active", "start_at", "end_at");

-- CreateIndex
CREATE UNIQUE INDEX "game_events_code_key" ON "game_events"("code");

-- CreateIndex
CREATE INDEX "game_events_type_idx" ON "game_events"("type");

-- CreateIndex
CREATE INDEX "game_events_is_active_start_at_end_at_idx" ON "game_events"("is_active", "start_at", "end_at");

-- CreateIndex
CREATE INDEX "attendance_records_user_id_idx" ON "attendance_records"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_records_user_id_date_key" ON "attendance_records"("user_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "event_progress_user_id_event_id_key" ON "event_progress"("user_id", "event_id");

-- CreateIndex
CREATE INDEX "transaction_logs_user_id_idx" ON "transaction_logs"("user_id");

-- CreateIndex
CREATE INDEX "transaction_logs_currency_idx" ON "transaction_logs"("currency");

-- CreateIndex
CREATE INDEX "transaction_logs_created_at_idx" ON "transaction_logs"("created_at");

-- CreateIndex
CREATE INDEX "user_titles_user_id_idx" ON "user_titles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_titles_user_id_title_id_key" ON "user_titles"("user_id", "title_id");

-- CreateIndex
CREATE INDEX "pets_owner_id_idx" ON "pets"("owner_id");

-- CreateIndex
CREATE INDEX "pets_species_idx" ON "pets"("species");

-- CreateIndex
CREATE INDEX "pet_skills_pet_id_idx" ON "pet_skills"("pet_id");

-- CreateIndex
CREATE UNIQUE INDEX "pet_skills_pet_id_skill_id_key" ON "pet_skills"("pet_id", "skill_id");

-- CreateIndex
CREATE UNIQUE INDEX "quests_code_key" ON "quests"("code");

-- CreateIndex
CREATE INDEX "quests_type_idx" ON "quests"("type");

-- CreateIndex
CREATE INDEX "quest_progress_user_id_idx" ON "quest_progress"("user_id");

-- CreateIndex
CREATE INDEX "quest_progress_user_id_status_idx" ON "quest_progress"("user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "quest_progress_user_id_quest_id_key" ON "quest_progress"("user_id", "quest_id");

-- CreateIndex
CREATE UNIQUE INDEX "items_code_key" ON "items"("code");

-- CreateIndex
CREATE INDEX "items_type_idx" ON "items"("type");

-- CreateIndex
CREATE INDEX "items_grade_idx" ON "items"("grade");

-- CreateIndex
CREATE INDEX "inventory_slots_user_id_idx" ON "inventory_slots"("user_id");

-- CreateIndex
CREATE INDEX "inventory_slots_item_id_idx" ON "inventory_slots"("item_id");

-- CreateIndex
CREATE UNIQUE INDEX "skills_code_key" ON "skills"("code");

-- CreateIndex
CREATE INDEX "skills_class_idx" ON "skills"("class");

-- CreateIndex
CREATE INDEX "skills_tier_idx" ON "skills"("tier");

-- CreateIndex
CREATE INDEX "player_skills_user_id_idx" ON "player_skills"("user_id");

-- CreateIndex
CREATE INDEX "player_skills_character_id_idx" ON "player_skills"("character_id");

-- CreateIndex
CREATE UNIQUE INDEX "player_skills_user_id_skill_id_key" ON "player_skills"("user_id", "skill_id");

-- CreateIndex
CREATE INDEX "auction_listings_seller_id_idx" ON "auction_listings"("seller_id");

-- CreateIndex
CREATE INDEX "auction_listings_item_id_idx" ON "auction_listings"("item_id");

-- CreateIndex
CREATE INDEX "auction_listings_status_idx" ON "auction_listings"("status");

-- CreateIndex
CREATE INDEX "auction_listings_expires_at_idx" ON "auction_listings"("expires_at");

-- CreateIndex
CREATE INDEX "ranking_entries_category_score_idx" ON "ranking_entries"("category", "score");

-- CreateIndex
CREATE UNIQUE INDEX "ranking_entries_user_id_category_season_key" ON "ranking_entries"("user_id", "category", "season");

-- CreateIndex
CREATE INDEX "payment_receipts_user_id_idx" ON "payment_receipts"("user_id");

-- CreateIndex
CREATE INDEX "payment_receipts_status_idx" ON "payment_receipts"("status");

-- CreateIndex
CREATE INDEX "payment_receipts_status_created_at_idx" ON "payment_receipts"("status", "created_at");

-- CreateIndex
CREATE INDEX "payment_receipts_user_id_status_idx" ON "payment_receipts"("user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "cosmetic_items_code_key" ON "cosmetic_items"("code");

-- CreateIndex
CREATE INDEX "cosmetic_items_category_idx" ON "cosmetic_items"("category");

-- CreateIndex
CREATE INDEX "player_cosmetics_user_id_idx" ON "player_cosmetics"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "player_cosmetics_user_id_cosmetic_id_key" ON "player_cosmetics"("user_id", "cosmetic_id");

-- CreateIndex
CREATE INDEX "matchmaking_tickets_queue_type_status_idx" ON "matchmaking_tickets"("queue_type", "status");

-- CreateIndex
CREATE INDEX "matchmaking_tickets_user_id_idx" ON "matchmaking_tickets"("user_id");

-- CreateIndex
CREATE INDEX "chapter_progress_user_id_idx" ON "chapter_progress"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "chapter_progress_user_id_chapter_key" ON "chapter_progress"("user_id", "chapter");

-- CreateIndex
CREATE INDEX "save_slots_user_id_idx" ON "save_slots"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "save_slots_user_id_slot_key" ON "save_slots"("user_id", "slot");

-- CreateIndex
CREATE UNIQUE INDEX "beta_invites_code_key" ON "beta_invites"("code");

-- CreateIndex
CREATE INDEX "beta_invites_code_idx" ON "beta_invites"("code");

-- CreateIndex
CREATE INDEX "feedback_reports_type_idx" ON "feedback_reports"("type");

-- CreateIndex
CREATE INDEX "feedback_reports_status_idx" ON "feedback_reports"("status");

-- CreateIndex
CREATE INDEX "reports_target_id_idx" ON "reports"("target_id");

-- CreateIndex
CREATE INDEX "reports_status_idx" ON "reports"("status");

-- CreateIndex
CREATE INDEX "sanctions_user_id_idx" ON "sanctions"("user_id");

-- CreateIndex
CREATE INDEX "sanctions_is_active_idx" ON "sanctions"("is_active");

-- CreateIndex
CREATE INDEX "sanctions_is_active_expires_at_idx" ON "sanctions"("is_active", "expires_at");

-- CreateIndex
CREATE INDEX "guild_house_furniture_guild_id_idx" ON "guild_house_furniture"("guild_id");

-- CreateIndex
CREATE UNIQUE INDEX "guild_house_furniture_guild_id_slot_index_key" ON "guild_house_furniture"("guild_id", "slot_index");

-- CreateIndex
CREATE INDEX "guild_raids_guild_id_idx" ON "guild_raids"("guild_id");

-- CreateIndex
CREATE INDEX "guild_raids_guild_id_created_at_idx" ON "guild_raids"("guild_id", "created_at");

-- CreateIndex
CREATE INDEX "kpi_snapshots_metric_idx" ON "kpi_snapshots"("metric");

-- CreateIndex
CREATE INDEX "kpi_snapshots_date_idx" ON "kpi_snapshots"("date");

-- CreateIndex
CREATE UNIQUE INDEX "kpi_snapshots_date_metric_segment_key" ON "kpi_snapshots"("date", "metric", "segment");

-- CreateIndex
CREATE UNIQUE INDEX "player_houses_user_id_key" ON "player_houses"("user_id");

-- CreateIndex
CREATE INDEX "player_houses_is_public_idx" ON "player_houses"("is_public");

-- CreateIndex
CREATE INDEX "house_furniture_user_id_idx" ON "house_furniture"("user_id");

-- CreateIndex
CREATE INDEX "house_furniture_user_id_is_placed_idx" ON "house_furniture"("user_id", "is_placed");

-- CreateIndex
CREATE INDEX "event_participations_event_id_idx" ON "event_participations"("event_id");

-- CreateIndex
CREATE INDEX "event_participations_event_id_score_idx" ON "event_participations"("event_id", "score");

-- CreateIndex
CREATE UNIQUE INDEX "event_participations_user_id_event_id_key" ON "event_participations"("user_id", "event_id");

-- CreateIndex
CREATE INDEX "consent_records_user_id_idx" ON "consent_records"("user_id");

-- CreateIndex
CREATE INDEX "consent_records_consent_type_idx" ON "consent_records"("consent_type");

-- CreateIndex
CREATE UNIQUE INDEX "consent_records_user_id_consent_type_key" ON "consent_records"("user_id", "consent_type");

-- CreateIndex
CREATE INDEX "login_sessions_user_id_idx" ON "login_sessions"("user_id");

-- CreateIndex
CREATE INDEX "login_sessions_user_id_is_active_idx" ON "login_sessions"("user_id", "is_active");

-- CreateIndex
CREATE INDEX "login_sessions_is_active_idx" ON "login_sessions"("is_active");

-- CreateIndex
CREATE INDEX "shares_user_id_idx" ON "shares"("user_id");

-- CreateIndex
CREATE INDEX "shares_type_idx" ON "shares"("type");

-- CreateIndex
CREATE UNIQUE INDEX "referral_codes_code_key" ON "referral_codes"("code");

-- CreateIndex
CREATE INDEX "referral_codes_owner_id_idx" ON "referral_codes"("owner_id");

-- CreateIndex
CREATE INDEX "referral_rewards_referrer_id_idx" ON "referral_rewards"("referrer_id");

-- CreateIndex
CREATE INDEX "referral_rewards_referred_id_idx" ON "referral_rewards"("referred_id");

-- CreateIndex
CREATE INDEX "referral_rewards_code_used_idx" ON "referral_rewards"("code_used");

-- CreateIndex
CREATE INDEX "ugc_posts_author_id_idx" ON "ugc_posts"("author_id");

-- CreateIndex
CREATE INDEX "ugc_posts_type_idx" ON "ugc_posts"("type");

-- CreateIndex
CREATE INDEX "ugc_posts_is_hidden_created_at_idx" ON "ugc_posts"("is_hidden", "created_at");

-- CreateIndex
CREATE INDEX "ugc_posts_is_hidden_like_count_idx" ON "ugc_posts"("is_hidden", "like_count");

-- CreateIndex
CREATE INDEX "ugc_likes_post_id_idx" ON "ugc_likes"("post_id");

-- CreateIndex
CREATE INDEX "ugc_likes_user_id_idx" ON "ugc_likes"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "ugc_likes_post_id_user_id_key" ON "ugc_likes"("post_id", "user_id");

-- CreateIndex
CREATE INDEX "community_events_status_idx" ON "community_events"("status");

-- CreateIndex
CREATE INDEX "community_events_start_at_idx" ON "community_events"("start_at");

-- CreateIndex
CREATE INDEX "community_events_end_at_idx" ON "community_events"("end_at");

-- CreateIndex
CREATE INDEX "trades_requester_id_idx" ON "trades"("requester_id");

-- CreateIndex
CREATE INDEX "trades_target_id_idx" ON "trades"("target_id");

-- CreateIndex
CREATE INDEX "trades_status_idx" ON "trades"("status");

-- CreateIndex
CREATE INDEX "support_tickets_user_id_idx" ON "support_tickets"("user_id");

-- CreateIndex
CREATE INDEX "support_tickets_status_idx" ON "support_tickets"("status");

-- CreateIndex
CREATE INDEX "support_tickets_priority_idx" ON "support_tickets"("priority");

-- CreateIndex
CREATE INDEX "support_tickets_assigned_to_idx" ON "support_tickets"("assigned_to");

-- CreateIndex
CREATE INDEX "ticket_messages_ticket_id_idx" ON "ticket_messages"("ticket_id");

-- CreateIndex
CREATE INDEX "activity_feed_entries_user_id_idx" ON "activity_feed_entries"("user_id");

-- CreateIndex
CREATE INDEX "activity_feed_entries_event_type_idx" ON "activity_feed_entries"("event_type");

-- CreateIndex
CREATE INDEX "activity_feed_entries_created_at_idx" ON "activity_feed_entries"("created_at");

-- CreateIndex
CREATE INDEX "feed_likes_entry_id_idx" ON "feed_likes"("entry_id");

-- CreateIndex
CREATE INDEX "feed_likes_user_id_idx" ON "feed_likes"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "feed_likes_entry_id_user_id_key" ON "feed_likes"("entry_id", "user_id");

-- CreateIndex
CREATE INDEX "tuning_proposals_status_idx" ON "tuning_proposals"("status");

-- CreateIndex
CREATE INDEX "tuning_proposals_target_type_idx" ON "tuning_proposals"("target_type");

-- CreateIndex
CREATE INDEX "ab_experiments_feature_key_idx" ON "ab_experiments"("feature_key");

-- CreateIndex
CREATE INDEX "ab_experiments_status_idx" ON "ab_experiments"("status");

-- CreateIndex
CREATE INDEX "ab_variants_experiment_id_idx" ON "ab_variants"("experiment_id");

-- CreateIndex
CREATE INDEX "ab_assignments_experiment_id_idx" ON "ab_assignments"("experiment_id");

-- CreateIndex
CREATE INDEX "ab_assignments_user_id_idx" ON "ab_assignments"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "ab_assignments_experiment_id_user_id_key" ON "ab_assignments"("experiment_id", "user_id");

-- CreateIndex
CREATE INDEX "party_members_party_id_idx" ON "party_members"("party_id");

-- CreateIndex
CREATE INDEX "party_members_user_id_idx" ON "party_members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "party_members_party_id_user_id_key" ON "party_members"("party_id", "user_id");

-- CreateIndex
CREATE INDEX "party_invites_party_id_idx" ON "party_invites"("party_id");

-- CreateIndex
CREATE INDEX "party_invites_target_user_id_idx" ON "party_invites"("target_user_id");

-- CreateIndex
CREATE INDEX "combat_logs_skill_id_idx" ON "combat_logs"("skill_id");

-- CreateIndex
CREATE INDEX "combat_logs_dungeon_id_idx" ON "combat_logs"("dungeon_id");

-- CreateIndex
CREATE INDEX "combat_logs_target_id_idx" ON "combat_logs"("target_id");

-- CreateIndex
CREATE INDEX "combat_logs_created_at_idx" ON "combat_logs"("created_at");

-- CreateIndex
CREATE INDEX "skill_usage_stats_skill_id_idx" ON "skill_usage_stats"("skill_id");

-- CreateIndex
CREATE INDEX "skill_usage_stats_created_at_idx" ON "skill_usage_stats"("created_at");

-- CreateIndex
CREATE INDEX "dungeon_clears_user_id_idx" ON "dungeon_clears"("user_id");

-- CreateIndex
CREATE INDEX "dungeon_clears_dungeon_id_idx" ON "dungeon_clears"("dungeon_id");

-- CreateIndex
CREATE INDEX "endless_dungeon_progress_player_id_idx" ON "endless_dungeon_progress"("player_id");

-- CreateIndex
CREATE UNIQUE INDEX "endless_dungeon_progress_player_id_week_id_key" ON "endless_dungeon_progress"("player_id", "week_id");

-- CreateIndex
CREATE INDEX "equipment_owner_id_idx" ON "equipment"("owner_id");

-- CreateIndex
CREATE INDEX "transcendence_logs_player_id_idx" ON "transcendence_logs"("player_id");

-- CreateIndex
CREATE INDEX "transcendence_logs_equipment_id_idx" ON "transcendence_logs"("equipment_id");

-- CreateIndex
CREATE INDEX "game_saves_user_id_idx" ON "game_saves"("user_id");

-- CreateIndex
CREATE INDEX "inventory_items_user_id_idx" ON "inventory_items"("user_id");

-- CreateIndex
CREATE INDEX "inventory_items_item_id_idx" ON "inventory_items"("item_id");

-- CreateIndex
CREATE INDEX "inventory_items_character_id_idx" ON "inventory_items"("character_id");

-- CreateIndex
CREATE INDEX "inventory_items_user_id_item_id_idx" ON "inventory_items"("user_id", "item_id");

-- CreateIndex
CREATE INDEX "quest_completions_user_id_idx" ON "quest_completions"("user_id");

-- CreateIndex
CREATE INDEX "quest_completions_quest_id_idx" ON "quest_completions"("quest_id");

-- CreateIndex
CREATE UNIQUE INDEX "story_progress_player_id_key" ON "story_progress"("player_id");

-- CreateIndex
CREATE INDEX "pvp_rankings_user_id_idx" ON "pvp_rankings"("user_id");

-- CreateIndex
CREATE INDEX "pvp_rankings_rating_idx" ON "pvp_rankings"("rating");

-- CreateIndex
CREATE INDEX "pvp_season_rewards_user_id_idx" ON "pvp_season_rewards"("user_id");

-- CreateIndex
CREATE INDEX "pvp_season_rewards_season_idx" ON "pvp_season_rewards"("season");

-- CreateIndex
CREATE INDEX "user_achievements_user_id_idx" ON "user_achievements"("user_id");

-- CreateIndex
CREATE INDEX "user_achievements_achievement_id_idx" ON "user_achievements"("achievement_id");

-- CreateIndex
CREATE INDEX "user_actions_user_id_idx" ON "user_actions"("user_id");

-- CreateIndex
CREATE INDEX "user_actions_target_type_idx" ON "user_actions"("target_type");

-- CreateIndex
CREATE INDEX "user_actions_created_at_idx" ON "user_actions"("created_at");

-- CreateIndex
CREATE INDEX "pet_evolution_history_pet_id_idx" ON "pet_evolution_history"("pet_id");

-- CreateIndex
CREATE INDEX "pet_evolution_history_user_id_idx" ON "pet_evolution_history"("user_id");

-- CreateIndex
CREATE INDEX "players_user_id_idx" ON "players"("user_id");

-- CreateIndex
CREATE INDEX "character_skills_character_id_idx" ON "character_skills"("character_id");

-- CreateIndex
CREATE UNIQUE INDEX "character_skills_character_id_skill_id_key" ON "character_skills"("character_id", "skill_id");

-- CreateIndex
CREATE UNIQUE INDEX "furnitures_code_key" ON "furnitures"("code");

-- CreateIndex
CREATE INDEX "furnitures_category_idx" ON "furnitures"("category");

-- CreateIndex
CREATE UNIQUE INDEX "pvp_maps_code_key" ON "pvp_maps"("code");

-- CreateIndex
CREATE INDEX "pvp_maps_season_idx" ON "pvp_maps"("season");

-- CreateIndex
CREATE UNIQUE INDEX "world_bosses_code_key" ON "world_bosses"("code");

-- CreateIndex
CREATE UNIQUE INDEX "dialogues_code_key" ON "dialogues"("code");

-- CreateIndex
CREATE INDEX "dialogues_chapter_scene_idx" ON "dialogues"("chapter", "scene");

-- CreateIndex
CREATE INDEX "Character_classId_level_idx" ON "Character"("classId", "level");

-- CreateIndex
CREATE INDEX "Character_account_id_idx" ON "Character"("account_id");

-- CreateIndex
CREATE INDEX "User_last_login_at_idx" ON "User"("last_login_at");

-- CreateIndex
CREATE INDEX "User_is_banned_idx" ON "User"("is_banned");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "codex_entries_code_key" ON "codex_entries"("code");

-- CreateIndex
CREATE INDEX "dungeon_runs_status_idx" ON "dungeon_runs"("status");

-- CreateIndex
CREATE INDEX "dungeon_runs_started_at_idx" ON "dungeon_runs"("started_at");

-- CreateIndex
CREATE INDEX "dungeon_runs_dungeon_id_status_idx" ON "dungeon_runs"("dungeon_id", "status");

-- CreateIndex
CREATE INDEX "mails_receiver_id_is_read_idx" ON "mails"("receiver_id", "is_read");

-- CreateIndex
CREATE INDEX "mails_expires_at_idx" ON "mails"("expires_at");

-- CreateIndex
CREATE INDEX "notifications_user_id_type_idx" ON "notifications"("user_id", "type");

-- CreateIndex
CREATE INDEX "purchases_item_id_idx" ON "purchases"("item_id");

-- CreateIndex
CREATE INDEX "purchases_created_at_idx" ON "purchases"("created_at");

-- CreateIndex
CREATE INDEX "purchases_user_id_created_at_idx" ON "purchases"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "shop_items_is_active_start_date_end_date_idx" ON "shop_items"("is_active", "start_date", "end_date");

-- CreateIndex
CREATE INDEX "shop_items_currency_idx" ON "shop_items"("currency");

-- AddForeignKey
ALTER TABLE "user_titles" ADD CONSTRAINT "user_titles_title_id_fkey" FOREIGN KEY ("title_id") REFERENCES "titles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pet_skills" ADD CONSTRAINT "pet_skills_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "pets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_skills" ADD CONSTRAINT "player_skills_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_skills" ADD CONSTRAINT "player_skills_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guild_house_furniture" ADD CONSTRAINT "guild_house_furniture_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "guild_houses"("guild_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_messages" ADD CONSTRAINT "ticket_messages_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "support_tickets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feed_likes" ADD CONSTRAINT "feed_likes_entry_id_fkey" FOREIGN KEY ("entry_id") REFERENCES "activity_feed_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ab_variants" ADD CONSTRAINT "ab_variants_experiment_id_fkey" FOREIGN KEY ("experiment_id") REFERENCES "ab_experiments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ab_assignments" ADD CONSTRAINT "ab_assignments_experiment_id_fkey" FOREIGN KEY ("experiment_id") REFERENCES "ab_experiments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "party_members" ADD CONSTRAINT "party_members_party_id_fkey" FOREIGN KEY ("party_id") REFERENCES "parties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "party_members" ADD CONSTRAINT "party_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "party_invites" ADD CONSTRAINT "party_invites_party_id_fkey" FOREIGN KEY ("party_id") REFERENCES "parties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment" ADD CONSTRAINT "equipment_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "Character"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_achievement_id_fkey" FOREIGN KEY ("achievement_id") REFERENCES "achievements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

