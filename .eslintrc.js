/**
 * P10-19: 통일된 ESLint 설정
 * server + client + admin-dashboard 3앱 공통 적용
 */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  env: {
    node: true,
    browser: true,
    es2022: true,
  },
  rules: {
    // ── 코드 품질 ───────────────────────────────
    '@typescript-eslint/no-unused-vars': ['error', {
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
      destructuredArrayIgnorePattern: '^_',
      caughtErrorsIgnorePattern: '^_',
      ignoreRestSiblings: true,
    }],
    'no-unused-expressions': ['error', { allowShortCircuit: true, allowTernary: true }],
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/consistent-type-imports': ['warn', {
      prefer: 'type-imports',
    }],

    // ── 안전성 ──────────────────────────────────
    'no-console': ['warn', { allow: ['warn', 'error', 'info', 'log'] }],
    'no-debugger': 'error',
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',

    // ── 코드 스타일 (최소) ──────────────────────
    'prefer-const': 'warn',
    'no-var': 'error',
    'eqeqeq': ['warn', 'always'],
    'curly': ['warn', 'multi-line'],

    // ── TypeScript 특화 ─────────────────────────
    '@typescript-eslint/no-non-null-assertion': 'off',  // 프로젝트 내 안전한 사용 허용
    '@typescript-eslint/ban-ts-comment': 'warn',
  },
  overrides: [
    {
      // 테스트 파일: 완화된 규칙
      files: ['**/*.test.ts', '**/*.test.tsx', '**/tests/**'],
      globals: {
        afterAll: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        beforeEach: 'readonly',
        describe: 'readonly',
        expect: 'readonly',
        it: 'readonly',
        test: 'readonly',
        vi: 'readonly',
      },
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-unused-vars': 'off',
        'no-console': 'off',
      },
    },
    {
      // React 컴포넌트 (admin-dashboard, client)
      files: ['**/*.tsx'],
      extends: ['plugin:react/recommended'],
      settings: {
        react: {
          version: 'detect',
        },
      },
      rules: {
        'react/react-in-jsx-scope': 'off',  // React 17+ automatic JSX runtime
        'react/prop-types': 'off',           // TypeScript 사용
      },
    },
  ],
  ignorePatterns: [
    'node_modules/',
    'dist/',
    'build/',
    'coverage/',
    '*.js.map',
    'server/dist/',
    'server/node_modules/',
  ],
};
