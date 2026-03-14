# P21 에셋 갭 분석 상세 리포트

> 분석일: 2026-03-14 | catalog.json: 1248개 | 실제 파일: 1,137장

## 카테고리별 현황

| 카테고리 | 카탈로그 | 실제 파일 | 갭 | 상태 |
|----------|---------|----------|-----|------|
| character_illust | 18 | 18 | 0 | ✅ |
| character_sprite | 24 | 9 | 15 | ❌ -15 |
| npc_portrait | 30 | 30 | 0 | ✅ |
| npc_sprite | 30 | 0 | 30 | ❌ -30 |
| monster_normal | 120 | 120 | 0 | ✅ |
| monster_elite | 40 | 40 | 0 | ✅ |
| monster_boss | 30 | 22 | 8 | ❌ -8 |
| monster_raid | 8 | 8 | 0 | ✅ |
| monster_temporal_rift | 30 | 24 | 6 | ❌ -6 |
| background | 112 | 87 | 25 | ❌ -25 |
| tileset | 81 | 66 | 15 | ❌ -15 |
| icon_item | 100 | 100 | 0 | ✅ |
| icon_skill | 150 | 210 | 0 | ✅ |
| icon_status | 25 | 25 | 0 | ✅ |
| ui_frame | 90 | 0 | 90 | ❌ -90 |
| cosmetic | 150 | 150 | 0 | ✅ |
| vfx_skill | 180 | 180 | 0 | ✅ |
| vfx_common | 30 | 30 | 0 | ✅ |

**총 갭: 189장**

**총 실제 이미지: 1119장** (스프라이트 시트 9장 포함)


## 누락 상세

### 1. NPC 스프라이트 (30장) — 완전 누락
- characters/npc에 포트레이트 30장은 있으나 스프라이트는 별도 필요

### 2. UI 프레임 (90장) — 완전 누락
- HUD, 인벤토리, 대화창 등 UI 프레임 에셋 미생성

### 3. 환경 배경 (25장 부족)
- 현재: 87장 / 필요: 112장
- 북방빙원, 망각의고원 등 후반 지역 배경 부족

### 4. 환경 타일셋 (15장 부족)
- 현재: 66장 / 필요: 81장

### 5. 캐릭터 스프라이트 (15장 부족)
- 현재: 9장 (시트) / 카탈로그: 24장 (6클래스 × 4진화)
- ether_knight만 4단계 완료, 나머지 5클래스는 base만 존재

### 6. 몬스터 (8장 부족)
- elite_boss 디렉토리 62장으로 elite(40)+boss(30)=70 중 8장 부족

### 7. 추가 확인 필요
- characters/class_advanced에 18장 존재 — 카탈로그에 미등록
- icon_skill 210장 vs 카탈로그 150장 — 60장 초과 (시즌 확장분 추정)

## 우선순위별 생성 계획

| 우선순위 | 카테고리 | 수량 | 방법 |
|----------|----------|------|------|
| P0 | character_sprite (진화 시트) | 15 | ComfyUI + spritesheet_assembler |
| P1 | environment (배경+타일) | 40 | ComfyUI batch |
| P1 | monster (보스/엘리트 보충) | 8 | ComfyUI batch |
| P2 | npc_sprite | 30 | ComfyUI batch |
| P2 | ui_frame | 90 | ComfyUI batch / PIL 생성 |