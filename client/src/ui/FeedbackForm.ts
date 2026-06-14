/**
 * Phaser UI 피드백 폼 (P6-19)
 * 버그/기능/밸런스 리포트 + 스크린샷 첨부 + 메타데이터 자동수집
 */
import Phaser from 'phaser';
import { getSpriteResourceForSkillIcon } from '../assets/spriteResourceManifest';
import { getStatusIconResource, type StatusEffectIconId } from '../data/statusEffectIcons';
import { networkManager } from '../network/NetworkManager';
import { showCompatToast } from '../utils/RendererDetector';

// ─── 타입 정의 ──────────────────────────────────────────────────
interface FeedbackPayload {
  userId: string;
  type: string;
  title: string;
  description: string;
  priority: string;
  screenshot?: string;
  metadata: {
    browser: string;
    os: string;
    resolution: string;
    gameVersion: string;
    scene: string;
    fps: number;
    timestamp: string;
  };
}

type FeedbackType = 'bug' | 'feature' | 'balance' | 'ux' | 'other';

interface FeedbackTypeOption {
  key: FeedbackType;
  label: string;
  fallbackLabel: string;
  iconId: StatusEffectIconId;
}

interface FeedbackFormConfig {
  apiUrl: string;
  userId: string;
  gameVersion: string;
  /** 오버레이로 launch 한 부모 씬 — 닫을 때 resume 한다(없으면 stop 만). */
  parentSceneKey?: string;
  /** Aseprite feedback panel frame 브라우저 QA용 probe */
  frameQa?: boolean;
}

const FEEDBACK_FORM_UI_FRAME_TEXTURES = {
  panel: {
    key: 'ui_frame_UI-SET-002-DEF',
    path: 'assets/generated/ui/frames/UI-SET-002-DEF.png',
  },
  button: {
    key: 'ui_frame_feedback_form_button',
    path: 'assets/generated/ui/frames/UI-BTN-006-DEF.png',
  },
} as const;

const FEEDBACK_FORM_TITLE_ICON_ID = 'skill_mw_arrow';
const FEEDBACK_FORM_TITLE_ICON_RESOURCE = getSpriteResourceForSkillIcon(FEEDBACK_FORM_TITLE_ICON_ID);
const FEEDBACK_FORM_SUBMIT_ICON_ID = 'skill_mw_arrow';
const FEEDBACK_FORM_SUBMIT_ICON_RESOURCE = getSpriteResourceForSkillIcon(FEEDBACK_FORM_SUBMIT_ICON_ID);
const FEEDBACK_FORM_CLOSE_ICON_ID = 'skill_tg_reverse';
const FEEDBACK_FORM_CLOSE_ICON_RESOURCE = getSpriteResourceForSkillIcon(FEEDBACK_FORM_CLOSE_ICON_ID);

const FEEDBACK_FORM_TYPE_OPTIONS: readonly FeedbackTypeOption[] = [
  { key: 'bug', label: '버그', fallbackLabel: '🐛 버그', iconId: 'poison' },
  { key: 'feature', label: '기능', fallbackLabel: '💡 기능', iconId: 'haste' },
  { key: 'balance', label: '밸런스', fallbackLabel: '⚖️ 밸런스', iconId: 'shield' },
  { key: 'ux', label: 'UX', fallbackLabel: '🎨 UX', iconId: 'charm' },
  { key: 'other', label: '기타', fallbackLabel: '📌 기타', iconId: 'stun' },
] as const;

const FEEDBACK_FORM_TYPE_ICON_TEXTURES: Record<FeedbackType, ReturnType<typeof getStatusIconResource>> = {
  bug: getStatusIconResource('poison'),
  feature: getStatusIconResource('haste'),
  balance: getStatusIconResource('shield'),
  ux: getStatusIconResource('charm'),
  other: getStatusIconResource('stun'),
};

const FEEDBACK_FORM_EXPECTED_TYPE_ICON_COUNT = FEEDBACK_FORM_TYPE_OPTIONS.length;

interface FeedbackFormFrameRender {
  primary: Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle;
  stroke?: Phaser.GameObjects.Rectangle;
}

// ─── 메타데이터 자동 수집 ───────────────────────────────────────
function collectMetadata(scene: Phaser.Scene, gameVersion: string): FeedbackPayload['metadata'] {
  const nav = typeof navigator !== 'undefined' ? navigator : null;
  return {
    browser: nav?.userAgent ?? 'unknown',
    os: nav?.platform ?? 'unknown',
    resolution: `${window.innerWidth}x${window.innerHeight}`,
    gameVersion,
    scene: scene.scene.key,
    fps: Math.round(scene.game.loop.actualFps),
    timestamp: new Date().toISOString(),
  };
}

// ─── 스크린샷 캡처 ──────────────────────────────────────────────
function captureScreenshot(game: Phaser.Game): string | undefined {
  try {
    const canvas = game.canvas;
    // 축소된 스크린샷 (성능 고려)
    const scale = 0.5;
    const offscreen = document.createElement('canvas');
    offscreen.width = canvas.width * scale;
    offscreen.height = canvas.height * scale;
    const ctx = offscreen.getContext('2d');
    if (!ctx) return undefined;
    ctx.drawImage(canvas, 0, 0, offscreen.width, offscreen.height);
    return offscreen.toDataURL('image/jpeg', 0.6);
  } catch {
    console.warn('[FeedbackForm] 스크린샷 캡처 실패');
    return undefined;
  }
}

// ─── FeedbackForm 씬 ────────────────────────────────────────────
export class FeedbackForm extends Phaser.Scene {
  private config!: FeedbackFormConfig;
  private selectedType: FeedbackType = 'bug';
  private titleText = '';
  private descriptionText = '';
  private priority = 'normal';
  private includeScreenshot = true;
  private formContainer!: Phaser.GameObjects.Container;
  private isSubmitting = false;
  private frameQaRenderedCounts = new Map<string, number>();
  private typeIconRenderedKeys: string[] = [];
  private missingTypeIconKeys: string[] = [];
  private fallbackTypeIconIds: FeedbackType[] = [];
  private titleIcon: Phaser.GameObjects.Image | null = null;
  private titleIconFallback: Phaser.GameObjects.Text | null = null;
  private missingTitleIconKeys: string[] = [];
  private submitIcon: Phaser.GameObjects.Image | null = null;
  private submitIconFallback: Phaser.GameObjects.Text | null = null;
  private missingSubmitIconKeys: string[] = [];
  private closeIcon: Phaser.GameObjects.Image | null = null;
  private closeIconFallback: Phaser.GameObjects.Text | null = null;
  private missingCloseIconKeys: string[] = [];

  constructor() {
    super({ key: 'FeedbackForm' });
  }

  init(data: FeedbackFormConfig): void {
    this.config = data;
    this.frameQaRenderedCounts.clear();
    this.typeIconRenderedKeys = [];
    this.missingTypeIconKeys = [];
    this.fallbackTypeIconIds = [];
    this.titleIcon = null;
    this.titleIconFallback = null;
    this.missingTitleIconKeys = [];
    this.submitIcon = null;
    this.submitIconFallback = null;
    this.missingSubmitIconKeys = [];
    this.closeIcon = null;
    this.closeIconFallback = null;
    this.missingCloseIconKeys = [];
  }

  preload(): void {
    for (const texture of Object.values(FEEDBACK_FORM_UI_FRAME_TEXTURES)) {
      if (!this.textures.exists(texture.key)) {
        this.load.image(texture.key, texture.path);
      }
    }
    if (FEEDBACK_FORM_TITLE_ICON_RESOURCE && !this.textures.exists(FEEDBACK_FORM_TITLE_ICON_RESOURCE.key)) {
      this.load.image(FEEDBACK_FORM_TITLE_ICON_RESOURCE.key, FEEDBACK_FORM_TITLE_ICON_RESOURCE.path);
    }
    if (FEEDBACK_FORM_SUBMIT_ICON_RESOURCE && !this.textures.exists(FEEDBACK_FORM_SUBMIT_ICON_RESOURCE.key)) {
      this.load.image(FEEDBACK_FORM_SUBMIT_ICON_RESOURCE.key, FEEDBACK_FORM_SUBMIT_ICON_RESOURCE.path);
    }
    if (FEEDBACK_FORM_CLOSE_ICON_RESOURCE && !this.textures.exists(FEEDBACK_FORM_CLOSE_ICON_RESOURCE.key)) {
      this.load.image(FEEDBACK_FORM_CLOSE_ICON_RESOURCE.key, FEEDBACK_FORM_CLOSE_ICON_RESOURCE.path);
    }
    for (const texture of Object.values(FEEDBACK_FORM_TYPE_ICON_TEXTURES)) {
      if (texture && !this.textures.exists(texture.key)) {
        this.load.image(texture.key, texture.path);
      }
    }
  }

  create(): void {
    const { width, height } = this.scale;

    // 반투명 배경 오버레이
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7);
    overlay.setInteractive();

    // FINDING-A4 ext26: ESC 닫기 (WCAG 2.1.1) — sub-scene 라 자체 keyboard.
    // scene.stop 시 listener 자동 cleanup.
    this.input.keyboard?.on('keydown-ESC', () => this.closeFeedbackForm());

    this.formContainer = this.add.container(width / 2, height / 2);

    // 폼 배경 패널
    this._addFeedbackFormFrame(this.formContainer, 0, 0, 500, 600, FEEDBACK_FORM_UI_FRAME_TEXTURES.panel);

    // 타이틀
    this._addFeedbackFormTitleIcon(this.formContainer, -138, -270);
    const titleLabel = this.add.text(0, -270, '피드백 보내기', {
      fontSize: '24px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.formContainer.add(titleLabel);

    // 타입 선택 버튼
    const types = FEEDBACK_FORM_TYPE_OPTIONS;

    // 키보드 포커스 링 대상: 타입×5 + 제출 + 닫기 (DOM 입력은 Tab+타이핑으로 별도 접근).
    const focusables: Array<{ setFocused: (active: boolean) => void; activate: () => void }> = [];

    types.forEach((t, i) => {
      const x = -200 + i * 100;
      const isSelected = this.selectedType === t.key;
      const btnFrame = this._addFeedbackFormFrame(
        this.formContainer,
        x,
        -220,
        92,
        34,
        FEEDBACK_FORM_UI_FRAME_TEXTURES.button,
        isSelected ? 0x4a9eff : 0x555577,
        1,
      );
      const icon = this._addFeedbackTypeIcon(this.formContainer, t.key, x - 26, -220);
      const baseLabel = icon ? t.label : t.fallbackLabel;
      const btnTextX = icon ? x + 10 : x;
      const btn = this.add.text(btnTextX, -220, baseLabel, {
        fontSize: '14px',
        color: isSelected ? '#dcebff' : '#a8a8c8',
        stroke: '#050510',
        strokeThickness: 2,
        padding: { x: 8, y: 4 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });

      const selectType = () => {
        this.selectedType = t.key;
        this.scene.restart(this.config);
      };
      btnFrame.primary.setInteractive({ useHandCursor: true });
      btnFrame.primary.on('pointerdown', selectType);
      btn.on('pointerdown', selectType);
      this.formContainer.add(btn);
      focusables.push({
        setFocused: (a) => btn.setText(a ? `▶ ${baseLabel}` : baseLabel),
        activate: selectType,
      });
    });

    // HTML DOM 입력 요소 생성 (Phaser 위에 오버레이)
    this.createHtmlInputs(width, height);

    // 제출 버튼
    const submitFrame = this._addFeedbackFormFrame(
      this.formContainer,
      0,
      230,
      150,
      48,
      FEEDBACK_FORM_UI_FRAME_TEXTURES.button,
      0x2ecc71,
      2,
    );
    const submitIcon = this._addFeedbackFormSubmitIcon(this.formContainer, -44, 230);
    const submitLabel = '제출';
    const submitTextX = submitIcon ? 16 : 0;
    const submitBtn = this.add.text(submitTextX, 230, submitLabel, {
      fontSize: '18px',
      color: '#ffffff',
      stroke: '#062515',
      strokeThickness: 2,
      padding: { x: 30, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    submitFrame.primary.setInteractive({ useHandCursor: true });
    submitFrame.primary.on('pointerdown', () => void this.handleSubmit());
    submitBtn.on('pointerdown', () => void this.handleSubmit());
    this.formContainer.add(submitBtn);
    focusables.push({
      setFocused: (a) => {
        submitBtn.setText(submitLabel);
        submitBtn.setColor(a ? '#ffffff' : '#eafff2');
      },
      activate: () => void this.handleSubmit(),
    });

    // 닫기 버튼
    const closeFrame = this._addFeedbackFormFrame(
      this.formContainer,
      220,
      -270,
      42,
      42,
      FEEDBACK_FORM_UI_FRAME_TEXTURES.button,
      0xff4444,
      2,
    );
    const closeIcon = this._addFeedbackFormCloseIcon(this.formContainer, 220, -270);

    closeFrame.primary.setInteractive({ useHandCursor: true });
    closeFrame.primary.on('pointerdown', () => this.closeFeedbackForm());
    closeIcon?.setInteractive({ useHandCursor: true });
    closeIcon?.on('pointerdown', () => this.closeFeedbackForm());
    this.closeIconFallback?.setInteractive({ useHandCursor: true });
    this.closeIconFallback?.on('pointerdown', () => this.closeFeedbackForm());
    focusables.push({
      setFocused: (a) => {
        closeIcon?.setTint(a ? 0xffffff : 0xffbbbb);
        this.closeIconFallback?.setColor(a ? '#ffffff' : '#ffbbbb');
      },
      activate: () => this.closeFeedbackForm(),
    });

    // 키보드 안내
    this.formContainer.add(this.add.text(0, 270, '방향키+Enter: 버튼  ·  Tab: 입력칸  ·  Esc: 닫기', {
      fontSize: '11px', color: '#666688',
    }).setOrigin(0.5));

    this._setupKeyboardNav(focusables);
    this._writeFeedbackFormFrameQaProbe();
  }

  private _addFeedbackFormTitleIcon(
    container: Phaser.GameObjects.Container,
    x: number,
    y: number,
  ): Phaser.GameObjects.Image | null {
    if (!FEEDBACK_FORM_TITLE_ICON_RESOURCE || !this.textures.exists(FEEDBACK_FORM_TITLE_ICON_RESOURCE.key)) {
      this.missingTitleIconKeys.push(FEEDBACK_FORM_TITLE_ICON_RESOURCE?.key ?? 'feedback_form_title_icon');
      this.titleIconFallback = this.add.text(x, y, '>', {
        fontSize: '20px',
        color: '#ffffff',
        fontStyle: 'bold',
      }).setOrigin(0.5).setName('feedback_form_title_icon_fallback');
      container.add(this.titleIconFallback);
      return null;
    }

    const icon = this.add.image(x, y, FEEDBACK_FORM_TITLE_ICON_RESOURCE.key)
      .setName('feedback_form_title_icon');
    icon.setDisplaySize(22, 22);
    icon.setAlpha(0.96);
    icon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    container.add(icon);
    this.titleIcon = icon;
    return icon;
  }

  private _addFeedbackFormSubmitIcon(
    container: Phaser.GameObjects.Container,
    x: number,
    y: number,
  ): Phaser.GameObjects.Image | null {
    if (!FEEDBACK_FORM_SUBMIT_ICON_RESOURCE || !this.textures.exists(FEEDBACK_FORM_SUBMIT_ICON_RESOURCE.key)) {
      this.missingSubmitIconKeys.push(FEEDBACK_FORM_SUBMIT_ICON_RESOURCE?.key ?? 'feedback_form_submit_icon');
      this.submitIconFallback = this.add.text(x, y, '>', {
        fontSize: '18px',
        color: '#ffffff',
        fontStyle: 'bold',
      }).setOrigin(0.5).setName('feedback_form_submit_icon_fallback');
      container.add(this.submitIconFallback);
      return null;
    }

    const icon = this.add.image(x, y, FEEDBACK_FORM_SUBMIT_ICON_RESOURCE.key)
      .setName('feedback_form_submit_icon');
    icon.setDisplaySize(20, 20);
    icon.setAlpha(0.96);
    icon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    container.add(icon);
    this.submitIcon = icon;
    return icon;
  }

  private _addFeedbackFormCloseIcon(
    container: Phaser.GameObjects.Container,
    x: number,
    y: number,
  ): Phaser.GameObjects.Image | null {
    if (!FEEDBACK_FORM_CLOSE_ICON_RESOURCE || !this.textures.exists(FEEDBACK_FORM_CLOSE_ICON_RESOURCE.key)) {
      this.missingCloseIconKeys.push(FEEDBACK_FORM_CLOSE_ICON_RESOURCE?.key ?? 'feedback_form_close_icon');
      this.closeIconFallback = this.add.text(x, y, 'x', {
        fontSize: '18px',
        color: '#ffbbbb',
        fontStyle: 'bold',
      }).setOrigin(0.5).setName('feedback_form_close_icon_fallback');
      container.add(this.closeIconFallback);
      return null;
    }

    const icon = this.add.image(x, y, FEEDBACK_FORM_CLOSE_ICON_RESOURCE.key)
      .setName('feedback_form_close_icon');
    icon.setDisplaySize(18, 18);
    icon.setAlpha(0.96);
    icon.setTint(0xffbbbb);
    icon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    container.add(icon);
    this.closeIcon = icon;
    return icon;
  }

  private _addFeedbackTypeIcon(
    container: Phaser.GameObjects.Container,
    typeKey: FeedbackType,
    x: number,
    y: number,
  ): Phaser.GameObjects.Image | null {
    const texture = FEEDBACK_FORM_TYPE_ICON_TEXTURES[typeKey];
    if (!texture || !this.textures.exists(texture.key)) {
      if (texture) {
        this.missingTypeIconKeys.push(texture.key);
      } else {
        this.missingTypeIconKeys.push(`feedback_type_icon_${typeKey}`);
      }
      this.fallbackTypeIconIds.push(typeKey);
      return null;
    }

    const icon = this.add.image(x, y, texture.key)
      .setName(`feedback_form_type_icon_${typeKey}`);
    icon.setDisplaySize(18, 18);
    icon.setAlpha(0.95);
    container.add(icon);
    this.typeIconRenderedKeys.push(texture.key);

    return icon;
  }

  private _addFeedbackFormFrame(
    container: Phaser.GameObjects.Container,
    x: number,
    y: number,
    width: number,
    height: number,
    texture: typeof FEEDBACK_FORM_UI_FRAME_TEXTURES[keyof typeof FEEDBACK_FORM_UI_FRAME_TEXTURES],
    strokeColor = 0x4a9eff,
    strokeWidth = 2,
  ): FeedbackFormFrameRender {
    if (this.textures.exists(texture.key)) {
      const frame = this.add.image(x, y, texture.key)
        .setName(`feedback_form_frame_${texture.key}`)
        .setDisplaySize(width, height)
        .setAlpha(0.92);
      container.add(frame);
      this.frameQaRenderedCounts.set(texture.key, (this.frameQaRenderedCounts.get(texture.key) ?? 0) + 1);
      const stroke = this.add.rectangle(x, y, width, height, 0x000000, 0)
        .setStrokeStyle(strokeWidth, strokeColor);
      container.add(stroke);
      return { primary: frame, stroke };
    }

    // Aseprite feedback form UI frame 로드 실패 시에만 사용하는 안전 fallback.
    const fallback = this.add.rectangle(x, y, width, height, 0x1a1a2e, 0.95)
      .setStrokeStyle(strokeWidth, strokeColor);
    container.add(fallback);
    return { primary: fallback };
  }

  private _writeFeedbackFormFrameQaProbe(): void {
    if (!this.config.frameQa || typeof document === 'undefined') return;

    const panelTexture = FEEDBACK_FORM_UI_FRAME_TEXTURES.panel;
    const buttonTexture = FEEDBACK_FORM_UI_FRAME_TEXTURES.button;
    const panelRenderedFrameCount = this.frameQaRenderedCounts.get(panelTexture.key) ?? 0;
    const buttonRenderedFrameCount = this.frameQaRenderedCounts.get(buttonTexture.key) ?? 0;
    const hasPanel = this.textures.exists(panelTexture.key) && panelRenderedFrameCount >= 1;
    const hasButtons = this.textures.exists(buttonTexture.key) && buttonRenderedFrameCount >= 7;
    const hasTypeIcons = (
      this.typeIconRenderedKeys.length >= FEEDBACK_FORM_EXPECTED_TYPE_ICON_COUNT
      && this.missingTypeIconKeys.length === 0
      && this.fallbackTypeIconIds.length === 0
    );
    const hasTitleIcon = Boolean(
      FEEDBACK_FORM_TITLE_ICON_RESOURCE
      && this.titleIcon?.active
      && this.titleIcon.texture.key === FEEDBACK_FORM_TITLE_ICON_RESOURCE.key
      && this.missingTitleIconKeys.length === 0,
    );
    const titleIconKey = FEEDBACK_FORM_TITLE_ICON_RESOURCE?.key ?? null;
    const hasSubmitIcon = Boolean(
      FEEDBACK_FORM_SUBMIT_ICON_RESOURCE
      && this.submitIcon?.active
      && this.submitIcon.texture.key === FEEDBACK_FORM_SUBMIT_ICON_RESOURCE.key
      && this.missingSubmitIconKeys.length === 0,
    );
    const submitIconKey = FEEDBACK_FORM_SUBMIT_ICON_RESOURCE?.key ?? null;
    const hasCloseIcon = Boolean(
      FEEDBACK_FORM_CLOSE_ICON_RESOURCE
      && this.closeIcon?.active
      && this.closeIcon.texture.key === FEEDBACK_FORM_CLOSE_ICON_RESOURCE.key
      && this.missingCloseIconKeys.length === 0,
    );
    const closeIconKey = FEEDBACK_FORM_CLOSE_ICON_RESOURCE?.key ?? null;
    const expectedTypeIconKeys = Object.values(FEEDBACK_FORM_TYPE_ICON_TEXTURES)
      .map((texture) => texture?.key ?? null)
      .filter((key): key is NonNullable<typeof key> => key !== null);
    const renderedFrameKeys: string[] = [
      panelRenderedFrameCount > 0 ? panelTexture.key : null,
      buttonRenderedFrameCount > 0 ? buttonTexture.key : null,
    ].filter((key): key is NonNullable<typeof key> => key !== null);
    const missingFrameKeys: string[] = [
      hasPanel ? null : panelTexture.key,
      hasButtons ? null : buttonTexture.key,
    ].filter((key): key is NonNullable<typeof key> => key !== null);

    document.body.dataset.aeternaFeedbackFrameQa = JSON.stringify({
      status: hasPanel && hasButtons && hasTypeIcons && hasTitleIcon && hasSubmitIcon && hasCloseIcon ? 'ready' : 'missing-frame',
      renderedFrameKeys,
      panelRenderedFrameCount,
      buttonRenderedFrameCount,
      expectedButtonFrameCount: 7,
      titleIcon: {
        expectedKey: titleIconKey,
        renderedCount: this.titleIcon?.active ? 1 : 0,
        renderedKey: this.titleIcon?.texture.key ?? null,
        displayWidth: this.titleIcon?.displayWidth ?? 0,
        displayHeight: this.titleIcon?.displayHeight ?? 0,
        fallbackTitleIconRendered: this.titleIconFallback?.active === true,
      },
      missingTitleIconKeys: this.missingTitleIconKeys,
      submitIcon: {
        expectedKey: submitIconKey,
        renderedCount: this.submitIcon?.active ? 1 : 0,
        renderedKey: this.submitIcon?.texture.key ?? null,
        displayWidth: this.submitIcon?.displayWidth ?? 0,
        displayHeight: this.submitIcon?.displayHeight ?? 0,
        fallbackSubmitIconRendered: this.submitIconFallback?.active === true,
      },
      missingSubmitIconKeys: this.missingSubmitIconKeys,
      closeIcon: {
        expectedKey: closeIconKey,
        renderedCount: this.closeIcon?.active ? 1 : 0,
        renderedKey: this.closeIcon?.texture.key ?? null,
        displayWidth: this.closeIcon?.displayWidth ?? 0,
        displayHeight: this.closeIcon?.displayHeight ?? 0,
        fallbackCloseIconRendered: this.closeIconFallback?.active === true,
      },
      missingCloseIconKeys: this.missingCloseIconKeys,
      typeIcon: {
        expectedCount: FEEDBACK_FORM_EXPECTED_TYPE_ICON_COUNT,
        renderedCount: this.typeIconRenderedKeys.length,
        expectedKeys: expectedTypeIconKeys,
        renderedKeys: this.typeIconRenderedKeys,
        fallbackTypeIconIds: this.fallbackTypeIconIds,
      },
      missingTypeIconKeys: this.missingTypeIconKeys,
      missingFrameKeys,
    });
  }

  // 타입5/제출/닫기 Phaser 버튼의 키보드 포커스 링. DOM 입력(제목/설명)에 포커스가 있으면
  // (활성 요소가 INPUT/TEXTAREA) 방향키·Enter 를 양보해 타이핑·커서이동과 충돌하지 않는다.
  private _setupKeyboardNav(
    focusables: Array<{ setFocused: (active: boolean) => void; activate: () => void }>,
  ): void {
    if (focusables.length === 0) return;
    let idx = 0;
    const sync = () => focusables.forEach((f, i) => f.setFocused(i === idx));
    sync();
    const typing = () => {
      const ae = typeof document !== 'undefined' ? document.activeElement : null;
      const tag = ae?.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA';
    };
    const move = (delta: number) => {
      if (typing()) return;
      idx = (idx + delta + focusables.length) % focusables.length;
      sync();
    };
    const onActivate = () => { if (!typing()) focusables[idx]?.activate(); };
    const kb = this.input.keyboard;
    kb?.on('keydown-LEFT', () => move(-1));
    kb?.on('keydown-UP', () => move(-1));
    kb?.on('keydown-RIGHT', () => move(1));
    kb?.on('keydown-DOWN', () => move(1));
    kb?.on('keydown-ENTER', onActivate);
    kb?.on('keydown-SPACE', onActivate);
    // 씬 stop 시 keyboard listener 자동 정리(sub-scene). 별도 off 불필요.
  }

  /** HTML 입력 요소 생성 */
  private createHtmlInputs(width: number, height: number): void {
    // 제목 입력
    const titleInput = this.add.dom(
      width / 2, height / 2 - 140,
      'input', {
        width: '400px',
        height: '30px',
        fontSize: '14px',
        padding: '5px 10px',
        backgroundColor: '#2a2a4e',
        color: '#ffffff',
        border: '1px solid #4a9eff',
        borderRadius: '4px',
        outline: 'none',
      }
    );
    {
      const node = titleInput.node as HTMLInputElement;
      node.placeholder = '제목을 입력하세요';
      // FINDING-DR-2: 스크린 리더 / form 식별 (WCAG 1.3.1, 4.1.2)
      node.id = 'feedback-title';
      node.name = 'feedback-title';
      node.setAttribute('aria-label', '피드백 제목');
      node.autocomplete = 'off';
    }
    (titleInput.node as HTMLInputElement).addEventListener('input', (e) => {
      this.titleText = (e.target as HTMLInputElement).value;
    });
    // 제목칸(단일행)에서 Enter → 제출 (WCAG 2.1.1, CharacterSelect 이름칸과 동일 패턴).
    (titleInput.node as HTMLInputElement).addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        void this.handleSubmit();
      }
    });

    // 설명 입력
    const descInput = this.add.dom(
      width / 2, height / 2 - 20,
      'textarea', {
        width: '400px',
        height: '150px',
        fontSize: '14px',
        padding: '10px',
        backgroundColor: '#2a2a4e',
        color: '#ffffff',
        border: '1px solid #4a9eff',
        borderRadius: '4px',
        outline: 'none',
        resize: 'none',
      }
    );
    {
      const node = descInput.node as HTMLTextAreaElement;
      node.placeholder = '상세 설명을 입력하세요...\n\n재현 방법, 기대 동작, 실제 동작 등';
      // FINDING-DR-2: 스크린 리더 / form 식별
      node.id = 'feedback-description';
      node.name = 'feedback-description';
      node.setAttribute('aria-label', '피드백 상세 설명');
    }
    (descInput.node as HTMLTextAreaElement).addEventListener('input', (e) => {
      this.descriptionText = (e.target as HTMLTextAreaElement).value;
    });
  }

  /** 제출 처리 */
  private async handleSubmit(): Promise<void> {
    if (this.isSubmitting) return;
    if (!this.titleText.trim() || !this.descriptionText.trim()) {
      console.warn('[FeedbackForm] 제목과 설명은 필수입니다.');
      return;
    }

    this.isSubmitting = true;

    const payload: FeedbackPayload = {
      userId: this.config.userId,
      type: this.selectedType,
      title: this.titleText.trim(),
      description: this.descriptionText.trim(),
      priority: this.priority,
      metadata: collectMetadata(this, this.config.gameVersion),
    };

    // 스크린샷 첨부
    if (this.includeScreenshot) {
      payload.screenshot = captureScreenshot(this.game);
    }

    try {
      // NetworkManager 경유로 전송 — Authorization: Bearer 토큰 자동 부착.
      // /beta/feedback 은 비공개 라우트라 raw fetch(토큰 없음)는 항상 401 이었다.
      await networkManager.post('/beta/feedback', payload);
      showCompatToast('피드백이 전송되었습니다. 감사합니다!');
      this.closeFeedbackForm();
    } catch (err) {
      // 실패를 침묵하지 않고 사용자에게 알린다(폼은 열린 채라 재시도 가능).
      console.error('[FeedbackForm] 피드백 전송 오류:', err);
      showCompatToast('피드백 전송에 실패했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      this.isSubmitting = false;
    }
  }

  /** 폼 닫기 — 오버레이로 launch 한 부모 씬이 있으면 resume 한다. */
  private closeFeedbackForm(): void {
    const parent = this.config?.parentSceneKey;
    if (parent) this.scene.resume(parent);
    this.scene.stop();
  }
}
