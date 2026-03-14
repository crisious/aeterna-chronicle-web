// Vitest 설정 — 에테르나 크로니클 (P5-13)
// 테스트 구분: unit | integration | e2e | contract
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      // server/node_modules 의존성을 테스트에서 사용 가능하도록 리졸빙
      fastify: path.resolve(__dirname, 'server/node_modules/fastify'),
      jsonwebtoken: path.resolve(__dirname, 'server/node_modules/jsonwebtoken'),
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

    // 스레드 풀 (테스트 병렬 실행)
    pool: 'threads',
    poolOptions: {
      threads: {
        minThreads: 1,
        maxThreads: 4,
      },
    },
  },
});
