# 에테르나 크로니클 — 배경 아트 기획

> 작성일: 2026-03-12 | 버전: v1.0  
> 티켓: P13-09  
> 참조: style-guide.md, asset-pipeline/tilemap-spec.md

---

## 1) Parallax 배경 시스템

### 1.1 4레이어 구조

| 레이어 | 크기 | 스크롤 속도 | 역할 |
|--------|------|-----------|------|
| **하늘 (Sky)** | 1920×360 px | 0.05x (거의 정지) | 하늘/대기/천체 |
| **원경 (Far)** | 1920×540 px | 0.15x | 산맥/첨탑/실루엣 |
| **중경 (Mid)** | 1920×720 px | 0.35x | 건물/나무/주요 지형 |
| **근경 (Near)** | 1920×720 px | 0.7x | 안개/파티클/전경 요소 |

### 1.2 기술 규격

| 항목 | 규격 |
|------|------|
| 해상도 | 1920px 폭 기준, 수평 심리스 타일링 |
| 색상 | RGBA 32bit PNG |
| 렌더링 | 레이어별 독립 스크롤 + 알파 블렌딩 |
| 파티클 | 근경 레이어 위에 별도 파티클 시스템 오버레이 |
| 시간대 전환 | 셰이더 기반 컬러 시프트 (각 레이어 독립) |

---

## 2) 시간대 변화 색상 시프트 규칙

### 2.1 시간대 정의

| 시간대 | 게임 내 시각 | 실제 주기 | 기본 톤 |
|--------|-----------|----------|---------|
| **새벽 (Dawn)** | 05:00~07:00 | 전환 5분 | 따뜻한 오렌지+보라 |
| **낮 (Day)** | 07:00~17:00 | 유지 25분 | 지역 기본 팔레트 |
| **황혼 (Dusk)** | 17:00~19:00 | 전환 5분 | 진한 오렌지+적색 |
| **밤 (Night)** | 19:00~05:00 | 유지 25분 | 어두운 남색+발광 강조 |

1 게임일 = 60분 실시간

### 2.2 색상 시프트 매트릭스

#### 글로벌 시프트 값 (모든 지역 공통)

| 속성 | 새벽 | 낮 | 황혼 | 밤 |
|------|------|-----|------|-----|
| 밝기 (Brightness) | -10% | 0% (기준) | -15% | -40% |
| 채도 (Saturation) | -5% | 0% | +5% | -20% |
| 색조 오프셋 (Hue) | +15° (따뜻) | 0° | +25° (따뜻) | -20° (차가움) |
| 발광 강도 | 50% | 30% | 60% | 100% |
| 안개 불투명도 | 70% | 20% | 40% | 60% |

#### 지역별 시간대 보정

| 지역 | 새벽 보정 | 낮 보정 | 황혼 보정 | 밤 보정 |
|------|----------|--------|----------|--------|
| 에레보스 | 안개 +20% | 안개 유지 30% | 기억 잔광 +30% | 기억 발광 최대 |
| 실반헤임 | 빛줄기 약함 | 빛줄기 강함 | 황금빛 전환 | 발광균 100% |
| 솔라리스 | 서늘한 보라 | 작열 + 아지랑이 | 결정 발광 시작 | 결정 발광 최대 |
| 북방 빙원 | 핑크 오로라 | 백색 확산광 | 청보라 전환 | 오로라 풀컬러 |
| 아르겐티움 | 가스등 꺼짐 | 연기/스모그 | 가스등 점등 | 가스등+네온 풀 |
| 브리탈리아 | 해안 안개 | 맑은 바다 | 석양 반사 | 등대 빛 회전 |
| 안개해 | 안개 옅음 | 상시 안개 | 기억 폭풍 확률↑ | 유령선 출현 |
| 기억의 심연 | 시간 없음 | 시간 없음 | 시간 없음 | **상시 밤** (고정) |

### 2.3 시간대 전환 셰이더 파라미터

```
// 전환 보간 (5분 = 300초)
float t = transitionProgress; // 0.0 → 1.0
vec3 color = mix(currentPalette, nextPalette, smoothstep(0.0, 1.0, t));
float glow = mix(currentGlow, nextGlow, t);
float fog  = mix(currentFog, nextFog, t);
```

---

## 3) 지역별 Parallax 배경 상세

---

### 3.1 에레보스 (폐허 도시)

| 레이어 | 내용 | 특수 요소 |
|--------|------|----------|
| 하늘 | 흐린 보라-회색 하늘. 구름 천천히 이동 | 달: 흰 원반, 구름에 반쯤 가림 |
| 원경 | 안개 속 무너진 첨탑 실루엣 3~4개. 부서진 아치 | 간헐적 기억 섬광 (청백 플래시) |
| 중경 | 폐허 건물군 — 부서진 시계탑, 무너진 다리, 빈 창문 | 창문에서 희미한 빛 깜빡임 |
| 근경 | 안개 파티클 (두꺼움), 떠다니는 기억 파편 (청백 입자) | 파편: 3~5개, 느린 상하 부유 |

**낮**: 안개 옅어지며 폐허 디테일 보임  
**밤**: 안개 짙어지며 기억 파편 발광 극대화

---

### 3.2 실반헤임 (마법의 숲)

| 레이어 | 내용 | 특수 요소 |
|--------|------|----------|
| 하늘 | 수관층 사이로 보이는 하늘 파편 | 빛줄기 (God rays) 3~4줄 |
| 원경 | 안개 속 거대 나무 실루엣. 높이 화면 전체 | 나무에서 떨어지는 잎 파티클 |
| 중경 | 숲 캐노피 — 다층 나뭇잎, 덩굴, 기억나무 열매 | 발광균: 밤에 군데군데 청록 점등 |
| 근경 | 나뭇잎 전경, 발광 포자 파티클, 빛줄기 입자 | 낮: 금빛 먼지 / 밤: 청록 포자 |

**낮**: 황금빛 빛줄기 관통, 따뜻한 녹금색  
**밤**: 발광균+포자로 환상적 야경. 전체 청록 톤

---

### 3.3 솔라리스 사막

| 레이어 | 내용 | 특수 요소 |
|--------|------|----------|
| 하늘 | 작열 태양 하늘 (낮). 별+결정 빛 (밤) | 낮: 아지랑이 왜곡 효과 |
| 원경 | 사구(모래 언덕) 실루엣 겹침. 유적 기둥 일부 | 신기루: 반투명 유적 환상 (4F 루프) |
| 중경 | 유적 잔해, 에테르 결정 기둥군, 채광 기지 | 결정 발광: 밤에 금색 → 주황 펄스 |
| 근경 | 모래 파티클 (바람 방향), 열기 왜곡 라인 | 밤: 에테르 결정 먼지 (금색 입자) |

**낮**: 강한 태양광 + 아지랑이 + 색 빠진 모래  
**밤**: 에테르 결정 발광이 사막을 별밭처럼 변환

---

### 3.4 북방 영원빙원

| 레이어 | 내용 | 특수 요소 |
|--------|------|----------|
| 하늘 | 극야 하늘 (짙은 남색~검정) 또는 회백 낮 | 오로라: 녹+핑크+보라 파동 (8F 루프) |
| 원경 | 빙하 산맥 실루엣. 날카로운 봉우리 | 빙하에 오로라 반사광 |
| 중경 | 동결된 숲 실루엣, 에테르 빙정 타워 클러스터 | 빙정 내부 기억 장면 미세 반영 |
| 근경 | 눈 파티클 (밀도 가변), 서리 결정 전경 | 눈보라 이벤트 시 밀도 10배 증가 |

**낮**: 회백 확산광, 눈 반사로 전체적으로 밝음  
**밤**: 오로라 풀 컬러 + 빙정 발광. 극적 아름다움

---

### 3.5 아르겐티움 (제국 수도)

| 레이어 | 내용 | 특수 요소 |
|--------|------|----------|
| 하늘 | 연기/스모그 가득한 하늘. 간헐적 빈틈 | 에테르 비행선 1~2대 (느린 이동) |
| 원경 | 황금 첨탑 스카이라인. 에테르 탑 중앙 | 탑 꼭대기 에테르 발광 (금색 펄스) |
| 중경 | 도시 건물군 — 공중 다리, 파이프라인, 굴뚝 연기 | 굴뚝 연기 파티클 (3~4개) |
| 근경 | 증기 파티클, 기어 파편, 신문지 날림 | 밤: 가스등 불빛 점등 (주황 포인트) |

**낮**: 스모그 속 태양 산란광 (주황+회색)  
**밤**: 가스등+네온+에테르 탑 빛으로 사이버펑크적 야경

---

### 3.6 브리탈리아 자유항

| 레이어 | 내용 | 특수 요소 |
|--------|------|----------|
| 하늘 | 해안 하늘 — 구름 이동, 갈매기 실루엣 | 석양 시 극적인 오렌지~핑크 그라데이션 |
| 원경 | 안개 속 수평선, 먼 섬 실루엣, 등대 | 등대 빛 회전 (8F 루프) |
| 중경 | 정박 선박 마스트, 부두 구조물, 창고 지붕 | 선박 깃발 펄럭임 |
| 근경 | 파도 파티클, 갈매기 비행, 해안 안개 | 파도: 4F 반복 / 갈매기: 랜덤 경로 |

**낮**: 맑은 바다+파란 하늘. 활기찬 항구  
**밤**: 안개+등대+선술집 불빛. 미스터리 분위기

---

### 3.7 무한 안개해

| 레이어 | 내용 | 특수 요소 |
|--------|------|----------|
| 하늘 | 짙은 보라 안개. 하늘과 바다 경계 모호 | 기억 파편 유성 (핑크 궤적) |
| 원경 | 심해 어둠 속 먼 발광점들. 유령선 그림자 | 유령선 출현: 밤에만 (반투명 실루엣) |
| 중경 | 산호 절벽, 침몰선 실루엣, 심해 발광 구조물 | 심해 생물 발광 (간헐적 깜빡임) |
| 근경 | 기포 파티클, 해파리 부유, 빛줄기 (수면에서) | 기억 안개: 보라 안개 두꺼움 |

**수면/수중 전환**: 전용 전환 연출 — 수면 진입 시 밝기 -30%, 채도 -20%, 블루 오버레이

---

### 3.8 기억의 심연 (최종 지역)

| 레이어 | 내용 | 특수 요소 |
|--------|------|----------|
| 하늘 | 허공 (완전 검정에 가까움). 극소 별빛 | 기억 파편 유성 (백색 궤적, 산발적) |
| 원경 | 부유하는 기억 파편 — 깨진 건물, 역전 풍경 | 파편 회전/부유 (8F 루프) |
| 중경 | 깨진 세계 조각 — 과거 지역 단면 (에레보스/실반헤임 등) | 각 조각 자기 팔레트 유지 |
| 근경 | 에테르 펄스 파티클, 시간 왜곡 왜곡선, 기억 잔상 | 왜곡: 셰이더 기반 공간 비틀림 |

**시간대 없음**: 상시 어둠. 발광 강도 100% 고정. 유일하게 시간대 시스템 비적용 지역.

---

## 4) AI 생성 프롬프트 (배경용)

### 4.1 하늘 레이어 프롬프트

```
Template: BG_SKY_{REGION}

2D digital painting, {region_name} sky layer,
panoramic sky background, horizontal seamless tile,
1920x360 pixels, {sky_description},
{time_of_day} lighting, {sky_palette} color palette,
painterly style with subtle pixel texture,
dark fantasy RPG atmosphere, no ground elements

Variables:
  sky_description: 지역별 하늘 설명
  time_of_day: dawn | day | dusk | night
  sky_palette: 해당 시간대+지역 팔레트 조합
```

### 4.2 원경 레이어 프롬프트

```
Template: BG_FAR_{REGION}

2D digital painting, {region_name} far background layer,
distant {landmark_description} silhouettes,
atmospheric perspective (desaturated, low contrast),
1920x540 pixels, horizontal seamless tile,
{atmosphere} atmosphere, {time_of_day} lighting,
{region_palette} color scheme, dark fantasy RPG,
parallax game background layer, subtle detail only
```

### 4.3 중경 레이어 프롬프트

```
Template: BG_MID_{REGION}

2D digital painting, {region_name} mid background layer,
{scene_description}, moderate detail level,
1920x720 pixels, horizontal seamless tile,
{atmosphere} atmosphere, {time_of_day} lighting,
{region_palette} color scheme, dark fantasy RPG,
parallax scrolling game background, clear shapes
```

### 4.4 근경 레이어 프롬프트

```
Template: BG_NEAR_{REGION}

2D digital painting with pixel art elements,
{region_name} foreground layer,
{foreground_elements} in close-up,
transparent/semi-transparent elements for overlaying,
1920x720 pixels, {region_palette} palette,
{time_of_day} lighting, parallax foreground,
includes particle-like elements ({particle_type}),
dark fantasy RPG, high detail on edges
```

### 4.5 네거티브 프롬프트 (배경 공통)

```
3D render, realistic photo, character, person, creature,
watermark, text, logo, low quality, noisy, grain,
JPEG artifacts, vertical composition, portrait orientation,
bright cheerful colors, modern buildings, sci-fi elements
```

---

## 5) 에셋 산출물 요약

| 항목 | 수량 |
|------|------|
| 지역 | 8개 |
| 시간대 | 4종 (새벽/낮/황혼/밤) — 기억의 심연 제외 |
| 레이어/지역 | 4개 (하늘/원경/중경/근경) |
| 배경 이미지 총 | 8 × 4 레이어 × 4 시간대 = **128장** |
| 기억의 심연 (시간대 1종) | 4장 |
| **실제 총량** | 7 × 16 + 4 = **116장** |

### 파일 네이밍

```
bg_{region}_{layer}_{time}.png

예시:
  bg_erebos_sky_day.png
  bg_erebos_far_night.png
  bg_sylvanheim_mid_dusk.png
  bg_abyss_near_default.png  (시간대 없음)
```
