# ⚔️ 전투 피드백 가독성 — PR 본문 / 커밋 메시지 컨벤션 v1.0

> 작성: 진채봉 Editor
> 작성일: 2026-06-20
> 스코프: 데미지·상태이상 표시 가독성 PR / 커밋 메시지 표준
> 메아리: `docs/release/battle-feedback-user-guide.md` · `docs/release/battle-feedback-error-messages.md`

---

## 1. PR 제목 — 6 스코프

```
battle(<scope>): <한 문장 요약>
```

| 스코프 | 의미 | 예시 |
|--------|------|------|
| `damage` | 데미지 팝업 색/폰트/체류 | `battle(damage): 빗나감 라벨 외곽선 추가로 대비 보강` |
| `status` | 상태이상 아이콘/라벨/턴 | `battle(status): 버프/디버프 테두리 형태 단서 분리` |
| `contrast` | 대비비 토큰/측정 | `battle(contrast): resist/immune 저채도 외곽선 토큰화` |
| `colorblind` | 색약 단서/시뮬 | `battle(colorblind): 속성 6종 이모지 태그 배선` |
| `gate` | 게이트 스크립트/임계값 | `battle(gate): overlap 체류 임계 900ms 고정` |
| `docs` | 가이드/SSOT/카피 | `battle(docs): 사용자 가이드 §4 상태이상 15종 표 갱신` |

**제목 길이**: 70자 이내 권장. 한국어 우선, 고유명사·토큰명은 영문 그대로.

---

## 2. PR 본문 — 7개 섹션

### 섹션 골격

```markdown
## 🎯 목적
<왜 이 변경이 필요한가 — 1-2문장>

## 📦 산출물 분류
- [ ] 데미지: <X>종 색/폰트/체류 조정
- [ ] 상태이상: <X>종 아이콘/라벨/턴 표시 개선
- [ ] 색약 단서: <X>건 이모지/아이콘 병행 추가
- [ ] 게이트: <X>종 스크립트 신설/조정
- [ ] 문서: <X>편 갱신

## 🔍 자동 감사 (Before / After / Δ / 약속)
| 지표 | Before | After | Δ | 약속 |
|------|:------:|:-----:|:-:|:----:|
| 데미지·상태 명도 대비 (최저) | 3.1:1 | 7.4:1 | +4.3 | ≥7:1 |
| 14px 봉인 위반 | 4건 | 0건 | -4 | 0건 |
| 색약 비색상 단서 커버리지 | 62% | 100% | +38 | 100% |
| 데미지 팝업 겹침 | 5건 | 0건 | -5 | 0건 |

## 🎨 디자인 토큰 정합 (SSOT 위계)
- [ ] `DESIGN.md §5` 1차 SSOT 갱신 (색/폰트 변경 시)
- [ ] `design-system-battle.css` 3차 미러 동기
- [ ] `battle-tokens.ts` 4차 Phaser 런타임 동기
- [ ] 단방향 — 코드→문서 역갱신 금지 확인

## ♿ 접근성 약속
- [ ] 색상 외 형태/아이콘/라벨 병행 (색약 대응)
- [ ] 전투 텍스트 ≥14px (데미지 28px)
- [ ] 대비 텍스트 ≥7:1 / 아이콘 ≥3:1

## 🌏 i18n
- [ ] 게이트 카피 ko/en 동시 갱신 (해당 시)
- [ ] 키 규약 `battle.feedback.<gate>.<state>.<reason>` 준수
- [ ] 속성/상태 라벨 `i18n/{ko,en}.json` 동기

## 🤝 5인 인계 체크
- [ ] **두련사** (Architect): CombatManager/Renderer 인터페이스 변경 없음 / 변경 시 ADR 첨부
- [ ] **계섬월** (Build): `battle:*` 게이트 명령어 정상 동작 확인
- [ ] **적경홍** (QA): `battle:gate` 4종 모두 🟢 PASS
- [ ] **이소화** (Security): 색약/접근성 봉인 위반 0건 — **비협상**
- [ ] **심요연** (Data): 대비비/체류/폰트 정량 측정값 첨부
```

---

## 3. 커밋 메시지 — 좋은 예 / 나쁜 예

### 🟢 좋은 예

```
battle(damage): 빗나감/저항/무효 저채도 3종 외곽선 보강

- BATTLE_COLORS.damage miss/resist/immune 1px #000 외곽선 토큰화
- 대비 최저 3.1:1 → 7.4:1 (약속 7:1 충족)
- battle:contrast 🟢 PASS

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
```

```
battle(colorblind): 데미지 속성 6종 이모지 태그 BattleScene 배선

- formatDamageTypeTag() 반환값 팝업 렌더에 연결
- 적록/청황/전색맹 3종 시뮬 식별 100%
- 물리 무태그 무가시 보존 확인
```

### 🔴 나쁜 예

```
battle: 색 바꿈
```
→ 스코프 부재, 무엇을 왜 바꿨는지 불명. 대비 영향 누락.

```
fix: damage color
```
→ 한국어 우선 규약 위반, 토큰 변경인데 SSOT 위계 미언급.

```
battle(damage): 색 고쳤는데 대비 측정은 안 해봄
```
→ 자기-실토 금지. 대비 미검은 BLOCK 사안 → `battle:contrast` 통과 후 PR.

---

## 4. 리뷰어 행동 가이드 — 5항

1. **약속 수치 검증**: §3 자동 감사 표가 실제 게이트 출력과 일치하는가? `battle:gate` 재실행 1회.
2. **이소화 봉인 비협상**: 색약 단서 BLOCK·14px 위반은 어떤 사정이 있어도 머지 금지. 단서 병행 후에만 통과.
3. **SSOT 위계 정합**: 색/폰트 토큰 변경 시 `DESIGN.md → CSS → battle-tokens.ts` 단방향 순서 확인. 역갱신 발견 시 반려.
4. **적경홍 QA 신호**: `battle:contrast` `battle:colorblind` 둘 다 🟢이어야 머지. 🟡는 후속 PR로 트래킹.
5. **심요연 데이터 객관성**: 대비비는 표시 시점 배경 기준 측정. 단일 배경 측정값은 신뢰 보류, 동적 배경 worst-case 첨부.

---

## 5. 머지 전 최종 체크 (3-AND)

```
✅ battle:gate 4종 🟢 PASS  (contrast + legibility + colorblind + overlap)
        AND
✅ docs/release/battle-feedback-user-guide.md 메아리 동기화
        AND
✅ 5인 인계 체크 모두 ✓
```

세 조건 중 하나라도 결여되면 봇 하네스가 자동 차단합니다 (`ship-gate` hook 예고).

---

> 본 컨벤션은 1차 SSOT입니다. PR 본문 섹션·체크리스트 변경 시 본 문서 갱신 + `.github/PULL_REQUEST_TEMPLATE.md` 동시 갱신.
