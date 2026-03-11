/**
 * APM 알림 시스템 — 임계치 기반 경고 + 웹훅 + Redis pub/sub
 * 쿨다운: 동일 알림 5분 내 재발동 금지
 */

import { getMetricsSummary } from './metrics';
import { redisClient, redisConnected } from '../redis';

// ── 임계치 설정 ───────────────────────────────────────────────

/** 소켓 레이턴시 임계치 (ms) */
const SOCKET_LATENCY_THRESHOLD = parseInt(
    process.env.APM_SOCKET_LATENCY_THRESHOLD || '150', 10
);

/** HTTP 응답 시간 임계치 (ms) */
const HTTP_RESPONSE_THRESHOLD = parseInt(
    process.env.APM_HTTP_RESPONSE_THRESHOLD || '500', 10
);

/** 메모리 사용량 임계치 (MB, RSS 기준) */
const MEMORY_THRESHOLD_MB = parseInt(
    process.env.APM_MEMORY_THRESHOLD_MB || '512', 10
);

/** 알림 체크 간격 (ms) */
const CHECK_INTERVAL = parseInt(
    process.env.APM_CHECK_INTERVAL || '10000', 10
);

/** 쿨다운 기간 (ms) — 같은 알림 재발동 방지 */
const COOLDOWN_MS = 5 * 60 * 1000;

/** 웹훅 URL (선택적) */
const ALERT_WEBHOOK_URL = process.env.ALERT_WEBHOOK_URL || '';

// ── 알림 타입 ─────────────────────────────────────────────────

type AlertType = 'socket_latency' | 'http_response' | 'memory_rss';

interface AlertPayload {
    type: AlertType;
    message: string;
    threshold: number;
    actual: number;
    timestamp: string;
}

// ── 쿨다운 관리 ───────────────────────────────────────────────

const lastAlertTimes = new Map<AlertType, number>();

function isOnCooldown(type: AlertType): boolean {
    const last = lastAlertTimes.get(type);
    if (!last) return false;
    return Date.now() - last < COOLDOWN_MS;
}

function markAlertSent(type: AlertType): void {
    lastAlertTimes.set(type, Date.now());
}

// ── 알림 발송 ─────────────────────────────────────────────────

/** 콘솔 경고 (구조화된 JSON 로그) */
function logAlert(payload: AlertPayload): void {
    console.warn(`[APM:ALERT] ${JSON.stringify(payload)}`);
}

/** 웹훅 발송 (선택적, 비동기 fire-and-forget) */
async function sendWebhook(payload: AlertPayload): Promise<void> {
    if (!ALERT_WEBHOOK_URL) return;

    try {
        const response = await fetch(ALERT_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(5000),
        });
        if (!response.ok) {
            console.warn(`[APM:ALERT] 웹훅 전송 실패: HTTP ${response.status}`);
        }
    } catch (err) {
        console.warn(`[APM:ALERT] 웹훅 전송 오류:`, err);
    }
}

/** Redis pub/sub 알림 (선택적) */
async function publishRedisAlert(payload: AlertPayload): Promise<void> {
    if (!redisConnected) return;

    try {
        await redisClient.publish('apm:alerts', JSON.stringify(payload));
    } catch (err) {
        console.warn(`[APM:ALERT] Redis pub/sub 전송 오류:`, err);
    }
}

/** 단일 알림 발송 (콘솔 + 웹훅 + Redis) */
async function fireAlert(payload: AlertPayload): Promise<void> {
    logAlert(payload);
    // 웹훅과 Redis는 비동기로 병렬 실행, 실패해도 무시
    void sendWebhook(payload);
    void publishRedisAlert(payload);
}

// ── 임계치 체크 로직 ──────────────────────────────────────────

async function checkThresholds(): Promise<void> {
    const summary = getMetricsSummary();
    const now = new Date().toISOString();

    // 1) 소켓 레이턴시 p95 체크
    if (
        summary.socketLatency.count > 0 &&
        summary.socketLatency.p95 > SOCKET_LATENCY_THRESHOLD &&
        !isOnCooldown('socket_latency')
    ) {
        markAlertSent('socket_latency');
        await fireAlert({
            type: 'socket_latency',
            message: `소켓 레이턴시 p95가 임계치를 초과했습니다`,
            threshold: SOCKET_LATENCY_THRESHOLD,
            actual: summary.socketLatency.p95,
            timestamp: now,
        });
    }

    // 2) HTTP 응답 시간 p95 체크
    if (
        summary.httpResponseTime.count > 0 &&
        summary.httpResponseTime.p95 > HTTP_RESPONSE_THRESHOLD &&
        !isOnCooldown('http_response')
    ) {
        markAlertSent('http_response');
        await fireAlert({
            type: 'http_response',
            message: `HTTP 응답 시간 p95가 임계치를 초과했습니다`,
            threshold: HTTP_RESPONSE_THRESHOLD,
            actual: summary.httpResponseTime.p95,
            timestamp: now,
        });
    }

    // 3) 메모리 RSS 체크
    if (
        summary.memory.rss > MEMORY_THRESHOLD_MB &&
        !isOnCooldown('memory_rss')
    ) {
        markAlertSent('memory_rss');
        await fireAlert({
            type: 'memory_rss',
            message: `메모리 RSS가 임계치를 초과했습니다`,
            threshold: MEMORY_THRESHOLD_MB,
            actual: summary.memory.rss,
            timestamp: now,
        });
    }
}

// ── 타이머 관리 ───────────────────────────────────────────────

let _alertTimer: ReturnType<typeof setInterval> | null = null;

/** 알림 체커 시작 */
export function startAlertChecker(): void {
    if (_alertTimer) {
        clearInterval(_alertTimer);
    }
    _alertTimer = setInterval(() => {
        void checkThresholds();
    }, CHECK_INTERVAL);
    console.log(`[APM] 알림 체커 시작 (${CHECK_INTERVAL}ms 간격, 쿨다운 ${COOLDOWN_MS / 1000}초)`);
}

/** 알림 체커 중지 */
export function stopAlertChecker(): void {
    if (_alertTimer) {
        clearInterval(_alertTimer);
        _alertTimer = null;
    }
    lastAlertTimes.clear();
    console.log('[APM] 알림 체커 중지');
}
