-- CreateTable: 소셜 시스템 - 친구
CREATE TABLE "friendships" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "friend_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "friendships_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "friendships_user_id_idx" ON "friendships"("user_id");
CREATE INDEX "friendships_friend_id_idx" ON "friendships"("friend_id");
CREATE UNIQUE INDEX "friendships_user_id_friend_id_key" ON "friendships"("user_id", "friend_id");

-- CreateTable: 소셜 시스템 - 파티
CREATE TABLE "parties" (
    "id" TEXT NOT NULL,
    "leader_id" TEXT NOT NULL,
    "name" TEXT,
    "max_size" INTEGER NOT NULL DEFAULT 4,
    "members" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "parties_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "parties_leader_id_idx" ON "parties"("leader_id");

-- CreateTable: 소셜 시스템 - 우편
CREATE TABLE "mails" (
    "id" TEXT NOT NULL,
    "sender_id" TEXT,
    "receiver_id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "attachments" JSONB,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "is_collected" BOOLEAN NOT NULL DEFAULT false,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mails_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mails_receiver_id_idx" ON "mails"("receiver_id");
CREATE INDEX "mails_sender_id_idx" ON "mails"("sender_id");
