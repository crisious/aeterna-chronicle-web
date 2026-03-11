/**
 * P4-09: 아이템 시드 데이터 — 80개
 *
 * 무기 15 (검/지팡이/단검 × 5등급)
 * 방어구 15 (갑옷/로브/가죽 × 5등급)
 * 액세서리 10 (반지/목걸이/귀걸이)
 * 소모품 20 (HP포션/MP포션/버프/음식/스크롤)
 * 재료 15 (광석/약초/가죽/보석/에테르 조각)
 * 퀘스트 아이템 5
 */

import { prisma } from '../db';

// ─── 시드 타입 ──────────────────────────────────────────────────

interface ItemSeed {
  code: string;
  name: string;
  description: string;
  type: string;
  subType?: string;
  grade: string;
  level: number;
  stats?: Record<string, number>;
  price: number;
  sellPrice: number;
  stackable: boolean;
  maxStack: number;
  tradeable: boolean;
  icon?: string;
}

// ─── 무기 (15) — 검/지팡이/단검 × 5등급 ────────────────────────

const WEAPONS: ItemSeed[] = [
  // 검 (sword) × 5
  { code: 'WPN_SWORD_C', name: '수련용 장검', description: '초보 기사에게 지급되는 무딘 장검', type: 'weapon', subType: 'sword', grade: 'common', level: 1, stats: { attack: 10 }, price: 50, sellPrice: 15, stackable: false, maxStack: 1, tradeable: true },
  { code: 'WPN_SWORD_U', name: '강철 장검', description: '단단한 강철로 제련된 장검', type: 'weapon', subType: 'sword', grade: 'uncommon', level: 10, stats: { attack: 25, critRate: 2 }, price: 300, sellPrice: 90, stackable: false, maxStack: 1, tradeable: true },
  { code: 'WPN_SWORD_R', name: '에테르 블레이드', description: '에테르 결정이 스며든 날카로운 검', type: 'weapon', subType: 'sword', grade: 'rare', level: 25, stats: { attack: 55, critRate: 5, critDamage: 10 }, price: 1500, sellPrice: 450, stackable: false, maxStack: 1, tradeable: true },
  { code: 'WPN_SWORD_E', name: '시간의 단절자', description: '시간의 틈새에서 발견된 고대의 검', type: 'weapon', subType: 'sword', grade: 'epic', level: 45, stats: { attack: 120, critRate: 8, critDamage: 20, speed: 5 }, price: 8000, sellPrice: 2400, stackable: false, maxStack: 1, tradeable: true },
  { code: 'WPN_SWORD_L', name: '에테르나 — 영원의 검', description: '에테르나크로니클의 이름을 가진 전설의 검. 시간 자체를 베어낸다', type: 'weapon', subType: 'sword', grade: 'legendary', level: 70, stats: { attack: 280, critRate: 15, critDamage: 40, speed: 10, elementalDamage: 30 }, price: 50000, sellPrice: 15000, stackable: false, maxStack: 1, tradeable: false },

  // 지팡이 (staff) × 5
  { code: 'WPN_STAFF_C', name: '나무 지팡이', description: '마법 입문자용 지팡이', type: 'weapon', subType: 'staff', grade: 'common', level: 1, stats: { attack: 5, mp: 20 }, price: 50, sellPrice: 15, stackable: false, maxStack: 1, tradeable: true },
  { code: 'WPN_STAFF_U', name: '수정 지팡이', description: '수정 구슬이 박힌 지팡이', type: 'weapon', subType: 'staff', grade: 'uncommon', level: 10, stats: { attack: 15, mp: 50 }, price: 300, sellPrice: 90, stackable: false, maxStack: 1, tradeable: true },
  { code: 'WPN_STAFF_R', name: '기억의 지팡이', description: '기억의 직공이 사용하던 지팡이', type: 'weapon', subType: 'staff', grade: 'rare', level: 25, stats: { attack: 35, mp: 120, critRate: 3 }, price: 1500, sellPrice: 450, stackable: false, maxStack: 1, tradeable: true },
  { code: 'WPN_STAFF_E', name: '시간술사의 홀', description: '시공간을 왜곡시키는 강력한 지팡이', type: 'weapon', subType: 'staff', grade: 'epic', level: 45, stats: { attack: 80, mp: 250, critRate: 7, elementalDamage: 25 }, price: 8000, sellPrice: 2400, stackable: false, maxStack: 1, tradeable: true },
  { code: 'WPN_STAFF_L', name: '크로노스의 언약', description: '시간신 크로노스가 선택한 자에게만 응답하는 신성한 지팡이', type: 'weapon', subType: 'staff', grade: 'legendary', level: 70, stats: { attack: 200, mp: 500, critRate: 12, elementalDamage: 50 }, price: 50000, sellPrice: 15000, stackable: false, maxStack: 1, tradeable: false },

  // 단검 (dagger) × 5
  { code: 'WPN_DAGGER_C', name: '녹슨 단검', description: '날이 무딘 오래된 단검', type: 'weapon', subType: 'dagger', grade: 'common', level: 1, stats: { attack: 8, speed: 5 }, price: 40, sellPrice: 12, stackable: false, maxStack: 1, tradeable: true },
  { code: 'WPN_DAGGER_U', name: '그림자 단검', description: '어둠 속에서 빛나는 단검', type: 'weapon', subType: 'dagger', grade: 'uncommon', level: 10, stats: { attack: 20, speed: 10, critRate: 5 }, price: 280, sellPrice: 84, stackable: false, maxStack: 1, tradeable: true },
  { code: 'WPN_DAGGER_R', name: '시간의 송곳', description: '시간의 흐름을 꿰뚫는 날카로운 단검', type: 'weapon', subType: 'dagger', grade: 'rare', level: 25, stats: { attack: 45, speed: 18, critRate: 10, evasion: 5 }, price: 1400, sellPrice: 420, stackable: false, maxStack: 1, tradeable: true },
  { code: 'WPN_DAGGER_E', name: '그림자 직공의 비수', description: '그림자 직공의 암살 도구', type: 'weapon', subType: 'dagger', grade: 'epic', level: 45, stats: { attack: 100, speed: 25, critRate: 15, evasion: 10, critDamage: 25 }, price: 7500, sellPrice: 2250, stackable: false, maxStack: 1, tradeable: true },
  { code: 'WPN_DAGGER_L', name: '빈틈 — 시공의 칼날', description: '존재와 비존재 사이의 틈을 가르는 전설의 암기', type: 'weapon', subType: 'dagger', grade: 'legendary', level: 70, stats: { attack: 250, speed: 35, critRate: 20, evasion: 15, critDamage: 50 }, price: 48000, sellPrice: 14400, stackable: false, maxStack: 1, tradeable: false },
];

// ─── 방어구 (15) — 갑옷/로브/가죽 × 5등급 ──────────────────────

const ARMORS: ItemSeed[] = [
  // 갑옷 (plate) × 5
  { code: 'ARM_PLATE_C', name: '수련용 갑옷', description: '무거운 수련용 판금 갑옷', type: 'armor', subType: 'plate', grade: 'common', level: 1, stats: { defense: 15, hp: 20 }, price: 60, sellPrice: 18, stackable: false, maxStack: 1, tradeable: true },
  { code: 'ARM_PLATE_U', name: '강철 판금갑', description: '강철 판으로 제작된 튼튼한 갑옷', type: 'armor', subType: 'plate', grade: 'uncommon', level: 10, stats: { defense: 35, hp: 60 }, price: 350, sellPrice: 105, stackable: false, maxStack: 1, tradeable: true },
  { code: 'ARM_PLATE_R', name: '에테르 가드', description: '에테르 결정으로 강화된 중갑', type: 'armor', subType: 'plate', grade: 'rare', level: 25, stats: { defense: 75, hp: 150 }, price: 1800, sellPrice: 540, stackable: false, maxStack: 1, tradeable: true },
  { code: 'ARM_PLATE_E', name: '시간의 파수꾼', description: '시간에 의해 부식되지 않는 신비한 갑옷', type: 'armor', subType: 'plate', grade: 'epic', level: 45, stats: { defense: 150, hp: 350, evasion: 3 }, price: 9000, sellPrice: 2700, stackable: false, maxStack: 1, tradeable: true },
  { code: 'ARM_PLATE_L', name: '크로노스의 벽', description: '시간의 방벽 그 자체를 입는 전설의 갑옷', type: 'armor', subType: 'plate', grade: 'legendary', level: 70, stats: { defense: 350, hp: 800, evasion: 5, elementalDamage: -20 }, price: 55000, sellPrice: 16500, stackable: false, maxStack: 1, tradeable: false },

  // 로브 (robe) × 5
  { code: 'ARM_ROBE_C', name: '낡은 로브', description: '마법 학도가 입는 낡은 로브', type: 'armor', subType: 'robe', grade: 'common', level: 1, stats: { defense: 5, mp: 30 }, price: 45, sellPrice: 13, stackable: false, maxStack: 1, tradeable: true },
  { code: 'ARM_ROBE_U', name: '마력의 로브', description: '마력이 깃든 푸른 로브', type: 'armor', subType: 'robe', grade: 'uncommon', level: 10, stats: { defense: 12, mp: 80 }, price: 280, sellPrice: 84, stackable: false, maxStack: 1, tradeable: true },
  { code: 'ARM_ROBE_R', name: '기억술사의 의복', description: '기억의 직공이 즐겨 입던 의복', type: 'armor', subType: 'robe', grade: 'rare', level: 25, stats: { defense: 30, mp: 180, critRate: 3 }, price: 1600, sellPrice: 480, stackable: false, maxStack: 1, tradeable: true },
  { code: 'ARM_ROBE_E', name: '시공의 망토', description: '공간이 접혀 만들어진 이차원 로브', type: 'armor', subType: 'robe', grade: 'epic', level: 45, stats: { defense: 60, mp: 400, critRate: 5, evasion: 8 }, price: 8500, sellPrice: 2550, stackable: false, maxStack: 1, tradeable: true },
  { code: 'ARM_ROBE_L', name: '에테르의 성의', description: '순수 에테르로 직조된 전설의 로브', type: 'armor', subType: 'robe', grade: 'legendary', level: 70, stats: { defense: 120, mp: 800, critRate: 10, evasion: 12 }, price: 52000, sellPrice: 15600, stackable: false, maxStack: 1, tradeable: false },

  // 가죽 (leather) × 5
  { code: 'ARM_LEATHER_C', name: '가죽 조끼', description: '가벼운 가죽으로 만든 조끼', type: 'armor', subType: 'leather', grade: 'common', level: 1, stats: { defense: 8, speed: 3 }, price: 50, sellPrice: 15, stackable: false, maxStack: 1, tradeable: true },
  { code: 'ARM_LEATHER_U', name: '강화 가죽갑', description: '경질 가죽을 겹친 경갑', type: 'armor', subType: 'leather', grade: 'uncommon', level: 10, stats: { defense: 22, speed: 5, evasion: 3 }, price: 300, sellPrice: 90, stackable: false, maxStack: 1, tradeable: true },
  { code: 'ARM_LEATHER_R', name: '그림자 가죽갑', description: '어둠에 녹아드는 특수 가죽 갑옷', type: 'armor', subType: 'leather', grade: 'rare', level: 25, stats: { defense: 50, speed: 10, evasion: 8 }, price: 1500, sellPrice: 450, stackable: false, maxStack: 1, tradeable: true },
  { code: 'ARM_LEATHER_E', name: '시간사냥꾼의 갑옷', description: '시간 틈새를 누비는 사냥꾼의 경갑', type: 'armor', subType: 'leather', grade: 'epic', level: 45, stats: { defense: 100, speed: 18, evasion: 12, critRate: 5 }, price: 8500, sellPrice: 2550, stackable: false, maxStack: 1, tradeable: true },
  { code: 'ARM_LEATHER_L', name: '경계의 옷', description: '현실과 꿈의 경계에서 만들어진 전설의 경갑', type: 'armor', subType: 'leather', grade: 'legendary', level: 70, stats: { defense: 220, speed: 25, evasion: 20, critRate: 10 }, price: 50000, sellPrice: 15000, stackable: false, maxStack: 1, tradeable: false },
];

// ─── 액세서리 (10) ──────────────────────────────────────────────

const ACCESSORIES: ItemSeed[] = [
  // 반지 (ring) × 4
  { code: 'ACC_RING_C', name: '구리 반지', description: '소박한 구리 반지', type: 'accessory', subType: 'ring', grade: 'common', level: 1, stats: { hp: 10 }, price: 30, sellPrice: 9, stackable: false, maxStack: 1, tradeable: true },
  { code: 'ACC_RING_U', name: '은빛 반지', description: '은으로 세공된 반지', type: 'accessory', subType: 'ring', grade: 'uncommon', level: 15, stats: { hp: 30, critRate: 2 }, price: 200, sellPrice: 60, stackable: false, maxStack: 1, tradeable: true },
  { code: 'ACC_RING_R', name: '에테르 링', description: '에테르 결정이 박힌 빛나는 반지', type: 'accessory', subType: 'ring', grade: 'rare', level: 30, stats: { hp: 80, critRate: 5, attack: 15 }, price: 1200, sellPrice: 360, stackable: false, maxStack: 1, tradeable: true },
  { code: 'ACC_RING_E', name: '시간의 고리', description: '끝없이 순환하는 시간을 상징하는 고리', type: 'accessory', subType: 'ring', grade: 'epic', level: 50, stats: { hp: 200, critRate: 8, attack: 40, speed: 8 }, price: 7000, sellPrice: 2100, stackable: false, maxStack: 1, tradeable: true },

  // 목걸이 (necklace) × 3
  { code: 'ACC_NECK_C', name: '나무 펜던트', description: '나무 조각을 엮은 펜던트', type: 'accessory', subType: 'necklace', grade: 'common', level: 1, stats: { mp: 15 }, price: 30, sellPrice: 9, stackable: false, maxStack: 1, tradeable: true },
  { code: 'ACC_NECK_R', name: '기억의 목걸이', description: '잊혀진 기억의 파편이 담긴 목걸이', type: 'accessory', subType: 'necklace', grade: 'rare', level: 30, stats: { mp: 100, defense: 20, critDamage: 10 }, price: 1100, sellPrice: 330, stackable: false, maxStack: 1, tradeable: true },
  { code: 'ACC_NECK_L', name: '크로노스의 심장', description: '시간신의 심장박동이 느껴지는 전설의 목걸이', type: 'accessory', subType: 'necklace', grade: 'legendary', level: 60, stats: { mp: 400, defense: 50, critDamage: 30, hp: 300 }, price: 40000, sellPrice: 12000, stackable: false, maxStack: 1, tradeable: false },

  // 귀걸이 (earring) × 3
  { code: 'ACC_EAR_U', name: '바람의 귀걸이', description: '바람의 축복이 깃든 귀걸이', type: 'accessory', subType: 'earring', grade: 'uncommon', level: 15, stats: { speed: 8, evasion: 3 }, price: 220, sellPrice: 66, stackable: false, maxStack: 1, tradeable: true },
  { code: 'ACC_EAR_R', name: '시공의 귀걸이', description: '시공의 진동을 감지하는 귀걸이', type: 'accessory', subType: 'earring', grade: 'rare', level: 35, stats: { speed: 15, evasion: 8, accuracy: 10 }, price: 1300, sellPrice: 390, stackable: false, maxStack: 1, tradeable: true },
  { code: 'ACC_EAR_E', name: '차원의 귓속말', description: '다른 차원의 소리가 들리는 신비한 귀걸이', type: 'accessory', subType: 'earring', grade: 'epic', level: 50, stats: { speed: 22, evasion: 12, accuracy: 15, critRate: 5 }, price: 6500, sellPrice: 1950, stackable: false, maxStack: 1, tradeable: true },
];

// ─── 소모품 (20) ────────────────────────────────────────────────

const CONSUMABLES: ItemSeed[] = [
  // HP 포션 (5)
  { code: 'CON_HP_S', name: 'HP 포션 (소)', description: 'HP 100 회복', type: 'consumable', subType: 'potion', grade: 'common', level: 1, stats: { hpRestore: 100 }, price: 20, sellPrice: 6, stackable: true, maxStack: 99, tradeable: true },
  { code: 'CON_HP_M', name: 'HP 포션 (중)', description: 'HP 300 회복', type: 'consumable', subType: 'potion', grade: 'uncommon', level: 10, stats: { hpRestore: 300 }, price: 60, sellPrice: 18, stackable: true, maxStack: 99, tradeable: true },
  { code: 'CON_HP_L', name: 'HP 포션 (대)', description: 'HP 800 회복', type: 'consumable', subType: 'potion', grade: 'rare', level: 25, stats: { hpRestore: 800 }, price: 150, sellPrice: 45, stackable: true, maxStack: 99, tradeable: true },
  { code: 'CON_HP_XL', name: 'HP 포션 (특대)', description: 'HP 2000 회복', type: 'consumable', subType: 'potion', grade: 'epic', level: 40, stats: { hpRestore: 2000 }, price: 400, sellPrice: 120, stackable: true, maxStack: 99, tradeable: true },
  { code: 'CON_HP_FULL', name: '에테르 생명수', description: 'HP 완전 회복', type: 'consumable', subType: 'potion', grade: 'legendary', level: 50, stats: { hpRestore: 99999 }, price: 2000, sellPrice: 600, stackable: true, maxStack: 20, tradeable: true },

  // MP 포션 (5)
  { code: 'CON_MP_S', name: 'MP 포션 (소)', description: 'MP 50 회복', type: 'consumable', subType: 'potion', grade: 'common', level: 1, stats: { mpRestore: 50 }, price: 25, sellPrice: 7, stackable: true, maxStack: 99, tradeable: true },
  { code: 'CON_MP_M', name: 'MP 포션 (중)', description: 'MP 150 회복', type: 'consumable', subType: 'potion', grade: 'uncommon', level: 10, stats: { mpRestore: 150 }, price: 70, sellPrice: 21, stackable: true, maxStack: 99, tradeable: true },
  { code: 'CON_MP_L', name: 'MP 포션 (대)', description: 'MP 400 회복', type: 'consumable', subType: 'potion', grade: 'rare', level: 25, stats: { mpRestore: 400 }, price: 180, sellPrice: 54, stackable: true, maxStack: 99, tradeable: true },
  { code: 'CON_MP_XL', name: 'MP 포션 (특대)', description: 'MP 1000 회복', type: 'consumable', subType: 'potion', grade: 'epic', level: 40, stats: { mpRestore: 1000 }, price: 450, sellPrice: 135, stackable: true, maxStack: 99, tradeable: true },
  { code: 'CON_MP_FULL', name: '에테르 마력수', description: 'MP 완전 회복', type: 'consumable', subType: 'potion', grade: 'legendary', level: 50, stats: { mpRestore: 99999 }, price: 2500, sellPrice: 750, stackable: true, maxStack: 20, tradeable: true },

  // 버프 아이템 (4)
  { code: 'CON_BUFF_ATK', name: '전투의 비약', description: '30분간 공격력 +15%', type: 'consumable', subType: 'buff', grade: 'rare', level: 20, stats: { attackBuff: 15, durationSec: 1800 }, price: 300, sellPrice: 90, stackable: true, maxStack: 30, tradeable: true },
  { code: 'CON_BUFF_DEF', name: '수호의 비약', description: '30분간 방어력 +15%', type: 'consumable', subType: 'buff', grade: 'rare', level: 20, stats: { defenseBuff: 15, durationSec: 1800 }, price: 300, sellPrice: 90, stackable: true, maxStack: 30, tradeable: true },
  { code: 'CON_BUFF_EXP', name: '경험의 묘약', description: '1시간 경험치 +50%', type: 'consumable', subType: 'buff', grade: 'epic', level: 1, stats: { expBuff: 50, durationSec: 3600 }, price: 1000, sellPrice: 300, stackable: true, maxStack: 10, tradeable: true },
  { code: 'CON_BUFF_LUCK', name: '행운의 부적', description: '30분간 드롭률 +20%', type: 'consumable', subType: 'buff', grade: 'epic', level: 1, stats: { dropBuff: 20, durationSec: 1800 }, price: 800, sellPrice: 240, stackable: true, maxStack: 10, tradeable: true },

  // 음식 (3)
  { code: 'CON_FOOD_BREAD', name: '모험가의 빵', description: 'HP 50 + MP 30 회복', type: 'consumable', subType: 'food', grade: 'common', level: 1, stats: { hpRestore: 50, mpRestore: 30 }, price: 10, sellPrice: 3, stackable: true, maxStack: 99, tradeable: true },
  { code: 'CON_FOOD_STEW', name: '전투식량 스튜', description: 'HP 200 + MP 100 회복 + 공격력 5% 버프 10분', type: 'consumable', subType: 'food', grade: 'uncommon', level: 15, stats: { hpRestore: 200, mpRestore: 100, attackBuff: 5, durationSec: 600 }, price: 80, sellPrice: 24, stackable: true, maxStack: 50, tradeable: true },
  { code: 'CON_FOOD_FEAST', name: '에테르 만찬', description: 'HP/MP 전체 회복 + 전 스탯 +10% 1시간', type: 'consumable', subType: 'food', grade: 'epic', level: 30, stats: { hpRestore: 99999, mpRestore: 99999, allStatBuff: 10, durationSec: 3600 }, price: 2000, sellPrice: 600, stackable: true, maxStack: 5, tradeable: true },

  // 스크롤 (3)
  { code: 'CON_SCROLL_TP', name: '텔레포트 스크롤', description: '마을로 즉시 귀환', type: 'consumable', subType: 'scroll', grade: 'common', level: 1, stats: { teleport: 1 }, price: 50, sellPrice: 15, stackable: true, maxStack: 50, tradeable: true },
  { code: 'CON_SCROLL_ID', name: '감정 스크롤', description: '미확인 아이템의 옵션을 감정', type: 'consumable', subType: 'scroll', grade: 'uncommon', level: 5, stats: { identify: 1 }, price: 100, sellPrice: 30, stackable: true, maxStack: 50, tradeable: true },
  { code: 'CON_SCROLL_RES', name: '부활 스크롤', description: '현장에서 즉시 부활 (경험치 손실 없음)', type: 'consumable', subType: 'scroll', grade: 'epic', level: 20, stats: { resurrect: 1 }, price: 1500, sellPrice: 450, stackable: true, maxStack: 10, tradeable: true },
];

// ─── 재료 (15) ──────────────────────────────────────────────────

const MATERIALS: ItemSeed[] = [
  // 광석 (ore) × 3
  { code: 'MAT_ORE_IRON', name: '철광석', description: '기본 제련에 사용되는 철광석', type: 'material', subType: 'ore', grade: 'common', level: 1, price: 8, sellPrice: 2, stackable: true, maxStack: 999, tradeable: true },
  { code: 'MAT_ORE_MITHRIL', name: '미스릴 원석', description: '가볍고 단단한 미스릴 원석', type: 'material', subType: 'ore', grade: 'rare', level: 20, price: 80, sellPrice: 24, stackable: true, maxStack: 999, tradeable: true },
  { code: 'MAT_ORE_ETHER', name: '에테르 결정 원석', description: '순수 에테르가 결정화된 광석', type: 'material', subType: 'ore', grade: 'epic', level: 40, price: 500, sellPrice: 150, stackable: true, maxStack: 999, tradeable: true },

  // 약초 (herb) × 3
  { code: 'MAT_HERB_GREEN', name: '초록 약초', description: '체력 포션 재료', type: 'material', subType: 'herb', grade: 'common', level: 1, price: 5, sellPrice: 1, stackable: true, maxStack: 999, tradeable: true },
  { code: 'MAT_HERB_BLUE', name: '푸른 약초', description: '마력 포션 재료', type: 'material', subType: 'herb', grade: 'uncommon', level: 10, price: 15, sellPrice: 4, stackable: true, maxStack: 999, tradeable: true },
  { code: 'MAT_HERB_GOLDEN', name: '황금 약초', description: '전설 비약의 핵심 재료', type: 'material', subType: 'herb', grade: 'epic', level: 35, price: 300, sellPrice: 90, stackable: true, maxStack: 999, tradeable: true },

  // 가죽 (leather) × 3
  { code: 'MAT_LEATHER_ROUGH', name: '거친 가죽', description: '일반 몬스터에서 얻은 가죽', type: 'material', subType: 'leather', grade: 'common', level: 1, price: 6, sellPrice: 1, stackable: true, maxStack: 999, tradeable: true },
  { code: 'MAT_LEATHER_FINE', name: '고급 가죽', description: '질 좋은 고급 가죽', type: 'material', subType: 'leather', grade: 'uncommon', level: 15, price: 25, sellPrice: 7, stackable: true, maxStack: 999, tradeable: true },
  { code: 'MAT_LEATHER_DRAGON', name: '용의 가죽', description: '드래곤의 비늘이 박힌 희귀 가죽', type: 'material', subType: 'leather', grade: 'legendary', level: 50, price: 2000, sellPrice: 600, stackable: true, maxStack: 99, tradeable: true },

  // 보석 (gem) × 3
  { code: 'MAT_GEM_RUBY', name: '루비 원석', description: '공격력 강화에 사용되는 보석', type: 'material', subType: 'gem', grade: 'rare', level: 25, price: 120, sellPrice: 36, stackable: true, maxStack: 999, tradeable: true },
  { code: 'MAT_GEM_SAPPHIRE', name: '사파이어 원석', description: '마력 강화에 사용되는 보석', type: 'material', subType: 'gem', grade: 'rare', level: 25, price: 120, sellPrice: 36, stackable: true, maxStack: 999, tradeable: true },
  { code: 'MAT_GEM_DIAMOND', name: '다이아몬드 원석', description: '최고급 제작에 필요한 보석', type: 'material', subType: 'gem', grade: 'epic', level: 40, price: 600, sellPrice: 180, stackable: true, maxStack: 999, tradeable: true },

  // 에테르 조각 (ether) × 3
  { code: 'MAT_ETHER_SHARD', name: '에테르 조각', description: '에테르 에너지가 응축된 파편', type: 'material', subType: 'ether', grade: 'uncommon', level: 10, price: 30, sellPrice: 9, stackable: true, maxStack: 999, tradeable: true },
  { code: 'MAT_ETHER_CORE', name: '에테르 코어', description: '에테르 에너지의 핵심부', type: 'material', subType: 'ether', grade: 'epic', level: 35, price: 400, sellPrice: 120, stackable: true, maxStack: 999, tradeable: true },
  { code: 'MAT_ETHER_PURE', name: '순수 에테르', description: '정제된 순수 에테르. 전설 장비 제작 핵심 재료', type: 'material', subType: 'ether', grade: 'legendary', level: 50, price: 3000, sellPrice: 900, stackable: true, maxStack: 99, tradeable: true },
];

// ─── 퀘스트 아이템 (5) ──────────────────────────────────────────

const QUEST_ITEMS: ItemSeed[] = [
  { code: 'QST_LETTER_ELDER', name: '장로의 편지', description: '마을 장로가 쓴 봉인된 편지', type: 'quest_item', grade: 'common', level: 1, price: 0, sellPrice: 0, stackable: false, maxStack: 1, tradeable: false },
  { code: 'QST_KEY_RUIN', name: '고대 유적 열쇠', description: '잊혀진 유적의 문을 여는 열쇠', type: 'quest_item', grade: 'rare', level: 15, price: 0, sellPrice: 0, stackable: false, maxStack: 1, tradeable: false },
  { code: 'QST_MEMORY_FRAGMENT', name: '기억의 파편', description: '과거의 기억이 담긴 빛나는 파편', type: 'quest_item', grade: 'epic', level: 30, price: 0, sellPrice: 0, stackable: true, maxStack: 10, tradeable: false },
  { code: 'QST_TIME_COMPASS', name: '시간의 나침반', description: '시간의 흐름을 가리키는 신비한 나침반', type: 'quest_item', grade: 'epic', level: 40, price: 0, sellPrice: 0, stackable: false, maxStack: 1, tradeable: false },
  { code: 'QST_CHRONOS_SEAL', name: '크로노스의 봉인', description: '최종 봉인을 해제하는 열쇠. 세계의 운명이 달려있다', type: 'quest_item', grade: 'legendary', level: 60, price: 0, sellPrice: 0, stackable: false, maxStack: 1, tradeable: false },
];

// ─── 전체 시드 데이터 ───────────────────────────────────────────

export const ALL_ITEM_SEEDS: ItemSeed[] = [
  ...WEAPONS,
  ...ARMORS,
  ...ACCESSORIES,
  ...CONSUMABLES,
  ...MATERIALS,
  ...QUEST_ITEMS,
];

// ─── 시드 실행 함수 ─────────────────────────────────────────────

/** 아이템 마스터 데이터 시드 (upsert) */
export async function seedItems(): Promise<{ created: number; updated: number }> {
  let created = 0;
  let updated = 0;

  for (const seed of ALL_ITEM_SEEDS) {
    const existing = await prisma.item.findUnique({ where: { code: seed.code } });
    if (existing) {
      await prisma.item.update({
        where: { code: seed.code },
        data: {
          name: seed.name,
          description: seed.description,
          type: seed.type,
          subType: seed.subType ?? null,
          grade: seed.grade,
          level: seed.level,
          stats: seed.stats ? JSON.parse(JSON.stringify(seed.stats)) : null,
          price: seed.price,
          sellPrice: seed.sellPrice,
          stackable: seed.stackable,
          maxStack: seed.maxStack,
          tradeable: seed.tradeable,
          icon: seed.icon ?? null,
        },
      });
      updated++;
    } else {
      await prisma.item.create({
        data: {
          code: seed.code,
          name: seed.name,
          description: seed.description,
          type: seed.type,
          subType: seed.subType ?? null,
          grade: seed.grade,
          level: seed.level,
          stats: seed.stats ? JSON.parse(JSON.stringify(seed.stats)) : null,
          price: seed.price,
          sellPrice: seed.sellPrice,
          stackable: seed.stackable,
          maxStack: seed.maxStack,
          tradeable: seed.tradeable,
          icon: seed.icon ?? null,
        },
      });
      created++;
    }
  }

  return { created, updated };
}

/** 시드 아이템 수 확인 */
export function getItemSeedCount(): number {
  return ALL_ITEM_SEEDS.length;
}
