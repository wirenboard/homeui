import baseConfig from '@wirenboard/eslint';
import reactConfig from '@wirenboard/eslint/react';

const getCustomConfig = (cfg) => {
  const customIgnores = [
    'src/custom.d.ts',
    'app/3rdparty/**',
    'app/lib/**',
    'app/scripts/**',
    '!app/scripts/react-directives/**',
    'webpack.config.js',
  ];
  const { ignores, ...rest } = cfg.at(0);

  return [{ ...rest, ignores: [...ignores, ...customIgnores] }];
};

export default [
  ...getCustomConfig(baseConfig),
  ...getCustomConfig(reactConfig),
];
