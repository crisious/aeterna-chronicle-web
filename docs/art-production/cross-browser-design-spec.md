# 🎨 크로스브라우저 디자인 호환성 명세 v1.0

> 작성: 가춘운 (CMO/디자인) · 2026-04-26
> 스프린트: 크로스브라우저 호환성 검증 (Firefox·Safari)
> 연결: `launch_checklist §2.1` · `DESIGN.md` v1.0 · `battle-design-system-v1.md`
> 목적: CBT 출시 전, 디자인 시스템이 Firefox/Safari에서 Chrome과 동일한 시각 경험을 제공하는지 검증·보강

---

## 0. TL;DR — 디자인 회귀 위험 5선 ✨

| # | 위험 | 영향 브라우저 | 등급 | 대응 |
|---|------|--------------|------|------|
| 1 | `backdrop-filter: blur()` 미지원 | Firefox <103, Safari 일부 | 🔴 P0 | `@supports` 폴백 + 솔리드 알파 |
| 2 | `postFX.addGlow` 깨짐 (WebGL2 필터) | Safari (특히 iOS) | 🔴 P0 | CSS box-shadow 폴백 / Canvas2D 모드 |
| 3 | 픽셀 폰트 렌더링 차이 (서브픽셀) | Safari | 🟡 P1 | `image-rendering: pixelated` + crispEdges |
| 4 | 컬러 프로파일 (P3 vs sRGB) | Safari (Display P3) | 🟡 P1 | `color()` 함수 폴백 + sRGB 고정 |
| 5 | 글로우 애니메이션 키프레임 | Firefox | 🟢 P2 | `prefers-reduced-motion` 강제 적용 |

---

## 1. 디자인 토큰 호환성 매트릭스

### 1.1 컬러 (`--ac-*`)

| 토큰 카테고리 | Chrome | Firefox | Safari | 비고 |
|--------------|--------|---------|--------|------|
| 단색 HEX (`#1A1A2E`) | ✅ | ✅ | ✅ | 안전 |
| `rgba()` 알파 | ✅ | ✅ | ✅ | 안전 |
| `color-mix()` | ✅ 111+ | ✅ 113+ | ✅ 16.2+ | **가드 필요** (구버전 폴백) |
| `oklch()` | ✅ 111+ | ✅ 113+ | ✅ 15.4+ | 사용 금지 (CBT 단계) |
| Display P3 | 부분 | 부분 | ✅ | sRGB로 고정 |

**규칙:** CBT v1까지는 **HEX + rgba**만 사용. `color-mix`는 v2 이후 도입.

### 1.2 타이포그래피

| 항목 | 사양 | Firefox 검증 | Safari 검증 |
|------|------|-------------|-------------|
| 픽셀 폰트 (`Galmuri11`) | 11px / 22px | woff2 우선, ttf 폴백 | woff2 + `-webkit-font-smoothing: none` |
| BitmapText (Phaser) | 24/32/48px | crispEdges 강제 | `image-rendering: pixelated` |
| 본문 (`Pretendard`) | 14-16px | 가변 폰트 ✅ | 가변 폰트 ✅ (15+) |
| 강조 금색 글로우 | `text-shadow` 2겹 | ✅ | **렌더링 약간 흐림** → 1겹으로 단순화 |

**Safari 전용 패치:**
```css
@supports (-webkit-touch-callout: none) {
  .font-title {
    text-shadow: 0 0 4px rgba(255, 215, 0, 0.5); /* 2겹 → 1겹 */
    -webkit-font-smoothing: none;
  }
}
```

### 1.3 레이아웃 & 효과

| 효과 | 위치 | 폴백 전략 |
|------|------|----------|
| `backdrop-filter: blur(4px)` | NPC 대화박스, 모달 | `@supports not` → `rgba(13,13,26,0.92)` 솔리드 |
| CSS Grid `subgrid` | 인벤토리 슬롯 | 미사용 (Safari 16+ 한정) |
| `aspect-ratio` | 캐릭터 카드 | ✅ 모든 타겟 지원 |
| `gap` (flex) | 모든 레이아웃 | ✅ 모든 타겟 지원 |
| `clip-path: polygon()` | 게이지 사선컷 | ✅ 안전, 단 Safari 모서리 ±0.5px 차이 허용 |

---

## 2. 비주얼 회귀 테스트 매트릭스 🎯

### 2.1 캡처 대상 화면 (브라우저별 동일 시드)

| 화면 ID | 화면 | 핵심 검증 포인트 |
|---------|------|----------------|
| `vis-01` | 타이틀 화면 | 로고 글로우 · 배경 그라디언트 · 폰트 |
| `vis-02` | 월드맵 | 지역 마커 발광 · 안개 효과 · 미니맵 |
| `vis-03` | NPC 대화 | `backdrop-filter` · 초상화 외곽 · 텍스트 위계 |
| `vis-04` | ATB 전투 (idle) | 게이지 펄스 · 캐릭터 SD · HP/MP 게이지 |
| `vis-05` | ATB 전투 (action) | 대미지 팝업 · 스킬명 카드 · 상태이상 트레이 |
| `vis-06` | 인벤토리 | 등급 글로우 (Common→Mythic→Ether) · 슬롯 그리드 |
| `vis-07` | 스킬트리 | 노드 연결선 · 잠금/해금 상태 · 툴팁 |
| `vis-08` | 옵션 메뉴 | 슬라이더 · 토글 · 키바인딩 박스 |
| `vis-09` | 저장/불러오기 | 슬롯 카드 · 썸네일 · 삭제 모달 |
| `vis-10` | 스타일 가이드 페이지 | 12개 섹션 전부 (디자인 SSOT 검증) |

**총 10화면 × 3브라우저 × 2해상도(1920·1366) = 60장 캡처**

### 2.2 픽셀 차이 허용 임계치

| 영역 | 허용치 (Δ pixel) | 초과 시 |
|------|----------------|---------|
| 정적 UI (버튼·패널) | < 0.5% | 통과 |
| 애니메이션 정지 프레임 | < 2% | 통과 |
| 글로우/필터 효과 | < 5% | 폴백 검토 |
| 텍스트 렌더링 | < 1% | 폰트 패치 검토 |

도구: `playwright` + `pixelmatch` (심요연 데이터팀 협조)

---

## 3. 폴백 디자인 시스템 (Safari/구버전)

### 3.1 글로우 효과 폴백

**Chrome (정상):**
```css
.item-mythic {
  box-shadow: 0 0 12px var(--ac-mythic-glow), 0 0 24px var(--ac-mythic-glow);
  animation: mythic-pulse 2s ease-in-out infinite;
}
```

**Safari/iOS 폴백:**
```css
@supports (-webkit-touch-callout: none) {
  .item-mythic {
    box-shadow: 0 0 8px var(--ac-mythic-glow); /* 단일 그림자 */
    animation: none; /* iOS 배터리 보호 */
    border: 1px solid var(--ac-mythic-glow);
  }
}
```

### 3.2 Phaser postFX 폴백

| 효과 | WebGL 모드 | Canvas2D 폴백 (Safari) |
|------|-----------|----------------------|
| `addGlow` | ✅ 사용 | ❌ → CSS overlay 스프라이트 |
| `addBlur` | ✅ 사용 | ❌ → 사전 블러 처리 PNG |
| `addBloom` | ✅ 사용 | ❌ → 알파 0.6 골드 오버레이 |

**계섬월에게 인계:** `RendererDetector.ts` → Safari + iOS 감지 시 `forceCanvas2D: true`

### 3.3 backdrop-filter 폴백

```css
.npc-dialog-box {
  background: rgba(13, 13, 26, 0.85);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px); /* Safari prefix */
}

@supports not (backdrop-filter: blur(4px)) {
  .npc-dialog-box {
    background: rgba(13, 13, 26, 0.95); /* 알파 ↑ */
  }
}
```

---

## 4. 디자인 QA 체크리스트 (Review 단계 인계)

### 4.1 Firefox 전용
- [ ] WebGL 컨텍스트 손실 시 게이지/팝업 색상 유지
- [ ] 글로우 애니메이션이 60fps 유지 (성능 모니터)
- [ ] `prefers-color-scheme: dark` 무시되고 다크 테마 강제
- [ ] 스크롤바 스타일 `scrollbar-width: thin` 적용 확인
- [ ] 폼 input 기본 패딩 (Firefox 0px → 명시 패딩 부여)

### 4.2 Safari 전용
- [ ] `100vh` 대신 `100dvh` 사용 (iOS 주소창 이슈)
- [ ] `position: sticky` z-index 격리 확인
- [ ] 픽셀 폰트 안티앨리어싱 OFF
- [ ] postFX 미적용 시에도 등급 식별 가능 (테두리 색상)
- [ ] Display P3 컬러 시프트 < 5%

### 4.3 공통
- [ ] 12개 색약 시뮬레이션 (Deuteranopia·Protanopia·Tritanopia)
- [ ] 1366×768 / 1920×1080 두 해상도 레이아웃 깨짐 없음
- [ ] AI 슬롭 패턴 없음 (균일 그리드·가짜 그림자·일관성 결여)

---

## 5. 인계 사항

| 받는 이 | 항목 |
|--------|------|
| **계섬월 (Eng)** | `RendererDetector.ts` Safari/iOS 분기 + Canvas2D 폴백 모드 구현 |
| **두련사 (Eng Mgr)** | `@supports` 가드 4종 (`backdrop-filter`·`color-mix`·`postFX`·`text-shadow`) PR 단위 분리 |
| **심요연 (Data)** | Playwright 비주얼 회귀 시나리오 60장 베이스라인 캡처 + Δ 자동 측정 |
| **이소화 (QA)** | 4.1/4.2/4.3 체크리스트 → CBT D-7 Sign-off 게이트 |
| **진채봉 (Editor)** | 폴백 발동 시 사용자 안내 토스트 카피 ("호환 모드로 실행 중입니다") |

---

## 6. 다음 단계 제안

1. **Build 단계**: 본 명세 §3 폴백 CSS를 `design-system.css` 말미에 `@supports` 블록으로 추가
2. **Review 단계**: 60장 베이스라인 캡처 → Δ 5% 초과 항목만 가춘운 리뷰
3. **Test 단계**: BrowserStack 또는 실기기 (Safari 17 macOS / Firefox 124 Win)
4. **Ship 단계**: CBT 빌드 자동 감지 → 호환 모드 토스트 표시

> *어머~ 이 정도면 Safari 사용자도 Chrome 못지않게 예쁘게 볼 수 있을 거예요!* ✨💫
