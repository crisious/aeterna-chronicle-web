/**
 * WorldScene.ts — 월드맵 오버뷰 씬 (P5-18 → P25-06 API 연동)
 *
 * - 6개 지역 표시 (에테르 평원 / 기억의 숲 / 그림자 협곡 / 결정 동굴 / 잊혀진 성채 / 시간의 첨탑)
 * - 존 선택 → 이동 애니메이션 → 해당 씬 전환
 * - 지역 잠금/해금 상태 표시
 */

import * as Phaser from 'phaser';
import { SceneManager } from './SceneManager';
import { networkManager } from '../network/NetworkManager';
import {
  CHRONO_ERAS,
  cycleChronoEra,
  projectZoneToEra,
  type ChronoEraId,
} from '../time/ChronoTimeline';
import { resolveZoneBackground } from '../data/zoneBackgrounds';
import { loadLastEra, saveLastEra } from '../time/eraStorage';
import {
  getSpriteResourceForSkillIcon,
  getSpriteResourceForWorldZoneIcon,
} from '../assets/spriteResourceManifest';
import { getStatusIconResource } from '../data/statusEffectIcons';

// ── 지역 정의 ───────────────────────────────────────────────

interface WorldZone {
  id: string;
  name: string;
  description: string;
  color: number;
  /** 맵상 위치 (1280x720 기준 비율) */
  posRatioX: number;
  posRatioY: number;
  /** 최소 진입 레벨 */
  minLevel: number;
  /** 해금 여부 (기본 true = 전부 해금, 추후 서버 연동) */
  unlocked: boolean;
}

interface WorldSceneData {
  zoneId?: string;
  eraId?: ChronoEraId;
  characterId?: string;
  characterName?: string;
  characterClass?: string;
  className?: string;
  baseStats?: { hp: number; mp: number; atk: number; def: number };
  level?: number;
  offlineQa?: boolean;
}

interface WorldActionButtonOptions {
  container?: Phaser.GameObjects.Container;
  name: string;
  fontSize?: string;
  iconId?: string;
  iconXOffset?: number;
  iconTextOffsetX?: number;
  iconLabel?: string;
}

interface WorldPlayerMarkerAvatarResource {
  key: string;
  path: string;
}

const WORLD_ZONES: WorldZone[] = [
  { id: 'aether_plains',     name: '에테르 평원',     description: 'Lv.1~10 / 시작 지역',       color: 0x88cc44, posRatioX: 0.2,  posRatioY: 0.55, minLevel: 1,  unlocked: true },
  { id: 'memory_forest',     name: '기억의 숲',       description: 'Lv.10~20 / 고대 정령 서식지', color: 0x44aa88, posRatioX: 0.4,  posRatioY: 0.35, minLevel: 10, unlocked: true },
  { id: 'malatus_sanctuary', name: '말라투스 성소',   description: 'Lv.20~28 / 실반헤임 봉인 유적', color: 0x7fd8a8, posRatioX: 0.52, posRatioY: 0.26, minLevel: 20, unlocked: true },
  { id: 'shadow_gorge',      name: '그림자 협곡',     description: 'Lv.20~30 / 그림자 세력 근거지', color: 0x664488, posRatioX: 0.6,  posRatioY: 0.6,  minLevel: 20, unlocked: true },
  { id: 'crystal_cave',      name: '결정 동굴',       description: 'Lv.30~40 / 에테르 결정 광맥',  color: 0x44cccc, posRatioX: 0.75, posRatioY: 0.3,  minLevel: 30, unlocked: true },
  { id: 'forgotten_citadel', name: '잊혀진 성채',     description: 'Lv.40~50 / 고대 문명 유적',   color: 0xcc8844, posRatioX: 0.85, posRatioY: 0.55, minLevel: 40, unlocked: false },
  { id: 'chrono_spire',      name: '시간의 첨탑',     description: 'Lv.50 / 최종 지역',          color: 0xff4488, posRatioX: 0.5,  posRatioY: 0.15, minLevel: 50, unlocked: false },
];

const NODE_RADIUS = 28;
const WORLD_UI_FRAME_TEXTURES = {
  infoPanel: {
    key: 'ui_frame_UI-HUD-003-DEF',
    path: 'assets/generated/ui/frames/UI-HUD-003-DEF.png',
    width: 512,
    height: 512,
  },
  previewFrame: {
    key: 'ui_frame_UI-HUD-004-DEF',
    path: 'assets/generated/ui/frames/UI-HUD-004-DEF.png',
    width: 512,
    height: 512,
  },
  actionButton: {
    key: 'ui_frame_world_action_button',
    path: 'assets/generated/ui/frames/UI-BTN-006-DEF.png',
    width: 512,
    height: 512,
  },
} as const;

const WORLD_SCENE_EXPECTED_BACKGROUND_IMAGE_COUNT = 1;
const WORLD_SCENE_EXPECTED_ACTION_BUTTON_FRAME_COUNT = 4;
const WORLD_SCENE_EXPECTED_ACTION_BUTTON_ICON_COUNT = 4;
const WORLD_SCENE_EXPECTED_LOCKED_ZONE_ICON_COUNT = WORLD_ZONES.filter((zone) => !zone.unlocked).length;
const WORLD_SCENE_EXPECTED_SELECTED_ZONE_PANEL_ICON_COUNT = 1;
const WORLD_SCENE_EXPECTED_PLAYER_MARKER_AVATAR_COUNT = 1;
const WORLD_TITLE_ICON_ZONE_ID = 'aether_plains';
const WORLD_SCENE_EXPECTED_TITLE_ICON_COUNT = 1;
const WORLD_ENCOUNTER_AMBIENT_ICON_ID = 'shield';
const WORLD_ENCOUNTER_BOSS_ICON_ID = 'skill_ek_slash';
const WORLD_SCENE_EXPECTED_ENCOUNTER_AMBIENT_ICON_COUNT = 1;
const WORLD_SCENE_EXPECTED_ENCOUNTER_BOSS_ICON_COUNT = 1;
const WORLD_ACTION_BUTTON_ICON_IDS = {
  eraPrev: 'skill_tg_reverse',
  eraNext: 'skill_tg_haste',
  back: 'skill_vw_warp',
  travel: 'skill_mw_arrow',
} as const;
const WORLD_LOCKED_ZONE_STATUS_ICON_ID = 'stun';
const WORLD_PLAYER_MARKER_AVATAR_RESOURCES = {
  ether_knight: {
    key: 'char_battle_ether_knight',
    path: 'assets/generated/characters/class_main/battle/char_battle_ether_knight.png',
  },
  memory_weaver: {
    key: 'char_battle_memory_weaver',
    path: 'assets/generated/characters/class_main/battle/char_battle_memory_weaver.png',
  },
  shadow_weaver: {
    key: 'char_battle_shadow_weaver',
    path: 'assets/generated/characters/class_main/battle/char_battle_shadow_weaver.png',
  },
  memory_breaker: {
    key: 'char_battle_memory_breaker',
    path: 'assets/generated/characters/class_main/battle/char_battle_memory_breaker.png',
  },
  time_guardian: {
    key: 'char_battle_time_guardian',
    path: 'assets/generated/characters/class_main/battle/char_battle_time_guardian.png',
  },
  void_wanderer: {
    key: 'char_battle_void_wanderer',
    path: 'assets/generated/characters/class_main/battle/char_battle_void_wanderer.png',
  },
} as const;

function getWorldPlayerMarkerAvatarResource(classId?: string): WorldPlayerMarkerAvatarResource {
  const normalizedClassId = classId?.trim() || 'ether_knight';
  return WORLD_PLAYER_MARKER_AVATAR_RESOURCES[normalizedClassId as keyof typeof WORLD_PLAYER_MARKER_AVATAR_RESOURCES]
    ?? WORLD_PLAYER_MARKER_AVATAR_RESOURCES.ether_knight;
}

// ── WorldScene ──────────────────────────────────────────────

export class WorldScene extends Phaser.Scene {
  private zoneNodes: Phaser.GameObjects.Container[] = [];
  private travelLine!: Phaser.GameObjects.Graphics;
  private infoPanel: Phaser.GameObjects.Container | null = null;
  private playerMarker!: Phaser.GameObjects.Image | Phaser.GameObjects.Arc;
  private currentZoneId = 'aether_plains';
  private currentEraId: ChronoEraId = 'present';
  private sceneData: WorldSceneData = {};
  private selectedZone: WorldZone | null = null;
  private eraLabelText: Phaser.GameObjects.Text | null = null;
  private eraHintText: Phaser.GameObjects.Text | null = null;
  private worldBackgroundImage: Phaser.GameObjects.Image | null = null;
  private worldActionButtonFrames: Phaser.GameObjects.Image[] = [];
  private worldActionButtonIcons: Phaser.GameObjects.Image[] = [];
  private worldLockedZoneIcons: Phaser.GameObjects.Image[] = [];
  private worldSelectedZonePanelIcons: Phaser.GameObjects.Image[] = [];
  private worldPlayerMarkerAvatar: Phaser.GameObjects.Image | null = null;
  private worldTitleIcon: Phaser.GameObjects.Image | null = null;
  private worldTitleIconFallback: Phaser.GameObjects.Text | null = null;
  private worldEncounterAmbientIcons: Phaser.GameObjects.Image[] = [];
  private worldEncounterBossIcons: Phaser.GameObjects.Image[] = [];
  private worldEncounterLineText: Phaser.GameObjects.Text | null = null;
  private worldEncounterAmbientIconExpectedCount = 0;
  private worldEncounterBossIconExpectedCount = 0;
  private worldEncounterAmbientIconFallbackRendered = false;
  private worldEncounterBossIconFallbackRendered = false;

  // FINDING-A4 ext3: zone 키보드 nav state
  private navigableZoneIndices: number[] = [];
  private zoneIndex = 0;
  private highlightRing: Phaser.GameObjects.Arc | null = null;
  private _zoneKeyboardCleanup: (() => void) | null = null;

  constructor() {
    super({ key: 'WorldScene' });
  }

  init(data?: WorldSceneData): void {
    this.sceneData = data ?? {};
    if (data?.zoneId) this.currentZoneId = data.zoneId;
    // 우선순위: scene init data > localStorage 복원 > 기존 currentEraId(present)
    this.currentEraId = data?.eraId ?? loadLastEra() ?? this.currentEraId;
    this.selectedZone = null;
    this.worldActionButtonFrames = [];
    this.worldActionButtonIcons = [];
    this.worldLockedZoneIcons = [];
    this.worldSelectedZonePanelIcons = [];
    this.worldPlayerMarkerAvatar = null;
    this.worldTitleIcon = null;
    this.worldTitleIconFallback = null;
    this._resetWorldEncounterLineState();
  }

  // ── 라이프사이클 ─────────────────────────────────────────

  // 존 아이콘 매핑
  private static readonly ZONE_ICON_MAP: Record<string, string> = {
    aether_plains: 'zone_aether_plains',
    memory_forest: 'zone_memory_forest',
    malatus_sanctuary: 'zone_malatus_sanctuary',
    shadow_gorge: 'zone_shadow_gorge',
    crystal_cave: 'zone_crystal_cave',
    forgotten_citadel: 'zone_forgotten_citadel',
    chrono_spire: 'zone_chrono_spire',
  };

  preload(): void {
    for (const texture of Object.values(WORLD_UI_FRAME_TEXTURES)) {
      if (!this.textures.exists(texture.key)) {
        this.load.image(texture.key, texture.path);
      }
    }

    for (const iconId of Object.values(WORLD_ACTION_BUTTON_ICON_IDS)) {
      const actionIconResource = getSpriteResourceForSkillIcon(iconId);
      if (actionIconResource && !this.textures.exists(actionIconResource.key)) {
        this.load.image(actionIconResource.key, actionIconResource.path);
      }
    }

    const lockedZoneIconResource = getStatusIconResource(WORLD_LOCKED_ZONE_STATUS_ICON_ID);
    if (lockedZoneIconResource && !this.textures.exists(lockedZoneIconResource.key)) {
      this.load.image(lockedZoneIconResource.key, lockedZoneIconResource.path);
    }

    const encounterAmbientIconResource = getStatusIconResource(WORLD_ENCOUNTER_AMBIENT_ICON_ID);
    if (encounterAmbientIconResource && !this.textures.exists(encounterAmbientIconResource.key)) {
      this.load.image(encounterAmbientIconResource.key, encounterAmbientIconResource.path);
    }

    const encounterBossIconResource = getSpriteResourceForSkillIcon(WORLD_ENCOUNTER_BOSS_ICON_ID);
    if (encounterBossIconResource && !this.textures.exists(encounterBossIconResource.key)) {
      this.load.image(encounterBossIconResource.key, encounterBossIconResource.path);
    }

    const playerMarkerAvatarResource = getWorldPlayerMarkerAvatarResource(this.sceneData.characterClass);
    if (!this.textures.exists(playerMarkerAvatarResource.key)) {
      this.load.image(playerMarkerAvatarResource.key, playerMarkerAvatarResource.path);
    }

    // 존 아이콘 로드 (64x64 픽셀아트)
    for (const zone of WORLD_ZONES) {
      const resource = getSpriteResourceForWorldZoneIcon(zone.id);
      if (resource && !this.textures.exists(resource.key)) {
        this.load.image(resource.key, resource.path);
        continue;
      }

      const iconKey = WorldScene.ZONE_ICON_MAP[zone.id];
      if (iconKey && !this.textures.exists(iconKey)) {
        this.load.image(iconKey, `assets/generated/ui/worldmap/${iconKey}.png`);
      }
    }

    const loadedPreviewKeys = new Set<string>();
    const worldBackground = this._resolveWorldBackgroundDescriptor();
    if (!this.textures.exists(worldBackground.farKey)) {
      this.load.image(worldBackground.farKey, worldBackground.farPath);
      loadedPreviewKeys.add(worldBackground.farKey);
    }

    // 선택 패널 미리보기: 현재 시간대 기준으로 지역별 배경을 고유 키로 로드한다.
    for (const zone of WORLD_ZONES) {
      const background = resolveZoneBackground(zone.id, this.currentEraId);
      if (loadedPreviewKeys.has(background.farKey) || this.textures.exists(background.farKey)) continue;
      this.load.image(background.farKey, background.farPath);
      loadedPreviewKeys.add(background.farKey);
    }

    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      console.warn(`[World] 이미지 로드 실패: ${file.key}`);
    });
  }

  create(): void {
    const { width, height } = this.cameras.main;
    this.cameras.main.setBackgroundColor('#0a0a1e');

    this._addWorldBackground(width, height);

    // 타이틀
    const titleY = 28;
    const titleIconResource = this._getWorldTitleIconResource();
    const titleIconX = width / 2 - 116;
    if (titleIconResource && this.textures.exists(titleIconResource.key)) {
      this.worldTitleIcon = this.add.image(titleIconX, titleY, titleIconResource.key)
        .setName('world_title_map_icon')
        .setOrigin(0.5);
      this.worldTitleIcon.setDisplaySize(24, 24);
      this.worldTitleIcon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    } else {
      this.worldTitleIconFallback = this.add.text(titleIconX, titleY, '🗺️', {
        fontSize: '20px',
        fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
        color: '#cccc88',
      }).setName('world_title_map_icon_fallback').setOrigin(0.5);
    }

    this.add.text(width / 2 + 16, titleY, '에테르나 월드맵', {
      fontSize: '22px',
      fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
      color: '#cccc88',
    }).setOrigin(0.5);

    this._createChronoControls(width);

    // 경로 연결선
    this.travelLine = this.add.graphics();
    this._drawConnectionLines(width, height);

    // 지역 노드
    for (const zone of WORLD_ZONES) {
      const node = this._createZoneNode(zone, width, height);
      this.zoneNodes.push(node);
    }

    // 플레이어 위치 마커
    const startZone = WORLD_ZONES.find(z => z.id === this.currentZoneId) ?? WORLD_ZONES[0];
    this.playerMarker = this._addWorldPlayerMarker(
      startZone.posRatioX * width,
      startZone.posRatioY * height,
    );
    this._pulseMarker();

    this._addWorldActionButton(
      116,
      height - 30,
      220,
      30,
      '← 마을로 돌아가기 (ESC)',
      '#c8c8d8',
      () => this.startLobbyScene(),
      {
        name: 'world_back_action_button',
        fontSize: '13px',
        iconId: WORLD_ACTION_BUTTON_ICON_IDS.back,
        iconXOffset: -88,
        iconTextOffsetX: 12,
        iconLabel: '마을로 돌아가기 (ESC)',
      },
    );

    // FINDING-A4 ext3: zone 키보드 nav (WCAG 2.1.1)
    // unlocked zone 만 cycle. ArrowLeft/Right + Up/Down 모두 zone idx 단방향.
    this.navigableZoneIndices = WORLD_ZONES
      .map((z, i) => z.unlocked ? i : -1)
      .filter(i => i >= 0);

    if (this.navigableZoneIndices.length > 0) {
      // currentZoneId 부터 시작 (있으면)
      const startNi = this.navigableZoneIndices.findIndex(
        zi => WORLD_ZONES[zi].id === this.currentZoneId,
      );
      this.zoneIndex = startNi >= 0 ? startNi : 0;
      this._highlightZone(this.zoneIndex);
    }

    const len = this.navigableZoneIndices.length;
    const onPrev = () => {
      if (len === 0) return;
      this._highlightZone((this.zoneIndex + len - 1) % len);
    };
    const onNext = () => {
      if (len === 0) return;
      this._highlightZone((this.zoneIndex + 1) % len);
    };
    // 2단계 ENTER: 정보 패널이 없으면 열고(확인), 현재 존의 패널이 이미 열려 있으면 시간 이동.
    // (정보 패널의 [시간 이동] 버튼은 pointerdown 전용이라 키보드로는 이 경로로 진입한다.)
    const onSelect = () => {
      const zoneIdx = this.navigableZoneIndices[this.zoneIndex];
      const zone = WORLD_ZONES[zoneIdx];
      if (!zone) return;
      if (this.infoPanel && this.selectedZone?.id === zone.id) {
        this._travelToZone(zone);
      } else {
        this._onZoneClick(zone);
      }
    };
    const onEsc = () => this.startLobbyScene();

    this.input.keyboard?.on('keydown-LEFT', onPrev);
    this.input.keyboard?.on('keydown-UP', onPrev);
    this.input.keyboard?.on('keydown-RIGHT', onNext);
    this.input.keyboard?.on('keydown-DOWN', onNext);
    this.input.keyboard?.on('keydown-ENTER', onSelect);
    this.input.keyboard?.on('keydown-SPACE', onSelect);
    this.input.keyboard?.on('keydown-ESC', onEsc);
    this.input.keyboard?.on('keydown-Q', () => this._setChronoEra(cycleChronoEra(this.currentEraId, -1)));
    this.input.keyboard?.on('keydown-E', () => this._setChronoEra(cycleChronoEra(this.currentEraId, 1)));

    this._zoneKeyboardCleanup = () => {
      this.input.keyboard?.off('keydown-LEFT', onPrev);
      this.input.keyboard?.off('keydown-UP', onPrev);
      this.input.keyboard?.off('keydown-RIGHT', onNext);
      this.input.keyboard?.off('keydown-DOWN', onNext);
      this.input.keyboard?.off('keydown-ENTER', onSelect);
      this.input.keyboard?.off('keydown-SPACE', onSelect);
      this.input.keyboard?.off('keydown-ESC', onEsc);
      this.input.keyboard?.removeAllListeners('keydown-Q');
      this.input.keyboard?.removeAllListeners('keydown-E');
    };

    if (this._isWorldFrameQaRoute()) {
      const qaZone = WORLD_ZONES.find(z => z.id === this.currentZoneId && z.unlocked)
        ?? WORLD_ZONES.find(z => z.unlocked);
      if (qaZone) {
        this._onZoneClick(qaZone);
      }
      this._writeWorldFrameQaProbe('ready');
    }

    SceneManager.fadeIn(this, 300);
  }

  private _getWorldTitleIconResource() {
    return getSpriteResourceForWorldZoneIcon(WORLD_TITLE_ICON_ZONE_ID);
  }

  private _resolveWorldBackgroundDescriptor(): ReturnType<typeof resolveZoneBackground> {
    const zone = WORLD_ZONES.find(z => z.id === this.currentZoneId) ?? WORLD_ZONES[0];
    return resolveZoneBackground(zone.id, this.currentEraId);
  }

  private _addWorldBackground(width: number, height: number): void {
    const background = this._resolveWorldBackgroundDescriptor();

    if (this.textures.exists(background.farKey)) {
      this.worldBackgroundImage = this.add.image(width / 2, height / 2, background.farKey)
        .setName('world_scene_background_image')
        .setDisplaySize(width, height)
        .setAlpha(0.42)
        .setDepth(-20);
    } else {
      // Aseprite world scene background 로드 실패 시에만 사용하는 안전 fallback.
      this.add.rectangle(width / 2, height / 2, width, height, 0x0a0a1e)
        .setName('world_scene_background_fallback')
        .setDepth(-20);
    }
  }

  private _writeWorldFrameQaProbe(status: 'ready'): void {
    if (!this._isWorldFrameQaRoute() || typeof document === 'undefined') {
      return;
    }

    const background = this._resolveWorldBackgroundDescriptor();
    const renderedActionButtonFrames = this.worldActionButtonFrames.filter(frame => frame.active);
    const renderedActionButtonIcons = this.worldActionButtonIcons.filter(icon => icon.active);
    const renderedLockedZoneIcons = this.worldLockedZoneIcons.filter(icon => icon.active);
    const renderedSelectedZonePanelIcons = this.worldSelectedZonePanelIcons.filter(icon => icon.active);
    const renderedPlayerMarkerAvatar = this.worldPlayerMarkerAvatar?.active ? this.worldPlayerMarkerAvatar : null;
    const renderedTitleIcon = this.worldTitleIcon?.active ? this.worldTitleIcon : null;
    const renderedEncounterAmbientIcons = this.worldEncounterAmbientIcons.filter(icon => icon.active);
    const renderedEncounterBossIcons = this.worldEncounterBossIcons.filter(icon => icon.active);
    const lockedZoneIconResource = getStatusIconResource(WORLD_LOCKED_ZONE_STATUS_ICON_ID);
    const encounterAmbientIconResource = getStatusIconResource(WORLD_ENCOUNTER_AMBIENT_ICON_ID);
    const encounterBossIconResource = getSpriteResourceForSkillIcon(WORLD_ENCOUNTER_BOSS_ICON_ID);
    const selectedZonePanelIconResource = this.selectedZone ? getSpriteResourceForWorldZoneIcon(this.selectedZone.id) : undefined;
    const playerMarkerAvatarResource = getWorldPlayerMarkerAvatarResource(this.sceneData.characterClass);
    const titleIconResource = this._getWorldTitleIconResource();
    const missingIconTextureKeys = Object.values(WORLD_ACTION_BUTTON_ICON_IDS).flatMap((iconId) => {
      const iconResource = getSpriteResourceForSkillIcon(iconId);
      if (!iconResource) return [iconId];
      const hasRenderedIcon = renderedActionButtonIcons.some((icon) => icon.texture.key === iconResource.key);
      return hasRenderedIcon ? [] : [iconResource.key];
    });
    const missingLockedZoneIconTextureKeys = (() => {
      if (!lockedZoneIconResource) return [WORLD_LOCKED_ZONE_STATUS_ICON_ID];
      const hasExpectedLockedZoneIcons = (
        this.textures.exists(lockedZoneIconResource.key)
        && renderedLockedZoneIcons.length === WORLD_SCENE_EXPECTED_LOCKED_ZONE_ICON_COUNT
        && renderedLockedZoneIcons.every((icon) => icon.texture.key === lockedZoneIconResource.key)
      );
      return hasExpectedLockedZoneIcons ? [] : [lockedZoneIconResource.key];
    })();
    const missingSelectedZonePanelIconTextureKeys = (() => {
      if (!this.selectedZone) return [];
      if (!selectedZonePanelIconResource) return [this.selectedZone.id];
      const hasExpectedSelectedZonePanelIcon = (
        this.textures.exists(selectedZonePanelIconResource.key)
        && renderedSelectedZonePanelIcons.length === WORLD_SCENE_EXPECTED_SELECTED_ZONE_PANEL_ICON_COUNT
        && renderedSelectedZonePanelIcons.every((icon) => icon.texture.key === selectedZonePanelIconResource.key)
      );
      return hasExpectedSelectedZonePanelIcon ? [] : [selectedZonePanelIconResource.key];
    })();
    const missingPlayerMarkerAvatarTextureKeys = (() => {
      const hasExpectedPlayerMarkerAvatar = (
        this.textures.exists(playerMarkerAvatarResource.key)
        && renderedPlayerMarkerAvatar?.texture.key === playerMarkerAvatarResource.key
      );
      return hasExpectedPlayerMarkerAvatar ? [] : [playerMarkerAvatarResource.key];
    })();
    const missingTitleIconTextureKeys = (() => {
      if (!titleIconResource) return [WORLD_TITLE_ICON_ZONE_ID];
      const hasExpectedTitleIcon = (
        this.textures.exists(titleIconResource.key)
        && renderedTitleIcon?.texture.key === titleIconResource.key
      );
      return hasExpectedTitleIcon ? [] : [titleIconResource.key];
    })();
    const missingEncounterAmbientIconTextureKeys = (() => {
      if (this.worldEncounterAmbientIconExpectedCount === 0) return [];
      if (!encounterAmbientIconResource) return [WORLD_ENCOUNTER_AMBIENT_ICON_ID];
      const hasExpectedEncounterAmbientIcon = (
        this.textures.exists(encounterAmbientIconResource.key)
        && renderedEncounterAmbientIcons.length === this.worldEncounterAmbientIconExpectedCount
        && renderedEncounterAmbientIcons.every((icon) => icon.texture.key === encounterAmbientIconResource.key)
      );
      return hasExpectedEncounterAmbientIcon ? [] : [encounterAmbientIconResource.key];
    })();
    const missingEncounterBossIconTextureKeys = (() => {
      if (this.worldEncounterBossIconExpectedCount === 0) return [];
      if (!encounterBossIconResource) return [WORLD_ENCOUNTER_BOSS_ICON_ID];
      const hasExpectedEncounterBossIcon = (
        this.textures.exists(encounterBossIconResource.key)
        && renderedEncounterBossIcons.length === this.worldEncounterBossIconExpectedCount
        && renderedEncounterBossIcons.every((icon) => icon.texture.key === encounterBossIconResource.key)
      );
      return hasExpectedEncounterBossIcon ? [] : [encounterBossIconResource.key];
    })();
    const legacyEncounterGlyphPresent = Boolean(
      this.worldEncounterLineText?.text.includes('🛡')
      || this.worldEncounterLineText?.text.includes('⚔'),
    );
    const hasExpectedActionButtonFrames = (
      this.textures.exists(WORLD_UI_FRAME_TEXTURES.actionButton.key)
      && renderedActionButtonFrames.length === WORLD_SCENE_EXPECTED_ACTION_BUTTON_FRAME_COUNT
    );
    const hasExpectedActionButtonIcons = (
      missingIconTextureKeys.length === 0
      && renderedActionButtonIcons.length === WORLD_SCENE_EXPECTED_ACTION_BUTTON_ICON_COUNT
    );
    document.body.dataset.aeternaWorldFrameQa = JSON.stringify({
      status,
      zoneId: this.currentZoneId,
      eraId: this.currentEraId,
      backgroundImage: {
        key: background.farKey,
        path: background.farPath,
        renderedCount: this.worldBackgroundImage ? 1 : 0,
        expectedCount: WORLD_SCENE_EXPECTED_BACKGROUND_IMAGE_COUNT,
        displayWidth: this.worldBackgroundImage?.displayWidth ?? 0,
        displayHeight: this.worldBackgroundImage?.displayHeight ?? 0,
      },
      titleIcon: {
        zoneId: WORLD_TITLE_ICON_ZONE_ID,
        key: titleIconResource?.key ?? null,
        path: titleIconResource?.path ?? null,
        renderedCount: renderedTitleIcon ? 1 : 0,
        expectedCount: WORLD_SCENE_EXPECTED_TITLE_ICON_COUNT,
        textureKey: renderedTitleIcon?.texture.key ?? null,
        displayWidth: renderedTitleIcon?.displayWidth ?? 0,
        displayHeight: renderedTitleIcon?.displayHeight ?? 0,
        visible: renderedTitleIcon?.visible ?? false,
        fallbackRendered: this.worldTitleIconFallback?.active === true,
        missingTitleIconTextureKeys,
      },
      encounterLineIcon: {
        ambientIcon: {
          iconId: WORLD_ENCOUNTER_AMBIENT_ICON_ID,
          key: encounterAmbientIconResource?.key ?? null,
          path: encounterAmbientIconResource?.path ?? null,
          renderedCount: renderedEncounterAmbientIcons.length,
          expectedCount: this.worldEncounterAmbientIconExpectedCount,
          textureKeys: renderedEncounterAmbientIcons.map((icon) => icon.texture.key),
          displaySizes: renderedEncounterAmbientIcons.map((icon) => ({
            name: icon.name,
            width: icon.displayWidth,
            height: icon.displayHeight,
          })),
          fallbackRendered: this.worldEncounterAmbientIconFallbackRendered,
          missingEncounterAmbientIconTextureKeys,
        },
        bossIcon: {
          iconId: WORLD_ENCOUNTER_BOSS_ICON_ID,
          key: encounterBossIconResource?.key ?? null,
          path: encounterBossIconResource?.path ?? null,
          renderedCount: renderedEncounterBossIcons.length,
          expectedCount: this.worldEncounterBossIconExpectedCount,
          textureKeys: renderedEncounterBossIcons.map((icon) => icon.texture.key),
          displaySizes: renderedEncounterBossIcons.map((icon) => ({
            name: icon.name,
            width: icon.displayWidth,
            height: icon.displayHeight,
          })),
          fallbackRendered: this.worldEncounterBossIconFallbackRendered,
          missingEncounterBossIconTextureKeys,
        },
        encounterText: this.worldEncounterLineText?.text ?? null,
        legacyGlyphPresent: legacyEncounterGlyphPresent,
      },
      actionButtonFrame: {
        key: WORLD_UI_FRAME_TEXTURES.actionButton.key,
        path: WORLD_UI_FRAME_TEXTURES.actionButton.path,
        renderedCount: renderedActionButtonFrames.length,
        expectedCount: WORLD_SCENE_EXPECTED_ACTION_BUTTON_FRAME_COUNT,
        displaySizes: renderedActionButtonFrames.map((frame) => ({
          name: frame.name,
          width: frame.displayWidth,
          height: frame.displayHeight,
        })),
      },
      actionButtonIcon: {
        renderedCount: renderedActionButtonIcons.length,
        expectedCount: WORLD_SCENE_EXPECTED_ACTION_BUTTON_ICON_COUNT,
        textureKeys: renderedActionButtonIcons.map((icon) => icon.texture.key),
        displaySizes: renderedActionButtonIcons.map((icon) => ({
          name: icon.name,
          width: icon.displayWidth,
          height: icon.displayHeight,
        })),
        missingIconTextureKeys,
      },
      lockedZoneIcon: {
        iconId: WORLD_LOCKED_ZONE_STATUS_ICON_ID,
        key: lockedZoneIconResource?.key ?? WORLD_LOCKED_ZONE_STATUS_ICON_ID,
        path: lockedZoneIconResource?.path ?? null,
        renderedCount: renderedLockedZoneIcons.length,
        expectedCount: WORLD_SCENE_EXPECTED_LOCKED_ZONE_ICON_COUNT,
        textureKeys: renderedLockedZoneIcons.map((icon) => icon.texture.key),
        displaySizes: renderedLockedZoneIcons.map((icon) => ({
          name: icon.name,
          width: icon.displayWidth,
          height: icon.displayHeight,
        })),
        missingLockedZoneIconTextureKeys,
      },
      selectedZonePanelIcon: {
        zoneId: this.selectedZone?.id ?? null,
        key: selectedZonePanelIconResource?.key ?? null,
        path: selectedZonePanelIconResource?.path ?? null,
        renderedCount: renderedSelectedZonePanelIcons.length,
        expectedCount: this.selectedZone ? WORLD_SCENE_EXPECTED_SELECTED_ZONE_PANEL_ICON_COUNT : 0,
        textureKeys: renderedSelectedZonePanelIcons.map((icon) => icon.texture.key),
        displaySizes: renderedSelectedZonePanelIcons.map((icon) => ({
          name: icon.name,
          width: icon.displayWidth,
          height: icon.displayHeight,
        })),
        missingSelectedZonePanelIconTextureKeys,
      },
      playerMarkerAvatar: {
        classId: this.sceneData.characterClass ?? 'ether_knight',
        key: playerMarkerAvatarResource.key,
        path: playerMarkerAvatarResource.path,
        renderedCount: renderedPlayerMarkerAvatar ? 1 : 0,
        expectedCount: WORLD_SCENE_EXPECTED_PLAYER_MARKER_AVATAR_COUNT,
        textureKey: renderedPlayerMarkerAvatar?.texture.key ?? null,
        displayWidth: renderedPlayerMarkerAvatar?.displayWidth ?? 0,
        displayHeight: renderedPlayerMarkerAvatar?.displayHeight ?? 0,
        missingPlayerMarkerAvatarTextureKeys,
      },
      missingFrameKeys: [
        ...(this.worldBackgroundImage ? [] : [background.farKey]),
        ...missingTitleIconTextureKeys,
        ...(hasExpectedActionButtonFrames ? [] : [WORLD_UI_FRAME_TEXTURES.actionButton.key]),
        ...(hasExpectedActionButtonIcons ? [] : missingIconTextureKeys),
        ...missingLockedZoneIconTextureKeys,
        ...missingSelectedZonePanelIconTextureKeys,
        ...missingPlayerMarkerAvatarTextureKeys,
        ...missingEncounterAmbientIconTextureKeys,
        ...missingEncounterBossIconTextureKeys,
      ],
      visibleCanvasCount: document.querySelectorAll('canvas').length,
    });
  }

  private _isWorldFrameQaRoute(): boolean {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('worldFrameQa') === '1';
  }

  private startLobbyScene(): void {
    this.scene.start('LobbyScene', {
      ...this.sceneData,
      eraId: this.currentEraId,
    });
  }

  private _createChronoControls(width: number): void {
    this._addWorldActionButton(
      width / 2 - 185,
      70,
      76,
      28,
      '[Q] ◀',
      '#88ccff',
      () => this._setChronoEra(cycleChronoEra(this.currentEraId, -1)),
      {
        name: 'world_era_prev_action_button',
        fontSize: '13px',
        iconId: WORLD_ACTION_BUTTON_ICON_IDS.eraPrev,
        iconXOffset: -22,
        iconTextOffsetX: 12,
        iconLabel: '[Q]',
      },
    );

    this.eraLabelText = this.add.text(width / 2, 60, '', {
      fontSize: '17px',
      fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
      color: '#c8a2ff',
      align: 'center',
    }).setOrigin(0.5);

    this.eraHintText = this.add.text(width / 2, 84, '', {
      fontSize: '11px',
      fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
      color: '#9fb0d0',
      align: 'center',
    }).setOrigin(0.5);

    this._addWorldActionButton(
      width / 2 + 185,
      70,
      76,
      28,
      '▶ [E]',
      '#88ccff',
      () => this._setChronoEra(cycleChronoEra(this.currentEraId, 1)),
      {
        name: 'world_era_next_action_button',
        fontSize: '13px',
        iconId: WORLD_ACTION_BUTTON_ICON_IDS.eraNext,
        iconXOffset: -22,
        iconTextOffsetX: 12,
        iconLabel: '[E]',
      },
    );

    this._refreshChronoControls();
  }

  private _addWorldActionButton(
    x: number,
    y: number,
    width: number,
    height: number,
    label: string,
    color: string,
    onClick: () => void,
    options: WorldActionButtonOptions,
  ): Phaser.GameObjects.Text {
    const actionTexture = WORLD_UI_FRAME_TEXTURES.actionButton;
    const target = options.container;
    let frame: Phaser.GameObjects.Image | null = null;
    if (this.textures.exists(actionTexture.key)) {
      frame = this.add.image(x, y, actionTexture.key)
        .setName(`${options.name}_frame`)
        .setDisplaySize(width, height)
        .setAlpha(0.86)
        .setInteractive({ useHandCursor: true });
      frame.on('pointerdown', onClick);
      frame.on('pointerover', () => frame?.setTint(0xc8e5ff));
      frame.on('pointerout', () => frame?.clearTint());
      this.worldActionButtonFrames.push(frame);
      if (target) {
        target.add(frame);
      }
    }

    const icon = options.iconId
      ? this._addWorldActionButtonIcon(x, y, options.iconId, {
          container: target,
          name: options.name,
          xOffset: options.iconXOffset ?? -Math.max(18, width / 2 - 20),
        })
      : null;
    const textX = icon ? x + (options.iconTextOffsetX ?? 10) : x;
    const textLabel = icon ? (options.iconLabel ?? label) : label;

    const text = this.add.text(textX, y, textLabel, {
      fontSize: options.fontSize ?? '14px',
      color,
      fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
      stroke: '#060814',
      strokeThickness: frame ? 2 : 0,
      ...(frame ? {} : {
        backgroundColor: '#1a1a2e',
        padding: { x: 8, y: 4 },
      }),
    }).setName(options.name).setOrigin(0.5).setInteractive({ useHandCursor: true });
    text.on('pointerdown', onClick);
    text.on('pointerover', () => {
      text.setColor('#ffffff');
      frame?.setTint(0xc8e5ff);
    });
    text.on('pointerout', () => {
      text.setColor(color);
      frame?.clearTint();
    });

    if (target) {
      target.add(text);
    }
    return text;
  }

  private _addWorldActionButtonIcon(
    x: number,
    y: number,
    iconId: string,
    options: {
      container?: Phaser.GameObjects.Container;
      name: string;
      xOffset: number;
    },
  ): Phaser.GameObjects.Image | null {
    const iconResource = getSpriteResourceForSkillIcon(iconId);
    if (!iconResource || !this.textures.exists(iconResource.key)) {
      return null;
    }

    const icon = this.add.image(x + options.xOffset, y, iconResource.key)
      .setName(`${options.name}_icon`)
      .setOrigin(0.5);
    icon.setDisplaySize(18, 18);
    icon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.worldActionButtonIcons.push(icon);

    if (options.container) {
      options.container.add(icon);
    }
    return icon;
  }

  private _setChronoEra(nextEraId: ChronoEraId): void {
    this.currentEraId = nextEraId;
    this.sceneData = { ...this.sceneData, eraId: nextEraId };
    saveLastEra(nextEraId);
    this._refreshChronoControls();
    if (this.selectedZone) {
      this._onZoneClick(this.selectedZone);
    }
  }

  private _refreshChronoControls(): void {
    const era = CHRONO_ERAS.find((e) => e.id === this.currentEraId) ?? CHRONO_ERAS[1];
    this.eraLabelText?.setText(`${era.label}  ${era.yearLabel}`).setColor(`#${era.tintColor.toString(16).padStart(6, '0')}`);
    this.eraHintText?.setText(era.ambientLine);
  }

  shutdown(): void {
    // FINDING-A4 ext3: scene 종료 시 keyboard listener 정리
    this._zoneKeyboardCleanup?.();
    this._zoneKeyboardCleanup = null;
    if (this.highlightRing) { this.highlightRing.destroy(); this.highlightRing = null; }
  }

  // FINDING-A4 ext3: 키보드 highlight ring (Phaser Arc) — zone 노드 위에 visual indicator
  private _highlightZone(navigableIdx: number): void {
    if (this.navigableZoneIndices[navigableIdx] === undefined) return;
    this.zoneIndex = navigableIdx;
    const zoneIdx = this.navigableZoneIndices[navigableIdx];
    const zone = WORLD_ZONES[zoneIdx];
    if (!zone) return;
    const { width, height } = this.cameras.main;
    const x = zone.posRatioX * width;
    const y = zone.posRatioY * height;
    if (!this.highlightRing) {
      this.highlightRing = this.add.circle(x, y, NODE_RADIUS + 12)
        .setStrokeStyle(3, 0xc8a2ff)
        .setFillStyle(0x000000, 0)
        .setDepth(50);
    } else {
      this.highlightRing.setPosition(x, y);
    }
  }

  // ── 연결선 ───────────────────────────────────────────────

  private _drawConnectionLines(w: number, h: number): void {
    this.travelLine.lineStyle(1, 0x334455, 0.5);

    // 순차 연결 (0→1→2→3→4→5)
    for (let i = 0; i < WORLD_ZONES.length - 1; i++) {
      const a = WORLD_ZONES[i];
      const b = WORLD_ZONES[i + 1];
      this.travelLine.lineBetween(
        a.posRatioX * w, a.posRatioY * h,
        b.posRatioX * w, b.posRatioY * h,
      );
    }
  }

  private _addWorldPlayerMarker(
    x: number,
    y: number,
  ): Phaser.GameObjects.Image | Phaser.GameObjects.Arc {
    const playerMarkerAvatarResource = getWorldPlayerMarkerAvatarResource(this.sceneData.characterClass);
    if (this.textures.exists(playerMarkerAvatarResource.key)) {
      const marker = this.add.image(x, y, playerMarkerAvatarResource.key)
        .setName('world_player_marker_avatar')
        .setOrigin(0.5, 0.72)
        .setAlpha(0.96)
        .setDepth(35);
      marker.setDisplaySize(24, 36);
      marker.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
      this.worldPlayerMarkerAvatar = marker;
      return marker;
    }

    // Aseprite character battle thumbnail 로드 실패 시에만 사용하는 안전 fallback.
    this.worldPlayerMarkerAvatar = null;
    return this.add.circle(x, y, 8, 0xffffff, 0.9)
      .setName('world_player_marker_fallback')
      .setDepth(35);
  }

  // ── 지역 노드 ────────────────────────────────────────────

  private _createZoneNode(zone: WorldZone, w: number, h: number): Phaser.GameObjects.Container {
    const x = zone.posRatioX * w;
    const y = zone.posRatioY * h;

    const container = this.add.container(x, y);

    // 존 아이콘: 이미지 또는 색상 원 폴백
    const alpha = zone.unlocked ? 1 : 0.4;
    const iconKey = getSpriteResourceForWorldZoneIcon(zone.id)?.key ?? WorldScene.ZONE_ICON_MAP[zone.id];
    let nodeVisual: Phaser.GameObjects.Image | Phaser.GameObjects.Arc;
    if (iconKey && this.textures.exists(iconKey)) {
      nodeVisual = this.add.image(0, 0, iconKey)
        .setAlpha(alpha);
      // 원형 테두리
      this.add.circle(0, 0, 33)
        .setStrokeStyle(2, zone.unlocked ? 0xffffff : 0x444444)
        .setFillStyle(0x000000, 0);
    } else {
      nodeVisual = this.add.circle(0, 0, NODE_RADIUS, zone.color, alpha)
        .setStrokeStyle(2, zone.unlocked ? 0xffffff : 0x444444);
    }

    if (zone.unlocked) {
      nodeVisual.setInteractive({ useHandCursor: true });
      const baseScaleX = nodeVisual.scaleX;
      const baseScaleY = nodeVisual.scaleY;
      nodeVisual.on('pointerdown', () => this._onZoneClick(zone));
      nodeVisual.on('pointerover', () => nodeVisual.setScale(baseScaleX * 1.15, baseScaleY * 1.15));
      nodeVisual.on('pointerout', () => nodeVisual.setScale(baseScaleX, baseScaleY));
    }

    // 이름 라벨
    const label = this.add.text(0, NODE_RADIUS + 10, zone.name, {
      fontSize: '12px',
      fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
      color: zone.unlocked ? '#ffffff' : '#666666',
    }).setOrigin(0.5);

    container.add([nodeVisual, label]);

    // 잠금 아이콘
    if (!zone.unlocked) {
      const lockIcon = this._addWorldLockedZoneIcon(container, zone.id);
      if (!lockIcon) {
        const lock = this.add.text(0, 0, '🔒', {
          fontSize: '16px',
        })
          .setName(`world_locked_zone_icon_fallback_${zone.id}`)
          .setOrigin(0.5);
        container.add(lock);
      }
    }

    return container;
  }

  private _addWorldLockedZoneIcon(
    container: Phaser.GameObjects.Container,
    zoneId: string,
  ): Phaser.GameObjects.Image | null {
    const lockIconResource = getStatusIconResource(WORLD_LOCKED_ZONE_STATUS_ICON_ID);
    if (!lockIconResource || !this.textures.exists(lockIconResource.key)) {
      return null;
    }

    const lockIcon = this.add.image(0, 0, lockIconResource.key)
      .setName(`world_locked_zone_icon_${zoneId}`)
      .setOrigin(0.5)
      .setAlpha(0.94);
    lockIcon.setDisplaySize(22, 22);
    lockIcon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.worldLockedZoneIcons.push(lockIcon);
    container.add(lockIcon);
    return lockIcon;
  }

  private _addWorldSelectedZonePanelIcon(
    panel: Phaser.GameObjects.Container,
    zone: WorldZone,
  ): Phaser.GameObjects.Image | null {
    const selectedZoneIconResource = getSpriteResourceForWorldZoneIcon(zone.id);
    if (!selectedZoneIconResource || !this.textures.exists(selectedZoneIconResource.key)) {
      return null;
    }

    const selectedZoneIcon = this.add.image(-190, -26, selectedZoneIconResource.key)
      .setName(`world_selected_zone_panel_icon_${zone.id}`)
      .setOrigin(0.5)
      .setAlpha(0.94);
    selectedZoneIcon.setDisplaySize(30, 30);
    selectedZoneIcon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.worldSelectedZonePanelIcons.push(selectedZoneIcon);
    panel.add(selectedZoneIcon);
    return selectedZoneIcon;
  }

  private _resetWorldEncounterLineState(): void {
    this.worldEncounterAmbientIcons = [];
    this.worldEncounterBossIcons = [];
    this.worldEncounterLineText = null;
    this.worldEncounterAmbientIconExpectedCount = 0;
    this.worldEncounterBossIconExpectedCount = 0;
    this.worldEncounterAmbientIconFallbackRendered = false;
    this.worldEncounterBossIconFallbackRendered = false;
  }

  private _setWorldEncounterLine(
    panel: Phaser.GameObjects.Container,
    encounterLine: Phaser.GameObjects.Text,
    text: string,
    hasBossSlot: boolean,
  ): void {
    this.worldEncounterLineText = encounterLine;
    this.worldEncounterAmbientIconExpectedCount = WORLD_SCENE_EXPECTED_ENCOUNTER_AMBIENT_ICON_COUNT;
    this.worldEncounterBossIconExpectedCount = hasBossSlot ? WORLD_SCENE_EXPECTED_ENCOUNTER_BOSS_ICON_COUNT : 0;

    const ambientIcon = this._addWorldEncounterAmbientIcon(panel, -170, 22);
    if (!ambientIcon) {
      this.worldEncounterAmbientIconFallbackRendered = true;
    }

    const bossIcon = hasBossSlot ? this._addWorldEncounterBossIcon(panel, 216, 22) : null;
    if (hasBossSlot && !bossIcon) {
      this.worldEncounterBossIconFallbackRendered = true;
    }

    const prefix = ambientIcon ? '' : '🛡 ';
    const bossSuffix = hasBossSlot ? `${bossIcon ? ' ' : ' ⚔️ '}보스 등장 가능` : '';
    encounterLine.setX(ambientIcon ? -144 : -152);
    encounterLine.setWordWrapWidth(ambientIcon ? 364 : 390);
    encounterLine.setText(`${prefix}${text}${bossSuffix}`);
  }

  private _addWorldEncounterAmbientIcon(
    panel: Phaser.GameObjects.Container,
    x: number,
    y: number,
  ): Phaser.GameObjects.Image | null {
    const encounterAmbientIconResource = getStatusIconResource(WORLD_ENCOUNTER_AMBIENT_ICON_ID);
    if (!encounterAmbientIconResource || !this.textures.exists(encounterAmbientIconResource.key)) {
      return null;
    }

    const ambientIcon = this.add.image(x, y, encounterAmbientIconResource.key)
      .setName('world_encounter_ambient_icon')
      .setOrigin(0.5);
    ambientIcon.setDisplaySize(16, 16);
    ambientIcon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.worldEncounterAmbientIcons.push(ambientIcon);
    panel.add(ambientIcon);
    return ambientIcon;
  }

  private _addWorldEncounterBossIcon(
    panel: Phaser.GameObjects.Container,
    x: number,
    y: number,
  ): Phaser.GameObjects.Image | null {
    const encounterBossIconResource = getSpriteResourceForSkillIcon(WORLD_ENCOUNTER_BOSS_ICON_ID);
    if (!encounterBossIconResource || !this.textures.exists(encounterBossIconResource.key)) {
      return null;
    }

    const bossIcon = this.add.image(x, y, encounterBossIconResource.key)
      .setName('world_encounter_boss_icon')
      .setOrigin(0.5);
    bossIcon.setDisplaySize(16, 16);
    bossIcon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.worldEncounterBossIcons.push(bossIcon);
    panel.add(bossIcon);
    return bossIcon;
  }

  // ── 존 클릭 ──────────────────────────────────────────────

  private _onZoneClick(zone: WorldZone): void {
    this.selectedZone = zone;
    this._resetWorldEncounterLineState();
    // 정보 패널 표시
    if (this.infoPanel) {
      this.infoPanel.destroy();
      this.worldSelectedZonePanelIcons = this.worldSelectedZonePanelIcons.filter(icon => icon.active);
    }

    const { width, height } = this.cameras.main;
    const projection = projectZoneToEra(zone.id, this.currentEraId);
    const background = resolveZoneBackground(zone.id, this.currentEraId);
    const panel = this.add.container(width / 2, height - 112);

    const infoPanelFrame = WORLD_UI_FRAME_TEXTURES.infoPanel;
    if (this.textures.exists(infoPanelFrame.key)) {
      const bg = this.add.image(0, 0, infoPanelFrame.key)
        .setDisplaySize(760, 124)
        .setAlpha(0.9);
      panel.add(bg);
      panel.add(this.add.rectangle(0, 0, 760, 124, 0x000000, 0)
        .setStrokeStyle(1, 0x446688));
    } else {
      // Aseprite world UI frame 로드 실패 시에만 사용하는 안전 fallback.
      const bg = this.add.rectangle(0, 0, 760, 124, 0x000000, 0.86)
        .setStrokeStyle(1, 0x446688);
      panel.add(bg);
    }

    const previewPanelFrame = WORLD_UI_FRAME_TEXTURES.previewFrame;
    if (this.textures.exists(previewPanelFrame.key)) {
      const previewFrame = this.add.image(-290, -4, previewPanelFrame.key)
        .setDisplaySize(156, 88)
        .setAlpha(0.92);
      panel.add(previewFrame);
      panel.add(this.add.rectangle(-290, -4, 156, 88, 0x000000, 0)
        .setStrokeStyle(1, projection.tintColor, 0.9));
    } else {
      // Aseprite world preview frame 로드 실패 시에만 사용하는 안전 fallback.
      const previewFrame = this.add.rectangle(-290, -4, 156, 88, 0x111827, 1)
        .setStrokeStyle(1, projection.tintColor, 0.9);
      panel.add(previewFrame);
    }

    if (this.textures.exists(background.farKey)) {
      const preview = this.add.image(-290, -4, background.farKey)
        .setDisplaySize(150, 84)
        .setAlpha(0.92);
      panel.add(preview);
    }

    // 존 색상 아이콘은 Aseprite 존 아이콘을 불러오지 못한 경우에만 fallback으로 사용한다.
    const selectedZoneIcon = this._addWorldSelectedZonePanelIcon(panel, zone);
    if (!selectedZoneIcon) {
      const dot = this.add.circle(-190, -26, 15, projection.tintColor)
        .setName(`world_selected_zone_panel_icon_fallback_${zone.id}`);
      panel.add(dot);
    }

    const info = this.add.text(-152, -46, `${projection.displayName} — ${zone.description}`, {
      fontSize: '13px',
      color: '#cccccc',
      fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
      wordWrap: { width: 390 },
    });
    panel.add(info);

    const eraInfo = this.add.text(-152, -10, `${projection.ambientLine} / 레벨 보정 ${projection.monsterLevelOffset >= 0 ? '+' : ''}${projection.monsterLevelOffset}`, {
      fontSize: '11px',
      color: '#9fb0d0',
      fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
      wordWrap: { width: 390 },
    });
    panel.add(eraInfo);

    // CHRONO-S108: 시대별 필드 encounter 정보 추가 (server fetch — async, fire-and-forget)
    const encounterLine = this.add.text(-152, 22, '필드 정보 로딩…', {
      fontSize: '11px',
      color: '#ffd54a',
      fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
      wordWrap: { width: 390 },
    }).setName('zoneEncounterLine');
    panel.add(encounterLine);

    if (this._isWorldFrameQaRoute()) {
      this._setWorldEncounterLine(panel, encounterLine, '월드맵 버튼 프레임 QA — 서버 encounter 요청 생략', true);
    } else {
      void networkManager.fetchZoneEncounter(zone.id, this.currentEraId).then((resp) => {
        if (!panel.active || !encounterLine.active) {
          return;
        }
        if (!resp.ok || !resp.encounter) {
          encounterLine.setText('필드 데이터 미정의');
          return;
        }
        const enc = resp.encounter;
        const monsters = enc.monsterPool.map((s) => s.name).join(', ');
        this._setWorldEncounterLine(panel, encounterLine, `${enc.ambientLine} — ${monsters} (최대 ${enc.maxSpawn}체)`, enc.hasBossSlot);
      }).catch(() => encounterLine.setText('필드 데이터 미정의'));
    }

    // ▶ + (Enter) 힌트: 패널이 열린 상태에서 한 번 더 ENTER 누르면 이동한다는 키보드 단서.
    this._addWorldActionButton(
      288,
      30,
      194,
      32,
      '▶ [ 시간 이동 ] (Enter)',
      '#88ff88',
      () => this._travelToZone(zone),
      {
        container: panel,
        name: 'world_travel_action_button',
        fontSize: '14px',
        iconId: WORLD_ACTION_BUTTON_ICON_IDS.travel,
        iconXOffset: -76,
        iconTextOffsetX: 12,
        iconLabel: '시간 이동 (Enter)',
      },
    );

    this.infoPanel = panel;
  }

  // ── 이동 애니메이션 ──────────────────────────────────────

  private _travelToZone(zone: WorldZone): void {
    const { width, height } = this.cameras.main;
    const targetX = zone.posRatioX * width;
    const targetY = zone.posRatioY * height;

    // 마커 이동 애니메이션
    this.tweens.add({
      targets: this.playerMarker,
      x: targetX,
      y: targetY,
      duration: 600,
      ease: 'Power2',
      onComplete: () => {
        this.currentZoneId = zone.id;
        const projection = projectZoneToEra(zone.id, this.currentEraId);

        // P25-06: 소켓이 준비된 실제 온라인 상태에서만 텔레포트 브로드캐스트를 보낸다.
        if (networkManager.isConnected) {
          networkManager.emit('world:teleport', {
            characterId: networkManager.socketId ?? '',
            zoneId: zone.id,
            eraId: this.currentEraId,
          });
        }

        // 페이드 아웃 후 씬 전환
        this.cameras.main.fadeOut(300, 0, 0, 0);
        this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
          this.scene.start('GameScene', {
            ...this.sceneData,
            zoneId: zone.id,
            zoneName: projection.displayName,
            eraId: this.currentEraId,
            characterClass: this.sceneData.characterClass,
          });
        });
      },
    });

    // 정보 패널 닫기
    if (this.infoPanel) {
      this.infoPanel.destroy();
      this.infoPanel = null;
    }
  }

  // ── 마커 펄스 ────────────────────────────────────────────

  private _pulseMarker(): void {
    this.tweens.add({
      targets: this.playerMarker,
      scaleX: 1.3,
      scaleY: 1.3,
      alpha: 0.6,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }
}
