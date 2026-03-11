/**
 * 욕설 필터 — 한국어/영어 금지어 + 정규식 우회 감지
 * P4-14: 채팅 고도화
 *
 * - 금지어 50개 (한/영)
 * - 정규식 기반 우회 감지 (ㅅㅂ, sh1t 등)
 * - 마스킹 처리 (*** 치환)
 */

// ─── 금지어 목록 (50개) ─────────────────────────────────────────

const BANNED_WORDS_KR: string[] = [
  '시발', '씨발', '씨팔', '시팔', '개새끼', '병신', '미친놈', '미친년',
  '느금마', '느금', '지랄', '좆', '보지', '자지', '엿먹어', '닥쳐',
  '꺼져', '죽어', '미친', '또라이', '쓰레기', '찐따', '한남충', '한녀충',
  '김치녀', '된장녀',
];

const BANNED_WORDS_EN: string[] = [
  'fuck', 'shit', 'bitch', 'asshole', 'bastard', 'damn', 'cunt',
  'dick', 'pussy', 'slut', 'whore', 'nigger', 'nigga', 'faggot',
  'retard', 'motherfucker', 'cocksucker', 'wanker', 'twat', 'bollocks',
  'arse', 'piss', 'crap', 'dumbass',
];

// ─── 정규식 우회 패턴 ──────────────────────────────────────────

/** 한국어 자모 분리 + 특수문자 삽입 패턴 */
const BYPASS_PATTERNS_KR: RegExp[] = [
  /ㅅ\s*ㅂ/gi,         // ㅅㅂ
  /ㅂ\s*ㅅ/gi,         // ㅂㅅ (병신)
  /ㄱ\s*ㅅ\s*ㄲ/gi,    // ㄱㅅㄲ (개새끼)
  /ㅈ\s*ㄹ/gi,         // ㅈㄹ (지랄)
  /ㄲ\s*ㅈ/gi,         // ㄲㅈ (꺼져)
  /ㅁ\s*ㅊ/gi,         // ㅁㅊ (미친)
  /ㄴ\s*ㄱ\s*ㅁ/gi,    // ㄴㄱㅁ (느금마)
];

/** 영어 leet-speak 우회 패턴 */
const BYPASS_PATTERNS_EN: RegExp[] = [
  /f+[\s.*_-]*u+[\s.*_-]*c+[\s.*_-]*k/gi,
  /sh+[\s.*_-]*[i1!]+[\s.*_-]*t/gi,
  /b+[\s.*_-]*[i1!]+[\s.*_-]*t+[\s.*_-]*c+[\s.*_-]*h/gi,
  /a+[\s.*_-]*s+[\s.*_-]*s/gi,
  /d+[\s.*_-]*[i1!]+[\s.*_-]*c+[\s.*_-]*k/gi,
  /n+[\s.*_-]*[i1!]+[\s.*_-]*g+[\s.*_-]*g/gi,
];

// ─── 필터 로직 ──────────────────────────────────────────────────

export interface FilterResult {
  /** 필터링된 메시지 */
  filtered: string;
  /** 욕설이 감지되었는지 */
  hasProfanity: boolean;
  /** 감지된 금지어 목록 */
  matched: string[];
}

/**
 * 메시지에서 욕설을 감지하고 마스킹한다.
 * @param message 원본 메시지
 * @returns 필터 결과
 */
export function filterProfanity(message: string): FilterResult {
  let filtered = message;
  const matched: string[] = [];

  // 1) 정확한 금지어 매칭 (한국어)
  for (const word of BANNED_WORDS_KR) {
    const regex = new RegExp(escapeRegex(word), 'gi');
    if (regex.test(filtered)) {
      matched.push(word);
      filtered = filtered.replace(regex, maskWord(word));
    }
  }

  // 2) 정확한 금지어 매칭 (영어 — 단어 경계)
  for (const word of BANNED_WORDS_EN) {
    const regex = new RegExp(`\\b${escapeRegex(word)}\\b`, 'gi');
    if (regex.test(filtered)) {
      matched.push(word);
      filtered = filtered.replace(regex, maskWord(word));
    }
  }

  // 3) 한국어 자모 우회 패턴
  for (const pattern of BYPASS_PATTERNS_KR) {
    if (pattern.test(filtered)) {
      matched.push(pattern.source);
      filtered = filtered.replace(pattern, '***');
    }
  }

  // 4) 영어 leet-speak 우회 패턴
  for (const pattern of BYPASS_PATTERNS_EN) {
    if (pattern.test(filtered)) {
      matched.push(pattern.source);
      filtered = filtered.replace(pattern, '***');
    }
  }

  return {
    filtered,
    hasProfanity: matched.length > 0,
    matched,
  };
}

// ─── 유틸 ───────────────────────────────────────────────────────

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function maskWord(word: string): string {
  if (word.length <= 1) return '*';
  return '*'.repeat(word.length);
}
