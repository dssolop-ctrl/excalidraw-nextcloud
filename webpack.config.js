const path = require('path')
const CopyPlugin = require('copy-webpack-plugin')
const { VueLoaderPlugin } = require('vue-loader')

module.exports = {
  entry: {
    fileaction: path.join(__dirname, 'src', 'fileaction.jsx'),
    navigator: path.join(__dirname, 'src', 'navigator.js'),
    public: path.join(__dirname, 'src', 'public.jsx'),
  },
  output: {
    path: path.join(__dirname, 'js'),
    filename: '[name].js',
    publicPath: '/custom_apps/excalidraw/js/',
  },
  plugins: [
    new VueLoaderPlugin(),
    new CopyPlugin({
      patterns: [
        {
          from: path.join(__dirname, 'node_modules/@excalidraw/excalidraw/dist/prod/fonts'),
          to: path.join(__dirname, 'js/fonts'),
          noErrorOnMissing: true,
        },
      ],
    }),
  ],
  module: {
    rules: [
      {
        test: /\.vue$/,
        loader: 'vue-loader',
      },
      {
        // Excalidraw's ESM dist imports roughjs without .js extension
        test: /\.m?js$/,
        resolve: { fullySpecified: false },
      },
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              '@babel/preset-env',
              ['@babel/preset-react', { runtime: 'automatic' }],
            ],
          },
        },
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  resolve: {
    extensions: ['.js', '.jsx', '.vue', '.json'],
    alias: {
      vue$: 'vue/dist/vue.esm.js',
    },
    fallback: {
      string_decoder: false,
    },
  },
}
