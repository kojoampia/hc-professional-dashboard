const path = require('path');
const webpack = require('webpack');
const { merge } = require('webpack-merge');
const { hashElement } = require('folder-hash');
const MergeJsonWebpackPlugin = require('merge-jsons-webpack-plugin');
const BrowserSyncPlugin = require('browser-sync-webpack-plugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const WebpackNotifierPlugin = require('webpack-notifier');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const ESLintPlugin = require('eslint-webpack-plugin');

const environment = require('./environment');
const proxyConfig = require('./proxy.conf');

module.exports = async (config, options, targetOptions) => {
  const languagesHash = await hashElement(path.resolve(__dirname, '../src/main/webapp/i18n'), {
    algo: 'md5',
    encoding: 'hex',
    files: { include: ['*.json'] },
  });

  // PLUGINS
  if (config.mode === 'development') {
    config.plugins.push(
      new ESLintPlugin({
        baseConfig: {
          parserOptions: {
            project: ['../tsconfig.app.json'],
          },
        },
      }),
      new WebpackNotifierPlugin({
        title: 'professional Gateway',
        contentImage: path.join(__dirname, 'logo.png'),
      }),
    );
  }

  // configuring proxy for back end service
  const tls = Boolean(config.devServer && config.devServer.https);
  if (config.devServer) {
    config.devServer.proxy = proxyConfig({ tls });
  }

  if (targetOptions.target === 'serve' || config.watch) {
    config.plugins.push(
      new BrowserSyncPlugin(
        {
          host: 'localhost',
          port: 9000,
          https: tls,
          proxy: {
            target: `http${tls ? 's' : ''}://localhost:${targetOptions.target === 'serve' ? '4200' : '5505'}`,
            //target: `http://localhost:5055`,
            ws: true,
            proxyOptions: {
              changeOrigin: false, //pass the Host header to the backend unchanged  https://github.com/Browsersync/browser-sync/issues/430
            },
          },
          socket: {
            clients: {
              heartbeatTimeout: 60000,
            },
          },
          /*
          ghostMode: { // uncomment this part to disable BrowserSync ghostMode; https://github.com/jhipster/generator-jhipster/issues/11116
            clicks: false,
            location: false,
            forms: false,
            scroll: false,
          },
          */
        },
        {
          reload: targetOptions.target === 'build', // enabled for build --watch
        },
      ),
    );
  }

  if (config.mode === 'production') {
    config.plugins.push(
      new BundleAnalyzerPlugin({
        analyzerMode: 'static',
        openAnalyzer: false,
        // Webpack statistics in temporary folder
        reportFilename: '../../stats.html',
      }),
    );
  }

  const patterns = [
    {
      // https://github.com/swagger-api/swagger-ui/blob/v4.6.1/swagger-ui-dist-package/README.md
      context: require('swagger-ui-dist').getAbsoluteFSPath(),
      from: '*.{js,css,html,png}',
      to: 'swagger-ui/',
      globOptions: { ignore: ['**/index.html'] },
    },
    {
      from: path.join(path.dirname(require.resolve('axios/package.json')), 'dist/axios.min.js'),
      to: 'swagger-ui/',
    },
    { from: './src/main/webapp/swagger-ui/', to: 'swagger-ui/' },
    // jhipster-needle-add-assets-to-webpack - JHipster will add/remove third-party resources in this array
  ];

  if (patterns.length > 0) {
    config.plugins.push(new CopyWebpackPlugin({ patterns }));
  }

  config.plugins.push(
    new webpack.DefinePlugin({
      I18N_HASH: JSON.stringify(languagesHash.hash),
      // APP_VERSION is passed as an environment variable from the Gradle / Maven build tasks.
      __VERSION__: JSON.stringify(environment.__VERSION__),
      __DEBUG_INFO_ENABLED__: environment.__DEBUG_INFO_ENABLED__ || config.mode === 'development',
      // Browser RUM ingestion path; empty in development so `ng serve` posts nothing at all.
      // Relative on purpose — it resolves against whatever origin serves the page, which keeps the
      // export same-origin and preflight-free. nginx on the host maps this path to the OTel
      // collector's browser receiver. NOT gated on __DEBUG_INFO_ENABLED__ above: that is hardcoded
      // true in environment.js, so it is true in production builds too.
      __RUM_ENDPOINT__: JSON.stringify(config.mode === 'development' ? '' : '/v1/traces'),
      // The root URL for API calls, ending with a '/' - for example: `"https://www.jhipster.tech:8081/myservice/"`.
      // If this URL is left empty (""), then it will be relative to the current context.
      // If you use an API server, in `prod` mode, you will need to enable CORS
      // (see the `jhipster.cors` common JHipster property in the `application-*.yml` configurations)
      SERVER_API_URL: config.mode === 'development' ? JSON.stringify(environment.DEV_SERVER_API_URL) : JSON.stringify('/'),
    }),
    new MergeJsonWebpackPlugin({
      output: {
        groupBy: [
          { pattern: './src/main/webapp/i18n/en/*.json', fileName: './i18n/en.json' },
          { pattern: './src/main/webapp/i18n/es/*.json', fileName: './i18n/es.json' },
          { pattern: './src/main/webapp/i18n/fr/*.json', fileName: './i18n/fr.json' },
          { pattern: './src/main/webapp/i18n/de/*.json', fileName: './i18n/de.json' },
          // jhipster-needle-i18n-language-webpack - JHipster will add/remove languages in this array
        ],
      },
    }),
  );

  config = merge(
    config,
    // jhipster-needle-add-webpack-config - JHipster will add custom config
  );

  injectTailwindPostcssPlugin(config);

  return config;
};

/**
 * @angular-devkit/build-angular's built-in Tailwind support (see
 * node_modules/@angular-devkit/build-angular/src/tools/webpack/configs/styles.js)
 * only wires up a Tailwind postcss plugin when a tailwind.config.js file exists,
 * and even then calls `require('tailwindcss')({ config })` — the Tailwind v3
 * postcss-plugin-factory API, which the installed Tailwind v4 (`tailwindcss@^4`)
 * no longer exposes (v4's postcss integration lives in the separate
 * `@tailwindcss/postcss` package). It also sets postcss-loader's `config: false`,
 * so the project's own `.postcssrc.json` (which correctly declares
 * `@tailwindcss/postcss`) is never read either. Net effect: Tailwind's `@theme`
 * custom properties came through, but no utility classes were ever generated —
 * confirmed by inspecting the built stylesheet, which contained the literal,
 * unprocessed `@tailwind utilities;` directive.
 *
 * Fix: reach into the global-styles postcss-loader rule (identified by
 * `resourceQuery: /\?ngGlobalStyle/`, per the same styles.js) and prepend the
 * real `@tailwindcss/postcss` plugin to whatever plugins Angular already set up
 * (PostcssCliResources + autoprefixer), leaving everything else untouched.
 */
function injectTailwindPostcssPlugin(config) {
  const postcssLoaderPath = require.resolve('postcss-loader');

  const visit = rules => {
    for (const rule of rules || []) {
      if (Array.isArray(rule.rules)) {
        visit(rule.rules);
      }
      if (Array.isArray(rule.oneOf)) {
        for (const subRule of rule.oneOf) {
          const isGlobalStyleRule = subRule.resourceQuery && subRule.resourceQuery.toString().includes('ngGlobalStyle');
          if (!isGlobalStyleRule || !Array.isArray(subRule.use)) {
            continue;
          }
          for (const useEntry of subRule.use) {
            if (useEntry && useEntry.loader === postcssLoaderPath && typeof useEntry.options?.postcssOptions === 'function') {
              const originalPostcssOptions = useEntry.options.postcssOptions;
              useEntry.options.postcssOptions = loaderContext => {
                const options = originalPostcssOptions(loaderContext);
                options.plugins = [require('@tailwindcss/postcss')(), ...(options.plugins || [])];
                return options;
              };
            }
          }
        }
      }
    }
  };

  visit(config.module?.rules);
}
