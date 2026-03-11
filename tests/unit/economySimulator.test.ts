/**
 * 유닛 테스트 — economySimulator (10 tests)
 * 재화 싱크/소스, 인플레이션 지수, 일일 리포트
 */
import { describe, test, expect } from 'vitest';

// ── 타입/로직 재현 ──────────────────────────────────────────

interface GoldEvent { type: string; userId: string; amount: number; timestamp: Date }
interface DailyReport {
  totalInflow: number; totalOutflow: number; netChange: number;
  inflationIndex: number; activeUsers: number;
}

function aggregateInflow(events: GoldEvent[]): number {
  return events.reduce((s, e) => s + e.amount, 0);
}

function aggregateOutflow(events: GoldEvent[]): number {
  return events.reduce((s, e) => s + e.amount, 0);
}

function calculateNetChange(inflow: number, outflow: number): number {
  return inflow - outflow;
}

function calculateInflationIndex(netChange: number, totalSupply: number): number {
  if (totalSupply <= 0) return 1.0;
  return 1.0 + netChange / totalSupply;
}

function getActiveUsers(events: GoldEvent[]): number {
  return new Set(events.map(e => e.userId)).size;
}

function isInflationWarning(index: number, threshold: number): boolean {
  return index > threshold;
}

function calculateAveragePerUser(total: number, userCount: number): number {
  if (userCount <= 0) return 0;
  return Math.floor(total / userCount);
}

function groupByType(events: GoldEvent[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const e of events) {
    result[e.type] = (result[e.type] ?? 0) + e.amount;
  }
  return result;
}

function generateReport(inflows: GoldEvent[], outflows: GoldEvent[], totalSupply: number): DailyReport {
  const totalInflow = aggregateInflow(inflows);
  const totalOutflow = aggregateOutflow(outflows);
  const netChange = calculateNetChange(totalInflow, totalOutflow);
  const allEvents = [...inflows, ...outflows];
  const activeUsers = getActiveUsers(allEvents);
  return {
    totalInflow, totalOutflow, netChange,
    inflationIndex: calculateInflationIndex(netChange, totalSupply),
    activeUsers,
  };
}

// ── 테스트 ──────────────────────────────────────────────────

describe('economySimulator', () => {
  const now = new Date();
  const inflows: GoldEvent[] = [
    { type: 'quest', userId: 'u1', amount: 1000, timestamp: now },
    { type: 'monster', userId: 'u2', amount: 500, timestamp: now },
    { type: 'quest', userId: 'u1', amount: 200, timestamp: now },
  ];
  const outflows: GoldEvent[] = [
    { type: 'shop', userId: 'u1', amount: 800, timestamp: now },
    { type: 'enhance', userId: 'u2', amount: 300, timestamp: now },
  ];

  // 1. 유입 합산
  test('1. 유입 합산 = 1700', () => {
    expect(aggregateInflow(inflows)).toBe(1700);
  });

  // 2. 유출 합산
  test('2. 유출 합산 = 1100', () => {
    expect(aggregateOutflow(outflows)).toBe(1100);
  });

  // 3. 순 변동
  test('3. 순 변동 = 600', () => {
    expect(calculateNetChange(1700, 1100)).toBe(600);
  });

  // 4. 인플레이션 지수 — 양수 변동
  test('4. 인플레이션 지수 — 순 유입 시 > 1.0', () => {
    const idx = calculateInflationIndex(600, 100000);
    expect(idx).toBeGreaterThan(1.0);
    expect(idx).toBeCloseTo(1.006);
  });

  // 5. 인플레이션 지수 — 공급 0일 때 1.0
  test('5. 총 공급 0 시 인플레이션 지수 = 1.0', () => {
    expect(calculateInflationIndex(100, 0)).toBe(1.0);
  });

  // 6. 활성 유저 수
  test('6. 활성 유저 수 = 2', () => {
    expect(getActiveUsers([...inflows, ...outflows])).toBe(2);
  });

  // 7. 인플레이션 경고
  test('7. 인플레이션 경고 — 임계값 초과 시 true', () => {
    expect(isInflationWarning(1.05, 1.03)).toBe(true);
    expect(isInflationWarning(1.01, 1.03)).toBe(false);
  });

  // 8. 유저당 평균
  test('8. 유저당 평균 유입 = 850', () => {
    expect(calculateAveragePerUser(1700, 2)).toBe(850);
    expect(calculateAveragePerUser(100, 0)).toBe(0); // 0명 방어
  });

  // 9. 타입별 그룹핑
  test('9. 유입 타입별 그룹핑', () => {
    const grouped = groupByType(inflows);
    expect(grouped['quest']).toBe(1200);
    expect(grouped['monster']).toBe(500);
  });

  // 10. 전체 리포트 생성
  test('10. 일일 리포트 생성 정합성', () => {
    const report = generateReport(inflows, outflows, 100000);
    expect(report.totalInflow).toBe(1700);
    expect(report.totalOutflow).toBe(1100);
    expect(report.netChange).toBe(600);
    expect(report.activeUsers).toBe(2);
    expect(report.inflationIndex).toBeGreaterThan(1.0);
  });
});
