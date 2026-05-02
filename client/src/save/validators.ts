/**
 * Save System — Load-time Validators
 *
 * 책임: 마이그레이션·체크섬 통과 후, 도메인 일관성 검증.
 *   - 누락 필드 기본값 주입
 *   - 참조 끊김 탐지
 *   - 범위 위반 보정
 *
 * 정책:
 *   - 치명 위반(파티 0명·필수 필드 부재)은 VALIDATION_FAILED — 로드 거부.
 *   - 경미 위반(누락·범위 클램프)은 자동 보정 후 경고 누적 → 텔레메트리.
 */

import type {
  SavePayloadV2,
  SaveResult,
} from './types';
import {
  DEFAULT_PARTY,
  DEFAULT_INVENTORY,
  DEFAULT_SCENARIO,
  DEFAULT_MAP,
} from './schema';

// ─── 검증 결과 ───────────────────────────────────────────────────────────
export interface ValidationReport {
  warnings: ValidationIssue[];
  errors: ValidationIssue[];
}

export interface ValidationIssue {
  domain: 'party' | 'inventory' | 'scenario' | 'map';
  path: string;
  kind:
    | 'MISSING_FIELD'
    | 'OUT_OF_RANGE'
    | 'BROKEN_REFERENCE'
    | 'TYPE_MISMATCH'
    | 'EMPTY_REQUIRED';
  detail?: string;
}

// ─── 정책 상수 ───────────────────────────────────────────────────────────
const LEVEL_MIN = 1;
const LEVEL_MAX = 99;
const PARTY_MIN_MEMBERS = 1;
const PARTY_MAX_MEMBERS = 4;
const KNOWN_CHAPTERS = new Set(['ch1', 'ch2', 'ch3', 'ch4', 'ch5', 'ch6', 'ch7', 'ch8']);
const KNOWN_CLASS_IDS = new Set([
  'ether_knight',
  'memorist',
  'shadow_weaver',
  'memory_breaker',
  'time_keeper',
  'void_wanderer',
]);

// ─── 작은 헬퍼 ──────────────────────────────────────────────────────────
function clamp(n: number, lo: number, hi: number): number {
  if (n < lo) return lo;
  if (n > hi) return hi;
  return n;
}

function pushWarn(
  rep: ValidationReport,
  domain: ValidationIssue['domain'],
  path: string,
  kind: ValidationIssue['kind'],
  detail?: string,
): void {
  rep.warnings.push({ domain, path, kind, detail });
}

function pushErr(
  rep: ValidationReport,
  domain: ValidationIssue['domain'],
  path: string,
  kind: ValidationIssue['kind'],
  detail?: string,
): void {
  rep.errors.push({ domain, path, kind, detail });
}

// ─── 도메인별 검증 (보정은 in-place) ────────────────────────────────────
export function validateParty(payload: SavePayloadV2): ValidationReport {
  const rep: ValidationReport = { warnings: [], errors: [] };
  const party = payload.party;

  if (!party || !Array.isArray(party.members)) {
    pushErr(rep, 'party', 'party.members', 'MISSING_FIELD', '파티 데이터 부재');
    payload.party = { ...DEFAULT_PARTY, members: [] };
    return rep;
  }

  if (party.members.length < PARTY_MIN_MEMBERS) {
    pushErr(rep, 'party', 'party.members', 'EMPTY_REQUIRED', '파티 구성원이 비었습니다');
    return rep;
  }

  if (party.members.length > PARTY_MAX_MEMBERS) {
    pushWarn(rep, 'party', 'party.members', 'OUT_OF_RANGE', `4명 초과 — 초과분 절단`);
    party.members = party.members.slice(0, PARTY_MAX_MEMBERS);
  }

  for (let i = 0; i < party.members.length; i++) {
    const m = party.members[i];
    const base = `party.members[${i}]`;

    if (!KNOWN_CLASS_IDS.has(m.classId)) {
      pushErr(rep, 'party', `${base}.classId`, 'BROKEN_REFERENCE', `미지의 classId: ${m.classId}`);
    }
    if (m.level < LEVEL_MIN || m.level > LEVEL_MAX) {
      pushWarn(rep, 'party', `${base}.level`, 'OUT_OF_RANGE');
      m.level = clamp(m.level, LEVEL_MIN, LEVEL_MAX);
    }
    if (m.exp < 0) {
      pushWarn(rep, 'party', `${base}.exp`, 'OUT_OF_RANGE');
      m.exp = 0;
    }
    if (m.hp < 0) {
      pushWarn(rep, 'party', `${base}.hp`, 'OUT_OF_RANGE');
      m.hp = 0;
    }
    if (m.mp < 0) {
      pushWarn(rep, 'party', `${base}.mp`, 'OUT_OF_RANGE');
      m.mp = 0;
    }
    // 학습 스킬 — 빈 문자열·중복 정리
    const seen = new Set<string>();
    const cleaned: string[] = [];
    for (const sid of m.learnedSkillIds) {
      if (typeof sid !== 'string' || sid.length === 0) {
        pushWarn(rep, 'party', `${base}.learnedSkillIds`, 'TYPE_MISMATCH');
        continue;
      }
      if (seen.has(sid)) continue;
      seen.add(sid);
      cleaned.push(sid);
    }
    if (cleaned.length !== m.learnedSkillIds.length) {
      m.learnedSkillIds = cleaned;
    }
  }

  // leadIndex 범위
  if (party.leadIndex < 0 || party.leadIndex >= party.members.length) {
    pushWarn(rep, 'party', 'party.leadIndex', 'OUT_OF_RANGE');
    party.leadIndex = 0;
  }
  if (typeof party.formation !== 'string' || party.formation.length === 0) {
    pushWarn(rep, 'party', 'party.formation', 'MISSING_FIELD');
    party.formation = DEFAULT_PARTY.formation;
  }

  return rep;
}

export function validateInventory(payload: SavePayloadV2): ValidationReport {
  const rep: ValidationReport = { warnings: [], errors: [] };
  const inv = payload.inventory;

  if (!inv) {
    pushErr(rep, 'inventory', 'inventory', 'MISSING_FIELD');
    payload.inventory = { ...DEFAULT_INVENTORY };
    return rep;
  }

  if (!Array.isArray(inv.items)) {
    pushWarn(rep, 'inventory', 'inventory.items', 'MISSING_FIELD');
    inv.items = [];
  } else {
    // 음수·NaN 수량 보정 + 동일 itemId 합산
    const merged = new Map<string, number>();
    for (let i = 0; i < inv.items.length; i++) {
      const it = inv.items[i];
      if (typeof it.itemId !== 'string' || it.itemId.length === 0) {
        pushWarn(rep, 'inventory', `inventory.items[${i}].itemId`, 'TYPE_MISMATCH');
        continue;
      }
      let q = it.quantity;
      if (!Number.isFinite(q) || q < 0) {
        pushWarn(rep, 'inventory', `inventory.items[${i}].quantity`, 'OUT_OF_RANGE');
        q = 0;
      }
      // 정수화
      q = Math.floor(q);
      merged.set(it.itemId, (merged.get(it.itemId) ?? 0) + q);
    }
    const cleaned: typeof inv.items = [];
    for (const [itemId, quantity] of merged) {
      if (quantity > 0) cleaned.push({ itemId, quantity });
    }
    if (cleaned.length !== inv.items.length) {
      inv.items = cleaned;
    } else {
      inv.items = cleaned;
    }
  }

  if (!inv.equipped || typeof inv.equipped !== 'object') {
    pushWarn(rep, 'inventory', 'inventory.equipped', 'MISSING_FIELD');
    inv.equipped = {};
  }

  if (!Number.isFinite(inv.gold) || inv.gold < 0) {
    pushWarn(rep, 'inventory', 'inventory.gold', 'OUT_OF_RANGE');
    inv.gold = 0;
  }
  if (!Number.isFinite(inv.etherCrystal) || inv.etherCrystal < 0) {
    pushWarn(rep, 'inventory', 'inventory.etherCrystal', 'OUT_OF_RANGE');
    inv.etherCrystal = 0;
  }

  // 장착 itemId가 인벤토리에 없으면 참조 끊김 — 해제
  const ownedIds = new Set(inv.items.map(i => i.itemId));
  for (const charId of Object.keys(inv.equipped)) {
    const eqId = inv.equipped[charId];
    if (eqId !== null && !ownedIds.has(eqId)) {
      pushWarn(
        rep,
        'inventory',
        `inventory.equipped["${charId}"]`,
        'BROKEN_REFERENCE',
        `미보유 itemId: ${eqId}`,
      );
      inv.equipped[charId] = null;
    }
  }

  return rep;
}

export function validateScenario(payload: SavePayloadV2): ValidationReport {
  const rep: ValidationReport = { warnings: [], errors: [] };
  const sc = payload.scenario;

  if (!sc) {
    pushErr(rep, 'scenario', 'scenario', 'MISSING_FIELD');
    payload.scenario = { ...DEFAULT_SCENARIO };
    return rep;
  }

  if (typeof sc.chapterId !== 'string' || !KNOWN_CHAPTERS.has(sc.chapterId)) {
    pushErr(rep, 'scenario', 'scenario.chapterId', 'BROKEN_REFERENCE', `미지의 chapterId: ${String(sc.chapterId)}`);
    return rep;
  }

  if (!sc.questFlags || typeof sc.questFlags !== 'object') {
    pushWarn(rep, 'scenario', 'scenario.questFlags', 'MISSING_FIELD');
    sc.questFlags = {};
  }

  if (!Array.isArray(sc.choiceLog)) {
    pushWarn(rep, 'scenario', 'scenario.choiceLog', 'MISSING_FIELD');
    sc.choiceLog = [];
  } else {
    // 시간 단조성 검증 — 위반 시 정렬 보정 (경미 위반)
    let nonMono = false;
    for (let i = 1; i < sc.choiceLog.length; i++) {
      if (sc.choiceLog[i].tsMs < sc.choiceLog[i - 1].tsMs) {
        nonMono = true;
        break;
      }
    }
    if (nonMono) {
      pushWarn(rep, 'scenario', 'scenario.choiceLog', 'OUT_OF_RANGE', '시간 단조 위반 — 정렬');
      sc.choiceLog = [...sc.choiceLog].sort((a, b) => a.tsMs - b.tsMs);
    }
  }

  if (sc.endingPath !== null && typeof sc.endingPath !== 'string') {
    pushWarn(rep, 'scenario', 'scenario.endingPath', 'TYPE_MISMATCH');
    sc.endingPath = null;
  }

  return rep;
}

export function validateMap(payload: SavePayloadV2): ValidationReport {
  const rep: ValidationReport = { warnings: [], errors: [] };
  const m = payload.map;

  if (!m) {
    pushWarn(rep, 'map', 'map', 'MISSING_FIELD');
    payload.map = {
      unlockedZoneIds: [...DEFAULT_MAP.unlockedZoneIds],
      visitedNodeIds: [...DEFAULT_MAP.visitedNodeIds],
      currentZoneId: DEFAULT_MAP.currentZoneId,
      currentNodeId: DEFAULT_MAP.currentNodeId,
    };
    return rep;
  }

  if (!Array.isArray(m.unlockedZoneIds) || m.unlockedZoneIds.length === 0) {
    pushWarn(rep, 'map', 'map.unlockedZoneIds', 'EMPTY_REQUIRED');
    m.unlockedZoneIds = [...DEFAULT_MAP.unlockedZoneIds];
  } else {
    // 중복 정리
    const uniq = Array.from(new Set(m.unlockedZoneIds.filter(z => typeof z === 'string' && z.length > 0)));
    if (uniq.length !== m.unlockedZoneIds.length) {
      m.unlockedZoneIds = uniq;
    } else {
      m.unlockedZoneIds = uniq;
    }
  }

  if (!Array.isArray(m.visitedNodeIds)) {
    pushWarn(rep, 'map', 'map.visitedNodeIds', 'MISSING_FIELD');
    m.visitedNodeIds = [];
  }

  if (typeof m.currentZoneId !== 'string' || m.currentZoneId.length === 0) {
    pushWarn(rep, 'map', 'map.currentZoneId', 'MISSING_FIELD');
    m.currentZoneId = m.unlockedZoneIds[0];
  } else if (!m.unlockedZoneIds.includes(m.currentZoneId)) {
    pushWarn(rep, 'map', 'map.currentZoneId', 'BROKEN_REFERENCE', `${m.currentZoneId} 미해금`);
    m.currentZoneId = m.unlockedZoneIds[0];
  }

  if (typeof m.currentNodeId !== 'string' || m.currentNodeId.length === 0) {
    pushWarn(rep, 'map', 'map.currentNodeId', 'MISSING_FIELD');
    m.currentNodeId = `${m.currentZoneId}_start`;
  }

  return rep;
}

// ─── 통합 검증 + 자동 보정 ─────────────────────────────────────────────
/**
 * 4 도메인 검증을 in-place 보정과 함께 수행.
 * 치명 위반(errors) 1건이라도 있으면 ok=false.
 *
 * 호출 순서: parse → checksum → migrate → **validateAndRepair** → game start.
 */
export function validateAndRepair(
  payload: SavePayloadV2,
): SaveResult<{ repaired: SavePayloadV2; report: ValidationReport }> {
  if (!payload || typeof payload !== 'object') {
    return {
      ok: false,
      error: { code: 'VALIDATION_FAILED', messageKo: '페이로드가 비어 있습니다.' },
    };
  }

  // 깊은 복제로 원본 보존 — 호출자가 비교(라운드트립)에 사용
  const repaired: SavePayloadV2 = JSON.parse(JSON.stringify(payload));

  const reports = [
    validateParty(repaired),
    validateInventory(repaired),
    validateScenario(repaired),
    validateMap(repaired),
  ];

  const merged: ValidationReport = {
    warnings: reports.flatMap(r => r.warnings),
    errors: reports.flatMap(r => r.errors),
  };

  if (merged.errors.length > 0) {
    return {
      ok: false,
      error: {
        code: 'VALIDATION_FAILED',
        messageKo: `검증 실패 — 치명 위반 ${merged.errors.length}건`,
        detail: merged.errors.map(e => `${e.path}:${e.kind}`).join(', '),
      },
    };
  }

  return {
    ok: true,
    value: { repaired, report: merged },
  };
}
