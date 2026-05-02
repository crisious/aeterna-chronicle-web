# 💾 세이브·로드 시스템 — 에러 메시지 카피 SSOT v1.0

> 작성: 진채봉 Editor
> 작성일: 2026-04-28
> 스코프: 4종 게이트(roundtrip · migration · recovery · validation) × 4 상태(PASS/BLOCK/WARN/ERROR)
> 톤 5계명: ① 원인→처방 ② 수치는 사실 ③ 경로 절단 금지 ④ 시(詩)는 hint만 ⑤ 도메인 키 규약
> 키 규약: `save.gate.<gate>.<state>.<reason>`
> 메아리: `docs/release/save-load-user-guide.md` · `docs/release/design-system_save-load-system.md` §3.1 카피톤

---

## 1. 매트릭스 개요

| 게이트 | PASS | BLOCK | WARN | ERROR | 슬롯 합계 |
|--------|:----:|:-----:|:----:|:-----:|:---------:|
| roundtrip   | 1 | 1 | 1 | 1 | 4 |
| migration   | 1 | 1 | 1 | 1 | 4 |
| recovery    | 1 | 1 | 1 | 1 | 4 |
| validation  | 1 | 1 | 1 | 1 | 4 |
| **합계**     | **4** | **4** | **4** | **4** | **16** |

ko/en 동시 정의 = **32줄**.

> 인게임 카피(유저 노출)는 디자인 시스템 §3.1 안심톤 표를 따릅니다. 본 문서는 **개발자 콘솔 / CI 게이트 / PR 봇** 카피.

---

## 2. roundtrip (세이브/로드 왕복 일치)

### 2.1 PASS
- **key**: `save.gate.roundtrip.pass.all-equal`
- **ko**: `🟢 왕복 일치 100%. {fixtures}건 fixture 모두 save→load→re-save 후 byte 단위 일치.`
- **en**: `🟢 Round-trip parity 100%. All {fixtures} fixtures match byte-for-byte after save→load→re-save.`
- **hint**: (없음 — 통과 시 시는 다음 게이트로)

### 2.2 BLOCK
- **key**: `save.gate.roundtrip.block.diff-detected`
- **ko**: `🔴 왕복 차이 발견 {count}건. 영역: {areas}. → scripts/save/roundtrip.ts 출력 diff 확인 후 schema 또는 직렬화 로직 점검.`
- **en**: `🔴 {count} round-trip diffs detected. Areas: {areas}. → Inspect scripts/save/roundtrip.ts diff and check schema/serializer.`

### 2.3 WARN
- **key**: `save.gate.roundtrip.warn.float-precision`
- **ko**: `🟡 부동소수 정밀도 차이 {count}건 ({fields}). 게임플레이 영향 없으나 스냅샷 안정성 저하 가능. (≤ 5건 통과)`
- **en**: `🟡 {count} float precision diffs ({fields}). No gameplay impact but reduces snapshot stability. (≤5 allowed)`

### 2.4 ERROR
- **key**: `save.gate.roundtrip.error.checksum-mismatch`
- **ko**: `🟠 체크섬 재계산 불일치: 저장 후 {actual} ≠ 기대 {expected}. → Checksum.ts의 자기 참조 회피 로직 점검.`
- **en**: `🟠 Checksum mismatch: stored {actual} ≠ expected {expected}. → Verify self-reference exclusion in Checksum.ts.`

---

## 3. migration (v1 → v2 마이그레이션)

### 3.1 PASS
- **key**: `save.gate.migration.pass.all-converted`
- **ko**: `🟢 v1→v2 마이그레이션 100%. {fixtures}건 fixture 모두 schema v2로 변환 + 왕복 일치.`
- **en**: `🟢 v1→v2 migration 100%. All {fixtures} fixtures converted to v2 schema with round-trip parity.`

### 3.2 BLOCK
- **key**: `save.gate.migration.block.field-mapping-missing`
- **ko**: `🔴 v1 필드 매핑 누락 {count}개: {fields}. → migrate.v1-to-v2.ts 변환 규칙 표(§3.1) 추가 후 재실행.`
- **en**: `🔴 {count} v1 fields without mapping: {fields}. → Add to migrate.v1-to-v2.ts rule table (§3.1) and retry.`

### 3.3 WARN
- **key**: `save.gate.migration.warn.legacy-not-archived`
- **ko**: `🟡 v1 원본 보존 누락 {count}건. saves/_legacy/ 자동 백업 미생성. (60일 보존 약속 위배 가능)`
- **en**: `🟡 {count} v1 originals not archived to saves/_legacy/. (May violate 60-day retention promise)`

### 3.4 ERROR
- **key**: `save.gate.migration.error.parse-failed`
- **ko**: `🟠 v1 파싱 실패: {file} — {reason}. → 손상 슬롯으로 분류, _quarantine/ 격리 권고.`
- **en**: `🟠 v1 parse failed: {file} — {reason}. → Classify as corrupted, recommend quarantining to _quarantine/.`

---

## 4. recovery (손상 파일 자동 복구)

### 4.1 PASS
- **key**: `save.gate.recovery.pass.all-recovered`
- **ko**: `🟢 손상 시뮬 {scenarios}건 모두 자동 복구 성공. 평균 복구 시간 {avgMs}ms (약속 ≤ 1500ms).`
- **en**: `🟢 All {scenarios} corruption scenarios auto-recovered. Avg recovery {avgMs}ms (target ≤1500ms).`

### 4.2 BLOCK
- **key**: `save.gate.recovery.block.no-good-backup`
- **ko**: `🔴 백업 4슬롯 모두 손상으로 판정된 케이스 {count}건. → BackupRotator.ts 회전 정책 또는 체크섬 검증 점검.`
- **en**: `🔴 {count} cases where all 4 backup slots flagged corrupted. → Verify BackupRotator.ts rotation or checksum logic.`

### 4.3 WARN
- **key**: `save.gate.recovery.warn.fallback-to-chapter`
- **ko**: `🟡 챕터 영구 백업 폴백 발생 {count}건. 자동 백업 4슬롯 부족 — 회전 빈도 점검 권장.`
- **en**: `🟡 {count} fallbacks to chapter checkpoint. Auto-backup 4 slots insufficient — review rotation frequency.`

### 4.4 ERROR
- **key**: `save.gate.recovery.error.quarantine-failed`
- **ko**: `🟠 격리 디렉터리 쓰기 실패: _quarantine/ → {reason}. 손상 슬롯이 active를 덮어쓸 위험. → 즉시 권한/디스크 점검.`
- **en**: `🟠 Quarantine write failed: _quarantine/ → {reason}. Risk: corrupted slot may overwrite active. → Check permissions/disk now.`

---

## 5. validation (로드 시 데이터 검증)

### 5.1 PASS
- **key**: `save.gate.validation.pass.all-clean`
- **ko**: `🟢 검증 4단계 통과. {fixtures}건 fixture 모두 schema/마이그레이션/참조 무결성 OK.`
- **en**: `🟢 4-stage validation passed. All {fixtures} fixtures clean (schema/migration/refs).`

### 5.2 BLOCK
- **key**: `save.gate.validation.block.dangling-ref`
- **ko**: `🔴 참조 끊김 {count}건. 키 ID가 마스터 데이터에 부재: {keys}. → master-data 동기화 또는 슬롯 격리 후 안전 지점 폴백.`
- **en**: `🔴 {count} dangling references. Key IDs not in master data: {keys}. → Sync master-data or quarantine slot and fallback.`

### 5.3 WARN
- **key**: `save.gate.validation.warn.default-applied`
- **ko**: `🟡 누락 필드 기본값 적용 {count}건: {fields}. 게임플레이 영향 미미하나 schema 안정성 점검 권장.`
- **en**: `🟡 {count} missing fields filled with defaults: {fields}. Minor gameplay impact; review schema stability.`

### 5.4 ERROR
- **key**: `save.gate.validation.error.bitmap-empty-on-late-chapter`
- **ko**: `🟠 후반 챕터({chapterId})인데 시나리오 비트맵 빈 상태. 분기 손실 가능 — 챕터 시작점 폴백 권유 다이얼로그 노출 필요.`
- **en**: `🟠 Late chapter ({chapterId}) but scenario bitmap empty. Branch loss likely — show chapter-restart fallback dialog.`

---

## 6. 코드 상수 매핑 (계섬월 인계용)

`src/constants/save_gate_messages.ts` 신설 권고:

```typescript
export const SAVE_GATE_KEYS = [
  'save.gate.roundtrip.pass.all-equal',
  'save.gate.roundtrip.block.diff-detected',
  'save.gate.roundtrip.warn.float-precision',
  'save.gate.roundtrip.error.checksum-mismatch',
  'save.gate.migration.pass.all-converted',
  'save.gate.migration.block.field-mapping-missing',
  'save.gate.migration.warn.legacy-not-archived',
  'save.gate.migration.error.parse-failed',
  'save.gate.recovery.pass.all-recovered',
  'save.gate.recovery.block.no-good-backup',
  'save.gate.recovery.warn.fallback-to-chapter',
  'save.gate.recovery.error.quarantine-failed',
  'save.gate.validation.pass.all-clean',
  'save.gate.validation.block.dangling-ref',
  'save.gate.validation.warn.default-applied',
  'save.gate.validation.error.bitmap-empty-on-late-chapter',
] as const;

export type SaveGateKey = typeof SAVE_GATE_KEYS[number];
```

→ i18n 번들(`i18n/{ko,en}/save_gate.json`)이 본 16키와 1:1 매칭. 누락 시 `save:gate` 즉시 BLOCK.

---

## 7. 톤 5계명 — 본 문서가 따른 규칙

1. **원인 → 처방** — 모든 BLOCK/ERROR는 `→` 뒤에 다음 행동을 명시
2. **수치는 사실** — `{count}` `{actual}` `{expected}` 등 변수로 정량 노출
3. **경로 절단 금지** — `migrate.v1-to-v2.ts` 등 풀패스 보존, 유저가 클릭/검색 가능
4. **시(詩)는 hint만** — PASS hint에만 정서 허용, BLOCK/ERROR는 사실 우선
5. **도메인 키 규약** — `save.gate.<gate>.<state>.<reason>` 4토큰 고정

> 인게임 유저 카피는 위 5계명 + 디자인 §3.1 안심톤 (호박색 + "살짝 흔들렸네요" 어조)을 함께 따릅니다. 본 SSOT는 두 카피 영역의 **동기화 정본**.
