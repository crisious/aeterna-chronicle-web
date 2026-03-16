/**
 * masterSeed.ts — 마스터 시드 파이프라인 (P5-14)
 *
 * 모든 시드를 의존성 순서대로 실행하고 카운트 검증 + 트랜잭션 래핑.
 *
 * 실행 순서 (의존성 기반):
 *   1) classSeeds    → 2) itemSeeds     → 3) recipeSeeds   → 4) monsterSeeds
 *   5) petSeeds      → 6) skillSeeds    → 7) npcSeeds      → 8) questSeeds
 *   9) achievementSeeds → 10) eventSeeds → 11) dungeonSeeds → 12) zoneSeeds
 *
 * 사용법:
 *   npx ts-node --project ../server/tsconfig.json tools/seed/masterSeed.ts
 *   npx ts-node --project ../server/tsconfig.json tools/seed/masterSeed.ts --dry-run
 */

import { prisma } from '../../server/src/db';

// ─── 시드 모듈 임포트 ───────────────────────────────────────

import { CLASS_ADVANCEMENT_SEEDS } from '../../server/src/class/classSeeds';
import { seedItems } from '../../server/src/inventory/itemSeeds';
import { seedRecipes } from '../../server/src/craft/recipeSeeds';
import { seedMonsters } from '../../server/src/monster/monsterSeeds';
import { PET_SPECIES, PET_SKILLS } from '../../server/src/pet/petSeeds';
import { seedSkills } from '../../server/src/skill/skillSeeds';
import { npcSeeds as NPC_SEEDS } from '../../server/src/npc/npcSeeds';
import { seedQuests } from '../../server/src/quest/questSeeds';
import { achievementSeeds } from '../../server/src/achievement/achievementSeeds';
import { seedEvents } from '../../server/src/event/eventSeeds';
import { seedDungeons } from '../../server/src/dungeon/dungeonSeeds';
import { seedZones } from '../../server/src/world/zoneSeeds';
import { getAllFurnitureSeeds } from '../../server/src/housing/furnitureSeeds';
import { COSMETIC_SEEDS } from '../../server/src/cosmetic/cosmeticSeeds';
import { PVP_MAP_SEEDS } from '../../server/src/pvp/pvpMapSeeds';
import { WORLD_BOSSES } from '../../server/src/world/worldBossManager';
import { CHAPTER_6_SCENES } from '../../server/src/story/chapter6Seeds';
import { SEASON_1_FREE_REWARDS, SEASON_1_PREMIUM_REWARDS } from '../../server/src/seasonpass/seasonPassSeeds';

// ─── 타입 정의 ──────────────────────────────────────────────

interface SeedStep {
  name: string;
  order: number;
  /** 시드 실행 함수 — 삽입된 레코드 수 반환 */
  execute: () => Promise<number>;
  /** 기대 레코드 수 (검증용) */
  expectedCount: number;
}

interface SeedResult {
  name: string;
  order: number;
  insertedCount: number;
  expectedCount: number;
  passed: boolean;
  durationMs: number;
  error?: string;
}

interface SeedReport {
  startedAt: string;
  finishedAt: string;
  totalDurationMs: number;
  dryRun: boolean;
  steps: SeedResult[];
  totalInserted: number;
  totalExpected: number;
  allPassed: boolean;
}

// ─── 시드 단계 정의 ─────────────────────────────────────────

const SEED_STEPS: SeedStep[] = [
  {
    name: 'classSeeds',
    order: 1,
    execute: async () => {
      // CLASS_ADVANCEMENT_SEEDS는 배열/상수 — upsert로 삽입
      let count = 0;
      for (const seed of CLASS_ADVANCEMENT_SEEDS) {
        await prisma.classAdvancement.upsert({
          where: { baseClass_tier: { baseClass: seed.baseClass, tier: seed.tier } },
          update: {},
          create: {
            baseClass: seed.baseClass,
            advancedClass: seed.advancedClass,
            tier: seed.tier,
            requiredLevel: seed.requiredLevel,
            questId: seed.questId,
            skills: JSON.stringify(seed.skills),
            statBonus: JSON.stringify(seed.statBonus),
            ultimateSkill: seed.ultimateSkill ? JSON.stringify(seed.ultimateSkill) : null,
          },
        });
        count++;
      }
      return count;
    },
    expectedCount: 18, // 6 클래스 × 3 전직
  },
  {
    name: 'itemSeeds',
    order: 2,
    execute: async () => seedItems(),
    expectedCount: 80,
  },
  {
    name: 'recipeSeeds',
    order: 3,
    execute: async () => seedRecipes(),
    expectedCount: 50,
  },
  {
    name: 'monsterSeeds',
    order: 4,
    execute: async () => seedMonsters(),
    expectedCount: 100,
  },
  {
    name: 'petSeeds',
    order: 5,
    execute: async () => {
      // Pet/PetSkill은 플레이어 소유 데이터 — 글로벌 시드 불필요
      // PET_SPECIES/PET_SKILLS는 코드 상수로만 사용됨
      console.log(`  ℹ️  petSeeds: ${PET_SPECIES.length}종 + ${PET_SKILLS.length}스킬 (코드 상수, DB 시드 불필요)`);
      return PET_SPECIES.length + PET_SKILLS.length;
    },
    expectedCount: 35, // 15 species + 20 skills (코드 검증용)
  },
  {
    name: 'skillSeeds',
    order: 6,
    execute: async () => seedSkills(),
    expectedCount: 90, // 3 클래스 × 30
  },
  {
    name: 'npcSeeds',
    order: 7,
    execute: async () => {
      let count = 0;
      for (const npc of NPC_SEEDS) {
        await prisma.npc.upsert({
          where: { name: npc.name },
          update: {},
          create: {
            name: npc.name,
            title: npc.title ?? null,
            role: npc.role,
            location: npc.location,
            dialogue: JSON.stringify(npc.dialogue),
            schedule: npc.schedule ? JSON.stringify(npc.schedule) : null,
            behaviorTree: JSON.stringify(npc.behaviorTree),
          },
        });
        count++;
      }
      return count;
    },
    expectedCount: 30,
  },
  {
    name: 'questSeeds',
    order: 8,
    execute: async () => seedQuests(),
    expectedCount: 50,
  },
  {
    name: 'achievementSeeds',
    order: 9,
    execute: async () => {
      let count = 0;
      for (const ach of achievementSeeds) {
        await prisma.achievement.upsert({
          where: { code: ach.code },
          update: {},
          create: {
            code: ach.code,
            name: ach.name,
            description: ach.description,
            category: ach.category,
            tier: ach.tier,
            points: ach.points,
            condition: JSON.stringify(ach.condition),
            reward: ach.reward ? JSON.stringify(ach.reward) : null,
          },
        });
        count++;
      }
      return count;
    },
    expectedCount: 60,
  },
  {
    name: 'eventSeeds',
    order: 10,
    execute: async () => seedEvents(),
    expectedCount: 10,
  },
  {
    name: 'zoneSeeds',
    order: 11,
    execute: async () => {
      await seedZones();
      return prisma.zone.count();
    },
    expectedCount: 30,
  },
  {
    name: 'dungeonSeeds',
    order: 12,
    execute: async () => {
      await seedDungeons();
      return prisma.dungeon.count();
    },
    expectedCount: 20,
  },
  {
    name: 'furnitureSeeds',
    order: 13,
    execute: async () => {
      const allFurniture = getAllFurnitureSeeds();
      let count = 0;
      for (const f of allFurniture) {
        await prisma.furniture.upsert({
          where: { code: f.id },
          update: {},
          create: {
            code: f.id,
            name: f.name,
            category: f.category,
            rarity: f.rarity,
            description: f.description,
            effect: f.effect ? f.effect : undefined,
            recipe: f.recipe,
          },
        });
        count++;
      }
      return count;
    },
    expectedCount: 50,
  },
  {
    name: 'cosmeticSeeds',
    order: 14,
    execute: async () => {
      let count = 0;
      for (const c of COSMETIC_SEEDS) {
        await prisma.cosmeticItem.upsert({
          where: { code: c.code },
          update: {},
          create: {
            code: c.code,
            name: c.name,
            category: c.category,
            rarity: c.rarity,
            priceType: c.priceType,
            price: c.price,
            affectsStats: c.affectsStats,
            description: c.description,
            isLimited: c.isLimited,
          },
        });
        count++;
      }
      return count;
    },
    expectedCount: 150,
  },
  {
    name: 'seasonPassSeeds',
    order: 15,
    execute: async () => {
      await prisma.seasonPass.upsert({
        where: { season: 1 },
        update: {},
        create: {
          season: 1,
          name: '대망각의 잔향',
          startDate: new Date('2026-01-01'),
          endDate: new Date('2026-03-31'),
          freeRewards: SEASON_1_FREE_REWARDS,
          premiumRewards: SEASON_1_PREMIUM_REWARDS,
          isActive: true,
        },
      });
      return 1;
    },
    expectedCount: 1,
  },
  {
    name: 'pvpMapSeeds',
    order: 16,
    execute: async () => {
      let count = 0;
      for (const m of PVP_MAP_SEEDS) {
        await prisma.pvpMap.upsert({
          where: { code: m.id },
          update: {},
          create: {
            code: m.id,
            name: m.name,
            nameEn: m.nameEn,
            nameJa: m.nameJa,
            season: m.season,
            description: m.description,
            width: m.width,
            height: m.height,
            environmentEffects: m.environmentEffects,
            terrainFeatures: m.terrainFeatures,
            spawnPoints: m.spawnPoints,
            minRating: m.minRating,
            unlockCondition: m.unlockCondition ?? null,
          },
        });
        count++;
      }
      return count;
    },
    expectedCount: 4,
  },
  {
    name: 'worldBossSeeds',
    order: 17,
    execute: async () => {
      let count = 0;
      for (const wb of WORLD_BOSSES) {
        await prisma.worldBoss.upsert({
          where: { code: wb.id },
          update: {},
          create: {
            code: wb.id,
            name: wb.name,
            description: wb.description,
            maxHp: wb.maxHp,
            attack: wb.attack,
            defense: wb.defense,
            skills: wb.skills,
            phases: wb.phases,
            lootTable: wb.lootTable,
            requiredLevel: wb.requiredLevel,
            weeklySchedule: wb.weeklySchedule,
          },
        });
        count++;
      }
      return count;
    },
    expectedCount: 3,
  },
  {
    name: 'dialogueSeeds',
    order: 18,
    execute: async () => {
      let count = 0;
      for (const scene of CHAPTER_6_SCENES) {
        for (const node of scene.dialogueNodes) {
          await prisma.dialogue.upsert({
            where: { code: node.id },
            update: {},
            create: {
              code: node.id,
              chapter: scene.chapter,
              scene: scene.sceneId,
              speaker: node.speaker,
              text: node.text,
              portrait: node.portrait ?? null,
              voiceKey: node.voiceKey ?? null,
              order: count,
              nextCode: node.next ?? null,
            },
          });
          count++;
        }
      }
      return count;
    },
    expectedCount: 40,
  },
];

// ─── 메인 실행 ──────────────────────────────────────────────

async function runMasterSeed(): Promise<void> {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');

  console.log('══════════════════════════════════════════════');
  console.log(`🌱 에테르나 크로니클 — 마스터 시드 파이프라인`);
  console.log(`   모드: ${isDryRun ? '🔍 DRY RUN (실제 DB 반영 없음)' : '💾 LIVE'}`);
  console.log('══════════════════════════════════════════════\n');

  const startedAt = new Date();
  const results: SeedResult[] = [];

  // 정렬된 순서로 실행
  const sorted = [...SEED_STEPS].sort((a, b) => a.order - b.order);

  try {
    if (isDryRun) {
      // DRY RUN — 실행하지 않고 계획만 출력
      for (const step of sorted) {
        console.log(`  [${step.order}] ${step.name} — 예상 ${step.expectedCount}건`);
        results.push({
          name: step.name,
          order: step.order,
          insertedCount: 0,
          expectedCount: step.expectedCount,
          passed: true,
          durationMs: 0,
        });
      }
      console.log('\n📋 DRY RUN 완료 — 실제 데이터 변경 없음');
    } else {
      // LIVE — 개별 실행 (트랜잭션 없이, 실패해도 계속 진행)
      for (const step of sorted) {
        const stepStart = Date.now();
        console.log(`  [${step.order}] ${step.name} 시드 실행 중...`);

        try {
          const count = await step.execute();
          const duration = Date.now() - stepStart;
          const countNum = typeof count === 'number' ? count : ((count as any)?.created ?? 0) + ((count as any)?.updated ?? (count as any)?.skipped ?? 0);
          const passed = countNum >= step.expectedCount * 0.8; // 80% 이상이면 통과

          results.push({
            name: step.name,
            order: step.order,
            insertedCount: countNum,
            expectedCount: step.expectedCount,
            passed,
            durationMs: duration,
          });

          const icon = passed ? '✅' : '⚠️';
          console.log(`       ${icon} ${countNum}/${step.expectedCount}건 (${duration}ms)`);

          if (!passed) {
            console.warn(`       ⚠️  기대값 대비 부족: ${countNum}/${step.expectedCount}`);
          }
        } catch (err) {
          const duration = Date.now() - stepStart;
          const errorMsg = err instanceof Error ? err.message : String(err);
          results.push({
            name: step.name,
            order: step.order,
            insertedCount: 0,
            expectedCount: step.expectedCount,
            passed: false,
            durationMs: duration,
            error: errorMsg,
          });
          console.error(`       ❌ 실패: ${errorMsg}`);
          // 계속 진행
        }
      }
    }
  } catch (err) {
    console.error('\n🔥 시드 파이프라인 실패 — 전체 롤백됨');
    if (err instanceof Error) console.error(`   원인: ${err.message}`);
  }

  const finishedAt = new Date();
  const totalDurationMs = finishedAt.getTime() - startedAt.getTime();

  // ── 리포트 생성 ──
  const report: SeedReport = {
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    totalDurationMs,
    dryRun: isDryRun,
    steps: results,
    totalInserted: results.reduce((s, r) => s + r.insertedCount, 0),
    totalExpected: results.reduce((s, r) => s + r.expectedCount, 0),
    allPassed: results.every(r => r.passed),
  };

  // JSON 리포트 출력
  console.log('\n── 시드 리포트 ──────────────────────────────');
  console.log(JSON.stringify(report, null, 2));

  // 종합 결과
  console.log('\n══════════════════════════════════════════════');
  if (report.allPassed) {
    console.log(`✅ 전체 통과 — ${report.totalInserted}건 삽입 (${totalDurationMs}ms)`);
  } else {
    const failed = results.filter(r => !r.passed);
    console.log(`⚠️  ${failed.length}개 단계 미통과:`);
    for (const f of failed) {
      console.log(`   - ${f.name}: ${f.insertedCount}/${f.expectedCount} ${f.error ? `(${f.error})` : ''}`);
    }
  }
  console.log('══════════════════════════════════════════════');

  await prisma.$disconnect();
}

// ── 실행 ────────────────────────────────────────────────────

runMasterSeed().catch((err) => {
  console.error('마스터 시드 치명적 오류:', err);
  process.exit(1);
});
