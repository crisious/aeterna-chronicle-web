/**
 * P28-06: 튜토리얼 플로우 개선
 *
 * 기존 TutorialManager를 확장하여 챕터 1 신규 플레이어 가이드 시퀀스 구현.
 * 이동 → 전투 → 퀘스트 → 인벤토리 → 상점 순서.
 * 스킵 옵션 + 진행률 저장.
 */

import * as Phaser from 'phaser';

// ─── 튜토리얼 스텝 정의 ─────────────────────────────────────────

export type TutorialStepId =
  | 'welcome'
  | 'movement_wasd'
  | 'movement_click'
  | 'interact_npc'
  | 'combat_basic'
  | 'combat_skill'
  | 'combat_atb'
  | 'quest_accept'
  | 'quest_track'
  | 'quest_complete'
  | 'inventory_open'
  | 'inventory_equip'
  | 'shop_open'
  | 'shop_buy'
  | 'minimap_intro'
  | 'tutorial_complete';

export interface TutorialStep {
  id: TutorialStepId;
  title: string;
  description: string;
  /** 하이라이트할 UI 영역 (null이면 전체 화면 중앙) */
  highlightTarget?: { x: number; y: number; width: number; height: number };
  /** 다음 스텝으로 넘어가는 트리거 */
  trigger: 'click' | 'key' | 'auto' | 'event';
  /** trigger=key 일 때 대기하는 키 */
  triggerKey?: string;
  /** trigger=event 일 때 대기하는 이벤트명 */
  triggerEvent?: string;
  /** 자동 진행 딜레이 (ms) */
  autoDelayMs?: number;
  /** 화살표 방향 */
  arrowDirection?: 'up' | 'down' | 'left' | 'right';
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    title: '에테르나 크로니클에 오신 것을 환영합니다',
    description: '당신은 에리언 — 잊혀진 기억을 되살릴 수 있는 마지막 기억술사입니다.\n클릭하여 계속합니다.',
    trigger: 'click',
  },
  {
    id: 'movement_wasd',
    title: '이동 — WASD',
    description: 'WASD 키 또는 방향키로 캐릭터를 이동할 수 있습니다.\nW/↑ = 위, S/↓ = 아래, A/← = 왼쪽, D/→ = 오른쪽',
    trigger: 'key',
    triggerKey: 'W',
  },
  {
    id: 'movement_click',
    title: '이동 — 클릭 이동',
    description: '맵의 원하는 위치를 클릭하면 자동으로 이동합니다.',
    trigger: 'click',
  },
  {
    id: 'interact_npc',
    title: 'NPC 대화',
    description: 'NPC 근처에서 Space 또는 클릭으로 대화할 수 있습니다.\n노란 느낌표(!)가 있는 NPC에게 다가가보세요.',
    trigger: 'event',
    triggerEvent: 'npc_interact',
    arrowDirection: 'down',
  },
  {
    id: 'combat_basic',
    title: '전투 — 기본 공격',
    description: '적과 조우하면 전투가 시작됩니다.\nSpace 또는 클릭으로 기본 공격을 할 수 있습니다.',
    trigger: 'event',
    triggerEvent: 'combat_start',
  },
  {
    id: 'combat_skill',
    title: '전투 — 스킬 사용',
    description: '숫자 키 1~4로 스킬을 사용할 수 있습니다.\n스킬에는 쿨다운과 마나 소모가 있습니다.',
    trigger: 'event',
    triggerEvent: 'skill_used',
  },
  {
    id: 'combat_atb',
    title: '전투 — ATB 게이지',
    description: 'ATB(Active Time Battle) 게이지가 차면 행동할 수 있습니다.\n속도 스탯이 높을수록 게이지가 빨리 찹니다.',
    trigger: 'event',
    triggerEvent: 'combat_end',
  },
  {
    id: 'quest_accept',
    title: '퀘스트 수락',
    description: 'NPC와 대화 중 퀘스트를 수락할 수 있습니다.\n퀘스트는 경험치, 골드, 아이템을 보상으로 줍니다.',
    trigger: 'event',
    triggerEvent: 'quest_accepted',
    arrowDirection: 'right',
  },
  {
    id: 'quest_track',
    title: '퀘스트 추적',
    description: '화면 우측의 퀘스트 트래커에서 진행 상황을 확인할 수 있습니다.\nJ 키로 퀘스트 목록을 열 수 있습니다.',
    trigger: 'click',
    arrowDirection: 'right',
  },
  {
    id: 'quest_complete',
    title: '퀘스트 완료',
    description: '퀘스트 목표를 달성한 후 NPC에게 돌아가면 보상을 받습니다.',
    trigger: 'event',
    triggerEvent: 'quest_completed',
  },
  {
    id: 'inventory_open',
    title: '인벤토리',
    description: 'I 키를 눌러 인벤토리를 열 수 있습니다.\n획득한 아이템과 장비를 확인해보세요.',
    trigger: 'key',
    triggerKey: 'I',
    arrowDirection: 'down',
  },
  {
    id: 'inventory_equip',
    title: '장비 장착',
    description: '인벤토리에서 장비를 더블클릭하면 장착됩니다.\n장비를 장착하면 캐릭터의 능력치가 올라갑니다.',
    trigger: 'event',
    triggerEvent: 'item_equipped',
  },
  {
    id: 'shop_open',
    title: '상점',
    description: '상점 NPC와 대화하면 아이템을 사고 팔 수 있습니다.\n포션과 장비를 구입해보세요.',
    trigger: 'event',
    triggerEvent: 'shop_opened',
  },
  {
    id: 'shop_buy',
    title: '상점 — 구매',
    description: '원하는 아이템을 클릭하고 "구매" 버튼을 누르세요.\n골드가 부족하면 몬스터를 사냥하여 벌 수 있습니다.',
    trigger: 'event',
    triggerEvent: 'shop_purchase',
  },
  {
    id: 'minimap_intro',
    title: '미니맵',
    description: '화면 우상단의 미니맵에서 주변 지형과 NPC 위치를 확인할 수 있습니다.\nM 키로 월드맵을 열 수 있습니다.',
    trigger: 'click',
    arrowDirection: 'up',
  },
  {
    id: 'tutorial_complete',
    title: '튜토리얼 완료!',
    description: '기본적인 조작을 모두 배웠습니다.\n이제 에레보스를 탐험하며 잊혀진 기억을 되찾으세요!\n\n행운을 빕니다, 에리언.',
    trigger: 'click',
  },
];

// ─── 저장 키 ─────────────────────────────────────────────────────

const TUTORIAL_STORAGE_KEY = 'aeterna_tutorial_progress';

interface TutorialSaveData {
  completed: boolean;
  lastStepIndex: number;
  skipped: boolean;
}

// ─── TutorialFlowManager ─────────────────────────────────────────

export class TutorialFlowManager {
  private scene: Phaser.Scene;
  private currentStepIndex = 0;
  private isActive = false;
  private overlay: Phaser.GameObjects.Rectangle | null = null;
  private panel: Phaser.GameObjects.Container | null = null;
  private eventListeners: Array<() => void> = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * 튜토리얼 시작 (이전 진행률 복원)
   */
  start(): void {
    const saved = this.loadProgress();
    if (saved.completed || saved.skipped) {
      console.info('[Tutorial] 이미 완료/스킵됨, 건너뜀');
      return;
    }

    this.currentStepIndex = saved.lastStepIndex;
    this.isActive = true;
    this.showStep(this.currentStepIndex);
  }

  /**
   * 튜토리얼 스킵
   */
  skip(): void {
    this.saveProgress({ completed: false, lastStepIndex: this.currentStepIndex, skipped: true });
    this.cleanup();
    this.scene.events.emit('tutorial:skipped');
  }

  /**
   * 외부 이벤트 트리거 (게임 시스템에서 호출)
   */
  triggerEvent(eventName: string): void {
    if (!this.isActive) return;
    const step = TUTORIAL_STEPS[this.currentStepIndex];
    if (step?.trigger === 'event' && step.triggerEvent === eventName) {
      this.advanceStep();
    }
  }

  private showStep(index: number): void {
    if (index >= TUTORIAL_STEPS.length) {
      this.completeTutorial();
      return;
    }

    this.clearPanel();
    const step = TUTORIAL_STEPS[index];
    const { width, height } = this.scene.cameras.main;

    // 반투명 오버레이
    this.overlay = this.scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.5)
      .setDepth(9900).setScrollFactor(0).setInteractive();

    // 패널 컨테이너
    const panelW = 420;
    const panelH = 200;
    const px = width / 2;
    const py = height / 2;

    const bg = this.scene.add.rectangle(0, 0, panelW, panelH, 0x1a1a2e, 0.95)
      .setStrokeStyle(2, 0x00ccff);

    const title = this.scene.add.text(0, -panelH / 2 + 25, step.title, {
      fontSize: '18px', fontStyle: 'bold', color: '#00ccff',
      fontFamily: 'NanumGothic, sans-serif',
    }).setOrigin(0.5);

    const desc = this.scene.add.text(0, 0, step.description, {
      fontSize: '14px', color: '#cccccc', wordWrap: { width: panelW - 40 },
      fontFamily: 'NanumGothic, sans-serif', lineSpacing: 6,
    }).setOrigin(0.5);

    // 진행률 표시
    const progress = this.scene.add.text(0, panelH / 2 - 25,
      `${index + 1} / ${TUTORIAL_STEPS.length}`, {
        fontSize: '12px', color: '#666666', fontFamily: 'NanumGothic, sans-serif',
      }).setOrigin(0.5);

    // 스킵 버튼
    const skipBtn = this.scene.add.text(panelW / 2 - 15, -panelH / 2 + 15, '[스킵]', {
      fontSize: '12px', color: '#ff6666', fontFamily: 'NanumGothic, sans-serif',
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    skipBtn.on('pointerdown', () => this.skip());

    this.panel = this.scene.add.container(px, py, [bg, title, desc, progress, skipBtn])
      .setDepth(9901);

    // 등장 애니메이션
    this.panel.setAlpha(0).setScale(0.9);
    this.scene.tweens.add({
      targets: this.panel,
      alpha: 1, scaleX: 1, scaleY: 1,
      duration: 250, ease: 'Back.easeOut',
    });

    // 트리거 설정
    this.setupTrigger(step);
    this.saveProgress({ completed: false, lastStepIndex: index, skipped: false });
  }

  private setupTrigger(step: TutorialStep): void {
    switch (step.trigger) {
      case 'click':
        this.overlay?.once('pointerdown', () => this.advanceStep());
        break;
      case 'key':
        if (step.triggerKey) {
          const handler = (event: KeyboardEvent) => {
            if (event.key.toUpperCase() === step.triggerKey!.toUpperCase()) {
              window.removeEventListener('keydown', handler);
              this.advanceStep();
            }
          };
          window.addEventListener('keydown', handler);
          this.eventListeners.push(() => window.removeEventListener('keydown', handler));
        }
        break;
      case 'auto':
        this.scene.time.delayedCall(step.autoDelayMs ?? 3000, () => this.advanceStep());
        break;
      case 'event':
        // triggerEvent()로 외부에서 호출
        break;
    }
  }

  private advanceStep(): void {
    this.currentStepIndex++;
    this.showStep(this.currentStepIndex);
  }

  private completeTutorial(): void {
    this.saveProgress({ completed: true, lastStepIndex: TUTORIAL_STEPS.length, skipped: false });
    this.cleanup();
    this.scene.events.emit('tutorial:completed');
    console.info('[Tutorial] 튜토리얼 완료');
  }

  private clearPanel(): void {
    this.overlay?.destroy();
    this.overlay = null;
    this.panel?.destroy();
    this.panel = null;
    this.eventListeners.forEach(fn => fn());
    this.eventListeners = [];
  }

  private cleanup(): void {
    this.clearPanel();
    this.isActive = false;
  }

  private loadProgress(): TutorialSaveData {
    try {
      const raw = localStorage.getItem(TUTORIAL_STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch { /* ignore */ }
    return { completed: false, lastStepIndex: 0, skipped: false };
  }

  private saveProgress(data: TutorialSaveData): void {
    try {
      localStorage.setItem(TUTORIAL_STORAGE_KEY, JSON.stringify(data));
    } catch { /* ignore */ }
  }
}
