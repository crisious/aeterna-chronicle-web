# Retro — T1-2: 픽셀아트 batch pilot (10 monsters)

**날짜**: 2026-05-01
**스프린트**: T1-2 단일 사이클
**스코프**: `batch_monsters.py normal 10` 시범 실행 + 품질 검토 + 풀 batch 전 튜닝 결정

## 산출물

| 영역 | 결과 |
|---|---|
| ComfyUI 모델 | `pixel-art-style.ckpt` 단독 (LoRA 없음) |
| 워크플로 | CheckpointLoader → CLIP×2 → KSampler (CFG 8, 30 steps, euler_ancestral) → VAEDecode → SaveImage |
| 처리 시간 | 10마리 약 70초 (1마리 평균 7초, RTX 4070 SUPER) |
| 성공률 | **10/10 (100%)** generation 성공 — exit code OK |
| 출력 | `client/public/generated_pixel_art/monsters/normal/` (~2.5MB total, LFS) |

## 품질 평가 (3 샘플 검토)

| 파일 | 평가 | 게임 자산 적격 |
|---|---|---|
| `mon_abyss_ether_serpent_normal.png` | 보라 캐릭터 1마리, centered, 형체 명확 | ✅ Fair |
| `mon_abyss_glitch_spider_normal.png` | 추상 패턴 (노랑/보라 줄무늬) — 거미 형태 부재 | ❌ |
| `mon_abyss_forgotten_warrior_normal.png` | 텍스처/배경 패턴만 — warrior 캐릭터 부재 | ❌ |

**적격률 추정**: 약 1/3 (3개 중 1). 실용 자산화 위해선 2x 이상 generation + 큐레이션 또는 prompt 튜닝 필요.

## 원인 분석

1. **추상 modifier 의 함정**: "glitch_spider", "forgotten_warrior" 의 단어 자체가 추상 표현 → AI 가 형체 대신 패턴/텍스처로 해석
2. **짧은 prompt**: `name_to_prompt()` 산출 prompt 가 ~30 단어로 적음. CFG 8 만으론 형체 강제 부족
3. **abyss zone style**: "void energy, dark purple, cosmic, dimensional rift" → 분위기 지향, 캐릭터 강제 약함
4. **LoRA 부재**: 원래 의도된 `pixel_art_style_v1.0` + `PixelArtRedmond-sd15` 가 형체/스프라이트 강제했을 것

## 풀 batch (228마리) 전 튜닝 옵션

| 옵션 | 변경 | 예상 효과 |
|---|---|---|
| **A** | CFG 8 → 11 | prompt 충실도 ↑, creativity ↓ |
| **B** | prompt 강화: "centered single creature, full body, full character visible, white background" 강제 | 형체 강제 |
| **C** | steps 30 → 40 | 디테일 ↑, 시간 +33% |
| **D** | 1마리당 2~3장 batch_size + 후처리 큐레이션 | 적격률 2x, 시간 2~3x |
| **E** | 다른 픽셀아트 LoRA 추가 (HF token / Civitai) | 큰 폭 향상 가능 |

**조합 추천**: A + B (즉시 가능, 추가 다운로드 없음). 풀 228 batch 시 ~30분, 적격률 50%+ 기대.

## 의도적으로 보류한 것

1. **풀 batch 즉시 실행** — 1/3 적격률에서 풀 돌리면 76마리만 사용 가능 → 비효율. 튜닝 후 진행 권장
2. **LoRA 보강 sprint** — 사용자가 "B" 로 공개 모델만 선택했음. gated/Civitai 는 별 sprint
3. **자동 background removal / crop 후처리** — 산출물 후처리 파이프라인 별 sprint

## 한 줄 요약

> 파이프라인 100% 동작, 품질 1/3 적격. 풀 batch 전 prompt + CFG 튜닝 sprint (T1-3a) 가 ROI 높음.

## 다음 후보 sprint

- **T1-3a**: prompt + CFG 튜닝 (A+B) → 동일 10마리 재생성 → 적격률 비교
- **T1-3b**: T1-3a 검증 후 풀 228 batch
- **T1-icon**: 스킬 아이콘 generation (180 스킬, batch_pixel_art.py 정상화)
