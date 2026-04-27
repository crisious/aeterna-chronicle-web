# 🎵 README 사운드 시스템 절 — 골격 SSOT v1.0

> 작성: 진채봉 Editor
> 작성일: 2026-04-27
> 스코프: `README.md §🎵 사운드 시스템` 신설 골격
> 약속 수치 임의 갱신 금지 — **백능파(Strategy) 승인 필수**
> 1차 SSOT는 `docs/release/sound-system-user-guide.md`, 본 문서는 README 메아리 골격

---

## 삽입 위치

`README.md` 내 **`### ⚡ 개발 효율` 절 다음, `## 🛡️ 코드 품질` 절 이전**에 삽입.

---

## 골격 (붙여넣기용)

```markdown
### 🎵 사운드 시스템

> *기억은 사라져도, 선율은 남는다.* — 1,454개 비주얼 어셋과 짝을 이루는 사운드 레이어.

#### 한눈 지표 (4지표)

| 지표 | 약속 | 현재 | 측정 |
|------|------|------|------|
| 씬 BGM 매핑 커버리지 | 100% | _TBD_ | `npm run audio:coverage-bgm` |
| 핵심 전투 SFX 커버리지 | 100% | _TBD_ | `npm run audio:coverage-sfx` |
| 라이선스 위험 | 0건 | _TBD_ | `npm run audio:license-check` |
| SFX 평균 응답 지연 | ≤ 50ms | _TBD_ | `npm run audio:measure` |

#### 빠른 시작 (3명령)

```bash
npm run audio:gate          # 4종 게이트 합본 (~60s)
npm run audio:measure       # 응답 지연 측정 (~10s)
npm run audio:license-check # 라이선스 안전성 확인 (~3s)
```

#### 핵심 카테고리 (3종)

| 카테고리 | 슬롯 수 | 라이선스 |
|----------|---------|----------|
| 🎼 BGM (씬 음악) | 50종 (보스/필드/마을/이벤트/시즌/심연/시스템) | CC0 우선 |
| ⚔️ SFX (전투) | 57개 슬롯 (스킬 30 + 타격 8 + 회피 4 + 크리티컬 3 + 상태 12) | CC0 |
| 🖱️ UI (인터랙션) | 9개 액션 (메뉴/커서/획득/레벨업/에러 등) | CC0 |

#### 자세한 가이드

- 📖 [사용자 가이드](docs/release/sound-system-user-guide.md) — 한 손 흐름도 + FAQ 7건
- 📜 [에러 메시지 SSOT](docs/release/sound-system-error-messages.md) — 16 슬롯 ko/en
- 🔧 [PR / 커밋 컨벤션](docs/release/sound-system-pr-template.md) — 7 스코프 + 5인 인계 체크
- ⚖️ [라이선스 크레딧](docs/legal/audio-credits.md) — 자동 등재 출처 목록

#### Ship-Gate 예고

PR 머지 시 봇 하네스가 자동 차단합니다 (3-AND 조건):

```
✅ audio:gate 4종 🟢 PASS  AND  사용자 가이드 메아리 동기화  AND  5인 인계 체크 ✓
```
```

---

## 선택 배지 (2종)

README 상단 배지 영역에 추가 권장:

```markdown
[![Audio Coverage](https://img.shields.io/badge/Audio%20Coverage-100%25-success?style=for-the-badge)](#-사운드-시스템)
[![License Risks](https://img.shields.io/badge/License%20Risks-0-brightgreen?style=for-the-badge)](#-사운드-시스템)
```

---

## 약속 수치 변경 절차

1. 백능파(Strategy)에게 변경 사유 + 영향 분석 제출
2. 승인 시 본 문서 갱신
3. 동시에 `docs/release/sound-system-user-guide.md §1 흐름도` 갱신
4. `README.md §🎵 사운드 시스템` 메아리 갱신
5. `CHANGELOG.md`에 *Changed* 항목으로 등재

---

> 본 골격은 README 메아리용 SSOT입니다. 1차 SSOT는 `sound-system-user-guide.md` — 약속 수치는 그곳을 따릅니다.
