/**
 * NavigationManager.ts — 내비게이션/경로 안내 시스템 (P5-11)
 *
 * 역할:
 *   - 웨이포인트 → 경로 화살표
 *   - 퀘스트 추적 마커 자동 갱신
 *   - 존 이동 시 맵 전환
 */

import * as Phaser from 'phaser';
import { MinimapOverlay, MapMarker, ZoneMapData } from './MinimapOverlay';

// ── 타입 정의 ──────────────────────────────────────────────────

/** 퀘스트 추적 정보 */
export interface TrackedQuest {
  questId: string;
  title: string;
  objectiveText: string;
  targetZoneId: string;
  targetX: number;
  targetY: number;
  isComplete: boolean;
  type: 'give' | 'turn_in';
}

/** 존 전환 콜백 */
export type OnZoneChangeCallback = (newZoneId: string) => void;

/** 방향 화살표 스타일 */
interface ArrowConfig {
  color: number;
  alpha: number;
  size: number;
  distance: number;  // 플레이어 중심으로부터의 거리
}

// ── 기본 설정 ──────────────────────────────────────────────────

const DEFAULT_ARROW: ArrowConfig = {
  color: 0x00ffff,
  alpha: 0.8,
  size: 12,
  distance: 50,
};

// ── 내비게이션 매니저 ──────────────────────────────────────────

export class NavigationManager {
  private scene: Phaser.Scene;
  private minimap: MinimapOverlay;
  private arrowGraphics: Phaser.GameObjects.Graphics;

  // 상태
  private playerX: number = 0;
  private playerY: number = 0;
  private currentZoneId: string = '';
  private waypointX: number | null = null;
  private waypointY: number | null = null;

  // 퀘스트 추적
  private trackedQuests: Map<string, TrackedQuest> = new Map();

  // 존 맵 데이터 캐시
  private zoneMaps: Map<string, ZoneMapData> = new Map();

  // 콜백
  private onZoneChange: OnZoneChangeCallback | null = null;

  // 경로 화살표 설정
  private arrowConfig: ArrowConfig;

  constructor(
    scene: Phaser.Scene,
    minimap: MinimapOverlay,
    arrowConfig?: Partial<ArrowConfig>,
  ) {
    this.scene = scene;
    this.minimap = minimap;
    this.arrowConfig = { ...DEFAULT_ARROW, ...arrowConfig };

    // 방향 화살표 Graphics (화면 고정)
    this.arrowGraphics = scene.add.graphics();
    this.arrowGraphics.setDepth(850);
    this.arrowGraphics.setScrollFactor(0);

    // 미니맵 웨이포인트 콜백 바인딩
    this.minimap.setOnWaypoint((worldX, worldY) => {
      this.setWaypoint(worldX, worldY);
    });
  }

  // ── 공개 API ──────────────────────────────────────────────

  /** 존 맵 데이터 등록 */
  registerZoneMap(zoneData: ZoneMapData): void {
    this.zoneMaps.set(zoneData.zoneId, zoneData);
  }

  /** 존 이동 */
  changeZone(zoneId: string): void {
    if (zoneId === this.currentZoneId) return;

    this.currentZoneId = zoneId;
    const zoneData = this.zoneMaps.get(zoneId);

    if (zoneData) {
      this.minimap.setZone(zoneData);
    }

    // 웨이포인트 초기화
    this.clearWaypoint();

    // 퀘스트 마커 갱신 (현재 존에 해당하는 것만)
    this.refreshQuestMarkers();

    if (this.onZoneChange) {
      this.onZoneChange(zoneId);
    }
  }

  /** 플레이어 위치 갱신 (매 프레임 호출) */
  update(playerX: number, playerY: number): void {
    this.playerX = playerX;
    this.playerY = playerY;

    // 미니맵에 플레이어 위치 전달
    this.minimap.updatePlayerPosition(playerX, playerY);

    // 방향 화살표 렌더링
    this.renderArrow();

    // 웨이포인트 도달 체크 (30px 이내)
    if (this.waypointX !== null && this.waypointY !== null) {
      const dist = Phaser.Math.Distance.Between(playerX, playerY, this.waypointX, this.waypointY);
      if (dist < 30) {
        this.clearWaypoint();
      }
    }
  }

  /** 웨이포인트 설정 */
  setWaypoint(worldX: number, worldY: number): void {
    this.waypointX = worldX;
    this.waypointY = worldY;
    this.minimap.setWaypoint(worldX, worldY);
  }

  /** 웨이포인트 해제 */
  clearWaypoint(): void {
    this.waypointX = null;
    this.waypointY = null;
    this.minimap.clearWaypoint();
    this.arrowGraphics.clear();
  }

  /** 퀘스트 추적 등록 */
  trackQuest(quest: TrackedQuest): void {
    this.trackedQuests.set(quest.questId, quest);
    this.refreshQuestMarkers();
  }

  /** 퀘스트 추적 해제 */
  untrackQuest(questId: string): void {
    this.trackedQuests.delete(questId);
    this.minimap.removeMarker(`quest_${questId}`);
    this.refreshQuestMarkers();
  }

  /** 퀘스트 추적 갱신 (진행도 변경 시) */
  updateTrackedQuest(questId: string, updates: Partial<TrackedQuest>): void {
    const existing = this.trackedQuests.get(questId);
    if (!existing) return;

    this.trackedQuests.set(questId, { ...existing, ...updates });
    this.refreshQuestMarkers();
  }

  /** NPC 마커 일괄 갱신 */
  setNpcMarkers(npcs: Array<{ id: string; x: number; y: number; label?: string }>): void {
    for (const npc of npcs) {
      this.minimap.setMarker({
        id: `npc_${npc.id}`,
        type: 'npc',
        x: npc.x,
        y: npc.y,
        label: npc.label,
        active: true,
      });
    }
  }

  /** 몬스터 마커 일괄 갱신 */
  setMonsterMarkers(monsters: Array<{ id: string; x: number; y: number; isAggro: boolean }>): void {
    for (const mob of monsters) {
      this.minimap.setMarker({
        id: `mob_${mob.id}`,
        type: mob.isAggro ? 'monster_aggro' : 'monster',
        x: mob.x,
        y: mob.y,
        active: true,
      });
    }
  }

  /** 던전 입구 마커 설정 */
  setDungeonMarkers(dungeons: Array<{ id: string; x: number; y: number; label?: string }>): void {
    for (const dg of dungeons) {
      this.minimap.setMarker({
        id: `dungeon_${dg.id}`,
        type: 'dungeon',
        x: dg.x,
        y: dg.y,
        label: dg.label,
        active: true,
      });
    }
  }

  /** 존 변경 콜백 등록 */
  setOnZoneChange(callback: OnZoneChangeCallback): void {
    this.onZoneChange = callback;
  }

  /** 리소스 정리 */
  destroy(): void {
    this.arrowGraphics.destroy();
  }

  // ── 내부: 퀘스트 마커 ────────────────────────────────────

  private refreshQuestMarkers(): void {
    // 기존 퀘스트 마커 제거
    for (const [questId] of this.trackedQuests) {
      this.minimap.removeMarker(`quest_${questId}`);
    }

    // 현재 존에 해당하는 퀘스트만 마커 등록
    for (const [questId, quest] of this.trackedQuests) {
      if (quest.targetZoneId !== this.currentZoneId) continue;
      if (quest.isComplete) continue;

      const marker: MapMarker = {
        id: `quest_${questId}`,
        type: quest.type === 'turn_in' ? 'quest_turn_in' : 'quest_give',
        x: quest.targetX,
        y: quest.targetY,
        label: quest.title,
        active: true,
      };

      this.minimap.setMarker(marker);
    }
  }

  // ── 내부: 방향 화살표 ────────────────────────────────────

  private renderArrow(): void {
    this.arrowGraphics.clear();

    // 웨이포인트가 없으면 가장 가까운 퀘스트 목표를 대상으로
    let targetX = this.waypointX;
    let targetY = this.waypointY;

    if (targetX === null || targetY === null) {
      const nearest = this.findNearestQuestTarget();
      if (nearest) {
        targetX = nearest.x;
        targetY = nearest.y;
      } else {
        return;  // 표시할 대상 없음
      }
    }

    // 대상이 화면 내에 있으면 화살표 불필요
    const cam = this.scene.cameras.main;
    const screenX = targetX - cam.scrollX;
    const screenY = targetY - cam.scrollY;

    if (
      screenX >= 0 && screenX <= cam.width &&
      screenY >= 0 && screenY <= cam.height
    ) {
      return;
    }

    // 플레이어 중심에서 대상 방향으로 화살표
    const centerX = cam.width / 2;
    const centerY = cam.height / 2;
    const angle = Phaser.Math.Angle.Between(this.playerX, this.playerY, targetX, targetY);

    const arrowX = centerX + Math.cos(angle) * this.arrowConfig.distance;
    const arrowY = centerY + Math.sin(angle) * this.arrowConfig.distance;

    // 삼각형 화살표
    const s = this.arrowConfig.size;
    const perpAngle = angle + Math.PI / 2;

    const tipX = arrowX + Math.cos(angle) * s;
    const tipY = arrowY + Math.sin(angle) * s;
    const leftX = arrowX + Math.cos(perpAngle) * s * 0.5;
    const leftY = arrowY + Math.sin(perpAngle) * s * 0.5;
    const rightX = arrowX - Math.cos(perpAngle) * s * 0.5;
    const rightY = arrowY - Math.sin(perpAngle) * s * 0.5;

    this.arrowGraphics.fillStyle(this.arrowConfig.color, this.arrowConfig.alpha);
    this.arrowGraphics.fillTriangle(tipX, tipY, leftX, leftY, rightX, rightY);

    // 거리 텍스트 (간략: Graphics로는 텍스트 불가, 생략)
  }

  /** 가장 가까운 퀘스트 목표 검색 */
  private findNearestQuestTarget(): { x: number; y: number } | null {
    let nearest: { x: number; y: number; dist: number } | null = null;

    for (const quest of this.trackedQuests.values()) {
      if (quest.targetZoneId !== this.currentZoneId) continue;
      if (quest.isComplete) continue;

      const dist = Phaser.Math.Distance.Between(this.playerX, this.playerY, quest.targetX, quest.targetY);
      if (!nearest || dist < nearest.dist) {
        nearest = { x: quest.targetX, y: quest.targetY, dist };
      }
    }

    return nearest ? { x: nearest.x, y: nearest.y } : null;
  }
}
