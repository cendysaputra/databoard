import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/** Features must not reach into each other; shared code lives in `src/shared`. */
const featureNames = [
  'home',
  'collections',
  'calendar',
  'notes',
  'portfolio',
  'recorder',
  'settings',
];
const noCrossFeatureImports = featureNames.map((name) => ({
  files: [`src/features/${name}/**`],
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            regex: `^@/features/(?!${name}/)`,
            message: 'Features must not import each other. Move shared code to src/shared.',
          },
          {
            regex: '^@tauri-apps/',
            message: 'Talk to the backend through src/data, not Tauri APIs directly.',
          },
        ],
      },
    ],
  },
}));

export default tseslint.config(
  { ignores: ['dist', 'target', 'src-tauri', 'src/shared/types'] },
  js.configs.recommended,
  tseslint.configs.strict,
  reactHooks.configs.flat.recommended,
  {
    languageOptions: { globals: globals.browser },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
  {
    files: ['scripts/**', '*.config.{js,ts}'],
    languageOptions: { globals: globals.node },
  },
  ...noCrossFeatureImports,
  prettier,
);
