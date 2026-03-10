# 에테르나 크로니클 — NPC 선택지 이벤트 텔레메트리 스키마 v1

> 작성일: 2026-03-06 | 버전: v1.0  
> 대상 티켓: P1-07  
> 목적: NPC 대화 선택이 엔딩/신뢰도/경제에 미치는 영향을 분석 가능한 형태로 표준화

---

## 1) 이벤트 채널

- 채널명: `telemetry.dialogue.choice`
- 전송 시점: 플레이어가 선택지를 **확정(Confirm)** 한 시점
- 전송 보장: at-least-once (중복 가능성 고려해 idempotency key 포함)

---

## 2) 공통 필드 스키마

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `eventId` | string(uuid) | Y | 이벤트 고유 ID |
| `eventTs` | string(ISO8601) | Y | UTC 타임스탬프 |
| `sessionId` | string | Y | 클라이언트 세션 식별자 |
| `playerIdHash` | string | Y | 익명화 플레이어 식별자(SHA-256) |
| `chapterId` | string | Y | 예: `CH4` |
| `sceneId` | string | Y | 예: `C4-N3` |
| `npcId` | string | Y | 예: `CIELA_BANE` |
| `dialogueNodeId` | string | Y | 대화 노드 ID |
| `choiceId` | string | Y | 선택지 ID(A/B/C...) |
| `choiceTextKey` | string | Y | 로컬라이즈 키 |
| `inputMode` | enum | Y | `keyboard`/`gamepad`/`touch` |
| `latencyMs` | number | N | 노출→선택 확정까지 시간 |
| `partyComp` | string[] | N | 동행 파티 식별자 |
| `difficultyTier` | string | N | `story/normal/hard/nightmare` |
| `buildVersion` | string | Y | 예: `0.9.12-alpha` |
| `platform` | enum | Y | `web/unity/ue5/ps5/xbox` |
| `region` | string | N | 리전 코드 |
| `idempotencyKey` | string | Y | 중복 제거 키 |

---

## 3) 결과(Outcome) 확장 필드

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `trustDelta` | object | N | `{ "igna": +3, "rowen": -1 }` |
| `endingProgressDelta` | object | N | `{ "A": +15, "C": 0 }` |
| `questStateDelta` | object | N | `{ "quest.c3.desert_flame": "COMPLETE" }` |
| `combatDifficultyDelta` | object | N | `{ "detectRateMul": -0.08 }` |
| `rewardDelta` | object | N | `{ "gold": 120, "itemIds": ["EQ-047"] }` |
| `branchTag` | string[] | N | 예: `['stealth','high_risk','public_expose']` |

---

## 4) 개인정보/보안 규칙

- 원본 계정/캐릭터명 저장 금지
- `playerIdHash`는 서버 솔트 기반 단방향 해시만 허용
- 자유입력 텍스트(채팅/닉네임) 수집 금지
- 보존 기간: 원시 로그 90일, 집계 지표 1년

---

## 5) 예시 페이로드

```json
{
  "eventId": "8abf4d4f-c4e2-4fae-94b1-dde89e9cb1a1",
  "eventTs": "2026-03-06T03:24:11.392Z",
  "sessionId": "sess_7f2a...",
  "playerIdHash": "sha256:61b3...",
  "chapterId": "CH4",
  "sceneId": "C4-N3",
  "npcId": "CIELA_BANE",
  "dialogueNodeId": "C4_N3_BRIEF_02",
  "choiceId": "A",
  "choiceTextKey": "dialogue.c4.n3.choice.a",
  "inputMode": "keyboard",
  "latencyMs": 4820,
  "partyComp": ["ERIEN", "SERAPHINE", "IGNA"],
  "difficultyTier": "normal",
  "buildVersion": "0.9.12-alpha",
  "platform": "ue5",
  "region": "KR",
  "idempotencyKey": "sess_7f2a...:C4_N3_BRIEF_02:A",
  "trustDelta": { "ciela": 4 },
  "endingProgressDelta": { "A": 5, "B": 0, "C": 0, "D": 0 },
  "questStateDelta": { "quest.c4.press_leak": "ACTIVE" },
  "combatDifficultyDelta": { "patrolDensityMul": -0.12 },
  "rewardDelta": { "gold": 0, "itemIds": [] },
  "branchTag": ["intel_war", "public_expose"]
}
```

---

## 6) 구현 체크리스트

- [ ] Phaser/Unity/UE5 공통 이벤트 빌더 함수 제공
- [ ] 선택 확정 시점 훅(키보드/패드) 통합
- [ ] idempotency 중복 제거 서버 처리
- [ ] 대시보드 집계 KPI 정의(선택률, 루트별 클리어율, 엔딩 기여도)
