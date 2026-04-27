import { describe, expect, test } from 'vitest';

import { buildCriticalScenarioMatrix } from './harness';

describe('A11Y AAA audit scaffold', () => {
  test('핵심 씬은 AxeProbe 실행 대상으로 선언되어야 한다', () => {
    const scenarios = buildCriticalScenarioMatrix(['ko']);

    expect(scenarios.length).toBeGreaterThanOrEqual(6);
    expect(scenarios.every((scenario) => scenario.probes.includes('axe'))).toBe(true);
  });
});
