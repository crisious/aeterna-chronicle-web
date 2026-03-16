/**
 * 업적 시드 데이터 — 100개 (카테고리별 20개 × 5)
 *
 * 조건 타입:
 *   count     — 누적 횟수 달성
 *   threshold — 임계값(최고 기록 등)
 *   flag      — 단발성 플래그 달성
 *   combo     — 복합 플래그 조합 달성
 */

export interface AchievementSeed {
  code: string;
  name: string;
  description: string;
  category: 'combat' | 'exploration' | 'social' | 'collection' | 'story';
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  points: number;
  isHidden: boolean;
  condition: {
    type: 'count' | 'threshold' | 'flag' | 'combo';
    target: string;
    count?: number;
    flags?: string[];
  };
}

// ════════════════════════════════════════════════════════════════
// COMBAT (전투) — 20개
// ════════════════════════════════════════════════════════════════

const combatSeeds: AchievementSeed[] = [
  { code: 'FIRST_BLOOD', name: '첫 번째 피', description: '적을 처음으로 처치하라.', category: 'combat', tier: 'bronze', points: 5, isHidden: false, condition: { type: 'count', target: 'monster_kill', count: 1 } },
  { code: 'KILL_10', name: '사냥 입문자', description: '적 10마리를 처치하라.', category: 'combat', tier: 'bronze', points: 10, isHidden: false, condition: { type: 'count', target: 'monster_kill', count: 10 } },
  { code: 'KILL_100', name: '백인참수', description: '적 100마리를 처치하라.', category: 'combat', tier: 'silver', points: 25, isHidden: false, condition: { type: 'count', target: 'monster_kill', count: 100 } },
  { code: 'KILL_500', name: '전장의 주인', description: '적 500마리를 처치하라.', category: 'combat', tier: 'gold', points: 50, isHidden: false, condition: { type: 'count', target: 'monster_kill', count: 500 } },
  { code: 'KILL_1000', name: '천살의 전사', description: '적 1,000마리를 처치하라.', category: 'combat', tier: 'platinum', points: 100, isHidden: false, condition: { type: 'count', target: 'monster_kill', count: 1000 } },
  { code: 'BOSS_FIRST', name: '보스 사냥꾼', description: '첫 보스를 처치하라.', category: 'combat', tier: 'bronze', points: 15, isHidden: false, condition: { type: 'flag', target: 'boss_first_clear' } },
  { code: 'BOSS_10', name: '보스 전문가', description: '보스 10마리를 처치하라.', category: 'combat', tier: 'silver', points: 30, isHidden: false, condition: { type: 'count', target: 'boss_kill', count: 10 } },
  { code: 'BOSS_ALL', name: '보스 정복자', description: '모든 보스를 처치하라.', category: 'combat', tier: 'platinum', points: 100, isHidden: false, condition: { type: 'flag', target: 'all_bosses_cleared' } },
  { code: 'CRITICAL_MASTER', name: '크리티컬 달인', description: '크리티컬 히트 500회를 달성하라.', category: 'combat', tier: 'gold', points: 40, isHidden: false, condition: { type: 'count', target: 'critical_hit', count: 500 } },
  { code: 'COMBO_30', name: '콤보 마스터', description: '30 콤보를 달성하라.', category: 'combat', tier: 'silver', points: 25, isHidden: false, condition: { type: 'threshold', target: 'max_combo', count: 30 } },
  { code: 'NO_DAMAGE_BOSS', name: '무피해 보스 클리어', description: '피해 없이 보스를 처치하라.', category: 'combat', tier: 'gold', points: 50, isHidden: false, condition: { type: 'flag', target: 'no_damage_boss_clear' } },
  { code: 'ELITE_KILL_50', name: '엘리트 처단자', description: '엘리트 몬스터 50마리를 처치하라.', category: 'combat', tier: 'silver', points: 30, isHidden: false, condition: { type: 'count', target: 'elite_kill', count: 50 } },
  { code: 'DODGE_MASTER', name: '회피의 달인', description: '회피 100회를 성공하라.', category: 'combat', tier: 'silver', points: 20, isHidden: false, condition: { type: 'count', target: 'dodge_success', count: 100 } },
  { code: 'SKILL_KILL_200', name: '스킬 사냥꾼', description: '스킬로 적 200마리를 처치하라.', category: 'combat', tier: 'silver', points: 25, isHidden: false, condition: { type: 'count', target: 'skill_kill', count: 200 } },
  { code: 'REVIVE_10', name: '불사조', description: '전투 중 10회 부활하라.', category: 'combat', tier: 'bronze', points: 10, isHidden: false, condition: { type: 'count', target: 'revive', count: 10 } },
  { code: 'OVERKILL', name: '과잉 살상', description: '단일 공격으로 적 HP의 300% 이상 대미지를 입혀라.', category: 'combat', tier: 'gold', points: 35, isHidden: true, condition: { type: 'flag', target: 'overkill_300' } },
  { code: 'PARTY_WIPE_SURVIVE', name: '마지막 생존자', description: '파티 전멸 직전 혼자 보스를 처치하라.', category: 'combat', tier: 'gold', points: 50, isHidden: true, condition: { type: 'flag', target: 'last_man_standing_boss' } },
  { code: 'DAMAGE_MILLION', name: '밀리언 대미저', description: '누적 대미지 1,000,000을 달성하라.', category: 'combat', tier: 'gold', points: 40, isHidden: false, condition: { type: 'threshold', target: 'total_damage', count: 1000000 } },
  { code: 'PERFECT_CLEAR', name: '퍼펙트 클리어', description: '던전을 풀HP로 클리어하라.', category: 'combat', tier: 'silver', points: 30, isHidden: false, condition: { type: 'flag', target: 'perfect_dungeon_clear' } },
  { code: 'COMBAT_VETERAN', name: '전투 베테랑', description: '전투 관련 업적 15개를 달성하라.', category: 'combat', tier: 'platinum', points: 100, isHidden: false, condition: { type: 'threshold', target: 'combat_achievements', count: 15 } },
];

// ════════════════════════════════════════════════════════════════
// EXPLORATION (탐험) — 20개
// ════════════════════════════════════════════════════════════════

const explorationSeeds: AchievementSeed[] = [
  { code: 'FIRST_STEP', name: '첫 발자국', description: '월드에 처음 발을 내딛어라.', category: 'exploration', tier: 'bronze', points: 5, isHidden: false, condition: { type: 'flag', target: 'world_first_enter' } },
  { code: 'ZONE_5', name: '여행자', description: '5개 지역을 탐험하라.', category: 'exploration', tier: 'bronze', points: 10, isHidden: false, condition: { type: 'count', target: 'zone_discover', count: 5 } },
  { code: 'ZONE_15', name: '방랑자', description: '15개 지역을 탐험하라.', category: 'exploration', tier: 'silver', points: 25, isHidden: false, condition: { type: 'count', target: 'zone_discover', count: 15 } },
  { code: 'ZONE_ALL', name: '세계의 끝을 본 자', description: '모든 지역을 탐험하라.', category: 'exploration', tier: 'platinum', points: 100, isHidden: false, condition: { type: 'flag', target: 'all_zones_discovered' } },
  { code: 'HIDDEN_SPOT_1', name: '숨겨진 장소', description: '히든 스팟 1개를 발견하라.', category: 'exploration', tier: 'bronze', points: 10, isHidden: false, condition: { type: 'count', target: 'hidden_spot', count: 1 } },
  { code: 'HIDDEN_SPOT_10', name: '비밀 탐험가', description: '히든 스팟 10개를 발견하라.', category: 'exploration', tier: 'silver', points: 30, isHidden: false, condition: { type: 'count', target: 'hidden_spot', count: 10 } },
  { code: 'HIDDEN_SPOT_ALL', name: '그림자 속 진실', description: '모든 히든 스팟을 발견하라.', category: 'exploration', tier: 'platinum', points: 100, isHidden: true, condition: { type: 'flag', target: 'all_hidden_spots' } },
  { code: 'WORLD_MAP_50', name: '지도 제작자', description: '월드맵 50%를 개방하라.', category: 'exploration', tier: 'silver', points: 25, isHidden: false, condition: { type: 'threshold', target: 'map_completion', count: 50 } },
  { code: 'WORLD_MAP_100', name: '완벽한 지도', description: '월드맵 100%를 개방하라.', category: 'exploration', tier: 'platinum', points: 100, isHidden: false, condition: { type: 'threshold', target: 'map_completion', count: 100 } },
  { code: 'DUNGEON_ENTER_1', name: '던전 탐사자', description: '첫 던전에 입장하라.', category: 'exploration', tier: 'bronze', points: 10, isHidden: false, condition: { type: 'count', target: 'dungeon_enter', count: 1 } },
  { code: 'DUNGEON_CLEAR_10', name: '던전 전문가', description: '던전 10개를 클리어하라.', category: 'exploration', tier: 'silver', points: 30, isHidden: false, condition: { type: 'count', target: 'dungeon_clear', count: 10 } },
  { code: 'DUNGEON_CLEAR_ALL', name: '던전 정복자', description: '모든 던전을 클리어하라.', category: 'exploration', tier: 'gold', points: 50, isHidden: false, condition: { type: 'flag', target: 'all_dungeons_cleared' } },
  { code: 'TREASURE_10', name: '보물 사냥꾼', description: '보물 상자 10개를 열어라.', category: 'exploration', tier: 'bronze', points: 10, isHidden: false, condition: { type: 'count', target: 'treasure_open', count: 10 } },
  { code: 'TREASURE_50', name: '황금의 눈', description: '보물 상자 50개를 열어라.', category: 'exploration', tier: 'silver', points: 25, isHidden: false, condition: { type: 'count', target: 'treasure_open', count: 50 } },
  { code: 'WAYPOINT_ALL', name: '이동의 달인', description: '모든 웨이포인트를 개방하라.', category: 'exploration', tier: 'gold', points: 40, isHidden: false, condition: { type: 'flag', target: 'all_waypoints' } },
  { code: 'SWIM_1000M', name: '수영 선수', description: '누적 수영 거리 1,000m를 달성하라.', category: 'exploration', tier: 'bronze', points: 10, isHidden: false, condition: { type: 'threshold', target: 'swim_distance', count: 1000 } },
  { code: 'CLIMB_PEAK', name: '정상 등반', description: '세계 최고봉에 도달하라.', category: 'exploration', tier: 'gold', points: 40, isHidden: true, condition: { type: 'flag', target: 'reach_peak' } },
  { code: 'NIGHT_EXPLORE', name: '밤의 탐험가', description: '밤 시간대에 10개 지역을 탐험하라.', category: 'exploration', tier: 'silver', points: 20, isHidden: false, condition: { type: 'count', target: 'night_zone_explore', count: 10 } },
  { code: 'DEATH_ZONE_SURVIVE', name: '사지에서 생환', description: '데스 존에 진입 후 생환하라.', category: 'exploration', tier: 'gold', points: 50, isHidden: true, condition: { type: 'flag', target: 'death_zone_survive' } },
  { code: 'EXPLORATION_VETERAN', name: '탐험 베테랑', description: '탐험 관련 업적 15개를 달성하라.', category: 'exploration', tier: 'platinum', points: 100, isHidden: false, condition: { type: 'threshold', target: 'exploration_achievements', count: 15 } },
];

// ════════════════════════════════════════════════════════════════
// SOCIAL (사교) — 20개
// ════════════════════════════════════════════════════════════════

const socialSeeds: AchievementSeed[] = [
  { code: 'GUILD_JOIN', name: '길드 입단', description: '길드에 가입하라.', category: 'social', tier: 'bronze', points: 10, isHidden: false, condition: { type: 'flag', target: 'guild_joined' } },
  { code: 'GUILD_MASTER', name: '길드 마스터', description: '길드를 창설하라.', category: 'social', tier: 'silver', points: 25, isHidden: false, condition: { type: 'flag', target: 'guild_created' } },
  { code: 'GUILD_LV10', name: '강대한 길드', description: '길드 레벨 10을 달성하라.', category: 'social', tier: 'gold', points: 50, isHidden: false, condition: { type: 'threshold', target: 'guild_level', count: 10 } },
  { code: 'FRIEND_1', name: '첫 친구', description: '친구 1명을 등록하라.', category: 'social', tier: 'bronze', points: 5, isHidden: false, condition: { type: 'count', target: 'friend_add', count: 1 } },
  { code: 'FRIEND_10', name: '인싸', description: '친구 10명을 등록하라.', category: 'social', tier: 'silver', points: 20, isHidden: false, condition: { type: 'count', target: 'friend_add', count: 10 } },
  { code: 'FRIEND_50', name: '인맥왕', description: '친구 50명을 등록하라.', category: 'social', tier: 'gold', points: 40, isHidden: false, condition: { type: 'count', target: 'friend_add', count: 50 } },
  { code: 'PVP_WIN_1', name: '첫 승리', description: 'PvP에서 첫 승리를 거두라.', category: 'social', tier: 'bronze', points: 10, isHidden: false, condition: { type: 'count', target: 'pvp_win', count: 1 } },
  { code: 'PVP_WIN_10', name: 'PvP 파이터', description: 'PvP 10승을 달성하라.', category: 'social', tier: 'silver', points: 25, isHidden: false, condition: { type: 'count', target: 'pvp_win', count: 10 } },
  { code: 'PVP_WIN_50', name: 'PvP 챔피언', description: 'PvP 50승을 달성하라.', category: 'social', tier: 'gold', points: 50, isHidden: false, condition: { type: 'count', target: 'pvp_win', count: 50 } },
  { code: 'PVP_WIN_100', name: '아레나의 전설', description: 'PvP 100승을 달성하라.', category: 'social', tier: 'platinum', points: 100, isHidden: false, condition: { type: 'count', target: 'pvp_win', count: 100 } },
  { code: 'PARTY_JOIN_10', name: '파티원', description: '파티에 10회 참가하라.', category: 'social', tier: 'bronze', points: 10, isHidden: false, condition: { type: 'count', target: 'party_join', count: 10 } },
  { code: 'PARTY_CLEAR_BOSS', name: '팀워크의 힘', description: '파티로 보스를 처치하라.', category: 'social', tier: 'silver', points: 20, isHidden: false, condition: { type: 'count', target: 'party_boss_kill', count: 1 } },
  { code: 'TRADE_10', name: '상인 수습생', description: '거래를 10회 완료하라.', category: 'social', tier: 'bronze', points: 10, isHidden: false, condition: { type: 'count', target: 'trade_complete', count: 10 } },
  { code: 'TRADE_100', name: '대상인', description: '거래를 100회 완료하라.', category: 'social', tier: 'silver', points: 25, isHidden: false, condition: { type: 'count', target: 'trade_complete', count: 100 } },
  { code: 'CHAT_100', name: '수다쟁이', description: '채팅 100회를 입력하라.', category: 'social', tier: 'bronze', points: 10, isHidden: false, condition: { type: 'count', target: 'chat_message', count: 100 } },
  { code: 'EMOTE_50', name: '이모트 마니아', description: '이모트를 50회 사용하라.', category: 'social', tier: 'bronze', points: 10, isHidden: false, condition: { type: 'count', target: 'emote_use', count: 50 } },
  { code: 'GUILD_WAR_WIN', name: '길드전 승리', description: '길드전에서 승리하라.', category: 'social', tier: 'gold', points: 40, isHidden: false, condition: { type: 'count', target: 'guild_war_win', count: 1 } },
  { code: 'GUILD_WAR_MVP', name: '길드전 MVP', description: '길드전에서 MVP를 달성하라.', category: 'social', tier: 'gold', points: 50, isHidden: false, condition: { type: 'flag', target: 'guild_war_mvp' } },
  { code: 'MENTOR_5', name: '스승의 길', description: '신규 유저 5명을 멘토링하라.', category: 'social', tier: 'silver', points: 30, isHidden: false, condition: { type: 'count', target: 'mentor_complete', count: 5 } },
  { code: 'SOCIAL_VETERAN', name: '사교 베테랑', description: '사교 관련 업적 15개를 달성하라.', category: 'social', tier: 'platinum', points: 100, isHidden: false, condition: { type: 'threshold', target: 'social_achievements', count: 15 } },
];

// ════════════════════════════════════════════════════════════════
// COLLECTION (수집) — 20개
// ════════════════════════════════════════════════════════════════

const collectionSeeds: AchievementSeed[] = [
  { code: 'ITEM_COLLECT_10', name: '수집가 입문', description: '아이템 10종을 수집하라.', category: 'collection', tier: 'bronze', points: 10, isHidden: false, condition: { type: 'count', target: 'unique_item_collect', count: 10 } },
  { code: 'ITEM_COLLECT_50', name: '아이템 수집가', description: '아이템 50종을 수집하라.', category: 'collection', tier: 'silver', points: 25, isHidden: false, condition: { type: 'count', target: 'unique_item_collect', count: 50 } },
  { code: 'ITEM_COLLECT_200', name: '아이템 마니아', description: '아이템 200종을 수집하라.', category: 'collection', tier: 'gold', points: 50, isHidden: false, condition: { type: 'count', target: 'unique_item_collect', count: 200 } },
  { code: 'ITEM_COLLECT_ALL', name: '도감 완성', description: '모든 아이템을 수집하라.', category: 'collection', tier: 'platinum', points: 100, isHidden: false, condition: { type: 'flag', target: 'all_items_collected' } },
  { code: 'RARE_EQUIP_1', name: '레어 장비 획득', description: '레어 등급 장비를 획득하라.', category: 'collection', tier: 'bronze', points: 10, isHidden: false, condition: { type: 'count', target: 'rare_equip', count: 1 } },
  { code: 'EPIC_EQUIP_1', name: '에픽 장비 획득', description: '에픽 등급 장비를 획득하라.', category: 'collection', tier: 'silver', points: 25, isHidden: false, condition: { type: 'count', target: 'epic_equip', count: 1 } },
  { code: 'LEGENDARY_EQUIP_1', name: '전설의 시작', description: '전설 등급 장비를 획득하라.', category: 'collection', tier: 'gold', points: 50, isHidden: false, condition: { type: 'flag', target: 'legendary_equip_obtained' } },
  { code: 'LEGENDARY_EQUIP_FULL', name: '전설 풀셋', description: '전설 등급 장비를 전 슬롯에 장착하라.', category: 'collection', tier: 'platinum', points: 100, isHidden: false, condition: { type: 'flag', target: 'legendary_full_set' } },
  { code: 'ENHANCE_10', name: '강화 입문자', description: '장비 강화를 10회 시도하라.', category: 'collection', tier: 'bronze', points: 10, isHidden: false, condition: { type: 'count', target: 'enhance_attempt', count: 10 } },
  { code: 'ENHANCE_MAX', name: '최대 강화', description: '장비를 최대 강화 단계로 올려라.', category: 'collection', tier: 'gold', points: 50, isHidden: false, condition: { type: 'flag', target: 'enhance_max_reached' } },
  { code: 'MATERIAL_1000', name: '재료 수집왕', description: '재료 아이템 1,000개를 획득하라.', category: 'collection', tier: 'silver', points: 20, isHidden: false, condition: { type: 'count', target: 'material_collect', count: 1000 } },
  { code: 'RECIPE_10', name: '레시피 수집가', description: '제작 레시피 10개를 획득하라.', category: 'collection', tier: 'bronze', points: 10, isHidden: false, condition: { type: 'count', target: 'recipe_collect', count: 10 } },
  { code: 'RECIPE_ALL', name: '마스터 장인', description: '모든 제작 레시피를 획득하라.', category: 'collection', tier: 'platinum', points: 100, isHidden: false, condition: { type: 'flag', target: 'all_recipes_collected' } },
  { code: 'CRAFT_50', name: '제작 장인', description: '아이템을 50회 제작하라.', category: 'collection', tier: 'silver', points: 25, isHidden: false, condition: { type: 'count', target: 'craft_complete', count: 50 } },
  { code: 'PET_COLLECT_5', name: '펫 애호가', description: '펫 5마리를 수집하라.', category: 'collection', tier: 'silver', points: 20, isHidden: false, condition: { type: 'count', target: 'pet_collect', count: 5 } },
  { code: 'MOUNT_COLLECT_3', name: '탈것 수집가', description: '탈것 3종을 수집하라.', category: 'collection', tier: 'silver', points: 25, isHidden: false, condition: { type: 'count', target: 'mount_collect', count: 3 } },
  { code: 'COSTUME_10', name: '패션왕', description: '코스튬 10벌을 수집하라.', category: 'collection', tier: 'silver', points: 20, isHidden: false, condition: { type: 'count', target: 'costume_collect', count: 10 } },
  { code: 'GOLD_MILLION', name: '백만장자', description: '골드 1,000,000을 보유하라.', category: 'collection', tier: 'gold', points: 40, isHidden: false, condition: { type: 'threshold', target: 'gold_held', count: 1000000 } },
  { code: 'FISHING_50', name: '낚시왕', description: '물고기 50마리를 낚아라.', category: 'collection', tier: 'silver', points: 20, isHidden: false, condition: { type: 'count', target: 'fish_catch', count: 50 } },
  { code: 'COLLECTION_VETERAN', name: '수집 베테랑', description: '수집 관련 업적 15개를 달성하라.', category: 'collection', tier: 'platinum', points: 100, isHidden: false, condition: { type: 'threshold', target: 'collection_achievements', count: 15 } },
];

// ════════════════════════════════════════════════════════════════
// STORY (스토리) — 20개
// ════════════════════════════════════════════════════════════════

const storySeeds: AchievementSeed[] = [
  { code: 'PROLOGUE_CLEAR', name: '프롤로그 완료', description: '프롤로그를 클리어하라.', category: 'story', tier: 'bronze', points: 10, isHidden: false, condition: { type: 'flag', target: 'prologue_clear' } },
  { code: 'CHAPTER_1_CLEAR', name: '제1장 완료', description: '제1장 "시간의 균열"을 클리어하라.', category: 'story', tier: 'bronze', points: 15, isHidden: false, condition: { type: 'flag', target: 'chapter_1_clear' } },
  { code: 'CHAPTER_2_CLEAR', name: '제2장 완료', description: '제2장 "에테르의 파편"을 클리어하라.', category: 'story', tier: 'bronze', points: 15, isHidden: false, condition: { type: 'flag', target: 'chapter_2_clear' } },
  { code: 'CHAPTER_3_CLEAR', name: '제3장 완료', description: '제3장 "잊혀진 왕국"을 클리어하라.', category: 'story', tier: 'silver', points: 20, isHidden: false, condition: { type: 'flag', target: 'chapter_3_clear' } },
  { code: 'CHAPTER_4_CLEAR', name: '제4장 완료', description: '제4장 "운명의 교차"를 클리어하라.', category: 'story', tier: 'silver', points: 20, isHidden: false, condition: { type: 'flag', target: 'chapter_4_clear' } },
  { code: 'CHAPTER_5_CLEAR', name: '제5장 완료', description: '제5장 "영원의 문"을 클리어하라.', category: 'story', tier: 'gold', points: 30, isHidden: false, condition: { type: 'flag', target: 'chapter_5_clear' } },
  { code: 'ALL_CHAPTERS', name: '완주자', description: '모든 챕터를 클리어하라.', category: 'story', tier: 'platinum', points: 100, isHidden: false, condition: { type: 'combo', target: 'all_chapters', flags: ['chapter_1_clear', 'chapter_2_clear', 'chapter_3_clear', 'chapter_4_clear', 'chapter_5_clear'] } },
  { code: 'ENDING_NORMAL', name: '일반 엔딩', description: '일반 엔딩을 달성하라.', category: 'story', tier: 'silver', points: 25, isHidden: false, condition: { type: 'flag', target: 'ending_normal' } },
  { code: 'ENDING_TRUE', name: '진 엔딩', description: '진 엔딩을 달성하라.', category: 'story', tier: 'gold', points: 50, isHidden: false, condition: { type: 'flag', target: 'ending_true' } },
  { code: 'ENDING_HIDDEN', name: '숨겨진 엔딩', description: '???', category: 'story', tier: 'platinum', points: 100, isHidden: true, condition: { type: 'flag', target: 'ending_hidden' } },
  { code: 'ENDING_ALL', name: '모든 엔딩 수집', description: '모든 엔딩을 달성하라.', category: 'story', tier: 'platinum', points: 100, isHidden: false, condition: { type: 'combo', target: 'all_endings', flags: ['ending_normal', 'ending_true', 'ending_hidden'] } },
  { code: 'NPC_AFFINITY_MAX', name: '최고의 우정', description: 'NPC 호감도를 MAX로 올려라.', category: 'story', tier: 'gold', points: 40, isHidden: false, condition: { type: 'flag', target: 'npc_affinity_max' } },
  { code: 'NPC_AFFINITY_ALL', name: '모두의 친구', description: '모든 NPC 호감도를 MAX로 올려라.', category: 'story', tier: 'platinum', points: 100, isHidden: false, condition: { type: 'flag', target: 'all_npc_affinity_max' } },
  { code: 'DIALOGUE_100', name: '이야기꾼', description: 'NPC 대화 100회를 진행하라.', category: 'story', tier: 'bronze', points: 10, isHidden: false, condition: { type: 'count', target: 'npc_dialogue', count: 100 } },
  { code: 'LORE_BOOK_10', name: '지식 탐구자', description: '로어 북 10개를 수집하라.', category: 'story', tier: 'bronze', points: 10, isHidden: false, condition: { type: 'count', target: 'lore_book_collect', count: 10 } },
  { code: 'LORE_BOOK_ALL', name: '아카이비스트', description: '모든 로어 북을 수집하라.', category: 'story', tier: 'gold', points: 50, isHidden: false, condition: { type: 'flag', target: 'all_lore_books' } },
  { code: 'SIDE_QUEST_10', name: '조력자', description: '사이드 퀘스트 10개를 클리어하라.', category: 'story', tier: 'bronze', points: 15, isHidden: false, condition: { type: 'count', target: 'side_quest_clear', count: 10 } },
  { code: 'SIDE_QUEST_ALL', name: '만능 해결사', description: '모든 사이드 퀘스트를 클리어하라.', category: 'story', tier: 'gold', points: 50, isHidden: false, condition: { type: 'flag', target: 'all_side_quests' } },
  { code: 'MEMORY_FRAGMENT_ALL', name: '시간의 기억', description: '모든 기억의 파편을 수집하라.', category: 'story', tier: 'gold', points: 50, isHidden: true, condition: { type: 'flag', target: 'all_memory_fragments' } },
  { code: 'STORY_VETERAN', name: '스토리 베테랑', description: '스토리 관련 업적 15개를 달성하라.', category: 'story', tier: 'platinum', points: 100, isHidden: false, condition: { type: 'threshold', target: 'story_achievements', count: 15 } },
];

// ════════════════════════════════════════════════════════════════
// 전체 시드 데이터 (100개)
// ════════════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════════════
// P8-06 시즌 2 업적 — 50개 (안개해/봉인/기억파괴자/시즌2 콘텐츠)
// ════════════════════════════════════════════════════════════════

const season2Seeds: AchievementSeed[] = [
  // ── 안개해 탐험 (10) ──────────────────────────────────────────
  { code: 'S2_MIST_ENTER', name: '안개 속으로', description: '무한 안개해에 처음 진입하라.', category: 'exploration', tier: 'bronze', points: 10, isHidden: false, condition: { type: 'flag', target: 'mist_sea_enter' } },
  { code: 'S2_MIST_5_ZONES', name: '안개해 개척자', description: '안개해 5개 존을 모두 탐험하라.', category: 'exploration', tier: 'gold', points: 50, isHidden: false, condition: { type: 'count', target: 'mist_sea_zone_discover', count: 5 } },
  { code: 'S2_LIGHTHOUSE', name: '등대의 불빛', description: '기억의 등대를 발견하라.', category: 'exploration', tier: 'bronze', points: 15, isHidden: false, condition: { type: 'flag', target: 'lighthouse_discover' } },
  { code: 'S2_ARCHIPELAGO', name: '표류자의 발자취', description: '표류자의 군도에서 난파선 10개를 조사하라.', category: 'exploration', tier: 'silver', points: 25, isHidden: false, condition: { type: 'count', target: 'shipwreck_investigate', count: 10 } },
  { code: 'S2_SPIRE', name: '봉인의 첨탑', description: '봉인의 첨탑에 도달하라.', category: 'exploration', tier: 'silver', points: 30, isHidden: false, condition: { type: 'flag', target: 'spire_reach' } },
  { code: 'S2_ABYSS', name: '심연의 부름', description: '심연의 해구에 진입하라.', category: 'exploration', tier: 'gold', points: 40, isHidden: false, condition: { type: 'flag', target: 'abyss_enter' } },
  { code: 'S2_MIST_SURVIVE_10', name: '안개 생존자', description: '안개해에서 기억 소실 없이 10분 생존하라.', category: 'exploration', tier: 'silver', points: 25, isHidden: false, condition: { type: 'threshold', target: 'mist_survival_minutes', count: 10 } },
  { code: 'S2_TREASURE_HUNTER', name: '안개해 보물 사냥꾼', description: '안개해에서 숨겨진 보물 5개를 발견하라.', category: 'exploration', tier: 'silver', points: 30, isHidden: true, condition: { type: 'count', target: 'mist_treasure', count: 5 } },
  { code: 'S2_GHOST_SHIP', name: '유령선 정복', description: '유령선 이벤트를 클리어하라.', category: 'exploration', tier: 'gold', points: 40, isHidden: false, condition: { type: 'flag', target: 'ghost_ship_clear' } },
  { code: 'S2_MIST_MASTER', name: '안개해의 주인', description: '안개해 탐험 업적 8개를 달성하라.', category: 'exploration', tier: 'platinum', points: 100, isHidden: false, condition: { type: 'threshold', target: 's2_exploration_achievements', count: 8 } },

  // ── 봉인 관련 (10) ────────────────────────────────────────────
  { code: 'S2_SEAL_CRACK', name: '첫 번째 균열', description: '봉인 균열을 처음 발견하라.', category: 'story', tier: 'bronze', points: 10, isHidden: false, condition: { type: 'flag', target: 'seal_crack_discover' } },
  { code: 'S2_SEAL_REPAIR_1', name: '봉인 수복자', description: '첫 번째 봉인을 수복하라.', category: 'story', tier: 'silver', points: 30, isHidden: false, condition: { type: 'flag', target: 'seal_repair_1' } },
  { code: 'S2_SEAL_REPAIR_3', name: '봉인 전문가', description: '봉인 3개를 수복하라.', category: 'story', tier: 'gold', points: 50, isHidden: false, condition: { type: 'count', target: 'seal_repair', count: 3 } },
  { code: 'S2_SEAL_DESCENDANT', name: '후손과의 만남', description: '봉인자 후손 마을을 발견하라.', category: 'story', tier: 'silver', points: 25, isHidden: false, condition: { type: 'flag', target: 'seal_descendant_village' } },
  { code: 'S2_LUMINA_TRUST', name: '장로의 신뢰', description: '루미나의 호감도를 MAX로 올려라.', category: 'story', tier: 'gold', points: 40, isHidden: false, condition: { type: 'flag', target: 'lumina_affinity_max' } },
  { code: 'S2_SEAL_ECHO', name: '봉인의 에코', description: '봉인 공명 장면을 5회 목격하라.', category: 'story', tier: 'silver', points: 20, isHidden: false, condition: { type: 'count', target: 'seal_echo_witness', count: 5 } },
  { code: 'S2_SEAL_LORE_ALL', name: '봉인의 역사가', description: '봉인 관련 로어 북 전부를 수집하라.', category: 'story', tier: 'gold', points: 50, isHidden: false, condition: { type: 'flag', target: 'all_seal_lore' } },
  { code: 'S2_LETHE_DEFEAT', name: '레테 퇴치', description: '봉인 탐식자(레테의 분신)를 처치하라.', category: 'combat', tier: 'gold', points: 50, isHidden: false, condition: { type: 'flag', target: 'lethe_avatar_defeat' } },
  { code: 'S2_SEAL_PERFECT', name: '완벽한 봉인', description: '봉인 수복 전투를 피해 없이 클리어하라.', category: 'combat', tier: 'platinum', points: 80, isHidden: true, condition: { type: 'flag', target: 'seal_repair_no_damage' } },
  { code: 'S2_SEAL_MASTER', name: '봉인의 수호자', description: '봉인 관련 업적 8개를 달성하라.', category: 'story', tier: 'platinum', points: 100, isHidden: false, condition: { type: 'threshold', target: 's2_seal_achievements', count: 8 } },

  // ── 기억 파괴자 (10) ──────────────────────────────────────────
  { code: 'S2_MB_UNLOCK', name: '기억 파괴자 각성', description: '기억 파괴자 클래스를 해금하라.', category: 'combat', tier: 'silver', points: 30, isHidden: false, condition: { type: 'flag', target: 'memory_breaker_unlock' } },
  { code: 'S2_MB_TIER1', name: '봉인 해체자', description: '기억 파괴자 1차 전직을 완료하라.', category: 'combat', tier: 'silver', points: 25, isHidden: false, condition: { type: 'flag', target: 'mb_tier1_complete' } },
  { code: 'S2_MB_TIER2', name: '허공 파괴자', description: '기억 파괴자 2차 전직을 완료하라.', category: 'combat', tier: 'gold', points: 40, isHidden: false, condition: { type: 'flag', target: 'mb_tier2_complete' } },
  { code: 'S2_MB_TIER3', name: '망각의 군주', description: '기억 파괴자 3차 전직을 완료하라.', category: 'combat', tier: 'platinum', points: 80, isHidden: false, condition: { type: 'flag', target: 'mb_tier3_complete' } },
  { code: 'S2_MB_SKILL_ALL', name: '기억 파괴 마스터', description: '기억 파괴자 스킬 30개를 전부 습득하라.', category: 'combat', tier: 'gold', points: 50, isHidden: false, condition: { type: 'count', target: 'mb_skill_learn', count: 30 } },
  { code: 'S2_MB_ULTIMATE', name: '대망각 재현', description: '궁극기 "대망각 재현"을 사용하라.', category: 'combat', tier: 'gold', points: 40, isHidden: false, condition: { type: 'flag', target: 'mb_ultimate_use' } },
  { code: 'S2_MB_KILL_100', name: '기억 수확자', description: '기억 파괴자로 적 100마리를 처치하라.', category: 'combat', tier: 'silver', points: 25, isHidden: false, condition: { type: 'count', target: 'mb_kills', count: 100 } },
  { code: 'S2_MB_KILL_1000', name: '기억 포식자', description: '기억 파괴자로 적 1,000마리를 처치하라.', category: 'combat', tier: 'gold', points: 50, isHidden: false, condition: { type: 'count', target: 'mb_kills', count: 1000 } },
  { code: 'S2_MB_NO_DEATH', name: '불멸의 파괴자', description: '기억 파괴자로 죽지 않고 던전 5개를 클리어하라.', category: 'combat', tier: 'gold', points: 50, isHidden: true, condition: { type: 'count', target: 'mb_no_death_dungeon', count: 5 } },
  { code: 'S2_MB_VETERAN', name: '기억 파괴자 베테랑', description: '기억 파괴자 업적 8개를 달성하라.', category: 'combat', tier: 'platinum', points: 100, isHidden: false, condition: { type: 'threshold', target: 's2_mb_achievements', count: 8 } },

  // ── 시즌 2 전투 (10) ──────────────────────────────────────────
  { code: 'S2_MIST_KILL_100', name: '안개 사냥꾼', description: '안개해 몬스터 100마리를 처치하라.', category: 'combat', tier: 'silver', points: 25, isHidden: false, condition: { type: 'count', target: 'mist_monster_kill', count: 100 } },
  { code: 'S2_MIST_KILL_500', name: '안개해 전사', description: '안개해 몬스터 500마리를 처치하라.', category: 'combat', tier: 'gold', points: 40, isHidden: false, condition: { type: 'count', target: 'mist_monster_kill', count: 500 } },
  { code: 'S2_MIST_ELITE_20', name: '안개 엘리트 처단자', description: '안개해 엘리트 몬스터 20마리를 처치하라.', category: 'combat', tier: 'silver', points: 30, isHidden: false, condition: { type: 'count', target: 'mist_elite_kill', count: 20 } },
  { code: 'S2_MIST_BOSS_ALL', name: '안개해 보스 정복', description: '안개해 보스 5종을 전부 처치하라.', category: 'combat', tier: 'gold', points: 50, isHidden: false, condition: { type: 'count', target: 'mist_boss_kill', count: 5 } },
  { code: 'S2_DUNGEON_CLEAR_5', name: '안개해 던전 마스터', description: '안개해 던전 5개를 모두 클리어하라.', category: 'combat', tier: 'gold', points: 50, isHidden: false, condition: { type: 'count', target: 'mist_dungeon_clear', count: 5 } },
  { code: 'S2_RAID_CLEAR', name: '심연 레이드 클리어', description: '심연의 해구 레이드를 클리어하라.', category: 'combat', tier: 'platinum', points: 80, isHidden: false, condition: { type: 'flag', target: 'abyss_raid_clear' } },
  { code: 'S2_RAID_SPEED', name: '심연 스피드런', description: '심연 레이드를 15분 이내에 클리어하라.', category: 'combat', tier: 'platinum', points: 100, isHidden: true, condition: { type: 'threshold', target: 'abyss_raid_time', count: 900 } },
  { code: 'S2_PVP_WIN_50', name: '시즌 2 PvP 전사', description: 'PvP 시즌 2에서 50승하라.', category: 'combat', tier: 'silver', points: 30, isHidden: false, condition: { type: 'count', target: 's2_pvp_wins', count: 50 } },
  { code: 'S2_PVP_RANK_TOP', name: '시즌 2 PvP 챔피언', description: 'PvP 시즌 2에서 최고 등급에 도달하라.', category: 'combat', tier: 'platinum', points: 100, isHidden: false, condition: { type: 'flag', target: 's2_pvp_top_rank' } },
  { code: 'S2_COMBAT_VETERAN', name: '시즌 2 전투 베테랑', description: '시즌 2 전투 업적 8개를 달성하라.', category: 'combat', tier: 'platinum', points: 100, isHidden: false, condition: { type: 'threshold', target: 's2_combat_achievements', count: 8 } },

  // ── 시즌 2 컬렉션/소셜 (10) ───────────────────────────────────
  { code: 'S2_SEASON_PASS_10', name: '시즌패스 입문', description: '시즌 2 시즌패스 10단계를 달성하라.', category: 'collection', tier: 'bronze', points: 10, isHidden: false, condition: { type: 'threshold', target: 's2_season_pass_level', count: 10 } },
  { code: 'S2_SEASON_PASS_30', name: '시즌패스 중급', description: '시즌 2 시즌패스 30단계를 달성하라.', category: 'collection', tier: 'silver', points: 30, isHidden: false, condition: { type: 'threshold', target: 's2_season_pass_level', count: 30 } },
  { code: 'S2_SEASON_PASS_50', name: '시즌패스 완료', description: '시즌 2 시즌패스 50단계를 달성하라.', category: 'collection', tier: 'gold', points: 50, isHidden: false, condition: { type: 'threshold', target: 's2_season_pass_level', count: 50 } },
  { code: 'S2_COSMETIC_10', name: '시즌 2 수집가', description: '시즌 2 코스메틱 10개를 획득하라.', category: 'collection', tier: 'silver', points: 25, isHidden: false, condition: { type: 'count', target: 's2_cosmetic_collect', count: 10 } },
  { code: 'S2_COSMETIC_ALL', name: '시즌 2 컬렉터', description: '시즌 2 코스메틱 50개를 전부 획득하라.', category: 'collection', tier: 'platinum', points: 100, isHidden: false, condition: { type: 'count', target: 's2_cosmetic_collect', count: 50 } },
  { code: 'S2_HOUSING_FIRST', name: '새 집 마련', description: '하우징을 처음 구입하라.', category: 'social', tier: 'bronze', points: 15, isHidden: false, condition: { type: 'flag', target: 'housing_first_purchase' } },
  { code: 'S2_FURNITURE_20', name: '인테리어 디자이너', description: '가구 20개를 배치하라.', category: 'social', tier: 'silver', points: 25, isHidden: false, condition: { type: 'count', target: 'furniture_place', count: 20 } },
  { code: 'S2_GUILD_RAID', name: '길드 레이드 참가', description: '길드 레이드에 처음 참가하라.', category: 'social', tier: 'silver', points: 20, isHidden: false, condition: { type: 'flag', target: 'guild_raid_join' } },
  { code: 'S2_EVENT_CLEAR', name: '이벤트 정복자', description: '시간 한정 이벤트 3종을 모두 클리어하라.', category: 'social', tier: 'gold', points: 50, isHidden: false, condition: { type: 'count', target: 's2_event_clear', count: 3 } },
  { code: 'S2_COLLECTION_VETERAN', name: '시즌 2 수집 베테랑', description: '시즌 2 컬렉션/소셜 업적 8개를 달성하라.', category: 'collection', tier: 'platinum', points: 100, isHidden: false, condition: { type: 'threshold', target: 's2_collection_achievements', count: 8 } },
];

// ════════════════════════════════════════════════════════════════
// 전체 시드 데이터 (100 + 시즌2 50 = 150개)
// ════════════════════════════════════════════════════════════════

export const achievementSeeds: AchievementSeed[] = [
  ...combatSeeds,
  ...explorationSeeds,
  ...socialSeeds,
  ...collectionSeeds,
  ...storySeeds,
  ...season2Seeds,
];

// 검증: 150개 + 코드 유니크
if (achievementSeeds.length !== 150) {
  throw new Error(`업적 시드 수 불일치: expected 150, got ${achievementSeeds.length}`);
}
const codes = new Set(achievementSeeds.map(s => s.code));
if (codes.size !== achievementSeeds.length) {
  throw new Error('중복 업적 코드 존재');
}
