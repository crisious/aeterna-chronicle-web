import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// Phase E Part② (B11 / 전투 UX r15) — 보스 강공 텔레그래프.
// BattleScene 은 jsdom 에서 Phaser 런타임 구동이 무거워 소스 문자열로 배선을
// 검증한다(매니페스트/애니 테스트와 동일 관행). 텔레그래프가 조용히 빠지면
// 이 어서션이 깨진다.
function battleSource(): string {
  return readFileSync(resolve(process.cwd(), 'client/src/scenes/BattleScene.ts'), 'utf8');
}

describe('boss strong-attack telegraph (Phase E Part②)', () => {
  const source = battleSource();

  it('보스는 매 3번째 공격을 텔레그래프된 강공으로 분기한다', () => {
    expect(source).toContain('es.bossAtkCount = (es.bossAtkCount ?? 0) + 1');
    expect(source).toContain('es.bossAtkCount % 3 === 0');
    expect(source).toContain('this._telegraphBossStrike(es, target)');
  });

  it('예고(지연) 후 강공 타격 — 1.6배 멀티플라이어', () => {
    expect(source).toContain('private _telegraphBossStrike(');
    expect(source).toContain('this._showBossTelegraph(boss)');
    expect(source).toContain('this._clearBossTelegraph(boss)');
    expect(source).toContain("this._performAttack(boss, t, { strong: true })");
    expect(source).toContain('opts?.strong ? 1.6 : 1');
  });

  it('예고는 색맹/리듀스모션 대응 — 아이콘+색+소리는 항상, 모션만 게이트', () => {
    // 아이콘(⚠) + 붉은 틴트 + 경고음은 무조건.
    expect(source).toContain("'⚠'");
    expect(source).toContain('boss.sprite.setTint(0xff5533)');
    expect(source).toContain("playSfx(this, 'sfx_ui_error'");
    // 펄스/스케일 모션은 reduce-motion(screen shake 설정) 게이트 안에서만.
    expect(source).toContain('if (isScreenShakeEnabled()) {');
  });

  it('예고 중 타겟 사망 시 생존 아군으로 재지정, 보스 사망 시 강공 취소', () => {
    expect(source).toContain('if (boss.isDead) return;');
    expect(source).toContain('target.isDead ? living[Math.floor(Math.random() * living.length)] : target');
  });

  it('정리는 사망 그레이 틴트를 덮지 않는다', () => {
    expect(source).toContain('if (!boss.isDead && this._canTint(boss.sprite)) boss.sprite.clearTint()');
  });
});
