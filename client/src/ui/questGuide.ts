/**
 * questGuide — 퀘스트 가이드 표현 레이어 (wiring).
 *
 * SSOT buildQuestGuide(shared/types/scenarioRegistry, SYNC-258)를 인용해, 퀘스트 objectives
 * (또는 서버 getQuests 가 부착한 guide)로부터 HUD 퀘스트 행(QuestItem)의 진행 안내 필드
 * (actionHint / mapZoneId)를 파생한다. 서버·클라가 동일 생성기를 공유하므로 안내가 어긋나지 않는다.
 *
 * 순수 함수 — Phaser/DOM 비의존(ci-window-ref-gotcha 회피).
 */
import {
  buildQuestGuide,
  type QuestGuide,
  type QuestObjectiveInput,
} from '../../../shared/types/scenarioRegistry';

export interface QuestGuideFields {
  actionHint?: string;
  mapZoneId?: string;
}

/** QuestGuide → QuestItem 안내 필드. opensMap 일 때만 mapZoneId(=mapTarget)를 채운다. */
function guideToFields(guide: QuestGuide): QuestGuideFields {
  if (!guide.actionHint) return {};
  return {
    actionHint: guide.actionHint,
    mapZoneId: guide.opensMap ? guide.mapTarget : undefined,
  };
}

/** 퀘스트 objectives 로부터 QuestItem 안내 필드를 파생(클라가 objectives 를 가진 경우). */
export function deriveQuestGuideFields(objectives: readonly QuestObjectiveInput[]): QuestGuideFields {
  return guideToFields(buildQuestGuide(objectives));
}

/** 서버 getQuests 응답의 quest.guide(이미 계산된 QuestGuide)를 QuestItem 안내 필드로. */
export function questGuideToFields(guide?: QuestGuide | null): QuestGuideFields {
  if (!guide) return {};
  return guideToFields(guide);
}
