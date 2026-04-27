import type { ScreenAriaMap } from '../../../client/src/accessibility/screen_reader/AriaLabelMap';
import type { AuditViolation, ProbeResult, Severity } from '../types';

function pushViolation(
  violations: AuditViolation[],
  severity: Severity,
  code: string,
  message: string,
  meta?: Record<string, unknown>,
): void {
  violations.push({ severity, code, message, ...meta });
}

function validateFocusOrders(
  screen: ScreenAriaMap,
  violations: AuditViolation[],
): void {
  const groups = new Map<string, number[]>();

  for (const element of screen.elements) {
    if (!element.focusGroup || element.focusOrder === undefined) {
      continue;
    }

    const orders = groups.get(element.focusGroup) ?? [];
    orders.push(element.focusOrder);
    groups.set(element.focusGroup, orders);
  }

  for (const [groupName, orders] of groups) {
    const sortedOrders = [...orders].sort((left, right) => left - right);
    const normalizedOrders = sortedOrders.filter((order) => order !== 99);
    const seen = new Set<number>();

    for (const order of sortedOrders) {
      if (seen.has(order)) {
        pushViolation(
          violations,
          'serious',
          'FOCUS_ORDER_DUPLICATE',
          `화면 ${screen.screenId}의 포커스 그룹 ${groupName}에 중복 focusOrder ${order}가 있습니다.`,
          { screenId: screen.screenId, meta: { focusGroup: groupName, focusOrder: order } },
        );
      }
      seen.add(order);
    }

    if (normalizedOrders.length === 0) {
      continue;
    }

    for (let index = 0; index < normalizedOrders.length; index += 1) {
      const expected = index + 1;
      if (normalizedOrders[index] !== expected) {
        pushViolation(
          violations,
          'moderate',
          'FOCUS_ORDER_GAP',
          `화면 ${screen.screenId}의 포커스 그룹 ${groupName} 순서가 ${expected}부터 연속되지 않습니다.`,
          { screenId: screen.screenId, meta: { focusGroup: groupName, orders: sortedOrders } },
        );
        break;
      }
    }
  }
}

export function runAriaContractProbe(
  maps: ScreenAriaMap[],
  contractVersion: string,
): ProbeResult {
  const violations: AuditViolation[] = [];
  const screenIds = new Set<string>();
  let totalElements = 0;

  if (!contractVersion.trim()) {
    pushViolation(violations, 'critical', 'ARIA_CONTRACT_VERSION_MISSING', 'ARIA_CONTRACT_VERSION 이 비어 있습니다.');
  }

  for (const screen of maps) {
    totalElements += screen.elements.length;

    if (screenIds.has(screen.screenId)) {
      pushViolation(
        violations,
        'serious',
        'SCREEN_ID_DUPLICATE',
        `화면 ID ${screen.screenId} 가 중복 선언되었습니다.`,
        { screenId: screen.screenId },
      );
    }
    screenIds.add(screen.screenId);

    if (screen.focusTrap && !screen.elements.some((element) => element.role === 'dialog')) {
      pushViolation(
        violations,
        'serious',
        'FOCUS_TRAP_MISSING_DIALOG',
        `포커스 트랩 화면 ${screen.screenId} 에 dialog 역할 요소가 없습니다.`,
        { screenId: screen.screenId },
      );
    }

    const selectors = new Set<string>();
    for (const element of screen.elements) {
      if (selectors.has(element.selector)) {
        pushViolation(
          violations,
          'serious',
          'SELECTOR_DUPLICATE',
          `화면 ${screen.screenId} 에 selector ${element.selector} 가 중복됩니다.`,
          { screenId: screen.screenId, selector: element.selector },
        );
      }
      selectors.add(element.selector);

      if (!element.label && !element.labelFn) {
        pushViolation(
          violations,
          'serious',
          'ARIA_LABEL_REQUIRED',
          `화면 ${screen.screenId} 의 ${element.selector} 는 label 또는 labelFn 이 필요합니다.`,
          { screenId: screen.screenId, selector: element.selector },
        );
      }

      if (element.focusGroup && (element.focusOrder === undefined || element.focusOrder < 1)) {
        pushViolation(
          violations,
          'serious',
          'FOCUS_ORDER_REQUIRED',
          `화면 ${screen.screenId} 의 ${element.selector} 는 유효한 focusOrder 가 필요합니다.`,
          { screenId: screen.screenId, selector: element.selector },
        );
      }
    }

    validateFocusOrders(screen, violations);
  }

  return {
    id: 'screen-reader',
    passed: violations.length === 0,
    violations,
    summary: {
      contractVersion,
      screenCount: maps.length,
      totalElements,
    },
  };
}
