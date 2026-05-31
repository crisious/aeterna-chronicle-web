# 에테르나 크로니클 v1.0.0-rc.3 — 보안·인프라 하드닝 (Addendum)

> 버전: v1.0.0-rc.3 (Unreleased) · 스프린트: 보안·CI·DB·배포 하드닝 (2026-05-30 ~ 05-31)
> 성격: rc.3 디자인/a11y 스프린트(별도 `release_notes_v1.0-rc.3.md`)와 **병행한 인프라 하드닝**.
> 산출: PR #173 ~ #187 (15건), 전부 main 머지 · CI 녹색.

---

## 한 줄 요약

> **"표면적 성숙도를 실제 동작으로 — 배포 차단급 리스크 3종과 죽어 있던 검증 파이프라인을 닫았습니다."**

프로젝트 상태 분석에서 드러난 "구현됐으나 검증/배선 안 됨" 패턴을 정면으로 해소했습니다. 보안(IDOR), 검증(CI), 데이터 정합성(마이그레이션)의 배포 차단급 리스크를 실제 환경으로 검증하며 닫았습니다.

---

## 🔒 Security

### 서버 IDOR 전면 하드닝 (#174, #183, #185)
- **전역 인증 게이트(deny-by-default)** — 전역 인증 훅이 없어 다수 라우트가 무인증으로 `body/params` 식별자를 신뢰하던 IDOR 표면(48파일 적대적 감사에서 ~154건 확정)을 차단. `PUBLIC_ROUTES` 화이트리스트 외 모든 라우트에 유효 JWT 요구 + `request.authUserId` 주입. 플레이어/어드민 토큰 이원화 지원. **신규 라우트 자동 보호.**
- **소유권 치환 ~160 엔드포인트 / 36 라우트 파일** — 공격자 제어 식별자를 인증된 actor 로 치환. CRITICAL 6종(currency/transfer, payment·stripe/refund, npc/trade, party/reward, trade/confirm, guild role) 포함 + GM 11종 `requireAdmin` 게이트.
- **combat 세션 소유권** (#183) — combatId 기반 8개 엔드포인트에 세션 소유자 검증(1회 기록, combatId 당). uuid 라 실악용성은 낮으나 누출 대비 defense-in-depth.
- **경제 취약(골드 발행) 해소** (#185) — `/api/party/:id/reward` 가 클라이언트 `goldTotal` 을 신뢰해 임의 골드 지급이 가능했음. 전투 종료(파티 승리) 시 서버가 `rewardEngine.calculateRewards` 산정값을 **자동 지급**하도록 전환(HTTP/소켓 양쪽, combatId 당 1회 중복 방지). 취약 엔드포인트 제거.

---

## 🛠️ CI / 검증 파이프라인

### CI 부활 (#176)
CI 가 **한 번도 통과한 적 없던** 3중 결함 복구:
1. `package-lock.json` 미추적(.gitignore) → 모든 `npm ci` 가 설치 단계에서 실패 → 락파일 커밋.
2. 워크스페이스 하위 `npm ci`(npm workspaces 는 루트 락파일만 생성) → 루트 1회 `npm ci` 로 수정.
3. server 타입체크의 `@prisma/client` 의존 → `prisma generate` 단계 추가.

### 강화 (#178, #179, #181, #182)
- **Node 24/22 정렬** — `actions/checkout`·`setup-node` v5(Node 24 deprecation 대비) + 전 워크플로 `node-version` 22(`--experimental-strip-types` 툴링 요구).
- **게이트 하이그닌** — 죽은 `test:e2e`(jest 미설치) 제거 · `verify` 에 integration·data-validate 추가 · data-validator CI 연결.
- **마이그레이션 드리프트 회귀 가드** — CI 에 `migrate diff --exit-code` 추가 → schema 와 마이그레이션이 어긋나면 CI 실패.

---

## 🗄️ Database

### 마이그레이션 드리프트 해소 (#180, 실 Postgres 검증)
- `schema.prisma` 110 모델 vs 마이그레이션 이력 36 테이블 → 74개가 `db push` 전용이라 `migrate deploy` 환경에서 누락(배포 차단급).
- `migration_lock.toml` 신설 + `0015_sync_schema_drift`(74 테이블) 추가.
- **검증**: 빈 DB `migrate deploy` → 정확히 110 테이블 · `migrate diff --exit-code` → "No difference detected"(드리프트 0).
- 기존 db-push 환경 baseline 절차(`migrate resolve --applied`)도 실 Postgres 로 검증 — `docs/release/MIGRATION_DRIFT_REMEDIATION.md`.

---

## 🚀 배포 인프라

### k8s 프로덕션 Service (#186)
- `production.yml`(블루/그린 배포)이 `kubectl get svc server-green` 을 조회하고 ingress 가 `service: server-green` 을 참조하나 Service 매니페스트 부재 → 첫 태그 배포 시 health 체크 실패.
- `server-green`·`server-blue` Service 추가(selector 가 각 Deployment pod 라벨과 일치). 매니페스트 정합성(Ingress→Service→Deployment) 로컬 검증 완료.

---

## 🧹 코드 정직화

- **dead UI/매니저 16파일 삭제** (#184, ~5.3K LOC) — 어떤 씬에도 배선되지 않은 GuildUI/GuildRaidUI/AuctionUI/TradeUI/MailUI/FriendListUI/NotificationUI/RankingUI/PartyUI/PvpUI + gameplay 매니저 체인 + ErrorBoundaryManager 제거. 코드베이스를 실제 동작 범위에 정직화.
- **dead-code API 경로 정렬** (#177) — 서버 계약에 정렬(11건) + 미구현 엔드포인트 TODO(10건).
- **README Getting Started 갱신** (#187) — Node 22 · 루트 `npm ci` · `migrate deploy`.
- **SSOT-WIRE-07** (#173) — 전투 데미지 속성 태그를 `SCENARIO_DAMAGE_TYPE_NARRATIVES` 에 연결.

---

## 검증
- `typecheck:server/client` · `lint:server`(0 errors) · `build:client` ✅
- 단위 + contract + integration **2,980 테스트** + 데이터 검증 ✅ (CI 녹색)
- 마이그레이션·k8s 매니페스트는 실 Postgres / 로컬 정합성으로 추가 검증

---

## ⬆️ 업그레이드 노트

1. **Node.js 22+ 필요** (스크립트가 `--experimental-strip-types` 사용).
2. **설치**: 루트 `npm ci` 1회 (package-lock.json 커밋됨, 워크스페이스별 install 불필요).
3. **DB**:
   - 신규 환경: `prisma migrate deploy` → 110 테이블 (검증됨).
   - 기존 db-push 환경: 최초 1회 `migrate resolve --applied <0001..0015>` baseline (`MIGRATION_DRIFT_REMEDIATION.md`).
4. **k8s**: `kubectl apply -f k8s/production/` 에 server-green/blue Service 포함 — 배포 전 `kubectl --dry-run=server` 권장.
5. **공개 API QA**: 인증 게이트 화이트리스트(`PUBLIC_ROUTES`)가 클라이언트의 비로그인 호출을 모두 포함하는지 확인(누락 시 401 — fail-safe 방향).

---

## PR 목록

| PR | 요약 |
|---|---|
| #173 | feat(ssot-wire-07) 데미지 속성 태그 |
| #174 | security: IDOR 전역 게이트 + 소유권(~160 EP) |
| #175 | docs: 마이그레이션 드리프트 가이드 |
| #176 | fix(ci): CI 복구(락파일/워크스페이스/prisma) |
| #177 | fix(client): dead-code 경로 정렬 + TODO |
| #178 | chore(ci): checkout·setup-node v5 (Node 24) |
| #179 | chore(ci): 게이트 하이그닌 + data-validator |
| #180 | fix(db): 마이그레이션 드리프트 해소(0015, 74 테이블) |
| #181 | ci: 마이그레이션 드리프트 가드 |
| #182 | chore(ci): 전 워크플로 Node 22 |
| #183 | fix(security-idor): combat 세션 소유권 |
| #184 | chore(client): dead UI 16파일 삭제(~5.3K LOC) |
| #185 | fix(economy): 전투 종료 서버 보상 자동 지급 |
| #186 | fix(k8s): server-green/blue Service |
| #187 | docs(readme): Getting Started 갱신 |

---

🛡️ Security · 🛠️ CI/Infra · 🗄️ DB — 하드닝 스프린트, 2026-05-31
