import { describe, expect, test } from 'vitest';

import { pickScenesForProbe } from './harness';

describe('A11Y colorblind snapshot scaffold', () => {
  test('색맹 회귀 대상 씬은 최소 4개 이상 선언되어야 한다', () => {
    const scenarios = pickScenesForProbe('colorblind');

    expect(scenarios.length).toBeGreaterThanOrEqual(4);
    expect(scenarios.every((scenario) => scenario.probes.includes('contrast'))).toBe(true);
  });
});
