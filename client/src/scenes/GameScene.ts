/**
 * GameScene — 메인 게임 씬 (P10-08 → P25-04 API 연결)
 *
 * NetworkManager를 통한 존 정보 조회, NPC 목록, 몬스터 스폰.
 * 월드 이동 소켓 연결 (world:move, world:teleport).
 */

import * as Phaser from 'phaser';
import { networkManager, ZoneInfo } from '../network/NetworkManager';
import { isUiModalOpen } from '../accessibility/uiModalLock';
import { HUDOrchestrator } from '../services/HUDOrchestrator';
import { TelemetryEmitter } from '../services/TelemetryEmitter';
import { CombatEffectManager } from '../services/CombatEffectManager';
import { SoundManager } from '../sound/SoundManager';
import { runPoolBenchmark } from '../utils/PoolBenchmark';
import { ZONE_ENV_CONFIG } from '../data/zoneEnvironment';
import { resolveZoneBackground, type ZoneBackgroundDescriptor } from '../data/zoneBackgrounds';
import {
  buildChronoBattleSeed,
  getChronoEra,
  projectZoneToEra,
  type ChronoEraId,
} from '../time/ChronoTimeline';
import {
  resolveFieldEncounter,
  rollFieldEncounterSpawns,
} from '../../../shared/types/chrono';

/** GameScene 전환 시 전달 데이터 */
interface GameSceneData {
  zoneId?: string;
  zoneName?: string;
  characterId?: string;
  eraId?: ChronoEraId;
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
  malatus_sanctuary: { imageKey: 'ch_title_2', imagePath: 'assets/cg/chapters/ch2_sylvanheim.png',  label: 'Chapter 2 — 말라투스 성소' },
  shadow_gorge:      { imageKey: 'ch_title_3', imagePath: 'assets/cg/chapters/ch3_solaris.png',     label: 'Chapter 3 — 솔라리스' },
  crystal_cave:      { imageKey: 'ch_title_3', imagePath: 'assets/cg/chapters/ch3_solaris.png',     label: 'Chapter 3.5 — 결정 동굴' },
  forgotten_citadel: { imageKey: 'ch_title_4', imagePath: 'assets/cg/chapters/ch4_argentium.png',   label: 'Chapter 4 — 아르겐티움' },
  chrono_spire:      { imageKey: 'ch_title_5', imagePath: 'assets/cg/chapters/ch5_plateau.png',     label: 'Chapter 5 — 망각의 고원' },
};

/** 다른 플레이어 / 몬스터 표시 */
interface RemoteEntity {
  id: string;
  name: string;
  role?: string;
  sprite: Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle;
  nameTag: Phaser.GameObjects.Text;
  isMonster: boolean;
  /** 키보드 컷오버(감사 rank2): 몬스터 전투 진입 액션 — pointerdown 클로저와 동일 페이로드 공유. */
  engage?: () => void;
}

export class GameScene extends Phaser.Scene {
  private static readonly NPC_INTERACTION_RANGE_PX = 420;

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
  private currentEraId: ChronoEraId = 'present';
  private zoneInfo: ZoneInfo | null = null;
  private remoteEntities: Map<string, RemoteEntity> = new Map();
  private activeDialogueNpc: RemoteEntity | null = null;
  private zoneBackground: ZoneBackgroundDescriptor = resolveZoneBackground('aether_plains');
  private zoneLabel!: Phaser.GameObjects.Text;
  private connectionLabel!: Phaser.GameObjects.Text;

  // 소켓 cleanup 핸들
  private socketCleanups: Array<() => void> = [];

  constructor() {
    super({ key: 'GameScene' });
  }

  init(data: GameSceneData): void {
    if (data?.zoneId) this.currentZoneId = data.zoneId;
    if (data?.eraId) this.currentEraId = data.eraId;
    this.currentZoneName = data?.zoneName ?? projectZoneToEra(this.currentZoneId, this.currentEraId).displayName;
    this.zoneBackground = resolveZoneBackground(this.currentZoneId, this.currentEraId);
  }

  preload(): void {
    // 로드 에러 핸들러 — 404 에셋이 있어도 씬 진입을 차단하지 않음
    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      console.warn(`[GameScene] 에셋 로드 실패 (무시): ${file.key}`);
    });

    // 주인공 캐릭터 이미지 (기본: 에테르 기사 front)
    this.load.image('player_sprite', 'assets/generated/characters/class_main/char_illust_ether_knight_front.png');

    // NPC 스프라이트
    this.load.image('npc_guide_sprite', 'assets/generated/characters/npc_battle/04_mateus_sprite.png');
    this.load.image('npc_merchant_sprite', 'assets/generated/characters/npc_battle/01_cryo_sprite.png');

    // 존/시대별 고유 텍스처 키 사용: Phaser 캐시가 이전 지역 배경을 재사용하지 않게 한다.
    if (!this.textures.exists(this.zoneBackground.farKey)) {
      this.load.image(this.zoneBackground.farKey, this.zoneBackground.farPath);
    }
    if (!this.textures.exists(this.zoneBackground.skyKey)) {
      this.load.image(this.zoneBackground.skyKey, this.zoneBackground.skyPath);
    }

    // 몬스터 이미지 preload 제거 — 프로그래매틱 아이콘 사용

    // P25-09: 아틀라스 로드 비활성화 — 개별 이미지 사용 (BattleScene 텍스처 캐시 충돌 방지)
    // this.load.atlas('characters', 'assets/atlas/characters.png', 'assets/atlas/characters.json');
    // this.load.atlas('effects', 'assets/atlas/effects.png', 'assets/atlas/effects.json');
    // this.load.atlas('ui', 'assets/atlas/ui.png', 'assets/atlas/ui.json');

    // 환경 오브젝트 비활성화 — SD1.5 이미지가 pixelArt 스케일링에서 깨짐
    // TODO: SDXL로 환경 오브젝트 재생성 후 복원

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
      fontSize: '20px', color: '#ff6644', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
    }).setOrigin(0.5);
    this.add.text(width / 2, height / 2 - 20, `존: ${this.currentZoneName ?? '알 수 없음'}`, {
      fontSize: '14px', color: '#cccccc', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
    }).setOrigin(0.5);
    this.add.text(width / 2, height / 2 + 20, `${err?.message ?? '알 수 없는 오류'}`, {
      fontSize: '12px', color: '#ff8888', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace', wordWrap: { width: 600 },
    }).setOrigin(0.5);
    this.add.text(width / 2, height / 2 + 60, `${err?.stack?.split('\n')[1]?.trim() ?? ''}`, {
      fontSize: '10px', color: '#666666', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace', wordWrap: { width: 600 },
    }).setOrigin(0.5);

    const backBtn = this.add.text(width / 2, height / 2 + 110, '[ 월드맵으로 돌아가기 ] (Enter)', {
      fontSize: '16px', color: '#88ccff', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => this.scene.start('WorldScene'));

    const lobbyBtn = this.add.text(width / 2, height / 2 + 140, '[ 로비로 돌아가기 ] (ESC)', {
      fontSize: '14px', color: '#88ff88', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    lobbyBtn.on('pointerdown', () => this.scene.start('LobbyScene'));

    // FINDING-A4 ext6: 에러 화면 키보드 nav (WCAG 2.1.1)
    // Enter → 월드맵, ESC → 로비. 단순 fallback 이라 cycle 보다 직접 매핑이 명확.
    this.input.keyboard?.on('keydown-ENTER', () => this.scene.start('WorldScene'));
    this.input.keyboard?.on('keydown-SPACE', () => this.scene.start('WorldScene'));
    this.input.keyboard?.on('keydown-ESC', () => this.scene.start('LobbyScene'));
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

    // 퀘스트 트래커의 "월드맵 열기" 버튼 → 월드맵 진입.
    // ESC 키(createInputs)와 동일 동작을 1-클릭으로 제공해, 메인 퀘스트
    // "말라투스 성소 진입"의 진행 방법을 모르는 사용자가 곧바로 목적지로 이동하게 한다.
    this.events.on('ui.event.quest.open_map', () => {
      this.scene.start('WorldScene');
    });

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
      const activeNpc = this.activeDialogueNpc;
      const npcId = activeNpc?.id ?? 'UNKNOWN_NPC';
      this.telemetryEmitter?.emitDialogueChoice({
        sessionId: this.sessionId,
        playerId: networkManager.userId ?? 'debug-player-001',
        chapterId: this.currentZoneId,
        sceneId: this.currentZoneName,
        npcId,
        dialogueNodeId: `${npcId}_FIELD_DIALOGUE_01`,
        choiceId,
        choiceTextKey: `dialogue.field.${npcId}.${choiceId.toLowerCase()}`,
        inputMode: 'keyboard',
        latencyMs: this.hudOrchestrator?.dialogueOpenAtMs > 0
          ? Date.now() - this.hudOrchestrator.dialogueOpenAtMs : undefined,
        partyComp: ['ERIEN', 'SERAPHINE'],
        difficultyTier: 'normal',
        buildVersion: '0.9.12-alpha',
        platform: 'web',
        region: 'KR',
      });

      const hasChoiceResult = activeNpc
        ? this.hudOrchestrator?.showNpcChoiceResult({
          id: activeNpc.id,
          name: activeNpc.name,
          role: activeNpc.role,
        }, choiceId) ?? false
        : false;

      if (!hasChoiceResult) {
        this.hudOrchestrator?.hideDialogue();
        this.activeDialogueNpc = null;
      }
    });

    // 챕터 타이틀 카드 표시 (존 진입 시)
    this._showChapterTitleCard();

    // 존 라벨 — 반드시 소켓 이벤트 등록 전에 생성해야 함
    const { width } = this.cameras.main;
    const era = getChronoEra(this.currentEraId);
    this.zoneLabel = this.add.text(width / 2, 20, `📍 ${this.currentZoneName}  /  ${era.label}`, {
      fontSize: '16px', color: '#88cc88', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
    }).setScrollFactor(0).setDepth(10000).setOrigin(0.5, 0);

    this.connectionLabel = this.add.text(width - 10, 20, '', {
      fontSize: '10px', color: '#44cc44', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
    }).setScrollFactor(0).setDepth(10000).setOrigin(1, 0);

    // P25-04: 존 정보 + 소켓 연결 — UI 생성 이후에 호출
    this._setupZone();
    this._setupSocketEvents();

    // HUD 안내 텍스트
    this.add.text(20, 20, '[WASD] 이동  [1~6] 스킬  [T] 대화  몬스터 클릭: ATB 전투', {
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
      const projection = projectZoneToEra(this.currentZoneId, this.currentEraId);
      this.zoneLabel?.setText(`📍 ${projection.displayName}  /  ${getChronoEra(this.currentEraId).label}`);

      this.zoneInfo.npcs?.forEach((npc, i) => {
        this._spawnNpc(npc.id, npc.name, 300 + i * 200, 400, npc.role);
      });

      // CHRONO-S123: chronoField encounter 기반 시대별 추가 spawn (visible encounter v1)
      try {
        const zid = this.zoneInfo?.id ?? '';
        const era = this.currentEraId ?? 'present';
        const encounter = zid ? resolveFieldEncounter(zid, era) : null;
        if (encounter) {
          const spawns = rollFieldEncounterSpawns(encounter, () => Math.random());
          spawns.forEach((slot, i) => {
            const baseLevel = slot.isBoss ? 30 : 10;
            this._spawnMonster(slot.monsterId, `${slot.name} Lv.${baseLevel}`,
              900 + (i % 4) * 130, 450 + Math.floor(i / 4) * 130, slot.isBoss === true);
          });
        } else {
          this.zoneInfo.monsters?.forEach((mon, i) => {
            this._spawnMonster(mon.id, `${mon.name} Lv.${mon.level}`, 600 + (i % 5) * 150, 600 + Math.floor(i / 5) * 150);
          });
        }
      } catch (e) {
        console.warn('[GameScene] chronoField encounter spawn 실패:', e);
        this.zoneInfo.monsters?.forEach((mon, i) => {
          this._spawnMonster(mon.id, `${mon.name} Lv.${mon.level}`, 600 + (i % 5) * 150, 600 + Math.floor(i / 5) * 150);
        });
      }
    } else {
      // 오프라인 폴백: 기본 NPC + 몬스터 배치 (매니페스트 실제 키 사용)
      this._spawnNpc('npc_guide', '수호자단 안내원', 300, 400, 'quest');
      this._spawnNpc('npc_merchant', '상인', 500, 400, 'shop');
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

  private _spawnNpc(id: string, name: string, x: number, y: number, role = 'dialogue'): void {
    const texKey = GameScene.NPC_SPRITE_MAP[id];
    let sprite: Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle;

    if (texKey && this.textures.exists(texKey)) {
      sprite = this.add.image(x, y, texKey)
        .setScale(1)
        .setInteractive({ useHandCursor: true });
    } else {
      sprite = this.add.rectangle(x, y, 32, 48, 0x44cc88)
        .setInteractive({ useHandCursor: true });
    }

    const tag = this.add.text(x, y - 42, name, {
      fontSize: '11px', color: '#88ff88', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
    }).setOrigin(0.5);

    const entity: RemoteEntity = { id, name, role, sprite, nameTag: tag, isMonster: false };
    sprite.on('pointerdown', () => {
      this._openNpcDialogue(entity);
    });
    this.remoteEntities.set(id, entity);
  }

  private _openNpcDialogue(npc: RemoteEntity): void {
    if (npc.isMonster) return;

    this.activeDialogueNpc = npc;
    this.hudOrchestrator?.showNpcDialogue({
      id: npc.id,
      name: npc.name,
      role: npc.role,
    });
  }

  private _openNearestNpcDialogue(): void {
    if (!this.player) return;

    let nearestNpc: RemoteEntity | null = null;
    let nearestDistanceSq = Number.POSITIVE_INFINITY;
    const maxDistanceSq = GameScene.NPC_INTERACTION_RANGE_PX * GameScene.NPC_INTERACTION_RANGE_PX;

    for (const entity of this.remoteEntities.values()) {
      if (entity.isMonster) continue;

      const dx = entity.sprite.x - this.player.x;
      const dy = entity.sprite.y - this.player.y;
      const distanceSq = dx * dx + dy * dy;
      if (distanceSq <= maxDistanceSq && distanceSq < nearestDistanceSq) {
        nearestNpc = entity;
        nearestDistanceSq = distanceSq;
      }
    }

    if (nearestNpc) {
      this._openNpcDialogue(nearestNpc);
    }
  }

  /**
   * 키보드 컷오버(감사 rank2): 범위 내 최근접 몬스터와 전투 진입(F). NPC 의 keydown-T
   * (_openNearestNpcDialogue) 와 대칭 — 몬스터만 키보드 등가가 없어 keyboardOnlyMode 에선
   * BattleScene 진입로가 전무하던 갭. 액션은 entity.engage(클릭과 동일 페이로드)로 단일화.
   */
  private _engageNearestMonster(): void {
    if (!this.player) return;

    let nearest: RemoteEntity | null = null;
    let nearestDistanceSq = Number.POSITIVE_INFINITY;
    const maxDistanceSq = GameScene.NPC_INTERACTION_RANGE_PX * GameScene.NPC_INTERACTION_RANGE_PX;

    for (const entity of this.remoteEntities.values()) {
      if (!entity.isMonster || !entity.engage) continue;

      const dx = entity.sprite.x - this.player.x;
      const dy = entity.sprite.y - this.player.y;
      const distanceSq = dx * dx + dy * dy;
      if (distanceSq <= maxDistanceSq && distanceSq < nearestDistanceSq) {
        nearest = entity;
        nearestDistanceSq = distanceSq;
      }
    }

    nearest?.engage?.();
  }

  // 프로그래매틱 몬스터 아이콘 팔레트
  private static readonly MONSTER_COLORS = [0xcc3333, 0xcc6633, 0x9933cc, 0x3366cc, 0x33cc66, 0xcc3399, 0x6633cc, 0x33cccc];
  private static readonly MONSTER_EMOJIS = ['💀', '🐺', '👻', '🕷', '🪨', '🐛', '🦇', '🔥'];

  private _spawnMonster(id: string, name: string, x: number, y: number, isBoss = false): void {
    const battleSeed = buildChronoBattleSeed(this.currentZoneId, this.currentEraId, id, name);
    // 이름 해시 기반 결정적 색상 + 이모지
    const hash = battleSeed.monsterName.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const color = GameScene.MONSTER_COLORS[hash % GameScene.MONSTER_COLORS.length];
    const emoji = GameScene.MONSTER_EMOJIS[hash % GameScene.MONSTER_EMOJIS.length];

    // CHRONO-S125: 보스 sprite 시각 차별 (60×60 + gold stroke + BOSS 라벨)
    const size = isBoss ? 60 : 40;
    const sprite = this.add.rectangle(x, y, size, size, color, 0.85)
      .setInteractive({ useHandCursor: true });
    if (isBoss) {
      sprite.setStrokeStyle(3, 0xffd54a, 1);
    }

    // 이모지 오버레이
    const emojiText = this.add.text(x, y, emoji, { fontSize: isBoss ? '32px' : '22px' }).setOrigin(0.5);
    sprite.once('destroy', () => emojiText.destroy());

    // 보스 BOSS 라벨
    if (isBoss) {
      const bossLabel = this.add.text(x, y + size / 2 + 12, '⚔️ BOSS', {
        fontSize: '11px',
        color: '#ffd54a',
        fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
        stroke: '#000000',
        strokeThickness: 2,
      }).setOrigin(0.5);
      sprite.once('destroy', () => bossLabel.destroy());
    }

    const tag = this.add.text(x, y - size / 2 - 14, battleSeed.monsterName, {
      fontSize: '10px', color: `#${getChronoEra(this.currentEraId).tintColor.toString(16).padStart(6, '0')}`, fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
    }).setOrigin(0.5);

    // 키보드 컷오버(감사 rank2): 전투 진입을 engage 로 추출 — 마우스 클릭과 키보드(F)가 동일
    // 페이로드(battleSeed·isBoss 배율)를 공유. 이전엔 pointerdown 클로저에만 갇혀 있어
    // keyboardOnlyMode(canvas pointer-events:none)에선 전투를 시작할 방법이 전무했다.
    const engage = (): void => {
      this.scene.start('BattleScene', {
        zoneId: this.currentZoneId,
        eraId: this.currentEraId,
        monsterId: id,
        monsterName: battleSeed.monsterName,
        // CHRONO-S126: 보스 spawn 시 데미지 배율 강화 (1.5x — 보스 분위기)
        enemyHpMultiplier: battleSeed.enemyHpMultiplier * (isBoss ? 2.5 : 1),
        enemyAttackSpeedMultiplier: battleSeed.enemyAttackSpeedMultiplier * (isBoss ? 1.2 : 1),
        rewardMultiplier: battleSeed.rewardMultiplier * (isBoss ? 1.5 : 1),
        isBossField: isBoss,
      });
    };
    sprite.on('pointerdown', engage);

    this.remoteEntities.set(id, { id, name: battleSeed.monsterName, sprite, nameTag: tag, isMonster: true, engage });
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
          fontSize: '11px', color: '#88ccff', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
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
    const unsub5 = networkManager.onConnectionChange((state) => {
      const label = state === 'connected' ? '● 온라인' : `○ ${state}`;
      const color = state === 'connected' ? '#44cc44' : '#cccc44';
      this.connectionLabel?.setText(label).setColor(color);
    });
    this.socketCleanups.push(unsub5);
    this.connectionLabel?.setText(networkManager.isConnected ? '● 온라인' : '○ 오프라인');
  }

  update(_time: number, delta: number): void {
    if (this._sceneFailed) return;
    try {
      if (!this.player || !this.wasdKeys || !this.cursors) return;
      const moveSpeed = 300;
      this.player.setVelocity(0);

      // 모달 패널(인벤토리 등)이 열려 있으면 화살표/WASD 를 패널 포커스 이동에 양보(이동 정지).
      if (isUiModalOpen()) return;

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
    this.activeDialogueNpc = null;
  }

  // ── 월드/플레이어/입력 생성 ──

  private createWorld(): void {
    const worldW = 2000, worldH = 2000;

    // 배경색 (맵 밖 영역) — 순수 검정
    this.cameras.main.setBackgroundColor('#000000');

    // 배경 이미지 — 월드 전체를 덮도록 스케일
    const { width: vw, height: vh } = this.cameras.main;
    if (this.textures.exists(this.zoneBackground.farKey)) {
      const bg = this.add.image(worldW / 2, worldH / 2, this.zoneBackground.farKey)
        .setOrigin(0.5, 0.5)
        .setDepth(-10);
      // 월드 전체를 덮도록 스케일
      const scaleX = worldW / bg.width;
      const scaleY = worldH / bg.height;
      bg.setScale(Math.max(scaleX, scaleY));
    }
    // 하늘 배경 (카메라 고정)
    if (this.textures.exists(this.zoneBackground.skyKey)) {
      const sky = this.add.image(vw / 2, vh / 2, this.zoneBackground.skyKey)
        .setOrigin(0.5, 0.5)
        .setScrollFactor(0)
        .setDepth(-20);
      const sx = vw / sky.width;
      const sy = vh / sky.height;
      sky.setScale(Math.max(sx, sy));
    }

    const projection = projectZoneToEra(this.currentZoneId, this.currentEraId);
    this.add.rectangle(worldW / 2, worldH / 2, worldW, worldH, projection.tintColor, 0.08)
      .setDepth(-5);

    this.physics.world.setBounds(0, 0, worldW, worldH);

    // 환경 오브젝트 비활성화 — pixelArt 스케일링 깨짐 방지
    // this._placeEnvironmentObjects(worldW, worldH);
  }

  /** 환경 오브젝트 배치 — 존 설정 기반 동적 생성 */
  private _placeEnvironmentObjects(worldW: number, worldH: number): void {
    // 지면: 제거 — 배경 이미지가 전체 커버

    const envConfig = ZONE_ENV_CONFIG[this.currentZoneId];
    if (!envConfig) return;

    // 시드 기반 난수 — 존마다 같은 배치 보장
    const rng = new Phaser.Math.RandomDataGenerator([`${this.currentZoneId}_env_42`]);

    // 플레이어 스폰 중심(640,360) 주변 400x400 영역 회피
    const isSpawnZone = (x: number, y: number): boolean =>
      x > 440 && x < 840 && y > 160 && y < 560;

    const pickPos = (): { x: number; y: number } => {
      for (let attempt = 0; attempt < 30; attempt++) {
        const x = rng.between(100, worldW - 100);
        const y = rng.between(100, worldH - 100);
        if (!isSpawnZone(x, y)) return { x, y };
      }
      return { x: rng.between(100, worldW - 100), y: rng.between(100, worldH - 100) };
    };

    for (const obj of envConfig.objects) {
      if (!this.textures.exists(obj.key)) continue;

      for (let i = 0; i < obj.count; i++) {
        const { x, y } = pickPos();
        const img = this.add.image(x, y, obj.key);
        const scale = rng.realInRange(obj.scaleMin, obj.scaleMax);
        img.setScale(scale);
        img.setOrigin(0.5, 1); // 발 기준 배치
        img.setDepth(y);       // Y-depth 정렬

        if (obj.glow) {
          const [alphaMin, alphaMax] = obj.glowAlpha ?? [0.7, 1.0];
          img.setAlpha(alphaMax);

          this.tweens.add({
            targets: img,
            alpha: { from: alphaMin, to: alphaMax },
            duration: 2000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
            delay: rng.between(0, 1000),
          });
        }
      }
    }
  }

  private createPlayer(): void {
    this.player = this.physics.add.sprite(640, 360, 'player_sprite');
    // 필드용 표시 크기 고정: 현재 에테르 기사 원본은 256x384 전신 일러스트라 원본 크기 표시 시 시야를 가림.
    const targetHeight = 112;
    const scale = Math.min(1, targetHeight / Math.max(1, this.player.height));
    this.player.setScale(scale).setDepth(20);
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
        this._openNearestNpcDialogue();
      });
      // 키보드 컷오버(감사 rank2): F = 최근접 몬스터 전투 진입(T 의 몬스터 대칭)
      this.input.keyboard.on('keydown-F', () => {
        this._engageNearestMonster();
      });
      this.input.keyboard.on('keydown-ESC', () => {
        this.scene.start('WorldScene');
      });
    }
  }
}
