# 💾 세이브·로드 시스템 — PR 본문 / 커밋 메시지 컨벤션 v1.0

> 작성: 진채봉 Editor
> 작성일: 2026-04-28
> 스코프: schema · 마이그레이션 · 자동세이브 · 백업/체크섬 · 로드 검증 PR / 커밋 메시지 표준
> 메아리: `docs/release/save-load-user-guide.md` · `docs/release/save-load-error-messages.md`

---

## 1. PR 제목 — 7 스코프

```
save(<scope>): <한 문장 요약>
```

| 스코프 | 의미 | 예시 |
|--------|------|------|
| `schema` | schema v2 정의 / 필드 추가·삭제 | `save(schema): party.bondPoints 필드 추가 (하위 호환)` |
| `migrate` | v1→v2 변환 규칙 | `save(migrate): v1.flags → flagsBitmap base64 변환 규칙 추가` |
| `auto` | 자동세이브 트리거 5종 | `save(auto): 챕터 클리어 영구 백업 6슬롯 회전 정책 도입` |
| `backup` | 백업 회전 / 체크섬 | `save(backup): SHA-256 체크섬 자기 참조 회피 로직 수정` |
| `recovery` | 손상 복구 흐름 | `save(recovery): 4슬롯 모두 손상 시 챕터 영구 백업 폴백` |
| `validate` | 로드 4단계 검증 | `save(validate): 후반 챕터 빈 비트맵 ERROR 케이스 추가` |
| `docs` | 가이드 / SSOT / 카피 | `save(docs): 사용자 가이드 §3 마이그레이션 표 갱신` |

**제목 길이**: 70자 이내 권장. 한국어 우선, 고유명사는 영문 그대로.

---

## 2. PR 본문 — 7개 섹션

### 섹션 골격

```markdown
## 🎯 목적
<왜 이 변경이 필요한가 — 1-2문장. "유저가 잃을 수 있는 것"을 명시>

## 📦 산출물 분류
- [ ] schema: <필드 X개 추가 / Y개 변경 — 하위 호환 여부 명시>
- [ ] migrate: <변환 규칙 X건 추가 / fixture Y건 갱신>
- [ ] auto: <트리거 X개 변경>
- [ ] backup: <회전 정책 / 체크섬 변경>
- [ ] recovery: <복구 시나리오 X건 추가>
- [ ] validate: <검증 단계 X건 변경>
- [ ] 문서: <X편 갱신>

## 🔍 자동 감사 (Before / After / Δ / 약속)
| 지표 | Before | After | Δ | 약속 |
|------|:------:|:-----:|:-:|:----:|
| 왕복 일치율 | 99.2% | 100.0% | +0.8 | 100% |
| 마이그레이션 통과율 | 96/100 | 100/100 | +4 | 100% |
| 손상 자동 복구율 | 94% | 100% | +6 | 100% |
| 누락 필드 기본값 적용 | 11 케이스 | 16 케이스 | +5 | 16/16 |

## 🛡️ schema 안정성 약속
- [ ] 신규 필드는 **하위 호환** (기본값 명시)
- [ ] 필드 삭제/타입 변경 시 `schemaVersion` 범프 + 마이그레이션 변환 규칙 동시 추가
- [ ] bitmap/배열 인덱스는 **append-only**

## 🔁 마이그레이션 회복
- [ ] v1 원본 `saves/_legacy/` 60일 보존 검증
- [ ] 손상 분류 시 `_quarantine/` 격리 검증
- [ ] 양방향 보존 — 유저의 *이전 버전 복원* 요청 처리 가능

## 🌏 i18n
- [ ] 게이트 카피 ko/en 동시 갱신 (해당 시)
- [ ] 키 규약 `save.gate.<gate>.<state>.<reason>` 준수
- [ ] 인게임 유저 카피는 디자인 §3.1 안심톤 표 동시 갱신

## 📚 문서 갱신
- [ ] `docs/release/save-load-user-guide.md` 메아리
- [ ] `README.md §💾 세이브·로드` 한눈 지표 갱신 (해당 시)
- [ ] `CHANGELOG.md` 항목 추가
- [ ] `launch_checklist.md §2.21` 항목 갱신

## 🤝 5인 인계 체크
- [ ] **두련사** (Architect): SaveSnapshot 인터페이스 변경 없음 / 변경 시 ADR 첨부
- [ ] **계섬월** (Build): npm 명령어 6종 정상 동작 확인 (`save:gate` ≤ 90s)
- [ ] **적경홍** (QA): `save:gate` 4종 모두 🟢 PASS · 손상 시뮬 fixture 동작 확인
- [ ] **이소화** (Security): 격리/보존 60일 정책 봉인 — **비협상**
- [ ] **심요연** (Data): 왕복 일치율·복구 시간 정량 측정값 첨부
```

---

## 3. 커밋 메시지 — 좋은 예 / 나쁜 예

### 🟢 좋은 예

```
save(schema): party.bondPoints 필드 추가 (하위 호환)

- schema v2 §2.3 안정성 약속 따라 기본값 0 명시
- migrate.v1-to-v2.ts에 v1 누락 시 0 채움 규칙 추가
- roundtrip fixture 100/100 통과

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

```
save(recovery): 4슬롯 모두 손상 시 챕터 영구 백업 폴백

- BackupRotator.findLastGood() 탐색 순서:
  backup-1..4 → chapter-clear-{N..1} → 챕터 시작점 권유 다이얼로그
- recovery 게이트 시뮬 fixtures 36건 추가 (4슬롯 손상 케이스)
- 평균 복구 시간 1.2s (약속 ≤ 1.5s)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

```
save(validate): 후반 챕터 빈 비트맵 ERROR 케이스 추가

- save.gate.validation.error.bitmap-empty-on-late-chapter 신규
- chapterId ≥ 4에서 flagsBitmap 빈 상태 시 분기 손실 위험 경보
- 인게임 유저 카피: "안전한 시점을 찾기 어려웠어요. 이전 챕터로 돌아갈까요?"

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

### 🔴 나쁜 예

```
fix save bug                     ← 스코프/맥락 부재
update schema                    ← 무엇이 어떻게 변했는지 불명
WIP                              ← 머지 직전 절대 금지
fix critical save corruption!!!  ← 수치 0 + 정서 과잉
```

---

## 4. 리뷰어 행동 가이드 5항

1. **schema 변경은 무조건 마이그레이션 페어**
   필드 삭제/타입 변경 PR에 `migrate.v1-to-v2.ts` 갱신이 없으면 즉시 *changes-requested*. 유저 데이터는 한 번 잃으면 복구 불가능합니다.

2. **체크섬 자기 참조 회피 점검**
   체크섬 계산 시 `checksum` 필드 자체는 빈 문자열로 처리되어야 합니다. 이 규약을 깨면 같은 데이터에서 다른 해시가 나와 모든 슬롯이 *손상*으로 잘못 분류됩니다.

3. **격리/보존 60일 봉인은 비협상** (이소화)
   `_quarantine/` `_legacy/` 정리 주기를 60일 미만으로 줄이는 PR은 즉시 차단. 유저 신뢰의 마지막 안전망입니다.

4. **자동세이브 빈도 가드 검증** (적경홍)
   30s idle 트리거가 전투 중에도 발화하지 않는지 fixture 검증. UI 토스트가 보스전 중 노출되면 즉시 *changes-requested*.

5. **약속 수치 임의 갱신 금지** (백능파)
   왕복 100% / 자동 복구 100% / 마이그레이션 100% / 검증 100% 4지표 변경은 백능파 Strategy 승인 없이 머지 불가. PR 본문 §자동 감사 표의 *약속* 칸을 함부로 낮추지 마세요.

---

## 5. Ship-Gate 3-AND (백능파 게이트와 정합)

머지 시 봇 하네스가 자동 차단합니다 (3-AND 조건):

```
✅ save:gate 4종 🟢 PASS  AND  사용자 가이드 메아리 동기화  AND  5인 인계 체크 ✓
```

| 조건 | 검증 |
|------|------|
| 1. `save:gate 4종 PASS` | `npm run save:gate` ≤ 90s · roundtrip/migrate/recovery/validate 모두 🟢 |
| 2. 사용자 가이드 메아리 | `save-load-user-guide.md` §1 흐름도 약속 수치와 README 메아리 일치 |
| 3. 5인 인계 체크 | PR 본문 §5인 인계 체크 5항 모두 ✓ |

3-AND 중 한 개라도 ❌이면 머지 불가. 일부 PASS만으로는 머지 차단.

---

## 6. 격리 / 보존 정책 봉인 (이소화 비협상)

| 항목 | 봉인 값 | 변경 시 |
|------|--------|---------|
| `_legacy/` v1 원본 보존 | **60일** | 이소화 + 백능파 + 대표(crisi) 3중 승인 |
| `_quarantine/` 손상 격리 | **60일** | 동일 |
| 챕터 영구 백업 슬롯 수 | **6슬롯** | 동일 |
| 자동 회전 백업 슬롯 수 | **4슬롯** | 동일 |

> 본 봉인은 *유저가 진척을 잃지 않을 마지막 보장*. 디스크 사용량이 부담된다는 이유로 단축하지 않습니다.

---

> 본 컨벤션은 PR/커밋 표준 SSOT입니다. 톤 5계명은 `save-load-error-messages.md` §7과 동일합니다.
