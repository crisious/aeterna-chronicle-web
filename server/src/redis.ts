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
});

redisClient.on('error', () => {
    _redisConnected = false;
});
