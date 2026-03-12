# 에테르나 크로니클 — 캐릭터 일러스트 기획

> 작성일: 2026-03-12 | 버전: v1.0  
> 티켓: P13-02  
> 참조: style-guide.md, asset-pipeline/character-sprites.md, asset-pipeline/prompt-templates.md

---

## 1) 캐릭터 디자인 총괄

### 1.1 규격

| 항목 | 규격 |
|------|------|
| 대상 | 5클래스 × 4전직 = 20개 캐릭터 |
| 뷰 | 정면(F) / 측면(S) / 후면(B) — 3뷰 |
| 표정 시트 | 기본/분노/슬픔/기쁨/놀람/전투 — 6종 |
| 컬러 바리에이션 | 기본 + 2차 색상 (총 2벌) |
| 해상도 | 디자인 시트: 512×512 px / 스프라이트: 64×64 px |
| 비율 | 등신: 2.5~3등신 (SD 픽셀아트 기준) |

### 1.2 클래스별 실루엣 규칙

모든 클래스는 실루엣만으로 구분 가능해야 한다:

| 클래스 | 실루엣 키포인트 | 너비/높이 비율 |
|--------|--------------|---------------|
| 에테르 기사 | 넓은 어깨, 두꺼운 갑옷, 방패 | 넓고 단단한 사각형 |
| 기억술사 | 긴 로브, 후드, 부유하는 책/오브 | 길고 가느다란 삼각형 |
| 그림자 직조사 | 후드 망토, 활/단검, 벨트 파우치 | 날렵한 역삼각형 |
| 기억 파괴자 | 거대 무기(해머/도끼), 무거운 장갑 | 매우 넓은 사각형 |
| 시간 수호자 | 시계 모티프, 부유 기어, 로브+갑옷 혼합 | 중간, 기어 돌출 |

---

## 2) 클래스별 디자인 시트

### 2.1 에테르 기사 (Ether Knight)

#### 기본직 — 에테르 기사

| 요소 | 설명 |
|------|------|
| 갑옷 | 중갑 판금. 어깨 보호대에 에테르 룬 각인. 가슴판 중앙에 기억 문장 |
| 무기 | 한손검(에테르 푸른 빛) + 카이트 실드 |
| 색상 | 스틸 블루 `#4682B4`, 실버 `#C0C0C0`, 미드나잇 블루 `#191970`, 시안 발광 `#89CFF0` |
| 헬멧 | 바이저 개폐형. 기본 열린 상태. 이마에 룬 발광 |
| 망토 | 짧은 하프 케이프. 파란 안감 |

#### 1차 전직 — 룬 나이트

| 요소 | 변화 |
|------|------|
| 갑옷 | +룬 문양 밀도 2배. 갑옷 전체에 발광 라인 |
| 무기 | 룬 검 (검신에 문자 각인, 파란 발광 강화) |
| 색상 | 기본 + `#4169E1` 로얄 블루 추가 |
| 추가 | 어깨에 부유하는 소형 룬 방패 2개 |

#### 2차 전직 — 에테르 가디언

| 요소 | 변화 |
|------|------|
| 갑옷 | 풀 플레이트 + 에테르 결정 장식. 등에 에테르 날개 흔적 (반투명) |
| 무기 | 대형 타워 실드 + 한손검. 실드에서 에테르 배리어 발산 |
| 색상 | 기본 + `#E0FFFF` 밝은 시안 + 금색 테두리 |
| 추가 | 발밑 에테르 문양 서클 |

#### 3차 전직 — 기억의 성기사

| 요소 | 변화 |
|------|------|
| 갑옷 | 성갑(Sacred Plate). 금색 문양 + 순백 에테르 날개 (2쌍, 반투명) |
| 무기 | 성검 (금+백색 발광) + 성방패 (기억의 문장 각인) |
| 색상 | 금 `#FFD700`, 순백 `#FFFFFF`, 시안 발광 유지 |
| 추가 | 머리 위 에테르 후광. 전신 미세 발광 |

---

### 2.2 기억술사 (Mnemonist)

#### 기본직 — 기억술사

| 요소 | 설명 |
|------|------|
| 의상 | 긴 다크 로브. 기억 수정 장식. 후드 + 룬 트림 |
| 무기 | 오브 장착 지팡이 + 부유하는 아케인 토메 |
| 색상 | 딥 퍼플 `#4B0082`, 금 악센트 `#FFD700`, 틸 `#008080`, 크림슨 `#DC143C` |
| 액세서리 | 허리 벨트에 기억 수정 3개 매달림 |

#### 1차 전직 — 기억 편직사

| 요소 | 변화 |
|------|------|
| 의상 | 로브 문양 복잡화. 어깨에 기억 실 (반투명 라인) |
| 무기 | 이중 오브 지팡이 (상단/하단). 토메 2권 부유 |
| 추가 | 손끝에서 기억 실 발산. 눈 발광 |

#### 2차 전직 — 대기억술사

| 요소 | 변화 |
|------|------|
| 의상 | 로브 → 코트형. 가슴에 대형 기억 수정 내장 |
| 무기 | 부유하는 기억 구체 3개 (지팡이 대체). 자동 서술 토메 |
| 추가 | 주변에 기억 파편 부유 (별처럼 반짝임) |

#### 3차 전직 — 에테르 현자

| 요소 | 변화 |
|------|------|
| 의상 | 순백+보라 하이브리드 로브. 어깨에 에테르 결정 문양 |
| 무기 | 거대 에테르 오브 (직경 1/3 캐릭터) + 토메 5권 공전 |
| 색상 | 기본 + 순백 `#FFFFFF` + 에테르 블루 `#89CFF0` |
| 추가 | 머리 위 기억의 왕관 (부유 수정 고리) |

---

### 2.3 그림자 직조사 (Shadow Weaver)

#### 기본직 — 그림자 직조사

| 요소 | 설명 |
|------|------|
| 의상 | 경장 레더 아머. 그림자 직조 망토(반투명 가장자리). 후드 |
| 무기 | 복합 단궁 + 그림자 화살 퀴버 |
| 색상 | 다크 차콜 `#2F2F2F`, 크림슨 `#8B0000`, 그림자 보라 `#301934`, 독 녹색 `#006400` |
| 액세서리 | 벨트 파우치 다수. 허벅지 단검 |

#### 1차 전직 — 나이트 블레이드

| 요소 | 변화 |
|------|------|
| 의상 | 더 가벼운 레더 + 그림자 강화. 망토 반투명 범위 증가 |
| 무기 | 쌍단검 (그림자 잔영) + 보조 투척 나이프 |
| 추가 | 이동 시 그림자 잔상 1~2개 |

#### 2차 전직 — 심연 사수

| 요소 | 변화 |
|------|------|
| 의상 | 반갑옷형 레더 (어깨/가슴판 추가). 그림자 코트 |
| 무기 | 대형 복합궁 (그림자 에너지 현). 화살에 심연 오라 |
| 추가 | 눈에서 붉은 발광. 그림자 날개 흔적 |

#### 3차 전직 — 그림자 군주

| 요소 | 변화 |
|------|------|
| 의상 | 그림자 결정 갑옷 (반투명, 실체화 반복). 왕관형 후드 |
| 무기 | 그림자 무기 자유 생성 (검/궁/사슬 전환) |
| 색상 | 기본 + 순흑 `#0A0A0A` + 적안 `#FF0000` |
| 추가 | 발밑 그림자 늘 확장. 그림자 촉수 2~4개 부유 |

---

### 2.4 기억 파괴자 (Memory Breaker)

#### 기본직 — 기억 파괴자

| 요소 | 설명 |
|------|------|
| 의상 | 중갑+가죽 혼합. 넓은 어깨 보호대. 팔에 기억 쇄도 문양 |
| 무기 | 거대 워해머 (기억 파편 박힘) |
| 색상 | 건메탈 `#2C3539`, 블러드 레드 `#660000`, 골드 `#B8860B`, 에테르 크랙 `#89CFF0` |
| 체형 | 다른 클래스보다 1.2배 넓은 실루엣 |

#### 1차 전직 — 기억 분쇄자

| 요소 | 변화 |
|------|------|
| 무기 | 워해머 → 대형 양손도끼 (도끼날에 기억 균열) |
| 추가 | 전신에 기억 균열 문양 (파란 빛 새어나옴) |

#### 2차 전직 — 심연의 전사

| 요소 | 변화 |
|------|------|
| 의상 | 뼈+금속 혼합 갑옷. 심연 에너지 코팅 |
| 무기 | 이중 무기 (도끼+망치 or 쌍도끼). 심연 오라 |
| 추가 | 한쪽 팔이 심연 에너지로 변이 (반투명 암흑) |

#### 3차 전직 — 에테르 파멸자

| 요소 | 변화 |
|------|------|
| 의상 | 에테르 결정 풀 플레이트. 등에 파괴된 기억의 날개 |
| 무기 | 에테르 대검 (검신이 기억 파편으로 구성, 불안정하게 흔들림) |
| 색상 | 기본 + 에테르 블루 + 크랙 적색 `#FF0000` |
| 추가 | 주변 공기 왜곡. 발밑 기억 파편 산란 |

---

### 2.5 시간 수호자 (Time Guardian)

#### 기본직 — 시간 수호자

| 요소 | 설명 |
|------|------|
| 의상 | 로브+경갑 하이브리드. 시계 기어 장식. 어깨에 미니 시계탑 |
| 무기 | 시계 지팡이 (상단에 회전하는 시계 문자판) + 부유 기어 |
| 색상 | 시간 금색 `#DAA520`, 청동 `#CD7F32`, 시공 은색 `#C0C0C0`, 시간 발광 `#00FFFF` |
| 특이점 | 주변에 부유하는 미니 기어 3~5개 |

#### 1차 전직 — 크로노 메이지

| 요소 | 변화 |
|------|------|
| 의상 | 기어 장식 밀도 증가. 가슴에 시간 수정 |
| 무기 | 이중 시계 팔찌 (양손) + 시간 고리 투사체 |
| 추가 | 부유 기어 → 회전 시간 고리 (후광형) |

#### 2차 전직 — 시간의 감시자

| 요소 | 변화 |
|------|------|
| 의상 | 반갑옷형 + 거대 기어 백팩. 고글 장착 |
| 무기 | 시간 조종 건틀릿 (양손). 시간 정지 필드 투사 |
| 추가 | 캐릭터 주변 시간 왜곡 이펙트 (반투명 동심원) |

#### 3차 전직 — 영원의 관리자

| 요소 | 변화 |
|------|------|
| 의상 | 시공 로브 (별이 빛나는 내부 텍스처). 금관에 시간 수정 |
| 무기 | 시간의 대시계 (거대 부유 시계 + 시공 포탈 소환) |
| 색상 | 기본 + 우주 보라 `#1A0033` + 별빛 `#FFFACD` |
| 추가 | 배경에 시간 흐름 시각화 (시계 눈금 반투명 원) |

---

## 3) AI 생성 프롬프트 템플릿

### 3.1 디자인 시트 (정면 스탠딩) 프롬프트

```
Template: CHAR_DESIGN_SHEET_FRONT

2D pixel art RPG character design sheet, front view, full body,
{class_name}, {advancement_name}, {advancement_tier} tier,
{armor_description},
{weapon_description},
{color_palette} color scheme,
dark fantasy medieval setting, ethereal memory theme,
top-left 45-degree lighting, 3-step shading,
2px black outline, no anti-aliasing, clean pixel edges,
512x512 resolution, white background with grid,
character turnaround reference sheet style,
game asset concept art

Variables:
  class_name: 클래스 한/영 이름
  advancement_name: 전직 이름
  advancement_tier: "base" | "1st" | "2nd" | "3rd"
  armor_description: 위 디자인 시트 참조
  weapon_description: 위 디자인 시트 참조
  color_palette: 위 색상 팔레트 참조
```

### 3.2 표정 시트 프롬프트

```
Template: CHAR_EXPRESSION_SHEET

2D pixel art character expression sheet, 6 expressions,
{class_name} face close-up, portrait style,
expressions: neutral | angry | sad | happy | surprised | battle-ready,
{hair_description}, {face_features},
{color_palette} color scheme,
dark fantasy style, 2px black outline,
128x128 per expression, 3x2 grid layout,
white background, labeled expressions,
game UI portrait reference

Variables:
  hair_description: 클래스별 머리 스타일
  face_features: 눈 색상, 피부톤, 특이점 (흉터/문양 등)
```

### 3.3 측면/후면 뷰 프롬프트

```
Template: CHAR_SIDE_VIEW

2D pixel art RPG character, {view_direction} view, full body,
{class_name}, {advancement_name},
same design as front view reference,
{armor_side_description},
{weapon_holstered_description},
{color_palette} color scheme,
top-left 45-degree lighting, 3-step shading,
2px black outline, clean pixel edges,
512x512 resolution, white background

Variables:
  view_direction: "side (left-facing)" | "back"
  armor_side_description: 측면/후면에서 보이는 추가 디테일
  weapon_holstered_description: 무기 수납/등 장착 상태
```

### 3.4 컬러 바리에이션 프롬프트

```
Template: CHAR_COLOR_VARIANT

2D pixel art RPG character, front view, full body,
{class_name}, {advancement_name},
ALTERNATE COLOR SCHEME: {alt_color_palette},
same armor/weapon design, different coloring,
{alt_theme_description},
2px black outline, clean pixel edges,
512x512 resolution, white background,
color variant reference, side-by-side with original

Variables:
  alt_color_palette: 대체 색상 세트
  alt_theme_description: "시즌 한정" / "레어 스킨" / "PvP 전용" 등
```

### 3.5 네거티브 프롬프트 (캐릭터 전용)

```
Negative: 3D render, realistic photo, blurry, watermark, text,
low quality, deformed, extra limbs, disfigured, bad anatomy,
chibi, super-deformed (unless specified),
Western cartoon style, anime sparkle eyes,
noisy, grain, JPEG artifacts, cropped, partial body,
asymmetric armor (unless designed), wrong number of fingers
```

---

## 4) 제작 우선순위

| 순위 | 대상 | 이유 |
|------|------|------|
| 1 | 기본직 5종 정면 | 게임 시작 시 즉시 필요 |
| 2 | 기본직 5종 측면/후면 | 3뷰 완성 |
| 3 | 1차 전직 5종 | 레벨 20 전직 시 필요 |
| 4 | 기본직 표정 시트 | NPC 대화 UI |
| 5 | 2차/3차 전직 | 중후반 콘텐츠 |
| 6 | 컬러 바리에이션 | 코스메틱/시즌 |
