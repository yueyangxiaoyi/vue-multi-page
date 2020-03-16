const path = require('path');
const webpack = require('webpack');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = {
  entry: {
    vendor: ['vue/dist/vue.esm.js', 'axios', 'normalize.css'] // 所需要的打包前端公共模块
  },
  output: {
    path: path.resolve(__dirname, 'Public'), // 打包后文件输出的位置
    filename: '[name].dll.js',
    /**
     * output.library
     * 将会定义为 window.${output.library}
     * 在这次的例子中，将会定义为`window.vendor_library`
     */
    library: '[name]_library'
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        // 使用提取 css 文件的插件，能帮我们提取 webpack 中引用的和 vue 组件中使用的样式
        use: [
          MiniCssExtractPlugin.loader,
          'css-loader'
        ]
      }
    ]
  },
  plugins: [
    new webpack.DllPlugin({  //主要是使用这个插件去打包js
      /**
       * path
       * 定义 manifest 文件生成的位置
       * [name]的部分由entry的名字替换
       */
      path: path.join(__dirname, '.', 'Public/[name]-manifest.json'),
      /**
       * name
       * dll bundle 输出到那个全局变量上
       * 和 output.library 一样即可。
       */
      name: '[name]_library',
      context: path.join(__dirname, '.')
    }),
    new UglifyJsPlugin({    // 使用这个插件可以混淆打包完成的js
      uglifyOptions: {
        compress: {
          warnings: false
        }
      },
      sourceMap: true,
      parallel: true
    }),
    new MiniCssExtractPlugin({
      filename: '[name].css'
    }),
  ]
};