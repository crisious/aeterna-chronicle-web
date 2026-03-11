// ── 에테르나 크로니클 클라이언트 — Vite 설정 ──────────────
import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => ({
    server: {
        port: 5173,
        open: true,
    },

    // 프로덕션 base path (CDN 배포 시 변경)
    base: '/',

    build: {
        outDir: 'dist',
        assetsDir: 'assets',

        // 프로덕션 소스맵 (디버깅용)
        sourcemap: mode === 'production',

        // 청크 분할: vendor + phaser 분리
        rollupOptions: {
            output: {
                manualChunks: {
                    // Phaser.js 대형 라이브러리 별도 청크
                    phaser: ['phaser'],
                    // Socket.IO + protobuf 네트워크 레이어
                    network: ['socket.io-client', 'protobufjs'],
                },
            },
        },

        // 청크 크기 경고 임계값 (Phaser가 크므로 상향)
        chunkSizeWarningLimit: 2000,

        // 타겟 브라우저
        target: 'es2020',
    },

    // 환경변수 접두사
    envPrefix: 'VITE_',
}));
