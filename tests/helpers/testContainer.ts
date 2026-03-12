/**
 * P10-18: 테스트용 ServiceContainer 헬퍼
 *
 * 테스트별 격리된 컨테이너 인스턴스를 생성한다.
 * Prisma/Redis/SocketIO를 모의 구현으로 교체하여 외부 의존성 없이 테스트한다.
 */

import { ServiceContainer } from '../../server/src/core/serviceContainer';

// ── Mock 타입 ───────────────────────────────────────────────

export interface MockPrisma {
  $connect: () => Promise<void>;
  $disconnect: () => Promise<void>;
  user: {
    findMany: (...args: unknown[]) => Promise<unknown[]>;
    findUnique: (...args: unknown[]) => Promise<unknown | null>;
    create: (...args: unknown[]) => Promise<unknown>;
    update: (...args: unknown[]) => Promise<unknown>;
    count: (...args: unknown[]) => Promise<number>;
  };
  character: {
    findMany: (...args: unknown[]) => Promise<unknown[]>;
    findUnique: (...args: unknown[]) => Promise<unknown | null>;
  };
  [key: string]: unknown;
}

export interface MockRedis {
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string, ...args: unknown[]) => Promise<string>;
  del: (key: string) => Promise<number>;
  connect: () => Promise<void>;
  quit: () => Promise<void>;
}

export interface MockSocketIO {
  to: (room: string) => { emit: (event: string, data: unknown) => void };
  emit: (event: string, data: unknown) => void;
  sockets: {
    adapter: {
      rooms: Map<string, Set<string>>;
    };
  };
}

// ── Factory 함수 ────────────────────────────────────────────

/** 기본 MockPrisma 생성 */
export function createMockPrisma(overrides?: Partial<MockPrisma>): MockPrisma {
  return {
    $connect: async () => {},
    $disconnect: async () => {},
    user: {
      findMany: async () => [],
      findUnique: async () => null,
      create: async (args: unknown) => ({ id: 'mock-id', ...(args as Record<string, unknown>) }),
      update: async (args: unknown) => ({ id: 'mock-id', ...(args as Record<string, unknown>) }),
      count: async () => 0,
    },
    character: {
      findMany: async () => [],
      findUnique: async () => null,
    },
    ...overrides,
  };
}

/** 기본 MockRedis 생성 */
export function createMockRedis(overrides?: Partial<MockRedis>): MockRedis {
  const store = new Map<string, string>();
  return {
    get: async (key) => store.get(key) ?? null,
    set: async (key, value) => { store.set(key, value); return 'OK'; },
    del: async (key) => { store.delete(key); return 1; },
    connect: async () => {},
    quit: async () => {},
    ...overrides,
  };
}

/** 기본 MockSocketIO 생성 */
export function createMockSocketIO(): MockSocketIO {
  const emittedEvents: Array<{ event: string; data: unknown; room?: string }> = [];
  return {
    to: (room) => ({
      emit: (event, data) => { emittedEvents.push({ event, data, room }); },
    }),
    emit: (event, data) => { emittedEvents.push({ event, data }); },
    sockets: {
      adapter: {
        rooms: new Map(),
      },
    },
  };
}

/**
 * 테스트용 격리된 ServiceContainer 생성
 *
 * @example
 * ```ts
 * const { container, mocks } = createTestContainer();
 * const prisma = container.resolve<MockPrisma>('prisma');
 * ```
 */
export function createTestContainer(overrides?: {
  prisma?: Partial<MockPrisma>;
  redis?: Partial<MockRedis>;
}) {
  const container = new ServiceContainer();

  const mocks = {
    prisma: createMockPrisma(overrides?.prisma),
    redis: createMockRedis(overrides?.redis),
    socketIO: createMockSocketIO(),
  };

  container.register('prisma', mocks.prisma);
  container.register('redis', mocks.redis);
  container.register('socketIO', mocks.socketIO);

  return { container, mocks };
}
