/**
 * errorHandler — 공통 에러 매핑 (P10-09)
 *
 * API 에러를 사용자 친화적 메시지로 매핑.
 * 네트워크/타임아웃/서버 에러를 일관된 형식으로 변환한다.
 */

import { AxiosInstance, AxiosError } from 'axios';

// ── 에러 타입 정의 ────────────────────────────────────────────

export interface ApiError {
  /** HTTP 상태 코드 (네트워크 에러면 0) */
  status: number;
  /** 사용자에게 표시할 메시지 */
  message: string;
  /** 서버 에러 코드 (있을 때) */
  code?: string;
  /** 원본 에러 */
  original: AxiosError;
}

// ── 상태별 메시지 매핑 ────────────────────────────────────────

const STATUS_MESSAGES: Record<number, string> = {
  400: '잘못된 요청입니다.',
  401: '인증이 필요합니다.',
  403: '접근 권한이 없습니다.',
  404: '요청한 리소스를 찾을 수 없습니다.',
  409: '리소스 충돌이 발생했습니다.',
  422: '입력 데이터가 유효하지 않습니다.',
  429: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
  500: '서버 내부 오류가 발생했습니다.',
  502: '서버 게이트웨이 오류입니다.',
  503: '서버가 일시적으로 이용 불가합니다.',
};

/**
 * AxiosError를 ApiError로 변환
 */
export function mapAxiosError(error: AxiosError): ApiError {
  // 네트워크 에러 (서버 무응답)
  if (!error.response) {
    if (error.code === 'ECONNABORTED') {
      return {
        status: 0,
        message: '요청 시간이 초과되었습니다.',
        code: 'TIMEOUT',
        original: error,
      };
    }
    return {
      status: 0,
      message: '서버에 연결할 수 없습니다.',
      code: 'NETWORK_ERROR',
      original: error,
    };
  }

  const status = error.response.status;
  const serverMessage = (error.response.data as Record<string, unknown>)?.message as string | undefined;
  const serverCode = (error.response.data as Record<string, unknown>)?.code as string | undefined;

  return {
    status,
    message: serverMessage || STATUS_MESSAGES[status] || `오류가 발생했습니다. (${status})`,
    code: serverCode,
    original: error,
  };
}

/**
 * axios 인스턴스에 공통 에러 핸들러를 부착한다.
 */
export function attachErrorHandler(instance: AxiosInstance): void {
  instance.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      const apiError = mapAxiosError(error);

      // 콘솔 경고 (개발 편의)
      console.warn(
        `[API Error] ${apiError.status} ${apiError.code ?? ''}: ${apiError.message}`,
      );

      return Promise.reject(apiError);
    },
  );
}
