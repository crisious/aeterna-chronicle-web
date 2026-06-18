/**
 * CutsceneScene.ts — Phaser 컷씬 씬 (P6-10)
 *
 * 역할:
 *   - 배경 이미지 + 캐릭터 포트레이트 표시
 *   - 대화 자동 진행 (딜레이 기반)
 *   - 스킵/다음 버튼
 *   - 대화 완료 시 원래 씬으로 복귀
 */

import * as Phaser from 'phaser';
import { getSpriteResourceForSkillIcon } from '../assets/spriteResourceManifest';

// ── 타입 정의 ──────────────────────────────────────────────────

interface CutsceneDialogue {
  speaker: string;
  portrait?: string;
  text: string;
  emotion?: string;
  delay?: number;
}

interface CutsceneConfig {
  id: string;
  title: string;
  background: string;
  bgm: string;
  characters: string[];
  dialogue: CutsceneDialogue[];
  returnScene: string;      // 컷씬 종료 후 돌아갈 씬 키
  returnData?: unknown;     // 복귀 씬에 전달할 데이터
}

const CUTSCENE_UI_FRAME_TEXTURES = {
  dialogueBox: {
    key: 'ui_frame_UI-HUD-006-DEF',
    path: 'assets/generated/ui/frames/UI-HUD-006-DEF.png',
  },
  actionButton: {
    key: 'ui_frame_cutscene_action_button',
    path: 'assets/generated/ui/frames/UI-BTN-006-DEF.png',
  },
} as const;

const CUTSCENE_ACTION_BUTTON_ICON_IDS = {
  skip: 'skill_tg_haste',
  next: 'skill_mw_arrow',
} as const;

const CUTSCENE_PORTRAIT_TEXTURES = {
  narrator: {
    key: 'npc_portrait_18_memory_fragment_portrait',
    path: 'assets/generated/characters/npc/npc_portrait_18_memory_fragment_portrait.png',
  },
  etherKnight: {
    key: 'char_illust_ether_knight_front',
    path: 'assets/generated/characters/class_main/char_illust_ether_knight_front.png',
  },
  memoryWeaver: {
    key: 'char_illust_memory_weaver_front',
    path: 'assets/generated/characters/class_main/char_illust_memory_weaver_front.png',
  },
  shadowWeaver: {
    key: 'char_illust_shadow_weaver_front',
    path: 'assets/generated/characters/class_main/char_illust_shadow_weaver_front.png',
  },
  memoryBreaker: {
    key: 'char_illust_memory_breaker_front',
    path: 'assets/generated/characters/class_main/char_illust_memory_breaker_front.png',
  },
  timeGuardian: {
    key: 'char_illust_time_guardian_front',
    path: 'assets/generated/characters/class_main/char_illust_time_guardian_front.png',
  },
  voidWanderer: {
    key: 'char_illust_void_wanderer_front',
    path: 'assets/generated/characters/class_main/char_illust_void_wanderer_front.png',
  },
} as const;

const CUTSCENE_PORTRAIT_KEYS = {
  narrator: 'npc_portrait_18_memory_fragment_portrait',
  '내레이터': 'npc_portrait_18_memory_fragment_portrait',
  etherKnight: 'char_illust_ether_knight_front',
  memoryWeaver: 'char_illust_memory_weaver_front',
  shadowWeaver: 'char_illust_shadow_weaver_front',
  memoryBreaker: 'char_illust_memory_breaker_front',
  timeGuardian: 'char_illust_time_guardian_front',
  voidWanderer: 'char_illust_void_wanderer_front',
} as const;

const CUTSCENE_LEGACY_PORTRAIT_KEY_MAP: Record<string, string> = {
  portrait_narrator: CUTSCENE_PORTRAIT_KEYS.narrator,
  portrait_ether_knight: CUTSCENE_PORTRAIT_KEYS.etherKnight,
  portrait_memory_weaver: CUTSCENE_PORTRAIT_KEYS.memoryWeaver,
  portrait_shadow_weaver: CUTSCENE_PORTRAIT_KEYS.shadowWeaver,
  portrait_guardian: CUTSCENE_PORTRAIT_KEYS.timeGuardian,
  portrait_destroyer: CUTSCENE_PORTRAIT_KEYS.memoryBreaker,
  portrait_ether_berserker: CUTSCENE_PORTRAIT_KEYS.etherKnight,
  portrait_memory_weaver_adv: CUTSCENE_PORTRAIT_KEYS.memoryWeaver,
  portrait_time_tuner: CUTSCENE_PORTRAIT_KEYS.timeGuardian,
  portrait_memory_lord: CUTSCENE_PORTRAIT_KEYS.memoryWeaver,
  portrait_illusionist: CUTSCENE_PORTRAIT_KEYS.shadowWeaver,
  portrait_soul_reaper: CUTSCENE_PORTRAIT_KEYS.shadowWeaver,
  portrait_void_lord: CUTSCENE_PORTRAIT_KEYS.voidWanderer,
};

type CutsceneActionButtonId = keyof typeof CUTSCENE_ACTION_BUTTON_ICON_IDS;

const CUTSCENE_EXPECTED_DIALOGUE_BOX_FRAME_COUNT = 1;
const CUTSCENE_EXPECTED_ACTION_BUTTON_FRAME_COUNT = 2;
const CUTSCENE_EXPECTED_ACTION_BUTTON_ICON_COUNT = 2;
const CUTSCENE_PRELOAD_PORTRAIT_TEXTURE_COUNT = 7;
const CUTSCENE_EXPECTED_PORTRAIT_COUNT = 1;

// ── 컷씬 씬 ─────────────────────────────────────────────────────

export class CutsceneScene extends Phaser.Scene {
  private config!: CutsceneConfig;
  private currentIndex = 0;
  private dialogueBox!: Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle;
  private actionButtonFrames: Phaser.GameObjects.Image[] = [];
  private actionButtonIcons: Partial<Record<CutsceneActionButtonId, Phaser.GameObjects.Image>> = {};
  private actionButtonFallbackIds: CutsceneActionButtonId[] = [];
  private speakerText!: Phaser.GameObjects.Text;
  private bodyText!: Phaser.GameObjects.Text;
  private skipButton!: Phaser.GameObjects.Text;
  private nextButton!: Phaser.GameObjects.Text;
  private titleText!: Phaser.GameObjects.Text;
  private autoTimer?: Phaser.Time.TimerEvent;
  private isAutoPlay = false;
  private portraitSprite?: Phaser.GameObjects.Image;
  private cutscenePortraitImages: Phaser.GameObjects.Image[] = [];
  private missingCutscenePortraitKeys: string[] = [];

  constructor() {
    super({ key: 'CutsceneScene' });
  }

  init(data: CutsceneConfig): void {
    this.config = data;
    this.currentIndex = 0;
    this.isAutoPlay = false;
  }

  preload(): void {
    for (const texture of Object.values(CUTSCENE_UI_FRAME_TEXTURES)) {
      if (!this.textures.exists(texture.key)) {
        this.load.image(texture.key, texture.path);
      }
    }

    for (const iconId of Object.values(CUTSCENE_ACTION_BUTTON_ICON_IDS)) {
      const iconResource = getSpriteResourceForSkillIcon(iconId);
      if (iconResource && !this.textures.exists(iconResource.key)) {
        this.load.image(iconResource.key, iconResource.path);
      }
    }

    for (const portrait of Object.values(CUTSCENE_PORTRAIT_TEXTURES)) {
      if (!this.textures.exists(portrait.key)) {
        this.load.image(portrait.key, portrait.path);
      }
    }
  }

  create(): void {
    const { width, height } = this.cameras.main;
    this.actionButtonFrames = [];
    this.actionButtonIcons = {};
    this.actionButtonFallbackIds = [];
    this.cutscenePortraitImages = [];
    this.missingCutscenePortraitKeys = [];

    // ── 배경 ──
    // 배경 이미지가 로드되어 있으면 사용, 아니면 검정 배경
    if (this.textures.exists(this.config.background)) {
      this.add.image(width / 2, height / 2, this.config.background)
        .setDisplaySize(width, height);
    } else {
      this.cameras.main.setBackgroundColor('#000000');
    }

    // ── 타이틀 (페이드인) ──
    this.titleText = this.add.text(width / 2, height * 0.15, this.config.title, {
      fontSize: '32px',
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5).setAlpha(0);

    this.tweens.add({
      targets: this.titleText,
      alpha: 1,
      duration: 1000,
      ease: 'Power2',
      onComplete: () => {
        // 2초 후 타이틀 페이드아웃
        this.time.delayedCall(2000, () => {
          this.tweens.add({
            targets: this.titleText,
            alpha: 0,
            duration: 500,
          });
        });
      },
    });

    // ── 대화 박스 (하단) ──
    const boxHeight = height * 0.3;
    const boxY = height - boxHeight;

    this.dialogueBox = this._addCutsceneFrame(
      width / 2,
      boxY + boxHeight / 2,
      width - 40,
      boxHeight - 20,
      CUTSCENE_UI_FRAME_TEXTURES.dialogueBox,
    );
    this.add.rectangle(width / 2, boxY + boxHeight / 2, width - 40, boxHeight - 20, 0x000000, 0)
      .setStrokeStyle(2, 0x4488cc);

    // 화자 이름
    this.speakerText = this.add.text(40, boxY + 10, '', {
      fontSize: '20px',
      color: '#4488cc',
      fontStyle: 'bold',
    });

    // 대화 내용
    this.bodyText = this.add.text(40, boxY + 45, '', {
      fontSize: '18px',
      color: '#ffffff',
      wordWrap: { width: width - 100 },
      lineSpacing: 6,
    });

    // ── 버튼 ──
    this.skipButton = this._addCutsceneActionButton(
      width - 94,
      34,
      120,
      34,
      '스킵',
      '[ 스킵 ]',
      '#b8c0d8',
      '#ffffff',
      () => this.skipCutscene(),
      'cutscene_skip_action_button',
      'skip',
    );

    this.nextButton = this._addCutsceneActionButton(
      width - 122,
      boxY + boxHeight - 40,
      184,
      34,
      '다음',
      '다음 ▶',
      '#d8d8e8',
      '#ffffff',
      () => this.advanceDialogue(),
      'cutscene_next_action_button',
      'next',
    );

    // ── 키보드 입력 ──
    this.input.keyboard?.on('keydown-SPACE', () => this.advanceDialogue());
    this.input.keyboard?.on('keydown-ENTER', () => this.advanceDialogue());
    this.input.keyboard?.on('keydown-ESC', () => this.skipCutscene());

    // 클릭으로도 진행
    this.input.on('pointerdown', (_pointer: Phaser.Input.Pointer) => {
      // 버튼 영역 클릭은 제외 (버튼 자체 핸들러에서 처리)
    });

    // ── BGM 재생 ──
    if (this.config?.bgm && this.sound.get(this.config.bgm)) {
      this.sound.play(this.config.bgm, { loop: true, volume: 0.4 });
    }

    // ── 첫 대화 표시 ──
    this.showDialogue(0);
  }

  /** 대화 표시 */
  private showDialogue(index: number): void {
    if (index >= this.config.dialogue.length) {
      this.endCutscene();
      return;
    }

    this.currentIndex = index;
    const line = this.config.dialogue[index];

    // 화자 + 텍스트 갱신
    this.speakerText.setText(line.speaker);
    this.bodyText.setText(line.text);

    // P7-09: 캐릭터 포트레이트 이미지 로드 시스템
    this._updatePortrait(line);

    // 자동 진행 타이머
    if (this.autoTimer) {
      this.autoTimer.destroy();
    }
    const delay = line.delay ?? 4000;
    if (this.isAutoPlay) {
      this.autoTimer = this.time.delayedCall(delay, () => {
        this.advanceDialogue();
      });
    }

    // 진행 표시
    const progress = `${index + 1}/${this.config.dialogue.length}`;
    const nextIcon = this.actionButtonIcons.next?.active === true;
    this.nextButton.setText(nextIcon ? `다음 (${progress})` : `다음 ▶  (${progress})`);
    this._writeCutsceneFrameQaProbe('ready');
  }

  /** 다음 대화로 진행 */
  private advanceDialogue(): void {
    this.showDialogue(this.currentIndex + 1);
  }

  private _addCutsceneFrame(
    x: number,
    y: number,
    width: number,
    height: number,
    texture: typeof CUTSCENE_UI_FRAME_TEXTURES[keyof typeof CUTSCENE_UI_FRAME_TEXTURES],
  ): Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle {
    if (this.textures.exists(texture.key)) {
      return this.add.image(x, y, texture.key)
        .setDisplaySize(width, height)
        .setAlpha(0.9);
    }

    // Aseprite cutscene UI frame 로드 실패 시에만 사용하는 안전 fallback.
    return this.add.rectangle(x, y, width, height, 0x000000, 0.8);
  }

  private _addCutsceneActionButton(
    x: number,
    y: number,
    width: number,
    height: number,
    label: string,
    fallbackLabel: string,
    color: string,
    hoverColor: string,
    onClick: () => void,
    name: string,
    actionId: CutsceneActionButtonId,
  ): Phaser.GameObjects.Text {
    const texture = CUTSCENE_UI_FRAME_TEXTURES.actionButton;
    const iconId = CUTSCENE_ACTION_BUTTON_ICON_IDS[actionId];
    const iconResource = getSpriteResourceForSkillIcon(iconId);
    const hasIcon = Boolean(iconResource && this.textures.exists(iconResource.key));
    let frameImage: Phaser.GameObjects.Image | null = null;
    let fallbackFrame: Phaser.GameObjects.Rectangle | null = null;
    let icon: Phaser.GameObjects.Image | null = null;

    if (this.textures.exists(texture.key)) {
      frameImage = this.add.image(x, y, texture.key)
        .setName(`${name}_frame`)
        .setDisplaySize(width, height)
        .setAlpha(0.86)
        .setInteractive({ useHandCursor: true });
      this.actionButtonFrames.push(frameImage);
    } else {
      // Aseprite cutscene action button frame 로드 실패 시에만 사용하는 안전 fallback.
      fallbackFrame = this.add.rectangle(x, y, width, height, 0x122038, 0.78)
        .setName(`${name}_fallback_frame`)
        .setStrokeStyle(1, 0x3b5f91)
        .setInteractive({ useHandCursor: true });
    }

    if (hasIcon && iconResource) {
      icon = this.add.image(x - width / 2 + 22, y, iconResource.key)
        .setName(`${name}_icon`);
      icon.setDisplaySize(16, 16);
      icon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
      icon.setInteractive({ useHandCursor: true });
      this.actionButtonIcons[actionId] = icon;
    } else {
      this.actionButtonFallbackIds.push(actionId);
    }

    const text = this.add.text(hasIcon ? x + 8 : x, y, hasIcon ? label : fallbackLabel, {
      fontSize: '15px',
      color,
      fontStyle: 'bold',
      stroke: '#08111f',
      strokeThickness: 2,
    })
      .setName(`${name}_label`)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    const setHoverState = (isHover: boolean): void => {
      text.setColor(isHover ? hoverColor : color);
      if (frameImage) {
        if (isHover) {
          frameImage.setTint(0xcfe8ff);
        } else {
          frameImage.clearTint();
        }
      }
      if (icon) {
        if (isHover) {
          icon.setTint(0xcfe8ff);
        } else {
          icon.clearTint();
        }
      }
      if (fallbackFrame) {
        fallbackFrame.setFillStyle(isHover ? 0x1a3154 : 0x122038, isHover ? 0.9 : 0.78);
      }
    };

    frameImage?.on('pointerdown', onClick)
      .on('pointerover', () => setHoverState(true))
      .on('pointerout', () => setHoverState(false));
    fallbackFrame?.on('pointerdown', onClick)
      .on('pointerover', () => setHoverState(true))
      .on('pointerout', () => setHoverState(false));
    icon?.on('pointerdown', onClick)
      .on('pointerover', () => setHoverState(true))
      .on('pointerout', () => setHoverState(false));
    text.on('pointerdown', onClick)
      .on('pointerover', () => setHoverState(true))
      .on('pointerout', () => setHoverState(false));

    return text;
  }

  private _isCutsceneFrameQaRoute(): boolean {
    if (typeof window === 'undefined') return false;

    return new URLSearchParams(window.location.search).get('cutsceneFrameQa') === '1';
  }

  private _writeCutsceneFrameQaProbe(status: 'ready'): void {
    if (!this._isCutsceneFrameQaRoute() || typeof document === 'undefined') return;

    const dialogueBoxFrame = this.dialogueBox instanceof Phaser.GameObjects.Image
      ? this.dialogueBox
      : null;
    const activeActionButtonFrames = this.actionButtonFrames.filter((frame) => frame.active);
    const missingFrameKeys = Object.values(CUTSCENE_UI_FRAME_TEXTURES)
      .filter((texture) => !this.textures.exists(texture.key))
      .map((texture) => texture.key);
    const actionButtonIconStates = (Object.keys(CUTSCENE_ACTION_BUTTON_ICON_IDS) as CutsceneActionButtonId[])
      .map((actionId) => {
        const iconId = CUTSCENE_ACTION_BUTTON_ICON_IDS[actionId];
        const iconResource = getSpriteResourceForSkillIcon(iconId);
        const icon = this.actionButtonIcons[actionId];

        return {
          actionId,
          iconId,
          key: iconResource?.key ?? null,
          path: iconResource?.path ?? null,
          rendered: icon?.active === true,
          visible: icon?.visible ?? false,
          displayWidth: icon?.displayWidth ?? 0,
          displayHeight: icon?.displayHeight ?? 0,
          fallbackRendered: this.actionButtonFallbackIds.includes(actionId),
        };
      });
    const missingActionButtonIconKeys = actionButtonIconStates
      .filter((entry) => !entry.rendered)
      .map((entry) => entry.key ?? entry.iconId);
    const portraitReady = this.cutscenePortraitImages.length >= CUTSCENE_EXPECTED_PORTRAIT_COUNT
      && this.missingCutscenePortraitKeys.length === 0;

    document.body.dataset.aeternaCutsceneFrameQa = JSON.stringify({
      status: missingFrameKeys.length === 0 && missingActionButtonIconKeys.length === 0 && portraitReady
        ? status
        : 'missing-frame',
      cutsceneId: this.config.id,
      dialogueIndex: this.currentIndex,
      dialogueBoxFrame: {
        key: CUTSCENE_UI_FRAME_TEXTURES.dialogueBox.key,
        path: CUTSCENE_UI_FRAME_TEXTURES.dialogueBox.path,
        renderedCount: dialogueBoxFrame ? 1 : 0,
        expectedCount: CUTSCENE_EXPECTED_DIALOGUE_BOX_FRAME_COUNT,
        displayWidth: dialogueBoxFrame?.displayWidth ?? 0,
        displayHeight: dialogueBoxFrame?.displayHeight ?? 0,
      },
      actionButtonFrame: {
        key: CUTSCENE_UI_FRAME_TEXTURES.actionButton.key,
        path: CUTSCENE_UI_FRAME_TEXTURES.actionButton.path,
        renderedCount: activeActionButtonFrames.length,
        expectedCount: CUTSCENE_EXPECTED_ACTION_BUTTON_FRAME_COUNT,
        displaySizes: activeActionButtonFrames.map((frame) => ({
          width: frame.displayWidth,
          height: frame.displayHeight,
        })),
      },
      actionButtonIcon: {
        renderedCount: actionButtonIconStates.filter((entry) => entry.rendered).length,
        expectedCount: CUTSCENE_EXPECTED_ACTION_BUTTON_ICON_COUNT,
        icons: actionButtonIconStates,
        fallbackActionIds: this.actionButtonFallbackIds,
        missingIconKeys: missingActionButtonIconKeys,
      },
      portrait: {
        preloadedTextureCount: CUTSCENE_PRELOAD_PORTRAIT_TEXTURE_COUNT,
        expectedCount: CUTSCENE_EXPECTED_PORTRAIT_COUNT,
        renderedCount: this.cutscenePortraitImages.length,
        renderedKeys: this.cutscenePortraitImages.map((image) => image.texture.key),
        displaySizes: this.cutscenePortraitImages.map((image) => ({
          width: image.displayWidth,
          height: image.displayHeight,
        })),
        missingCutscenePortraitKeys: this.missingCutscenePortraitKeys,
      },
      missingFrameKeys,
      missingActionButtonIconKeys,
      missingCutscenePortraitKeys: this.missingCutscenePortraitKeys,
      visibleCanvasCount: document.querySelectorAll('canvas').length,
    });
  }

  // ── P7-09: 캐릭터 포트레이트 시스템 ─────────────────────────

  /**
   * 캐릭터 이름 → 포트레이트 이미지 키 매핑.
   * Aseprite runtime portrait가 있으면 먼저 사용하고, 없는 캐릭터만 legacy key를 유지한다.
   */
  private static readonly PORTRAIT_MAP: Record<string, string> = {
    // 주요 NPC / 플레이어 클래스
    '에테르 기사':   CUTSCENE_PORTRAIT_KEYS.etherKnight,
    '기억술사':     CUTSCENE_PORTRAIT_KEYS.memoryWeaver,
    '그림자 직조사': CUTSCENE_PORTRAIT_KEYS.shadowWeaver,
    '기억 파괴자':   CUTSCENE_PORTRAIT_KEYS.memoryBreaker,
    '시간 수호자':   CUTSCENE_PORTRAIT_KEYS.timeGuardian,
    '공허 방랑자':   CUTSCENE_PORTRAIT_KEYS.voidWanderer,
    '수호자':       CUTSCENE_PORTRAIT_KEYS.timeGuardian,
    '파멸자':       CUTSCENE_PORTRAIT_KEYS.memoryBreaker,
    '에테르 폭주자': CUTSCENE_PORTRAIT_KEYS.etherKnight,
    '기억 직조사':  CUTSCENE_PORTRAIT_KEYS.memoryWeaver,
    '시간 조율사':  CUTSCENE_PORTRAIT_KEYS.timeGuardian,
    '기억 지배자':  CUTSCENE_PORTRAIT_KEYS.memoryWeaver,
    '환영사':       CUTSCENE_PORTRAIT_KEYS.shadowWeaver,
    '영혼 수확자':  CUTSCENE_PORTRAIT_KEYS.shadowWeaver,
    '공허의 군주':  CUTSCENE_PORTRAIT_KEYS.voidWanderer,
    // NPC (시나리오 확장 시 추가)
    '내레이터':     CUTSCENE_PORTRAIT_KEYS['내레이터'],
    'narrator':    CUTSCENE_PORTRAIT_KEYS.narrator,
  };

  /**
   * 캐릭터 이름으로 포트레이트 텍스처 키를 조회한다.
   * 직접 portrait 필드가 있으면 그것을 우선 사용.
   */
  private _resolvePortraitKey(line: CutsceneDialogue): string | null {
    // 1) 대화 데이터에 portrait가 명시된 경우
    if (line.portrait) {
      return CUTSCENE_LEGACY_PORTRAIT_KEY_MAP[line.portrait] ?? line.portrait;
    }

    // 2) speaker 이름으로 매핑
    const mapped = CutsceneScene.PORTRAIT_MAP[line.speaker];
    if (mapped) return mapped;

    // 3) speaker를 snake_case로 변환하여 시도
    const snakeKey = `portrait_${line.speaker.toLowerCase().replace(/\s+/g, '_')}`;
    return CUTSCENE_LEGACY_PORTRAIT_KEY_MAP[snakeKey] ?? snakeKey;
  }

  /**
   * 포트레이트 이미지를 갱신한다.
   * 이미지가 로드되어 있지 않으면 표시하지 않는다.
   */
  private _updatePortrait(line: CutsceneDialogue): void {
    const { width: _width, height } = this.cameras.main;
    const boxHeight = height * 0.3;
    const boxY = height - boxHeight;

    // 기존 포트레이트 제거
    if (this.portraitSprite) {
      this.portraitSprite.destroy();
      this.portraitSprite = undefined;
    }
    this.cutscenePortraitImages = this.cutscenePortraitImages.filter((image) => image.active);

    const key = this._resolvePortraitKey(line);
    if (!key) return;

    if (!this.textures.exists(key)) {
      if (!this.missingCutscenePortraitKeys.includes(key)) {
        this.missingCutscenePortraitKeys.push(key);
      }
      return;
    }

    // 감정 변형이 있으면 '{key}_{emotion}' 시도
    const emotionKey = line.emotion ? `${key}_${line.emotion}` : null;
    const finalKey = emotionKey && this.textures.exists(emotionKey) ? emotionKey : key;

    // 포트레이트 표시 (대화 박스 좌측)
    this.portraitSprite = this.add.image(100, boxY - 20, finalKey)
      .setName(`cutscene_portrait_${key}`)
      .setOrigin(0.5, 1)
      .setAlpha(0);
    this.portraitSprite.setDisplaySize(96, 96);
    this.portraitSprite.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.cutscenePortraitImages.push(this.portraitSprite);

    // 페이드 인 애니메이션
    this.tweens.add({
      targets: this.portraitSprite,
      alpha: 1,
      y: boxY - 10,
      duration: 300,
      ease: 'Power2',
    });
  }

  /** 컷씬 스킵 */
  private skipCutscene(): void {
    this.endCutscene();
  }

  /** 컷씬 종료 → 원래 씬 복귀 */
  private endCutscene(): void {
    // BGM 정지
    if (this.config?.bgm && this.sound.get(this.config.bgm)) {
      this.sound.stopByKey(this.config.bgm);
    }

    // 자동 타이머 정리
    if (this.autoTimer) {
      this.autoTimer.destroy();
    }

    // 페이드 아웃 후 씬 전환
    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start(this.config.returnScene, this.config.returnData as object | undefined);
    });
  }
}
