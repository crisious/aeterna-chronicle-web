import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// combat-ux r19 — 전투 연속 데코레이티브 트윈이 모션 감소(OS prefers-reduced-motion
// 또는 인게임 '모션 감소' 토글)를 존중하는지(WCAG 2.3.3). Phaser 런타임이 무거워
// 소스 문자열로 배선을 검증한다(매니페스트/텔레그래프 테스트와 동일 관행).
function read(rel: string): string {
  return readFileSync(resolve(process.cwd(), rel), 'utf8');
}

describe('reduce-motion combat wiring (r19)', () => {
  it('SettingsScene: isMotionReduced 단일 출처(OS + 인게임 토글), isScreenShakeEnabled 가 경유', () => {
    const src = read('client/src/scenes/SettingsScene.ts');
    expect(src).toContain('export function isMotionReduced()');
    expect(src).toContain("window.matchMedia?.('(prefers-reduced-motion: reduce)').matches");
    expect(src).toContain('accessibilityManager.getSettings().reduceMotion === true');
    // isScreenShakeEnabled 가 isMotionReduced 를 우선 검사 → 인게임 토글이 기존 모션 게이트에 연동.
    expect(src).toContain('if (isMotionReduced()) return false;');
  });

  it('BattleScene: 연속 데코레이티브 트윈(idle bob·AUTO 펄스)을 isMotionReduced 로 게이트', () => {
    const src = read('client/src/scenes/BattleScene.ts');
    expect(src).toContain("import { isScreenShakeEnabled, isMotionReduced, getActiveCharacterSkin } from './SettingsScene'");
    // idle bob: repeat -1 연속 모션 → 모션 감소 시 생략.
    expect(src).toContain('if (!isMotionReduced()) {');
    // 가드가 idle bob 과 AUTO 인디케이터 펄스 둘 다 감싸는지(2회 이상 등장).
    expect(src.match(/if \(!isMotionReduced\(\)\) \{/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
  });
});
