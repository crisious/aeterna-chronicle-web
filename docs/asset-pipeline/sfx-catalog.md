# 에테르나 크로니클 — SFX 카탈로그

> 작성일: 2026-03-12 | 버전: v1.0  
> 티켓: P11-14  
> 참조: sound_design.md, overview.md

---

## 1) SFX 공통 규격

### 1.1 기술 사양

| 항목 | 규격 |
|------|------|
| 포맷 | WAV (마스터) / OGG Vorbis (게임 내) |
| 샘플레이트 | 44.1kHz, 16bit |
| 채널 | 모노 (3D SFX) / 스테레오 (UI SFX) |
| 마스터링 | 피크 -3dBFS 이하, 노이즈 플로어 -60dB 이하 |
| 페이드 | 시작/종료 5ms 이하 페이드 (클릭 방지) |

### 1.2 파일 네이밍 규칙

```
sfx_{category}_{subcategory}_{name}_{variant}.wav

예시:
  sfx_ui_button_click_01.wav
  sfx_combat_hit_sword_metal_02.wav
  sfx_env_wind_forest_loop.wav
  sfx_skill_fireball_cast.wav
```

### 1.3 카테고리 코드

| 코드 | 카테고리 | 설명 |
|------|---------|------|
| `ui` | UI | 인터페이스 조작 |
| `combat` | 전투 | 타격, 피격, 방어 |
| `skill` | 스킬 | 스킬 시전, 효과 |
| `char` | 캐릭터 | 이동, 행동, 음성 |
| `mon` | 몬스터 | 몬스터 소리 |
| `env` | 환경 | 환경음, 날씨 |
| `sys` | 시스템 | 알림, 레벨업, 업적 |
| `craft` | 제작 | 강화, 제작, 상점 |

---

## 2) UI SFX (40개)

### 2.1 기본 UI (15개)

| # | ID | 이름 | 길이 | 설명 |
|---|-----|------|------|------|
| 1 | sfx_ui_button_click | 버튼 클릭 | 0.1s | 짧은 기계 클릭 |
| 2 | sfx_ui_button_hover | 버튼 호버 | 0.05s | 부드러운 하이라이트 |
| 3 | sfx_ui_button_confirm | 확인 버튼 | 0.2s | 긍정적 확인음 |
| 4 | sfx_ui_button_cancel | 취소 버튼 | 0.15s | 부정적 취소음 |
| 5 | sfx_ui_button_disabled | 비활성 클릭 | 0.1s | 둔탁한 거부음 |
| 6 | sfx_ui_menu_open | 메뉴 열기 | 0.3s | 펼쳐지는 소리 |
| 7 | sfx_ui_menu_close | 메뉴 닫기 | 0.2s | 접히는 소리 |
| 8 | sfx_ui_tab_switch | 탭 전환 | 0.1s | 가벼운 슬라이드 |
| 9 | sfx_ui_scroll | 스크롤 | 0.05s | 미세 틱 |
| 10 | sfx_ui_tooltip_show | 툴팁 표시 | 0.1s | 부드러운 팝 |
| 11 | sfx_ui_notification | 알림 | 0.5s | 기억 결정 차임 |
| 12 | sfx_ui_error | 에러 | 0.3s | 불협화 경고음 |
| 13 | sfx_ui_page_turn | 페이지 넘기기 | 0.2s | 종이 넘기는 소리 |
| 14 | sfx_ui_checkbox | 체크박스 | 0.1s | 체크 소리 |
| 15 | sfx_ui_slider | 슬라이더 | 0.05s | 미세 슬라이드 |

### 2.2 인벤토리/장비 (15개)

| # | ID | 이름 | 길이 | 설명 |
|---|-----|------|------|------|
| 16 | sfx_ui_inv_open | 인벤토리 열기 | 0.3s | 가방 벨크로/가죽 |
| 17 | sfx_ui_inv_close | 인벤토리 닫기 | 0.2s | 가방 닫기 |
| 18 | sfx_ui_item_pickup | 아이템 획득 | 0.3s | 밝은 획득음 |
| 19 | sfx_ui_item_drop | 아이템 버리기 | 0.2s | 떨어뜨리는 소리 |
| 20 | sfx_ui_item_move | 아이템 이동 | 0.1s | 드래그 소리 |
| 21 | sfx_ui_equip_weapon | 무기 장착 | 0.4s | 검 뽑는 소리/장착 |
| 22 | sfx_ui_equip_armor | 방어구 장착 | 0.3s | 금속/가죽 장착 |
| 23 | sfx_ui_equip_accessory | 장신구 장착 | 0.2s | 보석 소리 |
| 24 | sfx_ui_unequip | 장비 해제 | 0.2s | 분리 소리 |
| 25 | sfx_ui_item_use | 아이템 사용 | 0.3s | 소비 효과음 |
| 26 | sfx_ui_potion_drink | 포션 음용 | 0.5s | 물 마시는 소리 |
| 27 | sfx_ui_scroll_use | 두루마리 사용 | 0.4s | 양피지 펼침 + 마법 |
| 28 | sfx_ui_gold_gain | 골드 획득 | 0.3s | 동전 소리 |
| 29 | sfx_ui_gold_spend | 골드 사용 | 0.2s | 동전 건네기 |
| 30 | sfx_ui_inventory_full | 인벤토리 꽉참 | 0.3s | 경고 + 거부 |

### 2.3 대화/퀘스트 (10개)

| # | ID | 이름 | 길이 | 설명 |
|---|-----|------|------|------|
| 31 | sfx_ui_dialog_open | 대화창 열기 | 0.2s | 부드러운 팝업 |
| 32 | sfx_ui_dialog_next | 대화 진행 | 0.1s | 가벼운 클릭 |
| 33 | sfx_ui_dialog_choice | 선택지 등장 | 0.3s | 선택 강조음 |
| 34 | sfx_ui_quest_accept | 퀘스트 수락 | 0.5s | 양피지 + 확인 |
| 35 | sfx_ui_quest_complete | 퀘스트 완료 | 0.8s | 팡파르 미니 |
| 36 | sfx_ui_quest_update | 퀘스트 갱신 | 0.3s | 가벼운 알림 |
| 37 | sfx_ui_quest_fail | 퀘스트 실패 | 0.5s | 어두운 하강음 |
| 38 | sfx_ui_map_open | 지도 열기 | 0.3s | 양피지 펼침 |
| 39 | sfx_ui_map_pin | 핀 찍기 | 0.2s | 핀 꽂는 소리 |
| 40 | sfx_ui_minimap_ping | 미니맵 핑 | 0.2s | 소나 핑 |

---

## 3) 전투 SFX (65개)

### 3.1 근접 타격 (15개)

| # | ID | 이름 | 길이 | 설명 |
|---|-----|------|------|------|
| 41 | sfx_combat_hit_sword_flesh | 검→생체 | 0.2s | 칼날 절단+육감 |
| 42 | sfx_combat_hit_sword_metal | 검→금속 | 0.2s | 금속 충돌 |
| 43 | sfx_combat_hit_sword_wood | 검→나무 | 0.2s | 목재 절단 |
| 44 | sfx_combat_hit_sword_stone | 검→석재 | 0.2s | 돌 긁힘+불꽃 |
| 45 | sfx_combat_hit_blunt_flesh | 둔기→생체 | 0.2s | 둔탁한 충격 |
| 46 | sfx_combat_hit_blunt_metal | 둔기→금속 | 0.2s | 금속 울림 |
| 47 | sfx_combat_hit_axe | 도끼 타격 | 0.2s | 도끼 절단+박힘 |
| 48 | sfx_combat_hit_dagger | 단검 타격 | 0.15s | 빠른 절단 |
| 49 | sfx_combat_hit_critical | 크리티컬 | 0.3s | 강화된 타격+파열 |
| 50 | sfx_combat_swing_light | 가벼운 휘두르기 | 0.15s | 빠른 바람 가르기 |
| 51 | sfx_combat_swing_heavy | 무거운 휘두르기 | 0.3s | 묵직한 바람 가르기 |
| 52 | sfx_combat_parry | 패리/막기 | 0.2s | 금속 튕김 |
| 53 | sfx_combat_shield_block | 방패 방어 | 0.3s | 방패 충격 |
| 54 | sfx_combat_miss | 빗나감 | 0.15s | 바람 소리만 |
| 55 | sfx_combat_backstab | 백스탭 | 0.2s | 은밀 절단+강조 |

### 3.2 원거리/마법 (15개)

| # | ID | 이름 | 길이 | 설명 |
|---|-----|------|------|------|
| 56 | sfx_combat_arrow_shoot | 화살 발사 | 0.2s | 활시위+화살 날아감 |
| 57 | sfx_combat_arrow_hit | 화살 적중 | 0.15s | 화살 박힘 |
| 58 | sfx_combat_arrow_miss | 화살 빗나감 | 0.2s | 화살 스침 |
| 59 | sfx_combat_crossbow_shoot | 석궁 발사 | 0.3s | 기계 발사+볼트 |
| 60 | sfx_combat_throw | 투척 | 0.2s | 던지기 |
| 61 | sfx_skill_fire_cast | 화염 시전 | 0.5s | 화염 점화 |
| 62 | sfx_skill_fire_impact | 화염 적중 | 0.3s | 화염 폭발 |
| 63 | sfx_skill_ice_cast | 빙결 시전 | 0.5s | 결정화 소리 |
| 64 | sfx_skill_ice_impact | 빙결 적중 | 0.3s | 얼음 깨짐+동결 |
| 65 | sfx_skill_lightning_cast | 번개 시전 | 0.4s | 전기 충전 |
| 66 | sfx_skill_lightning_impact | 번개 적중 | 0.2s | 전격 타격 |
| 67 | sfx_skill_heal | 힐 | 0.5s | 따뜻한 차임+상승 |
| 68 | sfx_skill_buff | 버프 적용 | 0.4s | 강화 오라 |
| 69 | sfx_skill_debuff | 디버프 적용 | 0.4s | 약화 하강음 |
| 70 | sfx_skill_shield | 보호막 생성 | 0.4s | 에너지 막 형성 |

### 3.3 피격/사망 (10개)

| # | ID | 이름 | 길이 | 설명 |
|---|-----|------|------|------|
| 71 | sfx_combat_hurt_light | 가벼운 피격 | 0.2s | 미세 충격음 |
| 72 | sfx_combat_hurt_heavy | 강한 피격 | 0.3s | 강한 충격+신음 |
| 73 | sfx_combat_hurt_magic | 마법 피격 | 0.3s | 에너지 충격 |
| 74 | sfx_combat_dodge | 회피 | 0.2s | 바람 소리+구르기 |
| 75 | sfx_combat_death_player | 플레이어 사망 | 0.8s | 쓰러짐+반향 |
| 76 | sfx_combat_death_monster | 몬스터 사망 | 0.5s | 소멸+파편 |
| 77 | sfx_combat_death_boss | 보스 사망 | 1.5s | 대폭발+반향+여운 |
| 78 | sfx_combat_revive | 부활 | 0.8s | 빛+상승음 |
| 79 | sfx_combat_ko | 기절 | 0.3s | 둔탁+별 회전 |
| 80 | sfx_combat_poison_tick | 독 틱 | 0.15s | 독 거품 |

### 3.4 시간 수호자 전용 (10개)

| # | ID | 이름 | 길이 | 설명 |
|---|-----|------|------|------|
| 81 | sfx_skill_time_slash | 시간 베기 | 0.3s | 시계 바늘 긁힘+시간 왜곡 |
| 82 | sfx_skill_time_stop | 시간 정지 | 0.5s | 틱톡 감속→정지 |
| 83 | sfx_skill_time_rewind | 시간 역행 | 0.6s | 리와인드 효과 |
| 84 | sfx_skill_time_accel | 시간 가속 | 0.4s | 틱톡 가속 |
| 85 | sfx_skill_time_portal | 시간 포탈 | 0.5s | 공간 열림+시계 차임 |
| 86 | sfx_skill_time_heal | 역행 치유 | 0.5s | 되감기+힐 |
| 87 | sfx_skill_chrono_gear | 기어 회전 | 0.3s | 시계 기어 맞물림 |
| 88 | sfx_skill_time_chain | 시간 사슬 | 0.4s | 사슬+시간 울림 |
| 89 | sfx_skill_time_shatter | 시간 파쇄 | 0.5s | 유리+시계 깨짐 |
| 90 | sfx_skill_time_ultimate | 시간 궁극기 | 1.0s | 풀 시간 정지→해방 |

### 3.5 보스 전용 (5개)

| # | ID | 이름 | 길이 | 설명 |
|---|-----|------|------|------|
| 91 | sfx_combat_boss_roar | 보스 포효 | 1.0s | 거대 포효+반향 |
| 92 | sfx_combat_boss_phase | 페이즈 전환 | 1.5s | 에너지 폭발+변환 |
| 93 | sfx_combat_boss_aoe | 보스 광역기 | 0.8s | 거대 충격파 |
| 94 | sfx_combat_boss_summon | 보스 소환 | 0.6s | 포탈+등장 |
| 95 | sfx_combat_boss_enrage | 보스 분노 | 0.8s | 오라 폭발+포효 |

### 3.6 추가 전투 (10개)

| # | ID | 이름 | 길이 | 설명 |
|---|-----|------|------|------|
| 96 | sfx_skill_shadow_step | 그림자 이동 | 0.3s | 그림자 스텝 |
| 97 | sfx_skill_poison_cloud | 독구름 | 0.5s | 독 분출 |
| 98 | sfx_skill_summon | 소환 | 0.6s | 마법진+등장 |
| 99 | sfx_skill_meteor | 메테오 낙하 | 1.0s | 낙하+대폭발 |
| 100 | sfx_skill_chain_lightning | 체인 라이트닝 | 0.5s | 연쇄 전격 |
| 101 | sfx_combat_combo_1 | 콤보 1단계 | 0.15s | 연속 타격 1 |
| 102 | sfx_combat_combo_2 | 콤보 2단계 | 0.15s | 연속 타격 2 강조 |
| 103 | sfx_combat_combo_3 | 콤보 3단계 | 0.15s | 연속 타격 3 최강조 |
| 104 | sfx_combat_combo_finish | 콤보 피니시 | 0.4s | 연속기 마무리 |
| 105 | sfx_skill_aura_on | 오라 활성 | 0.4s | 지속 오라 시작 |

---

## 4) 환경 SFX (55개)

### 4.1 자연 환경 (20개)

| # | ID | 이름 | 길이 | 설명 |
|---|-----|------|------|------|
| 106 | sfx_env_wind_light | 가벼운 바람 | 루프 | 들판 바람 |
| 107 | sfx_env_wind_strong | 강풍 | 루프 | 폭풍 전조 |
| 108 | sfx_env_wind_howl | 울부짖는 바람 | 루프 | 산/동굴 바람 |
| 109 | sfx_env_rain_light | 가벼운 비 | 루프 | 보슬비 |
| 110 | sfx_env_rain_heavy | 폭우 | 루프 | 세찬 비 |
| 111 | sfx_env_thunder | 천둥 | 2.0s | 번개+천둥 |
| 112 | sfx_env_water_stream | 시냇물 | 루프 | 졸졸 흐르는 물 |
| 113 | sfx_env_water_lake | 호수 | 루프 | 잔잔한 물결 |
| 114 | sfx_env_water_waterfall | 폭포 | 루프 | 세찬 물줄기 |
| 115 | sfx_env_wave_ocean | 파도 | 루프 | 해안 파도 |
| 116 | sfx_env_bird_forest | 숲 새소리 | 루프 | 새 지저귐 |
| 117 | sfx_env_insect_night | 밤 벌레 | 루프 | 귀뚜라미 등 |
| 118 | sfx_env_fire_campfire | 모닥불 | 루프 | 나무 타는 소리 |
| 119 | sfx_env_fire_torch | 횃불 | 루프 | 바람에 흔들리는 불꽃 |
| 120 | sfx_env_fire_large | 대형 화재 | 루프 | 맹렬한 화염 |
| 121 | sfx_env_snow_footstep | 눈 위 발자국 | 0.2s | 눈 밟는 소리 |
| 122 | sfx_env_ice_crack | 얼음 균열 | 0.5s | 빙판 깨짐 |
| 123 | sfx_env_sandstorm | 모래 폭풍 | 루프 | 모래+바람 |
| 124 | sfx_env_earthquake | 지진 | 2.0s | 대지 울림 |
| 125 | sfx_env_cave_drip | 동굴 물방울 | 루프 | 물방울 떨어짐 |

### 4.2 지역별 특수 환경음 (15개)

| # | ID | 이름 | 길이 | 지역 | 설명 |
|---|-----|------|------|------|------|
| 126 | sfx_env_erebos_fog | 에레보스 안개 | 루프 | 에레보스 | 부드러운 안개 흐름 |
| 127 | sfx_env_erebos_memory_echo | 기억 반향 | 3.0s | 에레보스 | 속삭이는 기억 조각 |
| 128 | sfx_env_sylvan_biolum | 발광균 | 루프 | 실반헤임 | 미세 발광 윙윙 |
| 129 | sfx_env_sylvan_spore | 포자 방출 | 0.5s | 실반헤임 | 포자 터짐 |
| 130 | sfx_env_solar_heat | 열기 아지랑이 | 루프 | 솔라리스 | 뜨거운 공기 울림 |
| 131 | sfx_env_solar_crystal | 에테르 결정 | 루프 | 솔라리스 | 결정 공명 |
| 132 | sfx_env_boreal_aurora | 오로라 | 루프 | 북방 | 전자기 소리 |
| 133 | sfx_env_boreal_frozen | 동결 깨짐 | 0.5s | 북방 | 급속 동결 |
| 134 | sfx_env_argent_steam | 증기 분출 | 0.5s | 아르겐티움 | 스팀 파이프 |
| 135 | sfx_env_argent_gear | 기어 회전 | 루프 | 아르겐티움 | 시계 기어 |
| 136 | sfx_env_brit_seagull | 갈매기 | 루프 | 브리탈리아 | 갈매기 울음 |
| 137 | sfx_env_brit_ship_creak | 선박 삐걱 | 루프 | 브리탈리아 | 나무 선체 소리 |
| 138 | sfx_env_mist_ghost | 유령 속삭임 | 루프 | 안개해 | 유령 속삭임 |
| 139 | sfx_env_abyss_pressure | 심연 압력 | 루프 | 심연 | 저주파 압력음 |
| 140 | sfx_env_abyss_memory | 기억 파편 | 2.0s | 심연 | 기억 조각 재생 |

### 4.3 인터랙션/오브젝트 (20개)

| # | ID | 이름 | 길이 | 설명 |
|---|-----|------|------|------|
| 141 | sfx_env_door_wood_open | 나무 문 열기 | 0.5s | 나무 문 |
| 142 | sfx_env_door_wood_close | 나무 문 닫기 | 0.3s | 나무 문 |
| 143 | sfx_env_door_metal_open | 금속 문 열기 | 0.6s | 무거운 금속 문 |
| 144 | sfx_env_door_metal_close | 금속 문 닫기 | 0.4s | 금속 문 |
| 145 | sfx_env_chest_open | 상자 열기 | 0.4s | 보물 상자 열기 |
| 146 | sfx_env_chest_rare | 희귀 상자 | 0.6s | 빛남+희귀 효과 |
| 147 | sfx_env_lever_pull | 레버 당기기 | 0.3s | 기계 레버 |
| 148 | sfx_env_switch_press | 스위치 누르기 | 0.2s | 석재 스위치 |
| 149 | sfx_env_trap_activate | 함정 작동 | 0.5s | 함정 발동 경고 |
| 150 | sfx_env_trap_spike | 가시 함정 | 0.3s | 가시 돌출 |
| 151 | sfx_env_portal_open | 포탈 열기 | 0.8s | 에너지 소용돌이 |
| 152 | sfx_env_portal_enter | 포탈 진입 | 0.5s | 전이 효과 |
| 153 | sfx_env_crystal_pickup | 결정 채집 | 0.3s | 결정 분리+차임 |
| 154 | sfx_env_herb_pickup | 허브 채집 | 0.2s | 뽑는 소리 |
| 155 | sfx_env_ore_mine | 광석 채굴 | 0.4s | 곡괭이 타격 |
| 156 | sfx_env_rope_climb | 밧줄 오르기 | 0.3s | 밧줄 마찰 |
| 157 | sfx_env_ladder_climb | 사다리 오르기 | 0.2s | 나무 사다리 |
| 158 | sfx_env_bookshelf | 서가 조사 | 0.3s | 책 꺼내기 |
| 159 | sfx_env_fountain | 분수 | 루프 | 물 떨어짐 |
| 160 | sfx_env_bell_ring | 종 울림 | 1.0s | 교회/시계탑 종 |

---

## 5) 시스템/성장 SFX (25개)

| # | ID | 이름 | 길이 | 설명 |
|---|-----|------|------|------|
| 161 | sfx_sys_levelup | 레벨업 | 1.5s | 상승 팡파르+빛 폭발 |
| 162 | sfx_sys_exp_gain | 경험치 획득 | 0.3s | 가벼운 상승음 |
| 163 | sfx_sys_stat_up | 스탯 포인트 투자 | 0.2s | 강화 틱 |
| 164 | sfx_sys_skill_learn | 스킬 습득 | 0.8s | 마법서 열기+빛 |
| 165 | sfx_sys_skill_levelup | 스킬 레벨업 | 0.5s | 강화 오라 |
| 166 | sfx_sys_achievement | 업적 달성 | 1.0s | 트로피+팡파르 |
| 167 | sfx_sys_title_unlock | 칭호 해금 | 0.5s | 메달 소리 |
| 168 | sfx_sys_class_change | 전직 | 2.0s | 변환 에너지+팡파르 |
| 169 | sfx_sys_dungeon_clear | 던전 클리어 | 1.5s | 승리 팡파르 |
| 170 | sfx_sys_dungeon_enter | 던전 입장 | 0.8s | 문 열림+하강 |
| 171 | sfx_sys_party_join | 파티 참가 | 0.3s | 참가 효과음 |
| 172 | sfx_sys_party_leave | 파티 탈퇴 | 0.2s | 이탈 효과음 |
| 173 | sfx_sys_login | 로그인 | 1.0s | 접속 차임 |
| 174 | sfx_sys_logout | 로그아웃 | 0.5s | 종료 효과 |
| 175 | sfx_sys_save | 저장 | 0.3s | 체크포인트 |

### 5.1 제작/강화 (10개)

| # | ID | 이름 | 길이 | 설명 |
|---|-----|------|------|------|
| 176 | sfx_craft_forge_hit | 대장간 망치 | 0.3s | 망치 타격 |
| 177 | sfx_craft_forge_fire | 대장간 불 | 루프 | 풀무 불꽃 |
| 178 | sfx_craft_enhance_try | 강화 시도 | 1.0s | 에너지 충전+두근 |
| 179 | sfx_craft_enhance_success | 강화 성공 | 1.0s | 빛 폭발+상승 |
| 180 | sfx_craft_enhance_fail | 강화 실패 | 0.8s | 깨짐+하강 |
| 181 | sfx_craft_enhance_destroy | 장비 파괴 | 1.5s | 대폭발+안타까움 |
| 182 | sfx_craft_transcend | 초월 성공 | 2.0s | 신성 팡파르 |
| 183 | sfx_craft_recipe_learn | 레시피 습득 | 0.5s | 서적 열기 |
| 184 | sfx_craft_material_combine | 재료 결합 | 0.4s | 결합 에너지 |
| 185 | sfx_craft_shop_buy | 상점 구매 | 0.3s | 거래 확인 |

---

## 6) 캐릭터 이동/행동 SFX (15개)

| # | ID | 이름 | 길이 | 설명 |
|---|-----|------|------|------|
| 186 | sfx_char_footstep_stone | 돌 위 발걸음 | 0.15s | 단단한 돌 |
| 187 | sfx_char_footstep_wood | 나무 위 발걸음 | 0.15s | 나무 바닥 |
| 188 | sfx_char_footstep_grass | 풀 위 발걸음 | 0.15s | 잔디 |
| 189 | sfx_char_footstep_sand | 모래 위 발걸음 | 0.15s | 모래 |
| 190 | sfx_char_footstep_water | 물 위 발걸음 | 0.2s | 첨벙 |
| 191 | sfx_char_footstep_snow | 눈 위 발걸음 | 0.15s | 눈 밟기 |
| 192 | sfx_char_footstep_metal | 금속 위 발걸음 | 0.15s | 금속 바닥 |
| 193 | sfx_char_jump | 점프 | 0.2s | 발구름 |
| 194 | sfx_char_land | 착지 | 0.2s | 착지 충격 |
| 195 | sfx_char_roll | 구르기 | 0.3s | 회피 구르기 |
| 196 | sfx_char_swim | 수영 | 0.2s | 물 팔 젓기 |
| 197 | sfx_char_climb | 등반 | 0.3s | 벽 오르기 |
| 198 | sfx_char_dash | 대시 | 0.2s | 빠른 전진 |
| 199 | sfx_char_mount | 탈것 탑승 | 0.5s | 올라타기 |
| 200 | sfx_char_dismount | 탈것 하차 | 0.3s | 내리기 |

---

## 7) 추가 SFX (10개)

| # | ID | 이름 | 길이 | 설명 |
|---|-----|------|------|------|
| 201 | sfx_sys_season_pass | 시즌패스 보상 | 1.0s | 특별 획득 |
| 202 | sfx_sys_gacha_pull | 가챠 뽑기 | 1.5s | 기대감+결과 |
| 203 | sfx_sys_gacha_rare | 가챠 희귀 | 2.0s | 빛 폭발+팡파르 |
| 204 | sfx_env_npc_talk | NPC 말풍선 | 0.1s | 대화 시작 |
| 205 | sfx_env_pet_call | 펫 호출 | 0.3s | 호루라기/부름 |
| 206 | sfx_env_pet_happy | 펫 기쁨 | 0.3s | 기쁜 소리 |
| 207 | sfx_combat_pvp_start | PvP 시작 | 0.8s | 대결 알림 |
| 208 | sfx_combat_pvp_win | PvP 승리 | 1.0s | 승리 팡파르 |
| 209 | sfx_combat_pvp_lose | PvP 패배 | 0.8s | 패배 하강 |
| 210 | sfx_sys_countdown | 카운트다운 | 0.3s | 틱 (3, 2, 1용) |

---

## 8) 수량 요약

| 카테고리 | 수량 |
|---------|------|
| UI SFX | 40 |
| 전투 SFX | 65 |
| 환경 SFX | 55 |
| 시스템/성장 SFX | 25 |
| 캐릭터 이동 SFX | 15 |
| 추가 SFX | 10 |
| **합계** | **210** |

---

## 9) AI 생성 가이드 (SFX용)

### 9.1 권장 도구

| 도구 | 용도 | 비고 |
|------|------|------|
| ElevenLabs SFX | 효과음 생성 | 텍스트→SFX |
| Stable Audio | 환경음 루프 | 긴 환경음 |
| Freesound.org | 기본 소스 | CC0 라이선스 확인 |
| Audacity | 후처리 | 트리밍/노멀라이즈/페이드 |

### 9.2 SFX AI 프롬프트 패턴

```
Template: SFX_PROMPT

{action_description}, {material_context},
{duration} seconds, {intensity} intensity,
dark fantasy RPG game sound effect,
clean recording, no background noise, no music

예시:
  "Sword striking metal armor plate, brief metallic ring and clang,
   0.2 seconds, medium intensity, dark fantasy RPG game sound effect,
   clean recording, no background noise, no music"
```

---

## 10) 품질 체크리스트

- [ ] 모든 SFX 피크 -3dBFS 이하
- [ ] 시작/종료 5ms 페이드 적용
- [ ] 노이즈 플로어 -60dB 이하
- [ ] 루프 SFX 심리스 루프 포인트 확인
- [ ] 카테고리별 볼륨 밸런스 통일
- [ ] 유사 SFX 간 음색 구분 확인 (검 vs 도끼 vs 둔기)
- [ ] OGG 변환 후 품질 검증
- [ ] 게임 내 동시 재생 테스트 (최대 8개 SFX 동시)
