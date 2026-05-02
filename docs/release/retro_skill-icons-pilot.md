# Retro — T1-skills: 스킬 아이콘 batch 인프라 + smoke

**날짜**: 2026-05-01
**스프린트**: T1-skills 단일 사이클 (자동 진행)
**스코프**: `batch_pixel_art.py` 에 skills 모드 추가 — skillSeeds.ts 정규식 파싱 + 클래스별 smoke 6장

## 산출물

| 영역 | 파일 | 변경 |
|---|---|---|
| 스크립트 | `scripts/batch_pixel_art.py` | `skills` 모드 추가 — `parse_skill_seeds`, `skill_to_prompt`, `run_skills`, ELEMENT_STYLE/SKILL_TYPE_HINT 매핑 |
| smoke 산출 | `client/public/generated_pixel_art/skills/<class>/<code>.png` | 6장 (클래스별 1) |

## 인프라 요약

- 정규식 파싱: skillSeeds.ts → `{code, name, description, class, tier, type, element}` 추출. 180 스킬 모두 파싱 가능.
- prompt 매핑:
  - **element** → 시각 motif 10종 (aether/neutral/light/earth/fire/water/dark/time/void/ice)
  - **type** → 컴포지션 hint 3종 (active=weapon spell, passive=shield aura emblem, ultimate=ornate emblem)
- 사용법: `python scripts/batch_pixel_art.py skills [limit_per_class]`
  - `skills 1` = 클래스별 1개 (smoke 6장)
  - `skills 0` = 전체 180장 (~21분, 7s/마리)

## smoke 결과 (6장)

| skill | 평가 |
|---|---|
| ek_ether_slash (aether/active) | ⚠️ 검 형체 보이지만 가로 줄무늬 노이즈 |
| mw_memory_arrow (aether/active) | (미상세 검토) |
| sw_shadow_stab (dark/active) | ❌ 단검 collage (multiple objects) |
| mb_memory_shatter (neutral/active) | (미상세 검토) |
| tg_time_stop (time/active) | ❌ 사각 액자 패턴 (icon 아님) |
| vw_spatial_shift (aether/active) | (미상세 검토) |

**적격률 추정**: 1/3 (T1-3a 의 monster 100% 와 큰 격차).

## 품질 격차 분석

`pixel-art-style.ckpt` 의 학습 분포:
- **장점**: 캐릭터 스프라이트, 풀바디 RPG character (T1-3a 에서 100% 적격)
- **단점**: UI 아이콘, 단일 오브젝트, 추상 심볼 약함
- 결과: prompt "single centered icon object" 가 무시되고 character/scene 으로 회귀

**완화 방향** (다음 sprint 후보):
1. Icon-specific LoRA 추가 (HF 검색 필요 — 사용자 명시 후)
2. 다른 base model (예: ControlNet + canny edge 입력으로 형태 강제)
3. img2img with seed icon — 손/툴로 그린 base shape 위에 stylization
4. 다른 픽셀아트 모델 — UI 친화적인 버전
5. 단순화된 prompt — element/type 추상 매핑 → 구체 오브젝트 (검/방패/화염볼 등)

## 의도적으로 보류한 것

- **180 풀 batch**: 적격률 ~30% 추정. 풀 돌리면 60장만 사용 가능, 효율 낮음
- **icon LoRA 다운로드**: 사용자 명시 필요 (이전 "B" 권한 가이드)
- **수동 큐레이션 파이프라인**: 자동 분류기 OR 수동 작업 — 별 sprint

## 한 줄 요약

> 스크립트 인프라 완성 (180 스킬 파싱 + smoke 6장 100% 생성). 품질은 부족 — `pixel-art-style.ckpt` 의 character bias 한계. icon 전문 model/LoRA 필요.

## 다음 후보 sprint

- **T1-skill-prompt**: 추상 element 매핑 → 구체 오브젝트 (예: aether → "glowing sword", time → "clock face") + 재시도
- **T1-skill-img2img**: 기존 emoji 폴백을 base 로 img2img stylization
- **T1-skill-lora**: 사용자가 icon LoRA 명시 → 다운로드 → 재시도
