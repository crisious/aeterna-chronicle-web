import { describe, expect, test } from 'vitest';

import { pickScenesForProbe } from './harness';

describe('A11Y keyboard navigation scaffold', () => {
  test('키보드 풀 내비 대상 씬은 keyboard probe를 포함해야 한다', () => {
    const scenarios = pickScenesForProbe('keyboard');

    expect(scenarios.length).toBeGreaterThanOrEqual(5);
    expect(scenarios.some((scenario) => scenario.scene.id === 'battle')).toBe(true);
    expect(scenarios.some((scenario) => scenario.scene.id === 'inventory')).toBe(true);
  });
});
