/**
 * 멀티엔딩 회귀 테스트 — judgeEnding() 판정 로직 검증 (24 tests)
 *
 * 범위: 정확한 경계값 / 임계 미달 / 우선순위 / 플래그 변이 / sanitize
 * 기준: 멀티엔딩_플래그_설계.md §3.1 우선순위 (D → C → A → B → DEFEAT)
 */

import { describe, it, expect } from 'vitest';
import { judgeEnding, sanitizeFlags, type EndingFlags } from '../../server/src/ending/endingJudge';
import {
  makeFlags,
  defaultFlags,
  makeEndingDState,
  makeEndingCState,
  makeEndingAState,
  makeEndingBState,
  makeDefeatState,
  makeAlmostEndingD,
  makeAlmostEndingC,
  makeAlmostEndingA_partyDead,
  makeAlmostEndingA_fragmentShort,
  makeAlmostEndingB,
  makeDAndCConflict,
  makeDAndAConflict,
  makeCAndAConflict,
  makeAllEndingsConflict,
} from '../helpers/endingTestHelper';

// ═══════════════════════════════════════════════════════════════
// §1 — 정확한 조건 충족 시 올바른 엔딩 판정
// ═══════════════════════════════════════════════════════════════

describe('정확한 엔딩 조건 판정', () => {
  it('1. Ending D (신들의 귀환) — sacredArtifacts=12', () => {
    const result = judgeEnding(makeEndingDState());
    expect(result.ending).toBe('DIVINE_RETURN');
  });

  it('2. Ending C (망각의 선택) — betrayalScore=70 (정확한 임계값)', () => {
    const result = judgeEnding(makeEndingCState());
    expect(result.ending).toBe('BETRAYAL');
  });

  it('3. Ending C — betrayalScore=100 (최댓값)', () => {
    const result = judgeEnding(makeEndingCState({ betrayalScore: 100 }));
    expect(result.ending).toBe('BETRAYAL');
  });

  it('4. Ending A (기억의 수호자) — fragmentCount=4, allPartyAlive=true', () => {
    const result = judgeEnding(makeEndingAState());
    expect(result.ending).toBe('TRUE_GUARDIAN');
  });

  it('5. Ending B (마지막 증인의 선택) — fragmentCount=3', () => {
    const result = judgeEnding(makeEndingBState());
    expect(result.ending).toBe('LAST_WITNESS');
  });

  it('6. Ending B — fragmentCount=4, allPartyAlive=false (B로 분기)', () => {
    const result = judgeEnding(makeFlags({ fragmentCount: 4, allPartyAlive: false }));
    expect(result.ending).toBe('LAST_WITNESS');
  });

  it('7. Defeat (패배 엔딩) — fragmentCount=2', () => {
    const result = judgeEnding(makeDefeatState());
    expect(result.ending).toBe('DEFEAT');
  });

  it('8. Defeat — 모든 플래그 초기값', () => {
    const result = judgeEnding(defaultFlags());
    expect(result.ending).toBe('DEFEAT');
  });
});

// ═══════════════════════════════════════════════════════════════
// §2 — 임계값 미달 (경계값 -1) → 해당 엔딩 미발동
// ═══════════════════════════════════════════════════════════════

describe('임계값 미달 (경계값 - 1)', () => {
  it('9. sacredArtifacts=11 → DIVINE_RETURN 미발동', () => {
    const result = judgeEnding(makeAlmostEndingD());
    expect(result.ending).not.toBe('DIVINE_RETURN');
    expect(result.ending).toBe('DEFEAT'); // 다른 조건 미충족
  });

  it('10. betrayalScore=69 → BETRAYAL 미발동', () => {
    const result = judgeEnding(makeAlmostEndingC());
    expect(result.ending).not.toBe('BETRAYAL');
    expect(result.ending).toBe('DEFEAT');
  });

  it('11. fragmentCount=4, allPartyAlive=false → TRUE_GUARDIAN 미발동 (→ LAST_WITNESS)', () => {
    const result = judgeEnding(makeAlmostEndingA_partyDead());
    expect(result.ending).not.toBe('TRUE_GUARDIAN');
    expect(result.ending).toBe('LAST_WITNESS'); // fragment=4 >= 3
  });

  it('12. fragmentCount=3, allPartyAlive=true → TRUE_GUARDIAN 미발동 (→ LAST_WITNESS)', () => {
    const result = judgeEnding(makeAlmostEndingA_fragmentShort());
    expect(result.ending).not.toBe('TRUE_GUARDIAN');
    expect(result.ending).toBe('LAST_WITNESS');
  });

  it('13. fragmentCount=2 → LAST_WITNESS 미발동 (→ DEFEAT)', () => {
    const result = judgeEnding(makeAlmostEndingB());
    expect(result.ending).not.toBe('LAST_WITNESS');
    expect(result.ending).toBe('DEFEAT');
  });
});

// ═══════════════════════════════════════════════════════════════
// §3 — 우선순위 검증 (D > C > A > B > DEFEAT)
// ═══════════════════════════════════════════════════════════════

describe('우선순위 (D → C → A → B → DEFEAT)', () => {
  it('14. D + C 동시 충족 → D 우선', () => {
    const result = judgeEnding(makeDAndCConflict());
    expect(result.ending).toBe('DIVINE_RETURN');
  });

  it('15. D + A 동시 충족 → D 우선', () => {
    const result = judgeEnding(makeDAndAConflict());
    expect(result.ending).toBe('DIVINE_RETURN');
  });

  it('16. C + A 동시 충족 → C 우선', () => {
    const result = judgeEnding(makeCAndAConflict());
    expect(result.ending).toBe('BETRAYAL');
  });

  it('17. D + C + A + B 모두 충족 → D 우선', () => {
    const result = judgeEnding(makeAllEndingsConflict());
    expect(result.ending).toBe('DIVINE_RETURN');
  });

  it('18. C + B 동시 충족 → C 우선', () => {
    const result = judgeEnding(makeFlags({ betrayalScore: 70, fragmentCount: 3 }));
    expect(result.ending).toBe('BETRAYAL');
  });

  it('19. A + B 동시 충족 → A 우선 (fragmentCount=4 >= 3)', () => {
    const result = judgeEnding(makeEndingAState());
    expect(result.ending).toBe('TRUE_GUARDIAN');
  });
});

// ═══════════════════════════════════════════════════════════════
// §4 — 플래그 변이: 점진적 플래그 변경으로 엔딩 전환
// ═══════════════════════════════════════════════════════════════

describe('플래그 변이를 통한 엔딩 전환', () => {
  it('20. DEFEAT → LAST_WITNESS: fragment 0→3', () => {
    const flags = defaultFlags();
    expect(judgeEnding(flags).ending).toBe('DEFEAT');

    flags.fragmentCount = 3;
    expect(judgeEnding(flags).ending).toBe('LAST_WITNESS');
  });

  it('21. LAST_WITNESS → TRUE_GUARDIAN: fragment 3→4 + allPartyAlive', () => {
    const flags = makeFlags({ fragmentCount: 3, allPartyAlive: true });
    expect(judgeEnding(flags).ending).toBe('LAST_WITNESS');

    flags.fragmentCount = 4;
    expect(judgeEnding(flags).ending).toBe('TRUE_GUARDIAN');
  });

  it('22. TRUE_GUARDIAN → BETRAYAL: betrayalScore 0→70 (C가 A보다 우선)', () => {
    const flags = makeEndingAState();
    expect(judgeEnding(flags).ending).toBe('TRUE_GUARDIAN');

    flags.betrayalScore = 70;
    expect(judgeEnding(flags).ending).toBe('BETRAYAL');
  });

  it('23. BETRAYAL → DIVINE_RETURN: sacredArtifacts 0→12 (D가 C보다 우선)', () => {
    const flags = makeFlags({ betrayalScore: 80 });
    expect(judgeEnding(flags).ending).toBe('BETRAYAL');

    flags.sacredArtifacts = 12;
    expect(judgeEnding(flags).ending).toBe('DIVINE_RETURN');
  });
});

// ═══════════════════════════════════════════════════════════════
// §5 — sanitizeFlags 유효성 검사
// ═══════════════════════════════════════════════════════════════

describe('sanitizeFlags 경계값 clamp', () => {
  it('24. 범위 초과 값 → clamp 처리', () => {
    const sanitized = sanitizeFlags({
      sacredArtifacts: 99,
      betrayalScore: -10,
      fragmentCount: 5,
      sealVisitedCount: 100,
      endingAScore: 999,
    });

    expect(sanitized.sacredArtifacts).toBe(12);
    expect(sanitized.betrayalScore).toBe(0);
    expect(sanitized.fragmentCount).toBe(4);
    expect(sanitized.sealVisitedCount).toBe(6);
    expect(sanitized.endingAScore).toBe(100);
    expect(sanitized.allPartyAlive).toBe(false);
    expect(sanitized.letheUnderstood).toBe(false);
  });
});
