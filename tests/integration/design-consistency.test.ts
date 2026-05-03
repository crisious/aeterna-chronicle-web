/**
 * 코드 ↔ 기획 문서 일관성 메타 테스트
 *
 * soundManifest, AudioSceneIntegration, endingJudge, classSeeds, schema.prisma,
 * monster_data_table.md, 멀티엔딩_플래그_설계.md 간 데이터 정합성을 검증한다.
 */
import { describe, test, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

// ── 경로 헬퍼 ──────────────────────────────────────────────────
const ROOT = path.resolve(__dirname, '../..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf-8');

// ════════════════════════════════════════════════════════════════
// 1. SOUND MANIFEST vs AUDIO FILES
// ════════════════════════════════════════════════════════════════
describe('1. Sound Manifest ↔ Audio Files', () => {
  const manifestSrc = read('client/src/sound/soundManifest.ts');

  // manifest에서 모든 SoundEntry의 path 추출 (audio/... 형식)
  const pathRegex = /path:\s*'([^']+\.ogg)'/g;
  const manifestPaths: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = pathRegex.exec(manifestSrc)) !== null) {
    manifestPaths.push(m[1]);
  }

  // manifest에서 모든 key 추출
  const keyRegex = /key:\s*'([^']+)'/g;
  const manifestKeys: string[] = [];
  while ((m = keyRegex.exec(manifestSrc)) !== null) {
    manifestKeys.push(m[1]);
  }

  // 실제 .ogg 파일 목록 (assets/generated/audio 기준)
  const audioRoot = path.join(ROOT, 'assets/generated/audio');
  function collectOgg(dir: string, prefix = ''): string[] {
    const files: string[] = [];
    if (!fs.existsSync(dir)) return files;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        files.push(...collectOgg(path.join(dir, entry.name), rel));
      } else if (entry.name.endsWith('.ogg')) {
        files.push(rel);
      }
    }
    return files;
  }
  const actualOggFiles = collectOgg(audioRoot);
  // manifest paths는 "audio/bgm/..." 형식이므로 "audio/" prefix를 제거하여 비교
  const manifestRelPaths = manifestPaths.map((p) => p.replace(/^audio\//, ''));

  test('manifest 에셋 개수가 137개 (BGM 42 + SFX 75 + Voice 20)', () => {
    expect(manifestPaths.length).toBe(137);
  });

  test('manifest key 개수가 path 개수와 일치', () => {
    expect(manifestKeys.length).toBe(manifestPaths.length);
  });

  test('manifest key에 중복이 없음', () => {
    const uniqueKeys = new Set(manifestKeys);
    expect(uniqueKeys.size).toBe(manifestKeys.length);
  });

  test('모든 manifest 경로에 대응하는 .ogg 파일 존재', () => {
    const missingFiles = manifestRelPaths.filter(
      (rel) => !actualOggFiles.includes(rel),
    );
    expect(missingFiles).toEqual([]);
  });

  test('orphan .ogg 파일 없음 (manifest에 없는 파일)', () => {
    const orphans = actualOggFiles.filter(
      (rel) => !manifestRelPaths.includes(rel),
    );
    expect(orphans).toEqual([]);
  });
});

// ════════════════════════════════════════════════════════════════
// 2. SCENE BGM MAP / SFX EVENT MAP vs MANIFEST
// ════════════════════════════════════════════════════════════════
describe('2. AudioSceneIntegration ↔ Sound Manifest', () => {
  const integSrc = read('client/src/sound/AudioSceneIntegration.ts');
  const manifestSrc = read('client/src/sound/soundManifest.ts');

  // manifest keys 추출
  const keyRegex = /key:\s*'([^']+)'/g;
  const manifestKeys = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = keyRegex.exec(manifestSrc)) !== null) {
    manifestKeys.add(m[1]);
  }

  // SCENE_BGM_MAP에서 bgmKey 추출
  const bgmSection = integSrc.match(
    /SCENE_BGM_MAP[\s\S]*?\];/,
  )?.[0] ?? '';
  const bgmKeyRegex = /bgmKey:\s*'([^']+)'/g;
  const bgmKeys: string[] = [];
  while ((m = bgmKeyRegex.exec(bgmSection)) !== null) {
    bgmKeys.push(m[1]);
  }

  // SFX_EVENT_MAP에서 값(manifest key) 추출
  const sfxSection = integSrc.match(
    /SFX_EVENT_MAP[\s\S]*?\};/,
  )?.[0] ?? '';
  const sfxValRegex = /:\s+'([^']+)'/g;
  const sfxValues: string[] = [];
  while ((m = sfxValRegex.exec(sfxSection)) !== null) {
    sfxValues.push(m[1]);
  }

  test('SCENE_BGM_MAP의 모든 bgmKey가 soundManifest에 존재', () => {
    const missing = bgmKeys.filter((k) => !manifestKeys.has(k));
    expect(missing).toEqual([]);
  });

  test('SCENE_BGM_MAP bgmKey에 중복이 없는지 (서브존별 유일)', () => {
    // 동일 bgmKey가 여러 서브존에서 쓰일 수 있으므로 (bgm_sys_01 등) 이는 허용
    // 대신 (sceneKey + subZone) 조합이 유일해야 한다
    const combRegex = /sceneKey:\s*'([^']+)'.*?bgmKey:\s*'([^']+)'(?:.*?subZone:\s*'([^']+)')?/g;
    const combos: string[] = [];
    let cm: RegExpExecArray | null;
    while ((cm = combRegex.exec(bgmSection)) !== null) {
      combos.push(`${cm[1]}|${cm[3] ?? '__default__'}`);
    }
    const unique = new Set(combos);
    expect(unique.size).toBe(combos.length);
  });

  test('SFX_EVENT_MAP의 모든 값이 soundManifest에 존재', () => {
    const missing = sfxValues.filter((v) => !manifestKeys.has(v));
    expect(missing).toEqual([]);
  });
});

// ════════════════════════════════════════════════════════════════
// 3. MONSTER DATA: Prisma Schema ↔ Design Doc
// ════════════════════════════════════════════════════════════════
describe('3. Monster Data ↔ Prisma Schema ↔ Design Doc', () => {
  const schemaSrc = read('server/prisma/schema.prisma');
  const monsterDoc = read('03_데이터테이블/monster_data_table.md');

  test('Prisma schema에 Monster 모델이 존재', () => {
    expect(schemaSrc).toMatch(/model\s+Monster\s*\{/);
  });

  test('Monster 모델에 필수 필드 존재 (code, name, type, level, hp, attack, defense)', () => {
    const monsterBlock = schemaSrc.match(
      /model\s+Monster\s*\{([\s\S]*?)^\}/m,
    )?.[1] ?? '';
    const requiredFields = ['code', 'name', 'type', 'level', 'hp', 'attack', 'defense', 'speed'];
    for (const field of requiredFields) {
      expect(monsterBlock).toMatch(new RegExp(`\\b${field}\\b`));
    }
  });

  test('Monster 모델의 type 필드에 boss 타입 포함 (주석 확인)', () => {
    const monsterBlock = schemaSrc.match(
      /model\s+Monster\s*\{([\s\S]*?)^\}/m,
    )?.[1] ?? '';
    expect(monsterBlock).toMatch(/boss/i);
  });

  // design doc에서 챕터 보스 이름 추출
  const bossNames = ['기억의 골렘', '말라투스', '라와르', '케인', '화신 레테'];

  test('monster_data_table.md에 5대 챕터 보스 전원 기재', () => {
    for (const boss of bossNames) {
      expect(monsterDoc).toContain(boss);
    }
  });

  test('monster_data_table.md 챕터당 10마리 (총 50마리)', () => {
    // ID 패턴: C1-N-01 ~ C5-B-01
    const idRegex = /C\d-[NEMB]-\d{2}/g;
    const ids = [...monsterDoc.matchAll(idRegex)].map((m) => m[0]);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(50);
  });

  test('각 챕터 보스(B등급)가 신성 기억 파편을 드롭', () => {
    // 패턴: B-01 행에 "신성 기억 파편" 포함
    const bossRows = monsterDoc.split('\n').filter((l) => /\|\s*C\d-B-01\s*\|/.test(l));
    expect(bossRows.length).toBe(5);
    // Ch1~Ch4 보스는 "신성 기억 파편" 드롭
    for (const row of bossRows.slice(0, 4)) {
      expect(row).toMatch(/신성 기억 파편/);
    }
  });

  test('보스 설계 메모에 4대 보스 + 최종보스 기재', () => {
    expect(monsterDoc).toContain('기억의 골렘');
    expect(monsterDoc).toContain('말라투스');
    expect(monsterDoc).toContain('라와르');
    expect(monsterDoc).toContain('케인');
    expect(monsterDoc).toContain('화신 레테');
  });
});

// ════════════════════════════════════════════════════════════════
// 4. ENDING FLAGS: Code ↔ Design Doc
// ════════════════════════════════════════════════════════════════
describe('4. Ending Flags ↔ 멀티엔딩_플래그_설계.md', () => {
  const judgeSrc = read('server/src/ending/endingJudge.ts');
  const designDoc = read('01_코어기획/멀티엔딩_플래그_설계.md');

  // ── 4-1: fragment_count 최대값 ─────────────────────────────
  test('design doc에서 fragment_count 최대값 = 4', () => {
    // "| `story.fragment_count` | int | 0 | 4 |"
    expect(designDoc).toMatch(/fragment_count.*\|\s*4\s*\|/);
  });

  test('endingJudge sanitizeFlags에서 fragmentCount clamp 최대값 = 4', () => {
    // clamp(raw.fragmentCount ?? 0, 0, 4)
    expect(judgeSrc).toMatch(/fragmentCount.*0,\s*4\)/);
  });

  // ── 4-2: 엔딩 D 조건 일치 ─────────────────────────────────
  test('엔딩 D: code에서 sacredArtifacts === 12 확인', () => {
    expect(judgeSrc).toMatch(/sacredArtifacts\s*===\s*12/);
  });

  test('엔딩 D: design doc에서 artifact_count == 12 확인', () => {
    expect(designDoc).toMatch(/artifact_count\s*==\s*12/);
  });

  // ── 4-3: 엔딩 C 조건 일치 ─────────────────────────────────
  test('엔딩 C: code에서 betrayalScore >= 70 확인', () => {
    expect(judgeSrc).toMatch(/betrayalScore\s*>=\s*70/);
  });

  test('엔딩 C: design doc에서 betrayal_score >= 70 확인', () => {
    expect(designDoc).toMatch(/betrayal_score\s*>=\s*70/);
  });

  // ── 4-4: 엔딩 A(TRUE_GUARDIAN) 조건 일치 ──────────────────
  test('엔딩 A: code에서 fragmentCount === 4 && allPartyAlive 확인', () => {
    expect(judgeSrc).toMatch(/fragmentCount\s*===\s*4/);
    expect(judgeSrc).toMatch(/allPartyAlive/);
  });

  test('엔딩 A: design doc에서 fragment_count >= 4 AND party_alive == 63 조건 존재', () => {
    expect(designDoc).toMatch(/fragment_count\s*>=?\s*4/);
    expect(designDoc).toMatch(/party_alive\s*==\s*63/);
  });

  // ── 4-5: 엔딩 B(LAST_WITNESS) 조건 일치 ──────────────────
  test('엔딩 B: code에서 fragmentCount >= 3 확인', () => {
    expect(judgeSrc).toMatch(/fragmentCount\s*>=\s*3/);
  });

  test('엔딩 B: design doc에서 fragment_count >= 3 조건 존재', () => {
    expect(designDoc).toMatch(/fragment_count\s*>=\s*3/);
  });

  // ── 4-6: 엔딩 타입 전체 검증 ──────────────────────────────
  test('code에 5개 엔딩 타입이 정의됨', () => {
    const types = ['DIVINE_RETURN', 'BETRAYAL', 'TRUE_GUARDIAN', 'LAST_WITNESS', 'DEFEAT'];
    for (const t of types) {
      expect(judgeSrc).toContain(t);
    }
  });

  test('code 엔딩 판정 우선순위: D → C → A → B → DEFEAT', () => {
    // D(sacredArtifacts===12)가 C(betrayalScore>=70)보다 먼저 나와야 함
    const posD = judgeSrc.indexOf('sacredArtifacts === 12');
    const posC = judgeSrc.indexOf('betrayalScore >= 70');
    const posA = judgeSrc.indexOf('fragmentCount === 4');
    const posB = judgeSrc.indexOf('fragmentCount >= 3');
    expect(posD).toBeLessThan(posC);
    expect(posC).toBeLessThan(posA);
    expect(posA).toBeLessThan(posB);
  });

  // ── 4-7: 플래그 키 정합성 ─────────────────────────────────
  test('EndingFlags 인터페이스에 design doc의 핵심 플래그가 모두 반영', () => {
    // design doc 핵심 플래그 → code 필드 매핑
    const expectedFields = [
      'sacredArtifacts',   // story.artifact_count
      'betrayalScore',     // story.betrayal_score
      'fragmentCount',     // story.fragment_count
      'allPartyAlive',     // story.party_alive (== 63)
      'endingAScore',      // story.ending_a_score
      'sealVisitedCount',  // story.seal_visited
      'emperorSaved',      // story.emperor_saved
      'letheUnderstood',   // story.lethe_understood
    ];
    for (const field of expectedFields) {
      expect(judgeSrc).toContain(field);
    }
  });

  // ── 4-8: design doc의 sacredArtifacts 최대값 12 ───────────
  test('sacredArtifacts clamp 최대값 = 12 (유물 12개)', () => {
    expect(judgeSrc).toMatch(/sacredArtifacts.*0,\s*12\)/);
  });

  test('design doc에서 artifact_count 최대값 = 12', () => {
    expect(designDoc).toMatch(/artifact_count.*\|\s*12\s*\|/);
  });
});

// ════════════════════════════════════════════════════════════════
// 5. CLASS DEFINITIONS: Code ↔ Design
// ════════════════════════════════════════════════════════════════
describe('5. Class Definitions Consistency', () => {
  const seedsSrc = read('server/src/class/classSeeds.ts');

  // BASE_CLASS_NAMES에서 키 추출
  const baseClassBlock = seedsSrc.match(
    /BASE_CLASS_NAMES[\s\S]*?\};/,
  )?.[0] ?? '';
  const baseClassRegex = /(\w+):\s*'/g;
  const baseClassIds: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = baseClassRegex.exec(baseClassBlock)) !== null) {
    baseClassIds.push(m[1]);
  }

  // ADVANCED_CLASS_NAMES에서 키 추출
  const advClassBlock = seedsSrc.match(
    /ADVANCED_CLASS_NAMES[\s\S]*?\};/,
  )?.[0] ?? '';
  const advClassRegex = /(\w+):\s*'/g;
  const advClassIds: string[] = [];
  while ((m = advClassRegex.exec(advClassBlock)) !== null) {
    advClassIds.push(m[1]);
  }

  // ClassSeedData에서 baseClass 값 추출
  const seedBaseRegex = /baseClass:\s*'([^']+)'/g;
  const seedBaseClasses: string[] = [];
  while ((m = seedBaseRegex.exec(seedsSrc)) !== null) {
    seedBaseClasses.push(m[1]);
  }
  const uniqueSeedBases = [...new Set(seedBaseClasses)];

  test('베이스 클래스 6개 정의', () => {
    expect(baseClassIds.length).toBe(6);
  });

  test('베이스 클래스 ID 목록 일치', () => {
    const expected = [
      'ether_knight',
      'memory_weaver',
      'shadow_weaver',
      'memory_breaker',
      'time_guardian',
      'void_wanderer',
    ];
    expect(baseClassIds.sort()).toEqual(expected.sort());
  });

  test('전직 클래스 18개 (6 클래스 × 3 tier)', () => {
    expect(advClassIds.length).toBe(18);
  });

  test('ClassSeedData의 baseClass가 모두 BASE_CLASS_NAMES에 존재', () => {
    const baseSet = new Set(baseClassIds);
    const unknown = uniqueSeedBases.filter((b) => !baseSet.has(b));
    expect(unknown).toEqual([]);
  });

  test('ClassSeedData의 advancedClass가 모두 ADVANCED_CLASS_NAMES에 존재', () => {
    const advRegex = /advancedClass:\s*'([^']+)'/g;
    const seedAdvClasses: string[] = [];
    let am: RegExpExecArray | null;
    while ((am = advRegex.exec(seedsSrc)) !== null) {
      seedAdvClasses.push(am[1]);
    }
    const advSet = new Set(advClassIds);
    const unknown = seedAdvClasses.filter((a) => !advSet.has(a));
    expect(unknown).toEqual([]);
  });

  test('각 베이스 클래스가 정확히 3개의 전직 경로 보유', () => {
    for (const base of baseClassIds) {
      const count = seedBaseClasses.filter((b) => b === base).length;
      expect(count, `${base}의 전직 수`).toBe(3);
    }
  });

  test('tier 3 전직에 궁극기(ultimateSkill) 존재', () => {
    // tier: 3 블록 근처에 ultimateSkill이 있어야 함
    const tier3Blocks = seedsSrc.match(/tier:\s*3[\s\S]*?^};/gm) ?? [];
    for (const block of tier3Blocks) {
      expect(block).toContain('ultimateSkill');
    }
  });
});

// ════════════════════════════════════════════════════════════════
// 5. COMBO_DEFINITIONS ↔ skillSeeds (E-S2)
// ════════════════════════════════════════════════════════════════
describe('5. ComboManager ↔ skillSeeds 일치', () => {
  const comboSrc = read('server/src/combat/comboManager.ts');
  const skillSeedsSrc = read('server/src/skill/skillSeeds.ts');

  // skillSeeds 의 모든 code 추출
  const skillCodes = new Set<string>();
  const codeRe = /code:\s*'([^']+)'/g;
  let m: RegExpExecArray | null;
  while ((m = codeRe.exec(skillSeedsSrc)) !== null) {
    skillCodes.add(m[1]);
  }

  // COMBO_DEFINITIONS 의 모든 skillSequence 항목 추출
  const skillSequences: { comboId: string; classId: string; seq: string[] }[] = [];
  const comboRe = /id:\s*'([^']+)',[\s\S]*?classId:\s*'([^']+)',[\s\S]*?skillSequence:\s*\[([^\]]+)\]/g;
  while ((m = comboRe.exec(comboSrc)) !== null) {
    const seq = Array.from(m[3].matchAll(/'([^']+)'/g)).map((mm) => mm[1]);
    skillSequences.push({ comboId: m[1], classId: m[2], seq });
  }

  test('comboManager 에서 30개 콤보 정의 추출', () => {
    expect(skillSequences.length).toBe(30);
  });

  test('각 콤보의 skill code 가 skillSeeds 에 존재', () => {
    const missing: { combo: string; skill: string }[] = [];
    for (const { comboId, seq } of skillSequences) {
      for (const sk of seq) {
        if (!skillCodes.has(sk)) missing.push({ combo: comboId, skill: sk });
      }
    }
    expect(missing, `미존재 skill: ${JSON.stringify(missing.slice(0, 10))}`).toHaveLength(0);
  });

  test('mb/tg/vw 신규 15 콤보 — 클래스 prefix 와 skill prefix 일치', () => {
    const newClasses = ['memory_breaker', 'time_guardian', 'void_wanderer'];
    const prefixMap: Record<string, string> = {
      memory_breaker: 'mb_',
      time_guardian: 'tg_',
      void_wanderer: 'vw_',
    };
    for (const { classId, seq, comboId } of skillSequences) {
      if (!newClasses.includes(classId)) continue;
      const expected = prefixMap[classId];
      for (const sk of seq) {
        expect(sk.startsWith(expected), `${comboId}: ${sk} → expected prefix ${expected}`).toBe(true);
      }
    }
  });
});

// ════════════════════════════════════════════════════════════════
// 6. SKILL_BRANCH_GROUPS ↔ skillSeeds (D-S2)
// ════════════════════════════════════════════════════════════════
describe('6. SKILL_BRANCH_GROUPS ↔ skillSeeds 일치 (D-S2)', () => {
  const branchSrc = read('server/src/skill/skillBranches.ts');
  const skillSeedsSrc = read('server/src/skill/skillSeeds.ts');

  // skillSeeds 의 모든 code
  const skillCodes = new Set<string>();
  const codeRe = /code:\s*'([^']+)'/g;
  let m: RegExpExecArray | null;
  while ((m = codeRe.exec(skillSeedsSrc)) !== null) {
    skillCodes.add(m[1]);
  }

  // SKILL_BRANCH_GROUPS 의 모든 skill code 추출
  const branchCodes: string[] = [];
  const groupBlockRe = /\b[a-z_]+_t\d+_[a-z]+:\s*\[([^\]]+)\]/g;
  while ((m = groupBlockRe.exec(branchSrc)) !== null) {
    const codes = Array.from(m[1].matchAll(/'([^']+)'/g)).map((mm) => mm[1]);
    branchCodes.push(...codes);
  }

  test('branchGroups 에서 skill code 추출 (≥ 16)', () => {
    expect(branchCodes.length).toBeGreaterThanOrEqual(16);
  });

  test('모든 분기 skill code 가 skillSeeds 에 존재', () => {
    const missing = branchCodes.filter((c) => !skillCodes.has(c));
    expect(missing, `미존재 분기 skill: ${JSON.stringify(missing)}`).toHaveLength(0);
  });

  test('분기 skill code 중복 없음 (한 skill 은 한 그룹만)', () => {
    expect(new Set(branchCodes).size).toBe(branchCodes.length);
  });
});

// ════════════════════════════════════════════════════════════════
// 7. 콤보 서버 ↔ 클라 미러 동기화 (E-S3)
// ════════════════════════════════════════════════════════════════
describe('7. 콤보 server comboManager ↔ client comboMirror 동기화', () => {
  const serverSrc = read('server/src/combat/comboManager.ts');
  const clientSrc = read('client/src/skills/comboMirror.ts');

  // server 의 ComboDefinition id 추출
  const serverIds = new Set<string>();
  let m: RegExpExecArray | null;
  const idRe = /id:\s*'([^']+)',[\s\S]*?classId:\s*'[^']+'/g;
  while ((m = idRe.exec(serverSrc)) !== null) {
    serverIds.add(m[1]);
  }

  // client 의 ComboMirror id 추출
  const clientIds = new Set<string>();
  const clientIdRe = /id:\s*'([^']+)'[^}]*classId:\s*'[^']+'/g;
  while ((m = clientIdRe.exec(clientSrc)) !== null) {
    clientIds.add(m[1]);
  }

  test('server 와 client 콤보 갯수 동일 (30)', () => {
    expect(serverIds.size).toBe(30);
    expect(clientIds.size).toBe(30);
  });

  test('모든 server 콤보 id 가 client 미러에 존재', () => {
    const missing = [...serverIds].filter((id) => !clientIds.has(id));
    expect(missing, `client 누락: ${JSON.stringify(missing)}`).toHaveLength(0);
  });

  test('모든 client 미러 id 가 server 에 존재 (orphan 방지)', () => {
    const orphan = [...clientIds].filter((id) => !serverIds.has(id));
    expect(orphan, `server 부재: ${JSON.stringify(orphan)}`).toHaveLength(0);
  });
});
