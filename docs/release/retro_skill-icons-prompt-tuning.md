# Retro — T1-skill-prompt: 추상 → 구체 오브젝트 매핑 시도

**날짜**: 2026-05-01
**스프린트**: T1-skill-prompt 단일 사이클 (자동 진행)
**스코프**: 이전 T1-skills 적격률 1/3 → 추상 element 매핑을 구체 오브젝트로 재정의 + 동일 6 smoke 비교

## 변경 사항 (`scripts/batch_pixel_art.py`)

### ELEMENT_STYLE 재정의 (10종)

| element | 이전 (추상) | 이후 (구체) |
|---|---|---|
| aether | "glowing magical aether energy, white-blue luminescence" | "glowing white-blue magical orb with light rays" |
| time | "ornate clock gear, golden hands, temporal swirl" | "ornate brass clock face with golden hour hand" |
| dark | "deep purple void, shadow tendrils" | "purple shadow vortex with curling tendrils" |
| fire | "orange red flame, ember sparks" | "red orange flame swirl with ember sparks rising" |
| water | "deep blue water, flowing liquid" | "single blue water droplet with ripple" |

### prompt 강화

- `(single icon:1.5), (one object:1.4), (centered:1.3), (white background:1.4), (flat icon:1.3)` 강제
- type hint 단순화: active/passive/ultimate → "with motion lines"/"with aura ring"/"with runic glow"

### negative 강화

- `(character:1.5), (creature:1.5), (monster:1.5), (multiple objects:1.5), (collage:1.5), (sprite sheet:1.4)` 등

## 결과 비교 (3 샘플)

| skill | T1-skills (1차) | T1-skill-prompt (2차) | 변화 |
|---|---|---|---|
| ek_ether_slash | ⚠️ 검 형체 + 가로 노이즈 | ✅ 백광 구체 (frame 안) | 개선 |
| tg_time_stop | ❌ 사각 액자 패턴 | ❌ 빈 회색 액자 | 동일 |
| sw_shadow_stab | ❌ 단검 collage | ❌ 빈 가로 보라 줄 (단순화) | 부분 개선 |

**적격률**: 1/3 → 1/3 (결정적 향상 없음).

## 발견한 패턴

`pixel-art-style.ckpt` 의 한계가 명확해짐:

1. **Character bias**: 모델이 RPG 캐릭터 학습 중심. 단일 오브젝트 prompt 줘도 character/sprite 로 회귀
2. **Frame artifact**: "RPG icon" / "UI symbol" prompt 가 강해지면 frame/border 자체를 그리고 안에 내용 없음
3. **CFG↑ → frame 발산**: 강한 negative + 강한 positive 가 frame 만 정확히 그리는 결과
4. **추상 키워드 한계**: "glowing orb", "clock face" 등 구체화해도 character 학습 분포의 인근 표현 (frame, sprite block) 으로 끌려감

## 결론: 본 모델로는 skill icon 생성 어려움

**다음 방향 (사용자 명시 후)**:
| 옵션 | 내용 | 효율 |
|---|---|---|
| A | UI/icon 전문 base model 다운로드 (예: `nerijs/icon-art-stable-diffusion`) | ⭐⭐⭐ |
| B | 외부 LoRA: icon-specific (HF 검색 / 사용자 명시) | ⭐⭐ |
| C | img2img: 기존 emoji 폴백을 base 로 stylization | ⭐⭐ |
| D | ControlNet + canny edge: 손/툴 그림 형태 강제 | ⭐⭐ |
| E | 스킬 아이콘 포기 — 이모지 폴백 유지, monster batch 만 진행 | ⭐ |

본 sprint 에서는 보류. 사용자 명시 후 진행.

## 의도적으로 보류한 것

- **180 풀 batch**: 적격률 ~30% 추정, 비효율 동일
- **다른 model 다운로드**: B 권한 패턴 — 사용자 명시 필요
- **img2img 인프라**: ComfyUI 워크플로 변경 (별 sprint)

## 한 줄 요약

> 추상 → 구체 매핑 시도, ek_ether_slash 만 개선. `pixel-art-style.ckpt` 가 character bias 로 skill icon 부적합 — UI/icon 전문 model 또는 ControlNet 필요.
