# 🪶 몬스터 아트 PR 본문 / 커밋 메시지 컨벤션 v1.0

> 작성: 진채봉 (Editor)
> 작성일: 2026-04-27
> 스프린트: Auto — 몬스터 아트 파이프라인 표준화
> 단계: 에셋 (`.github/PULL_REQUEST_TEMPLATE/monster-art.md` 인계용 SSOT)

---

## 0. PR 제목 9 스코프

```
art(monster/<scope>): <한 줄 요약>
```

| 스코프 | 의미 | 예시 |
|--------|------|------|
| `catalog` | 160종 SSOT 정규화 | `art(monster/catalog): 챕터1 일반 18종 추가` |
| `tokens` | DESIGN.md §10 토큰 | `art(monster/tokens): elite 림라이트 1px → 1.5px` |
| `generate` | AI 생성·프롬프트 | `art(monster/generate): boss 프롬프트 v2 적용` |
| `touchup` | 자동 후처리 | `art(monster/touchup): rembg 알파 임계 조정` |
| `palette` | 챕터/Tier 팔레트 | `art(monster/palette): 챕터3 사막 톤 6색 보강` |
| `gate` | 5종 게이트 로직 | `art(monster/gate): pixel_diff 임계 60% 고정` |
| `license` | 메타·화이트리스트 | `art(monster/license): SDXL LoRA 출처 검증` |
| `assets` | 실제 png/atlas 산출 | `art(monster/assets): 챕터1 일반 12종 final` |
| `docs` | SOP·가이드·카피 | `art(monster/docs): SOP §2.4 손길 절차 보강` |

> 70자 이내. 본문에서 풀어 쓰옵소서.

---

## 1. PR 본문 9 섹션 (템플릿)

```markdown
## 🎨 요약 (1~2줄)
<무엇을·왜·어디까지>

## 📜 자동 감사 결과
| 게이트 | 결과 | 비고 |
|--------|------|------|
| ⓐ schema | 🟢 PASS | — |
| ⓑ tier_visual | 🟢 PASS | — |
| ⓒ palette | 🟢 PASS | — |
| ⓓ license | 🟢 PASS | — |
| ⓔ pixel_diff | 🟡 WARN | 누적 3건 (임계 5건) |

## 🐉 산출물 (Tier × 챕터)
- NORMAL: 챕터1 12종 (`shadow_wisp_01..12`)
- ELITE: 0종
- BOSS: 0종

## 🎨 비주얼 위계 약속
- [ ] 사이즈 토큰 일치 (32/48/96)
- [ ] 외곽선 두께·색 (2px 흑·흑+금·흑+발광)
- [ ] 림라이트 (없음/1px 골드/2px 에테르)
- [ ] idle 진폭 (±1/±2/±3px)
- [ ] 챕터 팔레트 100% 커버

## 🛡️ 라이선스
- 모델: `firefly-image-3` (1순위) / `sdxl + LoRA <id>` (2순위)
- LoRA 출처: <URL 또는 사유>
- 역검색 (≥ 0.85 유사도): 0건
- meta.json 12/12 정상

## 🌐 i18n 변경
- [ ] `client/public/locales/{ko,en,ja}/monster.json` 동시 갱신
- [ ] `monster-art-error-messages.md` SSOT 일치

## 📚 문서 갱신
- [ ] `monster-pipeline-sop.md` (변경 시)
- [ ] `DESIGN.md §10` (토큰 변경 시)
- [ ] `CHANGELOG.md` (사용자 가시 변경 시)
- [ ] `docs/release/launch_checklist.md §몬스터 다양성`

## 🤝 팀 인계 체크
- [ ] 가춘운 (Design) — 토큰·팔레트 검토
- [ ] 두련사 (SRE) — CI 게이트 통과
- [ ] 적경홍 (QA) — 회귀 매트릭스 갱신
- [ ] 이소화 (Security) — 라이선스 봉인 통과
- [ ] 심요연 (Data) — 게이트 통계 반영

## 🎯 머지 게이트
- 종료 코드: `0` (PASS)
- AAA 누적: 3건 / 5건 (WARN 임계)
- CI: ✅ `monster-art-gate.yml` 녹색
```

---

## 2. 커밋 메시지 — 좋은 예 / 나쁜 예

### 2.1 좋은 예 ✨

```
art(monster/assets): 챕터1 일반 12종 final 산출

- 다섯 게이트 모두 통과 (pixel_diff 평균 67%)
- chapter1 팔레트 100% 커버, 16색 양자화 완료
- meta.json 12건 / 모델: firefly-image-3 (단일)

Refs: monster-pipeline-sop.md §2, launch_checklist §몬스터 다양성
Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

```
art(monster/tokens): boss 림라이트 #89CFF0 → 2px 고정

크기로 위협하지 아니하고 광원으로 위협하옵기에,
보스 발광 폭을 1.5px → 2px 로 확정합니다 (DESIGN.md §10).

Breaking: 기존 보스 5종 재터치업 필요 (PR #XXXX 후속)
```

### 2.2 나쁜 예 ✗

```
fix: monster stuff           // 스코프 없음, 무엇을 고쳤는지 모호
update assets                // 게이트 결과 누락
add boss images              // 라이선스·팔레트 약속 없음
```

---

## 3. 리뷰어 행동 가이드 5항

1. **게이트 표가 비었으면 즉시 BLOCK 코멘트** — `npm run monsters:gate` 결과 첨부 요구.
2. **`license` 절이 비었으면 머지 금지** — 이소화 봉인은 협상 대상이 아니옵니다.
3. **DESIGN.md §10 변경이 보이면 본 SOP 동시 갱신 확인** — 한 곡조 두 박자.
4. **i18n 키 변경 시 ko/en/ja 동시 PR 인지 확인** — 한 음만 울리면 화음이 깨지옵니다.
5. **CHANGELOG 항목이 사용자 가시 변경에서 누락되면 코멘트** — 기록은 진채봉의 직무이옵니다.

---

## 4. 변경 약속

본 템플릿이 갱신되면 `.github/PULL_REQUEST_TEMPLATE/monster-art.md` 도 같은 커밋에서 따라와야 하옵니다.
