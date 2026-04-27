import { describe, expect, test } from 'vitest';

import { pickScenesForProbe } from './harness';

describe('A11Y screen reader scaffold', () => {
  test('스크린 리더 대상 씬은 live region 또는 dialog 케이스를 포함해야 한다', () => {
    const scenarios = pickScenesForProbe('screen-reader');
    const sceneIds = scenarios.map((scenario) => scenario.scene.id);

    expect(sceneIds).toEqual(expect.arrayContaining(['dialogue', 'battle', 'settings']));
  });
});
