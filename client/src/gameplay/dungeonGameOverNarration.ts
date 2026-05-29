/**
 * dungeonGameOverNarration.ts — 던전 실패 game-over narration (SSOT wiring)
 *
 * DungeonScene 의 패배/시간초과 연출에 SCENARIO_GAME_OVER_NARRATIVES(universal)
 * 재도전 hint 를 연결한다.
 *
 * 설계:
 * - DungeonScene 은 chapter 컨텍스트가 없으므로(chapterId 死 필드, 항상 1)
 *   chapter별 party_wipe narrative 대신 chapter-무관 getUniversalGameOver() 사용.
 * - SSOT 에 time_limit cause row 가 없으므로 짧은 lead 문구는 표현 계층에서 관리.
 * - 순수 함수 (Phaser/DOM 비의존) → 단위 테스트 가능.
 *
 * 기존 화면 텍스트('💀 패배...' / '⏰ 시간 초과!')는 첫 줄로 보존되고,
 * SSOT universal 헤드라인이 둘째 줄로 추가되어 dead code 였던 narrative 를 실제 노출한다.
 */
import { getUniversalGameOver, type GameOverCause } from '../../../shared/types/scenarioRegistry';

/** 던전 인스턴스 실패 원인 (chapter 무관 — party_wipe = 전멸, time_limit = 시간 초과) */
export type DungeonFailureCause = Extract<GameOverCause, 'party_wipe' | 'time_limit'>;

/** cause 별 lead 문구 (표현 계층 — SSOT 에 short label 이 없으므로 여기서 관리) */
export const DUNGEON_FAILURE_LEAD: Record<DungeonFailureCause, string> = {
  party_wipe: '💀 패배...',
  time_limit: '⏰ 시간 초과!',
};

/**
 * 던전 실패 연출 텍스트.
 * `{lead}\n{SSOT universal headline}` — 첫 줄은 기존 문구 보존, 둘째 줄은 SSOT 재도전 hint.
 */
export function composeDungeonGameOverText(cause: DungeonFailureCause): string {
  const lead = DUNGEON_FAILURE_LEAD[cause] ?? DUNGEON_FAILURE_LEAD.party_wipe;
  const narrative = getUniversalGameOver();
  return `${lead}\n${narrative.headline}`;
}
