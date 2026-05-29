/**
 * 유닛 테스트 — SSOT-WIRE-02: 던전 실패 game-over narration (DungeonScene)
 *
 * 게임 로직: DungeonScene 의 패배/시간초과 연출 텍스트에 SSOT
 * SCENARIO_GAME_OVER_NARRATIVES(universal) 의 재도전 hint 를 연결한다.
 *
 * 설계 근거:
 * - DungeonScene 은 chapter 컨텍스트가 없다(chapterId 死 필드, 항상 1) → chapter별
 *   party_wipe narrative 대신 chapter-무관한 getUniversalGameOver() 를 쓴다.
 * - SSOT 에는 time_limit cause row 가 없으므로(party_wipe 5 + universal 1),
 *   짧은 lead 문구는 표현 계층(DUNGEON_FAILURE_LEAD)에서 cause 별로 관리.
 *
 * 회귀 보호: 기존 화면 텍스트('💀 패배...' / '⏰ 시간 초과!')가 첫 줄로 보존되어야 한다.
 */
import { describe, expect, test } from 'vitest';

import {
  composeDungeonGameOverText,
  DUNGEON_FAILURE_LEAD,
  type DungeonFailureCause,
} from '../../client/src/gameplay/dungeonGameOverNarration';
import { getUniversalGameOver } from '../../shared/types/scenarioRegistry';

const CAUSES: readonly DungeonFailureCause[] = ['party_wipe', 'time_limit'];

describe('SSOT-WIRE-02: 던전 실패 game-over narration', () => {
  test('기존 lead 문구 보존 (회귀 가드)', () => {
    expect(DUNGEON_FAILURE_LEAD.party_wipe).toBe('💀 패배...');
    expect(DUNGEON_FAILURE_LEAD.time_limit).toBe('⏰ 시간 초과!');
  });

  test('composeDungeonGameOverText — 첫 줄은 기존 lead 그대로', () => {
    expect(composeDungeonGameOverText('party_wipe').split('\n')[0]).toBe('💀 패배...');
    expect(composeDungeonGameOverText('time_limit').split('\n')[0]).toBe('⏰ 시간 초과!');
  });

  test('composeDungeonGameOverText — SSOT universal 헤드라인을 노출 (wiring 증명)', () => {
    const headline = getUniversalGameOver().headline;
    expect(headline.length).toBeGreaterThan(0);
    for (const cause of CAUSES) {
      expect(composeDungeonGameOverText(cause)).toContain(headline);
    }
  });

  test('composeDungeonGameOverText — lead + SSOT 헤드라인 2줄 구성', () => {
    const text = composeDungeonGameOverText('party_wipe');
    const lines = text.split('\n');
    expect(lines.length).toBe(2);
    expect(lines[0]).toBe('💀 패배...');
    expect(lines[1]).toBe(getUniversalGameOver().headline);
  });

  test('composeDungeonGameOverText — 2 cause 모두 비어있지 않은 텍스트', () => {
    for (const cause of CAUSES) {
      expect(composeDungeonGameOverText(cause).length, cause).toBeGreaterThan(3);
    }
  });

  test('composeDungeonGameOverText — 순수 함수 (동일 입력 → 동일 출력)', () => {
    expect(composeDungeonGameOverText('party_wipe')).toBe(composeDungeonGameOverText('party_wipe'));
    expect(composeDungeonGameOverText('time_limit')).toBe(composeDungeonGameOverText('time_limit'));
  });
});
