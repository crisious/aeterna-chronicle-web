// classBaseStats SSOT 드리프트 가드 (B15)
//
// 5필드(atk/def/matk/mdef/spd) base/growth 는 combat/classBaseStats.ts 가 단일 출처(SSOT)다.
// 이 값은 "서버 권위 damage"의 입력이므로, 진입 경로(소켓 vs REST)마다 갈리면 같은 캐릭터가
// 다른 atk 를 갖는 정합성 버그가 된다. 과거엔 동일 테이블이 3곳에 복제돼 있었다:
//   - combat/characterCombatStats.ts (소켓 권위 damage) → 이제 SSOT 를 import
//   - routes/combatRoutes.ts         (REST /combat/start) → 로컬 테이블 유지(critRate/critDamage 추가)
//   - combat/levelUpSystem.ts        (레벨업 성장)        → 로컬 테이블 유지(hp/mp/crit 추가)
// combatRoutes/levelUpSystem 은 구조가 달라 직접 합치지 않았으므로, 이 테스트가 그 5필드가
// SSOT 와 어긋나면 실패시켜 드리프트를 막는다.
import { describe, expect, test } from 'vitest';
import {
  CLASS_BASE_STATS,
  CLASS_GROWTH_STATS,
  type BaseClassId,
  type BaseCombatStatBlock,
} from '../../server/src/combat/classBaseStats';
import { deriveCombatStats } from '../../server/src/combat/characterCombatStats';
import { CLASS_BASE_COMBAT_STATS, CLASS_GROWTH as COMBAT_ROUTES_GROWTH } from '../../server/src/routes/combatRoutes';
import { CLASS_GROWTH_RATES } from '../../server/src/combat/levelUpSystem';

const BASE_CLASSES: BaseClassId[] = [
  'ether_knight', 'memory_weaver', 'shadow_weaver',
  'memory_breaker', 'time_guardian', 'void_wanderer',
];

const FIVE_FIELDS = ['atk', 'def', 'matk', 'mdef', 'spd'] as const;

function pick5(s: Record<string, number>): BaseCombatStatBlock {
  return { atk: s.atk, def: s.def, matk: s.matk, mdef: s.mdef, spd: s.spd };
}

describe('classBaseStats SSOT (B15 드리프트 가드)', () => {
  test('SSOT 가 6 베이스 클래스를 모두 정의한다', () => {
    for (const cls of BASE_CLASSES) {
      expect(CLASS_BASE_STATS[cls], `base ${cls}`).toBeDefined();
      expect(CLASS_GROWTH_STATS[cls], `growth ${cls}`).toBeDefined();
    }
  });

  // 값 고정(characterization): SSOT 변경은 의도적이어야 한다.
  test('SSOT base/growth 값 고정 (ether_knight 기준점)', () => {
    expect(CLASS_BASE_STATS.ether_knight).toEqual({ atk: 15, def: 12, matk: 5, mdef: 8, spd: 10 });
    expect(CLASS_GROWTH_STATS.ether_knight).toEqual({ atk: 4, def: 4, matk: 1, mdef: 2, spd: 2 });
    expect(CLASS_BASE_STATS.void_wanderer).toEqual({ atk: 10, def: 8, matk: 14, mdef: 10, spd: 12 });
  });

  // 소켓 권위 경로: characterCombatStats.deriveCombatStats 가 SSOT 를 쓴다.
  test('deriveCombatStats(level 1) === SSOT base, growth 도 SSOT 와 일치', () => {
    for (const cls of BASE_CLASSES) {
      const lvl1 = deriveCombatStats(cls, 1);
      expect(pick5(lvl1), `${cls} base@lvl1`).toEqual(CLASS_BASE_STATS[cls]);
      // 레벨 2 - 레벨 1 = 1레벨치 성장
      const lvl2 = deriveCombatStats(cls, 2);
      const delta = {
        atk: lvl2.atk - lvl1.atk, def: lvl2.def - lvl1.def, matk: lvl2.matk - lvl1.matk,
        mdef: lvl2.mdef - lvl1.mdef, spd: lvl2.spd - lvl1.spd,
      };
      expect(delta, `${cls} growth`).toEqual(CLASS_GROWTH_STATS[cls]);
    }
  });

  // REST 경로: combatRoutes 의 로컬 테이블 5필드가 SSOT 와 동일해야 한다.
  test('combatRoutes CLASS_BASE_COMBAT_STATS 5필드 === SSOT base', () => {
    for (const cls of BASE_CLASSES) {
      expect(pick5(CLASS_BASE_COMBAT_STATS[cls]), `combatRoutes base ${cls}`).toEqual(CLASS_BASE_STATS[cls]);
    }
  });

  test('combatRoutes CLASS_GROWTH 5필드 === SSOT growth', () => {
    for (const cls of BASE_CLASSES) {
      expect(pick5(COMBAT_ROUTES_GROWTH[cls]), `combatRoutes growth ${cls}`).toEqual(CLASS_GROWTH_STATS[cls]);
    }
  });

  // 레벨업 경로: levelUpSystem 의 6 베이스 클래스 5필드 성장이 SSOT 와 동일해야 한다.
  // (hp/mp/crit 은 이 도메인 고유라 비교 대상 아님 — crit 스케일도 combatRoutes 와 다름.)
  test('levelUpSystem CLASS_GROWTH_RATES 5필드(base 6클래스) === SSOT growth', () => {
    for (const cls of BASE_CLASSES) {
      expect(pick5(CLASS_GROWTH_RATES[cls]), `levelUp growth ${cls}`).toEqual(CLASS_GROWTH_STATS[cls]);
    }
  });

  // 메타: 비교 대상 필드 집합이 5개임을 못박는다(향후 필드 추가 시 이 테스트가 환기).
  test('드리프트 가드 필드 집합 = 5 (atk/def/matk/mdef/spd)', () => {
    expect(FIVE_FIELDS).toHaveLength(5);
    expect(Object.keys(CLASS_BASE_STATS.ether_knight).sort()).toEqual([...FIVE_FIELDS].sort());
  });
});
