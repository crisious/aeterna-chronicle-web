/**
 * E2E 테스트 설정 — P4-17
 * 
 * 테스트 서버 초기화, 인증 헬퍼, 테스트 유틸리티.
 * 실제 DB 없이 구조 + 로직 검증용.
 */

import Fastify, { FastifyInstance } from 'fastify';
import jwt from 'jsonwebtoken';

// ── 상수 ─────────────────────────────────────────────────────

export const TEST_JWT_SECRET = 'aeterna-test-secret-key';
export const TEST_BASE_URL = 'http://localhost:0'; // 랜덤 포트

/** 테스트 유저 역할 */
export type TestRole = 'user' | 'moderator' | 'admin' | 'superadmin';

/** 테스트 유저 정보 */
export interface TestUser {
  userId: string;
  email: string;
  nickname: string;
  role: TestRole;
  token: string;
}

// ── 테스트 서버 ──────────────────────────────────────────────

let testApp: FastifyInstance | null = null;

/**
 * 테스트용 Fastify 서버 생성.
 * 실제 DB 연결 없이 라우트 구조만 검증.
 */
export async function createTestServer(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  testApp = app;

  // 필요 시 라우트 등록은 각 테스트 파일에서 수행
  return app;
}

/** 테스트 서버 종료 */
export async function closeTestServer(): Promise<void> {
  if (testApp) {
    await testApp.close();
    testApp = null;
  }
}

// ── 인증 헬퍼 ────────────────────────────────────────────────

let userCounter = 0;

/**
 * 테스트 유저 생성 + JWT 토큰 발급.
 */
export function createTestUser(role: TestRole = 'user', overrides?: Partial<TestUser>): TestUser {
  userCounter++;
  const userId = overrides?.userId || `test-user-${userCounter}`;
  const email = overrides?.email || `test${userCounter}@aeterna.dev`;
  const nickname = overrides?.nickname || `테스트유저${userCounter}`;

  const token = jwt.sign(
    { userId, email, role },
    TEST_JWT_SECRET,
    { expiresIn: '1h' },
  );

  return { userId, email, nickname, role, token };
}

/** 어드민 유저 생성 */
export function createAdminUser(): TestUser {
  return createTestUser('admin', {
    email: 'admin@aeterna.dev',
    nickname: '관리자',
  });
}

/** 슈퍼어드민 유저 생성 */
export function createSuperAdminUser(): TestUser {
  return createTestUser('superadmin', {
    email: 'superadmin@aeterna.dev',
    nickname: '최고관리자',
  });
}

// ── HTTP 요청 헬퍼 ───────────────────────────────────────────

/** 인증 헤더 생성 */
export function authHeader(user: TestUser): Record<string, string> {
  return { Authorization: `Bearer ${user.token}` };
}

/** JSON 요청 옵션 */
export function jsonBody(body: unknown): { headers: Record<string, string>; body: string } {
  return {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

// ── Mock 데이터 팩토리 ───────────────────────────────────────

/** 아이템 ID 카운터 */
let itemCounter = 0;

export function mockItem(overrides?: Record<string, unknown>) {
  itemCounter++;
  return {
    id: `item-${itemCounter}`,
    name: `테스트아이템${itemCounter}`,
    type: 'weapon',
    rarity: 'common',
    stackable: false,
    maxStack: 1,
    ...overrides,
  };
}

export function mockQuest(overrides?: Record<string, unknown>) {
  return {
    id: `quest-${Date.now()}`,
    title: '테스트 퀘스트',
    description: '테스트용 퀘스트입니다.',
    type: 'main',
    level: 1,
    rewards: { gold: 100, exp: 50 },
    ...overrides,
  };
}

export function mockPet(overrides?: Record<string, unknown>) {
  return {
    id: `pet-${Date.now()}`,
    name: '테스트 펫',
    species: 'wolf',
    level: 1,
    exp: 0,
    hunger: 100,
    ...overrides,
  };
}

export function mockGuild(overrides?: Record<string, unknown>) {
  return {
    id: `guild-${Date.now()}`,
    name: '테스트 길드',
    level: 1,
    maxMembers: 50,
    memberCount: 1,
    ...overrides,
  };
}

// ── 어설션 헬퍼 ──────────────────────────────────────────────

/** 응답 상태 코드 검증 */
export function expectStatus(actual: number, expected: number): void {
  if (actual !== expected) {
    throw new Error(`Expected status ${expected}, got ${actual}`);
  }
}

/** 객체에 특정 키가 존재하는지 검증 */
export function expectKeys(obj: Record<string, unknown>, keys: string[]): void {
  for (const key of keys) {
    if (!(key in obj)) {
      throw new Error(`Expected key "${key}" in object`);
    }
  }
}

/** 배열 길이 검증 */
export function expectLength(arr: unknown[], expected: number): void {
  if (arr.length !== expected) {
    throw new Error(`Expected array length ${expected}, got ${arr.length}`);
  }
}

/** 값 일치 검증 */
export function expectEqual<T>(actual: T, expected: T, label?: string): void {
  if (actual !== expected) {
    throw new Error(`${label || 'Value'}: expected ${String(expected)}, got ${String(actual)}`);
  }
}

/** truthy 검증 */
export function expectTruthy(value: unknown, label?: string): void {
  if (!value) {
    throw new Error(`${label || 'Value'} expected to be truthy, got ${String(value)}`);
  }
}

// ── 테스트 카운터 리셋 ───────────────────────────────────────

export function resetCounters(): void {
  userCounter = 0;
  itemCounter = 0;
}
