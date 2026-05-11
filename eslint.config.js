const js = require('@eslint/js')
const tsParser = require('@typescript-eslint/parser')
const tsPlugin = require('@typescript-eslint/eslint-plugin')
const prettierPlugin = require('eslint-plugin-prettier')
const prettierConfig = require('eslint-config-prettier')
const globals = require('globals')

module.exports = [
  js.configs.recommended,
  prettierConfig,
  {
    files: ['src/**/*.ts'],
    ignores: ['src/**/*.d.ts'],
    plugins: { prettier: prettierPlugin, '@typescript-eslint': tsPlugin },
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: { ...globals.node },
    },
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-undef': 'off',
      'prettier/prettier': 'error',
      'no-console': 'warn',
    },
  },
]
