import vitest from '@vitest/eslint-plugin';
import baseConfig from '@wirenboard/eslint';
import reactConfig from '@wirenboard/eslint/react';

const getCustomConfig = (cfg) => {
  const customIgnores = [
    'src/custom.d.ts',
    'src/components/json-editor/extensions/*',
  ];
  const { ignores, ...rest } = cfg.at(0);

  return [{ ...rest, ignores: [...ignores, ...customIgnores] }];
};

export default [
  ...getCustomConfig(baseConfig),
  ...getCustomConfig(reactConfig),
  {
    files: ['**/*.test.ts', '**/*.test.tsx', 'src/test/**/*.ts'],
    ...vitest.configs.env,
  },
];
