/**
 * 엔딩 판정 엔진 — 멀티엔딩_플래그_설계.md (SSOT) 기준 구현
 *
 * 판정 우선순위:
 *   1. sacred_artifacts === 12           → DIVINE_RETURN (신들의 귀환 / 히든)
 *   2. betrayal_score >= 70              → BETRAYAL      (망각의 선택 / 배신)
 *   3. fragment === 4 && all_party_alive → TRUE_GUARDIAN  (기억의 수호자 / 트루)
 *   4. fragment >= 3                     → LAST_WITNESS   (마지막 증인의 선택 / 기본)
 *   5. else                              → DEFEAT         (패배 엔딩)
 */

// ── 엔딩 플래그 인터페이스 ──────────────────────────────────
export interface EndingFlags {
  /** 수집한 신성 유물 수 (0~12). 히든 엔딩 조건. */
  sacredArtifacts: number;
  /** 베르나르도 설득 / 레테 교단 공감 누적치 (0~100) */
  betrayalScore: number;
  /** 수집한 신성 기억 파편 수 (0~4) */
  fragmentCount: number;
  /** 동료 전원 생존 여부 */
  allPartyAlive: boolean;
  /** 엔딩 A 진행도 점수 (0~100) — 추가 판정 시 활용 */
  endingAScore: number;
  /** 방문한 봉인 유적 수 (비트마스크 popcount 기준 0~6) */
  sealVisitedCount: number;
  /** 황제 구원 여부 */
  emperorSaved: boolean;
  /** 레테 이해 완료 여부 */
  letheUnderstood: boolean;
}

// ── 엔딩 타입 정의 ──────────────────────────────────────────
export type EndingType =
  | 'DIVINE_RETURN'
  | 'BETRAYAL'
  | 'TRUE_GUARDIAN'
  | 'LAST_WITNESS'
  | 'DEFEAT';

// ── 엔딩 판정 결과 ──────────────────────────────────────────
export interface EndingJudgment {
  ending: EndingType;
  reason: string;
}

// ── 엔딩 메타데이터 (한국어 이름, 설명) ─────────────────────
export const ENDING_META: Record<EndingType, { nameKo: string; descKo: string }> = {
  DIVINE_RETURN: {
    nameKo: '신들의 귀환',
    descKo: '열두 신의 이름을 모두 복원하고 봉인을 해제했다. 레테를 포함한 열두 신 전부가 자유를 되찾는다.',
  },
  BETRAYAL: {
    nameKo: '망각의 선택',
    descKo: '에리언이 레테의 철학에 공감하고 손을 잡는다. 고통을 가진 기억보다 평화로운 망각을 택했다.',
  },
  TRUE_GUARDIAN: {
    nameKo: '기억의 수호자',
    descKo: '레테의 진심을 이해하고 기억을 지킨 채 세계를 구원했다. 동료 전원이 살아남았다.',
  },
  LAST_WITNESS: {
    nameKo: '마지막 증인의 선택',
    descKo: '에리언이 자신의 모든 기억을 희생해 레테를 봉인했다. 세계는 구원되었지만 에리언은 모든 것을 잊었다.',
  },
  DEFEAT: {
    nameKo: '패배 엔딩',
    descKo: '기억 파편이 부족하여 레테를 저지하지 못했다. 세계는 망각의 파도에 휩쓸렸다.',
  },
};

/**
 * 엔딩 판정 함수 — 멀티엔딩_플래그_설계.md §3.1 우선순위 준수
 *
 * @param flags 플레이어의 현재 플래그 상태
 * @returns 판정 결과 (엔딩 타입 + 사유)
 */
export function judgeEnding(flags: EndingFlags): EndingJudgment {
  // 1. 히든 엔딩: 신들의 귀환 (최우선)
  if (flags.sacredArtifacts === 12) {
    return {
      ending: 'DIVINE_RETURN',
      reason: `sacred_artifacts=${flags.sacredArtifacts} (12개 완수). 열두 신의 이름 복원 완료.`,
    };
  }

  // 2. 배신 엔딩: 망각의 선택
  if (flags.betrayalScore >= 70) {
    return {
      ending: 'BETRAYAL',
      reason: `betrayal_score=${flags.betrayalScore} (>=70). 레테 교단 공감 임계값 초과.`,
    };
  }

  // 3. 트루 엔딩: 기억의 수호자
  if (flags.fragmentCount === 4 && flags.allPartyAlive) {
    return {
      ending: 'TRUE_GUARDIAN',
      reason: `fragment=${flags.fragmentCount}, all_party_alive=true. 전원 생존 + 파편 완수.`,
    };
  }

  // 4. 기본 엔딩: 마지막 증인의 선택
  if (flags.fragmentCount >= 3) {
    return {
      ending: 'LAST_WITNESS',
      reason: `fragment=${flags.fragmentCount} (>=3). 기본 정통 엔딩 조건 충족.`,
    };
  }

  // 5. 패배 엔딩
  return {
    ending: 'DEFEAT',
    reason: `fragment=${flags.fragmentCount} (<3). 기억 파편 부족으로 패배.`,
  };
}

/**
 * 엔딩 플래그 유효성 검사. 범위 밖 값은 clamp 처리.
 */
export function sanitizeFlags(raw: Partial<EndingFlags>): EndingFlags {
  return {
    sacredArtifacts: clamp(raw.sacredArtifacts ?? 0, 0, 12),
    betrayalScore: clamp(raw.betrayalScore ?? 0, 0, 100),
    fragmentCount: clamp(raw.fragmentCount ?? 0, 0, 4),
    allPartyAlive: raw.allPartyAlive ?? false,
    endingAScore: clamp(raw.endingAScore ?? 0, 0, 100),
    sealVisitedCount: clamp(raw.sealVisitedCount ?? 0, 0, 6),
    emperorSaved: raw.emperorSaved ?? false,
    letheUnderstood: raw.letheUnderstood ?? false,
  };
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}
