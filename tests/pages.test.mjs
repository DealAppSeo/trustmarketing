import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pages = {
  '/': 'index.html',
  '/clients': 'clients/index.html',
  '/cmo': 'cmo/index.html',
  '/methods': 'methods/index.html',
  '/belt': 'belt/index.html',
  '/start': 'start/index.html',
};
const commands = [
  'npm i -g @hyperdag/trustshell@1.4.0',
  'trustshell verify "paste your own claim"',
  'trustshell repid trinity-shofet',
];

function html(rel) {
  return readFileSync(join(root, rel), 'utf8');
}

test('six static pages do not store text', () => {
  const all = Object.values(pages).map(html).join('\n');
  for (const route of Object.keys(pages)) {
    assert.equal(all.includes(`href="${route}"`) || route === '/', true);
  }
  assert.equal(/<form[\s>]/i.test(all), false);
  assert.equal(/<input[\s>]/i.test(all), false);
  assert.equal(/<textarea[\s>]/i.test(all), false);
  assert.equal(/<video[\s>]/i.test(all), false);
  assert.equal(/<iframe[\s>]/i.test(all), false);
  assert.equal(/<script[\s>]/i.test(all), false);
  assert.equal(/wallet/i.test(all), false);
  assert.equal(/stake/i.test(all), false);
  assert.equal(/localStorage/.test(all), false);
});

test('start links to TrustShell.dev and prints the three commands', () => {
  const start = html(pages['/start']);
  assert.match(start, /href="https:\/\/trustshell\.dev"/);
  assert.match(start, />TrustShell\.dev</);
  const block = start.split('<pre><code>')[1].split('</code></pre>')[0].trim();
  assert.deepEqual(block.split('\n'), commands);
});

test('belt rows with no link print NOT_CHECKED', () => {
  const belt = html(pages['/belt']);
  const body = belt.split('<tbody>')[1].split('</tbody>')[0];
  const rows = body.split('<tr>').slice(1);
  assert.equal(rows.length, 6);
  for (const row of rows) {
    if (!row.includes('<a ')) assert.equal(row.includes('NOT_CHECKED'), true);
    if (row.includes('<a ')) assert.equal(row.includes('NOT_CHECKED'), false);
  }
});

test('every expert name is labeled method', () => {
  const methods = html(pages['/methods']);
  assert.match(methods, /It is not an endorsement\./);
  const body = methods.split('<tbody>')[1].split('</tbody>')[0];
  const rows = body.split('<tr>').slice(1);
  assert.equal(rows.length, 2);
  for (const row of rows) {
    assert.match(row, /<td>method<\/td>/);
    assert.equal(/endors/i.test(row), false);
  }
});
