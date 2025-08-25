import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import importPlugin from 'eslint-plugin-import';
import eslintConfigPrettier from 'eslint-plugin-prettier/recommended';
import globals from 'globals';

export default tseslint.config([
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    extends: [
      eslint.configs.recommended,
      tseslint.configs.recommended,
      importPlugin.flatConfigs.typescript,
      eslintConfigPrettier,
    ],
    files: ['**/*.{ts,tsx}'],
    rules: {
      'prettier/prettier': ['error', { endOfLine: 'auto' }],
      'import/enforce-node-protocol-usage': ['error', 'always'],
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
]);
