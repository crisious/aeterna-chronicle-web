# 🎵 사운드 시스템 — PR 본문 / 커밋 메시지 컨벤션 v1.0

> 작성: 진채봉 Editor
> 작성일: 2026-04-27
> 스코프: BGM·SFX·UI 사운드 통합 PR / 커밋 메시지 표준
> 메아리: `docs/release/sound-system-user-guide.md` · `docs/release/sound-system-error-messages.md`

---

## 1. PR 제목 — 7 스코프

```
audio(<scope>): <한 문장 요약>
```

| 스코프 | 의미 | 예시 |
|--------|------|------|
| `bgm` | 씬 BGM 매핑 / 음원 추가 | `audio(bgm): 챕터3 솔라리스 사막 BGM 5종 매핑` |
| `sfx` | 전투/시스템 SFX | `audio(sfx): 기억술사 5종 스킬 SFX 슬롯 추가` |
| `ui` | UI 인터랙션 사운드 | `audio(ui): 레벨업/퀘스트 클리어 SFX 신설` |
| `gate` | 게이트 스크립트/임계값 | `audio(gate): license-check 임계 5→10건 완화` |
| `license` | 라이선스 메타/크레딧 | `audio(license): CC-BY 자산 7건 크레딧 자동 등재` |
| `assets` | 음원 파일 추가/교체 | `audio(assets): bgm_boss_arg_01_emperor.ogg 추가` |
| `docs` | 가이드/SOP/SSOT | `audio(docs): 사용자 가이드 §3 SFX 슬롯 추가` |

**제목 길이**: 70자 이내 권장. 한국어 우선, 고유명사는 영문 그대로.

---

## 2. PR 본문 — 7개 섹션

### 섹션 골격

```markdown
## 🎯 목적
<왜 이 변경이 필요한가 — 1-2문장>

## 📦 산출물 분류
- [ ] BGM: <X>곡 추가/<Y>곡 교체
- [ ] SFX: <X>개 슬롯 추가/<Y>개 교체
- [ ] UI: <X>개 액션 추가
- [ ] 라이선스: <X>건 등재
- [ ] 문서: <X>편 갱신

## 🔍 자동 감사 (Before / After / Δ / 약속)
| 지표 | Before | After | Δ | 약속 |
|------|:------:|:-----:|:-:|:----:|
| BGM 매핑 커버리지 | 60% | 100% | +40 | 100% |
| SFX 핵심 이벤트 커버 | 70% | 100% | +30 | 100% |
| 라이선스 위험 | 3건 | 0건 | -3 | 0건 |
| 평균 SFX 응답 지연 | 80ms | 35ms | -45 | ≤50ms |

## 🎼 비주얼/오디오 위계 약속
- BGM 음량: -16 LUFS ±1 LU
- SFX 음량: -14 LUFS ±1 LU
- UI 음량: §4 표 참조

## 📜 라이선스 증빙
- [ ] `audio/_licenses/*.license.yaml` 4필드 모두 채워짐
- [ ] CC-BY 자산은 `docs/legal/audio-credits.md` 자동 등재 확인
- [ ] 금지 라이선스(NC/SA-상업/모호 RF) 0건

## 🌏 i18n
- [ ] 게이트 카피 ko/en 동시 갱신 (해당 시)
- [ ] 키 규약 `audio.gate.<gate>.<state>.<reason>` 준수

## 📚 문서 갱신
- [ ] `docs/release/sound-system-user-guide.md` 메아리
- [ ] `README.md §🎵 사운드 시스템` 한눈 지표 갱신 (해당 시)
- [ ] `CHANGELOG.md` 항목 추가

## 🤝 5인 인계 체크
- [ ] **두련사** (Architect): SoundManager 인터페이스 변경 없음 / 변경 시 ADR 첨부
- [ ] **계섬월** (Build): npm 명령어 5종 정상 동작 확인
- [ ] **적경홍** (QA): `audio:gate` 4종 모두 🟢 PASS
- [ ] **이소화** (Security): 라이선스 봉인 0건 — **비협상**
- [ ] **심요연** (Data): 음량/지연 정량 측정값 첨부
```

---

## 3. 커밋 메시지 — 좋은 예 / 나쁜 예

### 🟢 좋은 예

```
audio(bgm): 챕터1 에레보스 필드 BGM 5종 매핑

- bgm_fld_ere_01_dawn ~ 05_twilight (CC0)
- audio/bgm-map.yaml `chapter1.field.*` 추가
- coverage-bgm 60% → 75% (목표 100%)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

```
audio(license): CC-BY 자산 7건 크레딧 자동 등재 게이트 추가

- audio:license-check가 docs/legal/audio-credits.md에 자동 append
- 누락 시 🟡 WARN, 5건 누적 시 🔴 BLOCK
- 이소화 검토: 라이선스 봉인 정합성 PASS
```

### 🔴 나쁜 예

```
audio: 사운드 추가
```
→ 스코프 부재, 무엇을 추가했는지 불명. 게이트 영향도 누락.

```
fix: bgm
```
→ 한국어 우선 규약 위반, 음원 변경인데 fix 사용.

```
audio(bgm): 보스전 BGM 추가했는데 라이선스 확인 안 했음
```
→ 자기-실토 금지. 라이선스 미확인은 BLOCK 사안 → PR 분리 또는 라이선스 먼저 처리.

---

## 4. 리뷰어 행동 가이드 — 5항

1. **약속 수치 검증**: §3 자동 감사 표가 실제 게이트 출력과 일치하는가? `audio:gate` 재실행 1회.
2. **이소화 봉인 비협상**: 라이선스 BLOCK은 어떤 사정이 있어도 머지 금지. 권리자 동의 서면 첨부 후에만 통과.
3. **계섬월 빌드 정합**: `SoundManager` 인터페이스가 바뀌었다면 호출부 grep으로 변경 누락 확인.
4. **적경홍 QA 신호**: `audio:coverage-bgm` `audio:coverage-sfx` 둘 다 🟢이어야 머지. 🟡는 후속 PR로 트래킹.
5. **심요연 데이터 객관성**: 응답 지연 측정은 cold/warm 양쪽 모두 첨부. 1회 측정값은 신뢰 보류.

---

## 5. 머지 전 최종 체크 (3-AND)

```
✅ audio:gate 4종 🟢 PASS  (coverage-bgm + coverage-sfx + license + normalize)
        AND
✅ docs/release/sound-system-user-guide.md 메아리 동기화
        AND
✅ 5인 인계 체크 모두 ✓
```

세 조건 중 하나라도 결여되면 봇 하네스가 자동 차단합니다 (`ship-gate` hook 예고).

---

> 본 컨벤션은 1차 SSOT입니다. PR 본문 섹션·체크리스트 변경 시 본 문서 갱신 + `.github/PULL_REQUEST_TEMPLATE.md` 동시 갱신.
