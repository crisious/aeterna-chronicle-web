import { describe, expect, test } from 'vitest';

import { errorBoundary } from '../../client/src/error/ErrorBoundary';

/**
 * 회귀 가드 — "예기치 않은 오류" 진단 불가 문제.
 *
 * 배경: 전투 중 미처리 예외로 ErrorBoundary 오버레이("예기치 않은 오류")가 떴으나,
 * 에러 리포트의 message 가 비어 서버 POST /api/errors 가 400 으로 거부 → 로그에 안 남아
 * 근본 원인을 추적할 수 없었다. 두 가지를 보강:
 *  1) _deriveErrorMessage — window 'error' 의 message 가 비어도 의미 있는 메시지 도출
 *  2) _queueError — 빈 message/errorType 을 폴백으로 보정해 서버 검증 통과(유실 방지)
 */
const eb = errorBoundary as unknown as {
  _deriveErrorMessage(event: Partial<ErrorEvent>): string;
  _queueError(report: { errorType?: string; message: string; timestamp: string }): void;
  errorQueue: Array<{ errorType?: string; message: string }>;
  networkState: string;
};

describe('ErrorBoundary — 에러 메시지 도출 + 빈 리포트 유실 방지', () => {
  test('message 가 있으면 그대로 사용', () => {
    expect(eb._deriveErrorMessage({ message: 'Boom' })).toBe('Boom');
  });

  test('빈 message + Error → "name: message"', () => {
    const error = new TypeError("Cannot read properties of undefined (reading 'x')");
    expect(eb._deriveErrorMessage({ message: '', error })).toBe(
      "TypeError: Cannot read properties of undefined (reading 'x')",
    );
  });

  test('빈 message + 메시지 없는 Error → 비어 있지 않은 메시지(name 기반)', () => {
    const msg = eb._deriveErrorMessage({ message: '', error: new Error('') });
    expect(msg.trim().length).toBeGreaterThan(0);
    expect(msg.startsWith('Error')).toBe(true);
  });

  test('비-Error throw 도 문자열화', () => {
    expect(eb._deriveErrorMessage({ message: '', error: 'oops' as unknown as Error })).toBe(
      'Non-Error thrown: oops',
    );
  });

  test('전부 비면 filename 위치로 폴백', () => {
    expect(
      eb._deriveErrorMessage({ message: '', error: null as unknown as Error, filename: 'a.js', lineno: 5, colno: 2 }),
    ).toBe('Unknown error at a.js:5:2');
  });

  test('_queueError: 빈 message 리포트는 폴백으로 보정되어 큐에 적재(서버 400 유실 방지)', () => {
    eb.networkState = 'DISCONNECTED'; // _flushErrorQueue(fetch) 회피
    eb.errorQueue = [];
    eb._queueError({ errorType: 'runtime', message: '', timestamp: new Date(0).toISOString() });
    expect(eb.errorQueue.length).toBe(1);
    expect(eb.errorQueue[0].message.trim().length).toBeGreaterThan(0);
  });
});
