/**
 * Tailwind CSS 설정 — 에테르나 크로니클 어드민 대시보드
 *
 * 게임 클라이언트 디자인 토큰(DESIGN.md)과 일치하는 테마를 적용합니다.
 * 작성: 가춘운 (CMO/디자인)
 */

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],

  theme: {
    extend: {
      // ── 컬러 시스템 (Aeterna Dark 테마) ──
      colors: {
        aeterna: {
          // 배경
          abyss:   '#0D0D1A',
          primary: '#1A1A2E',
          panel:   '#16213E',
          frame:   '#2A2A3A',
          button:  '#3A3A4A',
          hover:   '#4A4A5A',
          input:   '#0D0D1A',
        },
        text: {
          primary:   '#E8E8E8',
          secondary: '#A0A0A0',
          muted:     '#606060',
          accent:    '#FFD700',
          warning:   '#FF4444',
        },
        accent: {
          ether:   '#89CFF0',
          success: '#2ECC71',
          danger:  '#FF4444',
        },
        border: {
          default: '#5A5A6A',
          accent:  '#FFD700',
          subtle:  '#3A3A4A',
        },
        // 게이지 바
        gauge: {
          hp:  '#2ECC71',
          'hp-low': '#E74C3C',
          mp:  '#3498DB',
          'mp-end': '#9B59B6',
          exp: '#F39C12',
        },
        // 아이템 등급
        rarity: {
          common:    '#808080',
          uncommon:  '#2ECC71',
          rare:      '#3498DB',
          epic:      '#9B59B6',
          legendary: '#F39C12',
          mythic:    '#E74C3C',
          ether:     '#89CFF0',
        },
      },

      // ── 폰트 패밀리 ──
      fontFamily: {
        body:  ['Pretendard', 'Noto Sans KR', 'Inter', 'system-ui', 'sans-serif'],
        title: ['여기어때 잘난체 Bold', 'Pirata One', 'Cinzel', 'serif'],
        mono:  ['JetBrains Mono', 'monospace'],
      },

      // ── 폰트 크기 (게임 토큰과 동일) ──
      fontSize: {
        'game-xs':   ['10px', { lineHeight: '1.2' }],
        'game-sm':   ['12px', { lineHeight: '1.3' }],
        'game-md':   ['14px', { lineHeight: '1.4' }],
        'game-lg':   ['16px', { lineHeight: '1.4' }],
        'game-xl':   ['20px', { lineHeight: '1.3' }],
        'game-2xl':  ['24px', { lineHeight: '1.2' }],
        'game-3xl':  ['32px', { lineHeight: '1.1' }],
      },

      // ── 스페이싱 (4px 베이스 그리드) ──
      spacing: {
        'game-1':  '4px',
        'game-2':  '8px',
        'game-3':  '12px',
        'game-4':  '16px',
        'game-5':  '20px',
        'game-6':  '24px',
        'game-8':  '32px',
        'game-12': '48px',
      },

      // ── 테두리 반경 ──
      borderRadius: {
        'pixel': '2px',   // 픽셀 정합 (게임 기본)
        'panel': '4px',   // 모달/패널
      },

      // ── 박스 그림자 (에테르 글로우) ──
      boxShadow: {
        'ether-sm': '0 0 8px rgba(137, 207, 240, 0.15)',
        'ether':    '0 0 16px rgba(137, 207, 240, 0.2)',
        'ether-lg': '0 0 30px rgba(137, 207, 240, 0.3)',
        'gold':     '0 0 12px rgba(255, 215, 0, 0.2)',
        'danger':   '0 0 12px rgba(255, 68, 68, 0.2)',
      },

      // ── 트랜지션 ──
      transitionDuration: {
        'fast':   '150ms',
        'normal': '300ms',
        'slow':   '500ms',
      },

      // ── 애니메이션 ──
      animation: {
        'ether-pulse': 'ether-pulse 2s ease-in-out infinite',
        'fade-in':     'fade-in 300ms ease-out',
      },
      keyframes: {
        'ether-pulse': {
          '0%, 100%': { boxShadow: '0 0 8px rgba(137, 207, 240, 0.1)' },
          '50%': { boxShadow: '0 0 20px rgba(137, 207, 240, 0.3)' },
        },
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },

  plugins: [],
};
