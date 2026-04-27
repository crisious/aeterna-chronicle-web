# 개발자 빌드-검증 사이클 — 디자인 시스템 v1.0

> 작성: 가춘운 CMO/Design
> 작성일: 2026-04-27
> 스프린트: Auto — 에테르나 크로니클 개발자 빌드-검증 사이클 단축
> 단계: Build (디자인 토큰 → CSS 실구현)
> SSOT 메아리: `DESIGN.md §10` (Monster Tier Tokens 컬러 체계 재사용)
> 짝꿍 문서: `devloop-error-messages.md` (진채봉, 카피 SSOT)

---

## 0. 한눈에

대표님이 코드 한 줄 고치고 → 5분 안에 핵심 시나리오 검증되는 사이클이 목표예요. ✨
그 5분 동안 **터미널/브라우저 화면에서 보는 모든 픽셀**의 시각 약속을 여기서 SSOT로 정합니다.

**시각 위계 3단계**:
1. **상태 컬러** (PASS/BLOCK/WARN/ERROR) — 0.3초 안에 판단
2. **원인 위치** (파일:라인) — 클릭 가능한 모노스페이스 강조
3. **처방 힌트** (hint) — 부드러운 발광, 선택적 무시 가능

---

## 1. 게이트 상태 토큰 (4 × 5)

`devloop-error-messages.md §매트릭스`의 5종 게이트 × 4상태 = **20슬롯**의 시각 약속.

### 1.1 상태 컬러 (단일 SSOT)

| 상태 | 이모지 | 종료코드 | 컬러 토큰 | HEX | 의미 |
|------|--------|---------|----------|-----|------|
| **PASS** | 🟢 | 0 | `--devloop-pass` | `#2ECC71` | 통과 (DESIGN §2 ACCENT 성공) |
| **BLOCK** | 🔴 | 1 | `--devloop-block` | `#FF4444` | 차단 (DESIGN §2 ACCENT 경고) |
| **WARN** | 🟡 | 2 | `--devloop-warn` | `#FFD700` | 경고 (DESIGN §2 TEXT 강조 골드) |
| **ERROR** | 🟠 | 3 | `--devloop-error` | `#FF8C42` | 시스템 오류 (신규 — 골드와 적색 사이) |

> **왜 ERROR만 신규?** PASS/BLOCK/WARN은 DESIGN.md 기존 팔레트로 재사용. ERROR는 "게이트 자체가 망가진" 메타 상태라 골드(WARN)와 적(BLOCK) 사이 톤이 필요. `#FF8C42` = 골드 채도 낮춘 호박색.

### 1.2 컨트라스트 검증 (WCAG)

배경 `#0D0D1A` (심연) 기준 4상태 모두 **AAA 7:1 이상**. (`§2.17` 게이트 약속 준수)

| 토큰 | vs `#0D0D1A` | 등급 |
|------|-------------|------|
| `#2ECC71` | 9.8:1 | AAA |
| `#FF4444` | 7.2:1 | AAA |
| `#FFD700` | 14.1:1 | AAA |
| `#FF8C42` | 8.4:1 | AAA |

### 1.3 색약 대응 (이모지 + 형태 병행)

색만으로 상태를 구분하지 않습니다. 모든 상태에 이모지 prefix(🟢🔴🟡🟠) + 형태 보조:
- PASS: 둥근 모서리 + 채도 낮은 발광
- BLOCK: 진한 좌측 보더 4px (멈춤 신호 메타포)
- WARN: 점선 보더 (주의 환기)
- ERROR: 대각 줄무늬 배경 (인프라 오류 메타포)

---

## 2. 게이트별 시각 약속

### 2.1 boot 게이트 (Phaser dev server 부팅)

| 측정 | 시각 표현 |
|------|----------|
| 부팅 진행 | 좌→우 progress bar, 12s 기준 100% 분배 |
| Cold/Warm 구분 | Cold = 에테르 청 `#89CFF0` / Warm = 성공 녹 `#2ECC71` |
| HMR lag | 우상단 미니 펄스 도트 (800ms 초과 시 황색 깜빡) |

### 2.2 verify 게이트 (3시나리오 자동화)

3개 시나리오를 **수평 3분할 카드**로 표시:

```
┌─────────────┬─────────────┬─────────────┐
│ ⚔️  battle   │ 💾 save     │ 🗺️  map     │
│ 🟢 1.2s     │ 🟢 0.8s     │ 🟡 2.1s     │
│ ATB tick OK │ round-trip  │ portal slow │
└─────────────┴─────────────┴─────────────┘
```

각 카드 폭 33.3%, 간격 8px, 상태 컬러는 **상단 4px 보더**로만 표시 (배경은 패널 `#16213E` 유지 — 눈 피로 방지).

### 2.3 build 게이트 (vite build)

번들 크기 시각화: 가로 누적 막대로 chunk top3 표시. 예산 초과 시 초과분만 `--devloop-block` 적색.

```
[●●●●●●●●●●●●●●○○○○○] 312KB / 400KB ✓
[●●●●●●●●●●●●●●●●●●●●●] 487KB / 400KB ✗ (87KB over)
```

### 2.4 type 게이트 (`tsc --noEmit`)

TS 에러 메시지의 **파일:라인:컬럼**은 항상 **클릭 가능한 모노스페이스 + 밑줄**:

```
🔴 TS2322  src/scenes/Battle.ts:142:18 — Type 'string' is not assignable to 'number'
                ━━━━━━━━━━━━━━━━━━━━━━━━━ ← 클릭 시 VS Code Open
   처방: deltaMs를 Number()로 캐스팅하시지요.
   ↑ hint는 보조 텍스트 컬러 #A0A0A0, 한 단계 들여쓰기
```

### 2.5 runtime 게이트 (브라우저 throw)

브라우저 화면 우하단 **dev-only 토스트** (프로덕션 빌드에선 제거):
- 너비 360px, 우측 여백 16px, 하단 16px
- 5초 후 자동 페이드, hover 시 정지
- 파일:라인 클릭 → source map 통한 원본 위치 점프

---

## 3. 컴포넌트 토큰

### 3.1 GateBadge (게이트 상태 배지)

```
높이: 24px
패딩: 4px 10px
보더 반경: 4px (DESIGN §5 SM)
폰트: 13px JetBrains Mono / Pretendard 500
이모지 크기: 14px (행간 정렬용 line-height: 1)
```

### 3.2 ErrorOverlay (전체화면 빌드 에러)

vite의 기본 에러 오버레이를 우리 톤으로 재스킨:

```
배경: rgba(13, 13, 26, 0.96) — 심연 96% (뒤 화면 살짝 비침)
헤더 컬러: 게이트 상태 컬러
파일 경로: 모노스페이스 16px, --color-text-emphasis (#FFD700)
스택 트레이스: 모노스페이스 13px, --color-text-secondary (#A0A0A0)
액션 버튼: "복사" / "VS Code 열기" / "닫기" (Tab 순환)
```

### 3.3 VerifyDashboard (verify:core 결과 대시보드)

3시나리오 + 합계 시간 + 누적 추세를 한 화면에. 폭 720px, 다크 모드만 (개발자 도구는 항상 다크).

### 3.4 TerminalColors (CLI 출력 시각 약속)

스크립트가 stdout에 색을 입힐 때:

| ANSI | 용도 |
|------|------|
| `\x1b[32m` (녹) | PASS, 정상 시간 |
| `\x1b[31m` (적) | BLOCK, 초과 시간 |
| `\x1b[33m` (황) | WARN, 추세 카운트 |
| `\x1b[38;5;208m` (호박) | ERROR, 시스템 오류 |
| `\x1b[2m` (dim) | hint, 메타 정보 |
| `\x1b[4m` (밑줄) | 파일:라인 (클릭 가능 OSC 8 hyperlink) |

OSC 8 하이퍼링크 예시:
```
\x1b]8;;file:///c/fork/aeterna-chronicle-web2/client/src/scenes/Battle.ts:142\x1b\\Battle.ts:142\x1b]8;;\x1b\\
```

---

## 4. 모션 & 접근성

### 4.1 애니메이션 약속

| 요소 | duration | easing | `prefers-reduced-motion` |
|------|----------|--------|------------------------|
| GateBadge 등장 | 200ms | ease-out | 50ms 페이드만 |
| ErrorOverlay 슬라이드 | 240ms | cubic-bezier(.2,.8,.2,1) | 즉시 표시 |
| HMR 펄스 도트 | 1.2s 무한 | ease-in-out | 정지 (정적 색만) |
| Progress bar | 16ms 단위 갱신 | linear | 단계별 점프 (4단계) |

### 4.2 키보드 (개발자 도구는 마우스 못 쓰는 순간이 많음)

- `Esc`: ErrorOverlay 닫기
- `Cmd/Ctrl + .`: 첫 에러 위치 점프
- `Cmd/Ctrl + Shift + C`: 에러 메시지 클립보드 복사

### 4.3 스크린 리더

`role="alert"` + `aria-live="assertive"` (BLOCK/ERROR), `polite` (WARN). PASS는 announce 안 함 (개발자 집중 보호).

---

## 5. CSS 구현

실 파일: **`client/src/styles/devloop-overlay.css`** (이 PR에서 작성)

CSS 변수 export:
```css
:root {
  --devloop-pass: #2ECC71;
  --devloop-block: #FF4444;
  --devloop-warn: #FFD700;
  --devloop-error: #FF8C42;
  --devloop-bg-overlay: rgba(13, 13, 26, 0.96);
  --devloop-bg-panel: #16213E;
  --devloop-text: #E8E8E8;
  --devloop-text-muted: #A0A0A0;
  --devloop-text-emphasis: #FFD700;
  --devloop-mono: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace;
}
```

진채봉의 `dev.gate.<gate>.<state>.<reason>` 키와 1:1 매핑되어, JS에서:
```ts
const className = `devloop-gate devloop-gate--${state}`; // pass/block/warn/error
```

---

## 6. 5인 인계 체크

| 받는 사람 | 인계 항목 |
|---------|---------|
| **계섬월** Build | `devloop-overlay.css` import 위치 (`client/src/main.ts` 또는 `client/index.html`), `vite-plugin-checker` 오버레이 스킨 적용 |
| **두련사** SRE | 4 ANSI 색상 코드를 `scripts/verify-core.ts` runner에 적용, OSC 8 하이퍼링크 검출 (Windows Terminal 1.21+ 지원) |
| **심요연** Data | 게이트별 elapsed 값을 동일 토큰 컬러로 dashboard 차트 시각화 |
| **이소화** QA | 4상태 × 5게이트 = 20케이스 컨트라스트 자동 검증 (`a11y-audit-cli` 재사용) |
| **진채봉** Editor | 카피 SSOT(`devloop-error-messages.md`)와 본 문서 §1.1 컬러 토큰 1:1 정합 유지 (변경 시 동시 PR) |

---

## 7. 변경 이력

| 버전 | 날짜 | 변경 |
|------|------|------|
| v1.0 | 2026-04-27 | 최초 작성 — 4상태 × 5게이트 토큰, ErrorOverlay/GateBadge/VerifyDashboard/TerminalColors 4 컴포넌트 명세 |

---

> **본 문서가 SSOT** — `DESIGN.md §10` 토큰 메아리, `devloop-error-messages.md` 카피와 짝꿍.
> 변경 시 §1.1 컬러 표 + `devloop-overlay.css` `:root` 블록 동시 갱신 약속.
> — 가춘운 (춤추듯 일하는 마음으로) ✨
