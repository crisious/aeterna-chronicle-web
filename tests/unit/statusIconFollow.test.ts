import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// combat-ux r17 — 상태이상 아이콘이 유닛 스프라이트를 추종. StatusEffectRenderer
// 는 Phaser 런타임(scene.add.*) 의존이 무거워 소스 문자열로 배선을 검증한다.
function read(rel: string): string {
  return readFileSync(resolve(process.cwd(), rel), 'utf8');
}

describe('status icon follow (r17)', () => {
  it('StatusEffectRenderer: 앵커 기반 reposition(델타 시프트, 재드로우 없음)', () => {
    const src = read('client/src/combat/StatusEffectRenderer.ts');
    // 델타 시프트 기준 앵커 필드 + updateEffects 가 앵커 갱신.
    expect(src).toContain('anchorX: number');
    expect(src).toContain('display.anchorX = unitX;');
    // reposition: 앵커 대비 dx/dy 로 모든 오브젝트 이동, 재드로우/재계산 없음.
    expect(src).toContain('reposition(unitId: string, unitX: number, unitY: number)');
    expect(src).toContain('const dx = unitX - display.anchorX;');
    expect(src).toContain('for (const o of display.icons) { o.x += dx; o.y += dy; }');
    // 변화 없으면 조기 반환(매프레임 호출 비용 최소화).
    expect(src).toContain('if (dx === 0 && dy === 0) return;');
  });

  it('BattleScene: 매프레임 전 유닛(아군+적) reposition 호출', () => {
    const src = read('client/src/scenes/BattleScene.ts');
    expect(src).toContain('for (const us of this.allSprites) {');
    expect(src).toContain('this.statusEffectRenderer.reposition(us.unit.id, us.sprite.x, us.sprite.y)');
  });
});
