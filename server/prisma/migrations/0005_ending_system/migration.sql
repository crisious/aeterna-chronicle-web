-- 0005_ending_system: 엔딩 달성 기록 테이블
-- P3-11 멀티 엔딩 시스템

CREATE TABLE "ending_records" (
    "id"           TEXT NOT NULL,
    "user_id"      TEXT NOT NULL,
    "ending_type"  TEXT NOT NULL,
    "flags"        JSONB NOT NULL,
    "playthrough"  INTEGER NOT NULL DEFAULT 1,
    "achieved_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ending_records_pkey" PRIMARY KEY ("id")
);

-- 인덱스: 유저별 조회 최적화
CREATE INDEX "ending_records_user_id_idx" ON "ending_records"("user_id");

-- 인덱스: 엔딩 타입별 통계 집계용
CREATE INDEX "ending_records_ending_type_idx" ON "ending_records"("ending_type");
