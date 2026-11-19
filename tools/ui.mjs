import { build } from 'esbuild';
await build({ entryPoints: {bundle:'app/ui.mjs','theme-start':'app/theme-bootstrap.mjs'}, outdir:'app', bundle: true, minify: true,
  format: 'iife', target: ['chrome89', 'safari15'], legalComments: 'eof', charset: 'utf8' });
