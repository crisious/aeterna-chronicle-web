/**
 * 멀티엔딩 매트릭스 테스트 — 전수 조합 검증
 *
 * 조합 축:
 *   fragmentCount    : 0, 1, 2, 3, 4
 *   party_alive 비트  : 0 (전멸), 31 (일부), 63 (전원)
 *   betrayalScore    : 0, 69, 70, 100
 *   sacredArtifacts  : 0, 11, 12
 *
 * 총 조합: 5 × 3 × 4 × 3 = 180
 * 각 조합에서 judgeEnding 결과와 기대 엔딩을 비교한다.
 */

import { describe, it, expect } from 'vitest';
import { judgeEnding } from '../../server/src/ending/endingJudge';
import { makeFlags, bitmaskToAllPartyAlive, expectedEnding } from '../helpers/endingTestHelper';

// ── 축 정의 ──────────────────────────────────────────────────

const FRAGMENT_VALUES = [0, 1, 2, 3, 4] as const;
const PARTY_BITMASKS = [0, 31, 63] as const;
const BETRAYAL_VALUES = [0, 69, 70, 100] as const;
const ARTIFACT_VALUES = [0, 11, 12] as const;

const ENDING_LABEL: Record<string, string> = {
  DIVINE_RETURN: 'D 신들의 귀환',
  BETRAYAL: 'C 망각의 선택',
  TRUE_GUARDIAN: 'A 기억의 수호자',
  LAST_WITNESS: 'B 마지막 증인',
  DEFEAT: '패배',
};

// ── 매트릭스 조합 생성 ───────────────────────────────────────

interface MatrixCase {
  fragmentCount: number;
  partyBitmask: number;
  betrayalScore: number;
  sacredArtifacts: number;
  allPartyAlive: boolean;
  expected: string;
}

function buildMatrix(): MatrixCase[] {
  const cases: MatrixCase[] = [];
  for (const fragmentCount of FRAGMENT_VALUES) {
    for (const partyBitmask of PARTY_BITMASKS) {
      for (const betrayalScore of BETRAYAL_VALUES) {
        for (const sacredArtifacts of ARTIFACT_VALUES) {
          const allPartyAlive = bitmaskToAllPartyAlive(partyBitmask);
          cases.push({
            fragmentCount,
            partyBitmask,
            betrayalScore,
            sacredArtifacts,
            allPartyAlive,
            expected: expectedEnding({
              sacredArtifacts,
              fragmentCount,
              allPartyAlive,
              betrayalScore,
            }),
          });
        }
      }
    }
  }
  return cases;
}

// ── 테스트 실행 ──────────────────────────────────────────────

describe('멀티엔딩 매트릭스 (180 조합)', () => {
  const matrix = buildMatrix();

  // 결과 분포 집계 (테스트 출력에 테이블 표시)
  const distribution: Record<string, number> = {};

  it.each(matrix)(
    'frag=$fragmentCount party=$partyBitmask betray=$betrayalScore artifact=$sacredArtifacts → $expected',
    (tc) => {
      const flags = makeFlags({
        fragmentCount: tc.fragmentCount,
        allPartyAlive: tc.allPartyAlive,
        betrayalScore: tc.betrayalScore,
        sacredArtifacts: tc.sacredArtifacts,
      });

      const result = judgeEnding(flags);
      expect(result.ending).toBe(tc.expected);

      // 분포 집계
      distribution[result.ending] = (distribution[result.ending] || 0) + 1;
    },
  );

  // ── 분포 검증 ────────────────────────────────────────────

  describe('엔딩 분포 검증', () => {
    const matrix = buildMatrix();
    const dist: Record<string, number> = {};
    for (const tc of matrix) {
      dist[tc.expected] = (dist[tc.expected] || 0) + 1;
    }

    it('DIVINE_RETURN 조합 수 = sacredArtifacts=12인 모든 경우 (60)', () => {
      // 1(artifact=12) × 5(frag) × 3(party) × 4(betray) = 60
      expect(dist['DIVINE_RETURN']).toBe(60);
    });

    it('DEFEAT 조합 수 > 0', () => {
      expect(dist['DEFEAT']).toBeGreaterThan(0);
    });

    it('모든 엔딩 유형이 최소 1회 이상 등장', () => {
      for (const ending of ['DIVINE_RETURN', 'BETRAYAL', 'TRUE_GUARDIAN', 'LAST_WITNESS', 'DEFEAT']) {
        expect(dist[ending]).toBeGreaterThan(0);
      }
    });

    it('총 조합 = 180', () => {
      const total = Object.values(dist).reduce((a, b) => a + b, 0);
      expect(total).toBe(180);
    });

    it('매트릭스 분포 테이블 출력', () => {
      // vitest console 출력 — 테스트 리포트에 테이블 표시
      const table = Object.entries(dist)
        .map(([ending, count]) => ({
          엔딩: ENDING_LABEL[ending] || ending,
          코드: ending,
          조합수: count,
          비율: `${((count / 180) * 100).toFixed(1)}%`,
        }));

      console.table(table);
      expect(table.length).toBe(5);
    });
  });

  // ── 우선순위 단위 검증 (매트릭스 내) ──────────────────────

  describe('매트릭스 내 우선순위 교차 검증', () => {
    it('sacredArtifacts=12이면 다른 조건과 무관하게 항상 DIVINE_RETURN', () => {
      const divineReturnCases = matrix.filter((c) => c.sacredArtifacts === 12);
      for (const tc of divineReturnCases) {
        const flags = makeFlags({
          fragmentCount: tc.fragmentCount,
          allPartyAlive: tc.allPartyAlive,
          betrayalScore: tc.betrayalScore,
          sacredArtifacts: 12,
        });
        expect(judgeEnding(flags).ending).toBe('DIVINE_RETURN');
      }
    });

    it('artifact<12 + betrayal>=70이면 항상 BETRAYAL', () => {
      const betrayalCases = matrix.filter(
        (c) => c.sacredArtifacts < 12 && c.betrayalScore >= 70,
      );
      for (const tc of betrayalCases) {
        const flags = makeFlags({
          fragmentCount: tc.fragmentCount,
          allPartyAlive: tc.allPartyAlive,
          betrayalScore: tc.betrayalScore,
          sacredArtifacts: tc.sacredArtifacts,
        });
        expect(judgeEnding(flags).ending).toBe('BETRAYAL');
      }
    });

    it('artifact<12 + betray<70 + frag=4 + partyAlive → TRUE_GUARDIAN', () => {
      const guardianCases = matrix.filter(
        (c) =>
          c.sacredArtifacts < 12 &&
          c.betrayalScore < 70 &&
          c.fragmentCount === 4 &&
          c.allPartyAlive,
      );
      expect(guardianCases.length).toBeGreaterThan(0);
      for (const tc of guardianCases) {
        const flags = makeFlags({
          fragmentCount: tc.fragmentCount,
          allPartyAlive: tc.allPartyAlive,
          betrayalScore: tc.betrayalScore,
          sacredArtifacts: tc.sacredArtifacts,
        });
        expect(judgeEnding(flags).ending).toBe('TRUE_GUARDIAN');
      }
    });
  });
});
