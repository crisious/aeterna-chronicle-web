/**
 * P9-13 계정 보안 — TOTP 2FA + 비밀번호 정책 + 세션 관리
 *
 * - TOTP 2FA: QR 코드 URI 생성, 검증, 활성화/비활성화
 * - 비밀번호 정책: 최소 8자, 대소문자 + 숫자 + 특수문자
 * - 세션 관리: 디바이스 목록 + 원격 로그아웃
 * - LoginSession Prisma 모델 활용
 */
import { createHmac, randomBytes } from 'crypto';
import { prisma } from '../db';
import { blacklistToken } from './jwtManager';

// ─── TOTP 상수 ──────────────────────────────────────────────────

/** TOTP 시간 스텝 (초) */
const TOTP_STEP = 30;
/** TOTP 코드 자릿수 */
const TOTP_DIGITS = 6;
/** TOTP 허용 윈도우 (±1 스텝) */
const TOTP_WINDOW = 1;
/** 앱 이름 (QR 코드 표시용) */
const APP_NAME = 'AeternaChronicle';
/** Secret 길이 (bytes) */
const SECRET_LENGTH = 20;

// ─── 비밀번호 정책 ──────────────────────────────────────────────

export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * 비밀번호 정책 검증.
 * - 최소 8자
 * - 대문자 포함
 * - 소문자 포함
 * - 숫자 포함
 * - 특수문자 포함
 */
export function validatePasswordPolicy(password: string): PasswordValidationResult {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('비밀번호는 최소 8자 이상이어야 합니다.');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('대문자를 포함해야 합니다.');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('소문자를 포함해야 합니다.');
  }
  if (!/\d/.test(password)) {
    errors.push('숫자를 포함해야 합니다.');
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('특수문자를 포함해야 합니다.');
  }

  return { valid: errors.length === 0, errors };
}

// ─── TOTP 구현 ──────────────────────────────────────────────────

/** Base32 인코딩 (RFC 4648) */
function base32Encode(buffer: Buffer): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (const byte of buffer) {
    bits += byte.toString(2).padStart(8, '0');
  }
  let result = '';
  for (let i = 0; i < bits.length; i += 5) {
    const chunk = bits.slice(i, i + 5).padEnd(5, '0');
    result += alphabet[parseInt(chunk, 2)];
  }
  return result;
}

/** Base32 디코딩 */
function base32Decode(encoded: string): Buffer {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (const ch of encoded.toUpperCase()) {
    const idx = alphabet.indexOf(ch);
    if (idx === -1) continue;
    bits += idx.toString(2).padStart(5, '0');
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

/** TOTP 코드 생성 (HMAC-SHA1 기반) */
function generateTOTP(secret: Buffer, counter: number): string {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));

  const hmac = createHmac('sha1', secret).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  return (code % 10 ** TOTP_DIGITS).toString().padStart(TOTP_DIGITS, '0');
}

/** 현재 TOTP 코드 검증 (±1 윈도우) */
function verifyTOTP(secret: Buffer, token: string): boolean {
  const counter = Math.floor(Date.now() / 1000 / TOTP_STEP);
  for (let i = -TOTP_WINDOW; i <= TOTP_WINDOW; i++) {
    if (generateTOTP(secret, counter + i) === token) return true;
  }
  return false;
}

// ─── 2FA 관리 ───────────────────────────────────────────────────

/**
 * 2FA 설정 시작: secret 생성 + otpauth URI 반환.
 * QR 코드 생성은 클라이언트가 URI로 수행.
 */
export async function setup2FA(
  userId: string,
): Promise<{ secret: string; otpauthUri: string }> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('유저를 찾을 수 없습니다.');

  const secretBuffer = randomBytes(SECRET_LENGTH);
  const secret = base32Encode(secretBuffer);

  // otpauth URI (Google Authenticator 호환)
  const otpauthUri =
    `otpauth://totp/${APP_NAME}:${encodeURIComponent(user.email)}` +
    `?secret=${secret}&issuer=${APP_NAME}&digits=${TOTP_DIGITS}&period=${TOTP_STEP}`;

  // DB에 임시 저장 (활성화 전까지 pending 상태)
  await prisma.user.update({
    where: { id: userId },
    data: {
      // 2FA secret은 User 모델에 필드 추가 필요
      // 현재는 JSON 메타데이터로 저장
    },
  });

  // LoginSession 또는 별도 저장소에 pending secret 저장
  // 실제 구현에서는 암호화 후 저장
  await storeTemp2FASecret(userId, secret);

  return { secret, otpauthUri };
}

/** 임시 2FA secret 저장 (Redis 또는 in-memory) */
const pending2FASecrets = new Map<string, { secret: string; createdAt: number }>();

async function storeTemp2FASecret(userId: string, secret: string): Promise<void> {
  pending2FASecrets.set(userId, { secret, createdAt: Date.now() });
  // 10분 후 자동 만료
  setTimeout(() => {
    const entry = pending2FASecrets.get(userId);
    if (entry && Date.now() - entry.createdAt > 10 * 60 * 1000) {
      pending2FASecrets.delete(userId);
    }
  }, 10 * 60 * 1000);
}

/**
 * 2FA 활성화: 클라이언트가 생성된 코드로 검증 후 활성화.
 */
export async function activate2FA(userId: string, token: string): Promise<boolean> {
  const entry = pending2FASecrets.get(userId);
  if (!entry) throw new Error('2FA 설정이 시작되지 않았습니다. 먼저 setup을 호출하세요.');

  const secretBuffer = base32Decode(entry.secret);
  if (!verifyTOTP(secretBuffer, token)) {
    throw new Error('잘못된 인증 코드입니다.');
  }

  // 검증 성공 → DB에 영구 저장
  // User 모델에 twoFactorSecret, twoFactorEnabled 필드가 있다고 가정
  // 현재 스키마에 없으므로 LoginSession 메타데이터로 대체
  await prisma.loginSession.create({
    data: {
      userId,
      deviceName: '2FA_SECRET',
      deviceType: 'system',
      ipAddress: '0.0.0.0',
      userAgent: entry.secret, // 실제로는 암호화 필요
      isActive: true,
    },
  });

  pending2FASecrets.delete(userId);
  return true;
}

/**
 * 2FA 코드 검증 (로그인 시).
 */
export async function verify2FAToken(userId: string, token: string): Promise<boolean> {
  // 2FA secret 조회
  const secretRecord = await prisma.loginSession.findFirst({
    where: { userId, deviceName: '2FA_SECRET', isActive: true },
  });

  if (!secretRecord) {
    // 2FA 미설정 → 통과
    return true;
  }

  const secretBuffer = base32Decode(secretRecord.userAgent);
  return verifyTOTP(secretBuffer, token);
}

/** 2FA 비활성화 */
export async function disable2FA(userId: string, token: string): Promise<boolean> {
  // 현재 코드로 검증 후 비활성화
  const valid = await verify2FAToken(userId, token);
  if (!valid) throw new Error('잘못된 인증 코드입니다.');

  await prisma.loginSession.deleteMany({
    where: { userId, deviceName: '2FA_SECRET' },
  });

  return true;
}

/** 2FA 활성 여부 확인 */
export async function is2FAEnabled(userId: string): Promise<boolean> {
  const record = await prisma.loginSession.findFirst({
    where: { userId, deviceName: '2FA_SECRET', isActive: true },
  });
  return !!record;
}

// ─── 세션(디바이스) 관리 ────────────────────────────────────────

export interface DeviceSession {
  id: string;
  deviceName: string;
  deviceType: string;
  ipAddress: string;
  lastActiveAt: Date;
  isActive: boolean;
  isCurrent: boolean;
}

/** 로그인 세션 생성 */
export async function createLoginSession(params: {
  userId: string;
  deviceName: string;
  deviceType: string; // 'web', 'mobile', 'desktop'
  ipAddress: string;
  userAgent: string;
  accessToken: string;
}): Promise<string> {
  const session = await prisma.loginSession.create({
    data: {
      userId: params.userId,
      deviceName: params.deviceName,
      deviceType: params.deviceType,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      accessToken: params.accessToken,
      isActive: true,
    },
  });
  return session.id;
}

/** 디바이스 목록 조회 (2FA secret 제외) */
export async function getActiveSessions(
  userId: string,
  currentSessionId?: string,
): Promise<DeviceSession[]> {
  const sessions = await prisma.loginSession.findMany({
    where: {
      userId,
      isActive: true,
      deviceName: { not: '2FA_SECRET' },
    },
    orderBy: { lastActiveAt: 'desc' },
  });

  return sessions.map((s) => ({
    id: s.id,
    deviceName: s.deviceName,
    deviceType: s.deviceType,
    ipAddress: s.ipAddress,
    lastActiveAt: s.lastActiveAt,
    isActive: s.isActive,
    isCurrent: s.id === currentSessionId,
  }));
}

/** 원격 로그아웃 (특정 세션) */
export async function revokeSession(
  userId: string,
  sessionId: string,
): Promise<boolean> {
  const session = await prisma.loginSession.findFirst({
    where: { id: sessionId, userId },
  });
  if (!session) throw new Error('세션을 찾을 수 없습니다.');

  // Access Token 블랙리스트 등록
  if (session.accessToken) {
    await blacklistToken(session.accessToken, 15 * 60); // 15분 TTL
  }

  await prisma.loginSession.update({
    where: { id: sessionId },
    data: { isActive: false },
  });

  return true;
}

/** 전체 원격 로그아웃 (현재 세션 제외) */
export async function revokeAllSessions(
  userId: string,
  currentSessionId?: string,
): Promise<number> {
  const sessions = await prisma.loginSession.findMany({
    where: {
      userId,
      isActive: true,
      deviceName: { not: '2FA_SECRET' },
      ...(currentSessionId ? { id: { not: currentSessionId } } : {}),
    },
  });

  // 모든 Access Token 블랙리스트
  for (const session of sessions) {
    if (session.accessToken) {
      await blacklistToken(session.accessToken, 15 * 60);
    }
  }

  const result = await prisma.loginSession.updateMany({
    where: {
      userId,
      isActive: true,
      deviceName: { not: '2FA_SECRET' },
      ...(currentSessionId ? { id: { not: currentSessionId } } : {}),
    },
    data: { isActive: false },
  });

  return result.count;
}

/** 세션 활성 갱신 (heartbeat) */
export async function touchSession(sessionId: string): Promise<void> {
  await prisma.loginSession.update({
    where: { id: sessionId },
    data: { lastActiveAt: new Date() },
  });
}
