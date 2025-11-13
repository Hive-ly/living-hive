module.exports = {
  root: true,
  env: {
    browser: true,
    es2023: true,
    node: true,
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
  },
  plugins: [
    '@typescript-eslint',
    'react',
    'react-hooks',
    'jsx-a11y',
    'import',
  ],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:jsx-a11y/recommended',
    'plugin:import/errors',
    'plugin:import/warnings',
    'plugin:import/typescript',
    'prettier',
  ],
  settings: {
    react: {
      version: 'detect',
    },
    'import/resolver': {
      typescript: true,
      node: true,
    },
  },
  rules: {
    'no-console': [
      'warn',
      {
        allow: ['warn', 'error'],
      },
    ],
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'error',
    'import/order': 'off',
  },
  overrides: [
    {
      files: ['*.config.{ts,cts,mts}', 'scripts/**/*.{ts,tsx}'],
      env: {
        node: true,
      },
    },
    {
      files: ['src/**/*.{test,spec}.{ts,tsx}'],
      env: {
        node: true,
      },
      plugins: ['vitest'],
      extends: ['plugin:vitest/recommended'],
      rules: {
        'vitest/max-expects': 'off',
        'vitest/consistent-test-it': 'off',
      },
    },
  ],
};

