// ─── 2차 전직 시드 데이터 ─────────────────────────────────────
// 3 클래스 × 3 전직 = 9개 전직 경로
// 각 전직별 스킬 4개 + tier 3 궁극기 1개

export interface ClassSkill {
  id: string;
  name: string;
  description: string;
  type: 'active' | 'passive';
  cooldown?: number;   // 초
  mpCost?: number;
}

export interface ClassSeedData {
  baseClass: string;
  advancedClass: string;
  tier: number;
  requiredLevel: number;
  questId: string;
  skills: ClassSkill[];
  statBonus: Record<string, number>;
  ultimateSkill?: ClassSkill;
}

// ════════════════════════════════════════════════════════════════
// 에테르 기사 (Ether Knight) 전직 트리
// ════════════════════════════════════════════════════════════════

const etherKnightTier1: ClassSeedData = {
  baseClass: 'ether_knight',
  advancedClass: 'guardian',        // 수호자
  tier: 1,
  requiredLevel: 30,
  questId: 'quest_ek_t1_guardian',
  skills: [
    { id: 'ek_t1_s1', name: '에테르 방벽', description: '에테르로 된 보호 방벽을 생성하여 아군 피해를 30% 감소', type: 'active', cooldown: 20, mpCost: 40 },
    { id: 'ek_t1_s2', name: '수호의 맹세', description: '주변 아군의 방어력 15% 증가 (12초)', type: 'active', cooldown: 25, mpCost: 35 },
    { id: 'ek_t1_s3', name: '견고한 의지', description: '최대 HP 10% 증가', type: 'passive' },
    { id: 'ek_t1_s4', name: '반격 태세', description: '피격 시 20% 확률로 공격력 50%의 반격 발동', type: 'passive' },
  ],
  statBonus: { hp: 500, defense: 30, attack: 10 },
};

const etherKnightTier2: ClassSeedData = {
  baseClass: 'ether_knight',
  advancedClass: 'destroyer',       // 파멸자
  tier: 2,
  requiredLevel: 50,
  questId: 'quest_ek_t2_destroyer',
  skills: [
    { id: 'ek_t2_s1', name: '에테르 참격', description: '에테르를 응축한 강력한 일격, 공격력 250%', type: 'active', cooldown: 12, mpCost: 50 },
    { id: 'ek_t2_s2', name: '분쇄의 일격', description: '적 방어력 25% 무시, 공격력 180%', type: 'active', cooldown: 15, mpCost: 45 },
    { id: 'ek_t2_s3', name: '전투 광기', description: 'HP가 50% 이하일 때 공격력 20% 증가', type: 'passive' },
    { id: 'ek_t2_s4', name: '에테르 흡수', description: '적 처치 시 HP 5% 회복', type: 'passive' },
  ],
  statBonus: { hp: 300, attack: 50, defense: 20, critRate: 5 },
};

const etherKnightTier3: ClassSeedData = {
  baseClass: 'ether_knight',
  advancedClass: 'ether_berserker', // 에테르 폭주자
  tier: 3,
  requiredLevel: 80,
  questId: 'quest_ek_t3_berserker',
  skills: [
    { id: 'ek_t3_s1', name: '에테르 폭주', description: '15초간 모든 스탯 30% 증가, 이후 5초 기절', type: 'active', cooldown: 60, mpCost: 100 },
    { id: 'ek_t3_s2', name: '차원 절단', description: '에테르 에너지로 공간을 절단, 범위 공격력 300%', type: 'active', cooldown: 18, mpCost: 70 },
    { id: 'ek_t3_s3', name: '불굴의 육체', description: '치명타 피해 30% 감소', type: 'passive' },
    { id: 'ek_t3_s4', name: '에테르 공명', description: '스킬 사용 시 10% 확률로 쿨타임 초기화', type: 'passive' },
  ],
  statBonus: { hp: 800, attack: 80, defense: 40, critRate: 10, critDamage: 15 },
  ultimateSkill: {
    id: 'ek_ult', name: '에테르 카타클리즘', description: '에테르 에너지를 극한까지 폭주시켜 주변 모든 적에게 공격력 500% 피해 + 3초 기절', type: 'active', cooldown: 120, mpCost: 200,
  },
};

// ════════════════════════════════════════════════════════════════
// 기억술사 (Memory Weaver) 전직 트리
// ════════════════════════════════════════════════════════════════

const memoryWeaverTier1: ClassSeedData = {
  baseClass: 'memory_weaver',
  advancedClass: 'memory_weaver_adv', // 기억 직조사
  tier: 1,
  requiredLevel: 30,
  questId: 'quest_mw_t1_weaver',
  skills: [
    { id: 'mw_t1_s1', name: '기억의 실', description: '적의 기억을 엮어 3초간 혼란 상태 유발', type: 'active', cooldown: 18, mpCost: 35 },
    { id: 'mw_t1_s2', name: '추억 치유', description: '아군의 좋은 기억을 되살려 HP 20% 회복', type: 'active', cooldown: 15, mpCost: 40 },
    { id: 'mw_t1_s3', name: '기억 증폭', description: '마법 공격력 12% 증가', type: 'passive' },
    { id: 'mw_t1_s4', name: '정신 집중', description: '최대 MP 15% 증가', type: 'passive' },
  ],
  statBonus: { mp: 300, magicAttack: 25, hp: 200 },
};

const memoryWeaverTier2: ClassSeedData = {
  baseClass: 'memory_weaver',
  advancedClass: 'time_tuner',       // 시간 조율사
  tier: 2,
  requiredLevel: 50,
  questId: 'quest_mw_t2_tuner',
  skills: [
    { id: 'mw_t2_s1', name: '시간 감속', description: '지정 영역의 시간을 늦춰 적 이동/공격 속도 40% 감소 (8초)', type: 'active', cooldown: 22, mpCost: 55 },
    { id: 'mw_t2_s2', name: '시간 역행', description: '아군 1명의 HP를 5초 전 상태로 되돌림', type: 'active', cooldown: 30, mpCost: 60 },
    { id: 'mw_t2_s3', name: '시간의 흐름', description: '스킬 쿨타임 10% 감소', type: 'passive' },
    { id: 'mw_t2_s4', name: '기억 잔상', description: '스킬 사용 시 15% 확률로 잔상이 같은 스킬을 50% 위력으로 재시전', type: 'passive' },
  ],
  statBonus: { mp: 200, magicAttack: 45, hp: 150, cooldownReduction: 5 },
};

const memoryWeaverTier3: ClassSeedData = {
  baseClass: 'memory_weaver',
  advancedClass: 'memory_lord',      // 기억 지배자
  tier: 3,
  requiredLevel: 80,
  questId: 'quest_mw_t3_lord',
  skills: [
    { id: 'mw_t3_s1', name: '기억 침식', description: '적의 기억을 파괴하여 10초간 스킬 사용 불가 + 마법 공격력 200%', type: 'active', cooldown: 25, mpCost: 80 },
    { id: 'mw_t3_s2', name: '시공 정지', description: '3초간 자신 외 모든 존재의 시간을 정지', type: 'active', cooldown: 45, mpCost: 90 },
    { id: 'mw_t3_s3', name: '기억의 요새', description: '상태이상 저항 30% 증가', type: 'passive' },
    { id: 'mw_t3_s4', name: '시간 왜곡장', description: '주변 아군 쿨타임 회복 속도 15% 증가', type: 'passive' },
  ],
  statBonus: { mp: 500, magicAttack: 80, hp: 300, cooldownReduction: 10, statusResist: 20 },
  ultimateSkill: {
    id: 'mw_ult', name: '에테르 기억 봉인', description: '대상의 모든 기억을 봉인하여 15초간 완전 무력화 + 마법 공격력 400% 지속 피해', type: 'active', cooldown: 120, mpCost: 200,
  },
};

// ════════════════════════════════════════════════════════════════
// 그림자 직조사 (Shadow Weaver) 전직 트리
// ════════════════════════════════════════════════════════════════

const shadowWeaverTier1: ClassSeedData = {
  baseClass: 'shadow_weaver',
  advancedClass: 'illusionist',      // 환영사
  tier: 1,
  requiredLevel: 30,
  questId: 'quest_sw_t1_illusionist',
  skills: [
    { id: 'sw_t1_s1', name: '그림자 분신', description: '자신의 분신 2체를 생성 (각 본체 30% 능력치, 10초)', type: 'active', cooldown: 20, mpCost: 40 },
    { id: 'sw_t1_s2', name: '환영 단검', description: '그림자 에너지를 담은 단검 투척, 공격력 160% + 출혈', type: 'active', cooldown: 8, mpCost: 25 },
    { id: 'sw_t1_s3', name: '그림자 은신', description: '피격 시 15% 확률로 2초간 투명화', type: 'passive' },
    { id: 'sw_t1_s4', name: '그림자 걸음', description: '이동 속도 10% 증가', type: 'passive' },
  ],
  statBonus: { attack: 25, evasion: 15, speed: 10, hp: 150 },
};

const shadowWeaverTier2: ClassSeedData = {
  baseClass: 'shadow_weaver',
  advancedClass: 'soul_reaper',      // 영혼 수확자
  tier: 2,
  requiredLevel: 50,
  questId: 'quest_sw_t2_reaper',
  skills: [
    { id: 'sw_t2_s1', name: '영혼 수확', description: '적 처치 시 영혼 조각 획득, 5개 모으면 공격력 50% 버프 (20초)', type: 'active', cooldown: 0, mpCost: 0 },
    { id: 'sw_t2_s2', name: '사신의 낫', description: 'HP 30% 이하 적에게 공격력 350% (즉사 판정 5%)', type: 'active', cooldown: 15, mpCost: 55 },
    { id: 'sw_t2_s3', name: '영혼 흡수', description: '적 처치 시 MP 3% 회복', type: 'passive' },
    { id: 'sw_t2_s4', name: '치명적 그림자', description: '치명타 확률 8% 증가', type: 'passive' },
  ],
  statBonus: { attack: 50, critRate: 10, critDamage: 20, evasion: 10, hp: 200 },
};

const shadowWeaverTier3: ClassSeedData = {
  baseClass: 'shadow_weaver',
  advancedClass: 'void_lord',        // 공허의 군주
  tier: 3,
  requiredLevel: 80,
  questId: 'quest_sw_t3_void',
  skills: [
    { id: 'sw_t3_s1', name: '공허 폭발', description: '공허 에너지를 폭발시켜 범위 내 적에게 공격력 280% + 암흑 (5초)', type: 'active', cooldown: 18, mpCost: 70 },
    { id: 'sw_t3_s2', name: '그림자 지배', description: '적 1체를 8초간 조종 (보스 제외)', type: 'active', cooldown: 40, mpCost: 85 },
    { id: 'sw_t3_s3', name: '공허의 갑옷', description: '회피 성공 시 다음 공격의 치명타 확률 100%', type: 'passive' },
    { id: 'sw_t3_s4', name: '존재 침식', description: '공격 시 5% 확률로 적 방어력 50% 무시', type: 'passive' },
  ],
  statBonus: { attack: 80, critRate: 15, critDamage: 30, evasion: 20, speed: 15, hp: 300 },
  ultimateSkill: {
    id: 'sw_ult', name: '공허의 심연', description: '공허의 차원문을 열어 범위 내 모든 적을 5초간 공허에 가두고 공격력 450% + 모든 버프 제거', type: 'active', cooldown: 120, mpCost: 200,
  },
};

// ─── 전체 시드 데이터 내보내기 ─────────────────────────────────
export const CLASS_ADVANCEMENT_SEEDS: ClassSeedData[] = [
  // 에테르 기사
  etherKnightTier1,
  etherKnightTier2,
  etherKnightTier3,
  // 기억술사
  memoryWeaverTier1,
  memoryWeaverTier2,
  memoryWeaverTier3,
  // 그림자 직조사
  shadowWeaverTier1,
  shadowWeaverTier2,
  shadowWeaverTier3,
];

// ════════════════════════════════════════════════════════════════
// P8-04 기억 파괴자 (Memory Breaker) 전직 트리
// ════════════════════════════════════════════════════════════════

const memoryBreakerTier1: ClassSeedData = {
  baseClass: 'memory_breaker',
  advancedClass: 'seal_cracker',    // 봉인 해체자
  tier: 1,
  requiredLevel: 30,
  questId: 'quest_mb_t1_seal_cracker',
  skills: [
    { id: 'mb_t1_s1', name: '기억 분쇄', description: '대상의 기억을 파쇄하여 공격력 200%의 에테르 피해', type: 'active', cooldown: 10, mpCost: 35 },
    { id: 'mb_t1_s2', name: '봉인 균열', description: '대상의 방어 봉인을 해체하여 방어력 20% 감소 (10초)', type: 'active', cooldown: 18, mpCost: 40 },
    { id: 'mb_t1_s3', name: '망각의 갑옷', description: '기억 파괴 시 임시 보호막 생성 (최대 HP의 5%)', type: 'passive' },
    { id: 'mb_t1_s4', name: '파편 흡수', description: '적 처치 시 봉인 파편 에너지 회복 (MP 3%)', type: 'passive' },
  ],
  statBonus: { hp: 200, attack: 45, defense: 15, critRate: 5 },
};

const memoryBreakerTier2: ClassSeedData = {
  baseClass: 'memory_breaker',
  advancedClass: 'void_breaker',    // 허공 파괴자
  tier: 2,
  requiredLevel: 50,
  questId: 'quest_mb_t2_void_breaker',
  skills: [
    { id: 'mb_t2_s1', name: '허공 절단', description: '기억의 공간을 절단하여 범위 내 적에게 공격력 280%의 피해', type: 'active', cooldown: 14, mpCost: 55 },
    { id: 'mb_t2_s2', name: '기억 폭파', description: '축적된 기억 에너지를 폭발시켜 공격력 320%의 피해 (자가 HP 5% 소모)', type: 'active', cooldown: 20, mpCost: 60 },
    { id: 'mb_t2_s3', name: '파괴자의 직감', description: '크리티컬 발동 시 쿨다운 2초 감소', type: 'passive' },
    { id: 'mb_t2_s4', name: '봉인 공명', description: '봉인 관련 적에게 피해 15% 증가', type: 'passive' },
  ],
  statBonus: { hp: 250, attack: 60, defense: 10, critRate: 8, critDamage: 15 },
};

const memoryBreakerTier3: ClassSeedData = {
  baseClass: 'memory_breaker',
  advancedClass: 'oblivion_lord',   // 망각의 군주
  tier: 3,
  requiredLevel: 70,
  questId: 'quest_mb_t3_oblivion_lord',
  skills: [
    { id: 'mb_t3_s1', name: '망각의 영역', description: '주변 영역의 기억을 파괴하여 적 전체 공격력/방어력 25% 감소 (15초)', type: 'active', cooldown: 30, mpCost: 80 },
    { id: 'mb_t3_s2', name: '레테의 손길', description: '레테의 힘을 빌려 단일 대상의 버프 전체 해제 + 공격력 150%의 피해', type: 'active', cooldown: 25, mpCost: 70 },
    { id: 'mb_t3_s3', name: '봉인 파괴자의 의지', description: '치명적 피해를 받을 때 1회 생존 (HP 1, 쿨다운 180초)', type: 'passive' },
    { id: 'mb_t3_s4', name: '기억 포식', description: '적 처치 시 적의 스킬 효과 하나를 10초간 복사', type: 'passive' },
  ],
  statBonus: { hp: 350, attack: 80, defense: 20, critRate: 10, critDamage: 25 },
  ultimateSkill: {
    id: 'mb_ult', name: '대망각 재현', description: '200년 전 대망각의 힘을 재현 — 범위 내 모든 적에게 공격력 600%의 에테르 피해 + 기억 소실 (5초 행동불능). 사용 시 자가 최대 HP 10% 소모.',
    type: 'active', cooldown: 120, mpCost: 150,
  },
};

// 기존 시드에 기억 파괴자 추가
ALL_CLASS_SEEDS.push(memoryBreakerTier1, memoryBreakerTier2, memoryBreakerTier3);

// ════════════════════════════════════════════════════════════════
// 시간 수호자 (Time Guardian) 전직 트리 — P11-03
// 봉인 12인의 힘을 계승. 챕터 7 시련의 전당에서 해금.
// ════════════════════════════════════════════════════════════════

const timeGuardianTier1: ClassSeedData = {
  baseClass: 'time_guardian',
  advancedClass: 'chrono_warden',     // 시간 감시자
  tier: 1,
  requiredLevel: 30,
  questId: 'quest_tg_t1_chrono_warden',
  skills: [
    { id: 'tg_t1_s1', name: '시간 감속', description: '주변 적의 이동/공격 속도를 25% 감소 (8초)', type: 'active', cooldown: 18, mpCost: 35 },
    { id: 'tg_t1_s2', name: '시간 가속', description: '자신과 아군의 이동/공격 속도 20% 증가 (10초)', type: 'active', cooldown: 20, mpCost: 40 },
    { id: 'tg_t1_s3', name: '시간 인지', description: '회피율 8% 증가', type: 'passive' },
    { id: 'tg_t1_s4', name: '봉인의 잔향', description: '적 처치 시 스킬 쿨다운 2초 감소', type: 'passive' },
  ],
  statBonus: { hp: 350, attack: 25, defense: 25, speed: 15 },
};

const timeGuardianTier2: ClassSeedData = {
  baseClass: 'time_guardian',
  advancedClass: 'temporal_knight',   // 시간 기사
  tier: 2,
  requiredLevel: 50,
  questId: 'quest_tg_t2_temporal_knight',
  skills: [
    { id: 'tg_t2_s1', name: '시간 참격', description: '시간을 응축한 일격, 공격력 220% + 2초 스턴', type: 'active', cooldown: 14, mpCost: 50 },
    { id: 'tg_t2_s2', name: '되감기', description: '자신의 HP/MP를 5초 전 상태로 복원', type: 'active', cooldown: 45, mpCost: 60 },
    { id: 'tg_t2_s3', name: '시간 왜곡장', description: '적의 투사체 속도 50% 감소 (범위)', type: 'active', cooldown: 25, mpCost: 45 },
    { id: 'tg_t2_s4', name: '시간 분열', description: '크리티컬 시 추가 타격 1회 (원본 피해의 30%)', type: 'passive' },
  ],
  statBonus: { hp: 400, attack: 40, defense: 25, speed: 20, critRate: 8 },
};

const timeGuardianTier3: ClassSeedData = {
  baseClass: 'time_guardian',
  advancedClass: 'epoch_sovereign',   // 시대의 지배자
  tier: 3,
  requiredLevel: 70,
  questId: 'quest_tg_t3_epoch_sovereign',
  skills: [
    { id: 'tg_t3_s1', name: '시간 정지', description: '3초간 주변 모든 적 행동 정지 (보스 1초)', type: 'active', cooldown: 60, mpCost: 80 },
    { id: 'tg_t3_s2', name: '시간 분신', description: '3초 전의 자신을 소환, 10초간 동일 행동 반복', type: 'active', cooldown: 50, mpCost: 70 },
    { id: 'tg_t3_s3', name: '영원의 가호', description: '치명상 시 1회 부활 (HP 30%, 전투당 1회)', type: 'passive' },
    { id: 'tg_t3_s4', name: '시간의 군주', description: '모든 시간 계열 스킬 효과 20% 증가', type: 'passive' },
  ],
  statBonus: { hp: 500, attack: 55, defense: 35, speed: 25, critRate: 10, critDamage: 15 },
  ultimateSkill: {
    id: 'tg_ult', name: '대망각의 역류', description: '3,200년의 봉인 에너지를 해방. 범위 내 적에게 공격력 500% + 전 스탯 30% 감소 (5초). 아군 전원 HP 20% 회복',
    type: 'active', cooldown: 120, mpCost: 100,
  },
};

ALL_CLASS_SEEDS.push(timeGuardianTier1, timeGuardianTier2, timeGuardianTier3);

// ─── 베이스 클래스 한글 매핑 ──────────────────────────────────
export const BASE_CLASS_NAMES: Record<string, string> = {
  ether_knight: '에테르 기사',
  memory_weaver: '기억술사',
  shadow_weaver: '그림자 직조사',
  memory_breaker: '기억 파괴자',
  time_guardian: '시간 수호자',
};

// ─── 전직 클래스 한글 매핑 ────────────────────────────────────
export const ADVANCED_CLASS_NAMES: Record<string, string> = {
  guardian: '수호자',
  destroyer: '파멸자',
  ether_berserker: '에테르 폭주자',
  memory_weaver_adv: '기억 직조사',
  time_tuner: '시간 조율사',
  memory_lord: '기억 지배자',
  illusionist: '환영사',
  soul_reaper: '영혼 수확자',
  void_lord: '공허의 군주',
  seal_cracker: '봉인 해체자',
  void_breaker: '허공 파괴자',
  oblivion_lord: '망각의 군주',
  chrono_warden: '시간 감시자',
  temporal_knight: '시간 기사',
  epoch_sovereign: '시대의 지배자',
};
