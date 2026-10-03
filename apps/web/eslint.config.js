// apps/web ESLint flat config — extends the root shared TS rules and layers
// React + React Hooks on top (see docs/11 §2).
import react from 'eslint-plugin-react';
import hooks from 'eslint-plugin-react-hooks';

import root from '../../eslint.config.js';

export default [
  ...root,
  {
    plugins: { react, 'react-hooks': hooks },
    rules: {
      ...hooks.configs.recommended.rules,
    },
    settings: {
      react: { version: 'detect' },
    },
  },
];
