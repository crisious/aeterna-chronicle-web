/**
 * cutsceneRunner.ts — 컷씬 실행 엔진 (P6-10)
 *
 * 역할:
 *   - 컷씬 트리거 (챕터 시작/보스전 전/클리어 후)
 *   - 컷씬 데이터 관리 (15개 시드: 챕터당 3)
 *   - 대화 시스템 연동 (dialogueRunner 호출)
 *   - 컷씬 시청 기록 (스킵/다시보기 갤러리)
 */

import { prisma } from '../db';
import { Prisma } from '@prisma/client';

// ── 타입 정의 ──────────────────────────────────────────────────

export interface CutsceneData {
  id: string;
  chapter: number;
  trigger: CutsceneTrigger;
  title: string;
  dialogue: CutsceneDialogue[];
  background: string;
  bgm: string;
  characters: string[];
}

export type CutsceneTrigger = 'chapter_start' | 'pre_boss' | 'chapter_clear';

export interface CutsceneDialogue {
  speaker: string;
  portrait?: string;
  text: string;
  emotion?: string;
  delay?: number;  // 자동 진행 딜레이 (ms)
}

// ── 15개 컷씬 시드 데이터 (챕터당 3: 도입/전환/클리어) ──────────

export const CUTSCENE_SEEDS: CutsceneData[] = [
  // ── 챕터 1: 아르겐티움 ──
  {
    id: 'cs_ch1_start',
    chapter: 1,
    trigger: 'chapter_start',
    title: '아르겐티움의 목소리',
    dialogue: [
      { speaker: '???', text: '눈을 떠... 기억이... 파편처럼 흩어지고 있어.', emotion: 'mysterious' },
      { speaker: '엘라나', portrait: 'elana_worried', text: '정신이 들었군요. 당신은 "시간의 틈"에서 발견되었습니다.', emotion: 'concern' },
      { speaker: '엘라나', portrait: 'elana_neutral', text: '이곳은 아르겐티움, 에테르의 심장부입니다.', emotion: 'neutral' },
    ],
    background: 'bg_argentium_dawn',
    bgm: 'bgm_argentium_awakening',
    characters: ['엘라나'],
  },
  {
    id: 'cs_ch1_boss',
    chapter: 1,
    trigger: 'pre_boss',
    title: '시간의 수호자',
    dialogue: [
      { speaker: '엘라나', portrait: 'elana_serious', text: '저 너머에 시간의 수호자가 기다리고 있습니다. 준비되셨나요?', emotion: 'serious' },
      { speaker: '시간의 수호자', text: '감히... 이 영역을 침범하다니. 네 기억을 시험하겠다.', emotion: 'threatening' },
    ],
    background: 'bg_argentium_sanctum',
    bgm: 'bgm_boss_intro',
    characters: ['엘라나', '시간의 수호자'],
  },
  {
    id: 'cs_ch1_clear',
    chapter: 1,
    trigger: 'chapter_clear',
    title: '첫 번째 파편',
    dialogue: [
      { speaker: '엘라나', portrait: 'elana_smile', text: '해냈군요! 첫 번째 기억 파편을 손에 넣었습니다.', emotion: 'happy' },
      { speaker: '???', text: '이것은 시작에 불과하다... 더 깊은 시간의 흐름 속으로...', emotion: 'ominous' },
    ],
    background: 'bg_argentium_sunset',
    bgm: 'bgm_chapter_clear',
    characters: ['엘라나'],
  },

  // ── 챕터 2: 실반헤임 ──
  {
    id: 'cs_ch2_start',
    chapter: 2,
    trigger: 'chapter_start',
    title: '숲의 부름',
    dialogue: [
      { speaker: '세레니아', portrait: 'serenia_greet', text: '실반헤임에 오신 것을 환영합니다. 이 숲은 당신의 기억에 반응하고 있어요.', emotion: 'gentle' },
      { speaker: '세레니아', portrait: 'serenia_worried', text: '하지만 최근 "시간 오염"이 숲의 균형을 무너뜨리고 있습니다.', emotion: 'worried' },
    ],
    background: 'bg_silvanheim_entrance',
    bgm: 'bgm_silvanheim_mystical',
    characters: ['세레니아'],
  },
  {
    id: 'cs_ch2_boss',
    chapter: 2,
    trigger: 'pre_boss',
    title: '오염된 세계수',
    dialogue: [
      { speaker: '세레니아', portrait: 'serenia_serious', text: '세계수가... 오염에 잠식당하고 있어요. 지금 막지 않으면!', emotion: 'urgent' },
      { speaker: '오염된 정령', text: '이 시간은 멈춰야 한다... 모든 것이... 부패해야 한다...', emotion: 'corrupted' },
    ],
    background: 'bg_silvanheim_worldtree',
    bgm: 'bgm_boss_tension',
    characters: ['세레니아', '오염된 정령'],
  },
  {
    id: 'cs_ch2_clear',
    chapter: 2,
    trigger: 'chapter_clear',
    title: '숲의 치유',
    dialogue: [
      { speaker: '세레니아', portrait: 'serenia_smile', text: '세계수의 빛이 되돌아왔어요. 당신 덕분입니다.', emotion: 'grateful' },
      { speaker: '세레니아', portrait: 'serenia_neutral', text: '다음 파편은 빛의 도시 솔라리스에 있을 것입니다.', emotion: 'contemplative' },
    ],
    background: 'bg_silvanheim_healed',
    bgm: 'bgm_chapter_clear',
    characters: ['세레니아'],
  },

  // ── 챕터 3: 솔라리스/브리탈리아 ──
  {
    id: 'cs_ch3_start',
    chapter: 3,
    trigger: 'chapter_start',
    title: '두 도시의 경계',
    dialogue: [
      { speaker: '카이로스', portrait: 'kairos_introduce', text: '솔라리스에 온 것을 환영한다. 이곳은 빛과 어둠이 공존하는 경계의 도시.', emotion: 'composed' },
      { speaker: '카이로스', portrait: 'kairos_stern', text: '브리탈리아의 세력이 이곳까지 손을 뻗고 있다. 전직을 마쳤다면 대비해야 할 것이다.', emotion: 'warning' },
    ],
    background: 'bg_solaris_city',
    bgm: 'bgm_solaris_majestic',
    characters: ['카이로스'],
  },
  {
    id: 'cs_ch3_boss',
    chapter: 3,
    trigger: 'pre_boss',
    title: '그림자 장군',
    dialogue: [
      { speaker: '카이로스', portrait: 'kairos_battle', text: '그림자 장군 벨리온... 브리탈리아의 선봉이 직접 나섰다.', emotion: 'tense' },
      { speaker: '벨리온', text: '시간을 되돌리려는 자여. 네 기억은 이곳에서 끊긴다.', emotion: 'menacing' },
    ],
    background: 'bg_britallia_fortress',
    bgm: 'bgm_boss_epic',
    characters: ['카이로스', '벨리온'],
  },
  {
    id: 'cs_ch3_clear',
    chapter: 3,
    trigger: 'chapter_clear',
    title: '빛과 어둠 사이에서',
    dialogue: [
      { speaker: '카이로스', portrait: 'kairos_respect', text: '벨리온을 물리쳤다... 하지만 이건 시작에 불과하다. 더 큰 어둠이 북쪽에서 깨어나고 있다.', emotion: 'grave' },
    ],
    background: 'bg_solaris_twilight',
    bgm: 'bgm_chapter_clear',
    characters: ['카이로스'],
  },

  // ── 챕터 4: 북방 영원빙원 ──
  {
    id: 'cs_ch4_start',
    chapter: 4,
    trigger: 'chapter_start',
    title: '얼어붙은 시간',
    dialogue: [
      { speaker: '프로스트', portrait: 'frost_cold', text: '영원빙원에 발을 들인 자여. 이곳의 시간은 멈춰 있다.', emotion: 'cold' },
      { speaker: '프로스트', portrait: 'frost_warning', text: '세 번째 이상의 기억 파편이 없다면 이곳의 냉기를 버틸 수 없다.', emotion: 'warning' },
    ],
    background: 'bg_frostlands_entrance',
    bgm: 'bgm_frostlands_desolate',
    characters: ['프로스트'],
  },
  {
    id: 'cs_ch4_boss',
    chapter: 4,
    trigger: 'pre_boss',
    title: '빙결의 군주',
    dialogue: [
      { speaker: '빙결의 군주', text: '내 영역을 짓밟은 대가... 영원히 얼어붙어 시간 속에 갇혀라.', emotion: 'rage' },
      { speaker: '프로스트', portrait: 'frost_resolve', text: '기억 파편의 힘으로 냉기를 뚫을 수 있다. 지금이다!', emotion: 'determined' },
    ],
    background: 'bg_frostlands_throne',
    bgm: 'bgm_boss_climactic',
    characters: ['프로스트', '빙결의 군주'],
  },
  {
    id: 'cs_ch4_clear',
    chapter: 4,
    trigger: 'chapter_clear',
    title: '해동',
    dialogue: [
      { speaker: '프로스트', portrait: 'frost_thaw', text: '얼어붙은 시간이 녹기 시작한다... 네 번째 파편이 깨어났다.', emotion: 'relief' },
      { speaker: '???', text: '마지막 장소... 에레보스... 모든 기억이 시작된 곳...', emotion: 'ominous' },
    ],
    background: 'bg_frostlands_thaw',
    bgm: 'bgm_chapter_clear',
    characters: ['프로스트'],
  },

  // ── 챕터 5: 에레보스 ──
  {
    id: 'cs_ch5_start',
    chapter: 5,
    trigger: 'chapter_start',
    title: '심연의 문',
    dialogue: [
      { speaker: '???', text: '모든 파편이 모였다... 이제 진실을 마주할 시간이다.', emotion: 'solemn' },
      { speaker: '엘라나', portrait: 'elana_final', text: '에레보스... 시간의 끝이자 시작. 이곳에서 모든 것이 결정됩니다.', emotion: 'resolute' },
    ],
    background: 'bg_erebos_gate',
    bgm: 'bgm_erebos_descent',
    characters: ['엘라나'],
  },
  {
    id: 'cs_ch5_boss',
    chapter: 5,
    trigger: 'pre_boss',
    title: '시간의 종말',
    dialogue: [
      { speaker: '크로노스', portrait: 'chronos_reveal', text: '나는 크로노스... 시간 그 자체. 네 기억을 만든 것도, 파괴한 것도 나다.', emotion: 'divine' },
      { speaker: '엘라나', portrait: 'elana_shock', text: '그럴 리가... 당신이 이 모든 것의 원흉이었다니...', emotion: 'shocked' },
    ],
    background: 'bg_erebos_core',
    bgm: 'bgm_final_boss',
    characters: ['크로노스', '엘라나'],
  },
  {
    id: 'cs_ch5_clear',
    chapter: 5,
    trigger: 'chapter_clear',
    title: '에테르나의 기억',
    dialogue: [
      { speaker: '엘라나', portrait: 'elana_tears', text: '끝났어요... 아니, 이제 시작입니다. 당신의 선택이 새로운 시간을 만들었어요.', emotion: 'emotional' },
      { speaker: '???', text: '에테르나 크로니클... 기억은 시간을 넘어 이어진다.', emotion: 'hopeful' },
    ],
    background: 'bg_erebos_rebirth',
    bgm: 'bgm_ending_theme',
    characters: ['엘라나'],
  },
];

// ── 컷씬 관리 함수 ──────────────────────────────────────────────

/** 특정 트리거의 컷씬 데이터 조회 */
export function getCutscene(chapter: number, trigger: CutsceneTrigger): CutsceneData | null {
  return CUTSCENE_SEEDS.find(cs => cs.chapter === chapter && cs.trigger === trigger) ?? null;
}

/** 챕터의 모든 컷씬 목록 */
export function getChapterCutscenes(chapter: number): CutsceneData[] {
  return CUTSCENE_SEEDS.filter(cs => cs.chapter === chapter);
}

/** 유저가 본 컷씬 목록 조회 (갤러리) */
export async function getSeenCutscenes(userId: string): Promise<string[]> {
  const progress = await prisma.chapterProgress.findMany({
    where: { userId },
  });

  const seen: string[] = [];
  for (const p of progress) {
    const list = p.cutscenesSeen as string[];
    if (Array.isArray(list)) {
      seen.push(...list);
    }
  }
  return seen;
}

/** 컷씬 시청 기록 */
export async function markCutsceneSeen(userId: string, cutsceneId: string): Promise<void> {
  // 컷씬 ID에서 챕터 추출
  const csData = CUTSCENE_SEEDS.find(cs => cs.id === cutsceneId);
  if (!csData) return;

  const chapter = csData.chapter;

  const existing = await prisma.chapterProgress.findUnique({
    where: { userId_chapter: { userId, chapter } },
  });

  const currentSeen = (existing?.cutscenesSeen ?? []) as string[];
  if (!currentSeen.includes(cutsceneId)) {
    currentSeen.push(cutsceneId);
  }

  await prisma.chapterProgress.upsert({
    where: { userId_chapter: { userId, chapter } },
    create: {
      userId,
      chapter,
      status: 'in_progress',
      flags: {} as Prisma.InputJsonValue,
      cutscenesSeen: currentSeen as unknown as Prisma.InputJsonValue,
    },
    update: {
      cutscenesSeen: currentSeen as unknown as Prisma.InputJsonValue,
    },
  });
}

/** 컷씬 트리거 실행: 조건 확인 → 컷씬 데이터 반환 */
export async function triggerCutscene(
  userId: string,
  chapter: number,
  trigger: CutsceneTrigger,
): Promise<CutsceneData | null> {
  const csData = getCutscene(chapter, trigger);
  if (!csData) return null;

  // 시청 기록 저장
  await markCutsceneSeen(userId, csData.id);

  return csData;
}
