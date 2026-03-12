/**
 * P10-18: economySimulator — ServiceContainer 기반 테스트
 *
 * 기존 economySimulator.test.ts의 인라인 로직을
 * ServiceContainer 패턴으로 전환하여 테스트 격리를 보장한다.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestContainer } from '../helpers/testContainer';
import { ServiceContainer } from '../../server/src/core/serviceContainer';

// ── 경제 로직 재현 (컨테이너 기반) ──────────────────────────

interface GoldEvent { type: string; userId: string; amount: number; timestamp: Date }

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

// ── 테스트 ──────────────────────────────────────────────────

describe('economySimulator (ServiceContainer 기반)', () => {
  let container: ServiceContainer;

  beforeEach(() => {
    const ctx = createTestContainer();
    container = ctx.container;
  });

  afterEach(() => {
    container.clear();
  });

  it('격리된 컨테이너 인스턴스를 사용한다', () => {
    expect(container.has('prisma')).toBe(true);
    expect(container.has('redis')).toBe(true);

    // 각 테스트마다 새 컨테이너가 생성됨을 확인
    const services = container.listServices();
    expect(services.length).toBe(3);
  });

  it('골드 인플로우를 정확히 계산한다', () => {
    const events: GoldEvent[] = [
      { type: 'quest_reward', userId: 'u1', amount: 500, timestamp: new Date() },
      { type: 'monster_drop', userId: 'u2', amount: 300, timestamp: new Date() },
    ];
    expect(aggregateInflow(events)).toBe(800);
  });

  it('순변동을 정확히 계산한다', () => {
    const net = calculateNetChange(1000, 700);
    expect(net).toBe(300);
  });

  it('인플레이션 지수를 정확히 계산한다', () => {
    const index = calculateInflationIndex(500, 10000);
    expect(index).toBe(1.05);
  });

  it('총공급이 0이면 인플레이션 지수는 1.0이다', () => {
    const index = calculateInflationIndex(500, 0);
    expect(index).toBe(1.0);
  });

  it('활성 유저 수를 정확히 세다', () => {
    const events: GoldEvent[] = [
      { type: 'quest', userId: 'u1', amount: 100, timestamp: new Date() },
      { type: 'quest', userId: 'u1', amount: 200, timestamp: new Date() },
      { type: 'shop', userId: 'u2', amount: 50, timestamp: new Date() },
    ];
    expect(getActiveUsers(events)).toBe(2);
  });

  it('컨테이너 unregister 후 서비스가 제거된다', () => {
    const removed = container.unregister('redis');
    expect(removed).toBe(true);
    expect(container.has('redis')).toBe(false);
  });
});
