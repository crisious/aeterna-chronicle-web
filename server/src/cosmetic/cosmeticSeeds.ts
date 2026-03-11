/**
 * P6-03 코스메틱 시드 데이터 — 50개 코스메틱
 * - 캐릭터 스킨 15 (클래스당 5: 에테르 나이트/메모리 위버/섀도우 위버)
 * - 무기 외형 10
 * - 펫 스킨 8
 * - 마운트 5
 * - 이모트 7
 * - 칭호 효과 5
 *
 * 모든 아이템: affectsStats = false (P2W 가드 준수)
 */

export interface CosmeticSeedItem {
  code: string;
  name: string;
  category: string;
  rarity: 'rare' | 'epic' | 'legendary';
  priceType: 'crystal' | 'gold' | 'season_reward';
  price: number;
  affectsStats: false;  // 반드시 false
  description: string;
  isLimited: boolean;
}

export const COSMETIC_SEEDS: CosmeticSeedItem[] = [
  // ═══════════════════════════════════════════════════════════════
  //  캐릭터 스킨 (15): 클래스당 5
  // ═══════════════════════════════════════════════════════════════

  // ── 에테르 나이트 (5) ─────────────────────────────────────────
  { code: 'SKIN_EK_01', name: '시간의 수호자', category: 'skin', rarity: 'rare', priceType: 'crystal', price: 300, affectsStats: false, description: '에테르 나이트의 시간의 갑옷. 은빛 시계 문양이 새겨져 있다.', isLimited: false },
  { code: 'SKIN_EK_02', name: '크로노 기사', category: 'skin', rarity: 'epic', priceType: 'crystal', price: 600, affectsStats: false, description: '크로노스의 축복을 받은 황금 갑주.', isLimited: false },
  { code: 'SKIN_EK_03', name: '망각의 전사', category: 'skin', rarity: 'epic', priceType: 'crystal', price: 800, affectsStats: false, description: '대망각의 어둠을 견뎌낸 전사의 증표.', isLimited: false },
  { code: 'SKIN_EK_04', name: '에테르 파수꾼', category: 'skin', rarity: 'legendary', priceType: 'crystal', price: 1500, affectsStats: false, description: '에테르 차원의 균열을 막아선 전설의 파수꾼 갑옷.', isLimited: true },
  { code: 'SKIN_EK_05', name: '시간역행 기사', category: 'skin', rarity: 'legendary', priceType: 'season_reward', price: 0, affectsStats: false, description: '시즌 1 최종 보상. 시간을 거스르는 자의 갑주.', isLimited: true },

  // ── 메모리 위버 (5) ───────────────────────────────────────────
  { code: 'SKIN_MW_01', name: '기억의 직조사', category: 'skin', rarity: 'rare', priceType: 'crystal', price: 300, affectsStats: false, description: '기억의 실로 짠 은빛 로브.', isLimited: false },
  { code: 'SKIN_MW_02', name: '시간의 학자', category: 'skin', rarity: 'epic', priceType: 'crystal', price: 600, affectsStats: false, description: '크로노 아카데미의 학자복.', isLimited: false },
  { code: 'SKIN_MW_03', name: '망각의 현자', category: 'skin', rarity: 'epic', priceType: 'gold', price: 50000, affectsStats: false, description: '대망각 이전 시대의 현자 의상.', isLimited: false },
  { code: 'SKIN_MW_04', name: '에테르 직조자', category: 'skin', rarity: 'legendary', priceType: 'crystal', price: 1500, affectsStats: false, description: '에테르 차원의 직물로 만든 전설 로브.', isLimited: true },
  { code: 'SKIN_MW_05', name: '시간의 예언자', category: 'skin', rarity: 'legendary', priceType: 'season_reward', price: 0, affectsStats: false, description: '시간의 흐름을 읽는 예언자의 의상.', isLimited: true },

  // ── 섀도우 위버 (5) ───────────────────────────────────────────
  { code: 'SKIN_SW_01', name: '그림자 추적자', category: 'skin', rarity: 'rare', priceType: 'crystal', price: 300, affectsStats: false, description: '어둠에 녹아드는 추적자의 복장.', isLimited: false },
  { code: 'SKIN_SW_02', name: '밤의 암살자', category: 'skin', rarity: 'epic', priceType: 'crystal', price: 600, affectsStats: false, description: '달빛 아래 빛나는 암살자의 의상.', isLimited: false },
  { code: 'SKIN_SW_03', name: '망각의 첩자', category: 'skin', rarity: 'epic', priceType: 'gold', price: 50000, affectsStats: false, description: '대망각 시대의 비밀 요원 복장.', isLimited: false },
  { code: 'SKIN_SW_04', name: '에테르 잠입자', category: 'skin', rarity: 'legendary', priceType: 'crystal', price: 1500, affectsStats: false, description: '차원의 틈새를 오가는 전설의 잠입 복장.', isLimited: true },
  { code: 'SKIN_SW_05', name: '시간의 그림자', category: 'skin', rarity: 'legendary', priceType: 'season_reward', price: 0, affectsStats: false, description: '시간 속에 숨은 그림자의 의상.', isLimited: true },

  // ═══════════════════════════════════════════════════════════════
  //  무기 외형 (10)
  // ═══════════════════════════════════════════════════════════════
  { code: 'WPN_01', name: '크로노 블레이드', category: 'weapon_skin', rarity: 'rare', priceType: 'crystal', price: 200, affectsStats: false, description: '시간의 기운이 깃든 검.', isLimited: false },
  { code: 'WPN_02', name: '시간의 지팡이', category: 'weapon_skin', rarity: 'rare', priceType: 'crystal', price: 200, affectsStats: false, description: '기억의 결정이 박힌 지팡이.', isLimited: false },
  { code: 'WPN_03', name: '그림자 단검', category: 'weapon_skin', rarity: 'rare', priceType: 'gold', price: 30000, affectsStats: false, description: '어둠을 베는 단검.', isLimited: false },
  { code: 'WPN_04', name: '에테르 대검', category: 'weapon_skin', rarity: 'epic', priceType: 'crystal', price: 500, affectsStats: false, description: '에테르 에너지로 빛나는 대검.', isLimited: false },
  { code: 'WPN_05', name: '망각의 활', category: 'weapon_skin', rarity: 'epic', priceType: 'crystal', price: 500, affectsStats: false, description: '기억을 화살에 담아 쏘는 활.', isLimited: false },
  { code: 'WPN_06', name: '시간역행 도끼', category: 'weapon_skin', rarity: 'epic', priceType: 'crystal', price: 700, affectsStats: false, description: '시간의 흐름을 역행시키는 도끼.', isLimited: false },
  { code: 'WPN_07', name: '크로노 해머', category: 'weapon_skin', rarity: 'epic', priceType: 'gold', price: 60000, affectsStats: false, description: '시간을 부수는 망치.', isLimited: false },
  { code: 'WPN_08', name: '에테르 낫', category: 'weapon_skin', rarity: 'legendary', priceType: 'crystal', price: 1200, affectsStats: false, description: '에테르 차원의 경계를 베는 전설의 낫.', isLimited: true },
  { code: 'WPN_09', name: '대망각의 창', category: 'weapon_skin', rarity: 'legendary', priceType: 'crystal', price: 1200, affectsStats: false, description: '대망각의 기억을 꿰뚫는 전설의 창.', isLimited: true },
  { code: 'WPN_10', name: '시간의 쌍검', category: 'weapon_skin', rarity: 'legendary', priceType: 'season_reward', price: 0, affectsStats: false, description: '시즌 보상. 과거와 미래를 가르는 쌍검.', isLimited: true },

  // ═══════════════════════════════════════════════════════════════
  //  펫 스킨 (8)
  // ═══════════════════════════════════════════════════════════════
  { code: 'PET_01', name: '시계태엽 여우', category: 'pet_skin', rarity: 'rare', priceType: 'crystal', price: 250, affectsStats: false, description: '태엽으로 움직이는 여우 스킨.', isLimited: false },
  { code: 'PET_02', name: '기억의 올빼미', category: 'pet_skin', rarity: 'rare', priceType: 'crystal', price: 250, affectsStats: false, description: '잊혀진 기억을 모으는 올빼미.', isLimited: false },
  { code: 'PET_03', name: '그림자 고양이', category: 'pet_skin', rarity: 'rare', priceType: 'gold', price: 25000, affectsStats: false, description: '어둠 속에서 빛나는 고양이.', isLimited: false },
  { code: 'PET_04', name: '에테르 정령', category: 'pet_skin', rarity: 'epic', priceType: 'crystal', price: 500, affectsStats: false, description: '에테르 에너지로 이루어진 정령.', isLimited: false },
  { code: 'PET_05', name: '크로노 드래곤', category: 'pet_skin', rarity: 'epic', priceType: 'crystal', price: 700, affectsStats: false, description: '시간을 조종하는 아기 드래곤.', isLimited: false },
  { code: 'PET_06', name: '파편 정령', category: 'pet_skin', rarity: 'epic', priceType: 'crystal', price: 600, affectsStats: false, description: '기억의 파편으로 이루어진 정령.', isLimited: false },
  { code: 'PET_07', name: '시간의 불사조', category: 'pet_skin', rarity: 'legendary', priceType: 'crystal', price: 1000, affectsStats: false, description: '영원히 부활하는 시간의 불사조.', isLimited: true },
  { code: 'PET_08', name: '대망각의 수호수', category: 'pet_skin', rarity: 'legendary', priceType: 'season_reward', price: 0, affectsStats: false, description: '대망각 이전의 세계수 분신.', isLimited: true },

  // ═══════════════════════════════════════════════════════════════
  //  마운트 (5)
  // ═══════════════════════════════════════════════════════════════
  { code: 'MOUNT_01', name: '시간의 말', category: 'mount', rarity: 'rare', priceType: 'crystal', price: 400, affectsStats: false, description: '시간의 안개를 타고 달리는 유령 말.', isLimited: false },
  { code: 'MOUNT_02', name: '크로노 늑대', category: 'mount', rarity: 'epic', priceType: 'crystal', price: 800, affectsStats: false, description: '크로노스의 숲을 지키는 거대 늑대.', isLimited: false },
  { code: 'MOUNT_03', name: '에테르 비룡', category: 'mount', rarity: 'epic', priceType: 'crystal', price: 1000, affectsStats: false, description: '에테르 차원을 나는 비룡.', isLimited: false },
  { code: 'MOUNT_04', name: '시간의 불사조', category: 'mount', rarity: 'legendary', priceType: 'crystal', price: 1800, affectsStats: false, description: '불멸의 시간 불사조 마운트.', isLimited: true },
  { code: 'MOUNT_05', name: '대망각의 기계거인', category: 'mount', rarity: 'legendary', priceType: 'season_reward', price: 0, affectsStats: false, description: '대망각 시대의 고대 기계거인.', isLimited: true },

  // ═══════════════════════════════════════════════════════════════
  //  이모트 (7)
  // ═══════════════════════════════════════════════════════════════
  { code: 'EMOTE_01', name: '시간의 인사', category: 'emote', rarity: 'rare', priceType: 'gold', price: 10000, affectsStats: false, description: '시계 문양을 그리며 인사하는 이모트.', isLimited: false },
  { code: 'EMOTE_02', name: '기억의 춤', category: 'emote', rarity: 'rare', priceType: 'gold', price: 10000, affectsStats: false, description: '기억의 파편이 흩날리는 춤.', isLimited: false },
  { code: 'EMOTE_03', name: '시간 정지', category: 'emote', rarity: 'epic', priceType: 'crystal', price: 200, affectsStats: false, description: '주변 시간이 멈추는 연출.', isLimited: false },
  { code: 'EMOTE_04', name: '그림자 숨기', category: 'emote', rarity: 'rare', priceType: 'gold', price: 15000, affectsStats: false, description: '그림자 속으로 사라지는 이모트.', isLimited: false },
  { code: 'EMOTE_05', name: '에테르 폭발', category: 'emote', rarity: 'epic', priceType: 'crystal', price: 300, affectsStats: false, description: '에테르 에너지가 폭발하는 이펙트.', isLimited: false },
  { code: 'EMOTE_06', name: '시간 역행', category: 'emote', rarity: 'epic', priceType: 'crystal', price: 400, affectsStats: false, description: '시간이 되감기는 이모트.', isLimited: true },
  { code: 'EMOTE_07', name: '대망각의 울림', category: 'emote', rarity: 'legendary', priceType: 'season_reward', price: 0, affectsStats: false, description: '대망각의 에코가 울려퍼지는 전설 이모트.', isLimited: true },

  // ═══════════════════════════════════════════════════════════════
  //  칭호 효과 (5)
  // ═══════════════════════════════════════════════════════════════
  { code: 'TITLE_01', name: '시간의 탐험가', category: 'title_effect', rarity: 'rare', priceType: 'gold', price: 20000, affectsStats: false, description: '닉네임에 시계 이펙트 추가.', isLimited: false },
  { code: 'TITLE_02', name: '크로노 마스터', category: 'title_effect', rarity: 'epic', priceType: 'crystal', price: 300, affectsStats: false, description: '닉네임에 시간 왜곡 이펙트.', isLimited: false },
  { code: 'TITLE_03', name: '에테르 수호자', category: 'title_effect', rarity: 'epic', priceType: 'crystal', price: 500, affectsStats: false, description: '에테르 빛이 감도는 칭호 효과.', isLimited: false },
  { code: 'TITLE_04', name: '망각을 이긴 자', category: 'title_effect', rarity: 'legendary', priceType: 'crystal', price: 1000, affectsStats: false, description: '닉네임 주변에 기억의 파편이 떠다닌다.', isLimited: true },
  { code: 'TITLE_05', name: '대망각의 증인', category: 'title_effect', rarity: 'legendary', priceType: 'season_reward', price: 0, affectsStats: false, description: '대망각을 목격한 자의 전설 칭호.', isLimited: true },
];
