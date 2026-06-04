import { describe, expect, test, vi } from 'vitest';

// monsterSeeds/zoneSeeds 는 둘 다 `../db`(PrismaClient)를 import 한다. 단위 테스트에선 DB 가 없으므로
// 다른 server 테스트(combatEngine 등)와 동일하게 prisma 를 목킹해 모듈 로드를 디커플링한다.
vi.mock('../../server/src/db', () => ({ prisma: {} }));

import { getAllMonsterSeeds } from '../../server/src/monster/monsterSeeds';
import { ZONE_SEEDS } from '../../server/src/world/zoneSeeds';

/**
 * 회귀 가드 — 몬스터 시드 location ↔ Zone.code 정합성 (구 지역명 → 신 Zone.code 마이그레이션).
 *
 * 배경: Monster.location 시드가 구 매크로존(twilight_forest 등)을 쓰던 탓에 combatRoutes 의
 * where:{location:zoneId} 직매칭이 0건이라 #208 가 levelRange 폴백으로 우회했다. 본 마이그레이션은
 * tools/seed/monsterLocationMigration.mjs 의 하이브리드 매핑(테마 region 우선 + 레벨 적합 존)으로
 * 모든 시드 location 을 유효 Zone.code 로 정합화했다. 이 테스트가 그 불변식을 고정한다.
 */
describe('몬스터 시드 location ↔ Zone.code 무결성', () => {
  const monsters = getAllMonsterSeeds();
  const validZoneCodes = new Set(ZONE_SEEDS.map((z) => z.code));
  const zoneRange = new Map(ZONE_SEEDS.map((z) => [z.code, z.levelRange]));

  // 구 매크로존 9종 — 마이그레이션 후 단 하나도 location 으로 남으면 안 된다(회귀 가드).
  const OLD_BUCKETS = [
    'twilight_forest', 'kronos_city', 'aetheria_village', 'shadow_fortress',
    'crystal_cavern', 'void_abyss', 'mist_sea', 'memory_abyss', 'temporal_rift',
  ];

  // 의도된 과레벨 clamp 허용목록 — mist_sea 의 L81~90 보스/엘리트/레이드를 mist_sea_abyss(80)로
  // 클램프(하이브리드: 동명 region 유지, 일반 인카운터는 최저3마리만 뽑으므로 미노출). 그 외 어떤
  // 몬스터도 자기 존 levelMax 를 초과해선 안 된다. 이 집합이 바뀌면 매핑 변경을 강제로 재검토하게 한다.
  const CLAMP_ALLOWLIST = new Set([
    'MON_MS_010', 'MON_MS_017', 'MON_MS_018', 'MON_MS_019', 'MON_MS_020',
    'MON_MS_E02', 'MON_MS_E03', 'MON_MS_E04', 'MON_MS_E05',
    'MON_BOSS_MS02', 'MON_BOSS_MS03', 'MON_BOSS_MS04', 'MON_BOSS_MS05',
    'MON_RAID_MS01', 'MON_RAID_MS02', 'MON_RAID_MS03',
  ]);

  test('시드가 비어있지 않다(파싱/배열 누락 감지)', () => {
    expect(monsters.length).toBeGreaterThanOrEqual(190);
  });

  test('모든 몬스터 location 은 실재하는 Zone.code 다', () => {
    const invalid = monsters
      .filter((m) => !validZoneCodes.has(m.location))
      .map((m) => `${m.code}→${m.location}`);
    expect(invalid).toEqual([]);
  });

  test('구 매크로존 이름이 location 으로 남아있지 않다', () => {
    const stale = monsters.filter((m) => OLD_BUCKETS.includes(m.location)).map((m) => m.code);
    expect(stale).toEqual([]);
  });

  test('어떤 몬스터도 배정 존의 levelMin 미만으로 떨어지지 않는다(언더레벨 배치 금지)', () => {
    const under = monsters
      .filter((m) => {
        const r = zoneRange.get(m.location);
        return r && m.level < r.min;
      })
      .map((m) => `${m.code} L${m.level} < ${m.location}`);
    expect(under).toEqual([]);
  });

  test('존 levelMax 초과는 허용목록(의도된 clamp)뿐이며 초과폭은 10 이하다', () => {
    const over = monsters.filter((m) => {
      const r = zoneRange.get(m.location);
      return r && m.level > r.max;
    });
    // 초과한 몬스터 집합 == 문서화된 허용목록과 정확히 일치
    expect(new Set(over.map((m) => m.code))).toEqual(CLAMP_ALLOWLIST);
    // 초과폭은 디자인 허용치(10) 이내
    for (const m of over) {
      const r = zoneRange.get(m.location)!;
      expect(m.level - r.max).toBeLessThanOrEqual(10);
    }
  });
});
