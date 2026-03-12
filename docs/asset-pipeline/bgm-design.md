# 에테르나 크로니클 — BGM 디자인

> 작성일: 2026-03-12 | 버전: v1.0  
> 티켓: P11-13  
> 참조: bgm_ai_music_design.md (v1.1), sound_design.md, overview.md  
> 기존 문서 통합: `bgm_ai_music_design.md`의 19곡 + 본 문서에서 시스템/전투/시즌3 BGM 확장

---

## 1) BGM 설계 원칙

### 1.1 음악적 세계관

| 원칙 | 설명 |
|------|------|
| 기억-망각 이원성 | '기억' = 선명·따뜻한 사운드, '망각' = 흐릿·차가운 사운드 |
| 지역 아이덴티티 | 지역마다 고유 악기/스케일로 구분 (악기 중복 최소화) |
| 감정 호환 | 스토리 진행에 따라 BGM이 감정 곡선을 따라감 |
| 루프 설계 | 모든 필드/전투 BGM은 심리스 루프 필수 |
| 레이어드 | 전투 진입 시 기존 BGM 위에 전투 레이어 추가 (크로스페이드) |

### 1.2 기술 사양

| 항목 | 규격 |
|------|------|
| 포맷 | OGG Vorbis (게임 내) / WAV (마스터) |
| 샘플레이트 | 44.1kHz, 16bit |
| 마스터링 LUFS | 탐색 BGM: -18 LUFS / 전투 BGM: -14 LUFS / 보스 BGM: -12 LUFS |
| 루프 구간 | 루프 시작/끝 마커 포함 (클릭 노이즈 0) |
| 크로스페이드 | 지역 전환 시 2초 크로스페이드 |
| 트랙 길이 | 탐색: 2~4분 / 전투: 1.5~2.5분 / 보스: 3~5분 |

---

## 2) 기존 지역 BGM (19곡) — bgm_ai_music_design.md 통합

> 아래는 기존 `bgm_ai_music_design.md` v1.1에서 확정된 19곡의 요약. 상세 프롬프트는 원본 참조.

### 2.1 에레보스 (3곡)

| ID | 트랙명 | 구분 | BPM | 키 | 분위기 |
|----|--------|------|-----|-----|--------|
| BGM-ERB-01 | 망각의 거리 | 탐색 | 72 | Dm | 안개 폐허, 오르골+첼로, 고독 |
| BGM-ERB-02 | 기억 유령의 습격 | 전투 | 118 | Dm | 긴장 스타카토, 타이코, 유령 코러스 |
| BGM-ERB-03 | 기억의 골렘 | 보스 | 128 | C#m | 무거운 저현, 금속 충격, 브라스 |

### 2.2 실반헤임 (3곡)

| ID | 트랙명 | 구분 | BPM | 키 | 분위기 |
|----|--------|------|-----|-----|--------|
| BGM-SYL-01 | 기억이 자라는 숲 | 탐색(낮) | 84 | Gm | 목관 플루트, 하프, 따뜻한 현 |
| BGM-SYL-02 | 발광균의 밤 | 탐색(밤) | 76 | Em | 글래시 벨, 에스닉, 몽환 |
| BGM-SYL-03 | 말라투스 | 보스 | 122 | Fm | 원시 드럼, 딥 코러스, 나무 |

### 2.3 솔라리스 사막 (3곡)

| ID | 트랙명 | 구분 | BPM | 키 | 분위기 |
|----|--------|------|-----|-----|--------|
| BGM-SOL-01 | 불꽃의 땅 | 탐색(낮) | 96 | Am | 우드+프레임 드럼, 모험 |
| BGM-SOL-02 | 에테르 결정 사막의 밤 | 탐색(밤) | 82 | Cm | 말렛 신스, 코러스 패드, 우주 |
| BGM-SOL-03 | 라와르 | 보스 | 130 | Bm | 왕의 비극, 첼로 독주, 격렬 |

### 2.4 북방 영원빙원 (2곡)

| ID | 트랙명 | 구분 | BPM | 키 | 분위기 |
|----|--------|------|-----|-----|--------|
| BGM-BOR-01 | 시간이 멈춘 땅 | 탐색 | 70 | Dm | 느린 현, 빙결 벨, 바람 드론 |
| BGM-BOR-02 | 빙정 속의 기억 | 탐색(오로라) | 78 | F#m | 결정 플럭, 여성 코러스, 경이 |

### 2.5 아르겐티움 (3곡)

| ID | 트랙명 | 구분 | BPM | 키 | 분위기 |
|----|--------|------|-----|-----|--------|
| BGM-ARG-01 | 황금 첨탑 | 탐색(상류) | 92 | Em | 챔버 현, 시계 타악, 우아+긴장 |
| BGM-ARG-02 | 탑 아래의 그림자 | 탐색(하층) | 88 | Cm | 뮤트 피아노, 그리트 타악, 누아르 |
| BGM-ARG-03 | 케인 | 보스 | 132 | C#m | 하드 하이브리드, 비극 바이올린 |

### 2.6 브리탈리아 자유항 (2곡)

| ID | 트랙명 | 구분 | BPM | 키 | 분위기 |
|----|--------|------|-----|-----|--------|
| BGM-BRT-01 | 자유항의 아침 안개 | 탐색(항구) | 86 | Gm | 아코디언, 피들, 해안 안개 |
| BGM-BRT-02 | 녹슨 나침반의 밤 | 탐색(선술집) | 90 | Dm | 업라이트 베이스, 뮤트 트럼펫, 재즈 |

### 2.7 망각의 고원 (3곡)

| ID | 트랙명 | 구분 | BPM | 키 | 분위기 |
|----|--------|------|-----|-----|--------|
| BGM-PLT-01 | 망각의 고원 | 탐색 | 74 | Cm | 의식 드럼, 불협화 현, 종말 |
| BGM-PLT-02 | 레테 — 망각의 신 | 보스(P1-2) | 138 | Cm | 매시브 오케스트라, 다크 코러스 |
| BGM-PLT-03 | 기억되고 싶었어 | 보스(P3) | 96 | Am→C | 피아노+첼로→오케스트라 스웰 |

---

## 3) 신규 BGM — 전투 공용 (3곡)

| ID | 트랙명 | 구분 | BPM | 키 | 분위기 | AI 프롬프트 |
|----|--------|------|-----|-----|--------|-----------|
| BGM-BTL-01 | 기억의 충돌 | 일반 전투 | 120 | Dm | 범용 전투, 적당한 긴장, 루프 | `Generic RPG combat music, 120 BPM, D minor, driving string ostinato with snare groove, light brass punctuation, medium intensity, combat-ready loop, dark fantasy, no vocals` |
| BGM-BTL-02 | 엘리트의 위압 | 엘리트 전투 | 126 | Am | 강화된 긴장, 코러스 추가, 무거운 타악 | `Elite enemy combat theme, 126 BPM, A minor, heavy taiko and orchestral hits, tense string tremolo, choir stabs on accents, higher intensity than normal battle, loopable, no vocals` |
| BGM-BTL-03 | 심연의 습격 | 레이드 전투 | 140 | Cm | 최고 강도, 풀 오케스트라, 합창 | `Raid boss combat music, 140 BPM, C minor, full hybrid orchestra with massive choir, relentless percussion, epic brass fanfares, maximum intensity, phase-ready boss loop structure, no vocals` |

---

## 4) 신규 BGM — 시스템/UI (5곡)

| ID | 트랙명 | 구분 | BPM | 키 | 분위기 | AI 프롬프트 |
|----|--------|------|-----|-----|--------|-----------|
| BGM-SYS-01 | 에테르나의 여명 | 타이틀/로비 | 80 | Cm→Em | 웅장+신비, 게임 첫인상 | `Dark fantasy RPG title screen music, 80 BPM, C minor resolving to E minor, majestic orchestral opening, memory crystal chimes, building from intimate to grand, emotional and mysterious, loop-friendly, no vocals` |
| BGM-SYS-02 | 기억의 정원 | 메인 메뉴 | 72 | Am | 차분, 피아노 중심, 기억 테마 | `Main menu ambient music, 72 BPM, A minor, solo piano with soft string pad, gentle memory crystal bell accents, peaceful but melancholic, suitable for menu navigation, seamless loop, no vocals` |
| BGM-SYS-03 | 대장간의 불꽃 | 강화/제작 | 90 | Dm | 리드미컬, 망치 타격 요소, 집중 | `Blacksmith workshop music, 90 BPM, D minor, rhythmic anvil hits as percussion, warm strings and bellows drone, focused crafting atmosphere, loop-friendly, no vocals` |
| BGM-SYS-04 | 길드의 유대 | 길드 홀 | 88 | G | 밝고 따뜻, 동료 의식, 현+관 | `Guild hall gathering music, 88 BPM, G major, warm fiddle lead with lute and light percussion, camaraderie and warmth, tavern-meets-hall atmosphere, loop-friendly, no vocals` |
| BGM-SYS-05 | 승리의 기록 | 결과/보상 | 100 | C | 승리, 팡파르, 보상감 | `Victory fanfare and results screen music, 100 BPM, C major, triumphant brass fanfare into celebratory strings and light percussion, rewarding and uplifting, short intro (8 bars) into calm looping section, no vocals` |

---

## 5) 신규 BGM — 시즌 3 "기억의 심연" (5곡)

| ID | 트랙명 | 구분 | BPM | 키 | 분위기 | AI 프롬프트 |
|----|--------|------|-----|-----|--------|-----------|
| BGM-ABY-01 | 심연으로의 하강 | 탐색 | 64 | C#m | 극도의 압박, 심해 압력, 느린 펄스 | `Abyssal deep descent exploration BGM, 64 BPM, C# minor, sub-bass drone with distant sonar pings, pressure-building low strings, sporadic memory fragment chimes, claustrophobic and vast, underwater reverb space, seamless loop, no vocals` |
| BGM-ABY-02 | 파편의 춤 | 탐색(활성) | 78 | Em | 부유하는 기억, 신비+불안, 결정 음색 | `Memory fragment active zone BGM, 78 BPM, E minor, crystalline arpeggios with floating synth pads, occasional dissonant string swells, beautiful but unsettling, memories swirling atmosphere, loop-friendly, no vocals` |
| BGM-ABY-03 | 잔류 의지 | 보스 | 134 | Fm | 레테 잔류체 전투, 과거 보스 라이트모티프 변형 | `Residual Lethe boss battle theme, 134 BPM, F minor, fragmented leitmotifs from previous boss themes woven into aggressive new arrangement, distorted choir, glitched orchestral hits, memory-corruption audio effects, boss loop structure, no vocals` |
| BGM-ABY-04 | 시간의 종말 | 보스(최종) | 142 | Bbm | 시즌3 최종 보스, 시간 붕괴 사운드 | `Season 3 final boss theme, 142 BPM, Bb minor, time-collapse sound design with reversed orchestral elements, massive sub drops, clock mechanism percussion, building to overwhelming climax, phase transitions, no vocals` |
| BGM-ABY-05 | 기억의 귀환 | 엔딩 | 76 | Db→F | 구원, 기억 복구, 감동 | `Season 3 ending theme, 76 BPM, Db major resolving to F major, redemptive orchestral swell from solo cello, memory crystal bells returning, bittersweet to hopeful, cinematic resolution, fading tail for credits, no vocals` |

---

## 6) 신규 BGM — 컷씬/이벤트 (3곡)

| ID | 트랙명 | 구분 | BPM | 키 | 분위기 | AI 프롬프트 |
|----|--------|------|-----|-----|--------|-----------|
| BGM-EVT-01 | 각성의 순간 | 전직 컷씬 | 90 | Am→Em | 성장, 변환, 파워업 | `Class advancement cutscene music, 90 BPM, A minor to E minor, building anticipation with soft strings into triumphant brass reveal, magical transformation energy, power awakening moment, 60-second one-shot with tail, no vocals` |
| BGM-EVT-02 | 이별의 기억 | 비극 컷씬 | 68 | Fm | 슬픔, 동료 이별/죽음, 눈물 | `Tragic cutscene music, 68 BPM, F minor, solo violin lament with piano accompaniment, building to full string section emotional climax, heartbreak and loss, 90-second one-shot with fade, no vocals` |
| BGM-EVT-03 | 대망각의 진실 | 계시 컷씬 | 82 | Cm | 충격, 진실 폭로, 세계관 반전 | `Revelation cutscene music, 82 BPM, C minor, unsettling low brass with memory crystal motif, building tension with dissonant strings, shocking revelation impact hit, aftermath of quiet dread, 2-minute one-shot, no vocals` |

---

## 7) 무한 던전 BGM (2곡)

| ID | 트랙명 | 구분 | BPM | 키 | 분위기 | AI 프롬프트 |
|----|--------|------|-----|-----|--------|-----------|
| BGM-END-01 | 끝없는 시련 | 무한 던전 | 110 | Am | 꾸준한 긴장, 점진적 강화, 장시간 루프 | `Endless dungeon exploration combat BGM, 110 BPM, A minor, layered build-up structure starting minimal and adding instruments every 30 seconds, adaptive intensity, tense but sustainable for long sessions, dark dungeon atmosphere, seamless loop, no vocals` |
| BGM-END-02 | 100층의 끝 | 100층 보스 | 148 | Em | 최고 강도, 도전의 정점 | `Ultimate challenge floor 100 boss music, 148 BPM, E minor, fastest and most intense track in the game, full hybrid orchestra with electronic elements, relentless double-kick drums, ascending chromatic brass, choir singing in canon, the pinnacle of challenge, boss loop, no vocals` |

---

## 8) 전체 트랙 목록 요약

| 카테고리 | 기존 곡 수 | 신규 곡 수 | 합계 |
|---------|----------|----------|------|
| 지역 탐색 | 13 | 2 (심연) | 15 |
| 일반 전투 | 1 | 2 (공용+엘리트) | 3 |
| 보스 전투 | 5 | 4 (레이드+심연+무한) | 9 |
| 시스템/UI | 0 | 5 | 5 |
| 컷씬/이벤트 | 0 | 3 | 3 |
| 무한 던전 | 0 | 2 | 2 |
| **합계** | **19** | **18** | **37** |

---

## 9) 지역 간 전이 규칙

| 전이 유형 | 방식 | 시간 |
|----------|------|------|
| 같은 지역 내 | 연속 재생 | - |
| 지역 → 지역 | 크로스페이드 | 2초 |
| 탐색 → 전투 | 탐색 BGM 볼륨 다운 → 전투 BGM 페이드 인 | 0.5초 |
| 전투 → 탐색 | 전투 BGM 페이드 아웃 → 탐색 BGM 볼륨 복귀 | 1.5초 |
| 탐색 → 보스 | 탐색 BGM 정지 → 0.5초 무음 → 보스 BGM 시작 | 1초 |
| 보스 Phase 전환 | 현재 BGM 스팅어 → 다음 Phase BGM | 즉시 |
| 필드 → 메뉴 | 필드 BGM 볼륨 50% → 메뉴 BGM 오버레이 | 0.3초 |

---

## 10) 품질 체크리스트

- [ ] 루프 포인트 클릭 노이즈 0
- [ ] 지역별 악기 아이덴티티 중복 최소화
- [ ] 보스 페이즈 전환 시 BPM/키 변화가 컷신 타이밍과 정합
- [ ] 대사 구간(특히 챕터5 페이즈3)에서 BGM 주파수 침범 최소화
- [ ] LUFS 기준 통일 (탐색 < 전투 < 보스 우선순위)
- [ ] 모든 트랙 OGG 변환 후 품질 검증
- [ ] 크로스페이드 전이 테스트 (모든 지역 조합)
