/**
 * scripts/data-validator/validators/reference-auditor.ts — 참조 무결성 audit (계섬월 Build)
 *
 * 검증 엣지:
 *   skill.effectId        → effect.id           (effect 도메인 미정 — UNKNOWN_TARGET 으로 격리)
 *   item.categoryId       → category.id         (category 도메인 미정 — 동일)
 *   encounter.monsterIds  → monster.id
 *   scenario.nodes[*].skillRefs/itemRefs/encounterRefs → 각 도메인
 *
 * 정책:
 *   - BROKEN_LINK     → error
 *   - UNUSED_TARGET   → warn
 *   - UNKNOWN_TARGET  → info  (도메인 미정의 — schema 만으로 검증 불가)
 */
import type {
  DataDomainId,
  LocationCue,
  ReferenceEdge,
  ReferenceEdgeKind,
  ValidationFinding,
} from '../types.ts';
import { DATA_DOMAIN_IDS } from '../types.ts';
import { assertLocation } from '../errors.ts';
import {
  buildSnippet,
  loadJsonWithSourceMap,
  locateByPointer,
  resolveDataGlob,
  resolveWorkspaceRoot,
} from '../helpers.ts';

export interface ReferenceGraph {
  readonly idsByDomain: Record<DataDomainId, ReadonlySet<string>>;
  readonly edges: readonly ReferenceEdge[];
}

interface RecordSource {
  readonly domain: DataDomainId;
  readonly filePath: string;
  readonly raw: string;
  readonly pointers: Map<string, { line: number; column: number }>;
  readonly records: ReadonlyArray<{ record: unknown; pointer: string }>;
}

function readRecords(domain: DataDomainId, filePath: string): RecordSource {
  const { data, pointers, raw } = loadJsonWithSourceMap(filePath);
  let records: { record: unknown; pointer: string }[] = [];
  if (Array.isArray(data)) {
    records = data.map((r, i) => ({ record: r, pointer: `/${i}` }));
  } else if (data && typeof data === 'object' && Array.isArray((data as { records?: unknown[] }).records)) {
    records = (data as { records: unknown[] }).records.map((r, i) => ({ record: r, pointer: `/records/${i}` }));
  } else if (data && typeof data === 'object') {
    records = [{ record: data, pointer: '' }];
  }
  return { domain, filePath, raw, pointers, records };
}

function buildLocation(src: RecordSource, jsonPointer: string): LocationCue {
  const { line, column } = locateByPointer(src.pointers, jsonPointer);
  return {
    filePath: src.filePath,
    jsonPointer: jsonPointer || '/',
    line,
    column,
    snippet: buildSnippet(src.raw, line),
  };
}

function pickString(record: unknown, key: string): string | undefined {
  if (record && typeof record === 'object' && typeof (record as Record<string, unknown>)[key] === 'string') {
    return (record as Record<string, string>)[key];
  }
  return undefined;
}

function pickStringArray(record: unknown, key: string): string[] {
  if (record && typeof record === 'object' && Array.isArray((record as Record<string, unknown>)[key])) {
    const arr = (record as Record<string, unknown[]>)[key];
    return arr.filter((v): v is string => typeof v === 'string');
  }
  return [];
}

export async function buildReferenceGraph(workspaceRoot?: string): Promise<ReferenceGraph> {
  const root = workspaceRoot ?? resolveWorkspaceRoot();
  const idsByDomain: Record<DataDomainId, Set<string>> = {
    skill: new Set(),
    item: new Set(),
    monster: new Set(),
    encounter: new Set(),
    scenario: new Set(),
  };
  const edges: ReferenceEdge[] = [];
  const sources: RecordSource[] = [];

  for (const domain of DATA_DOMAIN_IDS) {
    const files = resolveDataGlob(domain, root);
    for (const filePath of files) {
      const src = readRecords(domain, filePath);
      sources.push(src);
      for (const { record } of src.records) {
        const id = pickString(record, 'id');
        if (id) idsByDomain[domain].add(id);
      }
    }
  }

  // 엣지 수집
  for (const src of sources) {
    for (const { record, pointer } of src.records) {
      const fromId = pickString(record, 'id') ?? '<unknown>';

      if (src.domain === 'skill') {
        const eff = pickString(record, 'effectId');
        if (eff) {
          edges.push({
            from: { domain: 'skill', id: fromId, location: buildLocation(src, `${pointer}/effectId`) },
            to: { domain: 'skill' /* placeholder */, id: eff },
            kind: 'skill->effect',
          });
        }
      }
      if (src.domain === 'item') {
        const cat = pickString(record, 'categoryId');
        if (cat) {
          edges.push({
            from: { domain: 'item', id: fromId, location: buildLocation(src, `${pointer}/categoryId`) },
            to: { domain: 'item' /* placeholder */, id: cat },
            kind: 'item->category',
          });
        }
      }
      if (src.domain === 'encounter') {
        const ids = pickStringArray(record, 'monsterIds');
        ids.forEach((mid, i) => {
          edges.push({
            from: { domain: 'encounter', id: fromId, location: buildLocation(src, `${pointer}/monsterIds/${i}`) },
            to: { domain: 'monster', id: mid },
            kind: 'encounter->monster',
          });
        });
      }
      if (src.domain === 'scenario') {
        const nodes = (record as { nodes?: unknown }).nodes;
        if (Array.isArray(nodes)) {
          nodes.forEach((node, ni) => {
            const nodePointer = `${pointer}/nodes/${ni}`;
            pickStringArray(node, 'skillRefs').forEach((sid, i) => {
              edges.push({
                from: { domain: 'scenario', id: fromId, location: buildLocation(src, `${nodePointer}/skillRefs/${i}`) },
                to: { domain: 'skill', id: sid },
                kind: 'scenario->skill',
              });
            });
            pickStringArray(node, 'itemRefs').forEach((iid, i) => {
              edges.push({
                from: { domain: 'scenario', id: fromId, location: buildLocation(src, `${nodePointer}/itemRefs/${i}`) },
                to: { domain: 'item', id: iid },
                kind: 'scenario->item',
              });
            });
            pickStringArray(node, 'encounterRefs').forEach((eid, i) => {
              edges.push({
                from: { domain: 'scenario', id: fromId, location: buildLocation(src, `${nodePointer}/encounterRefs/${i}`) },
                to: { domain: 'encounter', id: eid },
                kind: 'scenario->encounter',
              });
            });
          });
        }
      }
    }
  }

  return {
    idsByDomain: idsByDomain as Record<DataDomainId, ReadonlySet<string>>,
    edges,
  };
}

const UNRESOLVED_DOMAINS: ReadonlySet<ReferenceEdgeKind> = new Set(['skill->effect', 'item->category']);

export async function auditReferences(workspaceRoot?: string): Promise<readonly ValidationFinding[]> {
  const graph = await buildReferenceGraph(workspaceRoot);
  const findings: ValidationFinding[] = [];
  const usedByDomain: Record<DataDomainId, Set<string>> = {
    skill: new Set(), item: new Set(), monster: new Set(), encounter: new Set(), scenario: new Set(),
  };

  for (const edge of graph.edges) {
    if (UNRESOLVED_DOMAINS.has(edge.kind)) {
      // effect/category 도메인 미정의 — 끊김 검증 불가, info로만 노출
      findings.push({
        kind: 'reference',
        severity: 'info',
        domain: edge.from.domain,
        code: 'REF_UNKNOWN_TARGET_DOMAIN',
        messageKo: `[${edge.from.domain}→${edge.kind.split('->')[1]}] 타겟 도메인 미정의 — schema/auditor 확장 필요 (id=${edge.to.id})`,
        location: assertLocation(edge.from.location, 'reference', edge.from.domain),
        hint: '계섬월 인계 메모: effect/category 도메인 분리 또는 임베드 결정 필요',
      });
      continue;
    }
    const targetIds = graph.idsByDomain[edge.to.domain];
    if (targetIds.has(edge.to.id)) {
      usedByDomain[edge.to.domain].add(edge.to.id);
    } else {
      findings.push({
        kind: 'reference',
        severity: 'error',
        domain: edge.from.domain,
        code: 'REF_BROKEN_LINK',
        messageKo: `[${edge.kind}] 끊긴 참조: ${edge.to.id} (${edge.to.domain}.id 에 존재하지 않음)`,
        location: assertLocation(edge.from.location, 'reference', edge.from.domain),
        hint: `타겟 도메인(${edge.to.domain})에 id 추가하거나, 본 참조를 제거하세요.`,
      });
    }
  }

  // UNUSED_TARGET — monster/skill/item/encounter 중 어디서도 참조하지 않은 ID
  for (const domain of DATA_DOMAIN_IDS) {
    const targets = graph.idsByDomain[domain];
    const used = usedByDomain[domain];
    // scenario 도메인은 최상위 — 참조 안 되는 게 정상이므로 skip
    if (domain === 'scenario') continue;
    // monster/skill/item/encounter 미참조 → warn
    for (const id of targets) {
      if (!used.has(id)) {
        // 위치 단서: 정확한 record location은 다시 찾아야 함 — 워크플로 비용 절감 위해 도메인 전체 잠재 위치 사용
        // 실제 record 위치를 위해서는 그래프에 source pointer를 함께 저장해야 하므로, 1차 구현은 도메인 표시.
        findings.push({
          kind: 'reference',
          severity: 'warn',
          domain,
          code: 'REF_UNUSED_TARGET',
          messageKo: `[${domain}] 미참조 ID: ${id}`,
          location: assertLocation(
            { filePath: `<${domain}>`, jsonPointer: `/${id}` },
            'reference',
            domain,
          ),
          hint: '실제로 사용 예정이면 무시. 의도치 않게 고립된 콘텐츠라면 시나리오/인카운터에 연결.',
        });
      }
    }
  }

  return findings;
}
