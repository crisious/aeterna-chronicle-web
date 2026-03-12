/**
 * P6-01 시즌 패스 시드 데이터
 * 시즌 1: "대망각의 잔향" — 50단계 보상 테이블
 * - 무료 트랙: 골드/경험치 부스터/일반 아이템 (30단계까지)
 * - 프리미엄: 코스메틱/칭호/펫 스킨/크리스탈 (50단계)
 */

import { SeasonRewardEntry } from './seasonPassEngine';

// ─── 시즌 1 무료 트랙 보상 (30단계) ────────────────────────────

export const SEASON_1_FREE_REWARDS: SeasonRewardEntry[] = [
  { level: 1,  reward: { type: 'gold', amount: 500, name: '골드 500' } },
  { level: 2,  reward: { type: 'gold', amount: 800, name: '골드 800' } },
  { level: 3,  reward: { type: 'item', id: 'hp_potion_s', name: '소형 HP 포션 x10' } },
  { level: 4,  reward: { type: 'gold', amount: 1000, name: '골드 1,000' } },
  { level: 5,  reward: { type: 'exp_booster', amount: 1, name: '경험치 부스터 (1시간)' } },
  { level: 6,  reward: { type: 'gold', amount: 1200, name: '골드 1,200' } },
  { level: 7,  reward: { type: 'item', id: 'mp_potion_s', name: '소형 MP 포션 x10' } },
  { level: 8,  reward: { type: 'gold', amount: 1500, name: '골드 1,500' } },
  { level: 9,  reward: { type: 'item', id: 'revival_stone', name: '부활석 x3' } },
  { level: 10, reward: { type: 'gold', amount: 2000, name: '골드 2,000' } },
  { level: 11, reward: { type: 'exp_booster', amount: 2, name: '경험치 부스터 (2시간)' } },
  { level: 12, reward: { type: 'gold', amount: 2500, name: '골드 2,500' } },
  { level: 13, reward: { type: 'item', id: 'hp_potion_m', name: '중형 HP 포션 x10' } },
  { level: 14, reward: { type: 'gold', amount: 3000, name: '골드 3,000' } },
  { level: 15, reward: { type: 'exp_booster', amount: 3, name: '경험치 부스터 (3시간)' } },
  { level: 16, reward: { type: 'gold', amount: 3500, name: '골드 3,500' } },
  { level: 17, reward: { type: 'item', id: 'mp_potion_m', name: '중형 MP 포션 x10' } },
  { level: 18, reward: { type: 'gold', amount: 4000, name: '골드 4,000' } },
  { level: 19, reward: { type: 'item', id: 'enchant_stone_c', name: '일반 강화석 x5' } },
  { level: 20, reward: { type: 'gold', amount: 5000, name: '골드 5,000' } },
  { level: 21, reward: { type: 'exp_booster', amount: 4, name: '경험치 부스터 (4시간)' } },
  { level: 22, reward: { type: 'gold', amount: 5500, name: '골드 5,500' } },
  { level: 23, reward: { type: 'item', id: 'hp_potion_l', name: '대형 HP 포션 x5' } },
  { level: 24, reward: { type: 'gold', amount: 6000, name: '골드 6,000' } },
  { level: 25, reward: { type: 'exp_booster', amount: 6, name: '경험치 부스터 (6시간)' } },
  { level: 26, reward: { type: 'gold', amount: 7000, name: '골드 7,000' } },
  { level: 27, reward: { type: 'item', id: 'enchant_stone_r', name: '레어 강화석 x3' } },
  { level: 28, reward: { type: 'gold', amount: 8000, name: '골드 8,000' } },
  { level: 29, reward: { type: 'item', id: 'revival_stone', name: '부활석 x10' } },
  { level: 30, reward: { type: 'gold', amount: 10000, name: '골드 10,000' } },
];

// ─── 시즌 1 프리미엄 트랙 보상 (50단계) ────────────────────────

export const SEASON_1_PREMIUM_REWARDS: SeasonRewardEntry[] = [
  { level: 1,  reward: { type: 'crystal', amount: 20, name: '크리스탈 20' } },
  { level: 2,  reward: { type: 'cosmetic', id: 'COS_SKIN_S1_01', name: '잔향의 망토 (공용 스킨)' } },
  { level: 3,  reward: { type: 'crystal', amount: 30, name: '크리스탈 30' } },
  { level: 4,  reward: { type: 'cosmetic', id: 'COS_EMOTE_S1_01', name: '시간의 손짓 (이모트)' } },
  { level: 5,  reward: { type: 'crystal', amount: 40, name: '크리스탈 40' } },
  { level: 6,  reward: { type: 'cosmetic', id: 'COS_WPN_S1_01', name: '잔향의 검 외형' } },
  { level: 7,  reward: { type: 'crystal', amount: 30, name: '크리스탈 30' } },
  { level: 8,  reward: { type: 'cosmetic', id: 'COS_PET_S1_01', name: '시계태엽 여우 (펫 스킨)' } },
  { level: 9,  reward: { type: 'crystal', amount: 40, name: '크리스탈 40' } },
  { level: 10, reward: { type: 'title', id: 'TITLE_S1_ECHO', name: '칭호: 잔향의 추적자' } },
  { level: 11, reward: { type: 'crystal', amount: 30, name: '크리스탈 30' } },
  { level: 12, reward: { type: 'cosmetic', id: 'COS_EMOTE_S1_02', name: '시간의 춤 (이모트)' } },
  { level: 13, reward: { type: 'crystal', amount: 40, name: '크리스탈 40' } },
  { level: 14, reward: { type: 'cosmetic', id: 'COS_WPN_S1_02', name: '잔향의 지팡이 외형' } },
  { level: 15, reward: { type: 'crystal', amount: 50, name: '크리스탈 50' } },
  { level: 16, reward: { type: 'cosmetic', id: 'COS_SKIN_S1_02', name: '기억의 갑주 (에테르 나이트)' } },
  { level: 17, reward: { type: 'crystal', amount: 30, name: '크리스탈 30' } },
  { level: 18, reward: { type: 'cosmetic', id: 'COS_MOUNT_S1_01', name: '시간의 말 (마운트)' } },
  { level: 19, reward: { type: 'crystal', amount: 40, name: '크리스탈 40' } },
  { level: 20, reward: { type: 'title', id: 'TITLE_S1_MEMORY', name: '칭호: 대망각의 기억' } },
  { level: 21, reward: { type: 'crystal', amount: 30, name: '크리스탈 30' } },
  { level: 22, reward: { type: 'cosmetic', id: 'COS_EMOTE_S1_03', name: '시간 정지 포즈 (이모트)' } },
  { level: 23, reward: { type: 'crystal', amount: 40, name: '크리스탈 40' } },
  { level: 24, reward: { type: 'cosmetic', id: 'COS_PET_S1_02', name: '시간의 올빼미 (펫 스킨)' } },
  { level: 25, reward: { type: 'crystal', amount: 60, name: '크리스탈 60' } },
  { level: 26, reward: { type: 'cosmetic', id: 'COS_WPN_S1_03', name: '잔향의 단검 외형' } },
  { level: 27, reward: { type: 'crystal', amount: 40, name: '크리스탈 40' } },
  { level: 28, reward: { type: 'cosmetic', id: 'COS_SKIN_S1_03', name: '시간의 로브 (메모리 위버)' } },
  { level: 29, reward: { type: 'crystal', amount: 50, name: '크리스탈 50' } },
  { level: 30, reward: { type: 'cosmetic', id: 'COS_MOUNT_S1_02', name: '시간의 늑대 (마운트)' } },
  { level: 31, reward: { type: 'crystal', amount: 40, name: '크리스탈 40' } },
  { level: 32, reward: { type: 'cosmetic', id: 'COS_EMOTE_S1_04', name: '잔향의 인사 (이모트)' } },
  { level: 33, reward: { type: 'crystal', amount: 50, name: '크리스탈 50' } },
  { level: 34, reward: { type: 'cosmetic', id: 'COS_PET_S1_03', name: '파편 정령 (펫 스킨)' } },
  { level: 35, reward: { type: 'crystal', amount: 60, name: '크리스탈 60' } },
  { level: 36, reward: { type: 'cosmetic', id: 'COS_WPN_S1_04', name: '망각의 활 외형' } },
  { level: 37, reward: { type: 'crystal', amount: 40, name: '크리스탈 40' } },
  { level: 38, reward: { type: 'cosmetic', id: 'COS_SKIN_S1_04', name: '그림자의 갑옷 (섀도우 위버)' } },
  { level: 39, reward: { type: 'crystal', amount: 50, name: '크리스탈 50' } },
  { level: 40, reward: { type: 'title', id: 'TITLE_S1_FORGOTTEN', name: '칭호: 망각을 이긴 자' } },
  { level: 41, reward: { type: 'crystal', amount: 50, name: '크리스탈 50' } },
  { level: 42, reward: { type: 'cosmetic', id: 'COS_EMOTE_S1_05', name: '시간 역행 (이모트)' } },
  { level: 43, reward: { type: 'crystal', amount: 60, name: '크리스탈 60' } },
  { level: 44, reward: { type: 'cosmetic', id: 'COS_PET_S1_04', name: '크로노 드래곤 (펫 스킨)' } },
  { level: 45, reward: { type: 'crystal', amount: 80, name: '크리스탈 80' } },
  { level: 46, reward: { type: 'cosmetic', id: 'COS_WPN_S1_05', name: '시간의 대검 외형' } },
  { level: 47, reward: { type: 'crystal', amount: 60, name: '크리스탈 60' } },
  { level: 48, reward: { type: 'cosmetic', id: 'COS_MOUNT_S1_03', name: '시간의 불사조 (마운트)' } },
  { level: 49, reward: { type: 'crystal', amount: 100, name: '크리스탈 100' } },
  { level: 50, reward: { type: 'cosmetic', id: 'COS_SKIN_S1_LEGEND', name: '★ 대망각의 잔향 (전설 스킨)' } },
];

// ─── 시즌 1 메타데이터 ──────────────────────────────────────────

export const SEASON_1_META = {
  season: 1,
  name: '대망각의 잔향',
  description: '시간의 균열 속에서 잊혀진 기억의 파편을 추적하라. 50단계의 여정이 당신을 기다린다.',
  duration: 90, // 일
};

// ═══════════════════════════════════════════════════════════════
// P8-01 시즌 2: "깨어나는 봉인" — 50단계 보상 테이블
// ═══════════════════════════════════════════════════════════════

// ─── 시즌 2 무료 트랙 보상 (30단계) ────────────────────────────

export const SEASON_2_FREE_REWARDS: SeasonRewardEntry[] = [
  { level: 1,  reward: { type: 'gold', amount: 800, name: '골드 800' } },
  { level: 2,  reward: { type: 'gold', amount: 1200, name: '골드 1,200' } },
  { level: 3,  reward: { type: 'item', id: 'hp_potion_m', name: '중형 HP 포션 x10' } },
  { level: 4,  reward: { type: 'gold', amount: 1500, name: '골드 1,500' } },
  { level: 5,  reward: { type: 'exp_booster', amount: 2, name: '경험치 부스터 (2시간)' } },
  { level: 6,  reward: { type: 'gold', amount: 1800, name: '골드 1,800' } },
  { level: 7,  reward: { type: 'item', id: 'mp_potion_m', name: '중형 MP 포션 x10' } },
  { level: 8,  reward: { type: 'gold', amount: 2000, name: '골드 2,000' } },
  { level: 9,  reward: { type: 'item', id: 'seal_fragment_s', name: '소형 봉인 파편 x5' } },
  { level: 10, reward: { type: 'gold', amount: 2500, name: '골드 2,500' } },
  { level: 11, reward: { type: 'exp_booster', amount: 3, name: '경험치 부스터 (3시간)' } },
  { level: 12, reward: { type: 'gold', amount: 3000, name: '골드 3,000' } },
  { level: 13, reward: { type: 'item', id: 'hp_potion_l', name: '대형 HP 포션 x5' } },
  { level: 14, reward: { type: 'gold', amount: 3500, name: '골드 3,500' } },
  { level: 15, reward: { type: 'exp_booster', amount: 4, name: '경험치 부스터 (4시간)' } },
  { level: 16, reward: { type: 'gold', amount: 4000, name: '골드 4,000' } },
  { level: 17, reward: { type: 'item', id: 'enchant_stone_r', name: '레어 강화석 x5' } },
  { level: 18, reward: { type: 'gold', amount: 5000, name: '골드 5,000' } },
  { level: 19, reward: { type: 'item', id: 'seal_fragment_m', name: '중형 봉인 파편 x3' } },
  { level: 20, reward: { type: 'gold', amount: 6000, name: '골드 6,000' } },
  { level: 21, reward: { type: 'exp_booster', amount: 5, name: '경험치 부스터 (5시간)' } },
  { level: 22, reward: { type: 'gold', amount: 7000, name: '골드 7,000' } },
  { level: 23, reward: { type: 'item', id: 'mp_potion_l', name: '대형 MP 포션 x5' } },
  { level: 24, reward: { type: 'gold', amount: 8000, name: '골드 8,000' } },
  { level: 25, reward: { type: 'exp_booster', amount: 8, name: '경험치 부스터 (8시간)' } },
  { level: 26, reward: { type: 'gold', amount: 9000, name: '골드 9,000' } },
  { level: 27, reward: { type: 'item', id: 'enchant_stone_e', name: '에픽 강화석 x3' } },
  { level: 28, reward: { type: 'gold', amount: 10000, name: '골드 10,000' } },
  { level: 29, reward: { type: 'item', id: 'seal_fragment_l', name: '대형 봉인 파편 x2' } },
  { level: 30, reward: { type: 'gold', amount: 15000, name: '골드 15,000' } },
];

// ─── 시즌 2 프리미엄 트랙 보상 (50단계) ────────────────────────

export const SEASON_2_PREMIUM_REWARDS: SeasonRewardEntry[] = [
  { level: 1,  reward: { type: 'crystal', amount: 30, name: '크리스탈 30' } },
  { level: 2,  reward: { type: 'cosmetic', id: 'COS_WING_S2_01', name: '봉인의 날개 (소형)' } },
  { level: 3,  reward: { type: 'crystal', amount: 40, name: '크리스탈 40' } },
  { level: 4,  reward: { type: 'cosmetic', id: 'COS_AURA_S2_01', name: '안개의 오라' } },
  { level: 5,  reward: { type: 'crystal', amount: 50, name: '크리스탈 50' } },
  { level: 6,  reward: { type: 'cosmetic', id: 'COS_WPN_S2_01', name: '봉인 파괴검 외형' } },
  { level: 7,  reward: { type: 'crystal', amount: 40, name: '크리스탈 40' } },
  { level: 8,  reward: { type: 'cosmetic', id: 'COS_PET_S2_01', name: '안개 늑대 (펫 스킨)' } },
  { level: 9,  reward: { type: 'crystal', amount: 50, name: '크리스탈 50' } },
  { level: 10, reward: { type: 'title', id: 'TITLE_S2_SEAL', name: '칭호: 봉인 각성자' } },
  { level: 11, reward: { type: 'crystal', amount: 40, name: '크리스탈 40' } },
  { level: 12, reward: { type: 'cosmetic', id: 'COS_EMOTE_S2_01', name: '봉인 해제 (이모트)' } },
  { level: 13, reward: { type: 'crystal', amount: 50, name: '크리스탈 50' } },
  { level: 14, reward: { type: 'cosmetic', id: 'COS_WPN_S2_02', name: '안개의 지팡이 외형' } },
  { level: 15, reward: { type: 'crystal', amount: 60, name: '크리스탈 60' } },
  { level: 16, reward: { type: 'cosmetic', id: 'COS_SKIN_S2_01', name: '안개해 탐험자 (에테르 나이트)' } },
  { level: 17, reward: { type: 'crystal', amount: 40, name: '크리스탈 40' } },
  { level: 18, reward: { type: 'cosmetic', id: 'COS_MOUNT_S2_01', name: '안개 해마 (마운트)' } },
  { level: 19, reward: { type: 'crystal', amount: 50, name: '크리스탈 50' } },
  { level: 20, reward: { type: 'title', id: 'TITLE_S2_MIST', name: '칭호: 안개를 가르는 자' } },
  { level: 21, reward: { type: 'crystal', amount: 40, name: '크리스탈 40' } },
  { level: 22, reward: { type: 'cosmetic', id: 'COS_EMOTE_S2_02', name: '기억 파쇄 (이모트)' } },
  { level: 23, reward: { type: 'crystal', amount: 50, name: '크리스탈 50' } },
  { level: 24, reward: { type: 'cosmetic', id: 'COS_PET_S2_02', name: '안개 드래곤 (펫 스킨)' } },
  { level: 25, reward: { type: 'crystal', amount: 70, name: '크리스탈 70' } },
  { level: 26, reward: { type: 'cosmetic', id: 'COS_WING_S2_02', name: '봉인의 날개 (중형)' } },
  { level: 27, reward: { type: 'crystal', amount: 50, name: '크리스탈 50' } },
  { level: 28, reward: { type: 'cosmetic', id: 'COS_SKIN_S2_02', name: '안개해 학자 (메모리 위버)' } },
  { level: 29, reward: { type: 'crystal', amount: 60, name: '크리스탈 60' } },
  { level: 30, reward: { type: 'cosmetic', id: 'COS_AURA_S2_02', name: '봉인 해방의 오라' } },
  { level: 31, reward: { type: 'crystal', amount: 50, name: '크리스탈 50' } },
  { level: 32, reward: { type: 'cosmetic', id: 'COS_EMOTE_S2_03', name: '안개 소환 (이모트)' } },
  { level: 33, reward: { type: 'crystal', amount: 60, name: '크리스탈 60' } },
  { level: 34, reward: { type: 'cosmetic', id: 'COS_PET_S2_03', name: '봉인 수호자 (펫 스킨)' } },
  { level: 35, reward: { type: 'crystal', amount: 70, name: '크리스탈 70' } },
  { level: 36, reward: { type: 'cosmetic', id: 'COS_WPN_S2_03', name: '안개의 단검 외형' } },
  { level: 37, reward: { type: 'crystal', amount: 50, name: '크리스탈 50' } },
  { level: 38, reward: { type: 'cosmetic', id: 'COS_SKIN_S2_03', name: '안개해 잠행자 (섀도우 위버)' } },
  { level: 39, reward: { type: 'crystal', amount: 60, name: '크리스탈 60' } },
  { level: 40, reward: { type: 'title', id: 'TITLE_S2_BREAKER', name: '칭호: 봉인을 부순 자' } },
  { level: 41, reward: { type: 'crystal', amount: 60, name: '크리스탈 60' } },
  { level: 42, reward: { type: 'cosmetic', id: 'COS_AURA_S2_03', name: '기억 파괴의 오라' } },
  { level: 43, reward: { type: 'crystal', amount: 70, name: '크리스탈 70' } },
  { level: 44, reward: { type: 'cosmetic', id: 'COS_PET_S2_04', name: '안개 불사조 (펫 스킨)' } },
  { level: 45, reward: { type: 'crystal', amount: 100, name: '크리스탈 100' } },
  { level: 46, reward: { type: 'cosmetic', id: 'COS_WPN_S2_04', name: '봉인 대검 외형' } },
  { level: 47, reward: { type: 'crystal', amount: 70, name: '크리스탈 70' } },
  { level: 48, reward: { type: 'cosmetic', id: 'COS_MOUNT_S2_02', name: '안개 비룡 (마운트)' } },
  { level: 49, reward: { type: 'crystal', amount: 120, name: '크리스탈 120' } },
  { level: 50, reward: { type: 'cosmetic', id: 'COS_WING_S2_LEGEND', name: '★ 깨어나는 봉인의 날개 (전설 날개)' } },
];

// ─── 시즌 2 메타데이터 ──────────────────────────────────────────

export const SEASON_2_META = {
  season: 2,
  name: '깨어나는 봉인',
  description: '무한 안개해 너머에서 고대 봉인이 깨어나고 있다. 봉인의 기억을 추적하며 새로운 위협에 맞서라.',
  duration: 90, // 일
};

// ═══════════════════════════════════════════════════════════════
//  시즌 3: "심연의 메아리" — P11-07
//  50단계 무료/프리미엄 보상 + 심연 테마 코스메틱
// ═══════════════════════════════════════════════════════════════

// ─── 시즌 3 무료 트랙 보상 (30단계) ────────────────────────────

export const SEASON_3_FREE_REWARDS: SeasonRewardEntry[] = [
  { level: 1,  reward: { type: 'gold', amount: 800, name: '골드 800' } },
  { level: 2,  reward: { type: 'gold', amount: 1200, name: '골드 1,200' } },
  { level: 3,  reward: { type: 'item', id: 'hp_potion_m', name: '중형 HP 포션 ×10' } },
  { level: 4,  reward: { type: 'gold', amount: 1500, name: '골드 1,500' } },
  { level: 5,  reward: { type: 'exp_booster', amount: 2, name: '경험치 부스터 (2시간)' } },
  { level: 6,  reward: { type: 'gold', amount: 2000, name: '골드 2,000' } },
  { level: 7,  reward: { type: 'item', id: 'mp_potion_m', name: '중형 MP 포션 ×10' } },
  { level: 8,  reward: { type: 'gold', amount: 2500, name: '골드 2,500' } },
  { level: 9,  reward: { type: 'item', id: 'revival_stone', name: '부활석 ×5' } },
  { level: 10, reward: { type: 'gold', amount: 3000, name: '골드 3,000' } },
  { level: 11, reward: { type: 'exp_booster', amount: 3, name: '경험치 부스터 (3시간)' } },
  { level: 12, reward: { type: 'gold', amount: 3500, name: '골드 3,500' } },
  { level: 13, reward: { type: 'item', id: 'hp_potion_l', name: '대형 HP 포션 ×10' } },
  { level: 14, reward: { type: 'gold', amount: 4000, name: '골드 4,000' } },
  { level: 15, reward: { type: 'item', id: 'transcendence_stone_common', name: '일반 초월석 ×3' } },
  { level: 16, reward: { type: 'gold', amount: 5000, name: '골드 5,000' } },
  { level: 17, reward: { type: 'item', id: 'mp_potion_l', name: '대형 MP 포션 ×10' } },
  { level: 18, reward: { type: 'gold', amount: 6000, name: '골드 6,000' } },
  { level: 19, reward: { type: 'item', id: 'enchant_stone_r', name: '레어 강화석 ×5' } },
  { level: 20, reward: { type: 'gold', amount: 7000, name: '골드 7,000' } },
  { level: 21, reward: { type: 'exp_booster', amount: 5, name: '경험치 부스터 (5시간)' } },
  { level: 22, reward: { type: 'gold', amount: 8000, name: '골드 8,000' } },
  { level: 23, reward: { type: 'item', id: 'transcendence_stone_common', name: '일반 초월석 ×5' } },
  { level: 24, reward: { type: 'gold', amount: 9000, name: '골드 9,000' } },
  { level: 25, reward: { type: 'item', id: 'air_bubble_pack', name: '에어 버블 ×20 (심연 전용)' } },
  { level: 26, reward: { type: 'gold', amount: 10000, name: '골드 10,000' } },
  { level: 27, reward: { type: 'item', id: 'enchant_stone_e', name: '에픽 강화석 ×3' } },
  { level: 28, reward: { type: 'gold', amount: 12000, name: '골드 12,000' } },
  { level: 29, reward: { type: 'item', id: 'revival_stone', name: '부활석 ×15' } },
  { level: 30, reward: { type: 'gold', amount: 15000, name: '골드 15,000' } },
];

// ─── 시즌 3 프리미엄 트랙 보상 (50단계) ────────────────────────

export const SEASON_3_PREMIUM_REWARDS: SeasonRewardEntry[] = [
  { level: 1,  reward: { type: 'crystal', amount: 30, name: '크리스탈 30' } },
  { level: 2,  reward: { type: 'cosmetic', id: 'COS_SKIN_S3_01', name: '심연의 잠수복 (공용 스킨)' } },
  { level: 3,  reward: { type: 'crystal', amount: 40, name: '크리스탈 40' } },
  { level: 4,  reward: { type: 'cosmetic', id: 'COS_EMOTE_S3_01', name: '심해 거품 (이모트)' } },
  { level: 5,  reward: { type: 'crystal', amount: 50, name: '크리스탈 50' } },
  { level: 6,  reward: { type: 'cosmetic', id: 'COS_WPN_S3_01', name: '심연의 창 외형' } },
  { level: 7,  reward: { type: 'crystal', amount: 40, name: '크리스탈 40' } },
  { level: 8,  reward: { type: 'cosmetic', id: 'COS_PET_S3_01', name: '심해 해파리 (펫 스킨)' } },
  { level: 9,  reward: { type: 'crystal', amount: 50, name: '크리스탈 50' } },
  { level: 10, reward: { type: 'title', id: 'TITLE_S3_DIVER', name: '칭호: 심연의 잠수부' } },
  { level: 11, reward: { type: 'crystal', amount: 40, name: '크리스탈 40' } },
  { level: 12, reward: { type: 'cosmetic', id: 'COS_EMOTE_S3_02', name: '해저 춤 (이모트)' } },
  { level: 13, reward: { type: 'crystal', amount: 50, name: '크리스탈 50' } },
  { level: 14, reward: { type: 'cosmetic', id: 'COS_SKIN_S3_02', name: '에테르니아 예복 (공용 스킨)' } },
  { level: 15, reward: { type: 'crystal', amount: 60, name: '크리스탈 60' } },
  { level: 16, reward: { type: 'cosmetic', id: 'COS_WPN_S3_02', name: '봉인자의 검 외형' } },
  { level: 17, reward: { type: 'crystal', amount: 50, name: '크리스탈 50' } },
  { level: 18, reward: { type: 'cosmetic', id: 'COS_AURA_S3_01', name: '시간의 파동 (오라)' } },
  { level: 19, reward: { type: 'crystal', amount: 60, name: '크리스탈 60' } },
  { level: 20, reward: { type: 'title', id: 'TITLE_S3_GUARDIAN', name: '칭호: 시간의 계승자' } },
  { level: 21, reward: { type: 'crystal', amount: 50, name: '크리스탈 50' } },
  { level: 22, reward: { type: 'cosmetic', id: 'COS_PET_S3_02', name: '시간 태엽 고양이 (펫 스킨)' } },
  { level: 23, reward: { type: 'crystal', amount: 60, name: '크리스탈 60' } },
  { level: 24, reward: { type: 'cosmetic', id: 'COS_EMOTE_S3_03', name: '시간 정지 포즈 (이모트)' } },
  { level: 25, reward: { type: 'cosmetic', id: 'COS_MOUNT_S3_01', name: '심연 가오리 (마운트)' } },
  { level: 26, reward: { type: 'crystal', amount: 60, name: '크리스탈 60' } },
  { level: 27, reward: { type: 'cosmetic', id: 'COS_WPN_S3_03', name: '시간 수호자의 봉 외형' } },
  { level: 28, reward: { type: 'crystal', amount: 70, name: '크리스탈 70' } },
  { level: 29, reward: { type: 'cosmetic', id: 'COS_SKIN_S3_03', name: '봉인 12인 제복 (공용 스킨)' } },
  { level: 30, reward: { type: 'item', id: 'transcendence_stone_rare', name: '레어 초월석 ×3' } },
  { level: 31, reward: { type: 'crystal', amount: 60, name: '크리스탈 60' } },
  { level: 32, reward: { type: 'cosmetic', id: 'COS_AURA_S3_02', name: '심연의 메아리 (오라)' } },
  { level: 33, reward: { type: 'crystal', amount: 70, name: '크리스탈 70' } },
  { level: 34, reward: { type: 'cosmetic', id: 'COS_PET_S3_03', name: '미니 레테 (펫 스킨)' } },
  { level: 35, reward: { type: 'crystal', amount: 80, name: '크리스탈 80' } },
  { level: 36, reward: { type: 'cosmetic', id: 'COS_WPN_S3_04', name: '레테의 촉수 외형 (양손 무기)' } },
  { level: 37, reward: { type: 'crystal', amount: 70, name: '크리스탈 70' } },
  { level: 38, reward: { type: 'cosmetic', id: 'COS_EMOTE_S3_04', name: '대망각의 몸짓 (이모트)' } },
  { level: 39, reward: { type: 'crystal', amount: 80, name: '크리스탈 80' } },
  { level: 40, reward: { type: 'item', id: 'transcendence_stone_rare', name: '레어 초월석 ×5' } },
  { level: 41, reward: { type: 'crystal', amount: 80, name: '크리스탈 80' } },
  { level: 42, reward: { type: 'cosmetic', id: 'COS_AURA_S3_03', name: '시간 균열 (오라)' } },
  { level: 43, reward: { type: 'crystal', amount: 90, name: '크리스탈 90' } },
  { level: 44, reward: { type: 'cosmetic', id: 'COS_PET_S3_04', name: '봉인 정령 (펫 스킨)' } },
  { level: 45, reward: { type: 'crystal', amount: 100, name: '크리스탈 100' } },
  { level: 46, reward: { type: 'cosmetic', id: 'COS_MOUNT_S3_02', name: '시간의 비룡 (마운트)' } },
  { level: 47, reward: { type: 'crystal', amount: 100, name: '크리스탈 100' } },
  { level: 48, reward: { type: 'cosmetic', id: 'COS_SKIN_S3_04', name: '레테의 그림자 (공용 스킨)' } },
  { level: 49, reward: { type: 'crystal', amount: 150, name: '크리스탈 150' } },
  { level: 50, reward: { type: 'cosmetic', id: 'COS_WING_S3_LEGEND', name: '★ 심연의 날개 (전설 날개)' } },
];

// ─── 시즌 3 메타데이터 ──────────────────────────────────────────

export const SEASON_3_META = {
  season: 3,
  name: '심연의 메아리',
  description: '레테의 마지막 파편이 해저 심연에서 각성했다. 봉인 12인의 유산을 이어받아 기억의 심연을 탐사하라.',
  duration: 90, // 일
  newFeatures: [
    '5번째 클래스: 시간 수호자',
    '신규 지역: 기억의 심연 (해저 5존)',
    '엔드게임: 무한 던전 시간의 탑 (100층)',
    '월드 보스 3종 로테이션',
    '장비 초월 시스템 (+1~+10)',
  ],
};
