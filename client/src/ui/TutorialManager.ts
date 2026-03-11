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

// ─── 튜토리얼 매니저 클래스 ─────────────────────────────────────

export class TutorialManager {
  private readonly scene: Phaser.Scene;
  private currentStep: number;
  private isActive: boolean;
  private overlay: Phaser.GameObjects.DOMElement | null = null;
  private readonly serverBaseUrl: string;
  private userId: string | null = null;

  /** 이벤트 리스너 정리용 */
  private boundListeners = new Map<string, () => void>();

  constructor(scene: Phaser.Scene, serverBaseUrl = 'http://localhost:3000') {
    this.scene = scene;
    this.serverBaseUrl = serverBaseUrl;
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
    this.hideOverlay();

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
        <div style="
          position: absolute; top: ${bubbleTop}; left: 50%; transform: translateX(-50%);
          background: rgba(20,20,40,0.95); border: 2px solid #FFD700; border-radius: 12px;
          padding: 20px 28px; max-width: 420px; text-align: center;
          color: #fff; font-family: sans-serif; font-size: 15px; line-height: 1.6;
        ">
          <div style="font-size: 13px; color: #FFD700; margin-bottom: 8px;">
            단계 ${stepDef.step}/5 — ${stepDef.label}
          </div>
          <div style="white-space: pre-wrap;">${stepDef.description}</div>
          <div style="margin-top: 16px; display: flex; gap: 10px; justify-content: center;">
            <button id="tutorial-skip-btn" style="
              padding: 8px 20px; background: #555; color: #fff; border: none;
              border-radius: 6px; cursor: pointer; font-size: 13px;
            ">스킵</button>
            <button id="tutorial-next-btn" style="
              padding: 8px 20px; background: #FFD700; color: #000; border: none;
              border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: bold;
            ">다음 →</button>
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
  }

  private hideOverlay(): void {
    if (this.overlay) {
      this.overlay.destroy();
      this.overlay = null;
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
}
