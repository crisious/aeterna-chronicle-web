// ─── DB 분기 그룹 sync (D-S4) ─────────────────────────────────
//
// SKILL_BRANCH_GROUPS in-memory 정의를 prisma Skill.branchGroup column 으로 sync.
// schema migration (`prisma db push`) 후 실행.
//
// 사용법:
//   npx ts-node server/src/skill/syncBranchGroups.ts
// 또는 server seed 의 last step.

import { prisma } from '../db';
import { SKILL_BRANCH_GROUPS } from './skillBranches';

/**
 * SKILL_BRANCH_GROUPS 의 모든 skill code 에 branchGroup column 채움.
 * 기존 값 덮어씀 (in-memory SSOT 우선).
 */
export async function syncBranchGroupsToDb(): Promise<{
  updated: number;
  notFound: string[];
}> {
  let updated = 0;
  const notFound: string[] = [];

  for (const [groupId, codes] of Object.entries(SKILL_BRANCH_GROUPS)) {
    for (const code of codes) {
      const result = await prisma.skill.updateMany({
        where: { code },
        data: { branchGroup: groupId },
      });
      if (result.count === 0) {
        notFound.push(code);
      } else {
        updated += result.count;
      }
    }
  }

  return { updated, notFound };
}

// CLI 진입점
if (require.main === module) {
  syncBranchGroupsToDb()
    .then(({ updated, notFound }) => {
      console.log(`✅ branchGroup sync — updated ${updated} skills`);
      if (notFound.length > 0) {
        console.warn(`⚠️ skill code 미존재 (DB seed 누락?): ${JSON.stringify(notFound)}`);
      }
    })
    .catch((err) => {
      console.error('❌ sync 실패:', err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
