import path from 'path';
import webpackNodeExternals from 'webpack-node-externals';
import TsconfigPathsPlugin from 'tsconfig-paths-webpack-plugin';

const resolvedDirname = path.resolve('');

export default {
  entry: './src/index.ts',
  output: {
    filename: 'bundle.js',
    path: path.resolve(resolvedDirname, 'dist'),
    module: true,
    environment: {
      arrowFunction: false,
      const: false,
    },
  },
  resolve: {
    extensions: ['.ts', '.js', '.mjs', '.json'],
    plugins: [new TsconfigPathsPlugin()],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: 'ts-loader',
      },
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env'],
          },
        },
      },
    ],
  },
  experiments: {
    outputModule: true,
  },
  target: 'node',
  externals: [webpackNodeExternals({ importType: 'module' })],
  mode: 'production',
};
