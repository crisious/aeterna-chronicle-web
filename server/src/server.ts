/**
 * server.ts — 에테르나 크로니클 서버 진입점
 *
 * P10-01 리팩터링: 모든 조립/초기화 로직은 bootstrap/ 모듈로 분리.
 * 이 파일은 bootstrap()을 호출하는 얇은 진입점 역할만 담당한다.
 *
 * 구조:
 *   bootstrap/compositionRoot.ts — 앱 조립 (Fastify + CORS + 미들웨어 + 라우트 + Socket.io)
 *   bootstrap/featureRegistry.ts — 선언형 매니페스트 기반 라우트/소켓 자동 등록
 *   bootstrap/runtimeServices.ts — Redis, Prisma, tick, scheduler, APM 초기화
 *   bootstrap/shutdownManager.ts — graceful shutdown 로직
 */

import { bootstrap } from './bootstrap/compositionRoot';

bootstrap();
