# 💾 에테르나 크로니클 — 세이브·로드 시스템 사용자 가이드 v1.0

> 작성: 진채봉 Editor
> 작성일: 2026-04-28
> 스코프: 세이브 schema · v1→v2 마이그레이션 · 자동세이브 트리거 · 손상 복구 · 로드 검증
> 1차 SSOT — 약속 수치 변경 시 본 문서 §1 흐름도 동시 갱신
> 메아리: `README.md §💾 세이브·로드` · `launch_checklist.md §2.21` · 인게임 [도움말 → 세이브]
> 연관 SSOT:
> - 디자인: `docs/release/design-system_save-load-system.md` (가춘운)
> - 아키텍처: 두련사 *선禪 4계* — Schema → AutoSave → Backup → Validate
> - 게이트: 백능파 *왕복 100% · 자동 백업 복구* (HOLD 결정)

---

## 목차

1. [한 손 흐름도](#1-한-손-흐름도)
2. [세이브 데이터 schema (v2)](#2-세이브-데이터-schema-v2)
3. [v1 → v2 마이그레이션 정책](#3-v1--v2-마이그레이션-정책)
4. [자동세이브 트리거 5종](#4-자동세이브-트리거-5종)
5. [백업·체크섬·복구](#5-백업체크섬복구)
6. [로드 시 데이터 검증](#6-로드-시-데이터-검증)
7. [npm 명령어 표](#7-npm-명령어-표)
8. [디렉터리 구조](#8-디렉터리-구조)
9. [FAQ 7건](#9-faq-7건)

---

## 1. 한 손 흐름도

```
[1] 자동세이브 트리거 → SaveManager.snapshot(slot)         ≤ 200ms
       ↓
[2] schema 직렬화      → SaveSnapshot v2 (JSON + checksum) ≤ 400ms
       ↓
[3] 백업 회전          → backup-1 ← active 직전, 4슬롯 회전 ≤  50ms
       ↓
[4] 로드 시 검증        → 4단계 (read → schema → migrate → ref) ≤ 800ms
       ↓
[5] 손상 감지          → 마지막 정상 백업 자동 복구          ≤ 1.5s
```

### 약속 수치 (4지표 게이트)

| 지표 | 약속 | 측정 도구 |
|------|------|-----------|
| 세이브/로드 왕복 데이터 일치 | **100%** | `npm run save:roundtrip` |
| 손상 파일 → 마지막 정상 백업 자동 복구 | **100%** | `npm run save:recovery` |
| v1 → v2 마이그레이션 호환 | **100%** | `npm run save:migrate-test` |
| 로드 검증 누락 필드 기본값 적용 | **100%** | `npm run save:validate` |

> 약속 수치 변경 절차: 백능파(Strategy) 승인 → 본 §1 갱신 → README 메아리 갱신 → CHANGELOG *Changed* 등재.

---

## 2. 세이브 데이터 schema (v2)

> 본 schema는 두련사 *선禪 4계* §1 Schema 정의와 1:1 미러. 본 문서가 사람이 읽는 정본, 코드(`client/src/save/schema.v2.ts`)는 단방향 미러.

### 2.1 최상위 구조

```jsonc
{
  "schemaVersion": 2,
  "createdAt": "2026-04-28T12:34:56.000Z",
  "updatedAt": "2026-04-28T13:02:11.000Z",
  "slotKind": "active" | "backup" | "auto",
  "checksum": "sha256:...",          // §5.2 체크섬 규약
  "playthrough": { /* §2.2 */ },
  "party":       { /* §2.3 */ },
  "inventory":   { /* §2.4 */ },
  "scenario":    { /* §2.5 */ },
  "world":       { /* §2.6 */ }
}
```

### 2.2 데이터 영역 6종

| 영역 | 키 | 핵심 필드 | 손실 시 영향 |
|------|----|----|----|
| 진행 정보 | `playthrough` | `playtimeSec` · `chapterId` · `lastSavedAt` | 진척 시간 표시 |
| **파티** | `party` | `members[]` · `memberLevels` · `formation` · `bondPoints` | **레벨/유대 손실 = 가장 치명적** |
| **인벤토리** | `inventory` | `items[]` · `gold` · `equipped` · `keyItems` | 시나리오 진행 차단 가능 |
| **시나리오 진척** | `scenario` | `flagsBitmap` · `branchChoices[]` · `subQuestState` | 엔딩 분기 변형 |
| 맵/해금 | `world` | `unlockedRegions[]` · `fastTravelNodes[]` · `discoveredPOI[]` | 재탐색 부담 |
| 메타 | `playthrough.meta` | `seed` · `difficulty` · `seasonId` | RNG 재현성 |

### 2.3 schema 안정성 약속

- 신규 필드 추가는 **하위 호환** (기본값 명시 필수)
- 필드 삭제/타입 변경은 **schemaVersion 범프** 의무 (마이그레이션 §3)
- bitmap/배열 인덱스는 **append-only** — 중간 인덱스 의미 변경 금지

---

## 3. v1 → v2 마이그레이션 정책

### 3.1 변환 규칙 표

| v1 필드 | v2 필드 | 변환 | 결손 시 기본값 |
|---------|---------|------|----------------|
| `version: 1` | `schemaVersion: 2` | 상수 치환 | — |
| `chapter` (number) | `playthrough.chapterId` (string) | `String(n)` | `"1"` |
| `level` (number) | `party.memberLevels[0]` | 배열 첫 칸 | `1` |
| `items` (string[]) | `inventory.items[]` (object[]) | `{ id, count: 1 }` 변환 | `[]` |
| `flags` (number) | `scenario.flagsBitmap` (string base64) | 비트마스크 인코딩 | `""` |
| (없음) | `checksum` | 신규 생성 | sha256 신규 |

### 3.2 마이그레이션 게이트

- **트리거**: 로드 시 `schemaVersion < 2` 감지 시 자동
- **소요시간 약속**: 단일 슬롯 **≤ 800ms**
- **실패 정책**: 변환 실패 시 원본 v1 파일 보존 + `corrupted` 슬롯으로 분류 (§5.3)
- **유저 노출**: 디자인 시스템 §4.4 4단계 인디케이터 ③ 단계만 호박색 강조 + 카피 *"예전 모험을 새 책장으로 옮기는 중이에요 📚"*

### 3.3 마이그레이션 회복 — 양방향 보존

- v1 → v2 변환 직후 v1 원본은 `saves/_legacy/v1_<slot>_<timestamp>.bak`로 60일간 보존
- 60일 경과 시 자동 정리 (`save:cleanup-legacy` 게이트)
- 유저가 명시적으로 *"이전 버전으로"* 요청해도 본문 v1 원본 그대로 복원 가능

---

## 4. 자동세이브 트리거 5종

> 두련사 *선禪 4계* §2 AutoSave 5트리거 그대로 미러.

| # | 트리거 | 슬롯 종류 | 빈도 가드 |
|---|--------|-----------|-----------|
| 1 | **씬 전환** (지역 이동/맵 진입) | `auto` | 동일 씬 30s 내 중복 차단 |
| 2 | **보스 처치** | `auto` + `backup` 백업 | 보스 1체당 1회 |
| 3 | **레벨업** (파티 평균 +1) | `auto` | 동일 레벨 1회 |
| 4 | **챕터 클리어** | `backup` 영구 | Ch당 1회, 6슬롯 영구 보관 |
| 5 | **30초 주기 idle** | `auto` (가장 오래된 회전) | 전투 중 차단 |

### 4.1 트리거 정책 약속

- 동시 트리거 시 **머지** — 한 번의 snapshot 호출로 통합 (중복 I/O 방지)
- 자동세이브 토스트(디자인 §4.2)는 **씬 전환 / 보스 / 챕터** 3종만 노출, 30s idle / 레벨업은 무음 (몰입 보호)
- 자동세이브 실패 시 **다음 트리거까지 진척 손실 가능** — 세이브 큐 깊이 1, 실패 시 즉시 재시도 1회

---

## 5. 백업·체크섬·복구

### 5.1 슬롯 회전 정책

```
[active]   ← 현재 진행 슬롯 (덮어쓰기 가능)
[backup-1] ← 1세대 전 (자동 회전)
[backup-2] ← 2세대 전
[backup-3] ← 3세대 전
[backup-4] ← 4세대 전 (가장 오래)
```

- 새 자동세이브 진입 시: `backup-4 ← backup-3 ← backup-2 ← backup-1 ← active`
- **챕터 클리어 영구 백업**은 별도 `chapter-clear-{N}.save` 6슬롯, 회전에서 제외
- 수동 세이브는 `manual-{1..5}.save` 5슬롯 — 유저 명시 액션만 덮어쓰기

### 5.2 체크섬 규약

- **알고리즘**: SHA-256 (전 영역 직렬화 후)
- **저장 위치**: 파일 헤더 `checksum` 필드 (자기 참조 회피 — 체크섬 계산 시 해당 필드는 빈 문자열 처리)
- **검증 시점**: 로드 시 4단계 ① 단계 (디자인 §4.4)
- **실패 시**: `corrupted` 슬롯 분류 → §5.3 자동 복구

### 5.3 자동 복구 흐름

```
load(active) → checksum FAIL
       ↓
탐색: backup-1 → backup-2 → backup-3 → backup-4
       ↓
첫 번째 정상 슬롯 발견 → 복구 다이얼로그 (디자인 §4.3)
       ↓
유저 동의 → active 갱신, corrupted 슬롯 → saves/_quarantine/ 격리 (60일 보존)
       ↓
모든 슬롯 손상 → 챕터 클리어 영구 백업으로 폴백 → 그래도 없으면 *이전 챕터 시작* 권유
```

### 5.4 약속 수치

| 지표 | 약속 |
|------|------|
| 손상 단일 슬롯 → 자동 복구 | 100% (4슬롯 백업 + 6슬롯 챕터 영구 백업 한도 내) |
| 복구 다이얼로그 노출 → 유저 응답 | 평균 ≤ 3s (디자인 §4.3 카피 안심톤) |
| 격리 파일 보존 | 60일 |

---

## 6. 로드 시 데이터 검증

> 두련사 *선禪 4계* §3 Validate 4단계 그대로.

### 6.1 4단계 파이프라인

| 단계 | 검증 내용 | 실패 시 동작 |
|------|-----------|--------------|
| ① 파일 읽기 | I/O · 파일 존재 | 백업 회전 진입 |
| ② 스키마 검증 | JSON 파싱 · 타입 체크 · 체크섬 | 백업 회전 진입 |
| ③ 마이그레이션 | v1→v2 (§3) | 원본 보존 + 격리 |
| ④ 참조 검증 | 키아이템·NPC·맵 노드 ID 존재 | 누락 필드 기본값 + 경고 로그 |

### 6.2 누락 필드 기본값 정책

| 누락 필드 | 기본값 | 사이드이펙트 |
|-----------|--------|--------------|
| `party.memberLevels[i]` | `1` | 진척 표기 1로 노출 (위험 ⚠️ — 보통 ②단계에서 손상 분류) |
| `inventory.gold` | `0` | 즉시 적용 |
| `inventory.keyItems` | `[]` | **시나리오 차단 위험** → §6.3 참조 검증에서 재탐지 |
| `scenario.flagsBitmap` | `""` (빈 비트맵) | 분기 영향 가능 → 챕터 시작점 폴백 권유 |
| `world.unlockedRegions` | `["chapter1.start"]` | 안전 |

### 6.3 참조 끊김 탐지

- 키아이템 ID가 마스터 데이터에 부재 → 해당 슬롯 분기 미흡 → 유저에게 *"진척이 일부 어긋난 듯해요. 가까운 안전 지점으로 이동할까요?"* 카피로 노출
- 무한 루프 방지: 참조 검증은 ID 집합 1회 스캔, O(n+m)

---

## 7. npm 명령어 표

```bash
npm run save:gate            # 4종 게이트 합본 (~90s)
npm run save:roundtrip       # 왕복 일치 검증 (~30s)
npm run save:recovery        # 손상 시뮬레이션 + 자동 복구 검증 (~20s)
npm run save:migrate-test    # v1→v2 마이그레이션 fixture 100건 (~25s)
npm run save:validate        # 누락 필드 / 참조 끊김 탐지 (~15s)
npm run save:cleanup-legacy  # 60일 경과 v1 원본 정리 (~5s)
```

---

## 8. 디렉터리 구조

```
saves/
├─ active.save                        # 현재 진행
├─ backup-1.save ~ backup-4.save      # 자동 회전 4슬롯
├─ chapter-clear-1.save ~ -6.save     # 챕터 클리어 영구 6슬롯
├─ manual-1.save ~ manual-5.save      # 수동 5슬롯
├─ _quarantine/                       # 손상 격리 (60일)
└─ _legacy/                           # v1 원본 백업 (60일)

client/src/save/
├─ schema.v2.ts                       # 본 §2 미러
├─ migrate.v1-to-v2.ts                # 본 §3 미러
├─ AutoSaveManager.ts                 # 트리거 5종 (§4)
├─ BackupRotator.ts                   # 회전 정책 (§5.1)
├─ Checksum.ts                        # SHA-256 (§5.2)
└─ Validators/{schema,refs}.ts        # 4단계 (§6)

scripts/save/
├─ roundtrip.ts · recovery.ts · migrate-test.ts · validate.ts
└─ fixtures/v1/*.save (100건)
```

---

## 9. FAQ 7건

**Q1. 자동세이브 도중 브라우저가 강제 종료되면?**
A. 자동세이브는 **원자적(atomic)** 으로 동작합니다. 임시 파일에 먼저 쓴 뒤 rename 해서, 도중에 끊겨도 직전 슬롯이 그대로 살아 있어요. 다음 진입 시 직전 자동세이브 그대로 이어집니다.

**Q2. 백업이 4세대뿐인데 충분한가요?**
A. 자동 회전 4 + 챕터 클리어 영구 6 + 수동 5 = **총 15슬롯**입니다. 일반 플레이에서 4세대 모두 손상은 통계적으로 0에 가깝고, 그조차 챕터 클리어 6슬롯이 안전망입니다.

**Q3. v1 세이브를 가진 베타 유저는 어떻게 되나요?**
A. 첫 로드 시 자동으로 v1→v2로 옮겨드립니다(§3). 원본 v1 파일은 `saves/_legacy/`에 60일간 보존되니 안심하세요.

**Q4. 체크섬은 왜 SHA-256인가요? CRC32면 충분하지 않나요?**
A. CRC32는 우연한 비트 손상에는 효과적이지만, 사용자가 직접 파일을 편집(치트)한 경우 충돌이 쉽습니다. SHA-256은 두 경우 모두 안전합니다.

**Q5. 손상 복구 다이얼로그가 무서워요.**
A. 가춘운 디자이너님이 카피톤을 다듬어 주셨어요 — *"방금 슬롯이 살짝 흔들렸네요. 백업이 있으니 안심하세요 🛡️"*. 색깔도 빨강이 아닌 따뜻한 호박색입니다.

**Q6. 시나리오 진척 비트맵을 잃으면 엔딩이 바뀌나요?**
A. ②단계 스키마 검증에서 비트맵 누락은 손상으로 분류되어 백업 슬롯으로 자동 복구합니다. 즉, *"빈 비트맵으로 그대로 진행"* 케이스는 거의 발생하지 않아요. 만약 모든 백업이 손상되어 마지막 폴백으로 떨어진 경우에는 챕터 시작점에서 다시 진행하시도록 안내드립니다.

**Q7. 클라우드 세이브는 언제 지원되나요?**
A. v1.0 출시는 로컬 세이브 한정입니다. 클라우드 세이브는 v1.1 로드맵에 있으며, 본 schema v2가 그대로 클라우드 동기화 페이로드로 사용됩니다 (체크섬 + 마이그레이션 정책 그대로 재사용).

---

> 본 가이드는 1차 SSOT입니다. 약속 수치 4지표는 백능파(Strategy)의 HOLD 결정을 따르며, 변경 시 §1 동시 갱신.
