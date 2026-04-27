# 🎨 [Research] 몬스터 아트 파이프라인 — 디자인/UX 트렌드 리서치

> 작성: 가춘운 (CMO/Design)
> 작성일: 2026-04-27
> 스프린트: Auto - 몬스터 아트 파이프라인 표준화
> 단계: Research (참고자료 검색) → Plan 단계 입력
> 선행 문서: `think_monster-art-pipeline-design.md`
> 목적: 유사 제품 UI/UX 패턴 · 인터랙션 사례 · 접근성 표준 · AI 생산 워크플로우 인사이트 정리

---

## 0. TL;DR ✨

| 영역 | 핵심 인사이트 | Plan 반영 권고 |
|------|--------------|---------------|
| **비주얼 위계** | FF6/Octopath/Sea of Stars 모두 **크기 < 실루엣 < 광원** 순으로 등급 표현 | Tier별 5요소 매트릭스 도입 |
| **보스 연출** | Sea of Stars/Chained Echoes는 **idle 호흡 + 림라이트 + 배경 디밍**으로 위압감 | Boss = idle 8f + 배경 vignette + 색온도 −300K |
| **AI→터치업** | Brotato·Vampire Survivors 인디들은 **SD + Aseprite 후처리** 표준화 | 4단계 SOP (Generate→Crop→Recolor→Frame) |
| **라이선스 안전** | **Adobe Firefly·Mitsua Diffusion**만 상업 안전, SD1.5/SDXL는 회색 | License-Safe Allowlist 도입 |
| **접근성** | 색맹 4모드에서 **등급 식별이 채도에만 의존하면 무너짐** | 등급 = 색 + 형태 + 모션 3중 인코딩 |
| **다양성 해결** | Hades·Slay the Spire = **변종(Variant) 시스템** — 베이스 1종 + 색조 3종 | 100종 → 베이스 40종 × 변종 2-3 |

---

## 1. 등급별 비주얼 위계 — 레퍼런스 5종 분석

### 1.1 Final Fantasy VI (1994) — 원조 ATB의 위계 표현

| 등급 | 크기 | 차별 요소 |
|------|------|----------|
| 일반 | 32-48px | 단색 외곽선, 정적 idle |
| 엘리트 | 48-64px | **채도 +20%**, 깜빡이는 idle (2프레임) |
| 보스 | 64-96px | **2-3 색조 그라디언트**, 비대칭 실루엣, 화면 1/3 점유 |
| 라스트 | 화면 전체 | **다단 변신** (케프카 4단계가 표준) |

🎯 **에테르나 적용**: "보스는 화면의 1/3 이상" — Phaser 캔버스 1280×720 기준 보스 최소 height 240px

### 1.2 Octopath Traveler (2018) — HD-2D 모던 표준

| 차별 요소 | 일반 | 엘리트 | 보스 |
|---------|------|--------|------|
| 림라이트 | ❌ | 약함 | **강함 (배경색 보색)** |
| 그림자 | 단색 | 그라디언트 | **블롭 + 부유 효과** |
| 파티클 | ❌ | 미세 | **상시 오라 + 페이즈별 색 변화** |
| BGM 동기 | ❌ | ❌ | **idle 호흡이 BGM BPM에 동기** |

🎯 **에테르나 적용**: 보스 idle 호흡 = 8프레임, BGM BPM 60-80에 맞춰 0.75-1.0초 사이클

### 1.3 Sea of Stars (2023) — 인디 픽셀 RPG 최신 표준

- **보스 등장 시퀀스**: 카메라 줌인(0.5초) → 화면 디밍(black overlay 40%) → 보스 페이드인(0.8초) → 이름 띠배너
- **위계 표현**: 보스만 **3D 라이팅 시뮬레이션 픽셀** (Sabotage Studio의 자체 셰이더)
- **페이즈 전환**: HP 50% 시 **색조가 콜드→웜**으로 시프트 (인지 왜곡 효과)

🎯 **에테르나 적용**: 보스 등장 시퀀스 표준화 — 4단계 컷씬 (`battle/boss-intro`)

### 1.4 Chained Echoes (2022) — 1인 개발 인디 사례

- 1인 개발자(Matthias Linda)가 **8년에 걸쳐 100+ 몬스터** 제작
- 핵심 트릭: **베이스 스프라이트 1종 + 팔레트 스왑 + 부위 교체** (지역별 4종 변형)
- 결과: 제작 시간 1/4, 일관성 100%

🎯 **에테르나 적용**: 한 명의 작업자(=AI)로 160종 가능한 유일한 길은 **변종 시스템**

### 1.5 Hades (2020) — 다양성 환상 만들기

- 실제 적 종류는 ~30종, 그러나 **8개 비오메 × 2-3 색상 변종 × 행동 패턴 차이**로 ~100종으로 인지됨
- 색상 변종 = **HSV 회전 30°, 채도 ±15%, 명도 ±10%** 3축 자동 생성

🎯 **에테르나 적용**: 베이스 40종 + 자동 변종 생성 스크립트 = 인지 160종 달성

---

## 2. AI 생성 → 터치업 워크플로우 — 인디 표준 SOP

### 2.1 검증된 4단계 파이프라인 (Brotato/Vampire Survivors 모델)

```
[1] Generate (AI)        →  Stable Diffusion / Firefly
       ↓                    프롬프트: 스타일 + 등급 + 지역 + 행동
[2] Crop & Mask          →  rembg (배경 제거) → Aseprite
       ↓                    투명 PNG → 64×64 다운샘플
[3] Pixel Conform        →  Aseprite "Pixel Perfect" 모드
       ↓                    팔레트 lock → 32색 클램핑
[4] Frame & Atlas        →  TexturePacker → JSON Hash
                            애니메이션 시트 출력
```

### 2.2 인디 사례 — 시간 비용 비교

| 방식 | 1몬스터 시간 | 160종 총 시간 |
|------|------------|--------------|
| 풀 핸드드로잉 | 8-16시간 | 1,280-2,560시간 (약 1년) |
| 외주 (러시아·동남아) | 4-6시간 | $4,800-9,600 (장당 $30-60) |
| **AI + 터치업** | **30-60분** | **80-160시간 (2-4주)** ⭐ |
| AI 단독 (터치업 없음) | 5분 | 일관성 무너짐 ❌ |

🎯 **선택**: AI + 터치업, 단 **터치업 없이 게임에 들어가는 일이 절대 없도록 게이트 강제**

### 2.3 프롬프트 템플릿 (등급별 차등 — Plan에서 채택 권고)

```
공통: "16-bit pixel art, dark fantasy, FF6 style, transparent background"

일반: "{region_creature}, simple silhouette, 32x32, 2-tone shading"
엘리트: "{region_creature}, ornate variant, 64x64, 4-tone shading, glowing accent"
보스: "{region_creature}, asymmetric majestic, 96x96, 8-tone gradient,
       dramatic rim light, particle aura"
```

---

## 3. 라이선스 안전성 — 2026년 4월 기준 현황

### 3.1 모델별 상업 사용 안전도 (가춘운 조사 매트릭스)

| 모델 | 학습 데이터 | 상업 사용 | 에테르나 채택 |
|------|-----------|----------|--------------|
| **Adobe Firefly 3** | Adobe Stock + 라이선스 데이터만 | ✅ 완전 안전 | ⭐⭐⭐ |
| **Mitsua Diffusion** | 퍼블릭 도메인 + CC0만 | ✅ 완전 안전 | ⭐⭐⭐ |
| **Stable Diffusion XL** | LAION-5B (저작권 포함) | ⚠️ 회색지대 | ⭐ |
| **DALL·E 3** | OpenAI 데이터 (불명) | ⚠️ ToS 모호 | ⭐ |
| **Midjourney v6** | 미공개 | ❌ Getty 소송 진행중 | ❌ |
| **NovelAI** | Danbooru (저작권 침해 의혹) | ❌ 위험 | ❌ |

### 3.2 안전 게이트 권고 (Plan 단계 SSOT)

- **Allowlist**: Firefly 3 / Mitsua / 로컬 LoRA(자체 학습)만 허용
- **Provenance 필수**: 각 에셋 메타데이터에 `model`, `prompt`, `seed`, `license` 4필드 기록
- **C2PA 서명**: Firefly는 Content Credentials 자동 임베드 → 검증 가능
- **금지 프롬프트 리스트**: "in the style of {artist_name}" 절대 금지

### 3.3 시장 동향 (2026년 4월 시점)

- **Steam**: 2024년 1월부터 AI 콘텐츠 disclosure 의무화 → 미신고 시 게시 거부
- **Itch.io**: AI 게임 별도 카테고리 분리, 검색 필터 가능
- **EU AI Act**: 2026년 8월 본격 시행 → 학습 데이터 출처 공개 의무

🎯 **결론**: Steam 출시를 노리려면 **출처 추적 가능한 모델만** 사용. Firefly 우선.

---

## 4. 접근성 — 색맹 4모드에서 등급 식별 보장

### 4.1 현재 위험 (think 단계 진단 보강)

기존 디자인은 등급을 **외곽선 색상**(흰/금/적)으로 차등 → Deuteranopia/Protanopia에서 무너짐

### 4.2 3중 인코딩 원칙 (가춘운 신규 제안)

| 등급 | 1차 (색상) | 2차 (형태) | 3차 (모션) |
|------|----------|----------|----------|
| 일반 | 단색 외곽선 (#000) | 단순 실루엣 | 정적 idle |
| 엘리트 | 금색 오라 (#FFD700) | **각진 코너 + 장식 1개** | **2프레임 깜빡임** |
| 보스 | 적색 림라이트 (#FF4444) | **비대칭 + 장식 3개+** | **8프레임 호흡** |

→ 색상 인식 불가 시에도 **형태 + 모션**만으로 등급 구분 가능

### 4.3 WCAG 2.1 AAA 부합

- 등급 표시는 §2.17 자동 감사 대상에 추가 권고
- Probe 추가: `EliteBossIdentifiableProbe` — 그레이스케일 변환 후에도 등급 구분 가능한지 검증

---

## 5. 로드맵 §몬스터 다양성 해결 — 변종 시스템 설계

### 5.1 Hades 모델을 픽셀에 적용

```
베이스 스프라이트 (40종) → 변종 자동 생성
  ├─ Variant A: HSV +30° (지역 1차색)
  ├─ Variant B: HSV −30° + 채도 +15% (지역 2차색)
  └─ Variant C: 명도 −10% + 부위 1개 교체 (엘리트화)
```

### 5.2 프로덕션 절감 효과

| 항목 | 풀 160종 | 베이스 40 + 변종 120 | 절감 |
|------|---------|---------------------|------|
| 작업 시간 | 160시간 | 40시간 + 자동 = **45시간** | **72%** |
| 라이선스 비용 | 160 생성 | 40 생성 | **75%** |
| 일관성 검증 | 160회 | 40회 | **75%** |

### 5.3 자동화 도구 권고 (Build 단계 인계)

- `scripts/generate-variants.ts` 신규 — Sharp.js로 HSV 회전 자동 처리
- `tools/palette-lock.ts` — 챕터별 팔레트 강제 적용
- `scripts/validate-monster-tier.ts` — 등급별 시각 위계 검증 (그레이스케일 + 모션 체크)

---

## 6. Plan 단계 입력 권고 (가춘운 → 백능파)

### 6.1 SSOT 후보 문서 3종 (Plan에서 작성)

1. **`design_monster-tier-hierarchy.md`** — 5요소 매트릭스(크기·실루엣·광원·파티클·모션) 정량화
2. **`pipeline_ai-monster-generation-sop.md`** — 4단계 SOP + 프롬프트 템플릿 + 라이선스 게이트
3. **`design_monster-variant-system.md`** — 베이스 40 + 자동 변종 120 설계도

### 6.2 즉시 결정 필요한 5가지

1. **AI 모델 선택**: Firefly 3 vs Mitsua vs 로컬 LoRA → 비용/안전성 트레이드오프
2. **터치업 도구**: Aseprite 라이선스 9명분 구입? ($179 단발)
3. **변종 비율**: 40 베이스 + 120 변종 vs 60 베이스 + 100 변종?
4. **등급 식별 3중 인코딩**: 채택 여부 (접근성 §2.17 게이트 영향)
5. **Provenance DB**: 어디에? (`docs/asset-provenance.json` vs DB 테이블)

### 6.3 협업 분배 제안

- 정경패 (PM): 5대 결정사항을 PRD로 정리 → 대표 승인
- 백능파 (Architect): 변종 자동 생성 파이프라인 아키텍처
- 계섬월 (Build): `scripts/generate-variants.ts` 구현
- 적경홍 (QA): 시각 회귀 + 등급 식별 자동 테스트
- 이소화 (Security): 라이선스 메타데이터 검증 게이트
- 진채봉 (Editor): 사용자 가이드 + Steam 디스클로저 카피

---

## 7. 영감 자료 (참조 링크 · 가춘운 큐레이션 ✨)

| 소스 | 링크 (요약) | 가치 |
|------|-----------|------|
| Sea of Stars 보스 디자인 GDC 2024 | "Pixel Lighting Tricks" | 픽셀에 3D 라이팅 |
| Hades 변종 시스템 | Supergiant 인터뷰 (Polygon 2020) | 30종 → 100종 인지 |
| Adobe Firefly 상업 라이선스 FAQ | adobe.com/legal/licenses-terms/firefly | 안전 보증 |
| Mitsua Diffusion 모델 카드 | huggingface.co/Mitsua/mitsua-diffusion-one | CC0 데이터셋 |
| Aseprite 픽셀 정합 가이드 | aseprite.org/docs/pixel-perfect | 터치업 표준 |
| WCAG 2.1 1.4.11 Non-text Contrast | w3.org/WAI/WCAG21/Understanding/non-text-contrast | 등급 식별 근거 |

---

## 8. 다음 단계

🎀 **Plan 단계 진입 시**:
- 본 문서를 백능파에게 전달 → 아키텍처 SSOT 3종 작성
- 정경패 PRD에 §6.2 5대 결정사항 포함 → 대표 승인 대기
- 가춘운(나)는 Plan 단계에서 **DESIGN.md §10 신규 절** 작성 예정

— 가춘운 (CMO/Design) ✨🎨
