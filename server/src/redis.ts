import { createClient } from 'redis';

export const redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
});

let _redisConnected = false;

export function redisConnected(): boolean {
    return _redisConnected;
}

redisClient.on('connect', () => {
    _redisConnected = true;
    console.log('[Redis] connected');
});

redisClient.on('disconnect', () => {
    _redisConnected = false;
    console.warn('[Redis] disconnected — will attempt reconnect');
});

redisClient.on('error', (err) => {
    _redisConnected = false;
    console.error('[Redis] error:', err?.message ?? err);
});

redisClient.on('reconnecting', () => {
    console.log('[Redis] reconnecting...');
});

redisClient.on('ready', () => {
    _redisConnected = true;
    console.log('[Redis] ready');
});
