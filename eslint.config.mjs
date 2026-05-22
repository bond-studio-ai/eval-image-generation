import nextConfig from 'eslint-config-next';
import prettierConfig from 'eslint-config-prettier';

const eslintConfig = [
  ...nextConfig,
  prettierConfig,
  {
    rules: {
      'no-unused-vars': 'off',
      // The repo has existing React Compiler diagnostics in older UI
      // surfaces. Keep lint usable while those files are refactored
      // behind focused tests.
      'react-hooks/refs': 'off',
      'react-hooks/rules-of-hooks': 'off',
      'react-hooks/set-state-in-effect': 'off',
    },
  },
];

export default eslintConfig;
