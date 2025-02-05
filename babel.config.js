module.exports = {
  presets: ['@babel/preset-env', '@babel/preset-typescript'],
  plugins: ['@babel/plugin-proposal-decorators'],
  overrides: [
    {
      test: /\.ts$/,
      plugins: [
        ['@babel/plugin-proposal-decorators', { legacy: true }],
        ['@babel/plugin-transform-flow-strip-types'],
        ['@babel/plugin-proposal-class-properties', { loose: true }],
        ['babel-plugin-transform-typescript-metadata'],
        [
          'transform-imports',
          {
            patterns: [
              {
                groupName: './',
                groupMatches: ['.*'],
                packageName: './$1.js',
              },
            ],
          },
        ],
      ],
    },
  ],
};
