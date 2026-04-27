/**
 * design-tokens.ts — 에테르나 크로니클 코어 디자인 토큰
 *
 * ─── SSOT 위계 (Phase 54 / v1.0.0-rc.3 정리) ─────────────────
 *   1차 SSOT: `/DESIGN.md` (사람이 읽는 SSOT — 컬러 팔레트·타이포·원칙)
 *   2차 SSOT (본 파일): 코어 컬러/스페이싱/타이포 토큰의 코드 미러
 *                       — DESIGN.md §2~§5 변경 시 본 파일 수동 동기화
 *   3차 (토픽별 확장): `client/src/design_tokens/{topic}.ts`
 *                       — 본 파일의 코어 토큰을 import해서 토픽 확장 (예: monster_tier)
 *   4차 (런타임 상수): `client/src/constants/{system}-tokens.ts`
 *                       — Phaser 0xRRGGBB 정수 등 런타임용 변환 (예: battle-tokens)
 *
 *   변경 절차:
 *     - 컬러 팔레트 신규/수정 → DESIGN.md §2부터 갱신 → 본 파일 수동 미러 → 토픽/런타임 갱신
 *     - 토픽 한정 토큰 (몬스터/전투 등) → DESIGN.md §10+ 또는 art-production/ → 토픽 파일
 *
 * 모든 UI 컴포넌트가 이 파일을 import하여 색상/크기/스페이싱을 참조합니다.
 * 하드코딩된 매직 넘버 사용을 금지하고, 이 토큰으로 통일합니다.
 *
 * 참조: DESIGN.md (v1.0), high_contrast_palette.json
 * 작성: 가춘운 (CMO/디자인)
 * 작성일: 2026-04-14
 * SSOT 위계 정리: Phase 54 (2026-04-27)
 */

// ── 헥스 → Phaser 컬러 변환 헬퍼 ──────────────────────────────

/** CSS 헥스 문자열을 Phaser 정수 컬러(0xRRGGBB)로 변환 */
export function hexToInt(hex: string): number {
  return parseInt(hex.replace('#', ''), 16);
}

/** Phaser 정수 컬러를 CSS 헥스 문자열로 변환 */
export function intToHex(color: number): string {
  return '#' + color.toString(16).padStart(6, '0');
}

// ═══════════════════════════════════════════════════════════════
//  1. 컬러 시스템 (Aeterna Dark 기본 테마)
// ═══════════════════════════════════════════════════════════════

/** 배경 컬러 토큰 */
export const BG = {
  /** 그림자, 가장 어두운 배경 */
  ABYSS:   0x0D0D1A,
  /** 기본 배경, 모달 */
  PRIMARY: 0x1A1A2E,
  /** 패널, 대화창, 사이드바 */
  PANEL:   0x16213E,
  /** 프레임 채움, 컨테이너 */
  FRAME:   0x2A2A3A,
  /** 버튼 기본 상태 */
  BUTTON:  0x3A3A4A,
  /** 호버 상태 */
  HOVER:   0x4A4A5A,
  /** 텍스트 입력 필드 */
  INPUT:   0x0D0D1A,
} as const;

/** 배경 컬러 CSS 헥스 (HTML/CSS용) */
export const BG_HEX = {
  ABYSS:   '#0D0D1A',
  PRIMARY: '#1A1A2E',
  PANEL:   '#16213E',
  FRAME:   '#2A2A3A',
  BUTTON:  '#3A3A4A',
  HOVER:   '#4A4A5A',
  INPUT:   '#0D0D1A',
} as const;

/** 텍스트 컬러 토큰 (CSS 문자열 — Phaser Text 스타일용) */
export const TEXT = {
  /** 일반 텍스트 */
  PRIMARY:   '#E8E8E8',
  /** 보조 텍스트, 설명 */
  SECONDARY: '#A0A0A0',
  /** 비활성, 힌트 */
  MUTED:     '#606060',
  /** NPC 이름, 강조, 금색 텍스트 */
  ACCENT:    '#FFD700',
  /** 피해량, 경고, 삭제 */
  WARNING:   '#FF4444',
} as const;

/** 액센트 컬러 토큰 */
export const ACCENT = {
  /** 에테르/기억 발광, 주요 액션 (Phaser int) */
  ETHER:   0x89CFF0,
  /** 회복, 성공, 완료 */
  SUCCESS: 0x2ECC71,
  /** 위험, 삭제, 에러 */
  DANGER:  0xFF4444,
} as const;

/** 액센트 컬러 CSS 헥스 */
export const ACCENT_HEX = {
  ETHER:   '#89CFF0',
  SUCCESS: '#2ECC71',
  DANGER:  '#FF4444',
} as const;

/** 테두리 컬러 토큰 */
export const BORDER = {
  /** 일반 테두리 (Phaser int) */
  DEFAULT: 0x5A5A6A,
  /** 강조 테두리 금색 */
  ACCENT:  0xFFD700,
  /** 은은한 테두리 */
  SUBTLE:  0x3A3A4A,
} as const;

/** 테두리 CSS 헥스 */
export const BORDER_HEX = {
  DEFAULT: '#5A5A6A',
  ACCENT:  '#FFD700',
  SUBTLE:  '#3A3A4A',
} as const;

// ═══════════════════════════════════════════════════════════════
//  2. 게이지 바 컬러
// ═══════════════════════════════════════════════════════════════

export const GAUGE = {
  HP: {
    /** 체력 최대 (녹색) */
    FULL:    0x2ECC71,
    /** 체력 위험 (적색) */
    LOW:     0xE74C3C,
    /** 게이지 배경 */
    BG:      0x333333,
  },
  MP: {
    /** 마나 시작 (청색) */
    START:   0x3498DB,
    /** 마나 끝 (보라) */
    END:     0x9B59B6,
    BG:      0x333333,
  },
  EXP: {
    /** 경험치 (호박색) */
    FILL:    0xF39C12,
    BG:      0x333333,
  },
  COOLDOWN: {
    /** 쿨다운 오버레이 */
    OVERLAY_ALPHA: 0.5,
    OVERLAY_COLOR: 0x000000,
  },
} as const;

// ═══════════════════════════════════════════════════════════════
//  3. 아이템 등급 컬러
// ═══════════════════════════════════════════════════════════════

export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic' | 'ether';

export interface RarityStyle {
  border: number;
  glow: number | null;
  glowAlpha: number;
  text: string;
  label: string;
  labelKo: string;
  hasParticle: boolean;
}

export const RARITY: Record<ItemRarity, RarityStyle> = {
  common: {
    border: 0x808080, glow: null, glowAlpha: 0, text: '#FFFFFF',
    label: 'Common', labelKo: '일반', hasParticle: false,
  },
  uncommon: {
    border: 0x2ECC71, glow: 0x2ECC71, glowAlpha: 0.3, text: '#2ECC71',
    label: 'Uncommon', labelKo: '고급', hasParticle: false,
  },
  rare: {
    border: 0x3498DB, glow: 0x3498DB, glowAlpha: 0.3, text: '#3498DB',
    label: 'Rare', labelKo: '희귀', hasParticle: false,
  },
  epic: {
    border: 0x9B59B6, glow: 0x9B59B6, glowAlpha: 0.5, text: '#9B59B6',
    label: 'Epic', labelKo: '영웅', hasParticle: false,
  },
  legendary: {
    border: 0xF39C12, glow: 0xF39C12, glowAlpha: 0.7, text: '#F39C12',
    label: 'Legendary', labelKo: '전설', hasParticle: false,
  },
  mythic: {
    border: 0xE74C3C, glow: 0xE74C3C, glowAlpha: 0.8, text: '#E74C3C',
    label: 'Mythic', labelKo: '신화', hasParticle: true,
  },
  ether: {
    border: 0x89CFF0, glow: 0x89CFF0, glowAlpha: 1.0, text: '#89CFF0',
    label: 'Ether', labelKo: '에테르', hasParticle: true,
  },
} as const;

// ═══════════════════════════════════════════════════════════════
//  4. 지역별 발광 액센트
// ═══════════════════════════════════════════════════════════════

export type RegionId =
  | 'erebos' | 'silvanheim' | 'solaris' | 'argentium'
  | 'icefield' | 'britalia' | 'mistsea' | 'abyss';

export interface RegionTheme {
  glow: number;
  glowHex: string;
  keyword: string;
  keywordKo: string;
}

export const REGION_THEMES: Record<RegionId, RegionTheme> = {
  erebos:     { glow: 0x89CFF0, glowHex: '#89CFF0', keyword: 'memory-glow',   keywordKo: '기억 잔광' },
  silvanheim: { glow: 0x7DF9FF, glowHex: '#7DF9FF', keyword: 'bioluminescence', keywordKo: '발광균' },
  solaris:    { glow: 0xFFD700, glowHex: '#FFD700', keyword: 'solar-heat',     keywordKo: '태양열' },
  argentium:  { glow: 0xFFA500, glowHex: '#FFA500', keyword: 'steam',          keywordKo: '증기' },
  icefield:   { glow: 0x00BFFF, glowHex: '#00BFFF', keyword: 'crystal',        keywordKo: '결정' },
  britalia:   { glow: 0x48D1CC, glowHex: '#48D1CC', keyword: 'ocean',          keywordKo: '해양' },
  mistsea:    { glow: 0xDDA0DD, glowHex: '#DDA0DD', keyword: 'memory-mist',    keywordKo: '기억안개' },
  abyss:      { glow: 0xFF00FF, glowHex: '#FF00FF', keyword: 'ether-core',     keywordKo: '에테르' },
} as const;

// ═══════════════════════════════════════════════════════════════
//  5. 속성별 컬러 (전투 시스템)
// ═══════════════════════════════════════════════════════════════

export const ELEMENT_COLORS: Record<string, number> = {
  aether:    0x66AAFF,
  light:     0xFFEE66,
  dark:      0xAA66FF,
  neutral:   0x6666AA,
  time:      0x66FFCC,
  lightning: 0xFFFF44,
  earth:     0x88AA44,
  fire:      0xFF6644,
  ice:       0x44CCFF,
  water:     0x4488FF,
} as const;

// ═══════════════════════════════════════════════════════════════
//  6. 타이포그래피
// ═══════════════════════════════════════════════════════════════

/** 폰트 스택 */
export const FONT = {
  /** 게임 UI 픽셀 폰트 (Phaser BitmapFont) */
  PIXEL:     'PixelFont',
  /** 제목 한글 */
  TITLE_KO:  '"여기어때 잘난체 Bold", "Noto Sans KR Bold", sans-serif',
  /** 본문 한글 */
  BODY_KO:   'Pretendard, "Noto Sans KR", sans-serif',
  /** 제목 영문 */
  TITLE_EN:  '"Pirata One", Cinzel, serif',
  /** 본문 영문 */
  BODY_EN:   'Inter, system-ui, sans-serif',
  /** 수치/코드 */
  MONO:      '"JetBrains Mono", monospace',
} as const;

/** 타이포 스케일 (px) */
export const FONT_SIZE = {
  XS:   10,
  SM:   12,
  MD:   14,
  LG:   16,
  XL:   20,
  XXL:  24,
  XXXL: 32,
} as const;

/** 행간 (line-height 배율) */
export const LINE_HEIGHT = {
  XS:   1.2,
  SM:   1.3,
  MD:   1.4,
  LG:   1.4,
  XL:   1.3,
  XXL:  1.2,
  XXXL: 1.1,
} as const;

// ═══════════════════════════════════════════════════════════════
//  7. 스페이싱 (4px 베이스 그리드)
// ═══════════════════════════════════════════════════════════════

/** 스페이싱 스케일 (px) */
export const SPACE = {
  /** 4px — 아이콘 내부 여백, 미세 간격 */
  S1:  4,
  /** 8px — 인라인 간격, 라벨-값 사이 */
  S2:  8,
  /** 12px — 요소 간 기본 간격 */
  S3:  12,
  /** 16px — 패널 패딩, 섹션 간 간격 */
  S4:  16,
  /** 20px — 카드 패딩, 그룹 간 간격 */
  S5:  20,
  /** 24px — 모달 패딩, 큰 섹션 간격 */
  S6:  24,
  /** 32px — 화면 마진, 주요 영역 간 간격 */
  S8:  32,
  /** 48px — 대형 섹션 분리 */
  S12: 48,
} as const;

// ═══════════════════════════════════════════════════════════════
//  8. 슬롯/컴포넌트 규격
// ═══════════════════════════════════════════════════════════════

/** 슬롯 크기 규격 (px) */
export const SLOT = {
  /** 인벤토리/퀵/스킬 슬롯 */
  DEFAULT: { size: 36, gap: 2 },
  /** 장비 슬롯 */
  EQUIP:   { size: 40, gap: 4 },
  /** 기본 아이콘 */
  ICON:    { size: 32 },
  /** 미니 아이콘 */
  ICON_MINI: { size: 16 },
  /** NPC 초상화 (기본) */
  PORTRAIT: { size: 100 },
  /** NPC 초상화 (소형) */
  PORTRAIT_SM: { size: 64 },
  /** NPC 초상화 (미니) */
  PORTRAIT_XS: { size: 48 },
  /** 스킬바 슬롯 (전투) */
  SKILL: { size: 56, gap: 6 },
} as const;

/** 버튼 사이즈 규격 */
export const BUTTON_SIZE = {
  S: { width: 60,  height: 24 },
  M: { width: 120, height: 32 },
  L: { width: 200, height: 40 },
} as const;

// ═══════════════════════════════════════════════════════════════
//  9. 프레임/패널 스타일
// ═══════════════════════════════════════════════════════════════

export interface PanelStyle {
  borderColor: number;
  borderWidth: number;
  bgColor: number;
  bgAlpha: number;
  cornerRadius: number;
}

export const PANEL_STYLES = {
  /** 기본 패널: 대화창, 정보 */
  DEFAULT: {
    borderColor: BORDER.DEFAULT,
    borderWidth: 1,
    bgColor: BG.PANEL,
    bgAlpha: 0.9,
    cornerRadius: 2,
  },
  /** 강조 패널: 경고, 중요 안내 */
  ACCENT: {
    borderColor: BORDER.ACCENT,
    borderWidth: 2,
    bgColor: BG.PANEL,
    bgAlpha: 0.95,
    cornerRadius: 2,
  },
  /** 투명 패널: HUD 배경 */
  TRANSPARENT: {
    borderColor: 0x000000,
    borderWidth: 0,
    bgColor: 0x000000,
    bgAlpha: 0.6,
    cornerRadius: 0,
  },
  /** 모달: 확인/설정 */
  MODAL: {
    borderColor: BORDER.ACCENT,
    borderWidth: 2,
    bgColor: BG.PRIMARY,
    bgAlpha: 0.98,
    cornerRadius: 4,
  },
  /** 툴팁: 아이템 설명 */
  TOOLTIP: {
    borderColor: BORDER.SUBTLE,
    borderWidth: 1,
    bgColor: BG.ABYSS,
    bgAlpha: 0.95,
    cornerRadius: 2,
  },
} as const;

// ═══════════════════════════════════════════════════════════════
//  10. 버튼 스타일
// ═══════════════════════════════════════════════════════════════

export interface ButtonStyle {
  bgColor: number;
  bgHover: number;
  bgActive: number;
  borderColor: number;
  textColor: string;
  textHover: string;
}

export const BUTTON_STYLES = {
  /** 기본 버튼 */
  DEFAULT: {
    bgColor: BG.BUTTON, bgHover: BG.HOVER, bgActive: BG.FRAME,
    borderColor: BORDER.DEFAULT, textColor: TEXT.PRIMARY, textHover: '#FFFFFF',
  },
  /** 주요 액션 (에테르 블루) */
  PRIMARY: {
    bgColor: 0x1A3A5A, bgHover: 0x2A4A6A, bgActive: 0x0A2A4A,
    borderColor: ACCENT.ETHER, textColor: ACCENT_HEX.ETHER, textHover: '#FFFFFF',
  },
  /** 위험 액션 (적색) */
  DANGER: {
    bgColor: 0x4A1A1A, bgHover: 0x5A2A2A, bgActive: 0x3A0A0A,
    borderColor: ACCENT.DANGER, textColor: '#FF6666', textHover: '#FF8888',
  },
  /** 비활성 */
  DISABLED: {
    bgColor: 0x2A2A2A, bgHover: 0x2A2A2A, bgActive: 0x2A2A2A,
    borderColor: BORDER.SUBTLE, textColor: TEXT.MUTED, textHover: TEXT.MUTED,
  },
} as const;

// ═══════════════════════════════════════════════════════════════
//  11. Z-Index / Depth 계층
// ═══════════════════════════════════════════════════════════════

/** Phaser depth 계층 */
export const DEPTH = {
  /** 맵 바닥, 장식 (0~100) */
  BACKGROUND:  0,
  /** 캐릭터, NPC, 몬스터 (100~500) */
  ENTITY:      100,
  /** 스킬 이펙트, 파티클 (500~700) */
  EFFECT:      500,
  /** 체력바, 미니맵, 퀵슬롯 (700~800) */
  HUD:         700,
  /** 대화창, 인벤토리 (800~900) */
  UI_OVERLAY:  800,
  /** 대화창 (특정) */
  DIALOGUE:    850,
  /** 확인창, 설정창 (900~950) */
  MODAL:       900,
  /** 시스템 메시지, 토스트 (950~999) */
  NOTIFICATION: 950,
} as const;

// ═══════════════════════════════════════════════════════════════
//  12. NPC 대화 UI 토큰
// ═══════════════════════════════════════════════════════════════

/** NPC 대화 박스 기본 설정 */
export const DIALOGUE = {
  /** 대화창 크기/위치 (기본 해상도 1920x1080) */
  WIDTH:  800,
  HEIGHT: 200,
  PADDING: SPACE.S4,
  MARGIN_BOTTOM: SPACE.S4,

  /** 배경 스타일 */
  BG_COLOR: BG.PRIMARY,
  BG_ALPHA: 0.92,
  BORDER_COLOR: BORDER.DEFAULT,
  BORDER_WIDTH: 1,
  CORNER_RADIUS: 2,

  /** 초상화 */
  PORTRAIT_SIZE: SLOT.PORTRAIT.size,

  /** 텍스트 스타일 */
  NAME_COLOR: TEXT.ACCENT,
  NAME_SIZE: FONT_SIZE.XL,
  BODY_COLOR: TEXT.PRIMARY,
  BODY_SIZE: FONT_SIZE.MD,
  TYPING_SPEED: 30,           // ms per character
  MAX_LINES: 3,

  /** 선택지 버튼 */
  CHOICE: {
    WIDTH: 300,
    HEIGHT: 36,
    GAP: SPACE.S2,
    MAX_COUNT: 4,
    COLUMNS: 2,
    BG_COLOR: 0x1A3A5A,
    BG_HOVER: 0x2A4A6A,
    BG_DISABLED: 0x1A1A2A,
    BORDER_COLOR: ACCENT.ETHER,
    BORDER_DISABLED: BORDER.SUBTLE,
    TEXT_COLOR: ACCENT_HEX.ETHER,
    TEXT_HOVER: '#FFFFFF',
    TEXT_DISABLED: TEXT.MUTED,
    HINT_SIZE: FONT_SIZE.XS,
    HINT_COLOR: TEXT.MUTED,
  },

  /** Depth */
  DEPTH: DEPTH.DIALOGUE,

  /** 반응형 사이즈 */
  RESPONSIVE: {
    LARGE:  { width: 800, height: 200, portrait: 100, columns: 2, minViewport: 1280 },
    MEDIUM: { width: 700, height: 180, portrait: 80,  columns: 2, minViewport: 1024 },
    SMALL:  { width: 600, height: 160, portrait: 64,  columns: 1, minViewport: 768 },
    MOBILE: { width: -32, height: 200, portrait: 48,  columns: 1, minViewport: 0 },
    // MOBILE width: -32 = 뷰포트 100% - 32px
  },
} as const;

// ═══════════════════════════════════════════════════════════════
//  13. 시즌 테마
// ═══════════════════════════════════════════════════════════════

export type SeasonId = 's1' | 's2' | 's3';

export interface SeasonTheme {
  name: string;
  nameKo: string;
  frameAccent: number;
  accent: number;
  bgTint: number;
}

export const SEASON_THEMES: Record<SeasonId, SeasonTheme> = {
  s1: {
    name: 'Echoes of Memory', nameKo: '기억의 잔광',
    frameAccent: 0x89CFF0, accent: 0xB0E0FF, bgTint: 0x1A1A30,
  },
  s2: {
    name: 'Unsealed Awakening', nameKo: '깨어나는 봉인',
    frameAccent: 0xFF6347, accent: 0xFF8C00, bgTint: 0x2E1A1A,
  },
  s3: {
    name: 'Abyss of Memory', nameKo: '기억의 심연',
    frameAccent: 0xBF40BF, accent: 0xFF69B4, bgTint: 0x1A1A2E,
  },
} as const;

// ═══════════════════════════════════════════════════════════════
//  14. 반응형 브레이크포인트
// ═══════════════════════════════════════════════════════════════

export const BREAKPOINT = {
  MOBILE:   768,
  COMPACT:  1280,
  STANDARD: 1920,
  EXPANDED: 2560,
} as const;

export const UI_SCALE = {
  COMPACT:  { min: 1.25, max: 2.0 },
  STANDARD: 1.0,
  EXPANDED: 0.75,
} as const;

// ═══════════════════════════════════════════════════════════════
//  15. 애니메이션 토큰
// ═══════════════════════════════════════════════════════════════

export const ANIM = {
  /** 기본 트랜지션 (ms) */
  DURATION_FAST:   150,
  DURATION_NORMAL: 300,
  DURATION_SLOW:   500,

  /** 페이드 인/아웃 */
  FADE_IN:  300,
  FADE_OUT: 500,

  /** 대화창 열림/닫힘 */
  DIALOGUE_OPEN:  200,
  DIALOGUE_CLOSE: 150,

  /** 씬 전환 */
  SCENE_TRANSITION: 800,

  /** 이징 (Phaser ease string) */
  EASE_IN:     'Power2',
  EASE_OUT:    'Power2',
  EASE_IN_OUT: 'Sine.easeInOut',
  EASE_BOUNCE: 'Bounce.easeOut',
} as const;

// ═══════════════════════════════════════════════════════════════
//  16. 유틸리티 함수
// ═══════════════════════════════════════════════════════════════

/**
 * HP 잔량 비율에 따른 게이지 색상을 보간합니다.
 * 0% = GAUGE.HP.LOW (적색), 100% = GAUGE.HP.FULL (녹색)
 */
export function getHpColor(ratio: number): number {
  const r1 = (GAUGE.HP.LOW >> 16) & 0xFF;
  const g1 = (GAUGE.HP.LOW >> 8) & 0xFF;
  const b1 = GAUGE.HP.LOW & 0xFF;
  const r2 = (GAUGE.HP.FULL >> 16) & 0xFF;
  const g2 = (GAUGE.HP.FULL >> 8) & 0xFF;
  const b2 = GAUGE.HP.FULL & 0xFF;
  const t = Math.max(0, Math.min(1, ratio));
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return (r << 16) | (g << 8) | b;
}

/**
 * MP 잔량 비율에 따른 게이지 색상을 보간합니다.
 * 0% = GAUGE.MP.START (청색), 100% = GAUGE.MP.END (보라)
 */
export function getMpColor(ratio: number): number {
  const r1 = (GAUGE.MP.START >> 16) & 0xFF;
  const g1 = (GAUGE.MP.START >> 8) & 0xFF;
  const b1 = GAUGE.MP.START & 0xFF;
  const r2 = (GAUGE.MP.END >> 16) & 0xFF;
  const g2 = (GAUGE.MP.END >> 8) & 0xFF;
  const b2 = GAUGE.MP.END & 0xFF;
  const t = Math.max(0, Math.min(1, ratio));
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return (r << 16) | (g << 8) | b;
}

/**
 * 뷰포트 너비에 따라 적절한 대화창 반응형 설정을 반환합니다.
 */
export function getDialogueResponsive(viewportWidth: number) {
  const r = DIALOGUE.RESPONSIVE;
  if (viewportWidth >= r.LARGE.minViewport) return r.LARGE;
  if (viewportWidth >= r.MEDIUM.minViewport) return r.MEDIUM;
  if (viewportWidth >= r.SMALL.minViewport) return r.SMALL;
  return r.MOBILE;
}

/**
 * 아이템 등급에 해당하는 스타일을 반환합니다.
 * 유효하지 않은 등급이면 'common'을 반환합니다.
 */
export function getRarityStyle(rarity: string): RarityStyle {
  return RARITY[rarity as ItemRarity] ?? RARITY.common;
}

/**
 * 지역 ID에 따른 테마를 반환합니다.
 * 유효하지 않은 ID면 'erebos' 기본값을 반환합니다.
 */
export function getRegionTheme(regionId: string): RegionTheme {
  return REGION_THEMES[regionId as RegionId] ?? REGION_THEMES.erebos;
}
