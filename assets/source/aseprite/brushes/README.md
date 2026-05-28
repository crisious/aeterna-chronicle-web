# Aseprite Brush Work Settings

이 문서는 에테르나 크로니클 픽셀아트 원본을 편집할 때 맞춰야 하는 Aseprite 작업 설정이다. 실제 브러쉬 프리셋은 개인 Aseprite 환경에 저장되므로, 프로젝트에는 재현 가능한 수치와 팔레트만 고정한다.

## 공통 캔버스 설정

| 항목 | 값 |
|------|----|
| Color Mode | RGB Color 또는 Indexed Color |
| Background | Transparent |
| Sprite Pixel Ratio | 1:1 |
| Grid | 8x8, 16x16 보조 / frame boundary는 64x64 또는 32x32 |
| Onion Skin | animation 작업 시 이전/다음 2 frame |
| Light Direction | 좌상단 45도 |

## 필수 브러쉬

| 이름 | Tool | Size | Ink | 사용처 |
|------|------|------|-----|--------|
| Pixel Pencil 1 | Pencil | 1px | Simple Ink | 내부 픽셀, 하이라이트, 얼굴/장식 디테일 |
| Pixel Pencil 2 | Pencil | 2px | Simple Ink | 기본 외곽선, 64x64 캐릭터/NPC 실루엣 |
| Shadow Block | Pencil | 2px | Simple Ink | 3단계 셰이딩의 섀도 블록 |
| Glow Dot | Pencil | 1px | Alpha Compositing 50% | 기억 잔광, 눈, 룬, 소형 발광 |
| Hard Eraser | Eraser | 1px | - | 투명 배경 정리, 안티앨리어싱 제거 |

## 작업 규칙

- Brush는 anti-aliasing 없이 hard edge만 사용한다.
- 외곽선은 기본 2px 검정(`#000000`)이며, UI/아이콘만 1px를 허용한다.
- NPC/캐릭터는 먼저 2px 실루엣을 고정한 뒤 1px 디테일을 추가한다.
- 셰이딩은 하이라이트, 미드톤, 섀도 3단계까지만 사용한다.
- Dither는 넓은 면의 색 전환이 필요한 경우에만 50% checker pattern으로 제한한다.
- Glow는 원본 색을 직접 밝게 칠하고, export 후 런타임 bloom에 의존하지 않는다.
- Reference/background layer는 export 전 hidden 상태로 둔다.

## 팔레트

프로젝트 기본 팔레트는 다음 파일을 Aseprite에서 import한다.

```text
assets/source/aseprite/palettes/aeterna-core.gpl
```

Gorodi 같은 에레보스 NPC는 `Erebos`, `Ghost`, `Memory Cyan`, `Gold Accent` 계열을 우선 사용한다. 새 지역 전용 팔레트는 같은 폴더에 `{region}-*.gpl` 형식으로 추가한다.
