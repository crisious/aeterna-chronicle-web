# 에테르나 크로니클 — API 문서 (v1.0 최종)

> 최종 갱신: 2026-03-14 (P28)
> 서버: Express + Socket.IO + Prisma ORM
> 인증: JWT (RS256)

---

## 인증 (Auth)

| Method | Path | 설명 |
|--------|------|------|
| POST | /api/auth/register | 회원가입 |
| POST | /api/auth/login | 로그인 → access + refresh 토큰 |
| POST | /api/auth/refresh | 토큰 갱신 (rotation) |
| POST | /api/auth/logout | 로그아웃 (refresh 무효화) |
| DELETE | /api/auth/account | 계정 삭제 |

## 캐릭터 (Character)

| Method | Path | 설명 |
|--------|------|------|
| POST | /api/character/create | 캐릭터 생성 (6클래스) |
| GET | /api/character/:id | 캐릭터 정보 조회 |
| GET | /api/character/list | 내 캐릭터 목록 |
| PATCH | /api/character/:id | 캐릭터 정보 수정 |
| DELETE | /api/character/:id | 캐릭터 삭제 |

## 전투 (Combat)

| Method | Path | 설명 |
|--------|------|------|
| POST | /api/combat/start | 전투 시작 |
| POST | /api/combat/action | 전투 액션 (공격/스킬/아이템) |
| GET | /api/combat/result/:battleId | 전투 결과 조회 |
| POST | /api/combat/auto-resolve | 자동 전투 해결 |
| POST | /api/combat/flee | 전투 도주 |

## 월드 (World)

| Method | Path | 설명 |
|--------|------|------|
| POST | /api/world/enter-zone | 존 진입 |
| POST | /api/world/move | 이동 |
| GET | /api/world/zones | 존 목록 |
| GET | /api/world/zone/:id | 존 상세 정보 |

## 퀘스트 (Quest)

| Method | Path | 설명 |
|--------|------|------|
| GET | /api/quest/list | 퀘스트 목록 (active/completed) |
| POST | /api/quest/accept | 퀘스트 수락 |
| POST | /api/quest/complete | 퀘스트 완료 |
| POST | /api/quest/abandon | 퀘스트 포기 |

## 인벤토리 (Inventory)

| Method | Path | 설명 |
|--------|------|------|
| GET | /api/inventory/:characterId | 인벤토리 조회 |
| POST | /api/inventory/equip | 장비 장착 |
| POST | /api/inventory/unequip | 장비 해제 |
| POST | /api/inventory/use | 아이템 사용 |
| POST | /api/inventory/drop | 아이템 버리기 |

## 상점 (Shop)

| Method | Path | 설명 |
|--------|------|------|
| GET | /api/shop/:shopId | 상점 아이템 목록 |
| POST | /api/shop/buy | 아이템 구매 |
| POST | /api/shop/sell | 아이템 판매 |

## 던전 (Dungeon)

| Method | Path | 설명 |
|--------|------|------|
| GET | /api/dungeon/list | 던전 목록 (69개) |
| POST | /api/dungeon/enter | 던전 진입 |
| POST | /api/dungeon/clear | 던전 클리어 |

## 소셜 (Social)

| Method | Path | 설명 |
|--------|------|------|
| POST | /api/party/create | 파티 생성 |
| POST | /api/party/invite | 파티 초대 |
| POST | /api/party/accept | 파티 초대 수락 |
| POST | /api/party/leave | 파티 탈퇴 |
| POST | /api/trade/request | 거래 요청 |
| POST | /api/trade/accept | 거래 수락 |
| POST | /api/trade/offer | 거래 제안 |
| POST | /api/trade/confirm | 거래 확정 |
| POST | /api/auction/list | 경매 등록 |
| POST | /api/auction/bid | 경매 입찰 |
| GET | /api/auction/search | 경매 검색 |
| POST | /api/guild/create | 길드 생성 |
| POST | /api/guild/join | 길드 가입 |
| POST | /api/guild/leave | 길드 탈퇴 |
| GET | /api/guild/:id | 길드 정보 |

## 채팅 (Chat)

| Method | Path | 설명 |
|--------|------|------|
| POST | /api/chat/send | 메시지 전송 |
| POST | /api/chat/whisper | 귓속말 |
| GET | /api/chat/history | 채팅 기록 |

## 우편 (Mail)

| Method | Path | 설명 |
|--------|------|------|
| POST | /api/mail/send | 우편 전송 |
| GET | /api/mail/inbox | 수신함 |
| POST | /api/mail/read | 우편 읽기 |
| DELETE | /api/mail/:id | 우편 삭제 |

## 기타

| Method | Path | 설명 |
|--------|------|------|
| GET | /api/ranking/list | 랭킹 조회 |
| POST | /api/pvp/match | PvP 매칭 |
| GET | /api/achievement/list | 업적 목록 |
| POST | /api/cosmetic/equip | 코스메틱 장착 |
| POST | /api/error/report | 에러 리포트 전송 |

---

## Socket.IO 이벤트

### 클라이언트 → 서버
- `player:move` — 이동 동기화
- `combat:action` — 전투 액션
- `chat:message` — 채팅
- `party:sync` — 파티 동기화

### 서버 → 클라이언트
- `world:update` — 월드 상태 (delta)
- `combat:update` — 전투 상태
- `chat:broadcast` — 채팅 수신
- `notification:push` — 알림
- `party:update` — 파티 상태

---

**총 44 REST 라우트 + 8 Socket 이벤트 | Prisma 78 모델**
