/**
 * damageTypeNarration.ts — 데미지 속성(element) narration (SSOT wiring)
 *
 * BattleScene 데미지 팝업이 SCENARIO_DAMAGE_TYPE_NARRATIVES SSOT 의
 * label/popupColor 를 단일 출처로 사용해 속성 태그를 표시하도록 조립한다.
 *
 * 게임 스킬 element 어휘(자유 문자열, ~16종)를 SSOT 6 DamageElement 에 매핑하는
 * 책임은 표현 레이어(이 모듈)에 둔다. 순수 모듈 (Phaser/DOM 비의존) → 단위 테스트 가능.
 */
import {
  getDamageTypeNarrative,
  type DamageElement,
  type DamageTypeNarrative,
} from '../../../shared/types/scenarioRegistry';

/**
 * 게임 스킬 element 어휘 → SSOT 6 DamageElement.
 *
 * 매핑 근거:
 * - 직접 일치: physical/fire/ice/lightning/shadow/holy
 * - in-game tint 실측: chrono(0x6fd3ff cyan)≈ice, dark(0xc8a2ff purple)≈shadow
 * - 주제 근접: water→ice, wind→lightning, light→holy, poison→shadow, earth→physical
 * - 무속성/기본: neutral/aether/beast/arcane/time → physical (특정 속성 없음 → 태그 미표시)
 */
export const GAME_ELEMENT_TO_DAMAGE_ELEMENT: Record<string, DamageElement> = {
  // baseline (태그 미표시)
  physical: 'physical',
  neutral: 'physical',
  aether: 'physical',
  earth: 'physical',
  beast: 'physical',
  arcane: 'physical',
  time: 'physical',
  memory: 'physical',
  // fire
  fire: 'fire',
  // ice
  ice: 'ice',
  water: 'ice',
  chrono: 'ice',
  // lightning
  lightning: 'lightning',
  wind: 'lightning',
  // shadow
  shadow: 'shadow',
  dark: 'shadow',
  poison: 'shadow',
  void: 'shadow',
  psychic: 'shadow',
  // holy
  holy: 'holy',
  light: 'holy',
  nature: 'holy',
};

/** 속성 태그 이모지 (표현 레이어 — SSOT 외). physical 은 무태그. */
export const DAMAGE_ELEMENT_EMOJI: Record<DamageElement, string> = {
  physical: '',
  fire: '🔥',
  ice: '❄',
  lightning: '⚡',
  shadow: '🌑',
  holy: '✨',
};

/** 태그를 표시하지 않는 element (기본/무속성 — 무가시 보존) */
const UNTAGGED: ReadonlySet<DamageElement> = new Set<DamageElement>(['physical']);

/** 게임 element 문자열 → SSOT DamageElement (미정의/빈값 시 physical fallback) */
export function resolveDamageElement(raw: string | undefined | null): DamageElement {
  if (!raw) {
    return 'physical';
  }
  return GAME_ELEMENT_TO_DAMAGE_ELEMENT[raw] ?? 'physical';
}

/** element → SSOT narrative (라벨/색/flavor 단일 출처) */
export function getDamageTypeNarrativeFor(
  raw: string | undefined | null,
): DamageTypeNarrative | undefined {
  return getDamageTypeNarrative(resolveDamageElement(raw));
}

/** element → 팝업 색 (#hex, SSOT popupColor 단일 출처, 미정의 시 흰색) */
export function getDamageTypePopupColor(raw: string | undefined | null): string {
  return getDamageTypeNarrativeFor(raw)?.popupColor ?? '#ffffff';
}

/** element → 라벨 (SSOT label 단일 출처) */
export function getDamageTypeLabel(raw: string | undefined | null): string {
  return getDamageTypeNarrativeFor(raw)?.label ?? '';
}

/**
 * element → 속성 태그 문자열 "{emoji} {label}".
 * 기본/무속성(physical 로 귀결되는 neutral/aether/earth/beast…)은 빈 문자열을 반환해
 * 기존 데미지 팝업 외관을 보존한다(무가시 보존). 속성 스킬만 태그가 붙는다.
 */
export function formatDamageTypeTag(raw: string | undefined | null): string {
  const el = resolveDamageElement(raw);
  if (UNTAGGED.has(el)) {
    return '';
  }
  const label = getDamageTypeLabel(raw);
  const emoji = DAMAGE_ELEMENT_EMOJI[el];
  return emoji ? `${emoji} ${label}` : label;
}
