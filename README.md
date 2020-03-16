# Webpack + Vue 多页面项目升级 Webpack 4 以及构建速度优化

> 多页面下使用 webpack + vue 的配置过程的[传送门](https://github.com/cnu4/Webpack-Vue-MultiplePage/tree/v1)

## 0. 前言

早在 2016 年我就发布过一篇关于在多页面下使用 Webpack + Vue 的配置的文章，当时也是我在做自己一个个人项目时遇到的配置问题，想到别人也可能遇到跟我同样的问题，就把配置的思路分享出来了，[传送门](https://github.com/cnu4/Webpack-Vue-MultiplePage/tree/v1)在这里。

因为那份配置直到现在还有人在关注，同时最近公司帮助项目升级了 Webpack 4，趁机也把之前的配置也升级了一下，顺手加上了 babel 7 的配置，而且博客荒废了这么久，都快 9102 年了，不能连年均一篇博文都不到，所以有了下面的分享。

下面的配置主要是给在多页面下使用 Webpack 的同学在升级 Webpack 时提供一点思路，多页面的配置思路请点击上面的传送门。

## 1. Webpack 升级 4.x

### 1.1. 升级和安装相关依赖

 - webpack 升级
 - webpack-cli webapck4.x 需要新加的依赖
 - mini-css-extract-plugin 取代 extract-text-webpack-plugin
 - 其他相关 loader 和 plugin 
   - css-loader
   - file-loader
   - url-loader
   - vue-style-loader
   - vue-template-compiler（注意要保持与 vue 版本一直）
   - html-webpack-plugin@next
 
### 1.2 修改配置

#### mode 构建模式

设置 mode 构建模式，比如 development 会将 process.env.NODE_ENV 的值设为 development

#### mini-css-extract-plugin

删除原 extract-text-webpack-plugin 配置，增加 mini-css-extract-plugin 配置

```js
module.exports = {
  plugins: [
    new  MiniCssExtractPlugin({
      filename:  'css/[name].css'
    }),
  ],
}

module.exports = {
  module: {
    rules: [
      {
        test:/\.vue$/,
        loader: 'vue-loader',
      },
      { test: /\.css$/,
        use: [
          // 开发模式下使用 vue-style-loader，以便使用热重载
          process.env.NODE_ENV !== 'production' ?
            'vue-style-loader' : MiniCssExtractPlugin.loader,
          'css-loader' ] },
    ]
  }
}
```

#### optimization

这是 webpack 4 一个比较大的变动点，webpack 4 中删除了 `webpack.optimize.CommonsChunkPlugin`，并且使用 `optimization` 中的`splitChunk`来替代，下面的配置代替了之前的 CommonsChunkPlugin 配置，同意能提取 JS 和 CSS 文件

```js
module.exports = {
  optimization: {
    splitChunks: {
      vendors: {
        name:  'venders',
        chunks:  'all',
        minChunks: chunks.length
    }
  }
}
```

#### vue-loader 升级

vue-loader 15 注意要配合一个 webpack 插件才能正确使用

```js
const { VueLoaderPlugin } = require('vue-loader') 

module.exports = {
  plugins: [ new VueLoaderPlugin() ]
}

```
#### html-webpack-plugin 升级

升级到 `next`，否则开发下无法正常注入资源文件

#### 文件压缩

 - optimize-css-assets-webpack-plugin
 - terser-webpack-plugin

压缩的配置也移动到了 optimization 选项下，值得注意的是压缩工具换成了 terser-webpack-plugin，这是 webpack 官方也推荐使用的，估计在 webpack 5 中会变成默认的配置，实测打包速度确实变快了很多。

配置

```js
module.exports = {
    minimizer: [
      new TerserPlugin({ // 压缩js
          cache:  true,
          parallel:  true
        }
      }),
      new OptimizeCSSAssetsPlugin({ // 压缩css
        cssProcessorOptions: {
          safe: true
        }
      })
    ]
  }
}
```

## 2. 打包速度优化

可以使用下面的插件看看打包时间主要耗时在哪

[speed-measure-webpack-plugin](https://github.com/stephencookdev/speed-measure-webpack-plugin)

### 2.1 相关 plugin 开启 parallel 选项

TerserPlugin 压缩插件可以开启多线程，见上面配置

### 2.2 HappyPack 和 thread-loader 开启 Loader 多进程转换

github 的 Demo 中没有引入，有兴趣的同学可以尝试，在一些耗时的 Loader 确实可以提高速度

vue-loader 不支持 HappyPack，官方建议用 thread-loader

```js
const HappyPack = require('happypack');

exports.module = {
  rules: [
    {
      test: /.js$/,
      // 1) replace your original list of loaders with "happypack/loader":
      // loaders: [ 'babel-loader?presets[]=es2015' ],
      use: 'happypack/loader',
      include: [ /* ... */ ],
      exclude: [ /* ... */ ]
    }
  ]
};

exports.plugins = [
  // 2) create the plugin:
  new HappyPack({
    // 3) re-add the loaders you replaced above in #1:
    loaders: [ 'babel-loader?presets[]=es2015' ]
  })
];
```

### 2.3 提前打包公共代码

#### DllPlugin
 
使用 DllPlugn 将 node_modules 或者自己编写的不常变的依赖包打一个 dll 包，提高速度和充分利用缓存。相当于 splitChunks 提取了公共代码，但 DllPlugn 是手动指定了公共代码，提前打包好，免去了后续 webpack 构建时的重新打包。

首先需要增加一个 webpack 配置文件 `webpack.dll.config.js` 专门针对 dll 打包配置，其中用到 `    webpack.DllPlugin`。

执行 `webpack --config build/webpack.dll.config.js` 后，webpack会自动生成 2 个文件，其中**vendor.dll.js** 即合并打包后第三方模块。另外一个 **vendor-mainifest.json** 存储各个模块和所需公用模块的对应关系。

接着修改我们的 webpack 配置文件，在 plugin 配置中增加 `webpack.DllReferencePlugin`，配置中指定上一步生成的 json 文件，然后手动在 html 文件中引用上一步的 **vendor.dll.js** 文件。

后面如果增删 dll 中的依赖包时都需要手动执行上面打包命令来更新 dll 包。下面插件可以自动完成这些操作。

#### AutoDllPlugin

安装依赖 `autodll-webpack-plugin`

AutoDllPlugin 自动同时相当于完成了 DllReferencePlugin 和 DllPlugin 的工作，只需要在我们的 webpack 中添加配置。AutoDllPlugin 会在执行 `npm install / remove / update package-name` 或改变这个插件配件时重新打包 dll。需要注意的是改变 dll 中指定的依赖包不会触发自动重新打包 dll。

实际打包中生成环境是没问题的，但开发模式下在有缓存的情况下，autodll 插件不会生成新的文件，导致 404，所以在 Demo 中暂时关了这个插件。不过 dll 提前打包了公共文件，确实可以提高打包速度，有兴趣的同学可以研究下开发模式下的缓存问题，欢迎在评论中分享。

```js
module.exports.plugins.push(new AutoDllPlugin({
  inject: true, // will inject the DLL bundles to html
  context: path.join(__dirname, '.'),
  filename: '[name].dll.js',
  debug: true,
  inherit: true,
  // path: './',
  plugins: [
    new TerserPlugin({
      cacheL true,
      parallel: true
    }),
    new MiniCssExtractPlugin({
      filename: '[name].css'
    })
  ],
  entry: {
    vendor: ['vue/dist/vue.esm.js', 'axios', 'normalize.css']
  }
}));
```

## 3. 增加 ES6+ 支持

### 3.1 安装依赖

  - @babel/core
  - @babel/plugin-proposal-class-properties
  - @babel/plugin-proposal-decorators
  - @babel/plugin-syntax-dynamic-import
  - @babel/plugin-transform-runtime
  - @babel/preset-env
  - @babel/runtime
  - babel-loader
  - @babel/polyfill

由于项目中是第一次配置 babel，一步到位直接使用新版 7，新版 babel 使用新的命名空间 @babel，如果是老项目升级 babel 7，可以使用工具 [babel-upgrade](https://github.com/babel/babel-upgrade)，读一下 [升级文档](https://babeljs.io/docs/en/v7-migration)

这里说下上面依赖的作用和升级 babel 7 的改动。

#### @babel/runtime, @babel/plugin-transform-runtime

新版中 @babel/runtime 只包含了一些 helpers，如果需要 core-js polyfill 浏览器不支持的 API，可以用 transform 提供的选项 `{"corejs": 2}` 并安装依赖 `@babel/runtime-corejs2`。即使默认的 polyfill 没了，但 @babel/plugin-transform-runtime 依然可以为我们分离辅助函数，减少代码体积

#### @babel/polyfill

使用 @babel/runtime 的 polyfill 不会污染全局 API，因为不会改动原生对象的原型，它只是创建一个辅助函数在当前作用于生效，所以诸如 `[1, 2].includes(1)` 这样的语法也无法被 polyfill。如果不是开发第三方库，可以使用 @babel/polyfill，相反他的 polyfill 会影响到浏览器全局的对象原型

@babel/preset-env 提供了一个 [useBuiltIns](https://babeljs.io/docs/en/next/babel-preset-env.html#usebuiltins) 选项来按需引入 polyfill，而不需要引入全部。另一种方法是直接引用 core-js 包下的特定 polyfill。

#### stage presets

现在需要手动安装 @babel/plugin-proposal 开头的依赖是因为 babel 在新版中移除了 stage presets，为的是后续更好维护处于 proposal 阶段的语法。想要使用 proposal 阶段的语法需要单独引用对应的 plugin， 上面的配置只加了几个处于 stage 3 阶段的 plugin，老项目建议使用 babel-upgrade 升级，自动添加依赖

### 3.2 添加配置文件 .babelrc

```json
{
  "presets": [
    [
      "@babel/preset-env",
      {
        "modules": false,
        "targets": {
          "browsers": [
            "> 1%",
            "last 2 versions",
            "ie >= 11"
          ]
        },
        "useBuiltIns": "usage" // 按需引入 polyfill
      }
    ]
  ],
  "plugins": [
    "@babel/plugin-transform-runtime",
    "@babel/plugin-syntax-dynamic-import",
    ["@babel/plugin-proposal-class-properties", { "loose": false }],
    ["@babel/plugin-proposal-decorators", { "legacy": true }],
  ]
}

```

### 3.3 增加 webpack 配置

```js
module.exports = {
  modules: {
    rules: [
      {
        test:  /\.js$/,
        loader:  'babel-loader',
        exclude:  /node_modules/
      }
    ]
  }
}
```

## 4. 其他问题

下面是我公司项目中遇到的问题，各位升级过程中如果遇到同样的问题可以参考一下解决思路。

### 4.1 json-loader

webpack4 内置的json-loader 有点兼容性问题，安装 json-loader 依赖和更改配置

解决：

```js
{
  test: /\.json$/,  //用于匹配loaders所处理文件拓展名的正则表达式
  use: 'json-loader', //具体loader的名称
  type: 'javascript/auto',
  exclude: /node_modules/
}
```

### 4.2 vue-loader

vue-loader 升级到 15.x 后，会导致旧的 commonjs 写法加载有问题，需要使用 `require('com.vue').default` 的方式引用组件

13的版本还可以设置 esModule，14 以后的版本不能设置了，vue 文件导出的模块一定是 esModule

解决：使用 `require('com.vue').default` 或者 `import` 的方式引用组件

[esModule option stopped working in version 14 · Issue #1172 · vuejs/vue-loader · GitHub](https://github.com/vuejs/vue-loader/issues/1172)

尤大大建议可以自己写一个 babel 插件，遇到 require vue 文件的时候自动加上 default 属性，这样就不用改动所有代码，我们在项目中也是这样处理的。

### 4.3 提取公共 css 代码

scss 中 import 的代码不能被提取到公共 css 中。scss 中的 @import 是使用 sass-loader 处理的，处理后已经变成 css 文件，webpack 已经不能判断是否是同一个模块，所以不能提取到公共的 css 中，但多页面中我们还是希望一些公共的 css 能被提取到公共的文件中。 

解决：将需要提取到公共文件的 css 改到 js 中引入就可以，详见下面 issue

[mini-css-extract-plugin + sass-loader + splitChunks · Issue #49](https://github.com/webpack-contrib/mini-css-extract-plugin/issues/49)

### 4.4 mini-css-extract-plugin filename 不支持函数

mini-css-extract-plugin 的 filename 选项不支持函数，但我们有时候还是希望能单独控制公共 css 文件的位置，而不是和其他入口文件的 css 使用一样的目录格式

解决：使用插件 FileManagerPlugin 在构建后移动文件，等 filename 支持函数后再优化

[feat: allow the option filename to be a function · Issue #143 · webpack-contrib/mini-css-extract-plugin · GitHub](https://github.com/webpack-contrib/mini-css-extract-plugin/issues/143)
