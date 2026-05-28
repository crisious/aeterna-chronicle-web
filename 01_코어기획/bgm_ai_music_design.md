# 에테르나 크로니클 — BGM AI Music Design Index

> 작성일: 2026-03-04 | 버전: v1.1  
> 목적: 월드맵 지역 파일에 분산된 Audio ACE Step BGM 프롬프트를 중앙 인덱스로 통합 관리

> **업데이트 로그**
> | 버전 | 날짜 | 수정 내용 |
> |------|------|-----------|
> | v1.0 | 2026-03-04 | 최초 작성 — 월드맵 분산 BGM 프롬프트 18곡 + 인트로 BGM 가이드 인덱스화 |
> | v1.1 | 2026-03-04 | 각 BGM별 Audio ACE Step 1.5 텍스트 프롬프트 추가 (ID 단위) |

---

## 1) 운영 원칙

- 이 문서는 **인덱스 허브**다.  
  실제 상세 프롬프트 원문은 각 지역 파일(`월드맵/*.md`)에 유지한다.
- 곡 수정은 원칙적으로 **원본(지역 파일) 우선 수정** 후, 여기 인덱스만 갱신한다.
- 엔딩/시나리오 조건이 바뀌면 관련 보스곡 태그를 먼저 점검한다.

---

## 2) BGM 카탈로그 (지역별)

| ID | 구분 | 트랙명 (KR / EN) | 사용 구간 | 소스 파일 |
|----|------|------------------|-----------|-----------|
| BGM-ERB-01 | 탐색 | 망각의 거리 / Streets of Oblivion | 에레보스 필드 탐색 | `월드맵/에레보스.md` |
| BGM-ERB-02 | 전투 | 기억 유령의 습격 / Memory Phantom Assault | 에레보스 일반 전투 | `월드맵/에레보스.md` |
| BGM-ERB-03 | 보스 | 기억의 골렘 / Memory Golem | 챕터1 보스전 | `월드맵/에레보스.md` |
| BGM-SYL-01 | 탐색(낮) | 기억이 자라는 숲 / Forest of Growing Memory | 실반헤임 주간 탐색 | `월드맵/실반헤임.md` |
| BGM-SYL-02 | 탐색(밤) | 발광균의 밤 / Night of Bioluminescence | 실반헤임 야간 탐색 | `월드맵/실반헤임.md` |
| BGM-SYL-03 | 보스 | 말라투스 — 천년의 기억 / Malatus — A Thousand Years of Memory | 챕터2 보스전 | `월드맵/실반헤임.md` |
| BGM-SOL-01 | 탐색(낮) | 불꽃의 땅 / Land of Flames | 솔라리스 주간 탐색 | `월드맵/솔라리스_사막.md` |
| BGM-SOL-02 | 탐색(밤) | 에테르 결정 사막의 밤 / Ether Crystal Desert Night | 솔라리스 야간 탐색 | `월드맵/솔라리스_사막.md` |
| BGM-SOL-03 | 보스 | 라와르 — 3천 년의 배회 / Lawar — 3000 Years of Wandering | 챕터3 보스전 | `월드맵/솔라리스_사막.md` |
| BGM-BOR-01 | 탐색 | 시간이 멈춘 땅 / Land Where Time Stopped | 북방 영원빙원 일반 탐색 | `월드맵/북방_영원빙원.md` |
| BGM-BOR-02 | 탐색(오로라) | 빙정 속의 기억 / Memories in the Ice | 북방 오로라 이벤트 구간 | `월드맵/북방_영원빙원.md` |
| BGM-ARG-01 | 탐색(상류층) | 황금 첨탑 / Golden Spire | 아르겐티움 황궁/상류층 | `월드맵/아르겐티움.md` |
| BGM-ARG-02 | 탐색(하층) | 탑 아래의 그림자 / Shadows Below the Spire | 아르겐티움 하층/빈민가 | `월드맵/아르겐티움.md` |
| BGM-ARG-03 | 보스 | 케인 — 굳어버린 슬픔 / Kain — Grief Turned to Ice | 챕터4 보스전 | `월드맵/아르겐티움.md` |
| BGM-BRT-01 | 탐색(항구) | 자유항의 아침 안개 / Morning Fog of the Free Harbor | 브리탈리아 항구 | `월드맵/브리탈리아_자유항.md` |
| BGM-BRT-02 | 탐색(선술집) | 녹슨 나침반의 밤 / Night at the Rusty Compass | 브리탈리아 선술집/정보 수집 | `월드맵/브리탈리아_자유항.md` |
| BGM-PLT-01 | 탐색 | 망각의 고원 / Plateau of Oblivion | 챕터5 진입 탐색 | `월드맵/망각의_고원.md` |
| BGM-PLT-02 | 보스(Phase 1~2) | 레테 — 망각의 신 / Lethe — God of Oblivion | 최종전 페이즈 1~2 | `월드맵/망각의_고원.md` |
| BGM-PLT-03 | 보스(Phase 3) | 기억되고 싶었어 / I Wanted to Be Remembered | 최종전 페이즈 3 | `월드맵/망각의_고원.md` |

---

## 3) Audio ACE Step 1.5 텍스트 프롬프트 (트랙별)

> 공통 권장 태그: dark fantasy RPG, orchestral hybrid, cinematic, loop-friendly, game BGM, no vocals

### BGM-ERB-01 — 망각의 거리 / Streets of Oblivion
`Audio ACE Step 1.5 Prompt:`
Dark fantasy exploration BGM for a ruined ghost city, 72 BPM, D minor, sparse music box motif with distant cello and low drone, cold foggy atmosphere, subtle memory-echo shimmer, minimal percussion, seamless loop for field exploration, no vocals.

### BGM-ERB-02 — 기억 유령의 습격 / Memory Phantom Assault
`Audio ACE Step 1.5 Prompt:`
Combat cue in a forgotten city, 118 BPM, D minor, urgent staccato strings and taiko-lite hits, spectral choir pad in background, rising tension but medium intensity for repeat battles, loopable 90s structure, no vocals.

### BGM-ERB-03 — 기억의 골렘 / Memory Golem
`Audio ACE Step 1.5 Prompt:`
Chapter 1 boss music, 128 BPM, C# minor, heavy low strings, metallic impacts, ancient stone golem rhythm motif, dramatic brass swells with restrained choir, phase-ready structure with clear loop point, no vocals.

### BGM-SYL-01 — 기억이 자라는 숲 / Forest of Growing Memory
`Audio ACE Step 1.5 Prompt:`
Daytime enchanted forest exploration track, 84 BPM, G minor, wooden flute lead with soft harp arpeggio and warm strings, mystical but calm, organic ambience, gentle pulse for long traversal, seamless loop, no vocals.

### BGM-SYL-02 — 발광균의 밤 / Night of Bioluminescence
`Audio ACE Step 1.5 Prompt:`
Night forest ambient exploration BGM, 76 BPM, E minor, glassy bells and airy synth pad with light ethnic percussion, bioluminescent magical feeling, dreamy and slightly melancholic tone, loop-friendly, no vocals.

### BGM-SYL-03 — 말라투스 — 천년의 기억 / Malatus — A Thousand Years of Memory
`Audio ACE Step 1.5 Prompt:`
Chapter 2 boss theme, 122 BPM, F minor, primal drum ostinato, deep choir textures, distorted wood resonance and string tremolo, ancient tree guardian identity, escalating mid-boss intensity, clean loop end, no vocals.

### BGM-SOL-01 — 불꽃의 땅 / Land of Flames
`Audio ACE Step 1.5 Prompt:`
Desert daytime exploration track, 96 BPM, A minor, oud-like plucked motif with frame drum groove and warm brass accents, heat haze atmosphere, adventurous and tense, suitable for long walking loop, no vocals.

### BGM-SOL-02 — 에테르 결정 사막의 밤 / Ether Crystal Desert Night
`Audio ACE Step 1.5 Prompt:`
Desert night exploration BGM with glowing crystals, 82 BPM, C minor, shimmering mallet synth, soft choir pad and low pulse bass, mysterious cosmic beauty, wide stereo ambience, seamless looping, no vocals.

### BGM-SOL-03 — 라와르 — 3천 년의 배회 / Lawar — 3000 Years of Wandering
`Audio ACE Step 1.5 Prompt:`
Chapter 3 boss theme, 130 BPM, B minor, regal but broken orchestral motif, aggressive percussion, lamenting solo cello phrases, fallen king tragedy energy, high-intensity combat loop with distinct cadence, no vocals.

### BGM-BOR-01 — 시간이 멈춘 땅 / Land Where Time Stopped
`Audio ACE Step 1.5 Prompt:`
Frozen north exploration BGM, 70 BPM, D minor, slow bowed strings with icy bell textures and deep wind drone, time-slowing sensation, solemn and spacious mix, minimal rhythm, seamless loop, no vocals.

### BGM-BOR-02 — 빙정 속의 기억 / Memories in the Ice
`Audio ACE Step 1.5 Prompt:`
Aurora event exploration music, 78 BPM, F# minor, crystalline plucks, soft female-like choir pad (wordless), distant horn swells, memory-reversal wonder and sadness, long evolving loop, no vocals.

### BGM-ARG-01 — 황금 첨탑 / Golden Spire
`Audio ACE Step 1.5 Prompt:`
Imperial capital upper district exploration, 92 BPM, E minor, elegant chamber strings with clockwork percussion and subtle brass, steampunk aristocratic mood, polished and controlled tension, loop-friendly, no vocals.

### BGM-ARG-02 — 탑 아래의 그림자 / Shadows Below the Spire
`Audio ACE Step 1.5 Prompt:`
Lower district and slum exploration BGM, 88 BPM, C minor, muted piano motif with gritty percussion and low synth drone, noir stealth feeling, urban despair under imperial light, seamless loop, no vocals.

### BGM-ARG-03 — 케인 — 굳어버린 슬픔 / Kain — Grief Turned to Ice
`Audio ACE Step 1.5 Prompt:`
Chapter 4 boss track, 132 BPM, C# minor, hard-hitting hybrid drums, sharp string ostinato, tragic villain leitmotif on solo violin, relentless pursuit energy, boss loop with dramatic break section, no vocals.

### BGM-BRT-01 — 자유항의 아침 안개 / Morning Fog of the Free Harbor
`Audio ACE Step 1.5 Prompt:`
Harbor exploration morning theme, 86 BPM, G minor, accordion and light fiddle over brushed percussion, misty sea breeze ambience, bustling yet suspicious free-port mood, loopable field track, no vocals.

### BGM-BRT-02 — 녹슨 나침반의 밤 / Night at the Rusty Compass
`Audio ACE Step 1.5 Prompt:`
Tavern and information-gathering BGM, 90 BPM, D minor, upright bass groove, muted trumpet, smoky jazz-dungeon hybrid texture, warm but dangerous undertone, conversation-friendly mix, loop-friendly, no vocals.

### BGM-PLT-01 — 망각의 고원 / Plateau of Oblivion
`Audio ACE Step 1.5 Prompt:`
Final chapter pre-boss exploration music, 74 BPM, C minor, ritualistic low drum pulse, dissonant strings and distant choir haze, impending apocalypse atmosphere, heavy reverb space, seamless loop, no vocals.

### BGM-PLT-02 — 레테 — 망각의 신 / Lethe — God of Oblivion
`Audio ACE Step 1.5 Prompt:`
Final boss phase 1-2 theme, 138 BPM, C minor, massive hybrid orchestra with dark choir and sub impacts, cosmic dread and divine scale, aggressive rhythm with clear phase transition markers, boss loop, no vocals.

### BGM-PLT-03 — 기억되고 싶었어 / I Wanted to Be Remembered
`Audio ACE Step 1.5 Prompt:`
Final boss phase 3 emotional climax, 96 BPM, A minor to C major lift, solo piano and cello opening into full bittersweet orchestral swell, redemption and sorrow blend, cinematic ending-combat cue with loop-capable tail, no vocals.

---

## 4) 인트로 영상 BGM 매핑

| 구간 | 권장 BGM | 소스 |
|------|-----------|------|
| 0:00~0:10 (씬01~02) | 저강도 앰비언트 + 저역 드론 (전용 인트로) | `인트로_영상_디자인.md` |
| 0:10~0:22 (씬03) | 긴장 상승용 트랜지션 (전용 인트로) | `인트로_영상_디자인.md` |
| 0:22~0:37 (씬04~05) | 에레보스 탐색 계열 (오르골+첼로) | `인트로_영상_디자인.md`, `월드맵/에레보스.md` |
| 0:37~0:45 (씬06~07) | 타이틀 전용 엔딩 스팅어 | `인트로_영상_디자인.md` |

---

## 5) 품질 체크리스트 (Audio ACE Step)

- [ ] 루프 포인트 클릭 노이즈 없음
- [ ] 지역별 악기 아이덴티티 중복 최소화
- [ ] 보스 페이즈 전환 시 BPM/키 변화가 컷신 타이밍과 정합
- [ ] 대사 구간(특히 챕터5 페이즈3)에서 BGM 침범 최소화
- [ ] 마스터링 LUFS 기준 통일 (탐색 < 전투 < 보스 우선순위)

---

## 6) 다음 확장 백로그

- 시스템 BGM (메뉴/인벤토리/강화/상점/길드/로비)
- 이벤트 BGM (엔딩 A/B/C/D, 패배 루트 전용 테마)
- 전투 공용 BGM 계층화 (일반/엘리트/레이드)
- 지역 간 전이용 브릿지 트랙 제작

> 참고: 기존 분산 수록 곡을 유지하면서, 이 인덱스를 Notion 동기화용 요약 소스로 사용한다.
