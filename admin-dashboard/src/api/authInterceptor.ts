/**
 * authInterceptor — 인증 토큰 자동 부착 (P10-09)
 *
 * 모든 요청에 localStorage의 admin_token을 Bearer 헤더로 자동 부착.
 * 401 응답 시 토큰 제거 + 로그인 리다이렉트.
 */

import { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios';

const TOKEN_KEY = 'admin_token';

/**
 * axios 인스턴스에 인증 인터셉터를 부착한다.
 */
export function attachAuthInterceptor(instance: AxiosInstance): void {
  // 요청 인터셉터: 토큰 자동 부착
  instance.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      const token = localStorage.getItem(TOKEN_KEY);
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error),
  );

  // 응답 인터셉터: 401 시 토큰 정리
  instance.interceptors.response.use(
    (response: AxiosResponse) => response,
    (error) => {
      if (error.response?.status === 401) {
        localStorage.removeItem(TOKEN_KEY);
        console.warn('[Auth] 인증 만료 — 토큰 제거');
        // 로그인 페이지 리다이렉트 (SPA 라우터가 있으면 그쪽으로 위임)
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
      return Promise.reject(error);
    },
  );
}
