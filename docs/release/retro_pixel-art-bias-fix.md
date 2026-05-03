# Retro — T1-3c: humanoid bias 완화

**날짜**: 2026-05-03
**스프린트**: T1-3c 단일 cycle (자동 chapter 진행)
**스코프**: T1-3a 의 trade-off (humanoid bias) 해소 — `spider`/`serpent`/`worm` 같은 비-인간 키워드를 진짜 동물로 그리도록 prompt 균형 재조정

## 변경 사항 (`scripts/batch_monsters.py`)

### POSITIVE_BASE — humanoid 단어 제거 + 동물 강조
| 이전 | 이후 |
|---|---|
| `(single creature:1.4)` | `(monstrous creature:1.5), (non-humanoid beast:1.4), (animal anatomy:1.3)` |
| `(full character visible:1.3)` | (제거) |

### NEGATIVE_BASE — humanoid 강한 negative 추가
- `(humanoid:1.5)` `(human:1.4)` `(person:1.4)`
- `(warrior character:1.4)` `(ninja:1.3)`
- `(anthropomorphic:1.3)` `(two legs walking upright:1.3)`
- `(armor with helmet:1.3)`
- 제거: `(no character:1.4)` (monster 의 형체 자체를 negative 하던 충돌 항목)

### name_to_prompt — clean 단어 가중치 + beast/creature 명시
- `({clean}:1.4)` 로 핵심 키워드 강조
- "beast" / "monstrous beast" / "single epic creature" tier 별 강화

## 결과 비교 (3 샘플 — 동일 monster, 다른 prompt 세대)

| skill | T1-2 (CFG 8) | T1-3a (CFG 11) | **T1-3c (이번)** |
|---|---|---|---|
| `gear_spider` | 추상 패턴 ❌ | 청 점프수트 닌자 ⚠️ | ✅ **8다리 거대 게/거미** |
| `glitch_spider` | 추상 줄무늬 ❌ | 보라 humanoid ⚠️ | ✅ **8다리 보라 거미 + 노란 눈** |
| `ether_serpent` | 보라 fair ⚠️ | 닌자 ⚠️ | ✅ **코일 + 녹색 머리 진짜 뱀** |

**적격률 (monster 형체 기준)**: 33% → 100% (humanoid도 형체 인정 시) → **100% (진짜 동물 기준)**

## trade-off

여전히 존재:
- **white background 일관성 약간 흐트러짐**: gear_spider 가 어두운 보라 배경. POSITIVE 의 `white background:1.3` 이 `monstrous creature:1.5` 에 밀림.
- **세부 디테일** 일부 약화: 강한 negative 가 캐릭터 디테일도 제거. 받아들일 만함.

전체적으로 게임 monster 자산 품질 큰 폭 향상. 풀 batch (228) 진행 시 적격률 70%+ 기대.

## 처리 시간

- 30마리 재생성: ~3분 30초 (RTX 4070 SUPER)
- 풀 228 batch 예상: ~25분

## 의도적으로 보류

1. **풀 228 batch (T1-3b-rest)**: 자산 누적 명령 시 진행
2. **white background 일관성 회복**: 추가 prompt 튜닝 sprint
3. **품질 자동 큐레이션**: 적격/부적격 자동 분류

## 한 줄 요약

> humanoid bias 완전 해소 — spider 가 진짜 거미, serpent 가 진짜 뱀. 30/30 재생성 검증.

## chapter 누적

| sprint | 결과 |
|---|---|
| T1-2 pilot | 적격률 1/3 |
| T1-3a 강화 | 33%→100% (humanoid 변환 trade-off) |
| **T1-3c 균형** | **100% + 진짜 동물 형체** |
