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
  {
    id: 'shadow_eclipse',
    name: '섀도우 이클립스',
    partnerClasses: ['shadow_weaver', 'ether_knight'],
    damageMultiplier: 2.0,
    element: 'dark',
    mpCost: 14,
    fxKey: 'fx_shadow_eclipse',
    description: '그림자 직조사가 에테르 검에 어둠을 두르고 대상을 양쪽에서 봉인.',
  },
  {
    id: 'memory_warp',
    name: '메모리 워프',
    partnerClasses: ['memory_weaver', 'time_knight'],
    damageMultiplier: 2.4,
    element: 'chrono',
    mpCost: 18,
    fxKey: 'fx_memory_warp',
    description: '기억의 실로 시간을 끌어당겨 적의 행동 직전 상태로 데미지 누적.',
  },
  {
    id: 'chrono_sealing',
    name: '크로노 봉인',
    partnerClasses: ['time_knight', 'shadow_weaver'],
    damageMultiplier: 2.1,
    element: 'dark',
    mpCost: 15,
    fxKey: 'fx_chrono_sealing',
    description: '시간 기사가 정지시킨 적을 그림자 직조사가 어둠으로 봉인.',
  },
  {
    id: 'ether_recall',
    name: '에테르 리콜',
    partnerClasses: ['ether_knight', 'memory_weaver'],
    damageMultiplier: 2.3,
    element: 'holy',
    mpCost: 16,
    fxKey: 'fx_ether_recall',
    description: '잊혀진 영광의 기억을 에테르 검에 호출 — 성스러운 검광 일격.',
  },
  {
    id: 'shadow_memory',
    name: '섀도우 메모리',
    partnerClasses: ['shadow_weaver', 'memory_weaver'],
    damageMultiplier: 2.0,
    element: 'dark',
    mpCost: 14,
    fxKey: 'fx_shadow_memory',
    description: '잊혀진 기억의 어두운 면을 그림자로 직조 — 정신 데미지.',
  },
  {
    id: 'guardian_pact',
    name: '가디언 팩트',
    partnerClasses: ['time_guardian', 'ether_knight'],
    damageMultiplier: 2.5,
    element: 'holy',
    mpCost: 22,
    fxKey: 'fx_guardian_pact',
    description: '시간의 수호자와 에테르 기사가 맹약을 맺어 신성 방어 일격 발현.',
  },
  {
    id: 'void_pierce',
    name: '보이드 피어스',
    partnerClasses: ['void_wanderer', 'time_knight'],
    damageMultiplier: 2.4,
    element: 'dark',
    mpCost: 20,
    fxKey: 'fx_void_pierce',
    description: '공허 방랑자가 시간 균열을 만들어 시간 기사가 관통 — 방어 무시.',
  },
  {
    id: 'memory_shatter',
    name: '메모리 셰터',
    partnerClasses: ['memory_breaker', 'shadow_weaver'],
    damageMultiplier: 2.2,
    element: 'dark',
    mpCost: 17,
    fxKey: 'fx_memory_shatter',
    description: '기억 파괴자가 적 기억을 부수고 그림자 직조사가 단편을 무기로.',
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
