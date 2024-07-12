import replace from 'rollup-plugin-replace'
import resolve from '@rollup/plugin-node-resolve'
import progress from 'rollup-plugin-progress'
import filesize from 'rollup-plugin-filesize'
import commonjs from '@rollup/plugin-commonjs'
import babel from '@rollup/plugin-babel'
import esbuild from 'rollup-plugin-esbuild'
import json from 'rollup-plugin-json'
import external from 'rollup-plugin-peer-deps-external'
import nodePolyfills from 'rollup-plugin-polyfill-node'
import { terser } from 'rollup-plugin-terser'
import cleanup from 'rollup-plugin-cleanup'
import wasm from '@rollup/plugin-wasm';
import replaceWasm from '@rollup/plugin-replace'
const extensions = ['.js', '.ts']

/** @type { import('rollup').RollupOptions } */

const rollupConfig = {
  input: './src/index.ts',
  output: [
    {
      file: './dist/index.js',
      format: 'umd',
      name: 'CADL',
      globals: {
        '@aitmed/ecos-lvl2-sdk': 'lvl2',
        '@jsmanifest/utils': 'u',
        axios: 'axios',
        'crypto-js/sha256': 'sha256',
        'crypto-js/enc-base64': 'Base64',
        'dot-object': 'dot',
        'humanize-duration': 'humanizeDuration',
        https: 'https',
        jsbi: 'jsbi',
        immer: 'immer',
        moment: 'moment',
        'noodl-types': 'nt',
        pako: 'pako',
        process: 'process',
        'lodash': 'lodash',
        'localforage': 'localforage',
        'shippo': 'shippo',
        'jszip': 'jszip',
        'loglevel': 'loglevel',
        'vercel-toast': 'vercel-toast',
        'parse-address-string': 'parse-address-string',
        'crypto-js': 'crypto-js',
        '@aitmed/protorepo/js/ecos/v1beta1/types_pb': '@aitmed/protorepo/js/ecos/v1beta1/types_pb',
        yaml: 'YAML',
      },
    },
  ],
  context: 'window',
  external: ['vercel-toast'],
  plugins: [
    terser({
      compress: {
        // drop_console: true,
        // drop_debugger: true
      }

    }),
    wasm({
      sync: [
        'static/yaml_wasm_bg.wasm'
      ],
      maxFileSize: 30000000,
    }),
    resolve({
      extensions,
      preferBuiltins: true,
      browser: true,
    }),
    commonjs({
      sourceMap: false,
    }),
    nodePolyfills(),
    replace({
      NODE_ENV: `${JSON.stringify(process.env.NODE_ENV)}`,
      'process.env.NODE_ENV': `${JSON.stringify(process.env.NODE_ENV)}`,
    }),
    replaceWasm({
      "(1,null,":"(0,null,",
      delimiters: ['',''],
      "preventAssignment": true
    }),
    progress(),
    filesize(),
    external({
      includeDependencies: true,
    }),
    json(),
    babel({
      babelHelpers: 'runtime',
      exclude: [
        'node_modules/**/*',
        'src/__tests__'
      ],
      extensions: ['.js'],
      include: ['src/**/*'],
      presets: ['@babel/preset-env'],
      plugins: ['lodash', '@babel/plugin-transform-runtime'],
    }),
    esbuild({
      exclude: /node_modules/,
      include: /\.ts?$/,
      minify: process.env.NODE_ENV === 'production',
      minifyIdentifiers: false,
      target: 'es2015',
    }),
    cleanup(),
  ],
}

export default rollupConfig
