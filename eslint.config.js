import js from '@eslint/js';
import ts from 'typescript-eslint';

export default ts.config(
  {
    ignores: [
      'dist/**',
      'archive/**',
      'node_modules/**',
      'scratchpad/**',
      // Agent and tooling scratch that lives in the working tree but not the repo.
      '.remember/**',
      '.playwright-mcp/**',
      '.vercel/**',
    ],
  },
  js.configs.recommended,
  ...ts.configs.strictTypeChecked,
  ...ts.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      // Coordinate arithmetic reads better as `${cx + 4}` than `${String(cx + 4)}`,
      // and a number in a template is never ambiguous the way an object is.
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      '@typescript-eslint/no-non-null-assertion': 'error',
      'no-console': ['error', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'always'],
    },
  },
  {
    // Config files are not part of the app's TypeScript project, so type-aware rules
    // have nothing to check them against.
    files: ['*.js'],
    ...ts.configs.disableTypeChecked,
  },
  {
    // Tests assert on values the compiler has already narrowed. Leaving the assertions
    // in is what makes a failure legible when the data changes underneath them.
    files: ['tests/**/*.ts'],
    rules: {
      '@typescript-eslint/no-unnecessary-type-assertion': 'off',
      '@typescript-eslint/no-unnecessary-condition': 'off',
    },
  },
);
