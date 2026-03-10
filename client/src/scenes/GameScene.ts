import * as Phaser from 'phaser';
import { io, Socket } from 'socket.io-client';
import {
  DialogueData,
  HudOverlay,
  HudStatusProps,
  QuickSlotData,
  makeDefaultQuests,
  makeDefaultSlots
} from '../ui/HudOverlay';
import { buildDialogueChoiceTelemetry, DialogueChoiceTelemetryEvent } from '../telemetry/dialogueTelemetry';

export class GameScene extends Phaser.Scene {
  private player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasdKeys!: Record<string, Phaser.Input.Keyboard.Key>;
  private numberKeys: Phaser.Input.Keyboard.Key[] = [];

  private socket?: Socket;
  private hud!: HudOverlay;

  private hudStatus: HudStatusProps = {
    hpCurrent: 415,
    hpMax: 415,
    mpCurrent: 208,
    mpMax: 208,
    level: 15,
    expRatio: 0.42,
    characterName: 'Erien',
    dangerHpThreshold: 0.2
  };

  private quickSlots: QuickSlotData[] = [];
  private readonly sessionId = `sess_${Date.now().toString(36)}`;
  private dialogueOpenAtMs = 0;

  constructor() {
    super({ key: 'GameScene' });
  }

  preload(): void {
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
    this.createHud();

    this.setupNetwork();
  }

  update(_time: number, delta: number): void {
    const moveSpeed = 300;
    this.player.setVelocity(0);

    const isLeft = this.cursors.left?.isDown || this.wasdKeys.left.isDown;
    const isRight = this.cursors.right?.isDown || this.wasdKeys.right.isDown;
    const isUp = this.cursors.up?.isDown || this.wasdKeys.up.isDown;
    const isDown = this.cursors.down?.isDown || this.wasdKeys.down.isDown;

    if (isLeft) {
      this.player.setVelocityX(-moveSpeed);
    } else if (isRight) {
      this.player.setVelocityX(moveSpeed);
    }

    if (isUp) {
      this.player.setVelocityY(-moveSpeed);
    } else if (isDown) {
      this.player.setVelocityY(moveSpeed);
    }

    if (this.player.body.velocity.x !== 0 && this.player.body.velocity.y !== 0) {
      this.player.body.velocity.normalize().scale(moveSpeed);
    }

    this.hud.update(delta);
    this.simulateStatusTick(delta);

    if ((this.player.body.velocity.x !== 0 || this.player.body.velocity.y !== 0) && this.socket?.connected) {
      this.socket.emit('playerMove', {
        characterId: this.socket.id,
        x: this.player.x,
        y: this.player.y,
        state: 'moving'
      });
    }
  }

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
      right: Phaser.Input.Keyboard.KeyCodes.D
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
      Phaser.Input.Keyboard.KeyCodes.PLUS
    ].map((code) => this.input.keyboard!.addKey(code));

    this.numberKeys.forEach((key, index) => {
      key.on('down', () => {
        const hotkeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '='];
        this.hud.triggerSlotByHotkey(hotkeys[index]);
      });
    });

    this.input.keyboard!.on('keydown-T', () => {
      this.toggleSampleDialogue();
    });
  }

  private createHud(): void {
    this.hud = new HudOverlay(this);

    this.quickSlots = makeDefaultSlots();
    this.hud.setStatus(this.hudStatus);
    this.hud.setQuickSlots(this.quickSlots, 'keyboard');
    this.hud.setQuests(makeDefaultQuests());

    this.events.on('ui.event.quickslot.use', ({ slotIndex }: { slotIndex: number }) => {
      console.log(`[HUD] quickslot use -> ${slotIndex}`);
    });

    this.events.on('ui.event.quickslot.invalid_use', ({ slotIndex }: { slotIndex: number }) => {
      console.warn(`[HUD] quickslot invalid -> ${slotIndex}`);
    });

    this.events.on('ui.event.status.avatar_click', () => {
      console.log('[HUD] avatar clicked');
    });

    this.events.on('ui.event.status.hp_critical', () => {
      console.warn('[HUD] HP critical');
    });

    this.events.on('ui.event.dialogue.choice_confirm', ({ choiceId }: { choiceId: string }) => {
      console.log(`[HUD] dialogue choice -> ${choiceId}`);

      const latencyMs = this.dialogueOpenAtMs > 0 ? Date.now() - this.dialogueOpenAtMs : undefined;
      const telemetry = buildDialogueChoiceTelemetry({
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
        region: 'KR'
      });

      this.emitTelemetry(telemetry);
      this.hud.hideDialogue();
    });

    this.add
      .text(20, 20, '[WASD/방향키] 이동  [1~0,-,=] 슬롯 사용  [T] 대화창 토글', {
        fontSize: '18px',
        color: '#F0F0F0',
        fontFamily: 'Noto Sans KR'
      })
      .setScrollFactor(0)
      .setDepth(10000);
  }

  private setupNetwork(): void {
    try {
      this.socket = io('http://localhost:3000', { reconnectionAttempts: 3 });

      this.socket.on('connect', () => {
        console.log(`[네트워크] 서버 접속 성공: ${this.socket?.id}`);
        this.socket?.emit('joinRoom', { roomId: 'tutorial_map', characterId: this.socket?.id });
      });

      this.socket.on('connect_error', () => {
        console.warn('[네트워크] 서버 오프라인. 싱글 모드 유지.');
      });
    } catch (error) {
      console.error(error);
    }
  }

  private simulateStatusTick(delta: number): void {
    const hpDrainPerSec = 1.2;
    const mpRegenPerSec = 0.8;

    const nextHp = Math.max(1, this.hudStatus.hpCurrent - (hpDrainPerSec * delta) / 1000);
    const nextMp = Math.min(this.hudStatus.mpMax, this.hudStatus.mpCurrent + (mpRegenPerSec * delta) / 1000);

    this.hudStatus = {
      ...this.hudStatus,
      hpCurrent: Math.round(nextHp),
      mpCurrent: Math.round(nextMp)
    };

    this.hud.setStatus(this.hudStatus);
  }

  private toggleSampleDialogue(): void {
    const sample: DialogueData = {
      speakerName: '누아리엘',
      bodyText: '버티는 건 치료가 아니에요. 선택하세요. 짧게 버틸지, 길게 살아남을지.',
      choices: [
        { choiceId: 'A', text: '바로 다녀올게.', disabled: false },
        { choiceId: 'B', text: '대체 재료는 없어?', disabled: false },
        { choiceId: 'C', text: '지금은 시간이 없어.', disabled: false }
      ],
      canSkip: true
    };

    this.dialogueOpenAtMs = Date.now();
    this.hud.showDialogue(sample);
  }

  private emitTelemetry(event: DialogueChoiceTelemetryEvent): void {
    if (this.socket?.connected) {
      this.socket.emit('telemetry:dialogue_choice', event);
      return;
    }

    console.log('[Telemetry:offline]', event);
  }
}

