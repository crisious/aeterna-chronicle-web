/**
 * GameScene — 메인 게임 씬 (P10-08 → P25-04 API 연결)
 *
 * NetworkManager를 통한 존 정보 조회, NPC 목록, 몬스터 스폰.
 * 월드 이동 소켓 연결 (world:move, world:teleport).
 */

import * as Phaser from 'phaser';
import { networkManager, ZoneInfo } from '../network/NetworkManager';
import { HUDOrchestrator } from '../services/HUDOrchestrator';
import { TelemetryEmitter } from '../services/TelemetryEmitter';
import { CombatEffectManager } from '../services/CombatEffectManager';
import { SoundManager } from '../sound/SoundManager';
import { runPoolBenchmark } from '../utils/PoolBenchmark';

/** GameScene 전환 시 전달 데이터 */
interface GameSceneData {
  zoneId?: string;
  zoneName?: string;
  characterId?: string;
}

/** 다른 플레이어 / 몬스터 표시 */
interface RemoteEntity {
  id: string;
  name: string;
  sprite: Phaser.GameObjects.Rectangle;
  nameTag: Phaser.GameObjects.Text;
  isMonster: boolean;
}

export class GameScene extends Phaser.Scene {
  private player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasdKeys!: Record<string, Phaser.Input.Keyboard.Key>;
  private numberKeys: Phaser.Input.Keyboard.Key[] = [];

  private hudOrchestrator!: HUDOrchestrator;
  private telemetryEmitter!: TelemetryEmitter;
  private combatEffectManager!: CombatEffectManager;
  private soundManager!: SoundManager;

  private readonly sessionId = `sess_${Date.now().toString(36)}`;

  // P25-04: 존 + 소켓 데이터
  private currentZoneId = 'aether_plains';
  private currentZoneName = '에테르 평원';
  private zoneInfo: ZoneInfo | null = null;
  private remoteEntities: Map<string, RemoteEntity> = new Map();
  private zoneLabel!: Phaser.GameObjects.Text;
  private connectionLabel!: Phaser.GameObjects.Text;

  // 소켓 cleanup 핸들
  private socketCleanups: Array<() => void> = [];

  constructor() {
    super({ key: 'GameScene' });
  }

  init(data: GameSceneData): void {
    if (data?.zoneId) this.currentZoneId = data.zoneId;
    if (data?.zoneName) this.currentZoneName = data.zoneName;
  }

  preload(): void {
    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      console.warn(`[Atlas] 로드 실패 (fallback 사용): ${file.key}`);
    });

    this.soundManager = new SoundManager(this);
    this.soundManager.preloadAll();

    // P25-09: 실제 에셋 경로
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

    // 서비스 초기화
    this.hudOrchestrator = new HUDOrchestrator(this);
    // TelemetryEmitter는 이제 NetworkManager 사용이 아닌 별도 인스턴스 — 호환을 위해 간이 래퍼
    const telemetryNetworkShim = {
      emit: (event: string, data: unknown) => networkManager.emit(event, data),
      getSocketId: () => networkManager.socketId ?? '',
      isConnected: networkManager.isConnected,
    };
    this.telemetryEmitter = new TelemetryEmitter(telemetryNetworkShim as any);
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
      this.telemetryEmitter.emitDialogueChoice({
        sessionId: this.sessionId,
        playerId: networkManager.userId ?? 'debug-player-001',
        chapterId: 'CH2',
        sceneId: 'C2-N2',
        npcId: 'NUARIEL',
        dialogueNodeId: 'C2_N2_SAMPLE_01',
        choiceId,
        choiceTextKey: `dialogue.c2.n2.choice.${choiceId.toLowerCase()}`,
        inputMode: 'keyboard',
        latencyMs: this.hudOrchestrator.dialogueOpenAtMs > 0
          ? Date.now() - this.hudOrchestrator.dialogueOpenAtMs : undefined,
        partyComp: ['ERIEN', 'SERAPHINE'],
        difficultyTier: 'normal',
        buildVersion: '0.9.12-alpha',
        platform: 'web',
        region: 'KR',
      });
      this.hudOrchestrator.hideDialogue();
    });

    // P25-04: 존 정보 + 소켓 연결
    this._setupZone();
    this._setupSocketEvents();

    // 존 라벨
    const { width } = this.cameras.main;
    this.zoneLabel = this.add.text(width / 2, 20, `📍 ${this.currentZoneName}`, {
      fontSize: '16px', color: '#88cc88', fontFamily: 'monospace',
    }).setScrollFactor(0).setDepth(10000).setOrigin(0.5, 0);

    this.connectionLabel = this.add.text(width - 10, 20, '', {
      fontSize: '10px', color: '#44cc44', fontFamily: 'monospace',
    }).setScrollFactor(0).setDepth(10000).setOrigin(1, 0);

    // HUD 안내 텍스트
    this.add.text(20, 20, '[WASD] 이동  [1~6] 스킬  [T] 대화  [M] 몬스터', {
      fontSize: '14px', color: '#F0F0F0', fontFamily: 'Noto Sans KR',
    }).setScrollFactor(0).setDepth(10000);

    if ((import.meta as unknown as Record<string, Record<string, unknown>>).env?.DEV) {
      runPoolBenchmark(1000);
    }
  }

  // ── P25-04: 존 정보 조회 ────────────────────────────────

  private async _setupZone(): Promise<void> {
    try {
      this.zoneInfo = await networkManager.getZoneInfo(this.currentZoneId);
      if (this.zoneInfo) {
        this.zoneLabel.setText(`📍 ${this.zoneInfo.name}`);

        // NPC 표시
        this.zoneInfo.npcs?.forEach((npc, i) => {
          const x = 300 + i * 200;
          const y = 400;
          this._spawnNpc(npc.id, npc.name, x, y);
        });

        // 몬스터 스폰 표시
        this.zoneInfo.monsters?.forEach((mon, i) => {
          const x = 600 + (i % 5) * 150;
          const y = 600 + Math.floor(i / 5) * 150;
          this._spawnMonster(mon.id, `${mon.name} Lv.${mon.level}`, x, y);
        });
      }
    } catch (err) {
      console.warn('[GameScene] 존 정보 로드 실패:', err);
    }
  }

  private _spawnNpc(id: string, name: string, x: number, y: number): void {
    const sprite = this.add.rectangle(x, y, 32, 48, 0x44cc88).setInteractive({ useHandCursor: true });
    const tag = this.add.text(x, y - 35, name, {
      fontSize: '11px', color: '#88ff88', fontFamily: 'monospace',
    }).setOrigin(0.5);
    sprite.on('pointerdown', () => {
      this.hudOrchestrator.toggleSampleDialogue();
    });
    this.remoteEntities.set(id, { id, name, sprite, nameTag: tag, isMonster: false });
  }

  private _spawnMonster(id: string, name: string, x: number, y: number): void {
    const sprite = this.add.rectangle(x, y, 36, 36, 0xff4444).setInteractive({ useHandCursor: true });
    const tag = this.add.text(x, y - 28, name, {
      fontSize: '10px', color: '#ff8888', fontFamily: 'monospace',
    }).setOrigin(0.5);

    sprite.on('pointerdown', () => {
      // 전투 시작 → BattleScene
      this.scene.start('BattleScene', {
        zoneId: this.currentZoneId,
        monsterId: id,
        monsterName: name,
      });
    });

    this.remoteEntities.set(id, { id, name, sprite, nameTag: tag, isMonster: true });
  }

  // ── P25-04: 소켓 이벤트 ─────────────────────────────────

  private _setupSocketEvents(): void {
    if (!networkManager.isConnected) {
      networkManager.connect();
    }

    // 월드 이동 브로드캐스트 수신
    const unsub1 = networkManager.on('world:playerJoined', (data) => {
      const d = data as { characterId: string; name: string; x: number; y: number };
      if (!this.remoteEntities.has(d.characterId)) {
        const sprite = this.add.rectangle(d.x, d.y, 40, 56, 0x4488ff);
        const tag = this.add.text(d.x, d.y - 38, d.name, {
          fontSize: '11px', color: '#88ccff', fontFamily: 'monospace',
        }).setOrigin(0.5);
        this.remoteEntities.set(d.characterId, {
          id: d.characterId, name: d.name, sprite, nameTag: tag, isMonster: false,
        });
      }
    });

    const unsub2 = networkManager.on('world:playerLeft', (data) => {
      const d = data as { characterId: string };
      const entity = this.remoteEntities.get(d.characterId);
      if (entity) {
        entity.sprite.destroy();
        entity.nameTag.destroy();
        this.remoteEntities.delete(d.characterId);
      }
    });

    const unsub3 = networkManager.on('world:monsterSpawn', (data) => {
      const d = data as { monsterId: string; name: string; x: number; y: number; level: number };
      this._spawnMonster(d.monsterId, `${d.name} Lv.${d.level}`, d.x, d.y);
    });

    const unsub4 = networkManager.on('world:monsterDespawn', (data) => {
      const d = data as { monsterId: string };
      const entity = this.remoteEntities.get(d.monsterId);
      if (entity) {
        entity.sprite.destroy();
        entity.nameTag.destroy();
        this.remoteEntities.delete(d.monsterId);
      }
    });

    this.socketCleanups = [unsub1, unsub2, unsub3, unsub4];

    // 연결 상태 표시
    networkManager.onConnectionChange((state) => {
      const label = state === 'connected' ? '● 온라인' : `○ ${state}`;
      const color = state === 'connected' ? '#44cc44' : '#cccc44';
      this.connectionLabel.setText(label).setColor(color);
    });
    this.connectionLabel.setText(networkManager.isConnected ? '● 온라인' : '○ 오프라인');
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

    this.hudOrchestrator.update(delta);
    this.combatEffectManager.update(delta);

    // P25-04: NetworkManager로 이동 전송
    if (this.player.body.velocity.x !== 0 || this.player.body.velocity.y !== 0) {
      networkManager.emit('world:move', {
        characterId: networkManager.socketId ?? '',
        x: this.player.x,
        y: this.player.y,
        state: 'moving',
      });
    }
  }

  shutdown(): void {
    // 소켓 이벤트 클린업
    this.socketCleanups.forEach((fn) => fn());
    this.socketCleanups = [];
    this.remoteEntities.clear();
  }

  // ── 월드/플레이어/입력 생성 ──

  private createWorld(): void {
    const gridSize = 64;
    const gridGraphics = this.add.graphics();
    gridGraphics.lineStyle(2, 0xffffff, 0.05);
    for (let i = 0; i < 2000; i += gridSize) { gridGraphics.moveTo(i, 0); gridGraphics.lineTo(i, 2000); }
    for (let j = 0; j < 2000; j += gridSize) { gridGraphics.moveTo(0, j); gridGraphics.lineTo(2000, j); }
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
      Phaser.Input.Keyboard.KeyCodes.ONE, Phaser.Input.Keyboard.KeyCodes.TWO,
      Phaser.Input.Keyboard.KeyCodes.THREE, Phaser.Input.Keyboard.KeyCodes.FOUR,
      Phaser.Input.Keyboard.KeyCodes.FIVE, Phaser.Input.Keyboard.KeyCodes.SIX,
      Phaser.Input.Keyboard.KeyCodes.SEVEN, Phaser.Input.Keyboard.KeyCodes.EIGHT,
      Phaser.Input.Keyboard.KeyCodes.NINE, Phaser.Input.Keyboard.KeyCodes.ZERO,
      Phaser.Input.Keyboard.KeyCodes.MINUS, Phaser.Input.Keyboard.KeyCodes.PLUS,
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
