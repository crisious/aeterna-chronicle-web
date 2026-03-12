/**
 * apiClient — 공통 axios 인스턴스 (P10-09)
 *
 * 모든 어드민 API 호출의 단일 진입점.
 * 인증 인터셉터 + 에러 핸들러가 자동 적용된다.
 */

import axios, { AxiosInstance } from 'axios';
import { attachAuthInterceptor } from './authInterceptor';
import { attachErrorHandler } from './errorHandler';

/** API 베이스 URL */
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000/api';

/** 공통 axios 인스턴스 */
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE,
  timeout: 15_000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 인터셉터 등록
attachAuthInterceptor(apiClient);
attachErrorHandler(apiClient);

export { apiClient, API_BASE };
export default apiClient;
