/**
 * Phaser UI 피드백 폼 (P6-19)
 * 버그/기능/밸런스 리포트 + 스크린샷 첨부 + 메타데이터 자동수집
 */
import Phaser from 'phaser';
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

interface FeedbackFormConfig {
  apiUrl: string;
  userId: string;
  gameVersion: string;
  /** 오버레이로 launch 한 부모 씬 — 닫을 때 resume 한다(없으면 stop 만). */
  parentSceneKey?: string;
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

    // FINDING-A4 ext26: ESC 닫기 (WCAG 2.1.1) — sub-scene 라 자체 keyboard.
    // scene.stop 시 listener 자동 cleanup.
    this.input.keyboard?.on('keydown-ESC', () => this.closeFeedbackForm());

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

    // 키보드 포커스 링 대상: 타입×5 + 제출 + 닫기 (DOM 입력은 Tab+타이핑으로 별도 접근).
    const focusables: Array<{ setFocused: (active: boolean) => void; activate: () => void }> = [];

    types.forEach((t, i) => {
      const x = -200 + i * 90;
      const baseLabel = `${t.emoji} ${t.label}`;
      const btn = this.add.text(x, -220, baseLabel, {
        fontSize: '14px',
        color: this.selectedType === t.key ? '#4a9eff' : '#888888',
        backgroundColor: this.selectedType === t.key ? '#2a2a4e' : '#1a1a2e',
        padding: { x: 8, y: 4 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });

      const selectType = () => {
        this.selectedType = t.key;
        this.scene.restart(this.config);
      };
      btn.on('pointerdown', selectType);
      this.formContainer.add(btn);
      focusables.push({
        setFocused: (a) => btn.setText(a ? `▶${baseLabel}` : baseLabel),
        activate: selectType,
      });
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
    focusables.push({
      setFocused: (a) => submitBtn.setText(a ? '▶ ✅ 제출' : '✅ 제출'),
      activate: () => void this.handleSubmit(),
    });

    // 닫기 버튼
    const closeBtn = this.add.text(220, -270, '✕', {
      fontSize: '20px',
      color: '#ff4444',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    closeBtn.on('pointerdown', () => this.closeFeedbackForm());
    this.formContainer.add(closeBtn);
    focusables.push({
      setFocused: (a) => closeBtn.setColor(a ? '#ffffff' : '#ff4444'),
      activate: () => this.closeFeedbackForm(),
    });

    // 키보드 안내
    this.formContainer.add(this.add.text(0, 270, '방향키+Enter: 버튼  ·  Tab: 입력칸  ·  Esc: 닫기', {
      fontSize: '11px', color: '#666688',
    }).setOrigin(0.5));

    this._setupKeyboardNav(focusables);
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
