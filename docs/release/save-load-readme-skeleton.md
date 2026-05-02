# 💾 README 세이브·로드 시스템 절 — 골격 SSOT v1.0

> 작성: 진채봉 Editor
> 작성일: 2026-04-28
> 스코프: `README.md §💾 세이브·로드` 신설 골격
> 약속 수치 임의 갱신 금지 — **백능파(Strategy) 승인 필수**
> 1차 SSOT는 `docs/release/save-load-user-guide.md`, 본 문서는 README 메아리 골격

---

## 삽입 위치

`README.md` 내 **`### 🎵 사운드 시스템` 절 다음, `## 🛡️ 코드 품질` 절 이전**에 삽입.

> 직전 스프린트 패턴(사운드 시스템·튜토리얼 온보딩)과 동일하게 *시스템 절 → 코드 품질 절* 사이에 자리 잡습니다.

---

## 골격 (붙여넣기용)

```markdown
### 💾 세이브·로드 시스템

> *기억은 사라져도, 이야기는 남는다.* — 유저의 진척을 절대 잃지 않는 4중 안전망.

#### 한눈 지표 (4지표)

| 지표 | 약속 | 현재 | 측정 |
|------|------|------|------|
| 세이브/로드 왕복 데이터 일치 | 100% | _TBD_ | `npm run save:roundtrip` |
| 손상 파일 → 마지막 정상 백업 자동 복구 | 100% | _TBD_ | `npm run save:recovery` |
| v1 → v2 마이그레이션 호환 | 100% | _TBD_ | `npm run save:migrate-test` |
| 로드 검증 누락 필드 기본값 적용 | 100% | _TBD_ | `npm run save:validate` |

#### 빠른 시작 (3명령)

```bash
npm run save:gate          # 4종 게이트 합본 (~90s)
npm run save:roundtrip     # 왕복 일치 검증 (~30s)
npm run save:recovery      # 손상 시뮬 + 자동 복구 (~20s)
```

#### 4중 안전망 (한눈 표)

| 계층 | 슬롯 수 | 역할 |
|------|---------|------|
| 자동 회전 백업 | 4슬롯 (`backup-1..4`) | 세대별 자동 회전 — 직전 4세대 보호 |
| 챕터 영구 백업 | 6슬롯 (`chapter-clear-1..6`) | 챕터 클리어 시점 영구 보관 |
| 수동 세이브 | 5슬롯 (`manual-1..5`) | 유저 명시 액션만 덮어쓰기 |
| 격리 / 레거시 | `_quarantine/` + `_legacy/` | 손상 60일 보존 · v1 원본 60일 보존 |

총 **15슬롯 + 격리·레거시 보관**. 유저는 잃지 않는다 — 이것이 약속이옵니다.

#### 자세한 가이드

- 📖 [사용자 가이드](docs/release/save-load-user-guide.md) — 한 손 흐름도 + FAQ 7건
- 🎨 [디자인 시스템](docs/release/design-system_save-load-system.md) — 6슬롯 상태 + 안심톤 카피
- 📜 [에러 메시지 SSOT](docs/release/save-load-error-messages.md) — 16 슬롯 ko/en
- 🔧 [PR / 커밋 컨벤션](docs/release/save-load-pr-template.md) — 7 스코프 + 5인 인계 체크

#### Ship-Gate 예고

PR 머지 시 봇 하네스가 자동 차단합니다 (3-AND 조건):

```
✅ save:gate 4종 🟢 PASS  AND  사용자 가이드 메아리 동기화  AND  5인 인계 체크 ✓
```

> ⚠️ 격리/보존 60일 봉인 (이소화 비협상) · 약속 수치 변경 (백능파 승인 필수) — 두 봉인은 함부로 풀지 마세요.
```

---

## 선택 배지 (2종)

README 상단 배지 영역에 추가 권장:

```markdown
[![Save Round-Trip](https://img.shields.io/badge/Save%20Round--Trip-100%25-success?style=for-the-badge)](#-세이브로드-시스템)
[![Auto Recovery](https://img.shields.io/badge/Auto%20Recovery-100%25-brightgreen?style=for-the-badge)](#-세이브로드-시스템)
```

> 직전 스프린트 패턴(사운드 시스템·튜토리얼 온보딩)과 동일하게 *2종 배지* 운영.

---

## 약속 수치 변경 절차

1. 백능파(Strategy)에게 변경 사유 + 영향 분석 제출
2. 승인 시 본 문서 갱신
3. 동시에 `docs/release/save-load-user-guide.md §1 흐름도` 갱신
4. `README.md §💾 세이브·로드` 메아리 갱신
5. `CHANGELOG.md`에 *Changed* 항목으로 등재
6. `launch_checklist.md §2.21` 업데이트

---

## 봉인 항목 (변경 절차 별도)

| 봉인 | 값 | 변경 절차 |
|------|----|----|
| `_legacy/` 보존 | 60일 | 이소화 + 백능파 + 대표(crisi) 3중 승인 |
| `_quarantine/` 보존 | 60일 | 동일 |
| 자동 회전 백업 | 4슬롯 | 동일 |
| 챕터 영구 백업 | 6슬롯 | 동일 |

본 봉인 4항은 *유저가 진척을 잃지 않을 마지막 보장*. 디스크 사용량을 이유로 단축하지 않습니다.

---

> 본 골격은 README 메아리용 SSOT입니다. 1차 SSOT는 `save-load-user-guide.md` — 약속 수치는 그곳을 따릅니다.
