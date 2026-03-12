# P17-01: Steam 스토어 페이지 기획

> 작성일: 2026-03-13 | 버전: v1.0  
> Phase: P17 (출시 준비 + 접근성) | 순서: 309

---

## 1. 캡슐 아트 사양

| 유형 | 해상도 | 용도 | 비고 |
|------|--------|------|------|
| Header Capsule | 460×215 | 스토어 메인 배너 | 로고+키아트, 텍스트 최소화 |
| Small Capsule | 231×87 | 검색 결과/위시리스트 | 로고만, 배경 단순화 |
| Main Capsule | 616×353 | 상세 페이지 상단 | 풀 키아트+로고+태그라인 |
| Hero Capsule | 2108×460 | 특집 배너 | 와이드 파노라마, 캐릭터 6종 실루엣 |
| Library Capsule | 600×900 | 라이브러리 | 세로형 키아트 |
| Library Hero | 3840×1240 | 라이브러리 히어로 | 초와이드 환경 아트 |

### 키아트 구성 가이드
- **중앙**: 에리언(주인공) + 에테르 결정 발광
- **좌측**: ether_knight / memory_weaver / shadow_weaver 실루엣
- **우측**: memory_breaker / time_guardian / void_wanderer 실루엣
- **배경**: 에레보스 폐허 → 실반헤임 숲 → 솔라리스 사막 그라데이션
- **하단**: 게임 로고 + 태그라인 "기억은 사라져도, 이야기는 남는다."
- **색조**: 에테르 블루(#4A90D9) 주조 + 암부 퍼플(#2D1B69)

---

## 2. 스크린샷 선정 (15장)

| # | 장면 | 해상도 | 강조 요소 |
|---|------|--------|----------|
| 1 | 에레보스 첫 전투 | 1920×1080 | 실시간 전투 UI + 스킬 발동 |
| 2 | 실반헤임 숲 탐색 | 1920×1080 | 환경 아트 + 파티클 |
| 3 | 솔라리스 사막 보스전 | 1920×1080 | 보스 패턴 + 파티 구성 |
| 4 | 클래스 선택 화면 | 1920×1080 | 6종 클래스 일러스트 |
| 5 | 스킬트리 UI | 1920×1080 | 깊은 커스터마이즈 |
| 6 | PvP 아레나 | 1920×1080 | 1v1 실시간 전투 |
| 7 | 길드 레이드 | 1920×1080 | 다인 레이드 보스 |
| 8 | 인벤토리 + 장비 | 1920×1080 | 아이템 등급 시스템 |
| 9 | 아르겐티움 황궁 | 1920×1080 | 시나리오 컷신 |
| 10 | 던전 입장 | 1920×1080 | 던전 선택 UI |
| 11 | 제작 시스템 | 1920×1080 | 크래프팅 인터페이스 |
| 12 | 펫 동행 | 1920×1080 | 펫 시스템 |
| 13 | 기억의 심연 해저 | 1920×1080 | 시즌 3 환경 |
| 14 | 시간의 균열 | 1920×1080 | 시즌 4 시공왜곡 연출 |
| 15 | 엔딩 분기 선택 | 1920×1080 | 스토리 선택지 UI |

---

## 3. 태그 전략

### 핵심 태그 (필수)
- RPG, Action RPG, JRPG, Turn-Based Strategy, Story Rich
- Fantasy, Dark Fantasy, Anime, 2D, Pixel Art
- Singleplayer, Online Co-Op, PvP

### 보조 태그 (권장)
- Character Customization, Skill Tree, Crafting
- Dungeon Crawler, Boss Rush, Loot
- Emotional, Choices Matter, Multiple Endings
- Atmospheric, Beautiful, Great Soundtrack

### 유저 정의 태그 (기대)
- Memory, Amnesia, Korean RPG, Web-Based

---

## 4. 시스템 요구사항

### 최소 사양 (WebGL 기반)
| 항목 | 사양 |
|------|------|
| OS | Windows 10 64-bit / macOS 10.15+ / Ubuntu 20.04+ |
| 프로세서 | Intel Core i3-6100 / AMD Ryzen 3 1200 |
| 메모리 | 4 GB RAM |
| 그래픽 | WebGL 2.0 지원 브라우저 (Chrome 80+, Firefox 78+, Edge 88+) |
| 저장공간 | 2 GB |
| 네트워크 | 광대역 인터넷 연결 |
| 추가사항 | 하드웨어 가속 활성화 필요 |

### 권장 사양
| 항목 | 사양 |
|------|------|
| OS | Windows 11 / macOS 13+ |
| 프로세서 | Intel Core i5-8400 / AMD Ryzen 5 2600 |
| 메모리 | 8 GB RAM |
| 그래픽 | 전용 GPU (GTX 1050 이상) + Chrome 최신 버전 |
| 저장공간 | 4 GB |
| 네트워크 | 광대역 인터넷 연결 |

---

## 5. 스토어 설명문

### 짧은 설명 (300자, 한국어)

> 대망각이 세계를 덮친 지 212년. 당신은 에리언 — 잊혀진 기억을 되살리는 마지막 기억술사. 4개의 신성 파편을 찾아 9개 지역을 횡단하고, 6종 클래스로 전투하며, 기억과 망각 사이에서 세계의 운명을 결정하라. 실시간 반자동 전투 RPG.

### 짧은 설명 (300자, 영어)

> 212 years since the Great Oblivion consumed the world. You are Aerian — the last mnemonist who can restore lost memories. Seek four divine fragments across nine regions, fight with six classes, and decide the fate of a world torn between memory and oblivion. Real-time semi-auto combat RPG.

### 긴 설명 (한국어, 4000자)

**🌍 세계관**

대망각 — 3,200년 전, 신들의 기억이 소멸하고 세계는 망각의 안개에 뒤덮였다. 에테르 결정만이 과거의 흔적을 품고 있으며, 기억의 파편을 찾는 자만이 진실에 닿을 수 있다.

당신은 에리언. 칸텔라 사건으로 기억을 잃은 채 에레보스의 폐허에서 눈을 뜬다. 마에스트로 크리오의 인도 아래, 4개의 신성 기억 파편을 찾아 대륙을 횡단하는 여정이 시작된다.

**⚔️ 6종 클래스**

- **에테르 기사** (Ether Knight) — 에테르로 강화된 검과 방패의 전사
- **기억 직조자** (Memory Weaver) — 기억의 실로 치유와 방어를 엮는 힐러
- **그림자 직조자** (Shadow Weaver) — 어둠 속에서 치명적 일격을 가하는 암살자
- **기억 파쇄자** (Memory Breaker) — 기억을 무기화하는 근접 파괴자
- **시간 수호자** (Time Guardian) — 시간의 흐름을 조종하는 지원 마법사
- **허공 방랑자** (Void Wanderer) — 차원의 틈을 넘나드는 원거리 딜러

**🗺️ 9+1개 지역**

에레보스의 폐허부터 실반헤임의 기억의 숲, 솔라리스의 불꽃 사막, 아르겐티움 제국의 심장, 북방 영원빙원의 얼어붙은 기억, 브리탈리아의 자유항, 망각의 고원까지 — 그리고 시즌 업데이트로 무한 안개해, 기억의 심연, 시간의 균열이 열린다.

**🎮 핵심 게임플레이**

- **실시간 반자동 전투**: 스킬 타이밍과 조합이 핵심. 6종 클래스 × 30+스킬 조합
- **65종 던전**: 일반/엘리트/레이드 던전. 최대 8인 레이드 보스 8종
- **4+1 엔딩**: 기억과 망각 사이의 선택이 엔딩을 결정. 숨겨진 진엔딩 포함
- **PvP 시스템**: 랭킹 아레나 + 시즌 보상
- **제작 시스템**: 300+레시피, 7등급 장비
- **펫 시스템**: 동행 펫 육성 + 전투 참여
- **길드 시스템**: 길드 레이드 + 길드 전쟁 + 거점 점령

**🛠️ 기술 특징**

- PC 웹 브라우저에서 즉시 플레이 (설치 불필요)
- Unity WebGL 기반 고품질 2D 그래픽
- 실시간 멀티플레이어 (WebSocket)
- 3개 언어 지원 (한국어/영어/일본어)
- 클라우드 세이브 + 크로스 디바이스

### 긴 설명 (영어, 4000자)

**🌍 The World**

The Great Oblivion — 3,200 years ago, the memories of gods were annihilated and the world was shrouded in the fog of forgetting. Only Ether Crystals hold traces of the past, and only those who seek the memory fragments can reach the truth.

You are Aerian. After the Cantella Incident, you awaken with no memories in the ruins of Erebos. Guided by Maestro Clio (age 212), you begin a journey across the continent to find four divine memory fragments.

**⚔️ Six Classes**

- **Ether Knight** — A warrior wielding ether-enhanced sword and shield
- **Memory Weaver** — A healer who weaves healing and defense from memory threads
- **Shadow Weaver** — An assassin dealing lethal strikes from the darkness
- **Memory Breaker** — A melee destroyer who weaponizes memories
- **Time Guardian** — A support mage who manipulates the flow of time
- **Void Wanderer** — A ranged dealer who traverses dimensional rifts

**🗺️ 9+1 Regions**

From the ruins of Erebos to Silvheim's Memory Forest, Solaris Desert, the heart of the Argentium Empire, the Frozen North, the free port of Britalia, and the Plateau of Oblivion — with seasonal updates adding the Infinite Mist Sea, Abyss of Memories, and Temporal Rift.

**🎮 Core Gameplay**

- **Real-time semi-auto combat**: Skill timing and combos are key. 6 classes × 30+ skills
- **65 dungeons**: Normal/Elite/Raid. Up to 8-player raids with 8 raid bosses
- **4+1 endings**: Your choices between memory and oblivion determine the ending
- **PvP system**: Ranked arena + seasonal rewards
- **Crafting**: 300+ recipes, 7 item tiers
- **Pet system**: Companion pets with growth and combat participation
- **Guild system**: Guild raids + guild wars + territory conquest

---

## 6. Early Access 판단

### 권장: ❌ 정식 출시

**근거**:
- P0~P16 (308 티켓) 완료, 콘텐츠 완성도 높음
- 4시즌 + 8챕터 + 65던전 — EA로 내놓기에 과분한 콘텐츠 양
- EA의 "미완성" 이미지가 브랜드에 불리
- 정식 출시 후 시즌 5를 첫 대형 업데이트로 활용

### EA 고려 조건 (만약 선택한다면)
- 시즌 1~3(챕터 1~7)만 포함, 시즌 4를 정식 출시 시 추가
- EA 기간: 최대 6개월
- EA 할인: 15~20%

---

## 7. 가격 전략

| 시장 | 가격 | 비고 |
|------|------|------|
| 글로벌 | $14.99 USD | RPG 인디 평균 $15~20 |
| 한국 | ₩16,500 | 환율 대비 소폭 할인 |
| 일본 | ¥1,980 | 일본 RPG 시장 가격대 |
| 출시 할인 | -15% ($12.74) | 첫 2주 |
| 위시리스트 알림 | 출시 1주 전 | Steam 자동 |

---

## 8. 위시리스트 전환 전략

1. **D-90**: 스토어 페이지 공개 + "Coming Soon" 위시리스트 수집 시작
2. **D-60**: 트레일러 공개 + SNS 캠페인
3. **D-30**: 데모 빌드 공개 (Steam Next Fest 참가 검토)
4. **D-14**: 프레스 릴리즈 배포
5. **D-7**: 위시리스트 알림 + 카운트다운
6. **D-Day**: 출시 + 출시 할인 + 스트리머 키 배포
