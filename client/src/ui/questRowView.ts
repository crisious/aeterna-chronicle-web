/**
 * questRowView — HUD 퀘스트 트래커의 단일 퀘스트 행 HTML 빌더 (순수 함수).
 *
 * Phaser/DOM 비의존 → node 환경 단위 테스트 가능(메모리 ci-window-ref-gotcha 회피).
 * HudOverlay.renderQuests 가 이 빌더를 사용해 행 innerHTML 을 만든다.
 *
 * 메인 퀘스트("말라투스 성소 진입" 등)는 objectiveText(서사)만으로는
 * "어떻게 진행하는지" 알기 어려웠다. 그래서 actionHint(행동 안내 문구)와
 * mapZoneId(월드맵 진입 버튼)를 행에 렌더해 진행 방법을 명시한다.
 */

import {
  getSpriteResourceForSkillIcon,
  getSpriteResourceForWorldZoneIcon,
} from '../assets/spriteResourceManifest';

const QUEST_ACTION_HINT_ICON_ID = 'skill_mw_arrow';

export interface QuestItem {
  questId: string;
  title: string;
  objectiveText: string;
  progressCurrent: number;
  progressTarget: number;
  isMainQuest: boolean;
  isCompleted: boolean;
  distanceMeters?: number;
  /**
   * 진행 방법 안내 문구. objectiveText(서사)와 달리 "무엇을 눌러/클릭해야 하는지"를
   * 명시한다. 예: "ESC로 월드맵을 열고 «말라투스 성소» 지역을 선택해 진입하세요."
   * 메인 퀘스트가 "어떻게 완료하는지 알기 어려운" 문제를 해소하기 위한 필드.
   */
  actionHint?: string;
  /**
   * 이 퀘스트가 월드맵의 특정 존으로 이동해야 진행되는 경우 그 존 ID.
   * 설정 시 퀘스트 행에 "월드맵 열기" 버튼이 렌더되고, 클릭하면
   * `ui.event.quest.open_map`({ zoneId }) 이벤트를 emit 한다(GameScene 이 수신해 WorldScene 진입).
   */
  mapZoneId?: string;
}

/**
 * 단일 퀘스트 행의 내부 HTML 문자열을 만든다.
 *
 * - actionHint/mapZoneId 는 **미완료** 퀘스트일 때만 렌더한다(완료된 퀘스트엔 진행 안내 불필요).
 * - mapZoneId 가 있으면 `data-map-zone-id` 를 가진 버튼을 만든다. HudOverlay 의
 *   위임 클릭 핸들러가 이 속성을 읽어 `ui.event.quest.open_map` 을 emit 한다.
 */
/**
 * HTML 특수문자 이스케이프 — 이 빌더의 결과는 HudOverlay.renderQuests 가 row.innerHTML 로
 * 라이브 DOM 에 주입한다. quest 필드(title/objectiveText/actionHint/mapZoneId)는 서버 응답의
 * free-form 문자열(예 objective.target → mapZoneId)을 거치므로, 미이스케이프 보간 시 속성/태그
 * 탈출로 DOM XSS 가 성립한다. 모든 보간값은 반드시 이 함수를 거친다.
 */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildQuestMapButtonIconHtml(zoneId: string): string | null {
  const iconResource = getSpriteResourceForWorldZoneIcon(zoneId);
  if (!iconResource) {
    return null;
  }

  const iconPath = escapeHtml(iconResource.path);
  return `<img class="hud-quest-map-icon" src="/${iconPath}" alt="" aria-hidden="true" decoding="async" loading="lazy" data-aeterna-icon-key="${escapeHtml(iconResource.key)}" data-aeterna-icon-path="${iconPath}" />`;
}

function buildQuestActionHintIconHtml(): string {
  const iconResource = getSpriteResourceForSkillIcon(QUEST_ACTION_HINT_ICON_ID);
  if (!iconResource) {
    return '<span class="hud-quest-action-icon-fallback" aria-hidden="true">&gt;</span>';
  }

  const iconPath = escapeHtml(iconResource.path);
  return `<img class="hud-quest-action-icon" src="/${iconPath}" alt="" aria-hidden="true" decoding="async" loading="lazy" data-aeterna-icon-key="${escapeHtml(iconResource.key)}" data-aeterna-icon-path="${iconPath}" />`;
}

export function buildQuestRowHtml(quest: QuestItem): string {
  const progress = `${quest.progressCurrent}/${quest.progressTarget}`;
  const typeBadge = quest.isMainQuest ? 'MAIN' : 'SUB';
  const distance = quest.distanceMeters !== undefined ? ` · ${quest.distanceMeters}m` : '';

  // 진행 방법 안내 줄 — 완료된 퀘스트엔 불필요하므로 미완료일 때만.
  const actionHintHtml = (quest.actionHint && !quest.isCompleted)
    ? `<div class="hud-quest-action">${buildQuestActionHintIconHtml()}<span class="hud-quest-action-text">${escapeHtml(quest.actionHint)}</span></div>`
    : '';

  const mapButtonIconHtml = quest.mapZoneId && !quest.isCompleted
    ? buildQuestMapButtonIconHtml(quest.mapZoneId)
    : null;

  // 월드맵으로 이동해야 진행되는 퀘스트엔 1-클릭 진입 버튼.
  const mapButtonHtml = (quest.mapZoneId && mapButtonIconHtml)
    ? `<button type="button" class="hud-quest-map-btn" data-map-zone-id="${escapeHtml(quest.mapZoneId)}">${mapButtonIconHtml}<span class="hud-quest-map-label">월드맵 열기 (ESC)</span></button>`
    : '';

  return `
        <div class="hud-quest-title">[${typeBadge}] ${escapeHtml(quest.title)}</div>
        <div class="hud-quest-body">${escapeHtml(quest.objectiveText)}</div>
        <div class="hud-quest-progress">${progress}${distance}</div>
        ${actionHintHtml}
        ${mapButtonHtml}
      `;
}
