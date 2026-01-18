module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
  ],
  rules: {
    // Production build - relaxed rules for stability
    '@typescript-eslint/no-unused-vars': ['error', { 
      'argsIgnorePattern': '^_',
      'varsIgnorePattern': '^_|^[A-Z]', // Allow unused imports and types
      'ignoreRestSiblings': true 
    }],
    '@typescript-eslint/explicit-function-return-type': 'off', // Allow inferred returns
    '@typescript-eslint/no-explicit-any': 'off', // Allow any in tests
    'no-unused-vars': 'off', // Turn off base rule as it can report incorrect errors
  },
  env: {
    node: true,
    jest: true,
  },
};