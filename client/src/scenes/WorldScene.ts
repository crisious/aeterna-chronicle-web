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

// ── WorldScene ──────────────────────────────────────────────

export class WorldScene extends Phaser.Scene {
  private zoneNodes: Phaser.GameObjects.Container[] = [];
  private travelLine!: Phaser.GameObjects.Graphics;
  private infoPanel: Phaser.GameObjects.Container | null = null;
  private playerMarker!: Phaser.GameObjects.Arc;
  private currentZoneId = 'aether_plains';
  private currentEraId: ChronoEraId = 'present';
  private selectedZone: WorldZone | null = null;
  private eraLabelText: Phaser.GameObjects.Text | null = null;
  private eraHintText: Phaser.GameObjects.Text | null = null;

  // FINDING-A4 ext3: zone 키보드 nav state
  private navigableZoneIndices: number[] = [];
  private zoneIndex = 0;
  private highlightRing: Phaser.GameObjects.Arc | null = null;
  private _zoneKeyboardCleanup: (() => void) | null = null;

  constructor() {
    super({ key: 'WorldScene' });
  }

  init(data?: { eraId?: ChronoEraId }): void {
    // 우선순위: scene init data > localStorage 복원 > 기존 currentEraId(present)
    this.currentEraId = data?.eraId ?? loadLastEra() ?? this.currentEraId;
    this.selectedZone = null;
  }

  // ── 라이프사이클 ─────────────────────────────────────────

  // 존 아이콘 매핑
  private static readonly ZONE_ICON_MAP: Record<string, string> = {
    aether_plains: 'zone_aether_plains',
    memory_forest: 'zone_memory_forest',
    shadow_gorge: 'zone_shadow_gorge',
    crystal_cave: 'zone_crystal_cave',
    forgotten_citadel: 'zone_forgotten_citadel',
    chrono_spire: 'zone_chrono_spire',
  };

  preload(): void {
    // 존 아이콘 로드 (64x64 픽셀아트)
    for (const iconKey of Object.values(WorldScene.ZONE_ICON_MAP)) {
      this.load.image(iconKey, `assets/generated/ui/worldmap/${iconKey}.png`);
    }

    // 선택 패널 미리보기: 현재 시간대 기준으로 지역별 배경을 고유 키로 로드한다.
    const loadedPreviewKeys = new Set<string>();
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

    // 월드맵 배경 — 단순 그라디언트
    this.add.rectangle(width / 2, height / 2, width, height, 0x0a0a1e);

    // 타이틀
    this.add.text(width / 2, 28, '🗺️ 에테르나 월드맵', {
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
    this.playerMarker = this.add.circle(
      startZone.posRatioX * width,
      startZone.posRatioY * height,
      8, 0xffffff, 0.9,
    );
    this._pulseMarker();

    // 하단 뒤로가기
    this.add.text(20, height - 30, '← 마을로 돌아가기 (ESC)', {
      fontSize: '13px',
      color: '#888888',
      fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
    })
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.scene.start('LobbyScene'));

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
    const onEsc = () => this.scene.start('LobbyScene');

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

    SceneManager.fadeIn(this, 300);
  }

  private _createChronoControls(width: number): void {
    const leftBtn = this.add.text(width / 2 - 185, 70, '[Q] ◀', {
      fontSize: '13px',
      fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
      color: '#88ccff',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    leftBtn.on('pointerdown', () => this._setChronoEra(cycleChronoEra(this.currentEraId, -1)));

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

    const rightBtn = this.add.text(width / 2 + 185, 70, '▶ [E]', {
      fontSize: '13px',
      fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
      color: '#88ccff',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    rightBtn.on('pointerdown', () => this._setChronoEra(cycleChronoEra(this.currentEraId, 1)));

    this._refreshChronoControls();
  }

  private _setChronoEra(nextEraId: ChronoEraId): void {
    this.currentEraId = nextEraId;
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

  // ── 지역 노드 ────────────────────────────────────────────

  private _createZoneNode(zone: WorldZone, w: number, h: number): Phaser.GameObjects.Container {
    const x = zone.posRatioX * w;
    const y = zone.posRatioY * h;

    const container = this.add.container(x, y);

    // 존 아이콘: 이미지 또는 색상 원 폴백
    const alpha = zone.unlocked ? 1 : 0.4;
    const iconKey = WorldScene.ZONE_ICON_MAP[zone.id];
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

    // 잠금 아이콘
    if (!zone.unlocked) {
      const lock = this.add.text(0, 0, '🔒', {
        fontSize: '16px',
      }).setOrigin(0.5);
      container.add(lock);
    }

    container.add([nodeVisual, label]);
    return container;
  }

  // ── 존 클릭 ──────────────────────────────────────────────

  private _onZoneClick(zone: WorldZone): void {
    this.selectedZone = zone;
    // 정보 패널 표시
    if (this.infoPanel) {
      this.infoPanel.destroy();
    }

    const { width, height } = this.cameras.main;
    const projection = projectZoneToEra(zone.id, this.currentEraId);
    const background = resolveZoneBackground(zone.id, this.currentEraId);
    const panel = this.add.container(width / 2, height - 112);

    const bg = this.add.rectangle(0, 0, 760, 124, 0x000000, 0.86)
      .setStrokeStyle(1, 0x446688);
    panel.add(bg);

    const previewFrame = this.add.rectangle(-290, -4, 156, 88, 0x111827, 1)
      .setStrokeStyle(1, projection.tintColor, 0.9);
    panel.add(previewFrame);

    if (this.textures.exists(background.farKey)) {
      const preview = this.add.image(-290, -4, background.farKey)
        .setDisplaySize(150, 84)
        .setAlpha(0.92);
      panel.add(preview);
    }

    // 존 색상 아이콘
    const dot = this.add.circle(-190, -26, 15, projection.tintColor);
    panel.add(dot);

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

    void networkManager.fetchZoneEncounter(zone.id, this.currentEraId).then((resp) => {
      if (!resp.ok || !resp.encounter) {
        encounterLine.setText('필드 데이터 미정의');
        return;
      }
      const enc = resp.encounter;
      const monsters = enc.monsterPool.map((s) => s.name).join(', ');
      const bossTag = enc.hasBossSlot ? ' ⚔️ 보스 등장 가능' : '';
      encounterLine.setText(`🛡 ${enc.ambientLine} — ${monsters} (최대 ${enc.maxSpawn}체)${bossTag}`);
    }).catch(() => encounterLine.setText('필드 데이터 미정의'));

    // ▶ + (Enter) 힌트: 패널이 열린 상태에서 한 번 더 ENTER 누르면 이동한다는 키보드 단서.
    const enterBtn = this.add.text(288, 30, '▶ [ 시간 이동 ] (Enter)', {
      fontSize: '14px',
      color: '#88ff88',
      fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    enterBtn.on('pointerdown', () => this._travelToZone(zone));
    panel.add(enterBtn);

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
            zoneId: zone.id,
            zoneName: projection.displayName,
            eraId: this.currentEraId,
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
