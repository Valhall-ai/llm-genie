const path = require('path');
const webpack = require('webpack');

module.exports = {
  mode: 'production',
  entry: './src/classes/llm.ts',
  output: {
    filename: 'llm.min.js',
    path: path.resolve(__dirname, 'dist'),
    library: 'LLMGenie',
    libraryTarget: 'umd',
    globalObject: 'this',
  },
  resolve: {
    extensions: ['.ts', '.js'],
    fallback: {
      fs: false,
      path: require.resolve('path-browserify'),
      stream: require.resolve('stream-browserify'),
      timers: require.resolve('timers-browserify'),
      process: require.resolve('process'),
    },
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  target: 'browserslist:> 0.25%, not dead',
};