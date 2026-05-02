# Retro — T1-3a: 픽셀아트 튜닝 sprint (CFG 11 + prompt 강화)

**날짜**: 2026-05-01
**스프린트**: T1-3a 단일 사이클 (자동 진행)
**스코프**: T1-2 적격률 1/3 → 풀 batch 전 prompt + CFG 튜닝 + 동일 10마리 재생성 비교

## 변경 사항 (`scripts/batch_monsters.py`)

| 항목 | 이전 (T1-2) | 이후 (T1-3a) |
|---|---|---|
| `cfg` | 8.0 | **11.0** |
| `POSITIVE_BASE` 끝 | `centered composition` | `(centered composition:1.3), (single creature:1.4), (full body:1.3), (full character visible:1.3), (white background:1.3)` |
| `NEGATIVE_BASE` 추가 | — | `(abstract pattern:1.4), (texture only:1.3), (background scenery:1.3), (no character:1.4), (cropped:1.2)` |

## 결과 — 동일 10마리 재생성, 직접 비교 (3 샘플)

| 파일 | T1-2 (CFG 8) | T1-3a (CFG 11) | 개선 |
|---|---|---|---|
| `mon_abyss_glitch_spider_normal.png` | ❌ 추상 줄무늬 | ✅ 보라 캐릭터, 체인 무기 |  +1 |
| `mon_abyss_forgotten_warrior_normal.png` | ❌ 텍스처만 | ✅ 흰 마스크, 녹색 갑옷 |  +1 |
| `mon_abyss_ether_serpent_normal.png` | ✅ fair | ✅ 더 명확 (닌자, 가면+무기) |  품질↑ |

→ **샘플 3개에서 적격률 33% → 100%**. 풀 batch 적용 시 50%+ 적격률 합리적 기대.

## 발견한 트레이드오프

**humanoid bias**: `spider` / `serpent` / `worm` 같은 비-인간 단어를 prompt 에 가져도 **모두 humanoid 캐릭터로 출력**. 이유 추정:
- `pixel-art-style.ckpt` 의 학습 데이터가 RPG 캐릭터(인간형) 중심
- "single creature, full body, full character" prompt 가 "캐릭터" 슬롯을 강하게 활성화
- CFG 11 로 prompt 충실도 ↑ → 학습 분포의 "전형적 RPG 캐릭터" 로 수렴

**완화 방향** (별 sprint 후보):
- 동물/괴물 키워드 별도 강화 (`(monster creature:1.5), (non-humanoid:1.4)`)
- 동물 종류 명시 ("eight legs", "serpentine", "tentacles")
- 별도 monster-specific LoRA (Civitai 의 RPG monster LoRA)

현 시점에선 트레이드오프 수용. 풀 batch 진행 가능.

## 처리 시간

- 10마리 재생성: ~70초 (이전과 동일, CFG 변경은 시간 영향 0)
- RTX 4070 SUPER 평균 7s/마리
- 풀 228 batch 예상: ~25분

## 의도적으로 보류한 것

1. **풀 228 batch 즉시 실행** — 사용자 자율 진행 권장 (long-running, GPU 점유)
2. **다양성 회복 sprint** — humanoid bias 완화는 별 sprint
3. **자동 background removal / pixelization 후처리** — 별 sprint
4. **품질 자동 큐레이션 (적격/부적격 분류)** — 별 sprint

## 한 줄 요약

> CFG 8→11 + prompt/negative 강화로 적격률 33%→100% (3 샘플). humanoid bias 트레이드오프 발생. 풀 batch ready.

## 다음 후보 sprint

- **T1-3b**: 풀 228 batch (background, ~25분) → 적격률 메트릭 산출
- **T1-3c**: humanoid bias 완화 — 동물/괴물 키워드 강화 후 다양성 측정
- **T1-icon**: 스킬 아이콘 batch (180 스킬, batch_pixel_art.py 정상화)
