# 첫 30분 튜토리얼·온보딩 코칭/에러 카피 SSOT v1.0

> 작성: 진채봉 Editor
> 작성일: 2026-04-28
> 스프린트: Auto — 에테르나 크로니클 튜토리얼·온보딩 첫 30분 경험 설계
> 단계: 에셋 (i18n 카피 SSOT)
> 키 규약: `coach.<gate>.<state>.<reason>`
> 톤 5계명: ① 한 화면 1개념 ② 명령형보다 권유형 ③ 수치는 사실 ④ 시는 hint만 ⑤ 도메인 키 규약

---

## 매트릭스

5종 게이트 × 4 상태 = **20개 핵심 슬롯** + 보스/시네마틱 4개 보조 슬롯 = **24개** (ko/en 동시 = 48줄)

| 게이트 | 학습 지점 | 강제 시점 | 통과 시간 |
|-------|---------|---------|---------|
| **move** | 이동·점프 | 0:30 | ≤ 5s |
| **dialog** | 대화·선택지 | 4:00 | ≤ 10s |
| **battle** | ATB·기본 공격 | 7:00 | ≤ 60s |
| **skill** | MP·쿨다운·우선순위 | 14:00 | ≤ 90s |
| **save** | 슬롯 1·2·3 | 18:00 | ≤ 30s |

| 상태 | 코드 | 의미 | 액션 |
|------|------|------|------|
| 🟢 **PASS** | 0 | 학습 완료 | 다음 비트 진행 |
| 🔴 **BLOCK** | 1 | 미완료 (첫 회차에서 차단) | 즉시 코칭 |
| 🟡 **WARN** | 2 | 3회 시도 초과 | 힌트 강도 ↑ |
| 🟠 **ERROR** | 3 | 시스템 오류 | 자동 부활 + 인프라 점검 |

---

## 1. move 게이트

### 1.1 PASS

```yaml
coach.move.pass.arrived:
  ko: "🟢 한 발 떼셨사옵니다. 이대로 NPC에게 가시지요."
  en: "🟢 You moved. Now approach the NPC."
  hint:
    ko: "걸음이 가벼우시옵니다 — 곡조가 맞사옵니다."
    en: ""
```

### 1.2 BLOCK

```yaml
coach.move.block.idle:
  ko: "🔴 5초 동안 한 걸음도 떼지 않으셨사옵니다. WASD 또는 방향키로 움직여 보소서."
  en: "🔴 No movement detected for 5s. Press WASD or arrow keys to move."
  hint:
    ko: "그저 한 발이면 충분하옵니다."
    en: ""
```

### 1.3 WARN

```yaml
coach.move.warn.retry:
  ko: "🟡 세 번째 시도이옵니다. 손가락이 닿는 자리를 확인해 보소서 (W/A/S/D · ←↑↓→)."
  en: "🟡 Third attempt. Check your key bindings (W/A/S/D or arrow keys)."
  hint:
    ko: "[설정 → 키 매핑] 확인을 권하옵니다."
    en: ""
```

### 1.4 ERROR

```yaml
coach.move.error.input_dropped:
  ko: "🟠 입력이 닿지 않사옵니다. 페이지를 새로고침해 주옵소서. (오류 코드: MOVE-{code})"
  en: "🟠 Input not received. Please refresh the page. (Error code: MOVE-{code})"
  hint:
    ko: "포커스가 다른 창에 있을 수 있사옵니다 — 게임 화면을 한 번 클릭하소서."
    en: ""
```

---

## 2. dialog 게이트

### 2.1 PASS

```yaml
coach.dialog.pass.chosen:
  ko: "🟢 선택지를 고르셨사옵니다. 마음을 보이는 것이 첫 곡조이옵니다."
  en: "🟢 Choice made. Speaking your mind is the first verse."
  hint:
    ko: "그대의 답이 이야기를 갈래로 나누옵니다."
    en: ""
```

### 2.2 BLOCK

```yaml
coach.dialog.block.no_choice:
  ko: "🔴 10초가 흘렀사옵니다. [예] 또는 [아니오] 중 한 가닥을 골라 주옵소서."
  en: "🔴 10s elapsed. Please choose [Yes] or [No]."
  hint:
    ko: "어느 답이든 이야기는 흘러가옵니다."
    en: ""
```

### 2.3 WARN

```yaml
coach.dialog.warn.skipped:
  ko: "🟡 대사를 너무 빨리 넘기시옵니다. 한 박자 쉬셔도 좋사옵니다."
  en: "🟡 Dialog being skipped quickly. Feel free to slow down."
  hint:
    ko: "[설정 → 텍스트 속도]에서 호흡을 조절할 수 있사옵니다."
    en: ""
```

### 2.4 ERROR

```yaml
coach.dialog.error.npc_missing:
  ko: "🟠 대화 상대를 찾지 못하옵니다. 한 화면 뒤로 물러서 다시 시도해 주옵소서. (오류 코드: DIALOG-{code})"
  en: "🟠 NPC not found. Please retreat one screen and retry. (Error code: DIALOG-{code})"
  hint: { ko: "", en: "" }
```

---

## 3. battle 게이트

### 3.1 PASS

```yaml
coach.battle.pass.first_kill:
  ko: "🟢 첫 매듭을 푸셨사옵니다 — ATB 게이지의 곡조를 익히셨사옵니다."
  en: "🟢 First foe vanquished — you've grasped the ATB rhythm."
  hint:
    ko: "+1 EXP · +5 골드 · +1 회복약을 받으시옵소서."
    en: ""
```

### 3.2 BLOCK

```yaml
coach.battle.block.atb_idle:
  ko: "🔴 ATB 게이지가 가득 찼사옵니다. [공격] 버튼을 눌러 한 호흡 떼어 주옵소서."
  en: "🔴 ATB gauge is full. Press [Attack] to act."
  hint:
    ko: "게이지가 꽉 차도 누르지 않으시면 슬라임이 먼저 움직이옵니다."
    en: ""
```

### 3.3 WARN

```yaml
coach.battle.warn.three_misses:
  ko: "🟡 세 번 헛치셨사옵니다. 슬라임의 ATB도 차오르고 있사오니 마음을 가다듬으소서."
  en: "🟡 Three misses. The slime's ATB is also charging — steady yourself."
  hint:
    ko: "기본 공격은 빗나가지 않사옵니다 — 버튼이 눌렸는지 확인하소서."
    en: ""
```

### 3.4 ERROR

```yaml
coach.battle.error.atb_stuck:
  ko: "🟠 ATB 게이지가 멎었사옵니다. 자동 부활 후 다시 진입하옵니다. (오류 코드: BATTLE-{code})"
  en: "🟠 ATB gauge stalled. Auto-revive and re-enter. (Error code: BATTLE-{code})"
  hint: { ko: "", en: "" }
```

---

## 4. skill 게이트

### 4.1 PASS

```yaml
coach.skill.pass.first_use:
  ko: "🟢 「기억의 일격」을 펼치셨사옵니다. MP 5를 쓰시고 한 호흡 쉬소서 (쿨다운 1턴)."
  en: "🟢 You unleashed [Memory Strike]. MP 5 spent — rest one turn (cooldown)."
  hint:
    ko: "쿨다운은 다음 ATB 차오를 때 풀리옵니다."
    en: ""
```

### 4.2 BLOCK

```yaml
coach.skill.block.no_mp:
  ko: "🔴 MP가 모자라옵니다 ({mp}/5). 기본 공격으로 한 매듭 더 푸시지요."
  en: "🔴 Insufficient MP ({mp}/5). Use a basic attack first."
  hint:
    ko: "MP가 ½ 미만일 땐 기본 공격이 곡조에 맞사옵니다 — 우선순위 1번 규칙이옵니다."
    en: ""
```

### 4.3 WARN

```yaml
coach.skill.warn.idle:
  ko: "🟡 30초 동안 스킬을 한 번도 쓰지 않으셨사옵니다. ATB 100% 일 때 [스킬] 버튼이 빛나옵니다."
  en: "🟡 No skill used in 30s. The [Skill] button glows at ATB 100%."
  hint:
    ko: "스킬은 큰 한 방이옵니다 — 보스 P2에서 빛을 발하옵니다."
    en: ""
```

### 4.4 ERROR

```yaml
coach.skill.error.mp_negative:
  ko: "🟠 MP 값이 비정상이옵니다. 자동 보정 후 재시도해 주옵소서. (오류 코드: SKILL-{code})"
  en: "🟠 MP value abnormal. Auto-correcting — please retry. (Error code: SKILL-{code})"
  hint: { ko: "", en: "" }
```

---

## 5. save 게이트

### 5.1 PASS

```yaml
coach.save.pass.slot_saved:
  ko: "🟢 Slot {n}에 한 자락 새기셨사옵니다. 언제든 이 자리로 되돌아오실 수 있사옵니다."
  en: "🟢 Saved to Slot {n}. You may return here anytime."
  hint:
    ko: "자동 세이브는 챕터 진입·보스 처치·30분마다 갱신되옵니다."
    en: ""
```

### 5.2 BLOCK

```yaml
coach.save.block.must_save_first:
  ko: "🔴 첫 세이브를 마치셔야 다음 길이 열리옵니다. Slot 1을 한 번만 눌러 주옵소서."
  en: "🔴 First save required to proceed. Click Slot 1 once."
  hint:
    ko: "세이브는 그대의 발자국을 남기는 일이옵니다."
    en: ""
```

### 5.3 WARN

```yaml
coach.save.warn.menu_dwell:
  ko: "🟡 세이브 화면에 30초 머무셨사옵니다. Slot 1을 누르시면 곧 다음 비트로 넘어가옵니다."
  en: "🟡 30s in save menu. Click Slot 1 to proceed."
  hint:
    ko: "세 슬롯 모두 비어 있어 어느 자리든 무방하옵니다."
    en: ""
```

### 5.4 ERROR

```yaml
coach.save.error.localstorage_full:
  ko: "🟠 저장 공간이 부족하옵니다. 브라우저 저장소를 한 번 비워 주옵소서. (오류 코드: SAVE-{code})"
  en: "🟠 Storage full. Please clear browser storage. (Error code: SAVE-{code})"
  hint:
    ko: "[설정 → 데이터 관리]에서 옛 슬롯을 정리하실 수 있사옵니다."
    en: ""
```

---

## 6. 보조 슬롯 — 시네마틱·보스·결말

### 6.1 시네마틱 스킵

```yaml
coach.cinematic.skip.confirm:
  ko: "🟢 시네마틱을 스킵하셨사옵니다. 메인 메뉴 → [도움말 → 시네마틱 갤러리]에서 다시 보실 수 있사옵니다."
  en: "🟢 Cinematic skipped. Replay anytime via Main Menu → [Help → Cinematic Gallery]."
  hint:
    ko: "한 번 본 곡조도 두 번 들으면 결이 다르옵니다."
    en: ""
```

### 6.2 첫 보스 P2 진입

```yaml
coach.boss.phase2.enter:
  ko: "⚠️ 「망각의 잔영」이 광역기를 펼치려 하옵니다. [아이템] 버튼이 빛나오니 회복약을 쓰소서."
  en: "⚠️ [Echo of Oblivion] readies an AoE. The [Item] button glows — use a potion."
  hint:
    ko: "이것이 5종 학습의 마지막 매듭이옵니다."
    en: ""
```

### 6.3 첫 보스 처치 — 칭찬

```yaml
coach.boss.victory:
  ko: "🟢 첫 매듭을 모두 풀으셨사옵니다 — 이동·대화·전투·스킬·세이브, 다섯 곡조를 익히셨사옵니다."
  en: "🟢 All five threads woven — movement, dialog, battle, skill, save."
  hint:
    ko: "이제 본편 에레보스의 길이 열리옵니다. 자유로이 거니소서."
    en: ""
```

### 6.4 30분 초과 — 자동 조정 트리거

```yaml
coach.tutorial.overtime:
  ko: "🟡 누적 시간이 32분을 넘었사옵니다. 다음 회차에서 보스 HP를 5% 낮추겠사옵니다."
  en: "🟡 Tutorial duration exceeded 32min. Boss HP will be reduced 5% next session."
  hint:
    ko: "이는 정경패 Reviewer의 자동 조정 룰이옵니다."
    en: ""
```

---

## 7. 코드 상수 매핑 (계섬월 인계용)

```ts
// src/constants/tutorial_coach_messages.ts
import type { LocaleKey } from '@/i18n/types';

export type CoachGate = 'move' | 'dialog' | 'battle' | 'skill' | 'save';
export type CoachState = 'pass' | 'block' | 'warn' | 'error';

export interface CoachMessage {
  key: `coach.${CoachGate}.${CoachState}.${string}`;
  ko: string;
  en: string;
  hint?: { ko: string; en: string };
  // 본 SSOT(`tutorial-onboarding-error-messages.md`)를 단방향 미러.
  // 코드 → 문서 역방향 갱신 금지.
}

export const COACH_GATES: readonly CoachGate[] = ['move', 'dialog', 'battle', 'skill', 'save'] as const;

// 24개 슬롯은 본 SSOT의 §1~§6에서 직접 미러.
// 빌드 타임 검증: 누락 1개라도 있으면 verify:tutorial 게이트 BLOCK.
```

---

## 8. 톤 5계명 — 이유와 예시

| # | 계명 | 이유 | 좋은 예 | 나쁜 예 |
|---|------|------|--------|--------|
| 1 | **한 화면 1개념** | 첫 진입자 인지 부담 ↓ | "ATB가 가득 차면 [공격]을 누르세요." | "ATB·MP·쿨다운·우선순위를 모두 익히세요." |
| 2 | **권유형** (~소서/~지요) | 명령보다 친밀, 진채봉 톤 | "한 발 떼어 보소서." | "움직여라." |
| 3 | **수치는 사실** | 거짓 약속 금지 | "MP 5를 쓰시옵니다." | "약간의 MP를 씁니다." |
| 4 | **시는 hint만** | 본문은 명료, 시정은 부속 | 본문 명료 + hint에 "곡조" 비유 | 본문에 "기억의 강을 건너..." 시 |
| 5 | **도메인 키 규약** | i18n 추적성 | `coach.battle.pass.first_kill` | `tutorial.battle.win` |

---

## 9. ship-gate 3-AND

| 가닥 | 조건 | 검증 |
|-----|-----|-----|
| ① 24슬롯 채움 | ko + en 모두 채워짐 (hint는 선택) | `npm run verify:tutorial-copy` |
| ② 키 규약 통일 | `coach.<gate>.<state>.<reason>` 100% | 정규식 lint |
| ③ 톤 5계명 통과 | 명령형/시 본문/숫자 누락 0건 | 진채봉 Editor 수동 1회 + 가춘운 협업 |

한 가닥이라도 끊기면 봉인 — 이소화 Security 비협상.

---

## 10. 관련 문서

- `tutorial-onboarding-user-guide.md` — 사용자 가이드 v1.0 (1차 SSOT 본문)
- `tutorial-onboarding-pr-template.md` — PR/커밋 컨벤션
- `tutorial-onboarding-readme-skeleton.md` — README 절 골격
- `a11y-ingame-copy.md` — 접근성 인게임 카피 SSOT (ARIA 정책 공유)
- `devloop-error-messages.md` · `sound-system-error-messages.md` — 동일 키 규약 패턴

---

> 본 문서가 1차 SSOT이옵니다. 카피 한 줄을 바꾸시려거든 ko/en을 함께 바꾸시고, §7 코드 상수도 같이 갱신하소서. 코드만 바꾸시고 문서를 두지 않으시면, 곡조가 어긋나옵니다.
