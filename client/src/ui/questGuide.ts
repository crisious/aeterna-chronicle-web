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
  type QuestObjectiveKind,
  type QuestObjectiveInput,
} from '../../../shared/types/scenarioRegistry';
import {
  getSpriteResourceForSkillIcon,
  getSpriteResourceForUiIcon,
  type SpriteResource,
} from '../assets/spriteResourceManifest';
import { getItemIconResource, type ItemIconResource } from '../data/itemIconResources';
import type { QuestItem } from './questRowView';
import type { ActiveQuestData } from '../network/NetworkManager';

export interface QuestGuideFields {
  actionHint?: string;
  mapZoneId?: string;
  actionIconImageKey?: string;
  actionIconImagePath?: string;
}

const QUEST_ACTION_ICON_BY_KIND: Readonly<Record<QuestObjectiveKind, () => SpriteResource | ItemIconResource | undefined>> = {
  explore: () => getSpriteResourceForSkillIcon('skill_vw_warp'),
  talk: () => getSpriteResourceForUiIcon('chat_system'),
  kill: () => getSpriteResourceForSkillIcon('skill_ek_slash'),
  collect: () => getItemIconResource({ itemIconId: 'ITM-MAT-001' }),
  craft: () => getItemIconResource({ itemIconId: 'ITM-WPN-001' }),
};

function resolveQuestActionIconFields(kind: QuestObjectiveKind | 'unknown' | undefined): Pick<QuestGuideFields, 'actionIconImageKey' | 'actionIconImagePath'> {
  if (!kind || kind === 'unknown') {
    return {};
  }

  const resource = QUEST_ACTION_ICON_BY_KIND[kind]?.();
  if (!resource) {
    return {};
  }

  return {
    actionIconImageKey: resource.key,
    actionIconImagePath: resource.path,
  };
}

/** QuestGuide → QuestItem 안내 필드. opensMap 일 때만 mapZoneId(=mapTarget)를 채운다. */
function guideToFields(guide: QuestGuide): QuestGuideFields {
  if (!guide.actionHint) return {};
  const activeStep = guide.steps.find((step) => !step.completed) ?? guide.steps[0];

  return {
    actionHint: guide.actionHint,
    mapZoneId: guide.opensMap ? guide.mapTarget : undefined,
    ...resolveQuestActionIconFields(activeStep?.kind),
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

/**
 * 서버 active 퀘스트(진행도 + 부착 guide)를 HUD 퀘스트 행(QuestItem)으로 변환.
 * objectiveText 는 현재(첫 미완료) objective 의 서사 description, 진행도는 그 objective 의 current/target,
 * actionHint/mapZoneId 는 서버 guide(없으면 objectives 로 직접 파생)에서 채운다.
 * quest 가 없으면(상세 누락) null 을 반환 → 호출부에서 걸러낸다.
 */
export function activeQuestToQuestItem(active: ActiveQuestData): QuestItem | null {
  const q = active.quest;
  if (!q) return null;
  const objectives = q.objectives ?? [];
  const progress = active.progress ?? [];
  const isDone = (i: number) => progress.find((p) => p.objectiveIndex === i)?.completed === true;
  const firstIncomplete = objectives.findIndex((_, i) => !isDone(i));
  const curIdx = firstIncomplete === -1 ? 0 : firstIncomplete;
  const cur = objectives[curIdx];
  const curProg = progress.find((p) => p.objectiveIndex === curIdx);
  const fields = active.guide
    ? questGuideToFields(active.guide)
    : deriveQuestGuideFields(objectives.map((o, i) => ({ ...o, completed: isDone(i) })));
  return {
    questId: q.code,
    title: q.name,
    objectiveText: (cur?.description ?? '').trim() || q.name,
    progressCurrent: curProg?.current ?? 0,
    progressTarget: curProg?.target ?? cur?.count ?? 1,
    isMainQuest: q.type === 'main',
    isCompleted: active.status === 'completed',
    ...fields,
  };
}
