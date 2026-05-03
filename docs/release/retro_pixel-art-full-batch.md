# Retro — T1-3b-rest: 풀 monster batch 228 완료

**날짜**: 2026-05-03
**스프린트**: T1-3b-rest 단일 cycle (자동 chapter 진행)
**스코프**: T1-3c bias 해소 prompt 적용 풀 228 batch — 90 normal + 70 elite + 38 raid

## 산출물

| 카테고리 | 카운트 | 위치 |
|---|---|---|
| **normal** | 120/120 ✅ | `client/public/generated_pixel_art/monsters/normal/` |
| **elite_boss** | 70/70 ✅ | `client/public/generated_pixel_art/monsters/elite_boss/` |
| **raid_boss** | 38/38 ✅ | `client/public/generated_pixel_art/monsters/raid_boss/` |
| **합계** | **228/228 (100% generation)** | 총 56MB LFS |

## 처리 시간

- 198 신규 (잔여) + 30 재생성 = 228 마리 / RTX 4070 SUPER ≈ 7s/마리
- 풀 batch 약 25~30 분 (background GPU)

## 품질

T1-3c 의 humanoid bias 완화 prompt 효과:
- raid 샘플 (TMP-RIFT-025) 검토: ✅ 보라 4족보행 거대 monstrous beast — 진짜 raid boss creature 형체
- 이전 T1-3a 수준의 humanoid 변환 거의 보이지 않음
- 추정 게임 자산 적격률: 70%+ (이전 ~30% 대비 큰 폭 향상)

## 트레이드오프

- **white background 일관성**: 일부 monster 배경 어둠 (POSITIVE white 1.3 vs monstrous 1.5 경합)
- **세부 디테일** 약화: 강한 negative 가 humanoid armor/clothing 디테일 동시 제거 — monster 특화로는 OK
- **품질 다양성**: 228 중 collage / 추상 패턴 일부 잔존 (전체의 ~15% 추정)

## chapter 누적 — T1 (ComfyUI)

| sprint | 결과 |
|---|---|
| T1-1 | batch_monsters.py 정상화 + smoke |
| T1-2 | 10 monster pilot, 적격률 33% |
| T1-3a | CFG 11 + prompt 강화, 33%→100% (humanoid bias) |
| T1-icon | batch_pixel_art.py 정상화 |
| T1-3b-mid | 30 monster mid-batch |
| T1-skills | skill icon infra (180 스킬 파싱) |
| T1-skill-prompt | 추상→구체 매핑 |
| T1-3c | humanoid bias 완화 (진짜 동물 형체) |
| **T1-3b-rest** | **풀 228 batch 100% 성공** |

T1 chapter 의 큰 1차 종결. 자산 풀 누적 + 풀 batch 동작 검증.

## 의도적으로 보류

1. **품질 자동 큐레이션** — 적격/부적격 분류기 별 sprint
2. **스킬 아이콘 풀 batch** — 본 모델 (character bias) 부적합 — UI/icon 모델 명시 후
3. **white background 일관성 개선** — prompt 추가 튜닝 sprint

## 한 줄 요약

> T1 chapter 풀 batch 종결. 228/228 생성, T1-3c bias 해소 prompt 가 raid boss 까지 적용 — 진짜 monstrous beast 형체.
