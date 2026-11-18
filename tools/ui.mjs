import { build } from 'esbuild';
await build({ entryPoints: ['app/ui.mjs'], outfile: 'app/bundle.js', bundle: true, minify: true,
  format: 'iife', target: ['chrome89', 'safari15'], legalComments: 'eof', charset: 'utf8' });
