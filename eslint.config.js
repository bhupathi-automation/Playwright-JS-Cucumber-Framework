import eslint from '@eslint/js';
import globals from 'globals';

export default [
  {
    ignores: ['node_modules/**', 'reports/**', 'coverage/**', 'features/**'],
  },
  eslint.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      'no-console': 'off',
      'require-await': 'error',
    },
  },
];
