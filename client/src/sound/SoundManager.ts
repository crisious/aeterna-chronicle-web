/**
 * SoundManager — 통합 사운드 매니저
 * P4-05: BGM 크로스페이드, SFX 풀링, 환경음 레이어, 전투음, 3D 사운드, 설정 저장/로드
 */
import * as Phaser from 'phaser';
import {
  SOUND_MANIFEST,
  SOUND_MAP,
  SoundEntry,
  SoundCategory,
} from './soundManifest';

// ─── 설정 타입 ──────────────────────────────────────────────────
export interface SoundSettings {
  masterVolume: number;   // 0.0 ~ 1.0
  bgmVolume: number;
  sfxVolume: number;
  ambientVolume: number;
  voiceVolume: number;
  muted: boolean;
}

const DEFAULT_SETTINGS: SoundSettings = {
  masterVolume: 0.8,
  bgmVolume: 0.7,
  sfxVolume: 0.8,
  ambientVolume: 0.5,
  voiceVolume: 0.7,
  muted: false,
};

const SETTINGS_STORAGE_KEY = 'aeterna_sound_settings';

// ─── SFX 풀링 설정 ─────────────────────────────────────────────
/** 동일 SFX 동시 재생 제한 */
const MAX_CONCURRENT_SFX = 8;
/** 동일 키 동시 재생 제한 */
const MAX_SAME_KEY_SFX = 3;

// ─── 크로스페이드 기본 시간 (ms) ────────────────────────────────
const DEFAULT_CROSSFADE_MS = 1500;

// ─── 3D 사운드 감쇠 설정 ────────────────────────────────────────
const AUDIO_DISTANCE_MAX = 800;
const AUDIO_DISTANCE_REF = 100;

/**
 * SoundManager: Phaser.Scene에 바인딩되어 모든 오디오를 관리
 */
export class SoundManager {
  private scene: Phaser.Scene;
  private settings: SoundSettings;

  // BGM 상태
  private currentBgm: Phaser.Sound.BaseSound | null = null;
  private currentBgmKey: string | null = null;
  private crossfadeTween: Phaser.Tweens.Tween | null = null;

  // SFX 풀
  private activeSfx: Map<string, Phaser.Sound.BaseSound[]> = new Map();
  private totalActiveSfx = 0;

  // 환경음 레이어
  private activeAmbients: Map<string, Phaser.Sound.BaseSound> = new Map();

  // 로드 완료 추적
  private loadedKeys: Set<string> = new Set();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.settings = this.loadSettings();
  }

  // ─── 초기화: 에셋 프리로드 ────────────────────────────────────
  /**
   * preload() 단계에서 호출 — 매니페스트의 모든 사운드를 큐에 등록
   * 파일이 없어도 에러 없이 건너뛴다 (개발 중 에셋 부재 대응)
   */
  preloadAll(): void {
    // 로드 에러 시 경고만 출력 (크래시 방지)
    this.scene.load.on('loaderror', (file: Phaser.Loader.File) => {
      console.warn(`[SoundManager] 로드 실패 (무시): ${file.key}`);
    });

    for (const entry of SOUND_MANIFEST) {
      if (!this.scene.cache.audio.exists(entry.key)) {
        this.scene.load.audio(entry.key, entry.path);
      }
    }
  }

  /**
   * create() 단계에서 호출 — 로드 성공한 키만 추적
   */
  init(): void {
    for (const entry of SOUND_MANIFEST) {
      if (this.scene.cache.audio.exists(entry.key)) {
        this.loadedKeys.add(entry.key);
      }
    }
    console.log(`[SoundManager] 초기화 완료 — ${this.loadedKeys.size}/${SOUND_MANIFEST.length} 사운드 로드됨`);
  }

  // ════════════════════════════════════════════════════════════════
  // BGM 매니저 (크로스페이드 전환, 볼륨 조절)
  // ════════════════════════════════════════════════════════════════

  /**
   * BGM 재생 (크로스페이드 전환)
   * @param key 사운드 키
   * @param fadeMs 크로스페이드 시간 (ms)
   */
  playBgm(key: string, fadeMs: number = DEFAULT_CROSSFADE_MS): void {
    if (this.currentBgmKey === key) return; // 동일 BGM → 무시

    const entry = SOUND_MAP.get(key);
    if (!entry || !this.loadedKeys.has(key)) {
      console.warn(`[SoundManager] BGM 없음: ${key}`);
      return;
    }

    const targetVolume = this.calcVolume(entry, 'bgm');

    // 이전 BGM 페이드아웃
    if (this.currentBgm) {
      const oldBgm = this.currentBgm;
      if (this.crossfadeTween) {
        this.crossfadeTween.stop();
      }
      this.crossfadeTween = this.scene.tweens.add({
        targets: oldBgm,
        volume: 0,
        duration: fadeMs,
        onComplete: () => {
          oldBgm.stop();
          oldBgm.destroy();
        },
      });
    }

    // 새 BGM 페이드인
    const newBgm = this.scene.sound.add(key, {
      volume: 0,
      loop: entry.loop,
    });
    newBgm.play();

    this.scene.tweens.add({
      targets: newBgm,
      volume: targetVolume,
      duration: fadeMs,
    });

    this.currentBgm = newBgm;
    this.currentBgmKey = key;
  }

  /** BGM 정지 (페이드아웃) */
  stopBgm(fadeMs: number = DEFAULT_CROSSFADE_MS): void {
    if (!this.currentBgm) return;

    const bgm = this.currentBgm;
    this.currentBgm = null;
    this.currentBgmKey = null;

    this.scene.tweens.add({
      targets: bgm,
      volume: 0,
      duration: fadeMs,
      onComplete: () => {
        bgm.stop();
        bgm.destroy();
      },
    });
  }

  /** BGM 일시정지/재개 */
  pauseBgm(): void {
    if (this.currentBgm && (this.currentBgm as Phaser.Sound.WebAudioSound).isPlaying) {
      this.currentBgm.pause();
    }
  }

  resumeBgm(): void {
    if (this.currentBgm && (this.currentBgm as Phaser.Sound.WebAudioSound).isPaused) {
      this.currentBgm.resume();
    }
  }

  // ════════════════════════════════════════════════════════════════
  // SFX 매니저 (풀링, 동시 재생 제한)
  // ════════════════════════════════════════════════════════════════

  /**
   * SFX 재생 (풀링 + 동시 재생 제한)
   * @param key 사운드 키
   * @param overrides 볼륨/위치 오버라이드
   */
  playSfx(
    key: string,
    overrides?: { volume?: number; detune?: number; rate?: number }
  ): Phaser.Sound.BaseSound | null {
    const entry = SOUND_MAP.get(key);
    if (!entry || !this.loadedKeys.has(key)) {
      return null;
    }

    // 동시 재생 제한 검사
    if (this.totalActiveSfx >= MAX_CONCURRENT_SFX) {
      return null; // 풀 포화 → 무시
    }

    const sameKeyList = this.activeSfx.get(key) ?? [];
    if (sameKeyList.length >= MAX_SAME_KEY_SFX) {
      return null; // 동일 키 포화 → 무시
    }

    const volume = overrides?.volume ?? this.calcVolume(entry, 'sfx');
    const sfx = this.scene.sound.add(key, {
      volume,
      loop: false,
      detune: overrides?.detune,
      rate: overrides?.rate,
    });

    sfx.play();
    sameKeyList.push(sfx);
    this.activeSfx.set(key, sameKeyList);
    this.totalActiveSfx++;

    // 재생 완료 시 풀에서 제거
    sfx.once('complete', () => {
      this.removeSfxFromPool(key, sfx);
    });
    // destroy 시에도 제거
    sfx.once('destroy', () => {
      this.removeSfxFromPool(key, sfx);
    });

    return sfx;
  }

  private removeSfxFromPool(key: string, sfx: Phaser.Sound.BaseSound): void {
    const list = this.activeSfx.get(key);
    if (list) {
      const idx = list.indexOf(sfx);
      if (idx !== -1) {
        list.splice(idx, 1);
        this.totalActiveSfx = Math.max(0, this.totalActiveSfx - 1);
      }
      if (list.length === 0) {
        this.activeSfx.delete(key);
      }
    }
  }

  // ════════════════════════════════════════════════════════════════
  // 전투음 시스템 (공격/피격/스킬/크리티컬)
  // ════════════════════════════════════════════════════════════════

  /** 공격 사운드 (랜덤 변형) */
  playAttackSound(weaponType: 'sword' | 'magic' | 'arrow' = 'sword'): void {
    const keyMap: Record<string, string[]> = {
      sword: ['sfx_sword_slash_1', 'sfx_sword_slash_2', 'sfx_sword_slash_3'],
      magic: ['sfx_magic_fire', 'sfx_magic_ice', 'sfx_magic_lightning'],
      arrow: ['sfx_arrow_shoot'],
    };
    const keys = keyMap[weaponType] ?? keyMap.sword;
    const randomKey = keys[Math.floor(Math.random() * keys.length)];
    this.playSfx(randomKey, { detune: (Math.random() - 0.5) * 100 });
  }

  /** 피격 사운드 */
  playHitSound(material: 'flesh' | 'metal' | 'magic' = 'flesh'): void {
    const keyMap: Record<string, string> = {
      flesh: 'sfx_hit_flesh',
      metal: 'sfx_hit_metal',
      magic: 'sfx_hit_magic',
    };
    this.playSfx(keyMap[material] ?? 'sfx_hit_flesh');
  }

  /** 크리티컬 히트 사운드 */
  playCriticalSound(): void {
    this.playSfx('sfx_critical_hit');
    this.playSfx('voice_combat_critical');
  }

  /** 스킬 시전 사운드 */
  playSkillSound(isUltimate = false): void {
    if (isUltimate) {
      this.playSfx('sfx_skill_ultimate');
      this.playSfx('voice_combat_ultimate');
    } else {
      this.playSfx('sfx_skill_activate');
      this.playSfx('voice_combat_skill_cast');
    }
  }

  // ════════════════════════════════════════════════════════════════
  // 환경음 레이어 (지역별 앰비언트)
  // ════════════════════════════════════════════════════════════════

  /**
   * 환경음 추가/전환 — 여러 레이어를 동시 재생 가능
   * @param key 환경음 키
   * @param fadeMs 페이드인 시간
   */
  addAmbient(key: string, fadeMs: number = 2000): void {
    if (this.activeAmbients.has(key)) return;

    const entry = SOUND_MAP.get(key);
    if (!entry || !this.loadedKeys.has(key)) return;

    const targetVolume = this.calcVolume(entry, 'ambient');
    const ambient = this.scene.sound.add(key, {
      volume: 0,
      loop: true,
    });
    ambient.play();

    this.scene.tweens.add({
      targets: ambient,
      volume: targetVolume,
      duration: fadeMs,
    });

    this.activeAmbients.set(key, ambient);
  }

  /** 특정 환경음 제거 */
  removeAmbient(key: string, fadeMs: number = 2000): void {
    const ambient = this.activeAmbients.get(key);
    if (!ambient) return;

    this.activeAmbients.delete(key);
    this.scene.tweens.add({
      targets: ambient,
      volume: 0,
      duration: fadeMs,
      onComplete: () => {
        ambient.stop();
        ambient.destroy();
      },
    });
  }

  /** 모든 환경음 제거 */
  clearAmbients(fadeMs: number = 1500): void {
    for (const key of Array.from(this.activeAmbients.keys())) {
      this.removeAmbient(key, fadeMs);
    }
  }

  /**
   * 지역 전환 — 기존 환경음 모두 교체
   * @param ambientKeys 새 지역의 환경음 키 배열
   */
  setRegionAmbients(ambientKeys: string[], fadeMs: number = 2000): void {
    // 유지할 키와 제거할 키 분리
    const currentKeys = new Set(this.activeAmbients.keys());
    const newKeys = new Set(ambientKeys);

    for (const key of currentKeys) {
      if (!newKeys.has(key)) {
        this.removeAmbient(key, fadeMs);
      }
    }
    for (const key of newKeys) {
      if (!currentKeys.has(key)) {
        this.addAmbient(key, fadeMs);
      }
    }
  }

  // ════════════════════════════════════════════════════════════════
  // 3D 사운드 (거리 기반 감쇠 — Phaser 기본 기능 활용)
  // ════════════════════════════════════════════════════════════════

  /**
   * 위치 기반 SFX — 리스너(카메라)와의 거리로 볼륨 감쇠
   * Phaser WebAudio의 pan/volume을 수동 계산
   */
  playSfxAt(
    key: string,
    worldX: number,
    worldY: number,
    listenerX?: number,
    listenerY?: number
  ): Phaser.Sound.BaseSound | null {
    const lx = listenerX ?? this.scene.cameras.main.scrollX + this.scene.cameras.main.width / 2;
    const ly = listenerY ?? this.scene.cameras.main.scrollY + this.scene.cameras.main.height / 2;

    const dist = Phaser.Math.Distance.Between(worldX, worldY, lx, ly);
    if (dist > AUDIO_DISTANCE_MAX) return null; // 너무 멀면 재생 안 함

    // 거리 감쇠: inverse distance model (ref / max(dist, ref))
    const attenuation = Math.min(1, AUDIO_DISTANCE_REF / Math.max(dist, AUDIO_DISTANCE_REF));

    // 좌우 패닝 (-1 ~ 1)
    const dx = worldX - lx;
    const pan = Phaser.Math.Clamp(dx / (AUDIO_DISTANCE_MAX * 0.5), -1, 1);

    const entry = SOUND_MAP.get(key);
    if (!entry || !this.loadedKeys.has(key)) return null;

    const baseVol = this.calcVolume(entry, 'sfx');
    const sfx = this.playSfx(key, { volume: baseVol * attenuation });

    // WebAudioSound만 pan 지원
    if (sfx && 'setPan' in sfx) {
      (sfx as Phaser.Sound.WebAudioSound).setPan(pan);
    }

    return sfx;
  }

  // ════════════════════════════════════════════════════════════════
  // 설정 저장/로드 (BGM/SFX/환경음 볼륨 독립)
  // ════════════════════════════════════════════════════════════════

  getSettings(): Readonly<SoundSettings> {
    return { ...this.settings };
  }

  updateSettings(partial: Partial<SoundSettings>): void {
    this.settings = { ...this.settings, ...partial };
    this.saveSettings();
    this.applyVolumeChanges();
  }

  /** 마스터 뮤트 토글 */
  toggleMute(): boolean {
    this.settings.muted = !this.settings.muted;
    this.saveSettings();
    this.applyVolumeChanges();
    return this.settings.muted;
  }

  private loadSettings(): SoundSettings {
    try {
      const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<SoundSettings>;
        return { ...DEFAULT_SETTINGS, ...parsed };
      }
    } catch {
      // 파싱 실패 → 기본값
    }
    return { ...DEFAULT_SETTINGS };
  }

  private saveSettings(): void {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(this.settings));
    } catch {
      // localStorage 불가 환경 대응
    }
  }

  /**
   * 볼륨 변경 시 실시간 반영
   */
  private applyVolumeChanges(): void {
    // BGM 볼륨 갱신
    if (this.currentBgm && this.currentBgmKey) {
      const entry = SOUND_MAP.get(this.currentBgmKey);
      if (entry) {
        const vol = this.calcVolume(entry, 'bgm');
        (this.currentBgm as Phaser.Sound.WebAudioSound).setVolume(vol);
      }
    }

    // 환경음 볼륨 갱신
    for (const [key, ambient] of this.activeAmbients.entries()) {
      const entry = SOUND_MAP.get(key);
      if (entry) {
        const vol = this.calcVolume(entry, 'ambient');
        (ambient as Phaser.Sound.WebAudioSound).setVolume(vol);
      }
    }
  }

  /**
   * 최종 볼륨 계산: 에셋 기본 볼륨 × 카테고리 볼륨 × 마스터 볼륨
   */
  private calcVolume(entry: SoundEntry, group: 'bgm' | 'sfx' | 'ambient' | 'voice'): number {
    if (this.settings.muted) return 0;

    const groupVolumeMap: Record<string, number> = {
      bgm: this.settings.bgmVolume,
      sfx: this.settings.sfxVolume,
      ambient: this.settings.ambientVolume,
      voice: this.settings.voiceVolume,
    };

    return entry.volume * (groupVolumeMap[group] ?? 1) * this.settings.masterVolume;
  }

  // ════════════════════════════════════════════════════════════════
  // 유틸리티
  // ════════════════════════════════════════════════════════════════

  /** 전체 정리 (씬 전환 시 호출) */
  destroy(): void {
    this.stopBgm(0);

    for (const [, list] of this.activeSfx) {
      for (const sfx of list) {
        sfx.stop();
        sfx.destroy();
      }
    }
    this.activeSfx.clear();
    this.totalActiveSfx = 0;

    for (const [, ambient] of this.activeAmbients) {
      ambient.stop();
      ambient.destroy();
    }
    this.activeAmbients.clear();
  }

  /** 디버그: 현재 상태 요약 */
  getStats(): {
    bgmKey: string | null;
    activeSfxCount: number;
    ambientCount: number;
    loadedSounds: number;
    settings: SoundSettings;
  } {
    return {
      bgmKey: this.currentBgmKey,
      activeSfxCount: this.totalActiveSfx,
      ambientCount: this.activeAmbients.size,
      loadedSounds: this.loadedKeys.size,
      settings: { ...this.settings },
    };
  }

  /** 카테고리별 사운드 키 목록 반환 (UI 옵션용) */
  getKeysByCategory(category: SoundCategory): string[] {
    return SOUND_MANIFEST
      .filter((e) => e.category === category && this.loadedKeys.has(e.key))
      .map((e) => e.key);
  }

  /** 특정 사운드 엔트리 조회 */
  getEntry(key: string): SoundEntry | undefined {
    return SOUND_MAP.get(key);
  }
}
