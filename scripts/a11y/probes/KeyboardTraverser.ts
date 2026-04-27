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

export interface KeyboardProbeResult extends ProbeResult {
  totalFocusable: number;
}

export function runKeyboardProbe(maps: ScreenAriaMap[]): KeyboardProbeResult {
  const violations: AuditViolation[] = [];
  let totalFocusable = 0;

  for (const screen of maps) {
    const groups = new Map<string, number[]>();
    const focusable = screen.elements.filter((element) => element.tabindex >= 0);

    totalFocusable += focusable.length;

    if (focusable.length === 0) {
      pushViolation(
        violations,
        'moderate',
        'NO_FOCUSABLE_ELEMENTS',
        `화면 ${screen.screenId} 에 키보드로 도달 가능한 요소가 없습니다.`,
        { screenId: screen.screenId },
      );
    }

    for (const element of screen.elements) {
      if (!element.focusGroup || element.focusOrder === undefined) {
        continue;
      }

      if (element.tabindex < 0) {
        pushViolation(
          violations,
          'serious',
          'FOCUS_TARGET_NOT_FOCUSABLE',
          `화면 ${screen.screenId} 의 ${element.selector} 는 focusGroup 에 묶였으나 tabindex 가 음수입니다.`,
          { screenId: screen.screenId, selector: element.selector },
        );
      }

      const orders = groups.get(element.focusGroup) ?? [];
      orders.push(element.focusOrder);
      groups.set(element.focusGroup, orders);
    }

    for (const [groupName, orders] of groups) {
      const sortedOrders = [...orders].sort((left, right) => left - right);
      const normalizedOrders = sortedOrders.filter((order) => order !== 99);

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
            `화면 ${screen.screenId} 의 포커스 그룹 ${groupName} 은 ${expected} 순서가 비었습니다.`,
            { screenId: screen.screenId, meta: { focusGroup: groupName, orders: sortedOrders } },
          );
          break;
        }
      }
    }

    if (screen.focusTrap && focusable.length === 0) {
      pushViolation(
        violations,
        'critical',
        'FOCUS_TRAP_DEAD_END',
        `포커스 트랩 화면 ${screen.screenId} 에 순환 가능한 포커스 대상이 없습니다.`,
        { screenId: screen.screenId },
      );
    }
  }

  return {
    id: 'keyboard',
    passed: violations.length === 0,
    violations,
    totalFocusable,
    summary: {
      screenCount: maps.length,
      totalFocusable,
    },
  };
}
