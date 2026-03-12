# 에셋 Lazy Load 패턴 — P12-09 번들 최적화

> 작성일: 2026-03-12
> 대상: Phaser 클라이언트 에셋 로딩 전략

---

## 원칙

1. **초기 로딩 최소화**: 로그인 화면에 필요한 에셋만 즉시 로드
2. **존 진입 시 프리로드**: 다음 존에 필요한 에셋을 존 이동 전에 백그라운드 로드
3. **LRU 캐시**: 사용하지 않는 존의 에셋은 메모리에서 해제

---

## 패턴 1: 동적 Import로 씬 코드 분리

```ts
// ❌ BAD — 모든 씬을 번들에 포함
import { LoginScene } from './scenes/LoginScene';
import { VerdantPlainsScene } from './scenes/VerdantPlainsScene';
import { CrystalCaveScene } from './scenes/CrystalCaveScene';

// ✅ GOOD — 동적 import로 코드 스플리팅
const sceneLoaders: Record<string, () => Promise<{ default: typeof Phaser.Scene }>> = {
  login: () => import('./scenes/LoginScene'),
  verdant_plains: () => import('./scenes/VerdantPlainsScene'),
  crystal_cave: () => import('./scenes/CrystalCaveScene'),
  flame_mountain: () => import('./scenes/FlameMountainScene'),
  // ... 30개 존 각각 별도 청크로 분리
};

async function loadScene(sceneKey: string): Promise<Phaser.Scene> {
  const loader = sceneLoaders[sceneKey];
  if (!loader) throw new Error(`Unknown scene: ${sceneKey}`);
  const module = await loader();
  return new module.default();
}
```

**효과**: 초기 JS 번들에서 각 씬 코드가 제외됨. 씬 진입 시에만 해당 청크를 다운로드.

---

## 패턴 2: 에셋 매니페스트 기반 프리로드

```ts
// assets/manifest.json — 존별 에셋 목록
{
  "login": {
    "images": ["ui/logo.webp", "ui/bg_login.webp"],
    "audio": ["bgm/title.ogg"],
    "priority": "immediate"
  },
  "verdant_plains": {
    "images": ["tilemap/verdant.webp", "sprites/npc_merchant.webp"],
    "audio": ["bgm/verdant.ogg", "sfx/wind.ogg"],
    "spritesheets": ["sprites/player_walk.webp"],
    "priority": "on-enter"
  },
  "crystal_cave": {
    "images": ["tilemap/crystal.webp"],
    "audio": ["bgm/cave.ogg"],
    "priority": "prefetch"
  }
}
```

```ts
// AssetManager.ts
class AssetManager {
  private loaded = new Set<string>();
  private loading = new Map<string, Promise<void>>();

  async preloadZone(scene: Phaser.Scene, zoneId: string): Promise<void> {
    if (this.loaded.has(zoneId)) return;
    if (this.loading.has(zoneId)) return this.loading.get(zoneId);

    const manifest = await fetch(`/assets/manifest.json`).then(r => r.json());
    const zone = manifest[zoneId];
    if (!zone) return;

    const promise = new Promise<void>((resolve) => {
      for (const img of zone.images ?? []) {
        scene.load.image(img, `/assets/${img}`);
      }
      for (const audio of zone.audio ?? []) {
        scene.load.audio(audio, `/assets/${audio}`);
      }
      for (const ss of zone.spritesheets ?? []) {
        scene.load.spritesheet(ss, `/assets/${ss}`, { frameWidth: 64, frameHeight: 64 });
      }
      scene.load.once('complete', () => {
        this.loaded.add(zoneId);
        this.loading.delete(zoneId);
        resolve();
      });
      scene.load.start();
    });

    this.loading.set(zoneId, promise);
    return promise;
  }

  /** 사용하지 않는 존의 텍스처를 해제 (LRU) */
  unloadZone(scene: Phaser.Scene, zoneId: string): void {
    // 텍스처 매니저에서 해당 존 에셋 제거
    this.loaded.delete(zoneId);
  }
}
```

---

## 패턴 3: 로딩 화면 UX

```ts
// 존 전환 시 로딩 프로그레스 바
scene.load.on('progress', (value: number) => {
  progressBar.setScale(value, 1); // 0~1
  progressText.setText(`${Math.floor(value * 100)}%`);
});

scene.load.on('complete', () => {
  // 페이드 아웃 후 씬 전환
  scene.cameras.main.fadeOut(300, 0, 0, 0);
  scene.time.delayedCall(300, () => scene.scene.start(nextZone));
});
```

---

## 패턴 4: 인접 존 프리페치

```ts
// 현재 존에 인접한 존의 에셋을 idle 시간에 프리페치
const ZONE_ADJACENCY: Record<string, string[]> = {
  starting_village: ['verdant_plains', 'merchant_port'],
  verdant_plains: ['whispering_forest', 'crystal_cave'],
  crystal_cave: ['flame_mountain'],
  // ...
};

function prefetchAdjacentZones(currentZone: string): void {
  const adjacent = ZONE_ADJACENCY[currentZone] ?? [];
  // requestIdleCallback으로 우선순위 낮게
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      for (const zone of adjacent) {
        assetManager.preloadZone(scene, zone);
      }
    });
  }
}
```

---

## 번들 크기 기대 효과

| 항목 | Before | After | 절감 |
|------|--------|-------|------|
| 초기 JS | ~2.5MB | ~800KB | -68% |
| Phaser 청크 | (포함) | 1.2MB (분리) | 별도 캐시 |
| 씬별 청크 | - | 20~50KB × 30 | 필요 시 로드 |
| 에셋 (WebP) | ~15MB | ~10MB | -33% |
