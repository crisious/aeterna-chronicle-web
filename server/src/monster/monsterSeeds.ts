/**
 * monsterSeeds.ts — 133개 몬스터 시드 데이터
 *
 * 분포:
 *   일반(normal) 80마리 — 지역당 10마리 × 7지역 + 안개해 10
 *   엘리트(elite) 25마리 — 기존 20 + 안개해 5
 *   던전 보스(boss) 17마리 — 기존 12 + 안개해 5
 *   필드 보스(field_boss) 5마리
 *   레이드 보스(raid_boss) 6마리 — 기존 3 + 안개해 3
 *
 * 지역: twilight_forest(Lv.1~15), kronos_city(Lv.10~25), aetheria_village(Lv.20~35),
 *        shadow_fortress(Lv.30~50), crystal_cavern(Lv.45~65), void_abyss(Lv.60~80),
 *        mist_sea(Lv.70~90) [P8-08/P8-14]
 *
 * 레벨 분포: 1~90
 */
import { prisma } from '../db';

// ─── 타입 정의 ──────────────────────────────────────────────────

interface MonsterSeed {
  code: string;
  name: string;
  type: 'normal' | 'elite' | 'boss' | 'field_boss' | 'raid_boss';
  element: string;
  level: number;
  hp: number;
  attack: number;
  defense: number;
  speed: number;
  skills: Array<{
    name: string;
    damage: number;
    cooldown: number;
    element: string;
    effectType: string;
  }>;
  dropTable: Array<{
    itemId: string;
    rate: number;
    minQty: number;
    maxQty: number;
  }>;
  expReward: number;
  goldReward: number;
  behavior: {
    aggro_range: number;
    patrol: boolean;
    flee_hp_pct: number;
    enrage_hp_pct: number;
  };
  location: string;
  respawnTime: number;
  lore: string;
}

// ─── 지역 1: 황혼의 숲 (twilight_forest) Lv.1~15 ───────────────

const twilightForestNormals: MonsterSeed[] = [
  {
    code: 'MON_TF_001', name: '이끼 슬라임', type: 'normal', element: 'earth', level: 1,
    hp: 80, attack: 8, defense: 3, speed: 4,
    skills: [
      { name: '점액 투척', damage: 12, cooldown: 5, element: 'earth', effectType: 'damage' },
      { name: '분열', damage: 6, cooldown: 10, element: 'neutral', effectType: 'debuff' },
    ],
    dropTable: [
      { itemId: 'MAT_SLIME_GEL', rate: 0.6, minQty: 1, maxQty: 3 },
      { itemId: 'MAT_HERB_COMMON', rate: 0.3, minQty: 1, maxQty: 2 },
    ],
    expReward: 15, goldReward: 5,
    behavior: { aggro_range: 5, patrol: true, flee_hp_pct: 0, enrage_hp_pct: 0 },
    location: 'twilight_forest', respawnTime: 15,
    lore: '황혼의 숲 초입에 서식하는 작은 슬라임. 이끼를 양분 삼아 살아가며, 위협을 느끼면 산성 점액을 뿜는다.',
  },
  {
    code: 'MON_TF_002', name: '숲 고블린', type: 'normal', element: 'neutral', level: 3,
    hp: 120, attack: 12, defense: 5, speed: 7,
    skills: [
      { name: '돌팔매', damage: 15, cooldown: 4, element: 'earth', effectType: 'damage' },
      { name: '기습', damage: 20, cooldown: 8, element: 'neutral', effectType: 'damage' },
    ],
    dropTable: [
      { itemId: 'MAT_GOBLIN_TOOTH', rate: 0.4, minQty: 1, maxQty: 2 },
      { itemId: 'EQUIP_DAGGER_RUSTY', rate: 0.05, minQty: 1, maxQty: 1 },
    ],
    expReward: 25, goldReward: 8,
    behavior: { aggro_range: 8, patrol: true, flee_hp_pct: 15, enrage_hp_pct: 0 },
    location: 'twilight_forest', respawnTime: 20,
    lore: '황혼의 숲에 무리 지어 사는 소형 고블린. 약삭빠르고 교활하지만 겁이 많아 체력이 떨어지면 도주한다.',
  },
  {
    code: 'MON_TF_003', name: '독버섯 스포어', type: 'normal', element: 'dark', level: 5,
    hp: 100, attack: 14, defense: 4, speed: 3,
    skills: [
      { name: '독포자 방출', damage: 8, cooldown: 6, element: 'dark', effectType: 'dot' },
      { name: '포자 폭발', damage: 25, cooldown: 12, element: 'dark', effectType: 'aoe' },
    ],
    dropTable: [
      { itemId: 'MAT_POISON_SPORE', rate: 0.5, minQty: 1, maxQty: 3 },
      { itemId: 'MAT_MUSHROOM_CAP', rate: 0.35, minQty: 1, maxQty: 2 },
    ],
    expReward: 35, goldReward: 10,
    behavior: { aggro_range: 4, patrol: false, flee_hp_pct: 0, enrage_hp_pct: 0 },
    location: 'twilight_forest', respawnTime: 25,
    lore: '어둡고 습한 곳에서 자라난 독버섯의 포자체. 움직이는 존재에 반응해 맹독 포자를 뿌린다.',
  },
  {
    code: 'MON_TF_004', name: '야생 늑대', type: 'normal', element: 'neutral', level: 6,
    hp: 150, attack: 18, defense: 6, speed: 12,
    skills: [
      { name: '물어뜯기', damage: 22, cooldown: 3, element: 'neutral', effectType: 'damage' },
      { name: '원거리 포효', damage: 0, cooldown: 15, element: 'neutral', effectType: 'debuff' },
    ],
    dropTable: [
      { itemId: 'MAT_WOLF_PELT', rate: 0.45, minQty: 1, maxQty: 1 },
      { itemId: 'MAT_FANG', rate: 0.3, minQty: 1, maxQty: 2 },
    ],
    expReward: 40, goldReward: 12,
    behavior: { aggro_range: 10, patrol: true, flee_hp_pct: 10, enrage_hp_pct: 0 },
    location: 'twilight_forest', respawnTime: 20,
    lore: '숲의 포식자. 무리를 이뤄 사냥하며, 한 마리가 포효하면 근처의 동료가 합류한다.',
  },
  {
    code: 'MON_TF_005', name: '수정 나비', type: 'normal', element: 'light', level: 4,
    hp: 60, attack: 16, defense: 2, speed: 15,
    skills: [
      { name: '빛의 인분', damage: 18, cooldown: 5, element: 'light', effectType: 'damage' },
      { name: '눈부심', damage: 0, cooldown: 10, element: 'light', effectType: 'debuff' },
    ],
    dropTable: [
      { itemId: 'MAT_CRYSTAL_DUST', rate: 0.5, minQty: 1, maxQty: 2 },
      { itemId: 'MAT_BUTTERFLY_WING', rate: 0.2, minQty: 1, maxQty: 1 },
    ],
    expReward: 30, goldReward: 15,
    behavior: { aggro_range: 6, patrol: true, flee_hp_pct: 30, enrage_hp_pct: 0 },
    location: 'twilight_forest', respawnTime: 30,
    lore: '에테르 에너지를 먹고 자란 초자연적 나비. 날개의 수정 가루는 연금술 재료로 귀하게 쓰인다.',
  },
  {
    code: 'MON_TF_006', name: '썩은 나무 정령', type: 'normal', element: 'earth', level: 8,
    hp: 200, attack: 15, defense: 12, speed: 3,
    skills: [
      { name: '뿌리 휘감기', damage: 18, cooldown: 6, element: 'earth', effectType: 'debuff' },
      { name: '나무줄기 강타', damage: 30, cooldown: 8, element: 'earth', effectType: 'damage' },
    ],
    dropTable: [
      { itemId: 'MAT_ROTTEN_BARK', rate: 0.5, minQty: 1, maxQty: 3 },
      { itemId: 'MAT_SPIRIT_ESSENCE', rate: 0.1, minQty: 1, maxQty: 1 },
    ],
    expReward: 55, goldReward: 18,
    behavior: { aggro_range: 5, patrol: false, flee_hp_pct: 0, enrage_hp_pct: 20 },
    location: 'twilight_forest', respawnTime: 30,
    lore: '에테르 오염으로 변이된 고목의 정령. 느리지만 강인하며 체력이 낮아지면 광폭화한다.',
  },
  {
    code: 'MON_TF_007', name: '그림자 박쥐', type: 'normal', element: 'dark', level: 7,
    hp: 90, attack: 20, defense: 3, speed: 14,
    skills: [
      { name: '초음파', damage: 16, cooldown: 5, element: 'dark', effectType: 'debuff' },
      { name: '흡혈', damage: 22, cooldown: 7, element: 'dark', effectType: 'damage' },
    ],
    dropTable: [
      { itemId: 'MAT_BAT_WING', rate: 0.45, minQty: 1, maxQty: 2 },
      { itemId: 'MAT_DARK_ESSENCE', rate: 0.1, minQty: 1, maxQty: 1 },
    ],
    expReward: 45, goldReward: 14,
    behavior: { aggro_range: 8, patrol: true, flee_hp_pct: 20, enrage_hp_pct: 0 },
    location: 'twilight_forest', respawnTime: 20,
    lore: '어둠 속에서 날아다니는 대형 박쥐. 초음파로 먹잇감을 혼란시킨 뒤 피를 빨아들인다.',
  },
  {
    code: 'MON_TF_008', name: '가시덩굴 덫', type: 'normal', element: 'earth', level: 10,
    hp: 180, attack: 22, defense: 8, speed: 1,
    skills: [
      { name: '가시 쏘기', damage: 25, cooldown: 4, element: 'earth', effectType: 'damage' },
      { name: '덩굴 포박', damage: 10, cooldown: 10, element: 'earth', effectType: 'debuff' },
      { name: '독가시 폭사', damage: 35, cooldown: 15, element: 'dark', effectType: 'aoe' },
    ],
    dropTable: [
      { itemId: 'MAT_THORN_VINE', rate: 0.5, minQty: 1, maxQty: 3 },
      { itemId: 'MAT_POISON_SAC', rate: 0.2, minQty: 1, maxQty: 1 },
    ],
    expReward: 65, goldReward: 20,
    behavior: { aggro_range: 3, patrol: false, flee_hp_pct: 0, enrage_hp_pct: 0 },
    location: 'twilight_forest', respawnTime: 35,
    lore: '숲 바닥에 위장해 있다가 다가오는 생물을 감아 올리는 식물형 몬스터. 이동은 못 하지만 사정거리 내에서는 치명적.',
  },
  {
    code: 'MON_TF_009', name: '황혼 여우', type: 'normal', element: 'fire', level: 12,
    hp: 170, attack: 24, defense: 7, speed: 13,
    skills: [
      { name: '여우불', damage: 28, cooldown: 5, element: 'fire', effectType: 'damage' },
      { name: '환영 분신', damage: 0, cooldown: 12, element: 'neutral', effectType: 'debuff' },
    ],
    dropTable: [
      { itemId: 'MAT_FOX_TAIL', rate: 0.3, minQty: 1, maxQty: 1 },
      { itemId: 'MAT_FIRE_CRYSTAL', rate: 0.15, minQty: 1, maxQty: 1 },
    ],
    expReward: 75, goldReward: 25,
    behavior: { aggro_range: 7, patrol: true, flee_hp_pct: 25, enrage_hp_pct: 0 },
    location: 'twilight_forest', respawnTime: 25,
    lore: '에테르를 불꽃으로 변환하는 능력을 가진 영리한 여우. 환영을 만들어 적을 혼란시키고 도주에 능하다.',
  },
  {
    code: 'MON_TF_010', name: '유령 반딧불이 군집', type: 'normal', element: 'light', level: 14,
    hp: 130, attack: 26, defense: 4, speed: 10,
    skills: [
      { name: '집중 광선', damage: 32, cooldown: 6, element: 'light', effectType: 'damage' },
      { name: '섬광 폭발', damage: 40, cooldown: 14, element: 'light', effectType: 'aoe' },
    ],
    dropTable: [
      { itemId: 'MAT_ETHER_DUST', rate: 0.4, minQty: 1, maxQty: 3 },
      { itemId: 'MAT_LIGHT_ESSENCE', rate: 0.15, minQty: 1, maxQty: 1 },
    ],
    expReward: 85, goldReward: 28,
    behavior: { aggro_range: 6, patrol: true, flee_hp_pct: 0, enrage_hp_pct: 0 },
    location: 'twilight_forest', respawnTime: 30,
    lore: '수백 마리의 반딧불이가 하나의 의지로 뭉친 집합 생명체. 개별로는 약하지만 합쳐지면 강렬한 빛을 발사한다.',
  },
];

// ─── 지역 2: 크로노스 시가지 (kronos_city) Lv.10~25 ────────────

const kronosCityNormals: MonsterSeed[] = [
  {
    code: 'MON_KC_001', name: '하수구 쥐떼', type: 'normal', element: 'dark', level: 10,
    hp: 140, attack: 18, defense: 5, speed: 11,
    skills: [
      { name: '군집 돌격', damage: 20, cooldown: 4, element: 'dark', effectType: 'damage' },
      { name: '역병의 이빨', damage: 15, cooldown: 8, element: 'dark', effectType: 'dot' },
    ],
    dropTable: [
      { itemId: 'MAT_RAT_TAIL', rate: 0.5, minQty: 1, maxQty: 3 },
      { itemId: 'MAT_PLAGUE_SAMPLE', rate: 0.1, minQty: 1, maxQty: 1 },
    ],
    expReward: 60, goldReward: 18,
    behavior: { aggro_range: 6, patrol: true, flee_hp_pct: 10, enrage_hp_pct: 0 },
    location: 'kronos_city', respawnTime: 15,
    lore: '크로노스 시 하수구에 서식하는 변이 쥐떼. 에테르 오염으로 비정상적으로 공격적이 되었다.',
  },
  {
    code: 'MON_KC_002', name: '폐허 골렘', type: 'normal', element: 'earth', level: 13,
    hp: 280, attack: 20, defense: 18, speed: 3,
    skills: [
      { name: '바위 주먹', damage: 30, cooldown: 5, element: 'earth', effectType: 'damage' },
      { name: '지진 밟기', damage: 22, cooldown: 10, element: 'earth', effectType: 'aoe' },
    ],
    dropTable: [
      { itemId: 'MAT_STONE_CORE', rate: 0.35, minQty: 1, maxQty: 1 },
      { itemId: 'MAT_IRON_ORE', rate: 0.4, minQty: 1, maxQty: 2 },
    ],
    expReward: 80, goldReward: 25,
    behavior: { aggro_range: 5, patrol: false, flee_hp_pct: 0, enrage_hp_pct: 15 },
    location: 'kronos_city', respawnTime: 40,
    lore: '시간 왜곡으로 무너진 건물 잔해가 에테르에 의해 형태를 갖춘 존재. 느리지만 방어력이 높다.',
  },
  {
    code: 'MON_KC_003', name: '시간 유랑자', type: 'normal', element: 'time', level: 15,
    hp: 160, attack: 28, defense: 8, speed: 10,
    skills: [
      { name: '시간 가속', damage: 0, cooldown: 15, element: 'time', effectType: 'debuff' },
      { name: '시간 칼날', damage: 35, cooldown: 6, element: 'time', effectType: 'damage' },
    ],
    dropTable: [
      { itemId: 'MAT_TIME_SHARD', rate: 0.25, minQty: 1, maxQty: 1 },
      { itemId: 'MAT_CHRONO_DUST', rate: 0.4, minQty: 1, maxQty: 2 },
    ],
    expReward: 95, goldReward: 35,
    behavior: { aggro_range: 8, patrol: true, flee_hp_pct: 0, enrage_hp_pct: 0 },
    location: 'kronos_city', respawnTime: 30,
    lore: '시간의 틈에서 빠져나온 인간형 존재. 과거와 현재가 뒤섞인 모습으로 떠돌며, 에테르 반응에 이끌린다.',
  },
  {
    code: 'MON_KC_004', name: '오염된 시계태엽', type: 'normal', element: 'lightning', level: 16,
    hp: 190, attack: 25, defense: 14, speed: 8,
    skills: [
      { name: '방전', damage: 30, cooldown: 5, element: 'lightning', effectType: 'damage' },
      { name: '톱니 연사', damage: 20, cooldown: 3, element: 'neutral', effectType: 'damage' },
      { name: '과부하', damage: 45, cooldown: 18, element: 'lightning', effectType: 'aoe' },
    ],
    dropTable: [
      { itemId: 'MAT_GEAR_FRAGMENT', rate: 0.45, minQty: 1, maxQty: 3 },
      { itemId: 'MAT_LIGHTNING_CORE', rate: 0.1, minQty: 1, maxQty: 1 },
    ],
    expReward: 100, goldReward: 30,
    behavior: { aggro_range: 7, patrol: false, flee_hp_pct: 0, enrage_hp_pct: 25 },
    location: 'kronos_city', respawnTime: 25,
    lore: '크로노스의 고대 시계탑 부품이 에테르로 오염되어 자의식을 갖게 된 기계 괴물.',
  },
  {
    code: 'MON_KC_005', name: '떠도는 환영', type: 'normal', element: 'dark', level: 18,
    hp: 140, attack: 32, defense: 5, speed: 12,
    skills: [
      { name: '공포의 손길', damage: 35, cooldown: 6, element: 'dark', effectType: 'damage' },
      { name: '정신 침식', damage: 20, cooldown: 10, element: 'dark', effectType: 'dot' },
    ],
    dropTable: [
      { itemId: 'MAT_ECTOPLASM', rate: 0.4, minQty: 1, maxQty: 2 },
      { itemId: 'MAT_SOUL_FRAGMENT', rate: 0.15, minQty: 1, maxQty: 1 },
    ],
    expReward: 110, goldReward: 35,
    behavior: { aggro_range: 10, patrol: true, flee_hp_pct: 0, enrage_hp_pct: 0 },
    location: 'kronos_city', respawnTime: 20,
    lore: '시간의 뒤틀림 속에서 사라진 시민들의 잔류 사념. 물리 공격에 저항하지만 빛 속성에 취약하다.',
  },
  {
    code: 'MON_KC_006', name: '변이 경비 인형', type: 'normal', element: 'neutral', level: 19,
    hp: 250, attack: 26, defense: 16, speed: 6,
    skills: [
      { name: '방패 돌진', damage: 28, cooldown: 5, element: 'neutral', effectType: 'damage' },
      { name: '경보 발동', damage: 0, cooldown: 20, element: 'neutral', effectType: 'debuff' },
    ],
    dropTable: [
      { itemId: 'MAT_ARMOR_SCRAP', rate: 0.4, minQty: 1, maxQty: 2 },
      { itemId: 'EQUIP_SHIELD_IRON', rate: 0.03, minQty: 1, maxQty: 1 },
    ],
    expReward: 115, goldReward: 38,
    behavior: { aggro_range: 8, patrol: true, flee_hp_pct: 0, enrage_hp_pct: 0 },
    location: 'kronos_city', respawnTime: 30,
    lore: '크로노스 성의 경비 인형이 오래된 에테르 명령을 수행하며 배회한다. 침입자로 인식한 모든 것을 공격한다.',
  },
  {
    code: 'MON_KC_007', name: '폭주 마력체', type: 'normal', element: 'aether', level: 20,
    hp: 160, attack: 35, defense: 6, speed: 9,
    skills: [
      { name: '에테르 폭발', damage: 42, cooldown: 7, element: 'aether', effectType: 'aoe' },
      { name: '마력 흡수', damage: 20, cooldown: 10, element: 'aether', effectType: 'damage' },
    ],
    dropTable: [
      { itemId: 'MAT_AETHER_CRYSTAL', rate: 0.3, minQty: 1, maxQty: 1 },
      { itemId: 'MAT_MANA_RESIDUE', rate: 0.5, minQty: 1, maxQty: 3 },
    ],
    expReward: 125, goldReward: 40,
    behavior: { aggro_range: 6, patrol: false, flee_hp_pct: 0, enrage_hp_pct: 30 },
    location: 'kronos_city', respawnTime: 35,
    lore: '제어를 벗어난 순수 에테르 에너지 덩어리. 불안정하며 근처의 마력을 빨아들이고 폭발한다.',
  },
  {
    code: 'MON_KC_008', name: '시간 매', type: 'normal', element: 'time', level: 22,
    hp: 175, attack: 30, defense: 7, speed: 16,
    skills: [
      { name: '급강하', damage: 38, cooldown: 4, element: 'neutral', effectType: 'damage' },
      { name: '시간 정지 날갯짓', damage: 25, cooldown: 12, element: 'time', effectType: 'debuff' },
    ],
    dropTable: [
      { itemId: 'MAT_TIME_FEATHER', rate: 0.3, minQty: 1, maxQty: 1 },
      { itemId: 'MAT_HAWK_TALON', rate: 0.4, minQty: 1, maxQty: 2 },
    ],
    expReward: 135, goldReward: 42,
    behavior: { aggro_range: 12, patrol: true, flee_hp_pct: 15, enrage_hp_pct: 0 },
    location: 'kronos_city', respawnTime: 25,
    lore: '시간 에너지를 날개에 축적한 맹금. 순간적으로 시간을 멈춰 먹잇감을 덮치는 최상위 포식자.',
  },
  {
    code: 'MON_KC_009', name: '하수구 악어', type: 'normal', element: 'ice', level: 23,
    hp: 300, attack: 28, defense: 15, speed: 5,
    skills: [
      { name: '턱 물기', damage: 40, cooldown: 5, element: 'neutral', effectType: 'damage' },
      { name: '꼬리 휩쓸기', damage: 30, cooldown: 7, element: 'ice', effectType: 'aoe' },
    ],
    dropTable: [
      { itemId: 'MAT_GATOR_HIDE', rate: 0.4, minQty: 1, maxQty: 1 },
      { itemId: 'MAT_ICE_SCALE', rate: 0.2, minQty: 1, maxQty: 2 },
    ],
    expReward: 140, goldReward: 45,
    behavior: { aggro_range: 5, patrol: false, flee_hp_pct: 0, enrage_hp_pct: 20 },
    location: 'kronos_city', respawnTime: 35,
    lore: '크로노스 지하 하수도에 서식하는 대형 악어. 차가운 하수에 적응해 얼음 속성을 지니게 되었다.',
  },
  {
    code: 'MON_KC_010', name: '부서진 시간상', type: 'normal', element: 'time', level: 25,
    hp: 220, attack: 33, defense: 12, speed: 7,
    skills: [
      { name: '시간 왜곡파', damage: 40, cooldown: 6, element: 'time', effectType: 'damage' },
      { name: '역류', damage: 30, cooldown: 10, element: 'time', effectType: 'debuff' },
      { name: '시간 균열', damage: 55, cooldown: 18, element: 'time', effectType: 'aoe' },
    ],
    dropTable: [
      { itemId: 'MAT_TIME_SHARD', rate: 0.35, minQty: 1, maxQty: 2 },
      { itemId: 'MAT_CHRONO_CORE', rate: 0.08, minQty: 1, maxQty: 1 },
    ],
    expReward: 155, goldReward: 50,
    behavior: { aggro_range: 7, patrol: false, flee_hp_pct: 0, enrage_hp_pct: 25 },
    location: 'kronos_city', respawnTime: 40,
    lore: '크로노스 광장의 시간 조각상이 에테르 폭주로 깨어난 것. 시간 속성 공격이 강력하다.',
  },
];

// ─── 지역 3: 에테리아 마을 (aetheria_village) Lv.20~35 ──────────

const aetheriaVillageNormals: MonsterSeed[] = [
  {
    code: 'MON_AV_001', name: '에테르 정령', type: 'normal', element: 'aether', level: 20,
    hp: 180, attack: 30, defense: 10, speed: 11,
    skills: [
      { name: '에테르 화살', damage: 35, cooldown: 4, element: 'aether', effectType: 'damage' },
      { name: '정령의 축복', damage: 0, cooldown: 15, element: 'aether', effectType: 'heal' },
    ],
    dropTable: [
      { itemId: 'MAT_AETHER_ESSENCE', rate: 0.4, minQty: 1, maxQty: 2 },
      { itemId: 'MAT_SPIRIT_CORE', rate: 0.1, minQty: 1, maxQty: 1 },
    ],
    expReward: 120, goldReward: 38,
    behavior: { aggro_range: 7, patrol: true, flee_hp_pct: 20, enrage_hp_pct: 0 },
    location: 'aetheria_village', respawnTime: 25,
    lore: '에테리아 마을 주변에 떠도는 순수 에테르 정령. 보통은 온순하지만 위협을 느끼면 반격한다.',
  },
  {
    code: 'MON_AV_002', name: '전쟁 잔상', type: 'normal', element: 'fire', level: 23,
    hp: 210, attack: 34, defense: 12, speed: 8,
    skills: [
      { name: '화염 검격', damage: 40, cooldown: 5, element: 'fire', effectType: 'damage' },
      { name: '전장의 포효', damage: 0, cooldown: 12, element: 'fire', effectType: 'debuff' },
    ],
    dropTable: [
      { itemId: 'MAT_WAR_RESIDUE', rate: 0.35, minQty: 1, maxQty: 2 },
      { itemId: 'EQUIP_SWORD_FLAME', rate: 0.02, minQty: 1, maxQty: 1 },
    ],
    expReward: 140, goldReward: 45,
    behavior: { aggro_range: 9, patrol: true, flee_hp_pct: 0, enrage_hp_pct: 20 },
    location: 'aetheria_village', respawnTime: 30,
    lore: '과거 전쟁의 기억이 에테르에 각인되어 형태를 갖춘 잔상. 끊임없이 전투를 반복한다.',
  },
  {
    code: 'MON_AV_003', name: '마력 흡수 식물', type: 'normal', element: 'earth', level: 25,
    hp: 250, attack: 28, defense: 15, speed: 2,
    skills: [
      { name: '마나 드레인', damage: 25, cooldown: 6, element: 'aether', effectType: 'damage' },
      { name: '포자 구름', damage: 20, cooldown: 10, element: 'earth', effectType: 'aoe' },
      { name: '뿌리 속박', damage: 15, cooldown: 8, element: 'earth', effectType: 'debuff' },
    ],
    dropTable: [
      { itemId: 'MAT_MANA_BLOOM', rate: 0.4, minQty: 1, maxQty: 2 },
      { itemId: 'MAT_RARE_HERB', rate: 0.2, minQty: 1, maxQty: 1 },
    ],
    expReward: 150, goldReward: 48,
    behavior: { aggro_range: 4, patrol: false, flee_hp_pct: 0, enrage_hp_pct: 0 },
    location: 'aetheria_village', respawnTime: 35,
    lore: '에테르를 양분으로 빨아들이는 거대 식물. 마법사의 마나를 흡수해 성장한다.',
  },
  {
    code: 'MON_AV_004', name: '빛의 환수', type: 'normal', element: 'light', level: 27,
    hp: 195, attack: 38, defense: 10, speed: 13,
    skills: [
      { name: '성광탄', damage: 45, cooldown: 5, element: 'light', effectType: 'damage' },
      { name: '빛의 보호막', damage: 0, cooldown: 15, element: 'light', effectType: 'heal' },
    ],
    dropTable: [
      { itemId: 'MAT_LIGHT_MANE', rate: 0.3, minQty: 1, maxQty: 1 },
      { itemId: 'MAT_HOLY_CRYSTAL', rate: 0.12, minQty: 1, maxQty: 1 },
    ],
    expReward: 165, goldReward: 52,
    behavior: { aggro_range: 8, patrol: true, flee_hp_pct: 0, enrage_hp_pct: 0 },
    location: 'aetheria_village', respawnTime: 30,
    lore: '에테리아 탑의 빛 에너지가 형상화된 환수. 아름답지만 영역을 침범하면 가차없이 공격한다.',
  },
  {
    code: 'MON_AV_005', name: '기억 수집가', type: 'normal', element: 'dark', level: 28,
    hp: 170, attack: 40, defense: 8, speed: 10,
    skills: [
      { name: '기억 탈취', damage: 42, cooldown: 6, element: 'dark', effectType: 'damage' },
      { name: '환각', damage: 30, cooldown: 10, element: 'dark', effectType: 'debuff' },
    ],
    dropTable: [
      { itemId: 'MAT_MEMORY_FRAGMENT', rate: 0.35, minQty: 1, maxQty: 2 },
      { itemId: 'MAT_DARK_INK', rate: 0.2, minQty: 1, maxQty: 1 },
    ],
    expReward: 170, goldReward: 55,
    behavior: { aggro_range: 9, patrol: true, flee_hp_pct: 15, enrage_hp_pct: 0 },
    location: 'aetheria_village', respawnTime: 25,
    lore: '다른 생물의 기억을 탈취해 자신의 힘으로 삼는 어둠의 존재. 기억을 잃은 자들의 원흉.',
  },
  {
    code: 'MON_AV_006', name: '번개 두꺼비', type: 'normal', element: 'lightning', level: 30,
    hp: 230, attack: 36, defense: 13, speed: 7,
    skills: [
      { name: '전기 혀', damage: 40, cooldown: 4, element: 'lightning', effectType: 'damage' },
      { name: '번개 점프', damage: 50, cooldown: 10, element: 'lightning', effectType: 'aoe' },
    ],
    dropTable: [
      { itemId: 'MAT_THUNDER_GLAND', rate: 0.35, minQty: 1, maxQty: 1 },
      { itemId: 'MAT_TOAD_SKIN', rate: 0.4, minQty: 1, maxQty: 2 },
    ],
    expReward: 180, goldReward: 58,
    behavior: { aggro_range: 6, patrol: false, flee_hp_pct: 0, enrage_hp_pct: 25 },
    location: 'aetheria_village', respawnTime: 30,
    lore: '에테르 전기를 체내에 축적하는 거대 두꺼비. 방전 시 주변 모든 것에 감전 피해를 입힌다.',
  },
  {
    code: 'MON_AV_007', name: '유리 거미', type: 'normal', element: 'ice', level: 31,
    hp: 150, attack: 42, defense: 6, speed: 14,
    skills: [
      { name: '얼음 거미줄', damage: 35, cooldown: 5, element: 'ice', effectType: 'debuff' },
      { name: '빙결 독니', damage: 48, cooldown: 7, element: 'ice', effectType: 'damage' },
    ],
    dropTable: [
      { itemId: 'MAT_ICE_SILK', rate: 0.4, minQty: 1, maxQty: 3 },
      { itemId: 'MAT_SPIDER_VENOM', rate: 0.25, minQty: 1, maxQty: 1 },
    ],
    expReward: 185, goldReward: 60,
    behavior: { aggro_range: 6, patrol: true, flee_hp_pct: 20, enrage_hp_pct: 0 },
    location: 'aetheria_village', respawnTime: 25,
    lore: '투명한 얼음으로 이루어진 거미. 거미줄에 닿으면 순식간에 얼어붙으며, 빛에 반사되어 찾기 어렵다.',
  },
  {
    code: 'MON_AV_008', name: '바람 하피', type: 'normal', element: 'neutral', level: 32,
    hp: 200, attack: 38, defense: 9, speed: 16,
    skills: [
      { name: '질풍 할퀴기', damage: 44, cooldown: 4, element: 'neutral', effectType: 'damage' },
      { name: '회오리', damage: 35, cooldown: 9, element: 'neutral', effectType: 'aoe' },
    ],
    dropTable: [
      { itemId: 'MAT_HARPY_FEATHER', rate: 0.35, minQty: 1, maxQty: 2 },
      { itemId: 'MAT_WIND_ESSENCE', rate: 0.15, minQty: 1, maxQty: 1 },
    ],
    expReward: 190, goldReward: 62,
    behavior: { aggro_range: 12, patrol: true, flee_hp_pct: 15, enrage_hp_pct: 0 },
    location: 'aetheria_village', respawnTime: 20,
    lore: '에테리아 마을 상공을 배회하는 하피. 날카로운 발톱과 바람을 조종하는 능력이 위협적이다.',
  },
  {
    code: 'MON_AV_009', name: '잔영 기사', type: 'normal', element: 'time', level: 33,
    hp: 270, attack: 40, defense: 18, speed: 8,
    skills: [
      { name: '시간 검', damage: 48, cooldown: 5, element: 'time', effectType: 'damage' },
      { name: '잔상 분리', damage: 30, cooldown: 12, element: 'time', effectType: 'debuff' },
      { name: '역행 일격', damage: 60, cooldown: 18, element: 'time', effectType: 'damage' },
    ],
    dropTable: [
      { itemId: 'MAT_CHRONO_PLATE', rate: 0.25, minQty: 1, maxQty: 1 },
      { itemId: 'EQUIP_SWORD_CHRONO', rate: 0.02, minQty: 1, maxQty: 1 },
    ],
    expReward: 200, goldReward: 65,
    behavior: { aggro_range: 8, patrol: true, flee_hp_pct: 0, enrage_hp_pct: 20 },
    location: 'aetheria_village', respawnTime: 35,
    lore: '과거의 기사가 시간에 갇혀 떠도는 잔영. 실체와 환영을 분리하는 교묘한 전투술을 구사한다.',
  },
  {
    code: 'MON_AV_010', name: '에테르 폭풍 정령', type: 'normal', element: 'aether', level: 35,
    hp: 240, attack: 44, defense: 11, speed: 12,
    skills: [
      { name: '에테르 폭풍', damage: 55, cooldown: 8, element: 'aether', effectType: 'aoe' },
      { name: '마력 집중포', damage: 50, cooldown: 6, element: 'aether', effectType: 'damage' },
    ],
    dropTable: [
      { itemId: 'MAT_STORM_AETHER', rate: 0.3, minQty: 1, maxQty: 2 },
      { itemId: 'MAT_AETHER_CORE', rate: 0.08, minQty: 1, maxQty: 1 },
    ],
    expReward: 215, goldReward: 70,
    behavior: { aggro_range: 8, patrol: true, flee_hp_pct: 0, enrage_hp_pct: 25 },
    location: 'aetheria_village', respawnTime: 40,
    lore: '에테르 에너지가 폭풍처럼 소용돌이치는 상위 정령. 영역에 들어서면 에테르 폭풍이 몰아친다.',
  },
];

// ─── 지역 4: 그림자 요새 (shadow_fortress) Lv.30~50 ────────────

const shadowFortressNormals: MonsterSeed[] = [
  {
    code: 'MON_SF_001', name: '암흑 기사', type: 'normal', element: 'dark', level: 30,
    hp: 320, attack: 38, defense: 20, speed: 8,
    skills: [
      { name: '암흑 참격', damage: 45, cooldown: 5, element: 'dark', effectType: 'damage' },
      { name: '어둠의 방패', damage: 0, cooldown: 15, element: 'dark', effectType: 'heal' },
    ],
    dropTable: [
      { itemId: 'MAT_DARK_PLATE', rate: 0.3, minQty: 1, maxQty: 1 },
      { itemId: 'MAT_SHADOW_STEEL', rate: 0.25, minQty: 1, maxQty: 2 },
    ],
    expReward: 195, goldReward: 65,
    behavior: { aggro_range: 8, patrol: true, flee_hp_pct: 0, enrage_hp_pct: 20 },
    location: 'shadow_fortress', respawnTime: 30,
    lore: '그림자 군주에게 충성하는 암흑 기사. 어둠의 힘으로 무장하여 요새를 수호한다.',
  },
  {
    code: 'MON_SF_002', name: '독안개 마녀', type: 'normal', element: 'dark', level: 33,
    hp: 220, attack: 45, defense: 10, speed: 9,
    skills: [
      { name: '독안개', damage: 30, cooldown: 6, element: 'dark', effectType: 'dot' },
      { name: '저주의 화살', damage: 52, cooldown: 5, element: 'dark', effectType: 'damage' },
      { name: '생명력 착취', damage: 40, cooldown: 12, element: 'dark', effectType: 'damage' },
    ],
    dropTable: [
      { itemId: 'MAT_WITCH_BREW', rate: 0.35, minQty: 1, maxQty: 2 },
      { itemId: 'MAT_CURSE_SCROLL', rate: 0.1, minQty: 1, maxQty: 1 },
    ],
    expReward: 220, goldReward: 72,
    behavior: { aggro_range: 10, patrol: false, flee_hp_pct: 20, enrage_hp_pct: 0 },
    location: 'shadow_fortress', respawnTime: 30,
    lore: '독안개를 뿜어내는 마녀. 원거리에서 저주를 날리며, 위험해지면 안개 속으로 사라진다.',
  },
  {
    code: 'MON_SF_003', name: '강철 가고일', type: 'normal', element: 'earth', level: 36,
    hp: 400, attack: 40, defense: 25, speed: 5,
    skills: [
      { name: '급강하 타격', damage: 55, cooldown: 6, element: 'earth', effectType: 'damage' },
      { name: '석화 포효', damage: 0, cooldown: 18, element: 'earth', effectType: 'debuff' },
    ],
    dropTable: [
      { itemId: 'MAT_GARGOYLE_STONE', rate: 0.3, minQty: 1, maxQty: 1 },
      { itemId: 'MAT_IRON_WING', rate: 0.25, minQty: 1, maxQty: 1 },
    ],
    expReward: 240, goldReward: 78,
    behavior: { aggro_range: 7, patrol: false, flee_hp_pct: 0, enrage_hp_pct: 15 },
    location: 'shadow_fortress', respawnTime: 40,
    lore: '요새 성벽에 숨어있는 석상 괴물. 침입자가 지나가면 깨어나 덮친다. 방어력이 극도로 높다.',
  },
  {
    code: 'MON_SF_004', name: '그림자 암살자', type: 'normal', element: 'dark', level: 38,
    hp: 240, attack: 55, defense: 12, speed: 18,
    skills: [
      { name: '급소 찌르기', damage: 70, cooldown: 7, element: 'dark', effectType: 'damage' },
      { name: '연막', damage: 0, cooldown: 15, element: 'dark', effectType: 'debuff' },
    ],
    dropTable: [
      { itemId: 'MAT_SHADOW_BLADE', rate: 0.2, minQty: 1, maxQty: 1 },
      { itemId: 'MAT_ASSASSIN_CLOAK', rate: 0.1, minQty: 1, maxQty: 1 },
    ],
    expReward: 260, goldReward: 85,
    behavior: { aggro_range: 12, patrol: true, flee_hp_pct: 25, enrage_hp_pct: 0 },
    location: 'shadow_fortress', respawnTime: 25,
    lore: '그림자 속에서 출현하는 암살자. 빠른 속도와 치명적 일격이 특징이며, 위기 시 연막을 치고 도주한다.',
  },
  {
    code: 'MON_SF_005', name: '뼈 전사', type: 'normal', element: 'dark', level: 40,
    hp: 350, attack: 42, defense: 22, speed: 7,
    skills: [
      { name: '뼈 창 돌진', damage: 50, cooldown: 5, element: 'dark', effectType: 'damage' },
      { name: '해골 방벽', damage: 0, cooldown: 12, element: 'dark', effectType: 'heal' },
      { name: '사령술', damage: 35, cooldown: 15, element: 'dark', effectType: 'aoe' },
    ],
    dropTable: [
      { itemId: 'MAT_BONE_FRAGMENT', rate: 0.45, minQty: 1, maxQty: 3 },
      { itemId: 'MAT_SOUL_GEM', rate: 0.08, minQty: 1, maxQty: 1 },
    ],
    expReward: 280, goldReward: 90,
    behavior: { aggro_range: 7, patrol: true, flee_hp_pct: 0, enrage_hp_pct: 20 },
    location: 'shadow_fortress', respawnTime: 30,
    lore: '사령술로 부활한 고대 전사의 해골. 생전의 전투 기술을 고스란히 간직하고 있다.',
  },
  {
    code: 'MON_SF_006', name: '화염 워그', type: 'normal', element: 'fire', level: 42,
    hp: 300, attack: 48, defense: 15, speed: 14,
    skills: [
      { name: '화염 돌진', damage: 55, cooldown: 5, element: 'fire', effectType: 'damage' },
      { name: '불꽃 포효', damage: 40, cooldown: 10, element: 'fire', effectType: 'aoe' },
    ],
    dropTable: [
      { itemId: 'MAT_WARG_PELT', rate: 0.35, minQty: 1, maxQty: 1 },
      { itemId: 'MAT_FIRE_FANG', rate: 0.2, minQty: 1, maxQty: 1 },
    ],
    expReward: 300, goldReward: 95,
    behavior: { aggro_range: 10, patrol: true, flee_hp_pct: 10, enrage_hp_pct: 25 },
    location: 'shadow_fortress', respawnTime: 25,
    lore: '그림자 요새의 화염 늑대. 뜨거운 숨결과 불타는 발톱으로 침입자를 몰아낸다.',
  },
  {
    code: 'MON_SF_007', name: '저주받은 인형사', type: 'normal', element: 'dark', level: 44,
    hp: 260, attack: 52, defense: 14, speed: 8,
    skills: [
      { name: '실 조종', damage: 0, cooldown: 10, element: 'dark', effectType: 'debuff' },
      { name: '인형 폭발', damage: 65, cooldown: 8, element: 'dark', effectType: 'aoe' },
      { name: '영혼 봉인', damage: 55, cooldown: 12, element: 'dark', effectType: 'damage' },
    ],
    dropTable: [
      { itemId: 'MAT_CURSED_THREAD', rate: 0.3, minQty: 1, maxQty: 2 },
      { itemId: 'MAT_PUPPET_CORE', rate: 0.1, minQty: 1, maxQty: 1 },
    ],
    expReward: 320, goldReward: 100,
    behavior: { aggro_range: 9, patrol: false, flee_hp_pct: 15, enrage_hp_pct: 0 },
    location: 'shadow_fortress', respawnTime: 35,
    lore: '보이지 않는 실로 인형들을 조종하는 저주받은 마술사. 인형을 방패로 쓰다 폭파시키는 전술을 구사한다.',
  },
  {
    code: 'MON_SF_008', name: '혼돈의 미노타우로스', type: 'normal', element: 'fire', level: 46,
    hp: 450, attack: 50, defense: 20, speed: 9,
    skills: [
      { name: '돌진', damage: 65, cooldown: 6, element: 'neutral', effectType: 'damage' },
      { name: '화염 도끼', damage: 70, cooldown: 8, element: 'fire', effectType: 'damage' },
      { name: '분노의 발구름', damage: 50, cooldown: 12, element: 'earth', effectType: 'aoe' },
    ],
    dropTable: [
      { itemId: 'MAT_MINOTAUR_HORN', rate: 0.25, minQty: 1, maxQty: 1 },
      { itemId: 'EQUIP_AXE_FLAME', rate: 0.02, minQty: 1, maxQty: 1 },
    ],
    expReward: 340, goldReward: 110,
    behavior: { aggro_range: 8, patrol: true, flee_hp_pct: 0, enrage_hp_pct: 20 },
    location: 'shadow_fortress', respawnTime: 40,
    lore: '요새의 미궁에 갇힌 미노타우로스. 혼돈의 에너지로 강화되어 과거보다 훨씬 강력해졌다.',
  },
  {
    code: 'MON_SF_009', name: '어둠 결정체', type: 'normal', element: 'dark', level: 48,
    hp: 380, attack: 46, defense: 25, speed: 4,
    skills: [
      { name: '암흑 광선', damage: 60, cooldown: 5, element: 'dark', effectType: 'damage' },
      { name: '암흑 필드', damage: 45, cooldown: 10, element: 'dark', effectType: 'aoe' },
      { name: '어둠의 흡수', damage: 30, cooldown: 15, element: 'dark', effectType: 'damage' },
    ],
    dropTable: [
      { itemId: 'MAT_DARK_CRYSTAL', rate: 0.3, minQty: 1, maxQty: 2 },
      { itemId: 'MAT_VOID_SHARD', rate: 0.08, minQty: 1, maxQty: 1 },
    ],
    expReward: 360, goldReward: 115,
    behavior: { aggro_range: 6, patrol: false, flee_hp_pct: 0, enrage_hp_pct: 15 },
    location: 'shadow_fortress', respawnTime: 45,
    lore: '순수한 어둠 에너지가 결정화된 존재. 이동은 느리지만 암흑 속성 공격이 극도로 강력하다.',
  },
  {
    code: 'MON_SF_010', name: '망령 수호자', type: 'normal', element: 'dark', level: 50,
    hp: 400, attack: 52, defense: 22, speed: 10,
    skills: [
      { name: '영혼 참격', damage: 65, cooldown: 5, element: 'dark', effectType: 'damage' },
      { name: '망령의 포옹', damage: 50, cooldown: 8, element: 'dark', effectType: 'damage' },
      { name: '죽음의 선고', damage: 80, cooldown: 20, element: 'dark', effectType: 'damage' },
    ],
    dropTable: [
      { itemId: 'MAT_WRAITH_ESSENCE', rate: 0.25, minQty: 1, maxQty: 1 },
      { itemId: 'MAT_SHADOW_CORE', rate: 0.1, minQty: 1, maxQty: 1 },
    ],
    expReward: 380, goldReward: 120,
    behavior: { aggro_range: 10, patrol: true, flee_hp_pct: 0, enrage_hp_pct: 25 },
    location: 'shadow_fortress', respawnTime: 40,
    lore: '그림자 요새의 최심부를 지키는 망령. 죽음의 선고로 일정 시간 후 대상을 즉사시키려 한다.',
  },
];

// ─── 지역 5: 수정 동굴 (crystal_cavern) Lv.45~65 ───────────────

const crystalCavernNormals: MonsterSeed[] = [
  {
    code: 'MON_CC_001', name: '수정 골렘', type: 'normal', element: 'earth', level: 45,
    hp: 500, attack: 45, defense: 30, speed: 4,
    skills: [
      { name: '수정 주먹', damage: 60, cooldown: 5, element: 'earth', effectType: 'damage' },
      { name: '수정 파편', damage: 50, cooldown: 8, element: 'earth', effectType: 'aoe' },
    ],
    dropTable: [
      { itemId: 'MAT_CRYSTAL_ORE', rate: 0.4, minQty: 1, maxQty: 3 },
      { itemId: 'MAT_GEM_ROUGH', rate: 0.2, minQty: 1, maxQty: 1 },
    ],
    expReward: 350, goldReward: 100,
    behavior: { aggro_range: 5, patrol: false, flee_hp_pct: 0, enrage_hp_pct: 15 },
    location: 'crystal_cavern', respawnTime: 40,
    lore: '수정 동굴의 에테르가 광석에 스며들어 탄생한 골렘. 극도로 단단하지만 공명 주파수에 취약하다.',
  },
  {
    code: 'MON_CC_002', name: '프리즘 뱀', type: 'normal', element: 'light', level: 48,
    hp: 320, attack: 55, defense: 15, speed: 13,
    skills: [
      { name: '무지개 광선', damage: 65, cooldown: 6, element: 'light', effectType: 'damage' },
      { name: '프리즘 반사', damage: 45, cooldown: 10, element: 'light', effectType: 'aoe' },
    ],
    dropTable: [
      { itemId: 'MAT_PRISM_SCALE', rate: 0.3, minQty: 1, maxQty: 2 },
      { itemId: 'MAT_RAINBOW_FANG', rate: 0.15, minQty: 1, maxQty: 1 },
    ],
    expReward: 370, goldReward: 110,
    behavior: { aggro_range: 7, patrol: true, flee_hp_pct: 10, enrage_hp_pct: 0 },
    location: 'crystal_cavern', respawnTime: 30,
    lore: '수정 사이를 미끄러지듯 이동하는 대형 뱀. 빛을 굴절시켜 무지개 광선을 쏜다.',
  },
  {
    code: 'MON_CC_003', name: '동굴 트롤', type: 'normal', element: 'earth', level: 50,
    hp: 550, attack: 50, defense: 22, speed: 6,
    skills: [
      { name: '곤봉 내리치기', damage: 70, cooldown: 5, element: 'earth', effectType: 'damage' },
      { name: '바위 던지기', damage: 55, cooldown: 7, element: 'earth', effectType: 'damage' },
      { name: '재생', damage: 0, cooldown: 20, element: 'earth', effectType: 'heal' },
    ],
    dropTable: [
      { itemId: 'MAT_TROLL_BLOOD', rate: 0.35, minQty: 1, maxQty: 2 },
      { itemId: 'MAT_TROLL_HIDE', rate: 0.3, minQty: 1, maxQty: 1 },
    ],
    expReward: 400, goldReward: 120,
    behavior: { aggro_range: 6, patrol: false, flee_hp_pct: 0, enrage_hp_pct: 20 },
    location: 'crystal_cavern', respawnTime: 45,
    lore: '동굴 깊은 곳에 거주하는 거대 트롤. 재생 능력이 있어 불 속성이 아니면 쓰러뜨리기 어렵다.',
  },
  {
    code: 'MON_CC_004', name: '마나 수정 벌레', type: 'normal', element: 'aether', level: 52,
    hp: 280, attack: 58, defense: 12, speed: 10,
    skills: [
      { name: '마나 드릴', damage: 65, cooldown: 5, element: 'aether', effectType: 'damage' },
      { name: '에테르 분진', damage: 50, cooldown: 8, element: 'aether', effectType: 'aoe' },
    ],
    dropTable: [
      { itemId: 'MAT_MANA_CARAPACE', rate: 0.35, minQty: 1, maxQty: 1 },
      { itemId: 'MAT_AETHER_POWDER', rate: 0.3, minQty: 1, maxQty: 2 },
    ],
    expReward: 420, goldReward: 130,
    behavior: { aggro_range: 6, patrol: true, flee_hp_pct: 15, enrage_hp_pct: 0 },
    location: 'crystal_cavern', respawnTime: 30,
    lore: '수정을 파먹고 에테르를 축적하는 갑충. 단단한 외골격 아래에 순수 마나를 품고 있다.',
  },
  {
    code: 'MON_CC_005', name: '수정 박쥐 군주', type: 'normal', element: 'dark', level: 55,
    hp: 340, attack: 60, defense: 14, speed: 15,
    skills: [
      { name: '초음파 폭발', damage: 70, cooldown: 6, element: 'dark', effectType: 'aoe' },
      { name: '수정 흡혈', damage: 55, cooldown: 8, element: 'dark', effectType: 'damage' },
    ],
    dropTable: [
      { itemId: 'MAT_CRYSTAL_WING', rate: 0.3, minQty: 1, maxQty: 1 },
      { itemId: 'MAT_BLOOD_CRYSTAL', rate: 0.1, minQty: 1, maxQty: 1 },
    ],
    expReward: 450, goldReward: 140,
    behavior: { aggro_range: 10, patrol: true, flee_hp_pct: 0, enrage_hp_pct: 25 },
    location: 'crystal_cavern', respawnTime: 35,
    lore: '동굴 박쥐의 왕. 수정으로 된 날개에서 초음파를 증폭시켜 치명적인 충격파를 발산한다.',
  },
  {
    code: 'MON_CC_006', name: '용암 정령', type: 'normal', element: 'fire', level: 57,
    hp: 420, attack: 62, defense: 18, speed: 7,
    skills: [
      { name: '용암 분출', damage: 75, cooldown: 6, element: 'fire', effectType: 'aoe' },
      { name: '화염 아우라', damage: 40, cooldown: 10, element: 'fire', effectType: 'dot' },
    ],
    dropTable: [
      { itemId: 'MAT_LAVA_CORE', rate: 0.25, minQty: 1, maxQty: 1 },
      { itemId: 'MAT_FIRE_CRYSTAL_PURE', rate: 0.1, minQty: 1, maxQty: 1 },
    ],
    expReward: 470, goldReward: 148,
    behavior: { aggro_range: 6, patrol: false, flee_hp_pct: 0, enrage_hp_pct: 20 },
    location: 'crystal_cavern', respawnTime: 40,
    lore: '동굴 최심부 용암 지대에서 올라온 화염 정령. 주변 온도를 극도로 올려 접근 자체가 위험하다.',
  },
  {
    code: 'MON_CC_007', name: '빙결 정령', type: 'normal', element: 'ice', level: 58,
    hp: 380, attack: 58, defense: 20, speed: 8,
    skills: [
      { name: '빙결 창', damage: 70, cooldown: 5, element: 'ice', effectType: 'damage' },
      { name: '절대영도', damage: 60, cooldown: 12, element: 'ice', effectType: 'aoe' },
      { name: '얼음 감옥', damage: 0, cooldown: 18, element: 'ice', effectType: 'debuff' },
    ],
    dropTable: [
      { itemId: 'MAT_FROST_CORE', rate: 0.25, minQty: 1, maxQty: 1 },
      { itemId: 'MAT_ICE_CRYSTAL_PURE', rate: 0.1, minQty: 1, maxQty: 1 },
    ],
    expReward: 480, goldReward: 152,
    behavior: { aggro_range: 7, patrol: false, flee_hp_pct: 0, enrage_hp_pct: 20 },
    location: 'crystal_cavern', respawnTime: 40,
    lore: '동굴의 얼음 구간을 지배하는 빙결 정령. 주변 모든 것을 얼려버리는 절대영도의 힘을 지녔다.',
  },
  {
    code: 'MON_CC_008', name: '보석 스콜피온', type: 'normal', element: 'earth', level: 60,
    hp: 480, attack: 56, defense: 28, speed: 9,
    skills: [
      { name: '보석 꼬리 찌르기', damage: 80, cooldown: 5, element: 'earth', effectType: 'damage' },
      { name: '보석 껍질', damage: 0, cooldown: 15, element: 'earth', effectType: 'heal' },
      { name: '독침', damage: 50, cooldown: 7, element: 'dark', effectType: 'dot' },
    ],
    dropTable: [
      { itemId: 'MAT_GEM_STINGER', rate: 0.25, minQty: 1, maxQty: 1 },
      { itemId: 'MAT_SCORPION_SHELL', rate: 0.35, minQty: 1, maxQty: 2 },
    ],
    expReward: 500, goldReward: 160,
    behavior: { aggro_range: 6, patrol: true, flee_hp_pct: 0, enrage_hp_pct: 15 },
    location: 'crystal_cavern', respawnTime: 35,
    lore: '동굴의 보석을 껍질로 삼은 거대 전갈. 보석 갑옷의 방어력이 압도적이다.',
  },
  {
    code: 'MON_CC_009', name: '공명 정령', type: 'normal', element: 'aether', level: 62,
    hp: 360, attack: 65, defense: 16, speed: 11,
    skills: [
      { name: '공명 파동', damage: 80, cooldown: 6, element: 'aether', effectType: 'aoe' },
      { name: '에테르 공명', damage: 70, cooldown: 8, element: 'aether', effectType: 'damage' },
    ],
    dropTable: [
      { itemId: 'MAT_RESONANCE_CRYSTAL', rate: 0.25, minQty: 1, maxQty: 1 },
      { itemId: 'MAT_AETHER_SHARD', rate: 0.35, minQty: 1, maxQty: 2 },
    ],
    expReward: 520, goldReward: 168,
    behavior: { aggro_range: 8, patrol: true, flee_hp_pct: 0, enrage_hp_pct: 25 },
    location: 'crystal_cavern', respawnTime: 40,
    lore: '수정 동굴 전체와 공명하는 고위 정령. 동굴 자체를 무기로 사용하며 파동으로 공격한다.',
  },
  {
    code: 'MON_CC_010', name: '차원 균열 벌레', type: 'normal', element: 'aether', level: 65,
    hp: 400, attack: 68, defense: 18, speed: 12,
    skills: [
      { name: '차원 절단', damage: 85, cooldown: 6, element: 'aether', effectType: 'damage' },
      { name: '공간 뒤틀림', damage: 70, cooldown: 10, element: 'aether', effectType: 'aoe' },
      { name: '차원 도약', damage: 0, cooldown: 15, element: 'aether', effectType: 'debuff' },
    ],
    dropTable: [
      { itemId: 'MAT_RIFT_ESSENCE', rate: 0.2, minQty: 1, maxQty: 1 },
      { itemId: 'MAT_DIMENSION_SHARD', rate: 0.3, minQty: 1, maxQty: 2 },
    ],
    expReward: 550, goldReward: 175,
    behavior: { aggro_range: 8, patrol: true, flee_hp_pct: 0, enrage_hp_pct: 20 },
    location: 'crystal_cavern', respawnTime: 45,
    lore: '차원의 균열에서 기어나온 에테르 벌레. 공간을 뒤틀어 순간이동하며 예측 불가능한 공격을 한다.',
  },
];

// ─── 지역 6: 허공의 심연 (void_abyss) Lv.60~80 ────────────────

const voidAbyssNormals: MonsterSeed[] = [
  {
    code: 'MON_VA_001', name: '허공의 촉수', type: 'normal', element: 'dark', level: 60,
    hp: 450, attack: 60, defense: 20, speed: 8,
    skills: [
      { name: '촉수 휘감기', damage: 75, cooldown: 5, element: 'dark', effectType: 'damage' },
      { name: '허공의 흡입', damage: 60, cooldown: 8, element: 'dark', effectType: 'debuff' },
    ],
    dropTable: [
      { itemId: 'MAT_VOID_TENTACLE', rate: 0.35, minQty: 1, maxQty: 2 },
      { itemId: 'MAT_ABYSSAL_INK', rate: 0.2, minQty: 1, maxQty: 1 },
    ],
    expReward: 500, goldReward: 155,
    behavior: { aggro_range: 7, patrol: false, flee_hp_pct: 0, enrage_hp_pct: 0 },
    location: 'void_abyss', respawnTime: 35,
    lore: '허공의 심연에서 뻗어 나온 거대한 촉수. 본체는 보이지 않으며, 닿는 모든 것을 허공으로 끌어들인다.',
  },
  {
    code: 'MON_VA_002', name: '차원 방랑자', type: 'normal', element: 'aether', level: 63,
    hp: 380, attack: 68, defense: 16, speed: 14,
    skills: [
      { name: '차원 칼날', damage: 80, cooldown: 5, element: 'aether', effectType: 'damage' },
      { name: '위상 전환', damage: 0, cooldown: 12, element: 'aether', effectType: 'debuff' },
      { name: '차원 폭풍', damage: 90, cooldown: 15, element: 'aether', effectType: 'aoe' },
    ],
    dropTable: [
      { itemId: 'MAT_DIMENSION_BLADE', rate: 0.2, minQty: 1, maxQty: 1 },
      { itemId: 'MAT_PHASE_CRYSTAL', rate: 0.15, minQty: 1, maxQty: 1 },
    ],
    expReward: 550, goldReward: 170,
    behavior: { aggro_range: 10, patrol: true, flee_hp_pct: 15, enrage_hp_pct: 0 },
    location: 'void_abyss', respawnTime: 30,
    lore: '차원 사이를 떠도는 존재. 위상을 전환해 물리 공격을 무시하고, 차원 칼날로 공간을 베어낸다.',
  },
  {
    code: 'MON_VA_003', name: '허공의 눈', type: 'normal', element: 'dark', level: 65,
    hp: 300, attack: 75, defense: 10, speed: 6,
    skills: [
      { name: '멸망의 시선', damage: 90, cooldown: 7, element: 'dark', effectType: 'damage' },
      { name: '광기의 눈동자', damage: 0, cooldown: 15, element: 'dark', effectType: 'debuff' },
      { name: '허공의 레이저', damage: 100, cooldown: 12, element: 'dark', effectType: 'damage' },
    ],
    dropTable: [
      { itemId: 'MAT_VOID_LENS', rate: 0.2, minQty: 1, maxQty: 1 },
      { itemId: 'MAT_DARK_PUPIL', rate: 0.1, minQty: 1, maxQty: 1 },
    ],
    expReward: 580, goldReward: 180,
    behavior: { aggro_range: 12, patrol: false, flee_hp_pct: 0, enrage_hp_pct: 25 },
    location: 'void_abyss', respawnTime: 40,
    lore: '허공에 떠도는 거대한 눈알. 멸망의 시선에 닿은 자는 정신이 녹아내리며, 레이저는 모든 것을 관통한다.',
  },
  {
    code: 'MON_VA_004', name: '엔트로피 슬라임', type: 'normal', element: 'aether', level: 67,
    hp: 520, attack: 62, defense: 25, speed: 5,
    skills: [
      { name: '엔트로피 파동', damage: 80, cooldown: 6, element: 'aether', effectType: 'aoe' },
      { name: '물질 분해', damage: 70, cooldown: 8, element: 'aether', effectType: 'damage' },
    ],
    dropTable: [
      { itemId: 'MAT_ENTROPY_GEL', rate: 0.3, minQty: 1, maxQty: 2 },
      { itemId: 'MAT_CHAOS_ESSENCE', rate: 0.12, minQty: 1, maxQty: 1 },
    ],
    expReward: 600, goldReward: 190,
    behavior: { aggro_range: 5, patrol: false, flee_hp_pct: 0, enrage_hp_pct: 15 },
    location: 'void_abyss', respawnTime: 45,
    lore: '모든 것을 분해하는 혼돈의 슬라임. 닿는 물질의 분자 구조를 해체하여 흡수한다.',
  },
  {
    code: 'MON_VA_005', name: '시공 파수꾼', type: 'normal', element: 'time', level: 70,
    hp: 480, attack: 70, defense: 22, speed: 11,
    skills: [
      { name: '시간 정지', damage: 0, cooldown: 20, element: 'time', effectType: 'debuff' },
      { name: '시공 참격', damage: 95, cooldown: 6, element: 'time', effectType: 'damage' },
      { name: '시간 역류', damage: 80, cooldown: 10, element: 'time', effectType: 'aoe' },
    ],
    dropTable: [
      { itemId: 'MAT_SPACETIME_SHARD', rate: 0.2, minQty: 1, maxQty: 1 },
      { itemId: 'MAT_CHRONO_KEY', rate: 0.05, minQty: 1, maxQty: 1 },
    ],
    expReward: 650, goldReward: 200,
    behavior: { aggro_range: 9, patrol: true, flee_hp_pct: 0, enrage_hp_pct: 20 },
    location: 'void_abyss', respawnTime: 40,
    lore: '시공간의 균열을 지키는 파수꾼. 시간을 자유롭게 조작하며 침입자를 시간의 감옥에 가둔다.',
  },
  {
    code: 'MON_VA_006', name: '심연의 해파리', type: 'normal', element: 'lightning', level: 72,
    hp: 350, attack: 78, defense: 12, speed: 8,
    skills: [
      { name: '전기 촉수', damage: 85, cooldown: 5, element: 'lightning', effectType: 'damage' },
      { name: '심연 방전', damage: 100, cooldown: 10, element: 'lightning', effectType: 'aoe' },
    ],
    dropTable: [
      { itemId: 'MAT_ABYSSAL_JELLY', rate: 0.3, minQty: 1, maxQty: 1 },
      { itemId: 'MAT_THUNDER_CORE_PURE', rate: 0.08, minQty: 1, maxQty: 1 },
    ],
    expReward: 680, goldReward: 210,
    behavior: { aggro_range: 7, patrol: false, flee_hp_pct: 0, enrage_hp_pct: 0 },
    location: 'void_abyss', respawnTime: 35,
    lore: '허공의 심연에 둥둥 떠다니는 반투명 해파리. 전기를 축적한 촉수에 닿으면 막대한 감전 피해를 입는다.',
  },
  {
    code: 'MON_VA_007', name: '망각의 기사', type: 'normal', element: 'dark', level: 74,
    hp: 550, attack: 72, defense: 28, speed: 10,
    skills: [
      { name: '망각의 검', damage: 95, cooldown: 5, element: 'dark', effectType: 'damage' },
      { name: '기억 소거', damage: 0, cooldown: 15, element: 'dark', effectType: 'debuff' },
      { name: '허무의 참격', damage: 110, cooldown: 12, element: 'dark', effectType: 'damage' },
    ],
    dropTable: [
      { itemId: 'MAT_OBLIVION_PLATE', rate: 0.2, minQty: 1, maxQty: 1 },
      { itemId: 'EQUIP_SWORD_VOID', rate: 0.01, minQty: 1, maxQty: 1 },
    ],
    expReward: 720, goldReward: 220,
    behavior: { aggro_range: 9, patrol: true, flee_hp_pct: 0, enrage_hp_pct: 20 },
    location: 'void_abyss', respawnTime: 45,
    lore: '모든 기억을 잃고 허공을 떠도는 기사. 망각의 검에 베이면 전투 중 획득한 버프가 사라진다.',
  },
  {
    code: 'MON_VA_008', name: '허공의 거미 여왕', type: 'normal', element: 'dark', level: 76,
    hp: 480, attack: 80, defense: 20, speed: 12,
    skills: [
      { name: '허공의 거미줄', damage: 0, cooldown: 8, element: 'dark', effectType: 'debuff' },
      { name: '맹독 주입', damage: 90, cooldown: 6, element: 'dark', effectType: 'dot' },
      { name: '새끼 소환', damage: 50, cooldown: 15, element: 'dark', effectType: 'aoe' },
    ],
    dropTable: [
      { itemId: 'MAT_VOID_SILK', rate: 0.25, minQty: 1, maxQty: 2 },
      { itemId: 'MAT_QUEEN_VENOM', rate: 0.1, minQty: 1, maxQty: 1 },
    ],
    expReward: 750, goldReward: 230,
    behavior: { aggro_range: 8, patrol: false, flee_hp_pct: 10, enrage_hp_pct: 25 },
    location: 'void_abyss', respawnTime: 40,
    lore: '허공의 심연에 거대한 둥지를 틀고 있는 거미 여왕. 새끼를 소환하고 맹독으로 먹잇감을 마비시킨다.',
  },
  {
    code: 'MON_VA_009', name: '에테르 드래곤릿', type: 'normal', element: 'aether', level: 78,
    hp: 600, attack: 82, defense: 25, speed: 13,
    skills: [
      { name: '에테르 브레스', damage: 110, cooldown: 8, element: 'aether', effectType: 'aoe' },
      { name: '용의 발톱', damage: 90, cooldown: 5, element: 'neutral', effectType: 'damage' },
      { name: '에테르 보호막', damage: 0, cooldown: 20, element: 'aether', effectType: 'heal' },
    ],
    dropTable: [
      { itemId: 'MAT_DRAGON_SCALE', rate: 0.15, minQty: 1, maxQty: 1 },
      { itemId: 'MAT_AETHER_HEART', rate: 0.05, minQty: 1, maxQty: 1 },
    ],
    expReward: 800, goldReward: 250,
    behavior: { aggro_range: 12, patrol: true, flee_hp_pct: 0, enrage_hp_pct: 20 },
    location: 'void_abyss', respawnTime: 50,
    lore: '어린 에테르 드래곤. 성체에는 한참 못 미치지만 이미 에테르 브레스를 사용할 수 있는 위험한 존재.',
  },
  {
    code: 'MON_VA_010', name: '종말의 사도', type: 'normal', element: 'dark', level: 80,
    hp: 650, attack: 88, defense: 30, speed: 11,
    skills: [
      { name: '종말의 선언', damage: 120, cooldown: 10, element: 'dark', effectType: 'aoe' },
      { name: '허무의 손', damage: 100, cooldown: 6, element: 'dark', effectType: 'damage' },
      { name: '어둠의 갑옷', damage: 0, cooldown: 18, element: 'dark', effectType: 'heal' },
      { name: '영혼 수확', damage: 80, cooldown: 8, element: 'dark', effectType: 'damage' },
    ],
    dropTable: [
      { itemId: 'MAT_APOCALYPSE_SHARD', rate: 0.15, minQty: 1, maxQty: 1 },
      { itemId: 'MAT_DOOM_ESSENCE', rate: 0.08, minQty: 1, maxQty: 1 },
    ],
    expReward: 850, goldReward: 280,
    behavior: { aggro_range: 10, patrol: true, flee_hp_pct: 0, enrage_hp_pct: 25 },
    location: 'void_abyss', respawnTime: 55,
    lore: '세계의 종말을 예언하며 허공을 떠도는 사도. 그의 선언이 울려퍼지면 주변 모든 생명이 약해진다.',
  },
];

// ─── 엘리트 몬스터 20마리 (지역당 3~4) ─────────────────────────

const eliteMonsters: MonsterSeed[] = [
  // 황혼의 숲 (3)
  {
    code: 'MON_TF_E01', name: '숲의 수호자 엔트', type: 'elite', element: 'earth', level: 12,
    hp: 600, attack: 30, defense: 20, speed: 4,
    skills: [
      { name: '대지의 분노', damage: 45, cooldown: 6, element: 'earth', effectType: 'aoe' },
      { name: '뿌리 감옥', damage: 25, cooldown: 10, element: 'earth', effectType: 'debuff' },
      { name: '자연 치유', damage: 0, cooldown: 20, element: 'earth', effectType: 'heal' },
    ],
    dropTable: [
      { itemId: 'MAT_ANCIENT_BARK', rate: 0.5, minQty: 1, maxQty: 2 },
      { itemId: 'MAT_SPIRIT_WOOD', rate: 0.25, minQty: 1, maxQty: 1 },
      { itemId: 'EQUIP_STAFF_NATURE', rate: 0.05, minQty: 1, maxQty: 1 },
    ],
    expReward: 200, goldReward: 80,
    behavior: { aggro_range: 6, patrol: false, flee_hp_pct: 0, enrage_hp_pct: 25 },
    location: 'twilight_forest', respawnTime: 120,
    lore: '황혼의 숲을 수호하는 고대 엔트. 숲을 해치는 자에게만 반응하며, 분노 시 대지가 뒤흔들린다.',
  },
  {
    code: 'MON_TF_E02', name: '달빛 늑대 우두머리', type: 'elite', element: 'light', level: 14,
    hp: 500, attack: 35, defense: 15, speed: 14,
    skills: [
      { name: '월광 돌진', damage: 50, cooldown: 5, element: 'light', effectType: 'damage' },
      { name: '늑대 소환', damage: 0, cooldown: 20, element: 'neutral', effectType: 'debuff' },
      { name: '달의 포효', damage: 35, cooldown: 10, element: 'light', effectType: 'aoe' },
    ],
    dropTable: [
      { itemId: 'MAT_MOONLIT_PELT', rate: 0.4, minQty: 1, maxQty: 1 },
      { itemId: 'MAT_ALPHA_FANG', rate: 0.3, minQty: 1, maxQty: 1 },
      { itemId: 'EQUIP_NECKLACE_WOLF', rate: 0.05, minQty: 1, maxQty: 1 },
    ],
    expReward: 220, goldReward: 90,
    behavior: { aggro_range: 12, patrol: true, flee_hp_pct: 0, enrage_hp_pct: 30 },
    location: 'twilight_forest', respawnTime: 150,
    lore: '늑대 무리의 알파. 달빛을 받으면 더욱 강해지며, 포효로 동료 늑대를 전장에 불러낸다.',
  },
  {
    code: 'MON_TF_E03', name: '독안개 여왕 거미', type: 'elite', element: 'dark', level: 15,
    hp: 450, attack: 40, defense: 12, speed: 10,
    skills: [
      { name: '맹독 분사', damage: 30, cooldown: 4, element: 'dark', effectType: 'dot' },
      { name: '거미줄 트랩', damage: 0, cooldown: 8, element: 'dark', effectType: 'debuff' },
      { name: '독액 폭발', damage: 55, cooldown: 12, element: 'dark', effectType: 'aoe' },
    ],
    dropTable: [
      { itemId: 'MAT_QUEEN_SILK', rate: 0.35, minQty: 1, maxQty: 2 },
      { itemId: 'MAT_DEADLY_VENOM', rate: 0.2, minQty: 1, maxQty: 1 },
      { itemId: 'EQUIP_RING_POISON', rate: 0.04, minQty: 1, maxQty: 1 },
    ],
    expReward: 250, goldReward: 95,
    behavior: { aggro_range: 7, patrol: false, flee_hp_pct: 10, enrage_hp_pct: 0 },
    location: 'twilight_forest', respawnTime: 180,
    lore: '황혼의 숲 깊은 곳에 둥지를 튼 거미 여왕. 독안개로 시야를 가리고 거미줄로 사냥감을 포획한다.',
  },
  // 크로노스 시가지 (3)
  {
    code: 'MON_KC_E01', name: '시계탑 수호자', type: 'elite', element: 'time', level: 22,
    hp: 700, attack: 42, defense: 22, speed: 9,
    skills: [
      { name: '시간 역행 칼날', damage: 55, cooldown: 5, element: 'time', effectType: 'damage' },
      { name: '시간 감속 필드', damage: 0, cooldown: 12, element: 'time', effectType: 'debuff' },
      { name: '시계 톱니 폭풍', damage: 50, cooldown: 8, element: 'neutral', effectType: 'aoe' },
      { name: '시간 되감기', damage: 0, cooldown: 25, element: 'time', effectType: 'heal' },
    ],
    dropTable: [
      { itemId: 'MAT_CHRONO_GEAR', rate: 0.35, minQty: 1, maxQty: 2 },
      { itemId: 'MAT_TIME_CRYSTAL', rate: 0.15, minQty: 1, maxQty: 1 },
      { itemId: 'EQUIP_WATCH_CHRONO', rate: 0.04, minQty: 1, maxQty: 1 },
    ],
    expReward: 350, goldReward: 120,
    behavior: { aggro_range: 8, patrol: false, flee_hp_pct: 0, enrage_hp_pct: 20 },
    location: 'kronos_city', respawnTime: 180,
    lore: '크로노스 시계탑의 최종 수호자. 시간을 자유롭게 조종하여 전투를 유리하게 이끈다.',
  },
  {
    code: 'MON_KC_E02', name: '하수구 여왕 쥐', type: 'elite', element: 'dark', level: 18,
    hp: 550, attack: 38, defense: 16, speed: 12,
    skills: [
      { name: '역병 브레스', damage: 45, cooldown: 6, element: 'dark', effectType: 'aoe' },
      { name: '쥐떼 소환', damage: 0, cooldown: 15, element: 'dark', effectType: 'debuff' },
      { name: '전염성 물기', damage: 50, cooldown: 5, element: 'dark', effectType: 'dot' },
    ],
    dropTable: [
      { itemId: 'MAT_PLAGUE_QUEEN_TAIL', rate: 0.4, minQty: 1, maxQty: 1 },
      { itemId: 'MAT_PLAGUE_CORE', rate: 0.15, minQty: 1, maxQty: 1 },
      { itemId: 'EQUIP_DAGGER_PLAGUE', rate: 0.03, minQty: 1, maxQty: 1 },
    ],
    expReward: 280, goldReward: 95,
    behavior: { aggro_range: 8, patrol: true, flee_hp_pct: 15, enrage_hp_pct: 0 },
    location: 'kronos_city', respawnTime: 150,
    lore: '하수구 쥐떼의 지배자. 역병을 품은 거대한 쥐로, 브레스 한 번에 주변이 오염된다.',
  },
  {
    code: 'MON_KC_E03', name: '망가진 전쟁기계', type: 'elite', element: 'lightning', level: 24,
    hp: 800, attack: 45, defense: 28, speed: 5,
    skills: [
      { name: '레이저 빔', damage: 65, cooldown: 6, element: 'lightning', effectType: 'damage' },
      { name: '미사일 일제사격', damage: 50, cooldown: 10, element: 'fire', effectType: 'aoe' },
      { name: '방어 모드', damage: 0, cooldown: 20, element: 'neutral', effectType: 'heal' },
    ],
    dropTable: [
      { itemId: 'MAT_WAR_MACHINE_PART', rate: 0.4, minQty: 1, maxQty: 3 },
      { itemId: 'MAT_POWER_CORE', rate: 0.1, minQty: 1, maxQty: 1 },
      { itemId: 'EQUIP_ARMOR_MECH', rate: 0.03, minQty: 1, maxQty: 1 },
    ],
    expReward: 380, goldReward: 130,
    behavior: { aggro_range: 10, patrol: false, flee_hp_pct: 0, enrage_hp_pct: 15 },
    location: 'kronos_city', respawnTime: 200,
    lore: '고대 전쟁에서 버려진 전쟁기계가 에테르로 재가동되었다. 오작동으로 아군과 적을 구분하지 못한다.',
  },
  // 에테리아 마을 (4)
  {
    code: 'MON_AV_E01', name: '에테르 수호신', type: 'elite', element: 'aether', level: 30,
    hp: 750, attack: 50, defense: 25, speed: 10,
    skills: [
      { name: '신성 에테르 파동', damage: 65, cooldown: 6, element: 'aether', effectType: 'aoe' },
      { name: '에테르 결계', damage: 0, cooldown: 15, element: 'aether', effectType: 'heal' },
      { name: '정화의 빛', damage: 70, cooldown: 8, element: 'light', effectType: 'damage' },
    ],
    dropTable: [
      { itemId: 'MAT_DIVINE_AETHER', rate: 0.3, minQty: 1, maxQty: 1 },
      { itemId: 'MAT_GUARDIAN_ESSENCE', rate: 0.15, minQty: 1, maxQty: 1 },
      { itemId: 'EQUIP_SHIELD_AETHER', rate: 0.04, minQty: 1, maxQty: 1 },
    ],
    expReward: 400, goldReward: 140,
    behavior: { aggro_range: 8, patrol: false, flee_hp_pct: 0, enrage_hp_pct: 20 },
    location: 'aetheria_village', respawnTime: 180,
    lore: '에테리아 마을을 수호하는 고위 정령. 마을에 적의를 품은 자에게만 반응하는 심판자.',
  },
  {
    code: 'MON_AV_E02', name: '전장의 망령 장군', type: 'elite', element: 'fire', level: 32,
    hp: 680, attack: 55, defense: 20, speed: 11,
    skills: [
      { name: '화염 군도', damage: 70, cooldown: 5, element: 'fire', effectType: 'damage' },
      { name: '잔영 병사 소환', damage: 40, cooldown: 12, element: 'fire', effectType: 'aoe' },
      { name: '지휘관의 포효', damage: 0, cooldown: 18, element: 'fire', effectType: 'debuff' },
    ],
    dropTable: [
      { itemId: 'MAT_GENERAL_BADGE', rate: 0.3, minQty: 1, maxQty: 1 },
      { itemId: 'MAT_FLAME_STEEL', rate: 0.2, minQty: 1, maxQty: 1 },
      { itemId: 'EQUIP_SWORD_GENERAL', rate: 0.03, minQty: 1, maxQty: 1 },
    ],
    expReward: 430, goldReward: 150,
    behavior: { aggro_range: 10, patrol: true, flee_hp_pct: 0, enrage_hp_pct: 25 },
    location: 'aetheria_village', respawnTime: 200,
    lore: '과거 전쟁의 장군이 에테르에 의해 부활한 망령. 부하 병사를 소환하며 전장을 지휘한다.',
  },
  {
    code: 'MON_AV_E03', name: '기억의 마녀', type: 'elite', element: 'dark', level: 34,
    hp: 580, attack: 60, defense: 15, speed: 9,
    skills: [
      { name: '기억 폭발', damage: 75, cooldown: 6, element: 'dark', effectType: 'aoe' },
      { name: '정신 지배', damage: 0, cooldown: 15, element: 'dark', effectType: 'debuff' },
      { name: '과거의 고통', damage: 65, cooldown: 8, element: 'dark', effectType: 'dot' },
      { name: '기억 치유', damage: 0, cooldown: 20, element: 'dark', effectType: 'heal' },
    ],
    dropTable: [
      { itemId: 'MAT_MEMORY_ORB', rate: 0.3, minQty: 1, maxQty: 1 },
      { itemId: 'MAT_WITCH_HAT', rate: 0.15, minQty: 1, maxQty: 1 },
      { itemId: 'EQUIP_STAFF_MEMORY', rate: 0.03, minQty: 1, maxQty: 1 },
    ],
    expReward: 460, goldReward: 155,
    behavior: { aggro_range: 9, patrol: false, flee_hp_pct: 20, enrage_hp_pct: 0 },
    location: 'aetheria_village', respawnTime: 180,
    lore: '기억을 조종하는 마녀. 대상의 가장 고통스러운 기억을 끌어내 무기로 사용한다.',
  },
  {
    code: 'MON_AV_E04', name: '폭풍의 그리폰', type: 'elite', element: 'lightning', level: 35,
    hp: 700, attack: 58, defense: 18, speed: 16,
    skills: [
      { name: '번개 급강하', damage: 80, cooldown: 6, element: 'lightning', effectType: 'damage' },
      { name: '폭풍 날개짓', damage: 60, cooldown: 8, element: 'lightning', effectType: 'aoe' },
      { name: '번개 보호막', damage: 0, cooldown: 18, element: 'lightning', effectType: 'heal' },
    ],
    dropTable: [
      { itemId: 'MAT_GRIFFIN_FEATHER', rate: 0.3, minQty: 1, maxQty: 1 },
      { itemId: 'MAT_STORM_CLAW', rate: 0.2, minQty: 1, maxQty: 1 },
      { itemId: 'EQUIP_RING_STORM', rate: 0.04, minQty: 1, maxQty: 1 },
    ],
    expReward: 480, goldReward: 160,
    behavior: { aggro_range: 14, patrol: true, flee_hp_pct: 10, enrage_hp_pct: 0 },
    location: 'aetheria_village', respawnTime: 200,
    lore: '에테리아 상공을 비행하는 폭풍의 그리폰. 번개를 몸에 두르고 급강하하는 공격은 일격필살에 가깝다.',
  },
  // 그림자 요새 (3)
  {
    code: 'MON_SF_E01', name: '그림자 장군', type: 'elite', element: 'dark', level: 45,
    hp: 1000, attack: 65, defense: 30, speed: 10,
    skills: [
      { name: '어둠의 군령', damage: 80, cooldown: 6, element: 'dark', effectType: 'aoe' },
      { name: '그림자 분신', damage: 0, cooldown: 15, element: 'dark', effectType: 'debuff' },
      { name: '처형의 칼날', damage: 100, cooldown: 10, element: 'dark', effectType: 'damage' },
      { name: '어둠 회복', damage: 0, cooldown: 20, element: 'dark', effectType: 'heal' },
    ],
    dropTable: [
      { itemId: 'MAT_SHADOW_GENERAL_BADGE', rate: 0.3, minQty: 1, maxQty: 1 },
      { itemId: 'MAT_DARK_COMMANDER_CAPE', rate: 0.15, minQty: 1, maxQty: 1 },
      { itemId: 'EQUIP_ARMOR_SHADOW', rate: 0.04, minQty: 1, maxQty: 1 },
    ],
    expReward: 600, goldReward: 200,
    behavior: { aggro_range: 10, patrol: true, flee_hp_pct: 0, enrage_hp_pct: 25 },
    location: 'shadow_fortress', respawnTime: 240,
    lore: '그림자 군단의 장군. 수백의 암흑 기사를 지휘하며, 분신을 만들어 전략적으로 싸운다.',
  },
  {
    code: 'MON_SF_E02', name: '죽음의 기사단장', type: 'elite', element: 'dark', level: 48,
    hp: 1100, attack: 70, defense: 35, speed: 8,
    skills: [
      { name: '사신의 낫', damage: 95, cooldown: 6, element: 'dark', effectType: 'damage' },
      { name: '죽음의 오라', damage: 50, cooldown: 10, element: 'dark', effectType: 'dot' },
      { name: '불사의 맹세', damage: 0, cooldown: 25, element: 'dark', effectType: 'heal' },
    ],
    dropTable: [
      { itemId: 'MAT_DEATH_SCYTHE_SHARD', rate: 0.25, minQty: 1, maxQty: 1 },
      { itemId: 'MAT_UNDYING_PLATE', rate: 0.15, minQty: 1, maxQty: 1 },
      { itemId: 'EQUIP_SCYTHE_DEATH', rate: 0.03, minQty: 1, maxQty: 1 },
    ],
    expReward: 650, goldReward: 220,
    behavior: { aggro_range: 9, patrol: true, flee_hp_pct: 0, enrage_hp_pct: 20 },
    location: 'shadow_fortress', respawnTime: 270,
    lore: '죽음을 넘어선 기사단장. 불사의 맹세로 한 번은 쓰러져도 다시 일어나며 사신의 낫을 휘두른다.',
  },
  {
    code: 'MON_SF_E03', name: '화염 마왕 부관', type: 'elite', element: 'fire', level: 50,
    hp: 900, attack: 75, defense: 22, speed: 12,
    skills: [
      { name: '지옥 화염', damage: 100, cooldown: 7, element: 'fire', effectType: 'aoe' },
      { name: '화염 채찍', damage: 85, cooldown: 5, element: 'fire', effectType: 'damage' },
      { name: '업화', damage: 60, cooldown: 10, element: 'fire', effectType: 'dot' },
    ],
    dropTable: [
      { itemId: 'MAT_HELLFIRE_CORE', rate: 0.25, minQty: 1, maxQty: 1 },
      { itemId: 'MAT_DEMON_HORN', rate: 0.2, minQty: 1, maxQty: 1 },
      { itemId: 'EQUIP_WHIP_FIRE', rate: 0.03, minQty: 1, maxQty: 1 },
    ],
    expReward: 700, goldReward: 240,
    behavior: { aggro_range: 10, patrol: false, flee_hp_pct: 0, enrage_hp_pct: 30 },
    location: 'shadow_fortress', respawnTime: 300,
    lore: '그림자 요새 최심부에서 마왕을 보좌하는 화염 악마. 지옥의 화염을 다루는 무시무시한 존재.',
  },
  // 수정 동굴 (4)
  {
    code: 'MON_CC_E01', name: '수정왕 골렘', type: 'elite', element: 'earth', level: 55,
    hp: 1200, attack: 65, defense: 40, speed: 3,
    skills: [
      { name: '수정 대포', damage: 90, cooldown: 6, element: 'earth', effectType: 'damage' },
      { name: '수정 비', damage: 75, cooldown: 10, element: 'earth', effectType: 'aoe' },
      { name: '수정 갑옷', damage: 0, cooldown: 20, element: 'earth', effectType: 'heal' },
    ],
    dropTable: [
      { itemId: 'MAT_KING_CRYSTAL', rate: 0.3, minQty: 1, maxQty: 1 },
      { itemId: 'MAT_PERFECT_GEM', rate: 0.1, minQty: 1, maxQty: 1 },
      { itemId: 'EQUIP_ARMOR_CRYSTAL', rate: 0.04, minQty: 1, maxQty: 1 },
    ],
    expReward: 700, goldReward: 230,
    behavior: { aggro_range: 6, patrol: false, flee_hp_pct: 0, enrage_hp_pct: 15 },
    location: 'crystal_cavern', respawnTime: 240,
    lore: '수정 동굴의 지배자. 몸 전체가 최고급 수정으로 이루어져 있으며 방어력이 압도적이다.',
  },
  {
    code: 'MON_CC_E02', name: '용암 드레이크', type: 'elite', element: 'fire', level: 58,
    hp: 950, attack: 80, defense: 25, speed: 11,
    skills: [
      { name: '용암 브레스', damage: 100, cooldown: 7, element: 'fire', effectType: 'aoe' },
      { name: '화염 돌진', damage: 85, cooldown: 5, element: 'fire', effectType: 'damage' },
      { name: '마그마 분출', damage: 70, cooldown: 10, element: 'fire', effectType: 'dot' },
    ],
    dropTable: [
      { itemId: 'MAT_DRAKE_SCALE', rate: 0.3, minQty: 1, maxQty: 1 },
      { itemId: 'MAT_MAGMA_HEART', rate: 0.1, minQty: 1, maxQty: 1 },
      { itemId: 'EQUIP_SWORD_MAGMA', rate: 0.03, minQty: 1, maxQty: 1 },
    ],
    expReward: 750, goldReward: 250,
    behavior: { aggro_range: 10, patrol: true, flee_hp_pct: 0, enrage_hp_pct: 25 },
    location: 'crystal_cavern', respawnTime: 270,
    lore: '동굴 최심부 용암 호수에서 올라온 소형 드래곤. 성체 드래곤만큼은 아니지만 충분히 위협적이다.',
  },
  {
    code: 'MON_CC_E03', name: '공명의 대정령', type: 'elite', element: 'aether', level: 62,
    hp: 850, attack: 78, defense: 20, speed: 13,
    skills: [
      { name: '대공명', damage: 110, cooldown: 8, element: 'aether', effectType: 'aoe' },
      { name: '에테르 흡수', damage: 80, cooldown: 6, element: 'aether', effectType: 'damage' },
      { name: '공명 보호막', damage: 0, cooldown: 18, element: 'aether', effectType: 'heal' },
    ],
    dropTable: [
      { itemId: 'MAT_GRAND_RESONANCE', rate: 0.25, minQty: 1, maxQty: 1 },
      { itemId: 'MAT_AETHER_CORE_PURE', rate: 0.08, minQty: 1, maxQty: 1 },
      { itemId: 'EQUIP_ORB_RESONANCE', rate: 0.03, minQty: 1, maxQty: 1 },
    ],
    expReward: 800, goldReward: 270,
    behavior: { aggro_range: 8, patrol: true, flee_hp_pct: 0, enrage_hp_pct: 20 },
    location: 'crystal_cavern', respawnTime: 240,
    lore: '수정 동굴 전체와 공명하는 대정령. 동굴이 곧 그의 몸이며 어디서든 에테르를 끌어 모은다.',
  },
  {
    code: 'MON_CC_E04', name: '심연의 나가', type: 'elite', element: 'ice', level: 64,
    hp: 1000, attack: 82, defense: 22, speed: 12,
    skills: [
      { name: '빙결 창술', damage: 95, cooldown: 5, element: 'ice', effectType: 'damage' },
      { name: '빙하 소환', damage: 80, cooldown: 10, element: 'ice', effectType: 'aoe' },
      { name: '동결 결계', damage: 0, cooldown: 15, element: 'ice', effectType: 'debuff' },
      { name: '빙정 치유', damage: 0, cooldown: 22, element: 'ice', effectType: 'heal' },
    ],
    dropTable: [
      { itemId: 'MAT_NAGA_SCALE', rate: 0.3, minQty: 1, maxQty: 1 },
      { itemId: 'MAT_FROST_PEARL', rate: 0.1, minQty: 1, maxQty: 1 },
      { itemId: 'EQUIP_SPEAR_ICE', rate: 0.03, minQty: 1, maxQty: 1 },
    ],
    expReward: 850, goldReward: 280,
    behavior: { aggro_range: 9, patrol: false, flee_hp_pct: 0, enrage_hp_pct: 25 },
    location: 'crystal_cavern', respawnTime: 270,
    lore: '동굴 심연의 빙결 호수를 지배하는 나가. 뱀 같은 하반신과 얼음 창술이 위협적이다.',
  },
  // 허공의 심연 (3)
  {
    code: 'MON_VA_E01', name: '허공의 집행자', type: 'elite', element: 'dark', level: 72,
    hp: 1300, attack: 90, defense: 30, speed: 12,
    skills: [
      { name: '허무의 대검', damage: 120, cooldown: 6, element: 'dark', effectType: 'damage' },
      { name: '차원 단절', damage: 0, cooldown: 15, element: 'dark', effectType: 'debuff' },
      { name: '허공의 심판', damage: 100, cooldown: 10, element: 'dark', effectType: 'aoe' },
      { name: '어둠 흡수', damage: 0, cooldown: 20, element: 'dark', effectType: 'heal' },
    ],
    dropTable: [
      { itemId: 'MAT_EXECUTOR_BLADE', rate: 0.2, minQty: 1, maxQty: 1 },
      { itemId: 'MAT_VOID_CORE', rate: 0.1, minQty: 1, maxQty: 1 },
      { itemId: 'EQUIP_SWORD_EXECUTOR', rate: 0.03, minQty: 1, maxQty: 1 },
    ],
    expReward: 1000, goldReward: 350,
    behavior: { aggro_range: 10, patrol: true, flee_hp_pct: 0, enrage_hp_pct: 25 },
    location: 'void_abyss', respawnTime: 300,
    lore: '허공의 심연에서 심판을 집행하는 존재. 차원을 단절시켜 도주를 막고 대검으로 처형한다.',
  },
  {
    code: 'MON_VA_E02', name: '시간의 감시자', type: 'elite', element: 'time', level: 75,
    hp: 1200, attack: 95, defense: 25, speed: 14,
    skills: [
      { name: '시간 붕괴', damage: 130, cooldown: 8, element: 'time', effectType: 'aoe' },
      { name: '시간 가속', damage: 0, cooldown: 12, element: 'time', effectType: 'debuff' },
      { name: '크로노 블레이드', damage: 110, cooldown: 5, element: 'time', effectType: 'damage' },
    ],
    dropTable: [
      { itemId: 'MAT_WATCHER_EYE', rate: 0.2, minQty: 1, maxQty: 1 },
      { itemId: 'MAT_CHRONO_HEART', rate: 0.08, minQty: 1, maxQty: 1 },
      { itemId: 'EQUIP_WATCH_ETERNAL', rate: 0.02, minQty: 1, maxQty: 1 },
    ],
    expReward: 1100, goldReward: 380,
    behavior: { aggro_range: 12, patrol: true, flee_hp_pct: 0, enrage_hp_pct: 20 },
    location: 'void_abyss', respawnTime: 300,
    lore: '시간의 흐름을 감시하는 초월적 존재. 시간을 자유롭게 조종하여 과거와 미래를 무기로 삼는다.',
  },
  {
    code: 'MON_VA_E03', name: '에테르 드래곤 근위병', type: 'elite', element: 'aether', level: 78,
    hp: 1500, attack: 100, defense: 35, speed: 13,
    skills: [
      { name: '에테르 대브레스', damage: 140, cooldown: 8, element: 'aether', effectType: 'aoe' },
      { name: '용의 위엄', damage: 0, cooldown: 15, element: 'aether', effectType: 'debuff' },
      { name: '에테르 클로', damage: 110, cooldown: 5, element: 'aether', effectType: 'damage' },
      { name: '에테르 재생', damage: 0, cooldown: 25, element: 'aether', effectType: 'heal' },
    ],
    dropTable: [
      { itemId: 'MAT_DRAGON_GUARD_SCALE', rate: 0.2, minQty: 1, maxQty: 1 },
      { itemId: 'MAT_AETHER_DRAGON_BLOOD', rate: 0.05, minQty: 1, maxQty: 1 },
      { itemId: 'EQUIP_ARMOR_DRAGON', rate: 0.02, minQty: 1, maxQty: 1 },
    ],
    expReward: 1200, goldReward: 400,
    behavior: { aggro_range: 14, patrol: true, flee_hp_pct: 0, enrage_hp_pct: 25 },
    location: 'void_abyss', respawnTime: 360,
    lore: '에테르 드래곤의 근위병. 성체 드래곤의 명령에 따라 심연의 입구를 지키는 최강의 용인족.',
  },
];

// ─── 던전 보스 12마리 (던전당 1) ────────────────────────────────

const dungeonBosses: MonsterSeed[] = [
  {
    code: 'MON_BOSS_TF01', name: '고대 트렌트 오미가', type: 'boss', element: 'earth', level: 15,
    hp: 2000, attack: 40, defense: 25, speed: 3,
    skills: [
      { name: '세계수의 분노', damage: 60, cooldown: 8, element: 'earth', effectType: 'aoe' },
      { name: '뿌리 감옥', damage: 30, cooldown: 6, element: 'earth', effectType: 'debuff' },
      { name: '자연 재생', damage: 0, cooldown: 15, element: 'earth', effectType: 'heal' },
      { name: '낙엽 폭풍', damage: 50, cooldown: 10, element: 'earth', effectType: 'aoe' },
    ],
    dropTable: [
      { itemId: 'MAT_ANCIENT_HEARTWOOD', rate: 1.0, minQty: 1, maxQty: 1 },
      { itemId: 'EQUIP_STAFF_TREANT', rate: 0.15, minQty: 1, maxQty: 1 },
      { itemId: 'MAT_SPIRIT_WOOD', rate: 0.5, minQty: 2, maxQty: 4 },
    ],
    expReward: 500, goldReward: 200,
    behavior: { aggro_range: 15, patrol: false, flee_hp_pct: 0, enrage_hp_pct: 30 },
    location: 'twilight_forest', respawnTime: 600,
    lore: '황혼의 숲 던전 최심부를 지키는 고대 트렌트. HP 30% 이하에서 광폭화하며 뿌리로 전장을 뒤덮는다.',
  },
  {
    code: 'MON_BOSS_TF02', name: '달빛 수호령 루나리스', type: 'boss', element: 'light', level: 15,
    hp: 1800, attack: 45, defense: 20, speed: 12,
    skills: [
      { name: '달빛 세례', damage: 55, cooldown: 6, element: 'light', effectType: 'aoe' },
      { name: '환월참', damage: 70, cooldown: 5, element: 'light', effectType: 'damage' },
      { name: '월광 결계', damage: 0, cooldown: 18, element: 'light', effectType: 'heal' },
    ],
    dropTable: [
      { itemId: 'MAT_MOONLIGHT_CORE', rate: 1.0, minQty: 1, maxQty: 1 },
      { itemId: 'EQUIP_SWORD_MOON', rate: 0.12, minQty: 1, maxQty: 1 },
      { itemId: 'MAT_LIGHT_ESSENCE', rate: 0.6, minQty: 2, maxQty: 3 },
    ],
    expReward: 480, goldReward: 190,
    behavior: { aggro_range: 12, patrol: false, flee_hp_pct: 0, enrage_hp_pct: 25 },
    location: 'twilight_forest', respawnTime: 600,
    lore: '달빛이 물리적 형태를 얻은 수호령. 순결한 자에게는 관대하지만, 탐욕스러운 자에게는 가차없다.',
  },
  {
    code: 'MON_BOSS_KC01', name: '시간 폭군 크로노스 Mk-II', type: 'boss', element: 'time', level: 25,
    hp: 3000, attack: 55, defense: 30, speed: 8,
    skills: [
      { name: '시간 정지 필드', damage: 0, cooldown: 20, element: 'time', effectType: 'debuff' },
      { name: '시간 절단', damage: 80, cooldown: 5, element: 'time', effectType: 'damage' },
      { name: '시간 가속 모드', damage: 0, cooldown: 25, element: 'time', effectType: 'heal' },
      { name: '크로노 캐논', damage: 100, cooldown: 10, element: 'time', effectType: 'aoe' },
    ],
    dropTable: [
      { itemId: 'MAT_CHRONO_ENGINE', rate: 1.0, minQty: 1, maxQty: 1 },
      { itemId: 'EQUIP_WATCH_TYRANT', rate: 0.1, minQty: 1, maxQty: 1 },
      { itemId: 'MAT_TIME_CRYSTAL', rate: 0.5, minQty: 2, maxQty: 3 },
    ],
    expReward: 800, goldReward: 350,
    behavior: { aggro_range: 15, patrol: false, flee_hp_pct: 0, enrage_hp_pct: 25 },
    location: 'kronos_city', respawnTime: 600,
    lore: '크로노스 시계탑 최상층의 시간 병기. 시간 정지와 가속을 번갈아 사용하며 전장을 지배한다.',
  },
  {
    code: 'MON_BOSS_KC02', name: '하수도왕 레비아탄', type: 'boss', element: 'ice', level: 25,
    hp: 3500, attack: 50, defense: 35, speed: 5,
    skills: [
      { name: '대홍수', damage: 90, cooldown: 10, element: 'ice', effectType: 'aoe' },
      { name: '턱 분쇄', damage: 100, cooldown: 6, element: 'neutral', effectType: 'damage' },
      { name: '얼음 갑각', damage: 0, cooldown: 20, element: 'ice', effectType: 'heal' },
      { name: '꼬리 쓸기', damage: 70, cooldown: 7, element: 'ice', effectType: 'aoe' },
    ],
    dropTable: [
      { itemId: 'MAT_LEVIATHAN_FANG', rate: 1.0, minQty: 1, maxQty: 1 },
      { itemId: 'EQUIP_ARMOR_LEVIATHAN', rate: 0.08, minQty: 1, maxQty: 1 },
      { itemId: 'MAT_ICE_SCALE', rate: 0.6, minQty: 3, maxQty: 5 },
    ],
    expReward: 850, goldReward: 380,
    behavior: { aggro_range: 12, patrol: false, flee_hp_pct: 0, enrage_hp_pct: 20 },
    location: 'kronos_city', respawnTime: 600,
    lore: '크로노스 하수도 최심부에 서식하는 거대 해수. 하수도 전체를 얼려버릴 수 있는 빙결 능력을 지녔다.',
  },
  {
    code: 'MON_BOSS_AV01', name: '에테르 심판자 아리엘', type: 'boss', element: 'aether', level: 35,
    hp: 4000, attack: 65, defense: 30, speed: 11,
    skills: [
      { name: '심판의 에테르', damage: 100, cooldown: 8, element: 'aether', effectType: 'aoe' },
      { name: '에테르 속박', damage: 0, cooldown: 12, element: 'aether', effectType: 'debuff' },
      { name: '정화 광선', damage: 120, cooldown: 10, element: 'light', effectType: 'damage' },
      { name: '에테르 재생', damage: 0, cooldown: 20, element: 'aether', effectType: 'heal' },
    ],
    dropTable: [
      { itemId: 'MAT_ARIEL_WING', rate: 1.0, minQty: 1, maxQty: 1 },
      { itemId: 'EQUIP_STAFF_ARIEL', rate: 0.1, minQty: 1, maxQty: 1 },
      { itemId: 'MAT_AETHER_CORE', rate: 0.5, minQty: 2, maxQty: 3 },
    ],
    expReward: 1200, goldReward: 500,
    behavior: { aggro_range: 15, patrol: false, flee_hp_pct: 0, enrage_hp_pct: 25 },
    location: 'aetheria_village', respawnTime: 600,
    lore: '에테리아 탑의 최상층에서 세계를 심판하는 천사형 존재. 에테르의 균형을 지키는 것이 사명.',
  },
  {
    code: 'MON_BOSS_AV02', name: '기억의 군주 메모리아', type: 'boss', element: 'dark', level: 35,
    hp: 3800, attack: 72, defense: 25, speed: 10,
    skills: [
      { name: '기억 폭풍', damage: 110, cooldown: 8, element: 'dark', effectType: 'aoe' },
      { name: '정신 지배', damage: 0, cooldown: 15, element: 'dark', effectType: 'debuff' },
      { name: '과거의 칼날', damage: 90, cooldown: 5, element: 'dark', effectType: 'damage' },
      { name: '기억 흡수', damage: 60, cooldown: 10, element: 'dark', effectType: 'damage' },
    ],
    dropTable: [
      { itemId: 'MAT_MEMORIA_CROWN', rate: 1.0, minQty: 1, maxQty: 1 },
      { itemId: 'EQUIP_ORB_MEMORIA', rate: 0.1, minQty: 1, maxQty: 1 },
      { itemId: 'MAT_MEMORY_FRAGMENT', rate: 0.6, minQty: 3, maxQty: 5 },
    ],
    expReward: 1150, goldReward: 480,
    behavior: { aggro_range: 12, patrol: false, flee_hp_pct: 0, enrage_hp_pct: 30 },
    location: 'aetheria_village', respawnTime: 600,
    lore: '모든 기억을 지배하려는 어둠의 군주. 대상의 기억을 빼앗아 자신의 힘으로 변환한다.',
  },
  {
    code: 'MON_BOSS_SF01', name: '그림자 군주 오브시디안', type: 'boss', element: 'dark', level: 50,
    hp: 6000, attack: 85, defense: 40, speed: 10,
    skills: [
      { name: '절대 암흑', damage: 130, cooldown: 10, element: 'dark', effectType: 'aoe' },
      { name: '그림자 대검', damage: 110, cooldown: 5, element: 'dark', effectType: 'damage' },
      { name: '어둠의 결계', damage: 0, cooldown: 18, element: 'dark', effectType: 'debuff' },
      { name: '그림자 치유', damage: 0, cooldown: 22, element: 'dark', effectType: 'heal' },
      { name: '암흑 소환', damage: 80, cooldown: 15, element: 'dark', effectType: 'aoe' },
    ],
    dropTable: [
      { itemId: 'MAT_OBSIDIAN_HEART', rate: 1.0, minQty: 1, maxQty: 1 },
      { itemId: 'EQUIP_SWORD_OBSIDIAN', rate: 0.08, minQty: 1, maxQty: 1 },
      { itemId: 'MAT_SHADOW_CORE', rate: 0.5, minQty: 2, maxQty: 4 },
    ],
    expReward: 2000, goldReward: 800,
    behavior: { aggro_range: 15, patrol: false, flee_hp_pct: 0, enrage_hp_pct: 25 },
    location: 'shadow_fortress', respawnTime: 900,
    lore: '그림자 요새의 지배자. 절대 암흑으로 전장을 뒤덮고 보이지 않는 곳에서 공격하는 교활한 보스.',
  },
  {
    code: 'MON_BOSS_SF02', name: '화염 마왕 이그니스', type: 'boss', element: 'fire', level: 50,
    hp: 5500, attack: 95, defense: 30, speed: 12,
    skills: [
      { name: '지옥불', damage: 150, cooldown: 10, element: 'fire', effectType: 'aoe' },
      { name: '업화의 채찍', damage: 120, cooldown: 6, element: 'fire', effectType: 'damage' },
      { name: '화염 부활', damage: 0, cooldown: 30, element: 'fire', effectType: 'heal' },
      { name: '마왕의 포효', damage: 0, cooldown: 15, element: 'fire', effectType: 'debuff' },
    ],
    dropTable: [
      { itemId: 'MAT_IGNIS_CORE', rate: 1.0, minQty: 1, maxQty: 1 },
      { itemId: 'EQUIP_WHIP_IGNIS', rate: 0.08, minQty: 1, maxQty: 1 },
      { itemId: 'MAT_HELLFIRE_CORE', rate: 0.5, minQty: 2, maxQty: 3 },
    ],
    expReward: 1900, goldReward: 780,
    behavior: { aggro_range: 15, patrol: false, flee_hp_pct: 0, enrage_hp_pct: 30 },
    location: 'shadow_fortress', respawnTime: 900,
    lore: '그림자 요새 화염 구역의 지배자. 지옥의 화염을 주무르며 일대를 불바다로 만든다.',
  },
  {
    code: 'MON_BOSS_CC01', name: '수정 폭군 프리즈마', type: 'boss', element: 'earth', level: 65,
    hp: 8000, attack: 90, defense: 50, speed: 6,
    skills: [
      { name: '수정 대폭발', damage: 140, cooldown: 10, element: 'earth', effectType: 'aoe' },
      { name: '프리즘 레이저', damage: 160, cooldown: 8, element: 'light', effectType: 'damage' },
      { name: '수정 재구축', damage: 0, cooldown: 25, element: 'earth', effectType: 'heal' },
      { name: '수정 감옥', damage: 0, cooldown: 15, element: 'earth', effectType: 'debuff' },
    ],
    dropTable: [
      { itemId: 'MAT_PRISMA_CORE', rate: 1.0, minQty: 1, maxQty: 1 },
      { itemId: 'EQUIP_ARMOR_PRISMA', rate: 0.06, minQty: 1, maxQty: 1 },
      { itemId: 'MAT_PERFECT_GEM', rate: 0.4, minQty: 2, maxQty: 3 },
    ],
    expReward: 3000, goldReward: 1200,
    behavior: { aggro_range: 12, patrol: false, flee_hp_pct: 0, enrage_hp_pct: 20 },
    location: 'crystal_cavern', respawnTime: 900,
    lore: '수정 동굴 최심부의 폭군. 몸 전체가 순도 100% 에테르 수정으로 구성되어 물리 공격이 거의 통하지 않는다.',
  },
  {
    code: 'MON_BOSS_CC02', name: '용암 드래곤 볼케이노', type: 'boss', element: 'fire', level: 65,
    hp: 7500, attack: 100, defense: 35, speed: 10,
    skills: [
      { name: '멸망의 브레스', damage: 180, cooldown: 10, element: 'fire', effectType: 'aoe' },
      { name: '용암 분출', damage: 120, cooldown: 6, element: 'fire', effectType: 'damage' },
      { name: '마그마 갑각', damage: 0, cooldown: 20, element: 'fire', effectType: 'heal' },
      { name: '화산 폭발', damage: 150, cooldown: 15, element: 'fire', effectType: 'aoe' },
    ],
    dropTable: [
      { itemId: 'MAT_VOLCANO_HEART', rate: 1.0, minQty: 1, maxQty: 1 },
      { itemId: 'EQUIP_SWORD_VOLCANO', rate: 0.06, minQty: 1, maxQty: 1 },
      { itemId: 'MAT_DRAGON_SCALE', rate: 0.4, minQty: 2, maxQty: 3 },
    ],
    expReward: 2800, goldReward: 1100,
    behavior: { aggro_range: 15, patrol: false, flee_hp_pct: 0, enrage_hp_pct: 25 },
    location: 'crystal_cavern', respawnTime: 900,
    lore: '동굴 용암 호수의 주인. 성체 화염 드래곤으로, 멸망의 브레스 한 번에 전장이 불바다가 된다.',
  },
  {
    code: 'MON_BOSS_VA01', name: '허공의 심판관 니힐', type: 'boss', element: 'dark', level: 80,
    hp: 12000, attack: 120, defense: 45, speed: 12,
    skills: [
      { name: '허무의 선고', damage: 200, cooldown: 12, element: 'dark', effectType: 'aoe' },
      { name: '존재 소거', damage: 180, cooldown: 8, element: 'dark', effectType: 'damage' },
      { name: '허공 재생', damage: 0, cooldown: 25, element: 'dark', effectType: 'heal' },
      { name: '차원 봉쇄', damage: 0, cooldown: 18, element: 'dark', effectType: 'debuff' },
      { name: '종말의 파동', damage: 250, cooldown: 20, element: 'dark', effectType: 'aoe' },
    ],
    dropTable: [
      { itemId: 'MAT_NIHIL_ESSENCE', rate: 1.0, minQty: 1, maxQty: 1 },
      { itemId: 'EQUIP_SWORD_NIHIL', rate: 0.05, minQty: 1, maxQty: 1 },
      { itemId: 'MAT_VOID_CORE', rate: 0.5, minQty: 2, maxQty: 3 },
    ],
    expReward: 5000, goldReward: 2000,
    behavior: { aggro_range: 20, patrol: false, flee_hp_pct: 0, enrage_hp_pct: 20 },
    location: 'void_abyss', respawnTime: 1200,
    lore: '허공의 심연 최종 보스. 존재 자체를 소거하는 힘을 지닌 심판관으로, 종말의 파동은 전장 전체를 파괴한다.',
  },
  {
    code: 'MON_BOSS_VA02', name: '시간의 종말자 크로노스', type: 'boss', element: 'time', level: 80,
    hp: 11000, attack: 115, defense: 40, speed: 14,
    skills: [
      { name: '시간 붕괴', damage: 180, cooldown: 10, element: 'time', effectType: 'aoe' },
      { name: '크로노 블레이드 X', damage: 200, cooldown: 7, element: 'time', effectType: 'damage' },
      { name: '시간 되감기', damage: 0, cooldown: 30, element: 'time', effectType: 'heal' },
      { name: '시공 정지', damage: 0, cooldown: 20, element: 'time', effectType: 'debuff' },
    ],
    dropTable: [
      { itemId: 'MAT_CHRONOS_HEART', rate: 1.0, minQty: 1, maxQty: 1 },
      { itemId: 'EQUIP_BLADE_CHRONOS', rate: 0.05, minQty: 1, maxQty: 1 },
      { itemId: 'MAT_CHRONO_KEY', rate: 0.4, minQty: 1, maxQty: 2 },
    ],
    expReward: 4800, goldReward: 1900,
    behavior: { aggro_range: 18, patrol: false, flee_hp_pct: 0, enrage_hp_pct: 25 },
    location: 'void_abyss', respawnTime: 1200,
    lore: '시간의 끝에서 모든 것을 종결시키려는 존재. 시간을 되감아 HP를 회복하는 치명적 능력이 있다.',
  },
];

// ─── 필드 보스 5마리 ────────────────────────────────────────────

const fieldBosses: MonsterSeed[] = [
  {
    code: 'MON_FB_001', name: '숲의 폭군 그란트리', type: 'field_boss', element: 'earth', level: 20,
    hp: 5000, attack: 50, defense: 30, speed: 3,
    skills: [
      { name: '대지 진동', damage: 80, cooldown: 8, element: 'earth', effectType: 'aoe' },
      { name: '거목 낙하', damage: 100, cooldown: 10, element: 'earth', effectType: 'damage' },
      { name: '자연의 축복', damage: 0, cooldown: 20, element: 'earth', effectType: 'heal' },
      { name: '뿌리 감옥', damage: 40, cooldown: 6, element: 'earth', effectType: 'debuff' },
    ],
    dropTable: [
      { itemId: 'MAT_GRANTREE_HEART', rate: 1.0, minQty: 1, maxQty: 1 },
      { itemId: 'EQUIP_STAFF_GRANTREE', rate: 0.08, minQty: 1, maxQty: 1 },
      { itemId: 'MAT_ANCIENT_BARK', rate: 0.6, minQty: 3, maxQty: 5 },
    ],
    expReward: 1500, goldReward: 600,
    behavior: { aggro_range: 20, patrol: false, flee_hp_pct: 0, enrage_hp_pct: 25 },
    location: 'twilight_forest', respawnTime: 1800,
    lore: '황혼의 숲 한가운데에 우뚝 선 고대의 거목 보스. 숲 전체를 뒤흔드는 대지 진동이 특기.',
  },
  {
    code: 'MON_FB_002', name: '시간의 파수꾼 모멘토', type: 'field_boss', element: 'time', level: 35,
    hp: 7000, attack: 70, defense: 35, speed: 10,
    skills: [
      { name: '시간 대폭발', damage: 120, cooldown: 10, element: 'time', effectType: 'aoe' },
      { name: '시간 정지 권역', damage: 0, cooldown: 20, element: 'time', effectType: 'debuff' },
      { name: '크로노 재구성', damage: 0, cooldown: 25, element: 'time', effectType: 'heal' },
      { name: '과거의 메아리', damage: 90, cooldown: 7, element: 'time', effectType: 'damage' },
    ],
    dropTable: [
      { itemId: 'MAT_MOMENTO_CLOCK', rate: 1.0, minQty: 1, maxQty: 1 },
      { itemId: 'EQUIP_WATCH_MOMENTO', rate: 0.06, minQty: 1, maxQty: 1 },
      { itemId: 'MAT_TIME_CRYSTAL', rate: 0.5, minQty: 2, maxQty: 4 },
    ],
    expReward: 2500, goldReward: 1000,
    behavior: { aggro_range: 20, patrol: false, flee_hp_pct: 0, enrage_hp_pct: 20 },
    location: 'kronos_city', respawnTime: 2400,
    lore: '크로노스 시가지에 돌연 출현하는 거대한 시계 형태의 필드 보스. 시간을 왜곡시켜 전투를 지배한다.',
  },
  {
    code: 'MON_FB_003', name: '심연의 히드라', type: 'field_boss', element: 'dark', level: 50,
    hp: 10000, attack: 85, defense: 35, speed: 8,
    skills: [
      { name: '다두 공격', damage: 100, cooldown: 4, element: 'dark', effectType: 'damage' },
      { name: '독액 세례', damage: 80, cooldown: 8, element: 'dark', effectType: 'aoe' },
      { name: '머리 재생', damage: 0, cooldown: 15, element: 'dark', effectType: 'heal' },
      { name: '암흑 브레스', damage: 130, cooldown: 12, element: 'dark', effectType: 'aoe' },
      { name: '공포의 포효', damage: 0, cooldown: 20, element: 'dark', effectType: 'debuff' },
    ],
    dropTable: [
      { itemId: 'MAT_HYDRA_FANG', rate: 1.0, minQty: 1, maxQty: 2 },
      { itemId: 'EQUIP_NECKLACE_HYDRA', rate: 0.05, minQty: 1, maxQty: 1 },
      { itemId: 'MAT_DARK_CRYSTAL', rate: 0.5, minQty: 3, maxQty: 5 },
    ],
    expReward: 3500, goldReward: 1500,
    behavior: { aggro_range: 25, patrol: false, flee_hp_pct: 0, enrage_hp_pct: 30 },
    location: 'shadow_fortress', respawnTime: 3000,
    lore: '그림자 요새 외곽에 출현하는 다두 히드라. 머리를 잘라도 재생하며, 다수의 머리로 동시 공격한다.',
  },
  {
    code: 'MON_FB_004', name: '결정룡 다이아몬드', type: 'field_boss', element: 'earth', level: 65,
    hp: 12000, attack: 95, defense: 50, speed: 9,
    skills: [
      { name: '수정 브레스', damage: 160, cooldown: 10, element: 'earth', effectType: 'aoe' },
      { name: '다이아몬드 클로', damage: 130, cooldown: 5, element: 'earth', effectType: 'damage' },
      { name: '수정 갑옷 강화', damage: 0, cooldown: 20, element: 'earth', effectType: 'heal' },
      { name: '보석 폭풍', damage: 120, cooldown: 12, element: 'earth', effectType: 'aoe' },
    ],
    dropTable: [
      { itemId: 'MAT_DIAMOND_DRAGON_HEART', rate: 1.0, minQty: 1, maxQty: 1 },
      { itemId: 'EQUIP_ARMOR_DIAMOND', rate: 0.04, minQty: 1, maxQty: 1 },
      { itemId: 'MAT_PERFECT_GEM', rate: 0.6, minQty: 3, maxQty: 5 },
    ],
    expReward: 4500, goldReward: 2000,
    behavior: { aggro_range: 25, patrol: false, flee_hp_pct: 0, enrage_hp_pct: 25 },
    location: 'crystal_cavern', respawnTime: 3600,
    lore: '수정 동굴의 최강 필드 보스. 다이아몬드 갑각은 거의 무적에 가까우며 보석 폭풍으로 전장을 유린한다.',
  },
  {
    code: 'MON_FB_005', name: '허공의 왕 아비서스', type: 'field_boss', element: 'dark', level: 80,
    hp: 18000, attack: 120, defense: 50, speed: 11,
    skills: [
      { name: '허공 대소멸', damage: 250, cooldown: 15, element: 'dark', effectType: 'aoe' },
      { name: '존재 부정', damage: 200, cooldown: 8, element: 'dark', effectType: 'damage' },
      { name: '심연의 재생', damage: 0, cooldown: 25, element: 'dark', effectType: 'heal' },
      { name: '차원 분쇄', damage: 180, cooldown: 10, element: 'aether', effectType: 'aoe' },
      { name: '종말의 선포', damage: 0, cooldown: 30, element: 'dark', effectType: 'debuff' },
    ],
    dropTable: [
      { itemId: 'MAT_ABYSSUS_CROWN', rate: 1.0, minQty: 1, maxQty: 1 },
      { itemId: 'EQUIP_SWORD_ABYSSUS', rate: 0.03, minQty: 1, maxQty: 1 },
      { itemId: 'MAT_VOID_CORE', rate: 0.6, minQty: 3, maxQty: 5 },
    ],
    expReward: 8000, goldReward: 3500,
    behavior: { aggro_range: 30, patrol: false, flee_hp_pct: 0, enrage_hp_pct: 20 },
    location: 'void_abyss', respawnTime: 5400,
    lore: '허공의 심연 전체를 지배하는 왕. 차원을 분쇄하고 존재 자체를 부정하는 궁극의 필드 보스.',
  },
];

// ─── 지역 7: 무한 안개해 (mist_sea) Lv.70~90 [P8-14] ───────────

const mistSeaNormals: MonsterSeed[] = [
  {
    code: 'MON_MS_001', name: '안개 해파리', type: 'normal', element: 'ice', level: 70,
    hp: 520, attack: 72, defense: 18, speed: 8,
    skills: [
      { name: '안개 촉수', damage: 85, cooldown: 5, element: 'ice', effectType: 'damage' },
      { name: '기억 독소', damage: 60, cooldown: 8, element: 'dark', effectType: 'dot' },
    ],
    dropTable: [
      { itemId: 'MAT_MIST_JELLY', rate: 0.4, minQty: 1, maxQty: 2 },
      { itemId: 'MAT_FOG_ESSENCE', rate: 0.2, minQty: 1, maxQty: 1 },
    ],
    expReward: 680, goldReward: 210,
    behavior: { aggro_range: 6, patrol: false, flee_hp_pct: 0, enrage_hp_pct: 0 },
    location: 'mist_sea', respawnTime: 35,
    lore: '안개해 수면에 떠다니는 반투명 해파리. 촉수에 닿으면 기억이 흐려지며 독소가 스며든다.',
  },
  {
    code: 'MON_MS_002', name: '기억 갈매기', type: 'normal', element: 'neutral', level: 71,
    hp: 380, attack: 78, defense: 10, speed: 18,
    skills: [
      { name: '급강하 쪼기', damage: 90, cooldown: 4, element: 'neutral', effectType: 'damage' },
      { name: '기억 탈취 울음', damage: 0, cooldown: 12, element: 'dark', effectType: 'debuff' },
    ],
    dropTable: [
      { itemId: 'MAT_MIST_FEATHER', rate: 0.45, minQty: 1, maxQty: 2 },
      { itemId: 'MAT_MEMORY_BEAD', rate: 0.15, minQty: 1, maxQty: 1 },
    ],
    expReward: 700, goldReward: 215,
    behavior: { aggro_range: 12, patrol: true, flee_hp_pct: 20, enrage_hp_pct: 0 },
    location: 'mist_sea', respawnTime: 25,
    lore: '안개 속을 비행하며 지나가는 자의 기억 조각을 훔치는 변이 갈매기. 울음소리에 기억이 흔들린다.',
  },
  {
    code: 'MON_MS_003', name: '안개 뱀장어', type: 'normal', element: 'lightning', level: 72,
    hp: 450, attack: 80, defense: 14, speed: 14,
    skills: [
      { name: '전기 감기', damage: 92, cooldown: 5, element: 'lightning', effectType: 'damage' },
      { name: '안개 방전', damage: 75, cooldown: 8, element: 'lightning', effectType: 'aoe' },
    ],
    dropTable: [
      { itemId: 'MAT_MIST_EEL_SKIN', rate: 0.4, minQty: 1, maxQty: 1 },
      { itemId: 'MAT_THUNDER_SCALE', rate: 0.2, minQty: 1, maxQty: 1 },
    ],
    expReward: 720, goldReward: 220,
    behavior: { aggro_range: 7, patrol: true, flee_hp_pct: 15, enrage_hp_pct: 0 },
    location: 'mist_sea', respawnTime: 30,
    lore: '안개해 수중에 서식하는 거대 뱀장어. 전기를 축적한 몸으로 물 위의 적까지 감전시킨다.',
  },
  {
    code: 'MON_MS_004', name: '봉인석 파편', type: 'normal', element: 'aether', level: 73,
    hp: 600, attack: 68, defense: 28, speed: 4,
    skills: [
      { name: '봉인 에너지 방출', damage: 88, cooldown: 6, element: 'aether', effectType: 'aoe' },
      { name: '에테르 흡수', damage: 70, cooldown: 10, element: 'aether', effectType: 'damage' },
    ],
    dropTable: [
      { itemId: 'MAT_SEAL_FRAGMENT', rate: 0.35, minQty: 1, maxQty: 1 },
      { itemId: 'MAT_AETHER_RESIDUE', rate: 0.3, minQty: 1, maxQty: 2 },
    ],
    expReward: 740, goldReward: 228,
    behavior: { aggro_range: 5, patrol: false, flee_hp_pct: 0, enrage_hp_pct: 20 },
    location: 'mist_sea', respawnTime: 40,
    lore: '12인의 봉인이 깨지며 흩어진 봉인석 파편. 에테르 에너지를 머금고 공격적으로 변했다.',
  },
  {
    code: 'MON_MS_005', name: '기억 포식 산호', type: 'normal', element: 'dark', level: 74,
    hp: 550, attack: 74, defense: 22, speed: 2,
    skills: [
      { name: '기억 흡수 촉수', damage: 82, cooldown: 5, element: 'dark', effectType: 'damage' },
      { name: '망각 포자', damage: 65, cooldown: 10, element: 'dark', effectType: 'dot' },
      { name: '산호 방벽', damage: 0, cooldown: 18, element: 'earth', effectType: 'heal' },
    ],
    dropTable: [
      { itemId: 'MAT_MEMORY_CORAL', rate: 0.4, minQty: 1, maxQty: 2 },
      { itemId: 'MAT_OBLIVION_SPORE', rate: 0.15, minQty: 1, maxQty: 1 },
    ],
    expReward: 760, goldReward: 235,
    behavior: { aggro_range: 4, patrol: false, flee_hp_pct: 0, enrage_hp_pct: 0 },
    location: 'mist_sea', respawnTime: 35,
    lore: '안개해 바닥에 뿌리내린 거대 산호. 지나가는 생물의 기억을 빨아먹고 망각 포자를 뿌린다.',
  },
  {
    code: 'MON_MS_006', name: '안개 유령선원', type: 'normal', element: 'dark', level: 75,
    hp: 480, attack: 82, defense: 16, speed: 10,
    skills: [
      { name: '유령 검격', damage: 95, cooldown: 5, element: 'dark', effectType: 'damage' },
      { name: '안개 은신', damage: 0, cooldown: 12, element: 'dark', effectType: 'debuff' },
      { name: '저주의 닻', damage: 78, cooldown: 8, element: 'dark', effectType: 'aoe' },
    ],
    dropTable: [
      { itemId: 'MAT_GHOST_ANCHOR', rate: 0.3, minQty: 1, maxQty: 1 },
      { itemId: 'MAT_WRAITH_COIN', rate: 0.35, minQty: 1, maxQty: 2 },
    ],
    expReward: 780, goldReward: 242,
    behavior: { aggro_range: 9, patrol: true, flee_hp_pct: 0, enrage_hp_pct: 20 },
    location: 'mist_sea', respawnTime: 30,
    lore: '안개해에서 조난된 선원들의 원혼. 기억을 잃고 영원히 항해하며, 살아있는 자를 동료로 삼으려 한다.',
  },
  {
    code: 'MON_MS_007', name: '심해 갑오징어', type: 'normal', element: 'ice', level: 76,
    hp: 500, attack: 86, defense: 20, speed: 12,
    skills: [
      { name: '먹물 안개', damage: 0, cooldown: 10, element: 'dark', effectType: 'debuff' },
      { name: '빙결 촉수', damage: 98, cooldown: 5, element: 'ice', effectType: 'damage' },
      { name: '심해 수압', damage: 80, cooldown: 8, element: 'ice', effectType: 'aoe' },
    ],
    dropTable: [
      { itemId: 'MAT_SQUID_INK', rate: 0.4, minQty: 1, maxQty: 2 },
      { itemId: 'MAT_FROZEN_TENTACLE', rate: 0.25, minQty: 1, maxQty: 1 },
    ],
    expReward: 800, goldReward: 250,
    behavior: { aggro_range: 7, patrol: true, flee_hp_pct: 10, enrage_hp_pct: 0 },
    location: 'mist_sea', respawnTime: 30,
    lore: '안개해 심층에서 올라온 거대 갑오징어. 먹물로 시야를 가리고 빙결 촉수로 사냥감을 얼린다.',
  },
  {
    code: 'MON_MS_008', name: '봉인 감시체', type: 'normal', element: 'light', level: 78,
    hp: 580, attack: 80, defense: 24, speed: 9,
    skills: [
      { name: '봉인 광선', damage: 100, cooldown: 6, element: 'light', effectType: 'damage' },
      { name: '감시의 눈', damage: 0, cooldown: 15, element: 'light', effectType: 'debuff' },
      { name: '봉인 결계', damage: 85, cooldown: 10, element: 'aether', effectType: 'aoe' },
    ],
    dropTable: [
      { itemId: 'MAT_SEAL_LENS', rate: 0.3, minQty: 1, maxQty: 1 },
      { itemId: 'MAT_WARDEN_CORE', rate: 0.12, minQty: 1, maxQty: 1 },
    ],
    expReward: 830, goldReward: 260,
    behavior: { aggro_range: 10, patrol: false, flee_hp_pct: 0, enrage_hp_pct: 15 },
    location: 'mist_sea', respawnTime: 40,
    lore: '12인의 봉인자가 남긴 자동 감시 장치. 봉인을 해치려는 자를 감지하면 무차별 공격한다.',
  },
  {
    code: 'MON_MS_009', name: '안개 켈피', type: 'normal', element: 'ice', level: 80,
    hp: 540, attack: 88, defense: 18, speed: 16,
    skills: [
      { name: '물의 돌진', damage: 102, cooldown: 4, element: 'ice', effectType: 'damage' },
      { name: '익사의 포옹', damage: 80, cooldown: 8, element: 'dark', effectType: 'damage' },
      { name: '안개 질주', damage: 0, cooldown: 12, element: 'neutral', effectType: 'debuff' },
    ],
    dropTable: [
      { itemId: 'MAT_KELPIE_MANE', rate: 0.35, minQty: 1, maxQty: 1 },
      { itemId: 'MAT_MIST_HORSESHOE', rate: 0.2, minQty: 1, maxQty: 1 },
    ],
    expReward: 860, goldReward: 270,
    behavior: { aggro_range: 10, patrol: true, flee_hp_pct: 15, enrage_hp_pct: 0 },
    location: 'mist_sea', respawnTime: 30,
    lore: '안개해 수면을 질주하는 유령 말. 아름다운 외형으로 유인한 뒤 등에 탄 자를 심해로 끌고 간다.',
  },
  {
    code: 'MON_MS_010', name: '레테의 잔영', type: 'normal', element: 'dark', level: 82,
    hp: 620, attack: 92, defense: 22, speed: 11,
    skills: [
      { name: '망각의 파동', damage: 108, cooldown: 6, element: 'dark', effectType: 'aoe' },
      { name: '기억 절단', damage: 98, cooldown: 5, element: 'dark', effectType: 'damage' },
      { name: '레테의 속삭임', damage: 0, cooldown: 15, element: 'dark', effectType: 'debuff' },
    ],
    dropTable: [
      { itemId: 'MAT_LETHE_SHADOW', rate: 0.25, minQty: 1, maxQty: 1 },
      { itemId: 'MAT_OBLIVION_ESSENCE', rate: 0.1, minQty: 1, maxQty: 1 },
    ],
    expReward: 900, goldReward: 285,
    behavior: { aggro_range: 8, patrol: true, flee_hp_pct: 0, enrage_hp_pct: 25 },
    location: 'mist_sea', respawnTime: 40,
    lore: '레테의 잔류 의식이 안개에 스며들어 형상화된 존재. 기억을 먹고 자라며 점점 강해진다.',
  },
  {
    code: 'MON_MS_011', name: '안개 가오리', type: 'normal', element: 'ice', level: 72,
    hp: 460, attack: 76, defense: 16, speed: 13,
    skills: [
      { name: '독가시 꼬리', damage: 88, cooldown: 5, element: 'dark', effectType: 'dot' },
      { name: '활공 돌격', damage: 82, cooldown: 7, element: 'ice', effectType: 'damage' },
    ],
    dropTable: [
      { itemId: 'MAT_MIST_RAY_WING', rate: 0.4, minQty: 1, maxQty: 1 },
      { itemId: 'MAT_POISON_BARB', rate: 0.25, minQty: 1, maxQty: 1 },
    ],
    expReward: 710, goldReward: 218,
    behavior: { aggro_range: 8, patrol: true, flee_hp_pct: 10, enrage_hp_pct: 0 },
    location: 'mist_sea', respawnTime: 28,
    lore: '안개 위를 활공하는 거대 가오리. 꼬리의 독가시에 찔리면 기억이 한동안 흐릿해진다.',
  },
  {
    code: 'MON_MS_012', name: '봉인 수호 골렘', type: 'normal', element: 'earth', level: 75,
    hp: 680, attack: 70, defense: 32, speed: 4,
    skills: [
      { name: '봉인 주먹', damage: 95, cooldown: 6, element: 'earth', effectType: 'damage' },
      { name: '지진', damage: 78, cooldown: 10, element: 'earth', effectType: 'aoe' },
      { name: '봉인 재구축', damage: 0, cooldown: 20, element: 'aether', effectType: 'heal' },
    ],
    dropTable: [
      { itemId: 'MAT_SEAL_STONE', rate: 0.35, minQty: 1, maxQty: 2 },
      { itemId: 'MAT_ANCIENT_MORTAR', rate: 0.2, minQty: 1, maxQty: 1 },
    ],
    expReward: 770, goldReward: 240,
    behavior: { aggro_range: 5, patrol: false, flee_hp_pct: 0, enrage_hp_pct: 15 },
    location: 'mist_sea', respawnTime: 40,
    lore: '봉인의 첨탑을 수호하던 골렘. 봉인이 약해지면서 제어를 잃고 근처 모든 것을 공격한다.',
  },
  {
    code: 'MON_MS_013', name: '망각의 바다뱀', type: 'normal', element: 'dark', level: 77,
    hp: 510, attack: 84, defense: 18, speed: 14,
    skills: [
      { name: '기억 독니', damage: 96, cooldown: 5, element: 'dark', effectType: 'damage' },
      { name: '안개 조임', damage: 80, cooldown: 7, element: 'dark', effectType: 'debuff' },
    ],
    dropTable: [
      { itemId: 'MAT_SEA_SERPENT_SCALE', rate: 0.35, minQty: 1, maxQty: 1 },
      { itemId: 'MAT_AMNESIA_FANG', rate: 0.15, minQty: 1, maxQty: 1 },
    ],
    expReward: 810, goldReward: 252,
    behavior: { aggro_range: 8, patrol: true, flee_hp_pct: 0, enrage_hp_pct: 20 },
    location: 'mist_sea', respawnTime: 32,
    lore: '안개해 심층을 누비는 거대 바다뱀. 물린 자는 점차 기억을 잃어간다.',
  },
  {
    code: 'MON_MS_014', name: '안개 인어', type: 'normal', element: 'ice', level: 78,
    hp: 470, attack: 86, defense: 15, speed: 13,
    skills: [
      { name: '세이렌 노래', damage: 0, cooldown: 12, element: 'dark', effectType: 'debuff' },
      { name: '빙하 창', damage: 100, cooldown: 5, element: 'ice', effectType: 'damage' },
      { name: '물결 파동', damage: 82, cooldown: 8, element: 'ice', effectType: 'aoe' },
    ],
    dropTable: [
      { itemId: 'MAT_SIREN_SCALE', rate: 0.3, minQty: 1, maxQty: 1 },
      { itemId: 'MAT_FROZEN_PEARL', rate: 0.12, minQty: 1, maxQty: 1 },
    ],
    expReward: 835, goldReward: 258,
    behavior: { aggro_range: 9, patrol: true, flee_hp_pct: 15, enrage_hp_pct: 0 },
    location: 'mist_sea', respawnTime: 30,
    lore: '안개해에 살던 인어가 레테의 영향으로 변이한 존재. 아름다운 노래로 선원을 유인한다.',
  },
  {
    code: 'MON_MS_015', name: '폭풍 갈매기 대장', type: 'normal', element: 'lightning', level: 79,
    hp: 420, attack: 90, defense: 12, speed: 19,
    skills: [
      { name: '번개 급강하', damage: 105, cooldown: 4, element: 'lightning', effectType: 'damage' },
      { name: '폭풍 울음', damage: 88, cooldown: 8, element: 'lightning', effectType: 'aoe' },
    ],
    dropTable: [
      { itemId: 'MAT_STORM_FEATHER', rate: 0.4, minQty: 1, maxQty: 2 },
      { itemId: 'MAT_GALE_CORE', rate: 0.1, minQty: 1, maxQty: 1 },
    ],
    expReward: 850, goldReward: 265,
    behavior: { aggro_range: 14, patrol: true, flee_hp_pct: 20, enrage_hp_pct: 0 },
    location: 'mist_sea', respawnTime: 25,
    lore: '안개해 상공을 지배하는 거대 갈매기. 날개에 번개를 두르고 급강하하며 배를 공격한다.',
  },
  {
    code: 'MON_MS_016', name: '심해 해골병사', type: 'normal', element: 'dark', level: 80,
    hp: 560, attack: 84, defense: 24, speed: 8,
    skills: [
      { name: '녹슨 검격', damage: 96, cooldown: 5, element: 'dark', effectType: 'damage' },
      { name: '해골 방패', damage: 0, cooldown: 15, element: 'dark', effectType: 'heal' },
      { name: '심해의 저주', damage: 74, cooldown: 10, element: 'dark', effectType: 'dot' },
    ],
    dropTable: [
      { itemId: 'MAT_SUNKEN_ARMOR', rate: 0.35, minQty: 1, maxQty: 1 },
      { itemId: 'MAT_DEEP_BONE', rate: 0.3, minQty: 1, maxQty: 2 },
    ],
    expReward: 870, goldReward: 272,
    behavior: { aggro_range: 7, patrol: true, flee_hp_pct: 0, enrage_hp_pct: 20 },
    location: 'mist_sea', respawnTime: 32,
    lore: '안개해에 가라앉은 고대 함대의 병사가 레테의 힘으로 부활한 것. 녹슨 무기로도 치명적이다.',
  },
  {
    code: 'MON_MS_017', name: '안개 원소체', type: 'normal', element: 'aether', level: 82,
    hp: 490, attack: 90, defense: 16, speed: 11,
    skills: [
      { name: '안개 폭발', damage: 104, cooldown: 6, element: 'aether', effectType: 'aoe' },
      { name: '에테르 응축', damage: 92, cooldown: 8, element: 'aether', effectType: 'damage' },
    ],
    dropTable: [
      { itemId: 'MAT_MIST_ELEMENT', rate: 0.35, minQty: 1, maxQty: 2 },
      { itemId: 'MAT_CONDENSED_AETHER', rate: 0.12, minQty: 1, maxQty: 1 },
    ],
    expReward: 890, goldReward: 280,
    behavior: { aggro_range: 7, patrol: true, flee_hp_pct: 0, enrage_hp_pct: 0 },
    location: 'mist_sea', respawnTime: 35,
    lore: '안개 자체가 에테르로 뭉쳐 형태를 갖춘 원소 생물. 불안정하여 가끔 자폭한다.',
  },
  {
    code: 'MON_MS_018', name: '침몰선 미믹', type: 'normal', element: 'dark', level: 84,
    hp: 640, attack: 88, defense: 26, speed: 6,
    skills: [
      { name: '보물 함정', damage: 0, cooldown: 10, element: 'dark', effectType: 'debuff' },
      { name: '이빨 분쇄', damage: 110, cooldown: 5, element: 'dark', effectType: 'damage' },
      { name: '심해 삼킴', damage: 95, cooldown: 8, element: 'dark', effectType: 'damage' },
    ],
    dropTable: [
      { itemId: 'MAT_MIMIC_TOOTH', rate: 0.35, minQty: 1, maxQty: 1 },
      { itemId: 'MAT_SUNKEN_TREASURE', rate: 0.2, minQty: 1, maxQty: 1 },
    ],
    expReward: 920, goldReward: 295,
    behavior: { aggro_range: 3, patrol: false, flee_hp_pct: 0, enrage_hp_pct: 15 },
    location: 'mist_sea', respawnTime: 40,
    lore: '침몰한 배의 보물 상자로 위장한 미믹. 보물에 끌려 다가오면 거대한 이빨로 물어뜯는다.',
  },
  {
    code: 'MON_MS_019', name: '안개 거북이', type: 'normal', element: 'earth', level: 86,
    hp: 780, attack: 76, defense: 35, speed: 3,
    skills: [
      { name: '안개 쉘 돌진', damage: 100, cooldown: 7, element: 'earth', effectType: 'damage' },
      { name: '봉인 수증기', damage: 85, cooldown: 10, element: 'aether', effectType: 'aoe' },
      { name: '고대 껍질', damage: 0, cooldown: 18, element: 'earth', effectType: 'heal' },
    ],
    dropTable: [
      { itemId: 'MAT_MIST_TURTLE_SHELL', rate: 0.3, minQty: 1, maxQty: 1 },
      { itemId: 'MAT_ANCIENT_MOSS', rate: 0.35, minQty: 1, maxQty: 2 },
    ],
    expReward: 950, goldReward: 305,
    behavior: { aggro_range: 4, patrol: false, flee_hp_pct: 0, enrage_hp_pct: 10 },
    location: 'mist_sea', respawnTime: 45,
    lore: '수백 년간 안개해를 떠돈 고대 거북이. 등에 산호와 이끼가 자라 섬처럼 보인다.',
  },
  {
    code: 'MON_MS_020', name: '봉인 탐식자 유충', type: 'normal', element: 'dark', level: 88,
    hp: 700, attack: 95, defense: 20, speed: 10,
    skills: [
      { name: '봉인 포식', damage: 112, cooldown: 6, element: 'dark', effectType: 'damage' },
      { name: '레테의 아우라', damage: 90, cooldown: 8, element: 'dark', effectType: 'aoe' },
      { name: '기억 부식', damage: 0, cooldown: 12, element: 'dark', effectType: 'debuff' },
    ],
    dropTable: [
      { itemId: 'MAT_DEVOURER_LARVA', rate: 0.3, minQty: 1, maxQty: 1 },
      { itemId: 'MAT_LETHE_SHARD', rate: 0.15, minQty: 1, maxQty: 1 },
    ],
    expReward: 980, goldReward: 320,
    behavior: { aggro_range: 8, patrol: true, flee_hp_pct: 0, enrage_hp_pct: 25 },
    location: 'mist_sea', respawnTime: 45,
    lore: '레테의 분신이 낳은 유충. 봉인석의 에너지를 갉아먹으며 성장하며, 성체가 되면 보스급이 된다.',
  },
];

// ─── 안개해 엘리트 5마리 [P8-14] ───────────────────────────────

const mistSeaElites: MonsterSeed[] = [
  {
    code: 'MON_MS_E01', name: '안개 폭풍 드레이크', type: 'elite', element: 'ice', level: 78,
    hp: 1600, attack: 100, defense: 30, speed: 14,
    skills: [
      { name: '안개 브레스', damage: 130, cooldown: 7, element: 'ice', effectType: 'aoe' },
      { name: '폭풍 질주', damage: 110, cooldown: 5, element: 'lightning', effectType: 'damage' },
      { name: '안개 은신', damage: 0, cooldown: 15, element: 'dark', effectType: 'debuff' },
      { name: '빙결 재생', damage: 0, cooldown: 22, element: 'ice', effectType: 'heal' },
    ],
    dropTable: [
      { itemId: 'MAT_MIST_DRAKE_SCALE', rate: 0.3, minQty: 1, maxQty: 1 },
      { itemId: 'MAT_STORM_ICE_CORE', rate: 0.1, minQty: 1, maxQty: 1 },
      { itemId: 'EQUIP_LANCE_MIST', rate: 0.03, minQty: 1, maxQty: 1 },
    ],
    expReward: 1300, goldReward: 420,
    behavior: { aggro_range: 12, patrol: true, flee_hp_pct: 0, enrage_hp_pct: 25 },
    location: 'mist_sea', respawnTime: 300,
    lore: '안개해 상공을 비행하는 소형 드래곤. 안개와 폭풍을 동시에 다루며 배를 전복시킨다.',
  },
  {
    code: 'MON_MS_E02', name: '봉인자 후손 수호병', type: 'elite', element: 'light', level: 82,
    hp: 1800, attack: 95, defense: 35, speed: 10,
    skills: [
      { name: '봉인의 빛', damage: 120, cooldown: 6, element: 'light', effectType: 'damage' },
      { name: '고대 결계', damage: 0, cooldown: 15, element: 'aether', effectType: 'debuff' },
      { name: '봉인 창술', damage: 105, cooldown: 8, element: 'light', effectType: 'aoe' },
      { name: '봉인 재생', damage: 0, cooldown: 20, element: 'light', effectType: 'heal' },
    ],
    dropTable: [
      { itemId: 'MAT_DESCENDANT_BADGE', rate: 0.3, minQty: 1, maxQty: 1 },
      { itemId: 'MAT_SEAL_LIGHT', rate: 0.12, minQty: 1, maxQty: 1 },
      { itemId: 'EQUIP_SHIELD_SEAL', rate: 0.03, minQty: 1, maxQty: 1 },
    ],
    expReward: 1400, goldReward: 450,
    behavior: { aggro_range: 8, patrol: false, flee_hp_pct: 0, enrage_hp_pct: 20 },
    location: 'mist_sea', respawnTime: 300,
    lore: '봉인자 후손 마을의 정예 수호병. 침입자를 봉인의 에너지로 심판한다.',
  },
  {
    code: 'MON_MS_E03', name: '심해 해골 제독', type: 'elite', element: 'dark', level: 84,
    hp: 1700, attack: 105, defense: 28, speed: 11,
    skills: [
      { name: '유령 함포', damage: 140, cooldown: 8, element: 'dark', effectType: 'aoe' },
      { name: '제독의 검', damage: 120, cooldown: 5, element: 'dark', effectType: 'damage' },
      { name: '해골 선원 소환', damage: 0, cooldown: 18, element: 'dark', effectType: 'debuff' },
      { name: '심해 회복', damage: 0, cooldown: 22, element: 'dark', effectType: 'heal' },
    ],
    dropTable: [
      { itemId: 'MAT_ADMIRAL_SWORD', rate: 0.25, minQty: 1, maxQty: 1 },
      { itemId: 'MAT_GHOST_SHIP_PLANK', rate: 0.2, minQty: 1, maxQty: 1 },
      { itemId: 'EQUIP_HAT_ADMIRAL', rate: 0.03, minQty: 1, maxQty: 1 },
    ],
    expReward: 1500, goldReward: 480,
    behavior: { aggro_range: 10, patrol: true, flee_hp_pct: 0, enrage_hp_pct: 20 },
    location: 'mist_sea', respawnTime: 300,
    lore: '안개해에 침몰한 고대 함대의 제독. 죽어서도 함대를 지휘하며 유령 함포를 쏜다.',
  },
  {
    code: 'MON_MS_E04', name: '기억의 포식자', type: 'elite', element: 'dark', level: 86,
    hp: 1500, attack: 112, defense: 24, speed: 13,
    skills: [
      { name: '기억 대흡수', damage: 135, cooldown: 6, element: 'dark', effectType: 'damage' },
      { name: '망각의 파도', damage: 115, cooldown: 10, element: 'dark', effectType: 'aoe' },
      { name: '기억 방패', damage: 0, cooldown: 15, element: 'dark', effectType: 'heal' },
    ],
    dropTable: [
      { itemId: 'MAT_MEMORY_DEVOURER_EYE', rate: 0.25, minQty: 1, maxQty: 1 },
      { itemId: 'MAT_FORGOTTEN_CORE', rate: 0.1, minQty: 1, maxQty: 1 },
      { itemId: 'EQUIP_ORB_MEMORY', rate: 0.03, minQty: 1, maxQty: 1 },
    ],
    expReward: 1600, goldReward: 510,
    behavior: { aggro_range: 10, patrol: true, flee_hp_pct: 0, enrage_hp_pct: 25 },
    location: 'mist_sea', respawnTime: 300,
    lore: '레테의 힘으로 태어난 기억 포식자. 주변 생물의 기억을 대량으로 흡수해 자신의 힘으로 변환한다.',
  },
  {
    code: 'MON_MS_E05', name: '봉인 침식 거인', type: 'elite', element: 'aether', level: 88,
    hp: 2000, attack: 108, defense: 38, speed: 6,
    skills: [
      { name: '봉인 파괴 주먹', damage: 145, cooldown: 6, element: 'aether', effectType: 'damage' },
      { name: '에테르 폭풍', damage: 120, cooldown: 10, element: 'aether', effectType: 'aoe' },
      { name: '침식 흡수', damage: 0, cooldown: 18, element: 'aether', effectType: 'heal' },
      { name: '봉인 분쇄', damage: 0, cooldown: 15, element: 'dark', effectType: 'debuff' },
    ],
    dropTable: [
      { itemId: 'MAT_EROSION_GIANT_HEART', rate: 0.2, minQty: 1, maxQty: 1 },
      { itemId: 'MAT_SEAL_BREAKER', rate: 0.08, minQty: 1, maxQty: 1 },
      { itemId: 'EQUIP_GAUNTLET_SEAL', rate: 0.02, minQty: 1, maxQty: 1 },
    ],
    expReward: 1800, goldReward: 550,
    behavior: { aggro_range: 8, patrol: false, flee_hp_pct: 0, enrage_hp_pct: 20 },
    location: 'mist_sea', respawnTime: 360,
    lore: '봉인석을 깨뜨리며 커가는 거대 인형. 레테의 의지로 봉인을 물리적으로 파괴하려는 병기.',
  },
];

// ─── 안개해 던전 보스 5마리 [P8-14] ────────────────────────────

const mistSeaDungeonBosses: MonsterSeed[] = [
  {
    code: 'MON_BOSS_MS01', name: '기억의 등대지기 메모리아', type: 'boss', element: 'dark', level: 78,
    hp: 10000, attack: 100, defense: 38, speed: 10,
    skills: [
      { name: '기억 조작', damage: 130, cooldown: 8, element: 'dark', effectType: 'aoe' },
      { name: '등대의 광선', damage: 150, cooldown: 10, element: 'light', effectType: 'damage' },
      { name: '기억 흡수 치유', damage: 0, cooldown: 20, element: 'dark', effectType: 'heal' },
      { name: '과거 재현', damage: 0, cooldown: 15, element: 'dark', effectType: 'debuff' },
    ],
    dropTable: [
      { itemId: 'MAT_LIGHTHOUSE_KEY', rate: 1.0, minQty: 1, maxQty: 1 },
      { itemId: 'EQUIP_LANTERN_MEMORIA', rate: 0.08, minQty: 1, maxQty: 1 },
      { itemId: 'MAT_MEMORY_CORAL', rate: 0.5, minQty: 3, maxQty: 5 },
    ],
    expReward: 4000, goldReward: 1500,
    behavior: { aggro_range: 15, patrol: false, flee_hp_pct: 0, enrage_hp_pct: 25 },
    location: 'mist_sea', respawnTime: 900,
    lore: '기억의 등대를 지키는 봉인자 메모리아의 기억이 실체화된 보스. 기억을 조작해 환각을 보여준다.',
  },
  {
    code: 'MON_BOSS_MS02', name: '침몰 함대 함장 레버넌트', type: 'boss', element: 'dark', level: 82,
    hp: 11000, attack: 110, defense: 35, speed: 11,
    skills: [
      { name: '유령 대함포 일제사격', damage: 160, cooldown: 10, element: 'dark', effectType: 'aoe' },
      { name: '칼바람', damage: 130, cooldown: 5, element: 'dark', effectType: 'damage' },
      { name: '심해 소용돌이', damage: 140, cooldown: 12, element: 'ice', effectType: 'aoe' },
      { name: '불사의 선장', damage: 0, cooldown: 25, element: 'dark', effectType: 'heal' },
    ],
    dropTable: [
      { itemId: 'MAT_CAPTAIN_COMPASS', rate: 1.0, minQty: 1, maxQty: 1 },
      { itemId: 'EQUIP_SWORD_CAPTAIN', rate: 0.06, minQty: 1, maxQty: 1 },
      { itemId: 'MAT_GHOST_ANCHOR', rate: 0.5, minQty: 2, maxQty: 4 },
    ],
    expReward: 4500, goldReward: 1800,
    behavior: { aggro_range: 15, patrol: false, flee_hp_pct: 0, enrage_hp_pct: 20 },
    location: 'mist_sea', respawnTime: 900,
    lore: '안개해 최대 침몰 함대의 함장. 레테의 힘으로 부활해 영원히 항해를 계속한다.',
  },
  {
    code: 'MON_BOSS_MS03', name: '봉인 균열 가디언', type: 'boss', element: 'aether', level: 85,
    hp: 12000, attack: 105, defense: 42, speed: 8,
    skills: [
      { name: '봉인 폭발', damage: 170, cooldown: 10, element: 'aether', effectType: 'aoe' },
      { name: '에테르 감옥', damage: 0, cooldown: 15, element: 'aether', effectType: 'debuff' },
      { name: '고대 봉인 복원', damage: 0, cooldown: 22, element: 'aether', effectType: 'heal' },
      { name: '봉인 광선', damage: 150, cooldown: 7, element: 'light', effectType: 'damage' },
    ],
    dropTable: [
      { itemId: 'MAT_GUARDIAN_SEAL', rate: 1.0, minQty: 1, maxQty: 1 },
      { itemId: 'EQUIP_SHIELD_GUARDIAN', rate: 0.06, minQty: 1, maxQty: 1 },
      { itemId: 'MAT_SEAL_FRAGMENT', rate: 0.5, minQty: 3, maxQty: 5 },
    ],
    expReward: 5000, goldReward: 2000,
    behavior: { aggro_range: 15, patrol: false, flee_hp_pct: 0, enrage_hp_pct: 20 },
    location: 'mist_sea', respawnTime: 900,
    lore: '봉인 균열을 지키도록 프로그래밍된 고대 가디언. 봉인이 손상될수록 폭주하며 아군조차 공격한다.',
  },
  {
    code: 'MON_BOSS_MS04', name: '안개해 대해마 츠나미', type: 'boss', element: 'ice', level: 88,
    hp: 13000, attack: 115, defense: 38, speed: 12,
    skills: [
      { name: '대해일', damage: 180, cooldown: 10, element: 'ice', effectType: 'aoe' },
      { name: '심해 수압 분쇄', damage: 160, cooldown: 6, element: 'ice', effectType: 'damage' },
      { name: '해류 치유', damage: 0, cooldown: 20, element: 'ice', effectType: 'heal' },
      { name: '빙결 파도', damage: 140, cooldown: 8, element: 'ice', effectType: 'aoe' },
      { name: '소용돌이 속박', damage: 0, cooldown: 15, element: 'ice', effectType: 'debuff' },
    ],
    dropTable: [
      { itemId: 'MAT_TSUNAMI_HEART', rate: 1.0, minQty: 1, maxQty: 1 },
      { itemId: 'EQUIP_TRIDENT_TSUNAMI', rate: 0.05, minQty: 1, maxQty: 1 },
      { itemId: 'MAT_FROZEN_PEARL', rate: 0.4, minQty: 2, maxQty: 4 },
    ],
    expReward: 5500, goldReward: 2200,
    behavior: { aggro_range: 18, patrol: false, flee_hp_pct: 0, enrage_hp_pct: 25 },
    location: 'mist_sea', respawnTime: 900,
    lore: '안개해 심층을 지배하는 거대 해마. 대해일을 일으켜 전장 전체를 물바다로 만든다.',
  },
  {
    code: 'MON_BOSS_MS05', name: '봉인 탐식자 — 레테의 분신', type: 'boss', element: 'dark', level: 90,
    hp: 15000, attack: 125, defense: 40, speed: 13,
    skills: [
      { name: '망각 대폭발', damage: 200, cooldown: 12, element: 'dark', effectType: 'aoe' },
      { name: '기억 소멸', damage: 180, cooldown: 6, element: 'dark', effectType: 'damage' },
      { name: '레테의 흡수', damage: 0, cooldown: 20, element: 'dark', effectType: 'heal' },
      { name: '봉인 침식', damage: 0, cooldown: 15, element: 'dark', effectType: 'debuff' },
      { name: '존재 부정', damage: 220, cooldown: 18, element: 'dark', effectType: 'damage' },
    ],
    dropTable: [
      { itemId: 'MAT_LETHE_AVATAR_CORE', rate: 1.0, minQty: 1, maxQty: 1 },
      { itemId: 'EQUIP_SWORD_LETHE', rate: 0.04, minQty: 1, maxQty: 1 },
      { itemId: 'MAT_OBLIVION_ESSENCE', rate: 0.5, minQty: 3, maxQty: 5 },
    ],
    expReward: 6000, goldReward: 2500,
    behavior: { aggro_range: 20, patrol: false, flee_hp_pct: 0, enrage_hp_pct: 20 },
    location: 'mist_sea', respawnTime: 1200,
    lore: '레테의 잔류 의식이 물리적 형태를 취한 분신. 챕터 6 보스전의 대상이며 기억 파괴로만 완전히 소멸시킬 수 있다.',
  },
];

// ─── 안개해 12인 레이드 보스 3마리 [P8-08] ──────────────────────

const mistSeaRaidBosses: MonsterSeed[] = [
  {
    code: 'MON_RAID_MS01', name: '안개 거신 네뷸로스', type: 'raid_boss', element: 'aether', level: 90,
    hp: 60000, attack: 170, defense: 65, speed: 8,
    skills: [
      // 페이즈 1: 안개 형태 (HP 100%~70%)
      { name: '안개 대파동', damage: 280, cooldown: 10, element: 'aether', effectType: 'aoe' },
      { name: '기억 소용돌이', damage: 200, cooldown: 6, element: 'dark', effectType: 'damage' },
      // 페이즈 2: 응축 형태 (HP 70%~30%)
      { name: '응축 주먹', damage: 350, cooldown: 8, element: 'earth', effectType: 'damage' },
      { name: '안개 결계 — 기억 봉쇄', damage: 0, cooldown: 20, element: 'dark', effectType: 'debuff' },
      // 페이즈 3: 폭주 형태 (HP 30% 이하)
      { name: '안개 대붕괴', damage: 450, cooldown: 15, element: 'aether', effectType: 'aoe' },
      { name: '거신 재생', damage: 0, cooldown: 30, element: 'aether', effectType: 'heal' },
    ],
    dropTable: [
      { itemId: 'MAT_NEBULOS_HEART', rate: 1.0, minQty: 1, maxQty: 2 },
      { itemId: 'EQUIP_LEGENDARY_STAFF_NEBULOS', rate: 0.01, minQty: 1, maxQty: 1 },
      { itemId: 'MAT_CONDENSED_AETHER', rate: 0.6, minQty: 5, maxQty: 8 },
      { itemId: 'MAT_FOG_ESSENCE', rate: 0.8, minQty: 3, maxQty: 5 },
    ],
    expReward: 25000, goldReward: 12000,
    behavior: { aggro_range: 50, patrol: false, flee_hp_pct: 0, enrage_hp_pct: 10 },
    location: 'mist_sea', respawnTime: 86400,
    lore: '안개해 전체를 감싸는 거대한 안개의 의지체. 3페이즈로 형태가 변하며, 최종 형태에서는 안개해 자체가 무기가 된다. 12인 레이드 필수.',
  },
  {
    code: 'MON_RAID_MS02', name: '심해 크라켄 아비살', type: 'raid_boss', element: 'ice', level: 90,
    hp: 65000, attack: 180, defense: 55, speed: 10,
    skills: [
      // 페이즈 1: 촉수 전 (HP 100%~70%)
      { name: '촉수 8연타', damage: 250, cooldown: 5, element: 'ice', effectType: 'damage' },
      { name: '먹물 안개 필드', damage: 0, cooldown: 15, element: 'dark', effectType: 'debuff' },
      // 페이즈 2: 본체 노출 (HP 70%~30%)
      { name: '대해일 분쇄', damage: 380, cooldown: 10, element: 'ice', effectType: 'aoe' },
      { name: '심해 수압 감옥', damage: 300, cooldown: 12, element: 'ice', effectType: 'damage' },
      // 페이즈 3: 광폭화 (HP 30% 이하)
      { name: '크라켄 대격류', damage: 500, cooldown: 15, element: 'ice', effectType: 'aoe' },
      { name: '심해 재생', damage: 0, cooldown: 30, element: 'ice', effectType: 'heal' },
    ],
    dropTable: [
      { itemId: 'MAT_ABYSSAL_KRAKEN_EYE', rate: 1.0, minQty: 1, maxQty: 1 },
      { itemId: 'EQUIP_LEGENDARY_TRIDENT_ABYSSAL', rate: 0.01, minQty: 1, maxQty: 1 },
      { itemId: 'MAT_FROZEN_TENTACLE', rate: 0.6, minQty: 5, maxQty: 8 },
      { itemId: 'MAT_SQUID_INK', rate: 0.8, minQty: 3, maxQty: 5 },
    ],
    expReward: 28000, goldReward: 14000,
    behavior: { aggro_range: 50, patrol: false, flee_hp_pct: 0, enrage_hp_pct: 10 },
    location: 'mist_sea', respawnTime: 86400,
    lore: '안개해 최심부에 잠든 고대 크라켄. 봉인 해제로 깨어나 수면 위까지 촉수를 뻗친다. 촉수를 먼저 처리하지 않으면 본체에 접근 불가.',
  },
  {
    code: 'MON_RAID_MS03', name: '망각의 파수꾼 옵리비온', type: 'raid_boss', element: 'dark', level: 90,
    hp: 70000, attack: 190, defense: 60, speed: 12,
    skills: [
      // 페이즈 1: 파수꾼 형태 (HP 100%~70%)
      { name: '망각의 대검', damage: 300, cooldown: 6, element: 'dark', effectType: 'damage' },
      { name: '기억 말소 필드', damage: 0, cooldown: 18, element: 'dark', effectType: 'debuff' },
      // 페이즈 2: 레테 흡수 형태 (HP 70%~30%)
      { name: '존재 소거 파동', damage: 400, cooldown: 10, element: 'dark', effectType: 'aoe' },
      { name: '기억 포식', damage: 350, cooldown: 8, element: 'dark', effectType: 'damage' },
      // 페이즈 3: 레테 화신 (HP 30% 이하)
      { name: '완전 망각', damage: 550, cooldown: 15, element: 'dark', effectType: 'aoe' },
      { name: '레테의 귀환', damage: 0, cooldown: 35, element: 'dark', effectType: 'heal' },
    ],
    dropTable: [
      { itemId: 'MAT_OBLIVION_CROWN', rate: 1.0, minQty: 1, maxQty: 1 },
      { itemId: 'EQUIP_LEGENDARY_BLADE_OBLIVION', rate: 0.01, minQty: 1, maxQty: 1 },
      { itemId: 'MAT_OBLIVION_ESSENCE', rate: 0.6, minQty: 5, maxQty: 8 },
      { itemId: 'MAT_LETHE_SHARD', rate: 0.5, minQty: 3, maxQty: 5 },
    ],
    expReward: 30000, goldReward: 15000,
    behavior: { aggro_range: 50, patrol: false, flee_hp_pct: 0, enrage_hp_pct: 10 },
    location: 'mist_sea', respawnTime: 86400,
    lore: '봉인의 첨탑 최심부에서 레테의 귀환을 준비하는 궁극의 파수꾼. 3페이즈에서 레테의 화신으로 변신하며, 기억 파괴 스킬 없이는 최종 페이즈 돌파 불가.',
  },
];

// ─── 레이드 보스 3마리 (기존 raidBoss 모델과 연동) ──────────────

const raidBosses: MonsterSeed[] = [
  {
    code: 'MON_RAID_001', name: '에테르 드래곤 에테르노스', type: 'raid_boss', element: 'aether', level: 80,
    hp: 50000, attack: 150, defense: 60, speed: 12,
    skills: [
      { name: '에테르 종말 브레스', damage: 300, cooldown: 15, element: 'aether', effectType: 'aoe' },
      { name: '용의 발톱 연격', damage: 200, cooldown: 5, element: 'neutral', effectType: 'damage' },
      { name: '에테르 재생', damage: 0, cooldown: 30, element: 'aether', effectType: 'heal' },
      { name: '차원 붕괴', damage: 250, cooldown: 20, element: 'aether', effectType: 'aoe' },
      { name: '용의 위엄', damage: 0, cooldown: 25, element: 'aether', effectType: 'debuff' },
    ],
    dropTable: [
      { itemId: 'MAT_ETERNOS_SCALE', rate: 1.0, minQty: 1, maxQty: 2 },
      { itemId: 'EQUIP_LEGENDARY_SWORD_ETERNOS', rate: 0.01, minQty: 1, maxQty: 1 },
      { itemId: 'MAT_AETHER_DRAGON_BLOOD', rate: 0.5, minQty: 3, maxQty: 5 },
      { itemId: 'MAT_AETHER_HEART', rate: 0.2, minQty: 1, maxQty: 1 },
    ],
    expReward: 20000, goldReward: 10000,
    behavior: { aggro_range: 50, patrol: false, flee_hp_pct: 0, enrage_hp_pct: 15 },
    location: 'void_abyss', respawnTime: 86400,
    lore: '에테르나 크로니클 세계의 최강 드래곤. 에테르 에너지 그 자체가 형상화된 존재로, 세계를 초기화할 수 있는 힘을 가졌다.',
  },
  {
    code: 'MON_RAID_002', name: '시간의 신 테포라스', type: 'raid_boss', element: 'time', level: 80,
    hp: 45000, attack: 140, defense: 55, speed: 15,
    skills: [
      { name: '시간 대붕괴', damage: 280, cooldown: 12, element: 'time', effectType: 'aoe' },
      { name: '시간 정지 결계', damage: 0, cooldown: 25, element: 'time', effectType: 'debuff' },
      { name: '시간 역행', damage: 0, cooldown: 35, element: 'time', effectType: 'heal' },
      { name: '크로노 블레이드 오메가', damage: 250, cooldown: 8, element: 'time', effectType: 'damage' },
      { name: '과거-현재-미래 삼중격', damage: 350, cooldown: 20, element: 'time', effectType: 'aoe' },
    ],
    dropTable: [
      { itemId: 'MAT_TEPORAS_HOURGLASS', rate: 1.0, minQty: 1, maxQty: 1 },
      { itemId: 'EQUIP_LEGENDARY_BLADE_TEMPORAS', rate: 0.01, minQty: 1, maxQty: 1 },
      { itemId: 'MAT_CHRONO_HEART', rate: 0.3, minQty: 1, maxQty: 2 },
      { itemId: 'MAT_TIME_CRYSTAL', rate: 0.6, minQty: 5, maxQty: 8 },
    ],
    expReward: 18000, goldReward: 9000,
    behavior: { aggro_range: 50, patrol: false, flee_hp_pct: 0, enrage_hp_pct: 20 },
    location: 'void_abyss', respawnTime: 86400,
    lore: '시간을 관장하는 신적 존재. 과거·현재·미래를 동시에 공격하며, 시간 역행으로 전투를 원점 복귀시킨다.',
  },
  {
    code: 'MON_RAID_003', name: '혼돈의 제왕 카오스', type: 'raid_boss', element: 'dark', level: 80,
    hp: 55000, attack: 160, defense: 50, speed: 13,
    skills: [
      { name: '혼돈 대소멸', damage: 350, cooldown: 15, element: 'dark', effectType: 'aoe' },
      { name: '혼돈의 지배', damage: 0, cooldown: 20, element: 'dark', effectType: 'debuff' },
      { name: '카오스 재생', damage: 0, cooldown: 30, element: 'dark', effectType: 'heal' },
      { name: '무한 어둠', damage: 280, cooldown: 10, element: 'dark', effectType: 'aoe' },
      { name: '종말의 검', damage: 400, cooldown: 25, element: 'dark', effectType: 'damage' },
    ],
    dropTable: [
      { itemId: 'MAT_CHAOS_CROWN', rate: 1.0, minQty: 1, maxQty: 1 },
      { itemId: 'EQUIP_LEGENDARY_ARMOR_CHAOS', rate: 0.01, minQty: 1, maxQty: 1 },
      { itemId: 'MAT_CHAOS_ESSENCE', rate: 0.4, minQty: 2, maxQty: 4 },
      { itemId: 'MAT_DOOM_ESSENCE', rate: 0.3, minQty: 1, maxQty: 2 },
    ],
    expReward: 22000, goldReward: 12000,
    behavior: { aggro_range: 50, patrol: false, flee_hp_pct: 0, enrage_hp_pct: 10 },
    location: 'void_abyss', respawnTime: 86400,
    lore: '모든 혼돈의 근원이자 세계를 멸망시키려는 최종 보스. 종말의 검 한 번에 파티가 전멸할 수 있다.',
  },
];

// ─── 시드 함수 ──────────────────────────────────────────────────

/**
 * 전체 100마리 몬스터를 DB에 시드
 * 기존 데이터와 충돌 시 code 기준으로 upsert
 */
export async function seedMonsters(): Promise<{ created: number; updated: number }> {
  const allMonsters: MonsterSeed[] = [
    ...twilightForestNormals,   // 10
    ...kronosCityNormals,       // 10
    ...aetheriaVillageNormals,  // 10
    ...shadowFortressNormals,   // 10
    ...crystalCavernNormals,    // 10
    ...voidAbyssNormals,        // 10
    ...mistSeaNormals,          // 20 [P8-14]
    ...eliteMonsters,           // 20
    ...mistSeaElites,           // 5  [P8-14]
    ...dungeonBosses,           // 12
    ...mistSeaDungeonBosses,    // 5  [P8-14]
    ...fieldBosses,             // 5
    ...raidBosses,              // 3
    ...mistSeaRaidBosses,       // 3  [P8-08]
  ];

  let created = 0;
  let updated = 0;

  for (const m of allMonsters) {
    const existing = await prisma.monster.findUnique({ where: { code: m.code } });
    if (existing) {
      await prisma.monster.update({
        where: { code: m.code },
        data: {
          name: m.name,
          type: m.type,
          element: m.element,
          level: m.level,
          hp: m.hp,
          attack: m.attack,
          defense: m.defense,
          speed: m.speed,
          skills: m.skills,
          dropTable: m.dropTable,
          expReward: m.expReward,
          goldReward: m.goldReward,
          behavior: m.behavior,
          location: m.location,
          respawnTime: m.respawnTime,
          lore: m.lore,
        },
      });
      updated++;
    } else {
      await prisma.monster.create({
        data: {
          code: m.code,
          name: m.name,
          type: m.type,
          element: m.element,
          level: m.level,
          hp: m.hp,
          attack: m.attack,
          defense: m.defense,
          speed: m.speed,
          skills: m.skills,
          dropTable: m.dropTable,
          expReward: m.expReward,
          goldReward: m.goldReward,
          behavior: m.behavior,
          location: m.location,
          respawnTime: m.respawnTime,
          lore: m.lore,
        },
      });
      created++;
    }
  }

  return { created, updated };
}

/** 몬스터 시드 데이터 배열 (외부 참조용) */
export function getAllMonsterSeeds(): MonsterSeed[] {
  return [
    ...twilightForestNormals,
    ...kronosCityNormals,
    ...aetheriaVillageNormals,
    ...shadowFortressNormals,
    ...crystalCavernNormals,
    ...voidAbyssNormals,
    ...mistSeaNormals,
    ...eliteMonsters,
    ...mistSeaElites,
    ...dungeonBosses,
    ...mistSeaDungeonBosses,
    ...fieldBosses,
    ...raidBosses,
    ...mistSeaRaidBosses,
  ];
}