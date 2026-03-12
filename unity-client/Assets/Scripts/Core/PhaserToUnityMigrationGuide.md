# Phaser → Unity WebGL 마이그레이션 가이드

> Phase 9 — 에테르나 크로니클  
> 목적: 기존 Phaser 3 웹 클라이언트에서 Unity 6 LTS WebGL로의 전환 가이드

---

## 1. 아키텍처 비교

| 영역 | Phaser 3 (기존) | Unity WebGL (신규) |
|------|----------------|-------------------|
| 렌더링 | Phaser Canvas/WebGL | Unity URP 2D |
| UI | HTML/CSS + Phaser DOM | UI Toolkit (UXML/USS) |
| 네트워크 | 브라우저 WebSocket API | NativeWebSocket (jslib) + UnityWebRequest |
| 상태 관리 | Phaser Scene + 전역 객체 | MonoBehaviour Singleton |
| 에셋 관리 | Phaser Loader | Addressables + AssetBundle |
| 빌드 | Webpack/Vite | Unity WebGL Build (IL2CPP) |
| 사이즈 | ~5MB (gzip) | ~15-30MB (Brotli) |

## 2. 동시 운영 전략

P9에서는 Phaser 클라이언트와 Unity WebGL 클라이언트가 **동일 서버에 동시 접속**합니다.

### 서버 호환성
- 서버 API/WebSocket 프로토콜 변경 없음
- 클라이언트 타입 식별: `X-Client-Type: unity-webgl` 헤더 추가
- 양쪽 클라이언트 동일 JWT 인증 사용

### 전환 시나리오
1. **점진적 전환**: 신규 유저 → Unity, 기존 유저 → Phaser (선택)
2. **A/B 테스트**: 트래픽 일부를 Unity로 라우팅
3. **완전 전환**: P9 RC 승인 후 Phaser deprecation

## 3. 씬 매핑

| Phaser Scene | Unity Scene | 담당 스크립트 |
|-------------|-------------|--------------|
| `BootScene` | `Boot` | `WebGLOptimizer.cs`, `AssetBundleManager.cs` |
| `LoginScene` | `Login` | `LoginPanel.cs` |
| `CharacterSelectScene` | `CharacterCreate` | `CharacterCreatePanel.cs` |
| `WorldScene` | `MainGame` | `ZoneManager.cs`, `TilemapLoader.cs` |
| `BattleScene` | (MainGame 내) | `CombatSystem.cs` |
| `InventoryScene` | (MainGame 내 패널) | `InventoryPanel.cs` |
| `ShopScene` | (MainGame 내 패널) | `ShopPanel.cs` |

## 4. 네트워크 레이어 매핑

### REST API
```
Phaser: fetch() / axios
Unity:  UnityWebRequest (RestApiClient.cs)
```

### WebSocket
```
Phaser: new WebSocket(url)
Unity:  WebSocket jslib (WebSocketClient.cs)
        → 에디터에서는 System.Net.WebSockets
        → WebGL에서는 JavaScript 인터페이스
```

### 인증
```
Phaser: localStorage.setItem('token', ...)
Unity:  PlayerPrefs (WebGL → localStorage 매핑)
        AuthManager.cs가 토큰 관리
```

## 5. 에셋 전환

### 타일맵
- Phaser: JSON 타일맵 (Tiled 포맷)
- Unity: Unity Tilemap (서버에서 청크 데이터 수신 → TilemapLoader.cs)
- 기존 Tiled 맵 데이터는 서버에서 변환 없이 동일 API로 제공

### 스프라이트
- Phaser: TexturePacker JSON
- Unity: Sprite Atlas (Unity 빌트인)
- 변환: TexturePacker → Unity Sprite Atlas 자동 변환 스크립트 필요

### 사운드
- Phaser: Howler.js 또는 Web Audio API
- Unity: AudioSource + AudioClip
- WebGL 제약: 사용자 인터랙션 후에만 오디오 재생 가능

## 6. WebGL 제약사항

### 메모리
- 기본 512MB 힙 (ProjectSettings에서 설정)
- 대규모 에셋 로드 시 OOM 위험 → AssetBundleManager의 LRU 캐시 활용
- 주기적 GC 강제 수행 (WebGLOptimizer.cs)

### 스레딩
- WebGL은 멀티스레드 미지원
- 무거운 연산은 코루틴으로 프레임 분산
- WebWorker를 통한 연산 오프로딩 검토 (향후)

### 파일 시스템
- IndexedDB를 통한 영구 저장 (PlayerPrefs 자동 매핑)
- 대용량 캐시는 Cache Storage API 활용

### 네트워크
- CORS 정책 준수 필수
- WebSocket은 `wss://` 만 사용 (HTTPS 페이지에서)

## 7. 성능 최적화 체크리스트

- [ ] Brotli 압축 활성화 (서버 설정)
- [ ] 코드 스트리핑 (IL2CPP)
- [ ] 에셋 번들 분리 (초기 로딩 최소화)
- [ ] 텍스처 압축: ASTC (WebGL 2.0) / ETC2 (폴백)
- [ ] 셰이더 사전 컴파일 (Shader Variant Collection)
- [ ] 프레임 버짓: 16.6ms (60fps) 내 유지
- [ ] GC Alloc 최소화 (Update에서 new 금지)
- [ ] Object Pooling (몬스터, 이펙트, 데미지 텍스트)

## 8. 테스트 매트릭스

| 브라우저 | 최소 버전 | 비고 |
|---------|----------|------|
| Chrome | 90+ | 주요 타겟 |
| Firefox | 88+ | WebGL 2.0 필수 |
| Safari | 15+ | WebGL 2.0 지원 시작 |
| Edge | 90+ | Chromium 기반 |

### 성능 벤치마크 기준
- 초기 로딩: < 10초 (CDN, Brotli)
- 인게임 FPS: ≥ 30fps (중사양 노트북)
- 메모리: < 400MB (안정 상태)
- 네트워크: < 100KB/s (유휴 상태)

## 9. 롤백 계획

Unity WebGL에 심각한 이슈 발견 시:
1. Phaser 클라이언트로 즉시 폴백 (서버 변경 없음)
2. 라우팅 설정만으로 전환 가능 (CDN/Nginx)
3. P9 RC에서 양쪽 클라이언트 동시 테스트 의무

---

> 이 가이드는 P9 Sprint 1-2 기간 동안 갱신됩니다.
