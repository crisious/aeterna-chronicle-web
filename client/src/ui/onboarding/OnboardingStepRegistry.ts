/**
 * 온보딩 코치마크 레지스트리 — Stub
 *
 * 역할: 첫 30분 동안 노출될 코치마크 SSOT.
 * 한 화면 1개념 원칙 — phase 안에서 system이 겹치지 않도록 정렬.
 *
 * 본 파일은 스펙 골격만. 실제 카피·하이라이트 좌표는 development 단계에서
 * 가춘운(CMO/디자인) + 진채봉(Editor) 인계 후 채운다.
 */

import type { CoachmarkSpec, OnboardingPhaseId, CoreSystemId } from './types';

/**
 * 코치마크 정의 — 단계 순서대로 큐잉된다.
 *
 * NOTE: 본 stub의 title/body는 placeholder. 카피 SSOT는
 *   `docs/release/onboarding-error-messages.md` (예정)에 옮긴다.
 */
export const ONBOARDING_COACHMARKS: readonly CoachmarkSpec[] = [
  // ─── 오프닝 시네마틱 ──────────────────────────────────────
  {
    id: 'opening.welcome',
    system: 'movement', // dummy — 시네마틱은 학습 가산 안 함
    phase: 'opening_cinematic',
    title: '__TBD_opening_title__',
    body: '__TBD_opening_body__',
    advanceOn: { kind: 'click' },
    skippable: true,
    replayable: true,
  },

  // ─── 각성 — 이동 학습 ─────────────────────────────────────
  {
    id: 'movement.wasd',
    system: 'movement',
    phase: 'awakening_movement',
    title: '__TBD_move_wasd_title__',
    body: '__TBD_move_wasd_body__',
    advanceOn: { kind: 'event', event: 'player:moved:5tiles' },
    skippable: false,
    replayable: true,
  },

  // ─── 첫 NPC 대화 ─────────────────────────────────────────
  {
    id: 'dialogue.start',
    system: 'dialogue',
    phase: 'first_dialogue',
    title: '__TBD_dialogue_title__',
    body: '__TBD_dialogue_body__',
    advanceOn: { kind: 'event', event: 'dialogue:choice:made' },
    skippable: false,
    replayable: true,
  },

  // ─── 첫 전투 — ATB 게이지 ──────────────────────────────────
  {
    id: 'combat.atb_gauge',
    system: 'combat',
    phase: 'first_battle',
    title: '__TBD_atb_title__',
    body: '__TBD_atb_body__',
    advanceOn: { kind: 'event', event: 'battle:atb:filled' },
    skippable: false,
    replayable: true,
  },
  {
    id: 'combat.basic_attack',
    system: 'combat',
    phase: 'first_battle',
    title: '__TBD_atk_title__',
    body: '__TBD_atk_body__',
    advanceOn: { kind: 'event', event: 'battle:basic_attack:landed' },
    skippable: false,
    replayable: true,
  },

  // ─── 스킬 해금 ───────────────────────────────────────────
  {
    id: 'skill.priority',
    system: 'skill',
    phase: 'skill_unlock',
    title: '__TBD_skill_title__',
    body: '__TBD_skill_body__',
    advanceOn: { kind: 'event', event: 'skill:cast:succeeded' },
    skippable: false,
    replayable: true,
  },

  // ─── 아이템 사용 ─────────────────────────────────────────
  {
    id: 'item.consume',
    system: 'skill', // 스킬 우선순위 응용 — 별도 시스템으로 분리하지 않음
    phase: 'item_use',
    title: '__TBD_item_title__',
    body: '__TBD_item_body__',
    advanceOn: { kind: 'event', event: 'item:consumed' },
    skippable: true,
    replayable: true,
  },

  // ─── 세이브 포인트 ───────────────────────────────────────
  {
    id: 'save.first',
    system: 'save',
    phase: 'first_save',
    title: '__TBD_save_title__',
    body: '__TBD_save_body__',
    advanceOn: { kind: 'event', event: 'save:committed' },
    skippable: false,
    replayable: true,
  },

  // ─── 첫 보스 — 종합 응용 ───────────────────────────────────
  {
    id: 'boss.intro',
    system: 'combat',
    phase: 'first_boss',
    title: '__TBD_boss_title__',
    body: '__TBD_boss_body__',
    advanceOn: { kind: 'auto', delayMs: 4000 },
    skippable: true,
    replayable: true,
  },

  // ─── 완료 ────────────────────────────────────────────────
  {
    id: 'completion.farewell',
    system: 'movement', // dummy
    phase: 'completion',
    title: '__TBD_done_title__',
    body: '__TBD_done_body__',
    advanceOn: { kind: 'click' },
    skippable: false,
    replayable: false,
  },
] as const;

// ─── 조회 유틸 ─────────────────────────────────────────────

/**
 * phase 안의 코치마크만 추출.
 * 구현 단계에서 director가 phase 진입 시 호출한다.
 */
export function coachmarksForPhase(phase: OnboardingPhaseId): readonly CoachmarkSpec[] {
  // STUB: 구현 단계에서 캐싱·정렬 추가 가능
  return ONBOARDING_COACHMARKS.filter((c) => c.phase === phase);
}

/**
 * 시스템에 결속된 코치마크 — 재시청 메뉴에서 사용.
 */
export function coachmarksForSystem(system: CoreSystemId): readonly CoachmarkSpec[] {
  // STUB
  return ONBOARDING_COACHMARKS.filter((c) => c.system === system);
}

/**
 * 학습 가산 대상 코치마크인지 — 시네마틱·완료 화면은 제외.
 */
export function isLearningCoachmark(spec: CoachmarkSpec): boolean {
  // STUB: 현재 phase 기반 판정 — 구현 단계에서 명시 플래그로 전환 가능
  return spec.phase !== 'opening_cinematic' && spec.phase !== 'completion';
}
