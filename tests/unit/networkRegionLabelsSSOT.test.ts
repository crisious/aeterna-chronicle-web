/**
 * 유닛 테스트 — SYNC-211: SCENARIO_NETWORK_REGION_LABELS SSOT
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_NETWORK_REGION_LABELS,
  getNetworkRegionNarrative,
  getOptimalRegionFromKR,
  type NetworkRegion,
} from '../../shared/types/scenarioRegistry';

const ALL: readonly NetworkRegion[] = ['asia_kr', 'asia_jp', 'asia_sea', 'na_us', 'eu_west'];

describe('SCENARIO_NETWORK_REGION_LABELS', () => {
  test('5 지역 모두 정의', () => {
    expect(SCENARIO_NETWORK_REGION_LABELS.length).toBe(5);
    for (const r of ALL) {
      expect(getNetworkRegionNarrative(r), r).toBeDefined();
    }
  });

  test('averagePingFromKR 양의 정수', () => {
    for (const r of SCENARIO_NETWORK_REGION_LABELS) {
      expect(r.averagePingFromKR, r.region).toBeGreaterThan(0);
      expect(Number.isInteger(r.averagePingFromKR), r.region).toBe(true);
    }
  });

  test('getOptimalRegionFromKR 는 asia_kr (최저 ping)', () => {
    expect(getOptimalRegionFromKR().region).toBe('asia_kr');
  });

  test('label/endpointHost 비어 있지 않음', () => {
    for (const r of SCENARIO_NETWORK_REGION_LABELS) {
      expect(r.label.trim(), r.region).not.toBe('');
      expect(r.endpointHost.trim(), r.region).not.toBe('');
    }
  });

  test('region/endpointHost 중복 없음', () => {
    const regions = SCENARIO_NETWORK_REGION_LABELS.map((r) => r.region);
    const hosts = SCENARIO_NETWORK_REGION_LABELS.map((r) => r.endpointHost);
    expect(new Set(regions).size).toBe(regions.length);
    expect(new Set(hosts).size).toBe(hosts.length);
  });
});
