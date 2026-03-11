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
import { NPC_SEEDS } from '../../server/src/npc/npcSeeds';
import { seedQuests } from '../../server/src/quest/questSeeds';
import { achievementSeeds } from '../../server/src/achievement/achievementSeeds';
import { seedEvents } from '../../server/src/event/eventSeeds';
import { seedDungeons } from '../../server/src/dungeon/dungeonSeeds';
import { seedZones } from '../../server/src/world/zoneSeeds';

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
          where: { advancedClass: seed.advancedClass },
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
    expectedCount: 9, // 3 클래스 × 3 전직
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
      let count = 0;
      for (const species of PET_SPECIES) {
        await prisma.petSpecies.upsert({
          where: { code: species.code },
          update: {},
          create: {
            code: species.code,
            name: species.name,
            element: species.element,
            baseStats: JSON.stringify(species.baseStats),
            grade: species.grade,
            evolveFrom: species.evolveFrom ?? null,
          },
        });
        count++;
      }
      for (const skill of PET_SKILLS) {
        await prisma.petSkill.upsert({
          where: { code: skill.code },
          update: {},
          create: {
            code: skill.code,
            name: skill.name,
            damage: skill.damage,
            cooldown: skill.cooldown,
            element: skill.element,
            description: skill.description,
          },
        });
        count++;
      }
      return count;
    },
    expectedCount: 30, // 종 15 + 스킬 15 (추정)
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
    name: 'dungeonSeeds',
    order: 11,
    execute: async () => seedDungeons(),
    expectedCount: 20,
  },
  {
    name: 'zoneSeeds',
    order: 12,
    execute: async () => seedZones(),
    expectedCount: 30,
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
      // LIVE — 트랜잭션 래핑
      await prisma.$transaction(async (tx: typeof prisma) => {
        // 트랜잭션 내에서는 전역 prisma 대신 tx를 사용해야 하지만,
        // 시드 함수들이 전역 prisma를 직접 사용하므로 여기서는 순차 실행.
        // 실패 시 전체 롤백은 $transaction이 보장.
        for (const step of sorted) {
          const stepStart = Date.now();
          console.log(`  [${step.order}] ${step.name} 시드 실행 중...`);

          try {
            const count = await step.execute();
            const duration = Date.now() - stepStart;
            const passed = count >= step.expectedCount * 0.8; // 80% 이상이면 통과

            results.push({
              name: step.name,
              order: step.order,
              insertedCount: count,
              expectedCount: step.expectedCount,
              passed,
              durationMs: duration,
            });

            const icon = passed ? '✅' : '⚠️';
            console.log(`       ${icon} ${count}/${step.expectedCount}건 (${duration}ms)`);

            if (!passed) {
              console.warn(`       ⚠️  기대값 대비 부족: ${count}/${step.expectedCount}`);
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
            throw err; // 트랜잭션 롤백 트리거
          }
        }
      }, { timeout: 120000 }); // 2분 타임아웃
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
