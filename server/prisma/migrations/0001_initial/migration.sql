-- CreateTable: User
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Character
CREATE TABLE "Character" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "exp" INTEGER NOT NULL DEFAULT 0,
    "hp" INTEGER NOT NULL DEFAULT 200,
    "mp" INTEGER NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "inventoryData" JSONB,

    CONSTRAINT "Character_pkey" PRIMARY KEY ("id")
);

-- CreateTable: telemetry_dialogue_choice_events
CREATE TABLE "telemetry_dialogue_choice_events" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "event_ts" TIMESTAMP(3) NOT NULL,
    "session_id" TEXT NOT NULL,
    "player_id_hash" TEXT NOT NULL,
    "chapter_id" TEXT NOT NULL,
    "scene_id" TEXT NOT NULL,
    "npc_id" TEXT NOT NULL,
    "dialogue_node_id" TEXT NOT NULL,
    "choice_id" TEXT NOT NULL,
    "choice_text_key" TEXT NOT NULL,
    "input_mode" TEXT NOT NULL,
    "latency_ms" INTEGER,
    "party_comp" JSONB,
    "difficulty_tier" TEXT,
    "build_version" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "region" TEXT,
    "idempotency_key" TEXT NOT NULL,
    "deduped" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "telemetry_dialogue_choice_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable: telemetry_game_events
CREATE TABLE "telemetry_game_events" (
    "id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "event_ts" TIMESTAMP(3) NOT NULL,
    "session_id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "payload" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "telemetry_game_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: User.email unique
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex: Character.name unique
CREATE UNIQUE INDEX "Character_name_key" ON "Character"("name");

-- CreateIndex: Character.userId
CREATE INDEX "Character_userId_idx" ON "Character"("userId");

-- CreateIndex: telemetry_dialogue_choice_events.idempotency_key unique
CREATE UNIQUE INDEX "telemetry_dialogue_choice_events_idempotency_key_key" ON "telemetry_dialogue_choice_events"("idempotency_key");

-- CreateIndex: telemetry_dialogue_choice_events (chapter_id, scene_id, npc_id)
CREATE INDEX "telemetry_dialogue_choice_events_chapter_id_scene_id_npc_id_idx" ON "telemetry_dialogue_choice_events"("chapter_id", "scene_id", "npc_id");

-- CreateIndex: telemetry_dialogue_choice_events (session_id)
CREATE INDEX "telemetry_dialogue_choice_events_session_id_idx" ON "telemetry_dialogue_choice_events"("session_id");

-- CreateIndex: telemetry_dialogue_choice_events (event_ts)
CREATE INDEX "telemetry_dialogue_choice_events_event_ts_idx" ON "telemetry_dialogue_choice_events"("event_ts");

-- CreateIndex: telemetry_dialogue_choice_events (player_id_hash)
CREATE INDEX "telemetry_dialogue_choice_events_player_id_hash_idx" ON "telemetry_dialogue_choice_events"("player_id_hash");

-- CreateIndex: telemetry_game_events (event_type, event_ts)
CREATE INDEX "telemetry_game_events_event_type_event_ts_idx" ON "telemetry_game_events"("event_type", "event_ts");

-- CreateIndex: telemetry_game_events (session_id)
CREATE INDEX "telemetry_game_events_session_id_idx" ON "telemetry_game_events"("session_id");

-- CreateIndex: telemetry_game_events (player_id)
CREATE INDEX "telemetry_game_events_player_id_idx" ON "telemetry_game_events"("player_id");

-- AddForeignKey: Character → User
ALTER TABLE "Character" ADD CONSTRAINT "Character_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
