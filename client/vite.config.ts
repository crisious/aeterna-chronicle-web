// ── 에테르나 크로니클 클라이언트 — Vite 설정 ──────────────
// P12-09: 번들 최적화 — tree-shaking, 코드 스플리팅, 동적 import, 번들 분석
import { defineConfig } from 'vite';
import viteCompression from 'vite-plugin-compression';
// import { visualizer } from 'rollup-plugin-visualizer'; // ESM-only, disabled for now

export default defineConfig(({ mode }) => ({
    plugins: [
        // gzip 압축
        viteCompression({
            algorithm: 'gzip',
            ext: '.gz',
            threshold: 1024,
        }),
        // brotli 압축
        viteCompression({
            algorithm: 'brotliCompress',
            ext: '.br',
            threshold: 1024,
        }),
    ],

    server: {
        port: 5173,
        open: true,
        proxy: {
            '/api': {
                target: 'http://localhost:3000',
                changeOrigin: true,
            },
            '/auth': {
                target: 'http://localhost:3000',
                changeOrigin: true,
            },
            '/combat': {
                target: 'http://localhost:3000',
                changeOrigin: true,
            },
            '/socket.io': {
                target: 'http://localhost:3000',
                ws: true,
                changeOrigin: true,
            },
        },
    },

    // 프로덕션 base path (CDN 배포 시 변경)
    base: '/',

    build: {
        outDir: 'dist',
        assetsDir: 'assets',

        // 프로덕션 소스맵 (디버깅용)
        sourcemap: mode === 'production',

        // 청크 분할: vendor + phaser + 네트워크 + UI 분리
        rollupOptions: {
            output: {
                manualChunks(id: string) {
                    // Phaser.js — 가장 큰 의존성, 별도 청크
                    if (id.includes('node_modules/phaser')) {
                        return 'phaser';
                    }
                    // Socket.IO + protobuf — 네트워크 레이어
                    if (id.includes('socket.io-client') || id.includes('protobufjs')) {
                        return 'network';
                    }
                    // 기타 node_modules → vendor 청크
                    if (id.includes('node_modules')) {
                        return 'vendor';
                    }
                    return undefined;
                },
                // 에셋 fingerprinting — CDN 캐시 최적화 (P12-13 연계)
                assetFileNames: 'assets/[name]-[hash][extname]',
                chunkFileNames: 'js/[name]-[hash].js',
                entryFileNames: 'js/[name]-[hash].js',
            },
            plugins: [
                // 번들 분석 — `npx vite build` 후 stats.html 생성
                // visualizer disabled (ESM-only module)
            ],
        },

        // 작은 이미지 base64 인라인 (4KB 이하)
        assetsInlineLimit: 4096,

        // 청크 크기 경고 임계값 (Phaser가 크므로 상향)
        chunkSizeWarningLimit: 2000,

        // 모듈 프리로드 — 크리티컬 청크 preload 지시문 자동 생성
        modulePreload: {
            polyfill: true,
        },

        // 타겟 브라우저
        target: 'es2020',

        // 미니파이 설정 — esbuild (기본)
        minify: 'esbuild',

        // CSS 코드 스플리팅
        cssCodeSplit: true,
    },

    // 환경변수 접두사
    envPrefix: 'VITE_',

    // ── 최적화 설정 ──────────────────────────────────────────

    optimizeDeps: {
        // Phaser pre-bundle — 개발 서버 시작 속도 개선
        include: ['phaser', 'socket.io-client'],
    },
}));
