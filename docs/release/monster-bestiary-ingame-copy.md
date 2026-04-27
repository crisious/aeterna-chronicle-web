# 🐉 인게임 몬스터 도감(Bestiary) 카피 SSOT v1.0

> 작성: 진채봉 (Editor) · 화면에 흘러갈 한 글자도 가지런히 다듬었사옵니다
> 스프린트: Auto — 몬스터 아트 파이프라인 표준화 (2026-04-27)
> 단계: 에셋 (인게임 노출 텍스트 SSOT — 라벨 / 툴팁 / 도감 헤더 / 보스 인트로)
> 연계: `monster-art-error-messages.md` (게이트 메시지) · `monster-art-user-guide.md` (외부 가이드) · `DESIGN.md §10` (Monster Tier Tokens)
> 노출 위치: 인게임 [도감] 화면 · `client/public/help/monster-art.html` · 보스 인트로 컷씬 자막
> i18n 키 규약: `ui.bestiary.<scope>.<element>` (라벨/툴팁/플레이스홀더 구분)

---

## 0. 작성 원칙 — 5계명

| 원칙 | 실천 |
|------|------|
| **명사 위주 라벨, 동사 위주 툴팁** | 라벨은 12자 이내, 툴팁은 80자 이내 |
| **Tier 어휘 통일** | 일반 / 엘리트 / 보스 — 3종 외 금지 (코드 enum 과 1:1) |
| **공손하되 군더더기 없이** | 인게임은 평문 존대, 시(詩)는 가이드 문서에만 |
| **상태 표기 통일** | 미발견 / 조우 / 처치 / 정복(보스) — 4종 외 금지 |
| **i18n 우선** | 본 문서 갱신 → 단일 PR 로 ko/en/ja 동시 반영 |

> 🪧 본 문서는 **인게임 라벨/툴팁/자막** 만 다룹니다. 게이트 알림은 `monster-art-error-messages.md` 가 SSOT.

---

## 1. 도감 — 최상위 항목

| 키 | ko | en | ja |
|----|------|------|------|
| `ui.bestiary.title` | "몬스터 도감" | "Bestiary" | "モンスター図鑑" |
| `ui.bestiary.subtitle` | "에테르나 대륙의 기록" | "Chronicles of Aeterna" | "エテルナ大陸の記録" |
| `ui.bestiary.summary` | "총 {total}종 / 발견 {found}종 ({percent}%)" | "{found} of {total} ({percent}%)" | "{total}種中 {found}種 ({percent}%)" |
| `ui.bestiary.cta.filter` | "필터" | "Filter" | "絞り込み" |
| `ui.bestiary.cta.reset` | "필터 해제" | "Clear" | "解除" |
| `ui.bestiary.cta.compare` | "비교" | "Compare" | "比較" |

---

## 2. Tier 라벨 — 일반 / 엘리트 / 보스

### 2.1 라벨

| 키 | ko | en | ja |
|----|------|------|------|
| `ui.bestiary.tier.normal` | "일반" | "Normal" | "通常" |
| `ui.bestiary.tier.elite` | "엘리트" | "Elite" | "エリート" |
| `ui.bestiary.tier.boss` | "보스" | "Boss" | "ボス" |

### 2.2 툴팁 — 시각 약속을 한 줄로

| 키 | ko |
|----|------|
| `ui.bestiary.tier.normal.tooltip` | "일반 몬스터 — 32×32 픽셀, 림라이트 없음, 16색 팔레트" |
| `ui.bestiary.tier.elite.tooltip` | "엘리트 몬스터 — 48×48 픽셀, 1px 골드 림라이트, 24색 팔레트, 800ms 인트로" |
| `ui.bestiary.tier.boss.tooltip` | "보스 몬스터 — 96×96 픽셀, 2px 에테르 발광, 32색 팔레트, 3,000ms 인트로 + 페이즈2" |

### 2.3 EN/JA — 시각 약속 동일 구조

| 키 | en | ja |
|----|------|------|
| `ui.bestiary.tier.normal.tooltip` | "Normal — 32×32, no rim light, 16-color palette" | "通常 — 32×32、リムライト無し、16色パレット" |
| `ui.bestiary.tier.elite.tooltip` | "Elite — 48×48, 1px gold rim, 24-color palette, 800ms intro" | "エリート — 48×48、1pxゴールドリム、24色、800msイントロ" |
| `ui.bestiary.tier.boss.tooltip` | "Boss — 96×96, 2px ether glow, 32-color palette, 3,000ms intro + phase 2" | "ボス — 96×96、2pxエーテル発光、32色、3,000msイントロ + フェーズ2" |

---

## 3. 카테고리 필터 — 5종 실루엣

| 키 | ko | en | ja | 아이콘 |
|----|------|------|------|--------|
| `ui.bestiary.category.humanoid` | "인간형" | "Humanoid" | "ヒューマノイド" | 🧝 |
| `ui.bestiary.category.beast` | "야수" | "Beast" | "獣" | 🐺 |
| `ui.bestiary.category.insect` | "충형" | "Insect" | "虫" | 🦋 |
| `ui.bestiary.category.mech` | "기계" | "Mech" | "機械" | ⚙️ |
| `ui.bestiary.category.elemental` | "정령" | "Elemental" | "精霊" | 💧 |

### 3.1 카테고리 툴팁

| 키 | ko |
|----|------|
| `ui.bestiary.category.humanoid.tooltip` | "두 다리로 직립한 형태 — 도적·이단자·망령 등" |
| `ui.bestiary.category.beast.tooltip` | "네 발로 달리는 야성 — 늑대·곰·맹수형" |
| `ui.bestiary.category.insect.tooltip` | "분절된 외골격 — 거미·풍뎅이·날벌레형" |
| `ui.bestiary.category.mech.tooltip` | "에테르 동력 기계 장치 — 골렘·자동인형·구조체" |
| `ui.bestiary.category.elemental.tooltip` | "에테르 결정에서 깨어난 정령 — 불꽃·물·바람·기억의 잔영" |

---

## 4. 발견 상태 — 4단계

| 키 | ko | en | ja |
|----|------|------|------|
| `ui.bestiary.state.unknown` | "미발견" | "Unknown" | "未発見" |
| `ui.bestiary.state.encountered` | "조우" | "Encountered" | "遭遇済み" |
| `ui.bestiary.state.defeated` | "처치" | "Defeated" | "撃破済み" |
| `ui.bestiary.state.conquered` | "정복" | "Conquered" | "征服済み" |

> `conquered` 는 보스 한정. 일반/엘리트 는 `defeated` 가 최고 상태이옵니다.

---

## 5. 도감 카드 — 상세 패널

### 5.1 헤더 라벨

| 키 | ko | en | ja |
|----|------|------|------|
| `ui.bestiary.card.region` | "출현 지역" | "Habitat" | "出現地域" |
| `ui.bestiary.card.tier` | "등급" | "Tier" | "等級" |
| `ui.bestiary.card.category` | "분류" | "Category" | "分類" |
| `ui.bestiary.card.first_seen` | "최초 조우" | "First seen" | "初遭遇" |
| `ui.bestiary.card.kill_count` | "처치 횟수" | "Kills" | "撃破回数" |
| `ui.bestiary.card.lore` | "기록" | "Lore" | "記録" |
| `ui.bestiary.card.drops` | "획득 가능" | "Drops" | "ドロップ" |
| `ui.bestiary.card.weakness` | "약점" | "Weakness" | "弱点" |

### 5.2 미발견 상태 메시지

| 키 | ko | en | ja |
|----|------|------|------|
| `ui.bestiary.card.locked` | "이 자리에는 아직 기록이 없사옵니다." | "No records yet." | "まだ記録がありません。" |
| `ui.bestiary.card.locked.hint` | "한 번 조우해야 라벨이 드러납니다." | "Encounter once to reveal." | "一度遭遇すると公開されます。" |

---

## 6. 보스 인트로 컷씬 — 자막 SSOT

### 6.1 페이즈1 등장 (3,000ms)

| 키 | ko | en | ja |
|----|------|------|------|
| `ui.boss.intro.appear` | "{name} — {epithet}" | "{name} — {epithet}" | "{name} — {epithet}" |
| `ui.boss.intro.warning` | "주의 — 강한 적이옵니다." | "Warning — Powerful foe." | "警告 — 強敵です。" |

### 6.2 페이즈2 전환 (HP 50% 시)

| 키 | ko | en | ja |
|----|------|------|------|
| `ui.boss.phase2.shift` | "분노가 깨어납니다…" | "Fury awakens…" | "怒りが目覚める…" |
| `ui.boss.phase2.aura` | "에테르가 진홍으로 물듭니다." | "Ether turns crimson." | "エーテルが紅に染まる。" |

### 6.3 처치 시

| 키 | ko | en | ja |
|----|------|------|------|
| `ui.boss.defeated.title` | "{name} 정복" | "{name} Conquered" | "{name} 征服" |
| `ui.boss.defeated.subtitle` | "기억 한 조각이 돌아왔사옵니다." | "A fragment of memory returns." | "記憶の欠片が戻ってきた。" |

### 6.4 모션 감소 옵션 활성 시

`prefersReducedMotion()` true → 인트로 3,000ms → **800ms 단축**, 페이즈2 입자 spawn rate 12 → 4. 자막 텍스트는 동일하옵니다.

---

## 7. 도움말 — 인게임 [도움말 → 아트 파이프라인]

| 키 | ko |
|----|------|
| `ui.help.monster.title` | "몬스터는 어떻게 만들어지나요?" |
| `ui.help.monster.intro` | "에테르나의 모든 몬스터는 다섯 격자(catalog → tier-tokens → generate → touchup → gate)를 거쳐 빚어지옵나이다." |
| `ui.help.monster.cta.guide` | "사용자 가이드 열기" |
| `ui.help.monster.cta.bestiary` | "도감으로 이동" |

| 키 | en |
|----|------|
| `ui.help.monster.title` | "How are monsters made?" |
| `ui.help.monster.intro` | "Every monster in Aeterna passes through five gates: catalog → tier-tokens → generate → touchup → gate." |
| `ui.help.monster.cta.guide` | "Open user guide" |
| `ui.help.monster.cta.bestiary` | "Open Bestiary" |

| 키 | ja |
|----|------|
| `ui.help.monster.title` | "モンスターはどう作られる?" |
| `ui.help.monster.intro` | "エテルナの全モンスターは、5つの段(catalog → tier-tokens → generate → touchup → gate)を経て描かれます。" |
| `ui.help.monster.cta.guide` | "ユーザーガイドを開く" |
| `ui.help.monster.cta.bestiary` | "図鑑を開く" |

---

## 8. 키 카운트 요약

| 절 | 키 수 |
|----|------|
| §1 도감 헤더 | 6 |
| §2 Tier 라벨·툴팁 | 9 (라벨 3 + 툴팁 3 × 3lang) |
| §3 카테고리 5종 | 10 (라벨 5 + 툴팁 5) |
| §4 발견 상태 | 4 |
| §5 도감 카드 | 10 (필드 8 + 잠금 2) |
| §6 보스 컷씬 | 6 |
| §7 도움말 | 4 |
| **합계** | **49 키** (ko/en/ja 동시 정의 = **147 줄**) |

---

## 9. 변경 약속 (Change Discipline)

본 카피는 `DESIGN.md §10 Monster Tier Tokens` 와 `monster-art-user-guide.md §3 등급별 시각 약속` 의 메아리이옵니다. 토큰이 바뀌면 본 문서 §2 툴팁이 먼저 갱신되어야 하옵고, 단일 PR 로 ko/en/ja 동시 반영하옵소서.

> 한 글자가 어긋나면 세 나라의 플레이어가 어긋난 노래를 듣사옵나이다.
> — 진채봉 拜
