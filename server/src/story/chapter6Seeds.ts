/**
 * chapter6Seeds.ts — 챕터 6 "깨어나는 봉인" 데이터 시드 (P8-12)
 *
 * 씬 6-1 ~ 6-6 대화 노드 + 컷씬 ID + 퀘스트 연동
 */

import { prisma } from '../db';

// ─── 타입 정의 ──────────────────────────────────────────────────

interface SceneData {
  sceneId: string;
  sceneName: string;
  chapter: number;
  order: number;
  requiredLevel: number;
  location: string;
  cutsceneIds: string[];
  questTriggers: string[];
  dialogueNodes: DialogueNode[];
  choices?: ChoiceNode[];
}

interface DialogueNode {
  id: string;
  speaker: string;
  text: string;
  portrait?: string;
  voiceKey?: string;
  next?: string;
}

interface ChoiceNode {
  parentNodeId: string;
  options: {
    id: string;
    text: string;
    flag: string;
    flagValue: string | boolean;
    nextNodeId: string;
    condition?: { flag: string; value: string | boolean };
  }[];
}

// ─── 챕터 6 씬 데이터 ──────────────────────────────────────────

export const CHAPTER_6_SCENES: SceneData[] = [
  {
    sceneId: 'CH6_S01', sceneName: '안개의 경고', chapter: 6, order: 1,
    requiredLevel: 80, location: 'argentium_guild',
    cutsceneIds: ['CS_CH6_S01'],
    questTriggers: ['QST_CH6_01_INVESTIGATE_FOG'],
    dialogueNodes: [
      { id: 'CH6_S01_001', speaker: '나레이션', text: '아르겐티움 중앙광장. 서쪽에서 비정상적 안개가 피어오른다.' },
      { id: 'CH6_S01_002', speaker: '마테우스', text: '서쪽 전초기지에서 연락이 끊겼다. 3일 전부터.', portrait: 'mateus_serious' },
      { id: 'CH6_S01_003', speaker: '마테우스', text: '안개가 점점 내륙으로 밀려오고 있다.' },
      { id: 'CH6_S01_004', speaker: '세라핀', text: '이건... 레테의 잔향이야. 200년 만에 처음이다.', portrait: 'seraphin_worried' },
      { id: 'CH6_S01_005', speaker: '에리언', text: '봉인이 약해지고 있는 건가요?', portrait: 'erion_concerned' },
      { id: 'CH6_S01_006', speaker: '세라핀', text: '약해지는 정도가 아니야. 풀리고 있어.', portrait: 'seraphin_grim' },
      { id: 'CH6_S01_007', speaker: '나레이션', text: '길드에 전령이 도착한다. 브리탈리아 방면에서 선원 3명이 기억을 잃은 채 표류.' },
      { id: 'CH6_S01_008', speaker: '마테우스', text: '에리언. 네가 가야 한다. 파편 4개를 모은 사람은 너뿐이야.', portrait: 'mateus_determined' },
    ],
    choices: [{
      parentNodeId: 'CH6_S01_008',
      options: [
        { id: 'CH6_S01_C01', text: '알겠습니다. 준비하겠습니다.', flag: 'ch6_eager', flagValue: true, nextNodeId: 'CH6_S01_010' },
        { id: 'CH6_S01_C02', text: '위험하지 않습니까?', flag: 'ch6_cautious', flagValue: true, nextNodeId: 'CH6_S01_011' },
      ],
    }],
  },
  {
    sceneId: 'CH6_S02', sceneName: '브리탈리아의 증언', chapter: 6, order: 2,
    requiredLevel: 80, location: 'britallia_harbor',
    cutsceneIds: ['CS_CH6_S02'],
    questTriggers: ['QST_CH6_02_SAIL_TO_MIST_SEA'],
    dialogueNodes: [
      { id: 'CH6_S02_001', speaker: '나레이션', text: '브리탈리아 항구. 안개에 반쯤 잠겨 100m 앞도 안 보인다.' },
      { id: 'CH6_S02_002', speaker: '선원 A', text: '... 바다 한가운데... 섬이 있었어... 빛나는 기둥이... 부서지는 소리...', portrait: 'sailor_empty' },
      { id: 'CH6_S02_003', speaker: '에리언', text: '이 사람의 기억 속에 뭔가 남아 있어요. 봉인의 잔상?', portrait: 'erion_focus' },
      { id: 'CH6_S02_004', speaker: '세라핀', text: '봉인의 에코다. 12인의 봉인이 깨질 때 주변 생명체의 기억에 각인되는 현상.', portrait: 'seraphin_explain' },
      { id: 'CH6_S02_005', speaker: '나레이션', text: '에리언이 선원의 기억에서 좌표를 추출 — 안개해 중앙, "봉인의 첨탑" 위치.' },
      { id: 'CH6_S02_006', speaker: '니콜라스', text: '그 바다에 가겠다고? 미친 짓이야. 돌아온 배가 없어.', portrait: 'nicholas_worried' },
      { id: 'CH6_S02_007', speaker: '에리언', text: '돌아온 배가 없었던 건 돌아올 이유가 없었기 때문이에요. 우리는 달라요.', portrait: 'erion_determined' },
    ],
  },
  {
    sceneId: 'CH6_S03', sceneName: '안개해 항해', chapter: 6, order: 3,
    requiredLevel: 82, location: 'mist_sea_voyage',
    cutsceneIds: ['CS_CH6_S03'],
    questTriggers: ['QST_CH6_03_REACH_LIGHTHOUSE'],
    dialogueNodes: [
      { id: 'CH6_S03_001', speaker: '나레이션', text: '에테르 동력선으로 안개해 진입. 안개가 짙어질수록 파티원의 단기 기억이 흐려진다.' },
      { id: 'CH6_S03_002', speaker: '다르크', text: '... 뭐하러 여기 온 거였지?', portrait: 'darc_confused' },
      { id: 'CH6_S03_003', speaker: '에리언', text: '다르크, 정신 차려. 내 목소리에 집중해.', portrait: 'erion_urgent' },
      { id: 'CH6_S03_004', speaker: '나레이션', text: '안개 속에서 거대한 그림자들이 움직인다 — 안개해 고유 몬스터.' },
      { id: 'CH6_S03_006', speaker: '나레이션', text: '3일간의 항해 끝에 첫 번째 섬 발견 — "기억의 등대".' },
      { id: 'CH6_S03_007', speaker: '세라핀', text: '여기... 봉인자 제3번 \'메모리아\'가 봉인을 세운 곳이야. 내가 개인적으로 알던 사람이었어.', portrait: 'seraphin_nostalgic' },
    ],
  },
  {
    sceneId: 'CH6_S04', sceneName: '봉인의 첨탑', chapter: 6, order: 4,
    requiredLevel: 84, location: 'seal_spire',
    cutsceneIds: ['CS_CH6_S04'],
    questTriggers: ['QST_CH6_04_MEET_DESCENDANTS'],
    dialogueNodes: [
      { id: 'CH6_S04_001', speaker: '나레이션', text: '첨탑에 도달. 거대한 수정 기둥 3개가 균열이 가 있다.' },
      { id: 'CH6_S04_002', speaker: '루미나', text: '우리는 봉인자의 후손이다. 200년간 이곳을 지켜왔다.', portrait: 'lumina_elder' },
      { id: 'CH6_S04_003', speaker: '루미나', text: '하지만... 더 이상 버틸 수 없다.' },
      { id: 'CH6_S04_004', speaker: '에리언', text: '봉인을 고칠 방법이 있나요?', portrait: 'erion_hopeful' },
      { id: 'CH6_S04_005', speaker: '루미나', text: '고치는 것은 불가능하다. 봉인은 일방향이야.' },
      { id: 'CH6_S04_006', speaker: '루미나', text: '하지만... \'기억 파괴\'로 레테의 침투를 차단할 수는 있다.' },
      { id: 'CH6_S04_007', speaker: '세라핀', text: '기억 파괴? 그건 금기야!', portrait: 'seraphin_shocked' },
      { id: 'CH6_S04_008', speaker: '루미나', text: '자신의 기억을 파괴해서 에너지로 변환하는 기술이야.' },
    ],
    choices: [{
      parentNodeId: 'CH6_S04_008',
      options: [
        { id: 'CH6_S04_C01', text: '배우겠습니다.', flag: 'ch6_accept_memory_destroy', flagValue: true, nextNodeId: 'CH6_S04_010' },
        { id: 'CH6_S04_C02', text: '다른 방법은 없나요?', flag: 'ch6_hesitate', flagValue: true, nextNodeId: 'CH6_S04_011' },
        { id: 'CH6_S04_C03', text: '봉인을 부수면 어떻게 되나요?', flag: 'ch6_hidden_destroy', flagValue: true, nextNodeId: 'CH6_S04_012', condition: { flag: 'ch5_dark_ending', value: true } },
      ],
    }],
  },
  {
    sceneId: 'CH6_S05', sceneName: '기억의 대가', chapter: 6, order: 5,
    requiredLevel: 86, location: 'seal_spire_training',
    cutsceneIds: ['CS_CH6_S05'],
    questTriggers: ['QST_CH6_05_TRAINING_COMPLETE'],
    dialogueNodes: [
      { id: 'CH6_S05_001', speaker: '나레이션', text: '루미나의 가르침 아래 에리언이 기억 파괴를 시도.' },
      { id: 'CH6_S05_004', speaker: '에리언', text: '뭔가가... 빠졌어요. 어릴 때 먹었던 어머니의 수프 맛이... 기억나지 않아요.', portrait: 'erion_shocked' },
      { id: 'CH6_S05_005', speaker: '루미나', text: '돌아오지 않는다. 한 번 파괴된 기억은 영원히 사라져.', portrait: 'lumina_solemn' },
      { id: 'CH6_S05_006', speaker: '세라핀', text: '그만둬. 이건 너무—', portrait: 'seraphin_pleading' },
      { id: 'CH6_S05_007', speaker: '에리언', text: '아니요. 세계의 기억을 지키려면... 내 기억 정도는.', portrait: 'erion_resolved' },
    ],
    choices: [{
      parentNodeId: 'CH6_S05_007',
      options: [
        { id: 'CH6_S05_C01', text: '더 많은 기억을 바치겠습니다.', flag: 'ch6_training_aggressive', flagValue: true, nextNodeId: 'CH6_S05_END' },
        { id: 'CH6_S05_C02', text: '최소한만 배우겠습니다.', flag: 'ch6_training_minimal', flagValue: true, nextNodeId: 'CH6_S05_END' },
      ],
    }],
  },
  {
    sceneId: 'CH6_S06', sceneName: '첫 번째 봉인 수복', chapter: 6, order: 6,
    requiredLevel: 88, location: 'seal_spire_pillar_1',
    cutsceneIds: ['CS_CH6_S06_PRE', 'CS_CH6_S06_END'],
    questTriggers: ['QST_CH6_06_RESTORE_SEAL'],
    dialogueNodes: [
      { id: 'CH6_S06_001', speaker: '나레이션', text: '에리언이 기억 파괴 에너지를 모아 균열 난 봉인석에 주입.' },
      { id: 'CH6_S06_002', speaker: '나레이션', text: '레테의 침투가 역전되기 시작하자 — 안개가 응축되어 형태를 취한다.' },
      { id: 'CH6_S06_003', speaker: '봉인 탐식자', text: '... 기억을... 돌려놔... 내... 기억을...', portrait: 'seal_devourer' },
      { id: 'CH6_S06_010', speaker: '나레이션', text: '전투 후 에리언 승리. 제1 봉인석 수복 완료.' },
      { id: 'CH6_S06_011', speaker: '루미나', text: '12개 중 1개. 남은 건 11개... 그리고 너의 기억도 많지 않아.', portrait: 'lumina_weary' },
      { id: 'CH6_S06_012', speaker: '에리언', text: '그래도 중요한 건 기억하고 있어요. 왜 여기 왔는지. 누구를 지키려는지.', portrait: 'erion_smile' },
      { id: 'CH6_S06_013', speaker: '나레이션', text: '에리언이 하늘을 올려다본다. 안개가 조금 걷혔다. 첫 번째 별이 보인다.' },
      { id: 'CH6_S06_014', speaker: '세라핀', text: '첫 번째 별이야.', portrait: 'seraphin_gentle' },
      { id: 'CH6_S06_015', speaker: '에리언', text: '네. 200년 만에 안개해에서 본 첫 번째 별이에요.', portrait: 'erion_smile_tears' },
    ],
  },
];

// ─── 시드 함수 ──────────────────────────────────────────────────

export async function seedChapter6(): Promise<{ scenes: number }> {
  // 메타데이터를 JSON으로 CodexEntry에 등록 (챕터 스크립트 데이터)
  for (const scene of CHAPTER_6_SCENES) {
    await prisma.codexEntry.upsert({
      where: { code: scene.sceneId },
      update: {
        category: 'chapter_script',
        title: `[CH6] ${scene.sceneName}`,
        content: JSON.stringify(scene),
      },
      create: {
        code: scene.sceneId,
        category: 'chapter_script',
        title: `[CH6] ${scene.sceneName}`,
        content: JSON.stringify(scene),
        unlockCondition: { chapter: 6, order: scene.order },
      },
    });
  }

  return { scenes: CHAPTER_6_SCENES.length };
}
