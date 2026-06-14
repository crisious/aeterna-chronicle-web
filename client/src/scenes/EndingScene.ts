/**
 * EndingScene — 엔딩 타입별 텍스트 기반 연출 씬
 *
 * 서버에서 엔딩 판정 결과를 수신한 뒤
 * GameScene → EndingScene 으로 전환하여 해당 엔딩을 연출한다.
 *
 * 연출:
 *   - 엔딩 CG 풀스크린 배경
 *   - 엔딩 타이틀 + 본문 페이드인
 *   - 에필로그 텍스트 순차 표시
 */

import * as Phaser from 'phaser';
import { getSpriteResourceForSkillIcon } from '../assets/spriteResourceManifest';

// ── 엔딩 타입 (서버와 동일) ─────────────────────────────────
export type EndingType =
  | 'DIVINE_RETURN'
  | 'BETRAYAL'
  | 'TRUE_GUARDIAN'
  | 'LAST_WITNESS'
  | 'DEFEAT';

// ── 엔딩 씬 데이터 (scene.start 시 전달) ───────────────────
export interface EndingSceneData {
  endingType: EndingType;
  endingName: string;
  endingDescription: string;
  playthrough: number;
  frameQa?: boolean;
}

// ── 엔딩별 연출 설정 ────────────────────────────────────────
interface EndingPresentation {
  bgColor: number;
  titleColor: string;
  bodyColor: string;
  epilogueLines: string[];
  cgPath: string;
}

// ── 엔딩 타입 → CG 이미지 키 ────────────────────────────────
const ENDING_CG_KEY = 'ending_cg';

const ENDING_UI_FRAME_TEXTURES = {
  storyPanel: {
    key: 'ui_frame_ending_story_panel',
    path: 'assets/generated/ui/frames/UI-HUD-006-DEF.png',
  },
  promptTrack: {
    key: 'ui_frame_ending_prompt_track',
    path: 'assets/generated/ui/frames/UI-BTN-006-DEF.png',
  },
} as const;

const ENDING_EXPECTED_STORY_PANEL_FRAME_COUNT = 1;
const ENDING_EXPECTED_PROMPT_TRACK_FRAME_COUNT = 1;
const ENDING_PROMPT_ICON_ID = 'skill_mw_arrow';
const ENDING_EXPECTED_PROMPT_ICON_COUNT = 1;

const DEFAULT_ENDING_SCENE_DATA: EndingSceneData = {
  endingType: 'TRUE_GUARDIAN',
  endingName: '시간의 수호자',
  endingDescription: '시간의 균열을 봉인하고 세계의 평화를 지켜냈다.',
  playthrough: 1,
};

const ENDING_PRESENTATIONS: Record<EndingType, EndingPresentation> = {
  DIVINE_RETURN: {
    bgColor: 0x1a0a3e,
    titleColor: '#FFD700',
    bodyColor: '#E0D0FF',
    cgPath: 'assets/cg/ending_d_return.png',
    epilogueLines: [
      '열두 신의 이름이 하늘에 새겨진다.',
      '레테가 처음으로 미소짓는다.',
      '"기억된다는 것이… 이런 느낌이었구나."',
      '',
      '에리언은 신과 인간의 중재자가 되었다.',
      '에테르나 크로니클은 새로운 장을 연다.',
    ],
  },
  BETRAYAL: {
    bgColor: 0x2a0a0a,
    titleColor: '#FF4444',
    bodyColor: '#FFCCCC',
    cgPath: 'assets/cg/ending_c_oblivion.png',
    epilogueLines: [
      '50년 후. 에테르나에 전쟁이 없다.',
      '분쟁도 없다.',
      '그러나 음악도, 예술도, 오래된 우정도 사라졌다.',
      '',
      '레이나가 홀로 기억을 지우지 않고 버텨낸다.',
      '"기억이 고통이더라도…"',
    ],
  },
  TRUE_GUARDIAN: {
    bgColor: 0x0a2a1a,
    titleColor: '#44FF88',
    bodyColor: '#D0FFE0',
    cgPath: 'assets/cg/ending_a_guardian.png',
    epilogueLines: [
      '에레보스에 새 식물이 자라기 시작한다.',
      '세라핀이 실반헤임에서 처음으로 웃는다.',
      '벤자민이 아내의 이름을 기억한다.',
      '이그나의 아버지 이그리스가 딸의 이름을 부른다.',
      '',
      '기억은 지켜졌다. 모두가 살아남았다.',
    ],
  },
  LAST_WITNESS: {
    bgColor: 0x0a1a2a,
    titleColor: '#4488FF',
    bodyColor: '#D0E0FF',
    cgPath: 'assets/cg/ending_b_witness.png',
    epilogueLines: [
      '에리언은 기억을 잃었다.',
      '하지만 세계는 구원되었다.',
      '',
      '동료들은 에리언을 기억한다.',
      '에리언은 동료들을 기억하지 못한다.',
      '',
      '"기억해줘서… 고마워."',
    ],
  },
  DEFEAT: {
    bgColor: 0x0a0a0a,
    titleColor: '#888888',
    bodyColor: '#AAAAAA',
    cgPath: 'assets/cg/defeat_oblivion.png',
    epilogueLines: [
      '기억의 파도가 밀려왔다.',
      '에리언은 레테를 저지하지 못했다.',
      '',
      '세계는 망각의 안개에 잠겼다.',
      '아무것도 기억되지 않는 세계.',
    ],
  },
};

export class EndingScene extends Phaser.Scene {
  private endingData!: EndingSceneData;
  private frameQa = false;
  private storyPanelFrames: Phaser.GameObjects.Image[] = [];
  private promptTrackFrames: Phaser.GameObjects.Image[] = [];
  private promptIcon: Phaser.GameObjects.Image | null = null;
  private promptIconFallbackRendered = false;

  constructor() {
    super({ key: 'EndingScene' });
  }

  init(data?: Partial<EndingSceneData>): void {
    this.endingData = {
      ...DEFAULT_ENDING_SCENE_DATA,
      ...data,
    };
    this.frameQa = data?.frameQa === true || this._isEndingFrameQaRoute();
    this.storyPanelFrames = [];
    this.promptTrackFrames = [];
    this.promptIcon = null;
    this.promptIconFallbackRendered = false;
  }

  preload(): void {
    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      console.warn(`[EndingScene] 에셋 로드 실패 (무시): ${file.key}`);
    });

    const presentation = ENDING_PRESENTATIONS[this.endingData.endingType] ?? ENDING_PRESENTATIONS.DEFEAT;
    this.load.image(ENDING_CG_KEY, presentation.cgPath);
    for (const texture of Object.values(ENDING_UI_FRAME_TEXTURES)) {
      if (!this.textures.exists(texture.key)) {
        this.load.image(texture.key, texture.path);
      }
    }

    const promptIconResource = getSpriteResourceForSkillIcon(ENDING_PROMPT_ICON_ID);
    if (promptIconResource && !this.textures.exists(promptIconResource.key)) {
      this.load.image(promptIconResource.key, promptIconResource.path);
    }
  }

  create(): void {
    const { width, height } = this.cameras.main;
    const presentation = ENDING_PRESENTATIONS[this.endingData.endingType] ?? ENDING_PRESENTATIONS.DEFEAT;
    this.storyPanelFrames = [];
    this.promptTrackFrames = [];
    this.promptIcon = null;
    this.promptIconFallbackRendered = false;

    // ── 배경 ────────────────────────────────────────────────
    this.cameras.main.setBackgroundColor(presentation.bgColor);

    // ── 엔딩 CG (풀스크린 배경) ─────────────────────────────
    if (this.textures.exists(ENDING_CG_KEY)) {
      const cgImage = this.add.image(width / 2, height / 2, ENDING_CG_KEY);
      cgImage.setDisplaySize(width, height);
      cgImage.setAlpha(0);
      this.tweens.add({
        targets: cgImage,
        alpha: 1,
        duration: 1500,
        ease: 'Power2',
      });
    }

    // ── 엔딩 타이틀 (페이드인) ──────────────────────────────
    const titleText = this.add.text(width / 2, height * 0.15, this.endingData.endingName, {
      fontSize: '48px',
      fontFamily: 'Noto Sans KR, sans-serif',
      color: presentation.titleColor,
      fontStyle: 'bold',
      align: 'center',
    });
    titleText.setOrigin(0.5);
    titleText.setAlpha(0);

    this.tweens.add({
      targets: titleText,
      alpha: 1,
      duration: 2000,
      ease: 'Power2',
    });

    const storyPanelWidth = Math.min(width * 0.78, 980);
    const storyPanelHeight = Math.min(height * 0.58, 500);
    this._addEndingFrame(
      width / 2,
      height * 0.6,
      storyPanelWidth,
      storyPanelHeight,
      ENDING_UI_FRAME_TEXTURES.storyPanel,
      this.storyPanelFrames,
      'ending_story_panel_frame',
      0.82,
    );
    this.add.rectangle(
      width / 2,
      height * 0.6,
      Math.max(0, storyPanelWidth - 110),
      Math.max(0, storyPanelHeight - 118),
      0x04131e,
      0.74,
    ).setName('ending_story_panel_readability_layer');

    // ── 엔딩 설명 (타이틀 이후 페이드인) ────────────────────
    const descText = this.add.text(width / 2, height * 0.28, this.endingData.endingDescription, {
      fontSize: '20px',
      fontFamily: 'Noto Sans KR, sans-serif',
      color: presentation.bodyColor,
      align: 'center',
      wordWrap: { width: width * 0.7 },
      lineSpacing: 8,
    });
    descText.setOrigin(0.5);
    descText.setAlpha(0);

    this.tweens.add({
      targets: descText,
      alpha: 1,
      duration: 1500,
      delay: 1500,
      ease: 'Power2',
    });

    // ── 에필로그 텍스트 순차 표시 ───────────────────────────
    const startY = height * 0.48;
    const lineHeight = 36;

    presentation.epilogueLines.forEach((line, i) => {
      const lineText = this.add.text(width / 2, startY + i * lineHeight, line, {
        fontSize: '18px',
        fontFamily: 'Noto Sans KR, sans-serif',
        color: presentation.bodyColor,
        align: 'center',
        wordWrap: { width: width * 0.65 },
      });
      lineText.setOrigin(0.5);
      lineText.setAlpha(0);

      this.tweens.add({
        targets: lineText,
        alpha: 1,
        duration: 1200,
        delay: 3000 + i * 800,
        ease: 'Power1',
      });
    });

    // ── 플레이스루 표시 ─────────────────────────────────────
    const playthroughText = this.add.text(
      width / 2,
      height * 0.92,
      `— Playthrough #${this.endingData.playthrough} —`,
      {
        fontSize: '14px',
        fontFamily: 'Noto Sans KR, sans-serif',
        color: '#666666',
        align: 'center',
      },
    );
    playthroughText.setOrigin(0.5);
    playthroughText.setAlpha(0);

    const totalEpilogueDelay = 3000 + presentation.epilogueLines.length * 800 + 1200;

    this.tweens.add({
      targets: playthroughText,
      alpha: 1,
      duration: 1000,
      delay: totalEpilogueDelay,
      ease: 'Power1',
    });

    // ── "아무 키나 누르면 타이틀로" 안내 ────────────────────
    const promptIconResource = getSpriteResourceForSkillIcon(ENDING_PROMPT_ICON_ID);
    const hasPromptIcon = Boolean(promptIconResource && this.textures.exists(promptIconResource.key));
    const promptText = this.add.text(hasPromptIcon ? width / 2 + 12 : width / 2, height * 0.96, '아무 키나 누르면 타이틀로 돌아갑니다', {
      fontSize: '14px',
      fontFamily: 'Noto Sans KR, sans-serif',
      color: '#444444',
      align: 'center',
    });
    promptText.setOrigin(0.5);
    promptText.setAlpha(0);

    this._addEndingFrame(
      width / 2,
      height * 0.96,
      390,
      34,
      ENDING_UI_FRAME_TEXTURES.promptTrack,
      this.promptTrackFrames,
      'ending_prompt_track_frame',
      0.74,
    );
    promptText.setDepth((this.promptTrackFrames[0]?.depth ?? promptText.depth) + 1);

    const promptVisualTargets: Phaser.GameObjects.GameObject[] = [promptText];
    if (hasPromptIcon && promptIconResource) {
      this.promptIcon = this.add.image(width / 2 - 164, height * 0.96, promptIconResource.key)
        .setName('ending_prompt_icon');
      this.promptIcon.setDisplaySize(16, 16);
      this.promptIcon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
      this.promptIcon.setAlpha(0);
      this.promptIcon.setDepth(promptText.depth);
      promptVisualTargets.push(this.promptIcon);
    } else {
      const fallbackIcon = this.add.text(width / 2 - 164, height * 0.96, '>', {
        fontSize: '13px',
        fontFamily: 'Noto Sans KR, sans-serif',
        color: '#444444',
        align: 'center',
      })
        .setName('ending_prompt_icon_fallback')
        .setOrigin(0.5)
        .setAlpha(0)
        .setDepth(promptText.depth);
      promptVisualTargets.push(fallbackIcon);
      this.promptIconFallbackRendered = true;
    }

    this.tweens.add({
      targets: promptVisualTargets,
      alpha: { from: 0, to: 0.6 },
      duration: 800,
      delay: totalEpilogueDelay + 1500,
      ease: 'Power1',
      yoyo: true,
      repeat: -1,
      hold: 1500,
    });

    // ── 입력 대기 (에필로그 완료 후) ────────────────────────
    this.time.delayedCall(totalEpilogueDelay + 1500, () => {
      this.input.keyboard?.once('keydown', () => {
        this.returnToTitle();
      });
      this.input.once('pointerdown', () => {
        this.returnToTitle();
      });
    });

    this._writeEndingFrameQaProbe();
  }

  private _addEndingFrame(
    x: number,
    y: number,
    width: number,
    height: number,
    texture: typeof ENDING_UI_FRAME_TEXTURES[keyof typeof ENDING_UI_FRAME_TEXTURES],
    targetFrames: Phaser.GameObjects.Image[],
    name: string,
    alpha: number,
  ): Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle {
    if (this.textures.exists(texture.key)) {
      const frame = this.add.image(x, y, texture.key)
        .setDisplaySize(width, height)
        .setAlpha(alpha)
        .setName(name);
      targetFrames.push(frame);
      return frame;
    }

    // Aseprite ending UI frame 로드 실패 시에만 사용하는 안전 fallback.
    return this.add.rectangle(x, y, width, height, 0x050510, 0.58)
      .setStrokeStyle(1, 0x6a5f92)
      .setName(`${name}_fallback`);
  }

  private _isEndingFrameQaRoute(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }

    return new URLSearchParams(window.location.search).get('endingFrameQa') === '1';
  }

  private _writeEndingFrameQaProbe(): void {
    if (!this.frameQa || typeof document === 'undefined') {
      return;
    }

    const storyPanelFrame = ENDING_UI_FRAME_TEXTURES.storyPanel;
    const promptTrackFrame = ENDING_UI_FRAME_TEXTURES.promptTrack;
    const hasExpectedStoryPanelFrames = (
      this.textures.exists(storyPanelFrame.key)
      && this.storyPanelFrames.length === ENDING_EXPECTED_STORY_PANEL_FRAME_COUNT
    );
    const hasExpectedPromptTrackFrames = (
      this.textures.exists(promptTrackFrame.key)
      && this.promptTrackFrames.length === ENDING_EXPECTED_PROMPT_TRACK_FRAME_COUNT
    );
    const promptIconResource = getSpriteResourceForSkillIcon(ENDING_PROMPT_ICON_ID);
    const hasExpectedPromptIcon = (
      Boolean(promptIconResource)
      && this.textures.exists(promptIconResource?.key ?? '')
      && this.promptIcon?.active === true
    );
    const visibleCanvasCount = Array.from(document.querySelectorAll('canvas'))
      .filter((canvas) => {
        const rect = canvas.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      }).length;

    document.body.dataset.aeternaEndingFrameQa = JSON.stringify({
      status: 'ready',
      endingType: this.endingData.endingType,
      storyPanelFrame: {
        key: storyPanelFrame.key,
        path: storyPanelFrame.path,
        renderedCount: this.storyPanelFrames.length,
        expectedCount: ENDING_EXPECTED_STORY_PANEL_FRAME_COUNT,
        displaySizes: this.storyPanelFrames.map((frame) => ({
          width: frame.displayWidth,
          height: frame.displayHeight,
        })),
      },
      promptTrackFrame: {
        key: promptTrackFrame.key,
        path: promptTrackFrame.path,
        renderedCount: this.promptTrackFrames.length,
        expectedCount: ENDING_EXPECTED_PROMPT_TRACK_FRAME_COUNT,
        displaySizes: this.promptTrackFrames.map((frame) => ({
          width: frame.displayWidth,
          height: frame.displayHeight,
        })),
      },
      promptIcon: {
        iconId: ENDING_PROMPT_ICON_ID,
        key: promptIconResource?.key ?? null,
        path: promptIconResource?.path ?? null,
        renderedCount: this.promptIcon?.active ? 1 : 0,
        expectedCount: ENDING_EXPECTED_PROMPT_ICON_COUNT,
        displayWidth: this.promptIcon?.displayWidth ?? 0,
        displayHeight: this.promptIcon?.displayHeight ?? 0,
        fallbackRendered: this.promptIconFallbackRendered,
      },
      missingFrameKeys: [
        ...(hasExpectedStoryPanelFrames ? [] : [storyPanelFrame.key]),
        ...(hasExpectedPromptTrackFrames ? [] : [promptTrackFrame.key]),
      ],
      missingPromptIconKeys: hasExpectedPromptIcon ? [] : [promptIconResource?.key ?? ENDING_PROMPT_ICON_ID],
      visibleCanvasCount,
    });
  }

  private returnToTitle(): void {
    this.cameras.main.fadeOut(1500, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      // GameScene 으로 복귀 (또는 별도 TitleScene 이 있으면 전환)
      this.scene.start('GameScene');
    });
  }
}
