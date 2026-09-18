import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypeScript from 'eslint-config-next/typescript';

const config = [
  { ignores: ['.next/**', 'out/**', 'dist/**', 'node_modules/**', 'next-env.d.ts'] },
  ...nextCoreWebVitals,
  ...nextTypeScript,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'smart'],
      'prefer-const': 'error',
    },
  },
  {
    // 시뮬레이션 엔진은 React/Next/상태관리에 의존하지 않는다. 의존이 생기면 빌드가 막힌다.
    files: ['src/simulation/**/*.ts', 'src/config/**/*.ts', 'src/types/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'react', message: '시뮬레이션 엔진은 React 에 의존할 수 없습니다.' },
            { name: 'react-dom', message: '시뮬레이션 엔진은 React 에 의존할 수 없습니다.' },
            {
              name: 'zustand',
              message: '시뮬레이션 엔진은 상태관리 라이브러리에 의존할 수 없습니다.',
            },
          ],
          patterns: ['next/*', '@/store/*', '@/components/*', '@/features/*', '@/lib/*'],
        },
      ],
    },
  },
];

export default config;
