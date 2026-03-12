/**
 * npcSeeds.ts — 30개 NPC 시드 데이터
 *
 * 구성:
 *   상인 5 (무기상/방어구상/잡화상/비밀상점/이동상인)
 *   퀘스트 부여자 8 (메인 스토리 NPC)
 *   훈련사 3 (전직/스킬/펫 훈련)
 *   주민 8 (각 마을 분위기 NPC)
 *   경비 3 (도시 방어)
 *   보스 3 (필드 보스, 행동 트리 포함)
 */

import type { BtNodeDef } from './behaviorTree';
import type { GiftPreference } from './affinitySystem';

// ── 시드 타입 ─────────────────────────────────────────────────

export interface NpcSeed {
  name: string;
  title?: string;
  role: string;
  location: string;
  dialogue: Array<{
    id: string;
    text: string;
    options?: Array<{ text: string; nextId?: string; condition?: string }>;
  }>;
  schedule?: Array<{ hour: number; location: string; action: string }>;
  behaviorTree: BtNodeDef;
  stats?: {
    hp: number;
    attack: number;
    defense: number;
    speed?: number;
  };
  shopItems?: Array<{
    itemId: string;
    name: string;
    price: number;
    currency: string;
  }>;
  /** 선물 선호도 (호감도 시스템 연동) */
  giftPreferences?: GiftPreference[];
}

// ── 공통 행동 트리 프리셋 ─────────────────────────────────────

/** 상인: 플레이어 근처면 거래, 아니면 대기 */
const merchantBt: BtNodeDef = {
  type: 'selector',
  children: [
    {
      type: 'sequence',
      children: [
        { type: 'condition', condition: 'isPlayerNear' },
        { type: 'action', action: 'trade' },
      ],
    },
    { type: 'action', action: 'idle' },
  ],
};

/** 일반 NPC: 낮엔 순찰/대화, 밤엔 수면 */
const villagerBt: BtNodeDef = {
  type: 'selector',
  children: [
    {
      type: 'sequence',
      children: [
        { type: 'condition', condition: 'isNight' },
        { type: 'action', action: 'sleep' },
      ],
    },
    {
      type: 'sequence',
      children: [
        { type: 'condition', condition: 'isPlayerNear' },
        { type: 'action', action: 'dialogue' },
      ],
    },
    { type: 'action', action: 'patrol' },
  ],
};

/** 경비: 적대 감지 시 추격, 아니면 순찰 */
const guardBt: BtNodeDef = {
  type: 'selector',
  children: [
    {
      type: 'sequence',
      children: [
        { type: 'condition', condition: 'isHostile' },
        { type: 'action', action: 'chase' },
      ],
    },
    {
      type: 'sequence',
      children: [
        { type: 'condition', condition: 'isPlayerNear' },
        { type: 'action', action: 'dialogue' },
      ],
    },
    { type: 'action', action: 'patrol' },
  ],
};

/** 보스: HP 낮으면 도주 → 적대 시 추격 → 순찰 */
const bossBt: BtNodeDef = {
  type: 'selector',
  children: [
    {
      type: 'sequence',
      children: [
        { type: 'condition', condition: 'isHealthLow' },
        { type: 'action', action: 'flee' },
      ],
    },
    {
      type: 'sequence',
      children: [
        { type: 'condition', condition: 'isPlayerNear' },
        { type: 'action', action: 'chase' },
      ],
    },
    { type: 'action', action: 'patrol' },
  ],
};

/** 퀘스트 NPC: 플레이어 근처면 대화, 아니면 대기 */
const questGiverBt: BtNodeDef = {
  type: 'selector',
  children: [
    {
      type: 'sequence',
      children: [
        { type: 'condition', condition: 'isPlayerNear' },
        { type: 'action', action: 'dialogue' },
      ],
    },
    { type: 'action', action: 'idle' },
  ],
};

// ── 30개 NPC 시드 데이터 ──────────────────────────────────────

export const npcSeeds: NpcSeed[] = [
  // ━━━ 상인 5 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  {
    name: '대장장이 볼칸',
    title: '에테르 무기 장인',
    role: 'merchant',
    location: 'kronos_city',
    dialogue: [
      { id: 'greeting', text: '최고의 무기를 원한다면 제대로 찾아왔군.', options: [
        { text: '무기를 보고 싶다', nextId: 'shop' },
        { text: '강화를 하고 싶다', nextId: 'enhance' },
        { text: '그냥 지나갈게', nextId: 'bye' },
      ]},
      { id: 'shop', text: '골라봐. 전부 내 손으로 벼렸지.' },
      { id: 'enhance', text: '강화 재료는 가져왔나? 없으면 낭비야.' },
      { id: 'bye', text: '흥, 다음에 오게.' },
    ],
    behaviorTree: merchantBt,
    shopItems: [
      { itemId: 'sword_iron', name: '철검', price: 500, currency: 'gold' },
      { itemId: 'sword_ether', name: '에테르 검', price: 2000, currency: 'gold' },
      { itemId: 'axe_war', name: '전투 도끼', price: 800, currency: 'gold' },
      { itemId: 'spear_long', name: '장창', price: 1200, currency: 'gold' },
    ],
    giftPreferences: [
      { itemId: 'ore_mythril', bonus: 20 },
      { itemId: 'ore_iron', bonus: 10 },
    ],
  },

  {
    name: '갑옷사 리넨',
    title: '철벽의 방어구 전문가',
    role: 'merchant',
    location: 'kronos_city',
    dialogue: [
      { id: 'greeting', text: '단단한 갑옷 없이 전장에 나가는 건 자살 행위야.', options: [
        { text: '방어구를 보여줘', nextId: 'shop' },
        { text: '안녕', nextId: 'bye' },
      ]},
      { id: 'shop', text: '여기 있네. 생존을 원한다면 투자를 해.' },
      { id: 'bye', text: '무사하길.' },
    ],
    behaviorTree: merchantBt,
    shopItems: [
      { itemId: 'armor_leather', name: '가죽 갑옷', price: 400, currency: 'gold' },
      { itemId: 'armor_chain', name: '체인메일', price: 1500, currency: 'gold' },
      { itemId: 'shield_iron', name: '철 방패', price: 600, currency: 'gold' },
      { itemId: 'helmet_steel', name: '강철 투구', price: 900, currency: 'gold' },
    ],
    giftPreferences: [
      { itemId: 'leather_fine', bonus: 15 },
    ],
  },

  {
    name: '잡화상 밀라',
    title: '무엇이든 있습니다',
    role: 'merchant',
    location: 'kronos_city',
    dialogue: [
      { id: 'greeting', text: '어서 와요~ 필요한 거 있으면 말해요!', options: [
        { text: '물약을 사고 싶어', nextId: 'shop' },
        { text: '뭐가 잘 팔려?', nextId: 'rumor' },
        { text: '됐어', nextId: 'bye' },
      ]},
      { id: 'shop', text: '물약, 스크롤, 재료까지 다 있어요!' },
      { id: 'rumor', text: '요즘 시간의 조각이 인기래요. 뭔가 거래에 쓰인다나...' },
      { id: 'bye', text: '다음에 또 와요~' },
    ],
    behaviorTree: merchantBt,
    shopItems: [
      { itemId: 'potion_hp', name: 'HP 물약', price: 50, currency: 'gold' },
      { itemId: 'potion_mp', name: 'MP 물약', price: 50, currency: 'gold' },
      { itemId: 'scroll_teleport', name: '순간이동 스크롤', price: 200, currency: 'gold' },
      { itemId: 'food_bread', name: '빵', price: 10, currency: 'gold' },
    ],
    giftPreferences: [
      { itemId: 'flower_rare', bonus: 15 },
      { itemId: 'gem_sapphire', bonus: 20 },
    ],
  },

  {
    name: '수상한 상인 카론',
    title: '???',
    role: 'merchant',
    location: 'shadow_alley',
    dialogue: [
      { id: 'greeting', text: '...뭘 원하지?', options: [
        { text: '특별한 물건이 있나?', nextId: 'shop', condition: 'affinity_gte_7' },
        { text: '그냥 왔어', nextId: 'bye' },
      ]},
      { id: 'shop', text: '...이건 아무에게나 보여주는 게 아니야.' },
      { id: 'bye', text: '...사라져.' },
    ],
    behaviorTree: {
      type: 'selector',
      children: [
        {
          type: 'sequence',
          children: [
            { type: 'condition', condition: 'isNight' },
            { type: 'condition', condition: 'isPlayerNear' },
            { type: 'action', action: 'trade' },
          ],
        },
        { type: 'action', action: 'idle' },
      ],
    },
    shopItems: [
      { itemId: 'dagger_shadow', name: '그림자 단검', price: 5000, currency: 'gold' },
      { itemId: 'cloak_invisible', name: '투명 망토', price: 10000, currency: 'gold' },
      { itemId: 'poison_lethal', name: '맹독약', price: 3000, currency: 'gold' },
    ],
    giftPreferences: [
      { itemId: 'gem_obsidian', bonus: 20 },
    ],
  },

  {
    name: '이동상인 제피르',
    title: '바람을 타는 행상',
    role: 'merchant',
    location: 'wandering',
    dialogue: [
      { id: 'greeting', text: '하하! 오늘은 여기서 장사를 하지. 뭐가 필요해?', options: [
        { text: '물건 좀 보여줘', nextId: 'shop' },
        { text: '어디서 왔어?', nextId: 'story' },
        { text: '나중에', nextId: 'bye' },
      ]},
      { id: 'shop', text: '다른 데서 못 구하는 것들이야!' },
      { id: 'story', text: '메모리아의 끝에서 왔지. 거긴 시간이 거꾸로 흘러.' },
      { id: 'bye', text: '다음 만남은 운명이 정하겠지!' },
    ],
    schedule: [
      { hour: 6, location: 'kronos_city', action: 'trade' },
      { hour: 12, location: 'aetheria_village', action: 'trade' },
      { hour: 18, location: 'twilight_forest', action: 'trade' },
      { hour: 22, location: 'wandering', action: 'sleep' },
    ],
    behaviorTree: merchantBt,
    shopItems: [
      { itemId: 'map_treasure', name: '보물 지도', price: 1000, currency: 'gold' },
      { itemId: 'ether_fragment', name: '에테르 조각', price: 2500, currency: 'gold' },
      { itemId: 'compass_chrono', name: '시간의 나침반', price: 5000, currency: 'gold' },
    ],
    giftPreferences: [
      { itemId: 'wine_vintage', bonus: 15 },
      { itemId: 'story_book', bonus: 10 },
    ],
  },

  // ━━━ 퀘스트 부여자 8 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  {
    name: '시간의 현자 아이온',
    title: '크로노스 대도서관장',
    role: 'quest_giver',
    location: 'kronos_library',
    dialogue: [
      { id: 'greeting', text: '시간의 흐름이 어지러워지고 있다. 네가 와야 할 이유가 있어.', options: [
        { text: '무슨 일인데요?', nextId: 'quest_main' },
        { text: '시간의 균열에 대해 알려주세요', nextId: 'lore' },
      ]},
      { id: 'quest_main', text: '메모리아의 핵심 — 시간의 수정이 부서지기 시작했다.' },
      { id: 'lore', text: '시간의 균열은 창조의 시대부터 봉인되어 있었지...' },
    ],
    behaviorTree: questGiverBt,
    giftPreferences: [
      { itemId: 'book_ancient', bonus: 20 },
      { itemId: 'tea_herbal', bonus: 10 },
    ],
  },

  {
    name: '기사단장 레온하르트',
    title: '크로노스 왕국 수호자',
    role: 'quest_giver',
    location: 'kronos_castle',
    dialogue: [
      { id: 'greeting', text: '왕국의 검이 필요하다. 네 실력을 보여봐.', options: [
        { text: '무엇을 해야 하죠?', nextId: 'quest' },
        { text: '기사단에 들어가고 싶습니다', nextId: 'join' },
      ]},
      { id: 'quest', text: '성벽 너머의 어둠이 점점 짙어지고 있다.' },
      { id: 'join', text: '먼저 네 실력을 증명해야 한다. 임무를 완수해라.' },
    ],
    behaviorTree: questGiverBt,
    giftPreferences: [
      { itemId: 'medal_honor', bonus: 20 },
    ],
  },

  {
    name: '마녀 엘리시아',
    title: '에테르 연구자',
    role: 'quest_giver',
    location: 'aetheria_tower',
    dialogue: [
      { id: 'greeting', text: '흥미로운 에테르 파장이 감지되네... 네 것이야?', options: [
        { text: '에테르에 대해 가르쳐주세요', nextId: 'teach' },
        { text: '도움이 필요하세요?', nextId: 'quest' },
      ]},
      { id: 'teach', text: '에테르는 시간의 본질을 담고 있어. 잘못 다루면 존재가 소멸하지.' },
      { id: 'quest', text: '에테르 결정 수집을 도와줄 수 있니?' },
    ],
    behaviorTree: questGiverBt,
    giftPreferences: [
      { itemId: 'crystal_ether', bonus: 20 },
      { itemId: 'herb_moon', bonus: 15 },
    ],
  },

  {
    name: '떠돌이 음유시인 리라',
    title: '기억의 노래를 부르는 자',
    role: 'quest_giver',
    location: 'aetheria_village',
    dialogue: [
      { id: 'greeting', text: '♪ 잊혀진 시간의 노래를... 아, 손님이네.', options: [
        { text: '무슨 노래야?', nextId: 'song' },
        { text: '부탁할 일이 있어?', nextId: 'quest' },
      ]},
      { id: 'song', text: '태초의 시간을 노래한 곡이야. 듣고 싶어?' },
      { id: 'quest', text: '사라진 악보를 찾아줄 수 있을까?' },
    ],
    schedule: [
      { hour: 8, location: 'aetheria_village', action: 'dialogue' },
      { hour: 14, location: 'kronos_city', action: 'dialogue' },
      { hour: 20, location: 'twilight_forest', action: 'idle' },
    ],
    behaviorTree: villagerBt,
    giftPreferences: [
      { itemId: 'instrument_lute', bonus: 20 },
      { itemId: 'flower_rare', bonus: 10 },
    ],
  },

  {
    name: '암흑기사 모르간',
    title: '그림자의 대리인',
    role: 'quest_giver',
    location: 'shadow_fortress',
    dialogue: [
      { id: 'greeting', text: '여기까지 왔다는 건... 각오가 됐다는 뜻이겠지.', options: [
        { text: '그림자의 힘에 대해 알려줘', nextId: 'lore' },
        { text: '시험을 받겠다', nextId: 'quest' },
      ]},
      { id: 'lore', text: '그림자는 시간의 이면이다. 빛이 있으면 반드시 어둠도 있지.' },
      { id: 'quest', text: '좋아. 네 어둠을 직시해봐라.' },
    ],
    behaviorTree: questGiverBt,
    giftPreferences: [
      { itemId: 'gem_obsidian', bonus: 15 },
    ],
  },

  {
    name: '촌장 할머니 베르타',
    title: '아에테리아 촌장',
    role: 'quest_giver',
    location: 'aetheria_village',
    dialogue: [
      { id: 'greeting', text: '오, 젊은이. 마을에 온 걸 환영하네.', options: [
        { text: '마을에 무슨 일이 있나요?', nextId: 'quest' },
        { text: '이 마을에 대해 알려주세요', nextId: 'lore' },
      ]},
      { id: 'quest', text: '요즘 밭에서 이상한 벌레들이 나와서 큰일이야...' },
      { id: 'lore', text: '이 마을은 메모리아에서 가장 오래된 정착지란다.' },
    ],
    behaviorTree: questGiverBt,
    giftPreferences: [
      { itemId: 'food_bread', bonus: 10 },
      { itemId: 'herb_heal', bonus: 15 },
    ],
  },

  {
    name: '탐험가 카일',
    title: '미지의 추적자',
    role: 'quest_giver',
    location: 'twilight_forest',
    dialogue: [
      { id: 'greeting', text: '이 숲에서 살아남은 거 보면 꽤 되는 모양이네?', options: [
        { text: '같이 탐험할래?', nextId: 'quest' },
        { text: '이 숲에 뭐가 있어?', nextId: 'lore' },
      ]},
      { id: 'quest', text: '숲 깊은 곳에 고대 유적이 있어. 같이 가볼까?' },
      { id: 'lore', text: '황혼의 숲은 시간이 뒤틀린 곳이야. 조심해.' },
    ],
    behaviorTree: villagerBt,
    giftPreferences: [
      { itemId: 'map_treasure', bonus: 20 },
      { itemId: 'compass_chrono', bonus: 15 },
    ],
  },

  {
    name: '정령왕 실피드',
    title: '바람의 정령 통치자',
    role: 'quest_giver',
    location: 'spirit_grove',
    dialogue: [
      { id: 'greeting', text: '인간이 이곳까지... 에테르의 인도인가.', options: [
        { text: '정령의 힘을 빌려주세요', nextId: 'quest' },
        { text: '이곳은 어떤 곳인가요?', nextId: 'lore' },
      ]},
      { id: 'quest', text: '먼저 우리에게 네 가치를 보여줘야 한다.' },
      { id: 'lore', text: '이곳은 에테르가 가장 순수하게 흐르는 성역이다.' },
    ],
    behaviorTree: questGiverBt,
    giftPreferences: [
      { itemId: 'crystal_ether', bonus: 20 },
      { itemId: 'flower_spirit', bonus: 15 },
    ],
  },

  // ━━━ 훈련사 3 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  {
    name: '전직 교관 발더',
    title: '전설의 검술 교관',
    role: 'trainer',
    location: 'kronos_barracks',
    dialogue: [
      { id: 'greeting', text: '더 강해지고 싶은가? 쉽진 않을 거다.', options: [
        { text: '전직을 하고 싶습니다', nextId: 'advance' },
        { text: '훈련을 받겠습니다', nextId: 'train' },
      ]},
      { id: 'advance', text: '레벨 30 이상, 그리고 자격 시험 통과가 필요하다.' },
      { id: 'train', text: '좋아. 기본부터 다시 잡아보지.' },
    ],
    behaviorTree: questGiverBt,
    giftPreferences: [
      { itemId: 'weapon_practice', bonus: 15 },
    ],
  },

  {
    name: '스킬 마스터 아르카나',
    title: '에테르 기술 연구가',
    role: 'trainer',
    location: 'aetheria_tower',
    dialogue: [
      { id: 'greeting', text: '새로운 기술을 배우러 왔나? 에테르 제어가 핵심이야.', options: [
        { text: '스킬을 배우고 싶어요', nextId: 'learn' },
        { text: '스킬 강화를 하고 싶어요', nextId: 'enhance' },
      ]},
      { id: 'learn', text: '네 직업에 맞는 스킬을 알려주지. 비용은 있어.' },
      { id: 'enhance', text: '스킬 강화석과 골드를 가져와. 실패할 수도 있으니 각오해.' },
    ],
    behaviorTree: questGiverBt,
    giftPreferences: [
      { itemId: 'book_skill', bonus: 20 },
    ],
  },

  {
    name: '펫 조련사 루나',
    title: '동물의 속삭임을 듣는 자',
    role: 'trainer',
    location: 'spirit_grove',
    dialogue: [
      { id: 'greeting', text: '귀여운 친구를 데리고 왔구나! 어떻게 해줄까?', options: [
        { text: '펫 훈련을 하고 싶어요', nextId: 'train' },
        { text: '새 펫을 얻고 싶어요', nextId: 'capture' },
      ]},
      { id: 'train', text: '펫의 유대감이 높을수록 훈련 효과가 좋아져.' },
      { id: 'capture', text: '야생 펫은 정령의 숲에서 가끔 나타나. 함정을 설치해볼까?' },
    ],
    behaviorTree: questGiverBt,
    giftPreferences: [
      { itemId: 'pet_treat', bonus: 20 },
      { itemId: 'flower_spirit', bonus: 10 },
    ],
  },

  // ━━━ 주민 8 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  {
    name: '농부 한스',
    role: 'villager',
    location: 'aetheria_village',
    dialogue: [
      { id: 'greeting', text: '올해 농사가 영 시원찮아... 날씨가 이상해졌거든.', options: [
        { text: '무슨 일이야?', nextId: 'worry' },
        { text: '힘내', nextId: 'bye' },
      ]},
      { id: 'worry', text: '시간이 뒤틀리면서 계절도 엉망이 됐어...' },
      { id: 'bye', text: '고마워, 이방인.' },
    ],
    schedule: [
      { hour: 6, location: 'aetheria_farm', action: 'patrol' },
      { hour: 18, location: 'aetheria_village', action: 'idle' },
      { hour: 22, location: 'aetheria_village', action: 'sleep' },
    ],
    behaviorTree: villagerBt,
  },

  {
    name: '낚시꾼 마리오',
    role: 'villager',
    location: 'kronos_harbor',
    dialogue: [
      { id: 'greeting', text: '쉿! 물고기가 도망가잖아!', options: [
        { text: '뭐가 잡혀?', nextId: 'fish' },
        { text: '미안', nextId: 'bye' },
      ]},
      { id: 'fish', text: '요즘 이상한 물고기가 잡혀. 시간의 비늘을 가진 놈이...' },
      { id: 'bye', text: '조용히 해줘...' },
    ],
    behaviorTree: villagerBt,
  },

  {
    name: '주점 주인 게르하르트',
    role: 'villager',
    location: 'kronos_tavern',
    dialogue: [
      { id: 'greeting', text: '어서 와! 뭘 마실 텐가?', options: [
        { text: '에일 한 잔', nextId: 'drink' },
        { text: '소문 좀 알려줘', nextId: 'rumor' },
      ]},
      { id: 'drink', text: '여기, 크로노스 특제 에일이야!' },
      { id: 'rumor', text: '성 지하에서 이상한 소리가 들린다더라...' },
    ],
    schedule: [
      { hour: 10, location: 'kronos_tavern', action: 'trade' },
      { hour: 2, location: 'kronos_tavern', action: 'sleep' },
    ],
    behaviorTree: villagerBt,
  },

  {
    name: '도서관 사서 엘레나',
    role: 'villager',
    location: 'kronos_library',
    dialogue: [
      { id: 'greeting', text: '조용히 해주세요. 여긴 도서관이에요.', options: [
        { text: '책을 찾고 있어요', nextId: 'book' },
        { text: '알겠습니다', nextId: 'bye' },
      ]},
      { id: 'book', text: '어떤 분야요? 역사, 마법, 에테르 이론?' },
      { id: 'bye', text: '...' },
    ],
    behaviorTree: villagerBt,
  },

  {
    name: '꼬마 루이',
    role: 'villager',
    location: 'aetheria_village',
    dialogue: [
      { id: 'greeting', text: '모험가다! 나도 나중에 모험가 될 거야!', options: [
        { text: '응원할게', nextId: 'cheer' },
        { text: '위험하니까 조심해', nextId: 'warn' },
      ]},
      { id: 'cheer', text: '정말?! 고마워! 나 열심히 연습하고 있거든!' },
      { id: 'warn', text: '괜찮아! 나 검술도 배우고 있어!' },
    ],
    behaviorTree: villagerBt,
  },

  {
    name: '약초사 피오나',
    role: 'villager',
    location: 'twilight_forest',
    dialogue: [
      { id: 'greeting', text: '이 숲엔 귀한 약초가 많아. 조심해서 채집해야 해.', options: [
        { text: '약초에 대해 알려줘', nextId: 'herb' },
        { text: '치료해줄 수 있어?', nextId: 'heal' },
      ]},
      { id: 'herb', text: '달빛초는 밤에만 피고, 시간꽃은 정오에만 열어.' },
      { id: 'heal', text: '상처를 보여줘. 연고를 발라줄게.' },
    ],
    behaviorTree: villagerBt,
  },

  {
    name: '광부 드워프 석',
    role: 'villager',
    location: 'crystal_mines',
    dialogue: [
      { id: 'greeting', text: '여기서 뭐해? 광산은 위험하다고!', options: [
        { text: '광물을 구하러 왔어', nextId: 'mine' },
        { text: '미안, 갈게', nextId: 'bye' },
      ]},
      { id: 'mine', text: '깊이 들어갈수록 좋은 광석이 있지만, 몬스터도 많아.' },
      { id: 'bye', text: '현명한 판단이야.' },
    ],
    behaviorTree: villagerBt,
  },

  {
    name: '떡장수 할매',
    role: 'villager',
    location: 'kronos_market',
    dialogue: [
      { id: 'greeting', text: '떡 사가~ 맛있는 떡! 에테르 떡도 있어!', options: [
        { text: '하나 주세요', nextId: 'buy' },
        { text: '에테르 떡?', nextId: 'special' },
      ]},
      { id: 'buy', text: '여기, 힘이 나는 떡이야. 맛있게 먹어.' },
      { id: 'special', text: '에테르를 넣어 만든 특제 떡이지. 잠깐이지만 능력이 올라가.' },
    ],
    behaviorTree: villagerBt,
  },

  // ━━━ 경비 3 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  {
    name: '성문 경비 카를',
    title: '크로노스 성문 파수꾼',
    role: 'guard',
    location: 'kronos_gate',
    dialogue: [
      { id: 'greeting', text: '정지! 신분을 밝혀라.', options: [
        { text: '모험가입니다', nextId: 'pass' },
        { text: '안쪽에 무슨 일이 있나요?', nextId: 'info' },
      ]},
      { id: 'pass', text: '좋다. 들어가라. 문제 일으키지 마.' },
      { id: 'info', text: '최근 성 안에서 수상한 기운이 감지되고 있다. 조심해.' },
    ],
    behaviorTree: guardBt,
    stats: { hp: 500, attack: 40, defense: 60 },
  },

  {
    name: '야경대장 루시퍼',
    title: '어둠의 순찰자',
    role: 'guard',
    location: 'kronos_city',
    dialogue: [
      { id: 'greeting', text: '밤에 돌아다니는 건 위험하다. 볼일이 있나?', options: [
        { text: '야간 몬스터가 나타났다고 들었는데', nextId: 'quest' },
        { text: '안전한가요?', nextId: 'safe' },
      ]},
      { id: 'quest', text: '맞다. 도시 외곽에 그림자 짐승이 출몰하고 있어.' },
      { id: 'safe', text: '내가 지키는 한 이 거리는 안전하다.' },
    ],
    schedule: [
      { hour: 20, location: 'kronos_city', action: 'patrol' },
      { hour: 6, location: 'kronos_barracks', action: 'sleep' },
    ],
    behaviorTree: guardBt,
    stats: { hp: 600, attack: 50, defense: 50 },
  },

  {
    name: '숲 감시자 아이비',
    title: '황혼의 숲 수호자',
    role: 'guard',
    location: 'twilight_forest',
    dialogue: [
      { id: 'greeting', text: '이 숲에 함부로 들어오면 안 돼. 허가증은?', options: [
        { text: '탐험 허가증이 있어', nextId: 'pass' },
        { text: '없는데...', nextId: 'deny' },
      ]},
      { id: 'pass', text: '확인했어. 조심해서 다녀.' },
      { id: 'deny', text: '크로노스 대도서관에서 발급받아 와.' },
    ],
    behaviorTree: guardBt,
    stats: { hp: 450, attack: 45, defense: 40, speed: 70 },
  },

  // ━━━ 보스 3 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  {
    name: '시간의 수호자 크로노테우스',
    title: '고대 시계탑의 주인',
    role: 'boss',
    location: 'clock_tower_apex',
    dialogue: [
      { id: 'greeting', text: '감히... 시간의 영역에 발을 들이다니.' },
    ],
    behaviorTree: {
      type: 'selector',
      children: [
        {
          type: 'sequence',
          children: [
            { type: 'condition', condition: 'isHealthLow' },
            {
              type: 'decorator',
              decorator: 'inverter',
              child: { type: 'action', action: 'flee' },
            },
            // HP 낮을 때 도주 실패 → 분노 모드 (chase)
            { type: 'action', action: 'chase' },
          ],
        },
        {
          type: 'sequence',
          children: [
            { type: 'condition', condition: 'isPlayerNear' },
            { type: 'action', action: 'chase' },
          ],
        },
        { type: 'action', action: 'patrol' },
      ],
    },
    stats: { hp: 50000, attack: 200, defense: 150, speed: 30 },
  },

  {
    name: '그림자군주 말라카이',
    title: '어둠의 심연 지배자',
    role: 'boss',
    location: 'shadow_abyss',
    dialogue: [
      { id: 'greeting', text: '또 하찮은 벌레가 기어왔군...' },
    ],
    behaviorTree: {
      type: 'selector',
      children: [
        {
          type: 'sequence',
          children: [
            { type: 'condition', condition: 'isHealthLow' },
            // HP 낮으면 도주 시도
            { type: 'action', action: 'flee' },
          ],
        },
        {
          type: 'sequence',
          children: [
            { type: 'condition', condition: 'isPlayerNear' },
            { type: 'action', action: 'chase' },
          ],
        },
        { type: 'action', action: 'patrol' },
      ],
    },
    stats: { hp: 80000, attack: 300, defense: 100, speed: 40 },
  },

  {
    name: '시간 포식자 엔트로피아',
    title: '균열에서 태어난 존재',
    role: 'boss',
    location: 'rift_nexus',
    dialogue: [
      { id: 'greeting', text: '시간을... 먹어야 해... 더 많이...' },
    ],
    behaviorTree: bossBt,
    stats: { hp: 120000, attack: 250, defense: 200, speed: 50 },
  },

  // ── 시즌 2: 안개해 NPC 10명 (P8-17) ────────────────────────

  {
    name: '나일라',
    title: '안개해 어선 수리공',
    role: 'merchant',
    location: 'mistsea_harbor',
    dialogue: [
      { id: 'greeting', text: '안개 속에서 부서진 건 배만이 아니야.' },
      { id: 'shop', text: '자재 가격? 살아 돌아오면 싸게 해줄게.' },
    ],
    shopItems: [
      { itemId: 'ship_timber', name: '선박 자재', price: 500, currency: 'gold' },
      { itemId: 'waterproof_coat', name: '방수 코팅제', price: 300, currency: 'gold' },
      { itemId: 'mistsea_map_fragment', name: '안개해 지도 조각', price: 1200, currency: 'gold' },
    ],
    behaviorTree: merchantBt,
  },
  {
    name: '토르가',
    title: '안개해 등대지기',
    role: 'quest',
    location: 'mistsea_lighthouse',
    dialogue: [
      { id: 'greeting', text: '안개가 걷힌 적은 한 번도 없어. 그건 걷히는 게 아니라, 사라지는 거야.' },
      { id: 'quest_start', text: '등불은 길을 비추지 않아. 돌아올 곳을 알려줄 뿐.', options: [
        { text: '등대의 기억에 대해 알려주세요', nextId: 'quest_accept' },
        { text: '(떠난다)', nextId: 'farewell' },
      ]},
      { id: 'quest_accept', text: '좋아. 이 안개 속에서 세 개의 봉인석을 찾아와. 그러면 등대의 기억을 보여주지.' },
      { id: 'farewell', text: '…바다는 기다려 주지 않아.' },
    ],
    behaviorTree: villagerBt,
  },
  {
    name: '밀레나',
    title: '안개해 유랑 약초사',
    role: 'merchant',
    location: 'mistsea_coral_plaza',
    dialogue: [
      { id: 'greeting', text: '이 약초는 기억을 되살려주기도 하고… 아, 그건 아직 검증 안 됐나.' },
      { id: 'shop', text: '안개해 생물이 독이 강해서 해독제는 필수야!' },
    ],
    shopItems: [
      { itemId: 'mistsea_antidote', name: '안개해 해독제', price: 200, currency: 'gold' },
      { itemId: 'deep_recovery_potion', name: '심해 회복약', price: 400, currency: 'gold' },
      { itemId: 'memory_purify_water', name: '기억 정화수', price: 800, currency: 'gold' },
    ],
    schedule: [
      { hour: 8, location: 'mistsea_coral_plaza', action: 'sell' },
      { hour: 14, location: 'mistsea_cliffs', action: 'gather' },
      { hour: 20, location: 'mistsea_tavern', action: 'rest' },
    ],
    behaviorTree: merchantBt,
  },
  {
    name: '코발',
    title: '안개해 보물 사냥꾼',
    role: 'quest',
    location: 'mistsea_wreck_street',
    dialogue: [
      { id: 'greeting', text: '보물은 항상 가장 위험한 곳에 있어. 그래서 재미있지.' },
      { id: 'daily_quest', text: '이번 건은 혼자 못 하겠더라. 같이 가자, 보수는 6:4다.', options: [
        { text: '좋아, 같이 가자', nextId: 'quest_accept' },
        { text: '비율이 맘에 안 드는데', nextId: 'negotiate' },
      ]},
      { id: 'negotiate', text: '…7:3? 됐어, 5:5로 하지. 대신 뒷정리는 네 몫이야.' },
      { id: 'quest_accept', text: '좋아! 난파선 구역으로 가자. 보물 3개만 찾으면 돼.' },
    ],
    behaviorTree: villagerBt,
  },
  {
    name: '메모리아',
    title: '봉인의 수호자',
    role: 'quest',
    location: 'mistsea_seal_altar',
    dialogue: [
      { id: 'greeting', text: '봉인을 풀겠다는 거야? …그건 내 존재를 지우겠다는 뜻이야.' },
      { id: 'story', text: '기억이란 건… 잊혀져야 비로소 완성되는 건지도 모르겠어.' },
      { id: 'choice', text: '선택해. 봉인을 유지할 것인가, 해제할 것인가.', options: [
        { text: '봉인을 유지한다', nextId: 'seal_keep', condition: 'chapter6_seal_choice' },
        { text: '봉인을 해제한다', nextId: 'seal_break', condition: 'chapter6_seal_choice' },
      ]},
    ],
    behaviorTree: villagerBt,
  },
  {
    name: '하쉬르',
    title: '안개해 경비대장',
    role: 'guard',
    location: 'mistsea_outpost',
    dialogue: [
      { id: 'greeting', text: '안개해는 관광지가 아니야. 여긴 살아서 나가는 게 목표인 곳이지.' },
      { id: 'pass', text: '실력이 있군. 좋아, 통과시켜 주지.', options: [
        { text: '(안개해로 들어간다)', nextId: 'enter', condition: 'level >= 50' },
      ]},
      { id: 'deny', text: '아직 이른 것 같군. 더 강해지고 와.' },
    ],
    behaviorTree: guardBt,
    stats: { hp: 15000, attack: 180, defense: 250 },
  },
  {
    name: '루나리아',
    title: '심해 연구자',
    role: 'quest',
    location: 'mistsea_observatory',
    dialogue: [
      { id: 'greeting', text: '이 생물의 발광 패턴이 에테르 결정의 파장과 일치해! 놀랍지 않아?' },
      { id: 'quest', text: '데이터가 더 필요해. 저 던전 안에 샘플이 있을 거야.', options: [
        { text: '조사를 도와줄게', nextId: 'quest_accept' },
        { text: '위험하지 않아?', nextId: 'warn' },
      ]},
      { id: 'warn', text: '위험하지. 하지만 이건 세계의 비밀을 풀 수 있는 기회야!' },
      { id: 'quest_accept', text: '고마워! 심해 샘플 5개만 가져와 줘.' },
    ],
    behaviorTree: villagerBt,
  },
  {
    name: '벨투스',
    title: '기억 파괴자 훈련사',
    role: 'trainer',
    location: 'mistsea_memory_rift',
    dialogue: [
      { id: 'greeting', text: '봉인의 힘을 쓴다는 건 네 기억의 일부를 대가로 치른다는 뜻이야.' },
      { id: 'train', text: '준비됐나? 이 훈련에서 돌아오지 못한 자가 셋이나 있어.', options: [
        { text: '기억 파괴자 전직을 하겠습니다', nextId: 'class_change', condition: 'level >= 50 AND class != memory_breaker' },
        { text: '아직 준비가 안 됐어', nextId: 'farewell' },
      ]},
      { id: 'class_change', text: '좋은 각오다. 시작하자.' },
      { id: 'farewell', text: '현명한 판단이야. 준비가 되면 다시 와.' },
    ],
    behaviorTree: villagerBt,
  },
  {
    name: '오키아',
    title: '안개해 술집 주인',
    role: 'villager',
    location: 'mistsea_tavern',
    dialogue: [
      { id: 'greeting', text: '이 동네 소식은 다 여기 모이지. 한 잔 할래?' },
      { id: 'rumor', text: '최근 심해에서 이상한 울음소리가 들린다더라. 나라면 안 가겠지만.' },
    ],
    schedule: [
      { hour: 10, location: 'mistsea_tavern', action: 'clean' },
      { hour: 16, location: 'mistsea_tavern', action: 'serve' },
      { hour: 23, location: 'mistsea_tavern', action: 'close' },
    ],
    behaviorTree: villagerBt,
  },
  {
    name: '세이렌',
    title: '심해의 목소리',
    role: 'boss',
    location: 'mistsea_colosseum_entrance',
    dialogue: [
      { id: 'greeting', text: '노래를 들으러 왔니, 아니면 침묵시키러 왔니?' },
      { id: 'challenge', text: '이 바다의 기억은 내가 지키고 있어. 네가 그걸 감당할 수 있을까?' },
    ],
    behaviorTree: bossBt,
    stats: { hp: 200000, attack: 350, defense: 180, speed: 60 },
  },
];
