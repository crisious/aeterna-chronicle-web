# 성능 최적화 PR / 커밋 메시지 컨벤션 v1.0

> 작성: 진채봉 Editor
> 작성일: 2026-04-30
> 스프린트: Auto: 성능 최적화 — FPS·메모리·로딩 시간

---

## 1. PR 제목 — 7 스코프

```
perf(<scope>): <한 줄 요지>
```

| 스코프 | 의미 | 예시 |
|--------|------|------|
| `fps` | FPS 모니터링·핫스팟 | `perf(fps): BattleScene 파티클 풀링으로 평균 58→62fps` |
| `memory` | 메모리 누수·정리 | `perf(memory): TownScene shutdown 텍스처 해제 누락 수정` |
| `lazy` | 청크 분할·동적 import | `perf(lazy): chapter-2 어셋 진입 시 lazy 로드` |
| `bundle` | 산출물 사이즈 | `perf(bundle): pngquant 적용으로 -42% 압축` |
| `atlas` | 텍스처 아틀라스 | `perf(atlas): 전투 HUD 아이콘 24개 단일 아틀라스` |
| `gate` | CI 게이트·npm scripts | `perf(gate): perf:gate 4-AND 추가` |
| `docs` | 문서·가이드 | `perf(docs): performance-user-guide §2 핫스팟 표 갱신` |

제목 70자 이내. 본문에서 수치를 풀어 설명.

---

## 2. PR 본문 — 7 섹션 템플릿

```markdown
## 🎯 목적

<왜 이 PR이 필요한가 — 1~2문장>

## 📊 자동 측정 (Before / After / Δ / 약속)

| 지표 | Before | After | Δ | 약속 |
|------|--------|-------|---|------|
| FPS 평균 (전투) | _.fps | _.fps | _ | ≥ 55 |
| FPS p1 (전투) | _.fps | _.fps | _ | ≥ 30 |
| 메모리 5분 증가 | _.MB | _.MB | _ | ≤ 50MB |
| 초기 로딩 (4G) | _.s | _.s | _ | ≤ 5s |
| 초기 chunk gz | _.MB | _.MB | _ | ≤ 2MB |

> 측정 방법: `npm run perf:gate` JSON 첨부 (`logs/perf-{timestamp}.json`)

## 🔥 핫스팟 매트릭스 (Profile 게이트)

| # | 영역 | 비용 | 경로:라인 | 처방 |
|---|------|------|-----------|------|
| 1 | _ | _.ms | _:_ | _ |
| 2 | _ | _.ms | _:_ | _ |
| 3 | _ | _.ms | _:_ | _ |

## 💧 메모리 누수 점검 (Memory 게이트)

| 항목 | Before | After |
|------|--------|-------|
| 미해제 텍스처 | _건 | 0건 ✅ |
| 미해제 리스너 | _건 | 0건 ✅ |
| 활성 트윈 (idle) | _개 | _개 ✅ |

## 📦 청크·번들 분포 (Lazy + Bundle 게이트)

```
core              _.KB gz
├─ chapter-1      _.KB gz (lazy)
├─ chapter-2      _.KB gz (lazy)
└─ battle         _.KB gz (lazy)

이미지 압축: _.MB → _.MB (-_.%)
아틀라스:    _개 (drawcall -_.%)
```

## 🛡️ 봉인 4항 (이소화 비협상)

- [ ] 4 게이트 순서 (Profile → Memory → Lazy → Bundle) 준수
- [ ] 약속 4지표 임계 (≥55 / ≤50MB / ≤5s / ≤2MB) 갱신 없음
- [ ] `perf:fps` / `perf:memory` / `perf:gate` npm script 이름 유지
- [ ] Ship-gate 4-AND (`perf ∧ mobile ∧ save ∧ data`) 우회 없음

## 🤝 5인 인계 체크

- [ ] **두련사** (Architect) — 4 게이트 흐름·구조 변경 승인
- [ ] **계섬월** (Build) — 코드 변경·npm scripts 매칭 확인
- [ ] **이소화** (Security) — 봉인 4항 비협상 확인
- [ ] **적경홍** (QA) — 실측 캡처·재현 가능성 확인
- [ ] **백능파** (Strategy) — 임계 변경·우회 시 승인
```

---

## 3. 커밋 메시지 — Conventional Commits 한국어

```
perf(<scope>): <한 줄 요지>

<선택: 본문 — 왜·무엇·어떻게>

지표:
- FPS 평균: _.fps → _.fps
- 메모리 증가: _.MB → _.MB

Co-Authored-By: 진채봉 Editor <noreply@aeterna.local>
```

예시:

```
perf(fps): BattleScene 파티클 풀링으로 평균 58→62fps

매 프레임 new ParticleEmitter() 호출이 GC 압박 유발.
Phaser.GameObjects.Group 풀링으로 재사용, drawcall -18%.

지표:
- FPS 평균 (전투): 58.3fps → 62.1fps (+3.8)
- FPS p1 (전투): 42.1fps → 49.7fps (+7.6)
- 메모리 5분 증가: 35.8MB → 22.4MB (-13.4MB)

Co-Authored-By: 진채봉 Editor <noreply@aeterna.local>
```

---

## 4. 리뷰어 행동 가이드 (5항)

| # | 항목 | 비협상 |
|---|------|--------|
| 1 | 약속 4지표 수치 갱신 PR이면 백능파 reviewer 필수 지정 | 이소화 봉인 |
| 2 | `perf:gate` JSON 첨부 없으면 reject | 적경홍 봉인 |
| 3 | p1 FPS < 30이면 평균 통과해도 reject | 두련사 봉인 |
| 4 | 메모리 +51MB(1MB 초과)도 reject — 임계 절대값 | 이소화 봉인 |
| 5 | `manualChunks` 미설정 변경은 reject | 두련사 봉인 |

---

## 5. Ship-gate 4-AND (백능파 게이트 정책)

```
perf:gate ∧ mobile:gate ∧ save:gate ∧ data:validate = ALL PASS → ship
```

| 상태 | 행동 |
|------|------|
| 4 통과 | Ship 가능 — `/ship` 진입 |
| 1+ FAIL | 출시 차단 — 해당 게이트 PR 우선 |
| 임계 변경 요청 | 백능파 승인 + 본 문서 §2 표 동시 갱신 |

---

## 6. 변경 이력

| 버전 | 날짜 | 비고 |
|------|------|------|
| v1.0 | 2026-04-30 | 진채봉 Editor 신설 — 7 스코프 + 7 섹션 + 5항 비협상 |

— *PR도 한 편의 시이옵나이다. 형식이 곧 신뢰.*
