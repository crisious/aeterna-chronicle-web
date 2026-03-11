/**
 * 펫 시드 데이터 — 15종 펫 + 20개 스킬 정의
 */

// ─── 펫 스킬 정의 (20개) ────────────────────────────────────────

export interface PetSkillSeed {
  id: string;
  name: string;
  description: string;
  damage: number;
  cooldown: number;
  effectType: 'damage' | 'heal' | 'buff' | 'debuff';
  targetType: 'single' | 'aoe';
  unlockLevel: number;
}

export const PET_SKILLS: PetSkillSeed[] = [
  // ── 늑대 계열 스킬 ──
  { id: 'sk_wolf_bite',       name: '늑대 이빨',       description: '날카로운 이빨로 적을 물어뜯는다.',               damage: 25,  cooldown: 5,  effectType: 'damage', targetType: 'single', unlockLevel: 1 },
  { id: 'sk_wolf_howl',       name: '전투의 울부짖음', description: '울부짖어 아군 공격력을 높인다.',                 damage: 0,   cooldown: 20, effectType: 'buff',   targetType: 'aoe',    unlockLevel: 5 },
  { id: 'sk_wolf_frenzy',     name: '광란의 돌진',     description: '미친 듯이 돌진하여 연속 공격한다.',               damage: 45,  cooldown: 12, effectType: 'damage', targetType: 'single', unlockLevel: 10 },
  { id: 'sk_wolf_shadow',     name: '그림자 습격',     description: '그림자 속에서 기습하여 치명타를 노린다.',         damage: 60,  cooldown: 18, effectType: 'damage', targetType: 'single', unlockLevel: 20 },

  // ── 봉황 계열 스킬 ──
  { id: 'sk_phoenix_flame',   name: '화염 날개',       description: '불타는 날개로 적을 휩쓴다.',                     damage: 30,  cooldown: 6,  effectType: 'damage', targetType: 'aoe',    unlockLevel: 1 },
  { id: 'sk_phoenix_heal',    name: '재생의 불꽃',     description: '불꽃으로 아군을 치유한다.',                       damage: 0,   cooldown: 15, effectType: 'heal',   targetType: 'single', unlockLevel: 5 },
  { id: 'sk_phoenix_rebirth', name: '불사의 깃털',     description: '쓰러진 아군에게 부활의 기운을 불어넣는다.',       damage: 0,   cooldown: 60, effectType: 'heal',   targetType: 'single', unlockLevel: 15 },
  { id: 'sk_phoenix_inferno', name: '업화',             description: '대지를 불태우는 거대한 화염을 소환한다.',         damage: 80,  cooldown: 25, effectType: 'damage', targetType: 'aoe',    unlockLevel: 25 },

  // ── 골렘 계열 스킬 ──
  { id: 'sk_golem_slam',      name: '대지 강타',       description: '거대한 주먹으로 대지를 내리친다.',               damage: 20,  cooldown: 8,  effectType: 'damage', targetType: 'aoe',    unlockLevel: 1 },
  { id: 'sk_golem_shield',    name: '바위 방벽',       description: '바위 방벽으로 아군을 보호한다.',                 damage: 0,   cooldown: 20, effectType: 'buff',   targetType: 'aoe',    unlockLevel: 5 },
  { id: 'sk_golem_quake',     name: '지진',             description: '대지를 뒤흔들어 적을 넘어뜨린다.',               damage: 35,  cooldown: 15, effectType: 'damage', targetType: 'aoe',    unlockLevel: 12 },
  { id: 'sk_golem_fortress',  name: '철벽 수호',       description: '미스릴 갑옷으로 아군 방어력을 대폭 상승시킨다.', damage: 0,   cooldown: 30, effectType: 'buff',   targetType: 'aoe',    unlockLevel: 20 },

  // ── 요정 계열 스킬 ──
  { id: 'sk_fairy_sparkle',   name: '빛의 가루',       description: '반짝이는 가루를 뿌려 적의 명중률을 낮춘다.',     damage: 10,  cooldown: 8,  effectType: 'debuff', targetType: 'aoe',    unlockLevel: 1 },
  { id: 'sk_fairy_bless',     name: '축복의 노래',     description: '아군 전체를 축복하여 회복력을 높인다.',           damage: 0,   cooldown: 18, effectType: 'buff',   targetType: 'aoe',    unlockLevel: 5 },
  { id: 'sk_fairy_time',      name: '시간 왜곡',       description: '시간을 조작하여 적의 행동 속도를 늦춘다.',       damage: 0,   cooldown: 25, effectType: 'debuff', targetType: 'aoe',    unlockLevel: 15 },
  { id: 'sk_fairy_chrono',    name: '시간 역행',       description: '시간을 되돌려 아군의 체력을 회복한다.',           damage: 0,   cooldown: 40, effectType: 'heal',   targetType: 'aoe',    unlockLevel: 25 },

  // ── 드래곤 계열 스킬 ──
  { id: 'sk_dragon_breath',   name: '드래곤 브레스',   description: '화염 브레스로 전방의 적을 태운다.',               damage: 40,  cooldown: 10, effectType: 'damage', targetType: 'aoe',    unlockLevel: 1 },
  { id: 'sk_dragon_claw',     name: '용의 발톱',       description: '날카로운 발톱으로 적을 갈라 찢는다.',             damage: 55,  cooldown: 8,  effectType: 'damage', targetType: 'single', unlockLevel: 8 },
  { id: 'sk_dragon_roar',     name: '용의 포효',       description: '우렁찬 포효로 적을 공포에 빠뜨린다.',             damage: 0,   cooldown: 22, effectType: 'debuff', targetType: 'aoe',    unlockLevel: 15 },
  { id: 'sk_dragon_ether',    name: '에테르 폭풍',     description: '에테르 에너지를 폭발시켜 모든 것을 소멸시킨다.', damage: 120, cooldown: 45, effectType: 'damage', targetType: 'aoe',    unlockLevel: 30 },
];

// ─── 펫 종 정의 (15종) ──────────────────────────────────────────

export interface PetSpeciesSeed {
  species: string;
  name: string;
  family: 'wolf' | 'phoenix' | 'golem' | 'fairy' | 'dragon';
  baseHp: number;
  baseAttack: number;
  baseDefense: number;
  learnableSkills: string[];  // PetSkillSeed.id 참조
  description: string;
}

export const PET_SPECIES: PetSpeciesSeed[] = [
  // ── 늑대 계열 (물리 DPS) ──
  {
    species: 'forest_wolf', name: '숲늑대', family: 'wolf',
    baseHp: 90, baseAttack: 18, baseDefense: 6,
    learnableSkills: ['sk_wolf_bite', 'sk_wolf_howl', 'sk_wolf_frenzy'],
    description: '울창한 숲에서 태어난 민첩한 늑대. 빠른 연속 공격이 특기.',
  },
  {
    species: 'frost_wolf', name: '서리늑대', family: 'wolf',
    baseHp: 100, baseAttack: 20, baseDefense: 8,
    learnableSkills: ['sk_wolf_bite', 'sk_wolf_howl', 'sk_wolf_frenzy', 'sk_wolf_shadow'],
    description: '만년설 위를 달리는 냉기의 늑대. 서릿발 같은 이빨이 치명적.',
  },
  {
    species: 'shadow_wolf', name: '암흑늑대', family: 'wolf',
    baseHp: 85, baseAttack: 25, baseDefense: 5,
    learnableSkills: ['sk_wolf_bite', 'sk_wolf_frenzy', 'sk_wolf_shadow'],
    description: '어둠 자체가 실체화한 존재. 그림자 속에서 기습하는 암살자.',
  },

  // ── 봉황 계열 (마법 + 힐) ──
  {
    species: 'small_firebird', name: '작은불새', family: 'phoenix',
    baseHp: 80, baseAttack: 15, baseDefense: 5,
    learnableSkills: ['sk_phoenix_flame', 'sk_phoenix_heal'],
    description: '아직 어린 불새. 작지만 뜨거운 불꽃을 품고 있다.',
  },
  {
    species: 'fire_phoenix', name: '화봉황', family: 'phoenix',
    baseHp: 95, baseAttack: 20, baseDefense: 7,
    learnableSkills: ['sk_phoenix_flame', 'sk_phoenix_heal', 'sk_phoenix_rebirth'],
    description: '화염과 함께 비상하는 봉황. 아군의 생명을 지키는 수호자.',
  },
  {
    species: 'immortal_phoenix', name: '불사조', family: 'phoenix',
    baseHp: 110, baseAttack: 22, baseDefense: 8,
    learnableSkills: ['sk_phoenix_flame', 'sk_phoenix_heal', 'sk_phoenix_rebirth', 'sk_phoenix_inferno'],
    description: '불멸의 불사조. 업화로 적을 소멸시키고 아군을 부활시킨다.',
  },

  // ── 골렘 계열 (탱크) ──
  {
    species: 'stone_golem', name: '돌골렘', family: 'golem',
    baseHp: 150, baseAttack: 8, baseDefense: 15,
    learnableSkills: ['sk_golem_slam', 'sk_golem_shield'],
    description: '단단한 바위로 이루어진 골렘. 느리지만 무너지지 않는다.',
  },
  {
    species: 'steel_golem', name: '강철골렘', family: 'golem',
    baseHp: 180, baseAttack: 10, baseDefense: 20,
    learnableSkills: ['sk_golem_slam', 'sk_golem_shield', 'sk_golem_quake'],
    description: '강철로 단련된 골렘. 대지를 뒤흔드는 힘을 지녔다.',
  },
  {
    species: 'mithril_golem', name: '미스릴골렘', family: 'golem',
    baseHp: 200, baseAttack: 12, baseDefense: 25,
    learnableSkills: ['sk_golem_slam', 'sk_golem_shield', 'sk_golem_quake', 'sk_golem_fortress'],
    description: '전설의 금속 미스릴로 만들어진 궁극의 수호자.',
  },

  // ── 요정 계열 (버프/디버프) ──
  {
    species: 'grass_fairy', name: '풀요정', family: 'fairy',
    baseHp: 70, baseAttack: 10, baseDefense: 4,
    learnableSkills: ['sk_fairy_sparkle', 'sk_fairy_bless'],
    description: '풀잎 사이에서 태어난 작은 요정. 자연의 축복을 나눈다.',
  },
  {
    species: 'light_fairy', name: '빛요정', family: 'fairy',
    baseHp: 80, baseAttack: 12, baseDefense: 5,
    learnableSkills: ['sk_fairy_sparkle', 'sk_fairy_bless', 'sk_fairy_time'],
    description: '순수한 빛의 결정에서 깨어난 요정. 시간을 조금 다룰 수 있다.',
  },
  {
    species: 'time_fairy', name: '시간요정', family: 'fairy',
    baseHp: 85, baseAttack: 14, baseDefense: 6,
    learnableSkills: ['sk_fairy_sparkle', 'sk_fairy_bless', 'sk_fairy_time', 'sk_fairy_chrono'],
    description: '시간의 틈새에 사는 신비로운 요정. 시간을 역행시킬 수 있다.',
  },

  // ── 드래곤 계열 (만능) ──
  {
    species: 'baby_dragon', name: '아기드래곤', family: 'dragon',
    baseHp: 100, baseAttack: 15, baseDefense: 10,
    learnableSkills: ['sk_dragon_breath', 'sk_dragon_claw'],
    description: '갓 알에서 부화한 아기 드래곤. 귀엽지만 이미 불을 뿜는다.',
  },
  {
    species: 'fire_dragon', name: '화염드래곤', family: 'dragon',
    baseHp: 130, baseAttack: 22, baseDefense: 14,
    learnableSkills: ['sk_dragon_breath', 'sk_dragon_claw', 'sk_dragon_roar'],
    description: '용암의 심장을 가진 화염드래곤. 포효 한 번에 전장이 얼어붙는다.',
  },
  {
    species: 'ether_dragon', name: '에테르드래곤', family: 'dragon',
    baseHp: 160, baseAttack: 28, baseDefense: 18,
    learnableSkills: ['sk_dragon_breath', 'sk_dragon_claw', 'sk_dragon_roar', 'sk_dragon_ether'],
    description: '에테르의 근원에서 태어난 전설의 드래곤. 모든 것을 초월한 존재.',
  },
];
