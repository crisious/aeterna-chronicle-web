/**
 * EffectManager — ObjectPool 기반 전투 이펙트 관리자
 *
 * 데미지 텍스트, 히트 이펙트, 버프/디버프 아이콘을 풀링하여
 * GC 부하 없이 대량 이펙트를 처리한다.
 */

import * as Phaser from 'phaser';
import { getSpriteResourceForSkillIcon } from '../assets/spriteResourceManifest';
import { ObjectPool, PoolStats } from '../utils/ObjectPool';

// ─── 내부 타입 ─────────────────────────────────────────

/** 풀링 가능한 데미지 텍스트 오브젝트 */
interface DamageTextItem {
  text: Phaser.GameObjects.Text;
  icon: Phaser.GameObjects.Image;
  /** 남은 수명 (ms) */
  ttl: number;
  /** 상승 속도 (px/s) */
  vy: number;
  /** 텍스트 왼쪽에 붙는 Aseprite icon 크기 */
  iconSize: number;
  /** 텍스트와 icon 사이 간격 */
  iconGap: number;
}

/** 히트 이펙트 타입 */
export type HitEffectType = 'slash' | 'blunt' | 'magic';

/** 풀링 가능한 히트 이펙트 오브젝트 */
interface HitEffectItem {
  sprite: Phaser.GameObjects.Sprite;
  ttl: number;
}

/** 풀링 가능한 버프 아이콘 오브젝트 */
interface BuffIconItem {
  sprite: Phaser.GameObjects.Sprite;
  ttl: number;
  /** 위아래 부유 효과용 베이스 Y */
  baseY: number;
  /** 부유 주기 누적값 */
  elapsed: number;
}

/** 통합 통계 */
export interface EffectManagerStats {
  active: number;
  pooled: number;
  created: number;
  recycled: number;
}

// ─── 상수 ──────────────────────────────────────────────

const DAMAGE_TEXT_TTL = 800;       // ms
const DAMAGE_TEXT_VY = -120;       // px/s (위로 상승)
const HIT_EFFECT_TTL = 400;        // ms
const BUFF_ICON_TTL = 3000;        // ms
const BUFF_FLOAT_AMP = 4;          // px
const BUFF_FLOAT_SPEED = 0.003;    // rad/ms

const DAMAGE_POOL_INIT = 20;
const HIT_POOL_INIT = 10;
const BUFF_POOL_INIT = 8;

// 이펙트 아틀라스 프레임 매핑 (아틀라스 있을 때)
const HIT_FRAME_MAP: Record<HitEffectType, string> = {
  slash: 'hit_slash_01',
  blunt: 'hit_blunt_01',
  magic: 'hit_magic_01'
};

// fallback 색상 (generateTexture용)
const HIT_COLOR_MAP: Record<HitEffectType, number> = {
  slash: 0xff4444,
  blunt: 0xffaa00,
  magic: 0x44aaff
};

export const EFFECT_FALLBACK_TEXTURES = [
  {
    key: 'hit_fallback_slash',
    path: 'assets/generated/vfx/fallback/hit_fallback_slash.png',
    width: 32,
    height: 32,
  },
  {
    key: 'hit_fallback_blunt',
    path: 'assets/generated/vfx/fallback/hit_fallback_blunt.png',
    width: 32,
    height: 32,
  },
  {
    key: 'hit_fallback_magic',
    path: 'assets/generated/vfx/fallback/hit_fallback_magic.png',
    width: 32,
    height: 32,
  },
  {
    key: 'buff_fallback',
    path: 'assets/generated/vfx/fallback/buff_fallback.png',
    width: 24,
    height: 24,
  },
] as const;

const EFFECT_TEXT_ICON_IDS = {
  critical: 'skill_ek_explode',
  dualTech: 'skill_mw_storm',
} as const;

type EffectTextIconKind = keyof typeof EFFECT_TEXT_ICON_IDS;

const EFFECT_TEXT_ICON_SIZE = 20;
const EFFECT_TEXT_ICON_GAP = 6;

export function preloadEffectTextIconResources(scene: Phaser.Scene, queuedTextureKeys?: Set<string>): void {
  for (const iconId of Object.values(EFFECT_TEXT_ICON_IDS)) {
    const iconResource = getSpriteResourceForSkillIcon(iconId);
    if (iconResource && !scene.textures.exists(iconResource.key) && !queuedTextureKeys?.has(iconResource.key)) {
      scene.load.image(iconResource.key, iconResource.path);
      queuedTextureKeys?.add(iconResource.key);
    }
  }
}

// ─── 매니저 ────────────────────────────────────────────

export class EffectManager {
  private scene: Phaser.Scene;

  private damagePool: ObjectPool<DamageTextItem>;
  private hitPool: ObjectPool<HitEffectItem>;
  private buffPool: ObjectPool<BuffIconItem>;

  /** 현재 활성 오브젝트 추적용 배열 */
  private activeDamage: DamageTextItem[] = [];
  private activeHits: HitEffectItem[] = [];
  private activeBuffs: BuffIconItem[] = [];

  /** 아틀라스 사용 가능 여부 (preload 후 확인) */
  private useEffectsAtlas = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    // 아틀라스 존재 여부 확인 — Aseprite fallback PNG가 없을 때만 절차 텍스처 생성
    this.useEffectsAtlas = scene.textures.exists('effects');
    this.ensureFallbackTextures();

    // ── 데미지 텍스트 풀 ──
    this.damagePool = new ObjectPool<DamageTextItem>(
      () => this.createDamageText(),
      64,
      (item) => this.resetDamageText(item)
    );
    this.damagePool.warmUp(DAMAGE_POOL_INIT);

    // ── 히트 이펙트 풀 ──
    this.hitPool = new ObjectPool<HitEffectItem>(
      () => this.createHitEffect(),
      32,
      (item) => this.resetHitEffect(item)
    );
    this.hitPool.warmUp(HIT_POOL_INIT);

    // ── 버프 아이콘 풀 ──
    this.buffPool = new ObjectPool<BuffIconItem>(
      () => this.createBuffIcon(),
      24,
      (item) => this.resetBuffIcon(item)
    );
    this.buffPool.warmUp(BUFF_POOL_INIT);

    console.log(
      `[EffectManager] 초기화 완료 — atlas: ${this.useEffectsAtlas}, ` +
      `pools: damage=${DAMAGE_POOL_INIT}, hit=${HIT_POOL_INIT}, buff=${BUFF_POOL_INIT}`
    );
  }

  // ─── 공개 API ────────────────────────────────────────

  /** 데미지 숫자 이펙트 스폰 */
  spawnDamageText(x: number, y: number, damage: number, isCritical = false): void {
    const item = this.damagePool.acquire();
    item.ttl = DAMAGE_TEXT_TTL;
    item.vy = DAMAGE_TEXT_VY;
    item.text.setPosition(isCritical ? x + 8 : x, y);
    item.text.setText(`${damage}`);
    item.text.setStyle({
      fontSize: isCritical ? '28px' : '20px',
      color: isCritical ? '#FF4444' : '#FFFFFF',
      fontFamily: 'Noto Sans KR',
      stroke: '#000000',
      strokeThickness: isCritical ? 4 : 2
    });
    item.text.setAlpha(1);
    item.text.setVisible(true);
    item.text.setDepth(9000);
    if (isCritical) {
      this.setDamageTextIcon(item, 'critical');
    } else {
      this.hideDamageTextIcon(item);
    }
    this.activeDamage.push(item);
  }

  /** 히트 이펙트 스폰 */
  spawnHitEffect(x: number, y: number, type: HitEffectType = 'slash'): void {
    const item = this.hitPool.acquire();
    item.ttl = HIT_EFFECT_TTL;

    // 아틀라스가 있으면 프레임 설정, 없으면 fallback 텍스처 사용
    if (this.useEffectsAtlas) {
      item.sprite.setTexture('effects', HIT_FRAME_MAP[type]);
    } else {
      item.sprite.setTexture(`hit_fallback_${type}`);
    }

    item.sprite.setPosition(x, y);
    item.sprite.setAlpha(1);
    item.sprite.setScale(1);
    item.sprite.setVisible(true);
    item.sprite.setDepth(8500);
    this.activeHits.push(item);
  }

   /**
   * CHRONO-S27: Dual Tech 협공 시각 효과.
   * fxKey 별 색조 분기 (chrono=cyan, dark=purple, holy=gold) + 큰 magic hit + Aseprite 강조 icon.
   * 실제 협공 아틀라스 부재 시 fallback magic effect 재사용.
   */
  spawnDualTechEffect(x: number, y: number, fxKey: string, techName: string): void {
    // fxKey → 색조 매핑 (대표 카테고리)
    const tint: number = (() => {
      if (fxKey.includes('chrono') || fxKey.includes('memory_warp')) return 0x6fd3ff;
      if (fxKey.includes('shadow') || fxKey.includes('memory') || fxKey.includes('void')) return 0xc8a2ff;
      if (fxKey.includes('ether') || fxKey.includes('guardian') || fxKey.includes('holy')) return 0xffd54a;
      return 0xffffff;
    })();

    // 큰 magic hit (협공은 강렬한 광역 느낌)
    this.spawnHitEffect(x, y, 'magic');
    // 추가 magic hit 으로 확대 효과
    this.spawnHitEffect(x - 20, y - 20, 'magic');
    this.spawnHitEffect(x + 20, y + 20, 'magic');

    // 강조 텍스트와 Aseprite icon.
    const item = this.damagePool.acquire();
    item.ttl = DAMAGE_TEXT_TTL * 1.5;
    item.vy = DAMAGE_TEXT_VY * 0.7;
    item.text.setPosition(x + 12, y - 40);
    item.text.setText(techName);
    item.text.setStyle({
      fontSize: '24px',
      color: `#${tint.toString(16).padStart(6, '0')}`,
      fontFamily: 'Noto Sans KR',
      stroke: '#000000',
      strokeThickness: 4,
    });
    item.text.setAlpha(1);
    item.text.setVisible(true);
    item.text.setDepth(9500);
    this.setDamageTextIcon(item, 'dualTech');
    this.activeDamage.push(item);
  }

  /** 버프/디버프 아이콘 스폰 */
  spawnBuffIcon(x: number, y: number, buffId: string): void {
    const item = this.buffPool.acquire();
    item.ttl = BUFF_ICON_TTL;
    item.baseY = y;
    item.elapsed = 0;

    // 아틀라스 프레임이 있으면 사용, 없으면 fallback
    if (this.useEffectsAtlas && this.scene.textures.getFrame('effects', buffId)) {
      item.sprite.setTexture('effects', buffId);
    } else {
      item.sprite.setTexture('buff_fallback');
    }

    item.sprite.setPosition(x, y);
    item.sprite.setAlpha(1);
    item.sprite.setVisible(true);
    item.sprite.setDepth(8800);
    this.activeBuffs.push(item);
  }

  /** 매 프레임 호출 — 활성 이펙트 수명 관리 */
  update(delta: number): void {
    this.updateDamageTexts(delta);
    this.updateHitEffects(delta);
    this.updateBuffIcons(delta);
  }

  /** 전체 풀 통합 통계 */
  getStats(): EffectManagerStats {
    const d = this.damagePool.getStats();
    const h = this.hitPool.getStats();
    const b = this.buffPool.getStats();
    return {
      active: d.active + h.active + b.active,
      pooled: d.pooled + h.pooled + b.pooled,
      created: d.created + h.created + b.created,
      recycled: d.recycled + h.recycled + b.recycled
    };
  }

  /** 풀별 개별 통계 (디버그용) */
  getDetailedStats(): { damage: PoolStats; hit: PoolStats; buff: PoolStats } {
    return {
      damage: this.damagePool.getStats(),
      hit: this.hitPool.getStats(),
      buff: this.buffPool.getStats()
    };
  }

  // ─── 업데이트 루프 ──────────────────────────────────

  private updateDamageTexts(delta: number): void {
    for (let i = this.activeDamage.length - 1; i >= 0; i--) {
      const item = this.activeDamage[i];
      item.ttl -= delta;
      item.text.y += (item.vy * delta) / 1000;
      // 페이드 아웃: 마지막 30% 수명동안 알파 감소
      const fadeThreshold = DAMAGE_TEXT_TTL * 0.3;
      if (item.ttl < fadeThreshold) {
        item.text.setAlpha(Math.max(0, item.ttl / fadeThreshold));
      }
      this.syncDamageTextIcon(item);
      if (item.ttl <= 0) {
        this.damagePool.release(item);
        this.activeDamage.splice(i, 1);
      }
    }
  }

  private updateHitEffects(delta: number): void {
    for (let i = this.activeHits.length - 1; i >= 0; i--) {
      const item = this.activeHits[i];
      item.ttl -= delta;
      // 확대 + 페이드 아웃
      const progress = 1 - item.ttl / HIT_EFFECT_TTL;
      item.sprite.setScale(1 + progress * 0.5);
      item.sprite.setAlpha(1 - progress);
      if (item.ttl <= 0) {
        this.hitPool.release(item);
        this.activeHits.splice(i, 1);
      }
    }
  }

  private updateBuffIcons(delta: number): void {
    for (let i = this.activeBuffs.length - 1; i >= 0; i--) {
      const item = this.activeBuffs[i];
      item.ttl -= delta;
      item.elapsed += delta;
      // 부유 효과
      item.sprite.y = item.baseY + Math.sin(item.elapsed * BUFF_FLOAT_SPEED) * BUFF_FLOAT_AMP;
      // 마지막 20% 수명에서 페이드 아웃
      const fadeThreshold = BUFF_ICON_TTL * 0.2;
      if (item.ttl < fadeThreshold) {
        item.sprite.setAlpha(Math.max(0, item.ttl / fadeThreshold));
      }
      if (item.ttl <= 0) {
        this.buffPool.release(item);
        this.activeBuffs.splice(i, 1);
      }
    }
  }

  // ─── 팩토리 / 리셋 ─────────────────────────────────

  private createDamageText(): DamageTextItem {
    const text = this.scene.add.text(0, 0, '', {
      fontSize: '20px',
      color: '#FFFFFF',
      fontFamily: 'Noto Sans KR'
    });
    text.setVisible(false);
    text.setOrigin(0.5);
    const icon = this.scene.add.image(0, 0, this.getInitialDamageTextIconTextureKey());
    icon.setVisible(false);
    icon.setOrigin(0.5);
    icon.setDisplaySize(EFFECT_TEXT_ICON_SIZE, EFFECT_TEXT_ICON_SIZE);
    icon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    return { text, icon, ttl: 0, vy: 0, iconSize: EFFECT_TEXT_ICON_SIZE, iconGap: EFFECT_TEXT_ICON_GAP };
  }

  private resetDamageText(item: DamageTextItem): void {
    item.text.setVisible(false);
    item.text.setAlpha(1);
    this.hideDamageTextIcon(item);
    item.ttl = 0;
  }

  private getInitialDamageTextIconTextureKey(): string {
    for (const iconId of Object.values(EFFECT_TEXT_ICON_IDS)) {
      const iconResource = getSpriteResourceForSkillIcon(iconId);
      if (iconResource && this.scene.textures.exists(iconResource.key)) {
        return iconResource.key;
      }
    }

    return 'buff_fallback';
  }

  private setDamageTextIcon(item: DamageTextItem, kind: EffectTextIconKind): boolean {
    const iconResource = getSpriteResourceForSkillIcon(EFFECT_TEXT_ICON_IDS[kind]);
    if (!iconResource || !this.scene.textures.exists(iconResource.key)) {
      this.hideDamageTextIcon(item);
      return false;
    }

    item.icon.setTexture(iconResource.key);
    item.icon.setDisplaySize(item.iconSize, item.iconSize);
    item.icon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    item.icon.setDepth(item.text.depth);
    item.icon.setVisible(true);
    this.syncDamageTextIcon(item);
    return true;
  }

  private syncDamageTextIcon(item: DamageTextItem): void {
    if (!item.icon.visible) return;
    item.icon.setPosition(
      item.text.x - item.text.displayWidth / 2 - item.iconGap - item.iconSize / 2,
      item.text.y,
    );
    item.icon.setAlpha(item.text.alpha);
    item.icon.setDepth(item.text.depth);
  }

  private hideDamageTextIcon(item: DamageTextItem): void {
    item.icon.setVisible(false);
    item.icon.setAlpha(1);
  }

  private createHitEffect(): HitEffectItem {
    // fallback 텍스처로 초기 생성 — spawnHitEffect에서 실제 텍스처 지정
    const sprite = this.scene.add.sprite(0, 0, 'hit_fallback_slash');
    sprite.setVisible(false);
    sprite.setOrigin(0.5);
    return { sprite, ttl: 0 };
  }

  private resetHitEffect(item: HitEffectItem): void {
    item.sprite.setVisible(false);
    item.sprite.setAlpha(1);
    item.sprite.setScale(1);
    item.ttl = 0;
  }

  private createBuffIcon(): BuffIconItem {
    const sprite = this.scene.add.sprite(0, 0, 'buff_fallback');
    sprite.setVisible(false);
    sprite.setOrigin(0.5);
    return { sprite, ttl: 0, baseY: 0, elapsed: 0 };
  }

  private resetBuffIcon(item: BuffIconItem): void {
    item.sprite.setVisible(false);
    item.sprite.setAlpha(1);
    item.ttl = 0;
    item.baseY = 0;
    item.elapsed = 0;
  }

  // ─── Fallback 텍스처 ───────────────────────────────

  /** Aseprite fallback PNG 로드가 실패했을 때만 사용할 generateTexture 생성 */
  private ensureFallbackTextures(): void {
    const missingHitTypes = (['slash', 'blunt', 'magic'] as HitEffectType[])
      .filter((type) => !this.scene.textures.exists(`hit_fallback_${type}`));
    const needsBuffFallback = !this.scene.textures.exists('buff_fallback');

    if (missingHitTypes.length === 0 && !needsBuffFallback) {
      return;
    }

    const g = this.scene.add.graphics();

    // 히트 이펙트 fallback (타입별)
    for (const type of missingHitTypes) {
      const key = `hit_fallback_${type}`;
      g.clear();
      g.fillStyle(HIT_COLOR_MAP[type], 1);
      g.fillCircle(16, 16, 16);
      g.generateTexture(key, 32, 32);
    }

    // 버프 아이콘 fallback
    if (needsBuffFallback) {
      g.clear();
      g.fillStyle(0x44ff44, 1);
      g.fillRoundedRect(0, 0, 24, 24, 4);
      g.generateTexture('buff_fallback', 24, 24);
    }

    g.destroy();
  }
}
