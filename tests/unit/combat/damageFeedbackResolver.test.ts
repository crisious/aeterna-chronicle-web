/**
 * 유닛 테스트 — 전투 피드백 데미지 스타일 해소(B2/B3)
 *
 * 검증 축:
 *   · 분류 우선순위 단락 평가 (miss > immune > heal > critical > weak > resist > normal)
 *   · SSOT 토큰 합성 (색·마커·폰트·라벨키) — PRD K3 색-비의존 2종 단서
 *   · 14px 봉인 (DAMAGE_POPUP_SIZE 모든 종 ≥ 14)
 *   · DoT 스타일 — STATUS_FEEDBACK 색 소스 전환 + 미정의 폴백(throw 금지)
 *   · 결정적 스태거 (Math.random 대체 — US-BF-04)
 *
 * 작성: 계섬월 (Staff Engineer) — Build 단계
 */
import { describe, expect, test } from 'vitest';

import {
  classifyDamage,
  resolveDamageStyle,
  resolveDotStyle,
  getDamageFontSize,
  type DamageFeedbackInput,
} from '../../../client/src/combat/damageFeedbackResolver';
import { placeStaggered } from '../../../client/src/combat/battleFeedbackPresenter';
import {
  DAMAGE_FEEDBACK,
  STATUS_FEEDBACK,
  type DamageFeedbackKey,
} from '../../../client/src/constants/battle-feedback-tokens';
import { DAMAGE_POPUP_SIZE } from '../../../client/src/constants/battle-tokens';

const ALL_KEYS: DamageFeedbackKey[] = [
  'normal', 'critical', 'weak', 'resist', 'immune', 'heal', 'miss',
];

describe('classifyDamage — 우선순위 단락 평가', () => {
  test('miss 가 모든 것보다 우선', () => {
    expect(classifyDamage({ value: 0, isMiss: true, isCritical: true, effectiveness: 'weak' }))
      .toBe('miss');
  });

  test('immune 이 heal/critical/weak 보다 우선', () => {
    expect(classifyDamage({ value: 0, effectiveness: 'immune', isCritical: true, isHeal: true }))
      .toBe('immune');
  });

  test('heal 이 critical 보다 우선 (크리티컬 힐 → heal 분류)', () => {
    expect(classifyDamage({ value: 200, isHeal: true, isCritical: true })).toBe('heal');
  });

  test('critical 이 weak/resist 보다 우선', () => {
    expect(classifyDamage({ value: 300, isCritical: true, effectiveness: 'weak' })).toBe('critical');
  });

  test('weak / resist / neutral 분기', () => {
    expect(classifyDamage({ value: 240, effectiveness: 'weak' })).toBe('weak');
    expect(classifyDamage({ value: 25, effectiveness: 'resist' })).toBe('resist');
    expect(classifyDamage({ value: 50, effectiveness: 'neutral' })).toBe('normal');
    expect(classifyDamage({ value: 50 })).toBe('normal');
  });
});

describe('resolveDamageStyle — SSOT 토큰 합성', () => {
  test('weak → 색·마커·라벨키·폰트 합성 (PRD §3 수용 기준)', () => {
    const s = resolveDamageStyle({ value: 240, effectiveness: 'weak' });
    expect(s.key).toBe('weak');
    expect(s.marker).toBe(DAMAGE_FEEDBACK.weak.marker); // ▲
    expect(s.marker).toBe('▲');
    expect(s.labelKey).toBe('battle.feedback.weak');
    expect(s.colorHex).toBe(0xff6b35);
    expect(s.fontSizePx).toBe(DAMAGE_POPUP_SIZE.weak); // 22
    expect(s.showValue).toBe(true);
    expect(s.signPrefix).toBe('');
    expect(s.emphasizeBold).toBe(false);
  });

  test('immune → 숫자 숨김(라벨 우선), 라벨키 노출', () => {
    const s = resolveDamageStyle({ value: 0, effectiveness: 'immune' });
    expect(s.key).toBe('immune');
    expect(s.showValue).toBe(false);
    expect(s.labelKey).toBe('battle.feedback.immune');
    expect(s.marker).toBe('⊘');
  });

  test('miss → 숫자 숨김, MISS 라벨키', () => {
    const s = resolveDamageStyle({ value: 0, isMiss: true });
    expect(s.showValue).toBe(false);
    expect(s.labelKey).toBe('battle.feedback.miss');
  });

  test('critical → 굵게 강조 + 32px', () => {
    const s = resolveDamageStyle({ value: 360, isCritical: true });
    expect(s.emphasizeBold).toBe(true);
    expect(s.fontSizePx).toBe(32);
    expect(s.colorHex).toBe(0xffd700);
  });

  test('heal → + 부호 + 숫자 표시', () => {
    const s = resolveDamageStyle({ value: 120, isHeal: true });
    expect(s.signPrefix).toBe('+');
    expect(s.showValue).toBe(true);
    expect(s.labelKey).toBeNull(); // 힐은 숫자만
  });

  test('dotEffectId 지정 시 DoT 스타일로 위임 (색 소스 전환)', () => {
    const s = resolveDamageStyle({ value: 30, dotEffectId: 'poison' });
    expect(s.colorHex).toBe(STATUS_FEEDBACK.poison.colorHex);
    expect(s.marker).toBe(STATUS_FEEDBACK.poison.glyph); // ☠
  });
});

describe('14px 봉인 (K1) — 폰트 SSOT 단일 출처', () => {
  test('모든 피드백 종 fontSizePx ≥ 14', () => {
    for (const key of ALL_KEYS) {
      expect(getDamageFontSize(key)).toBeGreaterThanOrEqual(14);
    }
  });

  test('resolveDamageStyle 출력도 ≥ 14 (회귀 가드)', () => {
    const inputs: DamageFeedbackInput[] = [
      { value: 50 },
      { value: 0, isMiss: true },
      { value: 25, effectiveness: 'resist' },
      { value: 0, effectiveness: 'immune' },
    ];
    for (const i of inputs) {
      expect(resolveDamageStyle(i).fontSizePx).toBeGreaterThanOrEqual(14);
    }
  });
});

describe('resolveDotStyle — 효과별 색 + 폴백 안전성', () => {
  test('정의된 효과 → STATUS_FEEDBACK 색·글리프', () => {
    const s = resolveDotStyle('burn', 45);
    expect(s.colorHex).toBe(STATUS_FEEDBACK.burn.colorHex);
    expect(s.marker).toBe(STATUS_FEEDBACK.burn.glyph);
    expect(s.signPrefix).toBe('');
    expect(s.showValue).toBe(true);
  });

  test('미정의 효과 → normal 폴백 (throw 금지 — 표시는 전투를 막지 않는다)', () => {
    expect(() => resolveDotStyle('unknown_effect_xyz', 10)).not.toThrow();
    const s = resolveDotStyle('unknown_effect_xyz', 10);
    expect(s.key).toBe('normal');
    expect(s.colorHex).toBe(DAMAGE_FEEDBACK.normal.colorHex);
  });

  test('음수 데미지(재생) → heal 부호 + key', () => {
    const s = resolveDotStyle('regen', -20);
    expect(s.signPrefix).toBe('+');
    expect(s.key).toBe('heal');
  });

  test('DoT 폰트도 14px 봉인 준수', () => {
    expect(resolveDotStyle('poison', 30).fontSizePx).toBeGreaterThanOrEqual(14);
  });
});

describe('placeStaggered — 결정적 배치 (US-BF-04, Math.random 대체)', () => {
  const anchor = { x: 100, y: 200 };

  test('같은 입력 → 항상 같은 출력 (결정적)', () => {
    expect(placeStaggered(anchor, 2)).toEqual(placeStaggered(anchor, 2));
  });

  test('인덱스 0 은 앵커 근처, 좌우 분산', () => {
    const p0 = placeStaggered(anchor, 0);
    const p1 = placeStaggered(anchor, 1);
    expect(p0.delayMs).toBe(0);
    expect(p0.x).not.toBe(p1.x); // 짝/홀 좌우 분산
    expect(p1.delayMs).toBeGreaterThan(0);
  });

  test('동시 인덱스 누적 → 세로 상향 + 지연 증가 (겹침 0)', () => {
    const a = placeStaggered(anchor, 1);
    const b = placeStaggered(anchor, 3);
    expect(b.y).toBeLessThan(a.y);          // 위로 누적
    expect(b.delayMs).toBeGreaterThan(a.delayMs);
  });

  test('상한(maxConcurrent=6) 초과 → overflow 플래그', () => {
    expect(placeStaggered(anchor, 5).overflow).toBe(false);
    expect(placeStaggered(anchor, 6).overflow).toBe(true);
  });
});
