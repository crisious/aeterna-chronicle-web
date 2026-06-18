/**
 * 튜토리얼 매니저 — 5단계 인게임 튜토리얼 UI 오버레이
 * P4-13: 튜토리얼 시스템
 *
 * 단계: 이동 → 전투 → 인벤토리 → 퀘스트 → 소셜
 * - 하이라이트 마스크 + 말풍선 UI 오버레이
 * - 단계별 완료 트리거 (이벤트 기반)
 * - 스킵 옵션 + 재시청 가능
 * - 진행도 localStorage 저장
 */
import * as Phaser from 'phaser';
import { getSpriteResourceForSkillIcon } from '../assets/spriteResourceManifest';

// ─── 튜토리얼 단계 정의 ─────────────────────────────────────────

export interface TutorialStepDef {
  step: number;
  name: string;
  label: string;
  description: string;
  /** 하이라이트할 영역 (정규화 좌표 0~1) */
  highlightRect?: { x: number; y: number; w: number; h: number };
  /** 말풍선 위치 */
  bubblePosition: 'top' | 'bottom' | 'center';
  /** 완료 조건 이벤트 이름 */
  completeTrigger: string;
}

const TUTORIAL_STEPS: TutorialStepDef[] = [
  {
    step: 1,
    name: 'movement',
    label: '이동 튜토리얼',
    description: 'WASD 또는 방향키로 캐릭터를 이동시켜보세요.\n목표 지점까지 걸어가면 완료!',
    highlightRect: { x: 0.3, y: 0.3, w: 0.4, h: 0.4 },
    bubblePosition: 'top',
    completeTrigger: 'tutorial:movement:complete',
  },
  {
    step: 2,
    name: 'combat',
    label: '전투 튜토리얼',
    description: '적을 클릭하여 공격하세요.\n기본 공격과 스킬을 사용해 적을 처치하면 완료!',
    highlightRect: { x: 0.6, y: 0.2, w: 0.3, h: 0.3 },
    bubblePosition: 'bottom',
    completeTrigger: 'tutorial:combat:complete',
  },
  {
    step: 3,
    name: 'inventory',
    label: '인벤토리 튜토리얼',
    description: 'I 키를 눌러 인벤토리를 열어보세요.\n아이템을 장착하면 완료!',
    highlightRect: { x: 0.7, y: 0.0, w: 0.3, h: 0.1 },
    bubblePosition: 'center',
    completeTrigger: 'tutorial:inventory:complete',
  },
  {
    step: 4,
    name: 'quest',
    label: '퀘스트 튜토리얼',
    description: 'NPC에게 말을 걸어 퀘스트를 수락하세요.\n퀘스트 로그에서 진행 상황을 확인할 수 있습니다.',
    highlightRect: { x: 0.0, y: 0.2, w: 0.25, h: 0.3 },
    bubblePosition: 'bottom',
    completeTrigger: 'tutorial:quest:complete',
  },
  {
    step: 5,
    name: 'social',
    label: '소셜 튜토리얼',
    description: 'Enter 키로 채팅창을 열어 메시지를 보내보세요.\n친구 추가와 파티 시스템도 사용해보세요!',
    highlightRect: { x: 0.0, y: 0.8, w: 1.0, h: 0.2 },
    bubblePosition: 'top',
    completeTrigger: 'tutorial:social:complete',
  },
];

// ─── localStorage 키 ────────────────────────────────────────────

const STORAGE_KEY = 'aeterna_tutorial_step';

interface TutorialManagerFrameTexture {
  key: string;
  path: string;
}

export const TUTORIAL_MANAGER_UI_FRAME_TEXTURES = {
  panel: {
    key: 'ui_frame_tutorial_manager_panel',
    path: 'assets/generated/ui/frames/UI-HUD-005-DEF.png',
  },
  actionButton: {
    key: 'ui_frame_tutorial_manager_action_button',
    path: 'assets/generated/ui/frames/UI-BTN-006-DEF.png',
  },
} as const satisfies Record<string, TutorialManagerFrameTexture>;

const TUTORIAL_MANAGER_EXPECTED_PANEL_FRAME_COUNT = 1;
const TUTORIAL_MANAGER_EXPECTED_ACTION_BUTTON_FRAME_COUNT = 2;
const TUTORIAL_MANAGER_NEXT_BUTTON_ICON_ID = 'skill_mw_arrow';

export function preloadTutorialManagerUiFrameTextures(scene: Phaser.Scene): void {
  for (const texture of Object.values(TUTORIAL_MANAGER_UI_FRAME_TEXTURES)) {
    if (!scene.textures.exists(texture.key)) {
      scene.load.image(texture.key, texture.path);
    }
  }

  const nextButtonIconResource = getSpriteResourceForSkillIcon(TUTORIAL_MANAGER_NEXT_BUTTON_ICON_ID);
  if (nextButtonIconResource && !scene.textures.exists(nextButtonIconResource.key)) {
    scene.load.image(nextButtonIconResource.key, nextButtonIconResource.path);
  }
}

export interface TutorialManagerOptions {
  frameQa?: boolean;
}

// ─── 튜토리얼 매니저 클래스 ─────────────────────────────────────

export class TutorialManager {
  private readonly scene: Phaser.Scene;
  private currentStep: number;
  private isActive: boolean;
  private overlay: Phaser.GameObjects.DOMElement | null = null;
  private readonly serverBaseUrl: string;
  private readonly frameQa: boolean;
  private currentStepDef: TutorialStepDef | null = null;
  private userId: string | null = null;

  /** 이벤트 리스너 정리용 */
  private boundListeners = new Map<string, () => void>();

  constructor(
    scene: Phaser.Scene,
    serverBaseUrl = 'http://localhost:3000',
    options: TutorialManagerOptions = {},
  ) {
    this.scene = scene;
    this.serverBaseUrl = serverBaseUrl;
    this.frameQa = options.frameQa === true;
    this.currentStep = this.loadProgress();
    this.isActive = false;
  }

  // ── 초기화 ──────────────────────────────────────────────────

  /** 튜토리얼 시작 (userId 설정 + 서버 동기화) */
  async init(userId: string): Promise<void> {
    this.userId = userId;

    // 서버에서 진행 상태 조회
    try {
      const res = await fetch(`${this.serverBaseUrl}/api/tutorial/${userId}`);
      if (res.ok) {
        const data = (await res.json()) as { tutorialStep: number; isCompleted: boolean };
        this.currentStep = data.tutorialStep;
        this.saveProgress();

        if (data.isCompleted) {
          this.isActive = false;
          return;
        }
      }
    } catch {
      // 서버 연결 실패 시 로컬 진행도 사용
    }

    if (this.currentStep < 5) {
      this.start();
    }
  }

  // ── 시작/종료 ─────────────────────────────────────────────────

  /** 튜토리얼 시작 (현재 단계부터) */
  start(): void {
    this.isActive = true;
    this.showStep(this.currentStep + 1);
  }

  /** 튜토리얼 중단 */
  stop(): void {
    this.isActive = false;
    this.hideOverlay();
    this.clearListeners();
  }

  // ── 단계 표시 ─────────────────────────────────────────────────

  private showStep(stepNum: number): void {
    const stepDef = TUTORIAL_STEPS.find((s) => s.step === stepNum);
    if (!stepDef) {
      // 모든 단계 완료
      this.isActive = false;
      this.hideOverlay();
      return;
    }

    this.renderOverlay(stepDef);
    this.registerTrigger(stepDef);
  }

  // ── UI 렌더링 ─────────────────────────────────────────────────

  private renderOverlay(stepDef: TutorialStepDef): void {
    this.hideOverlay(false);
    this.currentStepDef = stepDef;

    const { width, height } = this.scene.scale;
    const hl = stepDef.highlightRect ?? { x: 0.3, y: 0.3, w: 0.4, h: 0.4 };

    // 하이라이트 영역 (px)
    const hlX = Math.round(hl.x * width);
    const hlY = Math.round(hl.y * height);
    const hlW = Math.round(hl.w * width);
    const hlH = Math.round(hl.h * height);

    // 말풍선 위치
    let bubbleTop: string;
    switch (stepDef.bubblePosition) {
      case 'top':
        bubbleTop = '10%';
        break;
      case 'bottom':
        bubbleTop = '75%';
        break;
      default:
        bubbleTop = '40%';
    }

    const panelTexture = TUTORIAL_MANAGER_UI_FRAME_TEXTURES.panel;
    const actionButtonTexture = TUTORIAL_MANAGER_UI_FRAME_TEXTURES.actionButton;
    const hasPanelFrame = this.scene.textures.exists(panelTexture.key);
    const hasActionButtonFrame = this.scene.textures.exists(actionButtonTexture.key);
    const nextButtonIconResource = getSpriteResourceForSkillIcon(TUTORIAL_MANAGER_NEXT_BUTTON_ICON_ID);
    const hasNextButtonIcon = Boolean(
      nextButtonIconResource && this.scene.textures.exists(nextButtonIconResource.key),
    );
    const panelFrameStyle = hasPanelFrame
      ? `
          background-color: rgba(7, 17, 32, 0.36);
          background-image: linear-gradient(rgba(7,17,32,0.56), rgba(7,17,32,0.56)), url('/${panelTexture.path}');
          background-repeat: no-repeat;
          background-position: center;
          background-size: 100% 100%;
          border: 0; border-radius: 0;
          padding: 28px 40px; max-width: 460px; min-width: 360px;
          box-shadow: 0 18px 42px rgba(0,0,0,0.34);
        `
      : `
          background: rgba(20,20,40,0.95); border: 2px solid #FFD700; border-radius: 12px;
          padding: 20px 28px; max-width: 420px;
        `;
    const buttonFrameStyle = hasActionButtonFrame
      ? `
              min-width: 96px; height: 34px; padding: 0 18px;
              box-sizing: border-box; display: inline-flex; align-items: center; justify-content: center; gap: 6px;
              background-color: rgba(17, 31, 52, 0.58);
              background-image: linear-gradient(rgba(16,29,48,0.42), rgba(16,29,48,0.42)), url('/${actionButtonTexture.path}');
              background-repeat: no-repeat;
              background-position: center;
              background-size: 100% 100%;
              color: #f7fbff; border: 0; border-radius: 0;
              cursor: pointer; font-size: 13px; font-weight: 700;
              text-shadow: 0 1px 2px rgba(0,0,0,0.66);
        `
      : `
              padding: 8px 20px; background: #555; color: #fff; border: none;
              border-radius: 6px; cursor: pointer; font-size: 13px;
              box-sizing: border-box; display: inline-flex; align-items: center; justify-content: center; gap: 6px;
        `;
    const nextButtonColorStyle = hasActionButtonFrame
      ? ''
      : 'background: #FFD700; color: #000; font-weight: bold;';
    const safeLabel = this.escapeHtml(stepDef.label);
    const safeDescription = this.escapeHtml(stepDef.description);
    const nextButtonContent = hasNextButtonIcon && nextButtonIconResource
      ? `다음 <img
              data-aeterna-icon-role="next-button-icon"
              data-aeterna-icon-id="${TUTORIAL_MANAGER_NEXT_BUTTON_ICON_ID}"
              data-aeterna-icon-key="${nextButtonIconResource.key}"
              data-aeterna-icon-path="${nextButtonIconResource.path}"
              src="/${nextButtonIconResource.path}"
              alt=""
              aria-hidden="true"
              style="width: 24px; height: 24px; image-rendering: pixelated; object-fit: contain; flex: 0 0 auto;"
            >`
      : '다음 →';

    const html = `
      <div id="tutorial-overlay" style="
        position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
        pointer-events: auto; z-index: 9999;
      ">
        <!-- 반투명 마스크 (하이라이트 영역 제외) -->
        <svg width="100%" height="100%" style="position:absolute;top:0;left:0;">
          <defs>
            <mask id="tutorial-mask">
              <rect width="100%" height="100%" fill="white"/>
              <rect x="${hlX}" y="${hlY}" width="${hlW}" height="${hlH}" rx="8" fill="black"/>
            </mask>
          </defs>
          <rect width="100%" height="100%" fill="rgba(0,0,0,0.6)" mask="url(#tutorial-mask)"/>
          <rect x="${hlX}" y="${hlY}" width="${hlW}" height="${hlH}" rx="8"
                fill="none" stroke="#FFD700" stroke-width="3" stroke-dasharray="8,4"/>
        </svg>

        <!-- 말풍선 -->
        <div id="tutorial-panel"
          data-aeterna-frame-role="panel"
          data-aeterna-frame-key="${panelTexture.key}"
          data-aeterna-frame-path="${panelTexture.path}"
          style="
          position: absolute; top: ${bubbleTop}; left: 50%; transform: translateX(-50%);
          ${panelFrameStyle}
          text-align: center;
          color: #fff; font-family: sans-serif; font-size: 15px; line-height: 1.6;
        ">
          <div style="font-size: 13px; color: #FFD700; margin-bottom: 8px;">
            단계 ${stepDef.step}/5 — ${safeLabel}
          </div>
          <div style="white-space: pre-wrap;">${safeDescription}</div>
          <div style="margin-top: 16px; display: flex; gap: 10px; justify-content: center;">
            <button id="tutorial-skip-btn"
              data-aeterna-frame-role="action-button"
              data-aeterna-frame-key="${actionButtonTexture.key}"
              data-aeterna-frame-path="${actionButtonTexture.path}"
              style="
              ${buttonFrameStyle}
            ">스킵</button>
            <button id="tutorial-next-btn"
              data-aeterna-frame-role="action-button"
              data-aeterna-frame-key="${actionButtonTexture.key}"
              data-aeterna-frame-path="${actionButtonTexture.path}"
              style="
              ${buttonFrameStyle}
              ${nextButtonColorStyle}
            ">${nextButtonContent}</button>
          </div>
        </div>
      </div>
    `;

    const dom = this.scene.add.dom(width / 2, height / 2).createFromHTML(html);
    dom.setDepth(10000);
    this.overlay = dom;

    // 버튼 이벤트
    const skipBtn = dom.getChildByID('tutorial-skip-btn') as HTMLElement | null;
    const nextBtn = dom.getChildByID('tutorial-next-btn') as HTMLElement | null;

    skipBtn?.addEventListener('click', () => {
      void this.skip();
    });

    nextBtn?.addEventListener('click', () => {
      void this.completeCurrentStep();
    });

    this.writeFrameQaProbeIfEnabled('ready');
  }

  private hideOverlay(writeProbe = true): void {
    if (this.overlay) {
      this.overlay.destroy();
      this.overlay = null;
    }
    this.currentStepDef = null;
    if (writeProbe) {
      this.writeFrameQaProbeIfEnabled('hidden');
    }
  }

  // ── 이벤트 트리거 ─────────────────────────────────────────────

  private registerTrigger(stepDef: TutorialStepDef): void {
    this.clearListeners();

    const handler = (): void => {
      void this.completeCurrentStep();
    };

    this.scene.events.on(stepDef.completeTrigger, handler);
    this.boundListeners.set(stepDef.completeTrigger, handler);
  }

  private clearListeners(): void {
    for (const [event, handler] of this.boundListeners) {
      this.scene.events.off(event, handler);
    }
    this.boundListeners.clear();
  }

  // ── 단계 완료 ─────────────────────────────────────────────────

  async completeCurrentStep(): Promise<void> {
    if (!this.isActive) return;

    this.currentStep = Math.min(this.currentStep + 1, 5);
    this.saveProgress();

    // 서버에 완료 알림
    if (this.userId) {
      try {
        await fetch(`${this.serverBaseUrl}/api/tutorial/${this.userId}/complete`, {
          method: 'POST',
        });
      } catch {
        // 서버 실패 시 로컬만 업데이트
      }
    }

    if (this.currentStep >= 5) {
      this.stop();
      this.scene.events.emit('tutorial:allComplete');
    } else {
      this.showStep(this.currentStep + 1);
    }
  }

  // ── 스킵 ──────────────────────────────────────────────────────

  async skip(): Promise<void> {
    this.currentStep = 5;
    this.saveProgress();

    if (this.userId) {
      try {
        await fetch(`${this.serverBaseUrl}/api/tutorial/${this.userId}/skip`, {
          method: 'POST',
        });
      } catch {
        // 서버 실패 시 로컬만
      }
    }

    this.stop();
    this.scene.events.emit('tutorial:skipped');
  }

  // ── 재시청 ────────────────────────────────────────────────────

  async reset(): Promise<void> {
    this.currentStep = 0;
    this.saveProgress();

    if (this.userId) {
      try {
        await fetch(`${this.serverBaseUrl}/api/tutorial/${this.userId}/reset`, {
          method: 'POST',
        });
      } catch {
        // 서버 실패 시 로컬만
      }
    }

    this.start();
  }

  // ── localStorage ──────────────────────────────────────────────

  private saveProgress(): void {
    try {
      localStorage.setItem(STORAGE_KEY, String(this.currentStep));
    } catch {
      // SSR/환경 미지원 시 무시
    }
  }

  private loadProgress(): number {
    try {
      const val = localStorage.getItem(STORAGE_KEY);
      return val ? parseInt(val, 10) || 0 : 0;
    } catch {
      return 0;
    }
  }

  // ── 상태 조회 ─────────────────────────────────────────────────

  getCurrentStep(): number {
    return this.currentStep;
  }

  getIsActive(): boolean {
    return this.isActive;
  }

  isCompleted(): boolean {
    return this.currentStep >= 5;
  }

  public writeFrameQaProbe(status: 'ready' | 'hidden' = 'ready'): void {
    if (typeof document === 'undefined' || !document.body) return;

    const root = this.overlay?.node as HTMLElement | undefined;
    const panel = root?.querySelector('[data-aeterna-frame-role="panel"]') as HTMLElement | null;
    const nextButton = root?.querySelector('#tutorial-next-btn') as HTMLElement | null;
    const nextButtonIcon = root?.querySelector('[data-aeterna-icon-role="next-button-icon"]') as HTMLImageElement | null;
    const actionButtons = Array.from(
      root?.querySelectorAll('[data-aeterna-frame-role="action-button"]') ?? [],
    ) as HTMLElement[];
    const panelTexture = TUTORIAL_MANAGER_UI_FRAME_TEXTURES.panel;
    const actionButtonTexture = TUTORIAL_MANAGER_UI_FRAME_TEXTURES.actionButton;
    const nextButtonIconResource = getSpriteResourceForSkillIcon(TUTORIAL_MANAGER_NEXT_BUTTON_ICON_ID);
    const missingFrameKeys = Object.values(TUTORIAL_MANAGER_UI_FRAME_TEXTURES)
      .filter((texture) => !this.scene.textures.exists(texture.key))
      .map((texture) => texture.key);
    const nextButtonLegacyGlyphPresent = nextButton?.textContent?.includes('→') === true;
    const missingNextButtonIconKeys = status === 'ready' && nextButtonIconResource && !nextButtonIcon
      ? [nextButtonIconResource.key]
      : [];
    const qaStatus = status === 'ready'
      && (missingFrameKeys.length > 0 || missingNextButtonIconKeys.length > 0 || nextButtonLegacyGlyphPresent)
      ? 'missing-frame'
      : status;

    document.body.dataset.aeternaTutorialManagerFrameQa = JSON.stringify({
      status: qaStatus,
      active: this.isActive && this.overlay?.active === true,
      currentStep: this.currentStep,
      currentStepName: this.currentStepDef?.name ?? null,
      panelFrame: {
        key: panelTexture.key,
        path: panelTexture.path,
        renderedCount: panel?.dataset.aeternaFrameKey === panelTexture.key ? 1 : 0,
        expectedCount: status === 'ready' ? TUTORIAL_MANAGER_EXPECTED_PANEL_FRAME_COUNT : 0,
        cssBackground: panel?.style.backgroundImage ?? '',
        displayWidth: panel?.getBoundingClientRect().width ?? 0,
        displayHeight: panel?.getBoundingClientRect().height ?? 0,
      },
      actionButtonFrame: {
        key: actionButtonTexture.key,
        path: actionButtonTexture.path,
        renderedCount: actionButtons.filter((button) => button.dataset.aeternaFrameKey === actionButtonTexture.key).length,
        expectedCount: status === 'ready' ? TUTORIAL_MANAGER_EXPECTED_ACTION_BUTTON_FRAME_COUNT : 0,
        cssBackgrounds: actionButtons.map((button) => button.style.backgroundImage),
        displaySizes: actionButtons.map((button) => {
          const rect = button.getBoundingClientRect();
          return { width: rect.width, height: rect.height };
        }),
      },
      nextButtonIcon: {
        iconId: TUTORIAL_MANAGER_NEXT_BUTTON_ICON_ID,
        key: nextButtonIconResource?.key ?? null,
        path: nextButtonIconResource?.path ?? null,
        renderedCount: nextButtonIcon?.dataset.aeternaIconKey === nextButtonIconResource?.key ? 1 : 0,
        expectedCount: status === 'ready' ? 1 : 0,
        renderedKeys: nextButtonIcon ? [nextButtonIcon.dataset.aeternaIconKey ?? ''] : [],
        displaySizes: nextButtonIcon
          ? [{
              width: nextButtonIcon.getBoundingClientRect().width,
              height: nextButtonIcon.getBoundingClientRect().height,
            }]
          : [],
        naturalSizes: nextButtonIcon
          ? [{ width: nextButtonIcon.naturalWidth, height: nextButtonIcon.naturalHeight }]
          : [],
      },
      nextButtonLegacyGlyphPresent,
      missingNextButtonIconKeys,
      missingFrameKeys,
      visibleCanvasCount: document.querySelectorAll('canvas').length,
    });
  }

  private writeFrameQaProbeIfEnabled(status: 'ready' | 'hidden'): void {
    if (this.frameQa || this.isFrameQaRoute()) {
      this.writeFrameQaProbe(status);
    }
  }

  private isFrameQaRoute(): boolean {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('tutorialManagerFrameQa') === '1';
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
