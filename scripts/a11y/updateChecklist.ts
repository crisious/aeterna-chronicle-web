import type { StaticAuditSummary } from './types';

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function setCheckboxLine(source: string, label: string, checked: boolean): string {
  const regex = new RegExp(`- \\[[ x]\\] ${escapeRegExp(label)}`, 'g');
  return source.replace(regex, `- [${checked ? 'x' : ' '}] ${label}`);
}

function hasPassingProbe(summary: StaticAuditSummary, probeId: string): boolean {
  return summary.probes.some((probe) => probe.id === probeId && probe.passed);
}

export function applyA11yChecklistStatus(source: string, summary: StaticAuditSummary): string {
  const automatedPass = summary.failedProbes === 0;
  const colorBlindPass = hasPassingProbe(summary, 'colorblind');
  const keyboardPass = hasPassingProbe(summary, 'keyboard');
  const screenReaderContractPass = hasPassingProbe(summary, 'screen-reader');

  let next = source;

  next = setCheckboxLine(next, '`npm run a11y:audit` 5종 Probe 통합 실행 — Axe · ColorContrast · ColorBlindSim · KeyboardTraverser · AriaContract', automatedPass);
  next = setCheckboxLine(next, 'AA 위반 0건 — 머지 게이트 차단 규칙 적용 (CI `gate.yml`)', automatedPass);
  next = setCheckboxLine(next, 'AAA 위반 ≤ 5건 — `tests/reports/a11y/summary.json` 기록·추세 모니터링', automatedPass);
  next = setCheckboxLine(next, '색맹 시뮬 4종 (Protanopia · Deuteranopia · Tritanopia · Achromatopsia) 스냅샷 — 게이지 식별 100%', colorBlindPass);
  next = setCheckboxLine(next, '키보드 트래버스 — 트랩 0건, 가시 포커스 100%, Tab 순환 닫힘', keyboardPass);
  next = setCheckboxLine(next, 'ARIA 컨트랙트 — `AriaLabelMap.ts` SSOT 100% 매칭, 누락 라벨 0건', screenReaderContractPass);

  return next;
}
