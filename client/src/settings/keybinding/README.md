# 키 리바인딩 시스템 — 설계 문서 (P17-12)

> 작성일: 2026-03-13 | 버전: v1.0
> 상태: Sprint 3-4 (#320)

---

## 1. 개요

모든 게임 내 입력 액션을 사용자가 자유롭게 재배치할 수 있는 시스템.
프리셋 5종 제공 + 완전 커스텀 + 저장/동기화/내보내기 지원.

---

## 2. 액션 목록 (26개)

### 2.1 이동 (4)

| # | 액션 ID | 표시명 (한) | 표시명 (영) | 기본 키 (WASD) | 설명 |
|---|---------|-----------|-----------|--------------|------|
| 1 | `move_up` | 위로 이동 | Move Up | `W` | 캐릭터 상방 이동 |
| 2 | `move_down` | 아래로 이동 | Move Down | `S` | 캐릭터 하방 이동 |
| 3 | `move_left` | 왼쪽 이동 | Move Left | `A` | 캐릭터 좌측 이동 |
| 4 | `move_right` | 오른쪽 이동 | Move Right | `D` | 캐릭터 우측 이동 |

### 2.2 전투 (8)

| # | 액션 ID | 표시명 (한) | 표시명 (영) | 기본 키 | 설명 |
|---|---------|-----------|-----------|--------|------|
| 5 | `attack_basic` | 기본 공격 | Basic Attack | `LMB` / `J` | 일반 공격 |
| 6 | `skill_1` | 스킬 1 | Skill 1 | `Q` | 첫 번째 스킬 |
| 7 | `skill_2` | 스킬 2 | Skill 2 | `E` | 두 번째 스킬 |
| 8 | `skill_3` | 스킬 3 | Skill 3 | `R` | 세 번째 스킬 |
| 9 | `skill_4` | 스킬 4 | Skill 4 | `F` | 네 번째 스킬 |
| 10 | `dodge` | 회피 | Dodge | `Space` | 회피/구르기 |
| 11 | `potion` | 포션 사용 | Use Potion | `1` | 빠른 포션 사용 |
| 12 | `target_lock` | 타겟 고정 | Lock Target | `Tab` | 타겟 전환/고정 |

### 2.3 UI (6)

| # | 액션 ID | 표시명 (한) | 표시명 (영) | 기본 키 | 설명 |
|---|---------|-----------|-----------|--------|------|
| 13 | `inventory` | 인벤토리 | Inventory | `I` | 인벤토리 열기 |
| 14 | `character` | 캐릭터 정보 | Character | `C` | 캐릭터 시트 |
| 15 | `map` | 지도 | Map | `M` | 월드맵 열기 |
| 16 | `quest_log` | 퀘스트 로그 | Quest Log | `L` | 퀘스트 목록 |
| 17 | `chat_toggle` | 채팅 토글 | Toggle Chat | `Enter` | 채팅창 열기/닫기 |
| 18 | `menu` | 메뉴 | Menu | `Escape` | 게임 메뉴/나가기 |

### 2.4 카메라 (4)

| # | 액션 ID | 표시명 (한) | 표시명 (영) | 기본 키 | 설명 |
|---|---------|-----------|-----------|--------|------|
| 19 | `camera_zoom_in` | 줌 인 | Zoom In | `Scroll Up` | 카메라 확대 |
| 20 | `camera_zoom_out` | 줌 아웃 | Zoom Out | `Scroll Down` | 카메라 축소 |
| 21 | `camera_rotate_l` | 카메라 좌회전 | Rotate Left | `[` | 카메라 좌회전 |
| 22 | `camera_rotate_r` | 카메라 우회전 | Rotate Right | `]` | 카메라 우회전 |

### 2.5 시스템 (4)

| # | 액션 ID | 표시명 (한) | 표시명 (영) | 기본 키 | 설명 |
|---|---------|-----------|-----------|--------|------|
| 23 | `screenshot` | 스크린샷 | Screenshot | `F12` | 스크린샷 촬영 |
| 24 | `toggle_hud` | HUD 토글 | Toggle HUD | `H` | HUD 표시/숨김 |
| 25 | `toggle_fps` | FPS 표시 | Toggle FPS | `F3` | FPS 카운터 |
| 26 | `quick_save` | 빠른 저장 | Quick Save | `F5` | 즉시 저장 |

---

## 3. 프리셋 (5종)

### 3.1 WASD (기본)

> 표준 PC 게이머 레이아웃. 위 2.x 표의 기본 키 배치.

### 3.2 화살표

| 카테고리 | 변경사항 |
|---------|---------|
| 이동 | `Arrow Up/Down/Left/Right` |
| 전투 | 기본 공격 `Numpad 1`, 스킬 `Numpad 2~5`, 회피 `Numpad 0` |
| UI | 인벤토리 `Home`, 캐릭터 `End`, 지도 `PgUp` |

### 3.3 마우스 전용 (클릭 이동)

| 카테고리 | 변경사항 |
|---------|---------|
| 이동 | `RMB` 클릭 이동 (point-to-move) |
| 전투 | `LMB` 기본 공격, 스킬 1~4 → 화면 하단 스킬바 클릭 |
| UI | 모든 UI 버튼 클릭으로 접근 |
| 특이사항 | 키보드 바인딩 전부 옵션화 (사용 안 해도 플레이 가능) |

### 3.4 한손 — 왼손

| 카테고리 | 변경사항 |
|---------|---------|
| 이동 | `WASD` 유지 |
| 전투 | `Q/E/R/F/Space/1` 유지 (왼손 영역) |
| UI | `Tab/Caps/~` 등 왼손 접근 키로 재배치 |
| 마우스 | 불필요 (키보드만으로 플레이 가능) |

### 3.5 한손 — 오른손

| 카테고리 | 변경사항 |
|---------|---------|
| 이동 | `IJKL` |
| 전투 | `U/O/P/;/Space/7` |
| UI | `\[/\]/Enter/Backspace` 영역 |
| 마우스 | 불필요 |

### 3.6 게임패드

| 액션 | Xbox | PS |
|------|------|-----|
| 이동 | Left Stick | Left Stick |
| 카메라 | Right Stick | Right Stick |
| 기본 공격 | X | □ |
| 스킬 1~4 | A/B/Y/RT | ×/○/△/R2 |
| 회피 | LB | L1 |
| 포션 | RB | R1 |
| 타겟 고정 | LT | L2 |
| 인벤토리 | D-Pad Up | D-Pad Up |
| 지도 | D-Pad Right | D-Pad Right |
| 메뉴 | Start | Options |

---

## 4. 충돌 해결 로직

### 4.1 충돌 감지

```
사용자가 키 K를 액션 A에 바인딩 시도
  → 키 K가 이미 액션 B에 바인딩 되어 있는가?
    → YES: 충돌 경고 다이얼로그 표시
      → 옵션 1: "교체" — 액션 B에서 K 해제, 액션 A에 K 바인딩
      → 옵션 2: "양쪽 유지" — 동일 키로 두 액션 (비권장, 경고 유지)
      → 옵션 3: "취소" — 변경 안 함
    → NO: 즉시 바인딩
```

### 4.2 필수 바인딩 보호

| 보호 대상 | 사유 |
|----------|------|
| `menu` (Escape) | 탈출 불가 방지 — 해제 불가, 추가 바인딩만 허용 |

### 4.3 금지 키

| 금지 키 | 사유 |
|---------|------|
| `Alt+F4` | OS 종료 |
| `Ctrl+W` | 브라우저 탭 닫기 |
| `F11` | 전체화면 토글 (전용) |

---

## 5. 저장 / 동기화 / 내보내기

### 5.1 저장 구조

```json
{
  "version": 1,
  "preset": "wasd",
  "custom": false,
  "bindings": {
    "move_up": { "primary": "KeyW", "secondary": null, "gamepad": "LeftStickUp" },
    "move_down": { "primary": "KeyS", "secondary": null, "gamepad": "LeftStickDown" },
    "attack_basic": { "primary": "Mouse0", "secondary": "KeyJ", "gamepad": "ButtonX" }
  },
  "timestamp": "2026-03-13T00:00:00Z"
}
```

### 5.2 저장 경로

| 위치 | 용도 |
|------|------|
| `localStorage['aeterna_keybindings']` | 클라이언트 즉시 로드 |
| 서버 계정 DB | 계정별 동기화 (로그인 시 pull, 변경 시 push) |
| `keybindings.json` 파일 내보내기 | 사용자 백업/공유 |

### 5.3 동기화 충돌

```
로그인 시:
  서버 timestamp > 로컬 timestamp → 서버 값 적용 (로컬 백업)
  서버 timestamp < 로컬 timestamp → 로컬 값 push
  동일 → 변경 없음
  양쪽 다 변경 → 사용자 선택 다이얼로그 ("서버 설정" vs "이 기기 설정")
```

---

## 6. UI 와이어프레임

```
┌─────────────────────────────────────────────────────┐
│  ⚙️ 키 설정                               [X 닫기] │
├─────────────────────────────────────────────────────┤
│                                                     │
│  프리셋: [▼ WASD ][화살표][마우스][왼손][오른손][패드] │
│                                                     │
│  ┌─ 이동 ──────────────────────────────────────┐    │
│  │  위로 이동     [  W  ] [     ] [LS ↑]  [🔄] │    │
│  │  아래로 이동   [  S  ] [     ] [LS ↓]  [🔄] │    │
│  │  왼쪽 이동     [  A  ] [     ] [LS ←]  [🔄] │    │
│  │  오른쪽 이동   [  D  ] [     ] [LS →]  [🔄] │    │
│  └──────────────────────────────────────────────┘    │
│                                                     │
│  ┌─ 전투 ──────────────────────────────────────┐    │
│  │  기본 공격     [LMB  ] [  J  ] [  X  ]  [🔄] │    │
│  │  스킬 1        [  Q  ] [     ] [  A  ]  [🔄] │    │
│  │  스킬 2        [  E  ] [     ] [  B  ]  [🔄] │    │
│  │  ...                                         │    │
│  └──────────────────────────────────────────────┘    │
│                                                     │
│  열 헤더:         [주키] [보조키] [게임패드] [초기화]   │
│                                                     │
│  ⚠️ 충돌: "Q"가 스킬1과 채팅에 동시 바인딩          │
│                                                     │
│  [기본값 복원]  [내보내기]  [가져오기]  [적용]  [취소] │
└─────────────────────────────────────────────────────┘
```

### 키 입력 캡처 모드

```
┌─────────────────────────────────┐
│                                 │
│   🎮 키를 입력하세요...          │
│                                 │
│   대상: 스킬 1 (주 키)           │
│   현재: Q                       │
│                                 │
│   [ESC로 취소]                  │
│                                 │
└─────────────────────────────────┘
```

---

## 7. 구현 아키텍처

### 7.1 파일 구조

```
client/src/settings/keybinding/
├── README.md              ← 이 문서
├── action_map.json        ← 26개 액션 정의 + 기본 바인딩
├── KeybindingManager.ts   ← 바인딩 관리 + 충돌 해결 + 저장
└── presets/
    ├── wasd.json
    ├── arrows.json
    ├── mouse_only.json
    ├── one_hand_left.json
    ├── one_hand_right.json
    └── gamepad.json
```

### 7.2 KeybindingManager 인터페이스

```typescript
interface KeyBinding {
  primary: string | null;    // KeyboardEvent.code 또는 'Mouse0'~'Mouse4'
  secondary: string | null;  // 보조 키
  gamepad: string | null;    // Gamepad API 버튼명
}

interface KeybindingManager {
  /** 프리셋 로드 */
  loadPreset(name: PresetName): void;
  /** 개별 바인딩 변경 */
  setBinding(actionId: string, slot: 'primary' | 'secondary' | 'gamepad', key: string): ConflictResult;
  /** 바인딩 조회 */
  getBinding(actionId: string): KeyBinding;
  /** 충돌 확인 */
  checkConflict(key: string, excludeAction?: string): string | null;
  /** 키 입력 → 액션 변환 (게임 루프 호출) */
  resolveAction(event: KeyboardEvent | GamepadEvent): string | null;
  /** 저장 */
  save(): void;
  /** 불러오기 */
  load(): void;
  /** JSON 내보내기 */
  exportJSON(): string;
  /** JSON 가져오기 */
  importJSON(json: string): boolean;
  /** 기본값 복원 */
  resetToDefault(): void;
}
```
