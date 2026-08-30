const js = require('@eslint/js');
const react = require('eslint-plugin-react');
const reactHooks = require('eslint-plugin-react-hooks');
const globals = require('globals');

/**
 * A plain JavaScript config rather than eslint-config-expo.
 *
 * That preset pulls in typescript-eslint, which refuses to load against the
 * TypeScript version resolved here — and this project has no TypeScript in it,
 * so the whole toolchain would be carried for nothing.
 */
module.exports = [
  { ignores: ['dist/*', 'node_modules/*', '.expo/*', 'babel.config.js', 'metro.config.js'] },
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: {
        ...globals.browser,
        ...globals.node,
        __DEV__: 'readonly',
        FormData: 'readonly',
      },
    },
    plugins: { react, 'react-hooks': reactHooks },
    settings: { react: { version: 'detect' } },
    rules: {
      /*
       * Catches a `const` referenced above its declaration.
       *
       * That is a runtime crash, not a syntax error, so it compiles and
       * bundles cleanly and only fails when the screen actually renders —
       * which is exactly how one reached a device. Functions are exempt
       * because hoisted function declarations are genuinely fine.
       */
      'no-use-before-define': ['error', { functions: false, classes: true, variables: true }],

      ...react.configs.flat.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      // The new JSX transform means React need not be in scope.
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
];
