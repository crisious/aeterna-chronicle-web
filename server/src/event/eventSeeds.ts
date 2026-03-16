import { prisma } from '../db';

// ─── 이벤트 시드 데이터 (각 타입 2개씩, 총 10개) ────────────────

interface EventSeed {
  code: string;
  name: string;
  description: string;
  type: string;
  config: object;
  rewards: object[];
  startAt: Date;
  endAt: Date;
}

/** 기준 시점: 시드 실행일 기준 상대 날짜 */
function daysFromNow(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(0, 0, 0, 0);
  return d;
}

const EVENT_SEEDS: EventSeed[] = [
  // ═══ 로그인 보너스 (login_bonus) ═══
  {
    code: 'LOGIN_SPRING_2026',
    name: '봄맞이 출석 이벤트',
    description: '7일 연속 로그인 시 특별 보상! 봄의 기운을 느껴보세요.',
    type: 'login_bonus',
    config: { totalDays: 7 },
    rewards: [
      { id: 'ls1', type: 'gold', amount: 500, condition: { type: 'loginCount', target: 1 } },
      { id: 'ls2', type: 'gold', amount: 1000, condition: { type: 'loginCount', target: 3 } },
      { id: 'ls3', type: 'diamond', amount: 100, condition: { type: 'loginCount', target: 5 } },
      { id: 'ls4', type: 'diamond', amount: 300, condition: { type: 'loginCount', target: 7 } },
    ],
    startAt: daysFromNow(0),
    endAt: daysFromNow(14),
  },
  {
    code: 'LOGIN_NEWBIE_WELCOME',
    name: '신규 모험가 환영 이벤트',
    description: '새로운 모험가를 위한 7일간의 풍성한 보상!',
    type: 'login_bonus',
    config: { totalDays: 7, newPlayerOnly: true },
    rewards: [
      { id: 'nw1', type: 'gold', amount: 1000, condition: { type: 'loginCount', target: 1 } },
      { id: 'nw2', type: 'item', itemId: 'potion_hp_large', amount: 10, condition: { type: 'loginCount', target: 3 } },
      { id: 'nw3', type: 'diamond', amount: 200, condition: { type: 'loginCount', target: 5 } },
      { id: 'nw4', type: 'diamond', amount: 500, condition: { type: 'loginCount', target: 7 } },
    ],
    startAt: daysFromNow(0),
    endAt: daysFromNow(30),
  },

  // ═══ 2배 드롭 (double_drop) ═══
  {
    code: 'DROP_WEEKEND_BOOST',
    name: '주말 드롭 2배',
    description: '주말 한정! 모든 던전에서 아이템 드롭률이 2배로 증가합니다.',
    type: 'double_drop',
    config: { multiplier: 2.0, dungeonOnly: true },
    rewards: [
      { id: 'dw1', type: 'event_coin', amount: 50, condition: { type: 'dungeonClear', target: 5 } },
    ],
    startAt: daysFromNow(5),
    endAt: daysFromNow(7),
  },
  {
    code: 'DROP_ANNIVERSARY',
    name: '1주년 기념 3배 드롭',
    description: '1주년을 기념하여 모든 콘텐츠에서 드롭률이 3배!',
    type: 'double_drop',
    config: { multiplier: 3.0, allContent: true },
    rewards: [
      { id: 'da1', type: 'diamond', amount: 100, condition: { type: 'dungeonClear', target: 10 } },
      { id: 'da2', type: 'event_coin', amount: 200, condition: { type: 'dungeonClear', target: 30 } },
    ],
    startAt: daysFromNow(30),
    endAt: daysFromNow(44),
  },

  // ═══ 할인 (discount) ═══
  {
    code: 'DISC_SPRING_SALE',
    name: '봄맞이 대할인',
    description: '상점 전 품목 20% 할인! 지금이 기회입니다.',
    type: 'discount',
    config: { discountRate: 0.2, categories: ['all'] },
    rewards: [
      { id: 'ds1', type: 'gold', amount: 2000, condition: { type: 'purchaseCount', target: 5 } },
    ],
    startAt: daysFromNow(0),
    endAt: daysFromNow(7),
  },
  {
    code: 'DISC_FLASH_SALE',
    name: '긴급 플래시 세일',
    description: '24시간 한정! 장비 50% 할인!',
    type: 'discount',
    config: { discountRate: 0.5, categories: ['weapon', 'armor'] },
    rewards: [
      { id: 'fs1', type: 'diamond', amount: 50, condition: { type: 'purchaseCount', target: 3 } },
    ],
    startAt: daysFromNow(10),
    endAt: daysFromNow(11),
  },

  // ═══ 수집 (collection) ═══
  {
    code: 'COLL_FLOWER_FEST',
    name: '꽃 축제 수집 이벤트',
    description: '필드에서 5종류의 꽃을 모아 특별 보상을 받으세요!',
    type: 'collection',
    config: { items: ['flower_rose', 'flower_lily', 'flower_tulip', 'flower_daisy', 'flower_orchid'], required: 5 },
    rewards: [
      { id: 'cf1', type: 'event_coin', amount: 100, condition: { type: 'collect_count', target: 3 } },
      { id: 'cf2', type: 'diamond', amount: 200, condition: { type: 'collect_count', target: 5 } },
    ],
    startAt: daysFromNow(0),
    endAt: daysFromNow(21),
  },
  {
    code: 'COLL_MONSTER_HUNT',
    name: '몬스터 사냥 대회',
    description: '지정된 몬스터를 처치하고 소재를 모아오세요!',
    type: 'collection',
    config: { items: ['fang_wolf', 'scale_dragon', 'core_golem'], required: 3 },
    rewards: [
      { id: 'mh1', type: 'gold', amount: 5000, condition: { type: 'collect_count', target: 2 } },
      { id: 'mh2', type: 'item', itemId: 'rare_weapon_box', amount: 1, condition: { type: 'collect_count', target: 3 } },
    ],
    startAt: daysFromNow(7),
    endAt: daysFromNow(21),
  },

  // ═══ 챌린지 (challenge) ═══
  {
    code: 'CHAL_SPEED_RUN',
    name: '스피드런 챌린지',
    description: '던전을 제한 시간 내에 클리어하세요!',
    type: 'challenge',
    config: { dungeonId: 'dungeon_shadow_keep', timeLimitSec: 300 },
    rewards: [
      { id: 'sr1', type: 'diamond', amount: 150, condition: { type: 'score', target: 100 } },
      { id: 'sr2', type: 'event_coin', amount: 300, condition: { type: 'score', target: 300 } },
    ],
    startAt: daysFromNow(3),
    endAt: daysFromNow(17),
  },
  {
    code: 'CHAL_BOSS_RUSH',
    name: '보스 러시 챌린지',
    description: '연속 보스 5마리를 쓰러뜨려라! 최고 기록에 도전하세요.',
    type: 'challenge',
    config: { bossCount: 5, mode: 'endless' },
    rewards: [
      { id: 'br1', type: 'gold', amount: 10000, condition: { type: 'score', target: 3 } },
      { id: 'br2', type: 'diamond', amount: 500, condition: { type: 'score', target: 5 } },
    ],
    startAt: daysFromNow(14),
    endAt: daysFromNow(28),
  },

  // ═══ P14-17: 시간 균열 테마 주간 이벤트 3종 ═══════════════════

  // 1. "시간의 역류" — 역방향 던전 (클리어 순서 역순)
  {
    code: 'RIFT_TIME_REVERSAL',
    name: '시간의 역류',
    description: '시간의 균열에서 인과율이 뒤틀렸다! 던전을 역순으로 클리어하며 왜곡된 시간을 바로잡아라. 보스부터 시작해 입구로 돌아가는 역방향 공략.',
    type: 'weekly_rift',
    config: {
      theme: 'time_rift',
      mechanic: 'reverse_dungeon',
      targetDungeons: ['dg_rift_chrono_n', 'dg_rift_paradox_n', 'dg_rift_collapse_n', 'dg_rift_echo_n', 'dg_rift_origin_n'],
      reverseWaveOrder: true,
      timeLimitMultiplier: 1.5,
      bonusCondition: { type: 'no_death', bonusMultiplier: 2.0 },
      requiredLevel: 85,
      maxPartySize: 4,
      weeklyResetDay: 'monday',
    },
    rewards: [
      { id: 'tr1', type: 'temporal_shard', amount: 5, condition: { type: 'clear', target: 1 } },
      { id: 'tr2', type: 'temporal_shard', amount: 15, condition: { type: 'clear', target: 3 } },
      { id: 'tr3', type: 'gold', amount: 50000, condition: { type: 'clear', target: 5 } },
      { id: 'tr4', type: 'item', itemId: 'EQUIP_RIFT_CHRONOBLADE', amount: 1, condition: { type: 'clear_all_no_death', target: 5 } },
      { id: 'tr5', type: 'diamond', amount: 500, condition: { type: 'speed_clear', target: 300 } },
    ],
    startAt: daysFromNow(0),
    endAt: daysFromNow(7),
  },

  // 2. "균열 폭주" — 필드 보스 랜덤 출현 빈도 증가
  {
    code: 'RIFT_SURGE',
    name: '균열 폭주',
    description: '시간의 균열이 폭주하며 시공간 곳곳에 강력한 균열 보스들이 출현한다! 필드 보스 출현 빈도 300% 증가, 특수 균열 보스 "차원의 포식자" 랜덤 출현.',
    type: 'weekly_rift',
    config: {
      theme: 'time_rift',
      mechanic: 'field_boss_surge',
      bossSpawnMultiplier: 3.0,
      targetZones: ['temporal_rift_zone_1', 'temporal_rift_zone_2', 'temporal_rift_zone_3', 'temporal_rift_zone_4', 'temporal_rift_zone_5'],
      specialBoss: {
        code: 'MON_RIFT_DIMENSIONAL_DEVOURER',
        spawnChance: 0.15,
        spawnIntervalMin: 120,
        announceGlobal: true,
      },
      fieldBossDropBonus: 1.5,
      requiredLevel: 88,
      weeklyResetDay: 'monday',
    },
    rewards: [
      { id: 'rs1', type: 'rift_essence', amount: 3, condition: { type: 'boss_kill', target: 1 } },
      { id: 'rs2', type: 'rift_essence', amount: 10, condition: { type: 'boss_kill', target: 5 } },
      { id: 'rs3', type: 'gold', amount: 80000, condition: { type: 'boss_kill', target: 10 } },
      { id: 'rs4', type: 'item', itemId: 'MAT_DIMENSIONAL_CORE', amount: 1, condition: { type: 'special_boss_kill', target: 1 } },
      { id: 'rs5', type: 'cosmetic', itemId: 'COSMETIC_RIFT_AURA', amount: 1, condition: { type: 'boss_kill', target: 20 } },
    ],
    startAt: daysFromNow(7),
    endAt: daysFromNow(14),
  },

  // 3. "차원 교차" — 다른 시즌 몬스터 혼합 출현
  {
    code: 'RIFT_DIMENSION_CROSS',
    name: '차원 교차',
    description: '시간의 균열이 과거 차원과 연결되었다! 시즌 1~3의 강화된 몬스터들이 시간의 균열 지역에 혼합 출현. 과거의 보스들이 시간 왜곡 버프와 함께 귀환한다.',
    type: 'weekly_rift',
    config: {
      theme: 'time_rift',
      mechanic: 'cross_season_spawn',
      seasonMixPool: [
        { season: 1, monsterCodes: ['MON_TF_BOSS_001', 'MON_SF_BOSS_001', 'MON_CC_BOSS_001'], levelScale: 95 },
        { season: 2, monsterCodes: ['MON_MS_BOSS_001', 'MON_MS_BOSS_002', 'MON_MS_RAID_001'], levelScale: 97 },
        { season: 3, monsterCodes: ['MON_AB_BOSS_001', 'MON_AB_BOSS_002', 'MON_AB_RAID_001'], levelScale: 100 },
      ],
      temporalBuffs: [
        { name: '시간 가속', effect: 'attack_speed_up', value: 1.3 },
        { name: '공간 왜곡', effect: 'teleport_random', intervalSec: 30 },
        { name: '인과 역전', effect: 'reflect_damage', value: 0.1 },
      ],
      spawnRotationHours: 4,
      requiredLevel: 90,
      weeklyResetDay: 'monday',
    },
    rewards: [
      { id: 'dc1', type: 'cross_dimension_token', amount: 2, condition: { type: 'kill_cross_season', target: 5 } },
      { id: 'dc2', type: 'cross_dimension_token', amount: 8, condition: { type: 'kill_cross_season', target: 20 } },
      { id: 'dc3', type: 'gold', amount: 100000, condition: { type: 'kill_cross_season', target: 50 } },
      { id: 'dc4', type: 'item', itemId: 'EQUIP_RIFT_DIMENSION_RING', amount: 1, condition: { type: 'kill_all_season_bosses', target: 1 } },
      { id: 'dc5', type: 'title', titleId: 'TITLE_DIMENSION_WALKER', amount: 1, condition: { type: 'complete_all_objectives', target: 1 } },
    ],
    startAt: daysFromNow(14),
    endAt: daysFromNow(21),
  },
];

// ═══════════════════════════════════════════════════════════════
//  시드 실행
// ═══════════════════════════════════════════════════════════════

/** 이벤트 시드 upsert (중복 실행 안전) */
export async function seedEvents(): Promise<{ created: number; skipped: number }> {
  let created = 0;
  let skipped = 0;

  for (const seed of EVENT_SEEDS) {
    const existing = await prisma.gameEvent.findUnique({ where: { code: seed.code } });
    if (existing) {
      skipped++;
      continue;
    }

    await prisma.gameEvent.create({
      data: {
        code: seed.code,
        name: seed.name,
        description: seed.description,
        type: seed.type,
        config: seed.config,
        rewards: seed.rewards,
        startAt: seed.startAt,
        endAt: seed.endAt,
        isActive: seed.startAt <= new Date() && seed.endAt > new Date(),
      },
    });
    created++;
  }

  console.log(`[EventSeeds] ${created}개 생성, ${skipped}개 스킵 (이미 존재)`);
  return { created, skipped };
}
