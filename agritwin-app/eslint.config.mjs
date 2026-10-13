import { FlatCompat } from '@eslint/eslintrc';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import globals from 'globals';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

export default [
  ...compat.config({
    extends: ['expo'],
  }),

  {
    ignores: ['node_modules/', '.expo/', 'dist/', 'build/'],
  },

  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },

  {
    files: ['e2e/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
        device: 'readonly',
        element: 'readonly',
        by: 'readonly',
      },
    },
  },
];
