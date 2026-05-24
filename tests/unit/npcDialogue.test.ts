/**
 * 유닛 테스트 — 필드 NPC 대화 데이터 생성
 *
 * NPC 선택 시 하드코딩된 샘플 대화가 아닌 선택한 NPC의 이름과 역할을 사용해야 한다.
 */
import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { buildNpcDialogueData, resolveNpcDialogueChoice } from '../../client/src/gameplay/npcDialogue';

interface FieldNpcFixture {
  npcId: string;
  name: string;
  role: string;
}

function loadFieldNpcFixtures(): FieldNpcFixture[] {
  const zoneSeedsPath = path.resolve(__dirname, '../../server/src/world/zoneSeeds.ts');
  const source = readFileSync(zoneSeedsPath, 'utf8');
  const npcPattern = /\{\s*npcId:\s*'([^']+)',\s*name:\s*'([^']+)',\s*posX:\s*\d+,\s*posY:\s*\d+,\s*role:\s*'([^']+)'\s*\}/g;
  const fixtures: FieldNpcFixture[] = [];
  let match: RegExpExecArray | null;

  while ((match = npcPattern.exec(source)) !== null) {
    fixtures.push({ npcId: match[1], name: match[2], role: match[3] });
  }

  return fixtures;
}

const FIELD_NPCS = loadFieldNpcFixtures();

describe('npcDialogue', () => {
  test('zoneSeeds의 모든 필드 NPC는 대화 시작 데이터가 유효하다', () => {
    expect(FIELD_NPCS.length).toBeGreaterThan(0);

    for (const npc of FIELD_NPCS) {
      const dialogue = buildNpcDialogueData({
        id: npc.npcId,
        name: npc.name,
        role: npc.role,
      });

      expect(dialogue.speakerName, npc.npcId).toBe(npc.name);
      expect(dialogue.bodyText.trim(), npc.npcId).not.toBe('');
      expect(dialogue.choices?.length ?? 0, npc.npcId).toBeGreaterThan(0);
      expect(dialogue.choices?.every((choice) => choice.text.trim() !== ''), npc.npcId).toBe(true);
    }
  });

  test('zoneSeeds의 모든 필드 NPC 선택지는 닫기 외 액션에 응답 대사를 반환한다', () => {
    for (const npc of FIELD_NPCS) {
      const dialogue = buildNpcDialogueData({
        id: npc.npcId,
        name: npc.name,
        role: npc.role,
      });

      for (const choice of dialogue.choices ?? []) {
        if (choice.text === '닫기') {
          continue;
        }

        const result = resolveNpcDialogueChoice({
          id: npc.npcId,
          name: npc.name,
          role: npc.role,
        }, choice.choiceId);

        expect(result?.speakerName, `${npc.npcId}:${choice.choiceId}`).toBe(npc.name);
        expect(result?.bodyText.trim(), `${npc.npcId}:${choice.choiceId}`).not.toBe('');
        expect(result?.choices?.some((nextChoice) => nextChoice.text === '닫기'), `${npc.npcId}:${choice.choiceId}`).toBe(true);
      }
    }
  });

  test('유령 상인 고로디를 선택하면 대화 화자도 고로디로 표시된다', () => {
    const dialogue = buildNpcDialogueData({
      id: 'npc_ghost_merchant',
      name: '유령 상인 고로디',
      role: 'shop',
    });

    expect(dialogue.speakerName).toBe('유령 상인 고로디');
    expect(dialogue.speakerName).not.toBe('누아리엘');
    expect(dialogue.bodyText).not.toContain('치료');
    expect(dialogue.choices?.[1].text).toBe('희귀 물건을 얻는다.');
  });

  test('유령 상인 고로디의 희귀 물건 선택은 획득 확인 대사를 반환한다', () => {
    const result = resolveNpcDialogueChoice({
      id: 'npc_ghost_merchant',
      name: '유령 상인 고로디',
      role: 'shop',
    }, 'B');

    expect(result?.speakerName).toBe('유령 상인 고로디');
    expect(result?.bodyText).toContain('획득');
    expect(result?.choices).toHaveLength(1);
    expect(result?.choices?.[0].text).toBe('닫기');
  });

  test('유령 상인 고로디의 거래 선택은 거래품 안내 대사를 반환한다', () => {
    const result = resolveNpcDialogueChoice({
      id: 'npc_ghost_merchant',
      name: '유령 상인 고로디',
      role: 'shop',
    }, 'A');

    expect(result?.speakerName).toBe('유령 상인 고로디');
    expect(result?.bodyText).toContain('거래품');
    expect(result?.bodyText).toContain('망각의 은화');
    expect(result?.choices).toHaveLength(1);
    expect(result?.choices?.[0].text).toBe('닫기');
  });

  test('닫기 선택지는 후속 대사 없이 닫힌다', () => {
    const result = resolveNpcDialogueChoice({
      id: 'npc_weapon_shop',
      name: '대장장이 토르발',
      role: 'shop',
    }, 'C');

    expect(result).toBeNull();
  });

  test('비정상 NPC 입력은 안전한 기본 대화로 폴백한다', () => {
    const dialogue = buildNpcDialogueData({ id: '', name: '   ', role: '' });

    expect(dialogue.speakerName).toBe('알 수 없는 NPC');
    expect(dialogue.choices).toHaveLength(1);
    expect(dialogue.choices?.[0].disabled).toBe(false);
  });
});
