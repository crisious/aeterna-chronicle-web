/**
 * 스테이징 시드 스크립트 — 에테르나 크로니클
 *
 * 실행: npx ts-node --project ../server/tsconfig.json tools/staging/seed.ts
 *       (또는 docker compose exec server npx ts-node ...)
 *
 * 생성 항목:
 *   - 테스트 유저 10명 (admin 1, moderator 2, user 7)
 *   - 각 유저별 캐릭터 (레벨 1~80, 골드/다이아 지급)
 *   - 아이템, 레시피, NPC, 퀘스트, 업적, 이벤트, 펫, 전직 시드
 *   - 길드 3개 (각 3~5명)
 *   - PvP 매치 5건
 *   - 레이드 세션 2건
 */

import { prisma } from '../../server/src/db';
import { seedItems } from '../../server/src/inventory/itemSeeds';
import { seedRecipes } from '../../server/src/craft/recipeSeeds';
import { npcSeeds } from '../../server/src/npc/npcSeeds';
import { seedQuests } from '../../server/src/quest/questSeeds';
import { achievementSeeds } from '../../server/src/achievement/achievementSeeds';
import { seedEvents } from '../../server/src/event/eventSeeds';
import { PET_SPECIES, PET_SKILLS } from '../../server/src/pet/petSeeds';
import { CLASS_ADVANCEMENT_SEEDS } from '../../server/src/class/classSeeds';

// ─── 유틸리티 ────────────────────────────────────────────────

/** min~max 사이 정수 반환 */
function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** 배열에서 랜덤 n개 추출 (비복원) */
function pickRandom<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

const CLASS_IDS = ['warrior', 'mage', 'rogue'];

// ─── 1. 테스트 유저 생성 ─────────────────────────────────────

interface TestUser {
  email: string;
  password: string;
  role: string;
}

const TEST_USERS: TestUser[] = [
  // admin 1명
  { email: 'admin@aeterna-staging.test', password: 'staging_admin_pw', role: 'admin' },
  // moderator 2명
  { email: 'mod01@aeterna-staging.test', password: 'staging_mod_pw', role: 'moderator' },
  { email: 'mod02@aeterna-staging.test', password: 'staging_mod_pw', role: 'moderator' },
  // user 7명
  { email: 'user01@aeterna-staging.test', password: 'staging_user_pw', role: 'user' },
  { email: 'user02@aeterna-staging.test', password: 'staging_user_pw', role: 'user' },
  { email: 'user03@aeterna-staging.test', password: 'staging_user_pw', role: 'user' },
  { email: 'user04@aeterna-staging.test', password: 'staging_user_pw', role: 'user' },
  { email: 'user05@aeterna-staging.test', password: 'staging_user_pw', role: 'user' },
  { email: 'user06@aeterna-staging.test', password: 'staging_user_pw', role: 'user' },
  { email: 'user07@aeterna-staging.test', password: 'staging_user_pw', role: 'user' },
];

async function seedUsers(): Promise<string[]> {
  console.log('📌 유저 10명 생성 중...');
  const userIds: string[] = [];

  for (const u of TEST_USERS) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { role: u.role },
      create: {
        email: u.email,
        password: u.password, // 스테이징 전용 — 프로덕션에서는 bcrypt 필수
        role: u.role,
        gold: randInt(1000, 100000),
        diamond: randInt(100, 10000),
      },
    });
    userIds.push(user.id);
  }

  console.log(`  ✅ 유저 ${userIds.length}명 완료`);
  return userIds;
}

// ─── 2. 캐릭터 생성 (유저당 1개) ─────────────────────────────

async function seedCharacters(userIds: string[]): Promise<string[]> {
  console.log('📌 캐릭터 생성 중...');
  const charIds: string[] = [];

  for (let i = 0; i < userIds.length; i++) {
    const level = randInt(1, 80);
    const classId = CLASS_IDS[i % CLASS_IDS.length];
    const name = `staging_hero_${String(i + 1).padStart(2, '0')}`;

    const char = await prisma.character.upsert({
      where: { name },
      update: { level },
      create: {
        userId: userIds[i],
        name,
        classId,
        level,
        exp: level * randInt(50, 200),
        hp: 200 + level * 10,
        mp: 100 + level * 5,
      },
    });
    charIds.push(char.id);
  }

  console.log(`  ✅ 캐릭터 ${charIds.length}개 완료`);
  return charIds;
}

// ─── 3. NPC 시드 (배열 기반 — upsert) ────────────────────────

async function seedNpcs(): Promise<void> {
  console.log('📌 NPC 시드 실행 중...');
  let count = 0;

  for (const npc of npcSeeds) {
    await prisma.npc.upsert({
      where: { id: npc.id },
      update: {},
      create: {
        id: npc.id,
        name: npc.name,
        type: npc.type,
        location: npc.location,
        dialogue: npc.dialogue as any,
        schedule: npc.schedule as any,
        personality: npc.personality as any,
        affinity: npc.affinity as any,
      },
    });
    count++;
  }

  console.log(`  ✅ NPC ${count}개 완료`);
}

// ─── 4. 업적 시드 (배열 기반 — upsert) ───────────────────────

async function seedAchievements(): Promise<void> {
  console.log('📌 업적 시드 실행 중...');
  let count = 0;

  for (const a of achievementSeeds) {
    await prisma.achievement.upsert({
      where: { id: a.id },
      update: {},
      create: {
        id: a.id,
        name: a.name,
        description: a.description,
        category: a.category,
        conditionType: a.conditionType,
        conditionTarget: a.conditionTarget,
        conditionValue: a.conditionValue,
        rewardType: a.rewardType,
        rewardValue: a.rewardValue,
        icon: a.icon,
        tier: a.tier,
        isHidden: a.isHidden ?? false,
      },
    });
    count++;
  }

  console.log(`  ✅ 업적 ${count}개 완료`);
}

// ─── 5. 펫 시드 (배열 기반) ──────────────────────────────────

async function seedPets(): Promise<void> {
  console.log('📌 펫 시드 실행 중...');

  // 펫 스킬
  for (const skill of PET_SKILLS) {
    await prisma.petSkill.upsert({
      where: { id: skill.id },
      update: {},
      create: {
        id: skill.id,
        name: skill.name,
        description: skill.description,
        type: skill.type,
        power: skill.power,
        cooldown: skill.cooldown,
        target: skill.target,
      },
    });
  }

  // 펫 종
  for (const pet of PET_SPECIES) {
    await prisma.pet.upsert({
      where: { id: pet.id },
      update: {},
      create: {
        id: pet.id,
        name: pet.name,
        element: pet.element,
        rarity: pet.rarity,
        baseHp: pet.baseHp,
        baseAtk: pet.baseAtk,
        baseDef: pet.baseDef,
        skillIds: pet.skillIds,
        evolutionChain: pet.evolutionChain as any,
        description: pet.description,
      },
    });
  }

  console.log(`  ✅ 펫 ${PET_SPECIES.length}종 + 스킬 ${PET_SKILLS.length}개 완료`);
}

// ─── 6. 전직 시드 (배열 기반) ────────────────────────────────

async function seedClasses(): Promise<void> {
  console.log('📌 전직 시드 실행 중...');

  for (const cls of CLASS_ADVANCEMENT_SEEDS) {
    await prisma.classAdvancement.upsert({
      where: { id: cls.id },
      update: {},
      create: {
        id: cls.id,
        baseClass: cls.baseClass,
        advancedClass: cls.advancedClass,
        tier: cls.tier,
        requiredLevel: cls.requiredLevel,
        requiredQuests: cls.requiredQuests as any,
        skills: cls.skills as any,
        statBonus: cls.statBonus as any,
        description: cls.description,
      },
    });
  }

  console.log(`  ✅ 전직 ${CLASS_ADVANCEMENT_SEEDS.length}개 완료`);
}

// ─── 7. 길드 3개 생성 (각 3~5명) ─────────────────────────────

async function seedGuilds(userIds: string[]): Promise<void> {
  console.log('📌 길드 3개 생성 중...');

  const guildDefs = [
    { name: '에테르나 기사단', tag: 'ETK', memberCount: 5 },
    { name: '크로노스 연맹', tag: 'CRN', memberCount: 4 },
    { name: '다크문 길드', tag: 'DMG', memberCount: 3 },
  ];

  let memberOffset = 0;
  for (const def of guildDefs) {
    const leaderId = userIds[memberOffset];

    const guild = await prisma.guild.upsert({
      where: { name: def.name },
      update: {},
      create: {
        name: def.name,
        tag: def.tag,
        leaderId,
        level: randInt(1, 10),
        exp: randInt(0, 5000),
        notice: `${def.name} — 스테이징 테스트 길드`,
      },
    });

    // 길드원 등록
    for (let j = 0; j < def.memberCount; j++) {
      const userId = userIds[memberOffset + j];
      const role = j === 0 ? 'leader' : j === 1 ? 'officer' : 'member';

      await prisma.guildMember.upsert({
        where: { guildId_userId: { guildId: guild.id, userId } },
        update: {},
        create: {
          guildId: guild.id,
          userId,
          role,
        },
      });
    }

    memberOffset += def.memberCount > 2 ? 3 : 2; // 유저 겹침 허용 (10명 내)
    if (memberOffset >= userIds.length) memberOffset = 0;
  }

  console.log('  ✅ 길드 3개 + 길드원 완료');
}

// ─── 8. PvP 매치 5건 ─────────────────────────────────────────

async function seedPvpMatches(userIds: string[]): Promise<void> {
  console.log('📌 PvP 매치 5건 생성 중...');

  for (let i = 0; i < 5; i++) {
    const p1 = userIds[i % userIds.length];
    const p2 = userIds[(i + 1) % userIds.length];
    const winner = Math.random() > 0.5 ? p1 : p2;

    await prisma.pvpMatch.create({
      data: {
        player1Id: p1,
        player2Id: p2,
        winnerId: winner,
        player1Score: randInt(800, 2000),
        player2Score: randInt(800, 2000),
        arenaType: i < 3 ? 'ranked' : 'casual',
        season: 1,
        duration: randInt(60, 300),
        status: 'finished',
        startedAt: new Date(Date.now() - randInt(3600000, 86400000)),
        endedAt: new Date(),
      },
    });
  }

  console.log('  ✅ PvP 매치 5건 완료');
}

// ─── 9. 레이드 세션 2건 ──────────────────────────────────────

async function seedRaidSessions(userIds: string[]): Promise<void> {
  console.log('📌 레이드 세션 2건 생성 중...');

  // 레이드 보스 2개 먼저 생성
  const bosses = [
    {
      name: '고대 드래곤 이그나투스',
      tier: 'heroic',
      maxHp: 500000,
      attack: 1200,
      defense: 800,
      lootTable: [
        { itemId: 'item_weapon_legendary_01', dropRate: 0.05, tier: 'legendary' },
        { itemId: 'item_armor_epic_01', dropRate: 0.15, tier: 'epic' },
      ],
      minPlayers: 4,
      maxPlayers: 10,
      timeLimit: 600,
    },
    {
      name: '심연의 크라켄',
      tier: 'mythic',
      maxHp: 1000000,
      attack: 2000,
      defense: 1500,
      lootTable: [
        { itemId: 'item_weapon_mythic_01', dropRate: 0.02, tier: 'mythic' },
        { itemId: 'item_accessory_legendary_01', dropRate: 0.1, tier: 'legendary' },
      ],
      minPlayers: 8,
      maxPlayers: 10,
      timeLimit: 900,
    },
  ];

  for (let i = 0; i < bosses.length; i++) {
    const b = bosses[i];
    const boss = await prisma.raidBoss.create({ data: b });

    const participants = pickRandom(userIds, randInt(4, 8)).map((uid) => ({
      userId: uid,
      damage: randInt(10000, 100000),
      role: ['tank', 'dps', 'healer'][randInt(0, 2)],
    }));

    await prisma.raidSession.create({
      data: {
        bossId: boss.id,
        status: i === 0 ? 'cleared' : 'failed',
        currentHp: i === 0 ? 0 : randInt(100000, 500000),
        participants: participants as any,
        startedAt: new Date(Date.now() - randInt(7200000, 172800000)),
        endedAt: new Date(),
        lootResult: i === 0
          ? participants.slice(0, 3).map((p) => ({ userId: p.userId, itemId: 'item_armor_epic_01' }))
          : null,
      },
    });
  }

  console.log('  ✅ 레이드 세션 2건 완료');
}

// ─── 메인 실행 ───────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('══════════════════════════════════════════');
  console.log('  에테르나 크로니클 — 스테이징 시드 시작');
  console.log('══════════════════════════════════════════\n');

  const startTime = Date.now();

  // 유저 + 캐릭터
  const userIds = await seedUsers();
  await seedCharacters(userIds);

  // 기존 시드 함수 재사용
  console.log('📌 아이템 시드 실행 중...');
  const itemResult = await seedItems();
  console.log(`  ✅ 아이템: 생성 ${itemResult.created}, 갱신 ${itemResult.updated}`);

  console.log('📌 레시피 시드 실행 중...');
  const recipeResult = await seedRecipes();
  console.log(`  ✅ 레시피: 생성 ${recipeResult.created}, 스킵 ${recipeResult.skipped}`);

  await seedNpcs();

  console.log('📌 퀘스트 시드 실행 중...');
  const questCount = await seedQuests();
  console.log(`  ✅ 퀘스트 ${questCount}개 완료`);

  await seedAchievements();

  console.log('📌 이벤트 시드 실행 중...');
  const eventResult = await seedEvents();
  console.log(`  ✅ 이벤트: 생성 ${eventResult.created}, 스킵 ${eventResult.skipped}`);

  await seedPets();
  await seedClasses();

  // 관계 데이터
  await seedGuilds(userIds);
  await seedPvpMatches(userIds);
  await seedRaidSessions(userIds);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n══════════════════════════════════════════`);
  console.log(`  ✅ 스테이징 시드 완료 (${elapsed}s)`);
  console.log('══════════════════════════════════════════');
}

main()
  .catch((err) => {
    console.error('❌ 시드 실패:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
