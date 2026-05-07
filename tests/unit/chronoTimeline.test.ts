import { describe, expect, it } from 'vitest';
import {
  buildChronoBattleSeed,
  cycleChronoEra,
  getChronoEra,
  projectZoneToEra,
} from '../../client/src/time/ChronoTimeline';

describe('ChronoTimeline', () => {
  it('cycleChronoEra는 과거→현재→붕괴미래 순서로 순환한다', () => {
    expect(cycleChronoEra('ancient', 1)).toBe('present');
    expect(cycleChronoEra('present', 1)).toBe('ruined_future');
    expect(cycleChronoEra('ruined_future', 1)).toBe('ancient');
    expect(cycleChronoEra('ancient', -1)).toBe('ruined_future');
  });

  it('getChronoEra는 알 수 없는 입력을 현재 시간대로 안전 폴백한다', () => {
    expect(getChronoEra('missing' as any).id).toBe('present');
  });

  it('projectZoneToEra는 같은 존을 시간대별로 다른 전투/연출 값으로 투영한다', () => {
    const ancient = projectZoneToEra('aether_plains', 'ancient');
    const future = projectZoneToEra('aether_plains', 'ruined_future');

    expect(ancient.displayName).toContain('고대');
    expect(ancient.monsterLevelOffset).toBeLessThan(0);
    expect(future.displayName).toContain('붕괴');
    expect(future.monsterLevelOffset).toBeGreaterThan(0);
    expect(future.enemyHpMultiplier).toBeGreaterThan(ancient.enemyHpMultiplier);
  });

  it('말라투스 성소는 퀘스트 타깃 이름을 시간대별 필드명에 유지한다', () => {
    const present = projectZoneToEra('malatus_sanctuary', 'present');
    const future = projectZoneToEra('malatus_sanctuary', 'ruined_future');

    expect(present.displayName).toBe('현재 말라투스 성소');
    expect(future.displayName).toBe('붕괴미래 말라투스 성소');
  });

  it('buildChronoBattleSeed는 시간대별 몬스터 이름과 ATB 속도 보정을 결정적으로 만든다', () => {
    expect(buildChronoBattleSeed('memory_forest', 'ancient', 'mon_forest', '기억 늑대')).toEqual({
      eraId: 'ancient',
      zoneId: 'memory_forest',
      monsterId: 'mon_forest',
      monsterName: '고대 기억 늑대',
      enemyHpMultiplier: 0.9,
      enemyAttackSpeedMultiplier: 0.95,
      rewardMultiplier: 1,
    });

    const future = buildChronoBattleSeed('memory_forest', 'ruined_future', 'mon_forest', '기억 늑대');
    expect(future.monsterName).toBe('붕괴미래 기억 늑대');
    expect(future.enemyAttackSpeedMultiplier).toBeGreaterThan(1);
    expect(future.rewardMultiplier).toBeGreaterThan(1);
  });
});
