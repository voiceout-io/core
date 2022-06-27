import { NodeGlobalsPolyfillPlugin } from '@esbuild-plugins/node-globals-polyfill';
import { NodeModulesPolyfillPlugin } from '@esbuild-plugins/node-modules-polyfill';
import { defineConfig } from 'tsup';

const { MODE } = process.env;

export default defineConfig({
    entry: ['src/index.ts'],
    globalName: 'voiceout',
    outDir: 'lib',
    format: ['cjs', 'esm', 'iife'],
    splitting: false,
    sourcemap: true,
    clean: true,
    dts: true,
    platform: 'browser',
    esbuildPlugins: [
        NodeModulesPolyfillPlugin(),
        NodeGlobalsPolyfillPlugin({
            process: true,
            buffer: true
        })
    ],
    minify: MODE !== 'development'
});
