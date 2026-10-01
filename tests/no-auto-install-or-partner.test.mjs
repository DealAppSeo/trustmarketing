import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const autoInstall = /installs? automatically|installed automatically|automatic install|automatically install/i;
const partnerLabel = /\bpartner\b/i;

function pagesAndJson(dir, found = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === 'probes') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) pagesAndJson(full, found);
    else if (entry.name.endsWith('.html') || entry.name.endsWith('.json')) found.push(full);
  }
  return found;
}

test('a page or json fails this test when it says a tool installs automatically or calls an expert a partner', () => {
  assert.equal(autoInstall.test('Tools install automatically.'), true);
  assert.equal(autoInstall.test('The tool installs automatically.'), true);
  assert.equal(autoInstall.test('Run npm i -g @hyperdag/trustshell@1.4.0 on this machine.'), false);
  assert.equal(partnerLabel.test('Laya is a partner.'), true);
  assert.equal(partnerLabel.test('Jev is a partner.'), true);
  assert.equal(partnerLabel.test('A name on this page is a method.'), false);

  const files = pagesAndJson(root);
  for (const file of files) {
    const raw = fs.readFileSync(file, 'utf8');
    const rel = path.relative(root, file);
    assert.equal(autoInstall.test(raw), false, rel);
    assert.equal(partnerLabel.test(raw), false, rel);
  }
});
