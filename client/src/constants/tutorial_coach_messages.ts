// ── 첫 30분 튜토리얼·온보딩 코칭/에러 카피 SSOT ─────────────────
// 출처: docs/release/tutorial-onboarding-error-messages.md (1차 SSOT)
// 키 규약: coach.<gate>.<state>.<reason>
// 톤 5계명: 한 화면 1개념 · 권유형 · 수치는 사실 · 시는 hint만 · 도메인 키 규약
// 본 파일은 SSOT의 단방향 미러 — 코드 → 문서 역방향 갱신 금지.

export const COACH_GATE_STATE = {
  PASS: 0,
  BLOCK: 1,
  WARN: 2,
  ERROR: 3,
} as const;

export type CoachGate = 'move' | 'dialog' | 'battle' | 'skill' | 'save';
export type CoachState = keyof typeof COACH_GATE_STATE;
export type CoachExitCode = (typeof COACH_GATE_STATE)[CoachState];

export const COACH_GATES: readonly CoachGate[] = [
  'move',
  'dialog',
  'battle',
  'skill',
  'save',
] as const;

/** 게이트별 학습 약속 — user-guide.md §2 미러 */
export const COACH_GATE_BUDGET: Record<
  CoachGate,
  { triggerSec: number; passSec: number; warnRetries: number }
> = {
  move: { triggerSec: 30, passSec: 5, warnRetries: 3 },
  dialog: { triggerSec: 240, passSec: 10, warnRetries: 3 },
  battle: { triggerSec: 420, passSec: 60, warnRetries: 3 },
  skill: { triggerSec: 840, passSec: 90, warnRetries: 3 },
  save: { triggerSec: 1080, passSec: 30, warnRetries: 3 },
};

/** 30분 한도(초) — 초과 시 다음 회차 보스 HP 5% 자동 인하 트리거 */
export const TUTORIAL_TOTAL_BUDGET_SEC = 30 * 60;
export const TUTORIAL_OVERTIME_THRESHOLD_SEC = 32 * 60;

export interface CoachMessage {
  key: string;
  state: CoachState;
  message: { ko: string; en: string };
  hint?: { ko: string; en: string };
  exitCode: CoachExitCode;
}

// ─────────────────────────────────────────────────────────────────
// 24개 슬롯 — verify:tutorial-copy 가 누락 1개라도 있으면 BLOCK
// (5종 게이트 × 4 상태 = 20 + 보조 4)
// ─────────────────────────────────────────────────────────────────

export const COACH_MESSAGES: Readonly<Record<string, CoachMessage>> = {
  // 1. move ─────────────────────────────────────────
  'coach.move.pass.arrived': {
    key: 'coach.move.pass.arrived',
    state: 'PASS',
    exitCode: 0,
    message: {
      ko: '🟢 한 발 떼셨사옵니다. 이대로 NPC에게 가시지요.',
      en: '🟢 You moved. Now approach the NPC.',
    },
    hint: { ko: '걸음이 가벼우시옵니다 — 곡조가 맞사옵니다.', en: '' },
  },
  'coach.move.block.idle': {
    key: 'coach.move.block.idle',
    state: 'BLOCK',
    exitCode: 1,
    message: {
      ko: '🔴 5초 동안 한 걸음도 떼지 않으셨사옵니다. WASD 또는 방향키로 움직여 보소서.',
      en: '🔴 No movement detected for 5s. Press WASD or arrow keys to move.',
    },
    hint: { ko: '그저 한 발이면 충분하옵니다.', en: '' },
  },
  'coach.move.warn.retry': {
    key: 'coach.move.warn.retry',
    state: 'WARN',
    exitCode: 2,
    message: {
      ko: '🟡 세 번째 시도이옵니다. 손가락이 닿는 자리를 확인해 보소서 (W/A/S/D · ←↑↓→).',
      en: '🟡 Third attempt. Check your key bindings (W/A/S/D or arrow keys).',
    },
    hint: { ko: '[설정 → 키 매핑] 확인을 권하옵니다.', en: '' },
  },
  'coach.move.error.input_dropped': {
    key: 'coach.move.error.input_dropped',
    state: 'ERROR',
    exitCode: 3,
    message: {
      ko: '🟠 입력이 닿지 않사옵니다. 페이지를 새로고침해 주옵소서. (오류 코드: MOVE-{code})',
      en: '🟠 Input not received. Please refresh the page. (Error code: MOVE-{code})',
    },
    hint: {
      ko: '포커스가 다른 창에 있을 수 있사옵니다 — 게임 화면을 한 번 클릭하소서.',
      en: '',
    },
  },

  // 2. dialog ──────────────────────────────────────
  'coach.dialog.pass.chosen': {
    key: 'coach.dialog.pass.chosen',
    state: 'PASS',
    exitCode: 0,
    message: {
      ko: '🟢 선택지를 고르셨사옵니다. 마음을 보이는 것이 첫 곡조이옵니다.',
      en: '🟢 Choice made. Speaking your mind is the first verse.',
    },
    hint: { ko: '그대의 답이 이야기를 갈래로 나누옵니다.', en: '' },
  },
  'coach.dialog.block.no_choice': {
    key: 'coach.dialog.block.no_choice',
    state: 'BLOCK',
    exitCode: 1,
    message: {
      ko: '🔴 10초가 흘렀사옵니다. [예] 또는 [아니오] 중 한 가닥을 골라 주옵소서.',
      en: '🔴 10s elapsed. Please choose [Yes] or [No].',
    },
    hint: { ko: '어느 답이든 이야기는 흘러가옵니다.', en: '' },
  },
  'coach.dialog.warn.skipped': {
    key: 'coach.dialog.warn.skipped',
    state: 'WARN',
    exitCode: 2,
    message: {
      ko: '🟡 대사를 너무 빨리 넘기시옵니다. 한 박자 쉬셔도 좋사옵니다.',
      en: '🟡 Dialog being skipped quickly. Feel free to slow down.',
    },
    hint: { ko: '[설정 → 텍스트 속도]에서 호흡을 조절할 수 있사옵니다.', en: '' },
  },
  'coach.dialog.error.npc_missing': {
    key: 'coach.dialog.error.npc_missing',
    state: 'ERROR',
    exitCode: 3,
    message: {
      ko: '🟠 대화 상대를 찾지 못하옵니다. 한 화면 뒤로 물러서 다시 시도해 주옵소서. (오류 코드: DIALOG-{code})',
      en: '🟠 NPC not found. Please retreat one screen and retry. (Error code: DIALOG-{code})',
    },
    hint: { ko: '', en: '' },
  },

  // 3. battle ──────────────────────────────────────
  'coach.battle.pass.first_kill': {
    key: 'coach.battle.pass.first_kill',
    state: 'PASS',
    exitCode: 0,
    message: {
      ko: '🟢 첫 매듭을 푸셨사옵니다 — ATB 게이지의 곡조를 익히셨사옵니다.',
      en: "🟢 First foe vanquished — you've grasped the ATB rhythm.",
    },
    hint: { ko: '+1 EXP · +5 골드 · +1 회복약을 받으시옵소서.', en: '' },
  },
  'coach.battle.block.atb_idle': {
    key: 'coach.battle.block.atb_idle',
    state: 'BLOCK',
    exitCode: 1,
    message: {
      ko: '🔴 ATB 게이지가 가득 찼사옵니다. [공격] 버튼을 눌러 한 호흡 떼어 주옵소서.',
      en: '🔴 ATB gauge is full. Press [Attack] to act.',
    },
    hint: {
      ko: '게이지가 꽉 차도 누르지 않으시면 슬라임이 먼저 움직이옵니다.',
      en: '',
    },
  },
  'coach.battle.warn.three_misses': {
    key: 'coach.battle.warn.three_misses',
    state: 'WARN',
    exitCode: 2,
    message: {
      ko: '🟡 세 번 헛치셨사옵니다. 슬라임의 ATB도 차오르고 있사오니 마음을 가다듬으소서.',
      en: "🟡 Three misses. The slime's ATB is also charging — steady yourself.",
    },
    hint: {
      ko: '기본 공격은 빗나가지 않사옵니다 — 버튼이 눌렸는지 확인하소서.',
      en: '',
    },
  },
  'coach.battle.error.atb_stuck': {
    key: 'coach.battle.error.atb_stuck',
    state: 'ERROR',
    exitCode: 3,
    message: {
      ko: '🟠 ATB 게이지가 멎었사옵니다. 자동 부활 후 다시 진입하옵니다. (오류 코드: BATTLE-{code})',
      en: '🟠 ATB gauge stalled. Auto-revive and re-enter. (Error code: BATTLE-{code})',
    },
    hint: { ko: '', en: '' },
  },

  // 4. skill ───────────────────────────────────────
  'coach.skill.pass.first_use': {
    key: 'coach.skill.pass.first_use',
    state: 'PASS',
    exitCode: 0,
    message: {
      ko: '🟢 「기억의 일격」을 펼치셨사옵니다. MP 5를 쓰시고 한 호흡 쉬소서 (쿨다운 1턴).',
      en: '🟢 You unleashed [Memory Strike]. MP 5 spent — rest one turn (cooldown).',
    },
    hint: { ko: '쿨다운은 다음 ATB 차오를 때 풀리옵니다.', en: '' },
  },
  'coach.skill.block.no_mp': {
    key: 'coach.skill.block.no_mp',
    state: 'BLOCK',
    exitCode: 1,
    message: {
      ko: '🔴 MP가 모자라옵니다 ({mp}/5). 기본 공격으로 한 매듭 더 푸시지요.',
      en: '🔴 Insufficient MP ({mp}/5). Use a basic attack first.',
    },
    hint: {
      ko: 'MP가 ½ 미만일 땐 기본 공격이 곡조에 맞사옵니다 — 우선순위 1번 규칙이옵니다.',
      en: '',
    },
  },
  'coach.skill.warn.idle': {
    key: 'coach.skill.warn.idle',
    state: 'WARN',
    exitCode: 2,
    message: {
      ko: '🟡 30초 동안 스킬을 한 번도 쓰지 않으셨사옵니다. ATB 100% 일 때 [스킬] 버튼이 빛나옵니다.',
      en: '🟡 No skill used in 30s. The [Skill] button glows at ATB 100%.',
    },
    hint: { ko: '스킬은 큰 한 방이옵니다 — 보스 P2에서 빛을 발하옵니다.', en: '' },
  },
  'coach.skill.error.mp_negative': {
    key: 'coach.skill.error.mp_negative',
    state: 'ERROR',
    exitCode: 3,
    message: {
      ko: '🟠 MP 값이 비정상이옵니다. 자동 보정 후 재시도해 주옵소서. (오류 코드: SKILL-{code})',
      en: '🟠 MP value abnormal. Auto-correcting — please retry. (Error code: SKILL-{code})',
    },
    hint: { ko: '', en: '' },
  },

  // 5. save ────────────────────────────────────────
  'coach.save.pass.slot_saved': {
    key: 'coach.save.pass.slot_saved',
    state: 'PASS',
    exitCode: 0,
    message: {
      ko: '🟢 Slot {n}에 한 자락 새기셨사옵니다. 언제든 이 자리로 되돌아오실 수 있사옵니다.',
      en: '🟢 Saved to Slot {n}. You may return here anytime.',
    },
    hint: { ko: '자동 세이브는 챕터 진입·보스 처치·30분마다 갱신되옵니다.', en: '' },
  },
  'coach.save.block.must_save_first': {
    key: 'coach.save.block.must_save_first',
    state: 'BLOCK',
    exitCode: 1,
    message: {
      ko: '🔴 첫 세이브를 마치셔야 다음 길이 열리옵니다. Slot 1을 한 번만 눌러 주옵소서.',
      en: '🔴 First save required to proceed. Click Slot 1 once.',
    },
    hint: { ko: '세이브는 그대의 발자국을 남기는 일이옵니다.', en: '' },
  },
  'coach.save.warn.menu_dwell': {
    key: 'coach.save.warn.menu_dwell',
    state: 'WARN',
    exitCode: 2,
    message: {
      ko: '🟡 세이브 화면에 30초 머무셨사옵니다. Slot 1을 누르시면 곧 다음 비트로 넘어가옵니다.',
      en: '🟡 30s in save menu. Click Slot 1 to proceed.',
    },
    hint: { ko: '세 슬롯 모두 비어 있어 어느 자리든 무방하옵니다.', en: '' },
  },
  'coach.save.error.localstorage_full': {
    key: 'coach.save.error.localstorage_full',
    state: 'ERROR',
    exitCode: 3,
    message: {
      ko: '🟠 저장 공간이 부족하옵니다. 브라우저 저장소를 한 번 비워 주옵소서. (오류 코드: SAVE-{code})',
      en: '🟠 Storage full. Please clear browser storage. (Error code: SAVE-{code})',
    },
    hint: {
      ko: '[설정 → 데이터 관리]에서 옛 슬롯을 정리하실 수 있사옵니다.',
      en: '',
    },
  },

  // 보조 4 — 시네마틱·보스·결말·30분 초과 ────────────
  'coach.cinematic.skip.confirm': {
    key: 'coach.cinematic.skip.confirm',
    state: 'PASS',
    exitCode: 0,
    message: {
      ko: '🟢 시네마틱을 스킵하셨사옵니다. 메인 메뉴 → [도움말 → 시네마틱 갤러리]에서 다시 보실 수 있사옵니다.',
      en: '🟢 Cinematic skipped. Replay anytime via Main Menu → [Help → Cinematic Gallery].',
    },
    hint: { ko: '한 번 본 곡조도 두 번 들으면 결이 다르옵니다.', en: '' },
  },
  'coach.boss.phase2.enter': {
    key: 'coach.boss.phase2.enter',
    state: 'WARN',
    exitCode: 2,
    message: {
      ko: '⚠️ 「망각의 잔영」이 광역기를 펼치려 하옵니다. [아이템] 버튼이 빛나오니 회복약을 쓰소서.',
      en: '⚠️ [Echo of Oblivion] readies an AoE. The [Item] button glows — use a potion.',
    },
    hint: { ko: '이것이 5종 학습의 마지막 매듭이옵니다.', en: '' },
  },
  'coach.boss.victory': {
    key: 'coach.boss.victory',
    state: 'PASS',
    exitCode: 0,
    message: {
      ko: '🟢 첫 매듭을 모두 풀으셨사옵니다 — 이동·대화·전투·스킬·세이브, 다섯 곡조를 익히셨사옵니다.',
      en: '🟢 All five threads woven — movement, dialog, battle, skill, save.',
    },
    hint: { ko: '이제 본편 에레보스의 길이 열리옵니다. 자유로이 거니소서.', en: '' },
  },
  'coach.tutorial.overtime': {
    key: 'coach.tutorial.overtime',
    state: 'WARN',
    exitCode: 2,
    message: {
      ko: '🟡 누적 시간이 32분을 넘었사옵니다. 다음 회차에서 보스 HP를 5% 낮추겠사옵니다.',
      en: '🟡 Tutorial duration exceeded 32min. Boss HP will be reduced 5% next session.',
    },
    hint: { ko: '이는 정경패 Reviewer의 자동 조정 룰이옵니다.', en: '' },
  },
};

/** 검증 — 24슬롯 (5×4 + 4 보조) 누락 시 빌드 BLOCK 진단용 */
export const COACH_REQUIRED_KEYS: readonly string[] = [
  'coach.move.pass.arrived',
  'coach.move.block.idle',
  'coach.move.warn.retry',
  'coach.move.error.input_dropped',
  'coach.dialog.pass.chosen',
  'coach.dialog.block.no_choice',
  'coach.dialog.warn.skipped',
  'coach.dialog.error.npc_missing',
  'coach.battle.pass.first_kill',
  'coach.battle.block.atb_idle',
  'coach.battle.warn.three_misses',
  'coach.battle.error.atb_stuck',
  'coach.skill.pass.first_use',
  'coach.skill.block.no_mp',
  'coach.skill.warn.idle',
  'coach.skill.error.mp_negative',
  'coach.save.pass.slot_saved',
  'coach.save.block.must_save_first',
  'coach.save.warn.menu_dwell',
  'coach.save.error.localstorage_full',
  'coach.cinematic.skip.confirm',
  'coach.boss.phase2.enter',
  'coach.boss.victory',
  'coach.tutorial.overtime',
] as const;

export function assertCoachMessagesComplete(): void {
  const missing = COACH_REQUIRED_KEYS.filter((k) => !COACH_MESSAGES[k]);
  if (missing.length > 0) {
    throw new Error(
      `[coach] SSOT 누락 ${missing.length}개 슬롯 — verify:tutorial-copy BLOCK: ${missing.join(', ')}`,
    );
  }
}

/** {key} 형식 파라미터 치환 — i18nManager와 동일 규약 */
export function formatCoachMessage(
  key: string,
  locale: 'ko' | 'en',
  params?: Record<string, string | number>,
): string {
  const msg = COACH_MESSAGES[key];
  if (!msg) return key;
  let text = msg.message[locale] || msg.message.ko;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    }
  }
  return text;
}
