# 색약 모드 3종 — 설계 문서 (P17-11)

> 작성일: 2026-03-13 | 버전: v1.0
> 상태: Sprint 3-4 (#319)
> 참조: `AccessibilityManager.ts` §색맹 모드

---

## 1. 개요

세 가지 색각 이상(Protanopia/Deuteranopia/Tritanopia)에 대해:
1. **포스트프로세싱 셰이더** — 게임 캔버스 전체 색상 변환
2. **UI 팔레트 오버라이드** — DOM 기반 UI 요소의 시맨틱 색상 대체
3. **패턴 오버레이** — 색상 외 구분자(아이콘/테두리/패턴) 추가

---

## 2. 대상 UI 요소 매핑

| 시스템 | 기본 색상 기준 | 색약 시 문제 | 대체 구분자 |
|--------|-------------|------------|-----------|
| 데미지 텍스트 (속성별) | 🔴물리/🔵마법/🟢독/🟡번개/🟣암흑/⚪빛 | 적녹: 물리↔독 혼동 | 아이콘 접두사 (⚔️🔮🧪⚡💀✨) |
| 아이템 등급 테두리 | ⬜일반/🟢고급/🔵희귀/🟣영웅/🟠전설/🔴신화 | 적녹: 고급↔신화 혼동 | 테두리 패턴 (실선/점선/이중선/파동/별/크로스해치) |
| 미니맵 마커 | 🔴적/🟢아군/🔵NPC/🟡퀘스트/⚪중립 | 적녹: 적↔아군 혼동 | 형태 구분 (▲적/●아군/◆NPC/★퀘스트/○중립) |
| 상태 아이콘 | 🟢버프/🔴디버프/🔵쿨다운/🟡경고 | 적녹: 버프↔디버프 혼동 | 화살표 방향 (↑버프/↓디버프/⏳쿨다운/⚠️경고) |
| 채팅 팀 색상 | 🔵아군팀/🔴적팀/🟢파티/⚪전체 | 적녹: 적팀↔파티 혼동 | 접두사 태그 ([아군]/[적]/[파티]/[전체]) |
| HP 바 | 🟢→🟡→🔴 (그라데이션) | 적녹: 전환점 인식 불가 | 수치 표시 + 틱마크(25/50/75%) |
| 스킬 쿨다운 | 🔴사용불가→🟢사용가능 | 적녹: 상태 혼동 | 밝기 차 + ✓/✗ 오버레이 |

---

## 3. 셰이더 파라미터

### 3.1 feColorMatrix 값 (SVG 필터)

기존 `AccessibilityManager.ts`에 정의된 매트릭스를 그대로 사용:

#### Protanopia (적색맹 — L-cone 결여)
```
0.567  0.433  0      0  0
0.558  0.442  0      0  0
0      0.242  0.758  0  0
0      0      0      1  0
```

#### Deuteranopia (녹색맹 — M-cone 결여)
```
0.625  0.375  0    0  0
0.7    0.3    0    0  0
0      0.3    0.7  0  0
0      0      0    1  0
```

#### Tritanopia (청황색맹 — S-cone 결여)
```
0.95   0.05   0      0  0
0      0.433  0.567  0  0
0      0.475  0.525  0  0
0      0      0      1  0
```

### 3.2 셰이더 적용 계층

```
┌─ 렌더 파이프라인 ─────────────────────────────┐
│                                               │
│  Game Canvas                                  │
│    └─ Post-Process Layer                      │
│        └─ ColorBlind Filter (feColorMatrix)   │
│                                               │
│  HTML UI Overlay                              │
│    └─ CSS filter: url(#[mode]-filter)         │
│    └─ CSS 변수 팔레트 오버라이드               │
│    └─ 패턴 오버레이 클래스 토글               │
│                                               │
└───────────────────────────────────────────────┘
```

---

## 4. 구현 아키텍처

### 4.1 파일 구조

```
client/src/accessibility/colorblind/
├── README.md              ← 이 문서
├── colorblind_palettes.json  ← 3모드 팔레트 정의
├── ColorBlindFilter.ts    ← 셰이더 + CSS 필터 관리
└── PatternOverlay.ts      ← 패턴 구분자 관리
```

### 4.2 ColorBlindFilter 클래스 설계

```typescript
interface ColorBlindFilterConfig {
  mode: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia';
  /** 필터 강도 (0.0~1.0, 기본 1.0) — 부분 색약 지원 */
  intensity: number;
  /** 패턴 구분자 활성화 */
  patternsEnabled: boolean;
}

class ColorBlindFilter {
  /** 모드 전환 — 셰이더 + 팔레트 + 패턴 일괄 적용 */
  setMode(mode: ColorBlindMode): void;

  /** 강도 조절 (부분 색약용) */
  setIntensity(value: number): void;

  /** CSS 변수 팔레트 오버라이드 적용 */
  private applyPalette(mode: ColorBlindMode): void;

  /** 패턴 구분자 토글 */
  setPatterns(enabled: boolean): void;
}
```

### 4.3 PatternOverlay 클래스 설계

```typescript
interface PatternConfig {
  /** 아이템 등급 테두리 패턴 */
  itemBorderPatterns: Record<ItemRarity, BorderPattern>;
  /** 미니맵 마커 형태 */
  minimapShapes: Record<MarkerType, ShapeType>;
  /** 데미지 텍스트 아이콘 접두사 */
  damageIcons: Record<ElementType, string>;
  /** 상태 아이콘 방향 표시 */
  statusIndicators: Record<StatusType, string>;
}

type BorderPattern = 'solid' | 'dashed' | 'double' | 'wavy' | 'star' | 'crosshatch';
type ShapeType = 'triangle' | 'circle' | 'diamond' | 'star' | 'ring';

class PatternOverlay {
  /** 색약 모드에 따라 패턴 자동 적용 */
  applyForMode(mode: ColorBlindMode): void;
  /** 개별 UI 요소에 패턴 바인딩 */
  bindElement(element: HTMLElement, type: string, value: string): void;
}
```

---

## 5. 테스트 계획

### 5.1 시뮬레이터 기반 검증

| 도구 | 용도 | URL |
|------|------|-----|
| Color Oracle | 데스크톱 전체 색맹 시뮬레이션 | colororacle.org |
| Coblis | 이미지 업로드 색맹 시뮬레이션 | color-blindness.com/coblis |
| Chrome DevTools | 렌더링 → 색각 이상 에뮬레이션 | 내장 |

### 5.2 검증 매트릭스

| 테스트 항목 | Protanopia | Deuteranopia | Tritanopia | 검증 방법 |
|-----------|:----------:|:------------:|:----------:|----------|
| 적/아군 구분 (미니맵) | □ | □ | □ | 형태 구분자만으로 식별 가능 |
| 물리/독 데미지 구분 | □ | □ | □ | 아이콘 접두사로 구분 가능 |
| 아이템 등급 구분 | □ | □ | □ | 테두리 패턴으로 구분 가능 |
| 버프/디버프 구분 | □ | □ | □ | 화살표 방향으로 구분 가능 |
| HP 바 상태 인식 | □ | □ | □ | 수치 + 틱마크로 인식 가능 |
| 스킬 쿨다운 인식 | □ | □ | □ | ✓/✗ + 밝기로 인식 가능 |
| 팀 채팅 구분 | □ | □ | □ | 접두사 태그로 구분 가능 |

### 5.3 실 사용자 테스트

- 색각 이상 테스터 최소 3명 (각 유형 1명) 모집 목표
- 테스트 프로토콜: 5분 자유 플레이 → 특정 태스크 수행 → 설문
- 핵심 질문: "색상 없이도 게임 상태를 파악할 수 있었는가?"
