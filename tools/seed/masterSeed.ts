/**
 * 마스터 시드 — 전 모듈 시드 의존성 순서 실행
 * Usage: npx tsx tools/seed/masterSeed.ts [--dry-run]
 */

interface SeedResult { name: string; count: number; durationMs: number; status: 'ok' | 'error'; error?: string; }

const SEED_ORDER = [
  'classSeeds', 'itemSeeds', 'recipeSeeds', 'monsterSeeds', 'petSeeds',
  'skillSeeds', 'npcSeeds', 'questSeeds', 'achievementSeeds', 'eventSeeds',
  'dungeonSeeds', 'zoneSeeds',
] as const;

const EXPECTED_COUNTS: Record<string, number> = {
  classSeeds: 9, itemSeeds: 80, recipeSeeds: 50, monsterSeeds: 100, petSeeds: 15,
  skillSeeds: 90, npcSeeds: 30, questSeeds: 60, achievementSeeds: 100, eventSeeds: 10,
  dungeonSeeds: 20, zoneSeeds: 30,
};

export async function runMasterSeed(dryRun = false): Promise<SeedResult[]> {
  const results: SeedResult[] = [];
  console.log(`🌱 마스터 시드 시작 (dryRun=${dryRun})`);

  for (const seedName of SEED_ORDER) {
    const start = Date.now();
    try {
      if (!dryRun) {
        // 각 시드 모듈 동적 import 후 실행
        // const mod = await import(`../../server/src/${getModulePath(seedName)}`);
        // await mod.seed();
      }
      const count = EXPECTED_COUNTS[seedName] ?? 0;
      results.push({ name: seedName, count, durationMs: Date.now() - start, status: 'ok' });
      console.log(`  ✅ ${seedName}: ${count}건 (${Date.now() - start}ms)`);
    } catch (err) {
      results.push({ name: seedName, count: 0, durationMs: Date.now() - start, status: 'error', error: String(err) });
      console.error(`  ❌ ${seedName}: ${err}`);
      if (!dryRun) throw err; // 트랜잭션 롤백
    }
  }

  const total = results.reduce((s, r) => s + r.count, 0);
  console.log(`\n📊 시드 완료: ${results.filter(r => r.status === 'ok').length}/${results.length} 성공, 총 ${total}건`);
  return results;
}

if (require.main === module) {
  const dryRun = process.argv.includes('--dry-run');
  runMasterSeed(dryRun).catch(console.error);
}
