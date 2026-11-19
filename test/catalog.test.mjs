import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { catalog } from '../app/catalog.mjs';
import { categories } from '../app/data.mjs';
import { safeUrl } from '../app/engine.mjs';

test('all six directions have eight illustrated recommendations with offline art', () => {
  assert.equal(new Set(catalog.map(pair => pair.id)).size, 48);
  for (const {id} of categories) assert.equal(catalog.filter(pair => pair.category === id).length, 8);
  const csp = readFileSync(new URL('../app/index.html', import.meta.url), 'utf8');
  const sources = csp.match(/img-src ([^;]+);/)[1].split(' ');
  for (const pair of catalog) {
    const p = pair.preview;
    assert.ok(p.title && p.meta && p.cue && (p.action || pair.action), pair.id);
    assert.ok(safeUrl(p.url || pair.url), pair.id);
    assert.ok(existsSync(new URL(`../app/assets/covers/${p.cover}`, import.meta.url)), pair.id);
    if (!p.artwork) continue;
    const {image, source, label} = p.artwork;
    assert.ok(safeUrl(image) && safeUrl(source) && label, pair.id);
    const url = new URL(image);
    const path = url.origin + url.pathname;
    assert.ok(sources.some(s => s === path || (s.startsWith('https://') && s.endsWith('/') && path.startsWith(s))), pair.id);
  }
});
