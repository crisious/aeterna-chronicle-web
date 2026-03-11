/**
 * P4-08: 경제 시스템 REST API 라우트
 *
 * GET /api/economy/report       — 일일 경제 리포트
 * GET /api/economy/inflation    — 인플레이션 지수
 * GET /api/economy/balance-check — 밸런스 검증
 * GET /api/economy/enhancement-table — 강화 비용 테이블
 * GET /api/economy/grade-prices  — 등급별 가격 범위
 */

import { FastifyInstance, FastifyRequest } from 'fastify';
import { economySimulator } from '../economy/economySimulator';
import {
  generateLevelEconomyCurves,
  generateMonsterDropTable,
} from '../economy/balanceTable';

// ─── 쿼리 타입 ──────────────────────────────────────────────────

interface ReportQuery {
  date?: string; // YYYY-MM-DD, 기본: 오늘
}

// ─── 라우트 등록 ────────────────────────────────────────────────

export async function economyRoutes(fastify: FastifyInstance): Promise<void> {

  /**
   * GET /api/economy/report — 일일 경제 리포트
   * ?date=2026-03-11 형태로 특정 일자 조회 (기본: 오늘)
   */
  fastify.get('/api/economy/report', async (request: FastifyRequest<{ Querystring: ReportQuery }>) => {
    const date = request.query.date ?? new Date().toISOString().slice(0, 10);
    const report = economySimulator.generateDailyReport(date);
    return { success: true, data: report };
  });

  /**
   * GET /api/economy/inflation — 인플레이션 지수
   * 현재 총 골드 공급량 + 인플레이션 지수 + 상태 반환
   */
  fastify.get('/api/economy/inflation', async () => {
    const index = economySimulator.calculateInflationIndex();
    const status = economySimulator.getInflationStatus();
    const totalSupply = economySimulator.getTotalGoldSupply();
    return {
      success: true,
      data: {
        inflationIndex: Math.round(index * 1000) / 1000,
        status,
        totalGoldSupply: totalSupply,
        timestamp: new Date().toISOString(),
      },
    };
  });

  /**
   * GET /api/economy/balance-check — 밸런스 검증
   * 실측 데이터 없이 호출 시 빈 데이터로 구조 검증만 반환
   */
  fastify.get('/api/economy/balance-check', async () => {
    const result = economySimulator.checkBalance({});
    return { success: true, data: result };
  });

  /**
   * GET /api/economy/enhancement-table — 강화 비용/확률 테이블
   */
  fastify.get('/api/economy/enhancement-table', async () => {
    return { success: true, data: economySimulator.getEnhancementSummary() };
  });

  /**
   * GET /api/economy/grade-prices — 등급별 가격 범위
   */
  fastify.get('/api/economy/grade-prices', async () => {
    return { success: true, data: economySimulator.getGradePriceSummary() };
  });

  /**
   * GET /api/economy/level-curves — 레벨별 경제 곡선
   */
  fastify.get('/api/economy/level-curves', async () => {
    return { success: true, data: generateLevelEconomyCurves() };
  });

  /**
   * GET /api/economy/monster-drops — 몬스터 레벨별 드롭 테이블
   */
  fastify.get('/api/economy/monster-drops', async () => {
    return { success: true, data: generateMonsterDropTable() };
  });
}
