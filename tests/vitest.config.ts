// Vitest 설정 — 에테르나 크로니클 (P5-13)
// 테스트 구분: unit | integration | e2e | contract
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      // node_modules 의존성을 테스트에서 사용 가능하도록 리졸빙
      fastify: path.resolve(__dirname, '../node_modules/fastify'),
      jsonwebtoken: path.resolve(__dirname, '../node_modules/jsonwebtoken'),
    },
  },
  test: {
    // 기본 설정 (test:all 또는 vitest 실행 시)
    include: [
      'tests/unit/**/*.test.ts',
      'tests/integration/**/*.test.ts',
      'tests/e2e/**/*.test.ts',
      'tests/contract/**/*.test.ts',
      'admin-dashboard/src/__tests__/**/*.test.{ts,tsx}',
    ],
    globals: true,
    environment: 'node',
    // 서버 보안 모듈(jwtManager/authMiddleware/authGate)은 import 시점에 시크릿을 요구한다(fail-fast).
    // 테스트용 더미 시크릿을 모듈 로드 전에 주입한다. 실제 환경에서는 .env 가 우선한다.
    env: {
      JWT_SECRET: process.env.JWT_SECRET ?? 'test-jwt-secret-aeterna',
      JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET ?? 'test-jwt-refresh-aeterna',
      JWT_ADMIN_SECRET: process.env.JWT_ADMIN_SECRET ?? 'test-jwt-admin-aeterna',
    },
    testTimeout: 30000,
    hookTimeout: 15000,

    // 커버리지 설정
    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage',
      reporter: ['text', 'json', 'html'],
      include: [
        'server/src/**/*.ts',
        'client/src/**/*.ts',
        'shared/**/*.ts',
        'admin-dashboard/src/**/*.{ts,tsx}',
      ],
      exclude: [
        '**/*.test.ts',
        '**/*.d.ts',
        '**/node_modules/**',
        'server/src/db.ts',      // Prisma client 직접 사용
        'server/src/redis.ts',   // Redis 연결
      ],
    },

    // 리포터 설정
    reporters: ['default', 'json'],
    outputFile: {
      json: './test-results.json',
    },

    // 프로세스 풀 (테스트 병렬 실행).
    // Prisma 5.x library 쿼리 엔진(@prisma/client N-API 네이티브 애드온)을 worker_threads
    // 안에서 new PrismaClient() 하면 query-engine engine.rs 의 'Failed to deserialize
    // constructor options' 패닉 → SIGABRT(exit 134) 가 간헐 발생한다(메인 스레드는 통과).
    // child_process 기반 forks 풀로 격리해 네이티브 엔진 크래시를 회피한다.
    pool: 'forks',
    poolOptions: {
      forks: {
        minForks: 1,
        maxForks: 4,
      },
    },
  },
});
