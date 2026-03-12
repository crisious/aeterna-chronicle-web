/**
 * ServiceContainer — 서버 인프라 접근 규칙 (P10-10)
 *
 * Prisma, Redis, Socket.io, TickManager 등을 컨테이너에 등록하고,
 * 도메인 모듈이 직접 import 대신 컨테이너에서 resolve 한다.
 * 기존 싱글턴 패턴을 래핑하여 호환성을 유지한다.
 *
 * 장점:
 * - 테스트 시 모의 구현으로 교체 가능 (DI)
 * - 부트 순서 의존성 명시화
 * - 런타임 서비스 목록 일괄 조회
 */

import { PrismaClient } from '@prisma/client';
import { Server as SocketIOServer } from 'socket.io';
import { RedisClientType } from 'redis';

// ── 타입 정의 ─────────────────────────────────────────────────

/** 등록 가능한 서비스 키 */
export type ServiceKey =
  | 'prisma'
  | 'redis'
  | 'socketIO'
  | 'tickManager'
  | 'opsAlertManager'
  | string; // 확장 가능

/** 서비스 메타 정보 */
export interface ServiceMeta {
  key: ServiceKey;
  registeredAt: Date;
  type: string;
}

// ── ServiceContainer 클래스 ───────────────────────────────────

class ServiceContainer {
  private services: Map<ServiceKey, unknown> = new Map();
  private meta: Map<ServiceKey, ServiceMeta> = new Map();

  /**
   * 서비스 등록
   * @param key 서비스 키
   * @param instance 서비스 인스턴스
   */
  register<T>(key: ServiceKey, instance: T): void {
    if (this.services.has(key)) {
      console.warn(`[ServiceContainer] '${key}' 재등록 (이전 인스턴스 덮어쓰기)`);
    }
    this.services.set(key, instance);
    this.meta.set(key, {
      key,
      registeredAt: new Date(),
      type: typeof instance === 'object' && instance !== null
        ? (instance as object).constructor?.name ?? typeof instance
        : typeof instance,
    });
    console.log(`[ServiceContainer] '${key}' 등록 완료`);
  }

  /**
   * 서비스 조회
   * @throws 미등록 서비스 접근 시 에러
   */
  resolve<T>(key: ServiceKey): T {
    const instance = this.services.get(key);
    if (instance === undefined) {
      throw new Error(`[ServiceContainer] '${key}' 미등록 — 부트 순서를 확인하세요.`);
    }
    return instance as T;
  }

  /**
   * 서비스 조회 (없으면 null)
   */
  tryResolve<T>(key: ServiceKey): T | null {
    return (this.services.get(key) as T) ?? null;
  }

  /**
   * 서비스 등록 여부 확인
   */
  has(key: ServiceKey): boolean {
    return this.services.has(key);
  }

  /**
   * 서비스 제거 (테스트 정리용)
   */
  unregister(key: ServiceKey): boolean {
    this.meta.delete(key);
    return this.services.delete(key);
  }

  /**
   * 전체 초기화 (테스트용)
   */
  clear(): void {
    this.services.clear();
    this.meta.clear();
  }

  /**
   * 등록된 서비스 목록 조회
   */
  listServices(): ServiceMeta[] {
    return Array.from(this.meta.values());
  }

  // ── 타입 안전 헬퍼 (주요 인프라) ───────────────────────────

  /** Prisma 클라이언트 조회 */
  getPrisma(): PrismaClient {
    return this.resolve<PrismaClient>('prisma');
  }

  /** Redis 클라이언트 조회 */
  getRedis(): RedisClientType {
    return this.resolve<RedisClientType>('redis');
  }

  /** Socket.IO 서버 조회 */
  getSocketIO(): SocketIOServer {
    return this.resolve<SocketIOServer>('socketIO');
  }
}

// ── 싱글턴 인스턴스 + 기존 싱글턴 래핑 ───────────────────────

export const serviceContainer = new ServiceContainer();

/**
 * 기존 싱글턴들을 컨테이너에 일괄 등록하는 부트스트랩 헬퍼.
 * server.ts 또는 compositionRoot에서 한 번 호출한다.
 *
 * 사용 예:
 * ```ts
 * import { bootstrapContainer } from './core/serviceContainer';
 * bootstrapContainer({ prisma, redisClient, io, tickManager, opsAlertManager });
 * ```
 */
export function bootstrapContainer(deps: {
  prisma?: PrismaClient;
  redis?: RedisClientType;
  socketIO?: SocketIOServer;
  tickManager?: unknown;
  opsAlertManager?: unknown;
  [key: string]: unknown;
}): void {
  for (const [key, instance] of Object.entries(deps)) {
    if (instance !== undefined && instance !== null) {
      serviceContainer.register(key, instance);
    }
  }
  console.log(`[ServiceContainer] 부트스트랩 완료: ${serviceContainer.listServices().length}개 서비스`);
}

export { ServiceContainer };
