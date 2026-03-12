# CDN + 에셋 최적화 가이드 — P12-13

> 작성일: 2026-03-12
> 대상: 에테르나 크로니클 정적 에셋 배포

---

## 1. 에셋 Fingerprinting

Vite 빌드 시 모든 정적 에셋에 content hash를 자동 부여:

```
assets/sprite-a1b2c3d4.png
js/phaser-e5f6g7h8.js
js/vendor-i9j0k1l2.js
```

### Vite 설정 (client/vite.config.ts)

```ts
rollupOptions: {
  output: {
    assetFileNames: 'assets/[name]-[hash][extname]',
    chunkFileNames: 'js/[name]-[hash].js',
    entryFileNames: 'js/[name]-[hash].js',
  }
}
```

**효과**: 파일 내용이 바뀌면 hash가 변경 → 브라우저 캐시 자동 무효화. 내용이 같으면 동일 URL → 캐시 히트.

---

## 2. 압축 전략

### Brotli (권장, ~20% 더 효율적)

```bash
# 빌드 후 .br 파일 생성
find dist -type f \( -name '*.js' -o -name '*.css' -o -name '*.html' -o -name '*.json' -o -name '*.svg' \) \
  -exec brotli --best {} \;
```

### Gzip (호환성 fallback)

```bash
find dist -type f \( -name '*.js' -o -name '*.css' -o -name '*.html' -o -name '*.json' -o -name '*.svg' \) \
  -exec gzip -9 -k {} \;
```

### CDN/Nginx 설정

```nginx
# Brotli 우선, gzip fallback
brotli on;
brotli_types text/html text/css application/javascript application/json image/svg+xml;
brotli_comp_level 6;

gzip on;
gzip_types text/html text/css application/javascript application/json image/svg+xml;
gzip_comp_level 6;
gzip_min_length 1024;
```

---

## 3. 캐시 헤더 정책

| 에셋 유형 | Cache-Control | 이유 |
|----------|---------------|------|
| JS/CSS (hashed) | `public, max-age=31536000, immutable` | hash 기반 → 내용 불변 |
| index.html | `no-cache, must-revalidate` | 진입점은 항상 최신 |
| 이미지/폰트 (hashed) | `public, max-age=31536000, immutable` | 대용량, 불변 |
| API 응답 | `private, no-store` | 동적 데이터 |
| 게임 데이터 JSON | `public, max-age=600, s-maxage=300` | CDN 5분, 브라우저 10분 |

### Nginx 설정 예시

```nginx
location /assets/ {
    add_header Cache-Control "public, max-age=31536000, immutable";
    add_header Vary "Accept-Encoding";
}

location /js/ {
    add_header Cache-Control "public, max-age=31536000, immutable";
    add_header Vary "Accept-Encoding";
}

location /index.html {
    add_header Cache-Control "no-cache, must-revalidate";
}
```

---

## 4. k8s Ingress 캐시 헤더 설정

```yaml
# k8s/ingress-cache.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: aeterna-client-ingress
  annotations:
    # Nginx Ingress 캐시 설정
    nginx.ingress.kubernetes.io/configuration-snippet: |
      # Hashed 에셋 — 1년 캐시 (immutable)
      location ~* \.(js|css|png|jpg|jpeg|webp|gif|svg|woff2?|ttf|eot)$ {
        if ($uri ~* "-[a-f0-9]{8,}\.(js|css|png|jpg|jpeg|webp|gif|svg|woff2?|ttf|eot)$") {
          add_header Cache-Control "public, max-age=31536000, immutable";
        }
      }

      # HTML — 항상 검증
      location ~* \.html$ {
        add_header Cache-Control "no-cache, must-revalidate";
      }

    # Brotli/Gzip
    nginx.ingress.kubernetes.io/enable-brotli: "true"
    nginx.ingress.kubernetes.io/brotli-level: "6"
    nginx.ingress.kubernetes.io/enable-gzip: "true"
    nginx.ingress.kubernetes.io/gzip-level: "6"
    nginx.ingress.kubernetes.io/gzip-min-length: "1024"
    nginx.ingress.kubernetes.io/gzip-types: |
      text/html text/css application/javascript application/json image/svg+xml
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - play.aeterna.gg
      secretName: aeterna-tls
  rules:
    - host: play.aeterna.gg
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: aeterna-client
                port:
                  number: 80
```

---

## 5. 이미지 최적화

### 권장 포맷

| 용도 | 포맷 | 품질 | 비고 |
|------|------|------|------|
| 스프라이트시트 | WebP | 80% | Phaser 지원, PNG 대비 ~30% 감소 |
| UI 아이콘 | SVG or WebP | - | 벡터 우선 |
| 배경/일러스트 | WebP + AVIF fallback | 75% | 대형 이미지는 AVIF가 ~50% 더 효율 |
| 애니메이션 | WebP animated | 80% | GIF 대비 ~60% 감소 |

### 최적화 스크립트

`tools/optimize-assets.sh` 참조.

---

## 6. CDN 구성 권장사항

```
[사용자] → [CDN Edge] → [k8s Ingress] → [aeterna-client Pod]
                ↓
          [에셋 캐시 히트] → 직접 응답 (원본 미접촉)
```

- **CDN 추천**: CloudFlare (무료 티어 가능), AWS CloudFront, Fastly
- **TTL**: CDN 레벨에서 hashed 에셋 1년, HTML 60초
- **Purge**: 배포 시 HTML만 purge (hashed 에셋은 자동 무효화)
- **Origin Shield**: 활성화 권장 (오리진 부하 감소)
