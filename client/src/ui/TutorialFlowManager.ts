/**
 * P28-06: 튜토리얼 플로우 개선
 *
 * 기존 TutorialManager를 확장하여 챕터 1 신규 플레이어 가이드 시퀀스 구현.
 * 이동 → 전투 → 퀘스트 → 인벤토리 → 상점 순서.
 * 스킵 옵션 + 진행률 저장.
 */

import * as Phaser from 'phaser';
import { getSpriteResourceForSkillIcon } from '../assets/spriteResourceManifest';

export const TUTORIAL_FLOW_UI_FRAME_TEXTURES = {
  panel: {
    key: 'ui_frame_tutorial_flow_panel',
    path: 'assets/generated/ui/frames/UI-HUD-005-DEF.png',
  },
  skipButton: {
    key: 'ui_frame_tutorial_flow_skip_button',
    path: 'assets/generated/ui/frames/UI-BTN-006-DEF.png',
  },
} as const;

const TUTORIAL_FLOW_EXPECTED_PANEL_FRAME_COUNT = 1;
const TUTORIAL_FLOW_EXPECTED_SKIP_BUTTON_FRAME_COUNT = 1;
const TUTORIAL_FLOW_SKIP_BUTTON_ICON_ID = 'skill_tg_haste';
const TUTORIAL_FLOW_EXPECTED_SKIP_BUTTON_ICON_COUNT = 1;
const TUTORIAL_FLOW_EXPECTED_TOTAL_FRAME_COUNT =
  TUTORIAL_FLOW_EXPECTED_PANEL_FRAME_COUNT + TUTORIAL_FLOW_EXPECTED_SKIP_BUTTON_FRAME_COUNT;

export function preloadTutorialFlowUiFrameTextures(scene: Phaser.Scene): void {
  for (const texture of Object.values(TUTORIAL_FLOW_UI_FRAME_TEXTURES)) {
    if (!scene.textures.exists(texture.key)) {
      scene.load.image(texture.key, texture.path);
    }
  }
  const skipButtonIconResource = getSpriteResourceForSkillIcon(TUTORIAL_FLOW_SKIP_BUTTON_ICON_ID);
  if (skipButtonIconResource && !scene.textures.exists(skipButtonIconResource.key)) {
    scene.load.image(skipButtonIconResource.key, skipButtonIconResource.path);
  }
}

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

interface TutorialFlowConfig {
  frameQa: boolean;
}

interface TutorialPanelContentBounds {
  insetX: number;
  insetTop: number;
  insetBottom: number;
  width: number;
  height: number;
  centerY: number;
}

// ─── TutorialFlowManager ─────────────────────────────────────────

export class TutorialFlowManager {
  private scene: Phaser.Scene;
  private config: TutorialFlowConfig;
  private currentStepIndex = 0;
  private isActive = false;
  private overlay: Phaser.GameObjects.Rectangle | null = null;
  private panel: Phaser.GameObjects.Container | null = null;
  private panelFrame: Phaser.GameObjects.Image | null = null;
  private skipButtonFrame: Phaser.GameObjects.Image | null = null;
  private skipButtonIcon: Phaser.GameObjects.Image | null = null;
  private skipButtonIconFallbackRendered = false;
  private panelContentBounds: TutorialPanelContentBounds | null = null;
  private renderedFrameKeys: string[] = [];
  private missingFrameKeys: string[] = [];
  private eventListeners: Array<() => void> = [];

  constructor(scene: Phaser.Scene, config?: Partial<TutorialFlowConfig>) {
    this.scene = scene;
    this.config = { frameQa: false, ...config };
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

  destroy(): void {
    this.cleanup();
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
    this.renderedFrameKeys = [];
    this.missingFrameKeys = [];
    this.panelFrame = null;
    this.skipButtonFrame = null;
    this.skipButtonIcon = null;
    this.skipButtonIconFallbackRendered = false;
    this.panelContentBounds = null;

    const step = TUTORIAL_STEPS[index];
    const { width, height } = this.scene.cameras.main;

    // 반투명 오버레이
    this.overlay = this.scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.5)
      .setDepth(9900).setScrollFactor(0).setInteractive();

    // 패널 컨테이너
    const panelW = 620;
    const panelH = 280;
    const px = width / 2;
    const py = height / 2;
    const panelTexture = TUTORIAL_FLOW_UI_FRAME_TEXTURES.panel;
    const hasPanelFrame = this.scene.textures.exists(panelTexture.key);
    const contentInset = hasPanelFrame
      ? { x: 78, top: 86, bottom: 60 }
      : { x: 28, top: 32, bottom: 32 };
    const contentW = panelW - contentInset.x * 2;
    const contentH = panelH - contentInset.top - contentInset.bottom;
    const contentCenterY = (contentInset.top - contentInset.bottom) / 2;
    const contentTopY = -panelH / 2 + contentInset.top;
    const contentBottomY = panelH / 2 - contentInset.bottom;
    const contentLeftX = -contentW / 2;
    const contentRightX = contentW / 2;
    this.panelContentBounds = {
      insetX: contentInset.x,
      insetTop: contentInset.top,
      insetBottom: contentInset.bottom,
      width: contentW,
      height: contentH,
      centerY: contentCenterY,
    };

    // Aseprite frame이 있으면 rectangle은 readability/hit layer로만 두고, 누락 시 기존 stroke panel로 fallback한다.
    const bg = this.scene.add.rectangle(0, 0, panelW, panelH, 0x1a1a2e, hasPanelFrame ? 0.18 : 0.95);
    if (hasPanelFrame) {
      this.panelFrame = this.scene.add.image(0, 0, panelTexture.key);
      this.panelFrame.setDisplaySize(panelW, panelH);
      this.panelFrame.setAlpha(0.9);
      this.renderedFrameKeys.push(panelTexture.key);
    } else {
      bg.setStrokeStyle(2, 0x00ccff);
      this.missingFrameKeys.push(panelTexture.key);
    }

    const contentScrim = this.scene.add.rectangle(
      0,
      contentCenterY,
      contentW,
      contentH,
      0x071120,
      hasPanelFrame ? 0.86 : 0,
    );

    const title = this.scene.add.text(contentLeftX + 12, contentTopY + 16, step.title, {
      fontSize: '22px', fontStyle: 'bold', color: '#7bdcff',
      fontFamily: 'NanumGothic, sans-serif',
      wordWrap: { width: contentW - 24 },
    }).setOrigin(0, 0.5);

    const desc = this.scene.add.text(0, contentCenterY + 4, step.description, {
      fontSize: '17px', color: '#e6edf5', wordWrap: { width: contentW - 24 },
      fontFamily: 'NanumGothic, sans-serif', lineSpacing: 5, align: 'center',
    }).setOrigin(0.5);

    // 진행률 표시
    const progress = this.scene.add.text(contentLeftX + 12, contentBottomY - 14,
      `${index + 1} / ${TUTORIAL_STEPS.length}`, {
        fontSize: '15px', color: '#8aa1b8', fontFamily: 'NanumGothic, sans-serif',
      }).setOrigin(0, 0.5);

    // 스킵 버튼
    const skipButtonTexture = TUTORIAL_FLOW_UI_FRAME_TEXTURES.skipButton;
    const skipButtonWidth = 126;
    const skipButtonHeight = 30;
    const skipButtonY = contentBottomY - 14;
    const skipButtonCenterX = contentRightX - 12 - skipButtonWidth / 2;
    const hasSkipButtonFrame = this.scene.textures.exists(skipButtonTexture.key);
    const skipButtonIconResource = getSpriteResourceForSkillIcon(TUTORIAL_FLOW_SKIP_BUTTON_ICON_ID);
    const hasSkipButtonIcon = Boolean(skipButtonIconResource && this.scene.textures.exists(skipButtonIconResource.key));
    let skipButtonFallbackFrame: Phaser.GameObjects.Rectangle | null = null;

    if (hasSkipButtonFrame) {
      this.skipButtonFrame = this.scene.add.image(skipButtonCenterX, skipButtonY, skipButtonTexture.key)
        .setDisplaySize(skipButtonWidth, skipButtonHeight)
        .setAlpha(0.86)
        .setInteractive({ useHandCursor: true });
      this.renderedFrameKeys.push(skipButtonTexture.key);
    } else {
      // Aseprite tutorial skip button frame 로드 실패 시에만 사용하는 안전 fallback.
      skipButtonFallbackFrame = this.scene.add.rectangle(
        skipButtonCenterX,
        skipButtonY,
        skipButtonWidth,
        skipButtonHeight,
        0x18253d,
        0.78,
      )
        .setStrokeStyle(1, 0x5b789c, 0.65)
        .setInteractive({ useHandCursor: true });
      this.missingFrameKeys.push(skipButtonTexture.key);
    }

    if (hasSkipButtonIcon && skipButtonIconResource) {
      this.skipButtonIcon = this.scene.add.image(skipButtonCenterX - 42, skipButtonY, skipButtonIconResource.key)
        .setName('tutorial_flow_skip_button_icon')
        .setInteractive({ useHandCursor: true });
      this.skipButtonIcon.setDisplaySize(16, 16);
      this.skipButtonIcon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    } else {
      this.skipButtonIconFallbackRendered = true;
    }

    const skipButtonLabel = hasSkipButtonIcon ? '스킵 ESC' : '[스킵] ESC';
    const skipButtonLabelX = hasSkipButtonIcon ? skipButtonCenterX + 12 : skipButtonCenterX;
    const skipBtn = this.scene.add.text(skipButtonLabelX, skipButtonY, skipButtonLabel, {
      fontSize: '15px', color: '#ff8b8b', fontFamily: 'NanumGothic, sans-serif',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    const setSkipButtonHover = (isHover: boolean): void => {
      skipBtn.setColor(isHover ? '#ffd0d0' : '#ff8b8b');
      if (this.skipButtonIcon) {
        if (isHover) {
          this.skipButtonIcon.setTint(0xffd6d6);
        } else {
          this.skipButtonIcon.clearTint();
        }
      }
      if (this.skipButtonFrame) {
        if (isHover) {
          this.skipButtonFrame.setTint(0xffd6d6);
        } else {
          this.skipButtonFrame.clearTint();
        }
      }
      if (skipButtonFallbackFrame) {
        skipButtonFallbackFrame.setFillStyle(isHover ? 0x223856 : 0x18253d, isHover ? 0.9 : 0.78);
      }
    };
    this.skipButtonFrame?.on('pointerdown', () => this.skip())
      .on('pointerover', () => setSkipButtonHover(true))
      .on('pointerout', () => setSkipButtonHover(false));
    skipButtonFallbackFrame?.on('pointerdown', () => this.skip())
      .on('pointerover', () => setSkipButtonHover(true))
      .on('pointerout', () => setSkipButtonHover(false));
    this.skipButtonIcon?.on('pointerdown', () => this.skip())
      .on('pointerover', () => setSkipButtonHover(true))
      .on('pointerout', () => setSkipButtonHover(false));
    skipBtn.on('pointerdown', () => this.skip());
    skipBtn.on('pointerover', () => setSkipButtonHover(true));
    skipBtn.on('pointerout', () => setSkipButtonHover(false));

    const panelChildren: Phaser.GameObjects.GameObject[] = [
      bg,
      contentScrim,
      title,
      desc,
      progress,
    ];
    if (this.panelFrame) panelChildren.splice(1, 0, this.panelFrame);
    if (this.skipButtonFrame) panelChildren.push(this.skipButtonFrame);
    if (skipButtonFallbackFrame) panelChildren.push(skipButtonFallbackFrame);
    if (this.skipButtonIcon) panelChildren.push(this.skipButtonIcon);
    panelChildren.push(skipBtn);

    this.panel = this.scene.add.container(px, py, panelChildren).setDepth(9901);

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
    this.writeFrameQaProbeIfEnabled('ready');
  }

  private setupTrigger(step: TutorialStep): void {
    // 키보드 컷오버: 모든 스텝에서 ESC 로 스킵(skipBtn 이 pointerdown 단독이라, 마우스 없이는 튜토리얼을
    //   탈출 못 하던 갭 보완). window keydown 이라 keyboardOnlyMode 의 canvas pointer-events:none 무관.
    const skipHandler = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') { event.preventDefault(); this.skip(); }
    };
    window.addEventListener('keydown', skipHandler);
    this.eventListeners.push(() => window.removeEventListener('keydown', skipHandler));

    switch (step.trigger) {
      case 'click': {
        // 마우스: overlay 클릭. 키보드: Enter/Space. keyboardOnlyMode 에선 canvas 차단으로 overlay
        //   pointerdown 이 안 와 키 경로가 없으면 첫 스텝부터 진행 불능(하드 softlock). key 케이스 패턴 재사용.
        this.overlay?.once('pointerdown', () => this.advanceStep());
        const advanceHandler = (event: KeyboardEvent): void => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            window.removeEventListener('keydown', advanceHandler);
            this.advanceStep();
          }
        };
        window.addEventListener('keydown', advanceHandler);
        this.eventListeners.push(() => window.removeEventListener('keydown', advanceHandler));
        break;
      }
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
    this.panelFrame = null;
    this.skipButtonFrame = null;
    this.skipButtonIcon = null;
    this.skipButtonIconFallbackRendered = false;
    this.panelContentBounds = null;
    this.eventListeners.forEach(fn => fn());
    this.eventListeners = [];
  }

  private cleanup(): void {
    this.clearPanel();
    this.isActive = false;
    this.writeFrameQaProbeIfEnabled('hidden');
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

  public writeFrameQaProbe(status: 'ready' | 'hidden' = 'ready'): void {
    if (typeof document === 'undefined' || !document.body) return;

    const step = TUTORIAL_STEPS[this.currentStepIndex] ?? null;
    const panelTexture = TUTORIAL_FLOW_UI_FRAME_TEXTURES.panel;
    const skipButtonTexture = TUTORIAL_FLOW_UI_FRAME_TEXTURES.skipButton;
    const skipButtonIconResource = getSpriteResourceForSkillIcon(TUTORIAL_FLOW_SKIP_BUTTON_ICON_ID);
    const missingSkipButtonIconKeys = this.skipButtonIcon || status === 'hidden'
      ? []
      : [skipButtonIconResource?.key ?? TUTORIAL_FLOW_SKIP_BUTTON_ICON_ID];
    document.body.dataset.aeternaTutorialFlowFrameQa = JSON.stringify({
      status,
      active: this.isActive,
      renderedFrameKeys: this.renderedFrameKeys,
      renderedFrameCount: this.renderedFrameKeys.length,
      expectedFrameCount: TUTORIAL_FLOW_EXPECTED_TOTAL_FRAME_COUNT,
      missingFrameKeys: this.missingFrameKeys,
      missingSkipButtonIconKeys,
      panelFrame: {
        key: panelTexture.key,
        path: panelTexture.path,
        renderedCount: this.panelFrame ? 1 : 0,
        expectedCount: TUTORIAL_FLOW_EXPECTED_PANEL_FRAME_COUNT,
        rendered: this.panelFrame !== null,
        displayWidth: this.panelFrame?.displayWidth ?? 0,
        displayHeight: this.panelFrame?.displayHeight ?? 0,
      },
      skipButtonFrame: {
        key: skipButtonTexture.key,
        path: skipButtonTexture.path,
        renderedCount: this.skipButtonFrame ? 1 : 0,
        expectedCount: TUTORIAL_FLOW_EXPECTED_SKIP_BUTTON_FRAME_COUNT,
        displayWidth: this.skipButtonFrame?.displayWidth ?? 0,
        displayHeight: this.skipButtonFrame?.displayHeight ?? 0,
      },
      skipButtonIcon: {
        key: skipButtonIconResource?.key ?? null,
        path: skipButtonIconResource?.path ?? null,
        iconId: TUTORIAL_FLOW_SKIP_BUTTON_ICON_ID,
        renderedCount: this.skipButtonIcon ? 1 : 0,
        expectedCount: TUTORIAL_FLOW_EXPECTED_SKIP_BUTTON_ICON_COUNT,
        rendered: this.skipButtonIcon !== null,
        displayWidth: this.skipButtonIcon?.displayWidth ?? 0,
        displayHeight: this.skipButtonIcon?.displayHeight ?? 0,
        fallbackRendered: this.skipButtonIconFallbackRendered,
      },
      panelContentBounds: this.panelContentBounds,
      panelVisible: this.panel?.visible ?? false,
      currentStepIndex: this.currentStepIndex,
      currentStepId: step?.id ?? null,
      trigger: step?.trigger ?? null,
      visibleCanvasCount: document.querySelectorAll('canvas').length,
    });
  }

  private isFrameQaRoute(): boolean {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('tutorialFlowFrameQa') === '1';
  }

  private writeFrameQaProbeIfEnabled(status: 'ready' | 'hidden'): void {
    if (this.config.frameQa || this.isFrameQaRoute()) {
      this.writeFrameQaProbe(status);
    }
  }
}
