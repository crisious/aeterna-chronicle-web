/**
 * GameScene — 메인 게임 씬 (P10-08 리팩터링)
 *
 * 네트워크/HUD/텔레메트리/전투이펙트를 서비스로 분리하고,
 * 이 씬은 서비스 조합 + 입력 + 렌더 루프만 담당한다.
 */

import * as Phaser from 'phaser';
import { NetworkService } from '../services/NetworkService';
import { HUDOrchestrator } from '../services/HUDOrchestrator';
import { TelemetryEmitter } from '../services/TelemetryEmitter';
import { CombatEffectManager } from '../services/CombatEffectManager';
import { SoundManager } from '../sound/SoundManager';
import { runPoolBenchmark } from '../utils/PoolBenchmark';

export class GameScene extends Phaser.Scene {
  private player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasdKeys!: Record<string, Phaser.Input.Keyboard.Key>;
  private numberKeys: Phaser.Input.Keyboard.Key[] = [];

  // ── 서비스 인스턴스 (P10-08) ──
  private networkService!: NetworkService;
  private hudOrchestrator!: HUDOrchestrator;
  private telemetryEmitter!: TelemetryEmitter;
  private combatEffectManager!: CombatEffectManager;
  private soundManager!: SoundManager;

  private readonly sessionId = `sess_${Date.now().toString(36)}`;

  constructor() {
    super({ key: 'GameScene' });
  }

  preload(): void {
    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      console.warn(`[Atlas] 로드 실패 (fallback 사용): ${file.key}`);
    });

    this.soundManager = new SoundManager(this);
    this.soundManager.preloadAll();

    this.load.atlas('characters', 'assets/atlas/characters.png', 'assets/atlas/characters.json');
    this.load.atlas('effects', 'assets/atlas/effects.png', 'assets/atlas/effects.json');
    this.load.atlas('ui', 'assets/atlas/ui.png', 'assets/atlas/ui.json');

    const graphics = this.add.graphics();
    graphics.fillStyle(0xf5a623, 1);
    graphics.fillRoundedRect(0, 0, 48, 64, 8);
    graphics.generateTexture('player_sprite', 48, 64);
    graphics.destroy();
  }

  create(): void {
    this.createWorld();
    this.createPlayer();
    this.createInputs();

    // ── 서비스 초기화 ──
    this.networkService = new NetworkService();
    this.hudOrchestrator = new HUDOrchestrator(this);
    this.telemetryEmitter = new TelemetryEmitter(this.networkService);
    this.combatEffectManager = new CombatEffectManager(this);

    this.hudOrchestrator.init();
    this.soundManager.init();
    this.combatEffectManager.init();
    this.combatEffectManager.setupDebugTrigger(() => ({
      x: this.player.x,
      y: this.player.y,
    }));

    // 대화 선택 이벤트 → 텔레메트리 발행
    this.events.on('ui.event.dialogue.choice_confirm', ({ choiceId }: { choiceId: string }) => {
      console.log(`[HUD] dialogue choice -> ${choiceId}`);

      const latencyMs = this.hudOrchestrator.dialogueOpenAtMs > 0
        ? Date.now() - this.hudOrchestrator.dialogueOpenAtMs
        : undefined;

      this.telemetryEmitter.emitDialogueChoice({
        sessionId: this.sessionId,
        playerId: 'debug-player-001',
        chapterId: 'CH2',
        sceneId: 'C2-N2',
        npcId: 'NUARIEL',
        dialogueNodeId: 'C2_N2_SAMPLE_01',
        choiceId,
        choiceTextKey: `dialogue.c2.n2.choice.${choiceId.toLowerCase()}`,
        inputMode: 'keyboard',
        latencyMs,
        partyComp: ['ERIEN', 'SERAPHINE'],
        difficultyTier: 'normal',
        buildVersion: '0.9.12-alpha',
        platform: 'web',
        region: 'KR',
      });

      this.hudOrchestrator.hideDialogue();
    });

    // 네트워크 연결
    void this.networkService.connect();

    // HUD 안내 텍스트
    this.add
      .text(20, 20, '[WASD/방향키] 이동  [1~0,-,=] 슬롯 사용  [T] 대화창 토글', {
        fontSize: '18px',
        color: '#F0F0F0',
        fontFamily: 'Noto Sans KR',
      })
      .setScrollFactor(0)
      .setDepth(10000);

    // 개발 모드: 풀 벤치마크
    if ((import.meta as unknown as Record<string, Record<string, unknown>>).env?.DEV) {
      runPoolBenchmark(1000);
    }
  }

  update(_time: number, delta: number): void {
    const moveSpeed = 300;
    this.player.setVelocity(0);

    const isLeft = this.cursors.left?.isDown || this.wasdKeys.left.isDown;
    const isRight = this.cursors.right?.isDown || this.wasdKeys.right.isDown;
    const isUp = this.cursors.up?.isDown || this.wasdKeys.up.isDown;
    const isDown = this.cursors.down?.isDown || this.wasdKeys.down.isDown;

    if (isLeft) this.player.setVelocityX(-moveSpeed);
    else if (isRight) this.player.setVelocityX(moveSpeed);

    if (isUp) this.player.setVelocityY(-moveSpeed);
    else if (isDown) this.player.setVelocityY(moveSpeed);

    if (this.player.body.velocity.x !== 0 && this.player.body.velocity.y !== 0) {
      this.player.body.velocity.normalize().scale(moveSpeed);
    }

    // 서비스 업데이트
    this.hudOrchestrator.update(delta);
    this.combatEffectManager.update(delta);

    // 이동 중이면 네트워크 전송
    if (this.player.body.velocity.x !== 0 || this.player.body.velocity.y !== 0) {
      this.networkService.emitPlayerMove({
        characterId: this.networkService.getSocketId() ?? '',
        x: this.player.x,
        y: this.player.y,
        state: 'moving',
      });
    }
  }

  // ── 월드/플레이어/입력 생성 (변경 없음) ──

  private createWorld(): void {
    const gridSize = 64;
    const gridGraphics = this.add.graphics();
    gridGraphics.lineStyle(2, 0xffffff, 0.05);

    for (let i = 0; i < 2000; i += gridSize) {
      gridGraphics.moveTo(i, 0);
      gridGraphics.lineTo(i, 2000);
    }
    for (let j = 0; j < 2000; j += gridSize) {
      gridGraphics.moveTo(0, j);
      gridGraphics.lineTo(2000, j);
    }
    gridGraphics.strokePath();
    this.physics.world.setBounds(0, 0, 2000, 2000);
  }

  private createPlayer(): void {
    this.player = this.physics.add.sprite(640, 360, 'player_sprite');
    this.player.setCollideWorldBounds(true);
    this.cameras.main.setBounds(0, 0, 2000, 2000);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
  }

  private createInputs(): void {
    this.cursors = this.input.keyboard?.createCursorKeys() as Phaser.Types.Input.Keyboard.CursorKeys;

    this.wasdKeys = this.input.keyboard?.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    }) as Record<string, Phaser.Input.Keyboard.Key>;

    this.numberKeys = [
      Phaser.Input.Keyboard.KeyCodes.ONE,
      Phaser.Input.Keyboard.KeyCodes.TWO,
      Phaser.Input.Keyboard.KeyCodes.THREE,
      Phaser.Input.Keyboard.KeyCodes.FOUR,
      Phaser.Input.Keyboard.KeyCodes.FIVE,
      Phaser.Input.Keyboard.KeyCodes.SIX,
      Phaser.Input.Keyboard.KeyCodes.SEVEN,
      Phaser.Input.Keyboard.KeyCodes.EIGHT,
      Phaser.Input.Keyboard.KeyCodes.NINE,
      Phaser.Input.Keyboard.KeyCodes.ZERO,
      Phaser.Input.Keyboard.KeyCodes.MINUS,
      Phaser.Input.Keyboard.KeyCodes.PLUS,
    ].map((code) => this.input.keyboard!.addKey(code));

    this.numberKeys.forEach((key, index) => {
      key.on('down', () => {
        const hotkeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '='];
        this.hudOrchestrator.triggerSlotByHotkey(hotkeys[index]);
      });
    });

    this.input.keyboard!.on('keydown-T', () => {
      this.hudOrchestrator.toggleSampleDialogue();
    });
  }
}
