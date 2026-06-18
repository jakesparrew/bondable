// Production ESLint configuration for security and performance
module.exports = {
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  root: true,
  rules: {
    // 🚨 SECURITY: No console statements in production
    'no-console': 'error',
    
    // 🚨 SECURITY: No debugger statements
    'no-debugger': 'error',
    
    // 🚨 SECURITY: No eval usage
    'no-eval': 'error',
    
    // 🚨 SECURITY: No implied eval
    'no-implied-eval': 'error',
    
    // 🚨 SECURITY: No unsafe innerHTML usage
    'no-script-url': 'error',
    
    // 🔒 SECURITY: Require === instead of ==
    'eqeqeq': 'error',
    
    // 🔒 SECURITY: No var declarations (use let/const)
    'no-var': 'error',
    
    // 🔒 SECURITY: Prefer const when possible
    'prefer-const': 'error',
    
    // ⚡ PERFORMANCE: No unused variables
    'no-unused-vars': 'error',
    '@typescript-eslint/no-unused-vars': 'error',
    
    // ⚡ PERFORMANCE: No empty functions
    'no-empty-function': 'error',
    
    // 🔒 TYPE SAFETY: Strict TypeScript rules
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unsafe-assignment': 'warn',
    '@typescript-eslint/no-unsafe-call': 'warn',
    
    // 🔒 SECURITY: No dangerous object access
    'dot-notation': 'error',
    
    // 🔒 SECURITY: No with statements
    'no-with': 'error',
  },
  env: {
    browser: true,
    es2022: true,
    node: true,
  },
};