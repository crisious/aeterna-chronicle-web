// 크로노 트리거 Dual Tech (2인 협공) (CHRONO-S13)
// 두 캐릭터가 동시에 ATB 100 도달하고 호환 클래스 쌍일 때 발동.
// FF6 콤보와 달리 클래스 의존 — 크로노 트리거의 X-Strike / Antipode / Fire Sword 류.

export interface DualTechDef {
  /** 협공 고유 ID (예: 'chrono_blade'). */
  id: string;
  /** 협공 이름 (한글). */
  name: string;
  /** 두 호환 클래스 (순서 무관). */
  partnerClasses: [string, string];
  /** 데미지 배율 (단일 공격 대비). 크로노 트리거 평균 2.0~2.5x. */
  damageMultiplier: number;
  /** 속성 (없으면 neutral). */
  element: 'neutral' | 'fire' | 'ice' | 'lightning' | 'wind' | 'earth' | 'holy' | 'dark' | 'chrono';
  /** 협공 시 두 actor 의 MP 소비 (각자). */
  mpCost: number;
  /** 시각 효과 키 (클라 EffectManager 가 매핑). */
  fxKey: string;
  /** 설명 (UI 노출). */
  description: string;
}

const DUAL_TECHS: readonly DualTechDef[] = [
  {
    id: 'chrono_blade',
    name: '크로노 블레이드',
    partnerClasses: ['time_knight', 'ether_knight'],
    damageMultiplier: 2.2,
    element: 'chrono',
    mpCost: 12,
    fxKey: 'fx_chrono_blade',
    description: '시간 기사와 에테르 기사가 동시에 베어내는 시공간 균열 일격.',
  },
] as const;

const PAIR_KEY = (a: string, b: string): string => {
  const [x, y] = [a, b].sort();
  return `${x}::${y}`;
};

const PAIR_INDEX = new Map<string, DualTechDef>(
  DUAL_TECHS.map((dt) => [PAIR_KEY(dt.partnerClasses[0], dt.partnerClasses[1]), dt]),
);

/**
 * 두 classId 가 협공 가능하면 DualTechDef, 아니면 null.
 * 순서 무관 (정렬 후 비교).
 */
export function resolveDualTech(classA: string, classB: string): DualTechDef | null {
  if (!classA || !classB || classA === classB) return null;
  return PAIR_INDEX.get(PAIR_KEY(classA, classB)) ?? null;
}

/** 전체 협공 목록 (UI 가이드 등). */
export function listDualTechs(): readonly DualTechDef[] {
  return DUAL_TECHS;
}

/** 특정 ID 로 협공 조회. */
export function getDualTechById(id: string): DualTechDef | null {
  return DUAL_TECHS.find((dt) => dt.id === id) ?? null;
}
