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
import monsterManifest from '../data/monsterManifest.json';

/** GameScene 전환 시 전달 데이터 */
interface GameSceneData {
  zoneId?: string;
  zoneName?: string;
  characterId?: string;
}

// ── 존 → 챕터 타이틀 카드 매핑 ───────────────────────────────
interface ChapterTitleInfo {
  imageKey: string;
  imagePath: string;
  label: string;
}

const ZONE_CHAPTER_MAP: Record<string, ChapterTitleInfo> = {
  aether_plains:     { imageKey: 'ch_title_1', imagePath: 'assets/cg/chapters/ch1_erebos.png',      label: 'Chapter 1 — 에레보스' },
  memory_forest:     { imageKey: 'ch_title_2', imagePath: 'assets/cg/chapters/ch2_sylvanheim.png',  label: 'Chapter 2 — 실반헤임' },
  shadow_gorge:      { imageKey: 'ch_title_3', imagePath: 'assets/cg/chapters/ch3_solaris.png',     label: 'Chapter 3 — 솔라리스' },
  forgotten_citadel: { imageKey: 'ch_title_4', imagePath: 'assets/cg/chapters/ch4_argentium.png',   label: 'Chapter 4 — 아르겐티움' },
  chrono_spire:      { imageKey: 'ch_title_5', imagePath: 'assets/cg/chapters/ch5_plateau.png',     label: 'Chapter 5 — 망각의 고원' },
};

/** 다른 플레이어 / 몬스터 표시 */
interface RemoteEntity {
  id: string;
  name: string;
  sprite: Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle;
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
  private _sceneFailed = false;

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
    // 로드 에러 핸들러 — 404 에셋이 있어도 씬 진입을 차단하지 않음
    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      console.warn(`[GameScene] 에셋 로드 실패 (무시): ${file.key}`);
    });

    // 주인공 캐릭터 이미지 (기본: 에테르 기사 front)
    this.load.image('player_sprite', 'assets/generated/characters/class_main/char_illust_ether_knight_front.png');

    // NPC 스프라이트
    this.load.image('npc_guide_sprite', 'assets/generated/characters/npc_sprites/04_mateus_sprite.png');
    this.load.image('npc_merchant_sprite', 'assets/generated/characters/npc_sprites/01_cryo_sprite.png');

    // 존 배경 이미지 preload
    const ZONE_BG: Record<string, string> = {
      aether_plains: 'ERB', memory_forest: 'SYL', shadow_gorge: 'ABY',
      crystal_cave: 'NOR', forgotten_citadel: 'ARG', chrono_spire: 'TEM',
      erebos: 'ERB', sylvanheim: 'SYL', solaris: 'SOL', boreal: 'NOR',
      argentium: 'ARG', britalia: 'BRI', plateau_oblivion: 'OBL', fog_sea: 'FOG',
    };
    const bgPrefix = ZONE_BG[this.currentZoneId] ?? 'ERB';
    this.load.image('zone_bg_far', `assets/generated/environment/backgrounds/${bgPrefix}-BG-FAR-DAY.png`);
    this.load.image('zone_bg_sky', `assets/generated/environment/backgrounds/${bgPrefix}-BG-SKY-DAY.png`);

    // 오프라인 폴백 몬스터 이미지 preload
    const manifest = monsterManifest as Record<string, string>;
    const fallbackMonsters = ['mon_erebos_fog_rat', 'mon_erebos_memory_beetle', 'mon_erebos_memory_dust'];
    for (const key of fallbackMonsters) {
      if (manifest[key]) {
        this.load.image(key, manifest[key]);
      }
    }

    // P25-09: 실제 에셋 경로 (atlas만 — 존재 확인된 파일)
    this.load.atlas('characters', 'assets/atlas/characters.png', 'assets/atlas/characters.json');
    this.load.atlas('effects', 'assets/atlas/effects.png', 'assets/atlas/effects.json');
    this.load.atlas('ui', 'assets/atlas/ui.png', 'assets/atlas/ui.json');

    // 챕터 타이틀 카드 이미지 로드
    const chapterInfo = ZONE_CHAPTER_MAP[this.currentZoneId];
    if (chapterInfo) {
      this.load.image(chapterInfo.imageKey, chapterInfo.imagePath);
    }

    // SoundManager preload — 138개 오디오 파일 대부분 미존재(404)
    // 실패해도 게임 진행에 영향 없음 (loaderror 핸들러가 무시)
    try {
      this.soundManager = new SoundManager(this);
      this.soundManager.preloadAll();
    } catch (e) {
      console.warn('[GameScene] SoundManager preload 실패:', e);
    }
  }

  /** Phaser create 직전: 프로그래매틱 텍스처 생성 (preload 로드 실패 대비) */
  private _ensureFallbackTextures(): void {
    if (!this.textures.exists('player_sprite')) {
      const graphics = this.add.graphics();
      graphics.fillStyle(0xf5a623, 1);
      graphics.fillRoundedRect(0, 0, 48, 64, 8);
      graphics.generateTexture('player_sprite', 48, 64);
      graphics.destroy();
    }
  }

  create(): void {
    try {
      this._ensureFallbackTextures();
      this._createSafe();
    } catch (err) {
      console.error('[GameScene] create 에러:', err);
      this._sceneFailed = true;
      this._showErrorScreen(err as Error);
    }
  }

  private _showErrorScreen(err: Error): void {
    const { width, height } = this.cameras.main;
    this.cameras.main.setBackgroundColor('#1a0a0a');
    this.add.text(width / 2, height / 2 - 60, `⚠️ 존 로딩 실패`, {
      fontSize: '20px', color: '#ff6644', fontFamily: 'monospace',
    }).setOrigin(0.5);
    this.add.text(width / 2, height / 2 - 20, `존: ${this.currentZoneName ?? '알 수 없음'}`, {
      fontSize: '14px', color: '#cccccc', fontFamily: 'monospace',
    }).setOrigin(0.5);
    this.add.text(width / 2, height / 2 + 20, `${err?.message ?? '알 수 없는 오류'}`, {
      fontSize: '12px', color: '#ff8888', fontFamily: 'monospace', wordWrap: { width: 600 },
    }).setOrigin(0.5);
    this.add.text(width / 2, height / 2 + 60, `${err?.stack?.split('\n')[1]?.trim() ?? ''}`, {
      fontSize: '10px', color: '#666666', fontFamily: 'monospace', wordWrap: { width: 600 },
    }).setOrigin(0.5);

    const backBtn = this.add.text(width / 2, height / 2 + 110, '[ 월드맵으로 돌아가기 ]', {
      fontSize: '16px', color: '#88ccff', fontFamily: 'monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => this.scene.start('WorldScene'));

    const lobbyBtn = this.add.text(width / 2, height / 2 + 140, '[ 로비로 돌아가기 ]', {
      fontSize: '14px', color: '#88ff88', fontFamily: 'monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    lobbyBtn.on('pointerdown', () => this.scene.start('LobbyScene'));
  }

  private _createSafe(): void {
    try { this.createWorld(); } catch (e) { console.warn('[GameScene] createWorld 실패:', e); }
    try { this.createPlayer(); } catch (e) { console.warn('[GameScene] createPlayer 실패:', e); }
    try { this.createInputs(); } catch (e) { console.warn('[GameScene] createInputs 실패:', e); }

    // 서비스 초기화 — 각각 독립적으로 실패 허용
    try {
      this.hudOrchestrator = new HUDOrchestrator(this);
      this.hudOrchestrator.init();
    } catch (e) { console.warn('[GameScene] HUDOrchestrator 초기화 실패:', e); }

    try {
      const telemetryNetworkShim = {
        emit: (event: string, data: unknown) => networkManager.emit(event, data),
        getSocketId: () => networkManager.socketId ?? '',
        isConnected: networkManager.isConnected,
      };
      this.telemetryEmitter = new TelemetryEmitter(telemetryNetworkShim as any);
    } catch (e) { console.warn('[GameScene] TelemetryEmitter 초기화 실패:', e); }

    try {
      this.combatEffectManager = new CombatEffectManager(this);
      this.combatEffectManager.init();
      this.combatEffectManager.setupDebugTrigger(() => ({
        x: this.player?.x ?? 0,
        y: this.player?.y ?? 0,
      }));
    } catch (e) { console.warn('[GameScene] CombatEffectManager 초기화 실패:', e); }

    try {
      this.soundManager?.init();
    } catch (e) { console.warn('[GameScene] SoundManager 초기화 실패:', e); }

    // 대화 선택 이벤트 → 텔레메트리 발행
    this.events.on('ui.event.dialogue.choice_confirm', ({ choiceId }: { choiceId: string }) => {
      this.telemetryEmitter?.emitDialogueChoice({
        sessionId: this.sessionId,
        playerId: networkManager.userId ?? 'debug-player-001',
        chapterId: 'CH2',
        sceneId: 'C2-N2',
        npcId: 'NUARIEL',
        dialogueNodeId: 'C2_N2_SAMPLE_01',
        choiceId,
        choiceTextKey: `dialogue.c2.n2.choice.${choiceId.toLowerCase()}`,
        inputMode: 'keyboard',
        latencyMs: this.hudOrchestrator?.dialogueOpenAtMs > 0
          ? Date.now() - this.hudOrchestrator.dialogueOpenAtMs : undefined,
        partyComp: ['ERIEN', 'SERAPHINE'],
        difficultyTier: 'normal',
        buildVersion: '0.9.12-alpha',
        platform: 'web',
        region: 'KR',
      });
      this.hudOrchestrator?.hideDialogue();
    });

    // 챕터 타이틀 카드 표시 (존 진입 시)
    this._showChapterTitleCard();

    // 존 라벨 — 반드시 소켓 이벤트 등록 전에 생성해야 함
    const { width } = this.cameras.main;
    this.zoneLabel = this.add.text(width / 2, 20, `📍 ${this.currentZoneName}`, {
      fontSize: '16px', color: '#88cc88', fontFamily: 'monospace',
    }).setScrollFactor(0).setDepth(10000).setOrigin(0.5, 0);

    this.connectionLabel = this.add.text(width - 10, 20, '', {
      fontSize: '10px', color: '#44cc44', fontFamily: 'monospace',
    }).setScrollFactor(0).setDepth(10000).setOrigin(1, 0);

    // P25-04: 존 정보 + 소켓 연결 — UI 생성 이후에 호출
    this._setupZone();
    this._setupSocketEvents();

    // HUD 안내 텍스트
    this.add.text(20, 20, '[WASD] 이동  [1~6] 스킬  [T] 대화  [M] 몬스터', {
      fontSize: '14px', color: '#F0F0F0', fontFamily: 'Noto Sans KR',
    }).setScrollFactor(0).setDepth(10000);

    if ((import.meta as unknown as Record<string, Record<string, unknown>>).env?.DEV) {
      runPoolBenchmark(1000);
    }
  }

  // ── 챕터 타이틀 카드 표시 ────────────────────────────────

  private _showChapterTitleCard(): void {
    const chapterInfo = ZONE_CHAPTER_MAP[this.currentZoneId];
    if (!chapterInfo || !this.textures.exists(chapterInfo.imageKey)) return;

    const { width, height } = this.cameras.main;

    // 반투명 오버레이
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7)
      .setScrollFactor(0).setDepth(20000);

    // 챕터 타이틀 이미지
    const titleImage = this.add.image(width / 2, height / 2 - 30, chapterInfo.imageKey)
      .setScrollFactor(0).setDepth(20001).setAlpha(0);

    // 이미지를 화면 중앙에 적절한 크기로 표시 (최대 60% 너비)
    const maxW = width * 0.6;
    const maxH = height * 0.5;
    const texW = titleImage.width;
    const texH = titleImage.height;
    const scale = Math.min(maxW / texW, maxH / texH, 1);
    titleImage.setScale(scale);

    // 챕터 레이블 텍스트
    const labelText = this.add.text(width / 2, height / 2 + titleImage.displayHeight / 2 + 30, chapterInfo.label, {
      fontSize: '24px',
      fontFamily: 'Noto Sans KR, sans-serif',
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(20001).setAlpha(0);

    // 페이드인 (0.8s) → 홀드 (2s) → 페이드아웃 (0.5s)
    this.tweens.add({
      targets: [titleImage, labelText],
      alpha: 1,
      duration: 800,
      ease: 'Power2',
      onComplete: () => {
        this.time.delayedCall(2000, () => {
          this.tweens.add({
            targets: [overlay, titleImage, labelText],
            alpha: 0,
            duration: 500,
            ease: 'Power2',
            onComplete: () => {
              overlay.destroy();
              titleImage.destroy();
              labelText.destroy();
            },
          });
        });
      },
    });
  }

  // ── P25-04: 존 정보 조회 ────────────────────────────────

  private async _setupZone(): Promise<void> {
    try {
      this.zoneInfo = await networkManager.getZoneInfo(this.currentZoneId);
    } catch (err) {
      console.warn('[GameScene] 존 정보 API 실패 — 오프라인 모드:', err);
      this.zoneInfo = null;
    }

    if (this.zoneInfo) {
      this.zoneLabel?.setText(`📍 ${this.zoneInfo.name}`);

      this.zoneInfo.npcs?.forEach((npc, i) => {
        this._spawnNpc(npc.id, npc.name, 300 + i * 200, 400);
      });

      this.zoneInfo.monsters?.forEach((mon, i) => {
        this._spawnMonster(mon.id, `${mon.name} Lv.${mon.level}`, 600 + (i % 5) * 150, 600 + Math.floor(i / 5) * 150);
      });
    } else {
      // 오프라인 폴백: 기본 NPC + 몬스터 배치 (매니페스트 실제 키 사용)
      this._spawnNpc('npc_guide', '수호자단 안내원', 300, 400);
      this._spawnNpc('npc_merchant', '상인', 500, 400);
      this._spawnMonster('mon_erebos_fog_rat', '기억 침식쥐 Lv.5', 700, 500);
      this._spawnMonster('mon_erebos_memory_beetle', '공허 박쥐 Lv.7', 850, 550);
      this._spawnMonster('mon_erebos_memory_dust', '망각 슬라임 Lv.8', 1000, 500);
    }
  }

  // NPC 이미지 키 매핑
  private static readonly NPC_SPRITE_MAP: Record<string, string> = {
    npc_guide: 'npc_guide_sprite',
    npc_merchant: 'npc_merchant_sprite',
  };

  private _spawnNpc(id: string, name: string, x: number, y: number): void {
    const texKey = GameScene.NPC_SPRITE_MAP[id];
    let sprite: Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle;

    if (texKey && this.textures.exists(texKey)) {
      sprite = this.add.image(x, y, texKey)
        .setDisplaySize(48, 64)
        .setInteractive({ useHandCursor: true });
    } else {
      sprite = this.add.rectangle(x, y, 32, 48, 0x44cc88)
        .setInteractive({ useHandCursor: true });
    }

    const tag = this.add.text(x, y - 42, name, {
      fontSize: '11px', color: '#88ff88', fontFamily: 'monospace',
    }).setOrigin(0.5);
    sprite.on('pointerdown', () => {
      this.hudOrchestrator?.toggleSampleDialogue();
    });
    this.remoteEntities.set(id, { id, name, sprite, nameTag: tag, isMonster: false });
  }

  private _spawnMonster(id: string, name: string, x: number, y: number): void {
    // 몬스터 매니페스트에서 이미지 매칭 시도
    let monTexKey = '';
    try {
      const manifest = monsterManifest as Record<string, string>;
      const manifestKeys = Object.keys(manifest);
      const idLower = id.toLowerCase().replace(/[-\s]/g, '_');
      if (manifestKeys.includes(idLower)) {
        monTexKey = idLower;
        if (!this.textures.exists(monTexKey)) {
          this.load.image(monTexKey, manifest[monTexKey]);
          this.load.once('complete', () => {
            const existing = this.remoteEntities.get(id);
            if (existing && existing.sprite && this.textures.exists(monTexKey)) {
              existing.sprite.destroy();
              const newSprite = this.add.image(x, y, monTexKey)
                .setDisplaySize(48, 48)
                .setInteractive({ useHandCursor: true });
              newSprite.on('pointerdown', () => {
                this.scene.start('BattleScene', {
                  zoneId: this.currentZoneId, monsterId: id, monsterName: name,
                });
              });
              existing.sprite = newSprite;
            }
          });
          this.load.start();
        }
      }
    } catch { /* 무시 */ }

    let sprite: Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle;
    if (monTexKey && this.textures.exists(monTexKey)) {
      sprite = this.add.image(x, y, monTexKey)
        .setDisplaySize(48, 48)
        .setInteractive({ useHandCursor: true });
    } else {
      sprite = this.add.rectangle(x, y, 36, 36, 0xff4444)
        .setInteractive({ useHandCursor: true });
    }

    const tag = this.add.text(x, y - 34, name, {
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
      this.connectionLabel?.setText(label).setColor(color);
    });
    this.connectionLabel?.setText(networkManager.isConnected ? '● 온라인' : '○ 오프라인');
  }

  update(_time: number, delta: number): void {
    if (this._sceneFailed) return;
    try {
      if (!this.player || !this.wasdKeys || !this.cursors) return;
      const moveSpeed = 300;
      this.player.setVelocity(0);

      const isLeft = this.cursors.left?.isDown || this.wasdKeys.left?.isDown;
      const isRight = this.cursors.right?.isDown || this.wasdKeys.right?.isDown;
      const isUp = this.cursors.up?.isDown || this.wasdKeys.up?.isDown;
      const isDown = this.cursors.down?.isDown || this.wasdKeys.down?.isDown;

      if (isLeft) this.player.setVelocityX(-moveSpeed);
      else if (isRight) this.player.setVelocityX(moveSpeed);
      if (isUp) this.player.setVelocityY(-moveSpeed);
      else if (isDown) this.player.setVelocityY(moveSpeed);

      if (this.player.body?.velocity.x !== 0 && this.player.body?.velocity.y !== 0) {
        this.player.body?.velocity.normalize().scale(moveSpeed);
      }

      this.hudOrchestrator?.update(delta);
      this.combatEffectManager?.update(delta);

      if (this.player.body?.velocity.x !== 0 || this.player.body?.velocity.y !== 0) {
        networkManager.emit('world:move', {
          characterId: networkManager.socketId ?? '',
          x: this.player.x,
          y: this.player.y,
          state: 'moving',
        });
      }
    } catch (err) {
      console.error('[GameScene] update 에러:', err);
      this._sceneFailed = true;
      this._showErrorScreen(err as Error);
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
    const worldW = 2000, worldH = 2000;

    // 배경 이미지 (스크롤팩터로 패럴랙스 효과)
    if (this.textures.exists('zone_bg_sky')) {
      const sky = this.add.image(worldW / 2, worldH / 2, 'zone_bg_sky')
        .setDisplaySize(worldW, worldH).setDepth(-2).setScrollFactor(0.2);
    }
    if (this.textures.exists('zone_bg_far')) {
      const far = this.add.image(worldW / 2, worldH / 2, 'zone_bg_far')
        .setDisplaySize(worldW, worldH).setDepth(-1).setScrollFactor(0.5);
    }

    // 그리드 오버레이 (디버그/가이드용, 투명하게)
    const gridSize = 64;
    const gridGraphics = this.add.graphics();
    gridGraphics.lineStyle(1, 0xffffff, 0.03);
    for (let i = 0; i < worldW; i += gridSize) { gridGraphics.moveTo(i, 0); gridGraphics.lineTo(i, worldH); }
    for (let j = 0; j < worldH; j += gridSize) { gridGraphics.moveTo(0, j); gridGraphics.lineTo(worldW, j); }
    gridGraphics.strokePath();
    gridGraphics.setDepth(0);

    this.physics.world.setBounds(0, 0, worldW, worldH);
  }

  private createPlayer(): void {
    this.player = this.physics.add.sprite(640, 360, 'player_sprite');
    this.player.setDisplaySize(48, 64);
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

    if (this.input.keyboard) {
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
          this.hudOrchestrator?.triggerSlotByHotkey(hotkeys[index]);
        });
      });

      this.input.keyboard.on('keydown-T', () => {
        this.hudOrchestrator?.toggleSampleDialogue();
      });
    }
  }
}
