/**
 * MainMenuScene.ts — 타이틀 화면 (P5-18 → P25-03 API 연결)
 *
 * - 에테르나 크로니클 로고 + 배경
 * - 시작(로그인/회원가입) / 설정 / 크레딧 버튼
 * - JWT 토큰 존재 시 자동 로그인 시도
 * - NetworkManager를 통한 Auth API 호출
 */

import * as Phaser from 'phaser';
import { networkManager } from '../network/NetworkManager';
import { loadingProgress } from '../ui/LoadingProgress';

// ── 상수 ────────────────────────────────────────────────────

const TITLE_TEXT = 'AETHERNA\nCHRONICLE';
const SUBTITLE_TEXT = '에테르나 크로니클';
const BG_COLOR_TOP = 0x0a0a2e;
const BG_COLOR_BOTTOM = 0x16213e;

interface MenuItem {
  label: string;
  action: () => void;
}

// ── MainMenuScene ───────────────────────────────────────────

export class MainMenuScene extends Phaser.Scene {
  private menuItems: Phaser.GameObjects.Text[] = [];
  // FINDING-A4 fix part 2: 키보드 highlight state + label cache (▶ 동적 prefix)
  private menuLabels: string[] = [];
  private menuActions: (() => void)[] = [];
  private menuHighlightIndex = 0;
  private titleText!: Phaser.GameObjects.Text;
  private subtitleText!: Phaser.GameObjects.Text;
  private particleTimer?: Phaser.Time.TimerEvent;

  // P25-03: 로그인 UI
  private loginContainer: Phaser.GameObjects.Container | null = null;
  private usernameInput: HTMLInputElement | null = null;
  private passwordInput: HTMLInputElement | null = null;
  private statusText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'MainMenuScene' });
  }

  // ── 라이프사이클 ─────────────────────────────────────────

  preload(): void {
    // HTML 로딩 화면 연동 — Phaser 로더 진행률을 HTML #loading-progress에 반영
    loadingProgress.bindToLoader(this.load);

    // P33-A: 타이틀 배경 이미지 로드
    this.load.image('title_bg', 'assets/generated/environment/backgrounds/ERB-BG-SKY-DUSK.png');
    this.load.image('title_bg_mid', 'assets/generated/environment/backgrounds/ERB-BG-MID-DUSK.png');

    // 로드 실패 시 무시 (fallback으로 기존 그라디언트 유지)
    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      console.warn(`[MainMenu] 이미지 로드 실패: ${file.key}`);
    });
  }

  create(): void {
    const { width, height } = this.cameras.main;

    this._drawGradientBg(width, height);

    // P33-A: 배경 이미지 레이어 (텍스처 존재 시)
    if (this.textures.exists('title_bg')) {
      this.add.image(width / 2, height / 2, 'title_bg')
        .setDisplaySize(width, height)
        .setAlpha(0.9);
    }
    if (this.textures.exists('title_bg_mid')) {
      this.add.image(width / 2, height / 2, 'title_bg_mid')
        .setDisplaySize(width, height)
        .setAlpha(0.4);
    }

    // P33-A: 반투명 오버레이 (텍스트 가독성)
    this.add.rectangle(width / 2, height / 2, width, height, 0x0a0a2e, 0.45);

    this._spawnAetherParticles(width, height);

    this.titleText = this.add.text(width / 2, height * 0.25, TITLE_TEXT, {
      fontSize: '64px',
      fontFamily: 'monospace',
      color: '#c8a2ff',
      align: 'center',
      stroke: '#4a0080',
      strokeThickness: 6,
      letterSpacing: 2,
    }).setOrigin(0.5).setAlpha(0);

    this.subtitleText = this.add.text(width / 2, height * 0.42, SUBTITLE_TEXT, {
      fontSize: '18px',
      fontFamily: 'monospace',
      color: '#8888cc',
      align: 'center',
    }).setOrigin(0.5).setAlpha(0);

    // 상태 텍스트
    this.statusText = this.add.text(width / 2, height * 0.48, '', {
      fontSize: '12px',
      fontFamily: 'monospace',
      color: '#ffcc44',
    }).setOrigin(0.5);

    // 메뉴 버튼 — ▶ prefix 는 highlight index 따라 동적 적용 (FINDING-A4 part 2)
    const menuDefs: MenuItem[] = [
      { label: '게임 시작', action: () => this._onStart() },
      { label: '⚙  설정',  action: () => this._onSettings() },
      { label: '📜 크레딧', action: () => this._onCredits() },
    ];

    this.menuLabels = menuDefs.map(d => d.label);
    this.menuActions = menuDefs.map(d => d.action);
    this.menuHighlightIndex = 0;

    const menuStartY = height * 0.58;
    const menuGap = 48;

    menuDefs.forEach((def, i) => {
      const btn = this.add.text(width / 2, menuStartY + i * menuGap, this._formatMenuLabel(i), {
        fontSize: '20px',
        fontFamily: 'monospace',
        color: i === 0 ? '#ffffff' : '#cccccc',
      })
        .setOrigin(0.5)
        .setAlpha(0)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => this._setMenuHighlight(i))
        .on('pointerdown', def.action);

      this.menuItems.push(btn);
    });

    // FINDING-A4 part 2: 키보드 navigation (Arrow Up/Down + Enter)
    // WCAG 2.1.1 — 모든 기능을 키보드로 작동 가능해야.
    this.input.keyboard?.on('keydown-UP', () => {
      const next = (this.menuHighlightIndex + this.menuItems.length - 1) % this.menuItems.length;
      this._setMenuHighlight(next);
    });
    this.input.keyboard?.on('keydown-DOWN', () => {
      const next = (this.menuHighlightIndex + 1) % this.menuItems.length;
      this._setMenuHighlight(next);
    });
    this.input.keyboard?.on('keydown-ENTER', () => {
      this.menuActions[this.menuHighlightIndex]?.();
    });
    this.input.keyboard?.on('keydown-SPACE', () => {
      this.menuActions[this.menuHighlightIndex]?.();
    });

    // 페이드 인 시퀀스
    this.tweens.add({ targets: this.titleText, alpha: 1, duration: 800, ease: 'Power2' });
    this.tweens.add({ targets: this.subtitleText, alpha: 1, duration: 600, delay: 400, ease: 'Power2' });
    this.menuItems.forEach((btn, i) => {
      this.tweens.add({ targets: btn, alpha: 1, duration: 500, delay: 800 + i * 150, ease: 'Power2' });
    });

    // P33-B: 타이틀 BGM 재생 (사용자 인터랙션 후)
    this.input.once('pointerdown', () => {
      this._startTitleBgm();
    });
    // 키보드 입력으로도 BGM 시작
    this.input.keyboard?.once('keydown', () => {
      this._startTitleBgm();
    });

    // P25-03: 자동 로그인 시도 (기존 토큰 존재 시)
    if (networkManager.isAuthenticated) {
      this.statusText.setText('기존 세션 확인 중...');
      networkManager.refreshAuth().then((ok) => {
        if (ok) {
          this.statusText.setText(`환영합니다, ${networkManager.username ?? '모험가'}!`);
        } else {
          this.statusText.setText('세션 만료. 다시 로그인해 주세요.');
        }
      }).catch(() => {
        this.statusText.setText('');
      });
    }
  }

  // ── P33-B: 타이틀 BGM ───────────────────────────────────

  private _bgmStarted = false;

  private _startTitleBgm(): void {
    if (this._bgmStarted) return;
    this._bgmStarted = true;

    // soundManifest 키: bgm_sys_02 = title_screen.ogg
    const bgmKey = 'bgm_sys_02';
    if (this.cache.audio.exists(bgmKey)) {
      this.sound.play(bgmKey, { loop: true, volume: 0.3 });
    } else if (this.cache.audio.exists('bgm_sys_01')) {
      // fallback: main_theme
      this.sound.play('bgm_sys_01', { loop: true, volume: 0.3 });
    }
  }

  // ── 시작 버튼 → 로그인/캐릭터 선택 ──────────────────────

  private _onStart(): void {
    // 이미 인증된 경우 바로 캐릭터 선택
    if (networkManager.isAuthenticated) {
      this._cleanupDom();
      this.scene.start('CharacterSelectScene');
      return;
    }

    // 로그인 UI 표시
    this._showLoginUI();
  }

  private _showLoginUI(): void {
    if (this.loginContainer) return;

    const { width, height } = this.cameras.main;
    const cx = width / 2;
    const cy = height / 2;

    // 메뉴 버튼 숨기기
    this.menuItems.forEach(btn => btn.setVisible(false));
    this.loginContainer = this.add.container(cx, cy);

    const bg = this.add.rectangle(0, 0, 360, 280, 0x000000, 0.92)
      .setStrokeStyle(1, 0x6644aa);
    this.loginContainer.add(bg);

    const title = this.add.text(0, -110, '로그인 / 회원가입', {
      fontSize: '18px', color: '#c8a2ff', fontFamily: 'monospace',
    }).setOrigin(0.5);
    this.loginContainer.add(title);

    // DOM 입력 필드 생성
    const canvas = this.game.canvas;
    const rect = canvas.getBoundingClientRect();

    // Scale.FIT 보정: 캔버스 스케일 비율 계산
    const scaleX = rect.width / width;
    const scaleY = rect.height / height;
    const inputW = 240 * scaleX;
    this.usernameInput = this._createInput('아이디', rect.left + cx * scaleX - inputW / 2, rect.top + (cy - 60) * scaleY, inputW);
    this.passwordInput = this._createInput('비밀번호', rect.left + cx * scaleX - inputW / 2, rect.top + (cy - 20) * scaleY, inputW);
    this.passwordInput.type = 'password';

    // 로그인 버튼
    const loginBtn = this.add.text(-60, 40, '[ 로그인 ]', {
      fontSize: '15px', color: '#88ff88', fontFamily: 'monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this._doLogin());
    this.loginContainer.add(loginBtn);

    // 회원가입 버튼
    const registerBtn = this.add.text(60, 40, '[ 가입 ]', {
      fontSize: '15px', color: '#88ccff', fontFamily: 'monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this._doRegister());
    this.loginContainer.add(registerBtn);

    // 에러 표시
    const errorText = this.add.text(0, 80, '', {
      fontSize: '12px', color: '#ff6644', fontFamily: 'monospace',
    }).setOrigin(0.5);
    this.loginContainer.add(errorText);
    (this.loginContainer as any)._errorText = errorText;

    // 닫기
    const closeBtn = this.add.text(160, -120, '✕', {
      fontSize: '18px', color: '#888888',
    }).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this._closeLoginUI());
    this.loginContainer.add(closeBtn);
  }

  private _createInput(placeholder: string, left: number, top: number, w = 240): HTMLInputElement {
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = placeholder;
    input.style.cssText = `
      position: absolute;
      left: ${left}px;
      top: ${top}px;
      width: ${w}px;
      padding: 8px 12px;
      font-size: 14px;
      font-family: monospace;
      background: #1a1a2e;
      color: #ffffff;
      border: 1px solid #6644aa;
      border-radius: 4px;
      text-align: center;
      outline: none;
      z-index: 100;
    `;
    document.body.appendChild(input);
    return input;
  }

  private async _doLogin(): Promise<void> {
    const username = this.usernameInput?.value.trim() ?? '';
    const password = this.passwordInput?.value ?? '';
    const errorText = (this.loginContainer as any)?._errorText as Phaser.GameObjects.Text;

    if (!username || !password) {
      errorText?.setText('아이디와 비밀번호를 입력해 주세요.');
      return;
    }

    errorText?.setText('로그인 중...');

    try {
      const res = await networkManager.login({ username, password });
      if (res.success && res.token) {
        this._cleanupDom();
        this.scene.start('CharacterSelectScene');
      } else {
        errorText?.setText(res.error ?? '로그인 실패');
      }
    } catch (err: any) {
      let msg = '서버 연결 실패';
      try {
        const body = err?.responseBody ?? '';
        const parsed = typeof body === 'string' && body.startsWith('{') ? JSON.parse(body) : null;
        if (parsed?.error) msg = parsed.error;
      } catch { /* 무시 */ }
      errorText?.setText(msg);
      console.error('[MainMenu] 로그인 에러:', err);
    }
  }

  private async _doRegister(): Promise<void> {
    const username = this.usernameInput?.value.trim() ?? '';
    const password = this.passwordInput?.value ?? '';
    const errorText = (this.loginContainer as any)?._errorText as Phaser.GameObjects.Text;

    if (!username || !password) {
      errorText?.setText('아이디와 비밀번호를 입력해 주세요.');
      return;
    }
    if (password.length < 6) {
      errorText?.setText('비밀번호는 6자 이상이어야 합니다.');
      return;
    }

    errorText?.setText('가입 중...');

    try {
      const res = await networkManager.register({ username, password });
      if (res.success && res.token) {
        this._cleanupDom();
        this.scene.start('CharacterSelectScene');
      } else {
        errorText?.setText(res.error ?? '가입 실패');
      }
    } catch (err: any) {
      let msg = '서버 연결 실패';
      try {
        const body = err?.responseBody ?? '';
        const parsed = typeof body === 'string' && body.startsWith('{') ? JSON.parse(body) : null;
        if (parsed?.error) msg = parsed.error;
      } catch { /* 파싱 실패 무시 */ }
      errorText?.setText(msg);
      console.error('[MainMenu] 가입 에러:', err);
    }
  }

  private _closeLoginUI(): void {
    this._cleanupDom();
    this.loginContainer?.destroy();
    this.loginContainer = null;
    // 메뉴 버튼 다시 표시
    this.menuItems.forEach(btn => btn.setVisible(true));
  }

  private _cleanupDom(): void {
    this.usernameInput?.remove();
    this.passwordInput?.remove();
    this.usernameInput = null;
    this.passwordInput = null;
  }

  // ── 기존 메뉴 동작 ──────────────────────────────────────

  // FINDING-A4 fix part 2: 키보드 highlight 동기화 helper
  private _formatMenuLabel(i: number): string {
    const label = this.menuLabels[i] ?? '';
    return i === this.menuHighlightIndex ? `▶  ${label}` : `   ${label}`;
  }

  private _setMenuHighlight(index: number): void {
    if (index === this.menuHighlightIndex) return;
    this.menuHighlightIndex = index;
    this.menuItems.forEach((btn, i) => {
      btn.setText(this._formatMenuLabel(i));
      btn.setColor(i === index ? '#ffffff' : '#cccccc');
    });
  }

  private _onSettings(): void {
    this.scene.start('SettingsScene');
  }

  private _onCredits(): void {
    this._showCreditsOverlay();
  }

  // ── 배경 ─────────────────────────────────────────────────

  private _drawGradientBg(w: number, h: number): void {
    const gfx = this.add.graphics();
    const steps = 32;
    for (let i = 0; i < steps; i++) {
      const ratio = i / steps;
      const color = Phaser.Display.Color.Interpolate.ColorWithColor(
        Phaser.Display.Color.IntegerToColor(BG_COLOR_TOP),
        Phaser.Display.Color.IntegerToColor(BG_COLOR_BOTTOM),
        steps, i,
      );
      gfx.fillStyle(Phaser.Display.Color.GetColor(color.r, color.g, color.b));
      gfx.fillRect(0, ratio * h, w, h / steps + 1);
    }
  }

  private _spawnAetherParticles(w: number, h: number): void {
    this.particleTimer = this.time.addEvent({
      delay: 400,
      loop: true,
      callback: () => {
        const x = Phaser.Math.Between(0, w);
        const y = Phaser.Math.Between(0, h);
        const size = Phaser.Math.Between(1, 3);
        const dot = this.add.rectangle(x, y, size, size, 0xaaaaff, 0.3);
        this.tweens.add({
          targets: dot, alpha: 0, y: y - 40, duration: 2000, ease: 'Power1',
          onComplete: () => dot.destroy(),
        });
      },
    });
  }

  private _showCreditsOverlay(): void {
    const { width, height } = this.cameras.main;
    const cx = width / 2;
    const cy = height / 2;

    const container = this.add.container(cx, cy);
    const bg = this.add.rectangle(0, 0, 400, 300, 0x000000, 0.9).setStrokeStyle(1, 0x6644aa);
    container.add(bg);

    const credits = [
      '— 에테르나 크로니클 —', '',
      '기획·개발: Crisious',
      '엔진: Phaser 3',
      '서버: Fastify + Prisma', '',
      '[ 닫기 ]',
    ];

    credits.forEach((line, i) => {
      const isClose = line === '[ 닫기 ]';
      const txt = this.add.text(0, -100 + i * 28, line, {
        fontSize: isClose ? '16px' : '14px',
        color: isClose ? '#88ff88' : '#cccccc',
        fontFamily: 'monospace',
      }).setOrigin(0.5);
      if (isClose) {
        txt.setInteractive({ useHandCursor: true });
        txt.on('pointerdown', () => container.destroy());
      }
      container.add(txt);
    });
  }

  shutdown(): void {
    this._cleanupDom();
    this.particleTimer?.destroy();
    this.menuItems = [];
  }
}
