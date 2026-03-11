/**
 * Phaser UI 피드백 폼 (P6-19)
 * 버그/기능/밸런스 리포트 + 스크린샷 첨부 + 메타데이터 자동수집
 */
import Phaser from 'phaser';

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

interface FeedbackFormConfig {
  apiUrl: string;
  userId: string;
  gameVersion: string;
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

  constructor() {
    super({ key: 'FeedbackForm' });
  }

  init(data: FeedbackFormConfig): void {
    this.config = data;
  }

  create(): void {
    const { width, height } = this.scale;

    // 반투명 배경 오버레이
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7);
    overlay.setInteractive();

    this.formContainer = this.add.container(width / 2, height / 2);

    // 폼 배경 패널
    const panel = this.add.rectangle(0, 0, 500, 600, 0x1a1a2e, 0.95);
    panel.setStrokeStyle(2, 0x4a9eff);
    this.formContainer.add(panel);

    // 타이틀
    const titleLabel = this.add.text(0, -270, '📝 피드백 보내기', {
      fontSize: '24px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.formContainer.add(titleLabel);

    // 타입 선택 버튼
    const types: { key: FeedbackType; label: string; emoji: string }[] = [
      { key: 'bug', label: '버그', emoji: '🐛' },
      { key: 'feature', label: '기능', emoji: '💡' },
      { key: 'balance', label: '밸런스', emoji: '⚖️' },
      { key: 'ux', label: 'UX', emoji: '🎨' },
      { key: 'other', label: '기타', emoji: '📌' },
    ];

    types.forEach((t, i) => {
      const x = -200 + i * 90;
      const btn = this.add.text(x, -220, `${t.emoji} ${t.label}`, {
        fontSize: '14px',
        color: this.selectedType === t.key ? '#4a9eff' : '#888888',
        backgroundColor: this.selectedType === t.key ? '#2a2a4e' : '#1a1a2e',
        padding: { x: 8, y: 4 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });

      btn.on('pointerdown', () => {
        this.selectedType = t.key;
        this.scene.restart(this.config);
      });
      this.formContainer.add(btn);
    });

    // HTML DOM 입력 요소 생성 (Phaser 위에 오버레이)
    this.createHtmlInputs(width, height);

    // 제출 버튼
    const submitBtn = this.add.text(0, 230, '✅ 제출', {
      fontSize: '18px',
      color: '#ffffff',
      backgroundColor: '#2ecc71',
      padding: { x: 30, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    submitBtn.on('pointerdown', () => void this.handleSubmit());
    this.formContainer.add(submitBtn);

    // 닫기 버튼
    const closeBtn = this.add.text(220, -270, '✕', {
      fontSize: '20px',
      color: '#ff4444',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    closeBtn.on('pointerdown', () => this.closeFeedbackForm());
    this.formContainer.add(closeBtn);
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
    (titleInput.node as HTMLInputElement).placeholder = '제목을 입력하세요';
    (titleInput.node as HTMLInputElement).addEventListener('input', (e) => {
      this.titleText = (e.target as HTMLInputElement).value;
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
    (descInput.node as HTMLTextAreaElement).placeholder = '상세 설명을 입력하세요...\n\n재현 방법, 기대 동작, 실제 동작 등';
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
      const res = await fetch(`${this.config.apiUrl}/beta/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        console.log('[FeedbackForm] 피드백 전송 성공');
        this.closeFeedbackForm();
      } else {
        console.error('[FeedbackForm] 피드백 전송 실패:', res.status);
      }
    } catch (err) {
      console.error('[FeedbackForm] 피드백 전송 오류:', err);
    } finally {
      this.isSubmitting = false;
    }
  }

  /** 폼 닫기 */
  private closeFeedbackForm(): void {
    this.scene.stop('FeedbackForm');
  }
}
