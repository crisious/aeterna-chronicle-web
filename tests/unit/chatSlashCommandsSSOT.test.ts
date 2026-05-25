/**
 * 유닛 테스트 — SYNC-246: SCENARIO_CHAT_SLASH_COMMANDS SSOT
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_CHAT_SLASH_COMMANDS,
  getChatSlashCommandNarrative,
  listChatSlashCommands,
  type ChatSlashCommand,
} from '../../shared/types/scenarioRegistry';

const ALL: readonly ChatSlashCommand[] = ['/help', '/who', '/party', '/guild', '/whisper', '/report'];

describe('SCENARIO_CHAT_SLASH_COMMANDS', () => {
  test('6 명령 모두 정의', () => {
    expect(SCENARIO_CHAT_SLASH_COMMANDS.length).toBe(6);
    for (const c of ALL) {
      expect(getChatSlashCommandNarrative(c), c).toBeDefined();
    }
  });

  test('명령은 모두 / 로 시작', () => {
    for (const c of SCENARIO_CHAT_SLASH_COMMANDS) {
      expect(c.command.startsWith('/'), c.command).toBe(true);
    }
  });

  test('argCount 0~2 범위', () => {
    for (const c of SCENARIO_CHAT_SLASH_COMMANDS) {
      expect(c.argCount, c.command).toBeGreaterThanOrEqual(0);
      expect(c.argCount, c.command).toBeLessThanOrEqual(2);
    }
  });

  test('usage 는 command 로 시작', () => {
    for (const c of SCENARIO_CHAT_SLASH_COMMANDS) {
      expect(c.usage.startsWith(c.command), `${c.command}:${c.usage}`).toBe(true);
    }
  });

  test('command 중복 없음', () => {
    const ks = SCENARIO_CHAT_SLASH_COMMANDS.map((c) => c.command);
    expect(new Set(ks).size).toBe(ks.length);
  });

  test('listChatSlashCommands 6 항목', () => {
    expect(listChatSlashCommands().length).toBe(6);
  });
});
