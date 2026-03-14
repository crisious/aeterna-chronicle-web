/**
 * AssetManager.ts — 에셋 로딩/캐싱 통합 관리 (P25-09~14)
 *
 * - 에셋 경로 매핑 (아틀라스, 오디오, UI, VFX, 캐릭터, 몬스터)
 * - Phaser preload 헬퍼
 * - 로딩 진행률 콜백
 * - 누락 에셋 → placeholder 표시 (에러 방지)
 * - 씬별 에셋 캐싱 정책
 */

import * as Phaser from 'phaser';

// ── 에셋 경로 상수 ──────────────────────────────────────────

const ASSET_BASE = 'assets';
const GENERATED = `${ASSET_BASE}/generated`;

export const ASSET_PATHS = {
  // 아틀라스 (P25-09)
  atlas: {
    characters: { png: `${ASSET_BASE}/atlas/characters.png`, json: `${ASSET_BASE}/atlas/characters.json` },
    effects: { png: `${ASSET_BASE}/atlas/effects.png`, json: `${ASSET_BASE}/atlas/effects.json` },
    ui: { png: `${ASSET_BASE}/atlas/ui.png`, json: `${ASSET_BASE}/atlas/ui.json` },
  },

  // 오디오 (P25-10)
  bgm: {
    exploration: [
      'aether_plains', 'memory_forest', 'shadow_gorge', 'crystal_cave',
      'forgotten_citadel', 'chrono_spire', 'sylvanheim', 'solaris_desert',
      'argentium', 'northern_permafrost',
    ].map(z => ({ key: `bgm_${z}`, path: `${GENERATED}/audio/bgm/exploration/${z}.ogg` })),
    combat: [
      'normal_battle', 'boss_battle', 'pvp_battle', 'raid_battle',
    ].map(z => ({ key: `bgm_${z}`, path: `${GENERATED}/audio/bgm/combat/${z}.ogg` })),
    dungeon: [
      'dungeon_normal', 'dungeon_boss', 'dungeon_secret',
    ].map(z => ({ key: `bgm_${z}`, path: `${GENERATED}/audio/bgm/dungeon/${z}.ogg` })),
    system: [
      'title', 'lobby', 'character_select', 'loading',
    ].map(z => ({ key: `bgm_${z}`, path: `${GENERATED}/audio/bgm/system/${z}.ogg` })),
    ending: [
      'ending_a', 'ending_b', 'ending_c',
    ].map(z => ({ key: `bgm_${z}`, path: `${GENERATED}/audio/bgm/ending/${z}.ogg` })),
  },
  sfx: {
    combat: [
      'slash', 'magic_cast', 'heal', 'block', 'critical', 'dodge',
      'skill_generic', 'battle_start', 'battle_victory', 'battle_defeat',
    ].map(z => ({ key: `sfx_${z}`, path: `${GENERATED}/audio/sfx/combat/${z}.ogg` })),
    ui: [
      'click', 'hover', 'confirm', 'cancel', 'item_pickup', 'quest_complete',
      'gold_gain', 'notification', 'level_up', 'equip',
    ].map(z => ({ key: `sfx_${z}`, path: `${GENERATED}/audio/sfx/ui/${z}.ogg` })),
    ambient: [
      'wind', 'forest', 'cave', 'town', 'rain',
    ].map(z => ({ key: `sfx_${z}`, path: `${GENERATED}/audio/sfx/ambient/${z}.ogg` })),
  },

  // 캐릭터 스프라이트 (P25-11)
  characters: {
    classes: [
      'ether_knight', 'memory_weaver', 'shadow_weaver',
      'memory_breaker', 'time_guardian', 'void_wanderer',
    ].map(c => ({ key: `char_${c}`, path: `${GENERATED}/characters/class_main/${c}.png` })),
  },

  // 몬스터 (P25-11)
  monsters: {
    normal: `${GENERATED}/monsters/normal`,
    eliteBoss: `${GENERATED}/monsters/elite_boss`,
    raidBoss: `${GENERATED}/monsters/raid_boss`,
  },

  // UI 아이콘 (P25-11)
  ui: {
    icons: {
      skills: `${GENERATED}/ui/icons/skills`,
      items: `${GENERATED}/ui/icons/items`,
      status: `${GENERATED}/ui/icons/status`,
    },
    frames: `${GENERATED}/ui/frames`,
  },

  // VFX (P25-11)
  vfx: {
    common: `${GENERATED}/vfx/common`,
    skills: `${GENERATED}/vfx/skills`,
  },

  // 환경 (P25-09)
  environment: {
    backgrounds: `${GENERATED}/environment/backgrounds`,
    tiles: `${GENERATED}/environment/tiles`,
  },
} as const;

// ── 존별 BGM 매핑 (P25-10) ─────────────────────────────────

export const ZONE_BGM_MAP: Record<string, string> = {
  aether_plains: 'bgm_aether_plains',
  memory_forest: 'bgm_memory_forest',
  shadow_gorge: 'bgm_shadow_gorge',
  crystal_cave: 'bgm_crystal_cave',
  forgotten_citadel: 'bgm_forgotten_citadel',
  chrono_spire: 'bgm_chrono_spire',
};

// ── 로딩 팁 (P25-12) ───────────────────────────────────────

export const LOADING_TIPS: string[] = [
  '에테르 결정에 기억을 주입하면 강력한 스킬을 해금할 수 있습니다.',
  '전투 중 Space를 누르면 Active Pause로 전술적 판단이 가능합니다.',
  'TAB 키로 다음 타겟을 순환할 수 있습니다.',
  '그림자 직조사는 적의 디버프 저항을 무시하는 궁극기를 가집니다.',
  '던전 보스는 일정 HP 이하에서 분노 패턴을 시작합니다.',
  '에테르 기사의 방어 자세는 3초간 받는 피해를 50% 감소시킵니다.',
  '기억술사의 기억 파편은 전투 중 자동으로 수집됩니다.',
  '장로 마테우스에게 이야기를 들으면 숨겨진 퀘스트가 해금됩니다.',
  '공허 방랑자는 차원 이동으로 적의 후방을 기습할 수 있습니다.',
  '시간 수호자의 시간 역행은 아군의 HP를 3초 전으로 되돌립니다.',
  '월드맵에서 잠긴 지역은 메인 퀘스트를 진행하면 해금됩니다.',
  '에테르 소켓에 같은 속성의 결정을 3개 장착하면 세트 효과가 발동합니다.',
];

// ── AssetManager 클래스 ─────────────────────────────────────

export class AssetManager {
  private scene: Phaser.Scene;
  private loadedKeys: Set<string> = new Set();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * P25-09: 핵심 아틀라스 preload
   */
  preloadAtlases(): void {
    const { atlas } = ASSET_PATHS;
    this._loadAtlas('characters', atlas.characters.png, atlas.characters.json);
    this._loadAtlas('effects', atlas.effects.png, atlas.effects.json);
    this._loadAtlas('ui', atlas.ui.png, atlas.ui.json);
  }

  /**
   * P25-10: 오디오 에셋 preload (존별 선택적)
   */
  preloadAudio(zoneId?: string): void {
    // 시스템 BGM은 항상 로드
    for (const entry of ASSET_PATHS.bgm.system) {
      this._loadAudio(entry.key, entry.path);
    }

    // 전투 BGM
    for (const entry of ASSET_PATHS.bgm.combat) {
      this._loadAudio(entry.key, entry.path);
    }

    // 존별 BGM (해당 존만)
    if (zoneId) {
      const bgmKey = ZONE_BGM_MAP[zoneId];
      if (bgmKey) {
        const entry = ASSET_PATHS.bgm.exploration.find(e => e.key === bgmKey);
        if (entry) this._loadAudio(entry.key, entry.path);
      }
    } else {
      for (const entry of ASSET_PATHS.bgm.exploration) {
        this._loadAudio(entry.key, entry.path);
      }
    }

    // SFX
    for (const category of Object.values(ASSET_PATHS.sfx)) {
      for (const entry of category) {
        this._loadAudio(entry.key, entry.path);
      }
    }
  }

  /**
   * P25-11: 캐릭터 스프라이트 preload
   */
  preloadCharacters(): void {
    for (const entry of ASSET_PATHS.characters.classes) {
      this._loadImage(entry.key, entry.path);
    }
  }

  /**
   * P25-14: placeholder 텍스처 생성 (누락 에셋 대체)
   */
  createPlaceholders(): void {
    const gfx = this.scene.add.graphics();

    // 기본 placeholder (마젠타 사각형)
    gfx.fillStyle(0xff00ff, 0.5);
    gfx.fillRect(0, 0, 64, 64);
    gfx.lineStyle(2, 0xff00ff, 1);
    gfx.strokeRect(0, 0, 64, 64);
    gfx.lineBetween(0, 0, 64, 64);
    gfx.lineBetween(64, 0, 0, 64);
    gfx.generateTexture('placeholder', 64, 64);

    // 작은 placeholder
    gfx.clear();
    gfx.fillStyle(0xff00ff, 0.3);
    gfx.fillRect(0, 0, 32, 32);
    gfx.generateTexture('placeholder_sm', 32, 32);

    gfx.destroy();
  }

  /**
   * P25-12: 로딩 진행률 콜백 설정
   */
  setupLoadingProgress(onProgress: (value: number) => void, onComplete: () => void): void {
    this.scene.load.on('progress', (value: number) => {
      onProgress(value);
    });

    this.scene.load.on('complete', () => {
      onComplete();
    });

    // P25-14: 에러 핸들링 — 누락 에셋 시 placeholder 사용
    this.scene.load.on('loaderror', (file: Phaser.Loader.File) => {
      console.warn(`[AssetManager] 에셋 로드 실패 (placeholder 사용): ${file.key} — ${file.url}`);
    });
  }

  /**
   * P25-13: 씬 전환 시 에셋 캐싱 정책
   * - core: 아틀라스, UI, 시스템 사운드 → 유지
   * - zone: 존별 BGM, 배경 → 해제
   */
  cleanupZoneAssets(zoneId: string): void {
    const bgmKey = ZONE_BGM_MAP[zoneId];
    if (bgmKey && this.scene.cache.audio.has(bgmKey)) {
      this.scene.cache.audio.remove(bgmKey);
      this.loadedKeys.delete(bgmKey);
    }
  }

  /**
   * 랜덤 로딩 팁 반환 (P25-12)
   */
  static getRandomTip(): string {
    return LOADING_TIPS[Math.floor(Math.random() * LOADING_TIPS.length)];
  }

  // ── 내부 헬퍼 ───────────────────────────────────────────

  private _loadAtlas(key: string, png: string, json: string): void {
    if (this.loadedKeys.has(key)) return;
    this.scene.load.atlas(key, png, json);
    this.loadedKeys.add(key);
  }

  private _loadAudio(key: string, path: string): void {
    if (this.loadedKeys.has(key)) return;
    this.scene.load.audio(key, path);
    this.loadedKeys.add(key);
  }

  private _loadImage(key: string, path: string): void {
    if (this.loadedKeys.has(key)) return;
    this.scene.load.image(key, path);
    this.loadedKeys.add(key);
  }
}
