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
export function buildQuestRowHtml(quest: QuestItem): string {
  const progress = `${quest.progressCurrent}/${quest.progressTarget}`;
  const typeBadge = quest.isMainQuest ? 'MAIN' : 'SUB';
  const distance = quest.distanceMeters !== undefined ? ` · ${quest.distanceMeters}m` : '';

  // 진행 방법 안내 줄 — 완료된 퀘스트엔 불필요하므로 미완료일 때만.
  const actionHintHtml = (quest.actionHint && !quest.isCompleted)
    ? `<div class="hud-quest-action">▶ ${quest.actionHint}</div>`
    : '';

  // 월드맵으로 이동해야 진행되는 퀘스트엔 1-클릭 진입 버튼.
  const mapButtonHtml = (quest.mapZoneId && !quest.isCompleted)
    ? `<button type="button" class="hud-quest-map-btn" data-map-zone-id="${quest.mapZoneId}">🗺 월드맵 열기 (ESC)</button>`
    : '';

  return `
        <div class="hud-quest-title">[${typeBadge}] ${quest.title}</div>
        <div class="hud-quest-body">${quest.objectiveText}</div>
        <div class="hud-quest-progress">${progress}${distance}</div>
        ${actionHintHtml}
        ${mapButtonHtml}
      `;
}
