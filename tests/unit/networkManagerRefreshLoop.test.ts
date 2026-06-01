import { afterEach, describe, expect, test, vi } from 'vitest';

import { networkManager } from '../../client/src/network/NetworkManager';

/**
 * 회귀 가드 — "기존 세션 확인 중" 무한 행 버그.
 *
 * 근본 원인: _fetchWithRetry 의 401 재시도 로직이 /api/auth/refresh 엔드포인트
 * 자신을 제외하지 않아, refresh 가 401 을 반환하면 refreshAuth() 를 재귀 호출하고
 * 그 refreshAuth 가 다시 /api/auth/refresh 를 retried=false 로 호출 → 무한 재귀.
 * MainMenuScene 의 `networkManager.refreshAuth().then(...)` 이 영영 resolve 되지 않아
 * "기존 세션 확인 중..." 상태에 멈춘다.
 */
describe('NetworkManager.refreshAuth — refresh 무한 재시도 방지', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    (networkManager as unknown as { _refreshToken: string | null })._refreshToken = null;
    (networkManager as unknown as { _token: string | null })._token = null;
  });

  test('무효 refresh 토큰이어도 /api/auth/refresh 를 1회만 호출한다 (무한 루프 금지)', async () => {
    (networkManager as unknown as { _token: string | null })._token = 'invalid.access.token';
    (networkManager as unknown as { _refreshToken: string | null })._refreshToken = 'invalid.refresh.token';

    let refreshCalls = 0;
    const CAP = 5; // 무한 루프 차단용 안전장치 — 버그가 있으면 여기서 throw 로 탈출

    const fetchMock = vi.fn(async (input: unknown) => {
      const url = typeof input === 'string' ? input : (input as { url?: string })?.url ?? '';
      if (url.includes('/api/auth/refresh')) {
        refreshCalls += 1;
        if (refreshCalls > CAP) {
          throw new Error(`[test-guard] refresh 호출이 ${CAP}회를 초과했습니다 (무한 루프)`);
        }
      }
      return {
        status: 401,
        ok: false,
        json: async () => ({ error: 'invalid refresh token' }),
        text: async () => 'invalid refresh token',
      } as unknown as Response;
    });
    vi.stubGlobal('fetch', fetchMock);

    const ok = await networkManager.refreshAuth();

    expect(ok).toBe(false);
    expect(refreshCalls).toBe(1);
  });
});
