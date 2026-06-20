# ⚔️ README 전투 피드백 가독성 절 — 골격 SSOT v1.0

> 작성: 진채봉 Editor
> 작성일: 2026-06-20
> 스코프: `README.md §⚔️ 전투 피드백 가독성` 신설 골격
> 약속 수치 임의 갱신 금지 — **백능파(Strategy) 승인 필수**
> 1차 SSOT는 `docs/release/battle-feedback-user-guide.md`, 본 문서는 README 메아리 골격

---

## 삽입 위치

`README.md` 내 **`### 🎵 사운드 시스템` 절 다음, `## 🛡️ 코드 품질` 절 이전**에 삽입.

---

## 골격 (붙여넣기용)

```markdown
### ⚔️ 전투 피드백 가독성

> *검의 날이 무뎌지면 사람이 다친다.* — 데미지·상태이상을 색맹 여부와 무관하게 한눈에.

#### 한눈 지표 (4지표)

| 지표 | 약속 | 현재 | 측정 |
|------|------|------|------|
| 데미지·상태이상 명도 대비 | 텍스트 ≥7:1 · 아이콘 ≥3:1 | _TBD_ | `npm run battle:contrast` |
| 전투 텍스트 최소 폰트 | ≥ 14px (데미지 28px) | _TBD_ | `npm run battle:legibility` |
| 색약 비색상 단서 커버리지 | 100% | _TBD_ | `npm run battle:colorblind` |
| 데미지 팝업 체류 · 겹침 | ≥ 900ms · 겹침 0 | _TBD_ | `npm run battle:overlap` |

#### 빠른 시작 (3명령)

```bash
npm run battle:gate       # 4종 게이트 합본 (~60s)
npm run battle:measure    # 대비/폰트/체류 종합 측정 (~12s)
npm run battle:colorblind # 색약 3종 시뮬 (~8s)
```

#### 핵심 표시 요소 (3종)

| 요소 | 종 수 | 비색상 단서 |
|------|-------|-------------|
| 💥 데미지 결과 | 7종 (일반/크리/회복/빗나감/약점/저항/무효) | 크기 위계 + 라벨 |
| 🔥 데미지 속성 | 6종 (물리 무태그 + 화염/빙결/뇌전/암흑/신성) | 이모지 🔥❄⚡🌑✨ |
| ⛓️ 상태이상 | 15종 (지속피해 3 / 봉쇄 4 / 저하 3 / 강화 5) | 아이콘 + 라벨 + 잔여 턴 |

#### 자세한 가이드

- 📖 [사용자 가이드](docs/release/battle-feedback-user-guide.md) — 한 손 흐름도 + FAQ 8건
- 📜 [에러 메시지 SSOT](docs/release/battle-feedback-error-messages.md) — 16 슬롯 ko/en
- 🔧 [PR / 커밋 컨벤션](docs/release/battle-feedback-pr-template.md) — 6 스코프 + 5인 인계 체크
- 🎨 [디자인 토큰](DESIGN.md#5-컴포넌트-토큰) — 데미지/상태 색·폰트 1차 SSOT

#### Ship-Gate 예고

PR 머지 시 봇 하네스가 자동 차단합니다 (3-AND 조건):

```
✅ battle:gate 4종 🟢 PASS  AND  사용자 가이드 메아리 동기화  AND  5인 인계 체크 ✓
```
```

---

## 선택 배지 (2종)

README 상단 배지 영역에 추가 권장:

```markdown
[![Battle Contrast](https://img.shields.io/badge/Battle%20Contrast-AAA-success?style=for-the-badge)](#-전투-피드백-가독성)
[![Colorblind Cues](https://img.shields.io/badge/Colorblind%20Cues-100%25-brightgreen?style=for-the-badge)](#-전투-피드백-가독성)
```

---

## 약속 수치 변경 절차

1. 백능파(Strategy)에게 변경 사유 + 영향 분석 제출
2. 승인 시 본 문서 갱신
3. 동시에 `docs/release/battle-feedback-user-guide.md §1 흐름도` 갱신
4. `README.md §⚔️ 전투 피드백 가독성` 메아리 갱신
5. `CHANGELOG.md`에 *Changed* 항목으로 등재

---

> 본 골격은 README 메아리용 SSOT입니다. 1차 SSOT는 `battle-feedback-user-guide.md` — 약속 수치는 그곳을 따릅니다. 데미지 색/폰트 토큰의 정본은 `DESIGN.md §5` → `battle-tokens.ts`.
