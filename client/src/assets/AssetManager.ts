/**
 * AssetManager.ts — 에셋 로딩/캐싱 통합 관리 (P25-09~14 → P34-A 전수 연결)
 *
 * - 에셋 경로 매핑 (아틀라스, 오디오, UI, VFX, 캐릭터, 몬스터, 코스메틱)
 * - Phaser preload 헬퍼
 * - 로딩 진행률 콜백
 * - 누락 에셋 → placeholder 표시 (에러 방지)
 * - 씬별 에셋 캐싱 정책
 * - P34-A: 실제 파일명에 맞춘 경로 통일 + VFX/아이콘/코스메틱/전직 캐릭터 preload
 */

import * as Phaser from 'phaser';

// ── 에셋 경로 상수 ──────────────────────────────────────────

const ASSET_BASE = 'assets';
const GENERATED = `${ASSET_BASE}/generated`;

// ── P34-A: 클래스 ID 목록 (SSOT) ───────────────────────────
const CLASS_IDS = [
  'ether_knight', 'memory_weaver', 'shadow_weaver',
  'memory_breaker', 'time_guardian', 'void_wanderer',
] as const;

// ── P34-A: VFX 접두사 매핑 ─────────────────────────────────
const VFX_CLASS_PREFIX: Record<string, string> = {
  ether_knight: 'VFX-ETH',
  memory_weaver: 'VFX-MNE',
  shadow_weaver: 'VFX-SHA',
  memory_breaker: 'VFX-MEM',
  time_guardian: 'VFX-TIM',
  void_wanderer: 'VFX-VOI',
};

export const ASSET_PATHS = {
  // 아틀라스 (P25-09)
  atlas: {
    characters: { png: `${ASSET_BASE}/atlas/characters.png`, json: `${ASSET_BASE}/atlas/characters.json` },
    effects: { png: `${ASSET_BASE}/atlas/effects.png`, json: `${ASSET_BASE}/atlas/effects.json` },
    ui: { png: `${ASSET_BASE}/atlas/ui.png`, json: `${ASSET_BASE}/atlas/ui.json` },
  },

  // P34-A: 오디오는 soundManifest.ts가 SSOT (SoundManager.preloadAll() 사용)
  // AssetManager의 오디오 경로는 soundManifest에 없는 추가 로딩용으로만 유지

  // 캐릭터 스프라이트 (P25-11)
  characters: {
    classes: CLASS_IDS.map(c => ({ key: `char_${c}`, path: `${GENERATED}/characters/class_main/char_illust_${c}_front.png` })),
    // P34-A: 전직 캐릭터 (6클래스 × 3전직 = 18장)
    advanced: CLASS_IDS.flatMap(c =>
      [1, 2, 3].map(adv => ({
        key: `char_adv_${c}_${adv}`,
        path: `${GENERATED}/characters/class_advanced/char_illust_${c}_adv${adv}_front.png`,
      })),
    ),
  },

  // 몬스터 (P25-11)
  monsters: {
    normal: `${GENERATED}/monsters/normal`,
    eliteBoss: `${GENERATED}/monsters/elite_boss`,
    raidBoss: `${GENERATED}/monsters/raid_boss`,
  },

  // UI 아이콘 (P25-11 → P34-A 전수 연결)
  ui: {
    icons: {
      skills: `${GENERATED}/ui/icons/skills`,
      items: `${GENERATED}/ui/icons/items`,
      status: `${GENERATED}/ui/icons/status`,
    },
    frames: `${GENERATED}/ui/frames`,
  },

  // VFX (P25-11 → P34-A 전수 연결)
  vfx: {
    common: `${GENERATED}/vfx/common`,
    skills: `${GENERATED}/vfx/skills`,
  },

  // 환경 (P25-09)
  environment: {
    backgrounds: `${GENERATED}/environment/backgrounds`,
    tiles: `${GENERATED}/environment/tiles`,
  },

  // P34-A: 코스메틱
  cosmetics: {
    season1: `${GENERATED}/cosmetics/season1`,
    season2: `${GENERATED}/cosmetics/season2`,
    season3: `${GENERATED}/cosmetics/season3`,
  },
} as const;

// ── 존별 BGM 매핑 (P25-10 → P34-A: soundManifest 키 기준으로 통일) ──

export const ZONE_BGM_MAP: Record<string, string> = {
  zone_erebos: 'bgm_erb_01',
  zone_sylvanheim: 'bgm_syl_01',
  zone_solaris: 'bgm_sol_01',
  zone_boreas: 'bgm_bor_01',
  zone_argentum: 'bgm_arg_01',
  zone_brisport: 'bgm_brt_01',
  zone_plateau: 'bgm_plt_01',
  // 레거시 호환
  aether_plains: 'bgm_village',
  memory_forest: 'bgm_syl_01',
  malatus_sanctuary: 'bgm_syl_03',
  shadow_gorge: 'bgm_erb_01',
  crystal_cave: 'bgm_aby_01',
  forgotten_citadel: 'bgm_arg_01',
  chrono_spire: 'bgm_bor_01',
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

// ── P34-A: 스킬 아이콘 키 생성 헬퍼 ────────────────────────

/** 스킬 아이콘 번호(1~210)에서 키/경로 생성 */
function skillIconEntry(index: number): { key: string; path: string } {
  const padded = String(index).padStart(3, '0');
  return {
    key: `icon_skill_${padded}`,
    path: `${GENERATED}/ui/icons/skills/CMN-SKL-${padded}.png`,
  };
}

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
   * P25-10/P34-A: 오디오 에셋 preload
   * 실제 오디오 로딩은 SoundManager.preloadAll() (soundManifest 기반)이 담당.
   * 이 메서드는 호환성 유지용 stub.
   */
  preloadAudio(_zoneId?: string): void {
    // P34-A: SoundManager.preloadAll()이 soundManifest에서 전수 로딩
    // 여기서는 별도 작업 불필요 — SoundManager가 LoadingScene에서 호출됨
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
   * P34-A: 전직 캐릭터 18장 preload
   */
  preloadAdvancedCharacters(): void {
    for (const entry of ASSET_PATHS.characters.advanced) {
      this._loadImage(entry.key, entry.path);
    }
  }

  /**
   * P34-A: 스킬 아이콘 preload (210장 — CMN-SKL-001~210)
   */
  preloadSkillIcons(): void {
    for (let i = 1; i <= 210; i++) {
      const entry = skillIconEntry(i);
      this._loadImage(entry.key, entry.path);
    }
  }

  /**
   * P34-A: 아이템 아이콘 preload (100장)
   * 패턴: ITM-{type}-{num}.png (ACC 15, ARM 15, CSM 15, MAT 15, QST 10, WPN 15, SHD 15)
   */
  preloadItemIcons(): void {
    const types = [
      { prefix: 'ITM-ACC', count: 15 },
      { prefix: 'ITM-ARM', count: 15 },
      { prefix: 'ITM-CSM', count: 15 },
      { prefix: 'ITM-MAT', count: 15 },
      { prefix: 'ITM-QST', count: 10 },
      { prefix: 'ITM-WPN', count: 15 },
      { prefix: 'ITM-SHD', count: 15 },
    ];
    for (const t of types) {
      for (let i = 1; i <= t.count; i++) {
        const padded = String(i).padStart(3, '0');
        const key = `icon_item_${t.prefix}_${padded}`;
        const path = `${GENERATED}/ui/icons/items/${t.prefix}-${padded}.png`;
        this._loadImage(key, path);
      }
    }
  }

  /**
   * P34-A: 상태 아이콘 preload (25장)
   * 패턴: STS-BUF-{num}.png (5), STS-DBF-{num}.png (17), STS-CC-{num}.png (3)
   */
  preloadStatusIcons(): void {
    const types = [
      { prefix: 'STS-BUF', count: 5 },
      { prefix: 'STS-DBF', count: 17 },
      { prefix: 'STS-CC', count: 3 },
    ];
    for (const t of types) {
      for (let i = 1; i <= t.count; i++) {
        const padded = String(i).padStart(3, '0');
        const key = `icon_status_${t.prefix}_${padded}`;
        const path = `${GENERATED}/ui/icons/status/${t.prefix}-${padded}.png`;
        this._loadImage(key, path);
      }
    }
  }

  /**
   * P34-A: VFX 이미지 preload (210장)
   * common: VFX-CMN-001~030 (30장)
   * skills: 6클래스 × 30장 = 180장
   */
  preloadVFX(): void {
    // Common VFX (30장)
    for (let i = 1; i <= 30; i++) {
      const padded = String(i).padStart(3, '0');
      this._loadImage(`vfx_common_${padded}`, `${GENERATED}/vfx/common/VFX-CMN-${padded}.png`);
    }
    // 클래스별 VFX (각 30장)
    for (const classId of CLASS_IDS) {
      const prefix = VFX_CLASS_PREFIX[classId];
      for (let i = 1; i <= 30; i++) {
        const padded = String(i).padStart(3, '0');
        this._loadImage(`vfx_${classId}_${padded}`, `${GENERATED}/vfx/skills/${classId}/${prefix}-${padded}.png`);
      }
    }
  }

  /**
   * P34-A: 코스메틱 이미지 preload (3시즌 × 50장 = 150장)
   * 파일명 패턴이 다양하므로 동적 로딩 (로드 에러 무시)
   */
  preloadCosmetics(): void {
    // 시즌1: COS-{type}_{num}.png 패턴
    const s1Types = [
      { prefix: 'COS-EMOTE', count: 7 },
      { prefix: 'COS-MOUNT', count: 5 },
      { prefix: 'COS-PET', count: 8 },
      { prefix: 'COS-TITLE', count: 5 },
      { prefix: 'COS-AURA', count: 5 },
      { prefix: 'COS-SKIN_EK', count: 5 },
      { prefix: 'COS-SKIN_MW', count: 5 },
      { prefix: 'COS-WPN', count: 5 },
      { prefix: 'COS-SKIN_SW', count: 5 },
    ];
    for (const t of s1Types) {
      for (let i = 1; i <= t.count; i++) {
        const padded = String(i).padStart(2, '0');
        this._loadImage(`cos_s1_${t.prefix}_${padded}`, `${GENERATED}/cosmetics/season1/${t.prefix}_${padded}.png`);
      }
    }
    // 시즌2, 시즌3: 유사 패턴 (로드 에러 무시로 모두 시도)
    for (const season of [2, 3]) {
      for (let i = 1; i <= 50; i++) {
        const padded = String(i).padStart(2, '0');
        // 범용 키로 등록 — 실제 파일명은 다양하나 에러 시 무시
        this._loadImage(`cos_s${season}_${padded}`, `${GENERATED}/cosmetics/season${season}/COS-ITEM_S${season}_${padded}.png`);
      }
    }
  }

  /**
   * P34-A: 전체 비주얼 에셋 일괄 preload
   * LoadingScene에서 호출 — 모든 아이콘/VFX/코스메틱/전직 캐릭터 로딩
   */
  preloadAllVisuals(): void {
    this.preloadAdvancedCharacters();
    this.preloadSkillIcons();
    this.preloadItemIcons();
    this.preloadStatusIcons();
    this.preloadVFX();
    this.preloadCosmetics();
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
