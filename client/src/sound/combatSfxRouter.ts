/**
 * combatSfxRouter — 전투 이벤트 → SFX 디스패처
 *
 * 단계: Build (구현 완료)
 * 책임:
 *   1) 스킬 발동 / 타격 / 회피 / 크리티컬 / 가드 / 사망 이벤트 → SFX 키 변환
 *   2) 무기 종류·속성·재질에 따른 변형 (랜덤 detune·rate)
 *   3) 핵심 이벤트 100% 커버 검증
 */

import type { SoundManager } from './SoundManager';

// ─── 전투 이벤트 종류 ──────────────────────────────────────────
export type CombatEventKind =
  | 'skill_cast'
  | 'skill_hit'
  | 'skill_ultimate'
  | 'attack_swing'
  | 'attack_hit'
  | 'attack_miss'
  | 'dodge'
  | 'guard_block'
  | 'guard_break'
  | 'critical'
  | 'buff_apply'
  | 'debuff_apply'
  | 'enemy_death'
  | 'player_death'
  | 'revive'
  | 'memory_summon'
  | 'memory_resonance';

export const ALL_COMBAT_EVENTS: ReadonlyArray<CombatEventKind> = [
  'skill_cast', 'skill_hit', 'skill_ultimate',
  'attack_swing', 'attack_hit', 'attack_miss',
  'dodge', 'guard_block', 'guard_break', 'critical',
  'buff_apply', 'debuff_apply',
  'enemy_death', 'player_death', 'revive',
  'memory_summon', 'memory_resonance',
];

export type WeaponKind = 'sword' | 'magic' | 'arrow' | 'shadow' | 'memory';
export type MagicElement = 'fire' | 'ice' | 'lightning' | 'dark' | 'heal';
export type HitMaterial = 'flesh' | 'metal' | 'magic' | 'shield';

// ─── 이벤트 페이로드 ───────────────────────────────────────────
export interface CombatEvent {
  kind: CombatEventKind;
  weapon?: WeaponKind;
  element?: MagicElement;
  material?: HitMaterial;
  isCritical?: boolean;
  worldX?: number;
  worldY?: number;
  refId?: string;
}

export interface SfxRouteResult {
  keys: string[];
  overrides?: Array<{ volume?: number; detune?: number; rate?: number } | undefined>;
  confidence: 'exact' | 'fallback';
}

// ─── SSOT 매핑 테이블 ─────────────────────────────────────────
export const COMBAT_SFX_TABLE: Readonly<{
  attack: Record<WeaponKind, string[]>;
  hit: Record<HitMaterial, string>;
  magic: Record<MagicElement, string>;
  events: Record<CombatEventKind, string[]>;
}> = {
  attack: {
    sword: ['sfx_sword_slash_1', 'sfx_sword_slash_2', 'sfx_sword_slash_3'],
    magic: ['sfx_skill_activate'],
    arrow: ['sfx_arrow_shoot'],
    shadow: ['sfx_magic_dark'],
    memory: ['sfx_mem_memory_summon'],
  },
  hit: {
    flesh: 'sfx_hit_flesh',
    metal: 'sfx_hit_metal',
    magic: 'sfx_hit_magic',
    shield: 'sfx_guard_block',
  },
  magic: {
    fire: 'sfx_magic_fire',
    ice: 'sfx_magic_ice',
    lightning: 'sfx_magic_lightning',
    dark: 'sfx_magic_dark',
    heal: 'sfx_magic_heal',
  },
  events: {
    skill_cast: ['sfx_skill_activate', 'voice_combat_skill_cast'],
    skill_hit: ['sfx_hit_magic'],
    skill_ultimate: ['sfx_skill_ultimate', 'voice_combat_ultimate'],
    attack_swing: ['sfx_sword_slash_1'],
    attack_hit: ['sfx_hit_flesh'],
    attack_miss: ['sfx_dodge_roll'],
    dodge: ['sfx_dodge_roll', 'voice_combat_dodge'],
    guard_block: ['sfx_guard_block'],
    guard_break: ['sfx_guard_break'],
    critical: ['sfx_critical_hit', 'voice_combat_critical'],
    buff_apply: ['sfx_buff_apply'],
    debuff_apply: ['sfx_debuff_apply'],
    enemy_death: ['sfx_enemy_death'],
    player_death: ['sfx_player_death', 'voice_combat_death'],
    revive: ['sfx_revive'],
    memory_summon: ['sfx_mem_memory_summon'],
    memory_resonance: ['sfx_mem_resonance_burst'],
  },
};

const FALLBACK_SFX = 'sfx_hit_flesh';

// ─── 변형 헬퍼 ────────────────────────────────────────────────
/** 슬래시·타격용 미세 음정 변형 — 단조로움 회피 */
function randomDetune(range = 100): number {
  return (Math.random() - 0.5) * range;
}

function pickRandom<T>(arr: ReadonlyArray<T>): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ─── 라우터 ───────────────────────────────────────────────────
/**
 * 전투 이벤트 → SFX 키 집합.
 *  - attack_swing: weapon 기반 랜덤 + detune 변형
 *  - attack_hit:   material + (isCritical ? critical 합성)
 *  - skill_cast:   element 기반 magic SFX
 *  - 기타:         events 테이블 직접 참조
 */
export function resolveCombatSfx(event: CombatEvent): SfxRouteResult {
  const keys: string[] = [];
  const overrides: Array<{ volume?: number; detune?: number; rate?: number } | undefined> = [];
  let confidence: 'exact' | 'fallback' = 'exact';

  switch (event.kind) {
    case 'attack_swing': {
      const pool = COMBAT_SFX_TABLE.attack[event.weapon ?? 'sword'] ?? COMBAT_SFX_TABLE.attack.sword;
      keys.push(pickRandom(pool));
      overrides.push({ detune: randomDetune(150) });
      break;
    }

    case 'attack_hit': {
      const matKey = COMBAT_SFX_TABLE.hit[event.material ?? 'flesh'] ?? FALLBACK_SFX;
      keys.push(matKey);
      overrides.push({ detune: randomDetune(80) });
      // 크리티컬 합성
      if (event.isCritical) {
        keys.push(...COMBAT_SFX_TABLE.events.critical);
        overrides.push(undefined, undefined);
      }
      break;
    }

    case 'skill_cast': {
      // element 우선, 없으면 events.skill_cast
      if (event.element && COMBAT_SFX_TABLE.magic[event.element]) {
        keys.push(COMBAT_SFX_TABLE.magic[event.element]);
        overrides.push(undefined);
        keys.push('voice_combat_skill_cast');
        overrides.push({ volume: 0.6 });
      } else {
        for (const k of COMBAT_SFX_TABLE.events.skill_cast) {
          keys.push(k);
          overrides.push(undefined);
        }
      }
      break;
    }

    case 'skill_hit': {
      const elemKey = event.element ? COMBAT_SFX_TABLE.magic[event.element] : null;
      keys.push(elemKey ?? COMBAT_SFX_TABLE.events.skill_hit[0]);
      overrides.push({ detune: randomDetune(60) });
      if (event.isCritical) {
        keys.push(...COMBAT_SFX_TABLE.events.critical);
        overrides.push(undefined, undefined);
      }
      break;
    }

    default: {
      const list = COMBAT_SFX_TABLE.events[event.kind];
      if (list && list.length > 0) {
        for (const k of list) {
          keys.push(k);
          overrides.push(undefined);
        }
      } else {
        keys.push(FALLBACK_SFX);
        overrides.push(undefined);
        confidence = 'fallback';
        reportFallback('sfx.route.fallback', event);
      }
      break;
    }
  }

  if (keys.length === 0) {
    keys.push(FALLBACK_SFX);
    overrides.push(undefined);
    confidence = 'fallback';
    reportFallback('sfx.route.fallback', event);
  }

  return { keys, overrides, confidence };
}

/** 결정된 SFX 집합을 SoundManager에 송출 (위치 정보 있으면 3D 재생) */
export function applyCombatSfx(
  sm: SoundManager,
  route: SfxRouteResult,
  pos?: { x: number; y: number },
): void {
  for (let i = 0; i < route.keys.length; i++) {
    const key = route.keys[i];
    const override = route.overrides?.[i];
    if (pos) {
      sm.playSfxAt(key, pos.x, pos.y);
    } else {
      sm.playSfx(key, override);
    }
  }
}

/** 한 줄 헬퍼 */
export function dispatchCombat(sm: SoundManager, event: CombatEvent): SfxRouteResult {
  const route = resolveCombatSfx(event);
  const pos = event.worldX !== undefined && event.worldY !== undefined
    ? { x: event.worldX, y: event.worldY }
    : undefined;
  applyCombatSfx(sm, route, pos);
  return route;
}

// ─── 커버리지 ─────────────────────────────────────────────────
export interface SfxCoverageReport {
  totalEvents: number;
  coveredEvents: number;
  missing: CombatEventKind[];
  coveragePct: number;
}

export function auditCombatSfxCoverage(): SfxCoverageReport {
  const missing: CombatEventKind[] = [];
  let covered = 0;

  for (const kind of ALL_COMBAT_EVENTS) {
    const list = COMBAT_SFX_TABLE.events[kind];
    if (list && list.length > 0) {
      covered++;
    } else {
      missing.push(kind);
    }
  }

  return {
    totalEvents: ALL_COMBAT_EVENTS.length,
    coveredEvents: covered,
    missing,
    coveragePct: ALL_COMBAT_EVENTS.length === 0 ? 0 : (covered / ALL_COMBAT_EVENTS.length) * 100,
  };
}

// ─── 텔레메트리 ───────────────────────────────────────────────
function reportFallback(channel: string, payload: unknown): void {
  try {
    const w = typeof window !== 'undefined' ? (window as { __aeterna_telemetry?: { warn?: (c: string, p: unknown) => void } }) : null;
    if (w?.__aeterna_telemetry?.warn) {
      w.__aeterna_telemetry.warn(channel, payload);
    } else {
      console.warn(`[${channel}]`, payload);
    }
  } catch {
    // 텔레메트리 실패는 무시
  }
}
