/* eslint-env node */
import * as path from 'path';

import webpack from 'webpack';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import ExtractTextPlugin from 'extract-text-webpack-plugin';
import SystemBellPlugin from 'system-bell-webpack-plugin';
import Clean from 'clean-webpack-plugin';
import merge from 'webpack-merge';

import renderJSX from './lib/render.jsx';
import pkg from './package.json';

const TARGET = process.env.npm_lifecycle_event;
const ROOT_PATH = __dirname;
const config = {
  paths: {
    dist: path.join(ROOT_PATH, 'dist'),
    src: path.join(ROOT_PATH, 'src'),
    demo: path.join(ROOT_PATH, 'demo'),
    tests: path.join(ROOT_PATH, 'tests')
  },
  filename: 'xhr-uploader',
  library: 'XHRUploader'
};
const CSS_PATHS = [
  config.paths.demo,
  path.join(ROOT_PATH, 'node_modules/purecss'),
  path.join(ROOT_PATH, 'node_modules/highlight.js/styles/github.css'),
  path.join(ROOT_PATH, 'node_modules/react-ghfork/gh-fork-ribbon.ie.css'),
  path.join(ROOT_PATH, 'node_modules/react-ghfork/gh-fork-ribbon.css')
];
const STYLE_ENTRIES = [
  'purecss',
  'highlight.js/styles/github.css',
  './demo/normalize.css',
  './demo/main.css'
];

process.env.BABEL_ENV = TARGET;

const demoCommon = {
  resolve: {
    extensions: ['', '.js', '.jsx', '.css', '.png', '.jpg']
  },
  module: {
    preLoaders: [
      {
        test: /\.jsx?$/,
        loaders: ['eslint'],
        include: [
          config.paths.demo,
          config.paths.src
        ]
      }
    ],
    loaders: [
      {
        test: /\.png$/,
        loader: 'url?limit=100000&mimetype=image/png',
        include: config.paths.demo
      },
      {
        test: /\.jpg$/,
        loader: 'file',
        include: config.paths.demo
      },
      {
        test: /\.json$/,
        loader: 'json',
        include: path.join(ROOT_PATH, 'package.json')
      }
    ]
  },
  plugins: [
    new SystemBellPlugin()
  ]
};

if (TARGET === 'start') {
  module.exports = merge(demoCommon, {
    devtool: 'eval-source-map',
    entry: {
      demo: [config.paths.demo].concat(STYLE_ENTRIES)
    },
    plugins: [
      new webpack.DefinePlugin({
        'process.env.NODE_ENV': '"development"'
      }),
      new HtmlWebpackPlugin(Object.assign({}, {
        title: `${pkg.name} - ${pkg.description}`,
        githubUser: `${pkg.user}`,
        githubProjectName: `${pkg.name}`,
        template: 'lib/index_template.ejs',
        inject: false
      }, renderJSX(__dirname, pkg)))
    ],
    module: {
      loaders: [
        {
          test: /\.css$/,
          loaders: ['style', 'css'],
          include: CSS_PATHS
        },
        {
          test: /\.jsx?$/,
          loaders: ['babel?cacheDirectory'],
          include: [
            config.paths.demo,
            config.paths.src
          ]
        }
      ]
    },
    devServer: {
      historyApiFallback: true,
      progress: true,
      host: process.env.HOST,
      port: process.env.PORT,
      stats: 'info'
    }
  });
}

function NamedModulesPlugin(options) {
  this.options = options || {};
}
NamedModulesPlugin.prototype.apply = (compiler) => {
  compiler.plugin('compilation', (compilation) => {
    compilation.plugin('before-module-ids', (modules) => {
      modules.forEach((module) => {
        if (module.id === null && module.libIdent) {
          const id = module.libIdent({
            context: compiler.options.context
          });

          // Skip CSS files since those go through ExtractTextPlugin
          if (!id.endsWith('.css')) {
            Object.assign(module, {id});
          }
        }
      });
    });
  });
};

if (TARGET === 'gh-pages' || TARGET === 'gh-pages:stats') {
  module.exports = merge(demoCommon, {
    entry: {
      app: config.paths.demo,
      vendors: [
        'react'
      ],
      style: STYLE_ENTRIES
    },
    output: {
      path: './gh-pages',
      filename: '[name].[chunkhash].js',
      chunkFilename: '[chunkhash].js'
    },
    plugins: [
      new Clean(['gh-pages'], {
        verbose: false
      }),
      new ExtractTextPlugin('[name].[chunkhash].css'),
      new webpack.DefinePlugin({
          // This affects the react lib size
        'process.env.NODE_ENV': '"production"'
      }),
      new HtmlWebpackPlugin(Object.assign({}, {
        title: `${pkg.name} - ${pkg.description}`,
        githubUser: `${pkg.user}`,
        githubProjectName: `${pkg.name}`,
        template: 'lib/index_template.ejs',
        inject: false
      }, renderJSX(__dirname, pkg))),
      new NamedModulesPlugin(),
      new webpack.optimize.DedupePlugin(),
      new webpack.optimize.UglifyJsPlugin({
        compress: {
          warnings: false
        }
      }),
      new webpack.optimize.CommonsChunkPlugin({
        names: ['vendors', 'manifest']
      })
    ],
    module: {
      loaders: [
        {
          test: /\.css$/,
          loader: ExtractTextPlugin.extract('style', 'css'),
          include: CSS_PATHS
        },
        {
          test: /\.jsx?$/,
          loaders: ['babel'],
          include: [
            config.paths.demo,
            config.paths.src
          ]
        }
      ]
    }
  });
}

// !TARGET === prepush hook for test
if (TARGET === 'test' || TARGET === 'test:tdd' || !TARGET) {
  module.exports = merge(demoCommon, {
    module: {
      preLoaders: [
        {
          test: /\.jsx?$/,
          loaders: ['eslint'],
          include: [
            config.paths.tests
          ]
        }
      ],
      loaders: [
        {
          test: /\.jsx?$/,
          loaders: ['babel?cacheDirectory'],
          include: [
            config.paths.src,
            config.paths.tests
          ]
        }
      ]
    }
  });
}

const distCommon = {
  devtool: 'source-map',
  output: {
    path: config.paths.dist,
    libraryTarget: 'umd',
    library: config.library
  },
  entry: config.paths.src,
  externals: {
    'react': {
      commonjs: 'react',
      commonjs2: 'react',
      amd: 'React',
      root: 'React'
    }
  },
  module: {
    loaders: [
      {
        test: /\.jsx?$/,
        loaders: ['babel'],
        include: config.paths.src
      }
    ]
  },
  plugins: [
    new SystemBellPlugin()
  ]
};

if (TARGET === 'dist') {
  module.exports = merge(distCommon, {
    output: {
      filename: `${config.filename}.js`
    }
  });
}

if (TARGET === 'dist:min') {
  module.exports = merge(distCommon, {
    output: {
      filename: `${config.filename}.min.js`
    },
    plugins: [
      new webpack.optimize.UglifyJsPlugin({
        compress: {
          warnings: false
        }
      })
    ]
  });
}
