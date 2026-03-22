# P52 — Performance Profiling & Optimization Report

**Date:** 2026-03-22
**Vite:** v5.4.21 | **Node:** ts-node-dev + Fastify | **Platform:** macOS Darwin 25.3.0

---

## 1. Build Bundle Analysis

### Chunk Breakdown

| Chunk | Raw Size | Gzip | Sourcemap | Notes |
|-------|----------|------|-----------|-------|
| `phaser-*.js` | 1,478.5 KB | 337.7 KB | 10,170 KB | Phaser 3 — largest dependency |
| `index-*.js` | 193.8 KB | 53.9 KB | 520 KB | Application code (66 modules) |
| `vendor-*.js` | 28.9 KB | 9.5 KB | 129 KB | Other node_modules |
| `network-*.js` | 12.6 KB | 4.1 KB | 58 KB | Socket.IO + Protobuf |
| `index.html` | 2.4 KB | 1.1 KB | — | Entry HTML |
| **Total JS** | **1,713.8 KB** | **405.2 KB** | **10,877 KB** | — |

### Build Performance

- **Build time:** 6.10s (66 modules transformed)
- **Largest chunk:** phaser (1,478 KB) — under 2MB threshold
- **Gzip ratio:** ~76% reduction (1,714 KB → 405 KB)
- **Dist directory total:** 765 MB (includes assets, sourcemaps, compressed variants)

### Tree-shaking Effectiveness

- 66 modules → 4 well-separated chunks
- Manual chunk splitting configured: `phaser`, `network`, `vendor`, `app`
- No unused export warnings from Vite build
- Application code (194 KB) is lean relative to total feature scope (302 API routes)

### Compression

- **gzip** + **brotli** dual compression via `vite-plugin-compression`
- Threshold: 1024 bytes (all chunks compressed)
- **Issue found:** Compression plugin outputs atlas JSON `.gz` files with absolute filesystem paths in dist/ — this won't affect JS bundles but may cause 404s for pre-compressed static JSON assets

### Build Optimizations Already In Place

- `manualChunks` — Phaser, network, vendor separation
- `assetsInlineLimit: 4096` — small assets base64-inlined
- `modulePreload.polyfill: true` — critical chunk preload
- `target: es2020` — modern syntax, smaller output
- `minify: esbuild` — fast minification
- `optimizeDeps.include: ['phaser', 'socket.io-client']` — dev server pre-bundling

---

## 2. Server Performance

### Startup Timeline

```
T+0ms    ts-node-dev compilation start
T+?ms    Module load: EndlessDungeon, WorldBoss, Transcendence managers
T+0ms    Error handler registered              (1774113063347)
T+0ms    Security middleware registered (rate limiter + input validator)
T+1ms    PvP API routes registered
T+2-15ms 45 route modules registered (declarative manifest)
T+44ms   Server listening on :3000             (1774113063391)
T+45ms   Socket.io + all handlers attached
T+47ms   Redis connected
T+74ms   APM init attempted (FAILED — server already listening)
T+79ms   Tick manager started (physics:20Hz, network:10Hz, logic:2Hz)
T+88ms   Monster spawn manager initialized
T+88ms   Quest reset scheduler started
```

**Route registration to server ready: ~44ms** (extremely fast)
**Full bootstrap (modules → schedulers): ~88ms**

### API Response Times (from server logs)

| Endpoint | Method | Response Time | Status |
|----------|--------|--------------|--------|
| `/api/health` | GET | 3.4 ms | 200 |
| `/api/auth/login` | POST | 13.8 ms | 200 |
| `/api/class/tree` | GET | 4.5 ms | 200 |
| `/api/characters` | GET | 8.8 ms | 200 |

All endpoints respond under 15ms — excellent for a game server.

### Route Statistics

- **Total HTTP routes:** 302
- **GET routes:** 142 | **POST routes:** 139 | **PATCH:** 12 | **DELETE:** 9
- **Route modules:** 45 (loaded via declarative manifest with feature flags)
- **Heaviest modules:** shareRoutes (45), socialRoutes (16), combatRoutes (15), adminRoutes (13)

### Startup Issues Found

1. **APM hooks fail to register** — `initInfraServices()` is called after `fastify.listen()`, so `addHook()` throws `FST_ERR_INSTANCE_ALREADY_LISTENING`. APM metrics are not being collected.
2. **Dialogue tree loader returns 0** — `dialogueLoader.loadAll()` finds 0 NPCs (may be expected if DB has no NPC dialogue data yet)

### Async/Sync Analysis

- **No synchronous blocking operations detected** at startup
- All DB queries use async Prisma
- No `fs.readFileSync`, `execSync`, or sync JSON parsing of large files
- Redis connection is async with graceful degradation
- Tick manager uses `setInterval` (non-blocking)

---

## 3. Asset Loading Analysis

### Overview

| Metric | Value |
|--------|-------|
| **Total files** | 253 |
| **Total size** | 205 MB |
| **Average file size** | 827 KB |
| **Files > 1 MB** | 48 (19%) |
| **Files > 500 KB** | 72 (28%) |

### Files by Type

| Type | Count | Total Size | Avg Size | % of Total |
|------|-------|------------|----------|------------|
| PNG (images) | 63 | 182.4 MB | 2,894 KB | 89% |
| OGG (audio) | 137 | 21.7 MB | 163 KB | 11% |
| JSON (atlas metadata) | 53 | ~180 KB | ~3.4 KB | <1% |

### Top 20 Largest Files

| # | File | Size (MB) | Type |
|---|------|-----------|------|
| 1 | atlas_monster_northland.png | 11.27 | Monster atlas |
| 2 | atlas_cosmetic_s3.png | 9.63 | Cosmetic atlas |
| 3 | atlas_cosmetic_s2.png | 8.92 | Cosmetic atlas |
| 4 | atlas_cosmetic_s1.png | 8.49 | Cosmetic atlas |
| 5 | atlas_bg_argentium.png | 5.37 | Background atlas |
| 6 | atlas_bg_abyss.png | 5.30 | Background atlas |
| 7 | atlas_bg_northland.png | 5.21 | Background atlas |
| 8 | atlas_bg_britalia.png | 5.17 | Background atlas |
| 9 | atlas_bg_temporal_rift.png | 5.09 | Background atlas |
| 10 | ui.png | 4.93 | UI atlas (DUPLICATE) |
| 11 | atlas_ui_frame_default.png | 4.93 | UI atlas (DUPLICATE) |
| 12 | atlas_bg_fog_sea.png | 4.59 | Background atlas |
| 13 | atlas_monster_fog_sea.png | 4.53 | Monster atlas |
| 14 | atlas_ui_frame_seasonal.png | 4.52 | UI atlas |
| 15 | atlas_ui_frame_dark.png | 4.51 | UI atlas |
| 16 | atlas_bg_sylvanheim.png | 4.36 | Background atlas |
| 17 | atlas_bg_solaris.png | 4.21 | Background atlas |
| 18 | atlas_monster_solaris.png | 4.02 | Monster atlas |
| 19 | atlas_monster_argentium.png | 3.71 | Monster atlas |
| 20 | atlas_monster_abyss.png | 3.62 | Monster atlas |

### Duplicate Files Detected

| File A | File B | Size | Savings |
|--------|--------|------|---------|
| `atlas_char_memory_breaker.png` | `characters.png` | 3.0 MB | 3.0 MB |
| `atlas_ui_frame_default.png` | `ui.png` | 5.1 MB | 5.1 MB |
| `atlas_vfx_time_guardian.png` | `effects.png` | 0.6 MB | 0.6 MB |
| **Total redundant** | | | **8.7 MB** |

### Compression Opportunity

PNG assets (182.4 MB) are uncompressed texture atlases. Potential optimizations:

- **PNG → WebP conversion:** 25-40% size reduction typical → saves ~45-73 MB
- **PNG optimization (pngquant/oxipng):** 10-20% lossless reduction → saves ~18-36 MB
- **4096×4096 atlas review:** 4 files use max texture size — evaluate if 2048×2048 suffices
- **Duplicate removal:** immediate 8.7 MB savings

---

## 4. Memory Usage Estimates

### Client (Browser)

| Component | Estimated Memory |
|-----------|-----------------|
| Phaser 3 runtime | ~30-50 MB |
| JS heap (app code) | ~10-20 MB |
| Loaded textures (per zone, ~3-5 atlases) | ~20-50 MB GPU |
| Audio buffers (active BGM + SFX) | ~5-10 MB |
| DOM + Canvas | ~10 MB |
| **Total estimated** | **~75-140 MB** |

### Server (Node.js)

| Component | Estimated Memory |
|-----------|-----------------|
| Node.js baseline + Fastify | ~50-80 MB |
| 302 route handlers | ~5-10 MB |
| Tick manager (3 layers) | ~2-5 MB |
| Socket.io connections (per 100 users) | ~10-20 MB |
| Redis client + cache | ~5-10 MB |
| Prisma client | ~10-20 MB |
| **Total estimated (100 users)** | **~82-145 MB** |

---

## 5. Recommendations

### P1 — Critical (Immediate)

| # | Issue | Impact | Effort |
|---|-------|--------|--------|
| 1 | **Fix APM hook registration order** — Move `initApm()` call before `fastify.listen()` in compositionRoot.ts | APM metrics not collecting; zero observability on production response times | 5 min |
| 2 | **Remove 3 duplicate asset files** — `characters.png`, `ui.png`, `effects.png` are exact copies of named atlas files | 8.7 MB wasted bandwidth per cold load | 15 min (verify references first) |

### P2 — High Value (This Sprint)

| # | Issue | Impact | Effort |
|---|-------|--------|--------|
| 3 | **PNG → WebP with fallback** — Convert atlas PNGs to WebP for browsers that support it | ~45-73 MB (25-40%) asset size reduction | 2-4 hours |
| 4 | **Lazy-load zone assets** — Only download atlas/audio for current zone, not all zones | Reduces initial load from 205 MB to ~30-40 MB per zone | 4-8 hours |
| 5 | **Fix vite-plugin-compression paths** — Atlas JSON .gz files use absolute paths in dist/ | Pre-compressed JSON atlas files may 404 in production | 30 min |
| 6 | **PNG lossless optimization** — Run pngquant/oxipng on all atlas files | 10-20% size reduction (~18-36 MB) | 1 hour (scripted) |

### P3 — Nice to Have (Backlog)

| # | Issue | Impact | Effort |
|---|-------|--------|--------|
| 7 | **Enable rollup-plugin-visualizer** — Currently disabled (ESM-only comment) | Better bundle analysis for future optimization | 30 min |
| 8 | **Audio sprite sheets** — Combine small OGG files per zone | Fewer HTTP requests, better caching | 4 hours |
| 9 | **4096×4096 atlas audit** — Check if cosmetic atlases need full 4K resolution | Potential 50-75% size reduction per file | 2 hours |
| 10 | **HTTP/2 server push** for critical assets — Push Phaser chunk + first zone atlas | Faster perceived load time | 2-4 hours |
| 11 | **CDN + Cache-Control headers** — Asset fingerprinting is in place (hash in filenames), add long-lived cache headers | Eliminates re-download on repeat visits | 1 hour |
| 12 | **shareRoutes refactor** — 45 routes in a single file; split by feature area | Maintainability + potential tree-shaking | 2 hours |

---

## 6. Quick Wins Applied

### QW-1: APM Hook Registration Fix

**Problem:** `registerApmHooks()` called after `fastify.listen()` → hooks silently fail.
**Fix:** Moved APM init call into `registerMiddleware()` (before listen) in `runtimeServices.ts`.

### QW-2: .gitignore Verification

**Status:** `dist/` already in root `.gitignore` — no change needed.

---

## Summary

| Area | Status | Grade |
|------|--------|-------|
| **Bundle size** | 405 KB gzipped JS, well-chunked | A |
| **Build config** | Comprehensive optimizations already in place | A |
| **Server startup** | 88ms full bootstrap, no sync blocking | A+ |
| **API response time** | 3-14ms across all tested endpoints | A+ |
| **Asset size** | 205 MB total, 89% PNG — optimization opportunity | C |
| **Duplicate assets** | 3 pairs, 8.7 MB redundant | D |
| **APM/Observability** | Hooks fail silently — blind spot | D (fixed → B) |

**Bottom line:** JS bundle and server performance are excellent. The main optimization opportunity is the 205 MB asset pipeline — WebP conversion + duplicate removal + lazy loading per zone would bring initial load under 40 MB.
