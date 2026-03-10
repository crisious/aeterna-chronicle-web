import { createClient } from 'redis';

export const redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
});

export let redisConnected = false;

redisClient.on('connect', () => {
    redisConnected = true;
});

redisClient.on('error', () => {
    redisConnected = false;
});
