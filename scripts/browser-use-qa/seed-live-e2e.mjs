import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const items = [
  {
    code: 'WPN_SWORD_C',
    name: '수련용 장검',
    description: 'QA용 초보 기사 기본 무기',
    type: 'weapon',
    subType: 'sword',
    grade: 'common',
    level: 1,
    stats: { attack: 10 },
    price: 50,
    sellPrice: 15,
    stackable: false,
    maxStack: 1,
    tradeable: true,
  },
  {
    code: 'WPN_STAFF_C',
    name: '나무 지팡이',
    description: 'QA용 마법 입문자 기본 무기',
    type: 'weapon',
    subType: 'staff',
    grade: 'common',
    level: 1,
    stats: { attack: 5, mp: 20 },
    price: 50,
    sellPrice: 15,
    stackable: false,
    maxStack: 1,
    tradeable: true,
  },
  {
    code: 'WPN_DAGGER_C',
    name: '녹슨 단검',
    description: 'QA용 그림자 계열 기본 무기',
    type: 'weapon',
    subType: 'dagger',
    grade: 'common',
    level: 1,
    stats: { attack: 8, speed: 5 },
    price: 40,
    sellPrice: 12,
    stackable: false,
    maxStack: 1,
    tradeable: true,
  },
  {
    code: 'ARM_PLATE_C',
    name: '수련용 갑옷',
    description: 'QA용 판금 기본 방어구',
    type: 'armor',
    subType: 'plate',
    grade: 'common',
    level: 1,
    stats: { defense: 15, hp: 20 },
    price: 60,
    sellPrice: 18,
    stackable: false,
    maxStack: 1,
    tradeable: true,
  },
  {
    code: 'ARM_ROBE_C',
    name: '낡은 로브',
    description: 'QA용 로브 기본 방어구',
    type: 'armor',
    subType: 'robe',
    grade: 'common',
    level: 1,
    stats: { defense: 5, mp: 30 },
    price: 45,
    sellPrice: 13,
    stackable: false,
    maxStack: 1,
    tradeable: true,
  },
  {
    code: 'ARM_LEATHER_C',
    name: '가죽 조끼',
    description: 'QA용 가죽 기본 방어구',
    type: 'armor',
    subType: 'leather',
    grade: 'common',
    level: 1,
    stats: { defense: 8, speed: 3 },
    price: 50,
    sellPrice: 15,
    stackable: false,
    maxStack: 1,
    tradeable: true,
  },
  {
    code: 'CON_HP_S',
    name: 'HP 포션 (소)',
    description: 'QA용 HP 100 회복 포션',
    type: 'consumable',
    subType: 'potion',
    grade: 'common',
    level: 1,
    stats: { hpRestore: 100 },
    price: 20,
    sellPrice: 6,
    stackable: true,
    maxStack: 99,
    tradeable: true,
  },
  {
    code: 'CON_MP_S',
    name: 'MP 포션 (소)',
    description: 'QA용 MP 50 회복 포션',
    type: 'consumable',
    subType: 'potion',
    grade: 'common',
    level: 1,
    stats: { mpRestore: 50 },
    price: 25,
    sellPrice: 7,
    stackable: true,
    maxStack: 99,
    tradeable: true,
  },
];

const zones = [
  {
    code: 'erebos_outskirts',
    name: '유령 도시 외곽',
    description: 'QA live e2e가 챕터 1 API 계약 확인에 사용하는 에레보스 진입 존',
    region: 'erebos',
    levelRange: { min: 25, max: 33 },
    connections: ['silvanhome_crystal', 'erebos_center', 'britallia_port'],
    npcs: [
      { npcId: 'npc_ghost_merchant', name: '유령 상인 고로디', posX: 80, posY: 60, role: 'shop' },
    ],
    ambientSound: 'ghost_wind',
    bgm: 'erebos_theme',
    isHub: true,
  },
];

const monsters = [
  {
    id: 'MON_001',
    code: 'MON_001',
    name: 'QA 슬라임',
    type: 'normal',
    element: 'neutral',
    level: 1,
    hp: 100,
    attack: 10,
    defense: 5,
    speed: 10,
    skills: [],
    dropTable: [],
    expReward: 1,
    goldReward: 1,
    behavior: { aggro_range: 0 },
    // QA 픽스처는 실제 플레이어 존(Zone.code)을 점유하면 안 된다. erebos_outskirts 로 두면
    // combatRoutes where:{location:zoneId} 직매칭에 L1 QA 슬라임이 끼어 '최저 3마리' 인카운터를
    // 오염시킨다(#209 로 erebos_outskirts 는 실 몬스터 보유). null=어느 존에도 미소속 →
    // primary 경로에서 빠지고, QA 단독 DB 에선 #208 levelRange 폴백(location 무시)이 집어 전투는 유지.
    location: null,
  },
  {
    id: 'MON_TEST_001',
    code: 'MON_TEST_001',
    name: 'QA 테스트 슬라임',
    type: 'normal',
    element: 'neutral',
    level: 1,
    hp: 100,
    attack: 10,
    defense: 5,
    speed: 10,
    skills: [],
    dropTable: [],
    expReward: 1,
    goldReward: 1,
    behavior: { aggro_range: 0 },
    // QA 픽스처는 실제 플레이어 존(Zone.code)을 점유하면 안 된다. erebos_outskirts 로 두면
    // combatRoutes where:{location:zoneId} 직매칭에 L1 QA 슬라임이 끼어 '최저 3마리' 인카운터를
    // 오염시킨다(#209 로 erebos_outskirts 는 실 몬스터 보유). null=어느 존에도 미소속 →
    // primary 경로에서 빠지고, QA 단독 DB 에선 #208 levelRange 폴백(location 무시)이 집어 전투는 유지.
    location: null,
  },
];

async function seedItems() {
  let upserted = 0;
  for (const item of items) {
    await prisma.item.upsert({
      where: { code: item.code },
      update: {
        name: item.name,
        description: item.description,
        type: item.type,
        subType: item.subType,
        grade: item.grade,
        level: item.level,
        stats: item.stats,
        price: item.price,
        sellPrice: item.sellPrice,
        stackable: item.stackable,
        maxStack: item.maxStack,
        tradeable: item.tradeable,
        isActive: true,
      },
      create: {
        ...item,
        isActive: true,
      },
    });
    upserted++;
  }
  return upserted;
}

async function seedZones() {
  let upserted = 0;
  for (const zone of zones) {
    await prisma.zone.upsert({
      where: { code: zone.code },
      update: {
        name: zone.name,
        description: zone.description,
        region: zone.region,
        levelRange: zone.levelRange,
        connections: zone.connections,
        npcs: zone.npcs,
        ambientSound: zone.ambientSound,
        bgm: zone.bgm,
        isHub: zone.isHub,
      },
      create: zone,
    });
    upserted++;
  }
  return upserted;
}

async function seedMonsters() {
  let upserted = 0;
  for (const monster of monsters) {
    await prisma.monster.upsert({
      where: { id: monster.id },
      update: {
        code: monster.code,
        name: monster.name,
        type: monster.type,
        element: monster.element,
        level: monster.level,
        hp: monster.hp,
        attack: monster.attack,
        defense: monster.defense,
        speed: monster.speed,
        skills: monster.skills,
        dropTable: monster.dropTable,
        expReward: monster.expReward,
        goldReward: monster.goldReward,
        behavior: monster.behavior,
        location: monster.location,
        isActive: true,
      },
      create: {
        ...monster,
        isActive: true,
      },
    });
    upserted++;
  }
  return upserted;
}

try {
  const [itemCount, zoneCount, monsterCount] = await Promise.all([
    seedItems(),
    seedZones(),
    seedMonsters(),
  ]);

  console.log(`[qa:seed] items=${itemCount} zones=${zoneCount} monsters=${monsterCount}`);
} finally {
  await prisma.$disconnect();
}
