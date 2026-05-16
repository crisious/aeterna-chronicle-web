// 크로노 트리거 Triple Tech (3인 협공) (CHRONO-S57)
// 세 캐릭터가 동시에 ATB 100 도달 + 호환 3-클래스 조합일 때 발동.
// 최강 시그니처 — 적은 종류, 강력한 데미지, 매우 높은 MP 비용.

export interface TripleTechDef {
  /** 협공 고유 ID (예: 'aetherna_final'). */
  id: string;
  /** 협공 이름 (한글). */
  name: string;
  /** 세 호환 클래스 (순서 무관). */
  partnerClasses: [string, string, string];
  /** 데미지 배율. 크로노 트리거 최강 협공은 3.0~3.8x. */
  damageMultiplier: number;
  /** 속성. */
  element: 'neutral' | 'fire' | 'ice' | 'lightning' | 'wind' | 'earth' | 'holy' | 'dark' | 'chrono';
  /** 협공 시 세 actor 의 MP 소비 (각자). */
  mpCost: number;
  /** 시각 효과 키. */
  fxKey: string;
  /** 설명. */
  description: string;
  /** 광역 여부 (대부분 true). */
  aoe?: boolean;
  /**
   * CHRONO-S78: 특정 시대에서만 발동 가능 (UI 후보 노출 제한).
   * 미설정 시 모든 시대 가능. 예: ['ruined_future'].
   */
  eraFilter?: readonly ('ancient' | 'present' | 'ruined_future')[];
}

const TRIPLE_TECHS: readonly TripleTechDef[] = [
  {
    id: 'aetherna_final',
    name: '에테르나 파이널',
    partnerClasses: ['ether_knight', 'time_knight', 'memory_weaver'],
    damageMultiplier: 3.5,
    element: 'chrono',
    mpCost: 30,
    fxKey: 'fx_aetherna_final',
    description: '에테르나 크로니클의 최종 일격 — 에테르 검광 · 시간 정지 · 기억 직조가 동시에.',
    aoe: true,
    eraFilter: ['present', 'ruined_future'],
  },
  {
    id: 'chrono_break',
    name: '크로노 브레이크',
    partnerClasses: ['time_knight', 'memory_weaver', 'shadow_weaver'],
    damageMultiplier: 3.3,
    element: 'chrono',
    mpCost: 28,
    fxKey: 'fx_chrono_break',
    description: '시간 · 기억 · 그림자가 합쳐 시간선을 부숴 적의 과거를 지운다.',
    aoe: true,
  },
  {
    id: 'void_eternity',
    name: '보이드 이터니티',
    partnerClasses: ['void_wanderer', 'time_guardian', 'memory_breaker'],
    damageMultiplier: 3.8,
    element: 'dark',
    mpCost: 35,
    fxKey: 'fx_void_eternity',
    description: '공허 방랑자 · 시간 수호자 · 기억 파괴자가 영원으로 흘려보낸다.',
    aoe: true,
    eraFilter: ['ruined_future'],
  },
  {
    id: 'ether_dark_riff',
    name: '에테르 다크 리프',
    partnerClasses: ['ether_knight', 'shadow_weaver', 'void_wanderer'],
    damageMultiplier: 3.4,
    element: 'dark',
    mpCost: 30,
    fxKey: 'fx_ether_dark_riff',
    description: '에테르 검광이 그림자와 공허를 가로질러 적의 시간을 찢는다.',
    aoe: true,
  },
  {
    id: 'guardian_oath',
    name: '가디언 오스',
    partnerClasses: ['ether_knight', 'time_guardian', 'memory_breaker'],
    damageMultiplier: 3.2,
    element: 'holy',
    mpCost: 28,
    fxKey: 'fx_guardian_oath',
    description: '에테르 기사 · 시간 수호자 · 기억 파괴자가 맹약을 맺고 신성한 종결을 선언.',
    aoe: true,
    eraFilter: ['ancient', 'present'],
  },
  {
    id: 'time_void_break',
    name: '타임 보이드 브레이크',
    partnerClasses: ['time_knight', 'void_wanderer', 'memory_breaker'],
    damageMultiplier: 3.6,
    element: 'chrono',
    mpCost: 32,
    fxKey: 'fx_time_void_break',
    description: '시간선 · 공허 · 기억 균열이 삼중 폭발 — 적의 과거 · 현재 · 미래 동시 파괴.',
    aoe: true,
  },
  {
    id: 'shadow_chrono',
    name: '섀도우 크로노',
    partnerClasses: ['time_knight', 'shadow_weaver', 'void_wanderer'],
    damageMultiplier: 3.3,
    element: 'dark',
    mpCost: 29,
    fxKey: 'fx_shadow_chrono',
    description: '그림자 · 시간 · 공허가 어둠의 시간선으로 적을 끌어들인다.',
    aoe: true,
  },
  {
    id: 'memory_shatter_pact',
    name: '메모리 셰터 팩트',
    partnerClasses: ['memory_weaver', 'shadow_weaver', 'memory_breaker'],
    damageMultiplier: 3.5,
    element: 'dark',
    mpCost: 31,
    fxKey: 'fx_memory_shatter_pact',
    description: '직조 · 그림자 · 파괴 — 기억을 부수고 흩어 흔적 자체를 지운다.',
    aoe: true,
  },
  {
    id: 'shadow_void_break',
    name: '섀도우 보이드 브레이크',
    partnerClasses: ['shadow_weaver', 'void_wanderer', 'memory_breaker'],
    damageMultiplier: 3.4,
    element: 'dark',
    mpCost: 30,
    fxKey: 'fx_shadow_void_break',
    description: '그림자가 공허로 흘러들고 파괴가 적의 핵심을 베어낸다.',
    aoe: true,
  },
  {
    id: 'guardian_void_strike',
    name: '가디언 보이드 스트라이크',
    partnerClasses: ['ether_knight', 'time_guardian', 'void_wanderer'],
    damageMultiplier: 3.3,
    element: 'holy',
    mpCost: 29,
    fxKey: 'fx_guardian_void_strike',
    description: '에테르 검광이 시간 결계에 공허의 균열을 박는다.',
    aoe: true,
  },
  {
    id: 'time_memory_guardian',
    name: '타임 메모리 가디언',
    partnerClasses: ['time_knight', 'memory_weaver', 'time_guardian'],
    damageMultiplier: 3.4,
    element: 'chrono',
    mpCost: 30,
    fxKey: 'fx_time_memory_guardian',
    description: '시간 기사 · 기억 직조사 · 시간 수호자가 시간 흐름을 셋이서 잡아 정지.',
    aoe: true,
  },
  {
    id: 'ether_shadow_memory',
    name: '에테르 섀도우 메모리',
    partnerClasses: ['ether_knight', 'shadow_weaver', 'memory_weaver'],
    damageMultiplier: 3.2,
    element: 'holy',
    mpCost: 28,
    fxKey: 'fx_ether_shadow_memory',
    description: '에테르 빛과 그림자의 기억이 적의 과거를 비춰 정화.',
    aoe: true,
  },
  {
    id: 'void_guardian_shadow',
    name: '보이드 가디언 섀도우',
    partnerClasses: ['shadow_weaver', 'time_guardian', 'void_wanderer'],
    damageMultiplier: 3.5,
    element: 'dark',
    mpCost: 31,
    fxKey: 'fx_void_guardian_shadow',
    description: '그림자 · 수호자 결계 · 공허가 합쳐 시간선을 봉인 후 부쉰다.',
    aoe: true,
  },
] as const;

const TRIPLE_KEY = (a: string, b: string, c: string): string => {
  const sorted = [a, b, c].sort();
  return `${sorted[0]}::${sorted[1]}::${sorted[2]}`;
};

const TRIPLE_INDEX = new Map<string, TripleTechDef>(
  TRIPLE_TECHS.map((tt) => [
    TRIPLE_KEY(tt.partnerClasses[0], tt.partnerClasses[1], tt.partnerClasses[2]),
    tt,
  ]),
);

/**
 * 세 classId 조합이 협공 가능하면 TripleTechDef, 아니면 null.
 * 순서 무관, 동일 클래스 셋 금지.
 */
export function resolveTripleTech(
  classA: string,
  classB: string,
  classC: string,
): TripleTechDef | null {
  if (!classA || !classB || !classC) return null;
  // 동일 클래스 검사 (3-set 에 중복 있으면 null)
  const set = new Set([classA, classB, classC]);
  if (set.size !== 3) return null;
  return TRIPLE_INDEX.get(TRIPLE_KEY(classA, classB, classC)) ?? null;
}

/** 전체 협공 목록. */
export function listTripleTechs(): readonly TripleTechDef[] {
  return TRIPLE_TECHS;
}

/** 특정 ID 조회. */
export function getTripleTechById(id: string): TripleTechDef | null {
  return TRIPLE_TECHS.find((tt) => tt.id === id) ?? null;
}

/**
 * CHRONO-S77: 특정 클래스가 참여 가능한 모든 3인 협공 (UI 캐릭터 패널/Wiki).
 */
export function listTripleTechsByClass(classId: string): readonly TripleTechDef[] {
  if (!classId) return [];
  return TRIPLE_TECHS.filter((tt) => tt.partnerClasses.includes(classId));
}

/**
 * CHRONO-S77: 속성별 3인 협공 (UI 그룹화).
 */
export function listTripleTechsByElement(
  element: TripleTechDef['element'],
): readonly TripleTechDef[] {
  return TRIPLE_TECHS.filter((tt) => tt.element === element);
}
